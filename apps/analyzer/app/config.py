"""Application configuration using pydantic-settings."""

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown env vars
    )

    # Server configuration
    port: int = 8000
    host: str = "0.0.0.0"

    # Supabase configuration
    supabase_url: str
    supabase_service_key: str

    # SoundCloud authentication (one of these is required for downloading)
    soundcloud_oauth_token: str | None = None
    soundcloud_client_id: str | None = None

    # Proxy configuration (optional, for bypassing IP blocks)
    proxy_url: str | None = None  # Format: http://user:pass@host:port or http://host:port

    # Temporary files directory (use project dir for better I/O on same disk)
    temp_dir: Path = Path(__file__).parent.parent / ".tmp"

    # Analysis settings
    audio_duration_seconds: int = 45  # Duration of segment to analyze (45s is enough for good accuracy)
    analysis_timeout_seconds: int = 600  # Increased for full track download
    max_concurrent_analyses: int = min(os.cpu_count() or 4, 16)  # Cap at 16 to avoid RAM issues


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
