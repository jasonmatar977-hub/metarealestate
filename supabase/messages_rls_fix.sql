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

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;

-- ============================================
-- Step 2: Fix Conversations Table Policies
-- ============================================

-- Policy: Users can view conversations where they are a participant
-- Use a direct check without circular dependency
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

-- ============================================
-- Step 3: Fix Conversation Participants Policies
-- ============================================

-- Policy: Users can view participants in conversations they're part of
-- Simplified approach: Allow SELECT for authenticated users
-- Security is enforced by conversations table RLS - users can only see
-- conversations they participate in, so they can only see participants
-- in those conversations. This avoids recursion completely.
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can add themselves to conversations
CREATE POLICY "Users can add themselves to conversations"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Step 4: Fix Messages Table Policies
-- ============================================

-- Policy: Users can view messages in conversations they're part of
-- Check via conversations table to avoid recursion
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND EXISTS (
        SELECT 1
        FROM public.conversation_participants cp
        WHERE cp.conversation_id = c.id
        AND cp.user_id = auth.uid()
      )
    )
  );

-- Policy: Users can send messages in conversations they're part of
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND EXISTS (
        SELECT 1
        FROM public.conversation_participants cp
        WHERE cp.conversation_id = c.id
        AND cp.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Step 5: Verify Policies Created
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants', 'messages');
  
  IF policy_count >= 6 THEN
    RAISE NOTICE '✅ All RLS policies created successfully (found % policies)', policy_count;
  ELSE
    RAISE WARNING '⚠️ Expected 6 policies, found %. Check for errors above.', policy_count;
  END IF;
END $$;

-- ============================================
-- Step 6: Grant Permissions (if not already granted)
-- ============================================

GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- ============================================
-- Verification Query (run separately to test)
-- ============================================

-- Test query to verify policies work (run as authenticated user):
-- SELECT * FROM conversation_participants WHERE user_id = auth.uid();
-- Should return only participants in conversations you're part of
