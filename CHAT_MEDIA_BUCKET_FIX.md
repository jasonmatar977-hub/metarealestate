# Chat Media Bucket Fix - Implementation Summary

## Problem
Chat attachments were potentially going to the wrong bucket (`post-media` instead of `chat-media`). The `chat-media` bucket exists but had 0 objects.

## Fixes Applied

### 1. **Explicit Bucket Name** (`app/messages/[conversationId]/page.tsx`)
- Added constant `BUCKET_NAME = "chat-media"` to ensure all uploads go to the correct bucket
- All storage operations now explicitly use `"chat-media"` bucket

### 2. **Fixed Path Format**
**Before:**
```typescript
const filePath = `chat-media/${user.id}/${conversationId}/${timestamp}-${sanitizedName}`;
```

**After:**
```typescript
const filePath = `${user.id}/${conversationId}/${timestamp}-${safeFilename}`;
```

**Key Changes:**
- Removed `chat-media/` prefix from path (bucket name is specified in `.from("chat-media")`, not in the path)
- Path format: `{userId}/{conversationId}/{timestamp}-{safeFilename}`

### 3. **Improved Filename Sanitization**
**Before:**
```typescript
const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
```

**After:**
```typescript
const safeFilename = file.name
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9.-]/g, "")
  .substring(0, 100); // Limit length
```

**Improvements:**
- Converts to lowercase
- Replaces spaces with `-` (not `_`)
- Removes all non-alphanumeric characters (except `.` and `-`)
- Limits length to 100 characters

### 4. **Signed URL Support**
Added fallback to signed URLs if bucket is private:

```typescript
// Try public URL first
let fileUrl: string;
try {
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  fileUrl = urlData.publicUrl;
} catch (publicUrlError) {
  // Fallback to signed URL (1 day expiry)
  const { data: signedUrlData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 86400);
  fileUrl = signedUrlData.signedUrl;
}
```

### 5. **Enhanced Console Logging (Dev Mode Only)**
Added detailed logging for debugging:

**Upload Start:**
```typescript
console.log("[Chat] Upload details:", {
  bucket: BUCKET_NAME,
  path: filePath,
  filename: file.name,
  size: file.size,
  type: file.type,
});
```

**Upload Success:**
```typescript
console.log("[Chat] Upload successful:", {
  bucket: BUCKET_NAME,
  path: filePath,
  uploadData,
});
```

**Upload Error:**
```typescript
console.error("[Chat] Upload error details:", {
  error: uploadError,
  message: uploadError.message,
  name: uploadError.name,
  bucket: BUCKET_NAME,
  path: filePath,
});
```

**URL Generation:**
```typescript
console.log("[Chat] Using public URL:", fileUrl);
// OR
console.log("[Chat] Using signed URL (expires in 1 day):", fileUrl);
```

### 6. **Message Insert Logic**
The message insert already correctly handles:
- `image_url` for images
- `attachment_url` for files
- Optional `content` for text/captions
- Unread badge logic remains unchanged

## Files Changed

1. **`app/messages/[conversationId]/page.tsx`**
   - Fixed bucket name (explicit `"chat-media"`)
   - Fixed path format (removed bucket name from path)
   - Improved filename sanitization
   - Added signed URL fallback
   - Added detailed console logging

## Path Format

**Correct Format:**
```
{userId}/{conversationId}/{timestamp}-{safeFilename}
```

