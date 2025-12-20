# SQL Setup Instructions - Updated for Your Schema

## ⚠️ Important: Schema Alignment

All SQL files have been updated to match your existing schema:
- ✅ Uses `following_id` (not `followed_id`) to match your schema.sql
- ✅ Uses `BIGSERIAL` for follows.id (not uuid) to match your schema.sql
- ✅ Safely adds `updated_at` to conversations table if missing
- ✅ All frontend code updated to use `following_id`

## Files to Run (In Order)

### 1. `supabase/follows_fix.sql`
**Purpose:** Validates and fixes follows table structure and RLS policies

**What it does:**
- Creates follows table if it doesn't exist (matches your schema.sql structure)
- Uses `following_id` (not `followed_id`)
- Uses `BIGSERIAL` for id (not uuid)
- Adds `created_at` if missing
- Creates indexes
- Sets up RLS policies

**Safe to rerun:** ✅ Yes (uses IF NOT EXISTS, DROP POLICY IF EXISTS)

---

### 2. `supabase/notifications.sql`
**Purpose:** Creates notifications system with triggers

**What it does:**
- Creates notifications table
- Creates notification functions (SECURITY DEFINER)
- Creates triggers for:
  - Follow notifications (uses `following_id`)
  - New post notifications (uses `following_id` in query)
  - Message notifications (created in messages.sql)

**Safe to rerun:** ✅ Yes (uses DROP TRIGGER IF EXISTS, CREATE OR REPLACE FUNCTION)

**Note:** Message notification trigger is created in messages.sql (step 3)

---

### 3. `supabase/messages.sql`
**Purpose:** Creates messages/conversations system

**What it does:**
- Creates conversations table with `updated_at` (adds if missing)
- Creates conversation_participants table
- Creates messages table
- Creates trigger to update `conversations.updated_at` when message is inserted
- Creates message notification trigger (requires notifications.sql to be run first)
- Sets up RLS policies

**Safe to rerun:** ✅ Yes (uses IF NOT EXISTS, ADD COLUMN IF NOT EXISTS)

---

## Execution Steps

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run files in this exact order:**
   ```sql
   -- Step 1: Follow system
   -- Copy and paste contents of: supabase/follows_fix.sql
   -- Click "Run"
   
   -- Step 2: Notifications system
   -- Copy and paste contents of: supabase/notifications.sql
   -- Click "Run"
   
   -- Step 3: Messages system
   -- Copy and paste contents of: supabase/messages.sql
   -- Click "Run"
   ```

3. **Enable Realtime** (Required for notifications and messages)
   - Go to Database → Replication
   - Enable replication for:
     - ✅ `notifications` table
     - ✅ `messages` table
     - ✅ `conversations` table (optional, for real-time conversation updates)

4. **Verify Setup**
   ```sql
   -- Check follows table structure
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'follows' 
   ORDER BY ordinal_position;
   
   -- Should show: id (bigint), follower_id (uuid), following_id (uuid), created_at (timestamp)
   
   -- Check notifications table exists
   SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name = 'notifications';
   
   -- Check conversations table has updated_at
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'conversations' AND column_name = 'updated_at';
   ```

## Schema Changes Summary

### Follows Table
- ✅ Column: `following_id` (not `followed_id`)
- ✅ ID type: `BIGSERIAL` (not uuid)
- ✅ All queries updated in frontend code

### Conversations Table
- ✅ Has `updated_at` column (added if missing)
- ✅ Trigger updates `updated_at` when message is inserted

### Frontend Code Updates
All frontend files updated to use `following_id`:
- ✅ `app/u/[id]/page.tsx`
- ✅ `app/profile/page.tsx`
- ✅ `app/feed/page.tsx`
- ✅ `app/search/page.tsx`

## Troubleshooting

### Error: "column followed_id does not exist"
**Solution:** You're using an old SQL file. Make sure you're using the updated files that use `following_id`.

### Error: "column updated_at does not exist" (conversations)
**Solution:** The messages.sql file will add it automatically. Make sure you ran messages.sql.

### Notifications not working
1. Check if triggers exist:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname LIKE '%notification%';
   ```
2. Check if functions exist:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%notification%';
   ```
3. Verify realtime is enabled for notifications table

### Follow not working
1. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'follows';
   ```
2. Verify column names:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'follows';
   ```
   Should show: `id`, `follower_id`, `following_id`, `created_at`

## Verification Checklist

After running all SQL files:

- [ ] Follows table has `following_id` column (not `followed_id`)
- [ ] Follows table id is `BIGSERIAL` (bigint)
- [ ] Notifications table exists
- [ ] Conversations table has `updated_at` column
- [ ] All triggers created successfully
- [ ] Realtime enabled for notifications and messages
- [ ] Frontend code uses `following_id` (already updated)

---

**All SQL files are safe to rerun. If you encounter errors, you can run them again without issues.**



