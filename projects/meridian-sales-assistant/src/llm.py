import os

from dotenv import load_dotenv
from openai import OpenAI

from src.context import DATA_CONTEXT
from src.data_profile import build_data_profile
from src.models import QueryPlan, FinalAnswer, TraceSummary

# Development
PLANNER_MODEL = "gpt-6-sol"     
FORMATTER_MODEL = "gpt-6-luna"
JUDGE_MODEL = "gpt-6-sol"

# Demo
# PLANNER_MODEL = "gpt-6-astra"
# FORMATTER_MODEL = "gpt-6-sol"

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

def get_clarification_instruction(
    clarification_count: int,
    max_clarifications: int,
) -> str:
    if clarification_count < max_clarifications:
        return (
            "If a material ambiguity would significantly change the calculation "
            "or business meaning, ask one concise clarification question before planning."
        )

    return (
        "Do not ask another clarification question. Resolve any remaining ambiguity "
        "using the most defensible interpretation supported by the user request, "
        "business context, and dataset context. Record that interpretation explicitly "
        "as an assumption in the trust checks."
    )


def create_query_plan(
        question: str,
        clarification: str | None = None,
        clarification_count: int = 0,
        max_clarifications: int = 1,
        conversation_history: list[dict] | None = None,
    ) -> QueryPlan:

    if conversation_history is None:
        conversation_history = []

    data_profile = build_data_profile()

    clarification_instruction = get_clarification_instruction(
        clarification_count,
        max_clarifications,
    )

    
    instructions = f"""
You are a sales analytics query planner.

Your job is to convert a user's natural-language question into a structured plan
for answering it from Meridian Systems sales data.

STATIC BUSINESS CONTEXT:
{DATA_CONTEXT}

DYNAMIC DATASET CONTEXT:
{data_profile}

RULES:
- Use SQL to retrieve or aggregate data.
- You may create multiple SQL steps when needed.
- Use calculation steps only when a derived value should be calculated in Python.
- Do not perform arithmetic yourself when a calculation step can perform it.
- Do not invent fields or values.
- If required data is unavailable, reflect that in the trust checks.
- If the question is ambiguous, identify the ambiguity.
- If an assumption is required, explicitly state it.
- Step labels must be very short and understandable, ideally 2-5 words.
- SQL must be valid SQLite.
- SQL must be read-only SELECT statements.
- When calculating quota attainment, use the percentage calculation operation rather than divide.
- Do not infer the current reporting quarter from deal close dates.
- Do not assume quota exists for a period unless the dynamic dataset context shows that it exists.
- If an ambiguity would materially change the calculation or business meaning, set needs_clarification = true.
- When needs_clarification = true, provide exactly one short clarification question.
- Do not invent a business definition, threshold, or methodology when the user's wording is materially ambiguous.
- Minor assumptions that do not materially change the analysis may be surfaced in trust_checks and the plan may proceed.
- Material ambiguity should be clarified before any SQL or calculation is executed.
- If needs_clarification = true, sql_steps and calculation_steps should be empty.
- Clarification questions must not introduce arbitrary numeric thresholds or business rules that were not provided by the user or dataset context.
- SQL should perform joins, grouping, filtering, row-level comparisons, classification, and arithmetic that naturally belongs in the query.
- Do not create calculation steps for values that SQL already calculates.
- Calculation steps are only for scalar arithmetic across outputs from separate SQL steps.
- Every calculation input must use the exact format step_id.column_name.
- Calculation inputs must never contain SQL expressions, arithmetic expressions, literals, or bare column names.
- A deal is considered open only if its stage is neither 'Closed Won' nor 'Closed Lost'.
- Every SQL step must be independently executable against the actual SQLite tables described in the dataset context.
- Never reference another SQL step ID as if it were a database table. SQL steps are not materialized tables.
- Any calculation that operates across multiple rows or produces a table must be performed in SQL. Python calculation steps are only for scalar numeric calculations using single numeric outputs from SQL steps.
- Prefer one SQL query when joins, CTEs, conditional aggregation, or filtering can answer the question cleanly. Use multiple SQL queries only when separate scalar results are genuinely useful.
- Set incomplete_data = true only when data required to answer the question is actually missing from the available dataset or query results.
- Do not mark data incomplete merely because the dataset is a snapshot, has a finite date range, or may not represent future real-world changes.
- Dataset scope limitations should normally be surfaced as assumptions or caveats unless they prevent the requested calculation.
- For each SQL step, list in required_fields any returned columns whose values must be present to answer the user's question.
- Do not include supporting or descriptive columns in required_fields.
- When combining tables with different grains, avoid fanout errors.
- Never SUM a rep-level field such as quota after joining reps to multiple deal rows.
- Aggregate rep-level metrics directly from reps, or pre-aggregate deals to one row per rep before joining.
- When a follow-up refers to a previously computed metric, preserve that metric exactly unless the user explicitly asks to change it.
    - For example, if the prior analysis used maximum possible quota attainment, then a follow-up asking to rank "them" and "give me the percentage" must use maximum possible quota attainment percentage, not quota gap percentage or another related metric.
"""

    response = client.responses.parse(
        model=PLANNER_MODEL,
        # reasoning={"effort": "medium"},
        reasoning={"effort": "none"},
        temperature=0,
        instructions=instructions,
        input=f"""
        CONVERSATION HISTORY:
        {conversation_history}

        CURRENT USER QUESTION:
        {question}

        USER CLARIFICATION:
        {clarification if clarification else "None"}

        CLARIFICATION POLICY:
        {clarification_instruction}
        """,
        text_format=QueryPlan,
    )

    return response.output_parsed


