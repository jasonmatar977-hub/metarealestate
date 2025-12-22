"use client";

/**
 * Area Journal Detail Page
 * Route: /journal/beirut/:areaSlug
 * Shows detailed area journal with all sections
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface AreaJournal {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: "heating" | "cooling" | "stable";
  demand: string;
  inventory_trend: string;
  price_flexibility: string;
  rent_1br_min: number;
  rent_1br_max: number;
  rent_2br_min: number;
  rent_2br_max: number;
  rent_3br_min: number;
  rent_3br_max: number;
  sale_min: number;
  sale_max: number;
  driving_factors: string[];
  risks: string[];
  outlook: "up" | "sideways" | "down";
  what_would_change: string;
  methodology: string;
  last_updated: string;
}

interface ContributorNote {
  id: string;
  contributor_name: string;
  contributor_role: string;
  contributor_area: string;
  note: string;
  created_at: string;
}

export default function AreaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, loadingSession } = useAuth();
  const { t } = useLanguage();
  const areaSlug = params.areaSlug as string;

  const [journal, setJournal] = useState<AreaJournal | null>(null);
  const [contributorNotes, setContributorNotes] = useState<ContributorNote[]>([]);
  const [isLoadingJournal, setIsLoadingJournal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadingSession && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router]);

  useEffect(() => {
    if (areaSlug) {
      loadAreaJournal();
    }
  }, [areaSlug]);

  const loadAreaJournal = async () => {
    try {
      setIsLoadingJournal(true);
      setError(null);

      // Try to fetch from database, fallback to seed data
      const { data, error: fetchError } = await supabase
        .from("area_journals")
        .select("*")
        .eq("slug", areaSlug)
        .eq("city", "beirut")
        .single();

      if (fetchError) {
        console.log("[Journal] Database fetch failed, using seed data:", fetchError);
        setJournal(getSeedJournal(areaSlug));
      } else if (data) {
        setJournal(data);
      } else {
        setJournal(getSeedJournal(areaSlug));
      }

      // Load contributor notes
      const { data: notes, error: notesError } = await supabase
        .from("area_journal_contributions")
        .select("*")
        .eq("area_slug", areaSlug)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!notesError && notes) {
        setContributorNotes(notes);
      } else {
        setContributorNotes(getSeedContributorNotes(areaSlug));
      }
    } catch (err: any) {
      console.error("[Journal] Error loading area journal:", err);
      setError(err?.message || "Error loading area journal");
      setJournal(getSeedJournal(areaSlug));
      setContributorNotes(getSeedContributorNotes(areaSlug));
    } finally {
      setIsLoadingJournal(false);
    }
  };

  const getSeedJournal = (slug: string): AreaJournal => {
    const seedData: Record<string, Partial<AreaJournal>> = {
      achrafieh: {
        id: "1",
        slug: "achrafieh",
        name: "Achrafieh",
        city: "beirut",
        status: "heating",
        demand: "High",
        inventory_trend: "Decreasing",
        price_flexibility: "Low - sellers holding firm",
        rent_1br_min: 800,
        rent_1br_max: 1200,
        rent_2br_min: 1500,
        rent_2br_max: 2200,
        rent_3br_min: 2500,
        rent_3br_max: 3500,
        sale_min: 2500,
        sale_max: 4000,
        driving_factors: [
          "Strong expat community driving demand",
          "Limited new construction",
          "Proximity to business districts",
          "High-end retail and dining options",
        ],
        risks: [
          "Prices may be reaching peak levels",
          "Limited parking availability",
          "Older building stock requires renovation",
        ],
        outlook: "up",
        what_would_change:
          "Significant new supply coming online, economic downturn affecting expat community, or major infrastructure changes",
        methodology:
          "Based on analysis of 50+ recent transactions, 30+ active listings, and interviews with 5 local agents",
        last_updated: new Date().toISOString(),
      },
      downtown: {
        id: "2",
        slug: "downtown",
        name: "Downtown",
        city: "beirut",
        status: "stable",
        demand: "Steady",
        inventory_trend: "Stable",
        price_flexibility: "Moderate",
        rent_1br_min: 1000,
        rent_1br_max: 1500,
        rent_2br_min: 2000,
        rent_2br_max: 3000,
        rent_3br_min: 3500,
        rent_3br_max: 5000,
        sale_min: 3000,
        sale_max: 5000,
        driving_factors: [
          "Premium location with historical significance",
          "Mixed-use development attracting businesses",
          "Central location for both work and leisure",
        ],
        risks: ["High maintenance costs", "Traffic congestion", "Tourism-dependent economy"],
        outlook: "sideways",
        what_would_change:
          "Major economic recovery, significant infrastructure improvements, or new landmark developments",
        methodology:
          "Based on analysis of 40+ recent transactions, 25+ active listings, and market trend analysis",
        last_updated: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    };

    return seedData[slug] as AreaJournal || seedData.achrafieh as AreaJournal;
  };

  const getSeedContributorNotes = (slug: string): ContributorNote[] => {
    return [
      {
        id: "1",
        contributor_name: "Sarah Khoury",
        contributor_role: "Local Real Estate Agent",
        contributor_area: "Achrafieh",
        note: "Seeing increased interest from European expats, especially in renovated buildings. Sellers are very firm on pricing.",
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: "2",
        contributor_name: "Michael Fadel",
        contributor_role: "Property Investor",
        contributor_area: "Achrafieh",
        note: "Inventory is tight. Good properties sell within 2-3 weeks. Cash buyers have advantage.",
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: "3",
        contributor_name: "Layla Mansour",
        contributor_role: "Property Manager",
        contributor_area: "Achrafieh",
        note: "Rental market is strong. Tenants willing to pay premium for quality units with parking.",
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
    ];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "heating":
        return "bg-red-100 text-red-800 border-red-300";
      case "cooling":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "stable":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getOutlookColor = (outlook: string) => {
    switch (outlook) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "sideways":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  if (loadingSession || isLoading || isLoadingJournal) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !journal) {
    return null;
  }

  return (
    <main className="min-h-screen pb-20">
      <Navbar />
      <div className="pt-20 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/journal"
              className="text-gold hover:text-gold-dark font-semibold mb-4 inline-block"
            >
              ← Back to Journal
            </Link>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900">{journal.name}</h1>
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusBadgeColor(
                  journal.status
                )}`}
              >
                {t(`journal.${journal.status}`)}
              </span>
            </div>
            <p className="text-gray-600">
              {t('journal.lastUpdatedLabel')}: {formatDate(journal.last_updated)}
            </p>
          </div>

          {/* Snapshot Section */}
          <section className="glass-dark rounded-2xl p-6 mb-6 border border-gold/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{t('journal.snapshot')}</h2>
              <span className="px-3 py-1 bg-gold/10 text-gold-dark text-xs font-semibold rounded-full border border-gold/30">
                Platform Outlook
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('journal.status')}</p>
                <p className="font-semibold text-gray-900 capitalize">{journal.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('journal.demand')}</p>
                <p className="font-semibold text-gray-900">{journal.demand}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('journal.inventoryTrend')}</p>
                <p className="font-semibold text-gray-900">{journal.inventory_trend}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('journal.priceFlexibility')}</p>
                <p className="font-semibold text-gray-900">{journal.price_flexibility}</p>
              </div>
            </div>
          </section>

          {/* Price Reality Section */}
          <section className="glass-dark rounded-2xl p-6 mb-6 border border-gold/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('journal.priceReality')}</h2>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('journal.rentRanges')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                  <span className="font-medium">1BR</span>
                  <span className="text-gold font-bold">
                    ${journal.rent_1br_min.toLocaleString()} - ${journal.rent_1br_max.toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                  <span className="font-medium">2BR</span>
                  <span className="text-gold font-bold">
                    ${journal.rent_2br_min.toLocaleString()} - ${journal.rent_2br_max.toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                  <span className="font-medium">3BR</span>
                  <span className="text-gold font-bold">
                    ${journal.rent_3br_min.toLocaleString()} - ${journal.rent_3br_max.toLocaleString()}/mo
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('journal.saleRange')}</h3>
              <div className="p-4 bg-white/50 rounded-lg">
                <span className="text-gold font-bold text-xl">
                  ${journal.sale_min.toLocaleString()} - ${journal.sale_max.toLocaleString()}{" "}
                  {t('journal.perSqm')}
                </span>
              </div>
            </div>
          </section>

          {/* Driving Factors */}
          <section className="glass-dark rounded-2xl p-6 mb-6 border border-gold/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('journal.drivingFactors')}</h2>
            <ul className="space-y-2">
              {journal.driving_factors.map((factor, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gold mr-2">•</span>
                  <span className="text-gray-700">{factor}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Risks */}
          <section className="glass-dark rounded-2xl p-6 mb-6 border border-gold/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('journal.risks')}</h2>
            <ul className="space-y-2">
              {journal.risks.map((risk, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-red-500 mr-2">⚠</span>
                  <span className="text-gray-700">{risk}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 90-Day Outlook */}
          <section className="glass-dark rounded-2xl p-6 mb-6 border border-gold/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('journal.outlook')}</h2>
            <div className="mb-4">
              <span className={`text-2xl font-bold ${getOutlookColor(journal.outlook)}`}>
                {t(`journal.outlook${journal.outlook.charAt(0).toUpperCase() + journal.outlook.slice(1)}`)}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2 font-semibold">{t('journal.whatWouldChange')}</p>
              <p className="text-gray-700">{journal.what_would_change}</p>
            </div>
          </section>

          {/* Local Notes */}
          <section className="glass-dark rounded-2xl p-6 mb-6 border border-gold/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{t('journal.localNotes')}</h2>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300">
                Verified Contributor
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{t('journal.fromVerifiedContributors')}</p>
            <div className="space-y-4">
              {contributorNotes.map((note) => (
                <div key={note.id} className="bg-white/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold mr-3">
                      {note.contributor_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{note.contributor_name}</p>
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded border border-green-300">
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {note.contributor_role} • {note.contributor_area}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">{note.note}</p>
                  <p className="text-xs text-gray-500 mt-2">{formatDate(note.created_at)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Methodology */}
          <section className="glass-dark rounded-2xl p-6 mb-6 border border-gold/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('journal.methodology')}</h2>
            <p className="text-gray-700">{journal.methodology}</p>
            <p className="text-sm text-gray-600 mt-4">
              {t('journal.lastUpdatedLabel')}: {formatDate(journal.last_updated)}
            </p>
          </section>

          {/* CTAs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href={`/chat?area=${journal.slug}&city=${journal.city}`}
              className="glass-dark rounded-xl p-6 border border-gold/20 hover:border-gold hover:shadow-lg transition-all text-center group"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🤖</span>
                <p className="font-semibold text-gray-900 group-hover:text-gold transition-colors">
                  {t('journal.askAI')}
                </p>
              </div>
              <p className="text-sm text-gray-600">Get AI insights about {journal.name}</p>
            </Link>
            <Link
              href={`/feed?area=${journal.name}`}
              className="glass-dark rounded-xl p-6 border border-gold/20 hover:border-gold hover:shadow-lg transition-all text-center group"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">💬</span>
                <p className="font-semibold text-gray-900 group-hover:text-gold transition-colors">
                  {t('journal.discussArea')}
                </p>
              </div>
              <p className="text-sm text-gray-600">Community Discussion</p>
            </Link>
          </div>

          {/* Related Listings - Placeholder */}
          <section className="glass-dark rounded-2xl p-6 border border-gold/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('journal.relatedListings')}</h2>
            <Link
              href={`/listings?area=${journal.name}`}
              className="text-gold hover:text-gold-dark font-semibold"
            >
              View listings in {journal.name} →
            </Link>
          </section>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}

