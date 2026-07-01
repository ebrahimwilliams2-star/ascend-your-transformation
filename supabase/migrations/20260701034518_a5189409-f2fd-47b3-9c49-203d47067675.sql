CREATE OR REPLACE FUNCTION public.claim_reward_meal(_reward_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.reward_meals
  SET claimed_at = now()
  WHERE id = _reward_id
    AND user_id = auth.uid()
    AND claimed_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count = 0 THEN
    IF EXISTS (
      SELECT 1
      FROM public.reward_meals
      WHERE id = _reward_id
        AND user_id = auth.uid()
        AND claimed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Reward already claimed';
    END IF;

    RAISE EXCEPTION 'Reward not found';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_reward_meal(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_reward_meal(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_reward_meal(uuid) TO authenticated;