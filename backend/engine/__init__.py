"""Adaptive engine - pure, deterministic Python. No I/O, no framework imports.

Entry point::

    from backend.engine import evaluate
    result = evaluate(sessions, base_prescription)

``sessions`` is the exercise's history ordered oldest -> newest (only the
last ``config.window_size`` are used); ``base_prescription`` is the plan the
athlete just trained under and is the starting point for the next one.

Pipeline: scoring.session_score -> analysis.analyze_history ->
decision.signal_strength / compute_confidence / decide / next_prescription ->
explanation.explain.
"""
from __future__ import annotations

from backend.engine.analysis import analyze_history
from backend.engine.config import DEFAULT_CONFIG, EngineConfig
from backend.engine.decision import (
    compute_confidence,
    decide,
    evaluate_set_overshoot,
    next_prescription,
    signal_strength,
)
from backend.engine.explanation import explain
from backend.engine.readiness import (
    calculate_adjusted_load,
    calculate_readiness_modifier,
    generate_readiness_message,
)
from backend.engine.rules import (
    build_coaching_rationale,
    compute_component_breakdown,
    compute_personal_baseline,
    compute_session_delta,
    estimate_athlete_state,
    extract_triggered_rules,
    generate_counterfactuals,
)
from backend.engine.scoring import session_score
from backend.engine.types import (
    AthleteState,
    CounterfactualOption,
    Decision,
    EngineResult,
    PersonalBaseline,
    Prescription,
    ReasoningData,
    SessionDelta,
    SessionInput,
    SetAutoregulationResult,
    TrendDirection,
)


def evaluate(
    sessions: list[SessionInput],
    base: Prescription,
    config: EngineConfig = DEFAULT_CONFIG,
) -> EngineResult:
    """Analyse recent history and produce the next-session recommendation."""
    analysis = analyze_history(sessions, config)
    signal = signal_strength(analysis, config)
    confidence = compute_confidence(analysis, config)
    decision = decide(analysis, signal, confidence, config)
    window = sessions[-config.window_size :]
    sessions_at_plan = sum(1 for s in window if s.planned == base)
    nxt = next_prescription(base, decision, signal, config, sessions_at_plan)

    breakdown_data = compute_component_breakdown(analysis, config)
    component_breakdown = {
        "perf_trend": breakdown_data.perf_trend,
        "score_level": breakdown_data.score_level,
        "rpe_signal": breakdown_data.rpe_signal,
        "volume_trend": breakdown_data.volume_trend,
    }
    rules = extract_triggered_rules(
        analysis, signal, confidence, decision, base, nxt, config
    )
    rationale = build_coaching_rationale(
        decision, analysis, signal, confidence, rules, base, nxt
    )
    athlete_state = estimate_athlete_state(analysis, signal, confidence, decision)
    baseline = compute_personal_baseline(sessions, config)
    counterfactuals = generate_counterfactuals(decision, analysis, signal, confidence, base, nxt)
    session_delta = compute_session_delta(sessions, base, nxt)

    reasoning = ReasoningData(
        decision=decision,
        session_count=analysis.session_count,
        recent_score=round(analysis.recent_avg_score, 1),
        weighted_score=round(analysis.weighted_avg_score, 1),
        performance_trend=round(analysis.performance_trend, 1),
        rpe_trend=round(analysis.rpe_trend, 2),
        volume_trend=round(analysis.volume_trend, 1),
        consistency=round(analysis.score_stddev, 1),
        signal_strength=signal,
        confidence=confidence,
        trend_direction=analysis.trend_direction,
        previous=base,
        next=nxt,
        session_score=analysis.last_score,
    )
    return EngineResult(
        decision=decision,
        confidence=confidence,
        trend_direction=analysis.trend_direction,
        analysis=analysis,
        signal_strength=signal,
        previous=base,
        next=nxt,
        reasoning=reasoning,
        explanation=explain(decision, reasoning),
        component_breakdown=component_breakdown,
        triggered_rules=rules,
        coaching_rationale=rationale,
        athlete_state=athlete_state,
        baseline=baseline,
        counterfactuals=counterfactuals,
        session_delta=session_delta,
    )


__all__ = [
    "evaluate",
    "session_score",
    "EngineConfig",
    "DEFAULT_CONFIG",
    "Decision",
    "TrendDirection",
    "Prescription",
    "SessionInput",
    "EngineResult",
    "ReasoningData",
    "SetAutoregulationResult",
    "evaluate_set_overshoot",
    "calculate_readiness_modifier",
    "calculate_adjusted_load",
    "generate_readiness_message",
]

