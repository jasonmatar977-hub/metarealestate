"use client";

/**
 * Create Post Component
 * Facebook/Instagram-style post creation UI
 * Only visible when user is authenticated
 * Posts are saved to Supabase
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface CreatePostProps {
  onPostCreated: () => void; // Callback to refresh feed
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!content.trim() || isSubmitting || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Insert post into Supabase
      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
        });

      if (insertError) {
        throw insertError;
      }

      // Reset form
      setContent("");
      setImageUrl("");
      
      // Refresh feed
      onPostCreated();
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
            }}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none mb-3"
            maxLength={500}
          />

          {/* Image URL Input (Optional) - For future use */}
          {/* <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="w-full px-4 py-2 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none mb-3 text-sm"
          /> */}

          {error && (
            <div className="mb-3 p-3 bg-red-50 border-2 border-red-500 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

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
