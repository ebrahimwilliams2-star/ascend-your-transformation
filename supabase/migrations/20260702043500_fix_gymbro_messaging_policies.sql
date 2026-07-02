DROP POLICY IF EXISTS "Users can create conversations with other users" ON conversations;

CREATE POLICY "Users can create conversations with other users"
  ON conversations FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
    AND user_id_1 <> user_id_2
  );

GRANT SELECT, INSERT, UPDATE ON conversation_members TO authenticated;

DROP POLICY IF EXISTS "Users can insert conversation members" ON conversation_members;

CREATE POLICY "Users can insert conversation members"
  ON conversation_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = conversation_members.conversation_id
        AND (c.user_id_1 = auth.uid() OR c.user_id_2 = auth.uid())
        AND (conversation_members.user_id = c.user_id_1 OR conversation_members.user_id = c.user_id_2)
    )
  );
