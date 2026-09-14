"""Decision logic: signal strength, confidence, PROGRESS/HOLD/BACK OFF and the
next prescription.

Signal strength (one number in [-1, +1]) blends four normalised terms:

    perf   = clamp(performance_trend / trend_scale, -1, 1)
    level  = clamp((weighted_avg_score - neutral_score) / level_scale, -1, 1)
    rpe    = 0.5 * clamp(-rpe_trend / rpe_trend_scale, -1, 1)
           + 0.5 * clamp((rpe_target - weighted_avg_rpe) / rpe_level_scale, -1, 1)
    volume = clamp(volume_trend / volume_trend_scale, -1, 1)
    signal = 0.35*perf + 0.30*level + 0.20*rpe + 0.15*volume

"Consistently strong" histories (flat but high scores) progress through the
``level`` term; "improving" histories through ``perf``/``volume``; RPE rising
against flat performance pulls the signal negative.

Decision rules (in order):
    1. session_count < min_sessions              -> HOLD, confidence capped
    2. signal >= progress_threshold
       and weighted_avg_rpe <= rpe_progress_max
       and last_score >= poor_session_score      (never add load right after a poor session)
       and confidence >= min_confidence_to_act   -> PROGRESS
    3. signal <= backoff_threshold
       and >= 2 of the last 3 sessions are poor  (persistent, not an isolated bad day)
       and weighted_avg_score < poor_session_score (the recent *level* is poor, not just two points)
       and (performance_trend < 0 or weighted_avg_rpe >= rpe_high)
       and confidence >= min_confidence_to_act   -> BACK OFF

A "poor" session (score < poor_session_score, default 60) is one with missed
reps or RPE >= 9; simply meeting the plan at RPE 8 (61.5) is not poor.
    4. otherwise                                 -> HOLD
"""
from __future__ import annotations


from backend.engine.config import DEFAULT_CONFIG, EngineConfig
from backend.engine.scoring import clamp
from backend.engine.types import Decision, HistoryAnalysis, Prescription


# --- signal ---------------------------------------------------------------

def _perf_norm(a: HistoryAnalysis, c: EngineConfig) -> float:
    return clamp(a.performance_trend / c.trend_scale, -1.0, 1.0)


def _rpe_trend_norm(a: HistoryAnalysis, c: EngineConfig) -> float:
    return clamp(-a.rpe_trend / c.rpe_trend_scale, -1.0, 1.0)


def signal_strength(a: HistoryAnalysis, config: EngineConfig = DEFAULT_CONFIG) -> float:
    """Composite evidence for progressing (+) or backing off (-), in [-1, 1]."""
    if a.session_count == 0:
        return 0.0
    perf = _perf_norm(a, config)
    level = clamp((a.weighted_avg_score - config.neutral_score) / config.level_scale, -1.0, 1.0)
    rpe = 0.5 * _rpe_trend_norm(a, config) + 0.5 * clamp(
        (config.rpe_target - a.weighted_avg_rpe) / config.rpe_level_scale, -1.0, 1.0
    )
    volume = clamp(a.volume_trend / config.volume_trend_scale, -1.0, 1.0)
    signal = (
        config.w_signal_trend * perf
        + config.w_signal_level * level
        + config.w_signal_rpe * rpe
        + config.w_signal_volume * volume
    )
    return round(clamp(signal, -1.0, 1.0), 3)


# --- confidence -----------------------------------------------------------

def compute_confidence(a: HistoryAnalysis, config: EngineConfig = DEFAULT_CONFIG) -> int:
    """0-100. Rises with history, consistency, a clean trend and objective/RPE agreement."""
    if a.session_count == 0:
        return 0
    history = min(a.session_count, config.window_size) / config.window_size * config.conf_history_max
    consistency = clamp(1.0 - a.score_stddev / config.stddev_scale, 0.0, 1.0) * config.conf_consistency_max
    fit_fraction = clamp(1.0 - a.trend_fit_residual / config.residual_scale, 0.0, 1.0)
    trend_fit = fit_fraction * config.conf_trend_fit_max
    # Objective performance (volume trend) and RPE agree when volume rises while RPE falls,
    # or both are flat. The credit is scaled by how well the trend line fits, so noisy
    # histories cannot earn agreement credit from a spurious trend.
    objective_norm = clamp(a.volume_trend / config.volume_trend_scale, -1.0, 1.0)
    agreement = (1.0 - abs(objective_norm - _rpe_trend_norm(a, config)) / 2.0) * fit_fraction * config.conf_agreement_max

    confidence = history + consistency + trend_fit + agreement
    if a.session_count < config.min_sessions:
        confidence = min(confidence, config.low_confidence_cap)
    return int(round(clamp(confidence, 0.0, 100.0)))


