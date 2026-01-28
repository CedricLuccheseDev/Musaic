-- =====================================================
-- MUSAIC DATABASE SCHEMA
-- Run this script in Supabase SQL Editor to initialize the database
-- =====================================================

-- =====================================================
-- DROP EXISTING OBJECTS (order matters for foreign keys)
-- =====================================================

-- Drop trigger on auth.users (table always exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop tables (CASCADE also drops triggers and indexes on these tables)
DROP TABLE IF EXISTS set_tracks CASCADE;
DROP TABLE IF EXISTS sets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS find_similar_tracks(BIGINT, INT);
DROP FUNCTION IF EXISTS exec(TEXT);
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS handle_new_user();

-- =====================================================

-- Enable vector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- TRACKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tracks (
  -- Primary key = SoundCloud ID
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

  -- Stats
  playback_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  -- Audio analysis
  bpm_detected REAL,
  bpm_confidence REAL,
  key_detected TEXT,
  key_confidence REAL,
  highlight_time REAL,
  analysis_status TEXT DEFAULT 'pending',
  analysis_error TEXT,
  analyzed_at TIMESTAMPTZ,

  -- Embeddings for similarity search
  embedding vector(1280),

  -- Download info
  download_status TEXT NOT NULL DEFAULT 'No',
  downloadable BOOLEAN DEFAULT FALSE,
  purchase_url TEXT,
  purchase_title TEXT,
  download_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_analysis_status ON tracks(analysis_status);
CREATE INDEX IF NOT EXISTS idx_tracks_bpm_detected ON tracks(bpm_detected);
CREATE INDEX IF NOT EXISTS idx_tracks_key_detected ON tracks(key_detected);
CREATE INDEX IF NOT EXISTS idx_tracks_download_status ON tracks(download_status);
CREATE INDEX IF NOT EXISTS idx_tracks_duration ON tracks(duration);
CREATE INDEX IF NOT EXISTS idx_tracks_tags ON tracks USING GIN(tags);
CREATE INDEX IF NOT EXISTS tracks_embedding_idx ON tracks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks are viewable by everyone" ON tracks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tracks" ON tracks FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update tracks" ON tracks FOR UPDATE USING (true);

-- =====================================================
-- PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- SoundCloud OAuth
  soundcloud_id BIGINT UNIQUE,
  soundcloud_username TEXT,
  soundcloud_avatar_url TEXT,
  soundcloud_access_token TEXT,
  soundcloud_refresh_token TEXT,
  soundcloud_token_expires_at TIMESTAMPTZ
);

-- Index for SoundCloud lookups
CREATE INDEX IF NOT EXISTS idx_profiles_soundcloud_id ON profiles(soundcloud_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Execute dynamic SQL (for AI search)
CREATE OR REPLACE FUNCTION exec(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query || ') t'
  INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION exec(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION exec(TEXT) TO authenticated;

-- Find similar tracks by embedding
-- =====================================================
-- DJ SETS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  target_duration INTEGER, -- in seconds
  avg_track_playtime INTEGER DEFAULT 70, -- % of track duration played (60-80)
  mood TEXT,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'completed'
  is_public BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS set_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  soundcloud_id BIGINT NOT NULL REFERENCES tracks(soundcloud_id),
  position INTEGER NOT NULL,

  -- Optional notes
  transition_note TEXT, -- "crossfade 16 bars", "drop mix", etc.

  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(set_id, position)
);

-- Indexes for sets
CREATE INDEX IF NOT EXISTS idx_sets_user_id ON sets(user_id);
CREATE INDEX IF NOT EXISTS idx_sets_status ON sets(status);
CREATE INDEX IF NOT EXISTS idx_set_tracks_set_id ON set_tracks(set_id);
CREATE INDEX IF NOT EXISTS idx_set_tracks_soundcloud_id ON set_tracks(soundcloud_id);

-- Auto-update updated_at for sets
DROP TRIGGER IF EXISTS update_sets_updated_at ON sets;
CREATE TRIGGER update_sets_updated_at
  BEFORE UPDATE ON sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for sets
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sets" ON sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sets" ON sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sets" ON sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sets" ON sets FOR DELETE USING (auth.uid() = user_id);

-- RLS for set_tracks
ALTER TABLE set_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own set tracks" ON set_tracks FOR SELECT
  USING (EXISTS (SELECT 1 FROM sets WHERE sets.id = set_tracks.set_id AND sets.user_id = auth.uid()));
CREATE POLICY "Users can insert own set tracks" ON set_tracks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sets WHERE sets.id = set_tracks.set_id AND sets.user_id = auth.uid()));
CREATE POLICY "Users can update own set tracks" ON set_tracks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sets WHERE sets.id = set_tracks.set_id AND sets.user_id = auth.uid()));
CREATE POLICY "Users can delete own set tracks" ON set_tracks FOR DELETE
  USING (EXISTS (SELECT 1 FROM sets WHERE sets.id = set_tracks.set_id AND sets.user_id = auth.uid()));

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS find_similar_tracks(BIGINT, INT);
CREATE OR REPLACE FUNCTION find_similar_tracks(
  source_track_id BIGINT,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  soundcloud_id BIGINT,
  title TEXT,
  artist TEXT,
  artwork TEXT,
  duration INTEGER,
  genre TEXT,
  bpm_detected REAL,
  key_detected TEXT,
  download_status TEXT,
  distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH source AS (
    SELECT t.embedding FROM tracks t WHERE t.soundcloud_id = source_track_id
  )
  SELECT
    t.soundcloud_id,
    t.title,
    t.artist,
    t.artwork,
    t.duration,
    t.genre,
    t.bpm_detected,
    t.key_detected,
    t.download_status,
    (t.embedding <=> source.embedding)::FLOAT AS distance
  FROM tracks t, source
  WHERE t.embedding IS NOT NULL
    AND t.soundcloud_id != source_track_id
  ORDER BY t.embedding <=> source.embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
