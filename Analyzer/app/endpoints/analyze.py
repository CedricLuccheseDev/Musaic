"""Single track analysis endpoint."""

import asyncio

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.analyzer import AnalysisError, analyze_audio
from app.config import get_settings
from app.downloader import DownloadError, cleanup_audio_file, download_full_audio_async
from app.logger import log
from app.models import (
    AnalysisStatus,
    AnalyzeRequest,
    AnalyzingResponse,
    ErrorResponse,
)
from app.supabase_client import (
    get_track_by_soundcloud_id,
    update_track_analysis,
    update_track_status,
)

router = APIRouter(tags=["Analysis"])

# Analysis queue for tracking pending jobs
_analysis_queue = None


def set_analysis_queue(queue):
    """Set the analysis queue reference."""
    global _analysis_queue
    _analysis_queue = queue


def get_analysis_queue():
    """Get the analysis queue."""
    return _analysis_queue


async def process_track_analysis(soundcloud_id: int, permalink_url: str) -> None:
    """
    Background task to download and analyze a track.

    Args:
        soundcloud_id: SoundCloud track ID
        permalink_url: URL to download the track from
    """
    settings = get_settings()
    audio_path = None
    queue = get_analysis_queue()

    try:
        # Add to queue
        if queue is not None:
            queue.append(soundcloud_id)

        # Update status to processing
        await update_track_status(soundcloud_id, AnalysisStatus.PROCESSING)

        # Download audio with timeout (native async - no thread needed)
        log.sc.download(permalink_url)
        try:
            audio_path = await asyncio.wait_for(
                download_full_audio_async(permalink_url),
                timeout=settings.analysis_timeout_seconds,
            )
        except asyncio.TimeoutError:
            raise DownloadError("Download timed out")

        # Analyze audio
        log.audio.analyzing(f"Track {soundcloud_id}")
        result = await asyncio.to_thread(analyze_audio, audio_path)

        # Update track with results
        await update_track_analysis(soundcloud_id, result.model_dump())

        log.audio.analyzed(
            f"Track {soundcloud_id}",
            bpm=result.bpm_detected,
            key=result.key_detected
        )

    except DownloadError as e:
        log.sc.error(f"Download failed: {e}")
        await update_track_status(
            soundcloud_id, AnalysisStatus.FAILED, error=f"Download failed: {e}"
        )

    except AnalysisError as e:
        log.audio.error(f"Analysis failed: {e}")
        await update_track_status(
            soundcloud_id, AnalysisStatus.FAILED, error=f"Analysis failed: {e}"
        )

    except Exception as e:
        log.error(f"Unexpected error for track {soundcloud_id}: {e}")
        await update_track_status(
            soundcloud_id, AnalysisStatus.FAILED, error=f"Unexpected error: {e}"
        )

    finally:
        # Remove from queue
        if queue is not None and soundcloud_id in queue:
            queue.remove(soundcloud_id)

        # Cleanup audio file
        if audio_path:
            cleanup_audio_file(audio_path)


@router.post(
    "/analyze",
    response_model=AnalyzingResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Track not found"},
    },
)
async def analyze_track(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
) -> AnalyzingResponse:
    """
    Manually trigger analysis for a track.

    Looks up the track in Supabase and queues it for analysis.
    """
    soundcloud_id = request.soundcloud_id
    queue = get_analysis_queue()

    log.api.request("POST", f"/analyze (ID: {soundcloud_id})")

    # Get track from Supabase
    track = await get_track_by_soundcloud_id(soundcloud_id)

    if not track:
        log.api.response(404, f"/analyze - Track {soundcloud_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track {soundcloud_id} not found in database",
        )

    permalink_url = track.get("permalink_url")
    if not permalink_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Track has no permalink_url",
        )

    # Check if already in queue
    if queue is not None and soundcloud_id in queue:
        log.warn(f"Track {soundcloud_id} already in queue")
        return AnalyzingResponse(status="already_analyzing", soundcloud_id=soundcloud_id)

    # Queue analysis
    background_tasks.add_task(process_track_analysis, soundcloud_id, permalink_url)

    log.api.response(200, f"/analyze - Queued track {soundcloud_id}")

    return AnalyzingResponse(status="analyzing", soundcloud_id=soundcloud_id)
