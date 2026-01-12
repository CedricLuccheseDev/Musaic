"""Health check endpoint."""

from collections import deque
from typing import Any

from fastapi import APIRouter

from app import __version__
from app.models import HealthResponse

router = APIRouter(tags=["Health"])


# Reference to analysis queue (set by main.py)
_analysis_queue: deque[Any] | None = None


def set_analysis_queue(queue: deque[Any]) -> None:
    """
    Set the analysis queue reference for health monitoring.

    Args:
        queue: The analysis queue (deque) to monitor for queue size.
    """
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
