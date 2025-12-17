"use client";

/**
 * News Feed Page
 * Route: /feed
 * Instagram/Facebook-style vertical feed
 * 
 * SECURITY: Protected route - requires authentication
 * All post content is treated as untrusted and rendered safely
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import CreatePost from "@/components/CreatePost";

// Mock feed data
// SECURITY NOTE: In production, this should come from a secure backend API
const MOCK_POSTS = [
  {
    id: 1,
    username: "Sarah Johnson",
    avatar: "SJ",
    timestamp: "2 hours ago",
    content: "Just closed on my dream home! 🏠 Thanks to Meta Real Estate for making the process so smooth. The AI matching system found exactly what I was looking for!",
    likes: 42,
    comments: 8,
  },
  {
    id: 2,
    username: "Michael Chen",
    avatar: "MC",
    timestamp: "5 hours ago",
    content: "Market insights from Meta Real Estate helped me make an informed investment decision. The data-driven approach is game-changing! 📊",
    likes: 67,
    comments: 12,
  },
  {
    id: 3,
    username: "Emma Rodriguez",
    avatar: "ER",
    timestamp: "1 day ago",
    content: "Sold my property in record time! The platform connected me with serious buyers immediately. Highly recommend! ✨",
    likes: 89,
    comments: 15,
  },
  {
    id: 4,
    username: "David Kim",
    avatar: "DK",
    timestamp: "2 days ago",
    content: "Exploring properties through virtual reality tours is incredible. Technology meets real estate! 🥽",
    likes: 124,
    comments: 23,
  },
  {
    id: 5,
    username: "Lisa Anderson",
    avatar: "LA",
    timestamp: "3 days ago",
    content: "The AI-powered recommendations are spot-on. Found three properties that perfectly match my criteria. This is the future of house hunting! 🤖",
    likes: 156,
    comments: 31,
  },
];

interface Post {
  id: number;
  username: string;
  avatar: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
}

export default function FeedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);

  useEffect(() => {
    // SECURITY: Front-end route protection
    // TODO: Implement server-side protection with middleware/API routes
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

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

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-orbitron text-4xl md:text-5xl font-bold text-center mb-4 text-gold-dark">
            News Feed
          </h1>
          <p className="text-center text-gray-600 mb-8 text-lg">
            Stay updated with the latest from our community
          </p>

          {/* Create Post UI - Only for authenticated users */}
          {isAuthenticated && (
            <CreatePost
              onPostCreated={(newPost) => {
                // Add new post to the beginning of the feed
                setPosts((prev) => [newPost, ...prev]);
              }}
            />
          )}

          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                username={post.username}
                avatar={post.avatar}
                timestamp={post.timestamp}
                content={post.content}
                imageUrl={post.imageUrl}
                likes={post.likes}
                comments={post.comments}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

