-- ============================================
-- PHASE 3: Messages System
-- Safe-to-rerun SQL for messages/conversations
-- ============================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add updated_at if it doesn't exist (safe to rerun)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create conversation_participants table (junction table)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

-- Add joined_at if it doesn't exist (safe to rerun)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_participants' 
    AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE public.conversation_participants ADD COLUMN joined_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachment_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add updated_at trigger function for conversations
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Create trigger to update conversation.updated_at when message is inserted
DROP TRIGGER IF EXISTS trigger_update_conversation_updated_at ON public.messages;
CREATE TRIGGER trigger_update_conversation_updated_at
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

-- Drop existing policies (safe to rerun)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id
      FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Conversation participants policies
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add themselves to conversations"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id
      FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- ============================================
-- Message Notification Trigger
-- ============================================

-- Create trigger for message notifications (requires notifications.sql to be run first)
-- This will be created if the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_message_notification'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_create_message_notification ON public.messages;
    CREATE TRIGGER trigger_create_message_notification
      AFTER INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.create_message_notification();
  END IF;
END $$;

-- ============================================
-- Enable Realtime (if not already enabled)
-- ============================================

-- Note: Realtime must be enabled in Supabase dashboard for these tables
-- Go to Database > Replication and enable for:
-- - notifications
-- - messages
-- - conversations

