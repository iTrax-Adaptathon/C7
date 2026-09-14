"""End-to-end API tests on a temporary SQLite database (never touches fitness.db)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from backend import crud, models  # noqa: F401
from backend.database import Base, get_db, make_engine
from backend.main import app


@pytest.fixture
def client(tmp_path):
    engine = make_engine(f"sqlite:///{(tmp_path / 'test.db').as_posix()}")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with TestingSession() as db:
        crud.create_exercise(db, "Barbell Squat", "Legs")
        crud.create_exercise(db, "Bench Press", "Chest")
        db.commit()

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    engine.dispose()


def body(exercise_id=1, weight=60.0, reps=8, sets=3, actual_weight=None, actual_reps=None, rpe=7, **extra):
    payload = {
        "exerciseId": exercise_id,
        "plannedWeight": weight,
        "plannedReps": reps,
        "plannedSets": sets,
        "actualWeight": weight if actual_weight is None else actual_weight,
        "actualReps": reps if actual_reps is None else actual_reps,
        "actualSets": sets,
        "rpe": rpe,
    }
    payload.update(extra)
    return payload


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_list_exercises_is_camel_case(client):
    data = client.get("/exercises").json()
    assert data == [
        {"id": 1, "name": "Barbell Squat", "muscleGroup": "Legs"},
        {"id": 2, "name": "Bench Press", "muscleGroup": "Chest"},
    ]


def test_post_log_returns_recommendation_structure(client):
    r = client.post("/logs", json=body())
    assert r.status_code == 201, r.text
    data = r.json()
    expected_base = {
        "exerciseId", "logId", "decision", "previous", "next", "confidence",
        "trendDirection", "reasoning", "explanation",
    }
    assert expected_base.issubset(set(data))

    assert data["exerciseId"] == 1
    assert data["decision"] == "HOLD"  # first session: insufficient history
    assert data["confidence"] <= 35
    assert data["previous"] == {"weight": 60.0, "reps": 8, "sets": 3}
    assert data["next"] == {"weight": 60.0, "reps": 8, "sets": 3}
    assert data["reasoning"]["sessionCount"] == 1
    assert set(data["reasoning"]) == {
        "sessionCount", "sessionScore", "recentScore", "weightedScore", "performanceTrend",
        "rpeTrend", "volumeTrend", "consistency", "signalStrength",
    }


def test_snake_case_body_is_rejected(client):
    payload = {
        "exercise_id": 1, "planned_weight": 60, "planned_reps": 8, "planned_sets": 3,
        "actual_weight": 60, "actual_reps": 8, "actual_sets": 3, "rpe": 7,
    }
    assert client.post("/logs", json=payload).status_code == 422


def test_validation_errors(client):
    assert client.post("/logs", json=body(rpe=11)).status_code == 422
    assert client.post("/logs", json=body(rpe=0)).status_code == 422
    assert client.post("/logs", json=body(weight=0)).status_code == 422
    assert client.post("/logs", json=body(reps=0)).status_code == 422
    assert client.post("/logs", json=body(unknownField=1)).status_code == 422


def test_unknown_exercise_is_404(client):
    assert client.post("/logs", json=body(exercise_id=99)).status_code == 404
    assert client.get("/logs/99").status_code == 404
    assert client.get("/state/99").status_code == 404
    assert client.get("/adaptations/99").status_code == 404


def test_state_404_before_any_log(client):
    r = client.get("/state/1")
    assert r.status_code == 404
    assert "log a workout" in r.json()["detail"]


def test_full_flow_progress_and_history(client):
    sessions = [
        body(rpe=8),
        body(actual_weight=62.5, rpe=8),
        body(actual_weight=65, rpe=7),
        body(actual_weight=65, actual_reps=9, rpe=7),
        body(actual_weight=67.5, actual_reps=9, rpe=6),
    ]
    last = None
    for s in sessions:
        last = client.post("/logs", json=s).json()
    assert last["decision"] == "PROGRESS"
    assert last["trendDirection"] == "IMPROVING"
    assert last["next"]["weight"] > 60
    assert last["reasoning"]["sessionCount"] == 5

    history = client.get("/logs/1").json()
    assert history["exerciseId"] == 1 and history["exerciseName"] == "Barbell Squat"
    assert len(history["logs"]) == 5
    log = history["logs"][-1]
    assert log["volume"] == 67.5 * 9 * 3
    assert log["sessionScore"] > history["logs"][0]["sessionScore"]
    assert "loggedAt" in log and "plannedWeight" in log and "actualWeight" in log
    # oldest -> newest
    assert [l["actualWeight"] for l in history["logs"]] == [60, 62.5, 65, 65, 67.5]
    assert len(client.get("/logs/1?limit=2").json()["logs"]) == 2

    state = client.get("/state/1").json()
    assert state["decision"] == "PROGRESS"
    assert state["current"] == last["next"]
    assert state["exerciseName"] == "Barbell Squat"
    assert state["explanation"] == last["explanation"]

    adaptations = client.get("/adaptations/1").json()
    assert len(adaptations) == 5  # one per log
    newest = adaptations[0]
    assert newest["logId" if "logId" in newest else "workoutLogId"] == last["logId"]
    assert newest["decision"] == "PROGRESS"
    assert newest["previous"] == last["previous"] and newest["next"] == last["next"]


def test_summary_lists_all_exercises_with_state_and_is_not_shadowed(client):
    assert client.get("/state/summary").json() == []
    client.post("/logs", json=body(exercise_id=1))
    client.post("/logs", json=body(exercise_id=2, weight=80, reps=5))
    summary = client.get("/state/summary").json()
    assert [s["exerciseId"] for s in summary] == [1, 2]
    assert summary[1]["current"] == {"weight": 80.0, "reps": 5, "sets": 3}
    assert summary[0]["muscleGroup"] == "Legs"


def test_logged_at_can_be_supplied(client):
    r = client.post("/logs", json=body(loggedAt="2026-08-01T10:00:00"))
    assert r.status_code == 201
    assert client.get("/logs/1").json()["logs"][0]["loggedAt"].startswith("2026-08-01T10:00:00")


def test_cors_preflight(client):
    r = client.options(
        "/logs",
        headers={
            "Origin": "https://example.lovable.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] in ("*", "https://example.lovable.app")
