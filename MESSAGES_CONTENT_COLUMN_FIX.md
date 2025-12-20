# Messages Content Column Fix

## Problem
Error: `column messages.content does not exist`

The code was using `content` column consistently, but the database table was missing this column. This caused failures when:
- Loading messages in a conversation
- Sending new messages
- Loading last message in conversations list

## Solution

### 1. Created Migration SQL (`supabase/add_messages_content_column.sql`)

**What it does:**
- Adds `content text NOT NULL` column to `messages` table if it doesn't exist
- Migrates data from alternative column names if they exist:
  - `text` → `content`
  - `body` → `content`
  - `message` → `content`
- Sets NOT NULL constraint after ensuring no NULL values
- Safe to rerun (uses `IF NOT EXISTS` checks)

**Key Features:**
- Handles existing data migration
- Verifies column creation
- Provides clear success/warning messages

### 2. Added UI Sanity Checks

**Files Updated:**
- `app/messages/[conversationId]/page.tsx` - Chat page
- `app/messages/page.tsx` - Messages list page

**What it does:**
- Detects when error message contains "column does not exist" and "content"
- Shows clear error message: "Database schema mismatch: 'content' column is missing. Please run the migration: supabase/add_messages_content_column.sql in Supabase SQL Editor."
- Logs detailed error to console for debugging

**Error Detection:**
```typescript
const errorMessage = normalized.message?.toLowerCase() || '';
const errorDetails = normalized.details?.toLowerCase() || '';
if (errorMessage.includes('column') && errorMessage.includes('does not exist') && 
    (errorMessage.includes('content') || errorDetails.includes('content'))) {
  setError("Database schema mismatch: 'content' column is missing. Please run the migration: supabase/add_messages_content_column.sql in Supabase SQL Editor.");
  console.error("[Chat] SCHEMA ERROR: messages.content column is missing. Run migration: supabase/add_messages_content_column.sql");
  return;
}
```

### 3. Verified Code Consistency

**All code uses `content` consistently:**
- ✅ `app/messages/[conversationId]/page.tsx` - Selects and inserts `content`
- ✅ `app/messages/page.tsx` - Selects `content` for last message
- ✅ `lib/messages.ts` - Uses `content` in queries
- ✅ `supabase/messages.sql` - Schema defines `content text NOT NULL`

**Standard Message Columns:**
- `conversation_id` (uuid)
- `sender_id` (uuid)
- `content` (text) ← **This was missing in DB**
- `created_at` (timestamptz)

## Files Changed

1. **`supabase/add_messages_content_column.sql`** (NEW)
   - Migration to add `content` column
   - Handles data migration from alternative column names
   - Safe to rerun

2. **`app/messages/[conversationId]/page.tsx`**
   - Added sanity check in `loadMessages()` function
   - Added sanity check in `handleSendMessage()` function
   - Shows clear error if column is missing

3. **`app/messages/page.tsx`**
   - Added sanity check when loading last message
   - Shows clear error if column is missing

## How to Apply

### Step 1: Run SQL Migration in Supabase

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase/add_messages_content_column.sql`
4. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
5. Verify success messages in output:
   - ✅ `Added content column to messages table` OR
   - ✅ `content column already exists in messages table`
   - ✅ `content column verified: type = text`

### Step 2: Verify Column Exists

Run this query in Supabase SQL Editor to verify:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;
```

Expected output should include:
```
column_name      | data_type | is_nullable
-----------------+-----------+-------------
id               | uuid      | NO
conversation_id  | uuid      | NO
sender_id        | uuid      | NO
content          | text      | NO          ← Should be here
attachment_url   | text      | YES
created_at       | timestamptz| NO
```

### Step 3: Test

1. **Send a message:**
   - Go to a conversation
   - Type a message and send
   - Should work without errors

2. **Load messages:**
   - Open a conversation
   - Should load message history
   - Should display message content

3. **Messages list:**
   - Go to `/messages`
   - Should show last message preview
   - Should not show schema error

## Expected Behavior

✅ **After Migration:**
- Sending messages works
- Loading messages works
- Last message preview shows in conversations list
- No "column does not exist" errors

❌ **Before Migration (if column missing):**
- Clear error message shown in UI
- Error message tells user to run migration
- Console logs detailed error for debugging

## Troubleshooting

**If migration fails:**

1. **Check if table exists:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'messages';
   ```

2. **Check current columns:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = 'messages';
   ```

3. **Check for alternative column names:**
   - If you see `text`, `body`, or `message` columns, the migration will migrate data
   - If you see `content` already, migration will skip

**If UI still shows error after migration:**

1. Refresh the page
2. Check browser console for detailed error
3. Verify column exists using SQL query above
4. Check Supabase logs for any errors

## Verification

After running migration, test these scenarios:

1. ✅ Create new conversation and send message
2. ✅ Load existing conversation with messages
3. ✅ View messages list (should show last message preview)
4. ✅ Send multiple messages in same conversation
5. ✅ Refresh page and verify messages persist

All should work without "column does not exist" errors.


