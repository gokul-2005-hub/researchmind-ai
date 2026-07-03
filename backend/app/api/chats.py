import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.api import ChatSessionResponse, MessageResponse, QueryRequest, QueryResponse
from app.services.memory_service import MemoryService
from app.services.embedding_service import get_embedding_service
from app.graphs.workflow import build_research_workflow
from app.core.config import settings
from app.middleware.auth import get_current_user
from app.models.orm import UserORM

logger = logging.getLogger("app.api.chats")

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.post("/{paper_id}/sessions", response_model=ChatSessionResponse)
async def create_session(
    paper_id: str, 
    title: str = "New Analysis Session",
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a new chat session thread for a research paper.
    """
    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    logged_in_user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    if not is_admin:
        target_user_id = logged_in_user_id
    else:
        target_user_id = user_id if user_id else logged_in_user_id

    memory_service = MemoryService(db)
    try:
        session = memory_service.create_session(paper_id=paper_id, title=title, user_id=target_user_id)
        return session
    except Exception as e:
        logger.exception("Failed to create chat session.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize chat thread: {str(e)}"
        )

@router.get("/{paper_id}/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(
    paper_id: str, 
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves all chat sessions associated with a specific paper ID.
    """
    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    logged_in_user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    if not is_admin:
        target_user_id = logged_in_user_id
    else:
        target_user_id = user_id
        
    memory_service = MemoryService(db)
    return memory_service.list_sessions(paper_id, user_id=target_user_id)

@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """
    Deletes a specific chat session thread.
    """
    memory_service = MemoryService(db)
    success = memory_service.delete_session(session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session with ID {session_id} not found."
        )
    return {"message": "Chat session deleted successfully.", "session_id": session_id}

@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def list_messages(session_id: str, db: Session = Depends(get_db)):
    """
    Retrieves all messages for a specific session thread.
    """
    memory_service = MemoryService(db)
    session = memory_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session with ID {session_id} not found."
        )
    return memory_service.get_messages(session_id)

@router.post("/sessions/{session_id}/query", response_model=QueryResponse)
async def query_agent_workflow(
    session_id: str,
    query_body: QueryRequest,
    db: Session = Depends(get_db)
):
    """
    Submits a query to the multi-agent system, executing the LangGraph orchestrator,
    resolving vector context search, generating a response, and saving to memory.
    """
    logger.info("Received query request for chat session: %s", session_id)
    memory_service = MemoryService(db)
    
    # 1. Fetch active session
    session = memory_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session with ID {session_id} not found."
        )

    # 2. Get past message history formatted for LLM ingestion
    history = memory_service.get_messages_for_llm(session_id, limit=8)

    # 3. Add current user query to database memory
    memory_service.add_user_message(session_id=session_id, content=query_body.user_query)

    # 4. Compile the orchestrator state graph
    embedding_service = get_embedding_service()
    try:
        graph = build_research_workflow(
            db=db,
            embedding_service=embedding_service,
            openai_api_key=settings.OPENAI_API_KEY
        )
    except Exception as e:
        logger.exception("Failed to compile LangGraph workflow.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workflow build compilation failure: {str(e)}"
        )

    # 5. Execute the compiled graph
    initial_state = {
        "user_query": query_body.user_query,
        "paper_id": session.paper_id,
        "chat_history": history,
        "retrieved_context": "",
        "selected_agent": "",
        "needs_search": False,
        "search_query": "",
        "agent_thoughts": "",
        "final_answer": "",
        "citation_sources": []
    }

    logger.info("Executing LangGraph multi-agent orchestration pipeline...")
    try:
        output_state = graph.invoke(initial_state)
    except Exception as e:
        logger.exception("Error occurred during multi-agent graph execution.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Orchestration pipeline execution error: {str(e)}"
        )

    # 6. Commit the final agent response details to memory
    try:
        memory_service.add_agent_response(
            session_id=session_id,
            agent_name=output_state["selected_agent"],
            content=output_state["final_answer"],
            agent_thoughts=output_state["agent_thoughts"]
        )
    except Exception as e:
        logger.error("Failed to commit agent response to database memory: %s", str(e))
        # Proceed with return since output is already generated

    return QueryResponse(
        final_answer=output_state["final_answer"],
        selected_agent=output_state["selected_agent"],
        agent_thoughts=output_state["agent_thoughts"],
        citation_sources=output_state["citation_sources"]
    )
