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
