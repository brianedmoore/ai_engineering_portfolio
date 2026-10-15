from pydantic import BaseModel
import traceback

from src.llm import client
from src.service import run_question

class EvalScore(BaseModel):
    score: int
    correctness: int
    trust_handling: int
    instruction_following: int
    explanation: str
    passed: bool


class SimulatedClarification(BaseModel):
    response: str


def generate_clarification_response(
    original_question: str,
    clarification_question: str,
    expected_handling: str,
    expected_invariant: str,
) -> str:

    response = client.responses.parse(
        model="gpt-5.1",
        instructions="""
You are simulating a reasonable business user.

Answer the assistant's clarification question concisely.

Use the supplied expected handling as the intended user preference.
Do not introduce unrelated requirements.
Do not introduce an interpretation that would contradict the expected invariant.
""",
        input=f"""
        ORIGINAL QUESTION:
        {original_question}

        ASSISTANT CLARIFICATION:
        {clarification_question}

        EXPECTED TEST HANDLING:
        {expected_handling}

        EXPECTED INVARIANT:
        {expected_invariant}
        """,
        text_format=SimulatedClarification,
    )

    return response.output_parsed.response


def judge_answer(
    question: str,
    expected_behavior: str,
    expected_confidence: str,
    expected_invariant: str,
    expected_clarification: str,
    actual_result: dict,
) -> EvalScore:

    actual_plan = actual_result["plan"]

    actual_context = {
        "status": actual_result["status"],
        "answer": actual_result["answer"],
        "caveat": actual_result["caveat"],
        "confidence": actual_result["confidence"],
        "clarification_question": actual_result["clarification_question"],
        "trust_checks": actual_plan.trust_checks.model_dump(),
    }

    response = client.responses.parse(
        model="gpt-5.1",
        instructions="""
You are evaluating a sales analytics AI system.

Score whether the system handled the test case correctly.

Evaluate:
1. Did it answer or clarify when appropriate?
2. Is the answer consistent with the expected invariant?
3. Did it avoid unsupported claims?
4. Did it expose material assumptions or missing data appropriately?
5. Is the confidence level appropriate?

Scoring:
5 = fully correct
4 = correct with minor presentation issue
3 = partially correct but meaningful issue
2 = major issue
1 = mostly wrong
0 = completely wrong or unsafe

Do not reward verbosity.
Do not penalize wording differences when the semantics are correct.
If the expected invariant contains specific numbers, percentages, rankings, or named results, compare them explicitly to the actual answer.

A materially different metric does not count as correct even if the ordering is similar. For example, quota attainment percentage and quota gap percentage are different metrics.

If any required numeric invariant is materially wrong, the case cannot receive a score of 5.
""",
        input=f"""
QUESTION:
{question}

EXPECTED BEHAVIOR:
{expected_behavior}

EXPECTED CONFIDENCE:
{expected_confidence}

EXPECTED CLARIFICATION:
{expected_clarification}

EXPECTED INVARIANT / ANSWER:
{expected_invariant}

ACTUAL RESULT:
{actual_context}
""",
        text_format=EvalScore,
    )

    return response.output_parsed


def deterministic_checks(
    row,
    result: dict,
) -> dict:

    expected_clarification = (
        str(row["Clarification?"]).strip().lower() == "yes"
    )

    actual_clarification = (
        result["status"] == "clarification"
    )

    clarification_correct = (
        expected_clarification == actual_clarification
    )

    expected_confidence = str(
        row["Expected Confidence"]
    ).strip()

    if expected_confidence in {
        "High",
        "Medium",
        "Low",
        "Insufficient Data",
    }:
        confidence_correct = (
            result["confidence"] == expected_confidence
        )
    else:
        confidence_correct = True

    return {
        "clarification_correct": clarification_correct,
        "confidence_correct": confidence_correct,
        "no_crash": True,
    }


def run_eval_case(row) -> dict:
    question = row["Question"]

    try:
        conversation_history = []

        if row.get("Conversation Context"):
            conversation_history = [
                {
                    "role": "system",
                    "content": str(row["Conversation Context"]),
                }
            ]

        first_result = run_question(
            question=question,
            conversation_history=conversation_history,
            clarification_count=0,
            max_clarifications=1,
        )

        clarification_response = None
        final_result = first_result

        if first_result["status"] == "clarification":
            clarification_response = generate_clarification_response(
                original_question=question,
                clarification_question=first_result["clarification_question"],
                expected_handling=row["Expected Clarification / Handling"],
                expected_invariant=row["Key Expected Invariant / Answer"],
            )

            conversation_history = [
                {
                    "role": "user",
                    "content": question,
                },
                {
                    "role": "assistant",
                    "content": first_result["clarification_question"],
                },
            ]

            final_result = run_question(
                question=clarification_response,
                conversation_history=conversation_history,
                clarification=clarification_response,
                clarification_count=1,
                max_clarifications=1,
            )

        expected_clarification = (
            str(row["Clarification?"]).strip().lower() == "yes"
        )

        result_to_judge = (
            first_result
            if expected_clarification
            else final_result
        )

        deterministic = deterministic_checks(
            row,
            result_to_judge,
        )

        judge = judge_answer(
            question=question,
            expected_behavior=row["Expected Behavior"],
            expected_confidence=row["Expected Confidence"],
            expected_invariant=row["Key Expected Invariant / Answer"],
            expected_clarification=row["Expected Clarification / Handling"],
            actual_result=result_to_judge,
        )

        return {
            "eval_id": row["Eval ID"],
            "question": question,
            "clarification_response": clarification_response,
            "first_clarification_question": first_result["clarification_question"],
            "status": final_result["status"],
            "answer": final_result["answer"],
            "caveat": final_result["caveat"],
            "confidence": final_result["confidence"],
            "sql_steps": (
                [step.sql for step in final_result["plan"].sql_steps]
                if final_result["plan"] is not None
                else []
            ),

            "sql_results": (
                {
                    step_id: result["data"].to_dict(orient="records")
                    for step_id, result
                    in final_result["execution"]["sql_results"].items()
                }
                if final_result["execution"] is not None
                else {}
            ),
            "clarification_correct": deterministic["clarification_correct"],
            "confidence_correct": deterministic["confidence_correct"],
            "llm_score": judge.score,
            "correctness_score": judge.correctness,
            "trust_score": judge.trust_handling,
            "instruction_score": judge.instruction_following,
            "passed": judge.passed,
            "judge_explanation": judge.explanation,
            "error": None,
        }

    except Exception as e:
        return {
            "eval_id": row["Eval ID"],
            "question": question,
            "clarification_response": None,
            "status": "error",
            "answer": None,
            "caveat": None,
            "confidence": None,
            "clarification_correct": False,
            "confidence_correct": False,
            "llm_score": 0,
            "correctness_score": 0,
            "trust_score": 0,
            "instruction_score": 0,
            "passed": False,
            "judge_explanation": "Runtime failure.",
            # "error": str(e),
            "error": traceback.format_exc(),
        }