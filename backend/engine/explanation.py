"""Deterministic, template-based explanations of engine decisions.

``explain(decision, reasoning)`` is the single seam between the numerical
engine and the wording shown to users. A future LLM-powered narrator can
replace this function (same signature, fed the same ``ReasoningData``)
without touching scoring, analysis or decision logic - the LLM would only
narrate a decision that has already been made.
"""
from __future__ import annotations

from backend.engine.types import Decision, Prescription, ReasoningData, TrendDirection


def _fmt_weight(w: float) -> str:
    return f"{w:g} kg"


def _prescription_text(p: Prescription) -> str:
    return f"{_fmt_weight(p.weight)} x {p.reps} reps x {p.sets} sets"


def _change_text(prev: Prescription, nxt: Prescription) -> str:
    if prev == nxt:
        return f"The next prescription stays at {_prescription_text(prev)}."
    parts = []
    if nxt.weight != prev.weight:
        parts.append(f"weight {_fmt_weight(prev.weight)} -> {_fmt_weight(nxt.weight)}")
    if nxt.reps != prev.reps:
        parts.append(f"reps {prev.reps} -> {nxt.reps}")
    if nxt.sets != prev.sets:
        parts.append(f"sets {prev.sets} -> {nxt.sets}")
    return f"Next prescription: {_prescription_text(nxt)} ({', '.join(parts)})."


def _trend_phrase(direction: TrendDirection) -> str:
    return {
        TrendDirection.IMPROVING: "improving",
        TrendDirection.STABLE: "stable",
        TrendDirection.DECLINING: "declining",
    }[direction]


def _rpe_phrase(rpe_trend: float) -> str:
    if rpe_trend <= -0.3:
        return "perceived effort has been falling"
    if rpe_trend >= 0.3:
        return "perceived effort has been rising"
    return "perceived effort has stayed roughly level"


def explain(decision: Decision, r: ReasoningData) -> str:
    """Return a human-readable explanation that cites the calculated evidence."""
    n = r.session_count
    trend = _trend_phrase(r.trend_direction)
    rpe = _rpe_phrase(r.rpe_trend)
    stats = (
        f"Based on your last {n} session{'s' if n != 1 else ''}: weighted recent score "
        f"{r.weighted_score:.0f}/100, performance trend {r.performance_trend:+.1f} pts/session, "
        f"RPE trend {r.rpe_trend:+.1f}/session, confidence {r.confidence}%."
    )

    if n < 3:
        return (
            f"Only {n} session{'s' if n != 1 else ''} logged so far, so the system is holding the current "
            f"prescription until it has more history (3+ sessions) to personalise your progression. "
            f"{stats} {_change_text(r.previous, r.next)}"
        )

    if decision == Decision.PROGRESS:
        strength = "notably" if abs(r.signal_strength) >= 0.6 else "slightly"
        return (
            f"Your performance has been {trend} across your recent sessions while {rpe} and RPE remains "
            f"manageable. The system is increasing the load {strength} for your next session. "
            f"{stats} {_change_text(r.previous, r.next)}"
        )

    if decision == Decision.BACK_OFF:
        return (
            f"Your performance has {'been declining' if trend == 'declining' else 'weakened'} across multiple recent sessions "
            f"while {rpe}. The system is temporarily reducing the workload because the negative trend is "
            f"persistent, rather than reacting to a single poor session. "
            f"{stats} {_change_text(r.previous, r.next)}"
        )

    # HOLD
    if r.trend_direction == TrendDirection.STABLE:
        reason = "your performance has been stable and the signals do not justify a change yet"
    elif r.session_score < r.weighted_score - 10:
        reason = (
            f"your most recent session ({r.session_score:.0f}/100) was below your recent average, "
            "so the system is waiting for one more session rather than reacting to a single result"
        )
    else:
        reason = f"the signals are mixed (trend {trend}, {rpe})"
    return (
        f"The system is holding your current prescription because {reason}. "
        f"{stats} {_change_text(r.previous, r.next)}"
    )
