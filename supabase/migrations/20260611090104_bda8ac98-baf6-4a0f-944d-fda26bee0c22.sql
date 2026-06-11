
-- Friendships
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own friendships" ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Send friend request" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Update own friendships" ON public.friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Delete own friendships" ON public.friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER friendships_touch_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Search profiles by username/display_name
CREATE OR REPLACE FUNCTION public.search_profiles(q text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  rank text,
  level int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.rank, p.level
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND (
      p.username ILIKE '%' || q || '%'
      OR p.display_name ILIKE '%' || q || '%'
    )
  ORDER BY p.level DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

-- Get accepted friends with stats
CREATE OR REPLACE FUNCTION public.get_gymbros()
RETURNS TABLE (
  friendship_id uuid,
  friend_id uuid,
  username text,
  display_name text,
  avatar_url text,
  rank text,
  level int,
  xp int,
  current_streak int,
  longest_streak int,
  status text,
  direction text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END,
    p.username,
    p.display_name,
    p.avatar_url,
    p.rank,
    p.level,
    p.xp,
    p.current_streak,
    p.longest_streak,
    f.status,
    CASE
      WHEN f.status = 'accepted' THEN 'friend'
      WHEN f.requester_id = auth.uid() THEN 'outgoing'
      ELSE 'incoming'
    END
  FROM public.friendships f
  JOIN public.profiles p
    ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    AND f.status IN ('pending','accepted')
  ORDER BY f.status DESC, p.level DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_gymbros() TO authenticated;
