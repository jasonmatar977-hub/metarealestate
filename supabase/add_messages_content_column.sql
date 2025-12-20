-- ============================================
-- Add content column to messages table
-- Safe to rerun - uses IF NOT EXISTS
-- ============================================

-- Add content column if it doesn't exist
DO $$ 
BEGIN
  -- Check if content column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'content'
  ) THEN
    -- Add content column with default empty string
    ALTER TABLE public.messages ADD COLUMN content text NOT NULL DEFAULT '';
    
    -- If there's existing data with a different column name, migrate it
    -- Check for common alternatives: text, body, message
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'text'
    ) THEN
      UPDATE public.messages SET content = text WHERE content IS NULL;
      RAISE NOTICE 'Migrated data from text column to content column';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'body'
    ) THEN
      UPDATE public.messages SET content = body WHERE content IS NULL;
      RAISE NOTICE 'Migrated data from body column to content column';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'message'
    ) THEN
      UPDATE public.messages SET content = message WHERE content IS NULL;
      RAISE NOTICE 'Migrated data from message column to content column';
    END IF;
    
    -- Make content NOT NULL if there's no existing data or after migration
    -- First, set any NULL values to empty string
    UPDATE public.messages SET content = '' WHERE content IS NULL;
    
    -- Then add NOT NULL constraint
    ALTER TABLE public.messages ALTER COLUMN content SET NOT NULL;
    
    RAISE NOTICE '✅ Added content column to messages table';
  ELSE
    RAISE NOTICE '✅ content column already exists in messages table';
  END IF;
END $$;

-- Verify the column exists and has correct type
DO $$
DECLARE
  col_exists BOOLEAN;
  col_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'content'
  ) INTO col_exists;
  
  IF col_exists THEN
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'content';
    
    RAISE NOTICE '✅ content column verified: type = %', col_type;
  ELSE
    RAISE WARNING '⚠️ content column not found after migration';
  END IF;
END $$;

-- ============================================
-- Verification Query (run separately to test)
-- ============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name = 'messages'
-- ORDER BY ordinal_position;

