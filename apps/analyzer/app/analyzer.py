"""Audio analysis using Essentia library - Optimized version."""

import math
import os
import warnings
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
        # Resample to 16kHz (what Discogs-Effnet expects)
        if SAMPLE_RATE != EMBEDDING_SAMPLE_RATE:
            resampler = es.Resample(
                inputSampleRate=SAMPLE_RATE,
                outputSampleRate=EMBEDDING_SAMPLE_RATE
            )
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
    """Load audio file once at optimized sample rate."""
    try:
        loader = es.MonoLoader(filename=str(file_path), sampleRate=SAMPLE_RATE)
        return loader()
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
            return loader()
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
    start_time = best_idx * frame_time
    center_time = start_time + segment_duration / 2

    # Clamp to valid range
    half_segment = segment_duration / 2
    center_time = max(half_segment, min(duration - half_segment, center_time))

    # Extract segment
    start_sample = int((center_time - half_segment) * SAMPLE_RATE)
    end_sample = int((center_time + half_segment) * SAMPLE_RATE)

    return audio[start_sample:end_sample], round(center_time, 2)


def _extract_all_frame_features(audio: np.ndarray) -> dict:
    """
    Extract frame-based features in a single pass.

    This is the main optimization - instead of multiple separate loops,
    we do everything in ONE pass through the audio.
    """
    # Pre-create all extractors (reuse across frames)
    spectrum_analyzer = es.Spectrum(size=FRAME_SIZE)
    spectral_peaks = es.SpectralPeaks(sampleRate=SAMPLE_RATE)
    flatness_extractor = es.Flatness()
    rolloff_extractor = es.RollOff()
    hfc_extractor = es.HFC()
    dissonance_extractor = es.Dissonance()
    energy_extractor = es.Energy()

    # Accumulators
    flatnesses = []
    rolloffs = []
    hfcs = []
    dissonances = []
    energies = []
    vocal_ratios = []

    # Single pass through all frames
    for frame in es.FrameGenerator(audio, frameSize=FRAME_SIZE, hopSize=HOP_SIZE):
        spectrum = spectrum_analyzer(frame)

        # Energy
        energies.append(energy_extractor(frame))

        # Spectral features
        flatnesses.append(flatness_extractor(spectrum))
        rolloffs.append(rolloff_extractor(spectrum))
        hfcs.append(hfc_extractor(spectrum))

        # Spectral peaks for dissonance
        freqs, mags = spectral_peaks(spectrum)
        if len(freqs) > 1:
            dissonances.append(dissonance_extractor(freqs, mags))

        # Vocal energy ratio for instrumentalness
        total_energy = np.sum(spectrum ** 2)
        if total_energy > 0:
            # Vocal formant region (adjusted for 22050 Hz sample rate)
            vocal_bins = spectrum[22:90]  # ~1-4kHz region
            vocal_energy = np.sum(vocal_bins ** 2)
            vocal_ratios.append(vocal_energy / total_energy)

    # Calculate derived metrics
    energies = np.array(energies) if energies else np.array([0])
    flatnesses = np.array(flatnesses) if flatnesses else np.array([0])
    rolloffs = np.array(rolloffs) if rolloffs else np.array([0])
    hfcs = np.array(hfcs) if hfcs else np.array([0])

    # Acousticness
    acoustic_scores = (1.0 - np.minimum(1.0, flatnesses * 2)) * (1.0 - np.minimum(1.0, hfcs / 1000))
    acousticness = np.mean(acoustic_scores) if len(acoustic_scores) > 0 else 0.5

    # Instrumentalness & Speechiness (vocal presence)
    # Both are derived from vocal energy ratio in the 1-4kHz range
    if vocal_ratios:
        avg_vocal_ratio = np.mean(vocal_ratios)
        # Speechiness = how much vocal content (singing or speech)
        # Scale: avg_vocal_ratio ~0.2-0.4 for vocals, ~0.1 for instrumental
        speechiness = min(1.0, max(0.0, (avg_vocal_ratio - 0.1) * 4))
        # Instrumentalness = inverse (low vocal = instrumental)
        instrumentalness = 1.0 - speechiness
    else:
        speechiness = 0.0
        instrumentalness = 0.5

    # Liveness (energy variance)
    if len(energies) > 1:
        energy_variance = np.var(energies) / (np.mean(energies) + 1e-10)
        variance_score = min(1.0, energy_variance * 10)
    else:
        variance_score = 0

    return {
        "dissonance": min(1.0, float(np.mean(dissonances))) if dissonances else 0,
        "speechiness": round(speechiness, 3),
        "instrumentalness": round(max(0.0, min(1.0, instrumentalness)), 3),
        "acousticness": max(0.0, min(1.0, float(acousticness))),
        "liveness_variance": variance_score,
    }


