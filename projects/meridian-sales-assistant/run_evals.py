import pandas as pd

from src.evaluation import run_eval_case


EVAL_FILE = "data/Meridian_Sales_Assistant_Evaluation_Set.xlsx"


df = pd.read_excel(
    EVAL_FILE,
    sheet_name="Evaluation Set",
)

first_row = df.iloc[3]

if first_row["Eval ID"] == "E004":
    first_row["Conversation Context"] = """
User asked: Which reps are at risk of missing Q1?

At risk was defined as:
A rep cannot hit quota even if all remaining Q1 pipeline closes.

Remaining Q1 pipeline means:
Open deals expected to close by March 31, 2026.

Using that definition, all 10 reps were at risk.
"""

result = run_eval_case(first_row)

print(result)