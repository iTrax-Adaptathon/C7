"""Thin database queries. No business logic lives here."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Adaptation, Exercise, ExerciseState, WorkoutLog


def list_exercises(db: Session) -> list[Exercise]:
    return list(db.scalars(select(Exercise).order_by(Exercise.id)))


def get_exercise(db: Session, exercise_id: int) -> Exercise | None:
    return db.get(Exercise, exercise_id)


def create_exercise(db: Session, name: str, muscle_group: str) -> Exercise:
    exercise = Exercise(name=name, muscle_group=muscle_group)
    db.add(exercise)
    db.flush()
    return exercise


def recent_logs(db: Session, exercise_id: int, limit: int) -> list[WorkoutLog]:
    """The most recent ``limit`` logs for an exercise, returned oldest -> newest."""
    stmt = (
        select(WorkoutLog)
        .where(WorkoutLog.exercise_id == exercise_id)
        .order_by(WorkoutLog.logged_at.desc(), WorkoutLog.id.desc())
        .limit(limit)
    )
    return list(reversed(list(db.scalars(stmt))))


def create_log(db: Session, **fields) -> WorkoutLog:
    log = WorkoutLog(**fields)
    db.add(log)
    db.flush()
    return log


def get_state(db: Session, exercise_id: int) -> ExerciseState | None:
    return db.get(ExerciseState, exercise_id)


def list_states(db: Session) -> list[ExerciseState]:
    return list(db.scalars(select(ExerciseState).join(Exercise).order_by(Exercise.id)))


def upsert_state(db: Session, exercise_id: int, updated_at: datetime, **fields) -> ExerciseState:
    state = db.get(ExerciseState, exercise_id)
    if state is None:
        state = ExerciseState(exercise_id=exercise_id)
        db.add(state)
    for key, value in fields.items():
        setattr(state, key, value)
    state.updated_at = updated_at
    db.flush()
    return state


def create_adaptation(db: Session, **fields) -> Adaptation:
    adaptation = Adaptation(**fields)
    db.add(adaptation)
    db.flush()
    return adaptation


def list_adaptations(db: Session, exercise_id: int) -> list[Adaptation]:
    """Adaptation history, newest first."""
    stmt = (
        select(Adaptation)
        .where(Adaptation.exercise_id == exercise_id)
        .order_by(Adaptation.logged_at.desc(), Adaptation.id.desc())
    )
    return list(db.scalars(stmt))
