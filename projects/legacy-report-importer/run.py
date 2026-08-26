"""
CLI entry point.

Usage:
  python run.py path/to/report.pdf
  python run.py path/to/report.pdf --dry-run     # extract but don't write to DB
  python run.py path/to/report.pdf --auto-approve # skip human review prompt

Set AUTO_APPROVE=true in .env to always skip review.
Set LANGCHAIN_TRACING_V2=true to enable LangSmith tracing.
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Load .env before any imports that need API keys
from dotenv import load_dotenv
load_dotenv()

from app.graph import get_graph
from app.state import ImportState


def main():
    parser = argparse.ArgumentParser(description="Import a legacy home inspection PDF into the observation engine DB.")
    parser.add_argument("pdf_path", help="Path to the PDF report to import")
    parser.add_argument("--dry-run", action="store_true", help="Extract and validate but do not write to DB")
    parser.add_argument("--auto-approve", action="store_true", help="Skip human review prompt")
    parser.add_argument("--output-json", help="Write final extracted state to a JSON file for inspection")
    args = parser.parse_args()

    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f"Error: file not found: {pdf_path}")
        sys.exit(1)

    if args.auto_approve:
        os.environ["AUTO_APPROVE"] = "true"

    print(f"\nImporting: {pdf_path.name}")
    print("─" * 50)

    initial_state: ImportState = {
        "pdf_path": str(pdf_path),
        "raw_text": "",
        "pages": [],
        "images": [],
        "scrubbed_text": "",
        "extracted_pii": {},
        "layout_type": "unknown",
        "inspection_header": {},
        "observations": [],
        "not_inspected": [],
        "validation_flags": [],
        "human_review_needed": False,
        "db_result": {},
        "errors": [],
    }

    graph = get_graph()

    if args.dry_run:
        # Run all nodes up to (but not including) db_writer
        # Easiest: run the full graph but monkey-patch db_writer to be a no-op
        from app.nodes import db_writer as db_writer_module
        original_run = db_writer_module.run

        def dry_run_noop(state):
            print("[db_writer] DRY RUN — skipping DB write")
            return {"db_result": {"dry_run": True, "observation_count": len(state.get("observations", []))}}

        db_writer_module.run = dry_run_noop
        final_state = graph.invoke(initial_state)
        db_writer_module.run = original_run
    else:
        final_state = graph.invoke(initial_state)

    # Summary
    print("\n" + "=" * 50)
    print("IMPORT COMPLETE")
    print("=" * 50)
    db_result = final_state.get("db_result", {})
    print(f"  Inspection ID:    {db_result.get('inspection_id', 'N/A')}")
    print(f"  Observations:     {db_result.get('observation_count', len(final_state.get('observations', [])))}")
    print(f"  Not inspected:    {len(final_state.get('not_inspected', []))}")
    print(f"  Images processed: {len([i for i in final_state.get('images', []) if not i.get('skip')])}")

    errors = final_state.get("errors", [])
    if errors:
        print(f"\n  Errors ({len(errors)}):")
        for err in errors:
            print(f"    - {err}")

    if args.output_json:
        # Strip image bytes before writing (would be huge)
        export = dict(final_state)
        export["images"] = [
            {k: v for k, v in img.items() if k != "bytes_b64"}
            for img in export.get("images", [])
        ]
        with open(args.output_json, "w") as f:
            json.dump(export, f, indent=2, default=str)
        print(f"\n  Full state written to: {args.output_json}")


if __name__ == "__main__":
    main()
