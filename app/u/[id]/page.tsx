"use client";

/**
 * Public User Profile Page
 * Route: /u/[id]
 * View any user's public profile with follow/unfollow
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { findOrCreateDirectConversation } from "@/lib/messages";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import { isValidUrl } from "@/lib/utils";
import { requestGuard, normalizeSupabaseError, isAuthError, debugLog, withTimeout } from "@/lib/asyncGuard";
import { useLanguage } from "@/contexts/LanguageContext";
import FollowersFollowingModal from "@/components/FollowersFollowingModal";

// Clickable button component for Followers/Following counts
function FollowersFollowingButton({
  count,
  label,
  profileId,
  isOwnProfile,
  tab,
}: {
  count: number;
  label: string;
  profileId: string;
  isOwnProfile: boolean;
  tab: "followers" | "following";
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="text-2xl font-bold text-gold-dark">{count}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
      <FollowersFollowingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profileId={profileId}
        isOwnProfile={isOwnProfile}
        initialTab={tab}
      />
    </>
  );
}

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  phone_public: boolean;
  created_at: string;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const userId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Use refs to prevent double-loading in strict mode
  const hasLoadedRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!userId || loadingRef.current) return;
    
    // Prevent double-loading
    if (hasLoadedRef.current === userId) return;
    
    loadingRef.current = true;
    hasLoadedRef.current = userId;
    
    const loadData = async () => {
      try {
        await Promise.all([
          loadProfile(),
          loadUserPosts(),
          loadCounts(),
        ]);
        
        if (isAuthenticated && user) {
          await checkFollowingStatus();
        }
      } finally {
        loadingRef.current = false;
      }
    };
    
    loadData();
  }, [userId]); // Remove isAuthenticated and user from deps to prevent loops

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        if (error.code === "PGRST116") {
          // Profile not found
          setProfile(null);
        }
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Error in loadProfile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, content, created_at, image_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        console.error("Error loading user posts:", error);
      } else {
        setUserPosts(data || []);

        // Load likes and comments for each post
        const postIds = (data || []).map((p) => p.id);
        if (postIds.length > 0) {
          const [likesData, commentsData] = await Promise.all([
            supabase
              .from("likes")
              .select("post_id, user_id")
              .in("post_id", postIds),
            supabase
              .from("comments")
              .select("post_id")
              .in("post_id", postIds),
          ]);

          const postsWithData = (data || []).map((post) => {
            const postLikes = (likesData.data || []).filter((l) => l.post_id === post.id);
            const postComments = (commentsData.data || []).filter((c) => c.post_id === post.id);
            return {
              ...post,
              likes_count: postLikes.length,
              user_liked: postLikes.some((l) => l.user_id === user?.id),
              comments_count: postComments.length,
            };
          });

          setUserPosts(postsWithData);
        }
      }
    } catch (error) {
      console.error("Error in loadUserPosts:", error);
    }
  };

  const loadCounts = async () => {
    try {
      // Posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      setPostsCount(postsCount || 0);

      // Followers count (users who follow this user)
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);
      setFollowersCount(followersCount || 0);

      // Following count (users this user follows)
      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);
      setFollowingCount(followingCount || 0);
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  };

  const checkFollowingStatus = async () => {
    if (!user || !isAuthenticated || !userId) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking follow status:", {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }

      setIsFollowing(!!data);
    } catch (error: any) {
      console.error("Error in checkFollowingStatus:", {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
    }
  };

  const handleFollowToggle = useCallback(async () => {
    if (!user || !isAuthenticated) {
      router.push("/login");
      return;
    }

    // Prevent following yourself
    if (user.id === userId) {
      alert("You cannot follow yourself");
      return;
    }

    // Check if user is blocked (I blocked them OR they blocked me)
    try {
      // Check if I blocked them
      const { data: iBlockedThem } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", userId)
        .single();

      if (iBlockedThem) {
        alert(t("profile.cannotFollowBlocked") || "You cannot follow a user you have blocked.");
        return;
      }

      // Check if they blocked me (if RLS allows reading blocks where blocked_id = me)
      // Note: This might not work if RLS doesn't allow it, but we try
      const { data: theyBlockedMe } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", userId)
        .eq("blocked_id", user.id)
        .single();

      if (theyBlockedMe) {
        alert(t("profile.cannotFollowBlocked") || "You cannot follow this user.");
        return;
      }
    } catch (error) {
      // If block check fails (e.g., RLS doesn't allow), continue with follow attempt
      console.warn("Could not check block status (may be RLS restricted):", error);
    }

    // Request guard to prevent duplicate requests
    const requestKey = `follow-${user.id}-${userId}`;
    if (!requestGuard.start(requestKey)) {
      debugLog('[Profile] Follow request already in flight, skipping');
      return;
    }

    try {
      setIsTogglingFollow(true);

      // Optimistic UI update
      const previousFollowing = isFollowing;
      const previousCount = followersCount;
      
      setIsFollowing(!isFollowing);
      setFollowersCount((prev) => (isFollowing ? Math.max(0, prev - 1) : prev + 1));

      if (previousFollowing) {
        // Unfollow
        const deletePromise = Promise.resolve(
          supabase
            .from("follows")
            .delete()
            .eq("follower_id", user.id)
            .eq("following_id", userId)
        ) as Promise<{ error: any }>;
        
        const { error } = await withTimeout(deletePromise, 10000, 'Unfollow');

        if (error) {
          const normalized = normalizeSupabaseError(error);
          debugLog('[Profile] Unfollow error:', normalized);
          
          // Revert optimistic update
          setIsFollowing(previousFollowing);
          setFollowersCount(previousCount);
          
          // Check for auth errors
          if (isAuthError(error)) {
            alert("Session expired. Please log in again.");
            router.push("/login");
            return;
          }
          
          alert(normalized.message || "Failed to unfollow user. Please try again.");
          return;
        }
      } else {
        // Follow
        const insertPromise = Promise.resolve(
          supabase
            .from("follows")
            .insert({
              follower_id: user.id,
              following_id: userId,
            })
        ) as Promise<{ error: any }>;
        
        const { error } = await withTimeout(insertPromise, 10000, 'Follow');

        if (error) {
          const normalized = normalizeSupabaseError(error);
          debugLog('[Profile] Follow error:', normalized);
          
          // Revert optimistic update
          setIsFollowing(previousFollowing);
          setFollowersCount(previousCount);
          
          // Check for auth errors
          if (isAuthError(error)) {
            alert("Session expired. Please log in again.");
            router.push("/login");
            return;
          }
          
          // Show user-friendly error message
          if (normalized.code === '23505') {
            // Unique constraint violation - already following
            alert("You are already following this user");
          } else if (normalized.code === '23514') {
            // Check constraint violation - trying to follow self
            alert("You cannot follow yourself");
          } else {
            alert(normalized.message || "Failed to follow user. Please try again.");
          }
          return;
        }
      }
      
      // Refetch counts to ensure accuracy
      await loadCounts();
    } catch (error: any) {
      const normalized = normalizeSupabaseError(error);
      debugLog('[Profile] Follow toggle exception:', normalized);
      console.error("Error toggling follow:", {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      // Re-check status on error
      await checkFollowingStatus();
      await loadCounts();
    } finally {
      // ALWAYS clear loading state and finish request guard
      setIsTogglingFollow(false);
      requestGuard.finish(requestKey);
    }
  }, [user, isAuthenticated, userId, isFollowing, followersCount, router, loadCounts, checkFollowingStatus]);

  const handleStartChat = async () => {
    if (!user || !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isStartingChat) return;

    try {
      setIsStartingChat(true);
      console.log("[Profile] Starting conversation with user:", userId);
      
      const { conversationId, error } = await findOrCreateDirectConversation(user.id, userId);

      if (error) {
        console.error("[Profile] ERROR finding/creating conversation:", {
          error,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          status: (error as any)?.status,
        });
        alert(`Failed to start conversation: ${error?.message || "Please try again."}`);
        return;
      }

      if (!conversationId) {
        console.error("[Profile] No conversationId returned");
        alert("Failed to start conversation. Please try again.");
        return;
      }

      console.log("[Profile] Conversation created/found:", conversationId, "Navigating...");
      router.push(`/messages/${conversationId}`);
    } catch (error: any) {
      console.error("Error in handleStartChat:", error);
      alert(`Failed to start conversation: ${error?.message || "Please try again."}`);
    } finally {
      // ALWAYS clear loading state to prevent stuck button
      setIsStartingChat(false);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
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

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-20 px-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="glass-dark rounded-2xl p-12">
              <p className="text-gray-600 mb-4">User not found</p>
              <Link
                href="/search"
                className="text-gold hover:text-gold-dark font-semibold underline"
              >
                Search for users
              </Link>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    );
  }

  const displayName = profile.display_name || "User";
  const initials = getInitials(profile.display_name, profile.id);
  const isOwnProfile = user?.id === userId;

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="glass-dark rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-3xl sm:text-4xl flex-shrink-0">
                {profile.avatar_url && isValidUrl(profile.avatar_url) ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.textContent = initials;
                      }
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="font-orbitron text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {displayName}
                </h1>
                {profile.bio && (
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{profile.bio}</p>
                )}
                <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-gray-600">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <span>📍</span>
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {/* Phone: Show only if phone_public is true OR viewer is the owner */}
                  {profile.phone && (isOwnProfile || profile.phone_public) && (
                    <div className="flex items-center gap-1">
                      <span>📞</span>
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {/* Show "Hidden" indicator if phone exists but is not public and viewer is not owner */}
                  {profile.phone && !isOwnProfile && !profile.phone_public && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <span>📞</span>
                      <span className="text-xs italic">
                        {t('profile.phoneHidden') || 'Hidden'}
                      </span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <span>🌐</span>
                      <a
                        href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold hover:text-gold-dark"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Follow/Edit/Message Buttons */}
              {isOwnProfile ? (
                <Link
                  href="/profile/edit"
                  className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  Edit Profile
                </Link>
              ) : isAuthenticated ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleFollowToggle}
                    disabled={isTogglingFollow}
                    className={`px-6 py-2 font-bold rounded-xl transition-all ${
                      isFollowing
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-gradient-to-r from-gold to-gold-light text-gray-900 hover:shadow-lg"
                    } ${isTogglingFollow ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isTogglingFollow ? "..." : isFollowing ? "Following" : "Follow"}
                  </button>
                  <button
                    onClick={handleStartChat}
                    disabled={isStartingChat}
                    className={`px-6 py-2 font-bold rounded-xl transition-all bg-white border-2 border-gold text-gold hover:bg-gold hover:text-gray-900 ${
                      isStartingChat ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isStartingChat ? "..." : "Message"}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  Follow
                </Link>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="glass-dark rounded-2xl p-6 mb-6">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-gold-dark">{postsCount}</div>
                <div className="text-sm text-gray-600">Posts</div>
              </div>
              <FollowersFollowingButton
                count={followersCount}
                label={t("profile.followers") || "Followers"}
                profileId={userId}
                isOwnProfile={isOwnProfile}
                tab="followers"
              />
              <FollowersFollowingButton
                count={followingCount}
                label={t("profile.following") || "Following"}
                profileId={userId}
                isOwnProfile={isOwnProfile}
                tab="following"
              />
            </div>
          </div>

          {/* User's Posts Grid */}
          <div className="mb-6">
            <h2 className="font-orbitron text-xl font-bold text-gray-900 mb-4">Posts</h2>
            {userPosts.length === 0 ? (
              <div className="glass-dark rounded-2xl p-12 text-center">
                <p className="text-gray-600">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {userPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    postId={post.id}
                    userId={post.user_id}
                    username={displayName}
                    avatar={initials}
                    timestamp={formatTimestamp(post.created_at)}
                    content={post.content}
                    imageUrl={post.image_url || undefined}
                    likes={post.likes_count || 0}
                    userLiked={post.user_liked || false}
                    comments={post.comments_count || 0}
                    onLikeToggle={loadUserPosts}
                    onPostDeleted={loadUserPosts}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}

