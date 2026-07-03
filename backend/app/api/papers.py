import os
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pathlib import Path

from app.database.connection import get_db
from app.schemas.api import PaperResponse
from app.services.pdf_service import PDFService
from app.services.embedding_service import get_embedding_service
from app.vectorstore.chroma_store import ChromaRepository
from app.repositories.sqlalchemy_repo import SQLAlchemyPaperRepository
from app.core.exceptions import EntityNotFoundError, ProcessingError
from app.middleware.auth import get_current_user
from app.models.orm import UserORM

def bg_index_chunks(paper_id: str, chunks_payload: list):
    """
    Executes heavy SentenceTransformer embedding calculations and ChromaDB 
    indexing asynchronously to keep API upload response times low.
    """
    try:
        logger.info("Background Task: Starting vector indexing for paper %s...", paper_id)
        embedding_service = get_embedding_service()
        chroma_repo = ChromaRepository(embedding_service)
        chroma_repo.upsert_chunks(paper_id=paper_id, chunks=chunks_payload)
        logger.info("Background Task: Vector indexing completed for paper %s.", paper_id)
    except Exception as e:
        logger.error("Background Task Failure: Vector indexing failed for paper %s: %s", paper_id, str(e))

logger = logging.getLogger("app.api.papers")

router = APIRouter(prefix="/papers", tags=["Papers"])

@router.post("/", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def upload_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Uploads an academic PDF, extracts layout structures, segments sections,
    seeds database tables, and indexes dense vectors in a background thread.
    """
    logger.info("Received PDF upload request for file: %s from user '%s'", file.filename, current_user["username"])
    
    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    user_id = user_rec.id if user_rec else None
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF files are allowed."
        )

    try:
        # Read file bytes
        content = await file.read()
        
        # 1. Coordinate Ingestion & relational DB save (fast, <1-2s)
        pdf_service = PDFService(db)
        paper, db_chunks = pdf_service.process_pdf_upload(
            file_content=content,
            original_filename=file.filename,
            user_id=user_id
        )
        
        # 2. Extract chunk dictionary payloads
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
        
        # 3. Schedule the CPU-heavy vector calculations in a background task
        logger.info("Enqueuing vector indexing background task for paper %s (%d chunks)", paper.id, len(chunks_payload))
        background_tasks.add_task(bg_index_chunks, paper.id, chunks_payload)
        
        return paper

    except ProcessingError as e:
        logger.error("ProcessingError during ingestion: %s", e.message)
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.exception("Unexpected error during paper upload.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during processing: {str(e)}"
        )

@router.get("/", response_model=List[PaperResponse])
async def list_papers(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves uploaded research papers. Admin can view all or filter by user_id.
    Researchers can only view their own papers.
    """
    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    logged_in_user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    if not is_admin:
        # Standard user is restricted to their own papers
        target_user_id = logged_in_user_id
    else:
        # Admin can view all or filter by user_id
        target_user_id = user_id
        
    repo = SQLAlchemyPaperRepository(db)
    return repo.list_all(user_id=target_user_id)

@router.get("/{paper_id}", response_model=PaperResponse)
async def get_paper(paper_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Retrieves metadata details for a specific paper, verifying ownership.
    """
    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    repo = SQLAlchemyPaperRepository(db)
    paper = repo.get_by_id(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID {paper_id} not found."
        )
    if not is_admin and paper.user_id and paper.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this paper."
        )
    return paper

@router.delete("/{paper_id}", status_code=status.HTTP_200_OK)
async def delete_paper(paper_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Deletes a paper, removes its PDF file from disk, cleans up SQL tables,
    and removes indexed vector points in ChromaDB (ownership protected).
    """
    logger.info("Received request to delete paper: %s from user '%s'", paper_id, current_user["username"])
    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    repo = SQLAlchemyPaperRepository(db)
    
    paper = repo.get_by_id(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID {paper_id} not found."
        )
    if not is_admin and paper.user_id and paper.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this paper."
        )
        
    file_path = paper.file_path

    # 1. Clean up Vector DB index chunks
    try:
        embedding_service = get_embedding_service()
        chroma_repo = ChromaRepository(embedding_service)
        chroma_repo.delete_paper_chunks(paper_id)
    except Exception as e:
        logger.error("Failed to delete vector database chunks: %s", str(e))
        # Proceed with deletion anyway

    # 2. Clean up SQL relational tables (cascades sessions, notes, chunks)
    success = repo.delete(paper_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete paper records from database."
        )

    # 3. Remove local PDF file from disk
    try:
        p = Path(file_path)
        if p.exists():
            p.unlink()
            logger.info("PDF file unlinked from storage disk: %s", file_path)
    except Exception as e:
        logger.error("Failed to remove PDF file from disk %s: %s", file_path, str(e))
        # Proceed with deletion anyway

    return {"message": "Paper and associated records deleted successfully.", "paper_id": paper_id}

import io
import zipfile
from fastapi.responses import StreamingResponse, FileResponse

@router.get("/{paper_id}/download")
async def download_paper(paper_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Downloads the raw PDF file for a specific paper, verifying access permission.
    """
    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    repo = SQLAlchemyPaperRepository(db)
    paper = repo.get_by_id(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID {paper_id} not found."
        )
    if not is_admin and paper.user_id and paper.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this paper."
        )
        
    file_path = Path(paper.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found on disk."
        )
        
    safe_title = "".join(c for c in paper.title if c.isalnum() or c in (" ", "_", "-")).strip()
    if not safe_title:
        safe_title = "paper"
    download_filename = f"{safe_title}.pdf"
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=download_filename
    )

@router.get("/{paper_id}/view")
async def view_paper(paper_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Serves the uncompressed raw PDF directly for in-browser viewing.
    """
    user_rec = db.query(UserORM).filter_by(username=current_user["username"]).first()
    user_id = user_rec.id if user_rec else None
    is_admin = current_user.get("role") == "admin" or current_user["username"] == "admin"
    
    repo = SQLAlchemyPaperRepository(db)
    paper = repo.get_by_id(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID {paper_id} not found."
        )
    if not is_admin and paper.user_id and paper.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this paper."
        )
        
    file_path = Path(paper.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found on disk."
        )
        
    safe_title = "".join(c for c in paper.title if c.isalnum() or c in (" ", "_", "-")).strip()
    if not safe_title:
        safe_title = "paper"
    download_filename = f"{safe_title}.pdf"
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=download_filename
    )
