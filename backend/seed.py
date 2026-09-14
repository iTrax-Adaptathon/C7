"""Rebuild the demo database with ~4 weeks of history for three exercises.

    python -m backend.seed

This DROPS every table in the configured database (``DATABASE_URL``, default
``fitness.db`` in the repo root), recreates the schema and inserts the demo
data. Every session is processed through ``services.process_workout_log`` -
the same code path as ``POST /logs`` - so ``exercise_state`` and
``adaptations`` are exactly what the API would have produced.

Patterns (12 sessions each, 3 per week, newest one "now" in UTC):

* Barbell Squat  - steadily strong, one clearly bad session (#9), then recovery.
                   Demonstrates that one bad day does NOT trigger BACK OFF.
* Bench Press    - solid start, then a genuine multi-session decline: RPE creeps
                   up over several sessions, then reps are missed. Demonstrates a
                   clear BACK OFF on the latest session.
* Romanian Deadlift - stable: meets the plan at RPE 7-8 throughout. HOLD.
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta

from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from backend import crud, models  # noqa: F401  (models registers the tables)
from backend.database import Base, engine as default_engine
from backend.schemas import LogCreate
from backend.services import process_workout_log, utcnow
from backend.settings import DATABASE_URL

# (planned_weight, planned_reps, planned_sets, actual_weight, actual_reps, actual_sets, rpe)
Row = tuple[float, int, int, float, int, int, int]

SQUAT: list[Row] = [
    (80, 5, 3, 80, 5, 3, 7),
    (80, 5, 3, 80, 5, 3, 7),
    (80, 5, 3, 80, 5, 3, 6),
    (82.5, 5, 3, 82.5, 5, 3, 7),
    (82.5, 5, 3, 82.5, 5, 3, 6),
    (85, 5, 3, 85, 5, 3, 7),
    (85, 5, 3, 85, 5, 3, 7),
    (85, 5, 3, 85, 5, 3, 6),
    (87.5, 5, 3, 87.5, 3, 3, 10),  # the one bad session
    (87.5, 5, 3, 87.5, 5, 3, 7),  # recovery
    (87.5, 5, 3, 87.5, 5, 3, 7),
    (87.5, 5, 3, 87.5, 5, 3, 6),
]

BENCH: list[Row] = [
    (60, 8, 3, 60, 8, 3, 7),
    (60, 8, 3, 60, 8, 3, 7),
    (60, 8, 3, 60, 8, 3, 6),
    (62.5, 8, 3, 62.5, 8, 3, 7),
    (62.5, 8, 3, 62.5, 8, 3, 7),
    (62.5, 8, 3, 62.5, 8, 3, 7),
    (62.5, 8, 3, 62.5, 8, 3, 8),  # effort creeping up
    (62.5, 8, 3, 62.5, 8, 3, 8),
    (62.5, 8, 3, 62.5, 8, 3, 8),
    (62.5, 8, 3, 62.5, 8, 3, 8),
    (62.5, 8, 3, 62.5, 7, 3, 9),  # reps start to drop, RPE climbs
    (62.5, 8, 3, 62.5, 6, 3, 10),  # -> BACK OFF
]

RDL: list[Row] = [
    (100, 8, 3, 100, 8, 3, 7),
    (100, 8, 3, 100, 8, 3, 8),
    (100, 8, 3, 100, 8, 3, 7),
    (100, 8, 3, 100, 8, 3, 7),
    (100, 8, 3, 100, 8, 3, 8),
    (100, 8, 3, 100, 8, 3, 7),
    (100, 8, 3, 100, 8, 3, 8),
    (100, 8, 3, 100, 8, 3, 7),
    (100, 8, 3, 100, 8, 3, 7),
    (100, 8, 3, 100, 8, 3, 8),
    (100, 8, 3, 100, 8, 3, 7),
    (100, 8, 3, 100, 8, 3, 7),
]

EXERCISES: list[tuple[str, str, list[Row]]] = [
    ("Barbell Squat", "Legs", SQUAT),
    ("Bench Press", "Chest", BENCH),
    ("Romanian Deadlift", "Hamstrings", RDL),
]

SESSION_GAP = timedelta(days=7 / 3)  # three sessions per week


def seed(engine: Engine = default_engine, now: datetime | None = None, quiet: bool = False) -> dict[str, str]:
    """Drop, recreate and populate. Returns {exercise name: final decision}."""
    now = now or utcnow()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    SessionFactory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    results: dict[str, str] = {}
    db: Session
    with SessionFactory() as db:
        for name, muscle_group, rows in EXERCISES:
            exercise = crud.create_exercise(db, name, muscle_group)
            db.commit()
            start = now - SESSION_GAP * (len(rows) - 1)
            last = None
            for i, (pw, pr, ps, aw, ar, as_, rpe) in enumerate(rows):
                payload = LogCreate.model_validate(
                    {
                        "exerciseId": exercise.id,
                        "plannedWeight": pw, "plannedReps": pr, "plannedSets": ps,
                        "actualWeight": aw, "actualReps": ar, "actualSets": as_,
                        "rpe": rpe,
                        "loggedAt": (start + SESSION_GAP * i).isoformat(),
                    }
                )
                last = process_workout_log(db, payload)
            assert last is not None
            results[name] = last.decision
            if not quiet:
                print(
                    f"  {name:<18} {len(rows)} sessions -> {last.decision:<8} "
                    f"next {last.next.weight:g} kg x {last.next.reps} x {last.next.sets} "
                    f"(confidence {last.confidence}%)"
                )
    return results


def main() -> int:
    print(f"Rebuilding demo database: {DATABASE_URL}")
    seed()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
