import streamlit as st

from src.database import initialize_database
from src.llm import create_query_plan, create_final_answer, create_trace_summary
from src.executor import execute_plan, determine_confidence


st.set_page_config(
    page_title="Meridian Sales Assistant",
    page_icon="📊",
    layout="centered",
)

initialize_database()

if "messages" not in st.session_state:
    st.session_state.messages = []

if "clarification_count" not in st.session_state:
    st.session_state.clarification_count = 0

st.title("Meridian Sales Assistant")

st.caption(
    "Fast, traceable answers from Meridian sales data."
)

with st.expander("How confidence works"):
    st.markdown(
        """
**High** — Complete data, clear interpretation, no material assumptions.

**Medium** — Supported answer, but an ambiguity or assumption affects interpretation.

**Low** — Analysis is possible, but missing data reduces reliability.

**Insufficient Data** — The available data cannot support the requested conclusion.
"""
    )

    st.caption(
        "Confidence reflects data completeness, ambiguity, and assumptions — "
        "not the model's subjective certainty."
    )

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.write(message["content"])

question = st.chat_input("Ask a sales question...")

if question:
    st.session_state.messages.append(
        {
            "role": "user",
            "content": question,
        }
    )
    with st.chat_message("user"):
        st.write(question)

    with st.chat_message("assistant"):
        with st.spinner("Analyzing..."):
            conversation_history = st.session_state.messages[:-1]

            plan = create_query_plan(
                question=question,
                clarification_count=st.session_state.clarification_count,
                max_clarifications=1,
                conversation_history=conversation_history,
            )

            if plan.needs_clarification:
                st.write(plan.clarification_question)
                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": plan.clarification_question,
                    }
                )

                st.session_state.clarification_count += 1

            elif not plan.answerable:
                st.write(plan.answerability_reason)
                st.caption("Confidence: Insufficient Data")

            else:
                execution = execute_plan(plan)

                confidence = determine_confidence(
                    plan,
                    execution,
                )

                final_answer = create_final_answer(
                    question=question,
                    plan=plan,
                    execution=execution,
                    confidence=confidence,
                )

                # Display response
                st.write(final_answer.answer)

                if final_answer.caveat:
                    st.caption(
                        f"Caveat: {final_answer.caveat}"
                    )

                st.caption(
                    f"Confidence: {confidence}"
                )

                trace_summary = create_trace_summary(
                    question=question,
                    execution=execution,
                )


                # SAVE RESPONSE TO CONVERSATION MEMORY
                assistant_message = final_answer.answer

                if final_answer.caveat:
                    assistant_message += (
                        f"\n\nCaveat: {final_answer.caveat}"
                    )

                assistant_message += (
                    f"\n\nConfidence: {confidence}"
                )

                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": assistant_message,
                    }
                )

                # Reset clarification allowance for next question
                # TODO: st.session_state.clarification_count = 0

                # Trace UI
                with st.expander("How this answer was derived"):
                    for step in trace_summary.steps:
                        st.write(f"- {step}")
                    with st.expander("Technical details"): 
                        for step in execution["trace"]:
                            st.markdown(f"**{step['label']}**")
                            st.write(step["summary"])

                            if step["type"] == "sql":
                                st.dataframe(
                                    step["details"]["data"],
                                    width="stretch",
                                )

                                with st.expander("View SQL"):
                                    st.code(
                                        step["details"]["sql"],
                                        language="sql",
                                    )

                            elif step["type"] == "calculation":
                                st.write(step["details"])