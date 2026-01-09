# Fix Ambiguous conversation_id Column Reference

## Problem
SQL Error: `column reference "conversation_id" is ambiguous`

This error occurs when a SQL query references `conversation_id` without a table alias, and multiple tables in the query have a column with that name.

## Root Cause

The issue was in the `create_message_notification()` trigger function in `supabase/notifications.sql`:

**Before (ambiguous):**
```sql
SELECT user_id INTO receiver_id
FROM public.conversation_participants
WHERE conversation_id = conversation_id  -- ❌ Compares column to itself!
  AND user_id != sender_id
LIMIT 1;
```

This compares the `conversation_id` column to itself, which is always true. It should compare the column to the variable.

**After (fixed):**
```sql
SELECT user_id INTO receiver_id
FROM public.conversation_participants cp
WHERE cp.conversation_id = conversation_id  -- ✅ Explicit table alias
  AND cp.user_id != NEW.sender_id
LIMIT 1;
```

## Solution

### 1. Fixed Notifications Trigger Function

**File:** `supabase/notifications.sql` (line 155)

**Change:**
- Added table alias `cp` to `conversation_participants`
- Changed `conversation_id = conversation_id` to `cp.conversation_id = conversation_id`
- Changed `user_id != sender_id` to `cp.user_id != NEW.sender_id` (more explicit)

### 2. Created SQL Fix File

**File:** `supabase/fix_ambiguous_conversation_id.sql` (NEW)

This file:
- Recreates the `create_message_notification()` function with explicit table aliases
- Uses `cp.conversation_id` to reference the column
- Uses `conversation_id` (variable) to reference the function parameter
- Safe to rerun (uses `CREATE OR REPLACE`)

## Files Changed

1. **`supabase/notifications.sql`**
   - Line 153-157: Fixed ambiguous `conversation_id` reference
   - Added table alias `cp` to `conversation_participants`
   - Made all column references explicit

2. **`supabase/fix_ambiguous_conversation_id.sql`** (NEW)
   - Standalone SQL file to fix the function
   - Can be run independently if notifications.sql wasn't updated
   - Includes verification queries

## How to Apply

### Option 1: Run the Fix File (Recommended)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase/fix_ambiguous_conversation_id.sql`
4. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`
5. Verify success message: `✅ create_message_notification function updated successfully`

### Option 2: Update notifications.sql (If you haven't run it yet)

If you haven't run `supabase/notifications.sql` yet, the fix is already included. Just run that file.

## Verification

After running the fix, test these scenarios:

1. **Send a message:**
   - Go to a conversation
   - Send a message
   - Should work without "ambiguous column" error
   - Should create a notification for the receiver

2. **Load messages:**
   - Open a conversation
   - Should load message history without errors

3. **Messages list:**
   - Go to `/messages`
   - Should load conversations list without errors

4. **Start chat:**
   - Go to a user's profile
   - Click "Message"
   - Should create/find conversation without errors

## Expected Behavior

✅ **After Fix:**
- No "ambiguous column" errors
- Messages send successfully
- Notifications created correctly
- All queries work without ambiguity

❌ **Before Fix:**
- SQL error: "column reference conversation_id is ambiguous"
- Trigger function fails when sending messages
- Notifications not created

## Technical Details

### Why It Was Ambiguous

In the original query:
```sql
WHERE conversation_id = conversation_id
```

PostgreSQL couldn't determine which `conversation_id` to use:
- The column `conversation_participants.conversation_id`?
- The variable `conversation_id` from the function?

By using a table alias:
```sql
WHERE cp.conversation_id = conversation_id
```

It's now clear:
- `cp.conversation_id` = column from `conversation_participants` table
- `conversation_id` = variable from function scope

### Other Potential Issues (Already Fixed)

The codebase uses explicit table aliases in:
- ✅ RLS policies (use `cp.conversation_id`, `messages.conversation_id`)
- ✅ PostgREST queries (single table queries, no joins)
- ✅ SECURITY DEFINER functions (use explicit table references)

## Troubleshooting

**If you still see ambiguous column errors:**

1. **Check Supabase logs:**
   - Go to Supabase Dashboard → Logs
   - Look for the exact query causing the error
   - Check which tables are involved

2. **Verify function exists:**
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'create_message_notification';
   ```
   Should return the function with the fix.

3. **Check for other triggers/functions:**
   ```sql
   SELECT tgname, tgrelid::regclass, proname
   FROM pg_trigger t
   JOIN pg_proc p ON t.tgfoid = p.oid
   WHERE proname LIKE '%message%' OR proname LIKE '%conversation%';
   ```
   Verify all functions use explicit table aliases.

4. **Test the function directly:**
   ```sql
   -- This should not error
   SELECT * FROM pg_proc WHERE proname = 'create_message_notification';
   ```

## Summary

- **Issue:** Ambiguous `conversation_id` reference in notifications trigger
- **Fix:** Added table alias `cp` and made all references explicit
- **Files:** `supabase/notifications.sql`, `supabase/fix_ambiguous_conversation_id.sql`
- **Impact:** Fixes message sending and notification creation






