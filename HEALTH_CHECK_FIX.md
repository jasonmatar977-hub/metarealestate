# Health Check Fix - Using Public REST Endpoint

## ✅ Fix Applied

The health check now uses a **public REST endpoint** instead of `/auth/v1/health` which requires authentication and returns 401.

## Changes Made

### File: `lib/supabaseHealth.ts`

**Before**: Used `/auth/v1/health` (requires auth, returns 401)

**After**: Uses `/rest/v1/profiles?select=id&limit=1` (public endpoint with anon key)

**Key Changes**:
1. ✅ Uses public REST endpoint: `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`
2. ✅ Includes `apikey` header with `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ✅ Checks for missing env vars and shows "Supabase config missing"
4. ✅ Accepts 200, 406, 401, 403 as "online" (any response means service is reachable)
5. ✅ Only treats 500+ as offline
6. ✅ 5-second timeout with AbortController

### File: `lib/supabaseClient.ts`

**Change**: Updated global 401 handler to **skip health check requests**

- Health check requests to `/rest/v1/` are excluded from 401 handling
- Prevents health check 401s from clearing auth storage
- Only real auth 401s trigger sign-out

## How It Works

### Health Check Flow
```
1. Check env vars (URL + anon key)
   → If missing: return "Supabase config missing"
   
2. Ping: GET /rest/v1/profiles?select=id&limit=1
   Headers: { apikey: anon_key }
   Timeout: 5 seconds
   
3. Response handling:
   - 200/406/401/403 → Service is online ✅
   - 500+ → Service error (offline)
   - Network error → Offline
   - Timeout → Offline
```

### Why This Works

- `/rest/v1/profiles` is a **public endpoint** accessible with just the anon key
- Doesn't require user authentication
- Returns 200 if accessible (even if RLS blocks, we get 401/403 which still means service is online)
- Only network errors or 500+ indicate Supabase is actually offline

## Testing

### Test 1: Health Check Passes (Normal)
1. Go to `/login`
2. **Expected**: Health check succeeds (200 or 401/403), login form appears
3. Enter credentials and login
4. **Expected**: Login works normally

### Test 2: Missing Env Vars
1. Temporarily remove env vars (or use invalid ones)
2. Go to `/login`
3. **Expected**: Error shows "Supabase config missing: NEXT_PUBLIC_SUPABASE_URL is not set"

### Test 3: Supabase Offline
1. Pause Supabase project
2. Go to `/login`
3. **Expected**: Health check fails with network error, shows "Cannot connect to Supabase"

### Test 4: Health Check Doesn't Clear Auth
1. Be logged in
2. Health check runs (may get 401/403)
3. **Expected**: Auth storage NOT cleared, user remains logged in

## Status Codes Handled

| Status | Meaning | Health Check Result |
|--------|---------|-------------------|
| 200 | Success | ✅ Online |
| 406 | Not Acceptable (but service is up) | ✅ Online |
| 401 | Unauthorized (RLS blocks, but service is up) | ✅ Online |
| 403 | Forbidden (RLS blocks, but service is up) | ✅ Online |
| 500+ | Server Error | ❌ Offline |
| Network Error | Cannot connect | ❌ Offline |
| Timeout | No response in 5s | ❌ Offline |

---

**Fix Date**: 2025-01-XX
**Status**: ✅ Complete
