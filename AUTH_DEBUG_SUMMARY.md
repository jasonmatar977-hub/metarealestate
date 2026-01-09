# Auth Debugging Summary - Quick Reference

## ✅ Changes Applied

All debug logs and fixes have been applied to the codebase. The following files were modified:

1. ✅ `contexts/AuthContext.tsx` - Added `emailRedirectTo` to signup, added comprehensive logging
2. ✅ `app/reset-password/page.tsx` - Added logging and email normalization
3. ✅ `app/update-password/page.tsx` - Added comprehensive logging for token handling
4. ✅ `lib/supabaseClient.ts` - Added initialization logging

## 🔍 How to Debug

### Step 1: Open Browser Console
- Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Go to **Console** tab

### Step 2: Reproduce the Issue

#### For Signup:
1. Go to `/register`
2. Fill form and submit
3. **Look for logs starting with**: `[AuthContext] signUp result:`

#### For Login:
1. Go to `/login`
2. Enter credentials and submit
3. **Look for logs starting with**: 
   - `[AuthContext] signInWithPassword - Before call:`
   - `[AuthContext] signInWithPassword - ERROR:` (if error)
   - `[AuthContext] signInWithPassword - After getSession:`

#### For Forgot Password:
1. Go to `/reset-password`
2. Enter email and submit
3. **Look for logs starting with**: `[ResetPassword] resetPasswordForEmail`

#### For Reset Password:
1. Click reset link from email
2. **Look for logs starting with**: `[UpdatePassword]`

### Step 3: Check Network Tab
- Go to **Network** tab in DevTools
- Filter by "supabase"
- Look for failed requests (red status codes)
- Click on failed requests to see error details

### Step 4: Check Supabase Dashboard
- Go to your Supabase project dashboard
- Check **Authentication → Logs** for auth events
- Check **Authentication → URL Configuration** for redirect URLs

## 📋 Supabase Configuration Checklist

**CRITICAL**: These must be configured correctly:

### 1. Redirect URLs
**Location**: Authentication → URL Configuration → Redirect URLs

**Add these URLs** (one per line):
```
http://localhost:3001/update-password
http://localhost:3001/**
https://metarealestate-jzym.vercel.app/update-password
https://metarealestate-jzym.vercel.app/**
```

### 2. Site URL
**Location**: Authentication → URL Configuration → Site URL

**Set to**:
- Local: `http://localhost:3001`
- Production: `https://metarealestate-jzym.vercel.app`

### 3. Email Confirmation
**Location**: Authentication → Settings → Email Auth

**Check**: Is "Confirm email" enabled?
- **If YES**: Users must confirm email before login
- **If NO**: Users can login immediately after signup

### 4. Email Provider
**Location**: Authentication → Providers → Email

**Check**: Email provider is enabled

## 🐛 Common Error Messages & Fixes

| Error Message | Likely Cause | Fix |
|--------------|--------------|-----|
| "Redirect URL not allowed" | Redirect URL not in Supabase config | Add exact URL to Redirect URLs list |
| "Invalid email or password" | Wrong credentials OR email not confirmed | Check email confirmation setting |
| "Email not confirmed" | User needs to click confirmation link | Check email inbox, resend if needed |
| "Network error" | Supabase URL/key wrong OR no internet | Check `.env.local` file, restart dev server |
| "Invalid or expired reset link" | Token expired OR wrong redirect URL | Request new reset link, check redirect URL config |

## 📊 What to Report

When reporting issues, include:

1. **Console logs**: Copy all logs starting with `[AuthContext]`, `[ResetPassword]`, `[UpdatePassword]`, `[Supabase Client]`
2. **Network errors**: Screenshot of failed requests in Network tab
3. **Supabase config**: Screenshot of Redirect URLs and Site URL settings
4. **Steps to reproduce**: Exact steps you took
5. **Expected vs Actual**: What you expected vs what happened

## 🔧 Quick Fixes

### Fix 1: Clear Browser Storage
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Fix 2: Check Environment Variables
```bash
# In project root, check .env.local exists and has:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Fix 3: Restart Dev Server
```bash
# Stop server (Ctrl+C)
# Then restart
npm run dev
```

---

**Next**: Test each flow and share the console logs for further debugging.
