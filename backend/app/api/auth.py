import logging
import hashlib
import os
from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.database.connection import get_db
from app.middleware.auth import create_access_token, get_current_user
from app.models.orm import UserORM

logger = logging.getLogger("app.api.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Request / Response Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- Passwords hashing helpers ---
def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2 with a secure salt.
    Format returned: iterations$salt$hash
    """
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 2000)
    return f"2000${salt.hex()}${pw_hash.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verifies a password against its PBKDF2 hash.
    """
    try:
        parts = hashed_password.split('$')
        if len(parts) != 3:
            return False
        iterations = int(parts[0])
        salt = bytes.fromhex(parts[1])
        original_hash = bytes.fromhex(parts[2])
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
        return new_hash == original_hash
    except Exception:
        return False

# --- Endpoints ---
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new account inside SQLite database, hashing password.
    """
    username_clean = payload.username.strip()
    logger.info("Auth: Register request received for user '%s'", username_clean)
    
    if not username_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot be empty."
        )
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )
        
    # Check duplicate
    existing_user = db.query(UserORM).filter_by(username=username_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another name."
        )
        
    try:
        hashed = hash_password(payload.password)
        new_user = UserORM(
            username=username_clean,
            password_hash=hashed,
            role="researcher"
        )
        db.add(new_user)
        db.commit()
        logger.info("Auth: User '%s' registered successfully.", username_clean)
        return {"message": "Registration successful. You can now log in!"}
    except Exception as e:
        db.rollback()
        logger.exception("Failed to register user.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database save failed."
        )

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Validates user credentials against database records and issues JWT access tokens.
    """
    username_clean = payload.username.strip()
    logger.info("Auth: Login request received for user '%s'", username_clean)
    
    user = db.query(UserORM).filter_by(username=username_clean).first()
    if user and verify_password(payload.password, user.password_hash):
        token = create_access_token(
            data={"sub": user.username, "role": user.role},
            expires_delta=timedelta(hours=2)
        )
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(id=user.id, username=user.username, role=user.role)
        )
        
    logger.warning("Auth: Authentication failed for user '%s'", username_clean)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password. If you don't have an account, please click Sign Up below!"
    )

@router.get("/users", response_model=List[UserResponse])
async def list_users(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Exposes all registered usernames. Admin restricted view.
    """
    if current_user["username"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Admin access required."
        )
    users = db.query(UserORM).all()
    return [UserResponse(id=u.id, username=u.username, role=u.role) for u in users]

@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(user_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Deletes a user account and cascade deletes their uploaded papers, chat sessions, and notes.
    """
    if current_user["username"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Admin access required."
        )
    user = db.query(UserORM).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    if user.username == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the admin account."
        )
        
    try:
        from app.models.orm import PaperORM
        from app.repositories.sqlalchemy_repo import SQLAlchemyPaperRepository
        from app.vectorstore.chroma_store import ChromaRepository
        from app.services.embedding_service import get_embedding_service
        from pathlib import Path
        
        papers = db.query(PaperORM).filter_by(user_id=user.id).all()
        repo = SQLAlchemyPaperRepository(db)
        embedding_service = get_embedding_service()
        chroma_repo = ChromaRepository(embedding_service)
        
        for p in papers:
            # Delete vector store index
            try:
                chroma_repo.delete_paper_chunks(p.id)
            except Exception:
                pass
            # Unlink file from storage
            try:
                path = Path(p.file_path)
                if path.exists():
                    path.unlink()
            except Exception:
                pass
            # Relational database cascade delete
            repo.delete(p.id)
            
        db.delete(user)
        db.commit()
        return {"message": f"User {user.username} deleted successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user profile: {str(e)}"
        )
