"use client";

/**
 * Modern Navbar Component
 * Fixed/sticky navbar with glassmorphism effect and smooth transitions
 */

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark rounded-b-3xl shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-orbitron text-2xl font-black bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
              META REAL ESTATE
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          {pathname === '/' && (
            <div className="hidden md:flex items-center space-x-8">
              <a href="#about" className="text-gray-700 hover:text-gold transition-colors font-semibold">
                About
              </a>
              <a href="#what-we-do" className="text-gray-700 hover:text-gold transition-colors font-semibold">
                What We Do
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-gold transition-colors font-semibold">
                Testimonials
              </a>
              <a href="#contact" className="text-gray-700 hover:text-gold transition-colors font-semibold">
                Contact
              </a>
            </div>
          )}

          {/* Auth Buttons / User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/listings"
                  className="px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold"
                >
                  Listings
                </Link>
                <Link
                  href="/feed"
                  className="px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold"
                >
                  Feed
                </Link>
                <Link
                  href="/chat"
                  className="px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold"
                >
                  Chat
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-6 py-2 bg-white border-2 border-gold text-gold font-bold rounded-xl hover:bg-gold hover:text-gray-900 transition-all"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

