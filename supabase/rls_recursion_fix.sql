-- ============================================
-- Fix RLS Recursion Error (42P17) for Messages System
-- Uses SECURITY DEFINER function to bypass RLS recursion
-- Safe to rerun - uses DROP IF EXISTS
-- ============================================

-- ============================================
-- Step 1: Create SECURITY DEFINER Helper Function
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
-- Step 2: Drop All Existing Policies
-- ============================================

-- Drop conversations policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON public.conversations;

-- Drop conversation_participants policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participant records" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can delete their own participant records" ON public.conversation_participants;

-- Drop messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- ============================================
-- Step 3: Create New Non-Recursive Policies
-- ============================================

-- ============================================
-- Conversation Participants Policies
-- ============================================

-- SELECT: Users can see participant records where they are a participant
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- INSERT: Users can add themselves to conversations
-- Allow if user_id = auth.uid() (they're adding themselves)
-- Note: The conversation must already exist and they must be allowed to join
CREATE POLICY "Users can add themselves to conversations"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

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
-- Uses SECURITY DEFINER function to avoid recursion
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
-- Messages Policies
-- ============================================

-- SELECT: Users can view messages in conversations they participate in
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- INSERT: Users can send messages in conversations they participate in
-- Must be sender AND participant
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

-- DELETE: Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- UPDATE: Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

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
-- Step 6: Verify Function and Policies
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
    RAISE NOTICE '✅ SECURITY DEFINER function created successfully';
  ELSE
    RAISE WARNING '⚠️ Function not found - check for errors above';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants', 'messages');
  
  IF policy_count >= 8 THEN
    RAISE NOTICE '✅ All RLS policies created successfully (found % policies)', policy_count;
  ELSE
    RAISE WARNING '⚠️ Expected at least 8 policies, found %. Check for errors above.', policy_count;
  END IF;
END $$;

-- ============================================
-- Verification Notes
-- ============================================
-- 
-- After running this script, test with:
-- 
-- 1. As authenticated user:
--    SELECT * FROM conversation_participants;
--    Should return only rows where you are a participant
-- 
-- 2. Try:
--    SELECT * FROM conversations;
--    Should return only conversations you participate in
-- 
-- 3. Try:
--    SELECT * FROM messages;
--    Should return only messages from your conversations
-- 
-- If you still see "infinite recursion" errors:
-- - Check Supabase logs for any remaining recursive policies
-- - Run: SELECT * FROM pg_policies WHERE tablename IN ('conversations', 'conversation_participants', 'messages');
-- - Ensure no policies use EXISTS queries on conversation_participants directly







