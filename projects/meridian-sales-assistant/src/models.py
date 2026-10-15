from typing import Literal

from pydantic import BaseModel


class TrustChecks(BaseModel):
    ambiguous: bool
    ambiguity_reason: str | None = None

    incomplete_data: bool
    incomplete_reason: str | None = None

    assumption_used: bool
    assumption_reason: str | None = None


class SQLStep(BaseModel):
    id: str
    label: str
    purpose: str
    sql: str
    required_fields: list[str] = []


class CalculationStep(BaseModel):
    id: str
    label: str
    purpose: str
    operation: Literal[
        "sum",
        "subtract",
        "divide",
        "percentage",
        "difference",
        "ratio",
    ]
    inputs: list[str]


class QueryPlan(BaseModel):
    answerable: bool

    needs_clarification: bool
    clarification_question: str | None = None

    answerability_reason: str

    sql_steps: list[SQLStep]
    calculation_steps: list[CalculationStep]

    trust_checks: TrustChecks


class FinalAnswer(BaseModel):
    answer: str
    caveat: str | None = None


class TraceSummary(BaseModel):
    steps: list[str]