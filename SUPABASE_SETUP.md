# Supabase Setup Guide

## Environment Variables

### Local Development

Create a `.env.local` file in the project root (same level as `package.json`) with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://llruzklmfmlfkwknpmvd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscnV6a2xtZm1sZmt3a25wbXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjM2ODEsImV4cCI6MjA4MTYzOTY4MX0._OmnYFFDjet10oS1gf0UJhmvt8z7mtjV3ZfuVDymsNo
```

### Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://llruzklmfmlfkwknpmvd.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscnV6a2xtZm1sZmt3a25wbXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjM2ODEsImV4cCI6MjA4MTYzOTY4MX0._OmnYFFDjet10oS1gf0UJhmvt8z7mtjV3ZfuVDymsNo`
4. Select **Production**, **Preview**, and **Development** environments
5. Redeploy your application

## Database Setup

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Schema SQL

Copy and paste the entire contents of `supabase/schema.sql` into the SQL editor and click **Run**.

This will create:
- `profiles` table (extends auth.users)
- `posts` table (user posts)
- `likes` table (post likes)
- `follows` table (user follows)
- Row Level Security (RLS) policies
- Indexes for performance
- Trigger to auto-create profiles on signup

### Step 3: Verify Tables

1. Go to **Table Editor** in Supabase dashboard
2. You should see: `profiles`, `posts`, `likes`, `follows`
3. Verify RLS is enabled (should show a lock icon)

## Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local` file** (see above)

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:3000`

## Build and Deploy

1. **Test build locally:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   - Push to GitHub
   - Vercel will auto-deploy
   - Make sure environment variables are set in Vercel

## Features Enabled

✅ **Authentication:**
- User registration with email/password
- User login
- Session management
- Auto profile creation

✅ **Feed:**
- Create posts
- View all posts (latest first)
- Like/unlike posts
- Like counts

✅ **Database:**
- Profiles table (user info)
- Posts table (feed content)
- Likes table (post likes)
- Follows table (user follows - ready for future use)

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Only authenticated users can read/write data
- Users can only modify their own posts/likes
- API keys are public (anon key) but protected by RLS policies

## Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env.local` exists and has both variables
- Restart dev server after adding env vars
- In Vercel, verify env vars are set for all environments

### "Error loading posts"
- Verify database schema is created (run `supabase/schema.sql`)
- Check RLS policies are enabled
- Verify user is authenticated

### "Profile not found"
- Profile is auto-created on signup via trigger
- If missing, check trigger exists in database
- Manually create profile if needed: `INSERT INTO profiles (id, display_name) VALUES (user_id, 'Name');`








