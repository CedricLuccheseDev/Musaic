#!/usr/bin/env python3
"""Script to analyze all tracks from Supabase that haven't been analyzed yet."""

import argparse
import asyncio
import signal
import subprocess
import sys
import time
from threading import Lock

# Check and install required packages
def check_and_install_packages():
    """Check if required packages are installed and install them if not."""
    required_packages = {
        'supabase': 'supabase',
        'pydantic': 'pydantic',
        'pydantic_settings': 'pydantic-settings',
        'essentia': 'essentia',
        'numpy': 'numpy',
        'requests': 'requests',
        'aiofiles': 'aiofiles',
        'httpx': 'httpx[http2]',
    }

    missing_packages = []

    for module_name, pip_name in required_packages.items():
        try:
            __import__(module_name)
        except ImportError:
            missing_packages.append(pip_name)

    if missing_packages:
        print(f"\n⚠️  Missing packages detected: {', '.join(missing_packages)}")
        print("📦 Installing missing packages...\n")

        for package in missing_packages:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", "--break-system-packages", package])
                print(f"✓ Installed {package}")
            except subprocess.CalledProcessError:
                print(f"✗ Failed to install {package}")
                sys.exit(1)

        print("\n✓ All packages installed successfully!\n")

# Install missing packages before importing them
check_and_install_packages()

from supabase import create_client

from .config import get_settings
from .analyzer import analyze_audio, AnalysisError
from .downloader import download_full_audio_async, stream_audio_to_file, cleanup_audio_file, DownloadError, create_http_client
from .supabase_client import update_track_analysis, update_track_status
from .models import AnalysisStatus
from .logger import log, Colors

# Graceful shutdown flag
_shutdown_requested = False


# Progress tracking
_progress_lock = Lock()
_progress = {"completed": 0, "in_progress": 0, "total": 0, "successful": 0, "failed": 0}
_active_tasks = {}  # task_id -> {"title": str, "step": str, "percent": int, "phase": str}
_spinner_frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
_spinner_idx = 0
_spinner_running = False
_start_time = 0.0
_completed_times = []  # Track completion times for ETA
_display_lines = 12  # Fixed number of lines for stable display


def get_all_tracks(force: bool = False) -> list[dict]:
    """Get tracks from Supabase."""
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_key)

    query = client.table("tracks").select("soundcloud_id, permalink_url, title, artist")

    if not force:
        # Only get tracks that haven't been successfully analyzed
        query = query.neq("analysis_status", "completed")

    response = query.execute()
    return response.data


def register_task(task_id: int, title: str):
    """Register a new active task."""
    with _progress_lock:
        _active_tasks[task_id] = {"title": title[:18], "step": "Starting", "percent": 0, "phase": "⏳"}


def update_task(task_id: int, step: str, percent: int, phase: str = "🔍"):
    """Update task progress."""
    with _progress_lock:
        if task_id in _active_tasks:
            _active_tasks[task_id]["step"] = step
            _active_tasks[task_id]["percent"] = percent
            _active_tasks[task_id]["phase"] = phase


def unregister_task(task_id: int):
    """Remove task from active list."""
    with _progress_lock:
        _active_tasks.pop(task_id, None)


def start_track():
    """Mark a track as started (in progress)."""
    with _progress_lock:
        _progress["in_progress"] += 1


def finish_track(success: bool, duration: float = 0.0):
    """Mark a track as finished."""
    with _progress_lock:
        _progress["in_progress"] -= 1
        _progress["completed"] += 1
        if success:
            _progress["successful"] += 1
            if duration > 0:
                _completed_times.append(duration)
                # Keep only last 20 for rolling average
                if len(_completed_times) > 20:
                    _completed_times.pop(0)
        else:
            _progress["failed"] += 1


def format_time(seconds: float) -> str:
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


def get_eta() -> str:
    """Calculate estimated time remaining."""
    with _progress_lock:
        completed = _progress["completed"]
        total = _progress["total"]
        remaining = total - completed
        times = list(_completed_times)

    if not times or remaining <= 0:
        return "--"

    # Average time per track (rolling average of last 20)
    avg_time = sum(times) / len(times)

    # Estimate based on concurrent processing
    settings = get_settings()
    concurrent = settings.max_concurrent_analyses

    # ETA = remaining tracks / concurrent * avg_time
    eta_seconds = (remaining / concurrent) * avg_time

    return format_time(eta_seconds)


