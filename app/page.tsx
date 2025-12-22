/**
 * Landing Page (Root Route: /)
 * Area Journal-first landing page with enhanced clarity and trust messaging
 * 
 * Safe for logged-out users - no auth state required
 */

import Navbar from "@/components/Navbar";
import AreaJournalHeroSection from "@/components/AreaJournalHeroSection";
import PlatformPurposeSection from "@/components/PlatformPurposeSection";
import WhoIsThisForSection from "@/components/WhoIsThisForSection";
import ProblemWeSolveSection from "@/components/ProblemWeSolveSection";
import AboutSection from "@/components/AboutSection";
import WhatWeDoSection from "@/components/WhatWeDoSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      {/* Area Journal-first hero */}
      <AreaJournalHeroSection />
      {/* New sections explaining platform purpose */}
      <PlatformPurposeSection />
      <WhoIsThisForSection />
      <ProblemWeSolveSection />
      {/* Existing sections */}
      <AboutSection />
      <WhatWeDoSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
    </main>
  );
}

