"use client";

/**
 * Listing Detail Page
 * Route: /listings/[id]
 * Shows detailed view of a single listing with owner info and photo gallery
 * 
 * SECURITY: All content is rendered safely (no dangerouslySetInnerHTML)
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { findOrCreateDirectConversation } from "@/lib/messages";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingGallery from "@/components/ListingGallery";
import { isValidUrl } from "@/lib/utils";
import toast from "react-hot-toast";
import VerifiedBadge from "@/components/VerifiedBadge";

interface ListingData {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  price: number | null;
  city: string | null;
  image_urls: string[] | null;
  created_at: string;
}

interface OwnerProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  role?: string;
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const listingId = params.id as string;

  const [listing, setListing] = useState<ListingData | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [isLoadingListing, setIsLoadingListing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContacting, setIsContacting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load listing and owner data
  useEffect(() => {
    if (!listingId) return;

    const loadListing = async () => {
      setIsLoadingListing(true);
      setError(null);

      try {
        // Fetch listing by ID
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('id, user_id, title, description, price, city, image_urls, created_at')
          .eq('id', listingId)
          .single();

        if (listingError) {
          console.error("[ListingDetail] Error loading listing:", listingError);
          if (listingError.code === 'PGRST116') {
            setError("Listing not found");
          } else {
            setError("Failed to load listing");
          }
          setIsLoadingListing(false);
          return;
        }

        if (!listingData) {
          setError("Listing not found");
          setIsLoadingListing(false);
          return;
        }

        setListing(listingData);

        // Fetch owner profile (including is_verified and role for badge)
        const { data: ownerData, error: ownerError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, is_verified, role')
          .eq('id', listingData.user_id)
          .single();

        if (ownerError) {
          console.error("[ListingDetail] Error loading owner:", ownerError);
          // Continue even if owner profile fails
        } else {
          setOwner(ownerData);
        }
      } catch (error: any) {
        console.error("[ListingDetail] Exception loading listing:", error);
        setError("Failed to load listing");
      } finally {
        setIsLoadingListing(false);
      }
    };

    loadListing();
  }, [listingId]);

  // Handle delete listing
  const handleDeleteListing = async () => {
    if (!user || !canDelete) {
      toast.error("You don't have permission to delete this listing");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this listing?");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (deleteError) {
        console.error("[ListingDetail] Error deleting listing:", deleteError);
        
        // Check if it's an RLS policy violation
        if (deleteError.code === '42501' || deleteError.message?.includes('permission denied') || deleteError.message?.includes('policy')) {
          toast.error("You don't have permission to delete this listing");
        } else {
          toast.error("Failed to delete listing");
        }
        return;
      }

      // Success: redirect to listings page
      toast.success("Listing deleted");
      router.push("/listings");
    } catch (error: any) {
      console.error("[ListingDetail] Exception deleting listing:", error);
      toast.error("Failed to delete listing");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle contact owner
  const handleContactOwner = async () => {
    if (!user || !isAuthenticated) {
      toast.error("Please log in to contact the owner");
      router.push("/login");
      return;
    }

    if (!listing || !owner) {
      toast.error("Unable to contact owner");
      return;
    }

    // Check if user is the owner
    if (user.id === listing.user_id) {
      toast.error("This is your listing");
      return;
    }

    setIsContacting(true);

    try {
      // Find or create conversation
      const { conversationId, error: convError } = await findOrCreateDirectConversation(
        user.id,
        listing.user_id
      );

      if (convError || !conversationId) {
        console.error("[ListingDetail] Error finding/creating conversation:", convError);
        toast.error("Failed to start conversation. Please try again.");
        return;
      }

      // Navigate to messages page
      router.push(`/messages/${conversationId}`);
    } catch (error: any) {
      console.error("[ListingDetail] Exception contacting owner:", error);
      toast.error("Failed to contact owner. Please try again.");
    } finally {
      setIsContacting(false);
    }
  };

  // Format price
  const formatPrice = (price: number | null): string => {
    if (!price) return "Price not specified";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get owner initials
  const getOwnerInitials = (name: string | null, userId: string): string => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return userId.slice(0, 2).toUpperCase() || "U";
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return "Unknown date";
    }
  };

  if (isLoading || loadingSession || isLoadingListing) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-orbitron text-3xl sm:text-4xl font-bold mb-4 text-gold-dark">
              {error || "Listing not found"}
            </h1>
            <p className="text-gray-600 mb-6">
              {error === "Listing not found"
                ? "The listing you're looking for doesn't exist or has been removed."
                : "An error occurred while loading the listing."}
            </p>
            <Link
              href="/listings"
              className="inline-block px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
            >
              ← Back to Listings
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const displayName = owner?.display_name || "Unknown Owner";
  const ownerInitials = getOwnerInitials(owner?.display_name || null, listing.user_id);
  const isOwner = user?.id === listing.user_id;
  const isAdmin = user?.role === 'admin';
  const canDelete = isOwner || isAdmin;
  const canContact = isAuthenticated && !isOwner;

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gold-dark transition-colors mb-6"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to Listings
          </Link>

          {/* Photos Gallery */}
          <div className="mb-6">
            <ListingGallery
              images={listing.image_urls && listing.image_urls.length > 0 ? listing.image_urls : []}
              title={listing.title}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title and Price */}
              <div className="glass-dark rounded-2xl p-6 relative">
                {/* Delete Button - Only visible for owner or admin */}
                {canDelete && (
                  <div className="absolute top-6 right-6 z-10">
                    <button
                      onClick={handleDeleteListing}
                      disabled={isDeleting}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Delete listing"
                      title="Delete listing"
                    >
                      {isDeleting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  {listing.title}
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="text-3xl sm:text-4xl font-bold text-gold-dark">
                    {formatPrice(listing.price)}
                  </div>
                  {listing.city && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-2xl">📍</span>
                      <span className="text-lg font-semibold">{listing.city}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Listed on {formatDate(listing.created_at)}
                </div>
              </div>

              {/* Description */}
              {listing.description && (
                <div className="glass-dark rounded-2xl p-6">
                  <h2 className="font-orbitron text-xl font-bold text-gray-900 mb-4">
                    Description
                  </h2>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {listing.description}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar - Owner Info & Contact */}
            <div className="lg:col-span-1">
              <div className="glass-dark rounded-2xl p-6 sticky top-24">
                <h2 className="font-orbitron text-xl font-bold text-gray-900 mb-4">
                  Responsible
                </h2>

                {/* Owner Info */}
                <div className="flex items-center gap-4 mb-6">
                  {owner?.avatar_url && isValidUrl(owner.avatar_url) ? (
                    <img
                      src={owner.avatar_url}
                      alt={displayName}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-gold/30"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement("div");
                          fallback.className =
                            "w-16 h-16 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg ring-2 ring-gold/30";
                          fallback.textContent = ownerInitials;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg ring-2 ring-gold/30">
                      {ownerInitials}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-lg">{displayName}</p>
                      <VerifiedBadge 
                        isVerified={owner?.is_verified} 
                        role={owner?.role}
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-gray-500">Listing owner</p>
                  </div>
                </div>

                {/* Contact Button */}
                {isAuthenticated && (
                  <button
                    onClick={handleContactOwner}
                    disabled={isContacting || isOwner}
                    className={`w-full px-6 py-3 rounded-xl font-bold transition-all ${
                      isOwner
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : isContacting
                        ? "bg-gold/50 text-gray-900 cursor-not-allowed"
                        : "bg-gradient-to-r from-gold to-gold-light text-gray-900 hover:shadow-lg"
                    }`}
                  >
                    {isContacting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        Starting conversation...
                      </span>
                    ) : isOwner ? (
                      "This is your listing"
                    ) : (
                      "Contact Owner"
                    )}
                  </button>
                )}

                {!isAuthenticated && (
                  <Link
                    href="/login"
                    className="block w-full px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all text-center"
                  >
                    Log in to Contact
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
