"""MISSÃO APROV CONCURSO — Backend API."""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import ipaddress
import logging
import uuid
import bcrypt
import jwt as pyjwt
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from seed_data import CONCURSOS, DISCIPLINAS, QUESTOES, FLASHCARDS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
EMERGENT_EMAIL_KEY = os.environ.get('EMERGENT_EMAIL_KEY', '')
EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'Missão Aprov Concurso')
APP_BASE_URL = os.environ.get('APP_BASE_URL', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@missaoaprov.com').lower()
GOOGLE_WEB_CLIENT_ID = os.environ.get('GOOGLE_WEB_CLIENT_ID', '')
EMAIL_BASE_URL = "https://integrations.emergentagent.com"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ HELPERS ============
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def gen_id(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_jwt(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": now_utc() + timedelta(days=30)}
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def get_user_from_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    # First try JWT
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0, "password_hash": 0})
        if user:
            return user
    except Exception:
        pass
    # Then try session_token (Google Auth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    exp = session.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now_utc():
            return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    return user


async def require_user(authorization: Optional[str]) -> dict:
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Conta bloqueada. Entre em contato com o suporte.")
    return user


async def require_admin(authorization: Optional[str]) -> dict:
    user = await require_user(authorization)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador.")
    return user


# ============ EMAIL (Resend Emergent-managed) ============
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "responda com sua senha", "envie sua senha", "confirme seu cartão", "seed phrase")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms in email")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks credentials: {p!r}")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Non-https link: {url!r}")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Invalid host: {url!r}")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor {m.group(1)!r} != {real!r}")


async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    if not EMERGENT_EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY not set — skipping send")
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as hc:
            resp = await hc.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMERGENT_EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return None


# ============ MODELS ============
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class SessionIn(BaseModel):
    session_id: str

class OnboardingIn(BaseModel):
    concurso_id: Optional[str] = None
    horas_dia: int = 3
    dias_semana: int = 5
    data_prova: Optional[str] = None
    nivel: str = "iniciante"
    dificuldades: List[str] = []
    dominios: List[str] = []

class QuestionAnswer(BaseModel):
    questao_id: str
    resposta: int

class FlashcardReview(BaseModel):
    flashcard_id: str
    resultado: str  # nao_lembro, dificil, lembrei, facil

class ChatMessageIn(BaseModel):
    session_id: str
    message: str

class SimuladoStart(BaseModel):
    concurso_id: Optional[str] = None
    disciplinas: List[str] = []
    num_questoes: int = 10


# ============ AUTH ROUTES ============
@api_router.post("/auth/register")
async def register(data: RegisterIn):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user_id = gen_id("user")
    is_admin = data.email.lower() == ADMIN_EMAIL
    user_doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "password_hash": hash_password(data.password),
        "auth_type": "password",
        "created_at": now_utc(),
        "onboarded": False,
        "xp": 0,
        "streak": 0,
        "last_study_date": None,
        "concurso_id": None,
        "is_admin": is_admin,
        "blocked": False,
    }
    await db.users.insert_one(user_doc)
    token = make_jwt(user_id)
    return {"token": token, "user": {k: v for k, v in user_doc.items() if k not in ("_id", "password_hash")}}


@api_router.post("/auth/login")
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Conta bloqueada. Entre em contato com o suporte.")
    token = make_jwt(user["user_id"])
    user.pop("_id", None); user.pop("password_hash", None)
    return {"token": token, "user": user}


# ============ PASSWORD RESET ============
class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordIn):
    """Sempre retorna sucesso — não vaza informação sobre email existente."""
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if user and user.get("auth_type") == "password":
        token = uuid.uuid4().hex + uuid.uuid4().hex  # 64 chars
        await db.password_resets.insert_one({
            "token": token,
            "user_id": user["user_id"],
            "email": email,
            "expires_at": now_utc() + timedelta(minutes=15),
            "used": False,
            "created_at": now_utc(),
        })
        reset_url = f"{APP_BASE_URL}/reset-password?token={token}"
        html = f"""<table role="presentation" width="100%" style="background:#FAFAFA;padding:24px 0"><tr><td align="center">
<table role="presentation" width="560" style="background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif">
<tr><td style="background:#059669;padding:32px;text-align:center">
  <h1 style="color:#FFFFFF;margin:0;font-size:22px;font-weight:800">MISSÃO APROV CONCURSO</h1>
  <p style="color:#D1FAE5;margin:8px 0 0;font-size:13px">Recuperação de senha</p>
</td></tr>
<tr><td style="padding:32px 32px 24px;color:#171717">
  <p style="margin:0 0 12px;font-size:15px">Olá, <strong>{escape(user.get('name','aluno'))}</strong>!</p>
  <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#404040">
    Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha. O link expira em <strong>15 minutos</strong>.
  </p>
  <p style="text-align:center;margin:24px 0">
    <a href="{reset_url}" style="background:#059669;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;display:inline-block">Redefinir minha senha</a>
  </p>
  <p style="margin:20px 0 0;font-size:12px;color:#737373;line-height:18px">
    Se você não solicitou esta redefinição, pode ignorar este email — sua senha continuará a mesma.
  </p>
</td></tr>
<tr><td style="background:#F5F5F5;padding:20px 32px;text-align:center;color:#737373;font-size:11px">
  Enviado por {escape(EMAIL_FROM_NAME)}. Nunca pedimos sua senha por email.
</td></tr></table></td></tr></table>"""
        await send_email(to=email, subject="Redefinição de senha — Missão Aprov Concurso", html=html)
    return {"ok": True, "message": "Se o email existir, um link foi enviado."}


@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordIn):
    reset = await db.password_resets.find_one({"token": data.token, "used": False}, {"_id": 0})
    if not reset:
        raise HTTPException(status_code=400, detail="Token inválido ou já utilizado")
    exp = reset.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now_utc():
            raise HTTPException(status_code=400, detail="Token expirado. Solicite um novo.")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Senha muito curta (mín. 6 caracteres)")
    await db.users.update_one({"user_id": reset["user_id"]}, {"$set": {"password_hash": hash_password(data.new_password)}})
    await db.password_resets.update_one({"token": data.token}, {"$set": {"used": True}})
    return {"ok": True, "message": "Senha redefinida com sucesso"}



class GoogleLoginIn(BaseModel):
    id_token: str


