// ===== GYMBRO MESSAGING TYPES =====

export type MessageType =
  | 'text'
  | 'emoji'
  | 'image'
  | 'workout_share'
  | 'achievement_share'
  | 'xp_milestone'
  | 'streak_milestone'
  | 'progress_photo'
  | 'reward_unlock'
  | 'badge_unlock'
  | 'challenge_invite'
  | 'quick_action'
  | 'system_notification';

export type PresenceStatus = 'online' | 'offline' | 'away' | 'working_out';

export type MessageStatus = 'sending' | 'delivered' | 'read';

// ===== CONVERSATIONS =====
export interface Conversation {
  id: string;
  user_id_1: string;
  user_id_2: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  archived_by_1: boolean;
  archived_by_2: boolean;
  blocked_by_1: boolean;
  blocked_by_2: boolean;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  unread_count: number;
  last_read_message_id: string | null;
  muted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithMember extends Conversation {
  other_user?: UserProfile;
  last_message?: Message;
  member?: ConversationMember;
  is_blocked?: boolean;
}

// ===== MESSAGES =====
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  metadata: Record<string, any>;
  image_url: string | null;
  image_storage_path: string | null;
  image_size_bytes: number | null;
  image_width: number | null;
  image_height: number | null;
  attachment_type: string | null;
  attachment_data: Record<string, any> | null;
  delivered_at: string | null;
  deleted_at: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageWithMetadata extends Message {
  sender?: UserProfile;
  reactions?: MessageReaction[];
  read_receipts?: MessageRead[];
  local_status?: MessageStatus;
}

// ===== MESSAGE REACTIONS =====
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  user_reacted: boolean;
  users: UserProfile[];
}

// ===== MESSAGE READS =====
export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

// ===== TYPING STATUS =====
export interface TypingStatus {
  id: string;
  conversation_id: string;
  user_id: string;
  created_at: string;
}

// ===== USER PRESENCE =====
export interface UserPresence {
  id: string;
  user_id: string;
  status: PresenceStatus;
  last_seen_at: string;
  updated_at: string;
}

// ===== BLOCKED USERS =====
export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
}

// ===== REPORTED MESSAGES =====
export interface ReportedMessage {
  id: string;
  message_id: string;
  reported_by: string;
  reason: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolved_at: string | null;
  created_at: string;
}

// ===== USER PROFILE (from existing schema) =====
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
  created_at: string;
}

// ===== QUICK ACTIONS =====
export type QuickActionType =
  | 'workout_today'
  | 'challenge_me'
  | 'respect'
  | 'need_accountability'
  | 'check_progress'
  | 'congratulations'
  | 'stay_consistent';

export interface QuickAction {
  type: QuickActionType;
  label: string;
  emoji: string;
  color: string;
}

// ===== PROGRESS SHARE =====
export type ProgressShareType =
  | 'workout_completed'
  | 'current_streak'
  | 'weekly_summary'
  | 'xp_gained'
  | 'weight_milestone'
  | 'bodyweight_update'
  | 'reward_unlocked'
  | 'blueprint_completed'
  | 'journal_achievement'
  | 'progress_photo';

export interface ProgressShare {
  type: ProgressShareType;
  title: string;
  value: string;
  icon: string;
  color: string;
  metadata: Record<string, any>;
}

// ===== OFFLINE MESSAGE QUEUE =====
export interface PendingMessage {
  id: string; // Local UUID
  conversation_id: string;
  content: string | null;
  message_type: MessageType;
  image_file?: File;
  attachment_data?: Record<string, any>;
  created_at: string;
  retry_count: number;
}

// ===== PAGINATION =====
export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// ===== NOTIFICATION TYPES =====
export type NotificationType =
  | 'new_message'
  | 'workout_invite'
  | 'challenge'
  | 'shared_achievement'
  | 'accountability_reminder'
  | 'respect_reaction';

export interface PushNotification {
  type: NotificationType;
  conversation_id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}
