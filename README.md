# Adaptive Fitness Coach

A deterministic REST backend that turns workout logs into next-session
recommendations, plus a React frontend (`frontend/`) for logging sessions and
viewing them. The backend is the single source of truth for every score,
trend, confidence, PROGRESS / HOLD / BACK OFF decision and prescription; the
frontend only displays what the API returns. A user logs an exercise with **weight, reps, sets** (planned
and actual) and an **RPE** (1–10). The backend analyses the last five sessions
for that exercise and answers with exactly one of:

| Decision   | Meaning                                                   |
|------------|-----------------------------------------------------------|
| `PROGRESS` | Recent evidence is strong and consistent — load goes up.  |
| `HOLD`     | Stable, mixed, or not enough history — keep the plan.     |
| `BACK OFF` | A persistent decline / high effort — load goes down.      |

…plus the concrete next prescription, a confidence score, the trend, the
numbers behind the decision, and a plain-English explanation.

The core PROGRESS / HOLD / BACK OFF decision above is driven only by logged
performance (weight, reps, sets, RPE) — it never depends on how the athlete
says they feel going in. Recovery signals (sleep, muscle freshness, energy,
stress, soreness) are handled separately, as a **pre-workout readiness
check-in** that adjusts *that day's target load* before the set is even
attempted — see "Readiness, autoregulation & explainability" below. No LLM or
AI service is involved in any numerical decision — the engine is pure Python
and the same input always produces the same output.

---

## Quick start

```bash
git clone <this repo>
cd Adapt
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

uvicorn backend.main:app --reload
```

Open <http://127.0.0.1:8000/docs>. The repository ships with a seeded SQLite
database (`fitness.db`) so the API is immediately usable — **no seed step is
needed after cloning**. Try `GET /state/summary`.

Tested with Python 3.14 / FastAPI 0.141 / SQLAlchemy 2.0 / Pydantic 2.13.

### Frontend

With the API running, in a second terminal:

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

The frontend talks to `http://127.0.0.1:8000` by default. To point it
elsewhere, copy `frontend/.env.example` to `frontend/.env` and set
`VITE_API_BASE_URL`. Other scripts: `npm run build`, `npm run typecheck`,
`npm test` (Vitest: API client contract and formatting helpers).

Screens: **Next up** (dashboard from `GET /state/summary`), **exercise
detail** (`/state/{id}`, `/logs/{id}`, `/adaptations/{id}`), **log session**
(`POST /logs` → the fresh recommendation is shown immediately) and
**History** (all logs, newest first). No workout input other than weight,
reps, sets and RPE exists, and no decision logic runs in the browser.

> Logging sessions through the UI writes to whatever database the backend is
> using. To keep the committed `fitness.db` pristine while trying the app,
> run the backend with `DATABASE_URL=sqlite:///./scratch.db` (see `.env.example`)
> or re-run `python -m backend.seed` afterwards.

---

## Architecture

```
HTTP (JSON, camelCase)
   │
   ▼
backend/routes/*        thin FastAPI routers: validation via Pydantic, HTTP errors
   │
   ▼
backend/services.py     orchestration: save log → run engine → save state + adaptation
   │                                  │
   ▼                                  ▼
backend/crud.py         backend/engine/   pure, deterministic Python (no I/O, no framework)
   │                      scoring → analysis → decision → explanation
   ▼
SQLite via SQLAlchemy (backend/models.py, backend/database.py)
```

The engine never touches the database or FastAPI; it takes plain dataclasses
and returns plain dataclasses, so it is fully unit-testable on its own. The
service layer is the only place that reads and writes the database.

### Request flow for `POST /logs`

1. Validate the body (strict camelCase, ranges, `rpe` 1–10).
2. Insert the `workout_logs` row with its `session_score`.
3. Load the exercise's most recent 5 logs (including this one).
4. `engine.evaluate(history, base=planned prescription of this log)`.
5. Upsert `exercise_state` (one row per exercise).
6. Insert an `adaptations` row (audit trail, one per log).
7. Return the recommendation.

---

## Project structure

