# Messaging + Search Infinite Loading Fixes

## Summary

Fixed messaging navigation, conversation persistence, and search infinite loading issues.

---

## A) Messaging Fixes ✅

### Problem
- "Message" button sometimes failed without navigation
- Conversations weren't persistent (new conversation created each time)
- No proper loading state on Message button

### Solution

**1. Refactored `findOrCreateDirectConversation()` in `lib/messages.ts`**
   - **New approach (no nested selects):**
     a) Get my conversation_ids from `conversation_participants` where `user_id = currentUserId`
     b) Check which of those also has participant `user_id = otherUserId` (simple filter)
     c) If exists, verify it's a direct conversation (exactly 2 participants)
     d) Else create new conversation + insert both participants
   - Uses request guard to prevent duplicate concurrent requests
   - Proper error handling and logging

**2. Updated Message button in `app/u/[id]/page.tsx`**
   - Uses `findOrCreateDirectConversation()` 
   - Button disabled while `isStartingChat` is true
   - Shows "..." while loading
   - Navigates to `/messages/${conversationId}` on success
   - Clear error messages with full error logging
   - Always clears loading state in `finally` block

**3. Chat page exists at `app/messages/[conversationId]/page.tsx`**
   - Already loads message history on mount
   - Messages ordered by `created_at` ascending
   - Realtime updates for new messages
   - Proper error handling and loading states

### Why it was failing:
- Old approach queried conversations first, then participants (inefficient)
- No button loading state allowed double-clicks
- Error handling didn't provide enough detail

---

## B) Search Infinite Loading Fix ✅

### Problem
- Search page loaded forever on mount (even with empty query)
- No search history feature

### Solution

**1. Fixed Infinite Loading**
   - ✅ No fetch on mount when query is empty
   - ✅ Only fetches when `debouncedTerm.trim().length >= 2`
   - ✅ 300ms debounce implemented
   - ✅ AbortController cancels stale requests
   - ✅ Loading always cleared in `finally` block
   - ✅ Early return if term is too short

**2. Added Search History**
   - Stores last 5 search queries in localStorage (using `safeStorage`)
   - Shows recent searches as clickable chips under search bar
   - Clicking a chip fills input and triggers search immediately
   - "Clear" button to reset history
   - History persists across sessions

### Why it was failing:
- Search effect triggered on mount even with empty query
- No debounce meant every keystroke triggered a request
- No request cancellation allowed stale requests to update state

---

## Files Changed

1. **`lib/messages.ts`**
   - Refactored `findOrCreateDirectConversation()` to use direct queries (no nested selects)
   - Approach: Get my conversations → Check which also have other user → Verify direct conversation
   - Better error handling

2. **`app/u/[id]/page.tsx`**
   - Updated to use `findOrCreateDirectConversation()`
   - Button disabled while `isStartingChat` is true
   - Better error logging
   - Always clears loading state in `finally`

3. **`app/messages/[conversationId]/page.tsx`**
   - Already exists and works correctly
   - Loads message history on mount
   - Added console log for debugging

4. **`app/search/page.tsx`**
   - Fixed infinite loading on mount
   - Added search history feature with localStorage
   - Recent searches UI with clickable chips
   - Clear button to reset history

---

## SQL Required

### ✅ NO SQL CHANGES NEEDED

The existing RLS policies in `supabase/rls_recursion_fix.sql` work correctly with the new approach:

1. **conversation_participants SELECT policy:**
   ```sql
   USING (public.is_conversation_participant(conversation_id, auth.uid()))
   ```
   - Users can see all participants in conversations they're part of
   - This allows the new approach: query my conversations, then check if other user is also a participant

2. **conversations SELECT policy:**
   ```sql
   USING (public.is_conversation_participant(id, auth.uid()))
   ```
   - Users can see conversations they participate in

3. **messages SELECT/INSERT policies:**
   ```sql
   USING (public.is_conversation_participant(conversation_id, auth.uid()))
   ```
   - Users can see/send messages in conversations they participate in

**Why it works:**
- The new `findOrCreateDirectConversation` approach queries `conversation_participants` directly
- RLS allows users to see all participants in their conversations
- This means we can check if both users are in the same conversation without nested selects
- The SECURITY DEFINER function `is_conversation_participant()` bypasses RLS recursion

---

## Testing Checklist

### Messaging:
- [ ] User A clicks Message on user B → creates conversation and navigates to `/messages/[conversationId]`
- [ ] Sending a message works
- [ ] User A clicks Message again later → reuses same conversationId
- [ ] Old message history loads and displays correctly
- [ ] Message button shows "..." while loading and is disabled

### Search:
- [ ] No spinner when search input is empty (on mount)
- [ ] Debounced search works (300ms delay)
- [ ] Recent searches show as clickable chips
- [ ] Clicking a recent search fills input and triggers search
- [ ] Clear button resets history
- [ ] History persists across page refreshes

---

## Build Status
✅ Build passes with no TypeScript errors

All fixes are complete and ready for testing.



