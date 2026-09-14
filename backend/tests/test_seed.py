"""The seed script rebuilds a complete, consistent demo database every run."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from backend.database import make_engine
from backend.models import Adaptation, Exercise, ExerciseState, WorkoutLog
from backend.seed import EXERCISES, seed

NOW = datetime(2026, 9, 14, 12, 0, 0)


def _counts(engine):
    with sessionmaker(bind=engine)() as db:
        return {
            "exercises": db.scalar(select(func.count(Exercise.id))),
            "logs": db.scalar(select(func.count(WorkoutLog.id))),
            "states": db.scalar(select(func.count(ExerciseState.exercise_id))),
            "adaptations": db.scalar(select(func.count(Adaptation.id))),
        }


def test_seed_creates_three_exercises_with_expected_decisions(tmp_path):
    engine = make_engine(f"sqlite:///{(tmp_path / 'seed.db').as_posix()}")
    results = seed(engine, now=NOW, quiet=True)

    assert len(EXERCISES) == 3
    assert results == {"Barbell Squat": "PROGRESS", "Bench Press": "BACK OFF", "Romanian Deadlift": "HOLD"}
    assert _counts(engine) == {"exercises": 3, "logs": 36, "states": 3, "adaptations": 36}

    with sessionmaker(bind=engine)() as db:
        squat = db.scalar(select(Exercise).where(Exercise.name == "Barbell Squat"))
        decisions = [a.decision for a in sorted(squat.adaptations, key=lambda a: a.logged_at)]
        assert "BACK OFF" not in decisions  # one bad session never caused a back off
        newest = max(db.scalars(select(WorkoutLog.logged_at)))
        oldest = min(db.scalars(select(WorkoutLog.logged_at)))
        assert newest == NOW
        assert 24 <= (newest - oldest).days <= 28  # ~4 weeks of history

    engine.dispose()


def test_seed_recreates_rather_than_appends(tmp_path):
    engine = make_engine(f"sqlite:///{(tmp_path / 'seed.db').as_posix()}")
    seed(engine, now=NOW, quiet=True)
    first = _counts(engine)
    seed(engine, now=NOW, quiet=True)
    assert _counts(engine) == first
    engine.dispose()
