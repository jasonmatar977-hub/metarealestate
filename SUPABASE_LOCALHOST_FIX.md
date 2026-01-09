# Fix: "Failed to fetch" on Supabase Login (Localhost)

## Root Cause

The "Failed to fetch" error occurs when:
1. **Environment variables not loaded**: `.env.local` is missing or not in the project root
2. **Invalid Supabase URL**: The client tries to connect to a placeholder URL (`https://placeholder.supabase.co`)
3. **Network error**: The Supabase client can't reach the actual Supabase instance
4. **No error feedback**: Users don't see what's wrong

## Exact Fixes Applied

### 1. Enhanced Environment Variable Validation (`lib/supabaseClient.ts`)

**Before:**
- Basic validation that didn't provide clear feedback
- Placeholder URLs used silently

**After:**
- Added `getSupabaseConfigError()` function that returns specific error messages
- Enhanced logging in development mode (shows env var status without exposing keys)
- Clear console errors when env vars are missing
- Runtime validation that checks if we're in browser context

**Key Changes:**
```typescript
// Added helper to get validation errors for UI
export const getSupabaseConfigError = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  if (!supabaseUrl) {
    return 'NEXT_PUBLIC_SUPABASE_URL is not set. Please create .env.local in project root.';
  }
  // ... more validation
};
```

### 2. Login Form Error Display (`components/LoginForm.tsx`)

**Before:**
- Generic error messages
- "Failed to fetch" errors not caught specifically

**After:**
- Shows configuration error banner at top of login form if env vars are missing
- Catches "Failed to fetch" errors specifically
- Provides actionable error messages
- Checks configuration before attempting login

**Key Changes:**
```typescript
// Check Supabase configuration on mount
useEffect(() => {
  const error = getSupabaseConfigError();
  if (error) {
    setConfigError(error);
  }
}, []);

// Handle "Failed to fetch" errors specifically
if (error.message?.includes('Failed to fetch')) {
  setErrors({ submit: "Cannot connect to Supabase. Please check your internet connection and ensure NEXT_PUBLIC_SUPABASE_URL is set correctly in .env.local" });
}
```

### 3. Development Debug Logging

**Added:**
- Console logs in dev mode showing env var status (without exposing full keys)
- Logs show: URL set/valid, key set/valid, key preview (first 10 chars)
- Clear error messages in console

## How to Fix Locally

### Step 1: Create `.env.local` in Project Root

Create a file named `.env.local` in the same directory as `package.json`:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 2: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Restart Dev Server

**IMPORTANT**: After creating/updating `.env.local`, you MUST restart the dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

Next.js only reads `.env.local` on server start, not during runtime.

### Step 4: Verify It's Working

1. Open browser console
2. Look for: `✅ [Supabase] Client initialized successfully`
3. If you see errors, check the console for specific issues

## Verification Checklist

- [ ] `.env.local` exists in project root (same level as `package.json`)
- [ ] `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` (starts with `https://`)
- [ ] `.env.local` contains `NEXT_PUBLIC_SUPABASE_ANON_KEY` (long string starting with `eyJ...`)
- [ ] Dev server was restarted after creating/updating `.env.local`
- [ ] Browser console shows: `✅ [Supabase] Client initialized successfully`
- [ ] Login page shows no configuration error banner
- [ ] Login attempt works (or shows proper auth error, not "Failed to fetch")

## Files Changed

1. **`lib/supabaseClient.ts`**
   - Added `getSupabaseConfigError()` function
   - Enhanced development logging
   - Better runtime validation

2. **`components/LoginForm.tsx`**
   - Added configuration error check on mount
   - Added error banner UI
   - Enhanced error handling for "Failed to fetch"
   - Better error messages

## Testing

After applying fixes:

1. **Test with missing .env.local:**
   - Delete `.env.local`
   - Restart dev server
   - Go to `/login`
   - Should see red error banner at top

2. **Test with invalid URL:**
   - Set `NEXT_PUBLIC_SUPABASE_URL=invalid`
   - Restart dev server
   - Should see error in console and login form

3. **Test with valid credentials:**
   - Set correct values in `.env.local`
   - Restart dev server
   - Should see success message in console
   - Login should work

## Common Issues

### "Failed to fetch" still appears
- **Cause**: `.env.local` not in project root, or dev server not restarted
- **Fix**: Check file location, restart dev server

### Error banner shows but login works
- **Cause**: Environment variables loaded but validation is too strict
- **Fix**: Check console logs for actual status

### No error but can't login
- **Cause**: Wrong Supabase URL or key
- **Fix**: Verify credentials in Supabase dashboard

## Summary

**Root Cause**: Environment variables not being read or invalid, causing Supabase client to use placeholder URLs.

**Fix**: 
1. Enhanced validation with clear error messages
2. UI feedback on login page
3. Better error handling for network errors
4. Development debug logging

**Action Required**: Create `.env.local` in project root with your Supabase credentials and restart dev server.


















