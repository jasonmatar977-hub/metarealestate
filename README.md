# Meta Real Estate - Next.js 15 Application

A modern, AI-powered real estate platform built with Next.js 15, React, and Tailwind CSS. This application provides property listings, a social feed, and an AI chatbot integrated with OpenAI.

## 🚀 Features

- **Modern Landing Page**: Futuristic 2050-style design with glassmorphism effects
- **Authentication System**: Login and registration flows with comprehensive validation (Supabase Auth)
- **Property Listings**: Enhanced listings with search, filters, and sorting
- **News Feed**: Instagram/Facebook-style vertical feed with posts, likes, and comments
- **User Profiles**: Instagram-like profile pages with edit functionality
- **Direct Messages (DM)**: Real-time messaging system with conversation inbox and chat views
- **Follow System**: Follow/unfollow users and view posts from people you follow
- **User Search**: Search for users by name and start conversations
- **AI Chatbot**: Full integration with OpenAI ChatGPT API (currently disabled for deployment)
- **Multi-Language Support**: i18n with English, Arabic (RTL), Chinese, and German
- **Comments System**: Full comment and comment-like functionality on feed posts
- **Professional Footer**: Modern footer with brand, links, contact, and social icons
- **Responsive Design**: Mobile-first, fully responsive across all devices
- **Security Hardened**: Front-end validation, security patterns, and best practices

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **AI Integration**: OpenAI API (GPT-4o-mini)
- **Fonts**: Orbitron & Rajdhani (Google Fonts)

## 📁 Project Structure

```
myproject/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── chat/          # OpenAI chat endpoint
│   ├── chat/              # Chat page
│   ├── feed/              # News feed page
│   ├── listings/          # Property listings page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── messages/          # Direct messages (inbox and chat)
│   ├── search/            # User search page
│   ├── u/[id]/            # Public user profile page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Navbar.tsx         # Navigation bar with language switcher
│   ├── HeroSection.tsx    # Landing hero
│   ├── AboutSection.tsx   # About section
│   ├── WhatWeDoSection.tsx # Services section
│   ├── TestimonialsSection.tsx # Testimonials
│   ├── ContactSection.tsx # Contact form (Formspree)
│   ├── LoginForm.tsx      # Login form
│   ├── RegisterForm.tsx   # Registration form
│   ├── PropertyCard.tsx   # Enhanced property card component
│   ├── PostCard.tsx       # Feed post component with comments
│   ├── Comments.tsx       # Comments component for posts
│   ├── CreatePost.tsx     # Create post component
│   ├── ChatMessage.tsx    # Chat message component
│   ├── ChatInput.tsx      # Chat input component
│   ├── LanguageSwitcher.tsx # Language dropdown
│   └── Footer.tsx         # Professional footer
├── contexts/              # React contexts
│   ├── AuthContext.tsx    # Authentication context (Supabase)
│   └── LanguageContext.tsx # i18n language context
├── lib/                   # Utility functions
│   ├── validation.ts      # Form validation helpers
│   ├── supabaseClient.ts  # Supabase client
│   └── messages.ts        # DM helper functions (find/create conversations)
├── supabase/              # Database SQL files
│   ├── schema.sql         # Main database schema
│   ├── rls_policies.sql   # RLS policies
│   ├── profile_upgrade.sql # Profile enhancements
│   ├── comments.sql       # Comments tables
│   └── messages_phase2.sql # DM tables (conversations, messages)
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── tailwind.config.ts     # Tailwind CSS config
└── next.config.js         # Next.js config
```

## 🏃 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   Get these values from your Supabase project settings → API