@api_router.post("/auth/google")
async def google_login(data: GoogleLoginIn):
    if not GOOGLE_WEB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth não configurado")

    try:
        payload = google_id_token.verify_oauth2_token(
            data.id_token,
            google_requests.Request(),
            GOOGLE_WEB_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Token Google inválido")

    email = (payload.get("email") or "").lower()
    name = payload.get("name") or email.split("@")[0]
    picture = payload.get("picture")

    if not email or not payload.get("email_verified"):
        raise HTTPException(status_code=401, detail="Email Google inválido ou não verificado")

    existing = await db.users.find_one({"email": email})

    if existing:
        if existing.get("blocked"):
            raise HTTPException(
                status_code=403,
                detail="Conta bloqueada. Entre em contato com o suporte."
            )

        user_id = existing["user_id"]

        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": name,
                "picture": picture,
            }}
        )
    else:
        user_id = gen_id("user")

        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_type": "google",
            "created_at": now_utc(),
            "onboarded": False,
            "xp": 0,
            "streak": 0,
            "last_study_date": None,
            "concurso_id": None,
            "is_admin": email == ADMIN_EMAIL,
            "blocked": False,
        })

    token = make_jwt(user_id)

    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )

    return {
        "token": token,
        "user": user
    }


@api_router.post("/auth/session")
async def auth_session(data: SessionIn):
    """Exchange Emergent session_id for a session_token."""
    async with httpx.AsyncClient(timeout=15.0) as hc:
        resp = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": data.session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão Google inválida")
    payload = resp.json()
    email = payload.get("email", "").lower()
    name = payload.get("name") or email.split("@")[0]
    picture = payload.get("picture")
    session_token = payload.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Dados incompletos")

    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = gen_id("user")
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "auth_type": "google", "created_at": now_utc(), "onboarded": False,
            "xp": 0, "streak": 0, "last_study_date": None, "concurso_id": None,
        })
    await db.user_sessions.insert_one({
        "session_token": session_token, "user_id": user_id,
        "expires_at": now_utc() + timedelta(days=7), "created_at": now_utc(),
    })
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"session_token": session_token, "user": user}


@api_router.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return {"user": user}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}



class SelectConcursoIn(BaseModel):
    concurso_id: str


@api_router.patch("/auth/concurso")
async def select_concurso(data: SelectConcursoIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)

    concurso = await db.concursos.find_one({
        "id": data.concurso_id,
        "deleted_at": {"$exists": False}
    }, {"_id": 0})

    if not concurso:
        raise HTTPException(status_code=404, detail="Concurso não encontrado")

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "concurso_id": data.concurso_id,
            "onboarded": True
        }}
    )

    updated = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "password_hash": 0}
    )

    return {
        "ok": True,
        "concurso_id": data.concurso_id,
        "user": updated
    }


# ============ ONBOARDING ============
@api_router.post("/onboarding")
async def onboarding(data: OnboardingIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    update = {"onboarded": True, "concurso_id": data.concurso_id,
              "horas_dia": data.horas_dia, "dias_semana": data.dias_semana,
              "data_prova": data.data_prova, "nivel": data.nivel,
              "dificuldades": data.dificuldades, "dominios": data.dominios}
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    return {"ok": True}


# ============ CONCURSOS ============
@api_router.get("/concursos")
async def list_concursos(q: Optional[str] = None, situacao: Optional[str] = None, area: Optional[str] = None):
    query: dict = {"deleted_at": {"$exists": False}}
    if situacao:
        query["situacao"] = situacao
    if area:
        query["area"] = area
    if q:
        rgx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"nome": rgx}, {"orgao": rgx}, {"cargo": rgx}]
    items = []
    async for c in db.concursos.find(query, {"_id": 0}).sort("nome", 1):
        items.append(c)
    return {"concursos": items}


