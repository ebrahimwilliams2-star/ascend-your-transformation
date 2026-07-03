
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  archived_by_1 boolean NOT NULL DEFAULT false,
  archived_by_2 boolean NOT NULL DEFAULT false,
  blocked_by_1 boolean NOT NULL DEFAULT false,
  blocked_by_2 boolean NOT NULL DEFAULT false,
  CONSTRAINT conversations_user_order CHECK (user_id_1 < user_id_2),
  CONSTRAINT conversations_unique_pair UNIQUE (user_id_1, user_id_2)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_select" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  message_type text NOT NULL DEFAULT 'text',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  image_storage_path text,
  image_size_bytes bigint,
  image_width int,
  image_height int,
  attachment_type text,
  attachment_data jsonb,
  delivered_at timestamptz,
  deleted_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.messages (conversation_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND (auth.uid() = c.user_id_1 OR auth.uid() = c.user_id_2)));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
      AND (auth.uid() = c.user_id_1 OR auth.uid() = c.user_id_2)));
CREATE POLICY "msg_update_own" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unread_count int NOT NULL DEFAULT 0,
  last_read_message_id uuid,
  muted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_all_own" ON public.conversation_members FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mr_select" ON public.message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id AND (auth.uid() = c.user_id_1 OR auth.uid() = c.user_id_2)));
CREATE POLICY "mr_write_own" ON public.message_reactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reads TO authenticated;
GRANT ALL ON public.message_reads TO service_role;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mread_select" ON public.message_reads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id AND (auth.uid() = c.user_id_1 OR auth.uid() = c.user_id_2)));
CREATE POLICY "mread_write_own" ON public.message_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_status TO authenticated;
GRANT ALL ON public.typing_status TO service_role;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "typing_select" ON public.typing_status FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND (auth.uid() = c.user_id_1 OR auth.uid() = c.user_id_2)));
CREATE POLICY "typing_write_own" ON public.typing_status FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_select_all" ON public.user_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "presence_write_own" ON public.user_presence FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_select_involved" ON public.blocked_users FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());
CREATE POLICY "block_write_own" ON public.blocked_users FOR ALL TO authenticated
  USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

CREATE TABLE public.reported_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reported_messages TO authenticated;
GRANT ALL ON public.reported_messages TO service_role;
ALTER TABLE public.reported_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_select_own" ON public.reported_messages FOR SELECT TO authenticated
  USING (reported_by = auth.uid());
CREATE POLICY "report_insert_own" ON public.reported_messages FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_conversation_members_updated BEFORE UPDATE ON public.conversation_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_presence_updated BEFORE UPDATE ON public.user_presence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
