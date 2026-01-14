"""API security utilities."""

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.config import get_settings

# API key header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str | None = Security(api_key_header)) -> str | None:
    """
    Verify the API key if configured.

    If ANALYZER_API_KEY is set, requests must include a valid X-API-Key header.
    If not set, all requests are allowed (backward compatibility).
    """
    settings = get_settings()

    # If no API key is configured, allow all requests
    if not settings.analyzer_api_key:
        return None

    # If API key is configured, verify it
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Include X-API-Key header.",
        )

    if api_key != settings.analyzer_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key.",
        )

    return api_key