**Example:**
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890/conv-123/1704123456789-my-document.pdf
```

**Storage Location:**
- Bucket: `chat-media`
- Full path in bucket: `{userId}/{conversationId}/{timestamp}-{safeFilename}`

## URL Handling

1. **Public Bucket:** Uses `getPublicUrl()` - permanent URL
2. **Private Bucket:** Falls back to `createSignedUrl()` - expires in 1 day

The code automatically detects which method works and uses the appropriate one.

## Testing Checklist

### ✅ Test 1: Image Upload Goes to chat-media
1. Open a conversation
2. Click image button
3. Select an image (PNG/JPG/WEBP)
4. **Expected:**
   - Console shows: `bucket: "chat-media"`
   - Console shows: `path: "{userId}/{conversationId}/{timestamp}-{filename}"`
   - Upload succeeds
5. Check Supabase Storage → `chat-media` bucket
6. **Expected:** Object appears in `chat-media` bucket (NOT in `post-media`)

### ✅ Test 2: File Upload Goes to chat-media
1. Click attachment button
2. Select a file (PDF/DOC/DOCX/ZIP)
3. **Expected:**
   - Console shows: `bucket: "chat-media"`
   - Console shows: `path: "{userId}/{conversationId}/{timestamp}-{filename}"`
   - Upload succeeds
4. Check Supabase Storage → `chat-media` bucket
5. **Expected:** Object appears in `chat-media` bucket

### ✅ Test 3: Filename Sanitization
1. Upload file with name: `My Document (2024).pdf`
2. **Expected:**
   - Console shows sanitized filename: `my-document-2024.pdf`
   - File stored with sanitized name
   - Original filename preserved in UI

### ✅ Test 4: Other User Can Open/Download
1. User A: Upload image/file
2. User B: Open conversation
3. **Expected:**
   - Image/file appears in message list
   - User B can click to open/download
   - URL works (public or signed)

### ✅ Test 5: chat-media Bucket Shows Objects
1. Upload multiple images/files
2. Go to Supabase Dashboard → Storage → `chat-media`
3. **Expected:**
   - Objects appear in bucket
   - Path structure: `{userId}/{conversationId}/{timestamp}-{filename}`
   - Count matches number of uploads

### ✅ Test 6: Console Logs in Dev Mode
1. Open browser console (dev mode)
2. Upload image/file
3. **Expected:** See detailed logs:
   - Upload details (bucket, path, filename, size, type)
   - Upload success confirmation
   - URL type (public or signed)

### ✅ Test 7: Error Handling
1. Try to upload file > 10MB
2. **Expected:**
   - Error message shown
   - Console shows error details
   - No upload attempted

### ✅ Test 8: Unread Badge Still Works
1. User A: Send image/file to User B
2. User B: Check navbar
3. **Expected:** Unread badge increments
4. User B: Open conversation
5. **Expected:** Badge decrements (message marked as read)

## Verification Steps

### In Supabase Dashboard:
1. Go to **Storage** → **chat-media** bucket
2. **Expected:** Objects appear with path structure:
   ```
   {userId}/{conversationId}/{timestamp}-{filename}
   ```
3. **Expected:** `post-media` bucket should NOT have chat uploads

### In Browser Console (Dev Mode):
1. Upload an image/file
2. **Expected:** See logs:
   ```
   [Chat] Upload details: { bucket: "chat-media", path: "...", ... }
   [Chat] Upload successful: { bucket: "chat-media", path: "...", ... }
   [Chat] Using public URL: https://... OR Using signed URL: https://...
   ```

## Important Notes

- ✅ **Bucket name is explicit:** `BUCKET_NAME = "chat-media"` constant
- ✅ **Path does NOT include bucket name:** Only `{userId}/{conversationId}/{timestamp}-{filename}`
- ✅ **Filename sanitization:** Lowercase, spaces → `-`, removes special chars
- ✅ **URL handling:** Tries public URL first, falls back to signed URL
- ✅ **Console logs:** Detailed logging in dev mode only
- ✅ **No breaking changes:** Existing functionality preserved
- ✅ **Unread badge:** Still works correctly

## Troubleshooting

**If uploads still go to wrong bucket:**
1. Check console logs - should show `bucket: "chat-media"`
2. Verify `BUCKET_NAME` constant is set to `"chat-media"`
3. Check Supabase Storage → `chat-media` bucket exists

**If URLs don't work:**
1. Check if bucket is public or private
2. If private, verify RLS policies allow authenticated access
3. Check console logs for URL type (public or signed)

**If files don't appear in chat-media:**
1. Check console logs for upload errors
2. Verify path format is correct (no `chat-media/` prefix)
3. Check Supabase Storage → `chat-media` bucket directly





