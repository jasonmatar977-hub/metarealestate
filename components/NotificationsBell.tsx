"use client";

/**
 * Notifications Bell Component
 * Instagram/Facebook-style bell icon with badge count and dropdown
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

interface Notification {
  id: string;
  actor_id: string | null;
  type: 'follow' | 'new_post' | 'message';
  entity_id: string | null; // UUID for conversations (messages)
  entity_id_bigint: number | null; // BIGINT for post IDs (new_post)
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function NotificationsBell() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const isSettingUpSubscriptionRef = useRef(false); // Guard for React Strict Mode

  // Derive unreadCount from notifications state (single source of truth)
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Load notifications
  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotifications();
      setupRealtimeSubscription();
    }

    return () => {
      // Cleanup subscription
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe();
          supabase.removeChannel(subscriptionRef.current);
        } catch (e) {
          console.warn('[Notifications] Error unsubscribing:', e);
        }
        subscriptionRef.current = null;
      }
      isSettingUpSubscriptionRef.current = false; // Reset guard
    };
  }, [isAuthenticated, user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          actor_id,
          type,
          entity_id,
          entity_id_bigint,
          title,
          body,
          is_read,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[Notifications] Error loading notifications:', error);
        return;
      }

      // Load actor profiles for notifications with actor_id
      const notificationsWithActors: Notification[] = await Promise.all(
        (data || []).map(async (notif) => {
          if (notif.actor_id) {
            const { data: actorProfile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', notif.actor_id)
              .single();

            return {
              ...notif,
              actor: actorProfile ? {
                display_name: actorProfile.display_name,
                avatar_url: actorProfile.avatar_url,
              } : undefined,
            } as Notification;
          }
          return { ...notif, actor: undefined } as Notification;
        })
      );

      setNotifications(notificationsWithActors);
      // unreadCount is now derived from notifications state, no need to set it manually
    } catch (error) {
      console.error('[Notifications] Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to load actor profile for a notification
  const loadActorProfile = async (actorId: string) => {
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', actorId)
      .single();

    return actorProfile ? {
      display_name: actorProfile.display_name,
      avatar_url: actorProfile.avatar_url,
    } : undefined;
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    // Clean up existing subscription if any
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
        supabase.removeChannel(subscriptionRef.current);
      } catch (e) {
        console.warn('[Notifications] Error cleaning up old subscription:', e);
      }
      subscriptionRef.current = null;
    }

    // Guard: Don't set up if already setting up (React Strict Mode double mount)
    if (isSettingUpSubscriptionRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log('[Notifications] Already setting up subscription, skipping duplicate');
      }
      return;
    }
    isSettingUpSubscriptionRef.current = true;

    if (process.env.NODE_ENV === "development") {
      console.log('[Notifications] subscribed');
    }

    const channel = supabase
      .channel(`notifications:${user.id}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (process.env.NODE_ENV === "development") {
            console.log('[Notifications] INSERT', payload.new?.id);
          }

          const newNotification = payload.new as any;
          
          // Prevent duplicates: check if notification ID already exists
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === newNotification.id);
            if (exists) {
              if (process.env.NODE_ENV === "development") {
                console.log('[Notifications] Notification already exists, skipping duplicate:', newNotification.id);
              }
              return prev;
            }
            return prev; // Return unchanged, we'll update after loading actor
          });

          // Load actor profile if actor_id exists (outside setState)
          let actor = undefined;
          if (newNotification.actor_id) {
            actor = await loadActorProfile(newNotification.actor_id);
          }

          // Now add the notification with actor profile
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === newNotification.id);
            if (exists) {
              return prev; // Already added
            }

            // Create notification object
            const notification: Notification = {
              id: newNotification.id,
              actor_id: newNotification.actor_id,
              type: newNotification.type,
              entity_id: newNotification.entity_id,
              entity_id_bigint: newNotification.entity_id_bigint,
              title: newNotification.title,
              body: newNotification.body,
              is_read: newNotification.is_read || false,
              created_at: newNotification.created_at,
              actor,
            };

            // Prepend new notification to the list (most recent first)
            return [notification, ...prev].slice(0, 20); // Keep only latest 20
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (process.env.NODE_ENV === "development") {
            console.log('[Notifications] UPDATE', payload.new?.id);
          }

          const updatedNotification = payload.new as any;
          
          // Update the matching notification in state
          setNotifications((prev) => {
            const index = prev.findIndex((n) => n.id === updatedNotification.id);
            if (index === -1) {
              // Notification not in state yet, ignore
              return prev;
            }

            // Update the notification
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              is_read: updatedNotification.is_read || false,
              title: updatedNotification.title || updated[index].title,
              body: updatedNotification.body || updated[index].body,
            };
            return updated;
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (process.env.NODE_ENV === "development") {
            console.log('[Notifications] Realtime subscription status: SUBSCRIBED');
          }
        } else if (status === "CHANNEL_ERROR") {
          console.error('[Notifications] Realtime subscription error');
        } else if (status === "TIMED_OUT") {
          console.warn('[Notifications] Realtime subscription timed out');
        }
      });

    subscriptionRef.current = channel;
    isSettingUpSubscriptionRef.current = false; // Reset guard after setup
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read immediately (optimistic update)
    if (!notification.is_read) {
      // Update local state first for instant feedback
      // unreadCount will update automatically since it's derived from notifications
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      
      // Then update in database
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
      } catch (error) {
        console.error('[Notifications] Error marking notification as read:', error);
        // Revert optimistic update on error
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: false } : n)
        );
      }
    }

    // Close dropdown
    setIsOpen(false);
    
    // Navigate based on notification type
    if (notification.type === 'follow' && notification.actor_id) {
      // Navigate to user profile
      router.push(`/profile?userId=${notification.actor_id}`);
    } else if (notification.type === 'new_post') {
      // For posts, use entity_id_bigint (BIGINT) which contains the post ID
      // Fallback to entity_id if entity_id_bigint is not available (backward compatibility)
      const postId = notification.entity_id_bigint || notification.entity_id;
      if (postId) {
        router.push(`/feed?postId=${postId}`);
      } else {
        console.warn('[Notifications] Post notification missing post ID');
        router.push('/feed');
      }
    } else if (notification.type === 'message' && notification.entity_id) {
      // Navigate to conversation
      // entity_id contains the conversation_id (UUID)
      router.push(`/messages/${notification.entity_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    // Optimistic update: mark all as read immediately
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      // unreadCount will be 0 automatically since all notifications are now read
    } catch (error) {
      console.error('[Notifications] Error marking all as read:', error);
      // Revert optimistic update on error
      loadNotifications();
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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-gold transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-gold/20 overflow-hidden z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gold/20 flex items-center justify-between bg-gradient-to-r from-gold/10 to-gold-light/10">
            <h3 className="font-bold text-gray-900">{t('notifications.title') || 'Notifications'}</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-gold hover:text-gold-dark font-semibold"
              >
                {t('notifications.markAllRead') || 'Mark all as read'}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">{t('common.loading') || 'Loading...'}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">{t('notifications.noNotifications') || 'No notifications yet'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gold/10">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-gold/5 transition-colors ${
                      !notification.is_read ? 'bg-gold/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Actor Avatar */}
                      {notification.actor?.avatar_url ? (
                        <img
                          src={notification.actor.avatar_url}
                          alt={notification.actor.display_name || 'User'}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0">
                          {notification.actor?.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''} text-gray-900`}>
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(notification.created_at)}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gold/20 text-center">
              <Link
                href="/notifications"
                className="text-sm text-gold hover:text-gold-dark font-semibold"
                onClick={() => setIsOpen(false)}
              >
                {t('notifications.viewAll') || 'View all notifications'}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

