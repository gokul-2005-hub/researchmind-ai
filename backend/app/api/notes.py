import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.api import NoteResponse, NoteSaveRequest
from app.repositories.sqlalchemy_repo import SQLAlchemyNoteRepository, SQLAlchemyPaperRepository
from app.core.exceptions import EntityNotFoundError
from app.middleware.auth import get_current_user
from app.models.orm import UserORM, PaperORM, PaperChunkORM
from app.agents.nodes import AgentNodeRunner
from app.core.config import settings

logger = logging.getLogger("app.api.notes")

router = APIRouter(prefix="/notes", tags=["Notes"])

def generate_paper_summary(db: Session, paper_id: str, user_id: Optional[str] = None):
    """
    Synchronously extracts the abstract/intro chunks of the paper and queries
    the LLM to generate a structured analysis as the default note.
    """
    try:
        paper = db.query(PaperORM).filter_by(id=paper_id).first()
        if not paper:
            return None
            
        # Get first 3 chunks containing abstract/intro
        chunks = db.query(PaperChunkORM).filter_by(paper_id=paper_id).order_by(PaperChunkORM.chunk_index.asc()).limit(3).all()
        context_text = ""
        if chunks:
            context_text = "\n\n".join([c.text_content for c in chunks])
        else:
            context_text = paper.title
            
        runner = AgentNodeRunner(api_key=settings.OPENAI_API_KEY)
        
        sys_prompt = (
            "You are an expert AI Research Assistant.\n"
            "Analyze the provided text (abstract/introduction of a research paper) and write a professional, "
            "comprehensive, and beautifully formatted Markdown summary and analysis of the paper.\n"
            "Structure your response with the following sections:\n"
            "# Executive Summary\n"
            "[Provide a high-level summary of the paper's core ideas, goals, and results]\n\n"
            "## Key Contributions\n"
            "[List the key contributions of the research in a clean bulleted list]\n\n"
            "## Methodology\n"
            "[Describe the study methodology, models, and experimental setups used]\n\n"
            "## Critical Analysis & Limitations\n"
            "[Discuss limitations, assumptions, and potential future research directions]\n"
            "Use clean Markdown with bolding and lists for readability."
        )
        
        user_prompt = f"Title: {paper.title}\nAuthors: {', '.join(paper.authors)}\n\nText:\n{context_text}"
        
        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = runner.client.chat.completions.create(
            model=runner.model_name,
            messages=messages,
            temperature=0.3
        )
        summary_content = response.choices[0].message.content
        
        note_repo = SQLAlchemyNoteRepository(db)
        note = note_repo.create_or_update(
            paper_id=paper_id,
            title=f"Analysis: {paper.title}",
            content=summary_content,
            user_id=user_id
        )
        return note
    except Exception as e:
        logger.error("Failed to generate paper summary: %s", str(e))
        return None

@router.get("/{paper_id}", response_model=NoteResponse)
async def get_note(
    paper_id: str,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves the research note associated with a specific paper ID.
    If no note exists, it automatically generates a default summary.
    """
    paper_repo = SQLAlchemyPaperRepository(db)
    paper = paper_repo.get_by_id(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID {paper_id} not found."
        )

    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    logged_in_user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    if not is_admin:
        target_user_id = logged_in_user_id
    else:
        target_user_id = user_id if user_id else logged_in_user_id

    note_repo = SQLAlchemyNoteRepository(db)
    note = note_repo.get_by_paper_id(paper_id, user_id=target_user_id)
    if not note:
        # Automatically generate paper summary on first request
        note = generate_paper_summary(db, paper_id, target_user_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No research notes found or failed to auto-generate for paper ID {paper_id}."
            )
    return note

@router.post("/{paper_id}", response_model=NoteResponse)
async def save_note(
    paper_id: str,
    note_data: NoteSaveRequest,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Creates or updates the research note associated with a specific paper ID.
    """
    paper_repo = SQLAlchemyPaperRepository(db)
    paper = paper_repo.get_by_id(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID {paper_id} not found."
        )

    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    logged_in_user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    if not is_admin:
        target_user_id = logged_in_user_id
    else:
        target_user_id = user_id if user_id else logged_in_user_id

    if is_admin and target_user_id and target_user_id != logged_in_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators are not allowed to edit notes in other users' profiles."
        )

    note_repo = SQLAlchemyNoteRepository(db)
    try:
        note = note_repo.create_or_update(
            paper_id=paper_id,
            title=note_data.title,
            content=note_data.content,
            user_id=target_user_id
        )
        return note
    except Exception as e:
        logger.exception("Failed to save research notes.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save notes: {str(e)}"
        )
