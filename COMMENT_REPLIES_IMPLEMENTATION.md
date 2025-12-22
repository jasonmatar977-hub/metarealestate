# Comment Replies Implementation - Summary

## Overview

Implemented frontend support for threaded comment replies (one level deep) without breaking existing features. The database already has `parent_comment_id` column, so this is purely a frontend implementation.

## Changes Made

### 1. Updated Comment Interface (`components/Comments.tsx`)

**Added:**
- `parent_comment_id: number | null` to Comment interface
- `replies?: Comment[]` for nested replies

### 2. Query Strategy

**Before:**
- Fetched comments with limit (3 or 100 based on `showAll`)
- Ordered by `created_at DESC`

**After:**
- Fetches ALL comments for the post (no limit)
- Includes `parent_comment_id` in SELECT
- Orders by `created_at ASC` (to group replies after parents)
- Groups comments in JavaScript:
  - Parent comments: `parent_comment_id IS NULL`
  - Replies: `parent_comment_id = parent.id`
- Sorts parents by `created_at DESC` (newest first)
- Sorts replies by `created_at ASC` (oldest first, chronological)

**Why this approach:**
- Avoids complex SQL joins that could cause timeouts
- Single query fetches all data
- JavaScript grouping is fast and flexible
- No RLS complexity

### 3. UI Features Added

**Reply Button:**
- Appears under each parent comment
- Clicking opens inline reply input
- "Cancel" button to close reply input

**Reply Input:**
- Inline input field under the comment being replied to
- Auto-focuses when opened
- Enter key submits (Shift+Enter for new line)
- Submit button with loading state

**View Replies Toggle:**
- Shows "View replies (n)" if parent has replies
- Clicking expands/collapses replies
- Replies are indented with left border
- Smaller avatar for replies (visual hierarchy)

**Reply Styling:**
- Indented with `ml-4 pl-4 border-l-2 border-gold/20`
- Slightly smaller avatar (7x7 vs 8x8)
- Same like functionality as parent comments

### 4. State Management

**New State Variables:**
- `replyingTo: number | null` - Tracks which comment we're replying to
- `replyText: Record<number, string>` - Stores reply text per comment
- `showReplies: Set<number>` - Tracks which comments have replies expanded

### 5. Reply Submission

**New Function: `handleReplySubmit`**
- Inserts comment with `parent_comment_id` set
- Clears reply text and closes input
- Automatically expands replies to show new reply
- Reloads comments to refresh UI
- Error handling with user-friendly alerts

### 6. Translation Keys Added (`messages/en.json`)

**Added to `feed` section:**
- `addReply: "Write a reply..."`
- `viewReplies: "View replies"`
- `hideReplies: "Hide replies"`

**Note:** `addComment`, `noComments`, `viewAll`, `showLess` already existed

## Files Changed

1. **`components/Comments.tsx`**
   - Updated Comment interface
   - Modified `loadComments()` to fetch and group replies
   - Added `handleReplySubmit()` function
   - Updated UI to show replies with indentation
   - Added reply input and toggle functionality

2. **`messages/en.json`**
   - Added translation keys for reply functionality

## Data Flow

1. **Load Comments:**
   ```
   Query: SELECT id, post_id, user_id, content, created_at, parent_comment_id
          FROM comments WHERE post_id = ? ORDER BY created_at ASC
   
   JavaScript Grouping:
   - Filter: parent_comment_id IS NULL → parentComments[]
   - Filter: parent_comment_id = X → repliesMap[X]
   - Attach: parent.replies = repliesMap[parent.id]
   ```

2. **Create Reply:**
   ```
   INSERT INTO comments (post_id, user_id, content, parent_comment_id)
   VALUES (?, ?, ?, parentCommentId)
   ```

3. **Display:**
   - Render parent comments
   - If replies exist and expanded: render replies indented
   - Show "View replies (n)" toggle if replies exist

## UI Structure

```
Parent Comment
├── Avatar + Name + Timestamp
├── Content
├── Like Button + Reply Button + "View replies (n)"
├── Reply Input (if replying)
└── Replies (if expanded)
    ├── Reply 1 (indented)
    ├── Reply 2 (indented)
    └── ...
```

## Testing Checklist

### ✅ Test 1: Add Comment (Parent)
1. Go to feed
2. Open a post's comments
3. Type a comment and submit
4. **Expected:** Comment appears as parent (no indentation)

### ✅ Test 2: Reply to Comment
1. Find a parent comment
2. Click "Reply" button
3. Type reply text
4. Submit (click button or press Enter)
5. **Expected:** 
   - Reply appears indented under parent
   - Reply input closes
   - "View replies" shows correct count

### ✅ Test 3: View Replies Toggle
1. Find a comment with replies
2. Click "View replies (n)"
3. **Expected:** Replies expand and show indented
4. Click "Hide replies (n)"
5. **Expected:** Replies collapse

### ✅ Test 4: Refresh Page → Persists
1. Add a reply to a comment
2. Refresh the page
3. **Expected:** 
   - Reply still appears
   - Parent-reply relationship maintained
   - Indentation correct

### ✅ Test 5: Multiple Replies
1. Add multiple replies to same parent
2. **Expected:** 
   - All replies appear under parent
   - Replies sorted chronologically (oldest first)
   - Each reply has its own like button

### ✅ Test 6: Existing Features Still Work
1. Like a parent comment
2. Like a reply
3. Add a new parent comment
4. **Expected:** All existing functionality works

### ✅ Test 7: Error Handling
1. Try to submit empty reply
2. **Expected:** Button disabled, no submission
3. Simulate network error (disconnect)
4. **Expected:** Error message shown, can retry

## Important Notes

- ✅ **No DB changes** - Uses existing `parent_comment_id` column
- ✅ **No RLS changes** - Existing policies work
- ✅ **No schema changes** - Additive only
- ✅ **One level nesting** - Replies cannot have replies (v1 limitation)
- ✅ **Backward compatible** - Old comments (parent_comment_id = NULL) still work
- ✅ **i18n compatible** - Uses translation keys
- ✅ **Performance** - Single query, JavaScript grouping (fast)

## Edge Cases Handled

1. **No replies:** "View replies" button doesn't show
2. **Empty reply:** Submit button disabled
3. **Network error:** Error message shown, can retry
4. **Multiple replies:** All shown when expanded
5. **Reply to deleted parent:** Handled by RLS (won't show)
6. **Refresh:** Replies persist correctly

## Future Enhancements (Not in v1)

- Recursive nesting (replies to replies)
- Reply notifications
- Edit/delete replies
- Reply count badge
- Collapse all replies button