def print_progress_display():
    """Print multi-line progress display with all active tasks."""
    global _spinner_idx

    with _progress_lock:
        completed = _progress["completed"]
        in_progress = _progress["in_progress"]
        total = _progress["total"]
        successful = _progress["successful"]
        failed = _progress["failed"]
        tasks = dict(_active_tasks)  # Copy

    if total == 0:
        return

    _spinner_idx += 1
    spinner = _spinner_frames[_spinner_idx % len(_spinner_frames)]
    eta = get_eta()

    # Calculate elapsed time
    elapsed = time.time() - _start_time
    elapsed_str = format_time(elapsed)

    # Calculate lines to display
    lines = []

    # Main progress bar
    percent = completed / total if total > 0 else 0
    bar_width = 30
    filled = int(bar_width * percent)
    bar = "█" * filled + "░" * (bar_width - filled)

    # Header line with overall stats
    main_line = f"  {Colors.CYAN}{spinner}{Colors.RESET} [{bar}] {Colors.BOLD}{completed}/{total}{Colors.RESET} ({percent*100:.0f}%)"
    lines.append(main_line)

    # Stats line
    stats_line = f"    {Colors.GREEN}✓ {successful}{Colors.RESET}  {Colors.RED}✗ {failed}{Colors.RESET}  {Colors.DIM}⏱ {elapsed_str}{Colors.RESET}  {Colors.YELLOW}ETA: {eta}{Colors.RESET}"
    lines.append(stats_line)

    # Separator
    lines.append(f"    {Colors.DIM}{'─' * 40}{Colors.RESET}")

    # Group tasks by phase for clearer display
    downloading = [(tid, info) for tid, info in tasks.items() if info["phase"] == "⬇"]
    analyzing = [(tid, info) for tid, info in tasks.items() if info["phase"] == "🔍"]
    waiting = [(tid, info) for tid, info in tasks.items() if info["phase"] == "⏳"]
    saving = [(tid, info) for tid, info in tasks.items() if info["phase"] == "💾"]

    # Show analyzing tasks first (most interesting)
    if analyzing:
        lines.append(f"    {Colors.CYAN}Analyzing ({len(analyzing)}):{Colors.RESET}")
        for tid, info in analyzing[:4]:
            pct = info["percent"]
            step = info["step"][:12].ljust(12)
            title = info["title"][:20]
            mini_bar = "▓" * (pct // 10) + "░" * (10 - pct // 10)
            lines.append(f"      [{mini_bar}] {pct:3d}% {step} {Colors.DIM}{title}{Colors.RESET}")
        if len(analyzing) > 4:
            lines.append(f"      {Colors.DIM}+{len(analyzing) - 4} more...{Colors.RESET}")

    # Show downloading tasks
    if downloading:
        lines.append(f"    {Colors.GREEN}Downloading ({len(downloading)}):{Colors.RESET}")
        titles = [info["title"][:15] for _, info in downloading[:6]]
        lines.append(f"      {Colors.DIM}{', '.join(titles)}{Colors.RESET}")
        if len(downloading) > 6:
            lines.append(f"      {Colors.DIM}+{len(downloading) - 6} more...{Colors.RESET}")

    # Show waiting count only
    if waiting:
        lines.append(f"    {Colors.DIM}Waiting: {len(waiting)} tracks in queue{Colors.RESET}")

    # Pad to EXACTLY _display_lines for stable display (no flickering)
    while len(lines) < _display_lines:
        lines.append("")

    # Truncate if too many lines
    lines = lines[:_display_lines]

    # Move cursor up to overwrite previous output, clear and rewrite
    # ALWAYS move up _display_lines to ensure consistency
    output = f"\033[{_display_lines}A"  # Move up fixed amount
    for line in lines:
        output += f"\033[2K{line}\n"  # Clear line and write

    sys.stdout.write(output)
    sys.stdout.flush()


def print_initial_lines():
    """Print initial empty lines for the display."""
    for _ in range(_display_lines):
        print()


async def spinner_task():
    """Background task to keep display updated."""
    global _spinner_running
    while _spinner_running:
        print_progress_display()
        await asyncio.sleep(0.15)


async def analyze_track(
    track: dict,
    download_semaphore: asyncio.Semaphore,
    analyze_semaphore: asyncio.Semaphore,
    settings,
    task_id: int,
) -> bool:
    """
    Analyze a single track with separate semaphores for download and analysis.

    This allows downloads to continue while other tracks are being analyzed.

    Returns True if successful, False otherwise.
    """
    global _shutdown_requested
    if _shutdown_requested:
        return False

    soundcloud_id = track["soundcloud_id"]
    url = track["permalink_url"]
    title = track.get("title", "Unknown")

    audio_path = None
    start_time = time.time()

    # Register task for progress display
    register_task(task_id, title)

    try:
        # Mark track as started
        start_track()

        # Update status to processing
        await update_track_status(soundcloud_id, AnalysisStatus.PROCESSING)

        # === DOWNLOAD PHASE (limited by download_semaphore) ===
        update_task(task_id, "Waiting", 0, "⏳")
        async with download_semaphore:
            if _shutdown_requested:
                finish_track(False)
                return False

            update_task(task_id, "Download", 10, "⬇")
            audio_path = await asyncio.wait_for(
                download_full_audio_async(url),
                timeout=settings.analysis_timeout_seconds,
            )

        # === ANALYZE PHASE (limited by analyze_semaphore - CPU bound) ===
        update_task(task_id, "Queue", 20, "⏳")
        async with analyze_semaphore:
            if _shutdown_requested:
                finish_track(False)
                return False

            def on_analysis_progress(step: str, percent: int):
                # Map analysis progress (0-100) to display progress (25-90)
                display_percent = 25 + int(percent * 0.65)
                update_task(task_id, step, display_percent, "🔍")

            result = await asyncio.to_thread(analyze_audio, audio_path, on_analysis_progress)

        # === SAVE PHASE (no semaphore - fast I/O) ===
        update_task(task_id, "Saving", 95, "💾")
        await update_track_analysis(soundcloud_id, result.model_dump())

        duration = time.time() - start_time
        duration_ms = int(duration * 1000)
        log.track_analyzed(duration_ms)

        finish_track(True, duration)
        return True

    except asyncio.TimeoutError:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, "Timeout")
        log.track_failed()
        finish_track(False)
        return False

    except DownloadError as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        log.track_failed()
        finish_track(False)
        return False

    except AnalysisError as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        log.track_failed()
        finish_track(False)
        return False

    except Exception as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        log.track_failed()
        finish_track(False)
        return False

    finally:
        # Unregister task from progress display
        unregister_task(task_id)
        # Cleanup temp files
        if audio_path:
            cleanup_audio_file(audio_path)


