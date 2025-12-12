-- Artists table: stores SoundCloud artists/users
-- Uses soundcloud_id as unique identifier to prevent duplicates
-- Linked to tracks via artist_id foreign key

CREATE TABLE IF NOT EXISTS artists (
  -- Primary key = SoundCloud user ID
  soundcloud_id BIGINT PRIMARY KEY,
  permalink_url TEXT NOT NULL,

  -- Basic info
  username TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  banner_url TEXT,

  -- Profile info
  description TEXT,
  city TEXT,
  country TEXT,

  -- Stats
  followers_count INTEGER DEFAULT 0,
  followings_count INTEGER DEFAULT 0,
  track_count INTEGER DEFAULT 0,
  playlist_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,

  -- Social links (extracted from description or profile)
  website_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  facebook_url TEXT,
  spotify_url TEXT,
  youtube_url TEXT,

  -- Metadata for AI search
  genres TEXT[] DEFAULT '{}',
  labels TEXT[] DEFAULT '{}',
  artist_type TEXT,

  -- Verification & status
  verified BOOLEAN DEFAULT FALSE,
  pro_user BOOLEAN DEFAULT FALSE,

  -- Timestamps
  soundcloud_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for searching
CREATE INDEX IF NOT EXISTS idx_artists_username ON artists(username);
CREATE INDEX IF NOT EXISTS idx_artists_city ON artists(city);
CREATE INDEX IF NOT EXISTS idx_artists_country ON artists(country);
CREATE INDEX IF NOT EXISTS idx_artists_genres ON artists USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_artists_labels ON artists USING GIN(labels);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_artists_updated_at ON artists;
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read artists
CREATE POLICY "Artists are viewable by everyone"
  ON artists FOR SELECT
  USING (true);

-- Policy: Anyone can insert/update artists (for now)
CREATE POLICY "Anyone can insert artists"
  ON artists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update artists"
  ON artists FOR UPDATE
  USING (true);

-- Add artist_id column to tracks table (nullable for existing tracks)
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS artist_id BIGINT REFERENCES artists(soundcloud_id);

-- Add audio metadata columns to tracks table
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS bpm INTEGER;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS key TEXT;

-- Index for joining tracks with artists
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);

-- Index for BPM range searches
CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks(bpm);

-- Index for key searches
CREATE INDEX IF NOT EXISTS idx_tracks_key ON tracks(key);
