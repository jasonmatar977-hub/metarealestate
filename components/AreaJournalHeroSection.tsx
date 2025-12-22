"use client";

/**
 * Area Journal Hero Section Component
 * Journal-first hero section emphasizing clarity and trust
 */

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export default function AreaJournalHeroSection() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center pt-24 px-4 pb-12">
      {/* Softer background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gold-dark/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-light/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Trust badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 mb-8 bg-white/70 backdrop-blur-sm rounded-full border border-gold/30 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-gold text-lg">✓</span>
          <span className="text-sm font-semibold text-gray-700">Real Insights, Not Noise</span>
        </div>

        <h1 className="font-orbitron text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900 leading-tight px-4">
          Clarity & Trust in
          <br />
          <span className="bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
            Real Estate Decisions
          </span>
        </h1>
        
        <p className="text-xl sm:text-2xl md:text-3xl text-gray-700 mb-4 font-medium max-w-3xl mx-auto px-4 leading-relaxed">
          Understand areas before you decide.
        </p>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-12 max-w-3xl mx-auto px-4 leading-relaxed">
          Get clear, structured insights into each neighborhood's reality, outlook, and what's driving change—so you can make decisions with confidence.
        </p>
        
        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10 px-4">
          <Link
            href={isAuthenticated ? "/journal" : "/login"}
            className="px-10 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all text-lg min-w-[220px] shadow-lg"
          >
            Explore Area Journal
          </Link>
          <Link
            href={isAuthenticated ? "/listings" : "/login"}
            className="px-10 py-4 bg-white border-2 border-gold text-gold font-bold rounded-xl hover:bg-gold/10 hover:shadow-xl transition-all text-lg min-w-[220px]"
          >
            Browse Listings
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 px-4 text-sm md:text-base text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-gold text-lg">✓</span>
            <span className="font-medium">No fake listings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gold text-lg">✓</span>
            <span className="font-medium">No hidden agendas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gold text-lg">✓</span>
            <span className="font-medium">No paid opinions</span>
          </div>
        </div>
      </div>
    </section>
  );
}

