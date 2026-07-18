import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import create_engine, Session, SQLModel
from unittest.mock import patch
from app.api import app
from app.database import get_session

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

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)

client = TestClient(app)


def test_create_observation_with_text_and_photo():
    with patch("app.api.create_basic_structured_observation") as mock_factory, \
         patch("app.api.analyze_image") as mock_analyze:
        from app.schemas import StructuredObservation, ObservationStatus
        mock_factory.return_value = StructuredObservation(
            observation_id="test_001",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        mock_analyze.return_value = "Visible water stain on cabinet floor"

        response = client.post(
            "/observations?observation_id=test_001",
            data={"text_descriptien sink"},
            files={"photos": ("photo.jpg", b"fake image bytes", "image/jpeg")}
        )
    assert response.status_code == 200
    assert response.json()["observation_id"] == "test_001"
    assert response.json()["status"] == "Ready for Review"


def test_create_observation_returns_500_on_factory_error():
    with patch("app.api.create_basic_structured_observation") as mock_factory, \
         patch("app.api.analyze_image") as mock_analyze:
        mock_analyze.return_value = "Some description"
        mock_factory.side_effect = Exception("LLM call failed")

        response = client.post(
            "/observations?observation_id=test_002",
            data={"text_description": "Active leak under kitchen sink"},
            files={"photos": ("photo.jpg", b"fake image bytes", "image/jpeg")}
        )
    assert response.status_code == 500