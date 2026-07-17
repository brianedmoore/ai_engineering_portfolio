import json
from pathlib import Path
from typing import List


def load_expected_outputs(file_path: str) -> List[dict]:
    expected_outputs = []

    path = Path(file_path)

    with path.open("r", encoding="utf-8") as file:
        for line in file:
            if line.strip():
                expected_outputs.append(json.loads(line))

    return expected_outputs
