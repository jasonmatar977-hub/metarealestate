# Supabase Storage Setup for Post Media

## Step 1: Create Storage Bucket

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard
   - Select your project

2. **Open Storage**
   - Click on **Storage** in the left sidebar

3. **Create New Bucket**
   - Click **"New bucket"** button
   - **Bucket name:** `post-media`
   - **Public bucket:** ✅ Check this (or configure RLS if you prefer private)
   - Click **"Create bucket"**

## Step 2: Set Up RLS Policies (if bucket is private)

If you made the bucket private, you need to add RLS policies:

1. **Go to Storage Policies**
   - Click on the `post-media` bucket
   - Go to **"Policies"** tab

2. **Add Policy for Uploads**
   - Click **"New Policy"**
   - **Policy name:** "Authenticated users can upload"
   - **Allowed operation:** INSERT
   - **Policy definition:**
     ```sql
     (bucket_id = 'post-media'::text) AND (auth.role() = 'authenticated'::text)
     ```
   - Click **"Review"** then **"Save policy"**

3. **Add Policy for Viewing**
   - Click **"New Policy"**
   - **Policy name:** "Anyone can view post media"
   - **Allowed operation:** SELECT
   - **Policy definition:**
     ```sql
     bucket_id = 'post-media'::text
     ```
   - Click **"Review"** then **"Save policy"**

## Step 3: Run SQL Migration

Run the SQL file `supabase/post_media.sql` in Supabase SQL Editor to add the `image_url` column to the `posts` table.

## Step 4: Test

1. Create a post with an image
2. Verify the image uploads to Storage
3. Verify the image displays in the feed

## Troubleshooting

**Upload fails:**
- Check that bucket exists and is named `post-media`
- Verify RLS policies are set correctly
- Check browser console for errors

**Image doesn't display:**
- Verify `image_url` is saved in posts table
- Check that the URL is accessible (public bucket or signed URL)
- Verify image URL format is correct













