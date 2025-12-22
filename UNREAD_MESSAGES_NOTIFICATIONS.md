# Unread Message Notifications - Implementation Summary

## Overview

Added unread message count badge to the Messages navbar icon. The badge shows the number of unread messages and updates in real-time via Supabase realtime subscriptions.

## Changes Made

### 1. Unread Messages Hook (`hooks/useUnreadMessages.ts`)

**Features:**
- Counts unread messages where:
  - `read_at IS NULL`
  - `sender_id != auth.uid()`
- Loads initial count on mount
- Subscribes to realtime updates for:
  - **INSERT events:** New messages (increments count)
  - **UPDATE events:** Messages marked as read (decrements count)
- Refreshes count every 30 seconds as fallback
- Automatically cleans up subscriptions on unmount

**Query:**
```typescript
supabase
  .from("messages")
  .select("*", { count: "exact", head: true })
  .is("read_at", null)
  .neq("sender_id", user.id)
```

### 2. Navbar Badge (`components/Navbar.tsx`)

**Features:**
- Gold badge on Messages link (desktop and mobile)
- Shows unread count (or "99+" if > 99)
- Badge hidden when count = 0
- Positioned absolutely in top-right corner of link

**Styling:**
- Gold background (`bg-gold`)
- Dark text (`text-gray-900`)
- Small font (`text-xs`)
- Rounded full (`rounded-full`)
- Fixed size (`w-5 h-5`)

### 3. Mark Messages as Read (`app/messages/[conversationId]/page.tsx`)

**Features:**
- Marks messages as read when conversation loads
- Marks new messages as read when received via realtime
- Updates `read_at` timestamp for unread messages
- Only marks messages where `sender_id != user.id`

**Implementation:**
- On conversation load: Marks all unread messages in conversation
- On new message via realtime: Marks message as read if not from current user

## Files Changed

1. **`hooks/useUnreadMessages.ts`** (NEW)
   - Hook for tracking unread message count
   - Realtime subscription for updates
   - Periodic refresh as fallback

2. **`components/Navbar.tsx`**
   - Added `useUnreadMessages()` hook
   - Added badge to Messages link (desktop and mobile)
   - Conditional rendering (badge only shows when count > 0)

3. **`app/messages/[conversationId]/page.tsx`**
   - Added `read_at` to Message interface
   - Added `read_at` to message queries
   - Added logic to mark messages as read on load
   - Added logic to mark new messages as read via realtime

## Data Flow

### Initial Load:
```
Navbar mounts → useUnreadMessages hook
→ Query: COUNT messages WHERE read_at IS NULL AND sender_id != auth.uid()
→ Set unreadCount state
→ Subscribe to realtime updates
```

### New Message Arrives:
```
Realtime INSERT event → Hook receives payload
→ Check: sender_id != auth.uid()
→ Increment unreadCount
→ Badge updates automatically
```

### Message Marked as Read:
```
User views conversation → Mark messages as read
→ UPDATE messages SET read_at = NOW()
→ Realtime UPDATE event → Hook receives payload
→ Check: read_at changed from NULL to value
→ Decrement unreadCount
→ Badge updates automatically
```

### Periodic Refresh:
```
Every 30 seconds → loadUnreadCount()
→ Re-query database
→ Update count (catches any missed updates)
```

## UI/UX Features

- **Gold Badge:** Matches app theme
- **Count Display:** Shows actual number or "99+" for large counts
- **Auto-hide:** Badge disappears when count = 0
- **Real-time Updates:** Updates immediately via Supabase realtime
- **Responsive:** Works on desktop and mobile navbar

## Important Notes

- ✅ **No DB changes** - Uses existing `messages.read_at` column
- ✅ **No RLS changes** - Respects existing policies
- ✅ **No schema changes** - Additive only
- ✅ **Backward compatible** - Works with existing messages
- ✅ **Production safe** - Handles errors gracefully
- ✅ **Performance optimized** - Uses count query (head: true) for efficiency
- ✅ **Real-time updates** - Via Supabase realtime subscriptions

## Edge Cases Handled

1. **User logs out:** Count resets to 0, subscription cleaned up
2. **No unread messages:** Badge hidden (count = 0)
3. **Large count:** Shows "99+" for counts > 99
4. **Realtime fails:** Periodic refresh (30s) catches missed updates
5. **Multiple tabs:** Each tab has its own subscription
6. **Message marked as read elsewhere:** Realtime UPDATE event updates count
7. **Network issues:** Graceful error handling, periodic refresh as fallback

## Testing Checklist

### ✅ Test 1: Badge Appears on Page Load
1. User A: Send message to User B
2. User B: Log in
3. **Expected:** Badge appears on Messages link with count = 1

### ✅ Test 2: Badge Updates on New Message
1. User A: Send message to User B
2. User B: Check navbar (badge shows count)
3. **Expected:** Badge count increments immediately

### ✅ Test 3: Badge Updates When Message Read
1. User A: Send message to User B
2. User B: Badge shows count = 1
3. User B: Open conversation
4. **Expected:** Badge count decrements (or disappears if count = 0)

### ✅ Test 4: Badge Hides When Count = 0
1. User B: Read all messages
2. **Expected:** Badge disappears

### ✅ Test 5: Multiple Messages
1. User A: Send 5 messages to User B
2. User B: Check navbar
3. **Expected:** Badge shows count = 5

### ✅ Test 6: Large Count
1. User A: Send 100+ messages to User B
2. User B: Check navbar
3. **Expected:** Badge shows "99+"

### ✅ Test 7: Own Messages Don't Count
1. User A: Send message to themselves (if possible)
2. **Expected:** Badge count does not increment

### ✅ Test 8: Realtime Updates
1. User A: Send message to User B
2. User B: Keep navbar visible (don't open conversation)
3. **Expected:** Badge updates immediately without page refresh

## Technical Details

### Unread Count Query:
```typescript
supabase
  .from("messages")
  .select("*", { count: "exact", head: true })
  .is("read_at", null)
  .neq("sender_id", user.id)
```

### Mark as Read:
```typescript
supabase
  .from("messages")
  .update({ read_at: new Date().toISOString() })
  .in("id", unreadMessageIds)
```

### Realtime Subscription:
```typescript
supabase
  .channel("unread-messages")
  .on("postgres_changes", {
    event: "INSERT",
    table: "messages",
    filter: `sender_id=neq.${user.id}`
  }, (payload) => {
    // Increment count
  })
  .on("postgres_changes", {
    event: "UPDATE",
    table: "messages",
    filter: `sender_id=neq.${user.id}`
  }, (payload) => {
    // Decrement count if read_at changed from NULL to value
  })
```

