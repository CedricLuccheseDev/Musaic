"""Audio downloader using yt-dlp for SoundCloud tracks."""

import asyncio
import subprocess
import tempfile
import aiofiles
import httpx
import io
from pathlib import Path

from app.config import get_settings
from app.logger import log


class DownloadError(Exception):
    """Raised when audio download fails."""

    pass


class StreamUnavailableError(Exception):
    """Raised when stream is not available (geo-blocked, label restriction, etc.)."""
    pass


async def _get_stream_url(
    url: str,
    client_id: str,
    client: httpx.AsyncClient,
) -> str:
    """
    Get the direct stream URL for a SoundCloud track.

    Returns the actual audio stream URL.
    Raises StreamUnavailableError with details if not available.
    """
    # Resolve track URL to get track data
    resolve_url = f"https://api-v2.soundcloud.com/resolve?url={url}&client_id={client_id}"
    response = await client.get(resolve_url)

    if response.status_code == 404:
        raise StreamUnavailableError("Track not found (404)")
    if response.status_code == 403:
        raise StreamUnavailableError("Track access forbidden (403) - geo-blocked or private")
    if response.status_code != 200:
        raise StreamUnavailableError(f"API error ({response.status_code})")

    track_data = response.json()
    title = track_data.get("title", "Unknown")

    # Check if track is streamable
    if not track_data.get("streamable", True):
        raise StreamUnavailableError(f"Track not streamable (label restriction)")

    # Check policy (some tracks have "BLOCK" or "SNIP")
    policy = track_data.get("policy", "ALLOW")
    if policy == "BLOCK":
        raise StreamUnavailableError(f"Track blocked by policy (label/geo restriction)")

    # Try to get progressive stream URL (fastest - direct MP3)
    transcodings = track_data.get("media", {}).get("transcodings", [])

    if not transcodings:
        raise StreamUnavailableError("No transcodings available (label restriction)")

    stream_url = None
    for t in transcodings:
        if t.get("format", {}).get("protocol") == "progressive":
            stream_url = t.get("url")
            break

    # Fallback to any MP3 transcoding
    if not stream_url:
        for t in transcodings:
            if "mp3" in t.get("preset", ""):
                stream_url = t.get("url")
                break

    if not stream_url:
        # Log what's available for debug
        available = [f"{t.get('preset')}({t.get('format', {}).get('protocol')})" for t in transcodings]
        raise StreamUnavailableError(f"No MP3/progressive stream - available: {', '.join(available)}")

    # Get actual stream URL
    stream_response = await client.get(f"{stream_url}?client_id={client_id}")
    if stream_response.status_code != 200:
        raise StreamUnavailableError(f"Stream URL request failed ({stream_response.status_code})")

    final_url = stream_response.json().get("url")
    if not final_url:
        raise StreamUnavailableError("Empty stream URL in response")

    return final_url


async def stream_audio_to_memory(
    url: str,
    client: httpx.AsyncClient | None = None,
    max_bytes: int | None = None,
) -> bytes:
    """
    Stream audio from SoundCloud directly to memory (no file).

    This is useful for VPS where SoundCloud blocks downloads but allows streaming.

    Args:
        url: SoundCloud track URL
        client: Optional shared httpx.AsyncClient
        max_bytes: Optional limit on bytes to download (for partial streaming)

    Returns:
        Audio data as bytes

    Raises:
        DownloadError: If streaming fails
    """
    settings = get_settings()

    if not settings.soundcloud_client_id:
        raise DownloadError("soundcloud_client_id required for streaming")

    should_close_client = False

    try:
        if client is None:
            client = httpx.AsyncClient(
                proxy=settings.proxy_url,
                timeout=httpx.Timeout(30.0, read=300.0),
                http2=True,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            )
            should_close_client = True

        # Get the stream URL
        try:
            stream_url = await _get_stream_url(url, settings.soundcloud_client_id, client)
        except StreamUnavailableError as e:
            raise DownloadError(str(e)) from e

        # Stream audio to memory
        buffer = io.BytesIO()
        bytes_downloaded = 0

        async with client.stream("GET", stream_url) as response:
            if response.status_code != 200:
                raise DownloadError(f"Stream failed with status {response.status_code}")

            async for chunk in response.aiter_bytes(chunk_size=65536):
                buffer.write(chunk)
                bytes_downloaded += len(chunk)

                # Stop if we've downloaded enough
                if max_bytes and bytes_downloaded >= max_bytes:
                    break

        return buffer.getvalue()

    except DownloadError:
        raise
    except Exception as e:
        raise DownloadError(f"Streaming failed: {e}") from e
    finally:
        if should_close_client and client:
            await client.aclose()


