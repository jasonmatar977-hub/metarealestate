-- Area Journals RLS Security Update
-- Run this SQL in your Supabase SQL Editor
-- Secures area_journals table with proper RLS policies
-- 
-- REQUIREMENTS:
-- - Only VERIFIED users (profiles.is_verified = true) OR admins (profiles.role='admin') can CREATE journals
-- - Any authenticated user can READ journals (public read for logged-in users)
-- - Only the journal OWNER can UPDATE/DELETE their own journals
-- - Admin can UPDATE/DELETE any journal
--
-- SECURITY: Uses profiles table for verification/role checks, auth.uid() for current user

-- ============================================
-- STEP 1: Add user_id column if missing
-- ============================================

-- Add user_id column to track journal owner (nullable to allow existing rows)
-- Existing journals will have user_id = NULL (only admins can manage them until assigned)
ALTER TABLE area_journals
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance on user_id lookups
CREATE INDEX IF NOT EXISTS area_journals_user_id_idx ON area_journals(user_id);

-- ============================================
-- STEP 2: Ensure RLS is enabled
-- ============================================

ALTER TABLE area_journals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Drop existing policies (if any) and create new ones
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view area journals" ON area_journals;
DROP POLICY IF EXISTS "Admins can manage area journals" ON area_journals;
DROP POLICY IF EXISTS "Authenticated users can read area journals" ON area_journals;
DROP POLICY IF EXISTS "Verified users or admins can create area journals" ON area_journals;
DROP POLICY IF EXISTS "Owners or admins can update area journals" ON area_journals;
DROP POLICY IF EXISTS "Owners or admins can delete area journals" ON area_journals;

-- ============================================
-- STEP 4: Create new RLS policies
-- ============================================

-- Policy 1: SELECT - Any authenticated user can read all journals
CREATE POLICY "Authenticated users can read all area journals"
  ON area_journals FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: INSERT - Only verified users OR admins can create journals
-- Enforces ownership: verified users must set user_id = auth.uid(), admins have flexibility
CREATE POLICY "Verified users or admins can create area journals"
  ON area_journals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Verified users can create (must be owner: user_id = auth.uid())
        (profiles.is_verified = true AND user_id = auth.uid())
        OR
        -- Admins can create (flexibility: user_id can be auth.uid() or NULL or another user)
        profiles.role = 'admin'
      )
    )
  );

-- Policy 3: UPDATE - Only owner OR admin can update journals
CREATE POLICY "Owners or admins can update area journals"
  ON area_journals FOR UPDATE
  TO authenticated
  USING (
    -- Owner can update their own journals
    (user_id = auth.uid())
    OR
    -- Admin can update any journal (including those with user_id = NULL)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    -- After update: owner can only update if still owner OR admin
    -- Admin can update and set user_id to any value (flexibility)
    (
      (user_id = auth.uid())
      OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  );

-- Policy 4: DELETE - Only owner OR admin can delete journals
CREATE POLICY "Owners or admins can delete area journals"
  ON area_journals FOR DELETE
  TO authenticated
  USING (
    -- Owner can delete their own journals
    (user_id = auth.uid())
    OR
    -- Admin can delete any journal
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- STEP 5: Ensure updated_at trigger exists
-- ============================================

-- Function to update updated_at timestamp (already exists, but ensure it's correct)
CREATE OR REPLACE FUNCTION update_area_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at (recreate to ensure it's active)
DROP TRIGGER IF EXISTS area_journals_updated_at ON area_journals;
CREATE TRIGGER area_journals_updated_at
  BEFORE UPDATE ON area_journals
  FOR EACH ROW
  EXECUTE FUNCTION update_area_journal_updated_at();

-- ============================================
-- STEP 6: Optional - Set default user_id for existing journals
-- ============================================
-- 
-- NOTE: Existing journals will have user_id = NULL
-- Only admins can manage journals with user_id = NULL (via admin check in policies)
-- 
-- If you want to assign existing journals to an admin user, run:
-- UPDATE area_journals SET user_id = '<admin_user_uuid>' WHERE user_id IS NULL;
-- 
-- Or leave them as NULL and let admins manage them (recommended for existing seed data)

-- ============================================
-- Verification Queries (Optional - Run to verify)
-- ============================================
-- 
-- To verify policies are created:
-- SELECT * FROM pg_policies WHERE tablename = 'area_journals';
-- 
-- To verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'area_journals';
-- 
-- To verify user_id column exists:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'area_journals' AND column_name = 'user_id';
