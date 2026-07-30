import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import create_engine, Session, SQLModel
from app.api import app
from app.database import get_session

_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

def get_test_session():
    with Session(_engine) as session:
        yield session

app.dependency_overrides[get_session] = get_test_session

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(_engine)
    yield
    SQLModel.metadata.drop_all(_engine)

@pytest.fixture
def engine():
    return _engine
