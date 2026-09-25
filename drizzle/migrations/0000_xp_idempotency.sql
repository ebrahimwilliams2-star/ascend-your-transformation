ALTER TABLE public.xp_logs ADD COLUMN IF NOT EXISTS award_key text;
CREATE UNIQUE INDEX IF NOT EXISTS xp_logs_award_key_uidx ON public.xp_logs(award_key) WHERE award_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ascend_today() RETURNS date
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT (now() AT TIME ZONE 'Africa/Johannesburg')::date
$$;

CREATE OR REPLACE FUNCTION public.award_xp_once(_user_id uuid, _amount integer, _source text, _ref_id uuid, _key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inserted_id uuid;
  p record;
  new_xp int; new_level int; new_streak int;
  today date := public.ascend_today();
BEGIN
  INSERT INTO public.xp_logs(user_id, source, amount, ref_id, award_key)
  VALUES (_user_id, _source, _amount, _ref_id, _key)
  ON CONFLICT (award_key) WHERE award_key IS NOT NULL DO NOTHING
  RETURNING id INTO inserted_id;
  IF inserted_id IS NULL THEN RETURN false; END IF;

  SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN true; END IF;
  new_xp := COALESCE(p.xp,0) + _amount;
  new_level := GREATEST(1, (new_xp / 500) + 1);
  IF p.last_checkin_date IS NULL OR p.last_checkin_date < today - 1 THEN new_streak := 1;
  ELSIF p.last_checkin_date = today - 1 THEN new_streak := COALESCE(p.current_streak,0) + 1;
  ELSE new_streak := GREATEST(COALESCE(p.current_streak,0),1);
  END IF;
  UPDATE public.profiles SET xp = new_xp, level = new_level, rank = public.rank_for_level(new_level),
    current_streak = new_streak, longest_streak = GREATEST(COALESCE(longest_streak,0), new_streak),
    last_checkin_date = GREATEST(COALESCE(last_checkin_date, today), today), updated_at = now()
  WHERE id = _user_id;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.award_xp_once(uuid,integer,text,uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.toggle_discipline_habit(_habit_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  today date := public.ascend_today();
  habit_xp int;
  cur jsonb; result jsonb := '[]'::jsonb; found boolean := false; is_done boolean := false;
  el jsonb; earned int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  habit_xp := CASE _habit_id WHEN 'training' THEN 50 WHEN 'nutrition' THEN 30 WHEN 'water' THEN 20
    WHEN 'sleep' THEN 30 WHEN 'journal' THEN 20 ELSE NULL END;
  IF habit_xp IS NULL THEN RAISE EXCEPTION 'Unknown habit'; END IF;

  SELECT items INTO cur FROM public.discipline_checkins WHERE user_id = uid AND checkin_date = today FOR UPDATE;
  cur := COALESCE(cur, '[]'::jsonb);
  FOR el IN SELECT * FROM jsonb_array_elements(cur) LOOP
    IF el->>'id' = _habit_id THEN
      found := true; is_done := NOT COALESCE((el->>'done')::boolean, false);
      result := result || jsonb_build_array(jsonb_build_object('id', _habit_id, 'done', is_done));
    ELSE result := result || jsonb_build_array(el); END IF;
  END LOOP;
  IF NOT found THEN
    is_done := true;
    result := result || jsonb_build_array(jsonb_build_object('id', _habit_id, 'done', true));
  END IF;

  IF is_done THEN
    PERFORM public.award_xp_once(uid, habit_xp, 'discipline_' || _habit_id, NULL,
      'daily:' || uid || ':' || _habit_id || ':' || today);
  END IF;

  SELECT COALESCE(SUM(amount),0) INTO earned FROM public.xp_logs
  WHERE user_id = uid AND award_key LIKE 'daily:' || uid || ':%:' || today;

  INSERT INTO public.discipline_checkins(user_id, checkin_date, items, xp_earned)
  VALUES (uid, today, result, earned)
  ON CONFLICT (user_id, checkin_date) DO UPDATE SET items = EXCLUDED.items, xp_earned = EXCLUDED.xp_earned, updated_at = now();
END $$;
REVOKE EXECUTE ON FUNCTION public.toggle_discipline_habit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_discipline_habit(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_award_meal_completion_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp_once(NEW.user_id, 15, 'nutrition_meal', NEW.id,
    'meal:' || NEW.user_id || ':' || NEW.log_date || ':' || NEW.meal_index);
  RETURN NEW;
END $$;