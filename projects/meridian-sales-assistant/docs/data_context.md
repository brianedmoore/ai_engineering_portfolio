# Meridian Data Context

## Tables

### deals
Pipeline opportunity-level data.

### reps
Sales rep attributes and Q1 2026 quota targets.

## Current Data Quality Findings

- `deals.loss_reason` is the only field with missing values.
- `loss_reason` has 68 null values.
- A null `loss_reason` means the dataset does not provide a reason for that specific lost deal and the system must not infer one.
- `deals.close_date` initially loads from CSV as a string and is normalized to a datetime.
- `deals.created_date` initially loads from CSV as a string and is normalized to a datetime.
- `reps.hire_date` initially loads from CSV as a string and is normalized to a datetime.
- No other fields currently contain null values.

## Allowed Categorical Values

### deals.segment
- Enterprise
- Mid-Market
- SMB

### deals.region
- Central
- Northeast
- Southeast
- West

### deals.stage
- Closed Lost
- Closed Won
- Discovery
- Negotiation
- Proposal
- Prospecting

### deals.product_line
- Analytics Add-on
- Core Platform
- Security Module

### reps.segment
- Enterprise
- Mid-Market
- SMB

### reps.region
- Central
- Northeast
- Southeast
- West

## Table Relationships

- `deals.rep_id` joins to `reps.rep_id`.
- `reps` contains one row per sales rep.
- `deals` contains multiple opportunities per rep.

## Derived Business Metrics

### Closed Won Revenue
Sum of `deals.deal_value` where:

`deals.stage = 'Closed Won'`

### Q1 2026 Quota Attainment
For a rep:

`Closed Won Revenue / quota_q1_2026`

For a segment:

`Total Closed Won Revenue for reps in the segment / Total quota_q1_2026 for reps in the segment`

### Important
Quota attainment is based on Closed Won revenue, not total pipeline value.