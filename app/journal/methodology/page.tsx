"use client";

/**
 * Area Journal Methodology Page
 * Route: /journal/methodology
 * Explains how area journals are written
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";

export default function MethodologyPage() {
  const { isAuthenticated, isLoading, loadingSession } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!loadingSession && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router]);

  if (loadingSession || isLoading) {
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
      <div className="pt-20 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/journal"
              className="text-gold hover:text-gold-dark font-semibold mb-4 inline-block"
            >
              ← Back to Journal
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {t('journal.methodologyTitle')}
            </h1>
            <p className="text-gray-600 text-lg">{t('journal.methodologySubtitle')}</p>
          </div>

          {/* Content */}
          <div className="glass-dark rounded-2xl p-8 border border-gold/20 space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Facts vs. Opinion</h2>
              <p className="text-gray-700 mb-4">
                Our Area Journals are built on verified data and facts. We analyze:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Recent transaction data (sales and rentals)</li>
                <li>Active listing inventory and time on market</li>
                <li>Price trends over the past 90 days</li>
                <li>Market activity indicators (viewings, offers, negotiations)</li>
              </ul>
              <p className="text-gray-700 mt-4">
                When we express an opinion or outlook, we clearly label it and explain the reasoning
                behind it. We never present speculation as fact.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Update Process</h2>
              <p className="text-gray-700 mb-4">
                Each Area Journal is reviewed and updated regularly:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Major updates: When significant market changes occur (monthly minimum)</li>
                <li>Price ranges: Updated quarterly based on recent transactions</li>
                <li>Status changes: Updated when market conditions shift</li>
                <li>Contributor notes: Added as verified local insights become available</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Every journal clearly displays its last update date so you know how current the
                information is.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Paid Influence</h2>
              <p className="text-gray-700 mb-4">
                Our Area Journals are independent and unbiased:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>We do not accept payment from developers, agents, or property owners</li>
                <li>Our analysis is based solely on market data and verified information</li>
                <li>Contributor notes come from verified local experts, not paid promoters</li>
                <li>We disclose any potential conflicts of interest</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Our goal is to provide you with honest, useful information to make informed real
                estate decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sources</h2>
              <p className="text-gray-700 mb-4">We gather information from:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Public property listings and sales records</li>
                <li>Verified real estate agents and brokers</li>
                <li>Property managers and landlords</li>
                <li>Local market experts and analysts</li>
                <li>Direct observation of market activity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Use Area Journals</h2>
              <p className="text-gray-700 mb-4">
                Area Journals are tools to help you understand local market conditions:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Use them to understand pricing trends and market dynamics</li>
                <li>Consider the outlook when making timing decisions</li>
                <li>Review risks and watch-outs before committing</li>
                <li>Read contributor notes for on-the-ground insights</li>
                <li>Always verify information independently for your specific situation</li>
              </ul>
              <p className="text-gray-700 mt-4 font-semibold">
                Remember: Market conditions can change quickly. Use Area Journals as a starting
                point, not the final word.
              </p>
            </section>

            <div className="pt-6 border-t border-gold/20">
              <Link
                href="/journal"
                className="inline-block px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Browse Area Journals →
              </Link>
            </div>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}





