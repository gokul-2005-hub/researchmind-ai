import sys
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.graphs.workflow import build_research_workflow
from app.agents.state import SupervisorResponse, QAResponse
from app.models.orm import PaperORM

@patch("app.graphs.workflow.SQLAlchemyPaperRepository")
@patch("app.graphs.workflow.ChromaRepository")
@patch("app.graphs.workflow.AgentNodeRunner")
def test_workflow_execution(mock_runner_class, mock_chroma_class, mock_paper_repo_class):
    # Set up mocks
    mock_db = MagicMock()
    mock_embedding = MagicMock()
    
    mock_runner = MagicMock()
    mock_runner_class.return_value = mock_runner
    
    mock_chroma = MagicMock()
    mock_chroma_class.return_value = mock_chroma
    
    mock_paper_repo = MagicMock()
    mock_paper_repo_class.return_value = mock_paper_repo

    # Set up mock database return value
    mock_paper = PaperORM(
        id="mock-paper-id",
        title="Attention Is All You Need",
        authors=["Vaswani et al."],
        publication_year=2017
    )
    mock_paper_repo.get_by_id.return_value = mock_paper

    # Set up mock supervisor response
    mock_supervisor_parsed = SupervisorResponse(
        selected_agent="qa_agent",
        reasoning="Routing to QA Agent for fact checking.",
        needs_search=True,
        search_query="self-attention mechanism explanation"
    )
    mock_runner.run_supervisor.return_value = mock_supervisor_parsed

    # Set up mock vector retrieval response
    mock_chroma.similarity_search.return_value = [
        {
            "text_content": "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.",
            "metadata": {
                "section_title": "Abstract",
                "start_page": 1,
                "end_page": 1
            }
        }
    ]

    # Set up mock QA response
    mock_qa_parsed = QAResponse(
        answer="The paper introduces the Transformer architecture based solely on attention.",
        citation_sources=["Abstract (Page 1)"],
        agent_thoughts="Extracted from abstract text."
    )
    mock_runner.run_qa_agent.return_value = mock_qa_parsed

    print("Compiling LangGraph workflow graph...")
    graph = build_research_workflow(
        db=mock_db,
        embedding_service=mock_embedding,
        openai_api_key="mock_openai_key"
    )
    
    print("\nInvoking compiled graph with test inputs...")
    initial_state = {
        "user_query": "What architecture is proposed?",
        "paper_id": "mock-paper-id",
        "chat_history": [],
        "retrieved_context": "",
        "selected_agent": "",
        "needs_search": False,
        "search_query": "",
        "agent_thoughts": "",
        "final_answer": "",
        "citation_sources": []
    }
    
    output_state = graph.invoke(initial_state)
    
    print("\nGraph execution complete. Verifying output state values...")
    print(f"Loaded Paper Title: {output_state['paper_title']}")
    print(f"Supervisor Decision: Selected {output_state['selected_agent']} | Search needed: {output_state['needs_search']}")
    print(f"Retrieved Context length: {len(output_state['retrieved_context'])} characters")
    print(f"Final Compiled Answer: {output_state['final_answer']}")
    print(f"Citations: {output_state['citation_sources']}")
    
    # Assertions to ensure routing and execution matches expectations
    assert output_state["paper_title"] == "Attention Is All You Need"
    assert output_state["selected_agent"] == "qa_agent"
    assert output_state["needs_search"] is True
    assert "Transformer" in output_state["final_answer"]
    assert len(output_state["citation_sources"]) > 0
    
    print("\nLangGraph multi-agent workflow verification test passed completely!")

if __name__ == "__main__":
    test_workflow_execution()