```
Adapt/
├── README.md
├── fitness.db              seeded demo database (committed; used as-is after clone)
├── requirements.txt
├── pyproject.toml          pytest configuration
├── .env.example            optional environment variables
├── scripts/
│   └── simulate.py         closed-loop simulator used to validate the engine
├── frontend/               Vite + React + Tailwind client (see frontend/README.md)
│   └── src/
│       ├── api/            the only place fetch() is called; typed per endpoint
│       ├── types/api.ts    TypeScript mirrors of backend/schemas.py
│       ├── hooks/          data loading (summary, exercise detail, all logs)
│       ├── pages/          Dashboard, ExerciseDetail, LogWorkout, History
│       ├── components/     ExerciseCard, Stepper, RpeSelector, TrendChart, AdaptationResultModal, …
│       └── utils/          presentation-only formatting (UTC dates, "62.5 kg × 8 × 3", decision colours)
└── backend/
    ├── main.py             FastAPI app, CORS, routers, GET /health
    ├── settings.py         DATABASE_URL, CORS_ORIGINS (from .env / environment)
    ├── database.py         SQLAlchemy engine, session, get_db()
    ├── models.py           ORM models (4 tables)
    ├── schemas.py          Pydantic request/response models (camelCase)
    ├── crud.py             database queries only
    ├── services.py         business orchestration (the one write path)
    ├── seed.py             rebuilds the demo database
    ├── routes/
    │   ├── exercises.py    GET /exercises
    │   ├── logs.py         POST /logs, GET /logs/{exerciseId}
    │   ├── state.py        GET /state/summary, GET /state/{exerciseId}
    │   └── adaptations.py  GET /adaptations/{exerciseId}
    ├── engine/             pure adaptive engine
    │   ├── __init__.py     evaluate(sessions, base) — the single entry point
    │   ├── config.py       EngineConfig — every tunable number lives here
    │   ├── types.py        dataclasses / enums shared by the engine
    │   ├── scoring.py      per-session metrics and the 0–100 session score
    │   ├── analysis.py     window statistics: weighted averages, trends, variability
    │   ├── decision.py     signal strength, confidence, decision, next prescription
    │   └── explanation.py  deterministic explanation templates
    └── tests/
        ├── conftest.py
        ├── test_scoring.py, test_analysis.py, test_decision.py, test_explanation.py
        ├── test_simulation.py   closed-loop scenarios (see "Validation")
        ├── test_api.py          end-to-end API tests on a temporary database
        └── test_seed.py
```

---

## Database schema (SQLite via SQLAlchemy)

```
exercises
  id              INTEGER  PK
  name            TEXT     UNIQUE, NOT NULL
  muscle_group    TEXT     NOT NULL

workout_logs                              one row per logged session
  id              INTEGER  PK
  exercise_id     INTEGER  FK -> exercises.id
  logged_at       DATETIME UTC (naive ISO 8601)
  planned_weight  REAL     planned_reps INTEGER   planned_sets INTEGER
  actual_weight   REAL     actual_reps  INTEGER   actual_sets  INTEGER
  rpe             INTEGER  1..10
  session_score   REAL     0..100, computed by the engine at insert time
  index (exercise_id, logged_at)

exercise_state                            exactly one row per exercise (upserted)
  exercise_id     INTEGER  PK, FK -> exercises.id
  current_weight  REAL     current_reps INTEGER   current_sets INTEGER   (the NEXT prescription)
  decision        TEXT     PROGRESS | HOLD | BACK OFF
  confidence      INTEGER  0..100
  trend_direction TEXT     IMPROVING | STABLE | DECLINING
  explanation     TEXT
  updated_at      DATETIME

adaptations                               audit trail: one row per decision
  id              INTEGER  PK
  workout_log_id  INTEGER  FK -> workout_logs.id (unique)
  exercise_id     INTEGER  FK -> exercises.id
  logged_at       DATETIME
  old_weight/new_weight  REAL      old_reps/new_reps  INTEGER      old_sets/new_sets  INTEGER
  decision        TEXT
  confidence      INTEGER
  explanation     TEXT
```

Tables are created automatically at startup (`Base.metadata.create_all`);
there is no migration tool, by design.

---

## Running

| Task | Command (from the repo root) |
|------|------------------------------|
| API server | `uvicorn backend.main:app --reload` |
| Interactive docs | <http://127.0.0.1:8000/docs> |
| Rebuild demo data | `python -m backend.seed` |
| Tests | `pytest` |
| Engine simulations | `python scripts/simulate.py --all` (add `--tables`, or a scenario name, for detail) |

