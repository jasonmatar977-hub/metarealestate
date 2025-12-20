# Delete Post Feature Setup

## Overview
The delete post feature allows users to delete their own posts. When a post is deleted:
1. The post row is removed from the `public.posts` table
2. If the post has an associated image, it's also deleted from Supabase Storage (`post-media` bucket)
3. The feed automatically refreshes to reflect the deletion

## Security
- Only the post owner can delete their own posts
- Row Level Security (RLS) policy enforces this at the database level
- Frontend also checks ownership before showing the delete button

## Setup Instructions

### Step 1: Run the SQL Policy
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/delete_post_policy.sql`
4. Copy and paste the entire SQL script
5. Click **Run**

This will:
- Enable RLS on the `posts` table (if not already enabled)
- Create a policy that allows authenticated users to DELETE only their own posts

### Step 2: Verify the Policy
After running the SQL, verify the policy was created:
- Go to **Authentication** → **Policies** in Supabase Dashboard
- Look for the policy: "Users can delete their own posts" on the `posts` table
- It should show: `FOR DELETE TO authenticated USING (auth.uid() = user_id)`

### Step 3: Test the Feature
1. Log in to your app
2. Create a post (with or without an image)
3. You should see a "⋯" (three dots) menu button in the top-right of your post
4. Click it and select "🗑️ Delete"
5. Confirm the deletion
6. The post should disappear from the feed immediately

## How It Works

### Frontend (PostCard Component)
- Shows a "⋯" menu button only for posts owned by the current user
- When clicked, shows a dropdown with "Delete" option
- Asks for confirmation before deleting
- Handles both database deletion and storage file deletion
- Refreshes the feed after successful deletion

### Backend (RLS Policy)
- The SQL policy ensures that only the post owner can delete their post
- Even if someone tries to bypass the frontend, the database will reject the deletion

### Storage Cleanup
- When a post with an image is deleted, the code:
  1. Extracts the file path from the image URL
  2. Deletes the file from the `post-media` bucket
  3. Then deletes the post from the database

## Troubleshooting

### Delete button not showing
- Make sure you're logged in
- Make sure you're viewing your own post (not someone else's)
- Check browser console for any errors

### "Permission denied" error
- Verify the RLS policy was created successfully
- Check that you're logged in with the correct account
- Ensure the policy allows DELETE operations

### Image not deleted from storage
- Check browser console for storage deletion errors
- Verify the `post-media` bucket exists and is accessible
- The post will still be deleted from the database even if storage deletion fails

### Post deleted but still showing
- The feed should auto-refresh, but you can manually refresh the page
- Check browser console for any errors during deletion

## Files Changed
- `components/PostCard.tsx` - Added delete button and handler
- `app/feed/page.tsx` - Pass userId and onPostDeleted callback
- `app/profile/page.tsx` - Updated to support delete in profile view
- `supabase/delete_post_policy.sql` - RLS policy for DELETE operations












