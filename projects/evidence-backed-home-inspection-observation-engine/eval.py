import json
import os
import sys
import openai
from datetime import datetime
from dotenv import load_dotenv
from app.load_sample_observations import load_sample_observations
from app.expected_output import load_expected_outputs
from app.observation_factory import create_basic_structured_observation

load_dotenv()

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

FREE_TEXT_FIELDS_TO_JUDGE = [
    "professional_report_description",
    "plain_english_summary",
    "recommended_action"
]

def judge_free_text_field(field_name: str, expected: str, actual: str) -> dict:
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    prompt = f"""You are evaluating a home inspection report field generted by an AI model.

Field: {field_name}
Expected: {expected}
Actual: {actual}

Score the actual output 1-5 based on semantic accuracy and quality:
1 = Completely wrong or missing key information
2 = Partially correct but missing important details
3 = Mostly correct with minor differences
4 = Good, captures key information with slight variation
5 = Excellent, semantically equivalent to expected

Respond with JSON only: {{"score": <1-5>, "reason": "<one sentence>"}}
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def save_run(change_note: str, results: list, correct: int, total: int, judge_sum: float, judge_total: int):
    os.makedirs("runs", exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    run = {
        "timestamp": datetime.now().isoformat(),
        "change_note": change_note,
        "enum_score": {
            "correct": correct,
            "total": total,
            "pct": round(100 * correct / total, 1) if total > 0 else 0
        },
        "judge_score": {
            "average": round(judge_sum / judge_total, 2) if judge_total > 0 else None,
            "total_fields": judge_total
        },
        "observations": results
    }
    path = f"runs/{timestamp}_eval.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(run, f, indent=2)
    print(f"\nRun saved to {path}")


def run_eval(change_note: str = "no note"):
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

        judge_results = {}
        for field in FREE_TEXT_FIELDS_TO_JUDGE:
            actual_val = getattr(result, field, None)
            expected_val = expected.get(f"expected_{field}")
            if actual_val and expected_val:
                judge_results[field] = judge_free_text_field(field, expected_val, actual_val)

        results.append({
            "observation_id": observation_id,
            "fields": field_results,
            "judge_results": judge_results
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

    print("\n=== EVAL RESULTS (Free-Text Fields, LLM Judge) ===\n")
    judge_total = 0
    judge_sum = 0

    for r in results:
        print(f"Observation: {r['observation_id']}")
        for field, vals in r.get("judge_results", {}).items():
            print(f"  {vals['score']}/5 {field}: {vals['reason']}")
            judge_sum += vals["score"]
            judge_total += 1
        print()

    if judge_total > 0:
        print(f"Average LLM Judge Score: {judge_sum / judge_total:.1f}/5 across {judge_total} fields")

    save_run(change_note, results, correct, total, judge_sum, judge_total)

if __name__ == "__main__":
    change_note = sys.argv[1] if len(sys.argv) > 1 else "no note"
    run_eval(change_note)