import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("app.database")

# Setup connection parameters
connect_args = {}
# SQLite needs check_same_thread=False for async/multithreaded environments
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        echo=False # Avoid console clutter, log SQL if settings.DEBUG is set manually
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    logger.info("Database engine initialized successfully.")
except Exception as e:
    logger.exception("Failed to initialize database engine: %s", str(e))
    raise

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a transactional database session context.
    Ensures sessions are closed after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
