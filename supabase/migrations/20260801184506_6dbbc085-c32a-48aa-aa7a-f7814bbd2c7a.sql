-- 1. Reusable XP reconciliation -------------------------------------------
-- Recomputes profiles.xp as the exact sum of public.xp_logs for a user
-- (or for every user when _user_id is null), then derives level and rank
-- from that authoritative total. Idempotent: rows that already match are
-- not written, so re-running is a no-op.
CREATE OR REPLACE FUNCTION public.reconcile_xp(_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fixed_count int;
BEGIN
  WITH totals AS (
    SELECT p.id,
           COALESCE((SELECT SUM(l.amount)::int FROM public.xp_logs l WHERE l.user_id = p.id), 0) AS calc_xp
    FROM public.profiles p
    WHERE _user_id IS NULL OR p.id = _user_id
  ), upd AS (
    UPDATE public.profiles p
    SET xp = t.calc_xp,
        level = GREATEST(1, (t.calc_xp / 500) + 1),
        rank = public.rank_for_level(GREATEST(1, (t.calc_xp / 500) + 1)),
        updated_at = now()
    FROM totals t
    WHERE p.id = t.id
      AND p.xp IS DISTINCT FROM t.calc_xp   -- leave already-correct rows untouched
    RETURNING 1
  )
  SELECT count(*)::int INTO fixed_count FROM upd;

  RETURN fixed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_xp(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_xp(uuid) TO service_role;

-- One-time reconciliation of legacy drift (transactional by default).
SELECT public.reconcile_xp();

-- 2. Username integrity -----------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_.]{3,20}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;