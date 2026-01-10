"use client";

/**
 * Comments Component
 * Displays comments for a post with ability to add new comments and like comments
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import VerifiedBadge from "@/components/VerifiedBadge";

interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: number | null;
  profile?: {
    display_name: string | null;
    is_verified?: boolean;
    role?: string;
  };
  likes_count: number;
  user_liked: boolean;
  replies?: Comment[]; // Nested replies (one level only)
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
  const [replyingTo, setReplyingTo] = useState<number | null>(null); // Track which comment we're replying to
  const [replyText, setReplyText] = useState<Record<number, string>>({}); // Store reply text per comment
  const [showReplies, setShowReplies] = useState<Set<number>>(new Set()); // Track which comments have replies expanded

  const loadComments = async () => {
    try {
      setIsLoading(true);
      // Fetch ALL comments for this post (including replies)
      // We'll group them in JavaScript to avoid complex joins
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at, parent_comment_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }); // Ascending to show oldest first (replies appear after parent)

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get user IDs and fetch profiles (including is_verified and role for badge)
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, is_verified, role')
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

      const allCommentsWithData = commentsData.map((comment) => {
        const profile = profilesMap.get(comment.user_id);
        const commentLikes = (likesData || []).filter((l) => l.comment_id === comment.id);

        return {
          ...comment,
          profile: profile ? { 
            display_name: profile.display_name,
            is_verified: profile.is_verified,
            role: profile.role,
          } : undefined,
          likes_count: commentLikes.length,
          user_liked: user ? commentLikes.some((l) => l.user_id === user.id) : false,
          replies: [] as Comment[], // Initialize replies array
        };
      });

      // Group comments: separate parents and replies
      const parentComments: Comment[] = [];
      const repliesMap = new Map<number, Comment[]>();

      allCommentsWithData.forEach((comment) => {
        if (comment.parent_comment_id === null) {
          // This is a parent comment
          parentComments.push(comment);
        } else {
          // This is a reply
          const parentId = comment.parent_comment_id;
          if (!repliesMap.has(parentId)) {
            repliesMap.set(parentId, []);
          }
          repliesMap.get(parentId)!.push(comment);
        }
      });

      // Attach replies to their parents
      parentComments.forEach((parent) => {
        parent.replies = repliesMap.get(parent.id) || [];
      });

      // Sort parent comments by created_at (newest first) for display
      parentComments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Sort replies by created_at (oldest first) so they appear in chronological order
      parentComments.forEach((parent) => {
        if (parent.replies && parent.replies.length > 0) {
          parent.replies.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
      });

      // Apply showAll limit to parent comments only (replies are always shown if parent is shown)
      const displayedComments = showAll 
        ? parentComments 
        : parentComments.slice(0, 3);

      setComments(displayedComments);
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
          parent_comment_id: null, // Explicitly set to null for parent comments
        });

      if (error) {
        console.error('Error creating comment:', error);
        alert(error.message || 'Failed to post comment. Please try again.');
      } else {
        setNewComment("");
        loadComments();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentCommentId: number) => {
    const replyContent = replyText[parentCommentId]?.trim();
    if (!user || !replyContent || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: replyContent,
          parent_comment_id: parentCommentId, // Set parent for reply
        });

      if (error) {
        console.error('Error creating reply:', error);
        alert(error.message || 'Failed to post reply. Please try again.');
      } else {
        // Clear reply text and close reply input
        setReplyText((prev) => {
          const next = { ...prev };
          delete next[parentCommentId];
          return next;
        });
        setReplyingTo(null);
        // Expand replies for this parent to show the new reply
        setShowReplies((prev) => new Set(prev).add(parentCommentId));
        loadComments();
      }
    } catch (error) {
      console.error('Error in handleReplySubmit:', error);
      alert('An error occurred. Please try again.');
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
            {comments.map((comment) => {
              const hasReplies = comment.replies && comment.replies.length > 0;
              const repliesVisible = showReplies.has(comment.id);
              
              return (
                <div key={comment.id}>
                  {/* Parent Comment */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-xs flex-shrink-0">
                      {getInitials(comment.profile?.display_name, comment.user_id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {comment.profile?.display_name || 'User'}
                        </span>
                        <VerifiedBadge 
                          isVerified={comment.profile?.is_verified} 
                          role={comment.profile?.role}
                          size="sm"
                        />
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-3">
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
                        {isAuthenticated && (
                          <button
                            onClick={() => {
                              setReplyingTo(replyingTo === comment.id ? null : comment.id);
                              if (replyingTo !== comment.id) {
                                setReplyText((prev) => ({ ...prev, [comment.id]: '' }));
                              }
                            }}
                            className="text-xs text-gold hover:text-gold-dark font-semibold transition-colors"
                          >
                            {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                          </button>
                        )}
                        {hasReplies && (
                          <button
                            onClick={() => {
                              const newShowReplies = new Set(showReplies);
                              if (repliesVisible) {
                                newShowReplies.delete(comment.id);
                              } else {
                                newShowReplies.add(comment.id);
                              }
                              setShowReplies(newShowReplies);
                            }}
                            className="text-xs text-gray-500 hover:text-gold font-semibold transition-colors"
                          >
                            {repliesVisible 
                              ? `Hide replies (${comment.replies!.length})` 
                              : `View replies (${comment.replies!.length})`}
                          </button>
                        )}
                      </div>

                      {/* Reply Input (inline) */}
                      {isAuthenticated && replyingTo === comment.id && (
                        <div className="mt-3 ml-0 pl-0">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyText[comment.id] || ''}
                              onChange={(e) => setReplyText((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                              placeholder={t('feed.addReply') || 'Write a reply...'}
                              className="flex-1 px-3 py-2 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                              maxLength={500}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleReplySubmit(comment.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleReplySubmit(comment.id)}
                              disabled={!replyText[comment.id]?.trim() || isSubmitting}
                              className="px-4 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              {isSubmitting ? t('common.loading') : t('feed.post') || 'Post'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Replies List */}
                      {hasReplies && repliesVisible && (
                        <div className="mt-3 ml-4 pl-4 border-l-2 border-gold/20 space-y-3">
                          {comment.replies!.map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-gold/60 to-gold-light/60 flex items-center justify-center text-gray-900 font-bold text-xs flex-shrink-0">
                                {getInitials(reply.profile?.display_name, reply.user_id)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {reply.profile?.display_name || 'User'}
                                  </span>
                                  <VerifiedBadge 
                                    isVerified={reply.profile?.is_verified} 
                                    role={reply.profile?.role}
                                    size="sm"
                                  />
                                  <span className="text-xs text-gray-500">
                                    {formatTimestamp(reply.created_at)}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap break-words">
                                  {reply.content}
                                </p>
                                {isAuthenticated && (
                                  <button
                                    onClick={() => handleLike(reply.id, reply.user_liked)}
                                    className={`text-xs flex items-center gap-1 ${
                                      reply.user_liked ? 'text-red-500' : 'text-gray-500 hover:text-gold'
                                    } transition-colors`}
                                  >
                                    <span>{reply.user_liked ? '❤️' : '🤍'}</span>
                                    <span>{reply.likes_count}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

