async def analyze_track_streaming(
    track: dict,
    download_semaphore: asyncio.Semaphore,
    analyze_semaphore: asyncio.Semaphore,
    settings,
    task_id: int,
    http_client=None,
) -> bool:
    """
    Analyze a track using optimized file streaming.

    Streams audio directly to a temp file (avoids RAM buffer overhead).
    Falls back to yt-dlp/YouTube if SoundCloud streaming fails.

    Returns True if successful, False otherwise.
    """
    global _shutdown_requested
    if _shutdown_requested:
        return False

    soundcloud_id = track["soundcloud_id"]
    url = track["permalink_url"]
    title = track.get("title", "Unknown")

    start_time = time.time()
    audio_file = None

    # Register task for progress display
    register_task(task_id, title)

    try:
        # Mark track as started
        start_track()

        # Update status to processing
        await update_track_status(soundcloud_id, AnalysisStatus.PROCESSING)

        # === STREAM PHASE (limited by download_semaphore) ===
        update_task(task_id, "Waiting", 0, "⏳")
        async with download_semaphore:
            if _shutdown_requested:
                finish_track(False)
                return False

            update_task(task_id, "Streaming", 10, "📡")
            audio_file = await asyncio.wait_for(
                stream_audio_to_file(url, client=http_client),
                timeout=settings.analysis_timeout_seconds,
            )

        # === ANALYZE PHASE (limited by analyze_semaphore - CPU bound) ===
        update_task(task_id, "Queue", 20, "⏳")
        async with analyze_semaphore:
            if _shutdown_requested:
                finish_track(False)
                return False

            def on_analysis_progress(step: str, percent: int):
                # Map analysis progress (0-100) to display progress (25-90)
                display_percent = 25 + int(percent * 0.65)
                update_task(task_id, step, display_percent, "🔍")

            result = await asyncio.to_thread(analyze_audio, audio_file, on_analysis_progress)

        # === SAVE PHASE (no semaphore - fast I/O) ===
        update_task(task_id, "Saving", 95, "💾")
        await update_track_analysis(soundcloud_id, result.model_dump())

        duration = time.time() - start_time
        duration_ms = int(duration * 1000)
        log.track_analyzed(duration_ms)

        finish_track(True, duration)
        return True

    except asyncio.TimeoutError:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, "Timeout")
        log.track_failed()
        finish_track(False)
        return False

    except DownloadError as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        log.track_failed()
        finish_track(False)
        return False

    except AnalysisError as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        log.track_failed()
        finish_track(False)
        return False

    except Exception as e:
        await update_track_status(soundcloud_id, AnalysisStatus.FAILED, str(e))
        log.track_failed()
        finish_track(False)
        return False

    finally:
        # Unregister task from progress display
        unregister_task(task_id)


