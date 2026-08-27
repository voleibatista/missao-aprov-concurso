# MISSÃO APROV CONCURSO — PRD

## Vision
Mobile app that dramatically increases study efficiency for Brazilian public exam (concurso público) candidates through AI-powered personalization.

## MVP Scope (delivered)
1. **Auth**: Email/password (JWT) + Emergent-managed Google login. Unified user model.
2. **Onboarding**: 3-step wizard (concurso → hours/day → level).
3. **Home Dashboard**: Preparation %, streak, XP, questions, accuracy, per-discipline performance, daily goal.
4. **Concursos Explorer**: 6 seeded contests (INSS, PF, PRF, TRT, Receita, Câmara) with search.
5. **Disciplinas**: 17 disciplines library.
6. **Question Bank**: 20+ seeded questions with filter by discipline; answer + explanation + XP.
7. **Flashcards**: 12+ flashcards with Anki-like spaced repetition (SM-2 simplified) and 4 response buttons.
8. **Simulado**: Configurable timed mock exam with per-discipline breakdown.
9. **Professor IA**: Chat with GPT-5.4-mini via Emergent LLM Key.
10. **Perfil**: Level/XP progression, quick menu.
11. **Gamification**: XP per action, streak tracking, level (100 XP/level).

## Tech
- **Frontend**: Expo React Native + expo-router (file-based routing), reanimated for flashcard flip.
- **Backend**: FastAPI + MongoDB (motor). All routes under `/api`.
- **AI**: `emergentintegrations.llm.chat` — `openai:gpt-5.4-mini`.
- **Auth**: JWT (email/password) OR session_token (Google) — both accepted by `/api/auth/me`.

## Business Enhancement (post-MVP)
- **Premium subscription** (R$29.90/mês): unlimited Professor IA messages, unlimited simulados, edital analysis, mind maps, reta-final mode. Free tier: 20 IA messages/day, 3 simulados/day.
- Would drive strong LTV as concurseiros study for 12-24+ months.

## Not-Yet-Built (roadmap)
- Edital PDF analysis (planned integration point).
- Push notifications (Emergent-managed).
- Admin web panel.
- Mind maps generator.
- Reta final mode.
- Ranking social.
