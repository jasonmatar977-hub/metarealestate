"use client";

/**
 * Area Journal Hub Page
 * Route: /journal
 * Shows Beirut areas with status badges and quick insights
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Area {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: "heating" | "cooling" | "stable";
  last_updated: string;
  takeaway: string | null;
}

export default function JournalHubPage() {
  const { isAuthenticated, isLoading, loadingSession } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadingSession && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router]);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      setIsLoadingAreas(true);
      setError(null);

      // Try to fetch from database, fallback to seed data
      const { data, error: fetchError } = await supabase
        .from("area_journals")
        .select("id, slug, name, city, status, last_updated, takeaway")
        .eq("city", "beirut")
        .order("name", { ascending: true });

      if (fetchError) {
        console.log("[Journal] Database fetch failed, using seed data:", fetchError);
        // Use seed data if database doesn't exist yet
        setAreas(getSeedAreas());
      } else if (data && data.length > 0) {
        setAreas(data);
      } else {
        setAreas(getSeedAreas());
      }
    } catch (err: any) {
      console.error("[Journal] Error loading areas:", err);
      setError(err?.message || t('journal.error'));
      setAreas(getSeedAreas()); // Fallback to seed data
    } finally {
      setIsLoadingAreas(false);
    }
  };

  const getSeedAreas = (): Area[] => {
    return [
      {
        id: "1",
        slug: "achrafieh",
        name: "Achrafieh",
        city: "beirut",
        status: "heating",
        last_updated: new Date().toISOString(),
        takeaway: "High demand from expats and investors, limited inventory driving prices up",
      },
      {
        id: "2",
        slug: "downtown",
        name: "Downtown",
        city: "beirut",
        status: "stable",
        last_updated: new Date(Date.now() - 86400000 * 2).toISOString(),
        takeaway: "Premium location with steady demand, prices holding steady",
      },
      {
        id: "3",
        slug: "hamra",
        name: "Hamra",
        city: "beirut",
        status: "cooling",
        last_updated: new Date(Date.now() - 86400000 * 5).toISOString(),
        takeaway: "Student area seeing reduced demand, more negotiation room",
      },
      {
        id: "4",
        slug: "verdun",
        name: "Verdun",
        city: "beirut",
        status: "heating",
        last_updated: new Date(Date.now() - 86400000).toISOString(),
        takeaway: "Family-friendly area gaining popularity, prices rising",
      },
      {
        id: "5",
        slug: "ain-el-mreisse",
        name: "Ain El Mreisse",
        city: "beirut",
        status: "stable",
        last_updated: new Date(Date.now() - 86400000 * 3).toISOString(),
        takeaway: "Coastal area with consistent demand, stable pricing",
      },
      {
        id: "6",
        slug: "mar-mikhael",
        name: "Mar Mikhael",
        city: "beirut",
        status: "heating",
        last_updated: new Date().toISOString(),
        takeaway: "Trendy neighborhood attracting young professionals, inventory tight",
      },
      {
        id: "7",
        slug: "saifi",
        name: "Saifi",
        city: "beirut",
        status: "stable",
        last_updated: new Date(Date.now() - 86400000 * 4).toISOString(),
        takeaway: "Luxury area with steady high-end demand",
      },
    ];
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('journal.hubTitle')}</h1>
            <p className="text-gray-600 text-lg">{t('journal.hubSubtitle')}</p>
          </div>

          {/* Methodology Link */}
          <div className="mb-6">
            <Link
              href="/journal/methodology"
              className="text-gold hover:text-gold-dark font-semibold text-sm"
            >
              {t('journal.methodology')} →
            </Link>
          </div>

          {/* Areas Grid */}
          {isLoadingAreas ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="glass-dark rounded-2xl p-6 border border-gold/20 animate-pulse"
                >
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : error && areas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadAreas}
                className="px-6 py-2 bg-gold text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Retry
              </button>
            </div>
          ) : areas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t('journal.noAreas')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {areas.map((area) => (
                <Link
                  key={area.id}
                  href={`/journal/beirut/${area.slug}`}
                  className="glass-dark rounded-2xl p-6 border border-gold/20 hover:border-gold hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-gold transition-colors">
                      {area.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                        area.status
                      )}`}
                    >
                      {t(`journal.${area.status}`)}
                    </span>
                  </div>

                  {area.takeaway && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{area.takeaway}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {t('journal.lastUpdated')}: {formatDate(area.last_updated)}
                    </span>
                    <span className="text-gold font-semibold text-sm group-hover:text-gold-dark">
                      {t('journal.openJournal')} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}





