import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import create_engine, Session, SQLModel
from app.api import app
from app.database import get_session
from app.schemas import StructuredObservation, ObservationStatus


TEST_DATABASE_URL = "sqlite://"
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

def get_test_session():
    with Session(engine) as session:
        yield session

app.dependency_overrides[get_session] = get_test_session

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)

client = TestClient(app)

# APPROVAL

def test_approve_sets_status_and_clears_review_flag():
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


def test_approve_returns_400_if_not_ready_for_review():
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

def test_reject_sets_status_and_clears_review_flag():
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_003",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_003/reject")
    assert response.status_code == 200
    assert response.json()["status"] == "Rejected"
    assert response.json()["needs_human_review"] == False


def test_reject_returns_400_if_not_ready_for_review():
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_004",
            status=ObservationStatus.REJECTED,
            confidence=0.9
        )
        session.add(obs)
        session.commit()

    response = client.post("/observations/test_004/reject")
    assert response.status_code == 400


def test_get_observation_not_found():
    response = client.get("/observations/does_not_exist")
    assert response.status_code == 404


def test_get_observation_by_id_returns_observation():
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