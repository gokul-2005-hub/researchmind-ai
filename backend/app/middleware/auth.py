import jwt
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("app.middleware.auth")

SECRET_KEY = "researchmind-secret-key-12345"
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed HS256 JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    """
    Dependency to verify access tokens. Decodes signatures and validates expiry dates.
    For local convenience, returns mock user payload if credentials is not supplied.
    """
    if not credentials:
        # Permissive default to ensure smooth local operation in case auth header is not sent.
        logger.debug("No auth credentials supplied. Issuing default mock session.")
        return {"username": "local_dev", "role": "researcher"}

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub", "")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload invalid. Subject username missing."
            )
        return {"username": username, "role": payload.get("role", "user")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please authenticate again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid security credentials token payload."
        )
