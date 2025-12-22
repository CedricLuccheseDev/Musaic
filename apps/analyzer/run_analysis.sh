#!/bin/bash
cd "$(dirname "$0")"

# Install dependencies if needed
pip install -q aiofiles httpx[http2] 2>/dev/null || true

# Run locally (uses all CPU cores)
# Usage:
#   ./run_analysis.sh           # Analyze only pending tracks
#   ./run_analysis.sh --force   # Re-analyze all tracks
#   ./run_analysis.sh --stream  # Stream mode (no file download, for VPS)
#   ./run_analysis.sh -s -f     # Stream + force mode

python3 -m scripts.analyze_all_tracks "$@"

# Or use Docker (limited to 3 concurrent by default):
# docker compose run --rm analyzer python -m scripts.analyze_all_tracks "$@"
