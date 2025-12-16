/**
 * Landing Page (Root Route: /)
 * Modern landing page with hero, about, services, testimonials, and contact sections
 */

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import WhatWeDoSection from "@/components/WhatWeDoSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <WhatWeDoSection />
      <TestimonialsSection />
      <ContactSection />
      
      {/* Footer */}
      <footer className="py-8 px-4 text-center text-gray-600 glass-dark rounded-t-3xl">
        <p>Copyright © {new Date().getFullYear()} Meta Real Estate. All rights reserved.</p>
      </footer>
    </main>
  );
}

