
ALTER FUNCTION public.rank_for_level(int) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.trg_award_workout_xp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_award_journal_xp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_award_measurement_xp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_award_photo_xp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_award_food_xp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_award_challenge_complete_xp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rank_for_level(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rank_for_level(int) TO authenticated;
