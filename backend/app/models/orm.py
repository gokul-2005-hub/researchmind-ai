import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, LargeBinary
from sqlalchemy.orm import relationship, deferred
from app.database.connection import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class PaperORM(Base):
    __tablename__ = "papers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(500), nullable=False)
    authors = Column(JSON, nullable=False, default=list) # Serialized list of author strings
    publication_year = Column(Integer, nullable=True)
    journal_venue = Column(String(250), nullable=True)
    doi = Column(String(100), nullable=True)
    file_path = Column(String(500), nullable=False)
    pdf_data = deferred(Column(LargeBinary, nullable=True))
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Relationships
    sessions = relationship("ChatSessionORM", back_populates="paper", cascade="all, delete-orphan")
    notes = relationship("NoteORM", back_populates="paper", cascade="all, delete-orphan")
    chunks = relationship("PaperChunkORM", back_populates="paper", cascade="all, delete-orphan")

class ChatSessionORM(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(250), nullable=False)
    paper_id = Column(String(36), ForeignKey("papers.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    paper = relationship("PaperORM", back_populates="sessions")
    messages = relationship("MessageORM", back_populates="session", cascade="all, delete-orphan")

class MessageORM(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id"), nullable=False)
    sender = Column(String(50), nullable=False) # e.g. "user", "supervisor", "qa_agent", etc.
    content = Column(Text, nullable=False)
    agent_thoughts = Column(Text, nullable=True) # Reasoning steps/internal output logs
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("ChatSessionORM", back_populates="messages")

class NoteORM(Base):
    __tablename__ = "notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey("papers.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    title = Column(String(250), nullable=False, default="Research Notes")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    paper = relationship("PaperORM", back_populates="notes")

class PaperChunkORM(Base):
    __tablename__ = "paper_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey("papers.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text_content = Column(Text, nullable=False)
    section_title = Column(String(250), nullable=False)
    start_page = Column(Integer, nullable=False)
    end_page = Column(Integer, nullable=False)

    # Relationships
    paper = relationship("PaperORM", back_populates="chunks")

class UserORM(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False, default="researcher")

