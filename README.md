# Meta Real Estate - Next.js 15 Application

A modern, AI-powered real estate platform built with Next.js 15, React, and Tailwind CSS. This application provides property listings, a social feed, and an AI chatbot integrated with OpenAI.

## 🚀 Features

- **Modern Landing Page**: Futuristic 2050-style design with glassmorphism effects
- **Authentication System**: Login and registration flows with comprehensive validation
- **Property Listings**: Responsive grid of property cards
- **News Feed**: Instagram/Facebook-style vertical feed
- **AI Chatbot**: Full integration with OpenAI ChatGPT API
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
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Navbar.tsx         # Navigation bar
│   ├── HeroSection.tsx    # Landing hero
│   ├── AboutSection.tsx   # About section
│   ├── WhatWeDoSection.tsx # Services section
│   ├── TestimonialsSection.tsx # Testimonials
│   ├── ContactSection.tsx # Contact form
│   ├── LoginForm.tsx      # Login form
│   ├── RegisterForm.tsx   # Registration form
│   ├── PropertyCard.tsx   # Property card component
│   ├── PostCard.tsx       # Feed post component
│   ├── ChatMessage.tsx    # Chat message component
│   └── ChatInput.tsx      # Chat input component
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── lib/                   # Utility functions
│   └── validation.ts      # Form validation helpers
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── tailwind.config.ts     # Tailwind CSS config
└── next.config.js         # Next.js config
```

## 🏃 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- OpenAI API key (for chatbot functionality)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

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
- `/login` - Login page (redirects to `/listings` on success)
- `/register` - Registration page (redirects to `/listings` on success)
- `/listings` - Property listings page (protected, requires authentication)
- `/feed` - News feed page (protected, requires authentication)
- `/chat` - AI chatbot page (protected, requires authentication)

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

## 🤖 AI Chatbot

The chatbot uses OpenAI's GPT-4o-mini model and is configured to:
- Answer real estate questions
- Help with property searches
- Guide users through the platform
- Provide market insights

**Note**: Make sure to set your `OPENAI_API_KEY` in `.env.local` for the chatbot to work.

## 🧪 Testing

Currently, the application uses mock data for:
- Property listings
- News feed posts
- Authentication (front-end only)

In production, these should be replaced with real API calls to a backend service.

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
