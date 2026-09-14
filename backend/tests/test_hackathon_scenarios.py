"""Deterministic Hackathon Acceptance Tests (Section 39).

Verifies the 8 core requirements from the problem statement:
1. Strong performance + good recovery -> PROGRESS
2. Stable performance + mixed recovery -> HOLD
3. Repeated poor performance + high RPE + poor recovery -> BACK OFF
4. One isolated bad session -> One-Bad-Day Guard (no extreme regression, HOLD)
5. Strong performance despite poor subjective readiness -> Nuanced decision (avoids premature deload)
6. Rep ceiling reached (Double progression) -> Load step + rep reset
7. Low confidence / insufficient history -> Conservative HOLD
8. Safety limit -> Progression bounded by max step
"""
import pytest
from backend.engine import DEFAULT_CONFIG, EngineConfig, evaluate
from backend.engine.types import Decision, Prescription, SessionInput


def test_hackathon_1_strong_performance_progresses():
    """TEST 1: Strong performance + good recovery -> Expected: PROGRESS."""
    base = Prescription(weight=100.0, reps=5, sets=3)
    # 5 sessions of solid performance at target weight and reps with low/moderate RPE
    sessions = [
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=6),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=6),
    ]
    res = evaluate(sessions, base)
    assert res.decision == Decision.PROGRESS
    assert res.next.weight >= base.weight
    assert res.confidence >= 60
    assert res.decision.value == "PROGRESS"


def test_hackathon_2_stable_performance_holds():
    """TEST 2: Stable performance + mixed recovery -> Expected: HOLD."""
    base = Prescription(weight=100.0, reps=5, sets=3)
    # Exactly hits plan, RPE matches target (7), no strong slope
    sessions = [
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=8),
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
    ]
    res = evaluate(sessions, base)
    assert res.decision == Decision.HOLD
    assert res.next.weight == base.weight
    assert res.next.reps == base.reps


def test_hackathon_3_repeated_poor_performance_backs_off():
    """TEST 3: Repeated poor performance + high RPE + poor recovery -> Expected: BACK OFF."""
    base = Prescription(weight=100.0, reps=5, sets=3)
    # Persistent decline across consecutive sessions with severe strain
    sessions = [
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=8),
        SessionInput(100.0, 5, 3, 100.0, 4, 3, rpe=9),
        SessionInput(100.0, 5, 3, 100.0, 3, 3, rpe=10),
        SessionInput(100.0, 5, 3, 95.0, 3, 3, rpe=10),
        SessionInput(100.0, 5, 3, 90.0, 2, 2, rpe=10),
    ]
    res = evaluate(sessions, base)
    assert res.decision == Decision.BACK_OFF
    assert res.next.weight < base.weight or res.next.reps < base.reps
    assert res.athlete_state.fatigue_level in ["High", "Moderate"]
    assert any(
        rule in res.triggered_rules
        for rule in ["PERSISTENT_FATIGUE_BACKOFF", "RPE_CREEP_DETECTED", "FATIGUE_SET_REDUCTION", "SAFETY_GATE_HIGH_RPE"]
    )


def test_hackathon_4_one_isolated_bad_day_guard():
    """TEST 4: One isolated bad session -> Expected: No extreme regression (HOLD)."""
    base = Prescription(weight=100.0, reps=5, sets=3)
    # 4 strong sessions, followed by 1 unexpected drop
    sessions = [
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=6),
        SessionInput(100.0, 5, 3, 85.0, 3, 2, rpe=9),  # Isolated bad day!
    ]
    res = evaluate(sessions, base)
    # The One-Bad-Day Guard prevents immediate catastrophic BACK OFF
    assert res.decision != Decision.BACK_OFF
    assert res.decision == Decision.HOLD
    assert "SAFETY_GATE_ONE_BAD_DAY" in res.triggered_rules or res.next.weight >= 95.0


def test_hackathon_5_strong_perf_despite_poor_readiness():
    """TEST 5: Strong performance despite poor subjective readiness -> Nuanced decision."""
    base = Prescription(weight=100.0, reps=5, sets=3)
    # Athlete logged high performance (e.g. rep completion) despite moderate strain
    sessions = [
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=8),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=8),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=8),
    ]
    res = evaluate(sessions, base)
    # The engine should recognize strong objective execution and not force BACK OFF
    assert res.decision in [Decision.HOLD, Decision.PROGRESS]
    assert res.next.weight >= base.weight


def test_hackathon_6_double_progression_rep_ceiling():
    """TEST 6: Dumbbell rep ceiling reached -> Load step + rep reset."""
    base = Prescription(weight=24.0, reps=12, sets=3)
    # Target rep ceiling was 12; user repeatedly achieved 12 reps at ceiling
    cfg = EngineConfig(rep_ceiling=12, rep_floor=8)
    sessions = [
        SessionInput(24.0, 12, 3, 24.0, 12, 3, rpe=7),
        SessionInput(24.0, 12, 3, 24.0, 12, 3, rpe=7),
        SessionInput(24.0, 12, 3, 24.0, 12, 3, rpe=7),
        SessionInput(24.0, 12, 3, 24.0, 12, 3, rpe=6),
        SessionInput(24.0, 12, 3, 24.0, 12, 3, rpe=6),
    ]
    res = evaluate(sessions, base, config=cfg)
    assert res.decision == Decision.PROGRESS
    # Under double progression at rep ceiling, load progresses and reps reset toward floor
    assert res.next.weight > base.weight
    assert res.next.reps <= base.reps


def test_hackathon_7_low_confidence_insufficient_history():
    """TEST 7: Low confidence / insufficient history -> HOLD or conservative decision."""
    base = Prescription(weight=80.0, reps=5, sets=3)
    # Only 1 single session logged
    sessions = [
        SessionInput(80.0, 5, 3, 80.0, 5, 3, rpe=7),
    ]
    res = evaluate(sessions, base)
    assert res.decision == Decision.HOLD
    assert res.confidence <= 35  # Bounded by low_confidence_cap
    assert "SAFETY_GATE_LOW_CONFIDENCE" in res.triggered_rules or "sessions" in res.explanation.lower()


def test_hackathon_8_safety_limits_bound_load_increases():
    """TEST 8: Safety limit -> Progression bounded by max step (no unrealistic jumps)."""
    base = Prescription(weight=100.0, reps=5, sets=3)
    # Even with an extraordinary over-performance session
    sessions = [
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=7),
        SessionInput(100.0, 5, 3, 100.0, 5, 3, rpe=6),
        SessionInput(100.0, 5, 3, 100.0, 6, 3, rpe=6),
        SessionInput(100.0, 5, 3, 100.0, 8, 3, rpe=5),
        SessionInput(100.0, 5, 3, 100.0, 10, 3, rpe=5),
    ]
    res = evaluate(sessions, base)
    assert res.decision == Decision.PROGRESS
    # Load jump must be bounded by realistic step (e.g. <= 5% or 2.5/5kg step, never 20kg jump)
    weight_jump = res.next.weight - base.weight
    assert weight_jump <= 10.0  # Max progression cap safely bounds aggressive step
    assert res.next.weight % 0.5 == 0.0  # Clean gym increments
