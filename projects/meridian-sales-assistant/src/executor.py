import pandas as pd

from src.database import execute_query
from src.models import QueryPlan
from src.calculations import execute_operation

def validate_required_fields(
    plan: QueryPlan,
    sql_results: dict,
) -> list[str]:
    issues = []

    for step in plan.sql_steps:
        if not step.required_fields:
            continue

        result = sql_results[step.id]["data"]

        if result.empty:
            issues.append(
                f"{step.label}: query returned no rows."
            )
            continue

        for field in step.required_fields:
            if field not in result.columns:
                issues.append(
                    f"{step.label}: required field '{field}' was not returned."
                )
                continue

            if result[field].isna().all():
                issues.append(
                    f"{step.label}: required field '{field}' is missing."
                )

    return issues

def execute_sql_steps(plan: QueryPlan) -> dict:
    results = {}

    for step in plan.sql_steps:
        result = execute_query(step.sql)

        results[step.id] = {
            "label": step.label,
            "purpose": step.purpose,
            "sql": step.sql,
            "data": result,
        }

    return results

def resolve_input(reference: str, sql_results: dict) -> float:
    step_id, column_name = reference.split(".", 1)

    if step_id not in sql_results:
        raise ValueError(f"Unknown step reference: {step_id}")

    dataframe = sql_results[step_id]["data"]

    if column_name not in dataframe.columns:
        raise ValueError(
            f"Column '{column_name}' not found in step '{step_id}' result."
        )

    if dataframe.empty:
        raise ValueError(f"Step '{step_id}' returned no rows.")

    value = dataframe.iloc[0][column_name]

    return float(value)

def execute_calculation_steps(plan: QueryPlan, sql_results: dict) -> dict:
    results = {}

    for step in plan.calculation_steps:
        values = [
            resolve_input(reference, sql_results)
            for reference in step.inputs
        ]

        result = execute_operation(
            operation=step.operation,
            values=values,
        )

        results[step.id] = {
            "label": step.label,
            "purpose": step.purpose,
            "operation": step.operation,
            "inputs": step.inputs,
            "input_values": values,
            "result": result,
        }

    return results

def build_trace(
    plan: QueryPlan,
    sql_results: dict,
    calculation_results: dict,
) -> list[dict]:
    trace = []

    for step in plan.sql_steps:
        result = sql_results[step.id]
        dataframe = result["data"]

        trace.append(
            {
                "id": step.id,
                "type": "sql",
                "label": step.label,
                "summary": f"{len(dataframe)} row(s) returned",
                "details": {
                    "purpose": step.purpose,
                    "sql": step.sql,
                    "data": dataframe,
                },
            }
        )

    for step in plan.calculation_steps:
        result = calculation_results[step.id]

        trace.append(
            {
                "id": step.id,
                "type": "calculation",
                "label": step.label,
                "summary": f"{result['result']:.2f}",
                "details": {
                    "purpose": step.purpose,
                    "operation": step.operation,
                    "inputs": step.inputs,
                    "input_values": result["input_values"],
                    "result": result["result"],
                },
            }
        )

    return trace

def execute_plan(plan: QueryPlan) -> dict:
    sql_results = execute_sql_steps(plan)

    calculation_results = execute_calculation_steps(
        plan,
        sql_results,
    )

    trace = build_trace(
        plan,
        sql_results,
        calculation_results,
    )

    return {
        "sql_results": sql_results,
        "calculation_results": calculation_results,
        "trace": trace,
    }

def determine_confidence(
    plan: QueryPlan,
    execution: dict,
) -> str:
    required_field_issues = validate_required_fields(
        plan,
        execution["sql_results"],
    )

    if not plan.answerable:
        return "Insufficient Data"

    if required_field_issues:
        return "Insufficient Data"

    if plan.trust_checks.incomplete_data:
        return "Low"

    if (
        plan.trust_checks.ambiguous
        or plan.trust_checks.assumption_used
    ):
        return "Medium"

    return "High"