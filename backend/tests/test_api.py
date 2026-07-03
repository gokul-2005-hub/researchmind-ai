import sys
import os
import io
from pathlib import Path
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.main import app
from app.agents.state import SupervisorResponse, QAResponse

# Mock out both OpenAI completions and Chroma repository to run test completely offline
@patch("app.graphs.workflow.ChromaRepository")
@patch("app.graphs.workflow.AgentNodeRunner")
@patch("app.api.papers.ChromaRepository")
def test_full_api_workflow(mock_api_chroma, mock_runner_class, mock_workflow_chroma):
    print("Initializing mock returns...")
    
    # Mock Chroma repos
    mock_chroma_instance = MagicMock()
    mock_api_chroma.return_value = mock_chroma_instance
    mock_workflow_chroma.return_value = mock_chroma_instance
    
    # Mock LLM Agent Runner
    mock_runner = MagicMock()
    mock_runner_class.return_value = mock_runner
    
    # Supervisor mocks
    mock_runner.run_supervisor.return_value = SupervisorResponse(
        selected_agent="qa_agent",
        reasoning="User is asking about specific experimental details.",
        needs_search=True,
        search_query="hybrid search improvements"
    )
    
    # QA mocks
    mock_runner.run_qa_agent.return_value = QAResponse(
        answer="The hybrid search model achieves a 25% recall boost.",
        citation_sources=["Page 2 - 2. Methodology"],
        agent_thoughts="Synthesized section 2 data."
    )

    # Initialize TestClient inside context manager to trigger lifespan startup (DB migrations)
    print("\nStarting TestClient with Lifespan...")
    with TestClient(app) as client:
        # 1. Test Healthcheck
        print("Testing GET /health...")
        res = client.get("/health")
        print(f"Health Response: {res.json()}")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Test Paper Upload
        print("\nTesting POST /api/v1/papers (Upload)...")
        # Programmatically construct a tiny mock PDF bytes payload
        # (PyMuPDF needs a valid PDF structure, so we create a simple 1-page blank PDF bytes)
        import fitz
        doc = fitz.open()
        doc.new_page()
        pdf_stream = io.BytesIO()
        doc.save(pdf_stream)
        pdf_bytes = pdf_stream.getvalue()
        doc.close()
        
        file_payload = {"file": ("api_test_paper.pdf", pdf_bytes, "application/pdf")}
        res = client.post("/api/v1/papers/", files=file_payload)
        print(f"Upload Response Status: {res.status_code}")
        assert res.status_code == 201
        paper_data = res.json()
        paper_id = paper_data["id"]
        print(f"Uploaded Paper ID: {paper_id} | Title: {paper_data['title']}")
        
        # 3. Test Get Papers list
        print("\nTesting GET /api/v1/papers (List)...")
        res = client.get("/api/v1/papers/")
        assert res.status_code == 200
        papers_list = res.json()
        print(f"Total Papers in list: {len(papers_list)}")
        assert any(p["id"] == paper_id for p in papers_list)

        # 4. Test Chat Session creation
        print("\nTesting POST /api/v1/chats/{paper_id}/sessions...")
        res = client.post(f"/api/v1/chats/{paper_id}/sessions?title=API Test Chat")
        assert res.status_code == 200
        session_data = res.json()
        session_id = session_data["id"]
        print(f"Created Session ID: {session_id} | Title: {session_data['title']}")

        # 5. Test Query Agent Workflow
        print("\nTesting POST /api/v1/chats/sessions/{session_id}/query...")
        query_payload = {"user_query": "What recall boost is achieved?"}
        res = client.post(f"/api/v1/chats/sessions/{session_id}/query", json=query_payload)
        print(f"Query Response Status: {res.status_code}")
        assert res.status_code == 200
        query_res = res.json()
        print(f"Agent Selected: {query_res['selected_agent']}")
        print(f"Final Answer: {query_res['final_answer']}")
        assert "25% recall boost" in query_res["final_answer"]

        # 6. Test Notes Save
        print("\nTesting POST /api/v1/notes/{paper_id}...")
        notes_payload = {"title": "My Analysis Notes", "content": "This paper is about hybrid RAG search improvements."}
        res = client.post(f"/api/v1/notes/{paper_id}", json=notes_payload)
        assert res.status_code == 200
        note_data = res.json()
        print(f"Saved Note ID: {note_data['id']} | Title: {note_data['title']}")
        
        # 7. Test Notes Get
        print("\nTesting GET /api/v1/notes/{paper_id}...")
        res = client.get(f"/api/v1/notes/{paper_id}")
        assert res.status_code == 200
        assert res.json()["title"] == "My Analysis Notes"

        # 8. Test Paper Delete (Teardown)
        print("\nTesting DELETE /api/v1/papers/{paper_id}...")
        res = client.delete(f"/api/v1/papers/{paper_id}")
        assert res.status_code == 200
        print(f"Deletion message: {res.json()['message']}")
        
        # Verify paper is indeed gone
        res = client.get(f"/api/v1/papers/{paper_id}")
        assert res.status_code == 404
        
        print("\nAll REST API endpoints verified and passed completely!")

if __name__ == "__main__":
    test_full_api_workflow()