def analyze_audio(file_path: str | Path, progress_callback=None) -> AnalysisResult:
    """
    Analyze audio file and extract features using Essentia.

    Optimized version that:
    - Loads audio only once
    - Uses lower sample rate (22050 Hz)
    - Extracts all frame-based features in a single pass

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

        # === RHYTHM ANALYSIS ===
        _progress("Rhythm", 20)
        bpm, bpm_confidence, _, beat_offset = _extract_rhythm(
            audio,
            full_audio=full_audio,
            highlight_time=highlight_time
        )

        # === TONAL ANALYSIS ===
        _progress("Key detection", 40)
        key_detected, key_confidence = _extract_key(audio)

        # === ALL FRAME-BASED FEATURES IN ONE PASS ===
        _progress("Spectral analysis", 50)
        frame_features = _extract_all_frame_features(audio)

        # === SIMPLE EXTRACTORS (no frame loop needed) ===
        _progress("Dynamics", 80)
        energy = _extract_energy(audio)
        loudness = _extract_loudness(audio)
        dynamic_complexity = _extract_dynamic_complexity(audio)
        spectral_centroid = _extract_spectral_centroid(audio)
        danceability = _extract_danceability(audio)

        # === DERIVED METRICS ===
        _progress("Finalizing", 90)
        valence = _extract_valence(key_detected, bpm, spectral_centroid)
        liveness = _extract_liveness(dynamic_complexity, frame_features["liveness_variance"])

        # === EMBEDDING EXTRACTION (on full audio for better representation) ===
        _progress("Embedding", 95)
        embedding = _extract_embedding(full_audio)

        _progress("Done", 100)

        return AnalysisResult(
            # Rhythm
            bpm_detected=bpm,
            bpm_confidence=bpm_confidence,
            beat_offset=beat_offset,
            # Tonal
            key_detected=key_detected,
            key_confidence=key_confidence,
            # Dynamics
            energy=energy,
            loudness=loudness,
            dynamic_complexity=dynamic_complexity,
            # Timbre
            spectral_centroid=spectral_centroid,
            dissonance=round(frame_features["dissonance"], 3),
            # High-level
            danceability=danceability,
            speechiness=round(frame_features["speechiness"], 3),
            instrumentalness=round(frame_features["instrumentalness"], 3),
            acousticness=round(frame_features["acousticness"], 3),
            valence=valence,
            liveness=liveness,
            # Highlight
            highlight_time=highlight_time,
            # Embedding
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
        AnalysisResult with all extracted features
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

        # === RHYTHM ANALYSIS ===
        _progress("Rhythm", 20)
        bpm, bpm_confidence, _, beat_offset = _extract_rhythm(
            audio,
            full_audio=full_audio,
            highlight_time=highlight_time
        )

        # === TONAL ANALYSIS ===
        _progress("Key detection", 40)
        key_detected, key_confidence = _extract_key(audio)

        # === ALL FRAME-BASED FEATURES IN ONE PASS ===
        _progress("Spectral analysis", 50)
        frame_features = _extract_all_frame_features(audio)

        # === SIMPLE EXTRACTORS (no frame loop needed) ===
        _progress("Dynamics", 80)
        energy = _extract_energy(audio)
        loudness = _extract_loudness(audio)
        dynamic_complexity = _extract_dynamic_complexity(audio)
        spectral_centroid = _extract_spectral_centroid(audio)
        danceability = _extract_danceability(audio)

        # === DERIVED METRICS ===
        _progress("Finalizing", 90)
        valence = _extract_valence(key_detected, bpm, spectral_centroid)
        liveness = _extract_liveness(dynamic_complexity, frame_features["liveness_variance"])

        # === EMBEDDING EXTRACTION (on full audio for better representation) ===
        _progress("Embedding", 95)
        embedding = _extract_embedding(full_audio)

        _progress("Done", 100)

        return AnalysisResult(
            # Rhythm
            bpm_detected=bpm,
            bpm_confidence=bpm_confidence,
            beat_offset=beat_offset,
            # Tonal
            key_detected=key_detected,
            key_confidence=key_confidence,
            # Dynamics
            energy=energy,
            loudness=loudness,
            dynamic_complexity=dynamic_complexity,
            # Timbre
            spectral_centroid=spectral_centroid,
            dissonance=round(frame_features["dissonance"], 3),
            # High-level
            danceability=danceability,
            speechiness=round(frame_features["speechiness"], 3),
            instrumentalness=round(frame_features["instrumentalness"], 3),
            acousticness=round(frame_features["acousticness"], 3),
            valence=valence,
            liveness=liveness,
            # Highlight
            highlight_time=highlight_time,
            # Embedding
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


def _compute_bass_energy(segment: np.ndarray) -> float:
    """
    Compute energy in bass frequencies (< 150 Hz).

    Used to identify downbeats which typically have more kick/bass energy.
    """
    try:
        if len(segment) < 100:
            return 0.0
        lowpass = es.LowPass(cutoffFrequency=150)
        bass = lowpass(segment)
        return float(es.Energy()(bass))
    except Exception:
        return 0.0


def _extract_beat_offset_from_drop(full_audio: np.ndarray, highlight_time: float, bpm: float) -> float | None:
    """
    Extract beat offset using improved downbeat detection.

    Uses bass energy analysis to identify the downbeat (beat 1) which typically
    has more kick/bass energy than other beats in 4/4 time.

    Args:
        full_audio: Full track audio samples
        highlight_time: Time of the drop/highlight in seconds
        bpm: Already detected BPM for validation

    Returns:
        Beat offset in seconds (phase relative to track start), or None if detection failed
    """
    try:
        # Extract segment: 1s before drop to 20s after (longer for stability)
        drop_start = max(0, highlight_time - 1.0)
        drop_end = min(len(full_audio) / SAMPLE_RATE, highlight_time + 20.0)

        start_sample = int(drop_start * SAMPLE_RATE)
        end_sample = int(drop_end * SAMPLE_RATE)
        drop_segment = full_audio[start_sample:end_sample]

        if len(drop_segment) < SAMPLE_RATE * 4:  # Need at least 4 seconds
            return None

        # Detect beats using BeatTrackerMultiFeature
        beat_tracker = es.BeatTrackerMultiFeature()
        beats, _ = beat_tracker(drop_segment)

        if len(beats) < 8:
            return None

        beat_interval = 60.0 / bpm

        # Analyze bass energy on each beat to find the downbeat
        bass_energies = []
        window_samples = int(0.03 * SAMPLE_RATE)  # 30ms window around beat

        for beat_time in beats[:32]:  # Analyze first 32 beats (8 bars)
            start = int(beat_time * SAMPLE_RATE) - window_samples
            end = int(beat_time * SAMPLE_RATE) + window_samples
            if start >= 0 and end < len(drop_segment):
                segment = drop_segment[start:end]
                bass_energy = _compute_bass_energy(segment)
                bass_energies.append((beat_time, bass_energy))

        if len(bass_energies) < 8:
            # Fallback: use first beat if not enough data
            return round((float(beats[0]) + drop_start) % beat_interval, 3)

        # Group beats by their TEMPORAL position in measure (0, 1, 2, 3)
        # Use the first beat as reference point for calculating positions
        first_beat_time = bass_energies[0][0]
        position_energies: list[list[tuple[float, float]]] = [[] for _ in range(4)]

        for beat_time, energy in bass_energies:
            # Calculate which beat position (0-3) this beat occupies
            beats_from_first = (beat_time - first_beat_time) / beat_interval
            position = round(beats_from_first) % 4
            position_energies[position].append((beat_time, energy))

        avg_energies = [
            np.mean([e for _, e in beats]) if beats else 0.0
            for beats in position_energies
        ]

        # Check if energy distribution is meaningful (not uniform)
        max_energy = max(avg_energies)
        min_energy = min(avg_energies)
        if max_energy > 0 and (max_energy - min_energy) / max_energy > 0.1:
            # Downbeat is the position with highest average bass energy
            downbeat_position = int(np.argmax(avg_energies))
        else:
            # Energy is uniform, use position 0 as fallback
            downbeat_position = 0

        # Find the first beat that is at the downbeat position
        if position_energies[downbeat_position]:
            first_downbeat_time = position_energies[downbeat_position][0][0]
            first_downbeat = first_downbeat_time + drop_start
            return round(first_downbeat % beat_interval, 3)

        # Fallback: use first detected beat
        return round((float(beats[0]) + drop_start) % beat_interval, 3)

    except Exception:
        return None


def _extract_rhythm(
    audio: np.ndarray,
    full_audio: np.ndarray | None = None,
    highlight_time: float | None = None
) -> tuple[float, float, int, float | None]:
    """
    Extract BPM, confidence, beat count, and beat offset using multiple methods.

    Combines several approaches to improve accuracy:
    1. TempoCNN neural network (most accurate for BPM)
    2. RhythmExtractor2013 with multifeature (good general purpose)
    3. RhythmExtractor2013 with degara (good for electronic music)
    4. LoopBpmEstimator (good for loops/electronic)
    5. BeatTrackerMultiFeature for precise beat positions at the drop

    Args:
        audio: Audio segment for BPM analysis
        full_audio: Full track audio for beat offset detection at the drop
        highlight_time: Time of the drop/highlight for beat offset detection

    Returns:
        tuple: (bpm, confidence, beat_count, beat_offset)
               beat_offset is the phase offset of the first beat in seconds
    """
    # Method 1: TempoCNN (neural network - most accurate for BPM)
    bpm_cnn, conf_cnn = _extract_bpm_tempocnn(audio)

    # Method 2: Multifeature (default, good general purpose)
    try:
        rhythm_multi = es.RhythmExtractor2013(method="multifeature")
        bpm_multi, beats_multi, conf_multi, _, _ = rhythm_multi(audio)
        bpm_multi = float(bpm_multi)
        conf_multi = float(conf_multi)
    except Exception:
        bpm_multi, conf_multi, beats_multi = 0.0, 0.0, np.array([])

    # Method 3: Degara (better for electronic/dance music)
    try:
        rhythm_degara = es.RhythmExtractor2013(method="degara")
        bpm_degara, beats_degara, conf_degara, _, _ = rhythm_degara(audio)
        bpm_degara = float(bpm_degara)
        conf_degara = float(conf_degara)
    except Exception:
        bpm_degara, conf_degara, beats_degara = 0.0, 0.0, np.array([])

    # Method 4: LoopBpmEstimator (good for loops, electronic)
    try:
        loop_estimator = es.LoopBpmEstimator()
        bpm_loop = float(loop_estimator(audio))
        conf_loop = 0.7  # Fixed confidence for this method
    except Exception:
        bpm_loop, conf_loop = 0.0, 0.0

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
        return 120.0, 0.0, 0, None  # Default fallback

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

    # Round BPM to nearest integer - music BPM is always whole numbers
    # This prevents micro-drifts in beatgrid calculations
    best_bpm = round(best_bpm)

    final_confidence = min(1.0, best_score / 3.0)

    # Use BeatTrackerMultiFeature for more accurate beat offset detection at the drop
    beat_offset = None
    if full_audio is not None and highlight_time is not None and highlight_time > 0:
        beat_offset = _extract_beat_offset_from_drop(full_audio, highlight_time, best_bpm)

    # Fallback: try on the analysis segment if drop detection failed
    if beat_offset is None:
        beat_offset = _extract_beat_offset_from_drop(audio, 0.0, best_bpm)

    # Last fallback to RhythmExtractor2013 beats
    if beat_offset is None and len(beats) > 0:
        first_beat = float(beats[0])
        beat_interval = 60.0 / best_bpm
        beat_offset = round(first_beat % beat_interval, 3)

    return float(best_bpm), round(final_confidence, 3), len(beats), beat_offset


# =============================================================================
# BEAT OFFSET REANALYSIS (lightweight)
# =============================================================================

def reanalyze_beat_offset_from_bytes(
    audio_bytes: bytes,
    bpm: float,
    highlight_time: float | None = None
) -> float | None:
    """
    Reanalyze only the beat offset from audio bytes.

    This is a lightweight function that only recalculates the beat_offset
    using the existing BPM value. Useful for batch reanalysis after
    algorithm improvements.

    Args:
        audio_bytes: Raw audio data (MP3, WAV, etc.)
        bpm: Existing BPM value from the database
        highlight_time: Existing highlight_time, or None to recalculate

    Returns:
        New beat_offset value, or None if detection failed
    """
    try:
        full_audio = _load_audio_from_bytes(audio_bytes)

        if len(full_audio) == 0:
            return None

        # Round BPM to nearest integer for consistent calculations
        bpm = round(bpm)

        # Use existing highlight_time or find it
        if highlight_time is None or highlight_time <= 0:
            settings = get_settings()
            _, highlight_time = _find_highlight_and_extract(
                full_audio,
                settings.audio_duration_seconds
            )

        # Calculate beat_offset using the improved algorithm
        beat_offset = _extract_beat_offset_from_drop(full_audio, highlight_time, bpm)

        # Fallback: try from the beginning if drop detection failed
        if beat_offset is None:
            beat_offset = _extract_beat_offset_from_drop(full_audio, 0.0, bpm)

        return beat_offset

    except Exception:
        return None


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


# =============================================================================
# DYNAMICS EXTRACTORS (simple, no frame loop)
# =============================================================================

def _extract_energy(audio: np.ndarray) -> float:
    """Extract normalized energy level."""
    energy = es.Energy()(audio)

    if energy > 0:
        log_energy = math.log10(energy + 1)
        normalized = min(1.0, max(0.0, log_energy / 6.0))
    else:
        normalized = 0.0

    return round(normalized, 3)


def _extract_loudness(audio: np.ndarray) -> float:
    """Extract loudness in dB (LUFS-like).

    Returns a value typically between -60 and 0 dB.
    -60 = very quiet
    -20 = moderate
    -6 = loud (typical mastered track)
    0 = maximum
    """
    # Use RMS energy converted to dB for a more meaningful loudness value
    rms = np.sqrt(np.mean(audio ** 2))
    if rms > 0:
        loudness_db = 20 * np.log10(rms)
    else:
        loudness_db = -60.0

    # Clamp to reasonable range
    loudness_db = max(-60.0, min(0.0, float(loudness_db)))
    return round(loudness_db, 2)


def _extract_dynamic_complexity(audio: np.ndarray) -> float:
    """Extract dynamic complexity."""
    complexity, _ = es.DynamicComplexity()(audio)
    normalized = min(1.0, max(0.0, float(complexity) / 10.0))
    return round(normalized, 3)


def _extract_spectral_centroid(audio: np.ndarray) -> float:
    """Extract spectral centroid (brightness) normalized to 0-1.

    0 = dark/warm sound (sub-bass dominant)
    1 = bright/harsh sound (high frequencies dominant)

    Typical values for music: 0.1-0.4
    """
    # Calculate centroid frame by frame for better accuracy
    centroids = []
    spectrum_analyzer = es.Spectrum(size=FRAME_SIZE)
    nyquist = SAMPLE_RATE / 2  # 22050 Hz
    centroid_extractor = es.Centroid(range=nyquist)

    for frame in es.FrameGenerator(audio, frameSize=FRAME_SIZE, hopSize=HOP_SIZE):
        spectrum = spectrum_analyzer(frame)
        # Centroid returns value in Hz (0 to nyquist range)
        centroid_hz = centroid_extractor(spectrum)
        # Normalize to 0-1 by dividing by nyquist frequency
        centroids.append(centroid_hz / nyquist)

    if not centroids:
        return 0.0

    avg_centroid = float(np.mean(centroids))

    # Clamp to 0-1 range
    return round(max(0.0, min(1.0, avg_centroid)), 3)


def _extract_danceability(audio: np.ndarray) -> float:
    """Extract danceability score."""
    danceability, _ = es.Danceability()(audio)
    normalized = min(1.0, max(0.0, float(danceability) / 3.0))
    return round(normalized, 3)


# =============================================================================
# DERIVED METRICS
# =============================================================================

def _extract_valence(key: str, bpm: float, spectral_centroid: float) -> float:
    """Extract valence (musical positivity).

    Args:
        key: Musical key (e.g., "C major", "A minor")
        bpm: Beats per minute
        spectral_centroid: Brightness normalized 0-1
    """
    is_major = "major" in key.lower()
    key_valence = 0.7 if is_major else 0.3

    tempo_valence = min(1.0, max(0.0, (bpm - 60) / 140))

    # spectral_centroid is now 0-1, use directly as brightness
    brightness_valence = spectral_centroid

    valence = (key_valence * 0.4) + (tempo_valence * 0.35) + (brightness_valence * 0.25)
    return round(valence, 3)


def _extract_liveness(dynamic_complexity: float, variance_score: float) -> float:
    """Extract liveness from pre-computed values."""
    liveness = (dynamic_complexity * 0.5) + (variance_score * 0.5)
    return round(max(0.0, min(1.0, liveness)), 3)
