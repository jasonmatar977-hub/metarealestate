# Password Reset Configuration

## Supabase Dashboard Setup

To enable password reset functionality, you need to configure the redirect URL in your Supabase project:

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard
   - Select your project

2. **Authentication Settings**
   - Go to **Authentication** → **URL Configuration**
   - Or go to **Settings** → **Auth** → **URL Configuration**

3. **Add Redirect URLs**
   Add these URLs to the "Redirect URLs" list:

   **For Local Development:**
   ```
   http://localhost:3000/update-password
   ```

   **For Production (Vercel):**
   ```
   https://your-domain.vercel.app/update-password
   ```

4. **Site URL**
   Make sure your Site URL is set correctly:
   - **Local:** `http://localhost:3000`
   - **Production:** `https://your-domain.vercel.app`

5. **Email Templates (Optional)**
   - Go to **Authentication** → **Email Templates**
   - Customize the "Reset Password" email template if desired
   - The default template includes the reset link

### Environment Variables

No additional environment variables needed. The existing Supabase variables are sufficient:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Testing

1. Go to `/reset-password`
2. Enter your email
3. Check your email for the reset link
4. Click the link (should redirect to `/update-password`)
5. Set your new password

### Troubleshooting

**Reset link doesn't work:**
- Check that the redirect URL is added in Supabase dashboard
- Verify the Site URL matches your domain
- Check browser console for errors

**Email not received:**
- Check spam folder
- Verify email address is correct
- Check Supabase logs for email sending errors
- Ensure email service is configured in Supabase

**Session expired:**
- Reset links expire after a certain time (default: 1 hour)
- Request a new reset link if expired













