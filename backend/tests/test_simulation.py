"""Closed-loop behaviour tests.

Each scenario in ``scripts/simulate.py`` runs the engine against a model
athlete with the plan following the engine's own prescriptions. The
acceptance criteria there guard the tuned ``EngineConfig`` defaults.
Run ``python scripts/simulate.py <name>`` to see the per-session table.
"""
import pytest

from scripts.simulate import SCENARIOS


@pytest.mark.parametrize("name", sorted(SCENARIOS))
def test_scenario(name):
    steps, checks = SCENARIOS[name]()
    failed = [label for label, ok in checks.items() if not ok]
    assert not failed, f"{name}: failed checks {failed}"


def test_simulation_is_deterministic():
    a = SCENARIOS["noisy"]()[0]
    b = SCENARIOS["noisy"]()[0]
    assert [(s.decision, s.next_plan) for s in a] == [(s.decision, s.next_plan) for s in b]
