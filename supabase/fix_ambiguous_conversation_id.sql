-- ============================================
-- Fix Ambiguous conversation_id Column References
-- Safe to rerun - uses CREATE OR REPLACE
-- ============================================

-- ============================================
-- Step 1: Fix Notifications Trigger Function
-- ============================================

-- The create_message_notification function has an ambiguous reference:
-- WHERE conversation_id = conversation_id (compares column to itself)
-- Should be: WHERE cp.conversation_id = conversation_id (variable)

CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
  receiver_id uuid;
  conversation_id uuid;
BEGIN
  -- Get sender info
  sender_name := NULL;
  SELECT display_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Get conversation to find receiver
  conversation_id := NEW.conversation_id;
  
  -- Find the other participant (receiver)
  -- FIXED: Use table alias cp to avoid ambiguity
  SELECT user_id INTO receiver_id
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = conversation_id
    AND cp.user_id != NEW.sender_id
  LIMIT 1;
  
  -- Only create notification if receiver exists
  IF receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id, title, body)
    VALUES (
      receiver_id,
      NEW.sender_id,
      'message',
      NEW.id,
      COALESCE(sender_name || ' sent you a message', 'New message'),
      COALESCE(LEFT(NEW.content, 100), 'You have a new message')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_message_notification() TO authenticated;

-- ============================================
-- Step 2: Verify Function
-- ============================================

DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'create_message_notification'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ create_message_notification function updated successfully';
  ELSE
    RAISE WARNING '⚠️ Function not found - check for errors above';
  END IF;
END $$;

-- ============================================
-- Verification Notes
-- ============================================
-- 
-- After running this script:
-- 1. Test sending a message - should create notification without errors
-- 2. Check Supabase logs for any "ambiguous column" errors
-- 3. Verify notifications are created correctly
--
-- If you still see ambiguous column errors:
-- - Check Supabase logs for the exact query causing the issue
-- - Verify all RLS policies use explicit table aliases in subqueries
-- - Ensure no views or functions join multiple tables without aliases


