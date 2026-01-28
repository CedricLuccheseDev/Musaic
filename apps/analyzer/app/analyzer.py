"""Audio analysis using Essentia library - Optimized version."""

import os
import warnings
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import essentia.standard as es
import numpy as np

# Suppress Essentia and TensorFlow warnings
warnings.filterwarnings("ignore", message=".*No network created.*")
warnings.filterwarnings("ignore", category=UserWarning)
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"  # Suppress TensorFlow logs

# Suppress Essentia logging
import essentia
essentia.log.infoActive = False
essentia.log.warningActive = False

from app.config import get_settings
from app.models import AnalysisResult

# Embedding model configuration
EMBEDDING_MODEL_PATH = Path(__file__).parent.parent / "models" / "discogs-effnet-bs64-1.pb"
EMBEDDING_SAMPLE_RATE = 16000  # Discogs-Effnet expects 16kHz
EMBEDDING_DIM = 1280  # Discogs-Effnet outputs 1280-dim embeddings

# TempoCNN model configuration (more accurate BPM detection)
TEMPO_CNN_MODEL_PATH = Path(__file__).parent.parent / "models" / "deepsquare-k16-3.pb"

# Lazy-loaded models (loaded once on first use)
_embedding_model = None
_embedding_model_available = None
_tempo_cnn_model = None
_tempo_cnn_available = None
_resampler_16k = None  # Cached resampler for embedding extraction

# Maximum audio duration to load (3 minutes = 180 seconds)
MAX_AUDIO_DURATION = 180

# Sample rate (44100 Hz = CD quality for better BPM/beat detection accuracy)
SAMPLE_RATE = 44100

# Frame parameters (doubled for 44100 Hz)
FRAME_SIZE = 4096
HOP_SIZE = 2048


class AnalysisError(Exception):
    """Raised when audio analysis fails."""
    pass


def _get_embedding_model():
    """Get or load the embedding model (lazy loading)."""
    global _embedding_model, _embedding_model_available

    # Return cached result if already checked
    if _embedding_model_available is not None:
        return _embedding_model if _embedding_model_available else None

    # Check if model file exists
    if not EMBEDDING_MODEL_PATH.exists():
        _embedding_model_available = False
        return None

    try:
        from essentia.standard import TensorflowPredictEffnetDiscogs
        _embedding_model = TensorflowPredictEffnetDiscogs(
            graphFilename=str(EMBEDDING_MODEL_PATH),
            output="PartitionedCall:1"  # Embedding layer output
        )
        _embedding_model_available = True
        return _embedding_model
    except Exception:
        _embedding_model_available = False
        return None


def _get_tempo_cnn_model():
    """Get or load the TempoCNN model (lazy loading)."""
    global _tempo_cnn_model, _tempo_cnn_available

    # Return cached result if already checked
    if _tempo_cnn_available is not None:
        return _tempo_cnn_model if _tempo_cnn_available else None

    # Check if model file exists
    if not TEMPO_CNN_MODEL_PATH.exists():
        _tempo_cnn_available = False
        return None

    try:
        from essentia.standard import TempoCNN
        _tempo_cnn_model = TempoCNN(graphFilename=str(TEMPO_CNN_MODEL_PATH))
        _tempo_cnn_available = True
        return _tempo_cnn_model
    except Exception:
        _tempo_cnn_available = False
        return None


def _get_resampler_16k():
    """Get or create cached resampler for 16kHz (embedding model)."""
    global _resampler_16k
    if _resampler_16k is None:
        _resampler_16k = es.Resample(
            inputSampleRate=SAMPLE_RATE,
            outputSampleRate=EMBEDDING_SAMPLE_RATE
        )
    return _resampler_16k


