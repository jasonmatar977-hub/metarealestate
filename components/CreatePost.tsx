"use client";

/**
 * Create Post Component
 * Facebook/Instagram-style post creation UI
 * Only visible when user is authenticated
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface CreatePostProps {
  onPostCreated: (post: {
    id: number;
    username: string;
    avatar: string;
    timestamp: string;
    content: string;
    imageUrl?: string;
    likes: number;
    comments: number;
  }) => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "U";
    const name = user.name || user.username || user.email;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create new post
    const newPost = {
      id: Date.now(), // Simple ID generation
      username: user?.name || user?.username || "User",
      avatar: getInitials(),
      timestamp: "Just now",
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      likes: 0,
      comments: 0,
    };

    // Callback to add post to feed
    onPostCreated(newPost);

    // Reset form
    setContent("");
    setImageUrl("");
    setIsSubmitting(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="glass-dark rounded-2xl p-4 mb-6">
      <div className="flex items-start space-x-3">
        {/* User Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg flex-shrink-0">
          {getInitials()}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none mb-3"
            maxLength={500}
          />

          {/* Image URL Input (Optional) */}
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="w-full px-4 py-2 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none mb-3 text-sm"
          />

          {/* Character Count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{content.length}/500</span>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

