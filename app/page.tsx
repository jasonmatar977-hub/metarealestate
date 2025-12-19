/**
 * Landing Page (Root Route: /)
 * Modern landing page with hero, about, services, testimonials, and contact sections
 * 
 * Safe for logged-out users - no auth state required
 */

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import WhatWeDoSection from "@/components/WhatWeDoSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <WhatWeDoSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
    </main>
  );
}

