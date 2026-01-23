-- =====================================================
-- MUSAIC DATABASE SCHEMA
-- Run this script in Supabase SQL Editor to initialize the database
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
  beat_offset REAL,
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
CREATE INDEX IF NOT EXISTS idx_tracks_energy ON tracks(energy);
CREATE INDEX IF NOT EXISTS idx_tracks_danceability ON tracks(danceability);
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
  daily_search_count INTEGER DEFAULT 0,
  last_search_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  energy REAL,
  danceability REAL,
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
    t.energy,
    t.danceability,
    t.download_status,
    (t.embedding <=> source.embedding)::FLOAT AS distance
  FROM tracks t, source
  WHERE t.embedding IS NOT NULL
    AND t.soundcloud_id != source_track_id
  ORDER BY t.embedding <=> source.embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SOUNDCLOUD CONNECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS soundcloud_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soundcloud_user_id BIGINT NOT NULL,
  soundcloud_username TEXT,
  soundcloud_avatar TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE soundcloud_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own soundcloud connection"
  ON soundcloud_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own soundcloud connection"
  ON soundcloud_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own soundcloud connection"
  ON soundcloud_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own soundcloud connection"
  ON soundcloud_connections FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- USER LIKED TRACKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_liked_tracks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soundcloud_id BIGINT NOT NULL,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, soundcloud_id)
);

ALTER TABLE user_liked_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own liked tracks"
  ON user_liked_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liked tracks"
  ON user_liked_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own liked tracks"
  ON user_liked_tracks FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PLAYLISTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  target_duration INTEGER,
  style TEXT,
  free_download_only BOOLEAN DEFAULT FALSE,
  reference_track_id BIGINT REFERENCES tracks(soundcloud_id),
  is_draft BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_draft_per_user
  ON playlists(user_id) WHERE is_draft = TRUE;
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);

DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own playlists"
  ON playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own playlists"
  ON playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists"
  ON playlists FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PLAYLIST TRACKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  soundcloud_id BIGINT NOT NULL,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, soundcloud_id)
);

ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own playlist tracks"
  ON playlist_tracks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own playlist tracks"
  ON playlist_tracks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own playlist tracks"
  ON playlist_tracks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid()
  ));

-- =====================================================
-- PLAYLIST FEEDBACK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS playlist_feedback (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  soundcloud_id BIGINT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('like', 'skip')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, soundcloud_id)
);

ALTER TABLE playlist_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own playlist feedback"
  ON playlist_feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM playlists WHERE playlists.id = playlist_feedback.playlist_id AND playlists.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own playlist feedback"
  ON playlist_feedback FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM playlists WHERE playlists.id = playlist_feedback.playlist_id AND playlists.user_id = auth.uid()
  ));

-- =====================================================
-- PLAYLIST HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_or_create_draft(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  draft_id UUID;
BEGIN
  SELECT id INTO draft_id FROM playlists WHERE user_id = p_user_id AND is_draft = TRUE;
  IF draft_id IS NULL THEN
    INSERT INTO playlists (user_id, is_draft) VALUES (p_user_id, TRUE) RETURNING id INTO draft_id;
  END IF;
  RETURN draft_id;
END;
$$;

CREATE OR REPLACE FUNCTION check_and_increment_quota(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_count INTEGER;
  last_date DATE;
  user_is_premium BOOLEAN;
BEGIN
  SELECT daily_search_count, last_search_date, is_premium
  INTO current_count, last_date, user_is_premium
  FROM profiles WHERE id = p_user_id;

  IF user_is_premium THEN RETURN TRUE; END IF;

  IF last_date IS NULL OR last_date < CURRENT_DATE THEN
    UPDATE profiles SET daily_search_count = 1, last_search_date = CURRENT_DATE WHERE id = p_user_id;
    RETURN TRUE;
  END IF;

  IF current_count < 5 THEN
    UPDATE profiles SET daily_search_count = daily_search_count + 1 WHERE id = p_user_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