def _extract_embedding(audio: np.ndarray) -> list[float] | None:
    """
    Extract 200-dimensional audio embedding using Discogs-Effnet.

    The model was trained on Discogs data and produces embeddings
    suitable for music similarity search.

    Args:
        audio: Audio samples at SAMPLE_RATE (22050 Hz)

    Returns:
        List of 200 floats (embedding vector) or None if model unavailable
    """
    model = _get_embedding_model()
    if model is None:
        return None

    try:
        # Resample to 16kHz (what Discogs-Effnet expects) using cached resampler
        if SAMPLE_RATE != EMBEDDING_SAMPLE_RATE:
            resampler = _get_resampler_16k()
            audio_16k = resampler(audio)
        else:
            audio_16k = audio

        # Run the model - returns embeddings for each frame
        embeddings = model(audio_16k)

        # Average across all frames to get a single embedding vector
        if len(embeddings.shape) > 1:
            embedding = np.mean(embeddings, axis=0)
        else:
            embedding = embeddings

        # Normalize to unit length for cosine similarity
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return [round(float(x), 6) for x in embedding]

    except Exception:
        # Silently fail - embedding is optional
        return None


def _load_audio(file_path: Path) -> np.ndarray:
    """Load audio file once at optimized sample rate, limited to MAX_AUDIO_DURATION."""
    try:
        loader = es.MonoLoader(filename=str(file_path), sampleRate=SAMPLE_RATE)
        audio = loader()
        # Limit to MAX_AUDIO_DURATION seconds (3 minutes) - enough for analysis
        max_samples = int(SAMPLE_RATE * MAX_AUDIO_DURATION)
        if len(audio) > max_samples:
            audio = audio[:max_samples]
        return audio
    except RuntimeError as e:
        raise AnalysisError(f"Cannot load audio file: {e}") from e


def _load_audio_from_bytes(audio_bytes: bytes) -> np.ndarray:
    """
    Load audio from bytes (in-memory) at optimized sample rate.

    Uses AudioLoader which can read from virtual file via ffmpeg.
    """
    # Check minimum size (a valid MP3 should be at least a few KB)
    if len(audio_bytes) < 1000:
        raise AnalysisError(f"Audio data too small ({len(audio_bytes)} bytes) - stream may have failed")

    try:
        # Write to a temp file because Essentia doesn't support memory buffers directly
        # But we use a RAM-backed tmpfs if available for speed
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=True) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            loader = es.MonoLoader(filename=tmp.name, sampleRate=SAMPLE_RATE)
            audio = loader()
            # Limit to MAX_AUDIO_DURATION seconds (3 minutes)
            max_samples = int(SAMPLE_RATE * MAX_AUDIO_DURATION)
            if len(audio) > max_samples:
                audio = audio[:max_samples]
            return audio
    except RuntimeError as e:
        # More helpful error message
        if "End of file" in str(e) or "Could not find stream" in str(e):
            raise AnalysisError(f"Invalid audio data ({len(audio_bytes)} bytes) - track may be unavailable or geo-blocked") from e
        raise AnalysisError(f"Cannot load audio from bytes: {e}") from e


def _find_highlight_and_extract(audio: np.ndarray, segment_duration: float) -> tuple[np.ndarray, float]:
    """
    Find the most energetic segment and extract it in one pass.

    Returns:
        tuple: (audio_segment, highlight_time)
    """
    duration = len(audio) / SAMPLE_RATE

    # If track is shorter than segment, return all
    if duration <= segment_duration:
        return audio, duration / 2

    # Frame-based energy analysis (1 second windows, 0.5s hop)
    frame_size = SAMPLE_RATE  # 1 second
    hop_size = SAMPLE_RATE // 2  # 0.5 second

    energies = []
    for frame in es.FrameGenerator(audio, frameSize=frame_size, hopSize=hop_size):
        energies.append(es.Energy()(frame))

    if not energies:
        return audio[:int(segment_duration * SAMPLE_RATE)], segment_duration / 2

    energies = np.array(energies)
    if energies.max() > 0:
        energies = energies / energies.max()

    # Find best segment using rolling average
    window_frames = int(segment_duration / (hop_size / SAMPLE_RATE))
    window_frames = min(window_frames, len(energies))

    segment_scores = []
    for i in range(len(energies) - window_frames + 1):
        segment_scores.append(np.mean(energies[i:i + window_frames]))

    if not segment_scores:
        return audio[:int(segment_duration * SAMPLE_RATE)], segment_duration / 2

    best_idx = np.argmax(segment_scores)
    frame_time = hop_size / SAMPLE_RATE
    segment_start_time = best_idx * frame_time

    # Refine to find the exact first kick of the drop
    highlight_time = _refine_drop_start(audio, segment_start_time, segment_duration)

    # Clamp segment extraction to valid range
    half_segment = segment_duration / 2
    extract_center = max(half_segment, min(duration - half_segment, highlight_time))

    # Extract segment centered on the refined drop position
    start_sample = int((extract_center - half_segment) * SAMPLE_RATE)
    end_sample = int((extract_center + half_segment) * SAMPLE_RATE)

    return audio[start_sample:end_sample], round(highlight_time, 2)


