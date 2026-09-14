from backend.engine import evaluate
from backend.engine.explanation import explain
from backend.engine.types import Decision, Prescription
from backend.tests.conftest import session
from backend.tests.test_decision import declining, improving

BASE = Prescription(60, 8, 3)


def test_progress_explanation_mentions_facts():
    r = evaluate(improving(), BASE)
    text = explain(r.decision, r.reasoning)
    assert r.decision == Decision.PROGRESS
    assert "5" in text and "sessions" in text
    assert "improv" in text.lower()
    assert str(r.confidence) in text
    assert "60" in text and f"{r.next.weight:g}" in text


def test_back_off_explanation_mentions_facts():
    r = evaluate(declining(), BASE)
    text = explain(r.decision, r.reasoning)
    assert "declin" in text.lower()
    assert "single" in text.lower()
    assert f"{r.next.weight:g}" in text


def test_hold_explanation_for_stable_and_insufficient_history():
    stable = evaluate([session(rpe=7)] * 5, BASE)
    assert "stable" in explain(stable.decision, stable.reasoning).lower()
    short = evaluate([session(rpe=7)] * 2, BASE)
    text = explain(short.decision, short.reasoning)
    assert "2" in text and "more" in text.lower()


def test_result_carries_explanation():
    r = evaluate(improving(), BASE)
    assert r.explanation == explain(r.decision, r.reasoning)
