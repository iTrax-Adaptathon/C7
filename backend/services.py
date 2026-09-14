"""Application services: the bridge between the API/database and the pure engine.

``process_workout_log`` is the one write path in the system. It is used by
``POST /logs`` and by ``seed.py`` so demo data goes through exactly the same
logic as real data.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend import crud
from backend.engine import DEFAULT_CONFIG, EngineConfig, evaluate
from backend.engine.scoring import session_score
from backend.engine.types import Prescription, SessionInput
from backend.models import Adaptation, ExerciseState, WorkoutLog
from backend.schemas import (
    AdaptationOut,
    LogCreate,
    LogHistoryOut,
    LogOut,
    PrescriptionOut,
    ReasoningOut,
    RecommendationOut,
    StateOut,
)


def utcnow() -> datetime:
    """Naive UTC timestamp at second precision. All ``logged_at`` values are UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


class ExerciseNotFound(LookupError):
    pass


class StateNotFound(LookupError):
    pass


def _to_session_input(log: WorkoutLog) -> SessionInput:
    return SessionInput(
        planned_weight=log.planned_weight,
        planned_reps=log.planned_reps,
        planned_sets=log.planned_sets,
        actual_weight=log.actual_weight,
        actual_reps=log.actual_reps,
        actual_sets=log.actual_sets,
        rpe=log.rpe,
    )


def _prescription_out(p: Prescription) -> PrescriptionOut:
    return PrescriptionOut(weight=p.weight, reps=p.reps, sets=p.sets)


def process_workout_log(
    db: Session, payload: LogCreate, config: EngineConfig = DEFAULT_CONFIG
) -> RecommendationOut:
    """Save a log, run the engine on the exercise's recent history, persist the
    new state and adaptation, and return the recommendation. Commits."""
    exercise = crud.get_exercise(db, payload.exercise_id)
    if exercise is None:
        raise ExerciseNotFound(payload.exercise_id)

    logged_at = payload.logged_at or utcnow()
    session = SessionInput(
        planned_weight=payload.planned_weight,
        planned_reps=payload.planned_reps,
        planned_sets=payload.planned_sets,
        actual_weight=payload.actual_weight,
        actual_reps=payload.actual_reps,
        actual_sets=payload.actual_sets,
        rpe=payload.rpe,
    )
    log = crud.create_log(
        db,
        exercise_id=exercise.id,
        logged_at=logged_at,
        planned_weight=payload.planned_weight,
        planned_reps=payload.planned_reps,
        planned_sets=payload.planned_sets,
        actual_weight=payload.actual_weight,
        actual_reps=payload.actual_reps,
        actual_sets=payload.actual_sets,
        rpe=payload.rpe,
        session_score=session_score(session, config),
    )

    history = [_to_session_input(l) for l in crud.recent_logs(db, exercise.id, config.window_size)]
    base = session.planned  # the prescription the athlete just trained under
    result = evaluate(history, base, config)

    crud.upsert_state(
        db,
        exercise.id,
        updated_at=logged_at,
        current_weight=result.next.weight,
        current_reps=result.next.reps,
        current_sets=result.next.sets,
        decision=result.decision.value,
        confidence=result.confidence,
        trend_direction=result.trend_direction.value,
        explanation=result.explanation,
    )
    crud.create_adaptation(
        db,
        workout_log_id=log.id,
        exercise_id=exercise.id,
        logged_at=logged_at,
        old_weight=result.previous.weight,
        new_weight=result.next.weight,
        old_reps=result.previous.reps,
        new_reps=result.next.reps,
        old_sets=result.previous.sets,
        new_sets=result.next.sets,
        decision=result.decision.value,
        confidence=result.confidence,
        explanation=result.explanation,
    )
    db.commit()

    r = result.reasoning
    return RecommendationOut(
        exercise_id=exercise.id,
        log_id=log.id,
        decision=result.decision.value,
        previous=_prescription_out(result.previous),
        next=_prescription_out(result.next),
        confidence=result.confidence,
        trend_direction=result.trend_direction.value,
        reasoning=ReasoningOut(
            session_count=r.session_count,
            session_score=r.session_score,
            recent_score=r.recent_score,
            weighted_score=r.weighted_score,
            performance_trend=r.performance_trend,
            rpe_trend=r.rpe_trend,
            volume_trend=r.volume_trend,
            consistency=r.consistency,
            signal_strength=r.signal_strength,
        ),
        explanation=result.explanation,
    )


def log_history(db: Session, exercise_id: int, limit: int) -> LogHistoryOut:
    exercise = crud.get_exercise(db, exercise_id)
    if exercise is None:
        raise ExerciseNotFound(exercise_id)
    logs = crud.recent_logs(db, exercise_id, limit)
    return LogHistoryOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        logs=[
            LogOut(
                id=l.id,
                logged_at=l.logged_at,
                planned_weight=l.planned_weight,
                planned_reps=l.planned_reps,
                planned_sets=l.planned_sets,
                actual_weight=l.actual_weight,
                actual_reps=l.actual_reps,
                actual_sets=l.actual_sets,
                rpe=l.rpe,
                volume=l.actual_weight * l.actual_reps * l.actual_sets,
                session_score=l.session_score,
            )
            for l in logs
        ],
    )


def state_out(state: ExerciseState) -> StateOut:
    return StateOut(
        exercise_id=state.exercise_id,
        exercise_name=state.exercise.name,
        muscle_group=state.exercise.muscle_group,
        decision=state.decision,
        confidence=state.confidence,
        trend_direction=state.trend_direction,
        current=PrescriptionOut(weight=state.current_weight, reps=state.current_reps, sets=state.current_sets),
        explanation=state.explanation,
        updated_at=state.updated_at,
    )


def exercise_state(db: Session, exercise_id: int) -> StateOut:
    if crud.get_exercise(db, exercise_id) is None:
        raise ExerciseNotFound(exercise_id)
    state = crud.get_state(db, exercise_id)
    if state is None:
        raise StateNotFound(exercise_id)
    return state_out(state)


def state_summary(db: Session) -> list[StateOut]:
    return [state_out(s) for s in crud.list_states(db)]


def adaptation_out(a: Adaptation) -> AdaptationOut:
    return AdaptationOut(
        id=a.id,
        workout_log_id=a.workout_log_id,
        exercise_id=a.exercise_id,
        logged_at=a.logged_at,
        decision=a.decision,
        confidence=a.confidence,
        previous=PrescriptionOut(weight=a.old_weight, reps=a.old_reps, sets=a.old_sets),
        next=PrescriptionOut(weight=a.new_weight, reps=a.new_reps, sets=a.new_sets),
        explanation=a.explanation,
    )


def adaptation_history(db: Session, exercise_id: int) -> list[AdaptationOut]:
    if crud.get_exercise(db, exercise_id) is None:
        raise ExerciseNotFound(exercise_id)
    return [adaptation_out(a) for a in crud.list_adaptations(db, exercise_id)]
