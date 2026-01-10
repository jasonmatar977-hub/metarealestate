"use client";

/**
 * Floating AI Button Component
 * Modern circular button fixed to bottom-right
 * Routes to AI chat page (/chat)
 * Hidden on login and register pages
 */

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function FloatingAiButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Hide on login, register, and chat pages
  const hiddenPaths = ['/login', '/register', '/chat'];
  if (hiddenPaths.includes(pathname) || !isAuthenticated) {
    return null;
  }

  const handleClick = () => {
    router.push('/chat');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-gold to-gold-light rounded-full shadow-2xl hover:shadow-gold/50 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
      aria-label="AI Assistance"
      title="AI Assistance"
    >
      <svg
        className="w-7 h-7 md:w-8 md:h-8 text-gray-900 group-hover:rotate-12 transition-transform duration-300"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </button>
  );
}
