"""FastAPI application for Musaic Analyzer microservice."""

from collections import deque
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import __version__
from app.config import get_settings
from app.endpoints import health_router, analyze_router, batch_router
from app.endpoints.health import set_analysis_queue as set_health_queue
from app.endpoints.analyze import set_analysis_queue as set_analyze_queue
from app.logger import log

# Shared analysis queue for tracking pending jobs
analysis_queue: deque[int] = deque()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()
    settings.temp_dir.mkdir(parents=True, exist_ok=True)

    # Set queue references for endpoints
    set_health_queue(analysis_queue)
    set_analyze_queue(analysis_queue)

    log.success(f"Musaic Analyzer v{__version__} started on {settings.host}:{settings.port}")
    yield
    log.info("Shutting down...")


app = FastAPI(
    title="Musaic Analyzer",
    description="Audio analysis microservice for Musaic - extracts BPM, key, energy, and more from SoundCloud tracks",
    version=__version__,
    lifespan=lifespan,
)

# Register routers
app.include_router(health_router)
app.include_router(analyze_router)
app.include_router(batch_router)


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(app, host=settings.host, port=settings.port)