def create_final_answer(
    question: str,
    plan: QueryPlan,
    execution: dict,
    confidence: str,
) -> FinalAnswer:
    calculation_results = execution["calculation_results"]

    result_context = []

    for step_id, result in execution["sql_results"].items():
        result_context.append({
            "step_id": step_id,
            "label": result["label"],
            "purpose": result["purpose"],
            "row_count": len(result["data"]),
            "data": result["data"].to_dict(orient="records"),
        })

    for step_id, result in calculation_results.items():
        result_context.append(
            {
                "step_id": step_id,
                "label": result["label"],
                "operation": result["operation"],
                "input_values": result["input_values"],
                "result": result["result"],
            }
        )

    instructions = """
You are a senior sales finance analyst.

Write the shortest possible answer that fully answers the user's question.

Rules:
- Be direct.
- High signal, no fluff.
- Use only the supplied executed results.
- Do not perform new calculations.
- Do not invent facts.
- Do not add unsupported interpretation.
- If an assumption materially affects the answer, include a short caveat.
- If no caveat is needed, return caveat as null.
- When describing an assumption, state only the specific evidence supplied in the trust checks and executed results. Do not broaden the assumption beyond those facts.
- Do not claim a time period is the only period with revenue data unless the supplied results explicitly prove that.
- Write for a senior commercial executive, not a developer.
- Translate database column names and technical field names into natural business language.
- Do not mention raw schema names such as close_date, quota_q1_2026, rep_id, or deal_value in the answer or caveat.
- Technical field names may appear only in the detailed trace, not in the executive-facing response.
- If the executed result contains multiple rows that directly answer the user's question, include every returned row unless the user explicitly asks for a subset.
- Never summarize a multi-row result as if only one row were returned.
- Preserve the ordering of rows exactly as returned by SQL when the question asks for ranking or ordering.
- Do not contradict the executed result.
- If a returned attainment value is below 100%, do not describe that rep as having reached quota or as not at risk when the SQL result defines them as at risk.
- Write all executive-facing answers and caveats in natural business language.
- Do not expose database terminology, raw field names, NULL values, schema names, or implementation details in the answer or caveat.
- Translate missing database values into business language such as "no loss reason was recorded."
- Treat revenue, deal values, pipeline values, quotas, targets, shortfalls, and other monetary amounts as US dollars.
- Format monetary values compactly in executive-facing text:
  - $1,301,000 -> $1.30M
  - $520,000 -> $520K
  - $3,500,000 -> $3.50M
- Use at most two decimal places for compact monetary values.
- Format percentages to one decimal place unless additional precision is materially useful.
- Do not apply compact formatting to IDs, counts, dates, or non-monetary values.
"""

    response = client.responses.parse(
        model=FORMATTER_MODEL,
        # reasoning={"effort": "medium"},
        reasoning={"effort": "none"},
        temperature=0,
        instructions=instructions,
        input=f"""
QUESTION:
{question}

CONFIDENCE:
{confidence}

TRUST CHECKS:
{plan.trust_checks.model_dump_json(indent=2)}

EXECUTED RESULTS:
{result_context}
""",
        text_format=FinalAnswer,
    )

    return response.output_parsed


def create_trace_summary(
    question: str,
    execution: dict,
) -> TraceSummary:

    result_context = []

    for step_id, result in execution["sql_results"].items():
        result_context.append({
            "step_id": step_id,
            "label": result["label"],
            "row_count": len(result["data"]),
            "data": result["data"].to_dict(orient="records"),
        })

    for step_id, result in execution["calculation_results"].items():
        result_context.append({
            "step_id": step_id,
            "label": result["label"],
            "purpose": result["purpose"],
            "sql": result["sql"],
            "row_count": len(result["data"]),
            "data": result["data"].to_dict(orient="records"),
        })

    response = client.responses.parse(
        model=FORMATTER_MODEL,
        instructions="""
You are translating an executed analytics trace into a short,
business-readable explanation of how the answer was derived.

Do not simply restate the final answer.

Explain the derivation in chronological steps:

1. Identify the source fields used from the dataset, translating raw column
   names into plain-English business names.
2. Describe the filters, joins, date restrictions, aggregations, or other
   transformations that were applied.
3. State the specific values retrieved from the data.
4. State the exact calculation or comparison performed.
5. State the resulting metric or conclusion.

Rules:
- Use only the supplied executed evidence.
- Do not perform new calculations.
- Do not introduce new facts.
- Do not change any numeric values.
- Translate schema names into business language.
  Examples:
  - deal_value -> Deal Value
  - stage -> Deal Stage
  - quota_q1_2026 -> Q1 2026 Quota
  - close_date -> Expected Close Date
  - rep_name -> Rep Name
- Do not expose raw schema names unless necessary.
- Clearly describe important transformations such as:
  - filtering to Closed Won deals
  - filtering to a segment
  - limiting records to a date range
  - summing values
  - grouping by rep, segment, region, or product
  - joining deals to reps
- Format money naturally, such as $2.05M or $520K.
- Format percentages to one decimal place unless more precision is necessary.
- Keep the explanation to 3 to 5 concise steps.
""",
        input=f"""
USER QUESTION:
{question}

EXECUTED EVIDENCE:
{result_context}
""",
        text_format=TraceSummary,
    )

    return response.output_parsed