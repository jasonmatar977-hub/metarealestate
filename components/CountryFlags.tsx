"use client";

/**
 * Country Flags Selector Component
 * Lightweight, responsive country/language selector
 */

import { useState } from "react";

const COUNTRIES = [
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
];

export default function CountryFlags() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    setIsOpen(false);
    // TODO: Handle country selection (navigation, filtering, etc.)
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-xl border-2 border-gold/40 hover:border-gold transition-colors bg-white/80"
        aria-label="Select country"
      >
        <span className="text-2xl">
          {selectedCountry
            ? COUNTRIES.find((c) => c.code === selectedCountry)?.flag
            : "🌍"}
        </span>
        <span className="hidden sm:inline text-sm font-semibold text-gray-700">
          {selectedCountry
            ? COUNTRIES.find((c) => c.code === selectedCountry)?.name
            : "Select Country"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-64 max-w-[90vw] glass-dark rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
            <div className="p-2">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country.code)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gold/20 transition-colors ${
                    selectedCountry === country.code ? "bg-gold/30" : ""
                  }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="text-gray-700 font-semibold">{country.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


















