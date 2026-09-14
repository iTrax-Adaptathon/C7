"""Automated tests for Sprint 2 features:
1. Glass-box explainability & rule triggers
2. Pre-workout readiness & dynamic baseline adjustment
3. Real-time intra-session set autoregulation (fatigue stops)
4. API endpoints
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from backend import crud
from backend.database import Base, make_engine
from backend.engine.decision import evaluate_set_overshoot
from backend.engine.readiness import (
    calculate_adjusted_load,
    calculate_composite_readiness,
    calculate_readiness_modifier,
    classify_readiness,
    generate_readiness_message,
)
from backend.engine.rules import (
    build_coaching_rationale,
    compute_component_breakdown,
    extract_triggered_rules,
)
from backend.engine.types import (
    Decision,
    HistoryAnalysis,
    Prescription,
    SessionInput,
    TrendDirection,
)
from backend.main import app


# --- 1. Readiness tests --------------------------------------------------------

def test_readiness_modifier_neutral():
    """Rating 3 across sleep, soreness, stress yields neutral modifier (0.0)."""
    mod = calculate_readiness_modifier(3, 3, 3)
    assert mod == 0.0


def test_readiness_modifier_bounds():
    """Modifier must be clamped strictly within [-0.10, +0.10]."""
    # Extreme worst case: 1, 1, 1
    worst = calculate_readiness_modifier(1, 1, 1)
    assert worst >= -0.10
    assert worst == -0.10  # 0.03*(-2) + 0.03*(-2) + 0.02*(-2) = -0.16 -> clamped to -0.10

    # Extreme best case: 5, 5, 5
    best = calculate_readiness_modifier(5, 5, 5)
    assert best <= 0.10
    assert best == 0.10   # 0.03*2 + 0.03*2 + 0.02*2 = +0.16 -> clamped to +0.10


def test_readiness_adjusted_load():
    """Load is scaled by (1 + modifier) and quantized to plate steps."""
    # 100 kg with -10% modifier -> 90 kg
    assert calculate_adjusted_load(100.0, -0.10, weight_step=2.5) == 90.0
    # 100 kg with +5% modifier -> 105 kg
    assert calculate_adjusted_load(100.0, 0.05, weight_step=2.5) == 105.0
    # Light weight does not drop below min_weight
    assert calculate_adjusted_load(5.0, -0.10, min_weight=5.0) == 5.0


def test_readiness_message():
    """Message correctly cites soreness and fatigue when modifier is negative."""
    msg = generate_readiness_message(1, 1, 3, -0.10, 100.0, 90.0)
    assert "detected" in msg.lower()
    assert "-10" in msg or "10" in msg


# --- Composite 5-signal readiness (matches the check-in UI) -------------------

def test_composite_readiness_neutral():
    """All five ratings at 3 (mid-scale, the check-in's default) is the true
    neutral point: score 60/100, modifier exactly 0.0, ADEQUATE BASELINE."""
    modifier, score = calculate_composite_readiness(3, 3, 3, 3, 3)
    assert score == 60
    assert modifier == 0.0
    assert classify_readiness(score) == "ADEQUATE BASELINE"


def test_composite_readiness_best_case():
    """Best sleep/freshness/energy and lowest stress/soreness -> PRIME RECOVERY."""
    modifier, score = calculate_composite_readiness(
        sleep_rating=5, freshness_rating=5, energy_rating=5, stress_rating=1, soreness_rating=1
    )
    assert score == 98  # raw 100, clamped to the display ceiling
    assert modifier == 0.10  # raw 100 lands exactly on the +10% cap
    assert classify_readiness(score) == "PRIME RECOVERY"


def test_composite_readiness_worst_case():
    """Worst sleep/freshness/energy and highest stress/soreness -> ELEVATED FATIGUE."""
    modifier, score = calculate_composite_readiness(
        sleep_rating=1, freshness_rating=1, energy_rating=1, stress_rating=5, soreness_rating=5
    )
    assert score == 20  # raw 20, above the display floor of 15
    assert modifier == -0.10  # raw 20 lands exactly on the -10% cap
    assert classify_readiness(score) == "ELEVATED FATIGUE"


def test_composite_readiness_stress_and_soreness_are_inverted():
    """Stress/soreness are asked as 'how bad' (1=best, 5=worst) so they must
    invert relative to sleep/freshness/energy (1=worst, 5=best) — raising
    stress or soreness alone must lower the score, not raise it."""
    _, baseline_score = calculate_composite_readiness(3, 3, 3, 3, 3)
    _, higher_stress_score = calculate_composite_readiness(3, 3, 3, 5, 3)
    assert higher_stress_score < baseline_score


# --- 2. Intra-Session Autoregulation tests -------------------------------------

def test_autoregulation_fatigue_stop_overshoot():
    """actual_rpe >= target_rpe + 2.0 triggers a 5% load drop."""
    res = evaluate_set_overshoot(
        set_index=2,
        target_rpe=7.0,
        actual_rpe=9.5,  # +2.5 overshoot
        current_weight=100.0,
        current_reps=8,
    )
    assert res.triggered is True
    assert res.adjustment_type == "LOAD_DROP"
    assert res.recommended_weight == 95.0  # 5% drop on 100 kg
    assert res.delta_weight == -5.0
    assert "Fatigue Stop" in res.message


def test_autoregulation_supercompensation_set1():
    """actual_rpe <= target_rpe - 2.5 on Set 1 triggers an optional +2.5% progression jump."""
    res = evaluate_set_overshoot(
        set_index=1,
        target_rpe=8.0,
        actual_rpe=5.0,  # -3.0 undershoot on set 1
        current_weight=100.0,
        current_reps=5,
    )
    assert res.triggered is True
    assert res.adjustment_type == "LOAD_INCREASE"
    assert res.recommended_weight >= 102.5
    assert "Athlete Primed" in res.message


def test_autoregulation_normal_effort():
    """RPE within normal bounds does not trigger adjustments."""
    res = evaluate_set_overshoot(
        set_index=1,
        target_rpe=7.0,
        actual_rpe=7.5,
        current_weight=100.0,
        current_reps=8,
    )
    assert res.triggered is False
    assert res.adjustment_type == "NONE"
    assert res.recommended_weight == 100.0


# --- 3. Glass-Box Explainability & Rule triggers -------------------------------

def test_component_breakdown_and_rules():
    """Verify component breakdown calculation and rule activation."""
    # Analysis representing an athlete with creeping RPE
    analysis = HistoryAnalysis(
        session_count=5,
        scores=[75.0, 72.0, 70.0, 68.0, 65.0],
        recent_avg_score=70.0,
        weighted_avg_score=68.5,
        weighted_avg_rpe=8.4,
        performance_trend=-2.5,
        rpe_trend=0.35,  # RPE creeping upward
        volume_trend=-1.0,
        score_stddev=3.5,
        trend_fit_residual=0.8,
        last_score=65.0,
        recent_poor_sessions=0,
        trend_direction=TrendDirection.DECLINING,
    )

    breakdown = compute_component_breakdown(analysis)
    assert isinstance(breakdown.perf_trend, float)
    assert isinstance(breakdown.score_level, float)
    assert isinstance(breakdown.rpe_signal, float)
    assert isinstance(breakdown.volume_trend, float)
    # RPE creeping means rpe_signal should be negative (fatigue driver)
    assert breakdown.rpe_signal < 0.0

    curr = Prescription(100.0, 8, 3)
    nxt = Prescription(100.0, 8, 3)
    rules = extract_triggered_rules(analysis, -0.15, 75, Decision.HOLD, curr, nxt)
    assert "RPE_CREEP_DETECTED" in rules

    rationale = build_coaching_rationale(Decision.HOLD, analysis, -0.15, 75, rules, curr, nxt)
    assert "perceived exertion climbed" in rationale.lower() or "fatigue" in rationale.lower()


def test_one_bad_day_guard_rule():
    """Verify ONE_BAD_DAY_GUARD triggers when last score is poor in an otherwise solid history."""
    analysis = HistoryAnalysis(
        session_count=5,
        scores=[80.0, 80.0, 82.0, 81.0, 52.0],  # session 5 was an isolated bad day
        recent_avg_score=75.0,
        weighted_avg_score=72.0,
        weighted_avg_rpe=7.2,
        performance_trend=-0.5,
        rpe_trend=0.1,
        volume_trend=0.0,
        score_stddev=10.0,
        trend_fit_residual=4.0,
        last_score=52.0,
        recent_poor_sessions=1,
        trend_direction=TrendDirection.STABLE,
    )
    curr = Prescription(80.0, 5, 3)
    nxt = Prescription(80.0, 5, 3)
    rules = extract_triggered_rules(analysis, 0.25, 60, Decision.HOLD, curr, nxt)
    assert "ONE_BAD_DAY_GUARD" in rules


# --- 4. API Endpoint tests ----------------------------------------------------

@pytest.fixture
def test_client(tmp_path):
    engine = make_engine(f"sqlite:///{(tmp_path / 'sprint2_test.db').as_posix()}")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with TestingSession() as db:
        crud.create_exercise(db, "Barbell Squat", "Legs")
        db.commit()

    from backend.database import get_db

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_api_readiness_endpoint(test_client):
    """POST /api/sessions/{id}/readiness returns scaled load and explainability.

    Ratings use the check-in's own scale: sleep/freshness/energy 1=worst,
    5=best; stress/soreness 1=best (calm/pain-free), 5=worst (overwhelmed/
    severe) -- so sorenessRating/stressRating of 4 here mean "fairly sore,
    fairly stressed", not "fairly fine". freshness/energy are omitted to
    also cover a legacy 3-field-only payload (they default to neutral).
    """
    payload = {
        "sleepRating": 2,
        "sorenessRating": 4,
        "stressRating": 4,
        "targetLoad": 100.0,
        "targetReps": 8,
        "targetSets": 3,
    }
    resp = test_client.post("/api/sessions/1/readiness", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["readinessModifier"] < 0.0
    assert data["adjustedLoad"] < 100.0
    assert "detected" in data["message"].lower()


def test_api_autoregulation_endpoint(test_client):
    """POST /api/autoregulation/evaluate calculates fatigue stop drop."""
    payload = {
        "setIndex": 2,
        "targetRpe": 7.0,
        "actualRpe": 9.5,
        "currentWeight": 100.0,
        "currentReps": 8,
        "weightStep": 2.5,
    }
    resp = test_client.post("/api/autoregulation/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["triggered"] is True
    assert data["adjustmentType"] == "LOAD_DROP"
    assert data["recommendedWeight"] == 95.0


def test_api_log_includes_glass_box(test_client):
    """POST /logs includes complete glass-box explainability payload."""
    payload = {
        "exerciseId": 1,
        "plannedWeight": 80.0,
        "plannedReps": 5,
        "plannedSets": 3,
        "actualWeight": 80.0,
        "actualReps": 5,
        "actualSets": 3,
        "rpe": 7,
    }
    resp = test_client.post("/logs", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "glassBox" in data
    gb = data["glassBox"]
    assert gb["action"] in ["PROGRESS", "HOLD", "BACK OFF"]
    assert "componentBreakdown" in gb
    assert "perfTrend" in gb["componentBreakdown"]
    assert "scoreLevel" in gb["componentBreakdown"]
    assert "rpeSignal" in gb["componentBreakdown"]
    assert "volumeTrend" in gb["componentBreakdown"]
    assert "triggeredRules" in gb
    assert "coachingRationale" in gb
