"""Window-level analysis of recent sessions.

The engine looks at the most recent ``window_size`` sessions (default 5) and
gives newer sessions more influence through linearly increasing recency
weights (for 5 sessions: 1/15, 2/15, 3/15, 4/15, 5/15).

Trends are recency-weighted least-squares slopes over the session index, so a
single abnormal session shifts the trend far less than the surrounding
sessions do. Variability (standard deviation of scores) and the residual
around the fitted trend line feed the confidence calculation.
"""
from __future__ import annotations

import math
from statistics import mean

from backend.engine.config import DEFAULT_CONFIG, EngineConfig
from backend.engine.scoring import session_metrics, session_score
from backend.engine.types import HistoryAnalysis, SessionInput, TrendDirection


def recency_weights(n: int) -> list[float]:
    """Linear weights 1..n normalised to sum to 1 (oldest first)."""
    if n <= 0:
        return []
    total = n * (n + 1) / 2
    return [(i + 1) / total for i in range(n)]


def weighted_mean(values: list[float], weights: list[float]) -> float:
    return sum(v * w for v, w in zip(values, weights))


def weighted_slope(values: list[float], weights: list[float]) -> float:
    """Weighted least-squares slope of ``values`` against index 0..n-1."""
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    x_bar = weighted_mean([float(x) for x in xs], weights)
    y_bar = weighted_mean(values, weights)
    sxx = sum(w * (x - x_bar) ** 2 for x, w in zip(xs, weights))
    if sxx == 0:
        return 0.0
    sxy = sum(w * (x - x_bar) * (y - y_bar) for x, y, w in zip(xs, values, weights))
    return sxy / sxx


def _fit_residual_stddev(values: list[float], weights: list[float]) -> float:
    """Stddev of residuals around the weighted trend line (0 for < 3 points)."""
    n = len(values)
    if n < 3:
        return 0.0
    slope = weighted_slope(values, weights)
    x_bar = weighted_mean([float(i) for i in range(n)], weights)
    y_bar = weighted_mean(values, weights)
    residuals = [y - (y_bar + slope * (i - x_bar)) for i, y in enumerate(values)]
    return math.sqrt(sum(r * r for r in residuals) / n)


def _stddev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / len(values))


def analyze_history(
    sessions: list[SessionInput], config: EngineConfig = DEFAULT_CONFIG
) -> HistoryAnalysis:
    """Analyse the most recent window of sessions (input ordered oldest -> newest)."""
    window = list(sessions)[-config.window_size :]
    n = len(window)
    if n == 0:
        return HistoryAnalysis(
            session_count=0, scores=[], recent_avg_score=0.0, weighted_avg_score=0.0,
            weighted_avg_rpe=0.0, performance_trend=0.0, rpe_trend=0.0, volume_trend=0.0,
            score_stddev=0.0, trend_fit_residual=0.0, last_score=0.0,
            recent_poor_sessions=0, trend_direction=TrendDirection.STABLE,
        )

    weights = recency_weights(n)
    scores = [session_score(s, config) for s in window]
    rpes = [float(s.rpe) for s in window]
    volumes = [session_metrics(s).volume for s in window]

    performance_trend = weighted_slope(scores, weights)
    mean_volume = mean(volumes)
    volume_trend = 100.0 * weighted_slope(volumes, weights) / mean_volume if mean_volume else 0.0

    if performance_trend >= config.trend_direction_threshold:
        direction = TrendDirection.IMPROVING
    elif performance_trend <= -config.trend_direction_threshold:
        direction = TrendDirection.DECLINING
    else:
        direction = TrendDirection.STABLE

    return HistoryAnalysis(
        session_count=n,
        scores=scores,
        recent_avg_score=mean(scores),
        weighted_avg_score=weighted_mean(scores, weights),
        weighted_avg_rpe=weighted_mean(rpes, weights),
        performance_trend=performance_trend,
        rpe_trend=weighted_slope(rpes, weights),
        volume_trend=volume_trend,
        score_stddev=_stddev(scores),
        trend_fit_residual=_fit_residual_stddev(scores, weights),
        last_score=scores[-1],
        recent_poor_sessions=sum(1 for s in scores[-3:] if s < config.poor_session_score),
        trend_direction=direction,
    )
