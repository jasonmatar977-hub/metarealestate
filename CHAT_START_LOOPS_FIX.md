# Chat Start Loops + Schema Mismatch Fix

## Problems Fixed

1. **Chat start loops**: Multiple concurrent requests for the same user pair
2. **Schema mismatch**: Messages table missing `content` column
3. **Infinite retry loops**: Auto-retry mechanisms causing loops
4. **Unstable useEffect dependencies**: Causing re-renders and duplicate loads

## Solutions

### 1. Per-Target Request Lock (`lib/messages.ts`)

**Implementation:**
- Created `conversationLocks` Map keyed by sorted user IDs: `"userId1:userId2"`
- If a request is already in progress, await and return the existing promise (do not throw)
- Always release lock in `finally` block
- Uses `getConversationKey()` to ensure same key for both directions (A:B = B:A)

**Key Changes:**
```typescript
// Before: Used requestGuard which returned error if already in flight
if (!requestGuard.start(requestKey)) {
  return { conversationId: "", error: { message: "Request already in progress" } };
}

// After: Uses Promise-based lock that awaits existing request
const existingPromise = conversationLocks.get(lockKey);
if (existingPromise) {
  return existingPromise; // Await and return (do not throw)
}
```

**Benefits:**
- Prevents duplicate concurrent requests
- Multiple calls for same user pair share the same promise
- No "request already in progress" errors
- Automatic cleanup in `finally` block

### 2. Improved Conversation Query (`lib/messages.ts`)

**Before:** Multiple queries (get my conversations, then check for other user)
**After:** Single query that groups by conversation_id and checks for both users

**New Flow:**
```typescript
// Step 1: Query all participants for both users in one query
const { data: participants } = await supabase
  .from("conversation_participants")
  .select("conversation_id, user_id")
  .in("user_id", [currentUserId, otherUserId]);

// Step 2: Group by conversation_id and find conversations with both users
const conversationParticipants = new Map<string, Set<string>>();
participants.forEach((p) => {
  if (!conversationParticipants.has(p.conversation_id)) {
    conversationParticipants.set(p.conversation_id, new Set());
  }
  conversationParticipants.get(p.conversation_id)!.add(p.user_id);
});

// Step 3: Find conversations with both users (exactly 2 participants for direct)
for (const [convId, userIds] of conversationParticipants.entries()) {
  if (userIds.has(currentUserId) && userIds.has(otherUserId) && userIds.size === 2) {
    return { conversationId: convId, error: null };
  }
}
```

**Benefits:**
- More efficient (single query instead of multiple)
- More reliable (no race conditions between queries)
- Verifies direct conversation (exactly 2 participants)

### 3. Conversation Creation (`lib/messages.ts`)

**Updated `createNewDirectConversation()`:**
- Includes `created_by` field if column exists (optional, will be ignored if not)
- Better error logging with full error details
- Handles race conditions (duplicate key errors)

**Flow:**
1. Insert into `conversations` with `created_by = currentUserId`
2. Insert current user as participant first
3. Insert target user as participant second (allowed because current user is now a participant)

### 4. Messages Schema (`supabase/add_messages_content_column.sql`)

**Updated migration:**
- Ensures `content` column has `NOT NULL DEFAULT ''`
- Migrates data from alternative column names if they exist
- Safe to rerun

**Column specification:**
```sql
ALTER TABLE public.messages ADD COLUMN content text NOT NULL DEFAULT '';
```

### 5. Stable useEffect Dependencies (`app/messages/page.tsx`, `app/messages/[conversationId]/page.tsx`)

