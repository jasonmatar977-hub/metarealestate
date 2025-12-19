# Vercel Deployment Guide

## Prerequisites

1. **GitHub Repository**: Your code is already pushed to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free tier available)
3. **OpenAI API Key**: For the chatbot functionality

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository: `jasonmatar977-hub/metarealestate`
4. Vercel will auto-detect Next.js 15

### 2. Configure Environment Variables

In Vercel project settings, add:

```
OPENAI_API_KEY=your_openai_api_key_here
```

**How to add:**
- Go to Project Settings → Environment Variables
- Add `OPENAI_API_KEY` with your OpenAI API key
- Select all environments (Production, Preview, Development)
- Redeploy after adding

### 3. Build Settings (Auto-detected)

Vercel will automatically detect:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4. Deploy

1. Click "Deploy"
2. Vercel will:
   - Install dependencies
   - Run `npm run build`
   - Deploy to production
3. Your site will be live at: `https://your-project.vercel.app`

## Post-Deployment Checklist

- [ ] Verify landing page loads correctly
- [ ] Test login flow
- [ ] Test registration flow
- [ ] Verify property listings page (requires login)
- [ ] Verify news feed page (requires login)
- [ ] Test AI chatbot (requires login + OPENAI_API_KEY)
- [ ] Check mobile responsiveness
- [ ] Verify all routes work

## Environment Variables

### Required for Chatbot:
- `OPENAI_API_KEY` - Your OpenAI API key

### Optional (Future):
- `DATABASE_URL` - If you add a database
- `NEXTAUTH_SECRET` - If you add NextAuth
- `NEXTAUTH_URL` - Your production URL

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)
- Check build logs in Vercel dashboard

### API Route Not Working
- Verify `OPENAI_API_KEY` is set in environment variables
- Check API route logs in Vercel dashboard
- Ensure API route is in `app/api/` directory

### Pages Not Loading
- Check that all components are properly exported
- Verify "use client" directives are correct
- Check browser console for errors

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel will handle SSL automatically

## Monitoring

- **Analytics**: Available in Vercel dashboard
- **Logs**: View function logs in Vercel dashboard
- **Performance**: Check Web Vitals in dashboard

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Vercel Support: Available in dashboard


















