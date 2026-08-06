
CREATE TABLE public.nutrition_blueprint_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  age integer NOT NULL,
  sex text NOT NULL,
  height_cm numeric NOT NULL,
  weight_kg numeric NOT NULL,
  goal_weight_kg numeric,
  goal_type text NOT NULL,
  training_days integer NOT NULL DEFAULT 3,
  intensity text NOT NULL DEFAULT 'moderate',
  cardio_frequency text NOT NULL DEFAULT 'some',
  lifestyle text NOT NULL DEFAULT 'moderate',
  diet_preference text NOT NULL DEFAULT 'standard',
  allergies text[] NOT NULL DEFAULT '{}',
  budget text NOT NULL DEFAULT 'standard',
  meals_per_day integer NOT NULL DEFAULT 4,
  country text NOT NULL DEFAULT 'South Africa',
  calorie_target integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  fibre_g integer,
  water_ml integer,
  weekly_change_kg numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_blueprint_profiles TO authenticated;
GRANT ALL ON public.nutrition_blueprint_profiles TO service_role;
ALTER TABLE public.nutrition_blueprint_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition blueprint profile" ON public.nutrition_blueprint_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nbp_updated BEFORE UPDATE ON public.nutrition_blueprint_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.nutrition_blueprint_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  targets jsonb NOT NULL DEFAULT '{}'::jsonb,
  meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  grocery_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  meal_prep jsonb NOT NULL DEFAULT '{}'::jsonb,
  coaching jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_blueprint_plans TO authenticated;
GRANT ALL ON public.nutrition_blueprint_plans TO service_role;
ALTER TABLE public.nutrition_blueprint_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition blueprint plans" ON public.nutrition_blueprint_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_nbplans_user_active ON public.nutrition_blueprint_plans (user_id, is_active, generated_at DESC);
CREATE TRIGGER trg_nbplans_updated BEFORE UPDATE ON public.nutrition_blueprint_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.nutrition_meal_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.nutrition_blueprint_plans(id) ON DELETE SET NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_index integer NOT NULL,
  meal_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date, meal_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_meal_completions TO authenticated;
GRANT ALL ON public.nutrition_meal_completions TO service_role;
ALTER TABLE public.nutrition_meal_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal completions" ON public.nutrition_meal_completions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.trg_award_meal_completion_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 15, 'nutrition_meal', NEW.id);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.trg_award_meal_completion_xp() FROM PUBLIC, anon;

CREATE TRIGGER meal_completion_award_xp AFTER INSERT ON public.nutrition_meal_completions
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_meal_completion_xp();

CREATE TABLE public.nutrition_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verdict text NOT NULL,
  message text NOT NULL,
  calorie_delta integer NOT NULL DEFAULT 0,
  weight_change_kg numeric,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_reviews TO authenticated;
GRANT ALL ON public.nutrition_reviews TO service_role;
ALTER TABLE public.nutrition_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition reviews" ON public.nutrition_reviews
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_nreviews_user ON public.nutrition_reviews (user_id, reviewed_at DESC);
