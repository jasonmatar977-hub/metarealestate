-- Post Media Storage Setup
-- Run this in Supabase SQL Editor
-- This adds image_url column to posts table

-- Add image_url column to posts table if it doesn't exist
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Note: Storage bucket must be created via Supabase Dashboard
-- See instructions in supabase/storage_setup_instructions.md











