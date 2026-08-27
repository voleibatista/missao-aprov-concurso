"""Backend tests for MISSÃO APROV CONCURSO API.

Covers: auth, onboarding, concursos, disciplinas, questoes, flashcards,
simulado, dashboard, and chat IA (Emergent LLM).
"""
import os
import time
import uuid
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://concurso-prep-61.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

TEST_EMAIL = f"TEST_{uuid.uuid4().hex[:8]}@missaoaprov.com"
TEST_PASSWORD = "Teste@2026"
TEST_NAME = "TEST User"

state = {}


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def auth_headers():
    return {"Authorization": f"Bearer {state['token']}", "Content-Type": "application/json"}


# ---------- Health ----------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert "MISSÃO" in r.json().get("message", "")


# ---------- Auth ----------
def test_register(s):
    r = s.post(f"{API}/auth/register", json={"name": TEST_NAME, "email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and "user" in d
    assert d["user"]["email"] == TEST_EMAIL.lower()
    assert d["user"]["onboarded"] is False
    state["token"] = d["token"]
    state["user_id"] = d["user"]["user_id"]


def test_register_duplicate(s):
    r = s.post(f"{API}/auth/register", json={"name": TEST_NAME, "email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 400


def test_login(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_wrong_password(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me(s):
    r = s.get(f"{API}/auth/me", headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["user"]["email"] == TEST_EMAIL.lower()


def test_me_unauthorized(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- Concursos & Disciplinas ----------
def test_list_concursos(s):
    r = s.get(f"{API}/concursos")
    assert r.status_code == 200
    lst = r.json()["concursos"]
    assert len(lst) > 0
    state["concurso_id"] = lst[0]["id"]


def test_get_concurso(s):
    r = s.get(f"{API}/concursos/{state['concurso_id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["concurso"]["id"] == state["concurso_id"]
    assert isinstance(body["disciplinas"], list)


def test_get_concurso_404(s):
    r = s.get(f"{API}/concursos/nope")
    assert r.status_code == 404


def test_list_disciplinas(s):
    r = s.get(f"{API}/disciplinas")
    assert r.status_code == 200
    ds = r.json()["disciplinas"]
    assert len(ds) > 0
    state["disciplina_id"] = ds[0]["id"]


# ---------- Onboarding ----------
def test_onboarding(s):
    r = s.post(f"{API}/onboarding", headers=auth_headers(), json={
        "concurso_id": state["concurso_id"], "horas_dia": 4, "dias_semana": 6,
        "nivel": "intermediario", "dificuldades": [], "dominios": [],
    })
    assert r.status_code == 200
    # Verify persisted
    me = s.get(f"{API}/auth/me", headers=auth_headers()).json()["user"]
    assert me["onboarded"] is True
    assert me["horas_dia"] == 4
    assert me["concurso_id"] == state["concurso_id"]


# ---------- Questões ----------
def test_list_questoes(s):
    r = s.get(f"{API}/questoes?limit=10")
    assert r.status_code == 200
    qs = r.json()["questoes"]
    assert len(qs) > 0
    state["questao"] = qs[0]


def test_list_questoes_filter(s):
    disc = state["questao"]["disciplina"]
    r = s.get(f"{API}/questoes?disciplina={disc}")
    assert r.status_code == 200
    for q in r.json()["questoes"]:
        assert q["disciplina"] == disc


def test_answer_questao_correct(s):
    q = state["questao"]
    r = s.post(f"{API}/questoes/answer", headers=auth_headers(),
               json={"questao_id": q["id"], "resposta": q["correta"]})
    assert r.status_code == 200
    d = r.json()
    assert d["correta"] is True
    assert d["xp_gain"] == 10
    assert isinstance(d["explicacao"], str) and len(d["explicacao"]) > 0


def test_answer_questao_wrong(s):
    q = state["questao"]
    wrong = (q["correta"] + 1) % 4
    r = s.post(f"{API}/questoes/answer", headers=auth_headers(),
               json={"questao_id": q["id"], "resposta": wrong})
    assert r.status_code == 200
    d = r.json()
    assert d["correta"] is False
    assert d["xp_gain"] == 3


# ---------- Flashcards (SM-2 intervals) ----------
def test_list_flashcards(s):
    r = s.get(f"{API}/flashcards", headers=auth_headers())
    assert r.status_code == 200
    fcs = r.json()["flashcards"]
    assert len(fcs) > 0
    state["flashcard"] = fcs[0]


def test_flashcard_review_intervals(s):
    fid = state["flashcard"]["id"]
    # facil -> 7 days
    r = s.post(f"{API}/flashcards/review", headers=auth_headers(),
               json={"flashcard_id": fid, "resultado": "facil"})
    assert r.status_code == 200
    assert r.json()["interval_days"] == 7
    # lembrei following facil -> max(3, 7*2) = 14
    r = s.post(f"{API}/flashcards/review", headers=auth_headers(),
               json={"flashcard_id": fid, "resultado": "lembrei"})
    assert r.json()["interval_days"] == 14
    # nao_lembro -> reset 0
    r = s.post(f"{API}/flashcards/review", headers=auth_headers(),
               json={"flashcard_id": fid, "resultado": "nao_lembro"})
    assert r.json()["interval_days"] == 0
    # dificil after 0 -> 1
    r = s.post(f"{API}/flashcards/review", headers=auth_headers(),
               json={"flashcard_id": fid, "resultado": "dificil"})
    assert r.json()["interval_days"] == 1


# ---------- Simulado ----------
def test_simulado_flow(s):
    r = s.post(f"{API}/simulado/start", headers=auth_headers(),
               json={"num_questoes": 5})
    assert r.status_code == 200
    d = r.json()
    sid = d["simulado_id"]
    questoes = d["questoes"]
    assert len(questoes) == 5
    # answer all correctly
    respostas = {q["id"]: q["correta"] for q in questoes}
    r = s.post(f"{API}/simulado/submit", headers=auth_headers(),
               json={"simulado_id": sid, "respostas": respostas})
    assert r.status_code == 200
    res = r.json()
    assert res["total"] == 5
    assert res["acertos"] == 5
    assert res["percentual"] == 100.0
    assert isinstance(res["por_disciplina"], dict)
    assert res["xp_gain"] == 75


def test_simulados_historico(s):
    r = s.get(f"{API}/simulados/historico", headers=auth_headers())
    assert r.status_code == 200
    assert len(r.json()["simulados"]) >= 1


# ---------- Dashboard ----------
def test_dashboard(s):
    r = s.get(f"{API}/dashboard", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    for k in ("questoes_respondidas", "acertos", "taxa_acerto",
              "flashcards_pendentes", "simulados_realizados",
              "percentual_preparacao", "por_disciplina", "meta_diaria"):
        assert k in d, f"missing {k}"
    assert d["simulados_realizados"] >= 1
    assert d["questoes_respondidas"] >= 2


# ---------- Chat IA ----------
def test_chat_ask_portuguese(s):
    r = s.post(f"{API}/chat/ask", headers=auth_headers(),
               json={"message": "Explique brevemente o princípio da legalidade no direito administrativo."},
               timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "session_id" in d
    text = d["response"]
    assert isinstance(text, str) and len(text) > 20
    state["chat_session"] = d["session_id"]


def test_chat_history(s):
    sid = state.get("chat_session")
    if not sid:
        pytest.skip("no chat session")
    r = s.get(f"{API}/chat/history/{sid}", headers=auth_headers())
    assert r.status_code == 200
    msgs = r.json()["messages"]
    assert len(msgs) >= 2
    assert msgs[0]["role"] == "user"


# ---------- Logout ----------
def test_logout(s):
    r = s.post(f"{API}/auth/logout", headers=auth_headers())
    assert r.status_code == 200
