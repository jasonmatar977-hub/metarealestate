# Auth Debugging & Fixes - Meta Real Estate

## 0) Reproduction Steps & Logging

### Where to Click to Reproduce Issues

#### Register Flow
1. Navigate to: `http://localhost:3001/register` (or production URL)
2. Fill in all fields (Full Name, Username, Email, Address, Country, Birthday, Password, Confirm Password)
3. Check "I agree to terms"
4. Click "Create Account"
5. **Watch**: Browser console, Network tab, Supabase Auth logs

#### Login Flow
1. Navigate to: `http://localhost:3001/login`
2. Enter email and password
3. Click "Sign In"
4. **Watch**: Browser console, Network tab, Supabase Auth logs

#### Forgot Password Flow
1. Navigate to: `http://localhost:3001/reset-password`
2. Enter email address
3. Click "Send Reset Link"
4. **Watch**: Browser console, Network tab, check email inbox
5. Click reset link in email
6. **Watch**: Browser console, Network tab when redirected to `/update-password`

### Temporary Debug Logs Added

All logs are **safe** - no secrets exposed. Logs show:
- Supabase client initialization status
- Session check results
- Auth operation results/errors
- Network request status

---

## 1) Supabase Configuration Checklist

### ✅/❌ Checklist

#### Project URL & Anon Key
- [ ] **Dashboard Location**: Settings → API → Project URL
- [ ] **Code Location**: `.env.local` → `NEXT_PUBLIC_SUPABASE_URL`
- [ ] **Match**: Dashboard URL === `.env.local` URL
- [ ] **Dashboard Location**: Settings → API → Project API keys → `anon` `public`
- [ ] **Code Location**: `.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **Match**: Dashboard key === `.env.local` key

#### Site URL Configuration
- [ ] **Dashboard Location**: Authentication → URL Configuration → Site URL
- [ ] **Local Dev**: Should be `http://localhost:3001` (or `3000` if using default port)
- [ ] **Production**: Should be `https://metarealestate-jzym.vercel.app` (or your Vercel domain)
- [ ] **Match**: Site URL matches your app's base URL

#### Redirect URLs Configuration
- [ ] **Dashboard Location**: Authentication → URL Configuration → Redirect URLs
- [ ] **Local Dev**: Must include:
  ```
  http://localhost:3001/update-password
  http://localhost:3001/**
  ```
- [ ] **Production**: Must include:
  ```
  https://metarealestate-jzym.vercel.app/update-password
  https://metarealestate-jzym.vercel.app/**
  ```
- [ ] **Note**: The `/**` wildcard allows all sub-paths

#### Email Provider Settings
- [ ] **Dashboard Location**: Authentication → Providers → Email
- [ ] **Enabled**: Email provider is enabled
- [ ] **SMTP Settings** (if using custom SMTP): Configured correctly
- [ ] **Email Templates**: 
  - [ ] "Confirm signup" template exists
  - [ ] "Reset password" template exists
  - [ ] Templates include correct redirect URLs

#### Email Confirmation Settings
- [ ] **Dashboard Location**: Authentication → Settings → Email Auth
- [ ] **Confirm email**: Check if enabled/disabled
  - **If ENABLED**: Users must confirm email before login
  - **If DISABLED**: Users can login immediately after signup
- [ ] **Redirect URL in template**: Matches your app's `/update-password` route

#### Password Reset Settings
- [ ] **Dashboard Location**: Authentication → Settings → Password Reset
- [ ] **Enabled**: Password reset is enabled
- [ ] **Redirect URL**: Matches `/update-password` route

---

## 2) Frontend Auth Code Audit

### Signup Flow

**File**: `contexts/AuthContext.tsx` (lines 457-534)

**Current Code**:
```typescript
const { data, error } = await supabase.auth.signUp({
  email: normalizedEmail,
  password: userData.password,
  options: {
    data: {
      full_name: userData.fullName,
      username: userData.username,
    },
  },
});
```

**Issues Found**:
1. ❌ **Missing `emailRedirectTo`**: No redirect URL specified for email confirmation
2. ❌ **No logging**: No debug logs to track signup process
3. ⚠️ **Error handling**: Generic error messages don't show specific Supabase errors

