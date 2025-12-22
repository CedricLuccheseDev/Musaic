"""Batch analysis endpoints."""

import asyncio
import time
from collections import deque
from threading import Lock

from fastapi import APIRouter, BackgroundTasks
from supabase import create_client

from app.analyzer import AnalysisError, analyze_audio_from_bytes
from app.config import get_settings
from app.downloader import DownloadError, stream_audio_to_memory
from app.logger import log
from app.models import (
    AnalysisStatus,
    BatchAnalysisRequest,
    BatchAnalysisResponse,
    BatchStatusResponse,
)
from app.supabase_client import update_track_analysis, update_track_status

router = APIRouter(tags=["Analysis"])

# Batch analysis state
batch_state = {
    "is_running": False,
    "total_tracks": 0,
    "processed": 0,
    "successful": 0,
    "failed": 0,
    "current_track": None,
}

# Progress tracking for batch analysis (simple logs for Docker/Dokploy)
_progress_lock = Lock()
_batch_stats = {"completed": 0, "successful": 0, "failed": 0, "total": 0}
_batch_start_time = 0.0

# Queue for tracks added while batch is running
_pending_queue: deque[dict] = deque()
_queue_lock = Lock()

# Batch configuration
_batch_include_failed = False


async def analyze_single_track_streaming(
    track: dict,
    download_semaphore: asyncio.Semaphore,
    analyze_semaphore: asyncio.Semaphore,
    settings,
) -> bool:
    """
    Analyze a track using streaming (no file download).

    Streams audio directly to memory and analyzes without saving to disk.
    Useful for VPS where SoundCloud blocks downloads but allows streaming.

    Returns True if successful, False otherwise.
    """
    global _batch_stats
    soundcloud_id = track["soundcloud_id"]
    url = track["permalink_url"]
    title = track.get("title", "Unknown")[:30]
    artist = track.get("artist", "Unknown")[:20]

    start_time_track = time.time()

    try:
        # Update status to processing
        await update_track_status(soundcloud_id, AnalysisStatus.PROCESSING)

        # === STREAM PHASE (limited by download_semaphore) ===
        async with download_semaphore:
            log.info(f"Streaming: {artist} - {title}")
            audio_bytes = await asyncio.wait_for(
                stream_audio_to_memory(url),
                timeout=settings.analysis_timeout_seconds,
            )

        # === ANALYZE PHASE (limited by analyze_semaphore - CPU bound) ===
        async with analyze_semaphore:
            size_mb = len(audio_bytes) / (1024 * 1024)
            log.info(f"Analyzing: {artist} - {title} ({size_mb:.1f}MB)")
            result = await asyncio.to_thread(analyze_audio_from_bytes, audio_bytes)

        # === SAVE PHASE ===
        await update_track_analysis(soundcloud_id, result.model_dump())

        duration = time.time() - start_time_track
        with _progress_lock:
            _batch_stats["completed"] += 1
            _batch_stats["successful"] += 1
            completed = _batch_stats["completed"]
            total = _batch_stats["total"]

        log.success(f"[{completed}/{total}] {artist} - {title} | BPM: {result.bpm_detected} | Key: {result.key_detected} | {duration:.1f}s")
        return True

    except asyncio.TimeoutError:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, "Timeout")
        with _progress_lock:
            _batch_stats["completed"] += 1
            _batch_stats["failed"] += 1
            completed = _batch_stats["completed"]
            total = _batch_stats["total"]
        log.error(f"[{completed}/{total}] {artist} - {title} | Timeout")
        return False

    except DownloadError as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        with _progress_lock:
            _batch_stats["completed"] += 1
            _batch_stats["failed"] += 1
            completed = _batch_stats["completed"]
            total = _batch_stats["total"]
        log.error(f"[{completed}/{total}] {artist} - {title} | {e}")
        return False

    except AnalysisError as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        with _progress_lock:
            _batch_stats["completed"] += 1
            _batch_stats["failed"] += 1
            completed = _batch_stats["completed"]
            total = _batch_stats["total"]
        log.error(f"[{completed}/{total}] {artist} - {title} | {e}")
        return False

    except Exception as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        with _progress_lock:
            _batch_stats["completed"] += 1
            _batch_stats["failed"] += 1
            completed = _batch_stats["completed"]
            total = _batch_stats["total"]
        log.error(f"[{completed}/{total}] {artist} - {title} | {e}")
        return False


def _format_duration(seconds: float) -> str:
    """Format seconds into human readable time."""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins}m{secs:02d}s"
    else:
        hours = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        return f"{hours}h{mins:02d}m"


