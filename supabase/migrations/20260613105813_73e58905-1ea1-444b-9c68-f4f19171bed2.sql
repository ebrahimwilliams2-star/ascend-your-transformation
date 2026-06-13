
-- 1) Friendships: only addressee can UPDATE (prevents requester self-accept escalation)
DROP POLICY IF EXISTS "Update own friendships" ON public.friendships;
CREATE POLICY "Addressee can update friendship"
  ON public.friendships
  FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- 2) Squads: move join_code to an owner-only table and gate joins via SECURITY DEFINER RPC
CREATE TABLE IF NOT EXISTS public.squad_join_codes (
  squad_id uuid PRIMARY KEY REFERENCES public.squads(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.squad_join_codes TO authenticated;
GRANT ALL ON public.squad_join_codes TO service_role;

ALTER TABLE public.squad_join_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view squad join code"
  ON public.squad_join_codes
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_id AND s.owner_id = auth.uid()));

-- Backfill from existing squads.join_code
INSERT INTO public.squad_join_codes (squad_id, code)
SELECT id, join_code FROM public.squads
WHERE join_code IS NOT NULL
ON CONFLICT (squad_id) DO NOTHING;

-- Drop join_code column from squads (no longer exposed to members)
ALTER TABLE public.squads DROP COLUMN IF EXISTS join_code;

-- RPC: create a squad with a generated join code (returns squad + code to owner only)
CREATE OR REPLACE FUNCTION public.create_squad(_name text, _description text)
RETURNS TABLE(id uuid, name text, description text, join_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  new_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  INSERT INTO public.squads (name, description, owner_id)
    VALUES (_name, _description, auth.uid())
    RETURNING squads.id INTO new_id;
  INSERT INTO public.squad_join_codes (squad_id, code) VALUES (new_id, new_code);
  INSERT INTO public.squad_members (squad_id, user_id, role) VALUES (new_id, auth.uid(), 'owner');
  RETURN QUERY SELECT new_id, _name, _description, new_code;
END;
$$;

-- RPC: join a squad by code without exposing join_code via SELECT
CREATE OR REPLACE FUNCTION public.join_squad_by_code(_code text)
RETURNS TABLE(squad_id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_squad_id uuid;
  target_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT j.squad_id, s.name INTO target_squad_id, target_name
  FROM public.squad_join_codes j
  JOIN public.squads s ON s.id = j.squad_id
  WHERE j.code = upper(trim(_code));
  IF target_squad_id IS NULL THEN
    RAISE EXCEPTION 'No squad found with that code';
  END IF;
  INSERT INTO public.squad_members (squad_id, user_id, role)
  VALUES (target_squad_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT target_squad_id, target_name;
END;
$$;

-- RPC: owner-only fetch of the join code (for display/copy)
CREATE OR REPLACE FUNCTION public.get_squad_join_code(_squad_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  result text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.squads WHERE id = _squad_id AND owner_id = auth.uid()) INTO is_owner;
  IF NOT is_owner THEN
    RETURN NULL;
  END IF;
  SELECT code INTO result FROM public.squad_join_codes WHERE squad_id = _squad_id;
  RETURN result;
END;
$$;