def _refine_drop_start(
    full_audio: np.ndarray,
    segment_start_time: float,
    segment_duration: float
) -> float:
    """
    Find the exact first kick of the drop instead of the segment center.

    Uses energy gradient analysis to find the "impact" moment,
    then onset detection to pinpoint the first strong kick transient.

    Args:
        full_audio: Full track audio samples at SAMPLE_RATE
        segment_start_time: Start time of the energetic segment in seconds
        segment_duration: Duration of the segment (e.g., 30 seconds)

    Returns:
        Refined drop start time in seconds (first kick of the drop)
    """
    try:
        duration = len(full_audio) / SAMPLE_RATE
        fallback_time = segment_start_time + segment_duration / 2

        # Search window: 5s before to 10s after segment start
        search_start = max(0, segment_start_time - 5.0)
        search_end = min(duration, segment_start_time + 10.0)

        start_sample = int(search_start * SAMPLE_RATE)
        end_sample = int(search_end * SAMPLE_RATE)
        search_segment = full_audio[start_sample:end_sample]

        if len(search_segment) < SAMPLE_RATE:
            return fallback_time

        # Compute bass energy in 100ms windows with 50ms hop
        window_samples = int(0.1 * SAMPLE_RATE)
        hop_samples = int(0.05 * SAMPLE_RATE)

        lowpass = es.LowPass(cutoffFrequency=150)
        energy_extractor = es.Energy()

        energies = []
        for i in range(0, len(search_segment) - window_samples, hop_samples):
            window = search_segment[i:i + window_samples]
            bass = lowpass(window)
            energies.append(energy_extractor(bass))

        energies = np.array(energies)
        if len(energies) < 10:
            return fallback_time

        # Normalize energies
        if energies.max() > 0:
            energies = energies / energies.max()

        # Compute energy gradient and smooth it
        gradient = np.gradient(energies)
        smoothed_gradient = np.convolve(gradient, np.ones(5) / 5, mode='same')

        # Find maximum energy increase (the "impact" moment)
        impact_idx = int(np.argmax(smoothed_gradient))
        impact_time = search_start + (impact_idx * hop_samples / SAMPLE_RATE)

        # Use onset detection to find the exact first kick
        onset_search_start = max(0, impact_time - 1.0)
        onset_search_end = min(duration, impact_time + 2.0)

        onset_start_sample = int(onset_search_start * SAMPLE_RATE)
        onset_end_sample = int(onset_search_end * SAMPLE_RATE)
        onset_segment = full_audio[onset_start_sample:onset_end_sample]

        if len(onset_segment) < SAMPLE_RATE // 2:
            return round(impact_time, 3)

        # HFC onset detection (best for percussive transients)
        frame_size = 1024
        hop = 512

        windowing = es.Windowing(type='hann')
        spectrum = es.Spectrum(size=frame_size)
        onset_hfc = es.OnsetDetection(method='hfc')

        hfc_values = []
        for frame in es.FrameGenerator(onset_segment, frameSize=frame_size, hopSize=hop):
            windowed = windowing(frame)
            spec = spectrum(windowed)
            hfc_values.append(onset_hfc(spec, spec))

        hfc_array = np.array(hfc_values)
        if len(hfc_array) == 0 or hfc_array.max() == 0:
            return round(impact_time, 3)

        hfc_array = hfc_array / hfc_array.max()

        # Find onset peaks
        onsets_algo = es.Onsets()
        onset_matrix = np.vstack([hfc_array])
        onset_times = onsets_algo(onset_matrix, [1])

        if len(onset_times) == 0:
            return round(impact_time, 3)

        # Filter for strong onsets (> 70% of max HFC)
        strong_onsets = []
        for onset_time in onset_times:
            onset_frame = int(onset_time * SAMPLE_RATE / hop)
            if onset_frame < len(hfc_array) and hfc_array[onset_frame] > 0.7:
                strong_onsets.append(float(onset_time))

        if strong_onsets:
            first_kick = onset_search_start + strong_onsets[0]
            return round(first_kick, 3)
        elif len(onset_times) > 0:
            first_onset = onset_search_start + float(onset_times[0])
            return round(first_onset, 3)
        else:
            return round(impact_time, 3)

    except Exception:
        return segment_start_time + segment_duration / 2



