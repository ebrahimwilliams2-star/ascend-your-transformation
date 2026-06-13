
-- =========================================================================
-- 1) ETHAN MEMORY + MESSAGES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ethan_memory_summaries (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '',
  key_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ethan_memory_summaries TO authenticated;
GRANT ALL ON public.ethan_memory_summaries TO service_role;

ALTER TABLE public.ethan_memory_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own ethan memory" ON public.ethan_memory_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ethan_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.ethan_messages TO authenticated;
GRANT ALL ON public.ethan_messages TO service_role;

ALTER TABLE public.ethan_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own ethan messages" ON public.ethan_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ethan_messages_user_created_idx
  ON public.ethan_messages(user_id, created_at DESC);

-- =========================================================================
-- 2) XP LOGS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.xp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  amount integer NOT NULL,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.xp_logs TO authenticated;
GRANT ALL ON public.xp_logs TO service_role;

ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own xp logs" ON public.xp_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS xp_logs_user_created_idx
  ON public.xp_logs(user_id, created_at DESC);

-- =========================================================================
-- 3) NOTIFICATIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

-- =========================================================================
-- 4) RANK + AWARD_XP HELPERS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.rank_for_level(_level int)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN _level <= 5  THEN 'Initiate'
    WHEN _level <= 10 THEN 'Warrior'
    WHEN _level <= 15 THEN 'Vanguard'
    WHEN _level <= 20 THEN 'Titan'
    WHEN _level <= 25 THEN 'Elite'
    ELSE 'Legend'
  END;
$$;

CREATE OR REPLACE FUNCTION public.award_xp(
  _user_id uuid,
  _amount int,
  _source text,
  _ref_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
  prev_date date;
  new_xp int;
  new_level int;
  new_streak int;
  cur_longest int;
BEGIN
  IF _amount IS NULL OR _amount = 0 OR _user_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.xp_logs(user_id, source, amount, ref_id)
  VALUES (_user_id, _source, _amount, _ref_id);

  SELECT last_checkin_date, xp + _amount, longest_streak
    INTO prev_date, new_xp, cur_longest
  FROM public.profiles WHERE id = _user_id FOR UPDATE;

  IF new_xp IS NULL THEN RETURN; END IF;

  new_level := GREATEST(1, (new_xp / 500) + 1);

  IF prev_date IS NULL OR prev_date < today - INTERVAL '1 day' THEN
    new_streak := 1;
  ELSIF prev_date = today - INTERVAL '1 day' THEN
    SELECT current_streak + 1 INTO new_streak FROM public.profiles WHERE id = _user_id;
  ELSE
    SELECT current_streak INTO new_streak FROM public.profiles WHERE id = _user_id;
  END IF;

  UPDATE public.profiles
  SET xp = new_xp,
      level = new_level,
      rank = public.rank_for_level(new_level),
      current_streak = new_streak,
      longest_streak = GREATEST(cur_longest, new_streak),
      last_checkin_date = today,
      updated_at = now()
  WHERE id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, int, text, uuid) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 5) AUTOMATIC XP TRIGGERS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_award_workout_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.award_xp(NEW.user_id, 50, 'workout', NEW.id); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.trg_award_journal_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.award_xp(NEW.user_id, 20, 'journal', NEW.id); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.trg_award_measurement_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.award_xp(NEW.user_id, 10, 'measurement', NEW.id); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.trg_award_photo_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.award_xp(NEW.user_id, 25, 'progress_photo', NEW.id); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.trg_award_food_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prior int;
BEGIN
  SELECT count(*) INTO prior FROM public.food_logs
   WHERE user_id = NEW.user_id AND log_date = NEW.log_date AND id <> NEW.id;
  IF prior = 0 THEN
    PERFORM public.award_xp(NEW.user_id, 30, 'nutrition_day', NEW.id);
  ELSE
    PERFORM public.award_xp(NEW.user_id, 2, 'food_log', NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_award_challenge_complete_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM true) THEN
    PERFORM public.award_xp(NEW.user_id, 100, 'challenge', NEW.challenge_id);
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.user_id, 'challenge_complete', 'Challenge complete', 'You earned +100 XP. Keep stacking wins.', '/challenges');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS workouts_award_xp ON public.workouts;
CREATE TRIGGER workouts_award_xp AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_workout_xp();

DROP TRIGGER IF EXISTS journal_award_xp ON public.journal_entries;
CREATE TRIGGER journal_award_xp AFTER INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_journal_xp();

DROP TRIGGER IF EXISTS measurements_award_xp ON public.measurements;
CREATE TRIGGER measurements_award_xp AFTER INSERT ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_measurement_xp();

DROP TRIGGER IF EXISTS photos_award_xp ON public.progress_photos;
CREATE TRIGGER photos_award_xp AFTER INSERT ON public.progress_photos
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_photo_xp();

DROP TRIGGER IF EXISTS food_logs_award_xp ON public.food_logs;
CREATE TRIGGER food_logs_award_xp AFTER INSERT ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_food_xp();

DROP TRIGGER IF EXISTS challenge_complete_award_xp ON public.challenge_participants;
CREATE TRIGGER challenge_complete_award_xp AFTER UPDATE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_challenge_complete_xp();

-- =========================================================================
-- 6) GYMBRO NUDGE RPC
-- =========================================================================
CREATE OR REPLACE FUNCTION public.send_nudge(_friend_id uuid, _message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_friend boolean;
  sender_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF auth.uid() = _friend_id THEN RAISE EXCEPTION 'Cannot nudge yourself'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id = _friend_id)
        OR (addressee_id = auth.uid() AND requester_id = _friend_id))
  ) INTO is_friend;
  IF NOT is_friend THEN RAISE EXCEPTION 'Not gym bros'; END IF;

  SELECT COALESCE(display_name, username, 'Your GymBro') INTO sender_name
  FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    _friend_id,
    'gymbro_nudge',
    sender_name || ' nudged you',
    COALESCE(NULLIF(trim(_message), ''), 'Get the session in. The next rep is the most important one.'),
    '/gymbros'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_nudge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_nudge(uuid, text) TO authenticated;
