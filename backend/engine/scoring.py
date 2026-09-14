"""Per-session metrics and the 0-100 session performance score.

Score formula (all components are 0-100, blended by the weights in
``EngineConfig``; defaults: execution 0.35, load 0.15, volume 0.20,
effort 0.30, so no single metric can dominate):

    execution = clamp(100 * rep_completion, 0, 100)
        rep_completion = (actual_reps * actual_sets) / (planned_reps * planned_sets)

    load      = clamp(50 + 250 * (weight_ratio - 1), 0, 100)
        weight_ratio = actual_weight / planned_weight   (plan = 50, +10% = 75, -10% = 25)

    volume    = clamp(50 + 250 * (volume_ratio - 1), 0, 100)
        volume_ratio = actual_volume / planned_volume

    effort    = clamp(50 + (rpe_target - rpe) * 20, 0, 100)
        RPE 7 = 50, RPE 6 = 70, RPE 8 = 30, RPE 9 = 10

    score = clamp(0.35*execution + 0.15*load + 0.20*volume + 0.30*effort, 0, 100)

Reference points: plan met at RPE 7 -> 67.5, at RPE 6 -> 73.5, at RPE 9 -> 55.5.
Because load and volume are measured *relative to the plan*, the score is a
"response to the prescription" measure: hitting a harder plan with the same
ease produces the same score, which is exactly what the decision layer wants.
"""
from __future__ import annotations

from backend.engine.config import DEFAULT_CONFIG, EngineConfig
from backend.engine.types import SessionInput, SessionMetrics


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def session_metrics(s: SessionInput) -> SessionMetrics:
    volume = s.actual_weight * s.actual_reps * s.actual_sets
    planned_volume = s.planned_weight * s.planned_reps * s.planned_sets
    return SessionMetrics(
        volume=volume,
        planned_volume=planned_volume,
        rep_completion=(s.actual_reps * s.actual_sets) / (s.planned_reps * s.planned_sets),
        weight_ratio=s.actual_weight / s.planned_weight,
        volume_ratio=volume / planned_volume,
        rpe=s.rpe,
    )


def session_score(s: SessionInput, config: EngineConfig = DEFAULT_CONFIG) -> float:
    """Return the 0-100 performance score for one session (rounded to 1 dp)."""
    m = session_metrics(s)
    execution = clamp(100.0 * m.rep_completion, 0.0, 100.0)
    load = clamp(50.0 + config.ratio_points_per_unit * (m.weight_ratio - 1.0), 0.0, 100.0)
    volume = clamp(50.0 + config.ratio_points_per_unit * (m.volume_ratio - 1.0), 0.0, 100.0)
    effort = clamp(50.0 + (config.rpe_target - m.rpe) * config.rpe_points_per_unit, 0.0, 100.0)

    score = (
        config.w_execution * execution
        + config.w_load * load
        + config.w_volume * volume
        + config.w_effort * effort
    )
    return round(clamp(score, 0.0, 100.0), 1)
