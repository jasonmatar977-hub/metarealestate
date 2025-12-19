"use client";

/**
 * Post Card Component
 * Displays a single post in the news feed (Instagram/Facebook style)
 * 
 * SECURITY: All text content is rendered safely (no dangerouslySetInnerHTML)
 * Supports likes via Supabase
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Comments from "@/components/Comments";

interface PostCardProps {
  postId: number;
  username: string;
  avatar: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  likes: number;
  userLiked: boolean;
  comments?: number;
  onLikeToggle: () => void;
}

export default function PostCard({
  postId,
  username,
  avatar,
  timestamp,
  content,
  imageUrl,
  likes,
  userLiked: initialUserLiked,
  comments = 0,
  onLikeToggle,
}: PostCardProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [currentUserLiked, setCurrentUserLiked] = useState(initialUserLiked);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);

    try {
      if (currentUserLiked) {
        // Unlike: delete like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (!error) {
          setCurrentLikes((prev) => Math.max(0, prev - 1));
          setCurrentUserLiked(false);
        }
      } else {
        // Like: insert like
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (!error) {
          setCurrentLikes((prev) => prev + 1);
          setCurrentUserLiked(true);
        }
      }

      // Refresh feed to get accurate counts
      onLikeToggle();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="glass-dark rounded-2xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 flex items-center space-x-3 border-b border-gold/20">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg flex-shrink-0">
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{username}</h3>
          <p className="text-sm text-gray-500">{timestamp}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-700 mb-4 whitespace-pre-wrap break-words">{content}</p>
        {imageUrl && (
          <div className="rounded-xl overflow-hidden mb-4">
            <img
              src={imageUrl}
              alt="Post content"
              className="w-full h-auto"
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center space-x-6 text-gray-600">
        <button
          onClick={handleLike}
          disabled={!user || isLiking}
          className={`flex items-center space-x-2 transition-colors ${
            currentUserLiked ? "text-red-500" : "hover:text-gold"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span>{currentUserLiked ? "❤️" : "🤍"}</span>
          <span>{currentLikes}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 hover:text-gold transition-colors"
        >
          <span>💬</span>
          <span>{comments}</span>
        </button>
        <button className="flex items-center space-x-2 hover:text-gold transition-colors">
          <span>📤</span>
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4">
          <Comments postId={postId} initialShowAll={false} />
        </div>
      )}
    </div>
  );
}
