# Production Bugs Fix - Integration Test Checklist

## Overview
This checklist verifies that both production bugs have been fixed without breaking existing features.

## BUG A: "Signing in forever" Fix

### Test 1: Normal Login Flow
- [ ] Open `/login` page
- [ ] Enter valid email and password
- [ ] Click "Sign In"
- [ ] **Expected:** Login succeeds, redirects to `/feed`, no infinite "Signing in..." state
- [ ] **Expected:** Loading state clears after login completes

### Test 2: Invalid Credentials
- [ ] Enter invalid email/password
- [ ] Click "Sign In"
- [ ] **Expected:** Error message shown, loading state clears (button becomes enabled again)
- [ ] **Expected:** Can retry login without clearing cache

### Test 3: Session Validation on App Load
- [ ] Login successfully
- [ ] Close browser completely
- [ ] Reopen browser and navigate to app
- [ ] **Expected:** 
  - If session is valid: User stays logged in
  - If session is invalid: User redirected to `/login` cleanly (no infinite loading)

### Test 4: Stale Session Cleanup
- [ ] Login successfully
- [ ] Manually expire session (or wait for expiration)
- [ ] Refresh page
- [ ] **Expected:** Session cleared, redirected to `/login` with message, no infinite loading

### Test 5: Reset Login Button
- [ ] If stuck on "Signing in..." or login issues
- [ ] Click "🔄 Reset Login (Clear Cache)" button on login page
- [ ] **Expected:** 
  - All auth storage cleared
  - Page reloads
  - Can login fresh without manual cache clearing

### Test 6: Register Flow
- [ ] Go to `/register`
- [ ] Fill form and submit
- [ ] **Expected:** Registration completes, loading state clears in finally block
- [ ] **Expected:** No infinite loading even if registration fails

### Test 7: Redirect Loop Prevention
- [ ] Login successfully
- [ ] Navigate to `/login` manually
- [ ] **Expected:** Redirects to `/feed` cleanly (no infinite redirect loop)
- [ ] **Expected:** No repeated router pushes

## BUG B: "Endless loading" Fix

### Test 8: Messages Page Loading
- [ ] Login and navigate to `/messages`
- [ ] **Expected:** 
  - Loading spinner shows initially
  - After 8-10 seconds max, either:
    - Conversations load successfully, OR
    - Error message shown with "Retry" button (no infinite spinner)
- [ ] **Expected:** Console shows detailed error logs (code, message, details, hint) if error occurs

### Test 9: Messages Page Error Handling
- [ ] If messages fail to load (simulate network issue or timeout)
- [ ] **Expected:** 
  - Loading stops after timeout (8-10s)
  - Error message displayed
  - "Retry" button available
  - No infinite spinner

### Test 10: Feed Page Loading
- [ ] Navigate to `/feed`
- [ ] **Expected:** 
  - Loading spinner shows initially
  - After 8-10 seconds max, either:
    - Posts load successfully, OR
    - Error message shown with "Retry" button
- [ ] **Expected:** No infinite loading spinner

### Test 11: Feed Page Error Handling
- [ ] If feed fails to load (simulate timeout)
- [ ] **Expected:** 
  - Loading stops after timeout
  - Error message displayed
  - "Retry" button available
  - Clicking "Retry" attempts to reload posts

### Test 12: Chat Conversation Loading
- [ ] Open a conversation in `/messages/[conversationId]`
- [ ] **Expected:** 
  - Messages load within 8-10 seconds
  - If timeout: Error shown with retry option
  - No infinite loading

### Test 13: Online Users Sidebar Loading
- [ ] Login and check right-side sidebar
- [ ] **Expected:** 
  - Online users load within 10 seconds
  - If timeout: Sidebar shows empty or error (no infinite loading)
  - No duplicate subscriptions (check console for duplicate subscription warnings)

### Test 14: Realtime Subscription Duplication Prevention
- [ ] Open a conversation
- [ ] Check browser console
- [ ] **Expected:** 
  - Only ONE subscription setup log per conversation
  - No duplicate "Setting up realtime subscription" messages
  - No duplicate message updates

### Test 15: Error Logging Quality
- [ ] Trigger an error (network issue, timeout, etc.)
- [ ] Check browser console
- [ ] **Expected:** 
  - Error logs show: `message`, `code`, `details`, `hint`, `status`
  - NOT just "[Object]" or generic error
  - Example: `[Messages] Participants query error details: { message: "...", code: "...", ... }`

## Feature Preservation Tests

### Test 16: Messages Features Still Work
- [ ] Send text message
- [ ] Send image attachment
- [ ] Send file attachment
- [ ] Use emoji picker
- [ ] **Expected:** All features work as before

### Test 17: Unread Badge Still Works
- [ ] Receive a message from another user
- [ ] **Expected:** Unread badge increments in navbar
- [ ] Open conversation
- [ ] **Expected:** Badge decrements (message marked as read)

### Test 18: Online Users Sidebar Still Works
- [ ] Check right-side sidebar
- [ ] **Expected:** Shows online/offline users
- [ ] Click a user
- [ ] **Expected:** Opens DM conversation

### Test 19: Phone Privacy Still Works
- [ ] Edit profile → Toggle phone privacy
- [ ] **Expected:** Setting persists
- [ ] View other user's profile
- [ ] **Expected:** Phone visibility respects privacy setting

### Test 20: Followers/Following Modal Still Works
- [ ] Click followers/following count on profile
- [ ] **Expected:** Modal opens with lists
- [ ] Unfollow/Remove follower
- [ ] **Expected:** Actions work correctly

## Edge Cases

### Test 21: Multiple Tabs
- [ ] Open app in 2 browser tabs
- [ ] Login in tab 1
- [ ] **Expected:** Tab 2 also shows logged in state (or redirects to login if session invalid)
- [ ] **Expected:** No infinite loading in either tab

### Test 22: Network Interruption
- [ ] Start loading messages/feed
- [ ] Disconnect network mid-load
- [ ] **Expected:** 
  - Loading stops after timeout
  - Error message shown
  - Retry button available

### Test 23: React Strict Mode (Dev)
- [ ] In development mode (React Strict Mode enabled)
- [ ] Open conversation
- [ ] **Expected:** 
  - Only ONE realtime subscription created
  - No duplicate subscriptions
  - No duplicate message updates

### Test 24: Rapid Navigation
- [ ] Quickly navigate: `/messages` → `/feed` → `/messages` → `/feed`
- [ ] **Expected:** 
  - Each page loads correctly
  - No stuck loading states
  - No memory leaks (check console for errors)

## Success Criteria

✅ **BUG A Fixed:**
- All auth actions complete (loading=false in finally)
- Session validation works on app load
- Stale sessions cleared automatically
- Reset login button works
- No redirect loops

✅ **BUG B Fixed:**
- No infinite loading spinners (max 8-10s timeout)
- Error messages shown with Retry buttons
- Realtime subscriptions not duplicated
- Error logging shows detailed info (not "[Object]")

✅ **Features Preserved:**
- Messages, attachments, emoji picker work
- Unread badge works
- Online sidebar works
- Phone privacy works
- Followers/following modal works

## Notes

- All timeouts are set to 8-10 seconds
- Error logging includes: `message`, `code`, `details`, `hint`, `status`
- Realtime subscriptions use refs to prevent duplicates
- All loading states have finally blocks to ensure cleanup