async def main(force: bool = False, stream_mode: bool = False):
    """Main entry point."""
    global _progress, _start_time, _completed_times
    settings = get_settings()
    _completed_times = []  # Reset

    print(f"\n{Colors.BOLD}╔══════════════════════════════════════════════╗{Colors.RESET}")
    print(f"{Colors.BOLD}║     MusaicAnalyzer - Batch Track Analysis    ║{Colors.RESET}")
    print(f"{Colors.BOLD}╚══════════════════════════════════════════════╝{Colors.RESET}\n")

    if force:
        print(f"  {Colors.YELLOW}⚠ Force mode: re-analyzing all tracks{Colors.RESET}\n")

    if stream_mode:
        print(f"  {Colors.CYAN}📡 Stream mode: analyzing without file download{Colors.RESET}\n")

    # Get tracks
    tracks = get_all_tracks(force=force)

    if not tracks:
        print(f"  {Colors.GREEN}✓ No tracks to analyze. All done!{Colors.RESET}\n")
        return

    # Initialize progress
    _progress = {"completed": 0, "in_progress": 0, "total": len(tracks), "successful": 0, "failed": 0, "current_task": ""}

    # Separate limits for download (I/O bound) and analysis (CPU bound)
    max_downloads = settings.max_concurrent_analyses * 3  # Downloads are I/O bound, can do more
    max_analyses = settings.max_concurrent_analyses  # Limited by CPU/RAM

    mode_str = "Streams" if stream_mode else "Downloads"
    print(f"  {Colors.CYAN}●{Colors.RESET} Found {Colors.BOLD}{len(tracks)}{Colors.RESET} tracks to analyze")
    print(f"  {Colors.CYAN}●{Colors.RESET} {mode_str}: {Colors.BOLD}{max_downloads}{Colors.RESET} parallel | Analyses: {Colors.BOLD}{max_analyses}{Colors.RESET} parallel\n")

    # Create separate semaphores for downloads and CPU-bound analysis
    download_semaphore = asyncio.Semaphore(max_downloads)
    analyze_semaphore = asyncio.Semaphore(max_analyses)

    # Choose analysis function based on mode
    analyze_func = analyze_track_streaming if stream_mode else analyze_track

    # Create tasks for all tracks with unique task_id
    tasks = [
        analyze_func(track, download_semaphore, analyze_semaphore, settings, task_id=i)
        for i, track in enumerate(tracks)
    ]

    # Print initial empty lines for the multi-line display
    print(f"  {Colors.DIM}Progress:{Colors.RESET}")
    print_initial_lines()

    # Start timer and spinner background task
    global _spinner_running, _start_time
    _start_time = time.time()
    _spinner_running = True
    spinner = asyncio.create_task(spinner_task())

    # Process all tracks concurrently (limited by semaphore)
    await asyncio.gather(*tasks, return_exceptions=True)

    # Stop spinner
    _spinner_running = False
    await spinner

    # Final newline after progress bar
    print("\n")

    # Summary
    total_elapsed = time.time() - _start_time
    with _progress_lock:
        successful = _progress["successful"]
        failed = _progress["failed"]

    avg_time = total_elapsed / successful if successful > 0 else 0

    print(f"{Colors.BOLD}═══ Batch Complete ═══{Colors.RESET}")
    print(f"  {Colors.GREEN}✓ Analyzed:{Colors.RESET} {successful} tracks")
    print(f"  {Colors.RED}✗ Failed:{Colors.RESET} {failed} tracks")
    print(f"  {Colors.CYAN}● Total time:{Colors.RESET} {format_time(total_elapsed)}")
    print(f"  {Colors.CYAN}● Avg time:{Colors.RESET} {avg_time:.1f}s/track (wall clock)\n")


def handle_shutdown(signum, frame):
    """Handle Ctrl+C gracefully."""
    global _shutdown_requested, _spinner_running
    if _shutdown_requested:
        # Second Ctrl+C, force exit
        print(f"\n\n  {Colors.RED}Force exit{Colors.RESET}\n")
        sys.exit(1)

    _shutdown_requested = True
    _spinner_running = False
    print(f"\n\n  {Colors.YELLOW}⚠ Shutting down gracefully... (Ctrl+C again to force){Colors.RESET}")


def cli():
    """CLI entry point with argument parsing."""
    # Setup signal handler for graceful shutdown
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    parser = argparse.ArgumentParser(
        description="Analyze SoundCloud tracks from Supabase database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m app.analyze_all_tracks              # Analyze only pending tracks
  python -m app.analyze_all_tracks --force      # Re-analyze all tracks
  python -m app.analyze_all_tracks --stream     # Stream mode (no file download, for VPS)
        """
    )
    parser.add_argument(
        "-f", "--force",
        action="store_true",
        help="Force re-analysis of all tracks (including already completed)"
    )
    parser.add_argument(
        "-s", "--stream",
        action="store_true",
        help="Stream mode: analyze audio directly from stream without downloading files (useful for VPS)"
    )

    args = parser.parse_args()

    try:
        asyncio.run(main(force=args.force, stream_mode=args.stream))
    except KeyboardInterrupt:
        pass  # Already handled by signal handler


if __name__ == "__main__":
    cli()
