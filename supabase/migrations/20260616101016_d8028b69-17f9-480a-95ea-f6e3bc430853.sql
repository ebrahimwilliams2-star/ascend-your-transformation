
-- Journal system enhancements
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS energy_level integer CHECK (energy_level IS NULL OR (energy_level BETWEEN 1 AND 10)),
  ADD COLUMN IF NOT EXISTS discipline_score integer CHECK (discipline_score IS NULL OR (discipline_score BETWEEN 1 AND 10));

CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx
  ON public.journal_entries (user_id, created_at DESC);

-- Wire journal XP trigger (function already exists)
DROP TRIGGER IF EXISTS trg_journal_xp ON public.journal_entries;
CREATE TRIGGER trg_journal_xp
  AFTER INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_journal_xp();

-- Wire other XP triggers that were defined but never attached
DROP TRIGGER IF EXISTS trg_workout_xp ON public.workouts;
CREATE TRIGGER trg_workout_xp
  AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_workout_xp();

DROP TRIGGER IF EXISTS trg_measurement_xp ON public.measurements;
CREATE TRIGGER trg_measurement_xp
  AFTER INSERT ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_measurement_xp();

DROP TRIGGER IF EXISTS trg_photo_xp ON public.progress_photos;
CREATE TRIGGER trg_photo_xp
  AFTER INSERT ON public.progress_photos
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_photo_xp();

DROP TRIGGER IF EXISTS trg_food_xp ON public.food_logs;
CREATE TRIGGER trg_food_xp
  AFTER INSERT ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_food_xp();

DROP TRIGGER IF EXISTS trg_challenge_complete_xp ON public.challenge_participants;
CREATE TRIGGER trg_challenge_complete_xp
  AFTER UPDATE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_challenge_complete_xp();

-- Journal-specific helper: streak bonus on milestones + notification on first entry of day
CREATE OR REPLACE FUNCTION public.trg_journal_streak_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
  prior int;
  streak int;
  bonus int := 0;
  label text := '';
BEGIN
  SELECT count(*) INTO prior FROM public.journal_entries
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND created_at::date = today;
  IF prior > 0 THEN
    RETURN NEW; -- only count first journal of day
  END IF;

  SELECT current_streak INTO streak FROM public.profiles WHERE id = NEW.user_id;

  IF streak = 3 THEN bonus := 25; label := '3-day journal streak';
  ELSIF streak = 7 THEN bonus := 75; label := '7-day journal streak';
  ELSIF streak = 30 THEN bonus := 300; label := '30-day journal streak';
  ELSIF streak = 100 THEN bonus := 1000; label := '100-day journal streak';
  END IF;

  IF bonus > 0 THEN
    PERFORM public.award_xp(NEW.user_id, bonus, 'journal_streak_' || streak, NEW.id);
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.user_id, 'streak_milestone',
            label || ' unlocked',
            'You banked +' || bonus || ' XP for stacking ' || streak || ' days of reflection. Keep writing.',
            '/journal');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_streak_bonus ON public.journal_entries;
CREATE TRIGGER trg_journal_streak_bonus
  AFTER INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_journal_streak_bonus();

-- Journal stats RPC
CREATE OR REPLACE FUNCTION public.journal_stats(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  current_streak int := 0;
  longest_streak int := 0;
  cur int := 0;
  best int := 0;
  prev date;
  d date;
  most_mood text;
  avg_disc numeric;
  avg_energy numeric;
  weekly int;
  monthly int;
BEGIN
  IF _user_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT count(*) INTO total FROM public.journal_entries WHERE user_id = _user_id;

  FOR d IN
    SELECT DISTINCT created_at::date AS d
    FROM public.journal_entries
    WHERE user_id = _user_id
    ORDER BY d DESC
  LOOP
    IF prev IS NULL THEN
      cur := 1;
      IF d = CURRENT_DATE OR d = CURRENT_DATE - 1 THEN current_streak := 1; END IF;
    ELSIF prev - d = 1 THEN
      cur := cur + 1;
      IF current_streak = cur - 1 AND (prev = CURRENT_DATE OR prev = CURRENT_DATE - 1 OR current_streak > 0) THEN
        current_streak := cur;
      END IF;
    ELSE
      IF cur > best THEN best := cur; END IF;
      cur := 1;
    END IF;
    prev := d;
  END LOOP;
  IF cur > best THEN best := cur; END IF;
  longest_streak := best;

  SELECT mood INTO most_mood FROM public.journal_entries
    WHERE user_id = _user_id AND mood IS NOT NULL
    GROUP BY mood ORDER BY count(*) DESC LIMIT 1;

  SELECT avg(discipline_score), avg(energy_level)
    INTO avg_disc, avg_energy
    FROM public.journal_entries WHERE user_id = _user_id;

  SELECT count(*) INTO weekly FROM public.journal_entries
    WHERE user_id = _user_id AND created_at >= now() - interval '7 days';
  SELECT count(*) INTO monthly FROM public.journal_entries
    WHERE user_id = _user_id AND created_at >= now() - interval '30 days';

  RETURN jsonb_build_object(
    'total', total,
    'current_streak', current_streak,
    'longest_streak', longest_streak,
    'most_common_mood', most_mood,
    'avg_discipline', round(coalesce(avg_disc,0)::numeric, 1),
    'avg_energy', round(coalesce(avg_energy,0)::numeric, 1),
    'weekly_count', weekly,
    'monthly_count', monthly
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.journal_stats(uuid) TO authenticated;
