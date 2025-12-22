#!/usr/bin/env python3
"""Download Essentia ML models for audio embeddings."""

import os
import sys
from pathlib import Path

import requests

# Model configuration
MODELS_DIR = Path(__file__).parent.parent / "models"

MODELS = {
    "discogs-effnet": {
        "url": "https://essentia.upf.edu/models/feature-extractors/discogs-effnet/discogs-effnet-bs64-1.pb",
        "filename": "discogs-effnet-bs64-1.pb",
        "size_mb": 18,
        "description": "Discogs-Effnet embedding model (1280 dimensions)",
    },
    "tempocnn": {
        "url": "https://essentia.upf.edu/models/tempo/tempocnn/deepsquare-k16-3.pb",
        "filename": "deepsquare-k16-3.pb",
        "size_mb": 5,
        "description": "TempoCNN tempo detection model (neural network)",
    },
}


def download_file(url: str, dest: Path, description: str) -> bool:
    """Download a file with progress indicator."""
    print(f"Downloading {description}...")
    print(f"  URL: {url}")
    print(f"  Destination: {dest}")

    try:
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()

        total_size = int(response.headers.get("content-length", 0))
        downloaded = 0

        with open(dest, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    mb_downloaded = downloaded / (1024 * 1024)
                    mb_total = total_size / (1024 * 1024)
                    print(f"\r  Progress: {mb_downloaded:.1f}/{mb_total:.1f} MB ({percent:.1f}%)", end="", flush=True)

        print(f"\n  ✓ Downloaded successfully ({downloaded / (1024 * 1024):.1f} MB)")
        return True

    except requests.RequestException as e:
        print(f"\n  ✗ Download failed: {e}")
        return False


def download_models(force: bool = False) -> bool:
    """Download all required models."""
    print("=" * 50)
    print("Essentia Model Downloader")
    print("=" * 50)

    # Create models directory
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\nModels directory: {MODELS_DIR}")

    success = True
    for model_name, model_info in MODELS.items():
        dest = MODELS_DIR / model_info["filename"]
        print(f"\n--- {model_name} ---")

        if dest.exists() and not force:
            size_mb = dest.stat().st_size / (1024 * 1024)
            print(f"  Already exists ({size_mb:.1f} MB)")
            continue

        if not download_file(model_info["url"], dest, model_info["description"]):
            success = False

    print("\n" + "=" * 50)
    if success:
        print("All models downloaded successfully!")
    else:
        print("Some models failed to download.")
    print("=" * 50)

    return success


def check_models() -> dict[str, bool]:
    """Check which models are available."""
    status = {}
    for model_name, model_info in MODELS.items():
        dest = MODELS_DIR / model_info["filename"]
        status[model_name] = dest.exists()
    return status


def get_model_path(model_name: str) -> Path | None:
    """Get the path to a model file."""
    if model_name not in MODELS:
        return None
    return MODELS_DIR / MODELS[model_name]["filename"]


if __name__ == "__main__":
    force = "--force" in sys.argv or "-f" in sys.argv

    if "--check" in sys.argv:
        status = check_models()
        print("Model status:")
        for name, available in status.items():
            symbol = "✓" if available else "✗"
            print(f"  {symbol} {name}")
        sys.exit(0 if all(status.values()) else 1)

    success = download_models(force=force)
    sys.exit(0 if success else 1)
