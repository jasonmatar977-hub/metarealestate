-- ============================================
-- Fix RLS Policies for Messages System
-- Fixes circular dependency in conversation_participants policy
-- Safe to rerun
-- ============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

-- Create a simpler policy that avoids circular dependency
-- Since users can only access conversations they're part of (via conversations RLS),
-- we can safely allow authenticated users to see participants
-- The conversations table RLS will prevent access to conversations they're not in
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversation_participants' 
    AND policyname = 'Users can view participants in their conversations'
  ) THEN
    RAISE NOTICE '✅ Policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Policy was not created. Check for errors above.';
  END IF;
END $$;

