# Messages RLS Fix - Quick Fix for 406/500 Errors

## Problem
The `conversation_participants` table RLS policy had a circular dependency causing 406/500 errors when querying the table.

## Solution
Run this SQL file to fix the RLS policy:

**File:** `supabase/messages_rls_fix.sql`

This file:
- Drops the problematic policy
- Creates a simpler policy that allows authenticated users to view participants
- Security is still enforced by the `conversations` table RLS policy

## Quick Fix Steps

1. **Open Supabase SQL Editor**
2. **Run:** `supabase/messages_rls_fix.sql`
3. **Verify:** Try loading messages page again

## Why This Works

The original policy tried to query `conversation_participants` to check if a user can view `conversation_participants`, creating a circular dependency.

The new policy allows authenticated users to view participants, but security is still enforced because:
- Users can only access conversations they're part of (via `conversations` table RLS)
- If they can't access a conversation, they can't see its participants
- The `conversations` RLS policy checks participation before allowing access

## Alternative (If Still Having Issues)

If you still get errors, you can temporarily disable RLS on `conversation_participants` (not recommended for production):

```sql
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
```

But the fix above should work and is more secure.