### Demo data

`fitness.db` is committed and is the database the app uses by default.
`python -m backend.seed` is the reproducibility mechanism: it **drops every
table, recreates the schema and inserts the demo data** — the whole database
is replaced. It writes to whatever `DATABASE_URL` points at (default
`fitness.db`). Three exercises, 12 sessions each (~4 weeks, 3/week), all
inserted through the same code path as `POST /logs`:

| Exercise | Pattern | Final decision |
|----------|---------|----------------|
| Barbell Squat | steadily strong, one clearly bad session, then recovery | `PROGRESS` — the single bad day never caused a BACK OFF |
| Bench Press | RPE creeps up over several sessions, then reps are missed | `BACK OFF` |
| Romanian Deadlift | meets the plan at RPE 7–8 throughout | `HOLD` |

### Configuration (optional)

Copy `.env.example` to `.env` if needed.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///<repo>/fitness.db` | SQLAlchemy database URL |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins, e.g. `http://localhost:5173,https://my-app.lovable.app` |

With `*`, any origin (including a Lovable-hosted frontend) can call the API.
Listing explicit origins also enables `allow_credentials`.

---

## API

All JSON is **camelCase**, in requests and responses. Request bodies must use
camelCase keys; unknown keys (including snake_case) are rejected with `422`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness check → `{"status":"ok"}` |
| `GET` | `/exercises` | List exercises |
| `POST` | `/logs` | Log a session, get the next-session recommendation (`201`) |
| `GET` | `/logs/{exerciseId}?limit=20` | Recent history for charts, oldest → newest |
| `GET` | `/state/summary` | Current state of every exercise (dashboard) |
| `GET` | `/state/{exerciseId}` | Current recommendation for one exercise (`404` until first log) |
| `GET` | `/adaptations/{exerciseId}` | Decision audit trail, newest first |
| `POST` | `/exercises/{exerciseId}/readiness` | Pre-workout readiness check-in → adjusted target load (see below) |
| `POST` | `/api/autoregulation/evaluate` | Intra-session RPE overshoot/undershoot check (see below) |

Errors: `404` unknown exercise / no state yet, `422` validation.

### `POST /logs`

Request:

```json
{
  "exerciseId": 1,
  "plannedWeight": 60, "plannedReps": 8, "plannedSets": 3,
  "actualWeight": 60,  "actualReps": 8,  "actualSets": 3,
  "rpe": 7,
  "loggedAt": "2026-09-14T10:00:00"
}
```

`loggedAt` is optional (naive ISO 8601, UTC; defaults to now). Weights are
in kg and must be `> 0`; reps/sets `>= 1`; `rpe` an integer `1..10`.

Response `201`:

```json
{
  "exerciseId": 1,
  "logId": 42,
  "decision": "PROGRESS",
  "previous": { "weight": 60.0, "reps": 8, "sets": 3 },
  "next":     { "weight": 62.5, "reps": 8, "sets": 3 },
  "confidence": 83,
  "trendDirection": "IMPROVING",
  "reasoning": {
    "sessionCount": 5,
    "sessionScore": 88.2,
    "recentScore": 74.0,
    "weightedScore": 78.6,
    "performanceTrend": 7.1,
    "rpeTrend": -0.54,
    "volumeTrend": 6.7,
    "consistency": 9.8,
    "signalStrength": 0.861
  },
  "explanation": "Your performance has been improving across your recent sessions while perceived effort has been falling and RPE remains manageable. The system is increasing the load notably for your next session. Based on your last 5 sessions: weighted recent score 79/100, performance trend +7.1 pts/session, RPE trend -0.5/session, confidence 83%. Next prescription: 65 kg x 8 reps x 3 sets (weight 60 kg -> 65 kg)."
}
```

`previous` is the prescription the athlete just trained under (the log's
planned values); `next` is what to attempt next session. `reasoning` fields:

