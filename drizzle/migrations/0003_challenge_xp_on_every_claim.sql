CREATE OR REPLACE FUNCTION public.trg_award_challenge_complete_xp()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE reward int;
BEGIN
  IF NEW.completed = true AND (TG_OP = 'INSERT' OR NEW.completed_at IS DISTINCT FROM OLD.completed_at) THEN
    SELECT xp_reward INTO reward FROM public.challenges WHERE id = NEW.challenge_id;
    reward := COALESCE(reward, 0);
    IF public.award_xp_once(NEW.user_id, reward, 'challenge', NEW.challenge_id,
      'challenge:' || NEW.user_id || ':' || NEW.challenge_id || ':' || public.ascend_today()) THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.user_id, 'challenge_complete', 'Challenge complete', 'You earned +' || reward || ' XP. Keep stacking wins.', '/challenges');
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS challenge_complete_award_xp ON public.challenge_participants;
CREATE TRIGGER challenge_complete_award_xp AFTER INSERT OR UPDATE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_challenge_complete_xp();