def analyze_audio(file_path: str | Path, progress_callback=None) -> AnalysisResult:
    """
    Analyze audio file and extract features using Essentia.

    Optimized version that extracts only essential features:
    - BPM + confidence
    - Key + confidence
    - Highlight time (drop position)
    - Embedding (for similarity search)

    Args:
        file_path: Path to the audio file
        progress_callback: Optional callback function(step: str, percent: int) for progress updates
    """
    file_path = Path(file_path)

    def _progress(step: str, percent: int):
        if progress_callback:
            progress_callback(step, percent)

    if not file_path.exists():
        raise AnalysisError(f"Audio file not found: {file_path}")

    try:
        settings = get_settings()

        # === LOAD AUDIO ONCE ===
        _progress("Loading", 0)
        full_audio = _load_audio(file_path)

        if len(full_audio) == 0:
            raise AnalysisError("Audio file is empty")

        # Check minimum duration (need at least 3 seconds for FFT)
        full_duration = len(full_audio) / SAMPLE_RATE
        if full_duration < 3.0:
            raise AnalysisError(f"Audio too short ({full_duration:.1f}s), need at least 3 seconds")

        # === FIND HIGHLIGHT & EXTRACT SEGMENT ===
        _progress("Finding highlight", 10)
        audio, highlight_time = _find_highlight_and_extract(
            full_audio,
            settings.audio_duration_seconds
        )

        duration = len(audio) / SAMPLE_RATE

        # Ensure segment is long enough for analysis
        if len(audio) < FRAME_SIZE * 2:
            raise AnalysisError(f"Audio segment too short for analysis ({duration:.1f}s)")

        # === PARALLEL FEATURE EXTRACTION ===
        # BPM, Key, and Embedding are independent - run in parallel
        _progress("Analyzing", 20)

        with ThreadPoolExecutor(max_workers=3) as executor:
            rhythm_future = executor.submit(_extract_rhythm, audio)
            key_future = executor.submit(_extract_key, audio)
            embedding_future = executor.submit(_extract_embedding, full_audio)

            # Collect results (blocks until each completes)
            bpm, bpm_confidence = rhythm_future.result()
            _progress("Key", 50)
            key_detected, key_confidence = key_future.result()
            _progress("Embedding", 80)
            embedding = embedding_future.result()

        _progress("Done", 100)

        return AnalysisResult(
            bpm_detected=bpm,
            bpm_confidence=bpm_confidence,
            key_detected=key_detected,
            key_confidence=key_confidence,
            highlight_time=highlight_time,
            embedding=embedding,
        )

    except Exception as e:
        raise AnalysisError(f"Failed to analyze audio: {e}") from e


