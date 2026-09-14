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
