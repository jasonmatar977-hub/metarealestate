"use client";

/**
 * News Feed Page
 * Route: /feed
 * Instagram/Facebook-style vertical feed with Supabase integration
 * 
 * SECURITY: Protected route - requires authentication
 * All post content is treated as untrusted and rendered safely
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import CreatePost from "@/components/CreatePost";

interface Post {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string | null;
  };
  likes_count?: number;
  user_liked?: boolean;
}

export default function FeedPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load posts from Supabase with fallback approach
  const loadPosts = async () => {
    if (!isAuthenticated || !user) return;

    try {
      setIsLoadingPosts(true);
      setError(null);

      console.log("=== LOADING POSTS ===");
      console.log("User authenticated:", isAuthenticated);
      console.log("User ID:", user?.id);

      // Step 1: Fetch posts (simple query, no join)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) {
        console.error("=== POSTS ERROR ===");
        console.error("Full error:", postsError);
        console.error("Error message:", postsError.message);
        console.error("Error details:", postsError.details);
        console.error("Error hint:", postsError.hint);
        console.error("Error code:", postsError.code);
        throw postsError;
      }

      console.log("Posts fetched:", postsData?.length || 0);

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setIsLoadingPosts(false);
        return;
      }

      // Step 2: Get unique user IDs from posts
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      console.log("Unique user IDs:", userIds);

      // Step 3: Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      if (profilesError) {
        console.error("=== PROFILES ERROR ===");
        console.error("Full error:", profilesError);
        console.error("Error message:", profilesError.message);
        console.error("Error details:", profilesError.details);
        console.error("Error hint:", profilesError.hint);
        console.error("Error code:", profilesError.code);
        // Continue without profiles if error
      }

      console.log("Profiles fetched:", profilesData?.length || 0);

      // Step 4: Get like counts and user's likes
      const postIds = postsData.map((p) => p.id);
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

      // Step 5: Merge data
      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      const postsWithData = postsData.map((post) => {
        const profile = profilesMap.get(post.user_id);
        const postLikes = (likesData || []).filter((l) => l.post_id === post.id);
        
        return {
          ...post,
          profile: profile ? { display_name: profile.display_name } : undefined,
          likes_count: postLikes.length,
          user_liked: postLikes.some((l) => l.user_id === user.id),
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
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPosts();
    }
  }, [isAuthenticated, user?.id]);

  // Show loading state while checking auth
  if (isLoading) {
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

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={loadPosts}
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
              <p className="text-gray-600 mb-4">No posts yet. Be the first to post!</p>
              <button
                onClick={loadPosts}
                className="text-gold hover:text-gold-dark font-semibold underline"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  postId={post.id}
                  username={post.profile?.display_name || "User"}
                  avatar={getInitials(post.profile?.display_name, post.user_id)}
                  timestamp={formatTimestamp(post.created_at)}
                  content={post.content}
                  likes={post.likes_count || 0}
                  userLiked={post.user_liked || false}
                  onLikeToggle={loadPosts}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
