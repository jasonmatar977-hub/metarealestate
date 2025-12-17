"use client";

/**
 * Modern Navbar Component
 * Fixed/sticky navbar with glassmorphism effect and smooth transitions
 * Fully responsive with hamburger menu on mobile
 */

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark rounded-b-3xl shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Responsive sizing */}
          <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <span className="font-orbitron text-lg sm:text-xl md:text-2xl font-black bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
              <span className="hidden sm:inline">META REAL ESTATE</span>
              <span className="sm:hidden">MRE</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Navigation Links - Desktop */}
            {pathname === '/' && (
              <div className="flex items-center space-x-8 mr-4">
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

            {/* Auth Buttons / User Menu - Desktop */}
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

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gold/20 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gold/20 py-4 mt-2">
            <div className="flex flex-col space-y-3">
              {/* Navigation Links - Mobile */}
              {pathname === '/' && (
                <>
                  <a
                    href="#about"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    About
                  </a>
                  <a
                    href="#what-we-do"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    What We Do
                  </a>
                  <a
                    href="#testimonials"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    Testimonials
                  </a>
                  <a
                    href="#contact"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    Contact
                  </a>
                </>
              )}

              {/* Auth Links - Mobile */}
              {isAuthenticated ? (
                <>
                  <Link
                    href="/listings"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    Listings
                  </Link>
                  <Link
                    href="/feed"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    Feed
                  </Link>
                  <Link
                    href="/chat"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    Chat
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 bg-white border-2 border-gold text-gold font-bold rounded-xl hover:bg-gold hover:text-gray-900 transition-all text-center"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl text-center"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
