import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import register_exception_handlers
from app.api.papers import router as papers_router
from app.api.chats import router as chats_router
from app.api.notes import router as notes_router
from app.api.auth import router as auth_router

# Setup application logging
setup_logging()
logger = logging.getLogger("app.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting up ResearchMind AI Backend Services...")
    # Perform directories verification
    upload_dir = settings.UPLOAD_PATH
    chroma_dir = settings.CHROMA_PATH
    logger.info("Upload directory confirmed: %s", upload_dir.absolute())
    logger.info("Vector DB persist directory confirmed: %s", chroma_dir.absolute())
    
    # Initialize database tables
    try:
        from app.database.connection import engine, Base
        from app.models.orm import PaperORM, ChatSessionORM, MessageORM, NoteORM, UserORM
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
        
        # Self-healing migration: Add user_id column to papers table if it is missing
        from sqlalchemy import text
        from app.database.connection import SessionLocal
        db = SessionLocal()
        try:
            db.execute(text("ALTER TABLE papers ADD COLUMN user_id VARCHAR(36) REFERENCES users(id)"))
            db.commit()
            logger.info("Database migration: Added user_id column to papers table.")
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE chat_sessions ADD COLUMN user_id VARCHAR(36) REFERENCES users(id)"))
            db.commit()
            logger.info("Database migration: Added user_id column to chat_sessions table.")
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE notes ADD COLUMN user_id VARCHAR(36) REFERENCES users(id)"))
            db.commit()
            logger.info("Database migration: Added user_id column to notes table.")
        except Exception:
            db.rollback()
        finally:
            db.close()
        
        # Seed default users: admin / admin123 and user / user123
        from app.database.connection import SessionLocal
        import hashlib
        import os
        db = SessionLocal()
        try:
            # 1. Handle admin user
            admin_user = db.query(UserORM).filter_by(username="admin").first()
            salt_admin = os.urandom(16)
            hash_admin = hashlib.pbkdf2_hmac('sha256', b'admin123', salt_admin, 2000)
            db_hash_admin = f"2000${salt_admin.hex()}${hash_admin.hex()}"
            if not admin_user:
                logger.info("Seeding default user: admin...")
                new_admin = UserORM(
                    username="admin",
                    password_hash=db_hash_admin,
                    role="admin"
                )
                db.add(new_admin)
            else:
                logger.info("Updating default user admin password hash...")
                admin_user.password_hash = db_hash_admin
                admin_user.role = "admin"
            
            # 2. Handle regular user
            reg_user = db.query(UserORM).filter_by(username="user").first()
            salt_user = os.urandom(16)
            hash_user = hashlib.pbkdf2_hmac('sha256', b'user123', salt_user, 2000)
            db_hash_user = f"2000${salt_user.hex()}${hash_user.hex()}"
            if not reg_user:
                logger.info("Seeding default user: user...")
                new_reg = UserORM(
                    username="user",
                    password_hash=db_hash_user,
                    role="researcher"
                )
                db.add(new_reg)
            else:
                logger.info("Updating default user regular password hash...")
                reg_user.password_hash = db_hash_user
                
            db.commit()
            logger.info("Default users admin and user seeded successfully.")
        finally:
            db.close()
    except Exception as e:
        logger.exception("Failed to initialize database tables: %s", str(e))
        raise
    
    yield
    
    # Shutdown actions
    logger.info("Shutting down ResearchMind AI Backend Services...")

app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent Multi-Agent Research Paper Assistant using LangGraph and ChromaDB",
    version="1.0.0",
    lifespan=lifespan,
    debug=settings.DEBUG
)

# Setup CORS Middleware
if settings.APP_ENV == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Setup Request Timing Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    logger.debug(
        "Request: %s %s | Status: %s | Duration: %.4fms",
        request.method,
        request.url.path,
        response.status_code,
        process_time * 1000
    )
    return response

# Register Exception Handlers
register_exception_handlers(app)

# Register API Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(papers_router, prefix="/api/v1")
app.include_router(chats_router, prefix="/api/v1")
app.include_router(notes_router, prefix="/api/v1")

# Base healthcheck route
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Returns application status and environmental settings confirmation.
    """
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "debug_mode": settings.DEBUG,
        "embedding_engine": settings.EMBEDDING_ENGINE,
        "local_model": settings.LOCAL_EMBEDDING_MODEL
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
