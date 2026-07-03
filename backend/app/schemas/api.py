from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime

class PaperResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    authors: List[str]
    publication_year: Optional[int] = None
    journal_venue: Optional[str] = None
    doi: Optional[str] = None
    uploaded_at: datetime
    user_id: Optional[str] = None

class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    paper_id: str
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    sender: str
    content: str
    agent_thoughts: Optional[str] = None
    created_at: datetime

class QueryRequest(BaseModel):
    user_query: str

class QueryResponse(BaseModel):
    final_answer: str
    selected_agent: str
    agent_thoughts: str
    citation_sources: List[str]

class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    paper_id: str
    user_id: Optional[str] = None
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

class NoteSaveRequest(BaseModel):
    title: str = "Research Notes"
    content: str
