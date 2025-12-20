/**
 * Messages Helper Functions
 * Utilities for finding/creating conversations and managing messages
 */

import { supabase } from "./supabaseClient";
import { requestGuard, normalizeSupabaseError, isAuthError, debugLog, withTimeout } from "./asyncGuard";

/**
 * Per-target request lock to prevent duplicate concurrent requests for the same user pair
 * Key format: "userId1:userId2" (sorted to ensure same key for both directions)
 */
type ConversationResult = { conversationId: string; error: any };
const conversationLocks = new Map<string, Promise<ConversationResult>>();

/**
 * Get a stable key for a user pair (sorted to ensure same key regardless of order)
 */
function getConversationKey(userId1: string, userId2: string): string {
  // Sort user IDs to ensure same key for both directions (A:B = B:A)
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}:${sorted[1]}`;
}

/**
 * Find or create a DIRECT (1-to-1) conversation between two users
 * Uses per-target request lock to prevent duplicate concurrent requests
 * Returns the conversation ID
 */
export async function findOrCreateDirectConversation(
  currentUserId: string,
  otherUserId: string
): Promise<{ conversationId: string; error: any }> {
  const lockKey = getConversationKey(currentUserId, otherUserId);
  
  // Check if a request is already in progress for this user pair
  const existingPromise = conversationLocks.get(lockKey);
  if (existingPromise) {
    console.log("[messages] Request already in progress for", lockKey, "- awaiting existing request");
    return existingPromise; // Await and return the existing promise (do not throw)
  }

  // Create new promise for this request
  const requestPromise = (async (): Promise<ConversationResult> => {
    try {
      console.log("[messages] Finding or creating direct conversation between", currentUserId, "and", otherUserId);
      
      // Step 1: Query for existing 1-to-1 conversation
      // Implements SQL pattern:
      // select conversation_id from conversation_participants
      // where user_id in (currentUserId, targetUserId)
      // group by conversation_id
      // having count(distinct user_id) = 2
      // limit 1
      // Note: PostgREST doesn't support HAVING, so we group in JavaScript
      const { data: participants, error: participantsError } = await withTimeout(
        Promise.resolve(
          supabase
            .from("conversation_participants")
            .select("conversation_id, user_id")
            .in("user_id", [currentUserId, otherUserId])
        ) as Promise<{ data: any; error: any }>,
        10000,
        'Find existing conversation'
      );

      if (participantsError) {
        const normalized = normalizeSupabaseError(participantsError);
        console.error("[messages] ERROR finding existing conversation:", {
          error: participantsError,
          message: participantsError?.message,
          details: participantsError?.details,
          hint: participantsError?.hint,
          code: participantsError?.code,
          status: (participantsError as any)?.status,
        });
        
        if (isAuthError(participantsError)) {
          return { conversationId: "", error: normalized };
        }
        
        // For other errors, try creating new conversation
        console.log("[messages] Query failed, attempting to create new conversation");
        return await createNewDirectConversation(currentUserId, otherUserId);
      }

      // Step 2: Group by conversation_id and find conversations with exactly 2 distinct users
      // This implements: group by conversation_id having count(distinct user_id) = 2
      const conversationUserSets = new Map<string, Set<string>>();
      (participants || []).forEach((p: { conversation_id: string; user_id: string }) => {
        if (!conversationUserSets.has(p.conversation_id)) {
          conversationUserSets.set(p.conversation_id, new Set());
        }
        conversationUserSets.get(p.conversation_id)!.add(p.user_id);
      });

      // Find conversation with exactly 2 participants (both users)
      for (const [convId, userIds] of conversationUserSets.entries()) {
        if (userIds.size === 2 && userIds.has(currentUserId) && userIds.has(otherUserId)) {
          console.log("[messages] ✅ Found existing direct conversation:", convId);
          return { conversationId: convId, error: null };
        }
      }

      // Step 3: No existing conversation found, create new one
      console.log("[messages] No existing direct conversation found, creating new one");
      return await createNewDirectConversation(currentUserId, otherUserId);
    } catch (error: any) {
      const normalized = normalizeSupabaseError(error);
      console.error("[messages] EXCEPTION in findOrCreateDirectConversation:", {
        error: normalized,
        message: normalized.message,
        code: normalized.code,
        details: normalized.details,
        hint: normalized.hint,
        status: normalized.status,
      });
      return { conversationId: "", error: normalized };
    } finally {
      // Always release the lock
      conversationLocks.delete(lockKey);
      console.log("[messages] Released lock for", lockKey);
    }
  })();

  // Store the promise in the lock map
  conversationLocks.set(lockKey, requestPromise);
  
  return requestPromise;
}

/**
 * Find or create a conversation between two users
 * Returns the conversation ID
 * This function is idempotent - it will find existing conversations or create a new one
 * @deprecated Use findOrCreateDirectConversation for direct messages
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
      
      // Return error - will be handled in finally block
      return { conversationId: "", error: normalized };
    }

    if (!user1Convs || user1Convs.length === 0) {
      // User1 has no conversations, create new one
      console.log("[messages] No existing conversations found, creating new one");
      const result = await createNewConversation(userId1, userId2);
      return result;
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
      
      // Return error - will be handled in finally block
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
        return { conversationId: convId, error: null };
      }
    }

    // No common conversation, create new one
    console.log("[messages] No existing conversation found, creating new one");
    const result = await createNewConversation(userId1, userId2);
    return result;
  } catch (error: any) {
    const normalized = normalizeSupabaseError(error);
    console.error("[messages] Exception in findOrCreateConversation:", normalized);
    return { conversationId: "", error: normalized };
  } finally {
    // ALWAYS finish the request guard, even on early returns and errors
    requestGuard.finish(requestKey);
  }
}

/**
 * Create a new direct conversation between two users
 */
async function createNewDirectConversation(
  userId1: string,
  userId2: string
): Promise<{ conversationId: string; error: any }> {
  try {
    console.log("[messages] Creating new direct conversation between", userId1, "and", userId2);
    
    // Step 1: Create new conversation
    // Try to include created_by if the column exists (optional)
    const { data: newConversation, error: createConvError } = await withTimeout(
      Promise.resolve(
        supabase
          .from("conversations")
          .insert({ created_by: userId1 }) // Include created_by if column exists (will be ignored if not)
          .select()
          .single()
      ) as Promise<{ data: any; error: any }>,
      10000,
      'Create conversation'
    );

    if (createConvError || !newConversation) {
      const normalized = normalizeSupabaseError(createConvError);
      console.error("[messages] ERROR creating conversation:", {
        error: createConvError,
        message: createConvError?.message,
        details: createConvError?.details,
        hint: createConvError?.hint,
        code: createConvError?.code,
        status: (createConvError as any)?.status,
      });
      return { conversationId: "", error: normalized };
    }

    console.log("[messages] ✅ Created conversation:", newConversation.id);

    // Step 2: Add current user first (userId1 is the current user)
    const { error: selfParticipantError } = await withTimeout(
      Promise.resolve(
        supabase
          .from("conversation_participants")
          .insert({ conversation_id: newConversation.id, user_id: userId1 })
      ) as Promise<{ error: any }>,
      10000,
      'Add self as participant'
    );

    if (selfParticipantError) {
      const normalized = normalizeSupabaseError(selfParticipantError);
      console.error("[messages] ERROR adding self as participant:", {
        error: selfParticipantError,
        message: selfParticipantError?.message,
        details: selfParticipantError?.details,
        hint: selfParticipantError?.hint,
        code: selfParticipantError?.code,
        status: (selfParticipantError as any)?.status,
        conversationId: newConversation.id,
        userId: userId1,
      });
      
      // If it's a unique constraint violation, participant already exists (race condition)
      if (selfParticipantError?.code === '23505' || selfParticipantError?.message?.includes('duplicate')) {
        console.log("[messages] Self participant already exists (race condition), continuing...");
      } else {
        return { conversationId: "", error: normalized };
      }
    } else {
      console.log("[messages] ✅ Added self as participant:", userId1);
    }

    // Step 3: Add other user (userId2 is the target user)
    // Now that we're a participant, RLS allows us to add the other user
    const { error: otherParticipantError } = await withTimeout(
      Promise.resolve(
        supabase
          .from("conversation_participants")
          .insert({ conversation_id: newConversation.id, user_id: userId2 })
      ) as Promise<{ error: any }>,
      10000,
      'Add other user as participant'
    );

    if (otherParticipantError) {
      const normalized = normalizeSupabaseError(otherParticipantError);
      console.error("[messages] ERROR adding other user as participant:", {
        error: otherParticipantError,
        message: otherParticipantError?.message,
        details: otherParticipantError?.details,
        hint: otherParticipantError?.hint,
        code: otherParticipantError?.code,
        status: (otherParticipantError as any)?.status,
        conversationId: newConversation.id,
        userId: userId2,
      });
      
      // If it's a unique constraint violation, participant already exists (race condition)
      if (otherParticipantError?.code === '23505' || otherParticipantError?.message?.includes('duplicate')) {
        console.log("[messages] Other participant already exists (race condition), conversation is valid");
        return { conversationId: newConversation.id, error: null };
      }
      
      return { conversationId: "", error: normalized };
    } else {
      console.log("[messages] ✅ Added other user as participant:", userId2);
    }

    console.log("[messages] ✅ Successfully created direct conversation with both participants:", newConversation.id);
    return { conversationId: newConversation.id, error: null };
  } catch (error: any) {
    const normalized = normalizeSupabaseError(error);
    console.error("[messages] EXCEPTION in createNewDirectConversation:", {
      error: normalized,
      message: normalized.message,
      code: normalized.code,
      details: normalized.details,
      hint: normalized.hint,
      status: normalized.status,
    });
    return { conversationId: "", error: normalized };
  }
}

/**
 * Create a new conversation between two users
 * This function is idempotent - it checks for existing conversations before creating
 * @deprecated Use createNewDirectConversation for direct messages
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

