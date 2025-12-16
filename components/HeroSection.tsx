"use client";

/**
 * Hero Section Component
 * Main landing section with title, subtitle, and CTA buttons
 */

import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 px-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-dark/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h1 className="font-orbitron text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent animate-pulse">
          META REAL ESTATE
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-4 font-semibold">
          The Future of Property Discovery
        </p>
        <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Discover properties, gain insights, and connect with opportunities through cutting-edge AI technology
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/login"
            className="px-8 py-4 bg-white border-2 border-gold text-gold font-bold rounded-xl hover:bg-gold hover:text-gray-900 transition-all text-lg shadow-lg hover:shadow-xl hover:scale-105"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all text-lg shadow-lg"
          >
            Create Account
          </Link>
        </div>
      </div>
    </section>
  );
}