3. **Set up database:**
   - Open your Supabase project dashboard
   - Go to SQL Editor
   - Run SQL files in this order:
     1. `supabase/schema.sql` - Creates main tables (profiles, posts, likes, follows)
     2. `supabase/rls_policies.sql` - Sets up Row Level Security policies
     3. `supabase/profile_upgrade.sql` - Adds profile fields (bio, avatar_url, location, etc.)
     4. `supabase/comments.sql` - Creates comments and comment_likes tables
     5. `supabase/messages_phase2.sql` - Creates conversations, conversation_participants, and messages tables for DM
   - **Enable Realtime**: Go to Database → Replication → Enable replication for `messages` table

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The dev server runs on **port 3001** by default. Open [http://localhost:3001](http://localhost:3001)

   **Important:** If you encounter "ChunkLoadError", see [DEV_SETUP.md](./DEV_SETUP.md) for troubleshooting.

### Supabase Setup

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions on:
- Setting up environment variables
- Creating database tables
- Configuring Row Level Security
- Troubleshooting

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## 📝 Routes

- `/` - Landing page with hero, about, services, testimonials, and contact sections
- `/login` - Login page (redirects to `/feed` on success)
- `/register` - Registration page (redirects to `/feed` on success)
- `/listings` - Enhanced property listings with search, filters, and sorting (protected)
- `/feed` - News feed with posts, likes, and comments (protected)
- `/profile` - User profile page (protected)
- `/messages` - Direct messages inbox showing all conversations (protected)
- `/messages/[conversationId]` - Individual chat view with realtime updates (protected)
- `/search` - User search page to find and follow users (protected)
- `/u/[id]` - Public user profile page with follow/message buttons (protected)
- `/profile/edit` - Edit profile page (protected)
- `/chat` - AI chatbot page (protected, currently disabled)

## 🔐 Security Features

### Front-End Security

- **Input Validation**: Comprehensive validation on all forms
- **XSS Prevention**: No `dangerouslySetInnerHTML` usage
- **Route Protection**: Front-end guards on protected routes
- **Secure Patterns**: Security-hardened code patterns throughout

### Backend Security (TODO)

The following must be implemented on the backend:

- **Server-Side Validation**: All inputs must be validated server-side
- **Password Hashing**: Use bcrypt or argon2 (never store plain passwords)
- **JWT/Session Management**: Secure token-based authentication
- **CSRF Protection**: Implement CSRF tokens
- **Rate Limiting**: Prevent abuse of API endpoints
- **Input Sanitization**: Sanitize all user inputs before processing

## 🎨 Design Features

- **Glassmorphism**: Modern glass-effect UI elements
- **Gradient Backgrounds**: Subtle gradients throughout
- **Smooth Animations**: Hover effects and transitions
- **Responsive Grid**: Mobile-first responsive layouts
- **Gold Accent Colors**: Consistent gold (#d4af37) theme
- **Modern Typography**: Orbitron for headings, Rajdhani for body

## 📱 Responsive Breakpoints

- Mobile: < 640px (1 column layouts)
- Tablet: 640px - 1024px (2 column layouts)
- Desktop: > 1024px (3-4 column layouts)

## 🌍 Internationalization (i18n)

The application supports multiple languages:
- **English** (default) - LTR
- **Arabic** (العربية) - RTL support
- **Chinese** (中文) - LTR
- **German** (Deutsch) - LTR

Language preference is stored in localStorage and persists across sessions. The language switcher is available in the navbar.

## 🤖 AI Chatbot

The chatbot currently uses mock responses (OpenAI integration disabled for deployment).
- Answers real estate questions
- Helps with property searches
- Guides users through the platform
- Provides basic market insights

**Note**: OpenAI integration can be re-enabled later by updating `app/chat/page.tsx` and `app/api/chat/route.ts`.

## 🧪 Testing

The application now uses Supabase for:
- ✅ User authentication (email/password)
- ✅ User profiles with edit functionality
- ✅ Feed posts (create, read, like)
- ✅ Comments on posts (create, read, like)
- ✅ Multi-language support with RTL for Arabic
- ⚠️ Property listings (still using mock data - can be migrated to Supabase)

## 📊 Database Schema

The application uses Supabase with the following tables:
- `profiles` - User profile information (display_name, bio, avatar_url, location, phone, website)
- `posts` - Feed posts (content, user_id, created_at)
- `likes` - Post likes (post_id, user_id)
- `comments` - Post comments (post_id, user_id, content, created_at)
- `comment_likes` - Comment likes (comment_id, user_id)
- `follows` - User follows (ready for future use)

All tables have Row Level Security (RLS) enabled for data protection.

### SQL Files to Run (in order):
1. `supabase/schema.sql` - Main schema
2. `supabase/rls_policies.sql` - RLS policies
3. `supabase/profile_upgrade.sql` - Profile enhancements
4. `supabase/comments.sql` - Comments system

## 📄 License

Copyright © Meta Real Estate

## 👨‍💻 Development Notes

### Code Organization

- **Clear File Names**: All files use descriptive, easy-to-understand names
- **Comments**: Extensive comments explaining security considerations and functionality
- **Component Structure**: Reusable, well-organized components
- **Type Safety**: Full TypeScript support for type safety

### Future Enhancements

- [ ] Backend API integration
- [ ] Real authentication with JWT
- [ ] Database integration
- [ ] Image upload functionality
- [ ] Advanced property search filters
- [ ] User profiles
- [ ] Email notifications
- [ ] Payment integration

## 🐛 Troubleshooting

### Chatbot not working?
- Ensure `OPENAI_API_KEY` is set in `.env.local`
- Check that the API key is valid and has credits
- Review browser console for errors

### Build errors?
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (requires 18+)
- Clear `.next` folder and rebuild

### Styling issues?
- Ensure Tailwind CSS is properly configured
- Check that `globals.css` is imported in `layout.tsx`
- Verify PostCSS configuration

---

**Built with ❤️ for the future of real estate**
