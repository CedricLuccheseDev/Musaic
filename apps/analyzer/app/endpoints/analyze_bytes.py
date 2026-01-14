"""Analyze audio from raw bytes (for tracks that can't be downloaded server-side)."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status

from app.analyzer import AnalysisError, analyze_audio_from_bytes
from app.security import verify_api_key
from app.logger import log
from app.models import AnalysisStatus, AnalyzingResponse, ErrorResponse
from app.supabase_client import get_track_by_soundcloud_id, update_track_analysis, update_track_status

router = APIRouter(tags=["Analysis"])


@router.post(
    "/analyze-bytes",
    response_model=AnalyzingResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        404: {"model": ErrorResponse, "description": "Track not found"},
        500: {"model": ErrorResponse, "description": "Analysis failed"},
    },
)
async def analyze_from_bytes(
    soundcloud_id: int = Form(...),
    audio: UploadFile = File(...),
    _: str | None = Depends(verify_api_key),
) -> AnalyzingResponse:
    """
    Analyze audio from uploaded bytes.

    Use this endpoint when server-side download fails (label restrictions, geo-blocking).
    The frontend can stream the audio and send it here for analysis.
    """
    log.api.request("POST", f"/analyze-bytes (ID: {soundcloud_id})")

    # Validate file type
    if audio.content_type and not audio.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type: {audio.content_type}. Expected audio/*",
        )

    # Get track from Supabase
    track = await get_track_by_soundcloud_id(soundcloud_id)
    if not track:
        log.api.response(404, f"/analyze-bytes - Track {soundcloud_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track {soundcloud_id} not found in database",
        )

    try:
        # Update status to processing
        await update_track_status(soundcloud_id, AnalysisStatus.PROCESSING)

        # Read audio bytes
        audio_bytes = await audio.read()
        log.audio.analyzing(f"Track {soundcloud_id} ({len(audio_bytes)} bytes)")

        # Analyze
        result = analyze_audio_from_bytes(audio_bytes)

        # Update track with results
        await update_track_analysis(soundcloud_id, result.model_dump())

        log.audio.analyzed(
            f"Track {soundcloud_id}",
            bpm=result.bpm_detected,
            key=result.key_detected
        )

        log.api.response(200, f"/analyze-bytes - Analyzed track {soundcloud_id}")
        return AnalyzingResponse(status="completed", soundcloud_id=soundcloud_id)

    except AnalysisError as e:
        log.audio.error(f"Analysis failed: {e}")
        await update_track_status(
            soundcloud_id, AnalysisStatus.FAILED, error=f"Analysis failed: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {e}",
        )

    except Exception as e:
        log.error(f"Unexpected error for track {soundcloud_id}: {e}")
        await update_track_status(
            soundcloud_id, AnalysisStatus.FAILED, error=f"Unexpected error: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {e}",
        )
