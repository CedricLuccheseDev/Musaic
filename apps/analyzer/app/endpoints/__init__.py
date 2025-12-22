"""API endpoints for Musaic Analyzer."""

from app.endpoints.health import router as health_router
from app.endpoints.analyze import router as analyze_router
from app.endpoints.analyze_bytes import router as analyze_bytes_router
from app.endpoints.batch import router as batch_router

__all__ = ["health_router", "analyze_router", "analyze_bytes_router", "batch_router"]