| Field | Meaning |
|-------|---------|
| `sessionCount` | sessions in the analysed window (max 5) |
| `sessionScore` | score of the session just logged |
| `recentScore` | plain mean of window scores |
| `weightedScore` | recency-weighted mean of window scores |
| `performanceTrend` | score points per session (weighted slope) |
| `rpeTrend` | RPE units per session (weighted slope) |
| `volumeTrend` | % of mean volume per session (weighted slope) |
| `consistency` | standard deviation of window scores (lower = steadier) |
| `signalStrength` | composite evidence in `[-1, 1]` (+ progress, − back off) |

### `GET /logs/{exerciseId}`

```json
{
  "exerciseId": 1,
  "exerciseName": "Barbell Squat",
  "logs": [
    {
      "id": 1, "loggedAt": "2026-08-20T15:18:38",
      "plannedWeight": 80.0, "plannedReps": 5, "plannedSets": 3,
      "actualWeight": 80.0,  "actualReps": 5,  "actualSets": 3,
      "rpe": 7, "volume": 1200.0, "sessionScore": 67.5
    }
  ]
}
```

### `GET /state/{exerciseId}` and `GET /state/summary`

```json
{
  "exerciseId": 2,
  "exerciseName": "Bench Press",
  "muscleGroup": "Chest",
  "decision": "BACK OFF",
  "confidence": 72,
  "trendDirection": "DECLINING",
  "current": { "weight": 55.0, "reps": 8, "sets": 2 },
  "explanation": "Your performance has been declining across multiple recent sessions while perceived effort has been rising. ...",
  "updatedAt": "2026-09-14T15:18:38"
}
```

`/state/summary` returns a list of these (only exercises that have a state).

### `GET /adaptations/{exerciseId}`

```json
[
  {
    "id": 24, "workoutLogId": 24, "exerciseId": 2, "loggedAt": "2026-09-14T15:18:38",
    "decision": "BACK OFF", "confidence": 72,
    "previous": { "weight": 62.5, "reps": 8, "sets": 3 },
    "next":     { "weight": 55.0, "reps": 8, "sets": 2 },
    "explanation": "..."
  }
]
```

---

## Readiness, autoregulation & explainability

Three additional pieces sit alongside the core PROGRESS / HOLD / BACK OFF
engine. None of them can change what the engine decides after the fact —
they only change what the athlete is asked to attempt, or how the decision
is narrated.

### Pre-workout readiness check-in

Before logging a session, the athlete rates five things on a 1-5 scale:
sleep, muscle freshness and energy/drive (1 = worst, 5 = best), and
stress and soreness (1 = best/calm/pain-free, 5 = worst/overwhelmed/severe).
`POST /exercises/{exerciseId}/readiness` (`backend/engine/readiness.py`,
`calculate_composite_readiness`) combines them into a 0-100 readiness score
— weighted 25 % each for sleep/freshness/energy and 12.5 % each for
stress/soreness — and a load modifier clamped to **±10 %**, centered so a
neutral check-in (all 3s) always returns exactly `0.0`, never a false
positive or negative. The frontend's `PreWorkoutCheckInCard` calls this
endpoint directly rather than recomputing the score itself, so the number
shown to the athlete and the load actually used can never disagree.

