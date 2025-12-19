# Feed Posts Loading Fix - Instructions

## Problem
Posts exist in Supabase but the feed shows "No posts" with PGRST200 relationship errors.

## Solution
Fixed RLS policies and simplified the query to use separate fetches instead of joins.

---

## Step 1: Run SQL in Supabase SQL Editor

1. Go to your Supabase Dashboard → SQL Editor
2. Open the file: `supabase/rls_policies.sql`
3. Copy the entire contents
4. Paste into Supabase SQL Editor
5. Click **Run** (or press Ctrl+Enter)

This will:
- Drop existing policies safely (using `DROP IF EXISTS`)
- Recreate all RLS policies correctly
- Ensure authenticated users can SELECT all posts
- Ensure authenticated users can INSERT only their own posts
- Ensure authenticated users can SELECT profiles and UPDATE only their own profile
- Ensure authenticated users can SELECT/INSERT/DELETE their own likes

---

## Step 2: Verify Tables Exist

In Supabase SQL Editor, run:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('posts', 'profiles', 'likes', 'follows');
```

You should see all 4 tables listed.

---

## Step 3: Verify RLS is Enabled

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('posts', 'profiles', 'likes', 'follows');
```

All should show `rowsecurity = true`.

---

## Step 4: Test Posts Query (Optional)

```sql
-- Test if you can select posts (must be authenticated)
SELECT id, user_id, content, created_at 
FROM posts 
ORDER BY created_at DESC 
LIMIT 10;
```

If you see rows, the RLS policies are working.

---

## Step 5: Restart Local Development

1. Stop your Next.js dev server (Ctrl+C)
2. Clear Next.js cache (optional but recommended):
   ```bash
   rm -rf .next
   ```
3. Restart:
   ```bash
   npm run dev
   ```

---

## Step 6: Test the Feed

1. Open your app: `http://localhost:3000`
2. Log in with an authenticated user
3. Navigate to `/feed`
4. Check browser console (F12) for detailed logs:
   - `=== LOADING POSTS ===`
   - `Posts fetched: X`
   - `Profiles fetched: X`
   - Any error messages with full details

---

## What Was Fixed

### 1. RLS Policies (`supabase/rls_policies.sql`)
- All policies now use `DROP IF EXISTS` for safe re-runs
- Policies ensure authenticated users can:
  - SELECT all posts
  - INSERT only their own posts
  - SELECT all profiles
  - UPDATE only their own profile
  - SELECT/INSERT/DELETE their own likes

### 2. Feed Query (`app/feed/page.tsx`)
- **Before**: Used join syntax that failed with PGRST200
- **After**: 
  1. Fetch posts (simple SELECT)
  2. Fetch profiles separately (by user IDs)
  3. Fetch likes separately (by post IDs)
  4. Merge data in JavaScript
- Added comprehensive error logging (console.error with full error details)

### 3. CreatePost (`components/CreatePost.tsx`)
- Gets `user_id` from Supabase session (not just context)
- Added comprehensive error logging
- Better error messages for users

---

## Troubleshooting

### Still seeing "No posts"?

1. **Check browser console** for error messages
2. **Verify you're authenticated**: Check if `user` object exists in context
3. **Check Supabase logs**: Dashboard → Logs → API Logs
4. **Verify RLS policies**: Run the verification queries above
5. **Check posts exist**: Run `SELECT COUNT(*) FROM posts;` in SQL Editor

### Seeing RLS errors?

- Make sure you ran `supabase/rls_policies.sql` completely
- Verify you're logged in (authenticated session)
- Check Supabase Dashboard → Authentication → Users (your user should exist)

### Posts load but no author names?

- Profiles might not exist for those users
- Check: `SELECT * FROM profiles WHERE id IN (SELECT DISTINCT user_id FROM posts);`
- If missing, profiles will be created automatically on next user login (via trigger)

---

## Expected Console Output (Success)

```
=== LOADING POSTS ===
User authenticated: true
User ID: abc-123-def-456
Posts fetched: 5
Unique user IDs: ["abc-123-def-456", "xyz-789-ghi-012"]
Profiles fetched: 2
Posts with merged data: 5
```

---

## Files Changed

- `supabase/rls_policies.sql` (NEW) - Safe-to-re-run RLS policies
- `app/feed/page.tsx` - Simplified query with fallback approach
- `components/CreatePost.tsx` - Better error handling and session verification

---

## Next Steps

After confirming the feed works:
1. Test creating a new post
2. Test liking/unliking posts
3. Verify author names display correctly
4. Check mobile responsiveness













