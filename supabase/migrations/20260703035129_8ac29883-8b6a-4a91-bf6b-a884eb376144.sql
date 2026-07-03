CREATE OR REPLACE FUNCTION public.get_or_create_gymbro_conversation(_friend_id uuid)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_a uuid;
  user_b uuid;
  conv public.conversations%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _friend_id IS NULL OR _friend_id = current_user_id THEN
    RAISE EXCEPTION 'Invalid GymBro';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = current_user_id AND f.addressee_id = _friend_id)
        OR (f.requester_id = _friend_id AND f.addressee_id = current_user_id)
      )
  ) THEN
    RAISE EXCEPTION 'Not GymBros';
  END IF;

  user_a := LEAST(current_user_id, _friend_id);
  user_b := GREATEST(current_user_id, _friend_id);

  INSERT INTO public.conversations (user_id_1, user_id_2)
  VALUES (user_a, user_b)
  ON CONFLICT (user_id_1, user_id_2) DO NOTHING
  RETURNING * INTO conv;

  IF conv.id IS NULL THEN
    SELECT * INTO conv
    FROM public.conversations
    WHERE user_id_1 = user_a AND user_id_2 = user_b;
  END IF;

  IF conv.id IS NULL THEN
    RAISE EXCEPTION 'Could not open conversation';
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (conv.id, current_user_id), (conv.id, _friend_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN conv;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_gymbro_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_gymbro_conversation(uuid) TO authenticated;

CREATE POLICY "Gymbros can view each other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = profiles.id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.id)
      )
  )
);