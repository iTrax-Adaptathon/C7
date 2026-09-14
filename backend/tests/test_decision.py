"""Spec test cases 1-9 for the decision engine (fixed-plan histories)."""
from dataclasses import replace

from backend.engine import evaluate
from backend.engine.config import DEFAULT_CONFIG
from backend.engine.decision import next_prescription
from backend.engine.types import Decision, Prescription, TrendDirection
from backend.tests.conftest import session

BASE = Prescription(60, 8, 3)


def improving():
    return [
        session(60, 8, 3, actual_weight=60, rpe=8),
        session(60, 8, 3, actual_weight=62.5, rpe=8),
        session(60, 8, 3, actual_weight=65, rpe=7),
        session(60, 8, 3, actual_weight=65, actual_reps=9, rpe=7),
        session(60, 8, 3, actual_weight=67.5, actual_reps=9, rpe=6),
    ]


def declining():
    return [
        session(60, 8, 3, rpe=7),
        session(60, 8, 3, actual_reps=7, rpe=8),
        session(60, 8, 3, actual_reps=6, rpe=9),
        session(60, 8, 3, actual_reps=5, rpe=9),
        session(60, 8, 3, actual_reps=4, rpe=10),
    ]


# 1. Fewer than 3 sessions -> HOLD + low confidence
def test_insufficient_history_holds_with_low_confidence():
    for n in (0, 1, 2):
        r = evaluate(improving()[:n], BASE)
        assert r.decision == Decision.HOLD
        assert r.confidence <= DEFAULT_CONFIG.low_confidence_cap
        assert r.next == BASE


# 2. Clear improving trend -> PROGRESS
def test_clear_improvement_progresses():
    r = evaluate(improving(), BASE)
    assert r.decision == Decision.PROGRESS
    assert r.trend_direction == TrendDirection.IMPROVING
    assert r.confidence >= 60
    assert r.next.weight > BASE.weight


# 3. Stable trend -> HOLD
def test_stable_history_holds():
    r = evaluate([session(rpe=7)] * 5, BASE)
    assert r.decision == Decision.HOLD
    assert r.trend_direction == TrendDirection.STABLE
    assert r.next == BASE


# 4. Genuine multi-session decline -> BACK OFF
def test_multi_session_decline_backs_off():
    r = evaluate(declining(), BASE)
    assert r.decision == Decision.BACK_OFF
    assert r.trend_direction == TrendDirection.DECLINING
    assert r.next.weight < BASE.weight
    assert r.confidence >= 60


# 5. One isolated poor session followed by recovery -> not BACK OFF
def test_isolated_bad_session_does_not_back_off():
    history = [
        session(rpe=6),
        session(rpe=6),
        session(actual_reps=4, rpe=10),  # the bad day
        session(rpe=6),
        session(rpe=6),
    ]
    r = evaluate(history, BASE)
    assert r.decision != Decision.BACK_OFF


def test_bad_session_as_most_recent_holds_rather_than_backs_off():
    history = improving()[:4] + [session(actual_reps=4, rpe=10)]
    r = evaluate(history, BASE)
    assert r.decision == Decision.HOLD
    assert r.next == BASE


# 6. Conflicting performance / RPE signals
def test_conflicting_signals_lower_confidence_and_do_not_back_off():
    clean = evaluate(improving(), BASE)
    conflicting = [
        session(60, 8, 3, actual_weight=60, rpe=6),
        session(60, 8, 3, actual_weight=62.5, rpe=7),
        session(60, 8, 3, actual_weight=65, rpe=8),
        session(60, 8, 3, actual_weight=67.5, rpe=9),
        session(60, 8, 3, actual_weight=70, rpe=10),
    ]
    r = evaluate(conflicting, BASE)
    assert r.decision != Decision.BACK_OFF
    assert r.confidence < clean.confidence


# 7. Inconsistent / noisy history
def test_noisy_history_holds_with_low_confidence():
    noisy = [
        session(actual_reps=10, rpe=5),
        session(actual_reps=4, rpe=10),
        session(actual_reps=10, rpe=5),
        session(actual_reps=4, rpe=10),
        session(actual_reps=10, rpe=5),
    ]
    r = evaluate(noisy, BASE)
    assert r.decision == Decision.HOLD
    assert r.confidence < 50
    assert r.confidence < evaluate([session(rpe=7)] * 5, BASE).confidence