def analyze_audio_from_bytes(audio_bytes: bytes, progress_callback=None) -> AnalysisResult:
    """
    Analyze audio from bytes (in-memory) without needing a file.

    This is useful for streaming scenarios where you don't want to save to disk.

    Args:
        audio_bytes: Raw audio data (MP3, WAV, etc.)
        progress_callback: Optional callback function(step: str, percent: int)

    Returns:
        AnalysisResult with essential features (BPM, key, highlight, embedding)
    """
    def _progress(step: str, percent: int):
        if progress_callback:
            progress_callback(step, percent)

    try:
        settings = get_settings()

        # === LOAD AUDIO FROM BYTES ===
        _progress("Loading", 0)
        full_audio = _load_audio_from_bytes(audio_bytes)

        if len(full_audio) == 0:
            raise AnalysisError("Audio data is empty")

        # Check minimum duration (need at least 3 seconds for FFT)
        full_duration = len(full_audio) / SAMPLE_RATE
        if full_duration < 3.0:
            raise AnalysisError(f"Audio too short ({full_duration:.1f}s), need at least 3 seconds")

        # === FIND HIGHLIGHT & EXTRACT SEGMENT ===
        _progress("Finding highlight", 10)
        audio, highlight_time = _find_highlight_and_extract(
            full_audio,
            settings.audio_duration_seconds
        )

        duration = len(audio) / SAMPLE_RATE

        # Ensure segment is long enough for analysis
        if len(audio) < FRAME_SIZE * 2:
            raise AnalysisError(f"Audio segment too short for analysis ({duration:.1f}s)")

        # === PARALLEL FEATURE EXTRACTION ===
        # BPM, Key, and Embedding are independent - run in parallel
        _progress("Analyzing", 20)

        with ThreadPoolExecutor(max_workers=3) as executor:
            rhythm_future = executor.submit(_extract_rhythm, audio)
            key_future = executor.submit(_extract_key, audio)
            embedding_future = executor.submit(_extract_embedding, full_audio)

            # Collect results (blocks until each completes)
            bpm, bpm_confidence = rhythm_future.result()
            _progress("Key", 50)
            key_detected, key_confidence = key_future.result()
            _progress("Embedding", 80)
            embedding = embedding_future.result()

        _progress("Done", 100)

        return AnalysisResult(
            bpm_detected=bpm,
            bpm_confidence=bpm_confidence,
            key_detected=key_detected,
            key_confidence=key_confidence,
            highlight_time=highlight_time,
            embedding=embedding,
        )

    except Exception as e:
        raise AnalysisError(f"Failed to analyze audio from bytes: {e}") from e


# =============================================================================
# RHYTHM EXTRACTORS
# =============================================================================

def _extract_bpm_tempocnn(audio: np.ndarray) -> tuple[float, float]:
    """
    Extract BPM using TempoCNN neural network.

    More accurate than traditional methods, especially for complex rhythms.
    Returns (bpm, confidence) or (0.0, 0.0) if model unavailable.
    """
    model = _get_tempo_cnn_model()
    if model is None:
        return 0.0, 0.0

    try:
        global_tempo, local_tempo, local_probs = model(audio)

        # Confidence = average max probability across local estimates
        if len(local_probs) > 0:
            confidence = float(np.mean([float(np.max(p)) for p in local_probs]))
        else:
            confidence = 0.5

        return float(global_tempo), confidence
    except Exception:
        return 0.0, 0.0



def _run_multifeature(audio: np.ndarray) -> tuple[float, float, np.ndarray]:
    """Run RhythmExtractor2013 multifeature method."""
    try:
        rhythm = es.RhythmExtractor2013(method="multifeature")
        bpm, beats, conf, _, _ = rhythm(audio)
        return float(bpm), float(conf), beats
    except Exception:
        return 0.0, 0.0, np.array([])


def _run_degara(audio: np.ndarray) -> tuple[float, float, np.ndarray]:
    """Run RhythmExtractor2013 degara method."""
    try:
        rhythm = es.RhythmExtractor2013(method="degara")
        bpm, beats, conf, _, _ = rhythm(audio)
        return float(bpm), float(conf), beats
    except Exception:
        return 0.0, 0.0, np.array([])


def _run_loop_estimator(audio: np.ndarray) -> tuple[float, float]:
    """Run LoopBpmEstimator."""
    try:
        estimator = es.LoopBpmEstimator()
        bpm = float(estimator(audio))
        return bpm, 0.7  # Fixed confidence
    except Exception:
        return 0.0, 0.0


