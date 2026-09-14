import pytest

from backend.engine.analysis import analyze_history, recency_weights, weighted_slope
from backend.engine.types import TrendDirection
from backend.tests.conftest import session


def test_recency_weights_sum_to_one_and_increase():
    for n in range(1, 7):
        w = recency_weights(n)
        assert len(w) == n
        assert abs(sum(w) - 1.0) < 1e-9
        assert all(w[i] < w[i + 1] for i in range(n - 1))


def test_weighted_slope_signs():
    assert weighted_slope([10, 20, 30], recency_weights(3)) == pytest.approx(10)
    assert weighted_slope([30, 20, 10], recency_weights(3)) == pytest.approx(-10)
    assert weighted_slope([20, 20, 20], recency_weights(3)) == pytest.approx(0)
    assert weighted_slope([20], recency_weights(1)) == 0


def test_window_truncates_to_last_five():
    sessions = [session(rpe=10)] * 10 + [session(rpe=6)] * 5
    a = analyze_history(sessions)
    assert a.session_count == 5
    assert all(s == 73.5 for s in a.scores)


def test_trend_direction_and_stats():
    improving = [session(actual_weight=w, rpe=r) for w, r in [(60, 8), (62.5, 8), (65, 7), (67.5, 7), (70, 6)]]
    a = analyze_history(improving)
    assert a.trend_direction == TrendDirection.IMPROVING
    assert a.performance_trend > 0
    assert a.rpe_trend < 0
    assert a.volume_trend > 0
    assert a.weighted_avg_score > a.recent_avg_score  # newer sessions are better and weigh more
    assert a.last_score == a.scores[-1]

    declining = list(reversed(improving))
    d = analyze_history(declining)
    assert d.trend_direction == TrendDirection.DECLINING
    assert d.performance_trend < 0

    stable = [session(rpe=7)] * 5
    s = analyze_history(stable)
    assert s.trend_direction == TrendDirection.STABLE
    assert s.score_stddev == 0
    assert s.trend_fit_residual == 0
    assert s.recent_poor_sessions == 0


def test_recent_poor_sessions_counts_last_three_only():
    sessions = [session(actual_reps=3, rpe=10)] * 2 + [session(rpe=7)] * 2 + [session(actual_reps=3, rpe=10)]
    assert analyze_history(sessions).recent_poor_sessions == 1


def test_empty_history():
    a = analyze_history([])
    assert a.session_count == 0
    assert a.performance_trend == 0
    assert a.trend_direction == TrendDirection.STABLE
