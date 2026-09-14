"""Readiness check-in and intra-session set autoregulation API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend import crud
from backend.database import get_db
from backend.engine.decision import evaluate_set_overshoot
from backend.engine.readiness import (
    calculate_adjusted_load,
    calculate_composite_readiness,
    classify_readiness,
    generate_composite_readiness_message,
)
from backend.schemas import (
    PreWorkoutCheckIn,
    ReadinessOut,
    SetAutoregulationIn,
    SetAutoregulationOut,
)

router = APIRouter(tags=["readiness & autoregulation"])


def _compute_readiness(
    checkin: PreWorkoutCheckIn,
    exercise_id: int | None = None,
    db: Session | None = None,
) -> ReadinessOut:
    target_load = checkin.target_load
    target_reps = checkin.target_reps or 8
    target_sets = checkin.target_sets or 3

    # If target load not specified in payload, attempt to look up from exercise state
    if target_load is None and exercise_id is not None and db is not None:
        state = crud.get_state(db, exercise_id)
        if state:
            target_load = state.current_weight
            target_reps = state.current_reps
            target_sets = state.current_sets
        else:
            exercise = crud.get_exercise(db, exercise_id)
            if exercise is None:
                raise HTTPException(status_code=404, detail=f"Exercise {exercise_id} not found")
            target_load = 20.0  # default starting weight

    if target_load is None:
        target_load = 60.0  # fallback default

    modifier, readiness_score = calculate_composite_readiness(
        checkin.sleep_rating,
        checkin.freshness_rating,
        checkin.energy_rating,
        checkin.stress_rating,
        checkin.soreness_rating,
    )
    adjusted_load = calculate_adjusted_load(target_load, modifier)
    status_label = classify_readiness(readiness_score)
    message = generate_composite_readiness_message(
        checkin.sleep_rating,
        checkin.freshness_rating,
        checkin.energy_rating,
        checkin.stress_rating,
        checkin.soreness_rating,
        modifier,
        readiness_score,
        target_load,
        adjusted_load,
    )

    return ReadinessOut(
        exercise_id=exercise_id,
        sleep_rating=checkin.sleep_rating,
        soreness_rating=checkin.soreness_rating,
        stress_rating=checkin.stress_rating,
        freshness_rating=checkin.freshness_rating,
        energy_rating=checkin.energy_rating,
        readiness_modifier=modifier,
        readiness_score=readiness_score,
        original_load=target_load,
        adjusted_load=adjusted_load,
        original_reps=target_reps,
        adjusted_reps=target_reps,
        original_sets=target_sets,
        adjusted_sets=target_sets,
        status=status_label,
        message=message,
    )


@router.post(
    "/api/sessions/{session_id}/readiness",
    response_model=ReadinessOut,
    summary="Submit pre-workout check-in for a session and receive dynamic baseline adjustments",
)
@router.post("/sessions/{session_id}/readiness", response_model=ReadinessOut, include_in_schema=False)
@router.post("/api/exercises/{session_id}/readiness", response_model=ReadinessOut, include_in_schema=False)
def session_readiness_checkin(
    session_id: int,
    checkin: PreWorkoutCheckIn,
    db: Session = Depends(get_db),
) -> ReadinessOut:
    return _compute_readiness(checkin, exercise_id=session_id, db=db)


@router.post(
    "/api/readiness",
    response_model=ReadinessOut,
    summary="Stateless pre-workout readiness computation",
)
def compute_readiness(checkin: PreWorkoutCheckIn) -> ReadinessOut:
    return _compute_readiness(checkin)


@router.post(
    "/api/autoregulation/evaluate",
    response_model=SetAutoregulationOut,
    summary="Evaluate set RPE overshoot or undershoot for real-time fatigue stops",
)
def evaluate_set(payload: SetAutoregulationIn) -> SetAutoregulationOut:
    res = evaluate_set_overshoot(
        set_index=payload.set_index,
        target_rpe=payload.target_rpe,
        actual_rpe=payload.actual_rpe,
        current_weight=payload.current_weight,
        current_reps=payload.current_reps,
        weight_step=payload.weight_step,
    )
    return SetAutoregulationOut(
        triggered=res.triggered,
        adjustment_type=res.adjustment_type,
        recommended_weight=res.recommended_weight,
        recommended_reps=res.recommended_reps,
        delta_weight=res.delta_weight,
        delta_reps=res.delta_reps,
        delta_pct=res.delta_pct,
        message=res.message,
        target_rpe=res.target_rpe,
        actual_rpe=res.actual_rpe,
        set_index=res.set_index,
    )
