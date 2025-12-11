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

  -- Download info
  download_status TEXT NOT NULL DEFAULT 'No',
  downloadable BOOLEAN DEFAULT FALSE,
  download_url TEXT,
  purchase_url TEXT,
  purchase_title TEXT,
  download_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching by artist
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);

-- Index for searching by genre
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);

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

-- Enable Row Level Security
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read tracks
CREATE POLICY "Tracks are viewable by everyone"
  ON tracks FOR SELECT
  USING (true);

-- Policy: Only authenticated users can insert/update
CREATE POLICY "Authenticated users can insert tracks"
  ON tracks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tracks"
  ON tracks FOR UPDATE
  USING (true);
