"use client";

/**
 * Modern Navbar Component
 * Fixed/sticky navbar with glassmorphism effect and smooth transitions
 * Fully responsive with hamburger menu on mobile
 */

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationsBell from "@/components/NotificationsBell";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const unreadCount = useUnreadMessages();

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
                  {t('navbar.about')}
                </a>
                <a href="#what-we-do" className="text-gray-700 hover:text-gold transition-colors font-semibold">
                  {t('navbar.whatWeDo')}
                </a>
                <a href="#testimonials" className="text-gray-700 hover:text-gold transition-colors font-semibold">
                  {t('navbar.testimonials')}
                </a>
                <a href="#contact" className="text-gray-700 hover:text-gold transition-colors font-semibold">
                  {t('navbar.contact')}
                </a>
              </div>
            )}

            {/* Auth Buttons / User Menu - Desktop */}
            {isAuthenticated ? (
              <>
                <Link
                  href="/listings"
                  className="px-2 md:px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold text-sm md:text-base"
                >
                  <span className="hidden sm:inline">{t('navbar.listings')}</span>
                  <span className="sm:hidden">List</span>
                </Link>
                <Link
                  href="/feed"
                  className="px-2 md:px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold text-sm md:text-base"
                >
                  {t('navbar.feed')}
                </Link>
                <Link
                  href="/journal"
                  className="px-2 md:px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold text-sm md:text-base"
                >
                  <span className="hidden sm:inline">{t('navbar.journal')}</span>
                  <span className="sm:hidden">Journal</span>
                </Link>
                <Link
                  href="/search"
                  className="px-2 md:px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold"
                  title="Search Users"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </Link>
                <Link
                  href="/messages"
                  className="px-2 md:px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold relative text-sm md:text-base"
                >
                  <span className="hidden sm:inline">Messages</span>
                  <span className="sm:hidden">💬</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gold text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                {/* Admin Link - Only visible for admins */}
                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="px-2 md:px-4 py-2 text-gray-700 hover:text-gold transition-colors font-semibold text-sm md:text-base"
                    title="Admin Dashboard"
                  >
                    <span className="hidden sm:inline">Admin</span>
                    <span className="sm:hidden">⚙️</span>
                  </Link>
                )}
                <NotificationsBell />
                <LanguageSwitcher />
                {/* Profile Dropdown - Only avatar icon visible */}
                <ProfileDropdown />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-6 py-2 bg-white border-2 border-gold text-gold font-bold rounded-xl hover:bg-gold hover:text-gray-900 transition-all"
                >
                  {t('common.login')}
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                >
                  {t('common.createAccount')}
                </Link>
                <LanguageSwitcher />
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
                    {t('navbar.about')}
                  </a>
                  <a
                    href="#what-we-do"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    {t('navbar.whatWeDo')}
                  </a>
                  <a
                    href="#testimonials"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    {t('navbar.testimonials')}
                  </a>
                  <a
                    href="#contact"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    {t('navbar.contact')}
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
                    {t('navbar.listings')}
                  </Link>
                  <Link
                    href="/feed"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    {t('navbar.feed')}
                  </Link>
                  <Link
                    href="/journal"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    {t('navbar.journal')}
                  </Link>
                  <Link
                    href="/search"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </Link>
                  <Link
                    href="/messages"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg relative"
                  >
                    Messages
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-gold text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  {/* Admin Link - Only visible for admins (Mobile) */}
                  {user?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    {t('common.profile')}
                  </Link>
                  <Link
                    href="/profile/edit"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 text-gray-700 hover:text-gold hover:bg-gold/10 transition-colors font-semibold rounded-lg"
                  >
                    {t('common.editProfile')}
                  </Link>
                  <div className="px-4 py-2">
                    <LanguageSwitcher />
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      closeMobileMenu();
                      window.location.href = '/login';
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 transition-colors font-semibold rounded-lg text-left"
                  >
                    {t('common.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 bg-white border-2 border-gold text-gold font-bold rounded-xl hover:bg-gold hover:text-gray-900 transition-all text-center"
                  >
                    {t('common.login')}
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobileMenu}
                    className="px-4 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl text-center"
                  >
                    {t('common.createAccount')}
                  </Link>
                  <div className="px-4 py-2">
                    <LanguageSwitcher />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
