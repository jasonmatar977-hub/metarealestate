"use client";

/**
 * Mobile Bottom Navigation
 * Instagram-like bottom nav for mobile devices
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MobileBottomNav() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  if (!isAuthenticated) return null;

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

  const navItems = [
    { href: '/feed', icon: '🏠', label: t('navbar.feed') || 'Feed' },
    { href: '/messages', icon: '💬', label: 'Messages' },
    { href: '/profile', icon: getInitials(), label: t('common.profile') || 'Profile', isAvatar: true },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-gold/20">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/feed' && pathname === '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-gold' : 'text-gray-600'
              }`}
            >
              {item.isAvatar ? (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-xs ${
                  isActive ? 'ring-2 ring-gold' : ''
                }`}>
                  {item.icon}
                </div>
              ) : (
                <span className="text-2xl mb-1">{item.icon}</span>
              )}
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}




















