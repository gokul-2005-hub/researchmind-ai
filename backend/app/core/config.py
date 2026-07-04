import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # General Configuration
    APP_NAME: str = "ResearchMind AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database Configuration
    DATABASE_URL: str = "sqlite:///./researchmind.db"

    # Vector Store Configuration
    CHROMA_PERSIST_DIR: str = "./chromadb_data"

    # LLM Settings
    OPENAI_API_KEY: str = ""
    HF_API_KEY: str = ""

    # Embedding Settings
    # Supported: "local" or "openai"
    EMBEDDING_ENGINE: str = "local"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    LOCAL_EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Storage Configuration
    UPLOAD_DIR: str = "./uploaded_papers"
    MAX_UPLOAD_SIZE_MB: int = 10

    # CORS Configuration
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def UPLOAD_PATH(self) -> Path:
        path = Path(self.UPLOAD_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def CHROMA_PATH(self) -> Path:
        path = Path(self.CHROMA_PERSIST_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

# Global settings instance
settings = Settings()