def _extract_rhythm(audio: np.ndarray) -> tuple[float, float]:
    """
    Extract BPM and confidence using multiple methods IN PARALLEL.

    Combines several approaches to improve accuracy:
    1. TempoCNN neural network (most accurate for BPM)
    2. RhythmExtractor2013 with multifeature (good general purpose)
    3. RhythmExtractor2013 with degara (good for electronic music)
    4. LoopBpmEstimator (good for loops/electronic)

    Args:
        audio: Audio segment for BPM analysis

    Returns:
        tuple: (bpm, confidence)
    """
    # Run all 4 BPM methods in parallel (Essentia releases GIL)
    with ThreadPoolExecutor(max_workers=4) as executor:
        cnn_future = executor.submit(_extract_bpm_tempocnn, audio)
        multi_future = executor.submit(_run_multifeature, audio)
        degara_future = executor.submit(_run_degara, audio)
        loop_future = executor.submit(_run_loop_estimator, audio)

        # Collect results
        bpm_cnn, conf_cnn = cnn_future.result()
        bpm_multi, conf_multi, beats_multi = multi_future.result()
        bpm_degara, conf_degara, beats_degara = degara_future.result()
        bpm_loop, conf_loop = loop_future.result()

    # Method 5: Calculate BPM from beat intervals (ground truth validation)
    bpm_from_beats = 0.0
    beats = beats_multi if len(beats_multi) > len(beats_degara) else beats_degara
    if len(beats) > 2:
        intervals = np.diff(beats)
        # Remove outliers (intervals outside 0.25-2 seconds = 30-240 BPM)
        valid_intervals = intervals[(intervals > 0.25) & (intervals < 2.0)]
        if len(valid_intervals) > 2:
            median_interval = float(np.median(valid_intervals))
            bpm_from_beats = 60.0 / median_interval

    # Collect all candidates with their confidence
    # TempoCNN gets 3x weight because it's the most accurate neural network method
    candidates = []
    if bpm_cnn > 0:
        candidates.append((bpm_cnn, conf_cnn * 3.0, "cnn"))  # 3x weight - most accurate
    if bpm_multi > 0:
        candidates.append((bpm_multi, conf_multi * 0.7, "multi"))  # Lower weight
    if bpm_degara > 0:
        candidates.append((bpm_degara, conf_degara * 0.7, "degara"))  # Lower weight
    if bpm_loop > 0:
        candidates.append((bpm_loop, conf_loop, "loop"))
    if bpm_from_beats > 0:
        candidates.append((bpm_from_beats, 0.6, "beats"))  # Lower weight

    if not candidates:
        return 120.0, 0.0  # Default fallback

    # Normalize all candidates to 100-200 range (better for electronic/DnB)
    def normalize_bpm(bpm: float) -> float:
        while bpm < 100:
            bpm *= 2
        while bpm > 200:
            bpm /= 2
        return bpm

    normalized = [(normalize_bpm(bpm), conf, src) for bpm, conf, src in candidates]

    # Find consensus: group similar BPMs (within 4% tolerance)
    def bpm_similar(a: float, b: float) -> bool:
        if b == 0:
            return False
        ratio = a / b
        for mult in [1.0, 2.0, 0.5]:
            if 0.96 <= ratio * mult <= 1.04:
                return True
        return False

    # Score each candidate by agreement
    scored = []
    for i, (bpm_i, conf_i, src_i) in enumerate(normalized):
        agreement = conf_i
        for j, (bpm_j, conf_j, _) in enumerate(normalized):
            if i != j and bpm_similar(bpm_i, bpm_j):
                agreement += conf_j * 0.3
        scored.append((bpm_i, agreement, src_i))

    scored.sort(key=lambda x: x[1], reverse=True)
    best_bpm, best_score, _ = scored[0]

    # Refine BPM using beat intervals for higher precision
    if len(beats) > 10:
        intervals = np.diff(beats)
        expected_interval = 60.0 / best_bpm
        tolerance = expected_interval * 0.05
        matching_intervals = intervals[
            (intervals > expected_interval - tolerance) &
            (intervals < expected_interval + tolerance)
        ]
        if len(matching_intervals) > 5:
            precise_interval = float(np.mean(matching_intervals))
            refined_bpm = 60.0 / precise_interval
            if abs(refined_bpm - best_bpm) < 1.0:
                best_bpm = refined_bpm

    # Keep 2 decimal precision for BPM
    best_bpm = round(best_bpm, 2)
    final_confidence = min(1.0, best_score / 3.0)

    return float(best_bpm), round(final_confidence, 3)


# =============================================================================
# TONAL EXTRACTORS
# =============================================================================

def _extract_key(audio: np.ndarray) -> tuple[str, float]:
    """Extract musical key and confidence."""
    key_extractor = es.KeyExtractor(profileType="edma")
    key, scale, confidence = key_extractor(audio)

    key_detected = f"{key} {scale}"
    confidence = min(1.0, max(0.0, float(confidence)))

    return key_detected, round(confidence, 3)
