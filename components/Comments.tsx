"use client";

/**
 * Comments Component
 * Displays comments for a post with ability to add new comments and like comments
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string | null;
  };
  likes_count: number;
  user_liked: boolean;
}

interface CommentsProps {
  postId: number;
  initialShowAll?: boolean;
}

export default function Comments({ postId, initialShowAll = false }: CommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(initialShowAll);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(showAll ? 100 : 3);

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get user IDs and fetch profiles
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      // Get comment likes
      const commentIds = commentsData.map((c) => c.id);
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', commentIds);

      // Merge data
      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      const commentsWithData = commentsData.map((comment) => {
        const profile = profilesMap.get(comment.user_id);
        const commentLikes = (likesData || []).filter((l) => l.comment_id === comment.id);

        return {
          ...comment,
          profile: profile ? { display_name: profile.display_name } : undefined,
          likes_count: commentLikes.length,
          user_liked: user ? commentLikes.some((l) => l.user_id === user.id) : false,
        };
      });

      setComments(commentsWithData);
    } catch (error) {
      console.error('Error in loadComments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId, showAll, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) {
        console.error('Error creating comment:', error);
      } else {
        setNewComment("");
        loadComments();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: number, currentlyLiked: boolean) => {
    if (!user || !isAuthenticated) return;

    try {
      if (currentlyLiked) {
        // Unlike
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });
      }
      loadComments();
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('feed.justNow') || 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string | null | undefined, userId: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return userId.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <div className="mt-4 border-t border-gold/20 pt-4">
      {/* Add Comment Form */}
      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('feed.addComment') || 'Add a comment...'}
              className="flex-1 px-4 py-2 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.loading') : t('feed.post')}
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">{t('common.loading')}</p>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          {t('feed.noComments') || 'No comments yet.'}
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-xs flex-shrink-0">
                  {getInitials(comment.profile?.display_name, comment.user_id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {comment.profile?.display_name || 'User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                  {isAuthenticated && (
                    <button
                      onClick={() => handleLike(comment.id, comment.user_liked)}
                      className={`text-xs flex items-center gap-1 ${
                        comment.user_liked ? 'text-red-500' : 'text-gray-500 hover:text-gold'
                      } transition-colors`}
                    >
                      <span>{comment.user_liked ? '❤️' : '🤍'}</span>
                      <span>{comment.likes_count}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Show More/Less Toggle */}
          {comments.length >= 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-sm text-gold hover:text-gold-dark font-semibold"
            >
              {showAll ? t('feed.showLess') || 'Show less' : t('feed.viewAll') || 'View all comments'}
            </button>
          )}
        </>
      )}
    </div>
  );
}















