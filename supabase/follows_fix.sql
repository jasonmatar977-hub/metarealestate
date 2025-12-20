-- ============================================
-- PHASE 1: Follow System Fix
-- Safe-to-rerun SQL for follows table
-- Matches existing schema: following_id (not followed_id), BIGSERIAL id
-- ============================================

-- Ensure follows table exists with correct structure (matches schema.sql)
CREATE TABLE IF NOT EXISTS public.follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Add created_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'follows' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.follows ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for faster queries (safe to rerun)
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);

-- Drop existing policies if they exist (safe to rerun)
DROP POLICY IF EXISTS "Users can view all follows" ON public.follows;
DROP POLICY IF EXISTS "Users can insert their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

-- RLS Policies for follows table
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can SELECT all follows
CREATE POLICY "Users can view all follows"
  ON public.follows
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can INSERT only rows where follower_id = auth.uid()
CREATE POLICY "Users can insert their own follows"
  ON public.follows
  FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- Policy: Authenticated users can DELETE only rows where follower_id = auth.uid()
CREATE POLICY "Users can delete their own follows"
  ON public.follows
  FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;

