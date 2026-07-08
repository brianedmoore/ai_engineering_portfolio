from pathlib import Path

from app.load_sample_observations import load_sample_observations
from app.schemas import ObservationInput


def test_load_sample_observations_returns_observation_inputs():
    project_root = Path(__file__).resolve().parents[1]
    sample_file = project_root / "data" / "sample_observations.jsonl"

    observations = load_sample_observations(str(sample_file))

    assert len(observations) == 3
    assert all(isinstance(observation, ObservationInput) for observation in observations)
