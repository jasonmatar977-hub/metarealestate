-- Admin Update User RPC Function
-- Run this SQL in your Supabase SQL Editor
-- Creates RPC function for admins to update user role and verification status
-- 
-- SECURITY: Uses SECURITY DEFINER to allow admin access
-- Requires: Current user must be admin (checked in function)
-- RLS: Function checks admin role before allowing updates

-- Create function to update user role and verification status (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id uuid,
  new_role text,
  new_is_verified boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get current user's role from profiles
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Check if current user is admin
  IF current_user_role IS NULL OR current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Permission denied. Only admins can update users.';
  END IF;

  -- Update target user's role and is_verified
  UPDATE profiles
  SET 
    role = new_role,
    is_verified = new_is_verified,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User updated successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating user: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users (RLS in function enforces admin check)
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, boolean) TO authenticated;
