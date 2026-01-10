"use client";

/**
 * Edit Area Journal Page
 * Route: /journal/beirut/[areaSlug]/edit
 * Allows owners or admins to edit area journals
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface JournalFormData {
  slug: string;
  name: string;
  city: string;
  status: "heating" | "cooling" | "stable";
  demand: string;
  inventory_trend: string;
  price_flexibility: string;
  rent_1br_min: string;
  rent_1br_max: string;
  rent_2br_min: string;
  rent_2br_max: string;
  rent_3br_min: string;
  rent_3br_max: string;
  sale_min: string;
  sale_max: string;
  driving_factors: string; // JSON array as string (comma-separated)
  risks: string; // JSON array as string (comma-separated)
  outlook: "up" | "sideways" | "down";
  what_would_change: string;
  methodology: string;
  takeaway: string;
}

interface AreaJournal {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: "heating" | "cooling" | "stable";
  demand: string | null;
  inventory_trend: string | null;
  price_flexibility: string | null;
  rent_1br_min: number | null;
  rent_1br_max: number | null;
  rent_2br_min: number | null;
  rent_2br_max: number | null;
  rent_3br_min: number | null;
  rent_3br_max: number | null;
  sale_min: number | null;
  sale_max: number | null;
  driving_factors: string[];
  risks: string[];
  outlook: "up" | "sideways" | "down" | null;
  what_would_change: string | null;
  methodology: string | null;
  takeaway: string | null;
  user_id?: string | null;
}

export default function EditJournalPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const { t } = useLanguage();
  const areaSlug = params.areaSlug as string;

  const [journal, setJournal] = useState<AreaJournal | null>(null);
  const [isLoadingJournal, setIsLoadingJournal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<JournalFormData>({
    slug: "",
    name: "",
    city: "beirut",
    status: "stable",
    demand: "",
    inventory_trend: "",
    price_flexibility: "",
    rent_1br_min: "",
    rent_1br_max: "",
    rent_2br_min: "",
    rent_2br_max: "",
    rent_3br_min: "",
    rent_3br_max: "",
    sale_min: "",
    sale_max: "",
    driving_factors: "",
    risks: "",
    outlook: "sideways",
    what_would_change: "",
    methodology: "",
    takeaway: "",
  });

  // Check if user can edit this journal
  const canEdit = user && journal && (journal.user_id === user.id || user.role === 'admin');

  useEffect(() => {
    if (!loadingSession && !isLoading && !isAuthenticated) {
      router.push("/login");
    } else if (areaSlug && isAuthenticated && !isLoadingJournal) {
      if (!canEdit) {
        toast.error("You don't have permission to edit this journal");
        router.push(`/journal/beirut/${areaSlug}`);
      }
    }
  }, [isAuthenticated, isLoading, loadingSession, canEdit, router, areaSlug, isLoadingJournal]);

  useEffect(() => {
    if (areaSlug) {
      loadJournal();
    }
  }, [areaSlug]);

  const loadJournal = async () => {
    try {
      setIsLoadingJournal(true);

      // Fetch journal by slug
      const { data, error: fetchError } = await supabase
        .from("area_journals")
        .select("*")
        .eq("slug", areaSlug)
        .eq("city", "beirut")
        .single();

      if (fetchError || !data) {
        console.error("[Journal] Error loading journal:", fetchError);
        toast.error("Journal not found");
        router.push("/journal");
        return;
      }

      // Check if user can edit (owner or admin)
      if (data.user_id !== user?.id && user?.role !== 'admin') {
        toast.error("You don't have permission to edit this journal");
        router.push(`/journal/beirut/${areaSlug}`);
        return;
      }

      setJournal(data);

      // Populate form with existing data
      setFormData({
        slug: data.slug || "",
        name: data.name || "",
        city: data.city || "beirut",
        status: data.status || "stable",
        demand: data.demand || "",
        inventory_trend: data.inventory_trend || "",
        price_flexibility: data.price_flexibility || "",
        rent_1br_min: data.rent_1br_min?.toString() || "",
        rent_1br_max: data.rent_1br_max?.toString() || "",
        rent_2br_min: data.rent_2br_min?.toString() || "",
        rent_2br_max: data.rent_2br_max?.toString() || "",
        rent_3br_min: data.rent_3br_min?.toString() || "",
        rent_3br_max: data.rent_3br_max?.toString() || "",
        sale_min: data.sale_min?.toString() || "",
        sale_max: data.sale_max?.toString() || "",
        driving_factors: Array.isArray(data.driving_factors) ? data.driving_factors.join(", ") : "",
        risks: Array.isArray(data.risks) ? data.risks.join(", ") : "",
        outlook: data.outlook || "sideways",
        what_would_change: data.what_would_change || "",
        methodology: data.methodology || "",
        takeaway: data.takeaway || "",
      });
    } catch (err: any) {
      console.error("[Journal] Exception loading journal:", err);
      toast.error("Failed to load journal");
      router.push("/journal");
    } finally {
      setIsLoadingJournal(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!journal || !user) return;

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.slug.trim()) newErrors.slug = "Slug is required";
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.city.trim()) newErrors.city = "City is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse driving_factors and risks from comma-separated string to JSON array
      const drivingFactorsArray = formData.driving_factors
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
      const risksArray = formData.risks
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      // Update journal (RLS enforces owner/admin check)
      const { error: updateError } = await supabase
        .from("area_journals")
        .update({
          slug: formData.slug.trim().toLowerCase().replace(/\s+/g, "-"),
          name: formData.name.trim(),
          city: formData.city.trim().toLowerCase(),
          status: formData.status,
          demand: formData.demand.trim() || null,
          inventory_trend: formData.inventory_trend.trim() || null,
          price_flexibility: formData.price_flexibility.trim() || null,
          rent_1br_min: formData.rent_1br_min ? parseFloat(formData.rent_1br_min) : null,
          rent_1br_max: formData.rent_1br_max ? parseFloat(formData.rent_1br_max) : null,
          rent_2br_min: formData.rent_2br_min ? parseFloat(formData.rent_2br_min) : null,
          rent_2br_max: formData.rent_2br_max ? parseFloat(formData.rent_2br_max) : null,
          rent_3br_min: formData.rent_3br_min ? parseFloat(formData.rent_3br_min) : null,
          rent_3br_max: formData.rent_3br_max ? parseFloat(formData.rent_3br_max) : null,
          sale_min: formData.sale_min ? parseFloat(formData.sale_min) : null,
          sale_max: formData.sale_max ? parseFloat(formData.sale_max) : null,
          driving_factors: drivingFactorsArray.length > 0 ? drivingFactorsArray : [],
          risks: risksArray.length > 0 ? risksArray : [],
          outlook: formData.outlook || null,
          what_would_change: formData.what_would_change.trim() || null,
          methodology: formData.methodology.trim() || null,
          takeaway: formData.takeaway.trim() || null,
        })
        .eq("id", journal.id);

      if (updateError) {
        console.error("[Journal] Error updating journal:", updateError);
        toast.error(updateError.message || "Failed to update journal. Please try again.");
        return;
      }

      // Success
      toast.success("Journal updated successfully!");
      router.push(`/journal/beirut/${formData.slug}`);
    } catch (error: any) {
      console.error("[Journal] Exception updating journal:", error);
      toast.error(error?.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
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

  if (!isAuthenticated || !journal || !canEdit) {
    return null; // Will redirect via useEffect
  }

  return (
    <main className="min-h-screen pb-20">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/journal/beirut/${journal.slug}`}
              className="text-gold hover:text-gold-dark font-semibold mb-4 inline-block"
            >
              ← Back to Journal
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Edit Journal</h1>
            <p className="text-gray-600">Update area journal entry</p>
          </div>

          {/* Form - Same structure as new page */}
          <div className="glass-dark rounded-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="slug" className="block text-sm font-semibold text-gray-700 mb-2">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="e.g., achrafieh"
                    className={`w-full px-4 py-3 rounded-xl border-2 ${
                      errors.slug ? "border-red-500" : "border-gold/40"
                    } focus:border-gold focus:outline-none`}
                    required
                    disabled={isSubmitting}
                  />
                  {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug}</p>}
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Achrafieh"
                    className={`w-full px-4 py-3 rounded-xl border-2 ${
                      errors.name ? "border-red-500" : "border-gold/40"
                    } focus:border-gold focus:outline-none`}
                    required
                    disabled={isSubmitting}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g., beirut"
                    className={`w-full px-4 py-3 rounded-xl border-2 ${
                      errors.city ? "border-red-500" : "border-gold/40"
                    } focus:border-gold focus:outline-none`}
                    required
                    disabled={isSubmitting}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="stable">Stable</option>
                    <option value="heating">Heating</option>
                    <option value="cooling">Cooling</option>
                  </select>
                </div>
              </div>

              {/* Snapshot Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="demand" className="block text-sm font-semibold text-gray-700 mb-2">
                    Demand
                  </label>
                  <input
                    type="text"
                    id="demand"
                    name="demand"
                    value={formData.demand}
                    onChange={handleChange}
                    placeholder="e.g., High"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="inventory_trend" className="block text-sm font-semibold text-gray-700 mb-2">
                    Inventory Trend
                  </label>
                  <input
                    type="text"
                    id="inventory_trend"
                    name="inventory_trend"
                    value={formData.inventory_trend}
                    onChange={handleChange}
                    placeholder="e.g., Decreasing"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="price_flexibility" className="block text-sm font-semibold text-gray-700 mb-2">
                    Price Flexibility
                  </label>
                  <input
                    type="text"
                    id="price_flexibility"
                    name="price_flexibility"
                    value={formData.price_flexibility}
                    onChange={handleChange}
                    placeholder="e.g., Low"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Price Ranges */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Rent Ranges (USD/month)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="rent_1br_min" className="block text-sm font-semibold text-gray-700 mb-2">
                      1BR Min
                    </label>
                    <input
                      type="number"
                      id="rent_1br_min"
                      name="rent_1br_min"
                      value={formData.rent_1br_min}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="rent_1br_max" className="block text-sm font-semibold text-gray-700 mb-2">
                      1BR Max
                    </label>
                    <input
                      type="number"
                      id="rent_1br_max"
                      name="rent_1br_max"
                      value={formData.rent_1br_max}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="rent_2br_min" className="block text-sm font-semibold text-gray-700 mb-2">
                      2BR Min
                    </label>
                    <input
                      type="number"
                      id="rent_2br_min"
                      name="rent_2br_min"
                      value={formData.rent_2br_min}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="rent_2br_max" className="block text-sm font-semibold text-gray-700 mb-2">
                      2BR Max
                    </label>
                    <input
                      type="number"
                      id="rent_2br_max"
                      name="rent_2br_max"
                      value={formData.rent_2br_max}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="rent_3br_min" className="block text-sm font-semibold text-gray-700 mb-2">
                      3BR Min
                    </label>
                    <input
                      type="number"
                      id="rent_3br_min"
                      name="rent_3br_min"
                      value={formData.rent_3br_min}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="rent_3br_max" className="block text-sm font-semibold text-gray-700 mb-2">
                      3BR Max
                    </label>
                    <input
                      type="number"
                      id="rent_3br_max"
                      name="rent_3br_max"
                      value={formData.rent_3br_max}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Sale Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sale_min" className="block text-sm font-semibold text-gray-700 mb-2">
                    Sale Min (USD/sqm)
                  </label>
                  <input
                    type="number"
                    id="sale_min"
                    name="sale_min"
                    value={formData.sale_min}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="sale_max" className="block text-sm font-semibold text-gray-700 mb-2">
                    Sale Max (USD/sqm)
                  </label>
                  <input
                    type="number"
                    id="sale_max"
                    name="sale_max"
                    value={formData.sale_max}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Driving Factors */}
              <div>
                <label htmlFor="driving_factors" className="block text-sm font-semibold text-gray-700 mb-2">
                  Driving Factors (comma-separated)
                </label>
                <textarea
                  id="driving_factors"
                  name="driving_factors"
                  value={formData.driving_factors}
                  onChange={handleChange}
                  placeholder="Strong expat community, Limited new construction, Proximity to business districts"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Risks */}
              <div>
                <label htmlFor="risks" className="block text-sm font-semibold text-gray-700 mb-2">
                  Risks (comma-separated)
                </label>
                <textarea
                  id="risks"
                  name="risks"
                  value={formData.risks}
                  onChange={handleChange}
                  placeholder="Prices may be reaching peak levels, Limited parking availability"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Outlook */}
              <div>
                <label htmlFor="outlook" className="block text-sm font-semibold text-gray-700 mb-2">
                  Outlook
                </label>
                <select
                  id="outlook"
                  name="outlook"
                  value={formData.outlook}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                  disabled={isSubmitting}
                >
                  <option value="sideways">Sideways</option>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                </select>
              </div>

              {/* What Would Change */}
              <div>
                <label htmlFor="what_would_change" className="block text-sm font-semibold text-gray-700 mb-2">
                  What Would Change
                </label>
                <textarea
                  id="what_would_change"
                  name="what_would_change"
                  value={formData.what_would_change}
                  onChange={handleChange}
                  placeholder="Significant new supply coming online, economic downturn..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Methodology */}
              <div>
                <label htmlFor="methodology" className="block text-sm font-semibold text-gray-700 mb-2">
                  Methodology
                </label>
                <textarea
                  id="methodology"
                  name="methodology"
                  value={formData.methodology}
                  onChange={handleChange}
                  placeholder="Based on analysis of 50+ recent transactions, 30+ active listings..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Takeaway */}
              <div>
                <label htmlFor="takeaway" className="block text-sm font-semibold text-gray-700 mb-2">
                  Takeaway
                </label>
                <textarea
                  id="takeaway"
                  name="takeaway"
                  value={formData.takeaway}
                  onChange={handleChange}
                  placeholder="High demand from expats and investors, limited inventory driving prices up"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Link
                  href={`/journal/beirut/${journal.slug}`}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-all text-center"
                  onClick={(e) => {
                    if (isSubmitting) e.preventDefault();
                  }}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Updating..." : "Update Journal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
