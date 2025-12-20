"use client";

/**
 * Chat Page
 * Route: /messages/[conversationId]
 * Shows messages in a conversation with realtime updates
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import { isValidUrl } from "@/lib/utils";
import { withTimeout, normalizeSupabaseError, isAuthError } from "@/lib/asyncGuard";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface OtherUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const conversationId = params.conversationId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!loadingSession && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversationData = useCallback(async () => {
    if (!user) return;

    // Set timeout to stop loading after 10 seconds
    const timeoutId = setTimeout(() => {
      if (loadingRef.current) {
        console.error("[Chat] Load conversation data timed out after 10 seconds");
        setIsLoadingMessages(false);
        setError("Server error loading messages. Please try again.");
        loadingRef.current = false;
      }
    }, 10000);

    try {
      setIsLoadingMessages(true);
      setError(null);

      // Step 1: Get conversation participants to find other user
      const participantsPromise = Promise.resolve(
        supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
      ) as Promise<{ data: any; error: any }>;
      
      const { data: participants, error: participantsError } = await withTimeout(
        participantsPromise,
        10000,
        'Load participants'
      );

      if (participantsError) {
        clearTimeout(timeoutId);
        console.error("[Chat] error:", participantsError, participantsError?.message, participantsError?.details, participantsError?.hint, participantsError?.code);
        
        // STOP loading immediately on error
        setIsLoadingMessages(false);
        
        const status = (participantsError as any).status;
        if (status === 500) {
          setError("Server error loading messages. Please try again.");
          return;
        }
        
        // Check if it's an auth error
        if (participantsError.code === 'PGRST301' || participantsError.code === '42501' || 
            status === 401 || status === 403) {
          console.error("[Chat] Auth error - session expired");
          // Force sign out and redirect
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }
        
        // For other errors, show error but don't crash
        const normalized = normalizeSupabaseError(participantsError);
        setError(normalized.message || "You don't have access to this conversation or it doesn't exist");
        return;
      }

      const otherUserId = (participants || []).find((p: { user_id: string }) => p.user_id !== user.id)?.user_id;
      if (!otherUserId) {
        clearTimeout(timeoutId);
        setError("Conversation not found");
        setIsLoadingMessages(false);
        return;
      }

      // Step 2: Get other user's profile
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
        clearTimeout(timeoutId);
        console.error("[Chat] error:", profileError, profileError?.message, profileError?.details, profileError?.hint, profileError?.code);
        
        // STOP loading immediately on error
        setIsLoadingMessages(false);
        
        const status = (profileError as any).status;
        const normalized = normalizeSupabaseError(profileError);
        if (status === 500) {
          setError("Server error loading messages. Please try again.");
        } else {
          setError(normalized.message || "Failed to load user profile. Please try again.");
        }
        return;
      }

      setOtherUser({
        id: otherUserProfile.id,
        display_name: otherUserProfile.display_name,
        avatar_url: otherUserProfile.avatar_url,
      });

      // Step 3: Load messages
      await loadMessages();
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[Chat] Error loading conversation data:", error);
      
      // STOP loading immediately on error
      setIsLoadingMessages(false);
      
      const status = (error as any)?.status;
      const normalized = normalizeSupabaseError(error);
      if (status === 500) {
        setError("Server error loading messages. Please try again.");
      } else {
        setError(normalized.message || "Failed to load conversation. Please try again.");
      }
    } finally {
      // ALWAYS clear loading state (in case it wasn't cleared in catch)
      setIsLoadingMessages(false);
    }
  }, [user, conversationId, router]);

  const loadMessages = useCallback(async () => {
    try {
      const messagePromise = Promise.resolve(
        supabase
          .from("messages")
          .select("id, sender_id, content, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
      ) as Promise<{ data: any; error: any }>;
      
      const { data, error } = await withTimeout(
        messagePromise,
        10000,
        'Load messages'
      );

      if (error) {
        console.error("[Chat] error:", error, error?.message, error?.details, error?.hint, error?.code);
        const status = (error as any).status;
        const normalized = normalizeSupabaseError(error);
        if (status === 500) {
          setError("Server error loading messages. Please try again.");
        } else {
          setError(normalized.message || "Failed to load messages. Please try again.");
        }
        return;
      }

      setMessages(data || []);
    } catch (error: any) {
      console.error("[Chat] Error in loadMessages:", error);
      const status = (error as any)?.status;
      const normalized = normalizeSupabaseError(error);
      if (status === 500) {
        setError("Server error loading messages. Please try again.");
      } else {
        setError(normalized.message || "Failed to load messages. Please try again.");
      }
    }
  }, [conversationId]);

  const setupRealtimeSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("[Chat] New message received:", payload);
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, [conversationId]);

  // Load conversation data when component mounts or user/conversation changes
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !conversationId || loadingRef.current) return;
    
    // Prevent double-loading
    if (hasLoadedRef.current) return;
    
    loadingRef.current = true;
    hasLoadedRef.current = true;
    
    loadConversationData().finally(() => {
      loadingRef.current = false;
    });
    
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscription on unmount
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      hasLoadedRef.current = false;
    };
  }, [isAuthenticated, user?.id, conversationId, loadConversationData, setupRealtimeSubscription]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      const insertPromise = Promise.resolve(
        supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: messageText.trim(),
          })
      ) as Promise<{ error: any }>;
      
      const { error: insertError } = await withTimeout(
        insertPromise,
        10000,
        'Send message'
      );

      if (insertError) {
        console.error("[Chat] error:", insertError, insertError?.message, insertError?.details, insertError?.hint, insertError?.code);
        const status = (insertError as any).status;
        if (status === 500) {
          setError("Server error sending message. Please try again.");
        } else {
          throw insertError;
        }
        return;
      }

      setMessageText("");
    } catch (error: any) {
      console.error("[Chat] Error in handleSendMessage:", error);
      setError(error?.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
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

  const displayName = otherUser?.display_name || "User";
  const initials = getInitials(otherUser?.display_name, otherUser?.id || "");

  return (
    <main className="min-h-screen pb-20 flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1 flex flex-col">
        {/* Header */}
        <div className="glass-dark border-b border-gold/20 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Link href="/messages" className="text-gold hover:text-gold-dark">
              ← Back
            </Link>
            {otherUser && (
              <div className="flex items-center gap-3 flex-1">
                {otherUser.avatar_url && isValidUrl(otherUser.avatar_url) ? (
                  <img
                    src={otherUser.avatar_url}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement("div");
                        fallback.className =
                          "w-10 h-10 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold";
                        fallback.textContent = initials;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold">
                    {initials}
                  </div>
                )}
                <h2 className="font-semibold text-gray-900">{displayName}</h2>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl">
                <p className="text-red-600 text-sm mb-2">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    hasLoadedRef.current = false;
                    loadingRef.current = false;
                    loadConversationData();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoadingMessages ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
                <p className="text-gray-600">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-gradient-to-r from-gold to-gold-light text-gray-900"
                          : "bg-white/80 text-gray-900 border border-gold/20"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">{formatTimestamp(message.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Send Box */}
        <div className="glass-dark border-t border-gold/20 px-4 py-4">
          <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none bg-white/80"
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!messageText.trim() || isSending}
                className="px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? "..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}


