import { supabase } from "@/integrations/supabase/client";
import type {
  Message,
  Conversation,
  MessageReaction,
  MessageRead,
  TypingStatus,
  UserPresence,
  BlockedUser,
  ConversationMember,
  PaginatedResponse,
  ReportedMessage,
} from "@/types/messaging";

const POSTGRES_UNIQUE_VIOLATION = "23505";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messagingDb = supabase as any;

// ===== CONVERSATIONS SERVICE =====

export const conversationsService = {
  // Get or create conversation with a user
  async getOrCreate(userId: string): Promise<Conversation> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    if (!UUID_PATTERN.test(user.id) || !UUID_PATTERN.test(userId)) {
      throw new Error("Invalid user ID format");
    }

    const [user1, user2] = [user.id, userId].sort();

    const getExistingConversation = async (): Promise<Conversation | null> => {
      const [{ data: sortedData, error: sortedError }, { data: reversedData, error: reversedError }] =
        await Promise.all([
          messagingDb
            .from("conversations")
            .select("*")
            .eq("user_id_1", user1)
            .eq("user_id_2", user2)
            .order("updated_at", { ascending: false })
            .limit(1),
          messagingDb
            .from("conversations")
            .select("*")
            .eq("user_id_1", user2)
            .eq("user_id_2", user1)
            .order("updated_at", { ascending: false })
            .limit(1),
        ]);

      if (sortedError) throw sortedError;
      if (reversedError) throw reversedError;

      const candidates = [...(sortedData || []), ...(reversedData || [])] as Conversation[];
      if (candidates.length === 0) return null;

      return candidates.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    };

    const existing = await getExistingConversation();

    if (existing) return existing as Conversation;

    // Create new conversation
    const { data: newConversation, error } = await messagingDb
      .from("conversations")
      .insert({
        user_id_1: user1,
        user_id_2: user2,
      })
      .select()
      .single();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        const concurrentConversation = await getExistingConversation();
        if (concurrentConversation) return concurrentConversation;
      }
      throw error;
    }

    return newConversation as Conversation;
  },

  // Get all conversations for current user
  async getConversations(limit = 50, offset = 0): Promise<PaginatedResponse<Conversation>> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, count, error } = await messagingDb
      .from("conversations")
      .select("*", { count: "exact" })
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: (data || []) as Conversation[],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  },

  // Archive conversation
  async archive(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await messagingDb
      .from("conversations")
      .update({
        [user.id === (await this.getConversation(conversationId)).user_id_1
          ? "archived_by_1"
          : "archived_by_2"]: true,
      })
      .eq("id", conversationId);

    if (error) throw error;
  },

  // Block user
  async block(conversationId: string, reason?: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const conv = await this.getConversation(conversationId);
    const isUser1 = user.id === conv.user_id_1;

    const { error } = await messagingDb
      .from("conversations")
      .update({
        [isUser1 ? "blocked_by_1" : "blocked_by_2"]: true,
      })
      .eq("id", conversationId);

    if (error) throw error;

    // Also add to blocked_users
    await blockedUsersService.block(isUser1 ? conv.user_id_2 : conv.user_id_1, reason);
  },

  // Get single conversation
  async getConversation(conversationId: string): Promise<Conversation> {
    const { data, error } = await messagingDb
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error) throw error;
    return data as Conversation;
  },
};

// ===== MESSAGES SERVICE =====

