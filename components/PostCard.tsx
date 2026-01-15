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
import { isValidUrl } from "@/lib/utils";
import VerifiedBadge from "@/components/VerifiedBadge";

interface PostCardProps {
  postId: number;
  userId: string; // Post owner's user_id
  username: string;
  avatar: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  likes: number;
  userLiked: boolean;
  comments?: number;
  onLikeToggle: () => void;
  onPostDeleted?: () => void; // Callback when post is deleted
  authorVerified?: boolean;
  authorRole?: string;
}

export default function PostCard({
  postId,
  userId,
  username,
  avatar,
  timestamp,
  content,
  imageUrl,
  likes,
  userLiked: initialUserLiked,
  comments = 0,
  onLikeToggle,
  onPostDeleted,
  authorVerified,
  authorRole,
}: PostCardProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [currentUserLiked, setCurrentUserLiked] = useState(initialUserLiked);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  
  // Check if current user is the post owner or admin
  const isPostOwner = user?.id === userId;
  const isAdmin = user?.role === 'admin';
  const canDelete = isPostOwner || isAdmin;

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

  /**
   * Extract file path from Supabase Storage URL
   * Example: https://xxx.supabase.co/storage/v1/object/public/post-media/file.jpg
   * Returns: file.jpg
   */
  const extractStoragePath = (url: string): string | null => {
    try {
      // Check if it's a Supabase storage URL
      const storagePattern = /\/storage\/v1\/object\/public\/post-media\/(.+)$/;
      const match = url.match(storagePattern);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      
      // If it's just a filename (legacy format)
      if (!url.includes('/') && !url.startsWith('http')) {
        return url;
      }
      
      // Try to extract from any URL path
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      if (fileName && fileName.includes('.')) {
        return fileName;
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting storage path:", error);
      return null;
    }
  };

  /**
   * Delete post and associated image from storage
   */
  const handleDelete = async () => {
    if (!user || !canDelete) {
      console.error("Delete attempted but user is not post owner or admin");
      return;
    }
    
    // Confirm dialog
    const confirmed = window.confirm("Are you sure you want to delete this post?");
    if (!confirmed) {
      console.log("Delete cancelled by user");
      return;
    }

    setIsDeleting(true);
    setShowDeleteMenu(false); // Close menu immediately
    
    console.log("=== DELETING POST ===");
    console.log("Post ID:", postId);
    console.log("User ID:", user.id);
    console.log("Post owner ID:", userId);
    console.log("Is post owner:", isPostOwner);

    try {
      // Step 1: Delete image from storage if it exists
      if (imageUrl) {
        console.log("Deleting storage file...");
        console.log("Image URL:", imageUrl);
        
        const storagePath = extractStoragePath(imageUrl);
        console.log("Extracted storage path:", storagePath);
        
        if (storagePath) {
          const { error: storageError, data: storageData } = await supabase.storage
            .from('post-media')
            .remove([storagePath]);

          if (storageError) {
            console.error("=== STORAGE DELETE ERROR ===");
            console.error("Full error:", storageError);
            console.error("Error message:", storageError.message);
            console.error("Error name:", (storageError as any)?.name);
            // Continue with DB delete even if storage delete fails
          } else {
            console.log("✅ Deleted storage file:", storagePath);
            console.log("Storage delete data:", storageData);
          }
        } else {
          console.warn("⚠️ Could not extract storage path from URL:", imageUrl);
        }
      }

      // Step 2: Delete post from database
      console.log("Deleting DB row...");
      let deleteQuery = supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      // Only add user_id check if not admin (admin can delete any post)
      if (!isAdmin) {
        deleteQuery = deleteQuery.eq('user_id', user.id);
      }
      
      const { error: deleteError, data: deleteData } = await deleteQuery;

      if (deleteError) {
        console.error("=== DELETE POST ERROR ===");
        console.error("Full error object:", deleteError);
        console.error("Error message:", deleteError.message);
        console.error("Error details:", deleteError.details);
        console.error("Error hint:", deleteError.hint);
        console.error("Error code:", deleteError.code);
        throw deleteError;
      }

      console.log("✅ Deleted DB row for post:", postId);
      console.log("Delete response data:", deleteData);
      
      // Step 3: Show success message
      alert("Post deleted successfully!");
      
      // Step 4: Refresh feed (optimistic UI - callback will update state)
      if (onPostDeleted) {
        onPostDeleted();
      }
    } catch (error: any) {
      console.error("=== DELETE POST CATCH ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error details:", error?.details);
      console.error("Error hint:", error?.hint);
      console.error("Error code:", error?.code);
      alert(`Failed to delete post: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteMenu(false);
    }
  };


  return (
    <div className="glass-dark rounded-2xl shadow-lg" style={{ overflow: 'visible' }}>
      {/* Header */}
      <div className="p-4 flex items-center space-x-3 border-b border-gold/20 relative" style={{ overflow: 'visible' }}>
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg flex-shrink-0">
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate">{username}</h3>
            <VerifiedBadge 
              isVerified={authorVerified} 
              role={authorRole}
              size="sm"
            />
          </div>
          <p className="text-sm text-gray-500">{timestamp}</p>
        </div>
        {/* Delete Button - Only show for post owner or admin */}
        {canDelete && (
          <div className="relative flex-shrink-0" style={{ zIndex: 50 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteMenu(!showDeleteMenu);
              }}
              className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="More options"
              disabled={isDeleting}
              type="button"
              style={{ zIndex: 50 }}
            >
              <span className="text-xl leading-none">⋯</span>
            </button>
            {/* Dropdown menu */}
            {showDeleteMenu && (
              <>
                {/* Backdrop to close menu on click outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDeleteMenu(false)}
                />
                {/* Menu dropdown */}
                <div 
                  className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                  style={{ zIndex: 50 }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center space-x-2"
                    type="button"
                  >
                    <span>{isDeleting ? "⏳" : "🗑️"}</span>
                    <span>{isDeleting ? "Deleting..." : "Delete Post"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-700 mb-4 whitespace-pre-wrap break-words">{content}</p>
        {imageUrl && isValidUrl(imageUrl) && (
          <div className="rounded-xl overflow-hidden mb-4 max-w-[520px] mx-auto">
            <div className="aspect-[4/5] w-full bg-gray-100 rounded-xl overflow-hidden">
              <img
                src={imageUrl}
                alt="Post content"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("=== IMAGE LOAD ERROR ===");
                  console.error("Failed to load image URL:", imageUrl);
                  console.error("Image element:", e.target);
                  // Hide broken images
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                onLoad={() => {
                  console.log("✅ Image loaded successfully:", imageUrl);
                }}
              />
            </div>
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
