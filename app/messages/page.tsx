"use client";

/**
 * Messages Inbox Page
 * Route: /messages
 * Shows list of conversations for the logged-in user
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import { isValidUrl } from "@/lib/utils";
import { requestGuard, normalizeSupabaseError, isAuthError, debugLog, withTimeout } from "@/lib/asyncGuard";

interface Conversation {
  id: string;
  updated_at: string;
  otherUser: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
}

export default function MessagesPage() {
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!loadingSession && !isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router, hasRedirected]);

  const loadConversations = useCallback(async () => {
    if (!user) return;

    const requestKey = 'load-conversations';
    if (!requestGuard.start(requestKey)) {
      debugLog('[Messages] Load conversations already in flight, skipping');
      return;
    }

    // Set timeout to stop loading after 10 seconds
    const timeoutId = setTimeout(() => {
      if (loadingRef.current) {
        console.error("[Messages] Load conversations timed out after 10 seconds");
        setIsLoadingConversations(false);
        setError("Server error loading messages. Please try again.");
        requestGuard.finish(requestKey);
      }
    }, 10000);

    try {
      setIsLoadingConversations(true);
      setError(null);

      // Step 1: Get all conversations where user is a participant
      // Query conversations directly - RLS will filter to only those user participates in
      const queryPromise = Promise.resolve(
        supabase
          .from("conversations")
          .select("id, updated_at")
          .order("updated_at", { ascending: false })
          .limit(50)
      ) as Promise<{ data: any; error: any }>;
      
      const { data: conversationsData, error: conversationsError } = await withTimeout(
        queryPromise,
        10000,
        'Load conversations'
      );

      clearTimeout(timeoutId);

      if (conversationsError) {
        console.error("[Messages] error:", conversationsError, conversationsError?.message, conversationsError?.details, conversationsError?.hint, conversationsError?.code);
        
        // STOP loading immediately on any error
        setIsLoadingConversations(false);
        setConversations([]);
        
        // Check if it's a 500 error
        const status = (conversationsError as any).status;
        if (status === 500) {
          setError("Server error loading messages. Please try again.");
          requestGuard.finish(requestKey);
          return;
        }
        
        // Check if it's an auth error
        if (conversationsError.code === 'PGRST301' || conversationsError.code === '42501' || 
            status === 401 || status === 403) {
          console.error("[Messages] Auth error - session expired");
          // Force sign out and redirect
          await supabase.auth.signOut();
          router.push("/login");
          requestGuard.finish(requestKey);
          return;
        }
        
        // For other errors, show error message
        const normalized = normalizeSupabaseError(conversationsError);
        setError(normalized.message || "Failed to load conversations. Please try again.");
        requestGuard.finish(requestKey);
        return;
      }

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setIsLoadingConversations(false);
        requestGuard.finish(requestKey);
        return;
      }

      const conversationIds = (conversationsData || []).map((c: any) => c.id);

      // Step 2: Get participants for these conversations
      const participantsPromise = Promise.resolve(
        supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", conversationIds)
      ) as Promise<{ data: any; error: any }>;
      
      const { data: participants, error: participantsError } = await withTimeout(
        participantsPromise,
        10000,
        'Load participants'
      );

      if (participantsError) {
        console.error("[Messages] error:", participantsError, participantsError?.message, participantsError?.details, participantsError?.hint, participantsError?.code);
        const status = (participantsError as any).status;
        if (status === 500) {
          // STOP loading immediately on 500 error
          setIsLoadingConversations(false);
          setConversations([]);
          setError("Server error loading messages. Please try again.");
          requestGuard.finish(requestKey);
          return;
        }
        // For non-500 errors, continue with conversations we have (partial data is better than nothing)
        // But still log the error
      }

      // Step 3: For each conversation, get the other participant and last message
      const conversationsWithData: Conversation[] = [];

      for (const conv of conversationsData || []) {
        // Find the other user from participants we already loaded
        const convParticipants = (participants || []).filter((p: { conversation_id: string; user_id: string }) => p.conversation_id === conv.id);
        const otherUserId = convParticipants.find((p: { conversation_id: string; user_id: string }) => p.user_id !== user.id)?.user_id;
        if (!otherUserId) continue;

        // Get other user's profile
        const profilePromise = Promise.resolve(
          supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("id", otherUserId)
            .single()
        ) as Promise<{ data: any; error: any }>;
        
        const { data: otherUserProfile, error: profileError } = await withTimeout(
          profilePromise,
          10000,
          'Load profile'
        );

        if (profileError) {
          console.error("[Messages] error:", profileError, profileError?.message, profileError?.details, profileError?.hint, profileError?.code);
          continue;
        }

        // Get last message
        const messagePromise = Promise.resolve(
          supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()
        ) as Promise<{ data: any; error: any }>;
        
        const { data: lastMessageData, error: messageError } = await withTimeout(
          messagePromise,
          10000,
          'Load last message'
        );
        
        if (messageError && messageError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is OK for conversations with no messages
          console.error("[Messages] error:", messageError, messageError?.message, messageError?.details, messageError?.hint, messageError?.code);
        }

        conversationsWithData.push({
          id: conv.id,
          updated_at: conv.updated_at,
          otherUser: {
            id: otherUserProfile.id,
            display_name: otherUserProfile.display_name,
            avatar_url: otherUserProfile.avatar_url,
          },
          lastMessage: lastMessageData || null,
        });
      }

      setConversations(conversationsWithData);
    } catch (error: any) {
      clearTimeout(timeoutId);
      const normalized = normalizeSupabaseError(error);
      console.error("[Messages] Exception loading conversations:", normalized);
      
      // STOP loading immediately on error
      setIsLoadingConversations(false);
      setConversations([]);
      
      const status = (error as any)?.status;
      if (status === 500) {
        setError("Server error loading messages. Please try again.");
      } else {
        setError(normalized.message || "Failed to load conversations. Please try again.");
      }
      requestGuard.finish(requestKey);
    } finally {
      clearTimeout(timeoutId);
      // ALWAYS clear loading state (in case it wasn't cleared in catch)
      setIsLoadingConversations(false);
      requestGuard.finish(requestKey);
    }
  }, [user?.id, router]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || loadingRef.current) return;
    
    // Prevent double-loading
    if (hasLoadedRef.current) return;
    
    loadingRef.current = true;
    hasLoadedRef.current = true;
    
    loadConversations().finally(() => {
      loadingRef.current = false;
    });
    
    // Reset hasLoadedRef when user changes
    return () => {
      hasLoadedRef.current = false;
    };
  }, [isAuthenticated, user?.id]); // Only depend on user.id - loadConversations is stable

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
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

  if (loadingSession || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen pb-20">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-center mb-6 text-gold-dark">
            Messages
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
              <div className="mt-2 flex gap-3">
              <button
                onClick={() => {
                  setError(null);
                  hasLoadedRef.current = false;
                  loadingRef.current = false;
                  loadConversations();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-colors"
              >
                Retry
              </button>
                {process.env.NODE_ENV !== 'production' && (
                  <button
                    onClick={() => {
                      // Clear messages-related localStorage keys
                      try {
                        const keys = Object.keys(localStorage);
                        keys.forEach(key => {
                          if (key.includes('messages') || key.includes('conversation') || key.includes('supabase.auth')) {
                            localStorage.removeItem(key);
                          }
                        });
                        // Reload page
                        window.location.reload();
                      } catch (e) {
                        console.error("Error clearing cache:", e);
                      }
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold underline"
                  >
                    Reset Messages Cache (Dev)
                  </button>
                )}
              </div>
            </div>
          )}

          {isLoadingConversations ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
              <p className="text-gray-600">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="glass-dark rounded-2xl p-12 text-center">
              <p className="text-gray-600 mb-4">No messages yet. Start a conversation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => {
                const displayName = conv.otherUser.display_name || "User";
                const initials = getInitials(conv.otherUser.display_name, conv.otherUser.id);
                const lastMessageTime = conv.lastMessage
                  ? formatTimestamp(conv.lastMessage.created_at)
                  : "";

                return (
                  <Link
                    key={conv.id}
                    href={`/messages/${conv.id}`}
                    className="glass-dark rounded-2xl p-4 flex items-center gap-4 hover:bg-gold/5 transition-colors"
                  >
                    {/* Avatar */}
                    {conv.otherUser.avatar_url && isValidUrl(conv.otherUser.avatar_url) ? (
                      <img
                        src={conv.otherUser.avatar_url}
                        alt={displayName}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement("div");
                            fallback.className =
                              "w-14 h-14 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg flex-shrink-0";
                            fallback.textContent = initials;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg flex-shrink-0">
                        {initials}
                      </div>
                    )}

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
                        {lastMessageTime && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {lastMessageTime}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
