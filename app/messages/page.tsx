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
import { requestGuard, normalizeSupabaseError, isAuthError, debugLog, withTimeout, logSupabaseError } from "@/lib/asyncGuard";

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

      // Step 1: Get conversation IDs where user is a participant (more efficient)
      // First get participant records, then fetch conversations
      // This avoids RLS complexity on conversations table
      const participantsQueryPromise = Promise.resolve(
        supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id)
          .limit(100)
      ) as Promise<{ data: any; error: any }>;
      
      const { data: participantsData, error: participantsQueryError } = await withTimeout(
        participantsQueryPromise,
        8000,
        'Load user participants'
      );

      if (participantsQueryError) {
        const normalized = normalizeSupabaseError(participantsQueryError);
        const status = (participantsQueryError as any).status;
        
        // Improved error logging - log actual error details, not "[Object]"
        logSupabaseError(participantsQueryError, '[Messages] Participants query');
        
        setIsLoadingConversations(false);
        setConversations([]);
        
        if (isAuthError(participantsQueryError) || status === 401 || status === 403) {
          setError("Not authorized to load conversations. Please log in again.");
          await supabase.auth.signOut({ scope: 'local' });
          router.push("/login?message=Session expired, please log in again.");
          requestGuard.finish(requestKey);
          return;
        }
        
        setError(normalized.message || "Failed to load conversations. Please try again.");
        requestGuard.finish(requestKey);
        return;
      }

      if (!participantsData || participantsData.length === 0) {
        setConversations([]);
        setIsLoadingConversations(false);
        requestGuard.finish(requestKey);
        return;
      }

      const conversationIds = (participantsData || []).map((p: any) => p.conversation_id);

      // Step 2: Get conversations for these IDs
      const conversationsQueryPromise = Promise.resolve(
        supabase
          .from("conversations")
          .select("id, updated_at")
          .in("id", conversationIds)
          .order("updated_at", { ascending: false })
          .limit(50)
      ) as Promise<{ data: any; error: any }>;
      
      const { data: conversationsData, error: conversationsError } = await withTimeout(
        conversationsQueryPromise,
        8000,
        'Load conversations'
      );

      clearTimeout(timeoutId);

      if (conversationsError) {
        const normalized = normalizeSupabaseError(conversationsError);
        const status = (conversationsError as any).status;
        
        // Improved error logging - log actual error details, not "[Object]"
        logSupabaseError(conversationsError, '[Messages] Conversations query');
        
        // STOP loading immediately on any error
        setIsLoadingConversations(false);
        setConversations([]);
        
        // Check if it's an auth/permission error
        if (isAuthError(conversationsError) || conversationsError.code === 'PGRST301' || 
            conversationsError.code === '42501' || status === 401 || status === 403) {
          console.error("[Messages] Auth/permission error - not authorized");
          setError("Not authorized to load conversations. Please log in again.");
          // Force sign out and redirect
          await supabase.auth.signOut({ scope: 'local' });
          router.push("/login?message=Session expired, please log in again.");
          requestGuard.finish(requestKey);
          return;
        }
        
        // Check if it's a 500 error
        if (status === 500) {
          setError("Server error loading messages. Please try again.");
          requestGuard.finish(requestKey);
          return;
        }
        
        // For other errors, show the actual error message
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

      if (conversationsError) {
        const normalized = normalizeSupabaseError(conversationsError);
        const status = (conversationsError as any).status;
        
        console.error("[Messages] Conversations query error:", {
          message: conversationsError.message,
          code: conversationsError.code,
          status: status,
          details: conversationsError.details,
          hint: conversationsError.hint,
          fullError: conversationsError
        });
        
        setIsLoadingConversations(false);
        setConversations([]);
        
        if (isAuthError(conversationsError) || status === 401 || status === 403) {
          setError("Not authorized to load conversations. Please log in again.");
          await supabase.auth.signOut({ scope: 'local' });
          router.push("/login?message=Session expired, please log in again.");
          requestGuard.finish(requestKey);
          return;
        }
        
        if (status === 500) {
          setError("Server error loading messages. Please try again.");
        } else {
          setError(normalized.message || "Failed to load conversations. Please try again.");
        }
        requestGuard.finish(requestKey);
        return;
      }

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setIsLoadingConversations(false);
        requestGuard.finish(requestKey);
        return;
      }

      const conversationIdsForParticipants = (conversationsData || []).map((c: any) => c.id);

      // Step 3: Get all participants for these conversations (to find other user)
      const participantsPromise = Promise.resolve(
        supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", conversationIdsForParticipants)
      ) as Promise<{ data: any; error: any }>;
      
      const { data: participants, error: participantsError } = await withTimeout(
        participantsPromise,
        8000,
        'Load participants'
      );

      if (participantsError) {
        const normalized = normalizeSupabaseError(participantsError);
        console.error("[Messages] Participants error:", {
          message: participantsError.message,
          code: participantsError.code,
          status: (participantsError as any).status,
          details: participantsError.details,
          hint: participantsError.hint
        });
        
        const status = (participantsError as any).status;
        if (status === 500) {
          setIsLoadingConversations(false);
          setConversations([]);
          setError("Server error loading messages. Please try again.");
          requestGuard.finish(requestKey);
          return;
        }
        
        // For non-500 errors, continue with conversations we have (partial data is better than nothing)
        // But still log the error
      }

      // Step 4: Batch load profiles and last messages (optimized)
      const conversationsWithData: Conversation[] = [];
      
      // Extract other user IDs
      const otherUserIds = new Set<string>();
      const conversationToOtherUser = new Map<string, string>();
      
      for (const conv of conversationsData || []) {
        const convParticipants = (participants || []).filter((p: { conversation_id: string; user_id: string }) => p.conversation_id === conv.id);
        const otherUserId = convParticipants.find((p: { conversation_id: string; user_id: string }) => p.user_id !== user.id)?.user_id;
        if (otherUserId) {
          otherUserIds.add(otherUserId);
          conversationToOtherUser.set(conv.id, otherUserId);
        }
      }

      // Batch load all profiles at once
      const profileIds = Array.from(otherUserIds);
      let profilesMap = new Map<string, any>();
      
      if (profileIds.length > 0) {
        const profilesPromise = Promise.resolve(
          supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", profileIds)
        ) as Promise<{ data: any; error: any }>;
        
        const { data: profilesData, error: profilesError } = await withTimeout(
          profilesPromise,
          8000,
          'Load profiles batch'
        );

        if (profilesError) {
          console.error("[Messages] error loading profiles:", profilesError, profilesError?.message, profilesError?.details, profilesError?.hint, profilesError?.code);
          const normalized = normalizeSupabaseError(profilesError);
          if (isAuthError(profilesError)) {
            setError("Not authorized to load profiles. Please log in again.");
            requestGuard.finish(requestKey);
            return;
          }
          setError(normalized.message || "Failed to load user profiles.");
          requestGuard.finish(requestKey);
          return;
        }

        // Create map for quick lookup
        (profilesData || []).forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Batch load last messages for all conversations
      const conversationIdsForMessages = (conversationsData || []).map((c: any) => c.id);
      let lastMessagesMap = new Map<string, any>();
      
      if (conversationIdsForMessages.length > 0) {
        // Use a window function approach: get the latest message per conversation
        // Since PostgREST doesn't support window functions directly, we'll fetch all recent messages
        // and group them in JavaScript (more efficient than N queries)
        const messagesPromise = Promise.resolve(
          supabase
            .from("messages")
            .select("conversation_id, content, created_at, sender_id")
            .in("conversation_id", conversationIdsForMessages)
            .order("created_at", { ascending: false })
            .limit(Math.min(conversationIdsForMessages.length * 2, 100)) // Limit to 100 messages max
        ) as Promise<{ data: any; error: any }>;
        
        const { data: messagesData, error: messagesError } = await withTimeout(
          messagesPromise,
          8000,
          'Load messages batch'
        );

        if (messagesError && messagesError.code !== 'PGRST116') {
          console.error("[Messages] error loading messages:", messagesError, messagesError?.message, messagesError?.details, messagesError?.hint, messagesError?.code);
          
          // Check if it's a missing column error
          const errorMessage = messagesError?.message?.toLowerCase() || '';
          const errorDetails = messagesError?.details?.toLowerCase() || '';
          if (errorMessage.includes('column') && errorMessage.includes('does not exist') && 
              (errorMessage.includes('content') || errorDetails.includes('content'))) {
            console.error("[Messages] SCHEMA ERROR: messages.content column is missing. Check database schema.");
            setError("Database schema mismatch: 'content' column is missing. Please check your messages table schema.");
            requestGuard.finish(requestKey);
            return;
          }
          
          if (isAuthError(messagesError)) {
            setError("Not authorized to load messages. Please log in again.");
            requestGuard.finish(requestKey);
            return;
          }
          
          // Non-critical error - continue without last messages
        } else if (messagesData) {
          // Group messages by conversation_id, keeping only the latest per conversation
          const messagesByConv = new Map<string, any>();
          (messagesData || []).forEach((msg: any) => {
            if (!messagesByConv.has(msg.conversation_id)) {
              messagesByConv.set(msg.conversation_id, msg);
            }
          });
          lastMessagesMap = messagesByConv;
        }
      }

      // Build final conversations array
      for (const conv of conversationsData || []) {
        const otherUserId = conversationToOtherUser.get(conv.id);
        if (!otherUserId) continue;

        const otherUserProfile = profilesMap.get(otherUserId);
        if (!otherUserProfile) {
          console.warn("[Messages] Profile not found for user:", otherUserId);
          continue;
        }

        const lastMessage = lastMessagesMap.get(conv.id) || null;

        conversationsWithData.push({
          id: conv.id,
          updated_at: conv.updated_at,
          otherUser: {
            id: otherUserProfile.id,
            display_name: otherUserProfile.display_name,
            avatar_url: otherUserProfile.avatar_url,
          },
          lastMessage: lastMessage,
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
      loadingRef.current = false;
    };
  }, [isAuthenticated, user?.id, loadConversations]); // Include loadConversations in deps (it's stable via useCallback)

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

  // Timeout fallback for loading state
  useEffect(() => {
    if (loadingSession || isLoading) {
      const timeoutId = setTimeout(() => {
        // Force stop loading after timeout
        console.warn('[MessagesPage] Loading timeout - forcing stop');
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeoutId);
    }
  }, [loadingSession, isLoading]);

  if (loadingSession || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-xs text-gray-400 mt-2">If this takes too long, please refresh the page</p>
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
