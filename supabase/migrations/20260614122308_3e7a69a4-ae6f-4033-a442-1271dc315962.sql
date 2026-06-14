
-- 1. Restrict profiles UPDATE to safe columns via column-level grants
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;

CREATE POLICY "Users select own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, display_name, avatar_url) ON public.profiles TO authenticated;

-- 2. Remove direct INSERT on squad_members (RPC-only path)
DROP POLICY IF EXISTS "Users add themselves to squads" ON public.squad_members;

-- 3. Remove direct INSERT on user_badges (trigger/RPC-only path)
DROP POLICY IF EXISTS "Users earn their own badges" ON public.user_badges;

-- 4. SECURITY DEFINER RPC: claim challenge XP after server-side progress check
CREATE OR REPLACE FUNCTION public.claim_challenge_xp(_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_target int;
  c_xp int;
  c_badge text;
  cur_progress int;
  already_done boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT target_value, xp_reward, badge_id INTO c_target, c_xp, c_badge
  FROM public.challenges WHERE id = _challenge_id AND is_active = true;
  IF c_target IS NULL THEN RAISE EXCEPTION 'Challenge not found'; END IF;

  SELECT progress, completed INTO cur_progress, already_done
  FROM public.challenge_participants
  WHERE user_id = auth.uid() AND challenge_id = _challenge_id;

  IF already_done THEN RAISE EXCEPTION 'Already claimed'; END IF;
  IF COALESCE(cur_progress, 0) < c_target THEN RAISE EXCEPTION 'Not complete yet'; END IF;

  INSERT INTO public.challenge_participants(user_id, challenge_id, progress, completed, completed_at)
  VALUES (auth.uid(), _challenge_id, cur_progress, true, now())
  ON CONFLICT (user_id, challenge_id)
  DO UPDATE SET completed = true, completed_at = now(), progress = EXCLUDED.progress;

  -- Trigger trg_award_challenge_complete_xp on challenge_participants awards XP automatically.
  -- But if the row already existed and trigger only fires on transition, ensure it fired.
  -- Fall back: award_xp idempotency is not guaranteed, so rely on the trigger only.

  IF c_badge IS NOT NULL THEN
    INSERT INTO public.user_badges(user_id, badge_id)
    VALUES (auth.uid(), c_badge)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_challenge_xp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_challenge_xp(uuid) TO authenticated;

-- 5. SECURITY DEFINER RPC: toggle a discipline habit with server-controlled XP
CREATE OR REPLACE FUNCTION public.toggle_discipline_habit(_habit_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
  habit_xp int;
  cur_items jsonb;
  new_items jsonb;
  was_done boolean := false;
  is_done boolean;
  delta int := 0;
  found boolean := false;
  item jsonb;
  result jsonb := '[]'::jsonb;
  total_xp int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  habit_xp := CASE _habit_id
    WHEN 'training'  THEN 50
    WHEN 'nutrition' THEN 30
    WHEN 'water'     THEN 20
    WHEN 'sleep'     THEN 30
    WHEN 'journal'   THEN 20
    ELSE NULL END;
  IF habit_xp IS NULL THEN RAISE EXCEPTION 'Unknown habit'; END IF;

  SELECT items INTO cur_items FROM public.discipline_checkins
  WHERE user_id = auth.uid() AND checkin_date = today;
  cur_items := COALESCE(cur_items, '[]'::jsonb);

  FOR item IN SELECT * FROM jsonb_array_elements(cur_items) LOOP
    IF (item->>'id') = _habit_id THEN
      found := true;
      was_done := COALESCE((item->>'done')::boolean, false);
      is_done := NOT was_done;
      result := result || jsonb_build_array(jsonb_build_object('id', _habit_id, 'done', is_done));
    ELSE
      result := result || jsonb_build_array(item);
    END IF;
  END LOOP;
  IF NOT found THEN
    is_done := true;
    result := result || jsonb_build_array(jsonb_build_object('id', _habit_id, 'done', true));
  END IF;

  -- recompute total xp from result against server map
  SELECT COALESCE(SUM(CASE
    WHEN (e->>'done')::boolean THEN
      CASE e->>'id'
        WHEN 'training' THEN 50 WHEN 'nutrition' THEN 30 WHEN 'water' THEN 20
        WHEN 'sleep' THEN 30 WHEN 'journal' THEN 20 ELSE 0 END
    ELSE 0 END), 0)::int
  INTO total_xp
  FROM jsonb_array_elements(result) e;

  INSERT INTO public.discipline_checkins(user_id, checkin_date, items, xp_earned)
  VALUES (auth.uid(), today, result, total_xp)
  ON CONFLICT (user_id, checkin_date) DO UPDATE
    SET items = EXCLUDED.items, xp_earned = EXCLUDED.xp_earned, updated_at = now();

  IF is_done AND NOT was_done THEN
    PERFORM public.award_xp(auth.uid(), habit_xp, 'discipline_' || _habit_id, NULL);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_discipline_habit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_discipline_habit(text) TO authenticated;
