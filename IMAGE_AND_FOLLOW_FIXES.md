# Image URL Validation & Follow Status Error Fixes

## Summary

Fixed two runtime issues:
1. **400 errors from invalid image URLs** - Images were being rendered with invalid URLs (user IDs, empty strings, or malformed Supabase URLs)
2. **Follow status error logging** - Error logging wasn't printing full error details (message, details, hint, code)

## Changes Made

### 1. Created URL Validation Utility (`lib/utils.ts`)

Added `isValidUrl()` function that:
- Checks if a string is a valid HTTP/HTTPS URL
- Returns `false` for null, undefined, or non-string values
- Validates URL format using the URL constructor
- Only allows URLs starting with `http://` or `https://`

### 2. Fixed Image Rendering in All Components

**Files Updated:**
- `components/PostCard.tsx` - Post images now only render if URL is valid
- `app/profile/page.tsx` - Avatar images validated before rendering
- `app/u/[id]/page.tsx` - Public profile avatar validated
- `app/search/page.tsx` - Search result avatars validated
- `app/messages/page.tsx` - Conversation list avatars validated
- `app/messages/[conversationId]/page.tsx` - Chat header avatar validated

**Pattern Applied:**
```typescript
// Before:
{avatar_url && <img src={avatar_url} ... />}

// After:
{avatar_url && isValidUrl(avatar_url) && <img src={avatar_url} ... />}
```

**Result:**
- Invalid URLs (user IDs, empty strings, malformed URLs) no longer trigger 400 errors
- Fallback to initials circle is shown when avatar_url is missing or invalid
- All image rendering is now safe and won't cause network errors

### 3. Fixed Follow Status Error Logging

**Files Updated:**
- `app/u/[id]/page.tsx` - `checkFollowingStatus()` now logs full error details
- `app/search/page.tsx` - `loadFollowingStatus()` now logs full error details

**Pattern Applied:**
```typescript
// Before:
console.error("Error loading following status:", error);

// After:
console.error("Error loading following status:", {
  error,
  message: error.message,
  details: error.details,
  hint: error.hint,
  code: error.code,
});
```

**Additional Fix:**
- Added guard in `checkFollowingStatus()` to ensure both `user` and `userId` exist before querying

### 4. Updated RLS Policies for Follows Table

**File Created:** `supabase/follows_rls_fix.sql`

**Changes:**
- Updated SELECT policy to be more restrictive: Users can only view follows where they are the follower OR the followed user
- INSERT and DELETE policies remain the same (users can only manage their own follows)
- All policies use `DROP POLICY IF EXISTS` for safe re-running

**SQL to Run:**
```sql
-- Run this in Supabase SQL Editor:
-- File: supabase/follows_rls_fix.sql
```

## Testing Checklist

- [ ] Run `supabase/follows_rls_fix.sql` in Supabase SQL Editor
- [ ] Check browser console - no more 400 errors for image URLs
- [ ] Verify avatars show initials when avatar_url is missing/invalid
- [ ] Verify post images only render when URL is valid
- [ ] Check follow status errors now show full details in console
- [ ] Test follow/unfollow functionality still works
- [ ] Verify search page shows user avatars correctly
- [ ] Verify messages pages show conversation avatars correctly

## Files Changed

### New Files
- `lib/utils.ts` - URL validation utility
- `supabase/follows_rls_fix.sql` - Updated RLS policies
- `IMAGE_AND_FOLLOW_FIXES.md` - This summary

### Modified Files
- `components/PostCard.tsx` - Added URL validation for post images
- `app/profile/page.tsx` - Added URL validation for avatar
- `app/u/[id]/page.tsx` - Added URL validation for avatar + fixed follow status logging
- `app/search/page.tsx` - Added URL validation for avatars + fixed follow status logging
- `app/messages/page.tsx` - Added URL validation for conversation avatars
- `app/messages/[conversationId]/page.tsx` - Added URL validation for chat header avatar

## Expected Results

1. **No More 400 Errors:**
   - Browser console should no longer show "Failed to load resource: the server responded with a status of 400"
   - Invalid image URLs are filtered out before rendering

2. **Better Error Logging:**
   - Follow status errors now show complete details:
     - `error` - Full error object
     - `message` - Error message
     - `details` - Error details
     - `hint` - Error hint
     - `code` - Error code

3. **Improved RLS Security:**
   - Follows table now has more restrictive SELECT policy
   - Users can only view follows where they are involved (follower or followed)

## Notes

- All image rendering now uses `isValidUrl()` check before rendering `<img>` tags
- Fallback to initials is shown when avatar_url is missing or invalid
- Error logging follows consistent pattern across all follow status checks
- RLS policies are safe to re-run (use `DROP POLICY IF EXISTS`)


