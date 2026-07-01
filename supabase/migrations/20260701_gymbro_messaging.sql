-- ===== GYMBRO MESSAGING SYSTEM DATABASE SCHEMA =====

-- ===== CONVERSATIONS TABLE =====
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  archived_by_1 BOOLEAN DEFAULT FALSE,
  archived_by_2 BOOLEAN DEFAULT FALSE,
  blocked_by_1 BOOLEAN DEFAULT FALSE,
  blocked_by_2 BOOLEAN DEFAULT FALSE,
  
  -- Ensure unique conversation per pair
  UNIQUE(LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2)),
  -- Prevent self-conversations
  CHECK(user_id_1 <> user_id_2)
);

CREATE INDEX idx_conversations_user_1 ON conversations(user_id_1);
CREATE INDEX idx_conversations_user_2 ON conversations(user_id_2);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- ===== MESSAGES TABLE =====
CREATE TYPE message_type AS ENUM (
  'text',
  'emoji',
  'image',
  'workout_share',
  'achievement_share',
  'xp_milestone',
  'streak_milestone',
  'progress_photo',
  'reward_unlock',
  'badge_unlock',
  'challenge_invite',
  'quick_action',
  'system_notification'
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  message_type message_type DEFAULT 'text',
  
  -- JSON metadata for rich content
  metadata JSONB DEFAULT '{}',
  
  -- Image storage
  image_url TEXT,
  image_storage_path TEXT,
  image_size_bytes INT,
  image_width INT,
  image_height INT,
  
  -- Attachments (workout data, achievement data, etc.)
  attachment_type TEXT,
  attachment_data JSONB,
  
  -- Message status
  delivered_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  edited_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT message_content_required CHECK (
    content IS NOT NULL OR image_url IS NOT NULL OR attachment_data IS NOT NULL
  )
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_created_at_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- ===== MESSAGE REACTIONS TABLE =====
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- ===== MESSAGE READ RECEIPTS TABLE =====
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX idx_message_reads_user_id ON message_reads(user_id);

-- ===== TYPING STATUS TABLE =====
CREATE TABLE IF NOT EXISTS typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_typing_status_conversation_id ON typing_status(conversation_id);
CREATE INDEX idx_typing_status_user_id ON typing_status(user_id);

-- ===== USER PRESENCE TABLE =====
CREATE TYPE presence_status AS ENUM ('online', 'offline', 'away', 'working_out');

CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status presence_status DEFAULT 'offline',
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX idx_user_presence_status ON user_presence(status);

-- ===== CONVERSATION MEMBERS TABLE =====
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unread_count INT DEFAULT 0,
  last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  muted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX idx_conversation_members_unread ON conversation_members(user_id, unread_count) WHERE unread_count > 0;

-- ===== BLOCKED USERS TABLE =====
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(blocker_id, blocked_id),
  CHECK(blocker_id <> blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ===== REPORTED MESSAGES TABLE =====
CREATE TABLE IF NOT EXISTS reported_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reported_messages_message_id ON reported_messages(message_id);
CREATE INDEX idx_reported_messages_status ON reported_messages(status);

-- ===== ROW LEVEL SECURITY POLICIES =====

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_messages ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS POLICIES
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    auth.uid() = user_id_1 OR auth.uid() = user_id_2
  );

CREATE POLICY "Users can create conversations with other users"
  ON conversations FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id_1 OR auth.uid() = user_id_2) AND
    auth.uid() <> user_id_1 AND auth.uid() <> user_id_2 OR
    (auth.uid() = user_id_1 AND auth.uid() <> user_id_2) OR
    (auth.uid() = user_id_2 AND auth.uid() <> user_id_1)
  );

CREATE POLICY "Users can update their conversation settings"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- MESSAGES POLICIES
CREATE POLICY "Users can view messages from their conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
      AND NOT (
        (blocked_by_1 AND auth.uid() = user_id_2) OR
        (blocked_by_2 AND auth.uid() = user_id_1)
      )
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
      AND NOT (
        (blocked_by_1 AND auth.uid() = user_id_2) OR
        (blocked_by_2 AND auth.uid() = user_id_1)
      )
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- MESSAGE REACTIONS POLICIES
CREATE POLICY "Users can view reactions on conversation messages"
  ON message_reactions FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM messages
      WHERE conversation_id IN (
        SELECT id FROM conversations
        WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add reactions to messages"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT id FROM messages
      WHERE conversation_id IN (
        SELECT id FROM conversations
        WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
      )
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- MESSAGE READS POLICIES
CREATE POLICY "Users can view read receipts"
  ON message_reads FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM messages
      WHERE conversation_id IN (
        SELECT id FROM conversations
        WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
      )
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT id FROM messages
      WHERE conversation_id IN (
        SELECT id FROM conversations
        WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
      )
    )
  );

-- TYPING STATUS POLICIES
CREATE POLICY "Users can view typing status in their conversations"
  ON typing_status FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
    )
  );

CREATE POLICY "Users can update their typing status"
  ON typing_status FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
    )
  );

CREATE POLICY "Users can delete their typing status"
  ON typing_status FOR DELETE
  USING (
    user_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
    )
  );

-- USER PRESENCE POLICIES
CREATE POLICY "Users can view presence"
  ON user_presence FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update their presence"
  ON user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their presence status"
  ON user_presence FOR UPDATE
  USING (user_id = auth.uid());

-- CONVERSATION MEMBERS POLICIES
CREATE POLICY "Users can view conversation members"
  ON conversation_members FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
    )
  );

CREATE POLICY "Users can update their member status"
  ON conversation_members FOR UPDATE
  USING (user_id = auth.uid());

-- BLOCKED USERS POLICIES
CREATE POLICY "Users can view their blocked users"
  ON blocked_users FOR SELECT
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "Users can block other users"
  ON blocked_users FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock users"
  ON blocked_users FOR DELETE
  USING (blocker_id = auth.uid());

-- REPORTED MESSAGES POLICIES
CREATE POLICY "Users can report messages"
  ON reported_messages FOR INSERT
  WITH CHECK (reported_by = auth.uid());

-- GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON message_reactions TO authenticated;
GRANT SELECT, INSERT ON message_reads TO authenticated;
GRANT SELECT, INSERT, DELETE ON typing_status TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_presence TO authenticated;
GRANT SELECT, UPDATE ON conversation_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;
GRANT INSERT ON reported_messages TO authenticated;

-- Create storage bucket for message images
INSERT INTO storage.buckets (id, name, public) VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload message images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view message images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-images');

CREATE POLICY "Users can delete their message images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
