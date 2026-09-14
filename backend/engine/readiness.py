"""Pre-workout readiness and dynamic baseline load adjustment.

Computes a daily readiness modifier from subjective athlete check-in values
(sleep quality, muscle freshness/soreness, life stress / energy, all on a 1-5 scale)
and applies it to scale target working loads dynamically before the session begins.
"""
from __future__ import annotations

from dataclasses import dataclass
from backend.engine.scoring import clamp


def calculate_readiness_modifier(
    sleep_rating: int,
    soreness_rating: int,
    stress_rating: int,
) -> float:
    """Calculate readiness modifier bounded within [-0.10, +0.10].

    Scale: 1 (severe deficit/fatigue) to 5 (optimal/fresh).
    Rating 3 is baseline neutral (modifier = 0).
    Formula:
        ReadinessModifier = clamp(
            0.03 * (sleep - 3) + 0.03 * (soreness - 3) + 0.02 * (stress - 3),
            -0.10,
            +0.10
        )
    """
    sleep = clamp(float(sleep_rating), 1.0, 5.0)
    soreness = clamp(float(soreness_rating), 1.0, 5.0)
    stress = clamp(float(stress_rating), 1.0, 5.0)

    raw_modifier = (
        0.03 * (sleep - 3.0)
        + 0.03 * (soreness - 3.0)
        + 0.02 * (stress - 3.0)
    )
    return round(clamp(raw_modifier, -0.10, 0.10), 3)


def calculate_adjusted_load(
    target_load: float,
    readiness_modifier: float,
    weight_step: float = 2.5,
    min_weight: float = 2.5,
) -> float:
    """Scale the planned working load by (1 + ReadinessModifier) and round to plate step."""
    adjusted = target_load * (1.0 + readiness_modifier)
    if weight_step > 0:
        stepped = round(round(adjusted / weight_step) * weight_step, 2)
    else:
        stepped = round(adjusted, 2)
    return max(stepped, min_weight)


def generate_readiness_message(
    sleep_rating: int,
    soreness_rating: int,
    stress_rating: int,
    readiness_modifier: float,
    original_load: float,
    adjusted_load: float,
) -> str:
    """Generate concise sports science explanation for the readiness adjustment."""
    pct = round(readiness_modifier * 100.0, 1)
    load_diff = round(adjusted_load - original_load, 1)

    if readiness_modifier < -0.01:
        reasons = []
        if sleep_rating < 3:
            reasons.append("sub-optimal sleep")
        if soreness_rating < 3:
            reasons.append("elevated muscle soreness")
        if stress_rating < 3:
            reasons.append("high systemic stress")
        
        factor = " and ".join(reasons) if reasons else "fatigue markers"
        diff_str = f"{load_diff:g} kg" if load_diff < 0 else f"{pct}%"
        return f"{factor.capitalize()} detected: target load adjusted by {pct}% ({diff_str}) to manage fatigue and preserve movement quality."

    if readiness_modifier > 0.01:
        reasons = []
        if sleep_rating > 3:
            reasons.append("deep recovery sleep")
        if soreness_rating > 3:
            reasons.append("fresh musculature")
        if stress_rating > 3:
            reasons.append("low stress")

        factor = " and ".join(reasons) if reasons else "high readiness"
        diff_str = f"+{load_diff:g} kg" if load_diff > 0 else f"+{pct}%"
        return f"{factor.capitalize()} detected: athlete primed for higher volume. Target load boosted by +{pct}% ({diff_str})."

    return "Readiness is at baseline. Proceed with standard scheduled working load."


# --- composite 5-signal readiness (matches the check-in UI) -------------------
#
# The check-in screen asks the athlete about five things: sleep quality,
# muscle freshness and energy/drive (where 1 = worst, 5 = best), plus stress
# and soreness (where the UI asks "how bad", so 1 = best/none and 5 =
# worst/severe). This is the single place that scoring happens — the
# frontend calls the API instead of re-deriving its own number, so the
# displayed readiness score and the load it actually feeds into the next
# logged session can never disagree.

