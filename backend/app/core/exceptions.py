from typing import Any, Dict, Optional
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("app.exceptions")

class AppException(Exception):
    """Base application exception for custom business logic errors."""
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_SERVER_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}

class EntityNotFoundError(AppException):
    """Raised when a requested resource is not found in the system."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=404,
            error_code="RESOURCE_NOT_FOUND",
            details=details
        )

class AppValidationError(AppException):
    """Raised when incoming parameters or document constraints fail validation."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="VALIDATION_ERROR",
            details=details
        )

class ProcessingError(AppException):
    """Raised when document ingestion, vectorization, or LLM agents fail."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=422,
            error_code="PROCESSING_ERROR",
            details=details
        )

class AuthenticationError(AppException):
    """Raised when credentials are invalid or missing."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=401,
            error_code="UNAUTHORIZED",
            details=details
        )

def register_exception_handlers(app: FastAPI) -> None:
    """
    Registers custom exception handlers globally on the FastAPI application instance.
    """
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.warning(
            "AppException handled: [%s] %s - Details: %s",
            exc.error_code,
            exc.message,
            exc.details
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception captured by global handler: %s", str(exc))
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred. Please contact system support.",
                    "details": {"exception": str(exc)} if settings_debug_info() else {}
                }
            }
        )

def settings_debug_info() -> bool:
    # Inline import to avoid circular dependency
    from app.core.config import settings
    return settings.DEBUG