Applying the check-in doesn't just cosmetically fill in the "actual weight"
field — it replaces the plan the session is scored against
(`LogWorkoutPage`'s `effectivePlanned`), so a rational, fatigue-driven
reduction is compared to the *adjusted* target rather than the original one.
Without this, a legitimately lighter day would look like a missed lift and
could pull the next PROGRESS/HOLD/BACK OFF decision toward BACK OFF for the
wrong reason.

### Intra-session set autoregulation

`POST /api/autoregulation/evaluate` (`backend/engine/decision.py`,
`evaluate_set_overshoot`) reacts within a session: if RPE overshoots the
target by ≥ 2.0 mid-session, it recommends an immediate 5 % load drop
("fatigue stop"); if set 1 undershoots the target RPE by ≥ 2.5, it offers an
optional small jump ("primed" progression). This is a same-session nudge,
separate from the next-session PROGRESS/HOLD/BACK OFF decision.

### Glass-box explainability

`POST /logs` and `GET /state/*` also return `glassBox`, `athleteState`,
`baseline`, `counterfactuals` and `sessionDelta` (`backend/engine/rules.py`)
— a component-by-component breakdown of the signal, the rules that fired,
a plain-language coaching rationale, and "what would have had to be true"
counterfactuals (e.g. what RPE would have flipped the decision). This is
still pure Python computed from the same numbers as the core decision; it
narrates a decision already made rather than making a separate one.

---

## The adaptive engine

Everything below is in `backend/engine/`; every number is a field of
`EngineConfig` (`engine/config.py`) with the default shown.

### 1. Session score (`scoring.py`) — 0–100

Per session: `volume = actual_weight × actual_reps × actual_sets`,
`rep_completion = (actual_reps × actual_sets) / (planned_reps × planned_sets)`,
`weight_ratio = actual_weight / planned_weight`,
`volume_ratio = volume / planned_volume`.

| Component | Formula (each clamped 0–100) | Weight |
|-----------|-------------------------------|--------|
| execution | `100 × rep_completion` | 0.35 |
| load | `50 + 250 × (weight_ratio − 1)` (plan = 50, +10 % = 75) | 0.15 |
| volume | `50 + 250 × (volume_ratio − 1)` | 0.20 |
| effort | `50 + (7 − rpe) × 20` (RPE 7 = 50, 6 = 70, 9 = 10) | 0.30 |

`score = clamp(Σ weight × component, 0, 100)`. No component weighs more than
0.35, so no single metric dominates. Reference points: plan met at RPE 7 →
**67.5**, at RPE 6 → 73.5, at RPE 8 → 61.5, at RPE 9 → 55.5. Because load
and volume are relative to the plan, the score measures the *response to the
prescription*.

### 2. History analysis (`analysis.py`)

Window = last **5** sessions (or all, if fewer). Recency weights are linear
(`1/15, 2/15, 3/15, 4/15, 5/15` for five sessions), so newer sessions count
more. Trends are recency-weighted least-squares slopes over the session index
— a single abnormal session moves the slope far less than the surrounding
sessions do. Outputs: recent average, weighted average, performance trend,
RPE trend, volume trend (% of mean volume per session), score standard
deviation, residual around the trend line, count of *poor* sessions among the
last three, and `trendDirection` (`IMPROVING` if slope ≥ +1.5 pts/session,
`DECLINING` if ≤ −1.5, else `STABLE`).

A **poor session** scores below 60 — i.e. missed reps or RPE ≥ 9. Simply
meeting the plan at RPE 8 (61.5) is not poor.

### 3. Signal strength (`decision.py`) — one number in [−1, +1]

```
perf   = clamp(performance_trend / 5, -1, 1)
level  = clamp((weighted_avg_score - 65) / 10, -1, 1)
rpe    = 0.5 × clamp(-rpe_trend / 1.0, -1, 1) + 0.5 × clamp((7 - weighted_avg_rpe) / 2, -1, 1)
volume = clamp(volume_trend / 5, -1, 1)
signal = 0.35·perf + 0.30·level + 0.20·rpe + 0.15·volume
```

"Consistently strong" (flat but high) histories progress via `level`;
"improving" ones via `perf`/`volume`; rising RPE against flat performance
pulls the signal negative.

### 4. Decision rules (in order)

1. **< 3 sessions → `HOLD`**, confidence capped at 35.
2. `signal ≥ 0.25` **and** weighted RPE ≤ 8.5 **and** the latest session is
   not poor **and** confidence ≥ 40 → **`PROGRESS`**.
3. `signal ≤ −0.25` **and** ≥ 2 of the last 3 sessions are poor **and** the
   weighted average score is itself poor (< 60) **and** (performance trend < 0
   or weighted RPE ≥ 8.5) **and** confidence ≥ 40 → **`BACK OFF`**.
4. Otherwise → **`HOLD`**.

Rule 3 is what makes BACK OFF require a *persistent* decline: one bad day
cannot satisfy it, and neither can two poor sessions inside an otherwise good
window. Rule 2's "latest session not poor" clause means a bad day produces a
HOLD, never a load increase.

### 5. Confidence — 0–100

| Part | Max | Rises with |
|------|-----|-----------|
| history | 30 | number of sessions in the window (5 → full credit) |
| consistency | 25 | low score standard deviation (0 credit at σ ≥ 25) |
| trend fit | 20 | small residual around the trend line (a clean trend, up, down *or* flat) |
| agreement | 25 | objective volume trend and RPE trend pointing the same way; scaled by trend fit so noise earns no credit |

### 6. Prescription changes

Magnitude scales with `|signal|`: PROGRESS maps `[0.25, 1]` onto
**+2.5 % … +7.5 %**, BACK OFF onto **−5 % … −12.5 %**. Weights are rounded to
**2.5 kg** and a change is never smaller than one step.

* **PROGRESS** — weight is the primary lever. A jump larger than one plate
  requires a *strong* signal (≥ 0.6) **and** that at least 2 window sessions
  were trained at the current plan (scores are relative to the plan, so
  evidence from a lighter plan overstates how easy the current one is).
  Borderline signals add one plate; if one plate is more than 5 % of the load
  (light dumbbell work) a rep is added instead, up to 15 reps, after which a
  plate is added and reps drop back to 8 (double progression). Sets never
  increase.
* **HOLD** — unchanged.
* **BACK OFF** — weight down by the magnitude (≥ one plate, never below
  2.5 kg). A very strong signal (≥ 0.8) also removes one set, down to 2.

### 7. Explanation (`explanation.py`)

`explain(decision, reasoning) -> str` fills deterministic templates with the
actual numbers: session count, trend direction and slope, RPE trend, weighted
score, confidence and the prescription change. This function is the only seam
between numbers and words: a future LLM narrator could replace it with the
same signature, narrating a decision the engine has already made. The engine
itself must never call an LLM.

### Validation: closed-loop simulation

Scores are relative to the plan and the plan changes whenever the engine acts,
so the formulas were tuned in the loop they actually run in.
`scripts/simulate.py` models a deterministic athlete (a 10-rep capacity, an
exponential reps-at-%1RM curve, RPE from reps in reserve) and feeds the
engine's own prescription back as the next plan for 16 sessions. Every
scenario has explicit acceptance criteria and is also a pytest case
(`backend/tests/test_simulation.py`):

| Scenario | Athlete | Must hold |
|----------|---------|-----------|
| `steady_adapter` | +1 %/session | ≥ 4 PROGRESS in 16, never BACK OFF, no jump > 7.5 %, ends heavier |
| `plateau` | flat, plan met at RPE 8 | mostly HOLD, ≤ 1 PROGRESS per 5 sessions, never BACK OFF |
| `progress_then_stall` | +1 % for 8 sessions, then flat | ≥ 3 early PROGRESS, ≤ 1 late PROGRESS, never BACK OFF, final plan completable |
| `fatigue` | −0.8 %/session | BACK OFF within 4 sessions of the first poor session and only after ≥ 2 poor sessions; recovers to ≥ neutral afterwards; no drop > 12.5 % |
| `one_bad_day` | +1 %, one rough day | that day → HOLD; never BACK OFF; at most one progression lost vs. the clean run |
| `noisy` | +1 % with seeded ±1 rep/±1 RPE noise | never BACK OFF; lower confidence than the clean run; still progresses |
| `light_load` | 12 kg capacity | progresses via reps; plate changes are single steps; never BACK OFF |

Run `python scripts/simulate.py steady_adapter` to see a per-session table.
If you change `EngineConfig`, re-run `python scripts/simulate.py --all` and
`pytest`.

---

## Tests

```bash
pytest            # 54 tests: engine units, closed-loop simulations, API, seed
pytest -v backend/tests/test_decision.py
```

The engine tests need no server and no database. API tests use a temporary
SQLite file (the committed `fitness.db` is never touched by tests). Coverage
includes the required cases: fewer than 3 sessions → HOLD with low confidence;
improving → PROGRESS; stable → HOLD; multi-session decline → BACK OFF; one
isolated poor session → not BACK OFF; conflicting performance/RPE signals;
noisy history; different exercises → different decisions; prescription
changes for each decision.

---

## Determinism guarantee

`PROGRESS` / `HOLD` / `BACK OFF`, and the next weight, reps and sets, are
computed only by the pure functions in `backend/engine/` from the logged
numbers and `EngineConfig`. There is no randomness and no external call.
Any future AI feature may only *narrate* a decision that has already been
produced — by replacing `explain()` — never make or alter one.
