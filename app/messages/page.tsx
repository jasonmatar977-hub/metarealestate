"use client";

/**
 * Messages Inbox Page
 * Route: /messages
 * Shows list of conversations for the logged-in user
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import { isValidUrl } from "@/lib/utils";

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

  useEffect(() => {
    if (!loadingSession && !isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router, hasRedirected]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadConversations();
    }
  }, [isAuthenticated, user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      setIsLoadingConversations(true);
      setError(null);

      // Step 1: Get all conversations where user is a participant
      // Query conversations directly - RLS will filter to only those user participates in
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (conversationsError) {
        console.error("[Messages] Error loading conversations:", {
          message: conversationsError.message,
          details: conversationsError.details,
          hint: conversationsError.hint,
          code: conversationsError.code,
          status: (conversationsError as any).status,
        });
        
        // Check if it's an auth error
        if (conversationsError.code === 'PGRST301' || conversationsError.code === '42501' || 
            (conversationsError as any).status === 401 || (conversationsError as any).status === 403) {
          console.error("[Messages] Auth error - session expired");
          // Force sign out and redirect
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }
        
        // For other errors, show empty state
        setConversations([]);
        setIsLoadingConversations(false);
        return;
      }

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setIsLoadingConversations(false);
        return;
      }

      const conversationIds = conversationsData.map((c) => c.id);

      // Step 2: Get participants for these conversations
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds);

      if (participantsError) {
        console.error("[Messages] Error loading participants:", {
          message: participantsError.message,
          details: participantsError.details,
          hint: participantsError.hint,
          code: participantsError.code,
        });
        // Continue with conversations we have, even if participants fail
      }

      // Step 3: For each conversation, get the other participant and last message
      const conversationsWithData: Conversation[] = [];

      for (const conv of conversationsData || []) {
        // Find the other user from participants we already loaded
        const convParticipants = (participants || []).filter((p) => p.conversation_id === conv.id);
        const otherUserId = convParticipants.find((p) => p.user_id !== user.id)?.user_id;
        if (!otherUserId) continue;

        // Get other user's profile
        const { data: otherUserProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("id", otherUserId)
          .single();

        if (profileError) {
          console.error("[Messages] Error loading other user profile:", profileError);
          continue;
        }

        // Get last message
        const { data: lastMessageData, error: messageError } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

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
      console.error("[Messages] Error loading conversations:", error);
      setError(error?.message || "Failed to load conversations");
    } finally {
      setIsLoadingConversations(false);
    }
  };

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
              <button
                onClick={loadConversations}
                className="mt-2 text-red-600 hover:text-red-800 text-sm font-semibold underline"
              >
                Retry
              </button>
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
