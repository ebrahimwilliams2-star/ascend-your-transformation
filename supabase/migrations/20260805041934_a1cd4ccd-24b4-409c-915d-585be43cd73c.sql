CREATE TABLE public.blueprint_phases (
  key text PRIMARY KEY,
  name text NOT NULL,
  tier text NOT NULL,
  tagline text NOT NULL,
  focus text[] NOT NULL DEFAULT '{}',
  required_level integer NOT NULL DEFAULT 1,
  required_xp integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blueprint_phases TO authenticated;
GRANT SELECT ON public.blueprint_phases TO anon;
GRANT ALL ON public.blueprint_phases TO service_role;
ALTER TABLE public.blueprint_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blueprint_phases_read" ON public.blueprint_phases FOR SELECT USING (true);

CREATE TABLE public.blueprint_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_key text NOT NULL,
  workout_key text NOT NULL,
  workout_name text NOT NULL,
  exercise_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_volume numeric NOT NULL DEFAULT 0,
  duration_min integer,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blueprint_sessions_user_idx ON public.blueprint_sessions (user_id, completed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_sessions TO authenticated;
GRANT ALL ON public.blueprint_sessions TO service_role;
ALTER TABLE public.blueprint_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blueprint_sessions_own" ON public.blueprint_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.blueprint_phases (key, name, tier, tagline, focus, required_level, required_xp, sort_order) VALUES
('blueprint-1','Blueprint I','Beginner','Master the basics. Build consistency.', ARRAY['Learning technique','Consistency','Strength foundation'], 1, 0, 1),
('blueprint-2','Blueprint II','Intermediate','More volume. More intent.', ARRAY['Additional exercises','Supersets','Higher training volume'], 6, 2500, 2),
('blueprint-3','Blueprint III','Advanced','Advanced intensity. Earned strength.', ARRAY['Dropsets','Paused reps','Tempo work','Advanced split'], 12, 6000, 3);