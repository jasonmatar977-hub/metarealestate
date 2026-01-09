-- Follows Table RLS Policies Fix
-- Safe to re-run: Uses DROP POLICY IF EXISTS
-- Run this in Supabase SQL Editor
--
-- This ensures proper RLS policies for the follows table:
-- - SELECT: Users can view follows where they are follower OR followed
-- - INSERT: Users can only create follows where follower_id = auth.uid()
-- - DELETE: Users can only delete follows where follower_id = auth.uid()

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if they exist)
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view all follows" ON public.follows;
DROP POLICY IF EXISTS "Users can view their own follows" ON public.follows;
DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
DROP POLICY IF EXISTS "Users can insert their own follow" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follow" ON public.follows;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- SELECT: Users can view follows where they are follower OR followed
CREATE POLICY "Users can view their own follows"
  ON public.follows FOR SELECT
  TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = followed_id);

-- INSERT: Users can only create follows where follower_id = auth.uid()
CREATE POLICY "Users can insert their own follow"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- DELETE: Users can only delete follows where follower_id = auth.uid()
CREATE POLICY "Users can delete their own follow"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'follows'
  ) THEN
    RAISE NOTICE '✅ Follows RLS policies updated!';
    RAISE NOTICE '   - SELECT: Users can view follows where they are follower OR followed';
    RAISE NOTICE '   - INSERT: Users can only create follows where follower_id = auth.uid()';
    RAISE NOTICE '   - DELETE: Users can only delete follows where follower_id = auth.uid()';
  ELSE
    RAISE WARNING '⚠️ Follows table does not exist. Run follows_phase1.sql first.';
  END IF;
END $$;








