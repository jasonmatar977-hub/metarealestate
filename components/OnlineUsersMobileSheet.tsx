"use client";

/**
 * Mobile Presence Sheet Component
 * Bottom sheet modal showing online/offline users
 * Only shown on mobile devices
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { findOrCreateDirectConversation } from "@/lib/messages";
import { useLanguage } from "@/contexts/LanguageContext";
import { isValidUrl } from "@/lib/utils";

interface UserWithPresence {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  is_online: boolean;
}

interface OnlineUsersMobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onlineCount: number;
}

export default function OnlineUsersMobileSheet({
  isOpen,
  onClose,
  onlineCount,
}: OnlineUsersMobileSheetProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const sheetRef = useRef<HTMLDivElement>(null);

  // Load blocked users
  useEffect(() => {
    if (!user || !isOpen) return;

    const loadBlockedUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("blocks")
          .select("blocked_id")
          .eq("blocker_id", user.id);

        if (error) {
          console.error("[OnlineUsersMobile] Error loading blocked users:", error);
          return;
        }

        const blockedIds = new Set((data || []).map((b) => b.blocked_id));
        setBlockedUserIds(blockedIds);
      } catch (error) {
        console.error("[OnlineUsersMobile] Error in loadBlockedUsers:", error);
      }
    };

    loadBlockedUsers();
  }, [user, isOpen]);

  // Load online users
  useEffect(() => {
    if (!user || !isOpen) return;

    const loadOnlineUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Priority 1: Users I follow
        const { data: followsData, error: followsError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .limit(20);

        if (followsError) {
          console.error("[OnlineUsersMobile] Error loading follows:", followsError);
          setError(followsError.message || "Failed to load users");
          setIsLoading(false);
          await loadRecentConversations();
          return;
        }

        const followingIds = (followsData || []).map((f: any) => f.following_id);

        if (followingIds.length > 0) {
          // Load presence and profiles for users I follow
          const { data: presenceData, error: presenceError } = await supabase
            .from("user_presence")
            .select("user_id, last_seen_at")
            .in("user_id", followingIds);

          if (presenceError) {
            console.error("[OnlineUsersMobile] Error loading presence:", presenceError);
            setIsLoading(false);
            return;
          }

          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", followingIds);

          if (profilesError) {
            console.error("[OnlineUsersMobile] Error loading profiles:", profilesError);
            setIsLoading(false);
            return;
          }

          const presenceMap = new Map(
            (presenceData || []).map((p) => [p.user_id, p.last_seen_at])
          );
          const profilesMap = new Map(
            (profilesData || []).map((p) => [p.id, p])
          );

          const now = new Date();
          const usersWithPresence: UserWithPresence[] = followingIds
            .filter((id: string) => id !== user.id && !blockedUserIds.has(id))
            .map((id: string) => {
              const profile = profilesMap.get(id);
              const lastSeen = presenceMap.get(id);
              const lastSeenDate = lastSeen ? new Date(lastSeen) : null;
              const isOnline =
                lastSeenDate &&
                (now.getTime() - lastSeenDate.getTime()) / 1000 < 60;

              return {
                id,
                display_name: profile?.display_name || null,
                avatar_url: profile?.avatar_url || null,
                last_seen_at: lastSeen,
                is_online: isOnline || false,
              };
            })
            .filter((u: UserWithPresence) => u.display_name !== null)
            .sort((a: UserWithPresence, b: UserWithPresence) => {
              if (a.is_online && !b.is_online) return -1;
              if (!a.is_online && b.is_online) return 1;
              if (a.last_seen_at && b.last_seen_at) {
                return (
                  new Date(b.last_seen_at).getTime() -
                  new Date(a.last_seen_at).getTime()
                );
              }
              return 0;
            });

          setUsers(usersWithPresence);
        } else {
          await loadRecentConversations();
        }
      } catch (error: any) {
        console.error("[OnlineUsersMobile] Error in loadOnlineUsers:", error);
        setError(error?.message || "Failed to load online users");
      } finally {
        setIsLoading(false);
      }
    };

    const loadRecentConversations = async () => {
      try {
        const { data: conversationsData, error: conversationsError } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id)
          .limit(10);

        if (conversationsError) {
          console.error("[OnlineUsersMobile] Error loading conversations:", conversationsError);
          return;
        }

        const conversationIds = (conversationsData || []).map((c) => c.conversation_id);

        if (conversationIds.length === 0) {
          setUsers([]);
          return;
        }

        const { data: participantsData, error: participantsError } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", conversationIds)
          .neq("user_id", user.id);

        if (participantsError) {
          console.error("[OnlineUsersMobile] Error loading participants:", participantsError);
          return;
        }

        const otherUserIds = [
          ...new Set((participantsData || []).map((p) => p.user_id)),
        ].slice(0, 20);

        if (otherUserIds.length === 0) {
          setUsers([]);
          return;
        }

        const { data: presenceData } = await supabase
          .from("user_presence")
          .select("user_id, last_seen_at")
          .in("user_id", otherUserIds);

        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", otherUserIds);

        const presenceMap = new Map(
          (presenceData || []).map((p) => [p.user_id, p.last_seen_at])
        );
        const profilesMap = new Map(
          (profilesData || []).map((p) => [p.id, p])
        );

        const now = new Date();
        const usersWithPresence: UserWithPresence[] = otherUserIds
          .filter((id) => !blockedUserIds.has(id))
          .map((id) => {
            const profile = profilesMap.get(id);
            const lastSeen = presenceMap.get(id);
            const lastSeenDate = lastSeen ? new Date(lastSeen) : null;
            const isOnline =
              lastSeenDate &&
              (now.getTime() - lastSeenDate.getTime()) / 1000 < 60;

            return {
              id,
              display_name: profile?.display_name || null,
              avatar_url: profile?.avatar_url || null,
              last_seen_at: lastSeen,
              is_online: isOnline || false,
            };
          })
          .filter((u) => u.display_name !== null)
          .sort((a, b) => {
            if (a.is_online && !b.is_online) return -1;
            if (!a.is_online && b.is_online) return 1;
            if (a.last_seen_at && b.last_seen_at) {
              return (
                new Date(b.last_seen_at).getTime() -
                new Date(a.last_seen_at).getTime()
              );
            }
            return 0;
          });

        setUsers(usersWithPresence);
      } catch (error) {
        console.error("[OnlineUsersMobile] Error in loadRecentConversations:", error);
      }
    };

    loadOnlineUsers();

    // Refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadOnlineUsers();
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user, isOpen, blockedUserIds]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleUserClick = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { conversationId, error } = await findOrCreateDirectConversation(
        user.id,
        targetUserId
      );

      if (error || !conversationId) {
        console.error("[OnlineUsersMobile] Error finding/creating conversation:", error);
        alert("Failed to open conversation. Please try again.");
        return;
      }

      onClose();
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error("[OnlineUsersMobile] Error in handleUserClick:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const getInitials = (name: string | null | undefined, userId: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return userId.slice(0, 2).toUpperCase() || "U";
  };

  const formatLastSeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return t("profile.offline") || "Offline";

    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t("profile.online") || "Online";
    const lastSeenTemplate = t("profile.lastSeen") || "Last seen {{minutes}} min ago";
    return lastSeenTemplate.replace("{{minutes}}", String(diffMins));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={onClose} />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-orbitron text-lg font-bold text-gold-dark">
            {t("profile.online") || "Online"} ({onlineCount})
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold mx-auto mb-2"></div>
              <p className="text-gray-600 text-xs">{t("common.loading") || "Loading..."}</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-500 text-sm mb-2">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  // Reload will happen via useEffect
                }}
                className="px-4 py-1 bg-gold text-gray-900 text-xs font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm">
                {t("profile.noOnlineUsers") || "No online users"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((userProfile) => {
                const displayName = userProfile.display_name || "User";
                const initials = getInitials(userProfile.display_name, userProfile.id);

                return (
                  <button
                    key={userProfile.id}
                    onClick={() => handleUserClick(userProfile.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gold/10 transition-colors text-left border border-gray-100"
                  >
                    {/* Avatar with online indicator */}
                    <div className="relative flex-shrink-0">
                      {userProfile.avatar_url && isValidUrl(userProfile.avatar_url) ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={displayName}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement("div");
                              fallback.className =
                                "w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-sm";
                              fallback.textContent = initials;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-sm">
                          {initials}
                        </div>
                      )}
                      {/* Online/Offline indicator dot */}
                      <div
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          userProfile.is_online ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>

                    {/* Name and status */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {userProfile.is_online
                          ? t("profile.online") || "Online"
                          : formatLastSeen(userProfile.last_seen_at)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
