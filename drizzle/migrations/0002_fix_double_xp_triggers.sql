DROP TRIGGER IF EXISTS trg_workout_xp ON public.workouts;
DROP TRIGGER IF EXISTS trg_journal_xp ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_measurement_xp ON public.measurements;
DROP TRIGGER IF EXISTS trg_photo_xp ON public.progress_photos;
DROP TRIGGER IF EXISTS trg_food_xp ON public.food_logs;
DROP TRIGGER IF EXISTS trg_challenge_complete_xp ON public.challenge_participants;

CREATE OR REPLACE FUNCTION public.trg_award_challenge_complete_xp()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE reward int;
BEGIN
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM true) THEN
    SELECT xp_reward INTO reward FROM public.challenges WHERE id = NEW.challenge_id;
    reward := COALESCE(reward, 0);
    PERFORM public.award_xp_once(NEW.user_id, reward, 'challenge', NEW.challenge_id,
      'challenge:' || NEW.user_id || ':' || NEW.challenge_id || ':' || public.ascend_today());
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.user_id, 'challenge_complete', 'Challenge complete', 'You earned +' || reward || ' XP. Keep stacking wins.', '/challenges');
  END IF;
  RETURN NEW;
END; $function$;