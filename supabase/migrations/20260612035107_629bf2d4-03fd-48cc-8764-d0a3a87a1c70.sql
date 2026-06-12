
-- =========================================
-- BADGES
-- =========================================
CREATE TABLE public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','legend')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges visible to all signed-in" ON public.badges FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own badges" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users earn their own badges" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================
-- CHALLENGES
-- =========================================
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily','weekly','monthly')),
  metric TEXT NOT NULL CHECK (metric IN ('workouts','checkins','journals','photos','weights','nutrition_days')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  xp_reward INTEGER NOT NULL DEFAULT 100,
  badge_id TEXT REFERENCES public.badges(id) ON DELETE SET NULL,
  icon TEXT NOT NULL DEFAULT 'flame',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges visible to signed-in" ON public.challenges FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own challenge progress" ON public.challenge_participants
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- COMMUNITY POSTS
-- =========================================
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 1000),
  photo_url TEXT,
  post_type TEXT NOT NULL DEFAULT 'update' CHECK (post_type IN ('update','milestone','transformation','challenge','reward')),
  milestone_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts visible to signed-in" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create their own posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit their own posts" ON public.community_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own posts" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('respect','salute','strong_work','legend')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, reaction)
);
GRANT SELECT, INSERT, DELETE ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions visible to signed-in" ON public.post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users add their own reactions" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove their own reactions" ON public.post_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_community_posts_created ON public.community_posts (created_at DESC);
CREATE INDEX idx_post_reactions_post ON public.post_reactions (post_id);

-- =========================================
-- SQUADS
-- =========================================
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 60),
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squads TO authenticated;
GRANT ALL ON public.squads TO service_role;

CREATE TABLE public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (squad_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.squad_members TO authenticated;
GRANT ALL ON public.squad_members TO service_role;

-- Helper function avoids RLS recursion between squads/squad_members
CREATE OR REPLACE FUNCTION public.is_squad_member(_squad_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = _squad_id AND user_id = _user_id
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_squad_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_squad_member(UUID, UUID) TO authenticated;

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their squads" ON public.squads FOR SELECT TO authenticated
  USING (public.is_squad_member(id, auth.uid()));
CREATE POLICY "Authenticated can create squads" ON public.squads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update squad" ON public.squads FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete squad" ON public.squads FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members visible to squad members" ON public.squad_members FOR SELECT TO authenticated
  USING (public.is_squad_member(squad_id, auth.uid()));
CREATE POLICY "Users add themselves to squads" ON public.squad_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave squads themselves" ON public.squad_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.squad_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.squad_posts TO authenticated;
GRANT ALL ON public.squad_posts TO service_role;
ALTER TABLE public.squad_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Squad posts visible to members" ON public.squad_posts FOR SELECT TO authenticated
  USING (public.is_squad_member(squad_id, auth.uid()));
CREATE POLICY "Members post in their squads" ON public.squad_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_squad_member(squad_id, auth.uid()));
CREATE POLICY "Authors delete own squad posts" ON public.squad_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- REWARD MEALS
-- =========================================
CREATE TABLE public.reward_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  milestone TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  photo_url TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_meals TO authenticated;
GRANT ALL ON public.reward_meals TO service_role;
ALTER TABLE public.reward_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own reward meals" ON public.reward_meals
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- SEED BADGES + CHALLENGES
-- =========================================
INSERT INTO public.badges (id, name, description, icon, tier) VALUES
  ('first_blood',     'First Blood',     'Logged your very first workout.',          'dumbbell', 'bronze'),
  ('week_warrior',    'Week Warrior',    'Completed a 7-day streak.',                'flame',    'silver'),
  ('iron_discipline', 'Iron Discipline', 'Completed a 30-day streak.',               'shield',   'gold'),
  ('ascendant_seal',  'Ascendant Seal',  'Reached the Ascendant rank.',              'sparkles', 'gold'),
  ('legend_mark',     'Legend Mark',     'Reached the Legend rank.',                 'crown',    'legend'),
  ('photo_chronicle', 'Chronicler',      'Logged 10 progress photos.',               'camera',   'silver'),
  ('nutrition_pro',   'Nutrition Pro',   'Hit calorie target 14 days in a 30-day window.', 'apple', 'gold'),
  ('challenger',      'Challenger',      'Completed your first Ascend challenge.',   'trophy',   'bronze');

INSERT INTO public.challenges (title, description, cadence, metric, target_value, xp_reward, badge_id, icon) VALUES
  ('Daily Forge',         'Log 1 workout today.',                                    'daily',   'workouts',      1,  20,  NULL,           'dumbbell'),
  ('Daily Check-In',      'Complete your discipline check-in today.',                'daily',   'checkins',      1,  15,  NULL,           'check-circle'),
  ('Daily Reflection',    'Write today''s journal entry.',                           'daily',   'journals',      1,  15,  NULL,           'book-open'),
  ('Weekly Iron',         'Train 4 times this week.',                                'weekly',  'workouts',      4,  150, 'challenger',   'flame'),
  ('Weekly Mirror',       'Log 2 progress photos this week.',                        'weekly',  'photos',        2,  100, NULL,           'camera'),
  ('Weekly Nutrition',    'Hit your calorie target 5 days this week.',               'weekly',  'nutrition_days',5,  150, NULL,           'apple'),
  ('Monthly Ascent',      'Complete 16 workouts this month.',                        'monthly', 'workouts',      16, 500, 'iron_discipline','trophy'),
  ('Monthly Chronicle',   'Log 8 progress photos this month.',                       'monthly', 'photos',        8,  400, 'photo_chronicle','camera'),
  ('Monthly Reflection',  'Write 20 journal entries this month.',                    'monthly', 'journals',      20, 400, NULL,           'book-open');
