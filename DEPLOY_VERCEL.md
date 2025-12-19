# Vercel Deployment Checklist 🚀

Follow these simple steps to deploy your Meta Real Estate app to Vercel.

## Step 1: Import Project to Vercel from GitHub

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"Add New Project"** or **"Import Project"**
3. Select your GitHub repository (`meta-real-estate` or your repo name)
4. Vercel will auto-detect Next.js settings
5. **DO NOT** click "Deploy" yet - we need to add environment variables first!

---

## Step 2: Add Environment Variables in Vercel

**Before deploying**, add these environment variables in Vercel:

1. In the Vercel project import screen, find the **"Environment Variables"** section
2. Click **"Add"** and add these two variables:

   **Variable 1:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Your Supabase project URL (e.g., `https://llruzklmfmlfkwknpmvd.supabase.co`)
   - **Environment:** Select all (Production, Preview, Development)

   **Variable 2:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anon key (starts with `eyJhbGci...`)
   - **Environment:** Select all (Production, Preview, Development)

3. Click **"Deploy"** button

---

## Step 3: Configure Supabase Auth URLs

After Vercel deploys, you'll get a domain like `your-app.vercel.app`. You need to update Supabase:

### 3.1: Set Site URL

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL** to: `https://YOUR_DOMAIN.vercel.app`
   - Replace `YOUR_DOMAIN` with your actual Vercel domain

### 3.2: Add Redirect URLs

In the same **URL Configuration** section:

1. Find **"Redirect URLs"** list
2. Add these URLs (one per line):
   ```
   http://localhost:3000/update-password
   https://YOUR_DOMAIN.vercel.app/update-password
   ```
   - Replace `YOUR_DOMAIN` with your actual Vercel domain
   - Keep `localhost` for local development

3. Click **"Save"**

---

## Step 4: Verify Supabase Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Check if bucket `post-media` exists:
   - If it exists: Make sure it's set to **Public**
   - If it doesn't exist: Create it:
     - Click **"New bucket"**
     - Name: `post-media`
     - Set to **Public** (toggle ON)
     - Click **"Create bucket"**

---

## Step 5: Run Required SQL Scripts (if not already done)

If you haven't run these SQL scripts yet, do it now:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run each script in this order:

   **a) `supabase/schema.sql`**
   - Creates base tables (profiles, posts, likes, follows)

   **b) `supabase/rls_policies.sql`**
   - Sets up Row Level Security policies

   **c) `supabase/profile_upgrade.sql`**
   - Adds profile columns (bio, avatar_url, location, etc.)

   **d) `supabase/comments.sql`**
   - Creates comments and comment_likes tables

   **e) `supabase/post_media.sql`**
   - Adds image_url column to posts table

3. Copy and paste each file's contents into the SQL Editor
4. Click **"Run"** for each script

---

## Step 6: Test Your Deployment

After deployment completes:

1. Visit your Vercel domain: `https://YOUR_DOMAIN.vercel.app`
2. Test these features:
   - ✅ Homepage loads
   - ✅ Login/Register works
   - ✅ Password reset works (check email)
   - ✅ Feed loads posts
   - ✅ Create post works
   - ✅ Image upload works
   - ✅ Profile page works

---

## Troubleshooting

### Build Fails
- Check that environment variables are set correctly
- Check Vercel build logs for errors
- Run `npm run build` locally to test

### Auth Not Working
- Verify Supabase Site URL matches your Vercel domain
- Verify Redirect URLs include your Vercel domain
- Check that environment variables are set in Vercel

### Images Not Uploading
- Verify `post-media` bucket exists and is Public
- Check Supabase Storage policies

### Database Errors
- Verify all SQL scripts have been run
- Check RLS policies are enabled

---

## Quick Reference

**Vercel Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Supabase Settings:**
- Site URL: `https://YOUR_DOMAIN.vercel.app`
- Redirect URLs: 
  - `http://localhost:3000/update-password`
  - `https://YOUR_DOMAIN.vercel.app/update-password`

**Storage:**
- Bucket: `post-media` (Public)

**SQL Scripts (in order):**
1. `schema.sql`
2. `rls_policies.sql`
3. `profile_upgrade.sql`
4. `comments.sql`
5. `post_media.sql`

---

**That's it! Your app should now be live on Vercel! 🎉**











