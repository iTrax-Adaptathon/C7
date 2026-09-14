"""Data types shared across the adaptive engine.

Everything here is a plain dataclass or enum so the engine can be used and
tested without FastAPI, SQLAlchemy or any I/O.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Decision(str, Enum):
    """The only three decisions the engine can make."""

    PROGRESS = "PROGRESS"
    HOLD = "HOLD"
    BACK_OFF = "BACK OFF"


class TrendDirection(str, Enum):
    IMPROVING = "IMPROVING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"


@dataclass(frozen=True)
class Prescription:
    """A training prescription: what to attempt in a session."""

    weight: float
    reps: int
    sets: int


@dataclass(frozen=True)
class SessionInput:
    """One logged session: what was planned and what actually happened."""

    planned_weight: float
    planned_reps: int
    planned_sets: int
    actual_weight: float
    actual_reps: int
    actual_sets: int
    rpe: int  # 1-10

    @property
    def planned(self) -> Prescription:
        return Prescription(self.planned_weight, self.planned_reps, self.planned_sets)


@dataclass(frozen=True)
class SessionMetrics:
    """Objective metrics derived from a single session."""

    volume: float  # actual_weight * actual_reps * actual_sets
    planned_volume: float
    rep_completion: float  # (actual_reps*actual_sets) / (planned_reps*planned_sets)
    weight_ratio: float  # actual_weight / planned_weight
    volume_ratio: float  # volume / planned_volume
    rpe: int


@dataclass(frozen=True)
class HistoryAnalysis:
    """Window-level statistics over the most recent sessions (oldest -> newest)."""

    session_count: int
    scores: list[float]
    recent_avg_score: float  # plain mean of the window
    weighted_avg_score: float  # recency-weighted mean
    weighted_avg_rpe: float
    performance_trend: float  # score points per session (weighted LS slope)
    rpe_trend: float  # RPE units per session
    volume_trend: float  # percent of mean volume per session
    score_stddev: float  # variability of scores
    trend_fit_residual: float  # stddev of residuals around the fitted trend line
    last_score: float
    recent_poor_sessions: int  # of the last 3 sessions, how many scored below poor_session_score
    trend_direction: TrendDirection


@dataclass(frozen=True)
class ReasoningData:
    """Everything the explanation layer needs. Numbers are already rounded."""

    decision: Decision
    session_count: int
    recent_score: float
    weighted_score: float
    performance_trend: float
    rpe_trend: float
    volume_trend: float
    consistency: float  # score stddev, lower = more consistent
    signal_strength: float
    confidence: int
    trend_direction: TrendDirection
    previous: Prescription
    next: Prescription
    session_score: float  # score of the most recent session


@dataclass(frozen=True)
class AthleteState:
    readiness_pct: int  # 0-100
    performance_status: str  # "Improving" | "Stable" | "Declining"
    fatigue_level: str  # "Low" | "Moderate" | "High"
    recovery_status: str  # "Poor" | "Adequate" | "Good" | "Prime"
    adaptation_status: str  # "Positive" | "Neutral" | "Fatigue Accumulation"
    confidence_pct: int  # 0-100


@dataclass(frozen=True)
class PersonalBaseline:
    typical_rpe: float
    typical_score: float
    typical_volume: float
    typical_reps: float
    sessions_analyzed: int


@dataclass(frozen=True)
class CounterfactualOption:
    condition: str
    resulting_action: str
    explanation: str


@dataclass(frozen=True)
class SessionDelta:
    perf_delta_pct: float
    rpe_delta: float
    volume_delta_pct: float
    load_delta: float
    reps_delta: int
    sets_delta: int


@dataclass(frozen=True)
class EngineResult:
    decision: Decision
    confidence: int
    trend_direction: TrendDirection
    analysis: HistoryAnalysis
    signal_strength: float
    previous: Prescription
    next: Prescription
    reasoning: ReasoningData
    explanation: str
    component_breakdown: dict[str, float] = field(default_factory=dict)
    triggered_rules: list[str] = field(default_factory=list)
    coaching_rationale: str = ""
    athlete_state: AthleteState | None = None
    baseline: PersonalBaseline | None = None
    counterfactuals: list[CounterfactualOption] = field(default_factory=list)
    session_delta: SessionDelta | None = None


@dataclass(frozen=True)
class SetAutoregulationResult:
    """Evaluation result of set RPE overshoot or undershoot."""

    triggered: bool
    adjustment_type: str  # "LOAD_DROP" | "LOAD_INCREASE" | "NONE"
    recommended_weight: float
    recommended_reps: int
    delta_weight: float
    delta_reps: int
    delta_pct: float
    message: str
    target_rpe: float
    actual_rpe: float
    set_index: int