# 8. Different exercises produce different decisions
def test_different_histories_give_different_decisions():
    results = {
        "squat": evaluate(improving(), BASE).decision,
        "bench": evaluate(declining(), Prescription(80, 5, 3)).decision,
        "rdl": evaluate([session(100, 8, 3, rpe=7)] * 5, Prescription(100, 8, 3)).decision,
    }
    assert results == {"squat": Decision.PROGRESS, "bench": Decision.BACK_OFF, "rdl": Decision.HOLD}


# 9. Prescription changes
def test_hold_keeps_prescription():
    assert next_prescription(BASE, Decision.HOLD, 0.0) == BASE


def test_progress_magnitude_scales_with_signal_and_rounds_to_step():
    borderline = next_prescription(BASE, Decision.PROGRESS, 0.3)
    strong = next_prescription(BASE, Decision.PROGRESS, 1.0)
    assert borderline == Prescription(62.5, 8, 3)  # one plate step
    assert strong.weight > borderline.weight
    assert strong.weight <= BASE.weight * (1 + DEFAULT_CONFIG.progress_max_pct) + DEFAULT_CONFIG.weight_step / 2
    for p in (borderline, strong):
        assert p.sets == BASE.sets  # sets never increase
        assert (p.weight / DEFAULT_CONFIG.weight_step) % 1 == 0


def test_borderline_progress_on_light_load_adds_a_rep():
    light = Prescription(10, 10, 3)
    p = next_prescription(light, Decision.PROGRESS, 0.3)
    assert p == Prescription(10, 11, 3)
    at_ceiling = Prescription(10, DEFAULT_CONFIG.rep_ceiling, 3)
    # double progression: add a plate, drop reps back to the floor
    assert next_prescription(at_ceiling, Decision.PROGRESS, 0.3) == Prescription(12.5, DEFAULT_CONFIG.rep_floor, 3)


def test_back_off_magnitude_scales_with_signal():
    borderline = next_prescription(BASE, Decision.BACK_OFF, -0.3)
    strong = next_prescription(BASE, Decision.BACK_OFF, -1.0)
    assert borderline == Prescription(57.5, 8, 3)
    assert strong.weight < borderline.weight
    assert strong.weight >= BASE.weight * (1 - DEFAULT_CONFIG.backoff_max_pct) - DEFAULT_CONFIG.weight_step / 2
    assert strong.sets == BASE.sets - 1  # strong back off also drops a set
    assert borderline.sets == BASE.sets
    assert next_prescription(Prescription(60, 8, 2), Decision.BACK_OFF, -1.0).sets == 2  # set floor


def test_strong_jump_requires_evidence_at_current_plan():
    strong = next_prescription(BASE, Decision.PROGRESS, 1.0, sessions_at_plan=5)
    fresh = next_prescription(BASE, Decision.PROGRESS, 1.0, sessions_at_plan=1)
    assert strong.weight > BASE.weight + DEFAULT_CONFIG.weight_step
    assert fresh == Prescription(BASE.weight + DEFAULT_CONFIG.weight_step, 8, 3)
    # evaluate() derives sessions_at_plan from the history: a plan that just changed gets one step
    history = improving()[:4] + [session(62.5, 8, 3, actual_weight=65, rpe=5)]
    r = evaluate(history, Prescription(62.5, 8, 3))
    assert r.decision == Decision.PROGRESS
    assert r.next.weight == 65


def test_back_off_never_below_min_weight():
    p = next_prescription(Prescription(2.5, 8, 3), Decision.BACK_OFF, -1.0)
    assert p.weight == DEFAULT_CONFIG.min_weight


def test_engine_is_deterministic():
    a = evaluate(improving(), BASE)
    b = evaluate(improving(), BASE)
    assert a == b


def test_custom_config_is_respected():
    cfg = replace(DEFAULT_CONFIG, weight_step=5.0)
    heavy = Prescription(100, 8, 3)
    assert next_prescription(heavy, Decision.PROGRESS, 0.3, cfg) == Prescription(105, 8, 3)
    assert next_prescription(heavy, Decision.PROGRESS, 0.3) == Prescription(102.5, 8, 3)