async def _try_direct_download_async(
    url: str,
    output_path: Path,
    client_id: str,
    proxy: str | None = None,
    client: httpx.AsyncClient | None = None,
) -> Path | None:
    """
    Try to download directly via SoundCloud API using async httpx.

    Returns the path to the downloaded file (MP3) or None if failed.

    Args:
        url: SoundCloud track URL
        output_path: Base path for output file
        client_id: SoundCloud client ID
        proxy: Optional proxy URL
        client: Optional shared httpx.AsyncClient for connection reuse
    """
    should_close_client = False

    try:
        # Create client if not provided (allows connection pooling when shared)
        if client is None:
            client = httpx.AsyncClient(
                proxy=proxy,
                timeout=httpx.Timeout(30.0, read=300.0),
                http2=True,  # Enable HTTP/2 for better multiplexing
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            )
            should_close_client = True

        # Extract track ID from URL or resolve it
        resolve_url = f"https://api-v2.soundcloud.com/resolve?url={url}&client_id={client_id}"
        response = await client.get(resolve_url)

        if response.status_code != 200:
            return None

        track_data = response.json()

        # Try to get progressive stream URL (fastest - direct MP3)
        transcodings = track_data.get("media", {}).get("transcodings", [])

        stream_url = None
        for t in transcodings:
            if t.get("format", {}).get("protocol") == "progressive":
                stream_url = t.get("url")
                break

        # Fallback to any MP3 transcoding
        if not stream_url:
            for t in transcodings:
                if "mp3" in t.get("preset", ""):
                    stream_url = t.get("url")
                    break

        if not stream_url:
            return None

        # Get actual stream URL
        stream_response = await client.get(f"{stream_url}?client_id={client_id}")
        if stream_response.status_code != 200:
            return None

        actual_url = stream_response.json().get("url")
        if not actual_url:
            return None

        # Download the audio directly as MP3 (no conversion needed - Essentia reads MP3)
        mp3_path = output_path.with_suffix(".mp3")

        # Stream download with async file writing
        async with client.stream("GET", actual_url) as audio_response:
            if audio_response.status_code != 200:
                return None

            async with aiofiles.open(mp3_path, "wb") as f:
                async for chunk in audio_response.aiter_bytes(chunk_size=65536):  # 64KB chunks
                    await f.write(chunk)

        return mp3_path if mp3_path.exists() else None

    except Exception:
        return None
    finally:
        if should_close_client and client:
            await client.aclose()


async def download_full_audio_async(
    url: str,
    client: httpx.AsyncClient | None = None,
) -> Path:
    """
    Download full audio from SoundCloud URL using async httpx.

    Tries direct API first (with client_id), then falls back to yt-dlp.

    Args:
        url: SoundCloud track URL
        client: Optional shared httpx.AsyncClient for connection pooling

    Returns:
        Path to the downloaded audio file (MP3 or WAV)

    Raises:
        DownloadError: If download fails
    """
    settings = get_settings()

    # Create temp directory if it doesn't exist
    settings.temp_dir.mkdir(parents=True, exist_ok=True)

    # Create a unique temp directory for this download
    temp_dir = Path(tempfile.mkdtemp(dir=settings.temp_dir))
    output_path = temp_dir / "audio.mp3"

    # Try direct API download first (faster - no conversion needed)
    if settings.soundcloud_client_id:
        result = await _try_direct_download_async(
            url,
            output_path,
            settings.soundcloud_client_id,
            settings.proxy_url,
            client,
        )
        if result:
            return result

    # Fallback to yt-dlp (download as MP3 - faster, no conversion)
    # Run yt-dlp in a thread to not block the event loop
    return await asyncio.to_thread(_download_with_ytdlp, url, temp_dir, settings)


def _download_with_ytdlp(url: str, temp_dir: Path, settings) -> Path:
    """
    Fallback download using yt-dlp (synchronous, runs in thread).

    Args:
        url: SoundCloud track URL
        temp_dir: Temporary directory for download
        settings: Application settings

    Returns:
        Path to the downloaded audio file

    Raises:
        DownloadError: If download fails
    """
    output_template = temp_dir / "audio.%(ext)s"

    cmd = [
        "yt-dlp",
        url,
        "-x",  # Extract audio
        "--audio-format",
        "mp3",  # MP3 is faster than WAV (no conversion if source is MP3)
        "--audio-quality",
        "0",  # Best quality
        "-o",
        str(output_template),
        "--quiet",
        "--no-warnings",
        "--no-playlist",
        "--retries",
        "3",
        "--concurrent-fragments",
        "4",  # Download 4 fragments in parallel
    ]

    # Add SoundCloud authentication if configured
    if settings.soundcloud_oauth_token:
        cmd.extend(["--extractor-args", f"soundcloud:oauth_token={settings.soundcloud_oauth_token}"])
    elif settings.soundcloud_client_id:
        cmd.extend(["--extractor-args", f"soundcloud:client_id={settings.soundcloud_client_id}"])

    # Add proxy if configured
    if settings.proxy_url:
        cmd.extend(["--proxy", settings.proxy_url])

    try:
        subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout for full track
        )
    except subprocess.CalledProcessError as e:
        raise DownloadError(f"yt-dlp failed: {e.stderr}") from e
    except subprocess.TimeoutExpired as e:
        raise DownloadError("Download timed out after 300s") from e

    # Check if file was created (could be .mp3 or other format)
    expected_mp3 = temp_dir / "audio.mp3"
    if expected_mp3.exists():
        return expected_mp3

    # Try to find any audio file in the temp directory
    audio_files = list(temp_dir.glob("audio.*"))
    if audio_files:
        return audio_files[0]

    raise DownloadError("No audio file was created")


def download_full_audio(url: str) -> Path:
    """
    Download full audio from SoundCloud URL (synchronous wrapper).

    For backwards compatibility. Prefer download_full_audio_async for new code.

    Args:
        url: SoundCloud track URL

    Returns:
        Path to the downloaded audio file (MP3 or WAV)

    Raises:
        DownloadError: If download fails
    """
    return asyncio.run(download_full_audio_async(url))


def cleanup_audio_file(file_path: Path) -> None:
    """
    Clean up temporary audio file and its directory.

    Args:
        file_path: Path to the audio file to delete
    """
    try:
        if file_path.exists():
            file_path.unlink()

        # Also try to remove the parent temp directory if empty
        parent_dir = file_path.parent
        if parent_dir.exists() and not any(parent_dir.iterdir()):
            parent_dir.rmdir()
    except Exception as e:
        log.warn(f"Cleanup failed for {file_path}: {e}")
