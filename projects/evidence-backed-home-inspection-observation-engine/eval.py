import json
from app.load_sample_observations import load_sample_observations
from app.expected_output import load_expected_outputs
from app.observation_factory import create_basic_structured_observation

# Enum fields only — these have exact expected values and can be scored with a direct string match.
# TODO: Add free-text field evaluation using an LLM judge (title, component, defect_type,
#       professional_report_description, plain_english_summary, recommended_action)
# TODO: Add semantic similarity scoring (e.g. embedding cosine similarity) as an alternative metric
ENUM_FIELDS_TO_COMPARE = [
    "system",
    "severity",
    "safety_related",
    "responsible_professional",
    "estimated_cost_range",
]

def run_eval():
    observations = load_sample_observations("data/sample_observations.jsonl")
    expected_outputs = load_expected_outputs("data/expected_outputs.jsonl")

    expected_by_id = {e["observation_id"]: e for e in expected_outputs}

    results = []

    for i, obs_input in enumerate(observations):
        observation_id = f"obs_{i+1:03}"
        if not obs_input.is_complete:
            print(f"Observation: {observation_id} — SKIPPED (incomplete input: {obs_input.missing_information})")
            continue
        result = create_basic_structured_observation(observation_id, obs_input)
        expected = expected_by_id.get(observation_id, {})

        field_results = {}
        for field in ENUM_FIELDS_TO_COMPARE:
            actual = getattr(result, field, None)
            if actual is not None:
                actual = actual.value if hasattr(actual, "value") else actual
            expected_val = expected.get(f"expected_{field}")
            field_results[field] = {
                "actual": actual,
                "expected": expected_val,
                "match": str(actual).lower() == str(expected_val).lower()
            }

        results.append({
            "observation_id": observation_id,
            "fields": field_results
        })

    print("\n=== EVAL RESULTS (Enum Fields)===\n")
    total = 0
    correct = 0

    for r in results:
        print(f"Observation: {r['observation_id']}")
        for field, vals in r["fields"].items():
            status = "PASS" if vals["match"] else "FAIL"
            print(f"  {status} {field}: expected={vals['expected']}  actual={vals['actual']}")
            total += 1
            if vals["match"]:
                correct += 1
        print()

    print(f"Score: {correct}/{total} fields correct ({100 * correct // total}%)")

if __name__ == "__main__":
    run_eval()