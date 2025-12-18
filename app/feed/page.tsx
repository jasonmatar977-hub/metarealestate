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

  // Load posts from Supabase
  const loadPosts = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoadingPosts(true);

      // Fetch posts with profile data and like counts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles:user_id (
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) {
        throw postsError;
      }

      // Get like counts and user's likes
      if (postsData && user) {
        const postIds = postsData.map((p) => p.id);
        
        // Get all likes for these posts
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id, user_id')
          .in('post_id', postIds);

        // Count likes per post and check if user liked
        const postsWithLikes = postsData.map((post) => {
          const postLikes = likesData?.filter((l) => l.post_id === post.id) || [];
          return {
            ...post,
            likes_count: postLikes.length,
            user_liked: postLikes.some((l) => l.user_id === user.id),
          };
        });

        setPosts(postsWithLikes as Post[]);
      } else {
        setPosts(postsData || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
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
    if (isAuthenticated) {
      loadPosts();
    }
  }, [isAuthenticated, user]);

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
  const getInitials = (name: string | null | undefined, email: string | undefined) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
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
              <p className="text-gray-600">No posts yet. Be the first to post!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  postId={post.id}
                  username={post.profile?.display_name || "User"}
                  avatar={getInitials(post.profile?.display_name, undefined)}
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
