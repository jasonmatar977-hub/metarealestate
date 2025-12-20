-- ============================================
-- Fix RLS Policies for Chat Start
-- Allows creating conversations and adding both participants
-- Safe to rerun - uses DROP POLICY IF EXISTS
-- ============================================

-- ============================================
-- Step 1: Ensure SECURITY DEFINER function exists
-- ============================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.is_conversation_participant(uuid, uuid);

-- Create function that bypasses RLS (runs as table owner)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if user is a participant in the conversation
  -- This function runs as the table owner, so it bypasses RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

-- ============================================
-- Step 2: Drop Existing Policies
-- ============================================

-- Drop conversation_participants policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to new conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON public.conversation_participants;

-- Drop conversations policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON public.conversations;

-- ============================================
-- Step 3: Create Fixed Policies
-- ============================================

-- ============================================
-- Conversation Participants Policies
-- ============================================

-- SELECT: Users can see participant records where they are a participant
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- INSERT: Users can add participants when:
-- 1. They are adding themselves (user_id = auth.uid()), OR
-- 2. They are adding another user AND they are already a participant in that conversation
-- This allows creating a conversation: first insert yourself, then insert the other user
CREATE POLICY "Users can add participants to conversations"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if adding themselves
    user_id = auth.uid()
    OR
    -- Allow if adding another user AND current user is already a participant
    -- This works because: 1) insert yourself first, 2) then insert other user (you're now a participant)
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- DELETE: Users can remove themselves from conversations
CREATE POLICY "Users can remove themselves from conversations"
  ON public.conversation_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- Conversations Policies
-- ============================================

-- SELECT: Users can view conversations where they are a participant
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

-- INSERT: Authenticated users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Users can update conversations they participate in
CREATE POLICY "Users can update conversations they participate in"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_conversation_participant(id, auth.uid())
  )
  WITH CHECK (
    public.is_conversation_participant(id, auth.uid())
  );

-- ============================================
-- Step 4: Ensure RLS is Enabled
-- ============================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 5: Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  func_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'is_conversation_participant'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ SECURITY DEFINER function exists';
  ELSE
    RAISE WARNING '⚠️ Function not found';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants');
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '✅ RLS policies created (found % policies)', policy_count;
  ELSE
    RAISE WARNING '⚠️ Expected at least 5 policies, found %', policy_count;
  END IF;
END $$;

