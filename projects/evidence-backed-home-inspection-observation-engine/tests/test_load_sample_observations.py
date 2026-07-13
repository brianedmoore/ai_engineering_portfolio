from pathlib import Path

from app.load_sample_observations import load_sample_observations
from app.schemas import ObservationInput


def test_load_sample_observations_returns_observation_inputs():
    project_root = Path(__file__).resolve().parents[1]
    sample_file = project_root / "data" / "sample_observations.jsonl"

    observations = load_sample_observations(str(sample_file))

    assert len(observations) == 4
    assert all(isinstance(observation, ObservationInput) for observation in observations)

def test_sample_observations_include_complete_and_incomplete():
    project_root = Path(__file__).resolve().parents[1]
    sample_file = project_root / "data" / "sample_observations.jsonl"

    observations = load_sample_observations(str(sample_file))

    complete = [o for o in observations if o.is_complete]
    incomplete = [o for o in observations if not o.is_complete]

    assert len(complete) == 3
    assert len(incomplete) == 1
    assert incomplete[0].missing_information == ["At least one photo is required."]
