from backend.engine.config import DEFAULT_CONFIG
from backend.engine.scoring import session_metrics, session_score
from backend.tests.conftest import session


def test_metrics_basic():
    m = session_metrics(session(60, 8, 3, actual_weight=62.5, actual_reps=6, actual_sets=3, rpe=8))
    assert m.volume == 62.5 * 6 * 3
    assert m.planned_volume == 60 * 8 * 3
    assert m.rep_completion == 18 / 24
    assert m.weight_ratio == 62.5 / 60
    assert m.volume_ratio == (62.5 * 18) / (60 * 24)
    assert m.rpe == 8


def test_reference_scores():
    # Documented reference points of the formula.
    assert session_score(session(rpe=7)) == 67.5
    assert session_score(session(rpe=6)) == 73.5
    assert session_score(session(rpe=9)) == 55.5


def test_score_is_clamped_to_0_100():
    best = session(60, 8, 3, actual_weight=90, actual_reps=12, actual_sets=3, rpe=1)
    worst = session(60, 8, 3, actual_weight=30, actual_reps=1, actual_sets=1, rpe=10)
    assert session_score(best) == 100
    assert 0 <= session_score(worst) < 20


def test_more_reps_or_weight_scores_higher_and_higher_rpe_lower():
    base = session_score(session(rpe=7))
    assert session_score(session(actual_reps=9, rpe=7)) > base
    assert session_score(session(actual_weight=62.5, rpe=7)) > base
    assert session_score(session(actual_reps=6, rpe=7)) < base
    assert session_score(session(rpe=8)) < base


def test_no_single_metric_dominates():
    # Perfect execution/load/volume with the worst possible RPE still scores well above 0,
    # and a terrible execution with an easy RPE still scores well below 100.
    assert session_score(session(60, 8, 3, actual_weight=75, actual_reps=10, rpe=10)) >= 60
    assert session_score(session(60, 8, 3, actual_reps=1, actual_sets=1, rpe=1)) <= 45


def test_component_weights_sum_to_one():
    c = DEFAULT_CONFIG
    assert abs(c.w_execution + c.w_load + c.w_volume + c.w_effort - 1.0) < 1e-9
    assert max(c.w_execution, c.w_load, c.w_volume, c.w_effort) <= 0.4
