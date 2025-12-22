"""Colored logger for Musaic Analyzer."""

from datetime import datetime
from enum import Enum
from typing import Any


class Colors:
    """ANSI color codes."""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    # Foreground colors
    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    GRAY = "\033[90m"

    # Bright colors
    BRIGHT_RED = "\033[91m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_BLUE = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN = "\033[96m"


class LogLevel(Enum):
    """Log levels with icons and colors."""
    INFO = ("●", Colors.CYAN)
    SUCCESS = ("✓", Colors.GREEN)
    WARN = ("⚠", Colors.YELLOW)
    ERROR = ("✗", Colors.RED)
    DEBUG = ("·", Colors.GRAY)


class Tags(Enum):
    """Log tags with colors."""
    DB = ("DB", Colors.MAGENTA)
    SC = ("SC", Colors.BRIGHT_YELLOW)  # SoundCloud
    AI = ("AI", Colors.BRIGHT_CYAN)
    AUDIO = ("AUDIO", Colors.BRIGHT_GREEN)
    API = ("API", Colors.BRIGHT_BLUE)


class Logger:
    """Colored logger for Musaic Analyzer."""

    def __init__(self):
        self._session_stats = {
            "tracks_analyzed": 0,
            "tracks_failed": 0,
            "total_duration_ms": 0,
        }

    def _get_time(self) -> str:
        """Get formatted timestamp."""
        now = datetime.now()
        return f"{Colors.DIM}{now.strftime('%H:%M:%S')}{Colors.RESET}"

    def _format_tag(self, tag: Tags) -> str:
        """Format a tag with its color."""
        name, color = tag.value
        return f"{color}[{name}]{Colors.RESET}"

    def _log(self, level: LogLevel, message: str, tag: Tags | None = None) -> None:
        """Internal log method."""
        icon, color = level.value
        time_str = self._get_time()
        tag_str = f" {self._format_tag(tag)}" if tag else ""

        print(f"{time_str}{tag_str} {color}{icon}{Colors.RESET} {message}", flush=True)

    # Basic log methods
    def info(self, message: str, tag: Tags | None = None) -> None:
        """Log info message."""
        self._log(LogLevel.INFO, message, tag)

    def success(self, message: str, tag: Tags | None = None) -> None:
        """Log success message."""
        self._log(LogLevel.SUCCESS, message, tag)

    def warn(self, message: str, tag: Tags | None = None) -> None:
        """Log warning message."""
        self._log(LogLevel.WARN, message, tag)

    def error(self, message: str, tag: Tags | None = None) -> None:
        """Log error message."""
        self._log(LogLevel.ERROR, message, tag)

    def debug(self, message: str, tag: Tags | None = None) -> None:
        """Log debug message."""
        self._log(LogLevel.DEBUG, message, tag)

    # Database operations
    @property
    def db(self) -> "DbLogger":
        """Database logger."""
        return DbLogger(self)

    # SoundCloud operations
    @property
    def sc(self) -> "ScLogger":
        """SoundCloud logger."""
        return ScLogger(self)

    # Audio operations
    @property
    def audio(self) -> "AudioLogger":
        """Audio analysis logger."""
        return AudioLogger(self)

    # API operations
    @property
    def api(self) -> "ApiLogger":
        """API logger."""
        return ApiLogger(self)

    # Session stats
    def track_analyzed(self, duration_ms: int = 0) -> None:
        """Track a successful analysis."""
        self._session_stats["tracks_analyzed"] += 1
        self._session_stats["total_duration_ms"] += duration_ms

    def track_failed(self) -> None:
        """Track a failed analysis."""
        self._session_stats["tracks_failed"] += 1

    def progress(self, current: int, total: int) -> None:
        """Print inline progress after each track."""
        analyzed = self._session_stats["tracks_analyzed"]
        failed = self._session_stats["tracks_failed"]
        total_ms = self._session_stats["total_duration_ms"]
        avg_sec = (total_ms / 1000) / analyzed if analyzed > 0 else 0

        progress_str = f"{Colors.DIM}[{current}/{total}]{Colors.RESET}"
        stats_str = f"{Colors.GREEN}✓{analyzed}{Colors.RESET} {Colors.RED}✗{failed}{Colors.RESET} {Colors.CYAN}~{avg_sec:.1f}s/track{Colors.RESET}"
        print(f"         {progress_str} {stats_str}", flush=True)

    def stats(self) -> None:
        """Print final session statistics."""
        analyzed = self._session_stats["tracks_analyzed"]
        failed = self._session_stats["tracks_failed"]
        total_ms = self._session_stats["total_duration_ms"]

        total_sec = total_ms / 1000
        avg_sec = total_sec / analyzed if analyzed > 0 else 0

        print(f"\n{Colors.BOLD}═══ Batch Complete ═══{Colors.RESET}", flush=True)
        print(f"  {Colors.GREEN}✓ Analyzed:{Colors.RESET} {analyzed} tracks", flush=True)
        print(f"  {Colors.RED}✗ Failed:{Colors.RESET} {failed} tracks", flush=True)
        print(f"  {Colors.CYAN}● Total time:{Colors.RESET} {total_sec:.1f}s", flush=True)
        print(f"  {Colors.CYAN}● Avg time:{Colors.RESET} {avg_sec:.1f}s/track\n", flush=True)

    def reset_stats(self) -> None:
        """Reset session statistics."""
        self._session_stats = {
            "tracks_analyzed": 0,
            "tracks_failed": 0,
            "total_duration_ms": 0,
        }


class DbLogger:
    """Database operation logger."""

    def __init__(self, logger: Logger):
        self._logger = logger

    def query(self, table: str, count: int | None = None) -> None:
        """Log a database query."""
        count_str = f" ({count} rows)" if count is not None else ""
        self._logger.info(f"Query {Colors.BOLD}{table}{Colors.RESET}{count_str}", Tags.DB)

    def upsert(self, table: str, count: int = 1) -> None:
        """Log a database upsert."""
        self._logger.success(f"Upsert {Colors.BOLD}{table}{Colors.RESET} ({count} rows)", Tags.DB)

    def update(self, table: str, id_value: Any) -> None:
        """Log a database update."""
        self._logger.success(f"Update {Colors.BOLD}{table}{Colors.RESET} (id: {id_value})", Tags.DB)

    def error(self, message: str) -> None:
        """Log a database error."""
        self._logger.error(message, Tags.DB)


class ScLogger:
    """SoundCloud operation logger."""

    def __init__(self, logger: Logger):
        self._logger = logger

    def download(self, url: str) -> None:
        """Log a download start."""
        short_url = url[-50:] if len(url) > 50 else url
        self._logger.info(f"Downloading {Colors.DIM}...{short_url}{Colors.RESET}", Tags.SC)

    def downloaded(self, title: str) -> None:
        """Log a successful download."""
        self._logger.success(f"Downloaded {Colors.BOLD}{title}{Colors.RESET}", Tags.SC)

    def error(self, message: str) -> None:
        """Log a SoundCloud error."""
        self._logger.error(message, Tags.SC)


class AudioLogger:
    """Audio analysis logger."""

    def __init__(self, logger: Logger):
        self._logger = logger

    def analyzing(self, title: str) -> None:
        """Log analysis start."""
        self._logger.info(f"Analyzing {Colors.BOLD}{title}{Colors.RESET}", Tags.AUDIO)

    def analyzed(self, title: str, bpm: int | None = None, key: str | None = None) -> None:
        """Log successful analysis."""
        details = []
        if bpm:
            details.append(f"BPM={bpm}")
        if key:
            details.append(f"Key={key}")
        detail_str = f" ({', '.join(details)})" if details else ""
        self._logger.success(f"Analyzed {Colors.BOLD}{title}{Colors.RESET}{detail_str}", Tags.AUDIO)

    def error(self, message: str) -> None:
        """Log an audio analysis error."""
        self._logger.error(message, Tags.AUDIO)


class ApiLogger:
    """API operation logger."""

    def __init__(self, logger: Logger):
        self._logger = logger

    def request(self, method: str, path: str) -> None:
        """Log an API request."""
        self._logger.info(f"{Colors.BOLD}{method}{Colors.RESET} {path}", Tags.API)

    def response(self, status: int, path: str) -> None:
        """Log an API response."""
        if 200 <= status < 300:
            self._logger.success(f"{status} {path}", Tags.API)
        elif 400 <= status < 500:
            self._logger.warn(f"{status} {path}", Tags.API)
        else:
            self._logger.error(f"{status} {path}", Tags.API)

    def error(self, message: str) -> None:
        """Log an API error."""
        self._logger.error(message, Tags.API)


# Global logger instance
log = Logger()
