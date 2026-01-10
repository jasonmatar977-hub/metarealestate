"use client";

/**
 * Property Listings Page
 * Route: /listings
 * Enhanced listings with search, filters, and sorting
 * 
 * SECURITY: Protected route - requires authentication
 * All property data is treated as untrusted and rendered safely
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import Footer from "@/components/Footer";
import toast from "react-hot-toast";
import VerifiedBadge from "@/components/VerifiedBadge";

// Enhanced property data structure (matches database schema)
interface Property {
  id: number;
  user_id: string; // Owner user ID
  title: string;
  location: string; // Using city as location
  price: number | null; // Numeric for sorting
  priceDisplay: string; // Formatted display
  description: string | null;
  bedrooms?: number;
  bathrooms?: number;
  type?: 'house' | 'apartment' | 'condo' | 'villa' | 'townhouse';
  area?: number;
  imageUrl?: string;
  image_urls?: string[] | null;
  created_at: string;
  ownerName?: string | null;
  ownerVerified?: boolean;
  ownerRole?: string;
}

type SortOption = 'newest' | 'price-low' | 'price-high';

export default function ListingsPage() {
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [listings, setListings] = useState<Property[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [bedrooms, setBedrooms] = useState<number | 'all'>('all');
  const [propertyType, setPropertyType] = useState<'all' | 'house' | 'apartment' | 'condo' | 'villa' | 'townhouse'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Check if user can create listings
  const canCreateListing = user && (user.is_verified === true || user.role === 'admin');
  const [deletingListingId, setDeletingListingId] = useState<number | null>(null);

  // Load listings from database
  const loadListings = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsLoadingListings(false);
      return;
    }

    try {
      setIsLoadingListings(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('listings')
        .select('id, user_id, title, description, price, city, image_urls, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error("[Listings] Error loading listings:", fetchError);
        setError(fetchError.message || "Failed to load listings");
        toast.error("Failed to load listings");
        return;
      }

      // Get unique owner IDs and fetch profiles (batch fetch to avoid N+1)
      const ownerIds = [...new Set((data || []).map((listing) => listing.user_id))];
      const { data: ownerProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, is_verified, role')
        .in('id', ownerIds);

      // Create a map of owner profiles for quick lookup
      const ownerMap = new Map(
        (ownerProfiles || []).map((profile) => [profile.id, profile])
      );

      // Transform database data to Property format (include owner info)
      const transformedListings: Property[] = (data || []).map((listing) => {
        const owner = ownerMap.get(listing.user_id);
        return {
          id: listing.id,
          user_id: listing.user_id,
          title: listing.title,
          location: listing.city || 'Location not specified',
          price: listing.price ? parseFloat(listing.price.toString()) : null,
          priceDisplay: listing.price
            ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(parseFloat(listing.price.toString()))
            : 'Price not specified',
          description: listing.description || null,
          image_urls: listing.image_urls || null,
          imageUrl: listing.image_urls && listing.image_urls.length > 0 ? listing.image_urls[0] : undefined,
          created_at: listing.created_at,
          ownerName: owner?.display_name || null,
          ownerVerified: owner?.is_verified,
          ownerRole: owner?.role,
        };
      });

      setListings(transformedListings);
    } catch (error: any) {
      console.error("[Listings] Exception loading listings:", error);
      setError(error?.message || "An error occurred");
      toast.error("Failed to load listings");
    } finally {
      setIsLoadingListings(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadListings();
    }
  }, [isAuthenticated, user, loadListings]);

  useEffect(() => {
    // Do not redirect until initial session check completes
    if (!loadingSession && !isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router, hasRedirected]);

  // Handle edit listing
  const handleEditListing = (listingId: number, listingUserId: string) => {
    // Security check: Only owner or admin can edit
    if (!user) {
      toast.error("You must be logged in to edit listings");
      return;
    }

    const isOwner = user.id === listingUserId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      toast.error("You don't have permission to edit this listing");
      return;
    }

    // Confirm edit (before navigating)
    const confirmed = window.confirm("Do you want to edit this listing?");
    if (!confirmed) {
      return;
    }

    // Navigate to edit page
    router.push(`/listings/${listingId}/edit`);
  };

  // Handle delete listing
  const handleDeleteListing = async (listingId: number, listingUserId: string) => {
    // Security check: Only owner or admin can delete
    if (!user) {
      toast.error("You must be logged in to delete listings");
      return;
    }

    const isOwner = user.id === listingUserId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      toast.error("You don't have permission to delete this listing");
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm("Are you sure you want to delete this listing?");
    if (!confirmed) {
      return;
    }

    setDeletingListingId(listingId);

    try {
      // Delete listing (RLS will enforce owner/admin check)
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (deleteError) {
        console.error("[Listings] Error deleting listing:", deleteError);
        
        // Check if it's an RLS policy violation
        if (deleteError.code === '42501' || deleteError.message?.includes('permission denied') || deleteError.message?.includes('policy')) {
          toast.error("You don't have permission to delete this listing");
        } else {
          toast.error("Failed to delete listing");
        }
        return;
      }

      // Success: Remove listing from UI instantly (optimistic update)
      setListings((prev) => prev.filter((listing) => listing.id !== listingId));
      toast.success("Listing deleted");
    } catch (error: any) {
      console.error("[Listings] Exception deleting listing:", error);
      toast.error("Failed to delete listing");
    } finally {
      setDeletingListingId(null);
    }
  };

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let filtered = [...listings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Price range filter (only if price exists)
    filtered = filtered.filter((p) => {
      if (p.price === null) return true; // Include listings without price
      return p.price >= priceRange[0] && p.price <= priceRange[1];
    });

    // Bedrooms filter (skip if not available)
    if (bedrooms !== 'all') {
      filtered = filtered.filter((p) => p.bedrooms === bedrooms);
    }

    // Property type filter (skip if not available)
    if (propertyType !== 'all') {
      filtered = filtered.filter((p) => p.type === propertyType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          if (a.price === null && b.price === null) return 0;
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return a.price - b.price;
        case 'price-high':
          if (a.price === null && b.price === null) return 0;
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return b.price - a.price;
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [listings, searchQuery, priceRange, bedrooms, propertyType, sortBy]);

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
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view listings.</p>
          <a href="/login" className="text-gold hover:text-gold-dark font-semibold">
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 px-4">
            <div className="mb-4 sm:mb-0">
              <h1 className="font-orbitron text-3xl sm:text-4xl md:text-5xl font-bold text-gold-dark">
                {t('listings.title')}
              </h1>
              <p className="text-center sm:text-left text-gray-600 mt-2 text-base sm:text-lg">
                {t('listings.subtitle')}
              </p>
            </div>
            {/* Add Listing Button - Only for verified users or admins */}
            {canCreateListing ? (
              <Link
                href="/listings/new"
                className="px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
              >
                + Add Listing
              </Link>
            ) : user ? (
              <div className="px-6 py-3 bg-gray-200 text-gray-600 font-semibold rounded-xl cursor-not-allowed whitespace-nowrap text-sm text-center">
                Verification Required
              </div>
            ) : null}
          </div>

          {/* Search and Filters */}
          <div className="glass-dark rounded-2xl p-4 sm:p-6 mb-8">
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by city, area, or keyword..."
                className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    placeholder="Min"
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    placeholder="Max"
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bedrooms
                </label>
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                >
                  <option value="all">All</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as 'all' | 'house' | 'apartment' | 'condo' | 'villa' | 'townhouse')}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                  <option value="villa">Villa</option>
                  <option value="townhouse">Townhouse</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingListings ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
              <p className="text-gray-600">Loading listings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadListings}
                className="px-6 py-2 bg-gold text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="mb-6">
                <p className="text-gray-600">
                  Found <span className="font-bold text-gold-dark">{filteredProperties.length}</span> {filteredProperties.length === 1 ? 'listing' : 'listings'}
                </p>
              </div>

              {/* Properties Grid */}
              {filteredProperties.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">
                    {listings.length === 0
                      ? "No listings yet. Be the first to create one!"
                      : "No properties found matching your criteria."}
                  </p>
                  {listings.length === 0 && canCreateListing && (
                    <Link
                      href="/listings/new"
                      className="inline-block px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
                    >
                      Create First Listing
                    </Link>
                  )}
                  {listings.length > 0 && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setPriceRange([0, 5000000]);
                        setBedrooms('all');
                        setPropertyType('all');
                        setSortBy('newest');
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      listingId={property.id}
                      listingUserId={property.user_id}
                      title={property.title}
                      location={property.location}
                      price={property.priceDisplay}
                      description={property.description || ""}
                      imageUrl={property.image_urls && property.image_urls.length > 0 ? property.image_urls[0] : undefined}
                      bedrooms={property.bedrooms}
                      bathrooms={property.bathrooms}
                      type={property.type}
                      area={property.area}
                      currentUserId={user?.id}
                      currentUserRole={user?.role}
                      onEdit={handleEditListing}
                      onDelete={handleDeleteListing}
                      isDeleting={deletingListingId === property.id}
                      ownerName={property.ownerName}
                      ownerVerified={property.ownerVerified}
                      ownerRole={property.ownerRole}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
