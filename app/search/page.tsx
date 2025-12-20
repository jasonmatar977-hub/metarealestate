"use client";

/**
 * User Search Page
 * Route: /search
 * Instagram-like user search with follow/unfollow functionality
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import { isValidUrl } from "@/lib/utils";

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  isFollowing?: boolean;
}

export default function SearchPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  
  // AbortController ref to cancel requests on unmount
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load following status for current user
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFollowingStatus();
    }
  }, [isAuthenticated, user?.id]); // Only depend on user.id, not entire user object

  // Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search users when debouncedTerm changes (only if length >= 2)
  useEffect(() => {
    console.log("[Search] term:", debouncedTerm, "len:", debouncedTerm.length);
    
    // Early return if term is too short - immediately clear results and stop loading
    if (!debouncedTerm || debouncedTerm.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Track if component is still mounted
    let isMounted = true;
    
    // Cancel any pending request (mark as cancelled)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request (for tracking cancellation)
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    // Perform search
    const performSearch = async () => {
      try {
        // Check if component is still mounted before setting loading
        if (!isMounted || abortSignal.aborted) return;
        setIsSearching(true);
        
        const searchLower = debouncedTerm.toLowerCase().trim();

        // Search profiles by display_name (case-insensitive)
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, bio")
          .ilike("display_name", `%${searchLower}%`)
          .limit(20);

        // Check if request was cancelled or component unmounted
        if (abortSignal.aborted || !isMounted) {
          console.log("[Search] Request cancelled or component unmounted");
          return;
        }

        if (error) {
          console.error("Error searching users:", error);
          if (isMounted) {
            setSearchResults([]);
          }
          return;
        }

        console.log("[Search] fetched:", data?.length ?? 0);

        // Check again before setting state
        if (!isMounted || abortSignal.aborted) return;

        // Get current followingMap and user (capture at time of setting results)
        // Note: followingMap and user are not in deps to prevent loops, but we capture them here
        setSearchResults((prevResults) => {
          // Use the latest followingMap from closure
          const currentFollowingMap = followingMap;
          const currentUser = user;
          
          // Filter out current user and map following status
          return (data || [])
            .filter((profile) => profile.id !== currentUser?.id)
            .map((profile) => ({
              ...profile,
              isFollowing: currentFollowingMap[profile.id] || false,
            }));
        });
      } catch (error: any) {
        // Ignore abort errors
        if (error?.name === 'AbortError' || abortSignal.aborted || !isMounted) {
          console.log("[Search] Request cancelled");
          return;
        }
        console.error("Error in searchUsers:", error);
        if (isMounted && !abortSignal.aborted) {
          setSearchResults([]);
        }
      } finally {
        // Only update loading state if component is still mounted and not aborted
        if (isMounted && !abortSignal.aborted) {
          setIsSearching(false);
        }
      }
    };

    performSearch();

    // Cleanup: mark as unmounted and abort request
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedTerm]); // ONLY depend on debouncedTerm

  const loadFollowingStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (error) {
        console.error("Error loading following status:", {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }

      const following: Record<string, boolean> = {};
      (data || []).forEach((follow) => {
        following[follow.following_id] = true;
      });
      setFollowingMap(following);
    } catch (error: any) {
      console.error("Error in loadFollowingStatus:", {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
    }
  };

  // Note: searchUsers function removed - search logic moved into useEffect

  const handleFollowToggle = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!user || !isAuthenticated) {
      router.push("/login");
      return;
    }

    try {
      if (currentlyFollowing) {
        // Unfollow: Delete the follow relationship
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        if (error) throw error;

        // Optimistic update
        setFollowingMap((prev) => ({ ...prev, [targetUserId]: false }));
        setSearchResults((prev) =>
          prev.map((profile) =>
            profile.id === targetUserId ? { ...profile, isFollowing: false } : profile
          )
        );
      } else {
        // Follow: Create the follow relationship
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) throw error;

        // Optimistic update
        setFollowingMap((prev) => ({ ...prev, [targetUserId]: true }));
        setSearchResults((prev) =>
          prev.map((profile) =>
            profile.id === targetUserId ? { ...profile, isFollowing: true } : profile
          )
        );
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      // Revert optimistic update on error
      await loadFollowingStatus();
      // Refresh following status in results (don't trigger new search)
      setSearchResults((prev) =>
        prev.map((profile) => ({
          ...profile,
          isFollowing: followingMap[profile.id] || false,
        }))
      );
    }
  };

  const getInitials = (name: string | null | undefined, userId: string) => {
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

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto w-full">
          <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-center mb-6 text-gold-dark">
            Search Users
          </h1>

          {/* Search Input */}
          <div className="glass-dark rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
              />
              {isSearching && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gold"></div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {debouncedTerm.trim().length >= 2 && (
            <div className="space-y-3">
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
                  <p className="text-gray-600">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="glass-dark rounded-2xl p-12 text-center">
                  <p className="text-gray-600">No users found</p>
                </div>
              ) : (
                searchResults.map((profile) => {
                  const displayName = profile.display_name || "User";
                  const initials = getInitials(profile.display_name, profile.id);
                  const isFollowing = profile.isFollowing || false;

                  return (
                    <div
                      key={profile.id}
                      className="glass-dark rounded-2xl p-4 flex items-center gap-4 hover:bg-gold/5 transition-colors"
                    >
                      {/* Avatar */}
                      <Link href={`/u/${profile.id}`} className="flex-shrink-0">
                        {profile.avatar_url && isValidUrl(profile.avatar_url) ? (
                          <img
                            src={profile.avatar_url}
                            alt={displayName}
                            className="w-14 h-14 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement("div");
                                fallback.className =
                                  "w-14 h-14 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg";
                                fallback.textContent = initials;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg">
                            {initials}
                          </div>
                        )}
                      </Link>

                      {/* User Info */}
                      <Link href={`/u/${profile.id}`} className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
                        {profile.bio && (
                          <p className="text-sm text-gray-600 truncate">{profile.bio}</p>
                        )}
                      </Link>

                      {/* Follow Button */}
                      {isAuthenticated && user && user.id !== profile.id && (
                        <button
                          onClick={() => handleFollowToggle(profile.id, isFollowing)}
                          className={`px-4 py-2 rounded-xl font-semibold transition-all flex-shrink-0 ${
                            isFollowing
                              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              : "bg-gradient-to-r from-gold to-gold-light text-gray-900 hover:shadow-lg"
                          }`}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Empty State - No Search Query or too short */}
          {(!searchQuery.trim() || debouncedTerm.trim().length < 2) && (
            <div className="glass-dark rounded-2xl p-12 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-600">
                {searchQuery.trim() && debouncedTerm.trim().length < 2
                  ? "Type at least 2 characters to search"
                  : "Type to search for users by name"}
              </p>
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}

