# Meridian Sales Assistant

A conversational sales analytics prototype designed to give commercial leaders fast, traceable answers from structured sales data.

The prototype was built around two priorities:

**Fast. Trustworthy.**

Users can ask natural-language questions about pipeline, quota attainment, revenue, and sales performance. The system interprets the question, executes the analysis against structured data, and returns a concise business answer with confidence, assumptions, and an auditable derivation.

## Example Questions

- How is the Enterprise segment tracking against quota this quarter?
- Which reps are at risk of missing Q1?
- What is our total pipeline value for deals closing before the end of March?
- Why did we lose Ironbridge?
- Is Priya going to meet her quota this quarter?
- Do we have any deals with Mendoza Industries?

## Architecture

The core design principle is:

> **The LLM interprets. Code computes. Evidence stays visible.**

The flow is:

1. User asks a natural-language sales question.
2. A planning model converts the request into a structured `QueryPlan` using Pydantic.
3. SQLite performs retrieval, filtering, joins, grouping, and aggregation.
4. Controlled Python handles scalar calculations where needed.
5. A formatter model converts only the executed results into concise business language.
6. A trace summarizer explains how the answer was derived in plain English.
7. The UI exposes confidence, assumptions, source fields, transformations, SQL, and source rows.

## Tech Stack

- Python
- Streamlit
- SQLite
- Pandas
- Pydantic
- OpenAI Responses API
- python-dotenv

## Project Structure

```text
meridian-sales-assistant/
├── app.py
├── run_evals.py
├── requirements.txt
├── README.md
├── data/
│   ├── deals.csv
│   ├── reps.csv
│   └── Meridian_Sales_Assistant_Evaluation_Set.xlsx
├── docs/
│   └── data_context.md
└── src/
    ├── __init__.py
    ├── calculations.py
    ├── context.py
    ├── data_profile.py
    ├── database.py
    ├── evaluation.py
    ├── executor.py
    ├── llm.py
    ├── models.py
    └── service.py