**Fixed:**
- Added `loadConversations` to dependency array (it's stable via `useCallback`)
- Added `loadConversationData` to dependency array (it's stable via `useCallback`)
- Added cleanup to reset `loadingRef` in cleanup function
- No auto-retry loops (retry buttons are manual only)

**Before:**
```typescript
useEffect(() => {
  // ...
}, [isAuthenticated, user?.id]); // Missing loadConversations
```

**After:**
```typescript
useEffect(() => {
  // ...
  return () => {
    hasLoadedRef.current = false;
    loadingRef.current = false; // Added cleanup
  };
}, [isAuthenticated, user?.id, loadConversations]); // Includes stable callback
```

### 6. No Auto-Retry Loops

**Verified:**
- Retry buttons are manual only (onClick handlers)
- No `setInterval` or `setTimeout` retry mechanisms
- No infinite retry loops in error handlers
- All retries are user-initiated via button clicks

## Files Changed

1. **`lib/messages.ts`**
   - Added `conversationLocks` Map for per-target request locking
   - Added `getConversationKey()` helper function
   - Refactored `findOrCreateDirectConversation()` to use Promise-based lock
   - Improved conversation query to use single query with grouping
   - Updated `createNewDirectConversation()` to include `created_by` field

2. **`app/messages/page.tsx`**
   - Fixed `useEffect` dependencies to include `loadConversations`
   - Added cleanup to reset `loadingRef`
   - Verified retry button is manual only

3. **`app/messages/[conversationId]/page.tsx`**
   - Fixed `useEffect` dependencies to include `loadConversationData` and `setupRealtimeSubscription`
   - Added cleanup to reset `loadingRef`
   - Verified retry button is manual only

4. **`supabase/add_messages_content_column.sql`**
   - Updated to ensure `content` column has `NOT NULL DEFAULT ''`
   - Safe to rerun

## How to Apply

### Step 1: Run SQL Migration (if not already done)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy/paste contents of `supabase/add_messages_content_column.sql`
3. Run it
4. Verify: `✅ content column verified: type = text`

### Step 2: Restart Dev Server

```bash
npm run dev
```

### Step 3: Test

**Test Scenario 1: Chat Start (No Loops)**
1. Go to User B's profile
2. Click "Message" button 5 times rapidly
3. Should only start one request
4. Should not get stuck in "request already in progress"
5. Should create/find conversation and navigate

**Test Scenario 2: Load Conversations (No Loops)**
1. Go to `/messages`
2. Should load once (check console for duplicate calls)
3. Refresh page
4. Should load again (once)
5. No infinite loading spinner

**Test Scenario 3: Load Messages (No Loops)**
1. Open a conversation
2. Should load messages once
3. Refresh page
4. Should load again (once)
5. No infinite loading spinner

**Test Scenario 4: Retry Button (Manual Only)**
1. Cause an error (e.g., network issue)
2. Should show error message
3. Click "Retry" button
4. Should retry once
5. Should not auto-retry

## Expected Behavior

✅ **After Fix:**
- Chat start works without loops
- Multiple rapid clicks share the same request
- Conversations load once per mount
- Messages load once per mount
- Retry buttons work manually only
- No infinite loading spinners
- `content` column exists and works

❌ **Before Fix:**
- Multiple concurrent requests for same user pair
- "Request already in progress" errors
- Infinite loading loops
- Auto-retry mechanisms
- Missing `content` column errors

## Technical Details

### Per-Target Lock Mechanism

```typescript
// Lock key format: "userId1:userId2" (sorted)
const lockKey = getConversationKey(currentUserId, otherUserId);

// Check if request already in progress
const existingPromise = conversationLocks.get(lockKey);
if (existingPromise) {
  return existingPromise; // Share the same promise
}

// Create new promise
const requestPromise = async () => {
  try {
    // ... find or create conversation ...
  } finally {
    conversationLocks.delete(lockKey); // Always release
  }
}();

conversationLocks.set(lockKey, requestPromise);
return requestPromise;
```

### Conversation Query Optimization

**Before (2-3 queries):**
1. Get my conversations
2. Check which have other user
3. Verify participant count

**After (1 query + grouping):**
1. Get all participants for both users
2. Group by conversation_id
3. Find conversations with both users (size === 2)

**Benefits:**
- Single database round-trip
- No race conditions
- More efficient
- More reliable

## Verification

After applying fixes, verify:

1. ✅ No duplicate requests in console logs
2. ✅ No "request already in progress" errors
3. ✅ Conversations load once per mount
4. ✅ Messages load once per mount
5. ✅ Retry buttons work (manual only)
6. ✅ No infinite loading spinners
7. ✅ `content` column exists in database
8. ✅ Messages send/receive work correctly

## Troubleshooting

**If chat start still loops:**

1. Check console for duplicate `[messages]` logs
2. Verify `conversationLocks` is working (check for lock key logs)
3. Check if `findOrCreateDirectConversation` is being called multiple times
4. Verify `useEffect` dependencies are stable

**If conversations load multiple times:**

1. Check `useEffect` dependencies
2. Verify `loadConversations` is wrapped in `useCallback`
3. Check for duplicate `loadConversations` calls in console
4. Verify `hasLoadedRef` is working correctly

**If content column still missing:**

1. Run `supabase/add_messages_content_column.sql` again
2. Verify column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'messages'`
3. Check Supabase logs for migration errors


