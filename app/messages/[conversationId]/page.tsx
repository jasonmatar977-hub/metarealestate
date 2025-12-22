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
import EmojiPicker from "@/components/EmojiPicker";

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
  image_url: string | null;
  attachment_url: string | null;
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
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
          .select("id, sender_id, content, body, created_at, read_at")
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
        
        // Check if it's a missing column error
        const errorMessage = normalized.message?.toLowerCase() || '';
        const errorDetails = normalized.details?.toLowerCase() || '';
        if (errorMessage.includes('column') && errorMessage.includes('does not exist') && 
            (errorMessage.includes('content') || errorDetails.includes('content'))) {
          setError("Database schema mismatch: 'content' column is missing. Please check your messages table schema.");
          console.error("[Chat] SCHEMA ERROR: messages.content column is missing. Check database schema.");
          return;
        }
        
        if (status === 500) {
          setError("Server error loading messages. Please try again.");
        } else {
          setError(normalized.message || "Failed to load messages. Please try again.");
        }
        return;
      }

      // Normalize messages: use content as primary, fallback to body if content is null
      const normalizedMessages = (data || []).map((msg: any) => ({
        ...msg,
        content: msg.content ?? msg.body ?? "",
        image_url: msg.image_url || null,
        attachment_url: msg.attachment_url || null,
      }));
      setMessages(normalizedMessages);
      console.log("[Chat] Loaded", normalizedMessages.length, "messages from history");

      // Mark unread messages as read (where sender_id != user.id and read_at IS NULL)
      if (user) {
        const unreadMessageIds = normalizedMessages
          .filter((msg: any) => msg.sender_id !== user.id && !msg.read_at)
          .map((msg: any) => msg.id);

        if (unreadMessageIds.length > 0) {
          console.log("[Chat] Marking", unreadMessageIds.length, "messages as read");
          // Update read_at for unread messages
          supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadMessageIds)
            .then(({ error }) => {
              if (error) {
                console.error("[Chat] Error marking messages as read:", error);
              } else {
                console.log("[Chat] Successfully marked messages as read");
              }
            });
        }
      }
    } catch (error: any) {
      console.error("[Chat] Error in loadMessages:", error);
      const status = (error as any)?.status;
      const normalized = normalizeSupabaseError(error);
      if (status === 500) {
        setError("Server error loading messages. Please try again.");
      } else {
        setError(normalized.message || "Failed to load messages. Please try again.");
      }
    } finally {
      // Ensure loading is cleared
      setIsLoadingMessages(false);
    }
  }, [conversationId]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!conversationId) return;
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      console.log("[Chat] Unsubscribing from existing channel");
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    console.log("[Chat] Setting up realtime subscription for conversation:", conversationId);
    
    const channel = supabase
      .channel(`messages:${conversationId}`, {
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
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("[Chat] New message received via realtime:", payload);
          const newMessage = payload.new as any;
          
          // Normalize: use content as primary, fallback to body
          const normalizedMessage: Message = {
            id: newMessage.id,
            sender_id: newMessage.sender_id,
            content: newMessage.content ?? newMessage.body ?? "",
            body: newMessage.body,
            created_at: newMessage.created_at,
            read_at: newMessage.read_at || null,
            image_url: newMessage.image_url || null,
            attachment_url: newMessage.attachment_url || null,
          };
          
          // Prevent duplicates: check if message ID already exists
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === normalizedMessage.id);
            if (exists) {
              console.log("[Chat] Message already exists, skipping duplicate:", normalizedMessage.id);
              return prev;
            }
            console.log("[Chat] Adding new message from realtime:", normalizedMessage.id);
            // Add new message and sort by created_at to maintain order
            const updated = [...prev, normalizedMessage].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            return updated;
          });

          // Mark message as read if it's not from current user
          if (normalizedMessage.sender_id !== user?.id && !normalizedMessage.read_at) {
            console.log("[Chat] Marking new message as read:", normalizedMessage.id);
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", normalizedMessage.id)
              .then(({ error }) => {
                if (error) {
                  console.error("[Chat] Error marking message as read:", error);
                } else {
                  console.log("[Chat] Successfully marked message as read");
                }
              });
          }
          
          // Scroll to bottom when new message arrives
          setTimeout(() => scrollToBottom(), 100);
        }
      )
      .subscribe((status) => {
        console.log("[Chat] Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("[Chat] ✅ Successfully subscribed to realtime updates");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[Chat] ❌ Realtime subscription error");
        } else if (status === "TIMED_OUT") {
          console.warn("[Chat] ⚠️ Realtime subscription timed out");
        } else if (status === "CLOSED") {
          console.log("[Chat] Realtime subscription closed");
        }
      });

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
      loadingRef.current = false;
    };
  }, [isAuthenticated, user?.id, conversationId, loadConversationData, setupRealtimeSubscription]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleEmojiSelect = (emoji: string) => {
    if (messageInputRef.current) {
      const input = messageInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = messageText;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setMessageText(newText);
      // Set cursor position after emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setMessageText((prev) => prev + emoji);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("File size exceeds 10MB limit. Please choose a smaller file.");
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith("image/") && ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type);
    const isFile = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"].includes(file.type);

    if (!isImage && !isFile) {
      setError("Unsupported file type. Please select an image (PNG/JPG/WEBP) or file (PDF/DOC/DOCX/ZIP).");
      return;
    }

    try {
      setUploadingFile(true);
      setError(null);
      setUploadProgress(0);

      // Generate safe filename: lowercase, replace spaces with '-', remove weird chars
      const safeFilename = file.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9.-]/g, "")
        .substring(0, 100); // Limit length

      // Generate file path: {userId}/{conversationId}/{timestamp}-{safeFilename}
      // NOTE: Bucket name is NOT in the path - it's specified in .from("chat-media")
      const timestamp = Date.now();
      const filePath = `${user.id}/${conversationId}/${timestamp}-${safeFilename}`;

      // CRITICAL: Use chat-media bucket (not post-media)
      const BUCKET_NAME = "chat-media";

      if (process.env.NODE_ENV === "development") {
        console.log("[Chat] Upload details:", {
          bucket: BUCKET_NAME,
          path: filePath,
          filename: file.name,
          size: file.size,
          type: file.type,
        });
      }

      // Upload to Supabase Storage - chat-media bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Chat] Upload error details:", {
            error: uploadError,
            message: uploadError.message,
            name: uploadError.name,
            bucket: BUCKET_NAME,
            path: filePath,
          });
        }
        setError(`Failed to upload file: ${uploadError.message || "Please try again."}`);
        setUploadingFile(false);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[Chat] Upload successful:", {
          bucket: BUCKET_NAME,
          path: filePath,
          uploadData,
        });
      }

      // Try to get public URL first (if bucket is public)
      let fileUrl: string;
      try {
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;

        if (process.env.NODE_ENV === "development") {
          console.log("[Chat] Using public URL:", fileUrl);
        }
      } catch (publicUrlError) {
        // If public URL fails, try signed URL (for private buckets)
        if (process.env.NODE_ENV === "development") {
          console.log("[Chat] Public URL not available, trying signed URL...");
        }

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(filePath, 86400); // 1 day expiry

        if (signedUrlError || !signedUrlData) {
          console.error("[Chat] Failed to get signed URL:", signedUrlError);
          setError("Failed to generate file URL. Please try again.");
          setUploadingFile(false);
          return;
        }

        fileUrl = signedUrlData.signedUrl;

        if (process.env.NODE_ENV === "development") {
          console.log("[Chat] Using signed URL (expires in 1 day):", fileUrl);
        }
      }

      if (isImage) {
        setSelectedImage(fileUrl);
      } else {
        setSelectedAttachment({ url: fileUrl, name: file.name });
      }

      setUploadProgress(100);
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Chat] Exception uploading file:", {
          error,
          message: error?.message,
          stack: error?.stack,
        });
      }
      setError("An error occurred while uploading. Please try again.");
    } finally {
      setUploadingFile(false);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const removeAttachment = () => {
    setSelectedAttachment(null);
  };

  const canSend = () => {
    const hasText = messageText.trim().length > 0;
    const hasImage = selectedImage !== null;
    const hasAttachment = selectedAttachment !== null;
    return (hasText || hasImage || hasAttachment) && !isSending && !uploadingFile;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend() || !user) return;

    const messageTextToSend = messageText.trim() || null;
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    // Optimistic update
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: user.id,
      content: messageTextToSend,
      body: null,
      created_at: new Date().toISOString(),
      read_at: null,
      image_url: selectedImage || null,
      attachment_url: selectedAttachment?.url || null,
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    const imageToSend = selectedImage;
    const attachmentToSend = selectedAttachment;
    setMessageText("");
    setSelectedImage(null);
    setSelectedAttachment(null);
    scrollToBottom();

    try {
      setIsSending(true);
      setError(null);

      // Prepare message data
      const messageData: any = {
        conversation_id: conversationId,
        sender_id: user.id,
      };

      if (messageTextToSend) {
        messageData.content = messageTextToSend;
      }

      if (imageToSend) {
        messageData.image_url = imageToSend;
      }

      if (attachmentToSend) {
        messageData.attachment_url = attachmentToSend.url;
        // Store filename in content if no text
        if (!messageTextToSend) {
          messageData.content = `📎 ${attachmentToSend.name}`;
        }
      }

      // Insert message
      const insertPromise = Promise.resolve(
        supabase
          .from("messages")
          .insert(messageData)
          .select()
          .single()
      ) as Promise<{ data: any; error: any }>;
      
      const { data: insertedMessage, error: insertError } = await withTimeout(
        insertPromise,
        10000,
        'Send message'
      );

      if (insertError) {
        console.error("[Chat] error:", insertError);
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        
        const status = (insertError as any).status;
        const normalized = normalizeSupabaseError(insertError);
        
        if (status === 500) {
          setError("Server error sending message. Please try again.");
        } else {
          setError(normalized.message || "Failed to send message. Please try again.");
        }
        return;
      }

      // Replace optimistic message with real message
      if (insertedMessage) {
        const normalizedMessage: Message = {
          ...insertedMessage,
          content: insertedMessage.content ?? insertedMessage.body ?? "",
          image_url: insertedMessage.image_url || null,
          attachment_url: insertedMessage.attachment_url || null,
        };
        
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== tempId);
          const exists = filtered.some((msg) => msg.id === normalizedMessage.id);
          if (exists) {
            return filtered;
          }
          return [...filtered, normalizedMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        scrollToBottom();
      }
    } catch (error: any) {
      console.error("[Chat] Error in handleSendMessage:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
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
                      {/* Image */}
                      {message.image_url && (
                        <div className="mb-2">
                          <a
                            href={message.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden max-w-full"
                          >
                            <img
                              src={message.image_url}
                              alt="Message attachment"
                              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </a>
                        </div>
                      )}

                      {/* Attachment */}
                      {message.attachment_url && (
                        <div className="mb-2">
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-gold"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-sm font-semibold truncate">
                              {message.content?.startsWith("📎") ? message.content.substring(2).trim() : "Download file"}
                            </span>
                          </a>
                        </div>
                      )}

                      {/* Text content */}
                      {message.content && !message.content.startsWith("📎") && (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}

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
            {/* Preview selected image */}
            {selectedImage && (
              <div className="mb-3 relative inline-block">
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-w-48 h-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            )}

            {/* Preview selected attachment */}
            {selectedAttachment && (
              <div className="mb-3 flex items-center gap-2 p-2 bg-white/50 rounded-lg">
                <svg
                  className="w-5 h-5 text-gold"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm font-semibold flex-1 truncate">{selectedAttachment.name}</span>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="text-red-500 hover:text-red-600 transition-colors"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            )}

            {/* Upload progress */}
            {uploadingFile && (
              <div className="mb-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gold h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}

            <div className="flex gap-2 items-end">
              {/* Attachment button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || uploadingFile}
                className="p-2 text-gray-600 hover:text-gold transition-colors rounded-lg hover:bg-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Attach file"
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
                  <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Image button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isSending || uploadingFile}
                className="p-2 text-gray-600 hover:text-gold transition-colors rounded-lg hover:bg-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Attach image"
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
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Emoji picker */}
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />

              {/* Message input */}
              <input
                ref={messageInputRef}
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none bg-white/80"
                disabled={isSending || uploadingFile}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend()) {
                      handleSendMessage(e);
                    }
                  }
                }}
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={!canSend()}
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


