from fastapi.testclient import TestClient
from sqlmodel import Session
from app.api import app
from app.schemas import StructuredObservation, ObservationStatus, RejectionReason

client = TestClient(app)

# APPROVAL

def test_approve_sets_status_and_clears_review_flag(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_001",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_001/approve")
    assert response.status_code == 200
    assert response.json()["status"] == "Approved"
    assert response.json()["needs_human_review"] == False


def test_approve_returns_400_if_not_ready_for_review(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_002",
            status=ObservationStatus.APPROVED,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_002/approve")
    assert response.status_code == 400


# REJECT

def test_reject_sets_status_and_clears_review_flag(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_003",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_003/reject?reason=bad_photo")
    assert response.status_code == 200
    assert response.json()["status"] == "Rejected"
    assert response.json()["needs_human_review"] == False


def test_reject_returns_400_if_not_ready_for_review(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_004",
            status=ObservationStatus.REJECTED,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_004/reject?reason=bad_photo")
    assert response.status_code == 400


def test_get_observation_not_found():
    response = client.get("/observations/does_not_exist")
    assert response.status_code == 404


def test_get_observation_by_id_returns_observation(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_005",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.get("/observations/test_005")
    assert response.status_code == 200
    assert response.json()["observation_id"] == "test_005"


def test_get_all_observations_returns_empty_list():
    response = client.get("/observations")
    assert response.status_code == 200
    assert response.json() == []


def test_get_all_observations_returns_list(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_006",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.get("/observations")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["observation_id"] == "test_006"


def test_reject_persists_reason_and_notes(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_007",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_007/reject?reason=bad_photo&notes=blurry image")
    assert response.status_code == 200
    assert response.json()["rejection_reason"] == "bad_photo"
    assert response.json()["rejection_notes"] == "blurry image"
    assert response.json()["reviewed_at"] is not None


def test_reject_other_requires_notes(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_008",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_008/reject?reason=other")
    assert response.status_code == 422

def test_reject_other_with_notes_succeeds(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_009",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_009/reject?reason=other&notes=does not match prior inspection")
    assert response.status_code == 200
    assert response.json()["rejection_reason"] == "other"
    assert response.json()["rejection_notes"] == "does not match prior inspection"


# PATCH

def test_patch_edit_approves_observation(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_010",
            status=ObservationStatus.READY_FOR_REVIEW,
            severity="High",
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.patch("/observations/test_010", json={"severity": "Low", "component": "Roof"})
    assert response.status_code == 200
    assert response.json()["status"] == "Approved"
    assert response.json()["severity"] == "Low"
    assert response.json()["component"] == "Roof"
    assert response.json()["reviewed_at"] is not None


def test_patch_does_not_overwrite_unprovided_fields(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_011",
            status=ObservationStatus.READY_FOR_REVIEW,
            severity="High",
            title="Original title",
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.patch("/observations/test_011", json={"severity": "Low"})
    assert response.status_code == 200
    assert response.json()["severity"] == "Low"
    assert response.json()["title"] == "Original title"


def test_patch_returns_400_if_not_ready_for_review(engine):
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_012",
            status=ObservationStatus.APPROVED,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.patch("/observations/test_012", json={"severity": "Low"})
    assert response.status_code == 400