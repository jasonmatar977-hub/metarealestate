# Meta Real Estate - Complete Technical Brief

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Authentication](#4-authentication-very-important)
5. [Backend & Database](#5-backend--database)
6. [API Layer](#6-api-layer)
7. [File Uploads / Storage](#7-file-uploads--storage)
8. [Environment Variables](#8-environment-variables)
9. [Deployment](#9-deployment)
10. [Security Review](#10-security-review)
11. [Bugs & Weak Points](#11-bugs--weak-points)
12. [Architecture Diagram](#12-architecture-diagram)

---

## 1. Project Overview

### What Does the Website Do?

**Meta Real Estate** is an AI-powered real estate platform built with Next.js 15 that provides:

- **Property Listings**: Enhanced property listings with search, filters, and sorting
- **Social Feed**: Instagram/Facebook-style vertical feed with posts, likes, comments, and media uploads
- **User Profiles**: Instagram-like profile pages with edit functionality, followers/following
- **Direct Messages (DM)**: Real-time messaging system with conversation inbox and chat views
- **Follow System**: Follow/unfollow users and view posts from people you follow
- **User Search**: Search for users by name and start conversations
- **AI Chatbot**: Integration with OpenAI ChatGPT API (currently disabled for deployment)
- **Area Journals**: Real estate market analysis for specific areas (e.g., Beirut neighborhoods)
- **Multi-Language Support**: i18n with English, Arabic (RTL), Chinese, and German
- **Notifications**: System for follow, new post, and message notifications

### Main User Flows

#### Visitor (Not Logged In)
1. **Landing Page** (`/`): View hero section, about, services, testimonials, contact form
2. **Registration** (`/register`): Create account with email, password, full name, username, address, country, birthday
3. **Login** (`/login`): Sign in with email and password
4. **Password Reset** (`/reset-password`): Request password reset email
5. **Update Password** (`/update-password`): Set new password after reset link

#### Logged User
1. **Feed** (`/feed`): 
   - View posts from all users ("For You" tab)
   - View posts from followed users ("Following" tab)
   - Create new posts with text and images
   - Like/unlike posts
   - Comment on posts
   - Delete own posts

2. **Profile** (`/profile`):
   - View own profile with posts, followers, following counts
   - Edit profile (`/profile/edit`): Update display name, bio, avatar, location, phone, website

3. **Public Profile** (`/u/[id]`):
   - View other users' profiles
   - Follow/unfollow users
   - View their posts
   - Start conversation (DM)

4. **Messages** (`/messages`):
   - View inbox with all conversations
   - Open conversation (`/messages/[conversationId]`): Real-time chat with media attachments
   - Send text messages and images
   - View message history

5. **Search** (`/search`):
   - Search for users by name
   - View user profiles
   - Follow users
   - Start conversations

6. **Listings** (`/listings`): Property listings (protected route)

7. **Chat** (`/chat`): AI chatbot (currently disabled, uses fallback responses)

8. **Area Journals** (`/journal`):
   - View area journal methodology
   - Browse area-specific market data (e.g., `/journal/beirut/[areaSlug]`)

#### Admin (Future)
- Manage area journals
- Verify contributions
- Manage users (if role-based access is implemented)

---

## 2. Tech Stack

### Frameworks + Exact Versions

- **Next.js**: `^15.5.9` (App Router)
- **React**: `^18.3.1`
- **React DOM**: `^18.3.1`
- **TypeScript**: `^5.3.3`

### Libraries

#### UI & Styling
- **Tailwind CSS**: `^3.4.1`
- **PostCSS**: `^8.4.33`
- **Autoprefixer**: `^10.4.17`
- **Google Fonts**: Orbitron & Rajdhani (loaded via `next/font/google`)

#### Backend & Database
- **Supabase JS**: `^2.39.0`
  - Authentication (email/password)
  - PostgreSQL database (via PostgREST)
  - Storage (file uploads)
  - Realtime subscriptions

#### Internationalization
- **next-intl**: `^4.6.1` (multi-language support)

#### Development Tools
- **rimraf**: `^6.1.2` (cleanup utility)
- **@types/node**: `^20.11.0`
- **@types/react**: `^18.2.48`
- **@types/react-dom**: `^18.2.18`

### Deployment Setup

- **Platform**: Vercel (configured via `vercel.json`)
- **Build Command**: `npm run build`
- **Node Version**: `>=18.0.0` (specified in `package.json` engines)

---

## 3. Folder Structure

```
myproject/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   └── chat/
│   │       └── route.ts          # OpenAI chat endpoint (disabled)
│   ├── chat/
│   │   └── page.tsx              # AI chatbot page
│   ├── feed/
│   │   └── page.tsx              # News feed page
│   ├── listings/
│   │   └── page.tsx              # Property listings page
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── register/
│   │   └── page.tsx              # Registration page
│   ├── messages/
│   │   ├── page.tsx              # Messages inbox
│   │   └── [conversationId]/
│   │       └── page.tsx          # Individual chat view
│   ├── search/
│   │   └── page.tsx              # User search page
│   ├── u/
│   │   └── [id]/
│   │       └── page.tsx          # Public user profile page
│   ├── profile/
│   │   ├── page.tsx              # Own profile page
│   │   └── edit/
│   │       └── page.tsx          # Edit profile page
│   ├── journal/
│   │   ├── page.tsx              # Area journals landing
│   │   ├── methodology/
│   │   │   └── page.tsx          # Methodology page
│   │   └── beirut/
│   │       └── [areaSlug]/
│   │           └── page.tsx      # Area-specific journal
│   ├── reset-password/
│   │   └── page.tsx              # Password reset request
│   ├── update-password/
│   │   └── page.tsx              # Password update after reset
│   ├── layout.tsx                # Root layout with fonts
│   ├── page.tsx                  # Landing page
│   ├── providers.tsx             # Context providers wrapper
│   ├── globals.css               # Global styles
│   ├── error.tsx                 # Error boundary
│   └── global-error.tsx          # Global error boundary
│
├── components/                   # React components
│   ├── Navbar.tsx                # Navigation bar with language switcher
│   ├── Footer.tsx                # Professional footer
│   ├── LoginForm.tsx             # Login form component
│   ├── RegisterForm.tsx          # Registration form component
│   ├── PropertyCard.tsx          # Property card component
│   ├── PostCard.tsx              # Feed post component with comments
│   ├── Comments.tsx              # Comments component for posts
│   ├── CreatePost.tsx            # Create post component
│   ├── ChatMessage.tsx            # Chat message component
│   ├── ChatInput.tsx              # Chat input component
│   ├── LanguageSwitcher.tsx      # Language dropdown
│   ├── MobileBottomNav.tsx       # Mobile navigation
│   ├── NotificationsBell.tsx     # Notifications component
│   ├── OnlineUsersSidebar.tsx    # Online users sidebar
│   ├── FollowersFollowingModal.tsx # Followers/following modal
│   ├── ProfileDropdown.tsx       # Profile dropdown menu
│   ├── EmojiPicker.tsx           # Emoji picker for messages
│   ├── CountryFlags.tsx          # Country flags component
│   ├── HeroSection.tsx           # Landing hero (legacy)
│   ├── AreaJournalHeroSection.tsx # Area journal hero
│   ├── AboutSection.tsx          # About section
│   ├── WhatWeDoSection.tsx       # Services section
│   ├── PlatformPurposeSection.tsx # Platform purpose section
│   ├── WhoIsThisForSection.tsx   # Target audience section
│   ├── ProblemWeSolveSection.tsx # Problem statement section
│   └── TestimonialsSection.tsx    # Testimonials section
│
├── contexts/                     # React contexts
│   ├── AuthContext.tsx           # Authentication context (Supabase)
│   └── LanguageContext.tsx        # i18n language context
│
├── hooks/                        # Custom React hooks
│   └── usePresenceHeartbeat.ts   # Presence/online status hook
│
├── lib/                          # Utility functions
│   ├── supabaseClient.ts         # Supabase client configuration
│   ├── validation.ts             # Form validation helpers
│   ├── messages.ts               # DM helper functions (find/create conversations)
│   ├── asyncGuard.ts             # Request guards, timeouts, error normalization
│   ├── safeStorage.ts            # Safe storage with fallback
│   └── utils.ts                  # General utilities
│
├── supabase/                     # Database SQL files
│   ├── schema.sql                # Main database schema (profiles, posts, likes, follows)
│   ├── rls_policies.sql          # Row Level Security policies
│   ├── profile_upgrade.sql        # Profile enhancements (bio, avatar, location, etc.)
│   ├── comments.sql              # Comments and comment_likes tables
│   ├── messages_phase2.sql       # DM tables (conversations, messages)
│   ├── notifications.sql         # Notifications table and triggers
│   ├── post_media.sql            # Post image_url column
│   ├── area_journals.sql         # Area journals tables
│   ├── storage_setup_instructions.md # Storage bucket setup guide
│   └── [various fix files]       # Bug fix SQL files
│
├── messages/                     # i18n translation files (if using next-intl)
│
├── package.json                  # Dependencies
├── package-lock.json             # Lock file
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
├── postcss.config.js             # PostCSS config
├── next.config.js                # Next.js config
├── vercel.json                   # Vercel deployment config
└── README.md                     # Project documentation
```

### Custom Folders Explained

- **`app/`**: Next.js 15 App Router - all pages and API routes
- **`components/`**: Reusable React components (client-side only, marked with `"use client"`)
- **`contexts/`**: React Context providers for global state (Auth, Language)
- **`lib/`**: Utility functions and helpers (Supabase client, validation, async guards)
- **`supabase/`**: SQL migration files for database setup
- **`hooks/`**: Custom React hooks for reusable logic

---

## 4. Authentication (VERY IMPORTANT)

### Where Signup/Login Pages Are

- **Login Page**: `app/login/page.tsx`
- **Registration Page**: `app/register/page.tsx`
- **Password Reset**: `app/reset-password/page.tsx`
- **Update Password**: `app/update-password/page.tsx`

### How Supabase Auth is Implemented

#### Client Configuration
**File**: `lib/supabaseClient.ts`

- Creates Supabase client with `createClient()` from `@supabase/supabase-js`
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment variables
- Custom storage adapter with localStorage fallback to memory (handles blocked storage)
- Auto-refresh tokens enabled
- Session detection from URL (for email confirmation links)
- Global 401 handler: Automatically signs out on invalid token errors

```typescript
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      storage: safeStorage, // Custom adapter with memory fallback
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
```

#### Auth Context
**File**: `contexts/AuthContext.tsx`

Provides global authentication state via React Context:

- **State Management**:
  - `isAuthenticated`: Boolean indicating if user is logged in
  - `user`: User object with `id`, `email`, `name`, `username`, `displayName`
  - `isLoading`: Loading state for auth operations
  - `loadingSession`: Initial session check state

- **Methods**:
  - `login(email, password)`: Sign in with email/password
  - `register(userData)`: Register new user
  - `logout()`: Sign out and clear session
  - `resendConfirmationEmail(email)`: Resend email confirmation

- **Session Management**:
  - On mount: Calls `supabase.auth.getSession()` to check existing session
  - Validates session with `supabase.auth.getUser()` to catch expired tokens
  - Subscribes to `onAuthStateChange` for real-time auth updates
  - Loads user profile from `profiles` table after authentication
  - Clears stale session data on errors

- **Session Health Check**:
  - Detects auth errors (401/403) and automatically signs out
  - Redirects to `/login` with message on session expiry

#### Login Flow

1. User enters email/password in `components/LoginForm.tsx`
2. Form calls `AuthContext.login(email, password)`
3. `AuthContext` calls `supabase.auth.signInWithPassword()`
4. After successful sign-in, calls `supabase.auth.getSession()` to get current session
5. Loads user profile from `profiles` table
6. Updates `isAuthenticated` and `user` state
7. Redirects to `/feed` on success

#### Registration Flow

1. User fills registration form in `components/RegisterForm.tsx`
2. Form calls `AuthContext.register(userData)`
3. `AuthContext` calls `supabase.auth.signUp()` with:
   - Email (normalized: trimmed + lowercase)
   - Password
   - Metadata: `full_name`, `username`
4. Database trigger `handle_new_user()` automatically creates profile in `profiles` table
5. If email confirmation required, returns `needsConfirmation: true`
6. User receives confirmation email (if enabled in Supabase)
7. After email confirmation, user can log in

### How Sessions Are Stored

- **Primary Storage**: `localStorage` (Supabase stores session tokens)
- **Fallback**: In-memory Map (when localStorage is blocked, e.g., WhatsApp in-app browser)
- **Storage Keys**: 
  - `sb-{project-ref}-auth-token` (Supabase session token)
  - Other Supabase-related keys prefixed with `sb-` or containing `supabase.auth.token`

**File**: `lib/supabaseClient.ts` - Custom storage adapter:

```typescript
function createSafeStorageAdapter() {
  // Checks localStorage availability
  // Falls back to memory Map if blocked
  return {
    getItem, setItem, removeItem
  };
}
```

### How Route Protection Works

**No Middleware File** - Protection is done client-side in each page component.

#### Pattern Used in Protected Routes

**Example**: `app/feed/page.tsx`

```typescript
const { isAuthenticated, isLoading, loadingSession } = useAuth();
const router = useRouter();

useEffect(() => {
  // Wait for initial session check to complete
  if (!loadingSession && !isLoading && !isAuthenticated && !hasRedirected) {
    setHasRedirected(true);
    router.push("/login");
  }
}, [isAuthenticated, isLoading, loadingSession, router, hasRedirected]);
```

**Protected Routes** (all use this pattern):
- `/feed` - Feed page
- `/profile` - Profile page
- `/profile/edit` - Edit profile
- `/messages` - Messages inbox
- `/messages/[conversationId]` - Chat view
- `/search` - User search
- `/u/[id]` - Public profile
- `/listings` - Property listings
- `/chat` - AI chatbot

**Public Routes**:
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/reset-password` - Password reset
- `/update-password` - Update password

### Password Reset Flow

1. User visits `/reset-password`
2. Enters email address
3. Calls `supabase.auth.resetPasswordForEmail(email)`
4. Supabase sends password reset email
5. User clicks link in email (contains token)
6. Redirected to `/update-password?token=...`
7. User enters new password
8. Calls `supabase.auth.updateUser({ password: newPassword })`
9. Redirects to `/login` with success message

### Email Verification Flow

1. User registers via `/register`
2. If email confirmation enabled in Supabase:
   - User receives confirmation email
   - `register()` returns `needsConfirmation: true`
   - UI shows message: "Please check your email to confirm your account"
3. User clicks confirmation link in email
4. Supabase redirects to app with token
5. Session is automatically established
6. User is logged in

**File**: `contexts/AuthContext.tsx` - Registration method checks `email_confirmed_at`:

```typescript
if (!data.user.email_confirmed_at) {
  return { success: false, needsConfirmation: true, error: 'Please check your email...' };
}
```

### File Paths Summary

- **Supabase Client**: `lib/supabaseClient.ts`
- **Auth Context**: `contexts/AuthContext.tsx`
- **Login Page**: `app/login/page.tsx`
- **Login Form**: `components/LoginForm.tsx`
- **Register Page**: `app/register/page.tsx`
- **Register Form**: `components/RegisterForm.tsx`
- **Password Reset**: `app/reset-password/page.tsx`
- **Update Password**: `app/update-password/page.tsx`

---

## 5. Backend & Database

### Supabase Tables

#### Core Tables

**1. `profiles`** (extends `auth.users`)
```sql
- id UUID PRIMARY KEY (references auth.users)
- display_name TEXT
- bio TEXT
- avatar_url TEXT
- location TEXT
- phone TEXT
- website TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

**2. `posts`**
```sql
- id BIGSERIAL PRIMARY KEY
- user_id UUID (references auth.users)
- content TEXT NOT NULL
- image_url TEXT
- created_at TIMESTAMPTZ
```

**3. `likes`**
```sql
- id BIGSERIAL PRIMARY KEY
- post_id BIGINT (references posts)
- user_id UUID (references auth.users)
- created_at TIMESTAMPTZ
- UNIQUE(post_id, user_id)
```

**4. `follows`**
```sql
- id BIGSERIAL PRIMARY KEY
- follower_id UUID (references auth.users)
- following_id UUID (references auth.users)
- created_at TIMESTAMPTZ
- UNIQUE(follower_id, following_id)
- CHECK (follower_id != following_id)
```

**5. `comments`**
```sql
- id BIGSERIAL PRIMARY KEY
- post_id BIGINT (references posts)
- user_id UUID (references auth.users)
- content TEXT NOT NULL
- created_at TIMESTAMPTZ
```

**6. `comment_likes`**
```sql
- id BIGSERIAL PRIMARY KEY
- comment_id BIGINT (references comments)
- user_id UUID (references auth.users)
- created_at TIMESTAMPTZ
- UNIQUE(comment_id, user_id)
```

**7. `conversations`** (DM)
```sql
- id UUID PRIMARY KEY
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

**8. `conversation_participants`** (DM)
```sql
- id UUID PRIMARY KEY
- conversation_id UUID (references conversations)
- user_id UUID (references auth.users)
- created_at TIMESTAMPTZ
- UNIQUE(conversation_id, user_id)
```

**9. `messages`** (DM)
```sql
- id UUID PRIMARY KEY
- conversation_id UUID (references conversations)
- sender_id UUID (references auth.users)
- content TEXT NOT NULL
- created_at TIMESTAMPTZ
```

**10. `notifications`**
```sql
- id UUID PRIMARY KEY
- user_id UUID (references auth.users)
- actor_id UUID (references auth.users)
- type TEXT (follow, new_post, message)
- entity_id UUID (post_id or conversation_id)
- title TEXT
- body TEXT
- is_read BOOLEAN
- created_at TIMESTAMPTZ
```

**11. `area_journals`**
```sql
- id UUID PRIMARY KEY
- slug TEXT UNIQUE
- name TEXT
- city TEXT
- status TEXT (heating, cooling, stable)
- demand TEXT
- inventory_trend TEXT
- price_flexibility TEXT
- rent_1br_min/max, rent_2br_min/max, rent_3br_min/max NUMERIC
- sale_min/max NUMERIC
- driving_factors JSONB
- risks JSONB
- outlook TEXT (up, sideways, down)
- what_would_change TEXT
- methodology TEXT
- takeaway TEXT
- last_updated TIMESTAMPTZ
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

**12. `area_journal_updates`** (historical entries)
**13. `area_journal_contributions`** (verified notes)

### Relations

- `profiles.id` → `auth.users.id` (1:1)
- `posts.user_id` → `auth.users.id` (N:1)
- `likes.post_id` → `posts.id` (N:1)
- `likes.user_id` → `auth.users.id` (N:1)
- `follows.follower_id` → `auth.users.id` (N:1)
- `follows.following_id` → `auth.users.id` (N:1)
- `comments.post_id` → `posts.id` (N:1)
- `comments.user_id` → `auth.users.id` (N:1)
- `conversation_participants.conversation_id` → `conversations.id` (N:1)
- `conversation_participants.user_id` → `auth.users.id` (N:1)
- `messages.conversation_id` → `conversations.id` (N:1)
- `messages.sender_id` → `auth.users.id` (N:1)

### What Queries Are Executed and From Where

#### Feed Page (`app/feed/page.tsx`)

1. **Load Follows** (if "Following" tab):
   ```typescript
   supabase.from("follows").select("following_id").eq("follower_id", user.id)
   ```

2. **Load Posts**:
   ```typescript
   supabase.from("posts")
     .select("id, user_id, content, created_at, image_url")
     .order("created_at", { ascending: false })
     .limit(50)
   ```

3. **Load Profiles**:
   ```typescript
   supabase.from("profiles")
     .select("id, display_name")
     .in("id", userIds)
   ```

4. **Load Likes**:
   ```typescript
   supabase.from("likes")
     .select("post_id, user_id")
     .in("post_id", postIds)
   ```

5. **Load Comments Count**:
   ```typescript
   supabase.from("comments")
     .select("post_id")
     .in("post_id", postIds)
   ```

#### Messages Inbox (`app/messages/page.tsx`)

1. **Load Participants**:
   ```typescript
   supabase.from("conversation_participants")
     .select("conversation_id")
     .eq("user_id", user.id)
   ```

2. **Load Conversations**:
   ```typescript
   supabase.from("conversations")
     .select("id, updated_at")
     .in("id", conversationIds)
     .order("updated_at", { ascending: false })
   ```

3. **Load Profiles** (batch):
   ```typescript
   supabase.from("profiles")
     .select("id, display_name, avatar_url")
     .in("id", profileIds)
   ```

4. **Load Last Messages**:
   ```typescript
   supabase.from("messages")
     .select("conversation_id, content, created_at, sender_id")
     .in("conversation_id", conversationIds)
     .order("created_at", { ascending: false })
     .limit(100)
   ```

#### Create Post (`components/CreatePost.tsx`)

1. **Upload Image** (if present):
   ```typescript
   supabase.storage.from("post-media").upload(filePath, imageFile)
   ```

2. **Insert Post**:
   ```typescript
   supabase.from("posts")
     .insert({ user_id, content, image_url })
     .select()
     .single()
   ```

#### Find/Create Conversation (`lib/messages.ts`)

1. **Find Existing Conversation**:
   ```typescript
   supabase.from("conversation_participants")
     .select("conversation_id, user_id")
     .in("user_id", [userId1, userId2])
   ```

2. **Create New Conversation**:
   ```typescript
   supabase.from("conversations").insert({}).select().single()
   ```

3. **Add Participants**:
   ```typescript
   supabase.from("conversation_participants")
     .insert([{ conversation_id, user_id: userId1 }, { conversation_id, user_id: userId2 }])
   ```

### Row Level Security (RLS) Policies

**All tables have RLS enabled.**

#### Profiles Policies
- **SELECT**: All authenticated users can view all profiles
- **INSERT**: Users can insert their own profile (`auth.uid() = id`)
- **UPDATE**: Users can update their own profile (`auth.uid() = id`)

#### Posts Policies
- **SELECT**: All authenticated users can view all posts
- **INSERT**: Users can create posts (`auth.uid() = user_id`)
- **DELETE**: Users can delete their own posts (`auth.uid() = user_id`)

#### Likes Policies
- **SELECT**: All authenticated users can view all likes
- **INSERT**: Users can like posts (`auth.uid() = user_id`)
- **DELETE**: Users can unlike their own likes (`auth.uid() = user_id`)

#### Follows Policies
- **SELECT**: All authenticated users can view all follows
- **INSERT**: Users can follow others (`auth.uid() = follower_id`)
- **DELETE**: Users can unfollow (`auth.uid() = follower_id`)

#### Comments Policies
- **SELECT**: All authenticated users can view all comments
- **INSERT**: Users can insert their own comments (`auth.uid() = user_id`)
- **DELETE**: Users can delete their own comments (`auth.uid() = user_id`)

#### Conversations Policies
- **SELECT**: Users can view conversations they participate in (via `conversation_participants`)
- **INSERT**: All authenticated users can create conversations

#### Conversation Participants Policies
- **SELECT**: Users can view participants in their conversations
- **INSERT**: Users can add themselves to conversations (`auth.uid() = user_id`)

#### Messages Policies
- **SELECT**: Users can view messages in conversations they participate in
- **INSERT**: Users can send messages in conversations they participate in (`auth.uid() = sender_id`)

#### Notifications Policies
- **SELECT**: Users can view their own notifications (`user_id = auth.uid()`)
- **UPDATE**: Users can update their own notifications (`user_id = auth.uid()`)

**File**: `supabase/rls_policies.sql` - Contains all RLS policies

### Service Role Usage

**No service role usage found in codebase.** All queries use the anon key with RLS policies.

### Database Triggers

1. **`handle_new_user()`**: Automatically creates profile when user signs up
   - Triggered on `INSERT` to `auth.users`
   - File: `supabase/schema.sql`

2. **`update_conversation_updated_at()`**: Updates `conversations.updated_at` when message is inserted
   - Triggered on `INSERT` to `messages`
   - File: `supabase/messages_phase2.sql`

3. **`update_updated_at_column()`**: Updates `profiles.updated_at` on profile update
   - Triggered on `UPDATE` to `profiles`
   - File: `supabase/profile_upgrade.sql`

4. **Notification Triggers**:
   - `trigger_create_follow_notification`: Creates notification when user follows
   - `trigger_create_new_post_notification`: Creates notification when user posts
   - `trigger_create_message_notification`: Creates notification when message sent
   - File: `supabase/notifications.sql`

### File Paths

- **Main Schema**: `supabase/schema.sql`
- **RLS Policies**: `supabase/rls_policies.sql`
- **Profile Upgrade**: `supabase/profile_upgrade.sql`
- **Comments**: `supabase/comments.sql`
- **Messages**: `supabase/messages_phase2.sql`
- **Notifications**: `supabase/notifications.sql`
- **Post Media**: `supabase/post_media.sql`
- **Area Journals**: `supabase/area_journals.sql`

---

## 6. API Layer

### All `app/api/*` Routes

#### `/api/chat` (POST)

**File**: `app/api/chat/route.ts`

**What it does**:
- Receives chat message from frontend
- Currently **disabled** - returns `{ message: null }` to signal frontend to use fallback responses
- Intended for OpenAI integration (commented out)

**Request Body**:
```typescript
{
  message: string;
  areaContext?: { areaSlug, city, areaName, journalData };
  systemContext?: string;
}
```

**Response**:
```typescript
{ message: null } // Signals frontend to use fallback
```

**Auth Protection**: None (should be added)

**Who Calls It**: 
- `app/chat/page.tsx` - AI chatbot page

**Code Snippet**:
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, areaContext, systemContext } = body;
  
  // OpenAI integration disabled
  return NextResponse.json({ message: null });
}
```

### API Route Summary

| Route | Method | Auth | Purpose | Status |
|-------|--------|------|---------|--------|
| `/api/chat` | POST | None | OpenAI chat (disabled) | Returns null |

**Note**: All other data operations go directly to Supabase from the client (no API routes). This is a common pattern with Supabase + RLS.

---

## 7. File Uploads / Storage

### Supabase Storage Buckets

#### 1. `post-media` Bucket

**Purpose**: Store images uploaded with posts

**Setup**:
- Created via Supabase Dashboard → Storage
- Can be public or private (with RLS policies)
- Instructions: `supabase/storage_setup_instructions.md`

**RLS Policies** (if private):
- **INSERT**: Authenticated users can upload (`auth.role() = 'authenticated'`)
- **SELECT**: Anyone can view post media (`bucket_id = 'post-media'`)

**Usage**:
- **File**: `components/CreatePost.tsx`
- Uploads image file with path: `${userId}-${Date.now()}.${fileExt}`
- Gets public URL via `supabase.storage.from('post-media').getPublicUrl(filePath)`
- Stores URL in `posts.image_url` column

**Code**:
```typescript
const { error: uploadError } = await supabase.storage
  .from('post-media')
  .upload(filePath, imageFile, {
    cacheControl: '3600',
    upsert: false
  });

const { data: urlData } = supabase.storage
  .from('post-media')
  .getPublicUrl(filePath);
```

#### 2. `chat-media` Bucket

**Purpose**: Store images/files sent in direct messages

**Usage**:
- **File**: `app/messages/[conversationId]/page.tsx`
- Uploads file with path: `${conversationId}/${userId}-${Date.now()}.${fileExt}`
- Gets public URL or signed URL (for private files)
- Stores URL in `messages.content` (as part of message content)

**Code**:
```typescript
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('chat-media')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });
```

### Image Upload Flow

#### Post Image Upload

1. User selects image in `CreatePost.tsx`
2. File validated (type, size < 5MB)
3. Preview shown to user
4. On submit:
   - File uploaded to `post-media` bucket
   - Public URL generated
   - Post inserted with `image_url`
5. Image displayed in feed via `PostCard.tsx`

#### Message Media Upload

1. User selects file in chat input
2. File uploaded to `chat-media` bucket
3. URL stored in message content
4. Message displayed with image/file preview

### Permissions

- **Post Media**: Public bucket (or RLS: authenticated users can upload, anyone can view)
- **Chat Media**: Private bucket with RLS (only conversation participants can view)

**File**: `supabase/storage_setup_instructions.md` - Setup guide

---

## 8. Environment Variables

### Required Environment Variables

#### Client-Side (NEXT_PUBLIC_*)

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - **Type**: String
   - **Format**: `https://{project-ref}.supabase.co`
   - **Used In**: 
     - `lib/supabaseClient.ts` - Supabase client initialization
   - **Example**: `https://abcdefghijklmnop.supabase.co`

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - **Type**: String
   - **Format**: Long JWT token
   - **Used In**: 
     - `lib/supabaseClient.ts` - Supabase client initialization
   - **Security**: Public key, protected by RLS policies

#### Server-Side (Optional)

3. **`OPENAI_API_KEY`** (Optional)
   - **Type**: String
   - **Used In**: 
     - `app/api/chat/route.ts` - OpenAI integration (currently disabled)
   - **Status**: Not currently used (chat API disabled)

### Environment File

**File**: `.env.local` (not in repo, must be created)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
OPENAI_API_KEY=your-openai-key-here  # Optional
```

### Where Each Variable is Used

| Variable | Files Using It | Purpose |
|----------|---------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabaseClient.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabaseClient.ts` | Supabase anon key for client |
| `OPENAI_API_KEY` | `app/api/chat/route.ts` | OpenAI API (disabled) |

### Validation

**File**: `lib/supabaseClient.ts`

- Validates URL: Must start with `https://` and not contain "placeholder"
- Validates Key: Must be > 20 characters and not contain "placeholder"
- Logs errors in development if missing/invalid
- Falls back to placeholder values for build (prevents build errors)

---

## 9. Deployment

### Vercel Config

**File**: `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build"
}
```

### Build Commands

**File**: `package.json`

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**Build Process**:
1. Vercel runs `npm run build`
2. Next.js compiles TypeScript, bundles React, optimizes assets
3. Outputs to `.next/` directory
4. Vercel serves the built application

### Preview vs Production Behavior

#### Development (`npm run dev`)
- Runs on port 3001 (default)
- Hot reload enabled
- Source maps enabled
- Detailed error messages
- Webpack cache disabled in dev (prevents chunk load errors)

#### Production (`npm run build` + `npm start`)
- Optimized bundles
- Static pages pre-rendered
- API routes serverless
- Environment variables from Vercel dashboard
- No source maps (unless configured)

### Next.js Config

**File**: `next.config.js`

```javascript
{
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Dev mode: Disable chunk caching
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config, { dev, isServer }) => {
      if (dev && !isServer) {
        config.cache = false;
      }
      return config;
    },
  }),
}
```

### Deployment Checklist

1. **Environment Variables**: Set in Vercel Dashboard
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY` (optional)

2. **Database**: Run SQL migrations in Supabase SQL Editor
   - `schema.sql`
   - `rls_policies.sql`
   - `profile_upgrade.sql`
   - `comments.sql`
   - `messages_phase2.sql`
   - `notifications.sql`
   - `post_media.sql`
   - `area_journals.sql`

3. **Storage**: Create buckets in Supabase Dashboard
   - `post-media` (public or private)
   - `chat-media` (private with RLS)

4. **Realtime**: Enable replication for `messages` table in Supabase Dashboard

5. **Build**: Vercel automatically builds on git push

---

## 10. Security Review

### Auth Risks

#### ✅ Good Practices
1. **Email Normalization**: All emails trimmed and lowercased before auth operations
2. **Session Validation**: `getUser()` called after `getSession()` to validate tokens
3. **Auto Sign-Out**: 401/403 errors trigger automatic sign-out
4. **Stale Session Cleanup**: Clears localStorage on logout and errors
5. **Password Reset**: Uses Supabase's secure password reset flow

#### ⚠️ Potential Issues
1. **No Server-Side Auth Check**: All route protection is client-side
   - **Risk**: Users can access protected routes by disabling JavaScript
   - **Mitigation**: Add middleware or server-side checks (Next.js middleware)

2. **No Rate Limiting**: Login/register endpoints not rate-limited
   - **Risk**: Brute force attacks
   - **Mitigation**: Add rate limiting (Vercel Edge Functions or Supabase)

3. **No CSRF Protection**: API routes don't have CSRF tokens
   - **Risk**: Cross-site request forgery
   - **Mitigation**: Add CSRF tokens or use SameSite cookies

### RLS Mistakes

#### ✅ Good Practices
1. **All Tables Have RLS Enabled**: Every table has RLS policies
2. **User-Specific Policies**: Users can only modify their own data
3. **Conversation Access**: Messages only accessible to participants

#### ⚠️ Potential Issues
1. **Profiles SELECT Policy**: `USING (true)` allows all authenticated users to view all profiles
   - **Risk**: Privacy concern if profiles contain sensitive data
   - **Mitigation**: Consider restricting to followers or public profiles only

2. **Posts SELECT Policy**: `USING (true)` allows all authenticated users to view all posts
   - **Risk**: No private posts feature
   - **Mitigation**: Add `is_public` column and update policy

3. **Area Journals Admin Check**: Uses `profiles.role = 'admin'` but `role` column may not exist
   - **Risk**: Admin policies may not work
   - **Mitigation**: Add `role` column to `profiles` or use service role

### Exposed Keys

#### ✅ Good Practices
1. **Anon Key is Public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (protected by RLS)
2. **No Service Role in Code**: Service role key not used in client code

#### ⚠️ Potential Issues
1. **No API Key Validation**: Chat API doesn't check for valid session
   - **Risk**: Unauthorized API usage
   - **Mitigation**: Add auth check in API route

### How to Harden

1. **Add Next.js Middleware**:
   ```typescript
   // middleware.ts
   import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
   export async function middleware(req) {
     const res = NextResponse.next()
     const supabase = createMiddlewareClient({ req, res })
     const { data: { session } } = await supabase.auth.getSession()
     if (!session && req.nextUrl.pathname.startsWith('/feed')) {
       return NextResponse.redirect(new URL('/login', req.url))
     }
     return res
   }
   ```

2. **Add Rate Limiting**: Use Vercel Edge Functions or Supabase rate limiting

3. **Add CSRF Protection**: Use Next.js CSRF middleware

4. **Restrict Profile Access**: Update RLS policies to limit profile visibility

5. **Add Input Validation**: Validate all inputs server-side (API routes)

6. **Add Content Security Policy**: Set CSP headers in `next.config.js`

---

## 11. Bugs & Weak Points

### Current Issues

#### 1. **Client-Side Route Protection Only**
- **Location**: All protected pages (`app/feed/page.tsx`, `app/messages/page.tsx`, etc.)
- **Issue**: Users can bypass protection by disabling JavaScript
- **Fix**: Add Next.js middleware for server-side protection

#### 2. **No Rate Limiting**
- **Location**: Login/register forms, API routes
- **Issue**: Vulnerable to brute force attacks
- **Fix**: Add rate limiting (Vercel or Supabase)

#### 3. **Chat API Not Protected**
- **Location**: `app/api/chat/route.ts`
- **Issue**: No auth check before processing requests
- **Fix**: Add session validation in API route

#### 4. **Area Journals Admin Check May Fail**
- **Location**: `supabase/area_journals.sql` - RLS policies check `profiles.role = 'admin'`
- **Issue**: `role` column may not exist in `profiles` table
- **Fix**: Add `role` column to `profiles` or remove admin check

#### 5. **No Input Sanitization**
- **Location**: Post content, comments, messages
- **Issue**: XSS risk if content is rendered unsafely
- **Fix**: Use React's default escaping (already done) or add DOMPurify

#### 6. **Memory Fallback for Storage**
- **Location**: `lib/supabaseClient.ts` - Memory Map fallback
- **Issue**: Session lost on page refresh if localStorage blocked
- **Fix**: Acceptable trade-off, but could add server-side session storage

### Performance Problems

#### 1. **N+1 Queries in Feed**
- **Location**: `app/feed/page.tsx`
- **Issue**: Separate queries for profiles, likes, comments
- **Fix**: Use Supabase joins or batch queries (partially done)

#### 2. **No Pagination**
- **Location**: Feed, messages inbox
- **Issue**: Loads all posts/conversations at once
- **Fix**: Add pagination with `limit()` and `offset()`

#### 3. **No Caching**
- **Location**: All data fetching
- **Issue**: Repeated queries for same data
- **Fix**: Add React Query or SWR for caching

#### 4. **Large Image Uploads**
- **Location**: `components/CreatePost.tsx`
- **Issue**: 5MB limit but no compression
- **Fix**: Add image compression before upload

### Code Smells

#### 1. **Duplicate Route Protection Logic**
- **Location**: Every protected page has same `useEffect` pattern
- **Fix**: Create `withAuth` HOC or custom hook

#### 2. **Error Handling Inconsistency**
- **Location**: Various files
- **Issue**: Some use `normalizeSupabaseError`, others don't
- **Fix**: Standardize error handling

#### 3. **Magic Numbers**
- **Location**: Timeout values (8000ms, 10000ms)
- **Issue**: Hard-coded timeout values
- **Fix**: Extract to constants

#### 4. **Console.logs in Production**
- **Location**: Many files
- **Issue**: Debug logs left in code
- **Fix**: Use `debugLog()` helper (already exists) or remove

### Exact File Locations

| Issue | File | Line(s) | Fix |
|-------|------|--------|-----|
| Client-side route protection | `app/feed/page.tsx` | 262-270 | Add middleware |
| No rate limiting | `components/LoginForm.tsx` | 184+ | Add rate limiting |
| Chat API not protected | `app/api/chat/route.ts` | 16+ | Add auth check |
| Admin role check | `supabase/area_journals.sql` | 92 | Add role column |
| N+1 queries | `app/feed/page.tsx` | 150-216 | Use joins |
| No pagination | `app/feed/page.tsx` | 106 | Add pagination |
| Duplicate protection logic | All protected pages | Various | Create HOC |

---

## 12. Architecture Diagram

### Text Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Next.js    │  │   React      │  │  Tailwind    │          │
│  │   App Router │  │   Components │  │     CSS     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│  ┌──────▼─────────────────▼──────────────────▼───────┐          │
│  │         AuthContext (React Context)               │          │
│  │  - Manages session state                          │          │
│  │  - Handles login/register/logout                  │          │
│  └──────┬────────────────────────────────────────────┘          │
│         │                                                        │
│  ┌──────▼────────────────────────────────────────────┐          │
│  │      Supabase Client (lib/supabaseClient.ts)      │          │
│  │  - localStorage session storage                     │          │
│  │  - Auto-refresh tokens                             │          │
│  │  - 401 handler (auto sign-out)                    │          │
│  └──────┬────────────────────────────────────────────┘          │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │ HTTPS (REST API)
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Auth Service                       │   │
│  │  - Email/password authentication                         │   │
│  │  - JWT token generation                                 │   │
│  │  - Session management                                   │   │
│  │  - Password reset emails                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         PostgREST API (Database)                         │   │
│  │  - profiles, posts, likes, follows, comments            │   │
│  │  - conversations, messages, notifications                │   │
│  │  - area_journals                                         │   │
│  │  - Row Level Security (RLS) policies                     │   │
│  └──────────────────┬──────────────────────────────────────┘   │
│                     │                                            │
│  ┌──────────────────▼──────────────────────────────────────┐   │
│  │         PostgreSQL Database                             │   │
│  │  - Tables with RLS enabled                              │   │
│  │  - Triggers (auto-create profile, notifications)         │   │
│  │  - Indexes for performance                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Supabase Storage                                │   │
│  │  - post-media bucket (public images)                    │   │
│  │  - chat-media bucket (private messages)                 │   │
│  │  - RLS policies for access control                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Realtime Subscriptions                          │   │
│  │  - messages table (real-time chat)                      │   │
│  │  - WebSocket connections                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
          │
          │ HTTPS
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                    VERCEL DEPLOYMENT                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Next.js API Routes                              │   │
│  │  - /api/chat (OpenAI integration - disabled)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Serverless Functions                            │   │
│  │  - Handles API routes                                   │   │
│  │  - Environment variables from Vercel                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### Data Flow Examples

#### Login Flow
```
User → LoginForm → AuthContext.login() → Supabase Auth → JWT Token → localStorage → AuthContext State → Redirect to /feed
```

#### Create Post Flow
```
User → CreatePost → Upload Image to Storage → Get Public URL → Insert Post to DB → RLS Check → Refresh Feed
```

#### Send Message Flow
```
User → ChatInput → Find/Create Conversation → Insert Message → Realtime Subscription → Update UI
```

#### Load Feed Flow
```
User → FeedPage → Load Posts → Load Profiles → Load Likes → Load Comments → Merge Data → Render Posts
```

---

## Summary

This is a **Next.js 15** application using **Supabase** for backend services (auth, database, storage, realtime). The architecture is **client-side heavy** with minimal API routes. All data operations go directly to Supabase from the browser, protected by **Row Level Security (RLS)** policies.

**Key Strengths**:
- Modern tech stack (Next.js 15, React 18, TypeScript)
- Comprehensive RLS policies
- Real-time messaging
- Robust error handling and session management
- Safe storage fallback for blocked localStorage

**Key Weaknesses**:
- Client-side route protection only
- No rate limiting
- No server-side validation
- No pagination
- Some code duplication

**Recommendations**:
1. Add Next.js middleware for server-side route protection
2. Implement rate limiting
3. Add pagination to feed and messages
4. Standardize error handling
5. Add input validation server-side

---

**Document Generated**: 2025-01-XX
**Project**: Meta Real Estate
**Framework**: Next.js 15.5.9
**Database**: Supabase (PostgreSQL)
