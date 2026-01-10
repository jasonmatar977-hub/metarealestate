"use client";

/**
 * Mobile Presence Pill Component
 * Shows a pill/button with online user count
 * Opens OnlineUsersMobileSheet on tap
 * Only visible on mobile devices
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import OnlineUsersMobileSheet from "./OnlineUsersMobileSheet";

interface OnlineUsersMobilePillProps {
  className?: string;
}

export default function OnlineUsersMobilePill({ className = "" }: OnlineUsersMobilePillProps) {
  const { isAuthenticated, user } = useAuth();
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (!user || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadOnlineCount = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get users I follow
        const { data: followsData, error: followsError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .limit(20);

        if (followsError) {
          console.error("[OnlineUsersPill] Error loading follows:", followsError);
          // Fallback to recent conversations
          await loadFromConversations();
          return;
        }

        const followingIds = (followsData || []).map((f: any) => f.following_id);

        if (followingIds.length > 0) {
          // Load presence for users I follow
          const { data: presenceData, error: presenceError } = await supabase
            .from("user_presence")
            .select("user_id, last_seen_at")
            .in("user_id", followingIds);

          if (presenceError) {
            console.error("[OnlineUsersPill] Error loading presence:", presenceError);
            setError("Failed to load");
            setIsLoading(false);
            return;
          }

          const now = new Date();
          const onlineUsers = (presenceData || []).filter((p) => {
            if (!p.last_seen_at) return false;
            const lastSeen = new Date(p.last_seen_at);
            return (now.getTime() - lastSeen.getTime()) / 1000 < 60;
          });

          setOnlineCount(onlineUsers.length);
        } else {
          await loadFromConversations();
        }
      } catch (error: any) {
        console.error("[OnlineUsersPill] Error in loadOnlineCount:", error);
        setError("Failed to load");
      } finally {
        setIsLoading(false);
      }
    };

    const loadFromConversations = async () => {
      try {
        const { data: conversationsData, error: conversationsError } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id)
          .limit(10);

        if (conversationsError) {
          console.error("[OnlineUsersPill] Error loading conversations:", conversationsError);
          setError("Failed to load");
          return;
        }

        const conversationIds = (conversationsData || []).map((c) => c.conversation_id);

        if (conversationIds.length === 0) {
          setOnlineCount(0);
          return;
        }

        const { data: participantsData, error: participantsError } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", conversationIds)
          .neq("user_id", user.id);

        if (participantsError) {
          console.error("[OnlineUsersPill] Error loading participants:", participantsError);
          setError("Failed to load");
          return;
        }

        const otherUserIds = [
          ...new Set((participantsData || []).map((p) => p.user_id)),
        ].slice(0, 20);

        if (otherUserIds.length === 0) {
          setOnlineCount(0);
          return;
        }

        const { data: presenceData, error: presenceError } = await supabase
          .from("user_presence")
          .select("user_id, last_seen_at")
          .in("user_id", otherUserIds);

        if (presenceError) {
          console.error("[OnlineUsersPill] Error loading presence:", presenceError);
          setError("Failed to load");
          return;
        }

        const now = new Date();
        const onlineUsers = (presenceData || []).filter((p) => {
          if (!p.last_seen_at) return false;
          const lastSeen = new Date(p.last_seen_at);
          return (now.getTime() - lastSeen.getTime()) / 1000 < 60;
        });

        setOnlineCount(onlineUsers.length);
      } catch (error) {
        console.error("[OnlineUsersPill] Error in loadFromConversations:", error);
        setError("Failed to load");
      }
    };

    loadOnlineCount();

    // Refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadOnlineCount();
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user, isAuthenticated]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsSheetOpen(true)}
        className={`lg:hidden flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-gold/30 rounded-full shadow-md hover:shadow-lg hover:bg-gold/10 transition-all relative z-30 ${className}`}
        aria-label="View online users"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold"></div>
            <span className="text-sm font-semibold text-gray-700">Loading...</span>
          </>
        ) : error ? (
          <>
            <svg
              className="w-4 h-4 text-amber-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Users</span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-semibold text-gray-700">
                Online ({onlineCount ?? 0})
              </span>
            </div>
          </>
        )}
      </button>

      <OnlineUsersMobileSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onlineCount={onlineCount ?? 0}
      />
    </>
  );
}
