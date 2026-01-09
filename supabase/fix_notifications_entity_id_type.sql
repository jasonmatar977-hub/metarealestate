-- ============================================
-- Fix: notifications.entity_id type mismatch
-- ============================================
-- Issue: Trigger function create_new_post_notification() inserts posts.id (BIGINT)
--        into notifications.entity_id (UUID), causing type error.
--
-- Solution: Change entity_id to BIGINT to support post IDs, or add entity_id_bigint
--            We'll add entity_id_bigint for backward compatibility and update trigger.
-- ============================================

-- Step 1: Add new column entity_id_bigint (for post IDs)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS entity_id_bigint BIGINT;

-- Step 2: Create index on new column
CREATE INDEX IF NOT EXISTS idx_notifications_entity_id_bigint 
ON public.notifications(entity_id_bigint);

-- Step 3: Update trigger function to use entity_id_bigint for posts
CREATE OR REPLACE FUNCTION public.create_new_post_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poster_id uuid;
  poster_name text;
  follower_record RECORD;
BEGIN
  -- Get the poster's info
  SELECT user_id, (SELECT display_name FROM public.profiles WHERE id = NEW.user_id) INTO poster_id, poster_name
  FROM (SELECT NEW.user_id as user_id) t;
  
  -- Notify all followers of the poster
  FOR follower_record IN
    SELECT follower_id
    FROM public.follows
    WHERE following_id = poster_id
  LOOP
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id_bigint, title, body)
    VALUES (
      follower_record.follower_id,
      poster_id,
      'new_post',
      NEW.id,  -- posts.id is BIGINT, now stored in entity_id_bigint
      COALESCE(poster_name, 'Someone you follow') || ' created a new post',
      LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Step 4: Update message notification function to keep using entity_id (UUID for conversations)
-- This function already uses entity_id correctly (conversation_id is UUID)
-- No changes needed for create_message_notification()

-- Step 5: Verify trigger exists and is correct
-- The trigger should already exist from notifications.sql
-- If it doesn't exist, uncomment the following:
-- DROP TRIGGER IF EXISTS trigger_create_new_post_notification ON public.posts;
-- CREATE TRIGGER trigger_create_new_post_notification
--   AFTER INSERT ON public.posts
--   FOR EACH ROW
--   EXECUTE FUNCTION public.create_new_post_notification();

-- ============================================
-- Migration Notes:
-- ============================================
-- 1. entity_id (UUID) remains for backward compatibility (conversations, etc.)
-- 2. entity_id_bigint (BIGINT) is used for post IDs
-- 3. When querying notifications:
--    - For 'new_post' type: use entity_id_bigint
--    - For 'message' type: use entity_id (UUID)
--    - For 'follow' type: entity_id is NULL (no entity reference)
-- ============================================





