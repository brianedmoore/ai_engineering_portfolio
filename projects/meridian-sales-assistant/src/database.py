import sqlite3
import pandas as pd


DB_PATH = "meridian.db"


def initialize_database():
    deals = pd.read_csv("data/deals.csv")
    reps = pd.read_csv("data/reps.csv")

    deals["close_date"] = pd.to_datetime(deals["close_date"])
    deals["created_date"] = pd.to_datetime(deals["created_date"])
    reps["hire_date"] = pd.to_datetime(reps["hire_date"])

    conn = sqlite3.connect(DB_PATH)

    deals.to_sql("deals", conn, if_exists="replace", index=False)
    reps.to_sql("reps", conn, if_exists="replace", index=False)

    conn.close()


def execute_query(sql: str) -> pd.DataFrame:
    query = sql.strip()

    lower_query = query.lower()

    if not (
        lower_query.startswith("select")
        or lower_query.startswith("with")
    ):
        raise ValueError("Only read-only SELECT queries are allowed.")

    forbidden_keywords = [
        " insert ",
        " update ",
        " delete ",
        " drop ",
        " alter ",
        " create ",
    ]

    normalized_query = f" {lower_query} "

    if any(keyword in normalized_query for keyword in forbidden_keywords):
        raise ValueError("Query contains a forbidden write operation.")

    conn = sqlite3.connect(DB_PATH)

    try:
        result = pd.read_sql_query(query, conn)
    finally:
        conn.close()

    return result