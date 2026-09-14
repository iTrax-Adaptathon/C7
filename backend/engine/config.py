"""All tunable numbers of the adaptive engine live here.

Nothing else in the engine hard-codes a threshold. Change values on this
dataclass (or pass a custom instance to ``evaluate``) to tune behaviour.
The defaults were validated with the closed-loop simulator in
``scripts/simulate.py``; re-run it after changing anything.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EngineConfig:
    # --- history window -------------------------------------------------
    window_size: int = 5  # sessions analysed per decision
    min_sessions: int = 3  # fewer than this -> HOLD with low confidence
    low_confidence_cap: int = 35  # max confidence with insufficient history

    # --- session score (scoring.py) --------------------------------------
    rpe_target: float = 7.0  # RPE that counts as "neutral" effort
    rpe_points_per_unit: float = 20.0  # effort component slope per RPE unit
    ratio_points_per_unit: float = 250.0  # load/volume component slope (+10% -> +25 pts)
    w_execution: float = 0.35
    w_load: float = 0.15
    w_volume: float = 0.20
    w_effort: float = 0.30

    # --- history analysis (analysis.py) ----------------------------------
    neutral_score: float = 65.0  # reference level for the "level" signal term
    poor_session_score: float = 60.0  # a session below this is "poor" (missed reps or RPE >= 9)
    trend_direction_threshold: float = 1.5  # |slope| >= this -> IMPROVING / DECLINING

    # --- signal strength (decision.py) -----------------------------------
    trend_scale: float = 5.0  # score pts/session that saturates the trend term
    level_scale: float = 10.0  # score pts above/below neutral that saturates the level term
    rpe_trend_scale: float = 1.0  # RPE/session that saturates the RPE trend term
    rpe_level_scale: float = 2.0  # RPE units from target that saturates the RPE level term
    volume_trend_scale: float = 5.0  # %/session that saturates the volume term
    w_signal_trend: float = 0.35
    w_signal_level: float = 0.30
    w_signal_rpe: float = 0.20
    w_signal_volume: float = 0.15

    # --- decision thresholds --------------------------------------------
    progress_threshold: float = 0.25  # signal >= this may PROGRESS
    backoff_threshold: float = -0.25  # signal <= this may BACK OFF
    rpe_progress_max: float = 8.5  # weighted avg RPE above this blocks PROGRESS
    rpe_high: float = 8.5  # weighted avg RPE at/above this supports BACK OFF
    backoff_min_poor_sessions: int = 2  # of the last 3 sessions, needed for BACK OFF
    min_confidence_to_act: int = 40  # below this -> HOLD

    # --- confidence -------------------------------------------------------
    conf_history_max: float = 30.0
    conf_consistency_max: float = 25.0
    conf_trend_fit_max: float = 20.0
    conf_agreement_max: float = 25.0
    stddev_scale: float = 25.0  # score stddev at which consistency credit reaches 0
    residual_scale: float = 20.0  # residual stddev at which trend-fit credit reaches 0

    # --- prescription changes ---------------------------------------------
    weight_step: float = 2.5  # kg; all weights are rounded to this
    min_weight: float = 2.5
    progress_min_pct: float = 0.025  # borderline PROGRESS
    progress_max_pct: float = 0.075  # strongest PROGRESS
    backoff_min_pct: float = 0.05  # borderline BACK OFF
    backoff_max_pct: float = 0.125  # strongest BACK OFF
    strong_signal: float = 0.6  # |signal| at/above this is a "strong" signal
    min_sessions_at_plan_for_strong: int = 2  # a > one-step jump needs this many window sessions at the current plan
    borderline_max_step_pct: float = 0.05  # if one weight step > this % of load, add reps instead
    rep_ceiling: int = 15  # at this many reps, progress by adding a plate...
    rep_floor: int = 8  # ...and dropping reps back to this (double progression)
    set_floor: int = 2
    backoff_set_reduction_signal: float = 0.8  # |signal| at/above this also drops a set


DEFAULT_CONFIG = EngineConfig()
