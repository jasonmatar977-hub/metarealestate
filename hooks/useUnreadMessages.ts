"use client";

/**
 * Unread Messages Hook
 * Tracks unread message count and updates via realtime
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export function useUnreadMessages() {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionRef = useRef<any>(null);

  // Load initial unread count
  const loadUnreadCount = async () => {
    if (!user || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      // Count messages where read_at IS NULL AND sender_id != auth.uid()
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", user.id);

      if (error) {
        console.error("[UnreadMessages] Error loading unread count:", error);
        return;
      }

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("[UnreadMessages] Error in loadUnreadCount:", error);
    }
  };

  // Setup realtime subscription for new messages
  useEffect(() => {
    if (!user || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    // Load initial count
    loadUnreadCount();

    // Setup realtime subscription for new messages
    const channel = supabase
      .channel("unread-messages", {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=neq.${user.id}`, // Only messages not from current user
        },
        (payload) => {
          console.log("[UnreadMessages] New message received via realtime:", payload);
          // Increment count for new unread messages
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `sender_id=neq.${user.id}`, // Only messages not from current user
        },
        (payload) => {
          console.log("[UnreadMessages] Message updated via realtime:", payload);
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // If read_at changed from NULL to a value, decrement count
          if (!oldData.read_at && newData.read_at) {
            console.log("[UnreadMessages] Message marked as read, decrementing count");
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          // If read_at changed from a value to NULL, increment count
          else if (oldData.read_at && !newData.read_at) {
            console.log("[UnreadMessages] Message marked as unread, incrementing count");
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe((status) => {
        console.log("[UnreadMessages] Realtime subscription status:", status);
      });

    subscriptionRef.current = channel;

    // Refresh count periodically (every 30 seconds) to catch any missed updates
    const refreshInterval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      clearInterval(refreshInterval);
    };
  }, [user, isAuthenticated]);

  return unreadCount;
}





