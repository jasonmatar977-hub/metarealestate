# Login Stuck State Fix

## Problem
If a user enters a wrong password once, the login UI gets stuck on "Signing in..." and only works again after clearing browser storage.

## Root Cause
1. `isLoading` state in `AuthContext` was not always reset in a `finally` block
2. On auth errors, stale auth keys in localStorage were not cleaned up
3. Failed login attempts left stale session state that interfered with retries

## Solution

### 1. Always Reset Loading State (`contexts/AuthContext.tsx`)

**Added `finally` block** to ensure `isLoading` is ALWAYS reset:
```typescript
finally {
  console.log('[AuthContext] isLoading reset');
  setIsLoading(false);
}
```

### 2. Clean Up Stale Auth Keys on Failed Login

**New function `cleanupStaleAuthKeys()`** that:
- Removes all localStorage keys starting with `sb-`
- Removes all localStorage keys containing `supabase.auth.token`
- Only runs after failed login attempts

**Called when:**
- Auth error detected (invalid credentials, etc.)
- Any exception during login

### 3. Sign Out on Failed Login

**Added defensive recovery:**
- On auth errors (invalid credentials), call `supabase.auth.signOut()`
- Then clean up localStorage keys
- This ensures no stale session state remains

### 4. Prevent Navigation on Error

**In `LoginForm.tsx`:**
- Removed any redirect logic from error handlers
- Navigation only happens on successful login
- User can retry immediately after seeing error message

### 5. Enhanced Error Logging

**Console logs added:**
- `[AuthContext] signIn start`
- `[AuthContext] signIn success`
- `[AuthContext] signIn error: {message, name, status}`
- `[AuthContext] signOut cleanup executed`
- `[AuthContext] isLoading reset`
- `[LoginForm] signIn start`
- `[LoginForm] signIn success`
- `[LoginForm] signIn error message: ...`
- `[LoginForm] isLoading reset`

## Files Changed

### `contexts/AuthContext.tsx`
- Added `cleanupStaleAuthKeys()` function
- Updated `login()` function:
  - Added `finally` block to always reset `isLoading`
  - Added auth error detection
  - Added `signOut()` call on auth errors
  - Added localStorage cleanup on auth errors
  - Enhanced error logging

### `components/LoginForm.tsx`
- Updated `handleSubmit()` function:
  - Enhanced console logging
  - Ensured `finally` block always resets `isSubmitting`
  - Removed any redirect logic from error paths
  - Clear error messages shown to user

## Testing Checklist

- [ ] Enter wrong password → See error message, button returns to "Sign In"
- [ ] Enter wrong password multiple times → Can retry each time without clearing storage
- [ ] Enter correct password → Login succeeds and redirects
- [ ] Check browser console → See all debug logs
- [ ] Check localStorage → Stale `sb-*` keys are removed after failed login
- [ ] No need to clear browser storage manually

## Expected Behavior

1. **Wrong Password:**
   - User sees "Invalid email or password. Please try again."
   - Button returns to "Sign In" (not stuck on "Signing in...")
   - User can immediately retry
   - No redirect happens

2. **Correct Password:**
   - Login succeeds
   - User is redirected to `/feed`
   - No error messages

3. **Multiple Failed Attempts:**
   - Each attempt shows error message
   - Button always returns to normal state
   - User can retry indefinitely
   - No need to clear storage

## Technical Details

### localStorage Cleanup
Only removes:
- Keys starting with `sb-` (Supabase session keys)
- Keys containing `supabase.auth.token`

Does NOT remove:
- Other localStorage keys
- sessionStorage
- Cookies

### Auth Error Detection
Detects auth-related errors by checking:
- Error name is `AuthApiError`
- Error message contains: "invalid", "credentials", "email", "password"

### Sign Out Cleanup
- Called only after failed login attempts
- Not called on successful login
- Ensures no stale session state remains


