"use client";

/**
 * Profile Dropdown Component
 * Shows user menu with profile link and logout option
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push('/login');
  };

  const getInitials = () => {
    if (user?.displayName || user?.name || user?.email) {
      return (user.displayName || user.name || user.email)
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold hover:shadow-lg transition-all flex-shrink-0"
        title={t('common.profile')}
        aria-label={t('common.profile')}
      >
        {getInitials()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 glass-dark rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gold/20">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {user?.displayName || user?.name || user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          </div>
          
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-gold/20 transition-colors text-sm"
            >
              {t('common.profile')}
            </Link>
            <Link
              href="/profile/edit"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-gold/20 transition-colors text-sm"
            >
              {t('common.editProfile')}
            </Link>
          </div>

          <div className="border-t border-gold/20 py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}













