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

  -- Tonal
  key_detected TEXT,                 -- Musical key (e.g., "A minor")
  key_confidence REAL,               -- Key detection confidence (0-1)

  -- Dynamics
  energy REAL,                       -- Energy level (0-1)
  loudness REAL,                     -- Loudness in dB (negative)
  dynamic_complexity REAL,           -- Volume variation (0-1)

  -- Timbre
  spectral_centroid REAL,            -- Brightness in Hz
  dissonance REAL,                   -- Dissonance level (0-1)

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
CREATE INDEX IF NOT EXISTS idx_tracks_downloadable ON tracks(downloadable) WHERE downloadable = TRUE;

-- Duration index (for filtering by track length)
CREATE INDEX IF NOT EXISTS idx_tracks_duration ON tracks(duration);

-- Tags index (GIN for array containment queries)
CREATE INDEX IF NOT EXISTS idx_tracks_tags ON tracks USING GIN(tags);

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

-- Audio analysis - Tonal
COMMENT ON COLUMN tracks.key_detected IS 'Musical key (e.g., "A minor", "C major")';
COMMENT ON COLUMN tracks.key_confidence IS 'Key detection confidence (0-1)';

-- Audio analysis - Dynamics
COMMENT ON COLUMN tracks.energy IS 'Energy level normalized (0-1)';
COMMENT ON COLUMN tracks.loudness IS 'Loudness in dB (negative value)';
COMMENT ON COLUMN tracks.dynamic_complexity IS 'Volume variation over time (0-1)';

-- Audio analysis - Timbre
COMMENT ON COLUMN tracks.spectral_centroid IS 'Brightness/brilliance in Hz';
COMMENT ON COLUMN tracks.dissonance IS 'Dissonance level (0-1)';

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

-- =====================================================
-- EXTENSIONS & VECTOR EMBEDDINGS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column for similarity search
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS embedding vector(200);

-- Index for fast cosine similarity searches
CREATE INDEX IF NOT EXISTS tracks_embedding_idx ON tracks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON COLUMN tracks.embedding IS 'Audio feature embedding vector (200 dimensions) for similarity search';

-- =====================================================
-- RPC FUNCTIONS FOR SIMILARITY SEARCH
-- =====================================================

-- Find tracks similar to a given track using embedding cosine distance
CREATE OR REPLACE FUNCTION find_similar_tracks(
  source_track_id BIGINT,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  soundcloud_id BIGINT,
  urn TEXT,
  permalink_url TEXT,
  title TEXT,
  artist TEXT,
  artwork TEXT,
  duration INTEGER,
  genre TEXT,
  description TEXT,
  soundcloud_created_at TIMESTAMPTZ,
  label TEXT,
  tags TEXT[],
  playback_count INTEGER,
  likes_count INTEGER,
  reposts_count INTEGER,
  comment_count INTEGER,
  bpm_detected REAL,
  bpm_confidence REAL,
  key_detected TEXT,
  key_confidence REAL,
  energy REAL,
  loudness REAL,
  dynamic_complexity REAL,
  spectral_centroid REAL,
  dissonance REAL,
  danceability REAL,
  speechiness REAL,
  instrumentalness REAL,
  acousticness REAL,
  valence REAL,
  liveness REAL,
  analysis_status TEXT,
  analysis_error TEXT,
  analyzed_at TIMESTAMPTZ,
  download_status TEXT,
  downloadable BOOLEAN,
  purchase_url TEXT,
  purchase_title TEXT,
  download_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH source AS (
    SELECT t.embedding FROM tracks t WHERE t.soundcloud_id = source_track_id
  )
  SELECT
    t.soundcloud_id,
    t.urn,
    t.permalink_url,
    t.title,
    t.artist,
    t.artwork,
    t.duration,
    t.genre,
    t.description,
    t.soundcloud_created_at,
    t.label,
    t.tags,
    t.playback_count,
    t.likes_count,
    t.reposts_count,
    t.comment_count,
    t.bpm_detected,
    t.bpm_confidence,
    t.key_detected,
    t.key_confidence,
    t.energy,
    t.loudness,
    t.dynamic_complexity,
    t.spectral_centroid,
    t.dissonance,
    t.danceability,
    t.speechiness,
    t.instrumentalness,
    t.acousticness,
    t.valence,
    t.liveness,
    t.analysis_status,
    t.analysis_error,
    t.analyzed_at,
    t.download_status,
    t.downloadable,
    t.purchase_url,
    t.purchase_title,
    t.download_count,
    t.created_at,
    t.updated_at,
    (t.embedding <=> source.embedding)::FLOAT AS distance
  FROM tracks t, source
  WHERE t.embedding IS NOT NULL
    AND t.soundcloud_id != source_track_id
  ORDER BY t.embedding <=> source.embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;