-- ============================================
-- Performance Indexes for Messages/Conversations
-- Improves query performance for loading conversations
-- Safe to rerun - uses CREATE INDEX IF NOT EXISTS
-- ============================================

-- Index on conversation_participants for faster user lookups
-- This speeds up: SELECT conversation_id FROM conversation_participants WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
ON public.conversation_participants(user_id);

-- Index on conversation_participants for faster conversation lookups
-- This speeds up: SELECT * FROM conversation_participants WHERE conversation_id IN (...)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id 
ON public.conversation_participants(conversation_id);

-- Composite index for common query pattern
-- This speeds up: SELECT conversation_id FROM conversation_participants WHERE user_id = ? AND conversation_id IN (...)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conv 
ON public.conversation_participants(user_id, conversation_id);

-- Index on messages for faster conversation message lookups
-- This speeds up: SELECT * FROM messages WHERE conversation_id IN (...) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

-- Index on conversations for faster updated_at sorting
-- This speeds up: SELECT * FROM conversations WHERE id IN (...) ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
ON public.conversations(updated_at DESC);

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename IN ('conversation_participants', 'messages', 'conversations')
  AND indexname LIKE 'idx_%';
  
  IF index_count >= 5 THEN
    RAISE NOTICE '✅ Performance indexes created (found % indexes)', index_count;
  ELSE
    RAISE WARNING '⚠️ Expected at least 5 indexes, found %', index_count;
  END IF;
END $$;

