# Architecture Decisions

## LLM Processing Strategy — Three Phase Roadmap

### Phase 1 (Current): Immediate per-observation processing
Each observation is submitted individually and runs through the LLM synchronously before the inspector moves on. Inspector reviews while context is fresh — they just photographed the defect and know exactly what they're looking at. Simple, proven, good for MVP and single-observation demos.

**Tradeoff:** ~8-12 second wait per observation adds up on a 50-observation inspection. Acceptable for now.

---

### Phase 2 (Next): Fire-and-forget with background processing
Inspector captures observations and moves immediately to the next — no waiting. LLM runs behind the scenes in parallel. When the full walkthrough is done, inspector does a single review pass (in the car, at the kitchen table) through all processed observations before leaving the property.

**Win:** Field speed + context still reasonably fresh (same visit). No architectural rebuild required — just decouple the capture UX from the wait.

---

### Phase 3 (Future): True batching with cross-observation synthesis
After all observations are individually processed, run a second LLM call that sees the full inspection at once. Enables:
- Pattern detection across observations (3 electrical issues in the same panel → root cause is the panel)
- Redundancy removal (two observations describing the same defect differently)
- Observation grouping suggestions
- Inspection-level summary generation
- Token optimization across the batch

**Requires:** Inspection-level data model (inspector → inspection → observations) to be in place first.

---

## Data Model — Inspection-First Approach

Decided: inspectors must create an Inspection record before capturing observations. Address is the only required field at creation. Client name, date, property type can be filled before report generation.

**Rationale:** Capture-first leads to orphaned observations, no context for AI, and cleanup debt. Inspector always knows the property address before they arrive.

Relationship chain:
```
Inspector → many Inspections → many Observations → many Photos
                             → one Report (generated on-demand from approved Observations)
```
