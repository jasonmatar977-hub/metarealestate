# Development Setup Guide

## Preventing ChunkLoadError in Dev Mode

### Root Cause

ChunkLoadError happens when:
1. **Port mismatch**: Dev server restarts on different port (3000 vs 3001)
2. **Stale chunks**: Browser cached old chunks after hot reload
3. **Hot reload failure**: Next.js fails to update chunks properly

### Solution

#### 1. Always Use Consistent Port

**Default dev script now uses port 3001:**
```bash
npm run dev
```

**Or explicitly:**
```bash
npm run dev:3001  # Port 3001 (default)
npm run dev:3000  # Port 3000 (alternative)
```

**Important:** Always use the same port. If you switch ports, hard refresh your browser.

#### 2. Clean Build Cache

If you encounter chunk errors, run:
```bash
npm run clean
npm run dev
```

This removes:
- `.next` directory (build cache)
- `node_modules/.cache` (webpack cache)

#### 3. Hard Refresh Browser

When chunk errors occur:
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

Or use the error page button: "Hard Refresh Required (Clears Cache)"

#### 4. Disable Service Workers in Dev

If you have any service workers:
- Open DevTools → Application → Service Workers
- Click "Unregister" for any registered workers
- Service workers cache chunks and cause stale loads

---

## Development Workflow

### Starting Dev Server

```bash
# Clean start (recommended after git pull or major changes)
npm run clean
npm run dev

# Or if cache is fine
npm run dev
```

### After Port Changes

If you change the dev port:
1. Stop the dev server
2. Hard refresh browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)
3. Or clear browser cache

### Troubleshooting Chunk Errors

1. **Check port mismatch:**
   - Look at terminal: "Ready on http://localhost:XXXX"
   - Check browser console: What port is it trying to load from?
   - If mismatch: Hard refresh or restart dev server

2. **Clear everything:**
   ```bash
   npm run clean
   rm -rf .next node_modules/.cache
   npm run dev
   ```

3. **Check for service workers:**
   - DevTools → Application → Service Workers
   - Unregister all
   - Hard refresh

4. **Check Next.js config:**
   - Ensure no `assetPrefix` or `basePath` in `next.config.js`
   - These break chunk URLs in dev

---

## Common Issues

### Issue: "Loading chunk app/layout failed"

**Cause:** Port mismatch or stale cache

**Fix:**
1. Check dev server port in terminal
2. Hard refresh browser (`Ctrl+Shift+R`)
3. If persists: `npm run clean && npm run dev`

### Issue: Chunks load from wrong port

**Cause:** Browser cached old port

**Fix:**
1. Clear browser cache
2. Hard refresh
3. Or use incognito/private window

### Issue: Hot reload breaks chunks

**Cause:** Next.js hot reload failed

**Fix:**
1. Stop dev server
2. `npm run clean`
3. Restart dev server
4. Hard refresh browser

---

## Best Practices

1. **Always use same port** - Stick to 3001 (default) or 3000
2. **Clean after major changes** - Run `npm run clean` after git pull
3. **Hard refresh on errors** - Don't just reload, hard refresh
4. **Check port in terminal** - Verify server port matches browser
5. **Disable service workers** - In dev, keep them unregistered

---

## Scripts Reference

- `npm run dev` - Start dev server on port 3001
- `npm run dev:3001` - Explicitly use port 3001
- `npm run dev:3000` - Use port 3000
- `npm run clean` - Remove `.next` and cache directories
- `npm run build` - Production build
- `npm run start` - Start production server

---

## Error Recovery

If you see ChunkLoadError:

1. **Don't panic** - This is a dev-only issue
2. **Click "Hard Refresh Required"** button on error page
3. **Or manually:**
   - Clear browser cache
   - Hard refresh (`Ctrl+Shift+R`)
   - Restart dev server if needed

The error page now detects ChunkLoadError and provides a recovery button.





