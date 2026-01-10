-- Listing Images Support
-- Run this SQL in your Supabase SQL Editor
-- Adds image_urls column to listings table for storing multiple image URLs
-- Safe to re-run (uses IF NOT EXISTS)

-- Add image_urls column if it doesn't exist
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- No index needed for now (optional for future search/filter optimization)
-- If needed later:
-- CREATE INDEX IF NOT EXISTS listings_image_urls_idx ON listings USING GIN(image_urls);
