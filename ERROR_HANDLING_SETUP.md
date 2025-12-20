# Production Error Handling Setup

## Overview

This document describes the robust error handling system implemented for the Next.js App Router application. The system ensures that fatal errors (missing env vars, Supabase init issues, i18n/localStorage issues) are caught and displayed to users instead of crashing silently.

## Error Boundary Components

### 1. `app/error.tsx` (Client Component)

**Purpose:** Catches errors within the app tree and displays a friendly error UI.

**Features:**
- Client component that catches errors in child components
- Displays user-friendly error message
- Logs full error details to console (message, stack, digest, name, cause)
- Provides "Try Again" button to reset the error boundary
- Provides "Go Home" link to navigate away
- Shows error digest/ID for support purposes

**When it triggers:**
- Errors in page components
- Errors in nested components
- Errors in client-side code execution

**Usage:**
Next.js automatically uses this component when an error occurs in a route segment. No manual setup required.

### 2. `app/global-error.tsx` (Client Component)

**Purpose:** Catches errors at the root level of the application - the last line of defense.

**Features:**
- Catches errors that escape other error boundaries
- Includes full HTML structure (since it replaces the root layout)
- Logs critical errors to console
- Provides "Reload Application" and "Hard Refresh" buttons
- More severe error messaging for critical failures

**When it triggers:**
- Errors in the root layout
- Errors in error boundaries themselves
- Unhandled errors that propagate to the root

**Usage:**
Next.js automatically uses this component for root-level errors. No manual setup required.

## Error Handling Best Practices

### 1. Window/LocalStorage Access

**Rule:** Never access `window` or `localStorage` during render. Always use `useEffect`.

**✅ Correct:**
```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('key');
    // Use saved value
  }
}, []);
```

**❌ Incorrect:**
```typescript
// During render - will cause SSR errors
const saved = localStorage.getItem('key');
```

**Current Implementation:**
- `contexts/LanguageContext.tsx` - ✅ Uses `useEffect` for localStorage
- `contexts/AuthContext.tsx` - ✅ Uses `typeof window !== 'undefined'` checks
- `lib/supabaseClient.ts` - ✅ Uses `typeof window !== 'undefined'` checks

### 2. Environment Variable Validation

**Location:** `lib/supabaseClient.ts`

**Features:**
- Validates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Provides helpful error messages in console
- Uses placeholder values during build if env vars are missing
- Runtime validation with `isSupabaseConfigured()` and `getSupabaseConfigError()`

**Error Display:**
- Login form shows configuration error if Supabase is not configured
- Console logs detailed error messages
- Errors are caught by error boundaries if they cause crashes

### 3. Context Initialization

**AuthContext:**
- Wraps all window/localStorage access in `typeof window !== 'undefined'` checks
- Handles errors in session loading gracefully
- Logs errors but doesn't crash the app

**LanguageContext:**
- Uses `mounted` state to prevent SSR hydration mismatches
- Loads from localStorage only in `useEffect`
- Provides default values during SSR

## Error Logging

### Console Logging

All error boundaries log full error details:
- Error message
- Error stack trace
- Error digest (Next.js error ID)
- Error name
- Error cause (if available)

### Production Error Tracking

**Placeholder for error tracking service:**
```typescript
// In error.tsx and global-error.tsx
// Example: Sentry.captureException(error);
```

**To integrate error tracking:**
1. Install error tracking service (e.g., Sentry, LogRocket)
2. Initialize in `app/layout.tsx` or a separate initialization file
3. Uncomment and configure the `captureException` calls in error boundaries

## Testing Error Boundaries

### Test app/error.tsx

1. Create a test page that throws an error:
```typescript
// app/test-error/page.tsx
"use client";
export default function TestError() {
  throw new Error("Test error for error boundary");
}
```

2. Navigate to `/test-error`
3. Verify error boundary displays correctly
4. Check console for error logs
5. Test "Try Again" button
6. Test "Go Home" link

### Test app/global-error.tsx

1. Create a test that throws in root layout (not recommended for production)
2. Or throw an error in an error boundary itself
3. Verify global error boundary displays
4. Test reload buttons

## Common Error Scenarios

### 1. Missing Environment Variables

**Symptom:** Supabase operations fail, login doesn't work

**Handling:**
- `getSupabaseConfigError()` detects missing vars
- Login form displays configuration error
- Console shows detailed error message
- Error boundaries catch if it causes a crash

### 2. Supabase Initialization Failure

**Symptom:** App crashes on load

**Handling:**
- Error boundaries catch the error
- User sees friendly error UI
- Console logs full error details
- User can try again or go home

### 3. localStorage Access Issues

**Symptom:** SSR hydration mismatch, localStorage errors

**Handling:**
- All localStorage access is in `useEffect`
- `typeof window !== 'undefined'` checks prevent SSR errors
- LanguageContext uses `mounted` state to prevent hydration issues

### 4. i18n/Localization Errors

**Symptom:** Translation errors, RTL issues

**Handling:**
- LanguageContext provides fallback translations
- Defaults to English if locale is invalid
- Error boundaries catch if context fails to initialize

## Files Modified

1. **app/error.tsx** (NEW)
   - Client component error boundary
   - Friendly error UI
   - Full error logging

2. **app/global-error.tsx** (NEW)
   - Root-level error boundary
   - Critical error handling
   - Reload functionality

3. **app/layout.tsx** (VERIFIED)
   - No window/localStorage access during render
   - Proper provider nesting

## Verification Checklist

- [x] `app/error.tsx` created and working
- [x] `app/global-error.tsx` created and working
- [x] No window/localStorage access during render
- [x] All localStorage access in useEffect
- [x] Environment variable validation in place
- [x] Error logging implemented
- [x] Build passes successfully
- [x] TypeScript compilation successful

## Next Steps

1. **Integrate Error Tracking Service:**
   - Choose a service (Sentry recommended)
   - Install and configure
   - Add capture calls to error boundaries

2. **Add Error Monitoring:**
   - Set up alerts for critical errors
   - Monitor error rates
   - Track error patterns

3. **User Feedback:**
   - Consider adding "Report Error" button
   - Collect user feedback on errors
   - Improve error messages based on feedback


