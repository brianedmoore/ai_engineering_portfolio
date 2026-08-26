"""
Node 10a: Human Review

Pauses the graph to show the inspector which extractions need confirmation.
LangGraph supports this via interrupt() — the graph state is checkpointed and
execution resumes when the caller provides updated state.

In the CLI (run.py), this prints flagged items and waits for terminal input.
In a future web UI, this would pause and render a review screen.

To skip review and auto-approve everything, set AUTO_APPROVE=true in .env.
"""

import os
import json

from ..state import ImportState

AUTO_APPROVE = os.getenv("AUTO_APPROVE", "false").lower() == "true"


def run(state: ImportState) -> dict:
    if AUTO_APPROVE:
        print("[human_review] AUTO_APPROVE=true — skipping review")
        return {"human_review_needed": False}

    flags = state.get("validation_flags", [])
    observations = state.get("observations", [])
    header = state.get("inspection_header", {})

    print("\n" + "=" * 60)
    print("HUMAN REVIEW REQUIRED")
    print("=" * 60)
    print(f"\nProperty: {header.get('address', '[no address extracted]')}")
    print(f"Observations extracted: {len(observations)}")
    print(f"Flags: {len(flags)}\n")

    if flags:
        print("Items that need your attention:")
        for flag in flags:
            idx = flag["observation_index"]
            obs = observations[idx] if idx < len(observations) else {}
            print(f"\n  [{idx}] {obs.get('title', '?')}")
            print(f"       {flag['field']}: {flag['issue']}")

    print("\nOptions:")
    print("  [y] Approve and import as-is")
    print("  [n] Cancel import")
    print("  [j] Print full JSON and cancel")

    choice = input("\nYour choice (y/n/j): ").strip().lower()

    if choice == "j":
        print(json.dumps({"header": header, "observations": observations}, indent=2, default=str))
        raise SystemExit("Import cancelled — full JSON printed above.")

    if choice != "y":
        raise SystemExit("Import cancelled by user.")

    print("[human_review] Approved — proceeding to DB write.")
    return {"human_review_needed": False}
