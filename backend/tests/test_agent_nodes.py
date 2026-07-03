import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.agents.nodes import AgentNodeRunner
from app.agents.state import (
    SupervisorResponse,
    QAResponse,
    ExplainerResponse,
    ContributionResponse,
    CitationResponse,
    SummaryResponse
)

@patch("app.agents.nodes.OpenAI")
def test_agent_nodes_mock(mock_openai_class):
    # Set up mock OpenAI client and response
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    
    runner = AgentNodeRunner(api_key="mock_key_for_testing")
    
    # 1. Test Mock Supervisor
    print("Testing Mock Supervisor Node...")
    mock_supervisor_parsed = SupervisorResponse(
        selected_agent="qa_agent",
        reasoning="User is asking about specific experimental details.",
        needs_search=True,
        search_query="accuracy results of deep neural network"
    )
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.parsed = mock_supervisor_parsed
    mock_client.beta.chat.completions.parse.return_value = mock_response
    
    supervisor_res = runner.run_supervisor(
        paper_title="Test Title",
        paper_authors=["Author A"],
        paper_year=2026,
        chat_history=[],
        user_query="What were the model accuracy results?"
    )
    
    print(f"Selected Agent: {supervisor_res.selected_agent}")
    print(f"Needs Search: {supervisor_res.needs_search}")
    print(f"Search Query: {supervisor_res.search_query}")
    
    assert supervisor_res.selected_agent == "qa_agent"
    assert supervisor_res.needs_search is True
    print("Supervisor mock test passed!")

    # 2. Test Mock QA Agent
    print("\nTesting Mock QA Agent Node...")
    mock_qa_parsed = QAResponse(
        answer="The model achieved 95% recall under semantic chunking.",
        citation_sources=["Page 1 - ABSTRACT", "Page 2 - 2. Methodology"],
        agent_thoughts="Synthesized page 1 abstract stats and page 2 methodology proofs."
    )
    
    mock_response.choices[0].message.parsed = mock_qa_parsed
    mock_client.beta.chat.completions.parse.return_value = mock_response
    
    qa_res = runner.run_qa_agent(
        paper_title="Test Title",
        paper_authors=["Author A"],
        retrieved_context="Mock document chunks text...",
        user_query="What was the accuracy?",
        chat_history=[]
    )
    
    print(f"Answer: {qa_res.answer}")
    print(f"Citations: {qa_res.citation_sources}")
    print(f"Thoughts: {qa_res.agent_thoughts}")
    
    assert "95% recall" in qa_res.answer
    assert len(qa_res.citation_sources) == 2
    print("QA Agent mock test passed!")

    # 3. Test Mock Explainer Agent
    print("\nTesting Mock Explainer Agent Node...")
    mock_explainer_parsed = ExplainerResponse(
        concept="RAG",
        explanation="Retrieval-Augmented Generation indexes database contexts to supply prompt pipelines.",
        equations_or_code=["Equation (1): Similarity = cos(u, v)"],
        agent_thoughts="Explained equation 1 variables."
    )
    mock_response.choices[0].message.parsed = mock_explainer_parsed
    
    expl_res = runner.run_explainer_agent(
        paper_title="Test Title",
        paper_authors=["Author A"],
        retrieved_context="Mock context...",
        user_query="Explain RAG",
        chat_history=[]
    )
    
    print(f"Concept: {expl_res.concept}")
    print(f"Explanation: {expl_res.explanation}")
    assert expl_res.concept == "RAG"
    print("Explainer Agent mock test passed!")

    print("\nAll mock agent nodes executed and validated schemas successfully!")

if __name__ == "__main__":
    test_agent_nodes_mock()
