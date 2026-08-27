"""MISSÃO APROV CONCURSO — Backend API."""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt as pyjwt
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from seed_data import CONCURSOS, DISCIPLINAS, QUESTOES, FLASHCARDS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

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
    return user


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
    }
    await db.users.insert_one(user_doc)
    token = make_jwt(user_id)
    return {"token": token, "user": {k: v for k, v in user_doc.items() if k not in ("_id", "password_hash")}}


@api_router.post("/auth/login")
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = make_jwt(user["user_id"])
    user.pop("_id", None); user.pop("password_hash", None)
    return {"token": token, "user": user}


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
    result = CONCURSOS[:]
    if q:
        ql = q.lower()
        result = [c for c in result if ql in c["nome"].lower() or ql in c["orgao"].lower() or ql in c["cargo"].lower()]
    if situacao:
        result = [c for c in result if c["situacao"] == situacao]
    if area:
        result = [c for c in result if c["area"] == area]
    return {"concursos": result}


@api_router.get("/concursos/{concurso_id}")
async def get_concurso(concurso_id: str):
    for c in CONCURSOS:
        if c["id"] == concurso_id:
            disc_ids = c.get("disciplinas", [])
            disciplinas = [d for d in DISCIPLINAS if d["id"] in disc_ids]
            return {"concurso": c, "disciplinas": disciplinas}
    raise HTTPException(status_code=404, detail="Concurso não encontrado")


# ============ DISCIPLINAS ============
@api_router.get("/disciplinas")
async def list_disciplinas():
    return {"disciplinas": DISCIPLINAS}


# ============ QUESTOES ============
@api_router.get("/questoes")
async def list_questoes(disciplina: Optional[str] = None, banca: Optional[str] = None, limit: int = 20):
    result = QUESTOES[:]
    if disciplina:
        result = [q for q in result if q["disciplina"] == disciplina]
    if banca:
        result = [q for q in result if q.get("banca") == banca]
    return {"questoes": result[:limit]}


@api_router.get("/questoes/{questao_id}")
async def get_questao(questao_id: str):
    for q in QUESTOES:
        if q["id"] == questao_id:
            return {"questao": q}
    raise HTTPException(status_code=404, detail="Questão não encontrada")


@api_router.post("/questoes/answer")
async def answer_questao(data: QuestionAnswer, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    questao = next((q for q in QUESTOES if q["id"] == data.questao_id), None)
    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    correta = questao["correta"] == data.resposta
    await db.answers.insert_one({
        "user_id": user["user_id"], "questao_id": data.questao_id,
        "disciplina": questao["disciplina"], "resposta": data.resposta,
        "correta": correta, "created_at": now_utc(),
    })
    # XP + streak
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
    pool = QUESTOES[:]
    if data.disciplinas:
        pool = [q for q in pool if q["disciplina"] in data.disciplinas]
    elif data.concurso_id:
        concurso = next((c for c in CONCURSOS if c["id"] == data.concurso_id), None)
        if concurso:
            pool = [q for q in pool if q["disciplina"] in concurso.get("disciplinas", [])]
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
    respostas: dict  # questao_id -> index

@api_router.post("/simulado/submit")
async def simulado_submit(data: SimuladoSubmit, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    sim = await db.simulados.find_one({"simulado_id": data.simulado_id, "user_id": user["user_id"]}, {"_id": 0})
    if not sim:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")
    corrigidas = []
    acertos = 0
    total = len(sim["questao_ids"])
    por_disciplina = {}
    for qid in sim["questao_ids"]:
        q = next((x for x in QUESTOES if x["id"] == qid), None)
        if not q: continue
        resp = data.respostas.get(qid, -1)
        certo = q["correta"] == resp
        if certo: acertos += 1
        d = q["disciplina"]
        por_disciplina.setdefault(d, {"total": 0, "acertos": 0})
        por_disciplina[d]["total"] += 1
        if certo: por_disciplina[d]["acertos"] += 1
        corrigidas.append({"questao": q, "resposta": resp, "correta": certo})
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
        disc = next((d for d in DISCIPLINAS if d["id"] == r["_id"]), None)
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

    system = ("Você é o Professor IA do MISSÃO APROV CONCURSO, um tutor especialista em concursos públicos brasileiros. "
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
    system = ("Você é o Professor IA do MISSÃO APROV CONCURSO, tutor especialista em concursos públicos brasileiros. "
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


# ============ Root ============
@api_router.get("/")
async def root():
    return {"message": "MISSÃO APROV CONCURSO API", "version": "1.0"}


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    logger.info("MISSÃO APROV CONCURSO API started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
