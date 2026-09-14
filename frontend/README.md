# Adaptive Fitness Coach — frontend

React 19 + Vite 6 + Tailwind 4 client for the FastAPI backend in `../backend`.

```bash
npm install
npm run dev        # http://localhost:3000  (backend expected at http://127.0.0.1:8000)
npm run build      # production bundle in dist/
npm run typecheck  # tsc --noEmit
npm test           # vitest: API client contract + formatting helpers
```

Set `VITE_API_BASE_URL` in `.env` (see `.env.example`) to target a different
backend. No other configuration exists.

## Rules this code follows

- **The backend decides everything.** Session scores, trends, confidence,
  PROGRESS / HOLD / BACK OFF and the next weight/reps/sets all come from the
  API. `src/utils` only formats values; nothing in `src/` computes a
  recommendation.
- **One HTTP layer.** `src/api/client.ts` is the only `fetch()` call;
  `src/api/fitness.ts` has one typed function per endpoint. Request and
  response bodies are camelCase, matching `backend/schemas.py`
  (`src/types/api.ts`).
- **Timestamps are UTC.** The backend returns naive ISO strings without a
  `Z`; `parseUtc()` in `src/utils/format.ts` handles that. Always go through it.
- **Inputs are weight, reps, sets, RPE (integer 1–10).** The weight stepper
  moves in the backend's 2.5 kg step. Nothing else is collected.

## Screens

| Screen | Data |
|--------|------|
| Dashboard ("Next up") | `GET /state/summary` (+ `GET /exercises` to spot exercises with no sessions) |
| Exercise detail | `GET /state/{id}`, `GET /logs/{id}?limit=20`, `GET /adaptations/{id}` |
| Log session | planned values from the current state; `POST /logs` returns the fresh recommendation shown in `AdaptationResultModal` |
| History | `GET /logs/{id}?limit=50` for every exercise, merged newest-first |
