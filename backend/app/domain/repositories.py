from abc import ABC, abstractmethod
from typing import List, Optional, Any

class PaperRepository(ABC):
    @abstractmethod
    def get_by_id(self, paper_id: str) -> Optional[Any]:
        pass

    @abstractmethod
    def list_all(self) -> List[Any]:
        pass

    @abstractmethod
    def create(self, title: str, authors: List[str], file_path: str, 
               publication_year: Optional[int] = None, 
               journal_venue: Optional[str] = None, 
               doi: Optional[str] = None) -> Any:
        pass

    @abstractmethod
    def delete(self, paper_id: str) -> bool:
        pass

class ChatRepository(ABC):
    @abstractmethod
    def get_session_by_id(self, session_id: str) -> Optional[Any]:
        pass

    @abstractmethod
    def list_sessions_by_paper_id(self, paper_id: str) -> List[Any]:
        pass

    @abstractmethod
    def create_session(self, paper_id: str, title: str) -> Any:
        pass

    @abstractmethod
    def delete_session(self, session_id: str) -> bool:
        pass

    @abstractmethod
    def get_messages_by_session_id(self, session_id: str) -> List[Any]:
        pass

    @abstractmethod
    def add_message(self, session_id: str, sender: str, content: str, 
                    agent_thoughts: Optional[str] = None) -> Any:
        pass

class NoteRepository(ABC):
    @abstractmethod
    def get_by_paper_id(self, paper_id: str) -> Optional[Any]:
        pass

    @abstractmethod
    def create_or_update(self, paper_id: str, title: str, content: str) -> Any:
        pass

    @abstractmethod
    def delete(self, note_id: str) -> bool:
        pass
