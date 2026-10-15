DATA_CONTEXT = """
You are analyzing Meridian Systems sales data stored in SQLite.

TABLE: deals
Columns:
- deal_id: unique opportunity ID
- account_name: customer or prospect account name
- segment: Enterprise, Mid-Market, or SMB
- region: Central, Northeast, Southeast, or West
- rep_id: sales rep ID
- stage: Closed Lost, Closed Won, Discovery, Negotiation, Proposal, or Prospecting
- deal_value: opportunity value in dollars
- close_date: expected or actual close date
- created_date: opportunity creation date
- product_line: Analytics Add-on, Core Platform, or Security Module
- loss_reason: recorded reason for a lost deal; may be null

TABLE: reps
Columns:
- rep_id: unique sales rep ID
- rep_name: sales rep name
- segment: Enterprise, Mid-Market, or SMB
- region: Central, Northeast, Southeast, or West
- quota_q1_2026: individual Q1 2026 sales quota in dollars
- manager: sales manager name
- hire_date: sales rep hire date

RELATIONSHIP:
deals.rep_id = reps.rep_id

BUSINESS RULES:
- Closed Won Revenue = SUM(deal_value) where stage = 'Closed Won'
- Rep Q1 2026 Quota Attainment = Closed Won Revenue / quota_q1_2026
- Segment Q1 2026 Quota Attainment = total Closed Won Revenue for the segment / total quota for reps in that segment
- Quota attainment is based on Closed Won revenue, not total pipeline value.
- A null loss_reason means the dataset does not provide the reason the deal was lost. Do not infer one.
"""