-- ============================================
-- Fix RLS Policies for Messages System
-- Fixes infinite recursion error (42P17) in conversation_participants
-- Safe to rerun - uses DROP POLICY IF EXISTS
-- ============================================

-- ============================================
-- Step 1: Drop all existing policies (safe to rerun)
-- ============================================

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert participants" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

-- ============================================
-- Step 2: Fix Conversation Participants Policies (CRITICAL - NO SELF-REFERENCE)
-- ============================================

-- Policy: Users can SELECT conversation_participants rows where user_id = auth.uid()
-- This is simple and doesn't query the table itself - NO RECURSION
CREATE POLICY "Users can view their own participant records"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can INSERT conversation_participants only if user_id = auth.uid()
-- Also simple - NO RECURSION
CREATE POLICY "Users can add themselves to conversations"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Step 3: Fix Conversations Table Policies
-- ============================================

-- Policy: Users can view conversations where they are a participant
-- This queries conversation_participants, but that's OK because
-- conversation_participants policy doesn't query itself - NO RECURSION
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  );

-- Policy: Users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update conversations (for updated_at timestamp)
CREATE POLICY "Users can update conversations they participate in"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  );

-- ============================================
-- Step 4: Fix Messages Table Policies
-- ============================================

-- Policy: Users can view messages only if they are a participant in that conversation
-- This queries conversation_participants, but that's OK - NO RECURSION
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Policy: Users can send messages only if they are a participant in that conversation
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- ============================================
-- Step 5: Grant Permissions (if not already granted)
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- ============================================
-- Step 6: Verify Policies Created
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants', 'messages');
  
  IF policy_count >= 7 THEN
    RAISE NOTICE '✅ All RLS policies created successfully (found % policies)', policy_count;
  ELSE
    RAISE WARNING '⚠️ Expected at least 7 policies, found %. Check for errors above.', policy_count;
  END IF;
END $$;

-- ============================================
-- Verification Notes
-- ============================================
-- 
-- After running this script, test with:
-- 
-- 1. As authenticated user, try:
--    SELECT * FROM conversation_participants;
--    Should return only rows where user_id = auth.uid()
-- 
-- 2. Try:
--    SELECT * FROM conversations;
--    Should return only conversations where you are a participant
-- 
-- 3. Try:
--    SELECT * FROM messages;
--    Should return only messages from conversations you participate in
-- 
-- If you see "infinite recursion" errors, check:
-- - Are there any other policies on these tables not dropped?
-- - Run: SELECT * FROM pg_policies WHERE tablename IN ('conversations', 'conversation_participants', 'messages');
-- - Drop any extra policies manually
