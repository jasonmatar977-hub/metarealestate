-- Delete Post RLS Policy
-- Safe to re-run: drops existing policy before creating new one
-- Allows authenticated users to DELETE only their own posts

-- Ensure RLS is enabled
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Create policy: Users can only delete posts they created
CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'posts' AND policyname = 'Users can delete their own posts';














