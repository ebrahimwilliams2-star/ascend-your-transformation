CREATE OR REPLACE FUNCTION public.claim_challenge_xp(_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c_target int;
  c_xp int;
  c_badge text;
  c_metric text;
  c_cadence text;
  cur_progress int := 0;
  already_done boolean := false;
  window_start timestamptz;
  window_start_date date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT target_value, xp_reward, badge_id, metric, cadence
    INTO c_target, c_xp, c_badge, c_metric, c_cadence
  FROM public.challenges
  WHERE id = _challenge_id
    AND is_active = true;

  IF c_target IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  SELECT COALESCE(completed, false)
    INTO already_done
  FROM public.challenge_participants
  WHERE user_id = auth.uid()
    AND challenge_id = _challenge_id;

  IF COALESCE(already_done, false) THEN
    RAISE EXCEPTION 'Already claimed';
  END IF;

  IF c_cadence = 'daily' THEN
    window_start := date_trunc('day', now());
  ELSIF c_cadence = 'weekly' THEN
    window_start := date_trunc('week', now());
  ELSE
    window_start := date_trunc('month', now());
  END IF;
  window_start_date := window_start::date;

  IF c_metric = 'workouts' THEN
    SELECT count(*)::int INTO cur_progress
    FROM public.workouts
    WHERE user_id = auth.uid()
      AND performed_at >= window_start;
  ELSIF c_metric = 'checkins' THEN
    SELECT count(*)::int INTO cur_progress
    FROM public.discipline_checkins
    WHERE user_id = auth.uid()
      AND checkin_date >= window_start_date;
  ELSIF c_metric = 'journals' THEN
    SELECT count(*)::int INTO cur_progress
    FROM public.journal_entries
    WHERE user_id = auth.uid()
      AND created_at >= window_start;
  ELSIF c_metric = 'photos' THEN
    SELECT count(*)::int INTO cur_progress
    FROM public.progress_photos
    WHERE user_id = auth.uid()
      AND taken_at >= window_start;
  ELSIF c_metric = 'weights' THEN
    SELECT count(*)::int INTO cur_progress
    FROM public.measurements
    WHERE user_id = auth.uid()
      AND recorded_at >= window_start;
  ELSIF c_metric = 'nutrition_days' THEN
    SELECT count(DISTINCT log_date)::int INTO cur_progress
    FROM public.food_logs
    WHERE user_id = auth.uid()
      AND log_date >= window_start_date;
  ELSE
    RAISE EXCEPTION 'Unsupported challenge metric';
  END IF;

  IF COALESCE(cur_progress, 0) < c_target THEN
    RAISE EXCEPTION 'Not complete yet';
  END IF;

  INSERT INTO public.challenge_participants(user_id, challenge_id, progress, completed, completed_at)
  VALUES (auth.uid(), _challenge_id, cur_progress, true, now())
  ON CONFLICT (user_id, challenge_id)
  DO UPDATE SET
    completed = true,
    completed_at = now(),
    progress = GREATEST(public.challenge_participants.progress, EXCLUDED.progress);

  IF c_badge IS NOT NULL THEN
    INSERT INTO public.user_badges(user_id, badge_id)
    VALUES (auth.uid(), c_badge)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_challenge_xp(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_challenge_xp(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_challenge_xp(uuid) TO authenticated;