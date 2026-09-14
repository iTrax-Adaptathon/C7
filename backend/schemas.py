"""Pydantic request/response models. The JSON API is strictly camelCase.

Every model derives from ``CamelModel``: fields are declared in snake_case
(Python) and serialised/parsed as camelCase (JSON). Request models forbid
unknown keys, so a snake_case body such as ``{"exercise_id": 1}`` is rejected
with 422 instead of being silently ignored.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

DecisionLiteral = Literal["PROGRESS", "HOLD", "BACK OFF"]
TrendLiteral = Literal["IMPROVING", "STABLE", "DECLINING"]


class CamelModel(BaseModel):
    """Response base: serialised as camelCase; constructible by Python field name."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        serialize_by_alias=True,
    )


class RequestModel(BaseModel):
    """Request base: strictly camelCase input, unknown (e.g. snake_case) keys -> 422."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=False,
        extra="forbid",
    )


# --- shared ------------------------------------------------------------------

class PrescriptionOut(CamelModel):
    weight: float
    reps: int
    sets: int


# --- exercises ---------------------------------------------------------------

class ExerciseOut(CamelModel):
    id: int
    name: str
    muscle_group: str


# --- logs --------------------------------------------------------------------

class LogCreate(RequestModel):
    exercise_id: int
    planned_weight: float = Field(gt=0)
    planned_reps: int = Field(ge=1)
    planned_sets: int = Field(ge=1)
    actual_weight: float = Field(gt=0)
    actual_reps: int = Field(ge=1)
    actual_sets: int = Field(ge=1)
    rpe: int = Field(ge=1, le=10)
    logged_at: datetime | None = Field(
        default=None,
        description="Naive ISO 8601 timestamp in UTC (e.g. 2026-09-14T10:00:00). Defaults to now (UTC).",
    )


class LogOut(CamelModel):
    id: int
    logged_at: datetime
    planned_weight: float
    planned_reps: int
    planned_sets: int
    actual_weight: float
    actual_reps: int
    actual_sets: int
    rpe: int
    volume: float
    session_score: float


class LogHistoryOut(CamelModel):
    exercise_id: int
    exercise_name: str
    logs: list[LogOut]


# --- recommendation (POST /logs response) -------------------------------------

# --- athlete state, baseline, counterfactuals, session delta (Hackathon Sprint) ---

class AthleteStateOut(CamelModel):
    readiness_pct: int
    performance_status: str
    fatigue_level: str
    recovery_status: str
    adaptation_status: str
    confidence_pct: int


class PersonalBaselineOut(CamelModel):
    typical_rpe: float
    typical_score: float
    typical_volume: float
    typical_reps: float
    sessions_analyzed: int


class CounterfactualOut(CamelModel):
    condition: str
    resulting_action: str
    explanation: str


class SessionDeltaOut(CamelModel):
    perf_delta_pct: float
    rpe_delta: float
    volume_delta_pct: float
    load_delta: float
    reps_delta: int
    sets_delta: int


class ComponentBreakdownOut(CamelModel):
    perf_trend: float
    score_level: float
    rpe_signal: float
    volume_trend: float


class GlassBoxMetadata(CamelModel):
    action: DecisionLiteral
    recommended_load: float
    recommended_reps: int
    signal_score: float
    confidence: float
    component_breakdown: ComponentBreakdownOut
    triggered_rules: list[str]
    coaching_rationale: str
    athlete_state: AthleteStateOut | None = None
    baseline: PersonalBaselineOut | None = None
    counterfactuals: list[CounterfactualOut] = Field(default_factory=list)
    session_delta: SessionDeltaOut | None = None


class ReasoningOut(CamelModel):
    session_count: int
    session_score: float
    recent_score: float
    weighted_score: float
    performance_trend: float
    rpe_trend: float
    volume_trend: float
    consistency: float
    signal_strength: float


class RecommendationOut(CamelModel):
    exercise_id: int
    log_id: int
    decision: DecisionLiteral
    previous: PrescriptionOut
    next: PrescriptionOut
    confidence: int
    trend_direction: TrendLiteral
    reasoning: ReasoningOut
    explanation: str

    # Glass-box explainability fields (Sprint 2)
    action: DecisionLiteral | None = None
    recommended_load: float | None = None
    recommended_reps: int | None = None
    signal_score: float | None = None
    component_breakdown: ComponentBreakdownOut | None = None
    triggered_rules: list[str] = Field(default_factory=list)
    coaching_rationale: str | None = None
    glass_box: GlassBoxMetadata | None = None

    # Athlete state, baseline, counterfactuals, session delta
    athlete_state: AthleteStateOut | None = None
    baseline: PersonalBaselineOut | None = None
    counterfactuals: list[CounterfactualOut] = Field(default_factory=list)
    session_delta: SessionDeltaOut | None = None


# --- pre-workout readiness (Sprint 2) ------------------------------------------

class PreWorkoutCheckIn(CamelModel):
    sleep_rating: int = Field(..., ge=1, le=5, description="Sleep quality 1-5")
    soreness_rating: int = Field(..., ge=1, le=5, description="Muscle freshness 1-5 (1=very sore, 5=fresh)")
    stress_rating: int = Field(..., ge=1, le=5, description="Low stress / energy 1-5 (1=high stress, 5=low stress)")
    target_load: float | None = Field(default=None, description="Optional target load in kg")
    target_reps: int | None = Field(default=None, description="Optional target reps")
    target_sets: int | None = Field(default=None, description="Optional target sets")


class ReadinessOut(CamelModel):
    exercise_id: int | None = None
    sleep_rating: int
    soreness_rating: int
    stress_rating: int
    readiness_modifier: float
    readiness_score: int
    original_load: float
    adjusted_load: float
    original_reps: int
    adjusted_reps: int
    original_sets: int
    adjusted_sets: int
    status: str
    message: str


# --- intra-session set autoregulation (Sprint 2) -------------------------------

class SetAutoregulationIn(CamelModel):
    set_index: int = Field(..., ge=1, description="1-based set number")
    target_rpe: float = Field(..., ge=1.0, le=10.0, description="Planned/target RPE")
    actual_rpe: float = Field(..., ge=1.0, le=10.0, description="Actual logged RPE")
    current_weight: float = Field(..., gt=0.0, description="Working weight in kg")
    current_reps: int = Field(..., ge=1, description="Working reps")
    weight_step: float = Field(default=2.5, description="Plate increment step")


class SetAutoregulationOut(CamelModel):
    triggered: bool
    adjustment_type: str
    recommended_weight: float
    recommended_reps: int
    delta_weight: float
    delta_reps: int
    delta_pct: float
    message: str
    target_rpe: float
    actual_rpe: float
    set_index: int



# --- state -------------------------------------------------------------------

class StateOut(CamelModel):
    exercise_id: int
    exercise_name: str
    muscle_group: str
    decision: DecisionLiteral
    confidence: int
    trend_direction: TrendLiteral
    current: PrescriptionOut
    explanation: str
    updated_at: datetime
    athlete_state: AthleteStateOut | None = None
    baseline: PersonalBaselineOut | None = None
    counterfactuals: list[CounterfactualOut] = Field(default_factory=list)
    session_delta: SessionDeltaOut | None = None
    component_breakdown: ComponentBreakdownOut | None = None
    triggered_rules: list[str] = Field(default_factory=list)
    coaching_rationale: str | None = None


# --- adaptations ---------------------------------------------------------------

class AdaptationOut(CamelModel):
    id: int
    workout_log_id: int
    exercise_id: int
    logged_at: datetime
    decision: DecisionLiteral
    confidence: int
    previous: PrescriptionOut
    next: PrescriptionOut
    explanation: str


class HealthOut(CamelModel):
    status: str
