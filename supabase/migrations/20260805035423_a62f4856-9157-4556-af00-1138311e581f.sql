-- 1. Conversations: prevent participant hijacking on update
DROP POLICY IF EXISTS conv_update ON public.conversations;
CREATE POLICY conv_update ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE OR REPLACE FUNCTION public.lock_conversation_participants()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_id_1 IS DISTINCT FROM OLD.user_id_1
     OR NEW.user_id_2 IS DISTINCT FROM OLD.user_id_2 THEN
    RAISE EXCEPTION 'Conversation participants cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_conversation_participants ON public.conversations;
CREATE TRIGGER trg_lock_conversation_participants
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.lock_conversation_participants();

-- 2. Messages: prevent reassigning sender/conversation on update
DROP POLICY IF EXISTS msg_update_own ON public.messages;
CREATE POLICY msg_update_own ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user_id_1 OR auth.uid() = c.user_id_2)
    )
  );

CREATE OR REPLACE FUNCTION public.lock_message_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'Message sender and conversation cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_message_identity ON public.messages;
CREATE TRIGGER trg_lock_message_identity
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.lock_message_identity();

-- 3. Presence: scope reads to self, accepted GymBros, and chat partners
DROP POLICY IF EXISTS presence_select_all ON public.user_presence;
CREATE POLICY presence_select_related ON public.user_presence
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = user_presence.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = user_presence.user_id))
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (c.user_id_1 = auth.uid() AND c.user_id_2 = user_presence.user_id)
         OR (c.user_id_2 = auth.uid() AND c.user_id_1 = user_presence.user_id)
    )
  );

-- 4. Revoke anon EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.get_or_create_gymbro_conversation(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_gymbro_conversation(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.journal_stats(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.journal_stats(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.trg_journal_streak_bonus() FROM anon, PUBLIC;