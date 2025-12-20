"use client";

/**
 * Chat Page
 * Route: /messages/[conversationId]
 * Shows messages in a conversation with realtime updates
 */

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import { isValidUrl } from "@/lib/utils";

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

  useEffect(() => {
    if (!loadingSession && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router]);

  useEffect(() => {
    if (isAuthenticated && user && conversationId) {
      loadConversationData();
      setupRealtimeSubscription();
    }

    return () => {
      // Cleanup subscription on unmount
      const channel = supabase.channel(`messages:${conversationId}`);
      channel.unsubscribe();
    };
  }, [isAuthenticated, user, conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversationData = async () => {
    if (!user) return;

    try {
      setIsLoadingMessages(true);
      setError(null);

      // Step 1: Get conversation participants to find other user
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (participantsError) {
        console.error("[Chat] Error loading participants:", {
          message: participantsError.message,
          details: participantsError.details,
          hint: participantsError.hint,
          code: participantsError.code,
          status: (participantsError as any).status,
        });
        
        // Check if it's an auth error
        if (participantsError.code === 'PGRST301' || participantsError.code === '42501' || 
            (participantsError as any).status === 401 || (participantsError as any).status === 403) {
          console.error("[Chat] Auth error - session expired");
          // Force sign out and redirect
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }
        
        // For other errors, show error but don't crash
        setError("You don't have access to this conversation or it doesn't exist");
        setIsLoadingMessages(false);
        return;
      }

      const otherUserId = (participants || []).find((p) => p.user_id !== user.id)?.user_id;
      if (!otherUserId) {
        setError("Conversation not found");
        setIsLoadingMessages(false);
        return;
      }

      // Step 2: Get other user's profile
      const { data: otherUserProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", otherUserId)
        .single();

      if (profileError) {
        console.error("[Chat] Error loading other user profile:", profileError);
        throw profileError;
      }

      setOtherUser({
        id: otherUserProfile.id,
        display_name: otherUserProfile.display_name,
        avatar_url: otherUserProfile.avatar_url,
      });

      // Step 3: Load messages
      await loadMessages();
    } catch (error: any) {
      console.error("[Chat] Error loading conversation data:", error);
      setError(error?.message || "Failed to load conversation");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[Chat] Error loading messages:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      setMessages(data || []);
    } catch (error: any) {
      console.error("[Chat] Error in loadMessages:", error);
      setError(error?.message || "Failed to load messages");
    }
  };

  const setupRealtimeSubscription = () => {
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

    return () => {
      channel.unsubscribe();
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageText.trim(),
        });

      if (insertError) {
        console.error("[Chat] Error sending message:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        throw insertError;
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
                <p className="text-red-600 text-sm">{error}</p>
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


