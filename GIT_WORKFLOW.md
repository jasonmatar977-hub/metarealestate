# Git Workflow - How Changes Work

## Understanding the Process

When you make changes locally (on your computer), they don't automatically appear on GitHub. You need to:

1. **Make changes** (edit files, rename files, etc.)
2. **Stage changes** (`git add .`)
3. **Commit changes** (`git commit -m "message"`)
4. **Push to GitHub** (`git push`)

## Example: Renaming realestate.html to index.html

### Step 1: I rename the file locally
- File is renamed on your computer

### Step 2: You commit the change
```bash
git add .
git commit -m "Rename realestate.html to index.html"
```

### Step 3: You push to GitHub
```bash
git push
```

### Step 4: GitHub Pages updates
- Within 1-2 minutes, your live site reflects the change

## Quick Reference Commands

**After making any changes:**
```bash
git add .
git commit -m "Description of what you changed"
git push
```

**Check what files changed:**
```bash
git status
```

**See your commit history:**
```bash
git log
```

## Important Notes

- Changes are **local first**, then **pushed to GitHub**
- GitHub Pages automatically updates when you push
- Always commit with a descriptive message
- You can push multiple times - each push updates your live site

