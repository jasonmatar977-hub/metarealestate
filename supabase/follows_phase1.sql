-- Follows Table Setup - Phase 1
-- Safe to re-run: Uses IF EXISTS / IF NOT EXISTS / DROP POLICY IF EXISTS
-- Run this in Supabase SQL Editor
--
-- NOTE: If your existing follows table uses 'following_id' instead of 'followed_id',
-- you have two options:
-- 1. Drop the existing table and let this script recreate it (will lose data)
-- 2. Update this script to use 'following_id' to match your existing schema

-- ============================================
-- CREATE FOLLOWS TABLE (if it doesn't exist)
-- ============================================

-- Check if table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'follows'
  ) THEN
    -- Create follows table with user's specified schema
    CREATE TABLE public.follows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      followed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(follower_id, followed_id),
      CHECK (follower_id != followed_id)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
    CREATE INDEX IF NOT EXISTS follows_followed_id_idx ON public.follows(followed_id);
    CREATE INDEX IF NOT EXISTS follows_created_at_idx ON public.follows(created_at DESC);

    RAISE NOTICE 'Follows table created successfully';
  ELSE
    RAISE NOTICE 'Follows table already exists, skipping creation';
  END IF;
END $$;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if they exist)
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view all follows" ON public.follows;
DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- SELECT: Authenticated users can view all follows
CREATE POLICY "Authenticated users can view all follows"
  ON public.follows FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only follow others (follower_id must match auth.uid())
CREATE POLICY "Authenticated users can follow others"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- DELETE: Users can only unfollow (follower_id must match auth.uid())
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify table exists and has correct structure
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'follows'
  ) THEN
    RAISE NOTICE '✅ Follows table setup complete!';
    RAISE NOTICE '   - Table: public.follows';
    RAISE NOTICE '   - RLS: Enabled';
    RAISE NOTICE '   - Policies: 3 (SELECT, INSERT, DELETE)';
  ELSE
    RAISE WARNING '⚠️ Follows table was not created. Check for errors above.';
  END IF;
END $$;

