import logging
from typing import List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session

from app.graphs.state import AgentState
from app.agents.nodes import AgentNodeRunner
from app.repositories.sqlalchemy_repo import SQLAlchemyPaperRepository
from app.vectorstore.chroma_store import ChromaRepository
from app.services.embedding_service import BaseEmbeddingService

logger = logging.getLogger("app.graphs.workflow")

def build_research_workflow(
    db: Session, 
    embedding_service: BaseEmbeddingService, 
    openai_api_key: str
) -> StateGraph:
    """
    Constructs and compiles the LangGraph multi-agent orchestration state graph.
    Injects request-scoped SQL session and vector store configurations.
    """
    
    # Initialize resources
    agent_runner = AgentNodeRunner(api_key=openai_api_key)
    paper_repo = SQLAlchemyPaperRepository(db)
    vector_repo = ChromaRepository(embedding_service)

    # --- Node Definitions ---

    def load_metadata_node(state: AgentState) -> Dict[str, Any]:
        """Loads paper details from database into graph state."""
        paper_id = state["paper_id"]
        logger.debug("Graph: Loading metadata for paper %s", paper_id)
        
        paper = paper_repo.get_by_id(paper_id)
        if not paper:
            return {
                "paper_title": "Unknown Document",
                "paper_authors": ["Unknown"],
                "paper_year": None
            }
            
        return {
            "paper_title": paper.title,
            "paper_authors": paper.authors,
            "paper_year": paper.publication_year
        }

    def supervisor_node(state: AgentState) -> Dict[str, Any]:
        """Runs the Supervisor agent to route query."""
        res = agent_runner.run_supervisor(
            paper_title=state["paper_title"],
            paper_authors=state["paper_authors"],
            paper_year=state["paper_year"],
            chat_history=state["chat_history"],
            user_query=state["user_query"]
        )
        return {
            "selected_agent": res.selected_agent,
            "needs_search": res.needs_search,
            "search_query": res.search_query
        }

    def retrieval_node(state: AgentState) -> Dict[str, Any]:
        """Retrieves semantic chunks from vector store or database based on selected agent."""
        selected_agent = state["selected_agent"]
        paper_id = state["paper_id"]
        
        # For summarization, perform section-diverse/layout-aware retrieval
        if selected_agent == "summary_agent":
            logger.info("Graph: Performing section-aware database retrieval for summary agent...")
            try:
                from app.models.orm import PaperChunkORM
                db_chunks = db.query(PaperChunkORM).filter(PaperChunkORM.paper_id == paper_id).order_by(PaperChunkORM.chunk_index.asc()).all()
                if db_chunks:
                    logger.info("Graph: Retrieved %d total chunks from DB.", len(db_chunks))
                    
                    # Determine chunk limits based on LLM provider to avoid Groq rate limit errors
                    max_total = 22 if agent_runner.is_groq else 50
                    
                    selected_chunks = []
                    if len(db_chunks) <= max_total:
                        selected_chunks = db_chunks
                    else:
                        if agent_runner.is_groq:
                            # Strict limits for Groq free tier (TPM limit: 12000 tokens)
                            first_count, last_count, mid_count = 8, 6, 8
                        else:
                            first_count, last_count, mid_count = 15, 10, 25
                            
                        # First chunks (Abstract, Intro, Objectives)
                        selected_chunks.extend(db_chunks[:first_count])
                        
                        # Last chunks (Discussion, Conclusion, Future Work)
                        last_chunks = db_chunks[-last_count:]
                        
                        # Sample middle chunks (Methodology, Results)
                        middle_chunks = db_chunks[first_count:-last_count]
                        sample_rate = max(1, len(middle_chunks) // mid_count)
                        sampled_middle = middle_chunks[::sample_rate]
                        
                        # Combine and sort by chunk index
                        combined_ids = set(c.id for c in selected_chunks + last_chunks + sampled_middle)
                        selected_chunks = [c for c in db_chunks if c.id in combined_ids][:max_total]
                    
                    formatted_chunks = []
                    citation_sources = []
                    for idx, c in enumerate(selected_chunks):
                        chunk_repr = f"--- Chunk {idx} (Section: {c.section_title} | Pages: {c.start_page}-{c.end_page}) ---\n{c.text_content}\n"
                        formatted_chunks.append(chunk_repr)
                        citation_sources.append(f"Section: {c.section_title} (Page {c.start_page})")
                        
                    retrieved_context = "\n".join(formatted_chunks)
                    logger.info("Graph: Prepared section-aware context of %d chunks.", len(selected_chunks))
                    return {
                        "retrieved_context": retrieved_context,
                        "citation_sources": citation_sources
                    }
            except Exception as e:
                logger.exception("Graph: Section-aware chunk loading failed. Falling back to vector search.")
                
        # Default similarity search fallback
        search_query = state["search_query"]
        if not search_query.strip() and selected_agent == "summary_agent":
            search_query = "abstract introduction methodology results conclusion summary overview"
        logger.info("Graph: Retrieval Agent executing vector search for '%s'...", search_query)
        
        results = vector_repo.similarity_search(
            query=search_query,
            paper_id=paper_id,
            k=12 # Retrieve top 12 chunks (expanded for maximum accuracy and completeness)
        )
        
        if not results:
            logger.warning("Graph: No chunks retrieved from vector index.")
            return {"retrieved_context": "No relevant context found in paper."}
            
        formatted_chunks = []
        citation_sources = []
        for idx, r in enumerate(results):
            sec = r["metadata"]["section_title"]
            page_start = r["metadata"]["start_page"]
            page_end = r["metadata"]["end_page"]
            
            chunk_repr = f"--- Chunk {idx} (Section: {sec} | Pages: {page_start}-{page_end}) ---\n{r['text_content']}\n"
            formatted_chunks.append(chunk_repr)
            citation_sources.append(f"Section: {sec} (Page {page_start})")

        retrieved_context = "\n".join(formatted_chunks)
        return {
            "retrieved_context": retrieved_context,
            "citation_sources": citation_sources
        }

    def qa_node(state: AgentState) -> Dict[str, Any]:
        """Executes the Question Answering agent."""
        res = agent_runner.run_qa_agent(
            paper_title=state["paper_title"],
            paper_authors=state["paper_authors"],
            retrieved_context=state["retrieved_context"],
            user_query=state["user_query"],
            chat_history=state["chat_history"]
        )
        return {
            "final_answer": res.answer,
            "agent_thoughts": res.agent_thoughts,
            "citation_sources": state.get("citation_sources", []) + res.citation_sources
        }

    def explainer_node(state: AgentState) -> Dict[str, Any]:
        """Executes the Explainer agent."""
        res = agent_runner.run_explainer_agent(
            paper_title=state["paper_title"],
            paper_authors=state["paper_authors"],
            retrieved_context=state["retrieved_context"],
            user_query=state["user_query"],
            chat_history=state["chat_history"]
        )
        
        # Build nice markdown layout
        answer = f"### Concept Explanation: **{res.concept}**\n\n{res.explanation}\n"
        if res.equations_or_code:
            answer += "\n#### Formulas & Notation Details:\n"
            for eq in res.equations_or_code:
                answer += f"- {eq}\n"
                
        return {
            "final_answer": answer,
            "agent_thoughts": res.agent_thoughts
        }

    def contribution_node(state: AgentState) -> Dict[str, Any]:
        """Executes the Contribution agent."""
        res = agent_runner.run_contribution_agent(
            paper_title=state["paper_title"],
            paper_authors=state["paper_authors"],
            retrieved_context=state["retrieved_context"],
            user_query=state["user_query"],
            chat_history=state["chat_history"]
        )
        
        # Build nice markdown structure
        answer = "### Core Novelty & Contributions\n\n"
        answer += f"**Novelty Statement:**\n{res.novelty}\n\n"
        
        answer += "**Key claimed contributions:**\n"
        for c in res.contributions:
            answer += f"- {c}\n"
            
        if res.limitations:
            answer += "\n**Limitations & Boundaries:**\n"
            for lim in res.limitations:
                answer += f"- {lim}\n"
                
        if res.future_work:
            answer += "\n**Future Research Directions:**\n"
            for fut in res.future_work:
                answer += f"- {fut}\n"
                
        return {
            "final_answer": answer,
            "agent_thoughts": res.agent_thoughts
        }

    def citation_node(state: AgentState) -> Dict[str, Any]:
        """Executes the Citation and Reference agent."""
        res = agent_runner.run_citation_agent(
            paper_title=state["paper_title"],
            paper_authors=state["paper_authors"],
            retrieved_context=state["retrieved_context"],
            user_query=state["user_query"],
            chat_history=state["chat_history"]
        )
        
        answer = "### Reference & Citation Extractions\n\n"
        if not res.extracted_citations:
            answer += "No bibliographic references were identified in the current context."
        else:
            for c in res.extracted_citations:
                answer += f"- **Key:** `{c.citation_key}` | **Year:** {c.year}\n"
                answer += f"  - **Reference:** *{c.author_venue}*\n"
                if c.doi:
                    answer += f"  - **DOI Link:** [https://doi.org/{c.doi}](https://doi.org/{c.doi})\n"
                answer += "\n"
                
        return {
            "final_answer": answer,
            "agent_thoughts": res.agent_thoughts
        }

    def summary_node(state: AgentState) -> Dict[str, Any]:
        """Executes the Summary agent."""
        res = agent_runner.run_summary_agent(
            paper_title=state["paper_title"],
            paper_authors=state["paper_authors"],
            retrieved_context=state["retrieved_context"],
            user_query=state["user_query"],
            chat_history=state["chat_history"]
        )
        
        answer = "### Executive Summary\n"
        answer += f"{res.executive_summary}\n\n"
        
        answer += "### Key Scientific Findings\n"
        for f in res.key_findings:
            answer += f"- {f}\n"
            
        answer += "\n### Methodology & Implementation Summary\n"
        answer += f"{res.methodology_summary}\n"
        
        if res.section_summaries:
            for sec_name, sec_summary in res.section_summaries.items():
                answer += f"\n### {sec_name}\n{sec_summary}\n"
                
        return {
            "final_answer": answer,
            "agent_thoughts": res.agent_thoughts
        }

    def direct_response_node(state: AgentState) -> Dict[str, Any]:
        """Handles chit-chat or generic greetings directly via LLM completion."""
        logger.info("Executing Direct Response (chit-chat)...")
        messages = [
            {"role": "system", "content": "You are a helpful ResearchMind Assistant. Provide a brief, polite, and direct response to greetings or general chat queries."},
            *state["chat_history"],
            {"role": "user", "content": state["user_query"]}
        ]
        try:
            # We run a basic direct chat completion
            response = agent_runner.client.chat.completions.create(
                model=agent_runner.model_name,
                messages=messages,
                temperature=0.5
            )
            ans = response.choices[0].message.content
            return {
                "final_answer": ans,
                "agent_thoughts": "Supervisor routed directly to chit-chat. Generated general response."
            }
        except Exception as e:
            logger.exception("Direct response failure.")
            return {
                "final_answer": "Hello! I am ready. Please upload a research paper and ask me questions about it.",
                "agent_thoughts": f"Direct response failed: {str(e)}. Fallback issued."
            }

    def refinement_node(state: AgentState) -> Dict[str, Any]:
        """Runs the Verification & Refinement Agent to check factual accuracy."""
        drafted_answer = state["final_answer"]
        user_query = state["user_query"]
        retrieved_context = state["retrieved_context"]
        
        # Don't verify direct chit-chat greetings or empty context queries
        if not retrieved_context or state["selected_agent"] == "direct_response":
            return {}
            
        logger.info("Graph: Executing verification audit node on drafted answer...")
        try:
            res = agent_runner.run_verification_agent(
                retrieved_context=retrieved_context,
                user_query=user_query,
                drafted_answer=drafted_answer
            )
            
            # If corrections were made, update the final answer and log thoughts
            refined_thoughts = (
                f"{state['agent_thoughts']}\n\n[Verification Agent]: "
                f"Factual review outcome - fully correct: {res.is_fully_correct}. "
                f"Evaluation: {res.verification_thoughts}"
            )
            if res.corrections_made:
                refined_thoughts += f"\nCorrections applied: {res.corrections_made}"
                
            return {
                "final_answer": res.refined_answer,
                "agent_thoughts": refined_thoughts
            }
        except Exception as e:
            logger.error("Factual verification fallback triggered: %s", str(e))
            return {}

    # --- Graph Construction ---
    
    workflow = StateGraph(AgentState)
    
    # Register Nodes
    workflow.add_node("load_metadata", load_metadata_node)
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("retrieval", retrieval_node)
    workflow.add_node("qa_agent", qa_node)
    workflow.add_node("explainer_agent", explainer_node)
    workflow.add_node("contribution_agent", contribution_node)
    workflow.add_node("citation_agent", citation_node)
    workflow.add_node("summary_agent", summary_node)
    workflow.add_node("direct_response", direct_response_node)
    workflow.add_node("refinement", refinement_node)
    
    # Establish Entry
    workflow.set_entry_point("load_metadata")
    workflow.add_edge("load_metadata", "supervisor")

    # Define Conditional Routing from Supervisor
    def route_from_supervisor(state: AgentState) -> str:
        if state["needs_search"] or state["selected_agent"] == "summary_agent":
            return "retrieval"
        # If no search is needed, route directly to the specialist agent node
        return state["selected_agent"]

    workflow.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "retrieval": "retrieval",
            "qa_agent": "qa_agent",
            "explainer_agent": "explainer_agent",
            "contribution_agent": "contribution_agent",
            "citation_agent": "citation_agent",
            "summary_agent": "summary_agent",
            "direct_response": "direct_response"
        }
    )

    # Define Routing from Retrieval Agent to Specialists
    def route_from_retrieval(state: AgentState) -> str:
        # Route to whatever agent supervisor originally selected
        agent = state["selected_agent"]
        if agent in ["qa_agent", "explainer_agent", "contribution_agent", "citation_agent", "summary_agent"]:
            return agent
        return "qa_agent" # Fallback

    workflow.add_conditional_edges(
        "retrieval",
        route_from_retrieval,
        {
            "qa_agent": "qa_agent",
            "explainer_agent": "explainer_agent",
            "contribution_agent": "contribution_agent",
            "citation_agent": "citation_agent",
            "summary_agent": "summary_agent"
        }
    )

    # Context-based specialist nodes route to the Refinement/Verification Agent
    workflow.add_edge("qa_agent", "refinement")
    workflow.add_edge("explainer_agent", "refinement")
    workflow.add_edge("contribution_agent", "refinement")
    workflow.add_edge("citation_agent", "refinement")
    workflow.add_edge("summary_agent", "refinement")
    
    # Direct response node (greetings/chit-chat) and refinement node end execution
    workflow.add_edge("direct_response", END)
    workflow.add_edge("refinement", END)

    # Compile the graph
    compiled_graph = workflow.compile()
    logger.info("LangGraph workflow compiled successfully with Factual Verification Agent.")
    return compiled_graph
