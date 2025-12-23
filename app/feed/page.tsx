"use client";

/**
 * News Feed Page
 * Route: /feed
 * Instagram/Facebook-style vertical feed with Supabase integration
 * 
 * SECURITY: Protected route - requires authentication
 * All post content is treated as untrusted and rendered safely
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";

// DEBUG: Log import path
console.log('[Feed] PostCard import path:', '@/components/PostCard');
import CreatePost from "@/components/CreatePost";
import MobileBottomNav from "@/components/MobileBottomNav";

interface Post {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  image_url?: string | null;
  profile?: {
    display_name: string | null;
  };
  likes_count?: number;
  user_liked?: boolean;
  comments_count?: number;
}

type FeedTab = "foryou" | "following";

export default function FeedPage() {
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false); // Prevent infinite redirect loops
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null); // Track which post is being deleted
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

  // Load posts from Supabase with fallback approach
  const loadPosts = async (tab: FeedTab = activeTab) => {
    if (!isAuthenticated || !user) return;

    // Check if Supabase is properly configured
    if (!isSupabaseConfigured()) {
      console.error("⚠️ Supabase not configured. Please set environment variables in Vercel.");
      setError("Supabase is not configured. Please contact support.");
      setIsLoadingPosts(false);
      return;
    }

    try {
      setIsLoadingPosts(true);
      setError(null);

      console.log("=== LOADING POSTS ===");
      console.log("User authenticated:", isAuthenticated);
      console.log("User ID:", user?.id);
      console.log("Feed tab:", tab);
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "NOT SET");

      // Step 1: Get followed user IDs if "Following" tab
      let followedUserIds: string[] = [];
      if (tab === "following") {
        if (!user) {
          setPosts([]);
          setIsLoadingPosts(false);
          return;
        }
        const { data: followsData, error: followsError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (followsError) {
          console.error("Error loading follows:", followsError);
        } else {
          followedUserIds = (followsData || []).map((f) => f.following_id);
          if (followedUserIds.length === 0) {
            // No follows, load suggested users
            loadSuggestedUsers();
            setPosts([]);
            setIsLoadingPosts(false);
            return;
          }
        }
      }

      // Step 2: Fetch posts (filtered by followed users if "Following" tab)
      let postsQuery = supabase
        .from('posts')
        .select('id, user_id, content, created_at, image_url')
        .order('created_at', { ascending: false })
        .limit(50);

      if (tab === "following" && followedUserIds.length > 0) {
        postsQuery = postsQuery.in('user_id', followedUserIds);
      }

      // Add timeout to prevent infinite loading (8 seconds)
      const postsQueryPromise = Promise.resolve(postsQuery) as Promise<{ data: any; error: any }>;
      const postsResult = await Promise.race([
        postsQueryPromise,
        new Promise<{ data: null; error: { message: string } }>((_, reject) => 
          setTimeout(() => reject({ data: null, error: { message: 'Posts query timed out after 8 seconds' } }), 8000)
        )
      ]).catch((error) => {
        console.error('[Feed] Posts query timeout:', error);
        setIsLoadingPosts(false);
        setError(error?.error?.message || 'Failed to load posts. Please try again.');
        return { data: null, error: { message: 'Query timed out' } };
      });
      
      const { data: postsData, error: postsError } = postsResult;

      if (postsError) {
        // Improved error logging - log actual error details, not "[Object]"
        console.error("[Feed] Posts query error details:", {
          message: postsError.message,
          code: postsError.code,
          details: postsError.details,
          hint: postsError.hint,
          status: (postsError as any).status,
        });
        setIsLoadingPosts(false);
        setError(postsError.message || "Failed to load posts. Please try again.");
        return;
      }

      console.log("Posts fetched:", postsData?.length || 0);

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setIsLoadingPosts(false);
        return;
      }

      // Step 3: Get unique user IDs from posts
      const userIds = [...new Set(postsData.map((p: any) => p.user_id))];
      console.log("Unique user IDs:", userIds);

      // Step 4: Fetch profiles for these users (with timeout - 8 seconds)
      const profilesQueryPromise = Promise.resolve(
        supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds)
      ) as Promise<{ data: any; error: any }>;
      
      const profilesResult = await Promise.race([
        profilesQueryPromise,
        new Promise<{ data: null; error: { message: string } }>((_, reject) => 
          setTimeout(() => reject({ data: null, error: { message: 'Profiles query timed out after 8 seconds' } }), 8000)
        )
      ]).catch((error) => {
        console.error('[Feed] Profiles query timeout:', error);
        // Continue without profiles - posts will still show
        return { data: null, error: { message: 'Query timed out' } };
      });
      
      const { data: profilesData, error: profilesError } = profilesResult;

      if (profilesError) {
        // Improved error logging - log actual error details, not "[Object]"
        console.error("[Feed] Profiles query error details:", {
          message: profilesError.message,
          code: profilesError.code,
          details: profilesError.details,
          hint: profilesError.hint,
        });
        // Continue without profiles if error - posts will still show
      }

      console.log("Profiles fetched:", profilesData?.length || 0);

      // Step 5: Get like counts and user's likes
      const postIds = postsData.map((p: any) => p.id);
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      if (likesError) {
        console.error("=== LIKES ERROR ===");
        console.error("Full error:", likesError);
        console.error("Error message:", likesError.message);
        console.error("Error details:", likesError.details);
        console.error("Error hint:", likesError.hint);
        console.error("Error code:", likesError.code);
        // Continue without likes if error
      }

      // Step 6: Get comment counts
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);

      if (commentsError) {
        console.error("=== COMMENTS ERROR ===");
        console.error("Full error:", commentsError);
        // Continue without comment counts if error
      }

      // Step 7: Merge data
      const profilesMap = new Map(
        (profilesData || []).map((p: any) => [p.id, p])
      );

      const postsWithData = postsData.map((post: any) => {
        const profile = profilesMap.get(post.user_id);
        const postLikes = (likesData || []).filter((l: any) => l.post_id === post.id);
        const postComments = (commentsData || []).filter((c: any) => c.post_id === post.id);
        
        // Debug log image URLs
        if (post.image_url) {
          console.log(`Post ${post.id} image_url:`, post.image_url);
          if (!post.image_url.startsWith('http')) {
            console.warn(`⚠️ Post ${post.id} has invalid image_url format:`, post.image_url);
          }
        }
        
        return {
          ...post,
          profile: profile ? { display_name: (profile as any).display_name } : undefined,
          likes_count: postLikes.length,
          user_liked: postLikes.some((l: any) => l.user_id === user.id),
          comments_count: postComments.length,
        };
      });

      console.log("Posts with merged data:", postsWithData.length);
      setPosts(postsWithData as Post[]);
    } catch (error: any) {
      console.error("=== LOAD POSTS ERROR ===");
      console.error("Full error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error details:", error?.details);
      console.error("Error hint:", error?.hint);
      console.error("Error code:", error?.code);
      console.error("Error stack:", error?.stack);
      
      setError(`Failed to load posts: ${error?.message || 'Unknown error'}`);
      setPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    // SECURITY: Front-end route protection
    // Do not redirect until initial session check completes
    // Prevent infinite redirect loops
    if (!loadingSession && !isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router, hasRedirected]);

  const hasLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Prevent double-loading for same tab
    const loadKey = `${user.id}-${activeTab}`;
    if (hasLoadedRef.current === loadKey) return;
    
    hasLoadedRef.current = loadKey;
    loadPosts(activeTab);
  }, [isAuthenticated, user?.id, activeTab]); // Only depend on user.id, not entire user object

  const loadSuggestedUsers = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .neq("id", user.id)
        .limit(5)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading suggested users:", error);
      } else {
        setSuggestedUsers(data || []);
      }
    } catch (error) {
      console.error("Error in loadSuggestedUsers:", error);
    }
  };

  // Show loading state while checking auth or initial session
  if (loadingSession || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // Show fallback UI while redirecting
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view the feed.</p>
          <a href="/login" className="text-gold hover:text-gold-dark font-semibold">
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  // Format timestamp (Instagram-style)
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
    
    // Format as "Dec 18, 2025" style
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Get user initials
  const getInitials = (name: string | null | undefined, userId: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    // Fallback to user ID initials
    return userId.slice(0, 2).toUpperCase() || "U";
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto w-full">
          <h1 className="font-orbitron text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-gold-dark">
            News Feed
          </h1>
          <p className="text-center text-gray-600 mb-8 text-base sm:text-lg">
            Stay updated with the latest from our community
          </p>

          {/* Feed Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gold/20">
            <button
              onClick={() => setActiveTab("foryou")}
              className={`flex-1 py-3 font-semibold transition-colors ${
                activeTab === "foryou"
                  ? "text-gold border-b-2 border-gold"
                  : "text-gray-600 hover:text-gold"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setError("Log in to see posts from people you follow");
                  return;
                }
                setActiveTab("following");
              }}
              className={`flex-1 py-3 font-semibold transition-colors ${
                activeTab === "following"
                  ? "text-gold border-b-2 border-gold"
                  : "text-gray-600 hover:text-gold"
              }`}
            >
              Following
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={() => loadPosts(activeTab)}
                className="mt-2 text-red-600 hover:text-red-800 text-sm font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Create Post UI - Only for authenticated users */}
          {isAuthenticated && <CreatePost onPostCreated={loadPosts} />}

          {/* Posts List */}
          {isLoadingPosts ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
              <p className="text-gray-600">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              {activeTab === "following" ? (
                <div className="glass-dark rounded-2xl p-8">
                  <p className="text-gray-600 mb-4">Follow people to see their posts</p>
                  {suggestedUsers.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Suggested Users</h3>
                      <div className="space-y-3">
                        {suggestedUsers.map((profile) => {
                          const displayName = profile.display_name || "User";
                          const initials = displayName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          return (
                            <Link
                              key={profile.id}
                              href={`/u/${profile.id}`}
                              className="flex items-center gap-3 p-3 bg-white/50 rounded-xl hover:bg-gold/10 transition-colors"
                            >
                              {profile.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt={displayName}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold">
                                  {initials}
                                </div>
                              )}
                              <span className="font-semibold text-gray-900">{displayName}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <Link
                    href="/search"
                    className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
                  >
                    Search Users
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">No posts yet. Be the first to post!</p>
                  <button
                    onClick={() => loadPosts(activeTab)}
                    className="text-gold hover:text-gold-dark font-semibold underline"
                  >
                    Refresh
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => {
                // DEBUG: Log post data before rendering PostCard
                console.log(`[Feed] Rendering PostCard for post ${post.id}:`, {
                  postId: post.id,
                  userId: post.user_id,
                  userIdType: typeof post.user_id,
                  userIdExists: !!post.user_id,
                  currentUser: user?.id,
                  currentUserType: typeof user?.id,
                  willBeOwner: user?.id === post.user_id
                });
                
                return (
                  <PostCard
                    key={post.id}
                    postId={post.id}
                    userId={post.user_id}
                    username={post.profile?.display_name || "User"}
                    avatar={getInitials(post.profile?.display_name, post.user_id)}
                    timestamp={formatTimestamp(post.created_at)}
                    content={post.content}
                    imageUrl={post.image_url || undefined}
                    likes={post.likes_count || 0}
                    userLiked={post.user_liked || false}
                    comments={post.comments_count || 0}
                    onLikeToggle={loadPosts}
                    onPostDeleted={() => {
                      // Optimistic UI: Remove post immediately from state
                      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id));
                      // Then refresh to get accurate counts
                      setTimeout(() => {
                        loadPosts(activeTab);
                      }, 100);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
