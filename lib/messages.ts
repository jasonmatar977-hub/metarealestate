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
    // Step 1: Get all conversations for user1
    // Use a direct query - RLS will filter automatically
    const { data: user1Convs, error: user1Error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId1);

    if (user1Error) {
      console.error("[messages] Error finding user1 conversations:", {
        message: user1Error.message,
        details: user1Error.details,
        hint: user1Error.hint,
        code: user1Error.code,
      });
      // If RLS blocks, try creating new conversation
      if (user1Error.code === 'PGRST301' || user1Error.code === '42501' || user1Error.message?.includes('permission')) {
        console.log("[messages] RLS blocked query, creating new conversation");
        return await createNewConversation(userId1, userId2);
      }
      return { conversationId: "", error: user1Error };
    }

    if (!user1Convs || user1Convs.length === 0) {
      // User1 has no conversations, create new one
      return await createNewConversation(userId1, userId2);
    }

    const user1ConversationIds = new Set(user1Convs.map((c) => c.conversation_id));

    // Step 2: Get all conversations for user2
    const { data: user2Convs, error: user2Error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId2);

    if (user2Error) {
      console.error("[messages] Error finding user2 conversations:", {
        message: user2Error.message,
        details: user2Error.details,
        hint: user2Error.hint,
        code: user2Error.code,
      });
      return { conversationId: "", error: user2Error };
    }

    // Step 3: Find intersection (conversations both users are in)
    const commonConversations = (user2Convs || [])
      .map((c) => c.conversation_id)
      .filter((id) => user1ConversationIds.has(id));

    if (commonConversations.length > 0) {
      // Conversation exists, return the first one
      return { conversationId: commonConversations[0], error: null };
    }

    // No common conversation, create new one
    return await createNewConversation(userId1, userId2);
  } catch (error: any) {
    console.error("[messages] Exception in findOrCreateConversation:", error);
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

