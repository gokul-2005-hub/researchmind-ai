import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.api import NoteResponse, NoteSaveRequest
from app.repositories.sqlalchemy_repo import SQLAlchemyNoteRepository, SQLAlchemyPaperRepository
from app.core.exceptions import EntityNotFoundError
from app.middleware.auth import get_current_user
from app.models.orm import UserORM

logger = logging.getLogger("app.api.notes")

router = APIRouter(prefix="/notes", tags=["Notes"])

@router.get("/{paper_id}", response_model=NoteResponse)
async def get_note(
    paper_id: str,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves the research note associated with a specific paper ID.
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No research notes found for paper ID {paper_id}."
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