@api_router.get("/concursos/{concurso_id}")
async def get_concurso(concurso_id: str):
    c = await db.concursos.find_one({"id": concurso_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Concurso não encontrado")
    disciplinas = []
    async for d in db.disciplinas.find({"id": {"$in": c.get("disciplinas", [])}}, {"_id": 0}):
        disciplinas.append(d)
    return {"concurso": c, "disciplinas": disciplinas}


# ============ DISCIPLINAS ============
@api_router.get("/disciplinas")
async def list_disciplinas():
    items = []
    async for d in db.disciplinas.find({}, {"_id": 0}).sort("nome", 1):
        items.append(d)
    return {"disciplinas": items}


# ============ QUESTOES ============
@api_router.get("/questoes")
async def list_questoes(disciplina: Optional[str] = None, banca: Optional[str] = None, area: Optional[str] = None, limit: int = 20):
    query: dict = {"deleted_at": {"$exists": False}}
    if disciplina:
        query["disciplina"] = disciplina
    if banca:
        query["banca"] = banca
    if area:
        query["area"] = area
    items = []
    async for q in db.questoes.find(query, {"_id": 0}).limit(min(max(limit, 1), 100)):
        items.append(q)
    return {"questoes": items}


@api_router.get("/questoes/{questao_id}")
async def get_questao(questao_id: str):
    q = await db.questoes.find_one({"id": questao_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if q:
        return {"questao": q}
    raise HTTPException(status_code=404, detail="Questão não encontrada")


@api_router.post("/questoes/answer")
async def answer_questao(data: QuestionAnswer, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    questao = await db.questoes.find_one({"id": data.questao_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    correta = questao["correta"] == data.resposta
    await db.answers.insert_one({
        "user_id": user["user_id"], "questao_id": data.questao_id,
        "disciplina": questao["disciplina"], "resposta": data.resposta,
        "correta": correta, "created_at": now_utc(),
    })
    xp_gain = 10 if correta else 3
    today = now_utc().date().isoformat()
    last = user.get("last_study_date")
    streak = user.get("streak", 0)
    if last != today:
        yesterday = (now_utc().date() - timedelta(days=1)).isoformat()
        streak = streak + 1 if last == yesterday else 1
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"xp": xp_gain}, "$set": {"last_study_date": today, "streak": streak}},
    )
    return {"correta": correta, "explicacao": questao["explicacao"],
            "resposta_correta": questao["correta"], "xp_gain": xp_gain}


@api_router.post("/questoes/{questao_id}/favorite")
async def favorite_questao(questao_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    q = await db.questoes.find_one({"id": questao_id, "deleted_at": {"$exists": False}}, {"_id": 0, "id": 1})
    if not q:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    key = {"user_id": user["user_id"], "questao_id": questao_id}
    existing = await db.favorites.find_one(key)
    if existing:
        await db.favorites.delete_one(key)
        return {"ok": True, "favorited": False}
    await db.favorites.insert_one({**key, "created_at": now_utc()})
    return {"ok": True, "favorited": True}


@api_router.get("/favoritos")
async def list_favoritos(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    ids = [x["questao_id"] async for x in db.favorites.find({"user_id": user["user_id"]}, {"_id": 0, "questao_id": 1})]
    items = [q async for q in db.questoes.find({"id": {"$in": ids}, "deleted_at": {"$exists": False}}, {"_id": 0})] if ids else []
    return {"questoes": items}


@api_router.get("/caderno-erros")
async def caderno_erros(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    pipeline = [
        {"$match": {"user_id": user["user_id"], "correta": False}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$questao_id", "ultima_resposta": {"$first": "$resposta"}, "erros": {"$sum": 1}, "ultima_tentativa": {"$first": "$created_at"}}},
        {"$limit": 100},
    ]
    erros = [x async for x in db.answers.aggregate(pipeline)]
    qmap = {}
    if erros:
        ids = [e["_id"] for e in erros]
        qmap = {q["id"]: q async for q in db.questoes.find({"id": {"$in": ids}}, {"_id": 0})}
    items = []
    for e in erros:
        q = qmap.get(e["_id"])
        if q:
            items.append({**q, "erros": e["erros"], "ultima_resposta": e["ultima_resposta"]})
    return {"questoes": items}


# ============ FLASHCARDS ============
@api_router.get("/flashcards")
async def list_flashcards(disciplina: Optional[str] = None, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    result = FLASHCARDS[:]
    if disciplina:
        result = [f for f in result if f["disciplina"] == disciplina]
    # Merge with review data
    reviews = {r["flashcard_id"]: r async for r in db.flashcard_reviews.find({"user_id": user["user_id"]}, {"_id": 0})}
    now = now_utc()
    enriched = []
    for f in result:
        r = reviews.get(f["id"])
        due = True
        if r and r.get("next_review"):
            nr = r["next_review"]
            if isinstance(nr, datetime):
                if nr.tzinfo is None:
                    nr = nr.replace(tzinfo=timezone.utc)
                due = nr <= now
        enriched.append({**f, "due": due, "interval": (r or {}).get("interval", 0)})
    return {"flashcards": enriched}


@api_router.post("/flashcards/review")
async def review_flashcard(data: FlashcardReview, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    # SM-2 simplified intervals in days by result
    intervals = {"nao_lembro": 0, "dificil": 1, "lembrei": 3, "facil": 7}
    prev = await db.flashcard_reviews.find_one({"user_id": user["user_id"], "flashcard_id": data.flashcard_id}, {"_id": 0})
    prev_interval = (prev or {}).get("interval", 0)
    base = intervals.get(data.resultado, 1)
    if data.resultado == "nao_lembro":
        new_interval = 0
    elif data.resultado == "dificil":
        new_interval = max(1, prev_interval)
    elif data.resultado == "lembrei":
        new_interval = max(3, int(prev_interval * 2)) if prev_interval > 0 else 3
    else:  # facil
        new_interval = max(7, int(prev_interval * 2.5)) if prev_interval > 0 else 7
    next_review = now_utc() + timedelta(days=new_interval if new_interval > 0 else 0, hours=0 if new_interval > 0 else 4)
    await db.flashcard_reviews.update_one(
        {"user_id": user["user_id"], "flashcard_id": data.flashcard_id},
        {"$set": {"interval": new_interval, "last_result": data.resultado, "next_review": next_review, "updated_at": now_utc()}},
        upsert=True,
    )
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"xp": 5}})
    return {"ok": True, "next_review": next_review.isoformat(), "interval_days": new_interval}


# ============ SIMULADO ============
@api_router.post("/simulado/start")
async def simulado_start(data: SimuladoStart, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    query: dict = {"deleted_at": {"$exists": False}}
    if data.disciplinas:
        query["disciplina"] = {"$in": data.disciplinas}
    elif data.concurso_id:
        concurso = await db.concursos.find_one({"id": data.concurso_id}, {"_id": 0})
        if concurso:
            query["disciplina"] = {"$in": concurso.get("disciplinas", [])}
    pool = [q async for q in db.questoes.find(query, {"_id": 0})]
    import random
    random.shuffle(pool)
    selected = pool[:data.num_questoes]
    simulado_id = gen_id("sim")
    await db.simulados.insert_one({
        "simulado_id": simulado_id, "user_id": user["user_id"],
        "questao_ids": [q["id"] for q in selected], "created_at": now_utc(),
        "status": "em_andamento",
    })
    return {"simulado_id": simulado_id, "questoes": selected}


class SimuladoSubmit(BaseModel):
    simulado_id: str
    respostas: dict


@api_router.post("/simulado/submit")
async def simulado_submit(data: SimuladoSubmit, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    sim = await db.simulados.find_one({"simulado_id": data.simulado_id, "user_id": user["user_id"]}, {"_id": 0})
    if not sim:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")
    qs = {q["id"]: q async for q in db.questoes.find({"id": {"$in": sim["questao_ids"]}}, {"_id": 0})}
    corrigidas, acertos, por_disciplina = [], 0, {}
    total = len(sim["questao_ids"])
    for qid in sim["questao_ids"]:
        q = qs.get(qid)
        if not q:
            continue
        resp = data.respostas.get(qid, -1)
        certo = q["correta"] == resp
        if certo: acertos += 1
        d = q["disciplina"]
        por_disciplina.setdefault(d, {"total": 0, "acertos": 0})
        por_disciplina[d]["total"] += 1
        if certo: por_disciplina[d]["acertos"] += 1
        corrigidas.append({"questao": q, "resposta": resp, "correta": certo})
        await db.answers.insert_one({"user_id": user["user_id"], "questao_id": qid, "disciplina": d, "resposta": resp, "correta": certo, "created_at": now_utc(), "origem": "simulado"})
    percentual = round(100.0 * acertos / total, 1) if total else 0
    xp = acertos * 15
    await db.simulados.update_one({"simulado_id": data.simulado_id}, {"$set": {"status": "concluido", "acertos": acertos, "total": total, "percentual": percentual, "por_disciplina": por_disciplina, "concluido_em": now_utc()}})
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"xp": xp}})
    return {"acertos": acertos, "total": total, "percentual": percentual, "por_disciplina": por_disciplina, "corrigidas": corrigidas, "xp_gain": xp}


@api_router.get("/simulados/historico")
async def simulados_historico(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    items = []
    async for s in db.simulados.find({"user_id": user["user_id"], "status": "concluido"}, {"_id": 0}).sort("concluido_em", -1).limit(20):
        s["concluido_em"] = s.get("concluido_em").isoformat() if s.get("concluido_em") else None
        s.pop("created_at", None)
        items.append(s)
    return {"simulados": items}


# ============ DASHBOARD ============
@api_router.get("/dashboard")
async def dashboard(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    uid = user["user_id"]
    total_answers = await db.answers.count_documents({"user_id": uid})
    correct_answers = await db.answers.count_documents({"user_id": uid, "correta": True})
    taxa = round(100.0 * correct_answers / total_answers, 1) if total_answers else 0
    # By discipline
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$disciplina", "total": {"$sum": 1}, "acertos": {"$sum": {"$cond": ["$correta", 1, 0]}}}},
    ]
    by_disc = []
    async for r in db.answers.aggregate(pipeline):
        pct = round(100 * r["acertos"] / r["total"], 1) if r["total"] else 0
        disc = await db.disciplinas.find_one({"id": r["_id"]}, {"_id": 0})
        by_disc.append({"disciplina": r["_id"], "nome": (disc or {}).get("nome", r["_id"]), "total": r["total"], "acertos": r["acertos"], "percentual": pct})
    by_disc.sort(key=lambda x: x["percentual"], reverse=True)
    # Flashcards due
    now = now_utc()
    due_count = 0
    total_fc = len(FLASHCARDS)
    async for r in db.flashcard_reviews.find({"user_id": uid}, {"_id": 0}):
        nr = r.get("next_review")
        if isinstance(nr, datetime):
            if nr.tzinfo is None: nr = nr.replace(tzinfo=timezone.utc)
            if nr <= now: due_count += 1
    reviewed_ids = set()
    async for r in db.flashcard_reviews.find({"user_id": uid}, {"_id": 0, "flashcard_id": 1}):
        reviewed_ids.add(r["flashcard_id"])
    due_count += len(FLASHCARDS) - len(reviewed_ids)
    # Simulados count
    sim_count = await db.simulados.count_documents({"user_id": uid, "status": "concluido"})
    # Preparation % — rough estimate
    prep = min(100, int((taxa * 0.6) + (min(total_answers, 50) * 0.5) + (sim_count * 2)))

    # Study summary
    hoje = now_utc().date()
    inicio_7_dias = hoje - timedelta(days=6)

    minutos_hoje = 0
    sessoes_hoje = 0
    minutos_7_dias = 0
    sessoes_7_dias = 0

    async for sessao in db.study_sessions.find(
        {"user_id": uid},
        {"_id": 0, "minutos": 1, "created_at": 1}
    ):
        created = sessao.get("created_at")

        if not isinstance(created, datetime):
            continue

        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)

        dia = created.date()
        minutos = int(sessao.get("minutos", 0))

        if dia == hoje:
            minutos_hoje += minutos
            sessoes_hoje += 1

        if inicio_7_dias <= dia <= hoje:
            minutos_7_dias += minutos
            sessoes_7_dias += 1

    return {
        "user": {"name": user.get("name"), "xp": user.get("xp", 0), "streak": user.get("streak", 0), "concurso_id": user.get("concurso_id")},
        "questoes_respondidas": total_answers,
        "acertos": correct_answers,
        "taxa_acerto": taxa,
        "flashcards_pendentes": due_count,
        "simulados_realizados": sim_count,
        "percentual_preparacao": prep,
        "por_disciplina": by_disc,
        "meta_diaria": {"questoes": 20, "feito": total_answers},
        "estudo": {
            "minutos_hoje": minutos_hoje,
            "sessoes_hoje": sessoes_hoje,
            "minutos_7_dias": minutos_7_dias,
            "sessoes_7_dias": sessoes_7_dias,
        },
    }


# ============ CHAT IA (Professor IA) ============
@api_router.post("/chat/message")
async def chat_message(data: ChatMessageIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    # Persist user message
    await db.chat_messages.insert_one({
        "session_id": data.session_id, "user_id": user["user_id"],
        "role": "user", "content": data.message, "created_at": now_utc(),
    })

    # Load history for context (last 20)
    history = []
    async for m in db.chat_messages.find({"session_id": data.session_id, "user_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1).limit(20):
        history.append(m)

    system = ("Você é o Professor IA do MISSÃO APROV, tutor especialista em concursos públicos brasileiros e ENEM. Quando a pergunta for de ENEM, ensine pelas competências e áreas do exame; quando for concurso, destaque banca e pegadinhas. "
              "Explique de forma objetiva, didática, com exemplos práticos e destaque pegadinhas de banca. "
              "Use listas, negrito com **, e crie associações e mnemônicos quando útil. Responda em português do Brasil.")

    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=data.session_id, system_message=system).with_model("openai", "gpt-5.4-mini")

    async def event_gen():
        full = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=data.message)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {ev.content}\n\n".replace("\n\n", "\n\n")  # SSE frame
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.exception("chat error")
            yield f"data: [ERRO: {str(e)}]\n\n"
        # Save assistant message
        await db.chat_messages.insert_one({
            "session_id": data.session_id, "user_id": user["user_id"],
            "role": "assistant", "content": full, "created_at": now_utc(),
        })
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class ChatSimpleIn(BaseModel):
    message: str
    session_id: Optional[str] = None

@api_router.post("/chat/ask")
async def chat_ask(data: ChatSimpleIn, authorization: Optional[str] = Header(None)):
    """Non-streaming simple chat (safer for mobile)."""
    user = await require_user(authorization)
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    sid = data.session_id or gen_id("chat")
    system = ("Você é o Professor IA do MISSÃO APROV, tutor especialista em concursos públicos brasileiros e ENEM. Adapte a explicação ao contexto do aluno. "
              "Explique de forma objetiva, didática, com exemplos práticos e destaque pegadinhas de banca. "
              "Use listas curtas e crie mnemônicos quando útil. Responda em português do Brasil, máximo 400 palavras.")
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=sid, system_message=system).with_model("openai", "gpt-5.4-mini")
    await db.chat_messages.insert_one({"session_id": sid, "user_id": user["user_id"], "role": "user", "content": data.message, "created_at": now_utc()})
    try:
        response = await chat.send_message(UserMessage(text=data.message))
        text = response if isinstance(response, str) else str(response)
    except Exception as e:
        logger.exception("chat_ask error")
        raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")
    await db.chat_messages.insert_one({"session_id": sid, "user_id": user["user_id"], "role": "assistant", "content": text, "created_at": now_utc()})
    return {"session_id": sid, "response": text}


@api_router.get("/chat/history/{session_id}")
async def chat_history(session_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    msgs = []
    async for m in db.chat_messages.find({"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1):
        m["created_at"] = m["created_at"].isoformat() if m.get("created_at") else None
        msgs.append(m)
    return {"messages": msgs}


# ============ ENEM / PLANO / RANKING ============
@api_router.get("/enem")
async def enem_overview(authorization: Optional[str] = Header(None)):
    await require_user(authorization)
    areas = ["linguagens", "ciencias-humanas", "ciencias-natureza", "matematica", "redacao"]
    disciplinas = [d async for d in db.disciplinas.find({"id": {"$in": areas}}, {"_id": 0})]
    counts = {}
    for area in areas:
        counts[area] = await db.questoes.count_documents({"disciplina": area, "deleted_at": {"$exists": False}})
    return {"areas": disciplinas, "questoes_por_area": counts, "concurso_id": "enem-2026"}


@api_router.get("/ranking")
async def ranking(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    users = []
    pos = 0
    i = 0
    async for u in db.users.find({"blocked": {"$ne": True}, "deleted_at": {"$exists": False}}, {"_id": 0, "password_hash": 0}).sort("xp", -1).limit(100):
        i += 1
        if u["user_id"] == user["user_id"]: pos = i
        users.append({"posicao": i, "user_id": u["user_id"], "name": u.get("name", "Aluno"), "xp": u.get("xp", 0), "streak": u.get("streak", 0)})
    return {"ranking": users, "minha_posicao": pos}


class StudyPlanIn(BaseModel):
    meta_questoes: int = 20
    minutos_dia: int = 120
    dias_semana: int = 5
    disciplinas: List[str] = []


@api_router.get("/plano-estudos")
async def get_study_plan(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    plan = await db.study_plans.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"plano": plan or {"meta_questoes": 20, "minutos_dia": 120, "dias_semana": 5, "disciplinas": []}}


@api_router.put("/plano-estudos")
async def save_study_plan(data: StudyPlanIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    doc = data.model_dump()
    doc["updated_at"] = now_utc()
    await db.study_plans.update_one({"user_id": user["user_id"]}, {"$set": doc}, upsert=True)
    return {"ok": True, "plano": doc}



# ============ CALENDARIO DE ESTUDOS ============

class StudyTaskCompleteIn(BaseModel):
    concluida: bool


@api_router.get("/calendario")
async def get_calendario(
    inicio: Optional[str] = None,
    fim: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    query = {
        "user_id": user["user_id"]
    }

    if inicio or fim:
        query["data"] = {}
        if inicio:
            query["data"]["$gte"] = inicio
        if fim:
            query["data"]["$lte"] = fim

    tarefas = []

    async for t in db.study_tasks.find(
        query,
        {"_id": 0}
    ).sort("data", 1):
        tarefas.append(t)

    total = len(tarefas)
    concluidas = sum(1 for t in tarefas if t.get("concluida"))

    minutos_planejados = sum(
        int(t.get("minutos", 0)) for t in tarefas
    )

    minutos_concluidos = sum(
        min(
            int(t.get("minutos_estudados", 0)),
            int(t.get("minutos", 0))
        )
        for t in tarefas
    )

    percentual = round(
        (concluidas / total) * 100,
        1
    ) if total else 0

    return {
        "tarefas": tarefas,
        "progresso": {
            "total": total,
            "concluidas": concluidas,
            "percentual": percentual,
            "minutos_planejados": minutos_planejados,
            "minutos_concluidos": minutos_concluidos,
        }
    }


@api_router.post("/calendario/gerar-semana")
async def gerar_semana(
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    plano = await db.study_plans.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )

    if not plano:
        raise HTTPException(
            status_code=400,
            detail="Configure primeiro seu Plano de Estudos"
        )

    disciplinas_ids = plano.get("disciplinas", [])

    if not disciplinas_ids:
        raise HTTPException(
            status_code=400,
            detail="Selecione pelo menos uma disciplina no Plano de Estudos"
        )

    dias_semana = max(
        1,
        min(7, int(plano.get("dias_semana", 5)))
    )

    minutos_dia = max(
        30,
        int(plano.get("minutos_dia", 120))
    )

    meta_questoes = max(
        1,
        int(plano.get("meta_questoes", 20))
    )

    disciplinas = {}

    async for d in db.disciplinas.find(
        {"id": {"$in": disciplinas_ids}},
        {"_id": 0}
    ):
        disciplinas[d["id"]] = d

    hoje = now_utc().date()

    segunda = hoje - timedelta(days=hoje.weekday())

    criadas = []

    for i in range(dias_semana):
        dia = segunda + timedelta(days=i)

        disciplina_id = disciplinas_ids[
            i % len(disciplinas_ids)
        ]

        disciplina = disciplinas.get(
            disciplina_id,
            {"nome": disciplina_id}
        )

        data_str = dia.isoformat()

        existente = await db.study_tasks.find_one({
            "user_id": user["user_id"],
            "data": data_str,
            "gerada_pelo_plano": True,
        })

        if existente:
            continue

        task_id = gen_id("task")

        doc = {
            "task_id": task_id,
            "user_id": user["user_id"],
            "data": data_str,
            "disciplina_id": disciplina_id,
            "disciplina_nome": disciplina.get(
                "nome",
                disciplina_id
            ),
            "titulo": f"Estudar {disciplina.get('nome', disciplina_id)}",
            "minutos": minutos_dia,
            "meta_questoes": meta_questoes,
            "concluida": False,
            "gerada_pelo_plano": True,
            "created_at": now_utc(),
        }

        await db.study_tasks.insert_one(doc)

        doc.pop("_id", None)
        criadas.append(doc)

    return {
        "ok": True,
        "tarefas_criadas": len(criadas),
        "tarefas": criadas,
        "inicio_semana": segunda.isoformat(),
    }


class StudyReminderIn(BaseModel):
    notification_id: Optional[str] = None
    hora: Optional[int] = None


@api_router.patch("/calendario/{task_id}/lembrete")
async def atualizar_lembrete_calendario(
    task_id: str,
    data: StudyReminderIn,
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    tarefa = await db.study_tasks.find_one({
        "task_id": task_id,
        "user_id": user["user_id"],
    })

    if not tarefa:
        raise HTTPException(
            status_code=404,
            detail="Tarefa não encontrada"
        )

    if data.notification_id:
        hora = max(0, min(23, int(data.hora or 19)))

        await db.study_tasks.update_one(
            {
                "task_id": task_id,
                "user_id": user["user_id"],
            },
            {
                "$set": {
                    "notification_id": data.notification_id,
                    "lembrete_hora": hora,
                    "updated_at": now_utc(),
                }
            }
        )

        return {
            "ok": True,
            "notification_id": data.notification_id,
            "lembrete_hora": hora,
        }

    await db.study_tasks.update_one(
        {
            "task_id": task_id,
            "user_id": user["user_id"],
        },
        {
            "$unset": {
                "notification_id": "",
                "lembrete_hora": "",
            },
            "$set": {
                "updated_at": now_utc(),
            }
        }
    )

    return {
        "ok": True,
        "notification_id": None,
        "lembrete_hora": None,
    }


@api_router.patch("/calendario/{task_id}")
async def concluir_tarefa_calendario(
    task_id: str,
    data: StudyTaskCompleteIn,
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    result = await db.study_tasks.update_one(
        {
            "task_id": task_id,
            "user_id": user["user_id"],
        },
        {
            "$set": {
                "concluida": data.concluida,
                "updated_at": now_utc(),
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Tarefa não encontrada"
        )

    return {
        "ok": True,
        "concluida": data.concluida
    }


@api_router.delete("/calendario/{task_id}")
async def excluir_tarefa_calendario(
    task_id: str,
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    result = await db.study_tasks.delete_one({
        "task_id": task_id,
        "user_id": user["user_id"],
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Tarefa não encontrada"
        )

    return {"ok": True}




# ============ SESSOES DE ESTUDO / POMODORO ============

class StudySessionIn(BaseModel):
    task_id: Optional[str] = None
    minutos: int = 25


@api_router.post("/sessoes-estudo")
async def registrar_sessao_estudo(
    data: StudySessionIn,
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    minutos = max(1, min(720, int(data.minutos)))

    task = None

    if data.task_id:
        task = await db.study_tasks.find_one({
            "task_id": data.task_id,
            "user_id": user["user_id"],
        })

        if not task:
            raise HTTPException(
                status_code=404,
                detail="Tarefa do calendário não encontrada"
            )

    session_id = gen_id("session")

    doc = {
        "session_id": session_id,
        "user_id": user["user_id"],
        "task_id": data.task_id,
        "minutos": minutos,
        "created_at": now_utc(),
    }

    await db.study_sessions.insert_one(doc)

    if task:
        novos_minutos = int(task.get("minutos_estudados", 0)) + minutos
        meta_minutos = int(task.get("minutos", 0))

        update_data = {
            "minutos_estudados": novos_minutos,
            "updated_at": now_utc(),
        }

        if meta_minutos > 0 and novos_minutos >= meta_minutos:
            update_data["concluida"] = True

        await db.study_tasks.update_one(
            {
                "task_id": data.task_id,
                "user_id": user["user_id"],
            },
            {
                "$set": update_data
            }
        )

    doc.pop("_id", None)

    return {
        "ok": True,
        "sessao": doc
    }


@api_router.get("/sessoes-estudo")
async def listar_sessoes_estudo(
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    sessoes = []

    async for sessao in db.study_sessions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50):
        created = sessao.get("created_at")

        if created:
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)

            sessao["created_at"] = created.isoformat()

        if sessao.get("task_id"):
            tarefa = await db.study_tasks.find_one(
                {
                    "task_id": sessao["task_id"],
                    "user_id": user["user_id"],
                },
                {
                    "_id": 0,
                    "disciplina_nome": 1,
                }
            )

            if tarefa:
                sessao["disciplina_nome"] = tarefa.get("disciplina_nome")

        sessoes.append(sessao)

    total_minutos = sum(
        int(s.get("minutos", 0))
        for s in sessoes
    )

    agora = now_utc()
    hoje = agora.date()
    inicio_7_dias = hoje - timedelta(days=6)

    minutos_hoje = 0
    sessoes_hoje = 0
    minutos_7_dias = 0
    sessoes_7_dias = 0

    por_dia = {}

    for i in range(7):
        dia = inicio_7_dias + timedelta(days=i)

        por_dia[dia.isoformat()] = {
            "data": dia.isoformat(),
            "minutos": 0,
            "sessoes": 0,
        }

    for sessao in sessoes:
        created_str = sessao.get("created_at")

        if not created_str:
            continue

        try:
            created = datetime.fromisoformat(created_str)
            dia = created.date()
        except Exception:
            continue

        minutos = int(sessao.get("minutos", 0))

        if dia == hoje:
            minutos_hoje += minutos
            sessoes_hoje += 1

        if inicio_7_dias <= dia <= hoje:
            minutos_7_dias += minutos
            sessoes_7_dias += 1

            chave = dia.isoformat()

            if chave in por_dia:
                por_dia[chave]["minutos"] += minutos
                por_dia[chave]["sessoes"] += 1

    return {
        "sessoes": sessoes,
        "total_minutos": total_minutos,
        "resumo": {
            "minutos_hoje": minutos_hoje,
            "sessoes_hoje": sessoes_hoje,
            "minutos_7_dias": minutos_7_dias,
            "sessoes_7_dias": sessoes_7_dias,
        },
        "ultimos_7_dias": list(por_dia.values()),
    }


# ============ ADMIN ============
class AdminCreateUserIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    is_admin: bool = False

class ConcursoIn(BaseModel):
    id: Optional[str] = None
    nome: str
    orgao: str
    cargo: str
    banca: str
    estado: str = "Nacional"
    vagas: int = 0
    salario: float = 0
    escolaridade: str = "Nível Superior"
    situacao: str = "Previsto"
    data_prova: Optional[str] = None
    disciplinas: List[str] = []
    area: str = "Geral"


@api_router.get("/admin/stats")
async def admin_stats(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    total_users = await db.users.count_documents({})
    blocked_users = await db.users.count_documents({"blocked": True})
    total_concursos = await db.concursos.count_documents({"deleted_at": {"$exists": False}})
    total_answers = await db.answers.count_documents({})
    total_simulados = await db.simulados.count_documents({"status": "concluido"})
    return {
        "total_users": total_users,
        "blocked_users": blocked_users,
        "total_concursos": total_concursos,
        "total_answers": total_answers,
        "total_simulados": total_simulados,
    }


@api_router.get("/admin/users")
async def admin_list_users(q: Optional[str] = None, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    query: dict = {}
    if q:
        rgx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"name": rgx}, {"email": rgx}]
    users = []
    async for u in db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(200):
        if isinstance(u.get("created_at"), datetime):
            u["created_at"] = u["created_at"].isoformat()
        users.append(u)
    return {"users": users}


@api_router.post("/admin/users")
async def admin_create_user(data: AdminCreateUserIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user_id = gen_id("user")
    await db.users.insert_one({
        "user_id": user_id, "email": data.email.lower(), "name": data.name,
        "password_hash": hash_password(data.password), "auth_type": "password",
        "created_at": now_utc(), "onboarded": False, "xp": 0, "streak": 0,
        "last_study_date": None, "concurso_id": None,
        "is_admin": data.is_admin, "blocked": False,
    })
    return {"ok": True, "user_id": user_id}


@api_router.post("/admin/users/{user_id}/block")
async def admin_block_user(user_id: str, authorization: Optional[str] = Header(None)):
    admin = await require_admin(authorization)
    if admin["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Você não pode bloquear a própria conta")
    r = await db.users.update_one({"user_id": user_id}, {"$set": {"blocked": True}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    # invalidate all google sessions of this user
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"ok": True}


@api_router.post("/admin/users/{user_id}/unblock")
async def admin_unblock_user(user_id: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    r = await db.users.update_one({"user_id": user_id}, {"$set": {"blocked": False}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"ok": True}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, authorization: Optional[str] = Header(None)):
    admin = await require_admin(authorization)
    if admin["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Você não pode excluir a própria conta")
    r = await db.users.update_one({"user_id": user_id}, {"$set": {"deleted_at": now_utc(), "blocked": True}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"ok": True}


@api_router.get("/admin/concursos")
async def admin_list_concursos(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    items = []
    async for c in db.concursos.find({"deleted_at": {"$exists": False}}, {"_id": 0}).sort("nome", 1):
        items.append(c)
    return {"concursos": items}


@api_router.post("/admin/concursos")
async def admin_create_concurso(data: ConcursoIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    cid = data.id or gen_id("cc")
    if await db.concursos.find_one({"id": cid}):
        raise HTTPException(status_code=400, detail="ID já existe")
    doc = data.dict(); doc["id"] = cid; doc["created_at"] = now_utc()
    await db.concursos.insert_one(doc)
    return {"ok": True, "id": cid}


@api_router.put("/admin/concursos/{concurso_id}")
async def admin_update_concurso(concurso_id: str, data: ConcursoIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    update = {k: v for k, v in data.dict().items() if k != "id" and v is not None}
    update["updated_at"] = now_utc()
    r = await db.concursos.update_one({"id": concurso_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Concurso não encontrado")
    return {"ok": True}


@api_router.delete("/admin/concursos/{concurso_id}")
async def admin_delete_concurso(concurso_id: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    r = await db.concursos.update_one({"id": concurso_id}, {"$set": {"deleted_at": now_utc()}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Concurso não encontrado")
    return {"ok": True}


class AdminQuestionIn(BaseModel):
    disciplina: str
    assunto: str = ""
    enunciado: str
    alternativas: List[str]
    correta: int
    explicacao: str = ""
    banca: str = "Própria"
    ano: int = 2026
    dificuldade: str = "media"
    area: Optional[str] = None


@api_router.get("/admin/questoes")
async def admin_list_questoes(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    items = [q async for q in db.questoes.find({"deleted_at": {"$exists": False}}, {"_id": 0}).limit(500)]
    return {"questoes": items}


@api_router.post("/admin/questoes")
async def admin_create_questao(data: AdminQuestionIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    if len(data.alternativas) < 2 or data.correta < 0 or data.correta >= len(data.alternativas):
        raise HTTPException(status_code=400, detail="Alternativas/resposta correta inválidas")
    doc = data.model_dump()
    doc["id"] = gen_id("q")
    doc["created_at"] = now_utc()
    await db.questoes.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api_router.put("/admin/questoes/{questao_id}")
async def admin_update_questao(questao_id: str, data: AdminQuestionIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    doc = data.model_dump()
    doc["updated_at"] = now_utc()
    r = await db.questoes.update_one({"id": questao_id}, {"$set": doc})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return {"ok": True}


@api_router.delete("/admin/questoes/{questao_id}")
async def admin_delete_questao(questao_id: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    r = await db.questoes.update_one({"id": questao_id}, {"$set": {"deleted_at": now_utc()}})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return {"ok": True}


class SuggestIn(BaseModel):
    quantidade: int = 5
    contexto: Optional[str] = None

@api_router.post("/admin/concursos/suggest")
async def admin_suggest_concursos(data: SuggestIn, authorization: Optional[str] = Header(None)):
    """Usa IA para sugerir concursos previstos/em andamento no Brasil, para o admin aprovar."""
    await require_admin(authorization)
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json as _json

    ctx = data.contexto or "concursos públicos brasileiros previstos, autorizados ou com edital publicado atualmente"
    prompt = (
        f"Liste {data.quantidade} concursos públicos brasileiros ({ctx}) em JSON puro (sem markdown). "
        "Formato: {\"concursos\":[{\"nome\":\"...\",\"orgao\":\"...\",\"cargo\":\"...\",\"banca\":\"...\",\"estado\":\"...\","
        "\"vagas\":numero,\"salario\":numero,\"escolaridade\":\"...\",\"situacao\":\"Previsto|Autorizado|Inscrições Abertas\","
        "\"data_prova\":\"YYYY-MM-DD ou null\",\"area\":\"...\",\"disciplinas\":[\"portugues\",\"raciocinio-logico\",...]}]}. "
        "Use apenas disciplinas comuns em português (portugues, matematica, raciocinio-logico, informatica, "
        "direito-constitucional, direito-administrativo, direito-penal, direito-civil, direito-tributario, "
        "direito-previdenciario, direito-trabalho, administracao-publica, contabilidade, atualidades, etica). "
        "Retorne SOMENTE o JSON, sem explicações."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=gen_id("admsug"),
                   system_message="Você é um especialista em concursos públicos brasileiros. Responda APENAS em JSON válido.").with_model("openai", "gpt-5.4-mini")
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        text = raw if isinstance(raw, str) else str(raw)
        # extract JSON
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        parsed = _json.loads(text)
        return {"sugestoes": parsed.get("concursos", [])}
    except Exception as e:
        logger.exception("suggest error")
        raise HTTPException(status_code=500, detail=f"IA falhou: {e}")


# ============ Root ============
@api_router.get("/")
async def root():
    return {"message": "MISSÃO APROV CONCURSO API", "version": "1.0"}


# ============ CONQUISTAS / NIVEIS ============

async def calcular_conquistas_usuario(user):
    uid = user["user_id"]

    xp = int(user.get("xp", 0))
    streak = int(user.get("streak", 0))

    questoes = await db.answers.count_documents({
        "user_id": uid
    })

    acertos = await db.answers.count_documents({
        "user_id": uid,
        "correta": True
    })

    simulados = await db.simulados.count_documents({
        "user_id": uid,
        "status": "concluido"
    })

    pipeline = [
        {"$match": {"user_id": uid}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$minutos"}
            }
        }
    ]

    minutos_estudo = 0

    async for item in db.study_sessions.aggregate(pipeline):
        minutos_estudo = int(item.get("total", 0))

    conquistas = [
        {
            "id": "primeira_questao",
            "titulo": "Primeiro passo",
            "descricao": "Responda sua primeira questão",
            "icone": "flag",
            "desbloqueada": questoes >= 1,
            "progresso": min(questoes, 1),
            "meta": 1,
        },
        {
            "id": "questoes_50",
            "titulo": "Em ritmo de prova",
            "descricao": "Responda 50 questões",
            "icone": "help-circle",
            "desbloqueada": questoes >= 50,
            "progresso": min(questoes, 50),
            "meta": 50,
        },
        {
            "id": "questoes_500",
            "titulo": "Máquina de questões",
            "descricao": "Responda 500 questões",
            "icone": "rocket",
            "desbloqueada": questoes >= 500,
            "progresso": min(questoes, 500),
            "meta": 500,
        },
        {
            "id": "acertos_100",
            "titulo": "Mira certeira",
            "descricao": "Acerte 100 questões",
            "icone": "checkmark-circle",
            "desbloqueada": acertos >= 100,
            "progresso": min(acertos, 100),
            "meta": 100,
        },
        {
            "id": "streak_3",
            "titulo": "Criando o hábito",
            "descricao": "Mantenha 3 dias de sequência",
            "icone": "flame",
            "desbloqueada": streak >= 3,
            "progresso": min(streak, 3),
            "meta": 3,
        },
        {
            "id": "streak_7",
            "titulo": "Semana perfeita",
            "descricao": "Mantenha 7 dias de sequência",
            "icone": "flame",
            "desbloqueada": streak >= 7,
            "progresso": min(streak, 7),
            "meta": 7,
        },
        {
            "id": "primeiro_simulado",
            "titulo": "Dia de prova",
            "descricao": "Conclua seu primeiro simulado",
            "icone": "document-text",
            "desbloqueada": simulados >= 1,
            "progresso": min(simulados, 1),
            "meta": 1,
        },
        {
            "id": "estudo_60",
            "titulo": "Hora do foco",
            "descricao": "Complete 60 minutos de estudo",
            "icone": "stopwatch",
            "desbloqueada": minutos_estudo >= 60,
            "progresso": min(minutos_estudo, 60),
            "meta": 60,
        },
        {
            "id": "estudo_600",
            "titulo": "Maratonista",
            "descricao": "Complete 10 horas de estudo",
            "icone": "medal",
            "desbloqueada": minutos_estudo >= 600,
            "progresso": min(minutos_estudo, 600),
            "meta": 600,
        },
        {
            "id": "xp_1000",
            "titulo": "Veterano",
            "descricao": "Alcance 1.000 XP",
            "icone": "trophy",
            "desbloqueada": xp >= 1000,
            "progresso": min(xp, 1000),
            "meta": 1000,
        },
    ]

    return conquistas


@api_router.get("/conquistas")
async def listar_conquistas(
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    conquistas = await calcular_conquistas_usuario(user)

    desbloqueadas = sum(
        1 for conquista in conquistas
        if conquista["desbloqueada"]
    )

    xp = int(user.get("xp", 0))
    nivel = (xp // 100) + 1
    xp_nivel = xp % 100

    return {
        "nivel": nivel,
        "xp": xp,
        "xp_nivel": xp_nivel,
        "xp_proximo_nivel": 100 - xp_nivel,
        "desbloqueadas": desbloqueadas,
        "total": len(conquistas),
        "conquistas": conquistas,
    }


class ConquistasVistasIn(BaseModel):
    ids: List[str]


@api_router.get("/conquistas/novas")
async def conquistas_novas(
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    conquistas = await calcular_conquistas_usuario(user)

    vistas = set(user.get("conquistas_vistas", []))

    novas = [
        c for c in conquistas
        if c["desbloqueada"] and c["id"] not in vistas
    ]

    return {
        "novas": novas
    }


@api_router.post("/conquistas/vistas")
async def marcar_conquistas_vistas(
    data: ConquistasVistasIn,
    authorization: Optional[str] = Header(None)
):
    user = await require_user(authorization)

    ids = list(dict.fromkeys(data.ids))

    if ids:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {
                "$addToSet": {
                    "conquistas_vistas": {
                        "$each": ids
                    }
                }
            }
        )

    return {
        "ok": True,
        "ids": ids
    }


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.password_resets.create_index("token", unique=True)
    await db.password_resets.create_index("expires_at", expireAfterSeconds=0)
    await db.concursos.create_index("id", unique=True)
    await db.disciplinas.create_index("id", unique=True)
    await db.questoes.create_index("id", unique=True)
    await db.favorites.create_index([("user_id", 1), ("questao_id", 1)], unique=True)
    # Seed disciplinas
    if await db.disciplinas.count_documents({}) == 0:
        await db.disciplinas.insert_many([dict(d) for d in DISCIPLINAS])
        logger.info(f"Seeded {len(DISCIPLINAS)} disciplinas")
    else:
        # Upsert any new disciplinas from static seed (e.g. after adding ENEM subjects)
        for d in DISCIPLINAS:
            await db.disciplinas.update_one({"id": d["id"]}, {"$setOnInsert": d}, upsert=True)
    # Seed questions into MongoDB so admin-created content and app use the same source
    if await db.questoes.count_documents({}) == 0:
        await db.questoes.insert_many([dict(q) for q in QUESTOES])
        logger.info(f"Seeded {len(QUESTOES)} questoes")
    # Seed concursos
    if await db.concursos.count_documents({}) == 0:
        await db.concursos.insert_many([dict(c) for c in CONCURSOS])
        logger.info(f"Seeded {len(CONCURSOS)} concursos")
    else:
        for c in CONCURSOS:
            await db.concursos.update_one({"id": c["id"]}, {"$setOnInsert": c}, upsert=True)
    # Ensure admin flag on ADMIN_EMAIL user if exists
    await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"is_admin": True}})
    logger.info("MISSÃO APROV CONCURSO API started")


@app.on_event("shutdown")
async def shutdown():
    client.close()