# --- decision -------------------------------------------------------------

def decide(
    a: HistoryAnalysis, signal: float, confidence: int, config: EngineConfig = DEFAULT_CONFIG
) -> Decision:
    if a.session_count < config.min_sessions:
        return Decision.HOLD
    if confidence < config.min_confidence_to_act:
        return Decision.HOLD

    if (
        signal >= config.progress_threshold
        and a.weighted_avg_rpe <= config.rpe_progress_max
        and a.last_score >= config.poor_session_score
    ):
        return Decision.PROGRESS

    if (
        signal <= config.backoff_threshold
        and a.recent_poor_sessions >= config.backoff_min_poor_sessions
        and a.weighted_avg_score < config.poor_session_score
        and (a.performance_trend < 0 or a.weighted_avg_rpe >= config.rpe_high)
    ):
        return Decision.BACK_OFF

    return Decision.HOLD


# --- prescription ---------------------------------------------------------

def _round_to_step(weight: float, step: float) -> float:
    return round(round(weight / step) * step, 2)


def _magnitude(strength: float, threshold: float, min_pct: float, max_pct: float) -> float:
    """Linearly map |signal| in [threshold, 1] onto [min_pct, max_pct]."""
    if strength <= threshold:
        return min_pct
    frac = (strength - threshold) / (1.0 - threshold)
    return min_pct + frac * (max_pct - min_pct)


def next_prescription(
    current: Prescription,
    decision: Decision,
    signal: float,
    config: EngineConfig = DEFAULT_CONFIG,
    sessions_at_plan: int | None = None,
) -> Prescription:
    """Turn a decision plus signal strength into the next prescription.

    PROGRESS: weight is the primary lever, scaled 2.5-7.5 % by signal strength
      and rounded to a plate step (never less than one step). A jump larger
      than one step is only made when the evidence was gathered at the current
      plan (``sessions_at_plan`` >= config.min_sessions_at_plan_for_strong);
      scores are measured relative to the plan, so evidence from a lighter plan
      overstates how easy the current one is. A borderline signal adds one
      step, unless one step is more than 5 % of the load (light dumbbell work)
      - then a rep is added instead, up to the rep ceiling. At the ceiling a
      plate is added and reps drop back to the rep floor (double progression).
      Sets never increase (a +1 set is >= +33 % volume for 3 sets - too coarse).
    BACK OFF: weight drops 5-12.5 % by signal strength (never less than one
      step, never below min_weight). A very strong signal also drops one set,
      down to the set floor.
    HOLD: unchanged.
    """
    step = config.weight_step
    strength = abs(signal)

    if decision == Decision.HOLD:
        return current

    if decision == Decision.PROGRESS:
        evidence_at_plan = sessions_at_plan is None or sessions_at_plan >= config.min_sessions_at_plan_for_strong
        if strength >= config.strong_signal and evidence_at_plan:
            pct = _magnitude(strength, config.progress_threshold, config.progress_min_pct, config.progress_max_pct)
            new_weight = max(_round_to_step(current.weight * (1 + pct), step), current.weight + step)
            return Prescription(new_weight, current.reps, current.sets)
        # Borderline: the smallest sensible change.
        if step / current.weight <= config.borderline_max_step_pct:
            return Prescription(current.weight + step, current.reps, current.sets)
        if current.reps < config.rep_ceiling:
            return Prescription(current.weight, current.reps + 1, current.sets)
        return Prescription(current.weight + step, config.rep_floor, current.sets)

    # BACK OFF
    pct = _magnitude(strength, -config.backoff_threshold, config.backoff_min_pct, config.backoff_max_pct)
    new_weight = min(_round_to_step(current.weight * (1 - pct), step), current.weight - step)
    new_weight = max(new_weight, config.min_weight)
    new_sets = current.sets
    if strength >= config.backoff_set_reduction_signal and current.sets > config.set_floor:
        new_sets = current.sets - 1
    return Prescription(new_weight, current.reps, new_sets)


def prescription_pct_change(before: Prescription, after: Prescription) -> float:
    """Percent change in planned volume between two prescriptions."""
    b = before.weight * before.reps * before.sets
    a = after.weight * after.reps * after.sets
    return 0.0 if b == 0 else round(100.0 * (a - b) / b, 1)


__all__ = [
    "signal_strength",
    "compute_confidence",
    "decide",
    "next_prescription",
    "prescription_pct_change",
]
