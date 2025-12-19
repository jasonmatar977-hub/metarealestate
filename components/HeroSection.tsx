"use client";

/**
 * Hero Section Component
 * Main landing section with title, subtitle, and CTA buttons
 */

import Link from "next/link";
import CountryFlags from "@/components/CountryFlags";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HeroSection() {
  const { t } = useLanguage();
  
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 px-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-dark/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h1 className="font-orbitron text-4xl sm:text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent animate-pulse px-4">
          {t('home.title')}
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-4 font-semibold px-4">
          {t('home.subtitle')}
        </p>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto px-4">
          {t('home.description')}
        </p>
        
        {/* Country Flags Selector */}
        <div className="mb-8 flex justify-center px-4">
          <CountryFlags />
        </div>
        
        {/* CTA buttons removed - auth actions are available in Navbar */}
      </div>
    </section>
  );
}

