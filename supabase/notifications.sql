-- ============================================
-- PHASE 2: Notifications System
-- Safe-to-rerun SQL for notifications table
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('follow', 'new_post', 'message')),
  entity_id uuid, -- post_id or conversation_id depending on type
  title text NOT NULL,
  body text,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_entity_id ON public.notifications(entity_id);

-- Drop existing policies if they exist (safe to rerun)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can UPDATE is_read on their own notifications
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Service role (for triggers) can INSERT notifications
-- Note: In production, you might want to use a service role function instead
-- For now, we'll allow authenticated users to insert (will be done via triggers)
-- This is safe because triggers will control what gets inserted

-- Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- ============================================
-- Notification Creation Functions (SECURITY DEFINER)
-- ============================================

-- Function to create follow notification
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
  following_user_id uuid;
BEGIN
  -- Get the actor's display name
  SELECT display_name INTO actor_name
  FROM public.profiles
  WHERE id = NEW.follower_id;
  
  -- The following_id is the user who should receive the notification
  following_user_id := NEW.following_id;
  
  -- Insert notification
  INSERT INTO public.notifications (user_id, actor_id, type, title, body)
  VALUES (
    following_user_id,
    NEW.follower_id,
    'follow',
    COALESCE(actor_name, 'Someone') || ' started following you',
    COALESCE(actor_name, 'Someone') || ' started following you'
  );
  
  RETURN NEW;
END;
$$;

-- Function to create new_post notification
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
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id, title, body)
    VALUES (
      follower_record.follower_id,
      poster_id,
      'new_post',
      NEW.id,
      COALESCE(poster_name, 'Someone you follow') || ' created a new post',
      LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to create message notification
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_id uuid;
  sender_name text;
  receiver_id uuid;
  conversation_id uuid;
BEGIN
  -- Get sender info
  sender_id := NEW.sender_id;
  SELECT display_name INTO sender_name
  FROM public.profiles
  WHERE id = sender_id;
  
  -- Get conversation to find receiver
  conversation_id := NEW.conversation_id;
  
  -- Find the other participant (receiver)
  SELECT user_id INTO receiver_id
  FROM public.conversation_participants
  WHERE conversation_id = conversation_id
    AND user_id != sender_id
  LIMIT 1;
  
  -- Only create notification if receiver exists
  IF receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id, title, body)
    VALUES (
      receiver_id,
      sender_id,
      'message',
      conversation_id,
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- Triggers
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_create_follow_notification ON public.follows;
DROP TRIGGER IF EXISTS trigger_create_new_post_notification ON public.posts;
DROP TRIGGER IF EXISTS trigger_create_message_notification ON public.messages;

-- Trigger: When someone follows, create notification
CREATE TRIGGER trigger_create_follow_notification
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.create_follow_notification();

-- Trigger: When someone creates a post, notify their followers
CREATE TRIGGER trigger_create_new_post_notification
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_new_post_notification();

-- Trigger: When someone sends a message, notify the receiver
-- Note: This requires messages table to exist (created in messages.sql)
-- Uncomment after running messages.sql
-- CREATE TRIGGER trigger_create_message_notification
--   AFTER INSERT ON public.messages
--   FOR EACH ROW
--   EXECUTE FUNCTION public.create_message_notification();

