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
  result jsonb := '[]'::jsonb;
  was_done boolean := false;
  found boolean := false;
  item jsonb;
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
      result := result || jsonb_build_array(item);
    ELSE
      result := result || jsonb_build_array(item);
    END IF;
  END LOOP;

  -- One-way tick: already claimed today -> no-op (no untick, no re-award)
  IF found AND was_done THEN
    RETURN;
  END IF;

  IF NOT found THEN
    result := result || jsonb_build_array(jsonb_build_object('id', _habit_id, 'done', true));
  ELSE
    -- found but not done: mark done
    result := (
      SELECT COALESCE(jsonb_agg(
        CASE WHEN (e->>'id') = _habit_id
             THEN jsonb_build_object('id', _habit_id, 'done', true)
             ELSE e END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(cur_items) e
    );
  END IF;

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

  -- Idempotent award: one XP grant per user/habit/day, enforced by award_key unique constraint
  PERFORM public.award_xp_once(
    auth.uid(), habit_xp, 'discipline_' || _habit_id, NULL,
    'daily:' || auth.uid()::text || ':' || _habit_id || ':' || today::text
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_discipline_habit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_discipline_habit(text) TO authenticated;