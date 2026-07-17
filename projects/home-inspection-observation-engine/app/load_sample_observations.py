import json
from pathlib import Path
from typing import List

from app.schemas import ObservationInput


def load_sample_observations(file_path: str) -> List[ObservationInput]:
    observations = []

    path = Path(file_path)

    with path.open("r", encoding="utf-8") as file:
        for line in file:
            if line.strip():
                raw_observation = json.loads(line)
                observations.append(ObservationInput(**raw_observation))

    return observations
