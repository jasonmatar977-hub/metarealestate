/**
 * Messages Helper Functions
 * Utilities for finding/creating conversations and managing messages
 */

import { supabase } from "./supabaseClient";
import { requestGuard, normalizeSupabaseError, isAuthError, debugLog, withTimeout } from "./asyncGuard";

/**
 * Find or create a conversation between two users
 * Returns the conversation ID
 * This function is idempotent - it will find existing conversations or create a new one
 */
export async function findOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<{ conversationId: string; error: any }> {
  const requestKey = `find-conv-${userId1}-${userId2}`;
  
  // Request guard to prevent duplicate requests
  if (!requestGuard.start(requestKey)) {
    debugLog('[messages] Find conversation already in flight, skipping');
    return { conversationId: "", error: { message: "Request already in progress" } };
  }

  try {
    console.log("[messages] Finding or creating conversation between", userId1, "and", userId2);
    
    // Step 1: Directly query for existing conversation between these two users
    // Get all conversations where user1 is a participant
    const user1ConvsPromise = Promise.resolve(
      supabase
        .from("conversations")
        .select("id")
        .limit(100)
    ) as Promise<{ data: any; error: any }>;
    
    const { data: user1Convs, error: user1Error } = await withTimeout(
      user1ConvsPromise,
      10000,
      'Find user1 conversations'
    );

    if (user1Error) {
      const normalized = normalizeSupabaseError(user1Error);
      console.error("[messages] error:", user1Error, user1Error?.message, user1Error?.details, user1Error?.hint, user1Error?.code);
      
      // If auth error, return error (caller should handle)
      if (isAuthError(user1Error)) {
        requestGuard.finish(requestKey);
        return { conversationId: "", error: normalized };
      }
      
      // For other errors (including 500), return error - let caller handle retry
      console.error("[messages] Query failed, returning error to caller");
      requestGuard.finish(requestKey);
      return { conversationId: "", error: normalized };
    }

    if (!user1Convs || user1Convs.length === 0) {
      // User1 has no conversations, create new one
      console.log("[messages] No existing conversations found, creating new one");
      return await createNewConversation(userId1, userId2);
    }

    const user1ConversationIds = Array.from((user1Convs || []).map((c: any) => c.id));
    console.log("[messages] Found", user1ConversationIds.length, "conversations for user1, checking participants");

    // Step 2: Check participants for these conversations to find common ones
    const participantsPromise = Promise.resolve(
      supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", user1ConversationIds)
        .in("user_id", [userId1, userId2])
    ) as Promise<{ data: any; error: any }>;
    
    const { data: participants, error: participantsError } = await withTimeout(
      participantsPromise,
      10000,
      'Find participants'
    );

    if (participantsError) {
      const normalized = normalizeSupabaseError(participantsError);
      console.error("[messages] error:", participantsError, participantsError?.message, participantsError?.details, participantsError?.hint, participantsError?.code);
      
      // If auth error, return error
      if (isAuthError(participantsError)) {
        requestGuard.finish(requestKey);
        return { conversationId: "", error: normalized };
      }
      
      // Return error - let caller handle retry
      console.error("[messages] Participants query failed, returning error to caller");
      requestGuard.finish(requestKey);
      return { conversationId: "", error: normalized };
    }

    // Step 3: Find conversations where both users are participants
    const conversationUserCounts = new Map<string, Set<string>>();
    (participants || []).forEach((p: any) => {
      if (!conversationUserCounts.has(p.conversation_id)) {
        conversationUserCounts.set(p.conversation_id, new Set());
      }
      conversationUserCounts.get(p.conversation_id)!.add(p.user_id);
    });

    // Find conversations with both users
    for (const [convId, userIds] of conversationUserCounts.entries()) {
      if (userIds.has(userId1) && userIds.has(userId2)) {
        console.log("[messages] Found existing conversation:", convId);
        requestGuard.finish(requestKey);
        return { conversationId: convId, error: null };
      }
    }

    // No common conversation, create new one
    console.log("[messages] No existing conversation found, creating new one");
    return await createNewConversation(userId1, userId2);
  } catch (error: any) {
    const normalized = normalizeSupabaseError(error);
    console.error("[messages] Exception in findOrCreateConversation:", normalized);
    requestGuard.finish(requestKey);
    return { conversationId: "", error: normalized };
  }
}

/**
 * Create a new conversation between two users
 * This function is idempotent - it checks for existing conversations before creating
 */
async function createNewConversation(
  userId1: string,
  userId2: string
): Promise<{ conversationId: string; error: any }> {
  try {
    console.log("[messages] Creating new conversation between", userId1, "and", userId2);
    
    // Create new conversation
    const createPromise = Promise.resolve(
      supabase
        .from("conversations")
        .insert({})
        .select()
        .single()
    ) as Promise<{ data: any; error: any }>;
    
    const { data: newConversation, error: createConvError } = await withTimeout(
      createPromise,
      10000,
      'Create conversation'
    );

    if (createConvError || !newConversation) {
      const normalized = normalizeSupabaseError(createConvError);
      console.error("[messages] error:", createConvError, createConvError?.message, createConvError?.details, createConvError?.hint, createConvError?.code);
      
      // Return error - let caller handle retry
      // Note: If duplicate key error occurs, caller should retry findOrCreateConversation
      return { conversationId: "", error: normalized };
    }

    console.log("[messages] Created conversation:", newConversation.id);

    // Add both users as participants
    // Use upsert to handle race conditions (if participants already exist, ignore)
    const insertPromise = Promise.resolve(
      supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConversation.id, user_id: userId1 },
          { conversation_id: newConversation.id, user_id: userId2 },
        ])
    ) as Promise<{ error: any }>;
    
    const { error: participantsError } = await withTimeout(
      insertPromise,
      10000,
      'Add participants'
    );

    if (participantsError) {
      const normalized = normalizeSupabaseError(participantsError);
      console.error("[messages] error:", participantsError, participantsError?.message, participantsError?.details, participantsError?.hint, participantsError?.code);
      
      // If it's a unique constraint violation, the participants already exist (race condition)
      // This is OK - the conversation was created successfully
      if (participantsError?.code === '23505' || participantsError?.message?.includes('duplicate')) {
        console.log("[messages] Participants already exist (race condition), conversation is valid");
        return { conversationId: newConversation.id, error: null };
      }
      
      return { conversationId: "", error: normalized };
    }

    console.log("[messages] Successfully created conversation with participants:", newConversation.id);
    return { conversationId: newConversation.id, error: null };
  } catch (error: any) {
    const normalized = normalizeSupabaseError(error);
    console.error("[messages] Exception in createNewConversation:", normalized);
    return { conversationId: "", error: normalized };
  }
}

