/**
 * Messages Helper Functions
 * Utilities for finding/creating conversations and managing messages
 */

import { supabase } from "./supabaseClient";

/**
 * Find or create a conversation between two users
 * Returns the conversation ID
 */
export async function findOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<{ conversationId: string; error: any }> {
  try {
    // Step 1: Get all conversations for user1 (RLS will filter automatically)
    const { data: user1Convs, error: user1Error } = await supabase
      .from("conversations")
      .select("id")
      .limit(100);

    if (user1Error) {
      console.error("[messages] Error finding user1 conversations:", {
        message: user1Error.message,
        details: user1Error.details,
        hint: user1Error.hint,
        code: user1Error.code,
        status: (user1Error as any).status,
      });
      
      // If auth error, return error (caller should handle)
      if (user1Error.code === 'PGRST301' || user1Error.code === '42501' || 
          (user1Error as any).status === 401 || (user1Error as any).status === 403) {
        return { conversationId: "", error: user1Error };
      }
      
      // For other errors, try creating new conversation
      console.log("[messages] Query failed, creating new conversation");
      return await createNewConversation(userId1, userId2);
    }

    if (!user1Convs || user1Convs.length === 0) {
      // User1 has no conversations, create new one
      return await createNewConversation(userId1, userId2);
    }

    const user1ConversationIds = new Set(user1Convs.map((c) => c.id));

    // Step 2: Check participants for these conversations to find common ones
    const { data: participants, error: participantsError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", Array.from(user1ConversationIds))
      .in("user_id", [userId1, userId2]);

    if (participantsError) {
      console.error("[messages] Error finding participants:", {
        message: participantsError.message,
        details: participantsError.details,
        hint: participantsError.hint,
        code: participantsError.code,
      });
      // Try creating new conversation
      return await createNewConversation(userId1, userId2);
    }

    // Step 3: Find conversations where both users are participants
    const conversationUserCounts = new Map<string, Set<string>>();
    (participants || []).forEach((p) => {
      if (!conversationUserCounts.has(p.conversation_id)) {
        conversationUserCounts.set(p.conversation_id, new Set());
      }
      conversationUserCounts.get(p.conversation_id)!.add(p.user_id);
    });

    // Find conversations with both users
    for (const [convId, userIds] of conversationUserCounts.entries()) {
      if (userIds.has(userId1) && userIds.has(userId2)) {
        return { conversationId: convId, error: null };
      }
    }

    // No common conversation, create new one
    return await createNewConversation(userId1, userId2);
  } catch (error: any) {
    console.error("[messages] Exception in findOrCreateConversation:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });
    return { conversationId: "", error };
  }
}

/**
 * Create a new conversation between two users
 */
async function createNewConversation(
  userId1: string,
  userId2: string
): Promise<{ conversationId: string; error: any }> {
  try {
    // Create new conversation
    const { data: newConversation, error: createConvError } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();

    if (createConvError || !newConversation) {
      console.error("[messages] Error creating conversation:", {
        message: createConvError?.message,
        details: createConvError?.details,
        hint: createConvError?.hint,
        code: createConvError?.code,
      });
      return { conversationId: "", error: createConvError };
    }

    // Add both users as participants
    const { error: participantsError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: newConversation.id, user_id: userId1 },
        { conversation_id: newConversation.id, user_id: userId2 },
      ]);

    if (participantsError) {
      console.error("[messages] Error adding participants:", {
        message: participantsError.message,
        details: participantsError.details,
        hint: participantsError.hint,
        code: participantsError.code,
      });
      return { conversationId: "", error: participantsError };
    }

    return { conversationId: newConversation.id, error: null };
  } catch (error: any) {
    console.error("[messages] Exception in createNewConversation:", error);
    return { conversationId: "", error };
  }
}

