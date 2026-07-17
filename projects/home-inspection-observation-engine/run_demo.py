from pathlib import Path

from app.load_sample_observations import load_sample_observations
from app.observation_factory import create_basic_structured_observation


def main():
    project_root = Path(__file__).resolve().parent
    sample_file = project_root / "data" / "sample_observations.jsonl"

    observation_inputs = load_sample_observations(str(sample_file))

    for index, observation_input in enumerate(observation_inputs, start=1):
        observation = create_basic_structured_observation(
            observation_id=f"obs_{index:03}",
            observation_input=observation_input,
        )

        print(observation.model_dump_json(indent=2))
        print()


if __name__ == "__main__":
    main()