READINESS_WEIGHTS = {
    "sleep": 0.25,
    "freshness": 0.25,
    "energy": 0.25,
    "stress": 0.125,
    "soreness": 0.125,
}


def calculate_composite_readiness(
    sleep_rating: int,
    freshness_rating: int,
    energy_rating: int,
    stress_rating: int,
    soreness_rating: int,
) -> tuple[float, int]:
    """Combine five subjective 1-5 signals into (modifier, score).

    ``score`` is 0-100 (clamped to [15, 98] so a single check-in can never
    claim total exhaustion or perfection). ``modifier`` is the fraction the
    day's target load is scaled by, clamped to [-0.10, +0.10].
    """
    sleep = clamp(float(sleep_rating), 1.0, 5.0)
    freshness = clamp(float(freshness_rating), 1.0, 5.0)
    energy = clamp(float(energy_rating), 1.0, 5.0)
    stress = clamp(float(stress_rating), 1.0, 5.0)
    soreness = clamp(float(soreness_rating), 1.0, 5.0)

    # Weights sum to 1.0, so raw_score has a natural range of [20, 100]:
    # all five ratings at 1 -> 20, all five at 5 -> 100, all five at the
    # mid-scale default of 3 -> exactly 60 (the true neutral point).
    raw_score = (
        sleep * READINESS_WEIGHTS["sleep"]
        + freshness * READINESS_WEIGHTS["freshness"]
        + energy * READINESS_WEIGHTS["energy"]
        + (6.0 - stress) * READINESS_WEIGHTS["stress"]
        + (6.0 - soreness) * READINESS_WEIGHTS["soreness"]
    ) * 20.0

    # Centered on the true neutral (60) and scaled so the natural extremes
    # (20 and 100) land exactly on the +/-10% cap -- a default check-in
    # (all 3s) always comes back at 0.0, never a false positive/negative.
    modifier = round(clamp((raw_score - 60.0) / 400.0, -0.10, 0.10), 3)

    # The displayed score is separately capped to [15, 98] so a single
    # check-in can never claim literal 0% or 100% readiness.
    score = int(round(clamp(raw_score, 15.0, 98.0)))
    return modifier, score


def classify_readiness(score: int) -> str:
    if score >= 80:
        return "PRIME RECOVERY"
    if score < 60:
        return "ELEVATED FATIGUE"
    return "ADEQUATE BASELINE"


def generate_composite_readiness_message(
    sleep_rating: int,
    freshness_rating: int,
    energy_rating: int,
    stress_rating: int,
    soreness_rating: int,
    modifier: float,
    score: int,
    original_load: float,
    adjusted_load: float,
) -> str:
    """Deterministic explanation matching the 5-signal composite score."""
    pct = round(modifier * 100.0, 1)
    load_diff = round(adjusted_load - original_load, 1)
    status = classify_readiness(score)

    if status == "ELEVATED FATIGUE":
        flags = []
        if sleep_rating <= 2:
            flags.append("poor sleep")
        if soreness_rating >= 4:
            flags.append("severe DOMS")
        if stress_rating >= 4:
            flags.append("high cortisol")
        if freshness_rating <= 2:
            flags.append("sluggish musculature")
        if energy_rating <= 2:
            flags.append("low energy")
        reason = ", ".join(flags) if flags else "systemic fatigue markers"
        return (
            f"{reason.capitalize()} detected. Target load moderated by {pct}% "
            f"({load_diff:g} kg) to safeguard technique and joint integrity."
        )

    if status == "PRIME RECOVERY":
        return (
            f"High recovery velocity detected (+{pct}%). Contractile tissues and "
            f"CNS are primed. Target load scaled up by +{load_diff:g} kg to "
            f"exploit supercompensation."
        )

    return "Readiness matches personal baseline. Ready to execute the target working prescription with full intensity."
