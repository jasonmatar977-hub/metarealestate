# GitHub Setup Guide

## Step 1: Create a GitHub Account (if you don't have one)
1. Go to https://github.com
2. Sign up for a free account

## Step 2: Create a New Repository on GitHub
1. Log in to GitHub
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Repository name: `meta-real-estate` (or any name you prefer)
5. Description: "Futuristic AI-powered real estate platform"
6. Choose **Public** (so GitHub Pages works for free)
7. **DO NOT** check "Initialize with README" (we already have files)
8. Click "Create repository"

## Step 3: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

### Option A: If you haven't created the repository yet
```bash
git remote add origin https://github.com/YOUR_USERNAME/meta-real-estate.git
git branch -M main
git push -u origin main
```

### Option B: If you already created the repository
GitHub will show you the exact commands. They'll look like:
```bash
git remote add origin https://github.com/YOUR_USERNAME/meta-real-estate.git
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username!**

## Step 4: Push Your Code to GitHub

Run these commands in your terminal (in the project folder):

```bash
git remote add origin https://github.com/YOUR_USERNAME/meta-real-estate.git
git branch -M main
git push -u origin main
```

You'll be asked for your GitHub username and password (or token).

## Step 5: Enable GitHub Pages (Free Hosting!)

1. Go to your repository on GitHub
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under "Source", select **main** branch
5. Select **/ (root)** folder
6. Click **Save**
7. Wait 1-2 minutes, then your site will be live at:
   `https://YOUR_USERNAME.github.io/meta-real-estate/`

## Step 6: Update Your Site

Whenever you make changes:

```bash
git add .
git commit -m "Description of your changes"
git push
```

Your site will automatically update on GitHub Pages!

## Troubleshooting

### If you get authentication errors:
- GitHub no longer accepts passwords for git operations
- You need to create a **Personal Access Token**:
  1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token
  3. Give it a name and select "repo" scope
  4. Copy the token and use it as your password when pushing

### If you need to change the remote URL:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/meta-real-estate.git
```

## Your Site URL Structure

- Main page: `https://YOUR_USERNAME.github.io/meta-real-estate/realestate.html`
- Or set `realestate.html` as index: Rename it to `index.html` and it will be the default page

---

**Need help?** Check GitHub's documentation or ask for assistance!

