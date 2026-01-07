"""Supabase client for database operations."""

import logging
from datetime import datetime, timezone
from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings
from app.models import AnalysisStatus, TrackUpdate

logger = logging.getLogger(__name__)


@lru_cache
def get_supabase_client() -> Client:
    """Get cached Supabase client instance."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def update_track_status(
    soundcloud_id: int,
    status: AnalysisStatus,
    error: str | None = None,
) -> None:
    """Update track analysis status in Supabase."""
    client = get_supabase_client()

    update_data: dict = {"analysis_status": status.value}

    if error:
        update_data["analysis_error"] = error

    if status == AnalysisStatus.PROCESSING:
        update_data["analyzed_at"] = None
        update_data["analysis_error"] = None

    try:
        client.table("tracks").update(update_data).eq(
            "soundcloud_id", soundcloud_id
        ).execute()
        logger.info(f"Updated track {soundcloud_id} status to {status.value}")
    except Exception as e:
        logger.error(f"Failed to update track {soundcloud_id} status: {e}")
        raise


async def update_track_analysis(
    soundcloud_id: int,
    analysis_result: dict,
) -> None:
    """Update track with analysis results in Supabase."""
    client = get_supabase_client()

    update_data = TrackUpdate(
        # Rhythm
        bpm_detected=analysis_result["bpm_detected"],
        bpm_confidence=analysis_result["bpm_confidence"],
        beat_offset=analysis_result.get("beat_offset"),
        # Tonal
        key_detected=analysis_result["key_detected"],
        key_confidence=analysis_result["key_confidence"],
        # Dynamics
        energy=analysis_result["energy"],
        loudness=analysis_result["loudness"],
        dynamic_complexity=analysis_result["dynamic_complexity"],
        # Timbre
        spectral_centroid=analysis_result["spectral_centroid"],
        dissonance=analysis_result["dissonance"],
        # High-level
        danceability=analysis_result["danceability"],
        speechiness=analysis_result["speechiness"],
        instrumentalness=analysis_result["instrumentalness"],
        acousticness=analysis_result["acousticness"],
        valence=analysis_result["valence"],
        liveness=analysis_result["liveness"],
        # Highlight
        highlight_time=analysis_result.get("highlight_time"),
        # Embedding
        embedding=analysis_result.get("embedding"),
        # Status
        analysis_status=AnalysisStatus.COMPLETED,
        analysis_error=None,
        analyzed_at=datetime.now(timezone.utc),
    )

    try:
        client.table("tracks").update(
            update_data.model_dump(exclude_none=True, mode="json")
        ).eq("soundcloud_id", soundcloud_id).execute()
        logger.info(f"Updated track {soundcloud_id} with analysis results")
    except Exception as e:
        logger.error(f"Failed to update track {soundcloud_id} analysis: {e}")
        raise


async def get_track_by_soundcloud_id(soundcloud_id: int) -> dict | None:
    """Get track by SoundCloud ID from Supabase."""
    client = get_supabase_client()

    try:
        response = (
            client.table("tracks")
            .select("*")
            .eq("soundcloud_id", soundcloud_id)
            .single()
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error(f"Failed to get track {soundcloud_id}: {e}")
        return None


async def update_track_beat_offset(
    soundcloud_id: int,
    beat_offset: float,
) -> None:
    """Update only the beat_offset for a track in Supabase."""
    client = get_supabase_client()

    try:
        client.table("tracks").update(
            {"beat_offset": beat_offset}
        ).eq("soundcloud_id", soundcloud_id).execute()
        logger.info(f"Updated track {soundcloud_id} beat_offset to {beat_offset}")
    except Exception as e:
        logger.error(f"Failed to update track {soundcloud_id} beat_offset: {e}")
        raise
