"use client";

/**
 * Presence Heartbeat Hook
 * Updates user_presence.last_seen_at every 45 seconds when authenticated and page is visible
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export function usePresenceHeartbeat() {
  const { isAuthenticated, user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Clear any existing interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial upsert on mount
    const updatePresence = async () => {
      try {
        await supabase
          .from("user_presence")
          .upsert(
            {
              user_id: user.id,
              last_seen_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          );
      } catch (error) {
        console.error("[Presence] Error updating presence:", error);
      }
    };

    // Update immediately on mount
    updatePresence();

    // Function to handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Page became visible - update immediately and start interval
        updatePresence();
        
        // Clear any existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        // Start interval (45 seconds)
        intervalRef.current = setInterval(() => {
          updatePresence();
        }, 45000); // 45 seconds
      } else {
        // Page became hidden - stop interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // Set up visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start interval if page is visible
    if (document.visibilityState === "visible") {
      intervalRef.current = setInterval(() => {
        updatePresence();
      }, 45000); // 45 seconds
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, user]);
}

