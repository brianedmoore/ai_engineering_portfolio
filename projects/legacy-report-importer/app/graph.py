"""
LangGraph state graph.

Node execution order:
  pdf_loader → pii_scrubber → layout_classifier → image_describer
  → extract_header → extract_observations → image_matcher
  → extract_not_inspected → validator
  → [human_review?] → db_writer

The only conditional edge is after validator: routes to human_review if
any flags were raised, otherwise goes straight to db_writer.

Parallelization opportunity (not yet implemented):
  image_describer, extract_header, and extract_observations are independent
  after pii_scrubber. A future optimization could fan them out in parallel
  using LangGraph's Send API, then join before image_matcher.
"""

from langgraph.graph import StateGraph, END

from .state import ImportState
from .nodes import (
    pdf_loader,
    pii_scrubber,
    layout_classifier,
    image_describer,
    extract_header,
    extract_observations,
    image_matcher,
    extract_not_inspected,
    validator,
    human_review,
    db_writer,
)


def _route_after_validation(state: ImportState) -> str:
    return "human_review" if state.get("human_review_needed") else "db_writer"


def build_graph():
    graph = StateGraph(ImportState)

    graph.add_node("pdf_loader", pdf_loader.run)
    graph.add_node("pii_scrubber", pii_scrubber.run)
    graph.add_node("layout_classifier", layout_classifier.run)
    graph.add_node("image_describer", image_describer.run)
    graph.add_node("extract_header", extract_header.run)
    graph.add_node("extract_observations", extract_observations.run)
    graph.add_node("image_matcher", image_matcher.run)
    graph.add_node("extract_not_inspected", extract_not_inspected.run)
    graph.add_node("validator", validator.run)
    graph.add_node("human_review", human_review.run)
    graph.add_node("db_writer", db_writer.run)

    graph.set_entry_point("pdf_loader")
    graph.add_edge("pdf_loader", "pii_scrubber")
    graph.add_edge("pii_scrubber", "layout_classifier")
    graph.add_edge("layout_classifier", "image_describer")
    graph.add_edge("image_describer", "extract_header")
    graph.add_edge("extract_header", "extract_observations")
    graph.add_edge("extract_observations", "image_matcher")
    graph.add_edge("image_matcher", "extract_not_inspected")
    graph.add_edge("extract_not_inspected", "validator")

    graph.add_conditional_edges(
        "validator",
        _route_after_validation,
        {"human_review": "human_review", "db_writer": "db_writer"},
    )

    graph.add_edge("human_review", "db_writer")
    graph.add_edge("db_writer", END)

    return graph.compile()


# Singleton — import and call run_import() from run.py
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph
