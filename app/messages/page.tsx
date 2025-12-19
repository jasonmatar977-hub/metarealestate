"use client";

/**
 * Messages Page (Placeholder)
 * Route: /messages
 * Instagram-like messages interface (placeholder for now)
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function MessagesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen pb-20">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-center mb-4 text-gold-dark">
            {t('navbar.messages') || 'Messages'}
          </h1>
          <div className="glass-dark rounded-2xl p-12 text-center">
            <p className="text-gray-600 mb-4">
              {t('messages.comingSoon') || 'Messages feature coming soon!'}
            </p>
            <p className="text-sm text-gray-500">
              {t('messages.description') || 'Stay tuned for direct messaging functionality.'}
            </p>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}



