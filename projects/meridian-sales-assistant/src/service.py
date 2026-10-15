# src/service.py

from src.llm import create_query_plan, create_final_answer
from src.executor import execute_plan, determine_confidence


def run_question(
    question: str,
    conversation_history: list[dict] | None = None,
    clarification: str | None = None,
    clarification_count: int = 0,
    max_clarifications: int = 1,
) -> dict:

    if conversation_history is None:
        conversation_history = []

    plan = create_query_plan(
        question=question,
        clarification=clarification,
        clarification_count=clarification_count,
        max_clarifications=max_clarifications,
        conversation_history=conversation_history,
    )

    # Clarification required
    if plan.needs_clarification:
        return {
            "status": "clarification",
            "question": question,
            "clarification_question": plan.clarification_question,
            "plan": plan,
            "answer": None,
            "caveat": None,
            "confidence": None,
            "execution": None,
        }

    # Cannot answer at planning stage
    if not plan.answerable:
        return {
            "status": "insufficient_data",
            "question": question,
            "clarification_question": None,
            "plan": plan,
            "answer": plan.answerability_reason,
            "caveat": None,
            "confidence": "Insufficient Data",
            "execution": None,
        }

    execution = execute_plan(plan)

    confidence = determine_confidence(
        plan,
        execution,
    )

    final_answer = create_final_answer(
        question=question,
        plan=plan,
        execution=execution,
        confidence=confidence,
    )

    return {
        "status": "answered",
        "question": question,
        "clarification_question": None,
        "plan": plan,
        "answer": final_answer.answer,
        "caveat": final_answer.caveat,
        "confidence": confidence,
        "execution": execution,
    }