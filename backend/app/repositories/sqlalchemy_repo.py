import logging
from datetime import datetime
from typing import List, Optional, Any
from sqlalchemy.orm import Session
from app.domain.repositories import PaperRepository, ChatRepository, NoteRepository
from app.models.orm import PaperORM, ChatSessionORM, MessageORM, NoteORM

logger = logging.getLogger("app.repositories")

class SQLAlchemyPaperRepository(PaperRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, paper_id: str) -> Optional[PaperORM]:
        try:
            return self.db.query(PaperORM).filter(PaperORM.id == paper_id).first()
        except Exception as e:
            logger.error("Error fetching paper %s: %s", paper_id, str(e))
            return None

    def list_all(self, user_id: Optional[str] = None) -> List[PaperORM]:
        try:
            query = self.db.query(PaperORM)
            if user_id:
                query = query.filter(PaperORM.user_id == user_id)
            return query.order_by(PaperORM.uploaded_at.desc()).all()
        except Exception as e:
            logger.error("Error listing papers: %s", str(e))
            return []

    def create(self, title: str, authors: List[str], file_path: str, 
               publication_year: Optional[int] = None, 
               journal_venue: Optional[str] = None, 
               doi: Optional[str] = None,
               user_id: Optional[str] = None) -> PaperORM:
        paper = PaperORM(
            title=title,
            authors=authors,
            file_path=file_path,
            publication_year=publication_year,
            journal_venue=journal_venue,
            doi=doi,
            user_id=user_id
        )
        try:
            self.db.add(paper)
            self.db.commit()
            self.db.refresh(paper)
            return paper
        except Exception as e:
            self.db.rollback()
            logger.exception("Error creating paper record: %s", str(e))
            raise

    def delete(self, paper_id: str) -> bool:
        try:
            paper = self.db.query(PaperORM).filter(PaperORM.id == paper_id).first()
            if not paper:
                return False
            self.db.delete(paper)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error("Error deleting paper %s: %s", paper_id, str(e))
            return False


class SQLAlchemyChatRepository(ChatRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_session_by_id(self, session_id: str) -> Optional[ChatSessionORM]:
        try:
            return self.db.query(ChatSessionORM).filter(ChatSessionORM.id == session_id).first()
        except Exception as e:
            logger.error("Error fetching chat session %s: %s", session_id, str(e))
            return None

    def list_sessions_by_paper_id(self, paper_id: str, user_id: Optional[str] = None) -> List[ChatSessionORM]:
        try:
            query = self.db.query(ChatSessionORM).filter(ChatSessionORM.paper_id == paper_id)
            if user_id:
                query = query.filter((ChatSessionORM.user_id == user_id) | (ChatSessionORM.user_id == None))
            return query.order_by(ChatSessionORM.created_at.desc()).all()
        except Exception as e:
            logger.error("Error listing sessions for paper %s: %s", paper_id, str(e))
            return []

    def create_session(self, paper_id: str, title: str, user_id: Optional[str] = None) -> ChatSessionORM:
        session = ChatSessionORM(
            paper_id=paper_id,
            title=title,
            user_id=user_id
        )
        try:
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
            return session
        except Exception as e:
            self.db.rollback()
            logger.exception("Error creating chat session: %s", str(e))
            raise

    def delete_session(self, session_id: str) -> bool:
        try:
            session = self.db.query(ChatSessionORM).filter(ChatSessionORM.id == session_id).first()
            if not session:
                return False
            self.db.delete(session)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error("Error deleting session %s: %s", session_id, str(e))
            return False

    def get_messages_by_session_id(self, session_id: str) -> List[MessageORM]:
        try:
            return self.db.query(MessageORM).filter(MessageORM.session_id == session_id).order_by(MessageORM.created_at.asc()).all()
        except Exception as e:
            logger.error("Error fetching messages for session %s: %s", session_id, str(e))
            return []

    def add_message(self, session_id: str, sender: str, content: str, 
                    agent_thoughts: Optional[str] = None) -> MessageORM:
        message = MessageORM(
            session_id=session_id,
            sender=sender,
            content=content,
            agent_thoughts=agent_thoughts
        )
        try:
            self.db.add(message)
            self.db.commit()
            self.db.refresh(message)
            return message
        except Exception as e:
            self.db.rollback()
            logger.exception("Error adding message to session %s: %s", session_id, str(e))
            raise


class SQLAlchemyNoteRepository(NoteRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_paper_id(self, paper_id: str, user_id: Optional[str] = None) -> Optional[NoteORM]:
        try:
            query = self.db.query(NoteORM).filter(NoteORM.paper_id == paper_id)
            if user_id:
                query = query.filter((NoteORM.user_id == user_id) | (NoteORM.user_id == None))
            return query.first()
        except Exception as e:
            logger.error("Error fetching note for paper %s: %s", paper_id, str(e))
            return None

    def create_or_update(self, paper_id: str, title: str, content: str, user_id: Optional[str] = None) -> NoteORM:
        try:
            query = self.db.query(NoteORM).filter(NoteORM.paper_id == paper_id)
            if user_id:
                query = query.filter((NoteORM.user_id == user_id) | (NoteORM.user_id == None))
            note = query.first()
            if note:
                note.title = title
                note.content = content
                note.updated_at = datetime.utcnow()
            else:
                note = NoteORM(
                    paper_id=paper_id,
                    title=title,
                    content=content,
                    user_id=user_id
                )
                self.db.add(note)
            self.db.commit()
            self.db.refresh(note)
            return note
        except Exception as e:
            self.db.rollback()
            logger.exception("Error saving note for paper %s: %s", paper_id, str(e))
            raise

    def delete(self, note_id: str) -> bool:
        try:
            note = self.db.query(NoteORM).filter(NoteORM.id == note_id).first()
            if not note:
                return False
            self.db.delete(note)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error("Error deleting note %s: %s", note_id, str(e))
            return False
