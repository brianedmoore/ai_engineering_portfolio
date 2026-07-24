import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import create_engine, Session, SQLModel
from unittest.mock import patch
from app.api import app
from app.database import get_session
from app.schemas import StructuredObservation, ObservationStatus

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
            data={"text_description": "Active leak under kitchen sink"},
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


def test_get_observations_filtered_by_status():
    with Session(engine) as session:
        obs1 = StructuredObservation(
            observation_id="test_003",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        obs2 = StructuredObservation(
            observation_id="test_004",
            status=ObservationStatus.APPROVED,
            confidence=0.9
        )
        session.add(obs1)
        session.add(obs2)
        session.commit()

    response = client.get("/observations?status=Ready+for+Review")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["observation_id"] == "test_003"


def test_create_observation_saves_photo_to_db():
    with patch("app.api.create_basic_structured_observation") as mock_factory, \
         patch("app.api.analyze_image") as mock_analyze:
        mock_factory.return_value = StructuredObservation(
            observation_id="test_photo_001",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        mock_analyze.return_value = "Visible water stain"

        response = client.post(
            "/observations?observation_id=test_photo_001",
            data={"text_description": "Active leak under kitchen sink"},
            files={"photos": ("photo.jpg", b"fake image bytes", "image/jpeg")}
        )

        assert response.status_code == 200
        assert response.json()["photo_ids"] == [1]

        with Session(engine) as session:
            from app.schemas import Photo
            photo = session.get(Photo, 1)
            assert photo is not None
            assert photo.observation_id == "test_photo_001"
            assert photo.filename == "photo.jpg"
            assert photo.data == b"fake image bytes"


def test_get_observation_photo_returns_image():
    from app.schemas import Photo
    with Session(engine) as session:
        photo = Photo(
            observation_id="test_photo_002",
            filename="photo.jpg",
            content_type="image/jpeg",
            data=b"fake image bytes"
        )
        session.add(photo)
        session.commit()
        session.refresh(photo)
        photo_id = photo.id

    response = client.get(f"/observations/test_photo_002/photos/{photo_id}")
    assert response.status_code == 200
    assert response.content == b"fake image bytes"
    assert response.headers["content-type"] == "image/jpeg"


def test_get_observation_photo_returns_404_for_wrong_observation():
    from app.schemas import Photo
    with Session(engine) as session:
        photo = Photo(
            observation_id="test_photo_003",
            filename="photo.jpeg",
            content_type="image/jpeg",
            data=b"fake image bytes"
        )
        session.add(photo)
        session.commit()
        session.refresh(photo)
        photo_id = photo.id

    response = client.get(f"/observations/wrong_observation/photos/{photo_id}")
    assert response.status_code == 404


def test_delete_observation_removes_observation_and_photos():
    from app.schemas import Photo
    with Session(engine) as session:
        obs = StructuredObservation(
            observation_id="test_delete_001",
            status=ObservationStatus.READY_FOR_REVIEW,
            confidence=0.9
        )
        session.add(obs)
        photo = Photo(
            observation_id="test_delete_001",
            filename="photo.jpg",
            content_type="image/jpeg",
            data=b"fake image bytes"
        )
        session.add(photo)
        session.commit()

    response = client.delete("/observations/test_delete_001")
    assert response.status_code == 204

    with Session(engine) as session:
        assert session.get(StructuredObservation, "test_delete_001") is None
        from app.schemas import Photo
        from sqlmodel import select
        photos = session.exec(select(Photo).where(Photo.observation_id == "test_delete_001")).all()
        assert photos == []


def test_delete_observation_returns_404_if_not_found():
    response = client.delete("/observations/does_not_exist")
    assert response.status_code == 404 
