-- Run this in your Supabase SQL editor
-- This adds the aura_presets table to your existing project

CREATE TABLE IF NOT EXISTS aura_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  author_name TEXT DEFAULT 'Anonymous',
  device_model TEXT,
  genre TEXT,
  bands JSONB NOT NULL,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE aura_presets ENABLE ROW LEVEL SECURITY;

-- Anyone can read presets
CREATE POLICY "Public read access"
  ON aura_presets FOR SELECT
  USING (true);

-- Anyone can insert (anonymous publishing)
CREATE POLICY "Public insert access"
  ON aura_presets FOR INSERT
  WITH CHECK (true);

-- Create a function for atomic upvote increments
CREATE OR REPLACE FUNCTION upvote_aura_preset(preset_id UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE aura_presets SET upvotes = upvotes + 1 WHERE id = preset_id;
$$;

-- Create index for common query patterns
CREATE INDEX IF NOT EXISTS aura_presets_genre_idx ON aura_presets(genre);
CREATE INDEX IF NOT EXISTS aura_presets_upvotes_idx ON aura_presets(upvotes DESC);
CREATE INDEX IF NOT EXISTS aura_presets_created_idx ON aura_presets(created_at DESC);
