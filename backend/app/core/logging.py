import logging
import sys
from typing import Dict, Any
from app.core.config import settings

def setup_logging() -> None:
    """
    Configures application-wide logging with consistent formats and levels.
    """
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Custom message format: timestamp | level | logger | message
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid double logging
    root_logger.handlers = []
    root_logger.addHandler(console_handler)
    
    # Control third-party libraries logging levels to reduce noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(log_level)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    
    logger = logging.getLogger("app")
    logger.info("Logging system configured successfully in %s mode", settings.APP_ENV)

# Create a logger instance for core module imports
logger = logging.getLogger("app")
