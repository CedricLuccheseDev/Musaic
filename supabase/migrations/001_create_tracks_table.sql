-- =====================================================
-- TRACKS TABLE SCHEMA
-- Musaic - SoundCloud track database with audio analysis
-- =====================================================

-- Tracks table: stores SoundCloud tracks found by users
-- Uses soundcloud_id as unique identifier to prevent duplicates
-- On conflict, updates the track metadata (stats, download info, etc.)

CREATE TABLE IF NOT EXISTS tracks (
  -- Primary key = SoundCloud ID (no duplicates possible)
  soundcloud_id BIGINT PRIMARY KEY,
  urn TEXT NOT NULL,
  permalink_url TEXT NOT NULL,

  -- Basic info
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  artwork TEXT,

  -- Metadata
  duration INTEGER NOT NULL DEFAULT 0,
  genre TEXT,
  description TEXT,
  soundcloud_created_at TIMESTAMPTZ,
  label TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Stats (updated on each upsert)
  playback_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  -- =====================================================
  -- AUDIO ANALYSIS (from Essentia via musaic-analyzer)
  -- =====================================================

  -- Rhythm
  bpm_detected REAL,                 -- Detected BPM (60-200)
  bpm_confidence REAL,               -- BPM detection confidence (0-1)
  beats_count INTEGER,               -- Number of beats detected
  onset_rate REAL,                   -- Rhythmic density (onsets/second)

  -- Tonal
  key_detected TEXT,                 -- Musical key (e.g., "A minor")
  key_confidence REAL,               -- Key detection confidence (0-1)
  tuning_frequency REAL,             -- Tuning frequency in Hz (~440)

  -- Dynamics
  energy REAL,                       -- Energy level (0-1)
  loudness REAL,                     -- Loudness in dB (negative)
  dynamic_complexity REAL,           -- Volume variation (0-1)

  -- Timbre
  spectral_centroid REAL,            -- Brightness in Hz
  spectral_complexity REAL,          -- Harmonic richness (0-1)
  dissonance REAL,                   -- Dissonance level (0-1)
  pitch_salience REAL,               -- Pitch clarity (0-1)

  -- High-level descriptors
  danceability REAL,                 -- Danceability score (0-1)
  speechiness REAL,                  -- Voice presence (0-1)
  instrumentalness REAL,             -- Instrumental vs vocal (0-1)
  acousticness REAL,                 -- Acoustic vs electronic (0-1)
  valence REAL,                      -- Musical positivity/mood (0-1)
  liveness REAL,                     -- Live recording probability (0-1)

  -- Analysis status
  analysis_status TEXT DEFAULT 'pending',  -- pending/processing/completed/failed
  analysis_error TEXT,
  analyzed_at TIMESTAMPTZ,

  -- =====================================================
  -- DOWNLOAD INFO
  -- =====================================================
  download_status TEXT NOT NULL DEFAULT 'No',
  downloadable BOOLEAN DEFAULT FALSE,
  purchase_url TEXT,
  purchase_title TEXT,
  download_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_tracks_analysis_status ON tracks(analysis_status);
CREATE INDEX IF NOT EXISTS idx_tracks_bpm_detected ON tracks(bpm_detected);
CREATE INDEX IF NOT EXISTS idx_tracks_key_detected ON tracks(key_detected);

-- Feature indexes (for filtering/sorting)
CREATE INDEX IF NOT EXISTS idx_tracks_energy ON tracks(energy);
CREATE INDEX IF NOT EXISTS idx_tracks_danceability ON tracks(danceability);
CREATE INDEX IF NOT EXISTS idx_tracks_valence ON tracks(valence);
CREATE INDEX IF NOT EXISTS idx_tracks_acousticness ON tracks(acousticness);
CREATE INDEX IF NOT EXISTS idx_tracks_instrumentalness ON tracks(instrumentalness);

-- Stats indexes
CREATE INDEX IF NOT EXISTS idx_tracks_playback_count ON tracks(playback_count DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_likes_count ON tracks(likes_count DESC);

-- Download status index
CREATE INDEX IF NOT EXISTS idx_tracks_download_status ON tracks(download_status);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on updates
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read tracks
DROP POLICY IF EXISTS "Tracks are viewable by everyone" ON tracks;
CREATE POLICY "Tracks are viewable by everyone"
  ON tracks FOR SELECT
  USING (true);

-- Policy: Only authenticated users can insert/update
DROP POLICY IF EXISTS "Authenticated users can insert tracks" ON tracks;
CREATE POLICY "Authenticated users can insert tracks"
  ON tracks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update tracks" ON tracks;
CREATE POLICY "Authenticated users can update tracks"
  ON tracks FOR UPDATE
  USING (true);

-- =====================================================
-- COLUMN COMMENTS (documentation)
-- =====================================================

-- Basic info
COMMENT ON COLUMN tracks.soundcloud_id IS 'SoundCloud unique track ID';
COMMENT ON COLUMN tracks.urn IS 'SoundCloud URN (soundcloud:tracks:123)';
COMMENT ON COLUMN tracks.permalink_url IS 'Full SoundCloud URL';

-- Audio analysis - Rhythm
COMMENT ON COLUMN tracks.bpm_detected IS 'Detected BPM (60-200)';
COMMENT ON COLUMN tracks.bpm_confidence IS 'BPM detection confidence (0-1)';
COMMENT ON COLUMN tracks.beats_count IS 'Number of beats detected in analyzed segment';
COMMENT ON COLUMN tracks.onset_rate IS 'Rhythmic density - onsets per second';

-- Audio analysis - Tonal
COMMENT ON COLUMN tracks.key_detected IS 'Musical key (e.g., "A minor", "C major")';
COMMENT ON COLUMN tracks.key_confidence IS 'Key detection confidence (0-1)';
COMMENT ON COLUMN tracks.tuning_frequency IS 'Tuning frequency in Hz (typically ~440)';

-- Audio analysis - Dynamics
COMMENT ON COLUMN tracks.energy IS 'Energy level normalized (0-1)';
COMMENT ON COLUMN tracks.loudness IS 'Loudness in dB (negative value)';
COMMENT ON COLUMN tracks.dynamic_complexity IS 'Volume variation over time (0-1)';

-- Audio analysis - Timbre
COMMENT ON COLUMN tracks.spectral_centroid IS 'Brightness/brilliance in Hz';
COMMENT ON COLUMN tracks.spectral_complexity IS 'Harmonic richness (0-1)';
COMMENT ON COLUMN tracks.dissonance IS 'Dissonance level (0-1)';
COMMENT ON COLUMN tracks.pitch_salience IS 'Pitch clarity (0-1)';

-- Audio analysis - High-level
COMMENT ON COLUMN tracks.danceability IS 'Danceability score (0-1)';
COMMENT ON COLUMN tracks.speechiness IS 'Voice/speech presence (0-1)';
COMMENT ON COLUMN tracks.instrumentalness IS 'Instrumental vs vocal (0=vocal, 1=instrumental)';
COMMENT ON COLUMN tracks.acousticness IS 'Acoustic vs electronic (0=electronic, 1=acoustic)';
COMMENT ON COLUMN tracks.valence IS 'Musical positivity/mood (0=sad, 1=happy)';
COMMENT ON COLUMN tracks.liveness IS 'Live recording probability (0-1)';

-- Analysis status
COMMENT ON COLUMN tracks.analysis_status IS 'Analysis status: pending, processing, completed, failed';
COMMENT ON COLUMN tracks.analysis_error IS 'Error message if analysis failed';
COMMENT ON COLUMN tracks.analyzed_at IS 'Timestamp when analysis completed';