**Fix**:
```typescript
const { data, error } = await supabase.auth.signUp({
  email: normalizedEmail,
  password: userData.password,
  options: {
    emailRedirectTo: typeof window !== 'undefined' 
      ? `${window.location.origin}/login?confirmed=true`
      : undefined,
    data: {
      full_name: userData.fullName,
      username: userData.username,
    },
  },
});
```

### Login Flow

**File**: `contexts/AuthContext.tsx` (lines 352-450)

**Current Code**: ✅ Mostly correct, but needs better logging

**Issues Found**:
1. ⚠️ **Error messages**: Generic "Invalid email or password" doesn't help debug
2. ⚠️ **No network error detection**: Doesn't distinguish network errors from auth errors

**Fix**: Already has good error handling, but we'll add more detailed logging.

### Forgot Password Flow

**File**: `app/reset-password/page.tsx` (lines 24-52)

**Current Code**:
```typescript
const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/update-password`,
});
```

**Issues Found**:
1. ⚠️ **Dynamic origin**: Uses `window.location.origin` which might not match Supabase config
2. ❌ **No logging**: No debug logs
3. ⚠️ **Error handling**: Generic error message

**Fix**: Add logging and better error handling.

### Reset Password Flow

**File**: `app/update-password/page.tsx` (lines 28-119, 121-170)

**Current Code**: ✅ Handles recovery token correctly

**Issues Found**:
1. ⚠️ **Complex token handling**: Multiple checks might miss edge cases
2. ⚠️ **No logging**: Limited debug output

**Fix**: Add comprehensive logging.

---

## 3) Route Protection / Session Storage

### Current Implementation

**Pattern Used**: Client-side route protection in each page component

**Files**:
- `app/feed/page.tsx` (lines 262-270)
- `app/messages/page.tsx` (lines 45-50)
- `app/profile/page.tsx` (similar pattern)
- All protected routes

**Issues Found**:
1. ✅ **No early redirects**: Code waits for `loadingSession` to complete
2. ✅ **No accidental signOut**: No code clears localStorage accidentally
3. ⚠️ **SSR/CSR mismatch**: All pages are client-side (`"use client"`), so no SSR issues

**Verdict**: Route protection is correct, not causing auth failures.

---

## 4) RLS & DB Side-Effects

### Profile Creation Trigger

**File**: `supabase/schema.sql` (lines 120-134)

**Current Code**:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Issues Found**:
1. ✅ **Trigger exists**: Profile creation is automatic
2. ✅ **RLS policies**: Profiles table has correct INSERT policy
3. ⚠️ **Error handling**: If trigger fails, signup might succeed but profile creation fails silently

**Fix**: Add error logging in trigger (optional, for debugging).

---

## 5) Deliverables - Issues & Fixes Table

| Flow | Current Behavior | Root Cause | Evidence | Fix Summary | Files to Change |
|------|-----------------|------------|----------|------------|-----------------|
| **Signup** | May fail silently or show generic error | Missing `emailRedirectTo`, no debug logs | Console shows generic error, no network details | Add `emailRedirectTo`, add comprehensive logging | `contexts/AuthContext.tsx` |
| **Login** | Shows "Invalid email or password" | Generic error message, no detailed logging | Console shows error but no details | Add detailed error logging, distinguish network vs auth errors | `contexts/AuthContext.tsx`, `components/LoginForm.tsx` |
| **Forgot Password** | May fail if redirect URL doesn't match | `window.location.origin` might not match Supabase config | Network error or "redirect URL not allowed" | Add logging, validate redirect URL matches config | `app/reset-password/page.tsx` |
| **Reset Password** | Token handling might fail | Complex token parsing, limited error messages | "Invalid or expired reset link" | Add comprehensive logging for token parsing | `app/update-password/page.tsx` |

---

## 6) Patch-Style Code Changes

### File 1: `contexts/AuthContext.tsx`

**Change 1: Add emailRedirectTo to signUp**

```diff
--- a/contexts/AuthContext.tsx
+++ b/contexts/AuthContext.tsx
@@ -464,6 +464,12 @@ export function AuthProvider({ children }: { children: ReactNode }) {
       const { data, error } = await supabase.auth.signUp({
         email: normalizedEmail,
         password: userData.password,
         options: {
+          emailRedirectTo: typeof window !== 'undefined'
+            ? `${window.location.origin}/login?confirmed=true`
+            : undefined,
           data: {
             full_name: userData.fullName,
             username: userData.username,
           },
         },
       });
+
+      // DEBUG: Log signup result
+      console.log('[AuthContext] signUp result:', {
+        hasUser: !!data.user,
+        userEmail: data.user?.email,
+        emailConfirmed: !!data.user?.email_confirmed_at,
+        hasError: !!error,
+        errorMessage: error?.message,
+        errorCode: (error as any)?.code,
+        errorStatus: (error as any)?.status,
+      });
```

**Change 2: Add detailed login logging**

```diff
--- a/contexts/AuthContext.tsx
+++ b/contexts/AuthContext.tsx
@@ -375,6 +375,15 @@ export function AuthProvider({ children }: { children: ReactNode }) {
       // Now attempt login with fresh state
       debugLog('[AuthContext] Attempting signInWithPassword...');
+      
+      // DEBUG: Log before signIn
+      console.log('[AuthContext] signInWithPassword - Before call:', {
+        email: normalizedEmail,
+        hasPassword: !!password,
+        supabaseUrl: typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...') : 'SSR',
+        supabaseKeySet: typeof window !== 'undefined' ? !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : false,
+      });
+      
       const { data, error } = await supabase.auth.signInWithPassword({
         email: normalizedEmail,
         password,
@@ -382,6 +391,16 @@ export function AuthContext.tsx {
       });
 
       if (error) {
+        // DEBUG: Log full error details
+        console.error('[AuthContext] signInWithPassword - ERROR:', {
+          message: error.message,
+          status: error.status,
+          name: error.name,
+          code: (error as any).code,
+          details: (error as any).details,
+          hint: (error as any).hint,
+          isNetworkError: error.message?.includes('fetch') || error.message?.includes('network'),
+        });
+        
         const normalized = normalizeSupabaseError(error);
         debugLog('[AuthContext] signIn error:', normalized);
         
@@ -407,6 +426,13 @@ export function AuthContext.tsx {
       // After successful signIn, always get the current session
       // This ensures we have the latest session data
       const { data: { session }, error: sessionError } = await supabase.auth.getSession();
+      
+      // DEBUG: Log session result
+      console.log('[AuthContext] signInWithPassword - After getSession:', {
+        hasSession: !!session,
+        hasUser: !!session?.user,
+        userId: session?.user?.id,
+        sessionError: sessionError?.message,
+      });
       
       if (sessionError || !session?.user) {
```

### File 2: `app/reset-password/page.tsx`

**Change: Add logging and better error handling**

```diff
--- a/app/reset-password/page.tsx
+++ b/app/reset-password/page.tsx
@@ -34,11 +34,25 @@ export default function ResetPasswordPage() {
 
     setIsLoading(true);
     try {
+      const normalizedEmail = email.trim().toLowerCase();
+      const redirectTo = typeof window !== 'undefined' 
+        ? `${window.location.origin}/update-password`
+        : '/update-password';
+      
+      // DEBUG: Log before reset
+      console.log('[ResetPassword] resetPasswordForEmail - Before call:', {
+        email: normalizedEmail,
+        redirectTo,
+        origin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
+        supabaseUrl: typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...') : 'SSR',
+      });
+      
       // Use Supabase password reset
       // IMPORTANT: redirectTo must match Supabase dashboard redirect URLs
-      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
-        redirectTo: `${window.location.origin}/update-password`,
+      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
+        redirectTo,
       });
+      
+      // DEBUG: Log result
+      console.log('[ResetPassword] resetPasswordForEmail - Result:', {
+        hasError: !!resetError,
+        errorMessage: resetError?.message,
+        errorCode: (resetError as any)?.code,
+        errorStatus: (resetError as any)?.status,
+      });
 
       if (resetError) {
+        console.error('[ResetPassword] resetPasswordForEmail - ERROR:', {
+          message: resetError.message,
+          code: (resetError as any).code,
+          status: (resetError as any).status,
+          details: (resetError as any).details,
+          hint: (resetError as any).hint,
+        });
         setError(resetError.message || "Failed to send reset email. Please try again.");
       } else {
+        console.log('[ResetPassword] resetPasswordForEmail - SUCCESS');
         setSuccess(true);
       }
     } catch (err: any) {
+      console.error('[ResetPassword] resetPasswordForEmail - EXCEPTION:', err);
       setError(err.message || "An error occurred. Please try again.");
     } finally {
```

### File 3: `app/update-password/page.tsx`

**Change: Add comprehensive logging**

```diff
--- a/app/update-password/page.tsx
+++ b/app/update-password/page.tsx
@@ -28,6 +28,10 @@ function UpdatePasswordForm() {
   useEffect(() => {
     // Handle password reset recovery token from URL
     const handleRecovery = async () => {
+      // DEBUG: Log initial state
+      console.log('[UpdatePassword] handleRecovery - Starting:', {
+        hash: window.location.hash?.substring(0, 50) + '...',
+        search: window.location.search,
+      });
+      
       try {
         setIsCheckingSession(true);
         
@@ -56,6 +60,13 @@ function UpdatePasswordForm() {
         // Check if this is a recovery flow
         if ((hashType === 'recovery' || queryType === 'recovery') && accessToken) {
           console.log('[UpdatePassword] Recovery token detected, establishing session...');
+          
+          // DEBUG: Log token details (safe - no secrets)
+          console.log('[UpdatePassword] Recovery token details:', {
+            hashType,
+            queryType,
+            hasAccessToken: !!accessToken,
+            hasRefreshToken: !!refreshToken,
+            accessTokenLength: accessToken?.length,
+          });
           
           // Supabase should automatically handle the hash, but we can also manually set the session
           // First, try to get the current session (Supabase may have already processed the hash)
@@ -149,6 +160,12 @@ function UpdatePasswordForm() {
       // Update password using Supabase
       const { error: updateError } = await supabase.auth.updateUser({
         password: password,
+      });
+      
+      // DEBUG: Log update result
+      console.log('[UpdatePassword] updateUser - Result:', {
+        hasError: !!updateError,
+        errorMessage: updateError?.message,
+        errorCode: (updateError as any)?.code,
       });
 
       if (updateError) {
```

### File 4: `lib/supabaseClient.ts`

**Change: Add initialization logging**

```diff
--- a/lib/supabaseClient.ts
+++ b/lib/supabaseClient.ts
@@ -85,6 +85,10 @@ const isValidKey = supabaseAnonKey && supabaseAnonKey.length > 20 && !supabaseA
 // Debug log in development (don't print full key)
 if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
   console.log('[Supabase Client] Environment check:', {
+    timestamp: new Date().toISOString(),
     urlSet: !!supabaseUrl,
     urlLength: supabaseUrl?.length || 0,
     urlValid: isValidUrl,
@@ -102,6 +106,11 @@ const safeStorage = createSafeStorageAdapter();
 // Create client - use actual values if valid, otherwise use placeholders for build
 // Pass custom storage adapter that falls back to memory when localStorage is blocked
 export const supabase = createClient(
   isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co',
   isValidKey ? supabaseAnonKey : 'placeholder-key',
   {
     auth: {
       persistSession: true,
       storage: safeStorage,
       autoRefreshToken: true,
       detectSessionInUrl: true,
     },
     global: {
       headers: {
         'x-client-info': 'meta-real-estate@1.0.0',
       },
     },
   }
 );
+
+// DEBUG: Log client initialization
+if (typeof window !== 'undefined') {
+  console.log('[Supabase Client] Initialized:', {
+    timestamp: new Date().toISOString(),
+    urlValid: isValidUrl,
+    keyValid: isValidKey,
+    urlPreview: isValidUrl ? supabaseUrl.substring(0, 30) + '...' : 'INVALID',
+  });
+}
```

---

## 7) How to Use This Document

1. **Add the logs**: Apply all patch changes above
2. **Check Supabase config**: Go through checklist in section 1
3. **Reproduce issues**: Follow steps in section 0
4. **Check console**: Look for `[AuthContext]`, `[ResetPassword]`, `[UpdatePassword]`, `[Supabase Client]` logs
5. **Check Network tab**: Look for failed requests to Supabase
6. **Report findings**: Share console logs and network errors

---

## 8) Common Issues & Quick Fixes

### Issue: "Redirect URL not allowed"
**Fix**: Add the exact URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

### Issue: "Email not confirmed"
**Fix**: Check Supabase Dashboard → Authentication → Settings → Email Auth → "Confirm email" setting

### Issue: "Invalid email or password" (but credentials are correct)
**Fix**: Check if email is normalized (trimmed + lowercase) in code

### Issue: "Network error"
**Fix**: Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and restart dev server

---

**Next Steps**: Apply patches, test, and share console logs for further debugging.
