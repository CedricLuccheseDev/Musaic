"""Pydantic models for request/response schemas."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class AnalysisStatus(str, Enum):
    """Status of track analysis."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalyzeRequest(BaseModel):
    """Manual analysis request."""

    soundcloud_id: int


class AnalysisResult(BaseModel):
    """Audio analysis results from Essentia."""

    # Rhythm
    bpm_detected: float  # BPM with precision (e.g., 174.5)
    bpm_confidence: float

    # Tonal
    key_detected: str
    key_confidence: float

    # Dynamics
    energy: float
    loudness: float  # dB
    dynamic_complexity: float  # Volume variation

    # Timbre
    spectral_centroid: float  # Brightness (Hz)
    dissonance: float  # Dissonance level (0-1)

    # High-level descriptors
    danceability: float
    speechiness: float  # Voice presence (0-1)
    instrumentalness: float  # Instrumental vs vocal (0-1)
    acousticness: float  # Acoustic vs electronic (0-1)
    valence: float  # Mood/positivity (0-1)
    liveness: float  # Live recording probability (0-1)

    # Highlight
    highlight_time: float  # Timestamp of the highlight (seconds)

    # Embedding (for similarity search)
    embedding: list[float] | None = None  # 1280-dim vector from Discogs-Effnet


class TrackUpdate(BaseModel):
    """Data to update in Supabase after analysis."""

    # Rhythm
    bpm_detected: float | None = None
    bpm_confidence: float | None = None

    # Tonal
    key_detected: str | None = None
    key_confidence: float | None = None

    # Dynamics
    energy: float | None = None
    loudness: float | None = None
    dynamic_complexity: float | None = None

    # Timbre
    spectral_centroid: float | None = None
    dissonance: float | None = None

    # High-level descriptors
    danceability: float | None = None
    speechiness: float | None = None
    instrumentalness: float | None = None
    acousticness: float | None = None
    valence: float | None = None
    liveness: float | None = None

    # Embedding (for similarity search)
    embedding: list[float] | None = None  # 1280-dim vector

    # Status
    analysis_status: AnalysisStatus
    analysis_error: str | None = None
    analyzed_at: datetime | None = None


class AnalyzingResponse(BaseModel):
    """Response when analysis is in progress."""

    status: str = "analyzing"
    soundcloud_id: int | None = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    queue_size: int = 0
    version: str = "0.1.0"


class ErrorResponse(BaseModel):
    """Error response."""

    error: str
    detail: str | None = None


class BatchAnalysisRequest(BaseModel):
    """Request for batch analysis endpoint."""

    include_failed: bool = False  # Also retry failed tracks


class BatchAnalysisResponse(BaseModel):
    """Response for batch analysis endpoint."""

    status: str = "started"
    total_tracks: int = 0
    message: str = ""


class BatchStatusResponse(BaseModel):
    """Response for batch analysis status."""

    is_running: bool = False
    total_tracks: int = 0
    processed: int = 0
    successful: int = 0
    failed: int = 0
    current_track: str | None = None
