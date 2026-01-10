"use client";

/**
 * Online Users Sidebar
 * Instagram-style right-side sidebar showing online/offline users
 * Shows users I follow (priority) or recent conversations
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { findOrCreateDirectConversation } from "@/lib/messages";
import { useLanguage } from "@/contexts/LanguageContext";
import { isValidUrl } from "@/lib/utils";

const COLLAPSED_STORAGE_KEY = "online_sidebar_collapsed";

interface UserWithPresence {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  is_online: boolean;
}

export default function OnlineUsersSidebar() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  
  // Collapsible state with localStorage persistence (default: open)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    return stored === 'true';
  });

  // Load blocked users
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const loadBlockedUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("blocks")
          .select("blocked_id")
          .eq("blocker_id", user.id);

        if (error) {
          console.error("[OnlineUsers] Error loading blocked users:", error);
          return;
        }

        const blockedIds = new Set((data || []).map((b) => b.blocked_id));
        setBlockedUserIds(blockedIds);
      } catch (error) {
        console.error("[OnlineUsers] Error in loadBlockedUsers:", error);
      }
    };

    loadBlockedUsers();
  }, [user, isAuthenticated]);

  // Load online users function (defined outside useEffect so Retry button can call it)
  const loadOnlineUsersRef = useRef<(() => Promise<void>) | null>(null);

  // Load online users (with timeout and error handling)
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000); // 10 second timeout

    const loadOnlineUsers = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7c97e237-f692-44e7-a6d1-13f83ea50b12',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersSidebar.tsx:68',message:'loadOnlineUsers started',data:{userId:user.id,isAborted:abortController.signal.aborted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setIsLoading(true);
      setError(null);
      try {
        // Priority 1: Users I follow (with timeout)
        const followsQueryPromise = Promise.resolve(
          supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id)
            .limit(20)
        ) as Promise<{ data: any; error: any }>;
        
        const followsResult = await Promise.race([
          followsQueryPromise,
          new Promise<{ data: null; error: { message: string } }>((_, reject) => 
            setTimeout(() => reject({ data: null, error: { message: 'Query timed out' } }), 8000)
          )
        ]).catch((error) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/7c97e237-f692-44e7-a6d1-13f83ea50b12',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersSidebar.tsx:85',message:'Follows query timeout',data:{error:error?.error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          console.error('[OnlineUsers] Follows query timeout:', error);
          return { data: null, error: { message: 'Query timed out' } };
        });
        
        const { data: followsData, error: followsError } = followsResult;

        if (followsError) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/7c97e237-f692-44e7-a6d1-13f83ea50b12',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersSidebar.tsx:95',message:'Follows query error',data:{message:followsError.message,code:followsError.code,details:followsError.details},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          console.error("[OnlineUsers] Error loading follows:", followsError);
          setError(followsError.message || "Failed to load users");
          setIsLoading(false);
          // Fallback to recent conversations
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
            console.error("[OnlineUsers] Error loading presence:", presenceError);
            setIsLoading(false);
            return;
          }

          // Get profiles for these users
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", followingIds);

          if (profilesError) {
            console.error("[OnlineUsers] Error loading profiles:", profilesError);
            setIsLoading(false);
            return;
          }

          // Combine presence and profiles
          const presenceMap = new Map(
            (presenceData || []).map((p) => [p.user_id, p.last_seen_at])
          );
          const profilesMap = new Map(
            (profilesData || []).map((p) => [p.id, p])
          );

          const now = new Date();
          const usersWithPresence: UserWithPresence[] = followingIds
            .filter((id: string) => id !== user.id && !blockedUserIds.has(id)) // Don't show myself or blocked users
            .map((id: string) => {
              const profile = profilesMap.get(id);
              const lastSeen = presenceMap.get(id);
              const lastSeenDate = lastSeen ? new Date(lastSeen) : null;
              const isOnline =
                lastSeenDate &&
                (now.getTime() - lastSeenDate.getTime()) / 1000 < 60; // Online if last_seen_at < 60 seconds ago

              return {
                id,
                display_name: profile?.display_name || null,
                avatar_url: profile?.avatar_url || null,
                last_seen_at: lastSeen,
                is_online: isOnline || false,
              };
            })
            .filter((u: UserWithPresence) => u.display_name !== null) // Only show users with profiles
            .sort((a: UserWithPresence, b: UserWithPresence) => {
              // Sort: online first, then by last_seen_at
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/7c97e237-f692-44e7-a6d1-13f83ea50b12',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersSidebar.tsx:167',message:'Users loaded successfully',data:{count:usersWithPresence.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
        } else {
          // No follows, fallback to recent conversations
          await loadRecentConversations();
        }
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/7c97e237-f692-44e7-a6d1-13f83ea50b12',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersSidebar.tsx:175',message:'loadOnlineUsers exception',data:{message:error?.message,isAborted:abortController.signal.aborted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error("[OnlineUsers] Error in loadOnlineUsers:", error);
        setError(error?.message || "Failed to load online users");
      } finally {
        setIsLoading(false);
      }
    };

    const loadRecentConversations = async () => {
      try {
        // Get recent conversations
        const { data: conversationsData, error: conversationsError } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id)
          .limit(10);

        if (conversationsError) {
          console.error("[OnlineUsers] Error loading conversations:", conversationsError);
          return;
        }

        const conversationIds = (conversationsData || []).map((c) => c.conversation_id);

        if (conversationIds.length === 0) {
          setUsers([]);
          return;
        }

        // Get other participants in these conversations
        const { data: participantsData, error: participantsError } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", conversationIds)
          .neq("user_id", user.id);

        if (participantsError) {
          console.error("[OnlineUsers] Error loading participants:", participantsError);
          return;
        }

        const otherUserIds = [
          ...new Set(
            (participantsData || []).map((p) => p.user_id)
          ),
        ].slice(0, 20); // Limit to 20 users

        if (otherUserIds.length === 0) {
          setUsers([]);
          return;
        }

        // Load presence and profiles
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
          .filter((id) => !blockedUserIds.has(id)) // Don't show blocked users
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
        console.error("[OnlineUsers] Error in loadRecentConversations:", error);
      }
    };

    loadOnlineUsers();

    // Refresh every 30 seconds to update online status
    const refreshInterval = setInterval(() => {
      if (!abortController.signal.aborted) {
        loadOnlineUsers();
      }
    }, 30000);

    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7c97e237-f692-44e7-a6d1-13f83ea50b12',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersSidebar.tsx:300',message:'OnlineUsersSidebar cleanup',data:{userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      clearInterval(refreshInterval);
      abortController.abort();
      setIsLoading(false);
    };
  }, [user, isAuthenticated, blockedUserIds]);

  const handleUserClick = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { conversationId, error } = await findOrCreateDirectConversation(
        user.id,
        targetUserId
      );

      if (error) {
        console.error("[OnlineUsers] Error finding/creating conversation:", error);
        alert("Failed to open conversation. Please try again.");
        return;
      }

      if (!conversationId) {
        console.error("[OnlineUsers] No conversationId returned");
        alert("Failed to open conversation. Please try again.");
        return;
      }

      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error("[OnlineUsers] Error in handleUserClick:", error);
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
    // Simple string replacement for translation
    const lastSeenTemplate = t("profile.lastSeen") || "Last seen {{minutes}} min ago";
    return lastSeenTemplate.replace("{{minutes}}", String(diffMins));
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  // Toggle collapse state and persist to localStorage
  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(newCollapsed));
    }
  };

  // Count online users
  const onlineCount = users.filter((u) => u.is_online).length;

  // Collapsed state: Show small floating button
  if (isCollapsed) {
    return (
      <aside className="hidden lg:block fixed right-4 top-24 z-30">
        <button
          onClick={toggleCollapse}
          className="px-4 py-2 bg-white/90 backdrop-blur-sm border border-gold/30 rounded-full shadow-lg hover:shadow-xl hover:bg-gold/10 transition-all flex items-center gap-2 group"
          aria-label="Show online users"
          title="Show online users"
        >
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-gold-dark transition-colors">
            Online {onlineCount > 0 && `(${onlineCount})`}
          </span>
        </button>
      </aside>
    );
  }

  // Expanded state: Show full sidebar
  // z-30: Behind modals (z-50) but above content, so content doesn't need margin
  return (
    <aside className="hidden lg:block fixed right-0 top-0 h-screen w-[280px] pt-24 pb-20 px-4 overflow-y-auto z-30">
      <div className="glass-dark rounded-2xl p-4 border border-gold/20 shadow-lg">
        {/* Header with toggle button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-orbitron text-lg font-bold text-gold-dark">
            {t("profile.online") || "Online"} {onlineCount > 0 && `(${onlineCount})`}
          </h2>
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gold/20 transition-colors text-gray-600 hover:text-gold-dark"
            aria-label="Hide online users"
            title="Hide online users"
          >
            <svg
              className="w-5 h-5"
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
                if (loadOnlineUsersRef.current) {
                  loadOnlineUsersRef.current();
                }
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
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gold/10 transition-all text-left border border-gray-100 hover:border-gold/30 hover:shadow-sm"
                >
                  {/* Avatar with online indicator */}
                  <div className="relative flex-shrink-0">
                    {userProfile.avatar_url && isValidUrl(userProfile.avatar_url) ? (
                      <img
                        src={userProfile.avatar_url}
                        alt={displayName}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement("div");
                            fallback.className =
                              "w-11 h-11 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-xs ring-2 ring-white";
                            fallback.textContent = initials;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-xs ring-2 ring-white">
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
    </aside>
  );
}

