import sys
import os
import uuid
import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.main import app, lifespan
from app.database.connection import SessionLocal
from app.services.pdf_service import PDFService
from app.services.embedding_service import get_embedding_service
from app.vectorstore.chroma_store import ChromaRepository
from app.graphs.workflow import build_research_workflow
from app.repositories.sqlalchemy_repo import SQLAlchemyPaperRepository
from app.agents.state import SupervisorResponse, QAResponse, ExplainerResponse, SummaryResponse

async def run_e2e_test():
    print("======================================================================")
    print("STARTING RESEARCHMIND AI END-TO-END PIPELINE INTEGRATION TEST")
    print("======================================================================\n")

    # Initialize Lifespan (Creates SQL Tables and confirmation directories)
    async with lifespan(app):
        db = SessionLocal()
        paper_repo = SQLAlchemyPaperRepository(db)
        embedding_service = get_embedding_service()
        vector_repo = ChromaRepository(embedding_service)
        
        pdf_path = Path("e2e_test_paper.pdf")
        
        try:
            # 1. Programmatically compile a valid multi-page PDF paper
            print("Step 1: Generating programmatic test PDF document with section boundaries...")
            import fitz
            doc = fitz.open()
            
            # Page 1: Abstract
            p1 = doc.new_page()
            p1.insert_text((50, 100), "ResearchMind AI Project Specification")
            p1.insert_text((50, 150), "Abstract")
            p1.insert_text((50, 180), "We propose a multi-agent orchestration architecture to query papers semantically.")
            
            # Page 2: Introduction
            p2 = doc.new_page()
            p2.insert_text((50, 100), "1. Introduction")
            p2.insert_text((50, 130), "Traditional RAG systems feed flat context windows to general LLMs.")
            p2.insert_text((50, 160), "Our multi-agent system routes specialized sub-questions to dedicated expert nodes.")
            
            # Page 3: Methodology
            p3 = doc.new_page()
            p3.insert_text((50, 100), "2. Methodology")
            p3.insert_text((50, 130), "We utilize a ChromaDB vector store running local Sentence Transformers representations.")
            p3.insert_text((50, 160), "The embedding model generates 384-dimensional dense vectors offline.")
            
            # Page 4: Results
            p4 = doc.new_page()
            p4.insert_text((50, 100), "3. Results")
            p4.insert_text((50, 130), "Experimental results show a 25% increase in query recall when using hybrid index matching.")
            p4.insert_text((50, 160), "The latency per query averages 1.8 seconds across LangGraph routing nodes.")
            
            doc.save(str(pdf_path))
            doc.close()
            print(f"Test PDF compiled and saved to disk: {pdf_path.absolute()}")

            # 2. Ingest PDF and generate relational DB tables
            print("\nStep 2: Ingesting PDF file into parser pipeline and relational database...")
            with open(pdf_path, "rb") as f:
                content = f.read()
                
            pdf_service = PDFService(db)
            paper, db_chunks = pdf_service.process_pdf_upload(
                file_content=content,
                original_filename="e2e_test_paper.pdf"
            )
            print(f"Relational record created. Paper ID: {paper.id} | Title: {paper.title}")
            print(f"Total parsed semantic chunks: {len(db_chunks)}")
            assert len(db_chunks) >= 4, "PDF parser failed to extract chunks at boundaries!"

            # 3. Vectorize and seed ChromaDB vector store
            print("\nStep 3: Vectorizing chunks and seeding ChromaDB indexes...")
            chunks_payload = [
                {
                    "chunk_index": c.chunk_index,
                    "text_content": c.text_content,
                    "section_title": c.section_title,
                    "start_page": c.start_page,
                    "end_page": c.end_page
                }
                for c in db_chunks
            ]
            vector_repo.upsert_chunks(paper_id=paper.id, chunks=chunks_payload)
            print("ChromaDB vector seed complete.")

            # 4. Compile and Run LangGraph multi-agent workflow
            print("\nStep 4: Compiling LangGraph multi-agent workflow...")
            
            # Mock LLM Agent Nodes for offline verification
            with patch("app.graphs.workflow.AgentNodeRunner") as mock_runner_class:
                mock_runner = MagicMock()
                mock_runner_class.return_value = mock_runner
                
                # Mock Supervisor routing decision:
                # If query contains "methodology", route to explainer_agent.
                # If query contains "recall", route to qa_agent.
                def mock_supervisor(paper_title, paper_authors, paper_year, chat_history, user_query):
                    query_lower = user_query.lower()
                    if "methodology" in query_lower:
                        return SupervisorResponse(
                            selected_agent="explainer_agent",
                            reasoning="Routing to Explainer Agent for methodology details.",
                            needs_search=True,
                            search_query="Sentence Transformers ChromaDB methodology"
                        )
                    return SupervisorResponse(
                        selected_agent="qa_agent",
                        reasoning="Routing to QA Agent for numerical evaluations.",
                        needs_search=True,
                        search_query="query recall percentage boost results"
                    )
                mock_runner.run_supervisor.side_effect = mock_supervisor

                # Mock Explainer response
                mock_runner.run_explainer_agent.return_value = ExplainerResponse(
                    concept="Vector Embeddings & ChromaDB",
                    explanation="The system uses Sentence Transformers to represent paragraphs as 384-dimensional arrays.",
                    equations_or_code=["Equation: Similarity = cos(u, v)"],
                    agent_thoughts="Explained ChromaDB vector metric."
                )

                # Mock QA response
                mock_runner.run_qa_agent.return_value = QAResponse(
                    answer="The hybrid search model achieves a 25% recall boost.",
                    citation_sources=["Page 4 - 3. Results"],
                    agent_thoughts="Extracted results from the last page."
                )

                # Build graph
                graph = build_research_workflow(
                    db=db,
                    embedding_service=embedding_service,
                    openai_api_key="mock_key_offline"
                )
                
                # Test query 1: Explain methodology
                print("\nExecuting E2E Query #1: 'Explain the methodology details'...")
                state_1 = {
                    "user_query": "Explain the methodology details",
                    "paper_id": paper.id,
                    "chat_history": [],
                    "retrieved_context": "",
                    "selected_agent": "",
                    "needs_search": False,
                    "search_query": "",
                    "agent_thoughts": "",
                    "final_answer": "",
                    "citation_sources": []
                }
                out_1 = graph.invoke(state_1)
                print(f"Agent Node selected: {out_1['selected_agent']}")
                print(f"Retrieved Context size: {len(out_1['retrieved_context'])} chars")
                print(f"Final Answer:\n{out_1['final_answer']}")
                assert out_1["selected_agent"] == "explainer_agent"
                assert "384-dimensional" in out_1["retrieved_context"]
                
                # Test query 2: Recall stats
                print("\nExecuting E2E Query #2: 'What is the recall boost?'...")
                state_2 = {
                    "user_query": "What is the recall boost?",
                    "paper_id": paper.id,
                    "chat_history": [],
                    "retrieved_context": "",
                    "selected_agent": "",
                    "needs_search": False,
                    "search_query": "",
                    "agent_thoughts": "",
                    "final_answer": "",
                    "citation_sources": []
                }
                out_2 = graph.invoke(state_2)
                print(f"Agent Node selected: {out_2['selected_agent']}")
                print(f"Retrieved Context size: {len(out_2['retrieved_context'])} chars")
                print(f"Final Answer: {out_2['final_answer']}")
                assert out_2["selected_agent"] == "qa_agent"
                assert "25%" in out_2["final_answer"]

            # 5. Cascade cleanup and teardown verification
            print("\nStep 5: Verifying cascade deletions and file systems teardowns...")
            # Check files exist
            ingested_file = Path(paper.file_path)
            assert ingested_file.exists(), "Ingested PDF file should exist on disk before deletion"
            
            # Trigger delete
            success = paper_repo.delete(paper.id)
            assert success is True, "Relational delete failed"
            
            # Unlink PDFs
            if ingested_file.exists():
                ingested_file.unlink()
            
            # Clear Chroma vectors
            vector_repo.delete_paper_chunks(paper.id)
            
            # Verify database cleanups
            db.commit()
            
            # Check DB is clean
            deleted_paper = paper_repo.get_by_id(paper.id)
            assert deleted_paper is None, "Paper records were not cleared from SQL tables!"
            
            # Check Chroma is clean
            search_empty = vector_repo.similarity_search("recall", paper.id)
            assert len(search_empty) == 0, "Vector indexes were not cleared from ChromaDB!"
            
            print("Cascade deletions and indexes purge confirmed.")

            print("\n======================================================================")
            print("E2E PIPELINE INTEGRATION TEST COMPLETED SUCCESSFULLY!")
            print("All subsystems (DB, PDF parser, Chroma, Agents, Routing) work together.")
            print("======================================================================")

        finally:
            # Clean up local test PDF
            if pdf_path.exists():
                pdf_path.unlink()
            db.close()

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
