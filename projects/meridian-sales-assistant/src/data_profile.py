import sqlite3
from datetime import datetime

from src.database import DB_PATH


def build_data_profile() -> str:
    conn = sqlite3.connect(DB_PATH)

    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(reps);")
    rep_columns = [row[1] for row in cursor.fetchall()]

    quota_columns = [
        column for column in rep_columns
        if column.startswith("quota_")
    ]

    cursor.execute(
        """
        SELECT
            MIN(close_date),
            MAX(close_date),
            MIN(created_date),
            MAX(created_date)
        FROM deals;
        """
    )
    min_close, max_close, min_created, max_created = cursor.fetchone()

    latest_created = datetime.fromisoformat(max_created)

    latest_created_quarter = ((latest_created.month - 1) // 3) + 1
    latest_created_year = latest_created.year

    cursor.execute(
        "SELECT DISTINCT segment FROM deals ORDER BY segment;"
    )
    segments = [row[0] for row in cursor.fetchall()]

    cursor.execute(
        "SELECT DISTINCT stage FROM deals ORDER BY stage;"
    )
    stages = [row[0] for row in cursor.fetchall()]

    conn.close()

    return f"""
CURRENT DATASET PROFILE

Available quota fields:
{quota_columns}

Deal close date range:
{min_close} to {max_close}

Deal created date range:
{min_created} to {max_created}

Available segments:
{segments}

Available stages:
{stages}

Deal close date range:
{min_close} to {max_close}

Deal created date range:
{min_created} to {max_created}

Latest observed created_date:
{max_created}

Inferred dataset period:
Q{latest_created_quarter} {latest_created_year}

Important:
- Determine available reporting periods from the current dataset.
- Do not assume quota exists for a period unless a corresponding quota field exists.
- The latest created_date may be used as a proxy for the dataset's as-of period when no explicit reporting date exists.
- If this proxy is used to interpret relative language such as "this quarter", surface it as an assumption.
- close_date may represent a future expected close and should not determine the dataset's as-of period.
"""