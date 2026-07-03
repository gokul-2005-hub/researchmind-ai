import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.repositories.sqlalchemy_repo import SQLAlchemyChatRepository
from app.models.orm import ChatSessionORM, MessageORM

logger = logging.getLogger("app.services.memory")

class MemoryService:
    """
    Coordinates chat session persistence, message histories, 
    and context retrieval formatted for LLM conversation window memory.
    """
    def __init__(self, db: Session):
        self.db = db
        self.chat_repo = SQLAlchemyChatRepository(db)

    def create_session(self, paper_id: str, title: str = "New Chat Session", user_id: Optional[str] = None) -> ChatSessionORM:
        logger.info("Creating new chat session for paper %s with title: %s", paper_id, title)
        return self.chat_repo.create_session(paper_id=paper_id, title=title, user_id=user_id)

    def get_session(self, session_id: str) -> Optional[ChatSessionORM]:
        return self.chat_repo.get_session_by_id(session_id)

    def list_sessions(self, paper_id: str, user_id: Optional[str] = None) -> List[ChatSessionORM]:
        return self.chat_repo.list_sessions_by_paper_id(paper_id, user_id=user_id)

    def delete_session(self, session_id: str) -> bool:
        logger.info("Deleting chat session: %s", session_id)
        return self.chat_repo.delete_session(session_id)

    def add_user_message(self, session_id: str, content: str) -> MessageORM:
        """
        Commits a user message to the SQL database.
        """
        logger.debug("Saving user message for session %s", session_id)
        return self.chat_repo.add_message(
            session_id=session_id,
            sender="user",
            content=content
        )

    def add_agent_response(
        self, 
        session_id: str, 
        agent_name: str, 
        content: str, 
        agent_thoughts: Optional[str] = None
    ) -> MessageORM:
        """
        Commits an agent response and thoughts log to the SQL database.
        """
        logger.debug("Saving agent response (%s) for session %s", agent_name, session_id)
        return self.chat_repo.add_message(
            session_id=session_id,
            sender=agent_name,
            content=content,
            agent_thoughts=agent_thoughts
        )

    def get_messages(self, session_id: str) -> List[MessageORM]:
        """
        Fetches the complete message history list for a session.
        """
        return self.chat_repo.get_messages_by_session_id(session_id)

    def get_messages_for_llm(self, session_id: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Loads and formats past conversation history as a list of dictionaries:
        [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        suitable for feeding directly into OpenAI Chat Completion formats.
        Limits historical context to avoid token bloat.
        """
        db_messages = self.chat_repo.get_messages_by_session_id(session_id)
        
        # Format roles: 'user' maps to 'user', all agent names map to 'assistant'
        formatted_messages: List[Dict[str, str]] = []
        for msg in db_messages:
            role = "user" if msg.sender == "user" else "assistant"
            formatted_messages.append({
                "role": role,
                "content": msg.content
            })
            
        # Truncate to the last 'limit' messages
        if limit > 0:
            formatted_messages = formatted_messages[-limit:]
            
        logger.debug("Loaded %d messages formatted for LLM memory context.", len(formatted_messages))
        return formatted_messages
