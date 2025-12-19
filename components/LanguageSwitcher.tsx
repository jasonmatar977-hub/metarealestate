"use client";

/**
 * Language Switcher Component
 * Dropdown to switch between supported languages
 * Shows globe icon and current language
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useRef, useEffect } from "react";

type Locale = 'en' | 'ar' | 'zh' | 'de';

const languages: { code: Locale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
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

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gold/20 transition-colors"
        aria-label="Change language"
      >
        <span className="text-xl">🌐</span>
        <span className="hidden sm:inline text-sm font-semibold text-gray-700">
          {currentLanguage.flag} {currentLanguage.name}
        </span>
        <span className="sm:hidden text-sm font-semibold text-gray-700">
          {currentLanguage.flag}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 glass-dark rounded-xl shadow-lg z-50 overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gold/20 transition-colors ${
                locale === lang.code ? 'bg-gold/30' : ''
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="font-semibold text-gray-700">{lang.name}</span>
              {locale === lang.code && (
                <span className="ml-auto text-gold">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}













