import os
import uuid
import logging
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ProcessingError
from app.parsers.pdf_parser import PDFParser
from app.parsers.chunker import SemanticChunker
from app.repositories.sqlalchemy_repo import SQLAlchemyPaperRepository
from app.models.orm import PaperORM, PaperChunkORM

logger = logging.getLogger("app.services.pdf")

class PDFService:
    def __init__(self, db: Session):
        self.db = db
        self.paper_repo = SQLAlchemyPaperRepository(db)
        self.parser = PDFParser()
        self.chunker = SemanticChunker(
            chunk_size=1000,
            chunk_overlap=150
        )

    def process_pdf_upload(self, file_content: bytes, original_filename: str, user_id: Optional[str] = None) -> Tuple[PaperORM, List[PaperChunkORM]]:
        """
        Coordinates the entire PDF ingestion pipeline:
        1. Checks size constraints
        2. Saves PDF file to storage disk
        3. Parses text, section boundaries, and metadata
        4. Saves paper details in relational db
        5. Computes semantic chunks and saves them in relational db
        """
        # Validate file size
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_content) > max_bytes:
            raise ProcessingError(
                message=f"File exceeds maximum size constraint of {settings.MAX_UPLOAD_SIZE_MB}MB.",
                details={"file_size_bytes": len(file_content)}
            )

        # Generate safe unique filename
        file_id = str(uuid.uuid4())
        file_extension = Path(original_filename).suffix
        if not file_extension.lower() == ".pdf":
            raise ProcessingError("Invalid file type. Only PDF documents are supported.")
            
        unique_filename = f"{file_id}{file_extension}"
        dest_path = settings.UPLOAD_PATH / unique_filename

        logger.info("Saving uploaded PDF to disk at: %s", dest_path)
        try:
            with open(dest_path, "wb") as f:
                f.write(file_content)
        except Exception as e:
            logger.exception("Failed to write PDF file to disk.")
            raise ProcessingError(f"Failed to persist file on disk: {str(e)}")

        # Parse the PDF
        try:
            parsed_data = self.parser.parse(str(dest_path))
        except Exception as e:
            # Clean up saved file on parsing error
            if dest_path.exists():
                dest_path.unlink()
            logger.exception("Error parsing PDF structure.")
            raise ProcessingError(f"PDF extraction failed: {str(e)}")

        # Extract values
        meta = parsed_data["metadata"]
        
        # Save Paper in database
        try:
            paper = self.paper_repo.create(
                title=meta["title"],
                authors=meta["authors"],
                file_path=str(dest_path),
                publication_year=meta["publication_year"],
                journal_venue=meta["journal_venue"],
                doi=meta["doi"],
                user_id=user_id
            )
        except Exception as e:
            if dest_path.exists():
                dest_path.unlink()
            raise ProcessingError(f"Failed to save paper meta in database: {str(e)}")

        # Create Semantic Chunks
        try:
            chunks_data = self.chunker.chunk_document(parsed_data)
            
            db_chunks: List[PaperChunkORM] = []
            for chunk_val in chunks_data:
                db_chunk = PaperChunkORM(
                    paper_id=paper.id,
                    chunk_index=chunk_val["chunk_index"],
                    text_content=chunk_val["text_content"],
                    section_title=chunk_val["section_title"],
                    start_page=chunk_val["start_page"],
                    end_page=chunk_val["end_page"]
                )
                self.db.add(db_chunk)
                db_chunks.append(db_chunk)
            
            self.db.commit()
            
            # Refresh chunks to populate generated UUID IDs
            for chunk in db_chunks:
                self.db.refresh(chunk)
                
            logger.info("Completed parsing and storing Paper %s and its %d chunks.", paper.id, len(db_chunks))
            return paper, db_chunks
            
        except Exception as e:
            self.db.rollback()
            # Clean up the paper and file since chunks failed
            self.paper_repo.delete(paper.id)
            if dest_path.exists():
                dest_path.unlink()
            logger.exception("Failed to chunk and save paper chunks.")
            raise ProcessingError(f"Chunk processing failed: {str(e)}")