async def process_batch_analysis() -> None:
    """Background task to analyze all pending tracks concurrently using streaming."""
    global batch_state, _batch_stats, _batch_start_time, _batch_include_failed
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_key)

    # Create semaphores once (reused for queued tracks)
    max_downloads = settings.max_concurrent_analyses * 3
    max_analyses = settings.max_concurrent_analyses
    download_semaphore = asyncio.Semaphore(max_downloads)
    analyze_semaphore = asyncio.Semaphore(max_analyses)

    try:
        while True:
            # Get all tracks that need analysis
            if _batch_include_failed:
                # Include both pending and failed tracks
                response = (
                    client.table("tracks")
                    .select("soundcloud_id, permalink_url, title, artist")
                    .in_("analysis_status", ["pending", "failed"])
                    .execute()
                )
            else:
                # Only pending tracks
                response = (
                    client.table("tracks")
                    .select("soundcloud_id, permalink_url, title, artist")
                    .eq("analysis_status", "pending")
                    .execute()
                )
            tracks = response.data

            # Also check pending queue
            with _queue_lock:
                queued_count = len(_pending_queue)

            if not tracks and queued_count == 0:
                log.success("No tracks to analyze. All done!")
                break

            if not tracks:
                # Wait a bit for queued tracks to be inserted in DB
                await asyncio.sleep(1)
                continue

            batch_state["total_tracks"] = len(tracks)
            batch_state["processed"] = 0
            batch_state["successful"] = 0
            batch_state["failed"] = 0

            # Initialize progress stats
            _batch_stats = {"completed": 0, "successful": 0, "failed": 0, "total": len(tracks)}
            _batch_start_time = time.time()

            log.info("=" * 50)
            log.info("MusaicAnalyzer - Batch Analysis Started")
            log.info("=" * 50)
            log.info(f"Mode: Streaming (no file download)")
            log.info(f"Tracks: {len(tracks)} | Streams: {max_downloads} | Analyses: {max_analyses}")
            log.info("-" * 50)

            # Create tasks for all tracks
            tasks = [
                analyze_single_track_streaming(track, download_semaphore, analyze_semaphore, settings)
                for track in tracks
            ]

            # Process all tracks concurrently (limited by semaphore)
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Count results for batch_state
            for result in results:
                batch_state["processed"] += 1
                if result is True:
                    batch_state["successful"] += 1
                else:
                    batch_state["failed"] += 1

            # Summary
            total_elapsed = time.time() - _batch_start_time
            with _progress_lock:
                successful = _batch_stats["successful"]
                failed = _batch_stats["failed"]

            avg_time = total_elapsed / successful if successful > 0 else 0

            log.info("-" * 50)
            log.info("=" * 50)
            log.success(f"BATCH COMPLETE | OK: {successful} | FAIL: {failed} | Time: {_format_duration(total_elapsed)} | Avg: {avg_time:.1f}s/track")
            log.info("=" * 50)

            # Check if new tracks were added during processing
            if _batch_include_failed:
                response = (
                    client.table("tracks")
                    .select("soundcloud_id", count="exact")
                    .in_("analysis_status", ["pending", "failed"])
                    .execute()
                )
            else:
                response = (
                    client.table("tracks")
                    .select("soundcloud_id", count="exact")
                    .eq("analysis_status", "pending")
                    .execute()
                )
            pending_count = response.count or 0

            if pending_count > 0:
                log.info(f"Found {pending_count} new tracks to process...")
                continue
            else:
                break

    finally:
        batch_state["is_running"] = False
        batch_state["current_track"] = None


@router.post(
    "/analyze/batch",
    response_model=BatchAnalysisResponse,
)
async def analyze_all_tracks(
    background_tasks: BackgroundTasks,
    request: BatchAnalysisRequest | None = None,
) -> BatchAnalysisResponse:
    """
    Start batch analysis of all pending tracks.

    Args:
        request.include_failed: Also retry failed tracks (default: False)
    """
    global batch_state, _batch_include_failed

    include_failed = request.include_failed if request else False
    mode_str = "pending + failed" if include_failed else "pending"

    log.api.request("POST", f"/analyze/batch ({mode_str})")

    if batch_state["is_running"]:
        log.warn("Batch already running")
        return BatchAnalysisResponse(
            status="already_running",
            total_tracks=batch_state["total_tracks"],
            message="Batch analysis is already in progress",
        )

    # Get count of tracks to analyze
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_key)

    if include_failed:
        response = (
            client.table("tracks")
            .select("soundcloud_id", count="exact")
            .in_("analysis_status", ["pending", "failed"])
            .execute()
        )
    else:
        response = (
            client.table("tracks")
            .select("soundcloud_id", count="exact")
            .eq("analysis_status", "pending")
            .execute()
        )
    total = response.count or 0

    if total == 0:
        log.info(f"No {mode_str} tracks to analyze")
        return BatchAnalysisResponse(
            status="no_tracks",
            total_tracks=0,
            message="No tracks to analyze",
        )

    # Store configuration for the batch
    _batch_include_failed = include_failed

    batch_state["is_running"] = True
    batch_state["total_tracks"] = total

    background_tasks.add_task(process_batch_analysis)

    log.success(f"Started batch analysis of {total} tracks ({mode_str})")

    return BatchAnalysisResponse(
        status="started",
        total_tracks=total,
        message=f"Started batch analysis of {total} tracks ({mode_str})",
    )


@router.get(
    "/analyze/batch/status",
    response_model=BatchStatusResponse,
)
async def get_batch_status() -> BatchStatusResponse:
    """Get the current status of batch analysis."""
    return BatchStatusResponse(**batch_state)
