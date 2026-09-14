"""Shared fixtures and helpers for engine and API tests."""
from __future__ import annotations

import pytest

from backend.engine.types import SessionInput


def session(
    planned_weight: float = 60,
    planned_reps: int = 8,
    planned_sets: int = 3,
    actual_weight: float | None = None,
    actual_reps: int | None = None,
    actual_sets: int | None = None,
    rpe: int = 7,
) -> SessionInput:
    """Build a session; actual values default to the planned values."""
    return SessionInput(
        planned_weight=planned_weight,
        planned_reps=planned_reps,
        planned_sets=planned_sets,
        actual_weight=planned_weight if actual_weight is None else actual_weight,
        actual_reps=planned_reps if actual_reps is None else actual_reps,
        actual_sets=planned_sets if actual_sets is None else actual_sets,
        rpe=rpe,
    )


@pytest.fixture
def make_session():
    return session
