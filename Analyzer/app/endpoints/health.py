"""Health check endpoint."""

from fastapi import APIRouter

from app import __version__
from app.models import HealthResponse

router = APIRouter(tags=["Health"])


# Reference to analysis queue (set by main.py)
_analysis_queue = None


def set_analysis_queue(queue):
    """Set the analysis queue reference."""
    global _analysis_queue
    _analysis_queue = queue


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    queue_size = len(_analysis_queue) if _analysis_queue else 0
    return HealthResponse(
        status="ok",
        queue_size=queue_size,
        version=__version__,
    )