export const messagesService = {
  // Send message
  async send(
    conversationId: string,
    content: string | null,
    messageType: string,
    metadata?: Record<string, any>,
    attachmentData?: Record<string, any>,
  ): Promise<Message> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await messagingDb
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        metadata: metadata || {},
        attachment_data: attachmentData,
        delivered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation last_message_at
    await messagingDb
      .from("conversations")
      .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return data as Message;
  },

  // Get messages for conversation (paginated)
  async getMessages(
    conversationId: string,
    limit = 50,
    offset = 0,
  ): Promise<PaginatedResponse<Message>> {
    const { data, count, error } = await messagingDb
      .from("messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: (data || []).reverse() as Message[],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  },

  // Delete message (soft delete)
  async delete(messageId: string): Promise<void> {
    const { error } = await messagingDb
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);

    if (error) throw error;
  },

  // Edit message
  async edit(messageId: string, content: string): Promise<Message> {
    const { data, error } = await messagingDb
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  },

  // Upload image
  async uploadImage(conversationId: string, file: File): Promise<{ url: string; path: string }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const path = `${user.id}/${conversationId}/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage.from("message-images").upload(path, file);

    if (error) throw error;

    const { data: publicData } = supabase.storage.from("message-images").getPublicUrl(path);

    return {
      url: publicData.publicUrl,
      path,
    };
  },

  // Report message
  async report(messageId: string, reason: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await messagingDb.from("reported_messages").insert({
      message_id: messageId,
      reported_by: user.id,
      reason,
    });

    if (error) throw error;
  },
};

// ===== MESSAGE REACTIONS SERVICE =====

export const reactionsService = {
  // Add reaction to message
  async add(messageId: string, emoji: string): Promise<MessageReaction> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await messagingDb
      .from("message_reactions")
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })
      .select()
      .single();

    if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) throw error;
    return data as MessageReaction;
  },

  // Remove reaction
  async remove(messageId: string, emoji: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await messagingDb
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);

    if (error) throw error;
  },

  // Get reactions for message
  async getReactions(messageId: string): Promise<MessageReaction[]> {
    const { data, error } = await messagingDb
      .from("message_reactions")
      .select("*")
      .eq("message_id", messageId);

    if (error) throw error;
    return (data || []) as MessageReaction[];
  },
};

// ===== READ RECEIPTS SERVICE =====

export const readReceiptsService = {
  // Mark message as read
  async markAsRead(messageId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await messagingDb.from("message_reads").insert({
      message_id: messageId,
      user_id: user.id,
    });

    if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) throw error;
  },

  // Get read receipts for message
  async getReadReceipts(messageId: string): Promise<MessageRead[]> {
    const { data, error } = await messagingDb
      .from("message_reads")
      .select("*")
      .eq("message_id", messageId);

    if (error) throw error;
    return (data || []) as MessageRead[];
  },

  // Mark conversation as read
  async markConversationAsRead(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get last message
    const { data: lastMessage } = await messagingDb
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastMessage) return;

    // Mark all messages as read
    const { data: messages } = await messagingDb
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null);

    if (messages) {
      for (const msg of messages) {
        await this.markAsRead(msg.id);
      }
    }

    // Update conversation member
    await messagingDb.from("conversation_members").upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
        last_read_message_id: lastMessage.id,
        unread_count: 0,
      },
      { onConflict: "conversation_id,user_id" },
    );
  },
};

// ===== TYPING STATUS SERVICE =====

export const typingService = {
  // Set typing status
  async setTyping(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    await messagingDb.from("typing_status").upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
      },
      { onConflict: "conversation_id,user_id" },
    );
  },

  // Clear typing status
  async clearTyping(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    await messagingDb
      .from("typing_status")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  },

  // Get typing users
  async getTypingUsers(conversationId: string): Promise<string[]> {
    const { data, error } = await messagingDb
      .from("typing_status")
      .select("user_id")
      .eq("conversation_id", conversationId);

    if (error) throw error;
    return (data || []).map((t: { user_id: string }) => t.user_id);
  },
};

// ===== USER PRESENCE SERVICE =====

export const presenceService = {
  // Update presence
  async updatePresence(status: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    await messagingDb.from("user_presence").upsert(
      {
        user_id: user.id,
        status: status as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  },

  // Get user presence
  async getPresence(userId: string): Promise<UserPresence | null> {
    const { data } = await messagingDb
      .from("user_presence")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return data as UserPresence | null;
  },
};

// ===== BLOCKED USERS SERVICE =====

export const blockedUsersService = {
  // Block user
  async block(userId: string, reason?: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await messagingDb.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: userId,
      reason,
    });

    if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) throw error;
  },

  // Unblock user
  async unblock(userId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    await messagingDb
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId);
  },

  // Check if user is blocked
  async isBlocked(userId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data } = await messagingDb
      .from("blocked_users")
      .select("id")
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${user.id})`,
      )
      .limit(1)
      .maybeSingle();

    return !!data;
  },

  // Get blocked users
  async getBlockedUsers(): Promise<BlockedUser[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data } = await messagingDb.from("blocked_users").select("*").eq("blocker_id", user.id);

    return (data || []) as BlockedUser[];
  },
};
