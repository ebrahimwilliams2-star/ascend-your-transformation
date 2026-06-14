
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'ZA',
  ADD COLUMN IF NOT EXISTS location_visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS fitness_goals text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS experience_level text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_location_visibility_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_location_visibility_chk
      CHECK (location_visibility IN ('private','area','public'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_experience_level_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_experience_level_chk
      CHECK (experience_level IS NULL OR experience_level IN ('beginner','intermediate','advanced'));
  END IF;
END $$;

GRANT UPDATE (city, province, country, location_visibility, fitness_goals, experience_level)
  ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  serving_size text NOT NULL DEFAULT '100 g',
  calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  cuisine text NOT NULL DEFAULT 'general',
  country text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.foods TO authenticated;
GRANT SELECT ON public.foods TO anon;
GRANT ALL ON public.foods TO service_role;

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='foods' AND policyname='Anyone can read public foods') THEN
    CREATE POLICY "Anyone can read public foods" ON public.foods
      FOR SELECT TO anon, authenticated
      USING (is_public = true OR created_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='foods' AND policyname='Users can add their own foods') THEN
    CREATE POLICY "Users can add their own foods" ON public.foods
      FOR INSERT TO authenticated
      WITH CHECK (created_by = auth.uid() AND is_public = false);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS foods_name_trgm_idx ON public.foods USING gin (lower(name) gin_trgm_ops);

INSERT INTO public.foods (name, serving_size, calories, protein_g, carbs_g, fat_g, cuisine, country, is_public) VALUES
  ('Pap (cooked maize meal)', '1 cup (250g)', 290, 7,  64, 1,  'south_african', 'ZA', true),
  ('Boerewors (grilled)',     '100 g',         330, 18, 1,  28, 'south_african', 'ZA', true),
  ('Biltong (lean beef)',     '50 g',          125, 25, 1,  3,  'south_african', 'ZA', true),
  ('Droëwors',                '50 g',          250, 22, 1,  18, 'south_african', 'ZA', true),
  ('Vetkoek (plain)',         '1 piece (90g)', 280, 6,  35, 13, 'south_african', 'ZA', true),
  ('Bunny Chow (quarter, mutton)', '1 serving (450g)', 720, 28, 78, 32, 'south_african', 'ZA', true),
  ('Chakalaka',               '1 cup (240g)',  120, 4,  15, 5,  'south_african', 'ZA', true),
  ('Bobotie',                 '1 cup (240g)',  395, 22, 22, 25, 'south_african', 'ZA', true),
  ('Braai lamb chop (grilled)','100 g',         295, 25, 0,  21, 'south_african', 'ZA', true),
  ('Braai chicken thigh (skin on)','100 g',     230, 22, 0,  15, 'south_african', 'ZA', true),
  ('Sosaties (lamb skewer)',  '1 skewer (120g)', 240, 22, 8,  13, 'south_african', 'ZA', true),
  ('Pap & wors (combo)',      '1 plate (400g)',650, 30, 60, 32, 'south_african', 'ZA', true),
  ('Samp & beans',            '1 cup (250g)',  255, 11, 47, 2,  'south_african', 'ZA', true),
  ('Morogo (cooked)',         '1 cup (180g)',   60, 5,  9,  1,  'south_african', 'ZA', true),
  ('Mageu',                   '500 ml',        280, 4,  62, 1,  'south_african', 'ZA', true),
  ('Rooibos tea (unsweetened)','250 ml',          2, 0,  0,  0,  'south_african', 'ZA', true),
  ('Koeksister',              '1 piece (60g)', 230, 2,  37, 9,  'south_african', 'ZA', true),
  ('Melktert',                '1 slice (120g)',310, 6,  37, 14, 'south_african', 'ZA', true),
  ('Rusks (buttermilk)',      '1 rusk (45g)',  195, 3,  29, 7,  'south_african', 'ZA', true),
  ('Ouma rusks (buttermilk)', '1 rusk (38g)',  165, 3,  25, 6,  'south_african', 'ZA', true),
  ('Nik Naks',                '1 pack (55g)',  290, 3,  35, 16, 'south_african', 'ZA', true),
  ('Simba chips (salt & vinegar)', '1 pack (36g)', 185, 2, 21, 10, 'south_african', 'ZA', true),
  ('Castle Lager beer',       '340 ml can',    135, 1,  10, 0,  'south_african', 'ZA', true),
  ('Amasi (maas)',            '250 ml',        135, 10, 12, 5,  'south_african', 'ZA', true),
  ('Snoek (grilled)',         '100 g',         145, 24, 0,  5,  'south_african', 'ZA', true),
  ('Hake fillet (grilled)',   '100 g',         110, 23, 0,  2,  'south_african', 'ZA', true),
  ('Peri-peri chicken breast','100 g',         170, 30, 1,  5,  'south_african', 'ZA', true),
  ('Cape Malay curry (chicken)','1 cup (300g)',360, 27, 24, 16, 'south_african', 'ZA', true),
  ('Roosterkoek',             '1 piece (80g)', 215, 6,  37, 4,  'south_african', 'ZA', true),
  ('Chicken breast (grilled)','100 g',         165, 31, 0,  4,  'general', NULL, true),
  ('White rice (cooked)',     '1 cup (158g)',  205, 4,  45, 0,  'general', NULL, true),
  ('Brown rice (cooked)',     '1 cup (195g)',  215, 5,  45, 2,  'general', NULL, true),
  ('Sweet potato (baked)',    '1 medium (130g)',115, 2, 27, 0,  'general', NULL, true),
  ('Egg (whole, large)',      '1 egg (50g)',    72,  6, 0,  5,  'general', NULL, true),
  ('Oats (rolled, dry)',      '50 g',          190, 7,  32, 4,  'general', NULL, true),
  ('Banana',                  '1 medium (118g)',105, 1, 27, 0,  'general', NULL, true),
  ('Greek yoghurt (full fat)','170 g',         150, 15, 8,  6,  'general', NULL, true),
  ('Peanut butter',           '2 tbsp (32g)',  188, 8,  6,  16, 'general', NULL, true),
  ('Avocado',                 '1/2 fruit (100g)',160, 2, 9, 15, 'general', NULL, true)
ON CONFLICT DO NOTHING;
