# Online Users Sidebar - Implementation Summary

## Overview

Implemented an Instagram-style right-side sidebar showing online/offline users with presence heartbeat functionality. Users can click on online users to open direct message conversations.

## Changes Made

### 1. Presence Heartbeat Hook (`hooks/usePresenceHeartbeat.ts`)

**Features:**
- Updates `user_presence.last_seen_at` every 45 seconds when authenticated
- Only runs when page is visible (`document.visibilityState === "visible"`)
- Stops heartbeat when page is hidden or user logs out
- Initial upsert on mount
- Automatic cleanup on unmount

**Logic:**
- Online = `last_seen_at >= now() - 60 seconds`
- Offline = otherwise

### 2. Online Users Sidebar Component (`components/OnlineUsersSidebar.tsx`)

**Features:**
- Fixed right-side sidebar (280px width)
- Shows users I follow (priority) or recent conversations (fallback)
- Displays avatar, display name, and online/offline status
- Green dot for online, gray dot for offline
- "Last seen X min ago" for offline users
- Clicking a user opens/creates DM conversation
- Filters out blocked users and self
- Responsive: hidden on mobile (`hidden lg:block`)

**Data Priority:**
1. **Users I follow** (if any)
2. **Recent conversations** (fallback if no follows)

**Online Status:**
- Green dot: `last_seen_at < 60 seconds ago`
- Gray dot + "Last seen X min ago": `last_seen_at >= 60 seconds ago`

**Click Behavior:**
- Uses `findOrCreateDirectConversation()` from existing messages logic
- Navigates to `/messages/[conversationId]`
- Creates conversation if it doesn't exist

### 3. Integration (`app/providers.tsx`)

**Added:**
- `PresenceHeartbeat` component (runs heartbeat hook)
- `OnlineUsersSidebar` component (rendered globally)
- Both components wrapped in providers

### 4. Translation Keys

**Added to `messages/en.json` and `contexts/LanguageContext.tsx`:**
- `profile.online: "Online"`
- `profile.offline: "Offline"`
- `profile.lastSeen: "Last seen {{minutes}} min ago"`
- `profile.noOnlineUsers: "No online users"`

## Files Changed

1. **`hooks/usePresenceHeartbeat.ts`** (NEW)
   - Presence heartbeat hook
   - Updates `user_presence.last_seen_at` every 45 seconds
   - Respects page visibility

2. **`components/OnlineUsersSidebar.tsx`** (NEW)
   - Right-side sidebar component
   - Shows online/offline users
   - Handles click to open DMs

3. **`app/providers.tsx`**
   - Added `PresenceHeartbeat` component
   - Added `OnlineUsersSidebar` component

4. **`messages/en.json`**
   - Added translation keys for online/offline status

5. **`contexts/LanguageContext.tsx`**
   - Added translation keys to English translations

## Data Flow

### Presence Heartbeat:
```
User logs in → Hook mounts → Upsert user_presence
→ Set interval (45s) → Update last_seen_at
→ Page hidden → Stop interval
→ Page visible → Resume interval
```

### Online Users List:
```
Component mounts → Load blocked users
→ Load users I follow (priority)
  → If none, load recent conversations
→ Load presence data for users
→ Filter out blocked users and self
→ Calculate online status (last_seen_at < 60s)
→ Sort: online first, then by last_seen_at
→ Display list
→ Refresh every 30 seconds
```

### Click to Open DM:
```
User clicks → findOrCreateDirectConversation()
→ Navigate to /messages/[conversationId]
```

## UI/UX Features

- **Fixed Position:** Right side of screen, doesn't scroll with content
- **Responsive:** Hidden on mobile (`lg:block`)
- **Online Indicator:** Green dot for online, gray for offline
- **Status Text:** "Online" or "Last seen X min ago"
- **Hover Effect:** Background color change on hover
- **Loading State:** Spinner while loading
- **Empty State:** "No online users" message
- **Gold Theme:** Matches app design

## Performance & Safety

- ✅ **One presence query** - No polling, uses single query with refresh
- ✅ **45-second heartbeat** - Respects rate limiting
- ✅ **Visibility-aware** - Stops when page is hidden
- ✅ **Block filtering** - Respects existing blocks logic
- ✅ **No backend changes** - Uses existing tables and RLS
- ✅ **No RLS changes** - Respects existing policies
- ✅ **Additive only** - No refactoring of existing code

## Testing Checklist

### ✅ Test 1: Login → Sidebar Appears
1. Log in to the app
2. **Expected:** Right-side sidebar appears with "Online" title

### ✅ Test 2: Open 2 Browsers → Online Indicator Updates
1. User A: Log in on Browser 1
2. User B: Log in on Browser 2
3. User A: Follow User B
4. User B: Check Browser 1 sidebar
5. **Expected:** User B appears with green dot (online)
6. User B: Close Browser 2
7. Wait 60+ seconds
8. User A: Check Browser 1 sidebar
9. **Expected:** User B shows gray dot + "Last seen X min ago"

### ✅ Test 3: Wait 2+ Min → Offline
1. User A: Log in
2. User B: Log in and follow User A
3. User A: Close browser
4. Wait 2+ minutes
5. User B: Check sidebar
6. **Expected:** User A shows "Last seen 2+ min ago" (offline)

### ✅ Test 4: Click User → DM Opens
1. User A: Log in
2. User B: Log in and follow User A
3. User B: Click User A in sidebar
4. **Expected:** DM conversation opens (or creates if doesn't exist)

### ✅ Test 5: Blocked Users Hidden
1. User A: Block User B
2. User A: Check sidebar
3. **Expected:** User B does not appear in sidebar

### ✅ Test 6: Self Not Shown
1. User A: Log in
2. User A: Check sidebar
3. **Expected:** User A does not appear in their own sidebar

### ✅ Test 7: No Follows → Shows Recent Conversations
1. User A: Log in (no follows)
2. User A: Have some DM conversations
3. User A: Check sidebar
4. **Expected:** Shows users from recent conversations

### ✅ Test 8: Mobile Responsive
1. Open app on mobile device
2. **Expected:** Sidebar is hidden (only visible on desktop)

## Important Notes

- ✅ **No DB changes** - Uses existing `user_presence` table
- ✅ **No RLS changes** - Respects existing policies
- ✅ **No schema changes** - Additive only
- ✅ **Heartbeat rate** - 45 seconds (safe, not spammy)
- ✅ **Online threshold** - 60 seconds (configurable in code)
- ✅ **Refresh rate** - 30 seconds for user list updates
- ✅ **i18n compatible** - Uses translation keys
- ✅ **Responsive** - Hidden on mobile, visible on desktop

## Edge Cases Handled

1. **No follows:** Falls back to recent conversations
2. **No conversations:** Shows empty state
3. **Blocked users:** Filtered out from list
4. **Self:** Not shown in own sidebar
5. **Page hidden:** Heartbeat stops, resumes when visible
6. **User logs out:** Heartbeat stops, sidebar hides
7. **No presence data:** Shows as offline
8. **Missing profile:** Only shows users with profiles

## Technical Details

### Presence Update Logic:
```typescript
// Online if last_seen_at is within 60 seconds
const isOnline = lastSeenDate && 
  (now.getTime() - lastSeenDate.getTime()) / 1000 < 60;
```

### Heartbeat Interval:
```typescript
// Update every 45 seconds when page is visible
setInterval(() => {
  updatePresence();
}, 45000);
```

### Visibility Handling:
```typescript
// Stop heartbeat when page is hidden
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    // Resume heartbeat
  } else {
    // Stop heartbeat
  }
});
```





