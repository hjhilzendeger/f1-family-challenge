-- Reference data ------------------------------------------------------------
CREATE TABLE public.teams (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#e10600'
);
GRANT SELECT ON public.teams TO authenticated, anon;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams are readable" ON public.teams FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.drivers (
  id text PRIMARY KEY,
  code text NOT NULL,
  full_name text NOT NULL,
  team_id text NOT NULL REFERENCES public.teams(id),
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.drivers TO authenticated, anon;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers are readable" ON public.drivers FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.races (
  id text PRIMARY KEY,
  season integer NOT NULL DEFAULT 2026,
  round integer NOT NULL,
  name text NOT NULL,
  circuit text NOT NULL,
  country text NOT NULL,
  race_start timestamptz NOT NULL,
  is_final boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.races TO authenticated, anon;
GRANT ALL ON public.races TO service_role;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "races are readable" ON public.races FOR SELECT TO authenticated, anon USING (true);

-- Family groups -------------------------------------------------------------
CREATE TABLE public.family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.family_groups TO authenticated;
GRANT ALL ON public.family_groups TO service_role;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups are readable" ON public.family_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "members can create a group" ON public.family_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "creator can update their group" ON public.family_groups FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text NOT NULL,
  nickname text,
  group_id uuid REFERENCES public.family_groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "members manage their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "members update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Predictions ---------------------------------------------------------------
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  race_id text NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  p1_driver text REFERENCES public.drivers(id),
  p2_driver text REFERENCES public.drivers(id),
  p3_driver text REFERENCES public.drivers(id),
  team_id text REFERENCES public.teams(id),
  pole_driver text REFERENCES public.drivers(id),
  fastest_lap_driver text REFERENCES public.drivers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, race_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own picks always readable, others after lock" ON public.predictions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.races r WHERE r.id = race_id AND r.race_start <= now())
  );
CREATE POLICY "members create their own picks" ON public.predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members update their own picks" ON public.predictions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members delete their own picks" ON public.predictions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_prediction_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  starts_at timestamptz;
BEGIN
  SELECT race_start INTO starts_at FROM public.races WHERE id = NEW.race_id;
  IF starts_at IS NOT NULL AND starts_at <= now() THEN
    RAISE EXCEPTION 'This race has already started, so picks are locked.';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER predictions_lock BEFORE INSERT OR UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prediction_lock();

-- Results and scores --------------------------------------------------------
CREATE TABLE public.race_results (
  race_id text PRIMARY KEY REFERENCES public.races(id) ON DELETE CASCADE,
  p1_driver text REFERENCES public.drivers(id),
  p2_driver text REFERENCES public.drivers(id),
  p3_driver text REFERENCES public.drivers(id),
  team_id text REFERENCES public.teams(id),
  pole_driver text REFERENCES public.drivers(id),
  fastest_lap_driver text REFERENCES public.drivers(id),
  source text NOT NULL DEFAULT 'api',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.race_results TO authenticated, anon;
GRANT ALL ON public.race_results TO service_role;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results are readable" ON public.race_results FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  race_id text NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  exact_podiums integer NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, race_id)
);
GRANT SELECT ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores are readable" ON public.scores FOR SELECT TO authenticated USING (true);

-- Activity feed -------------------------------------------------------------
CREATE TABLE public.activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity TO authenticated;
GRANT ALL ON public.activity TO service_role;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity is readable" ON public.activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "members post their own activity" ON public.activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Seed data -----------------------------------------------------------------
INSERT INTO public.teams (id, name, color) VALUES
  ('mclaren', 'McLaren', '#ff8000'),
  ('ferrari', 'Ferrari', '#e8002d'),
  ('red_bull', 'Red Bull Racing', '#3671c6'),
  ('mercedes', 'Mercedes', '#27f4d2'),
  ('aston_martin', 'Aston Martin', '#229971'),
  ('alpine', 'Alpine', '#0093cc'),
  ('williams', 'Williams', '#64c4ff'),
  ('racing_bulls', 'Racing Bulls', '#6692ff'),
  ('haas', 'Haas', '#b6babd'),
  ('audi', 'Audi', '#00e701'),
  ('cadillac', 'Cadillac', '#c8a558');

INSERT INTO public.drivers (id, code, full_name, team_id) VALUES
  ('norris', 'NOR', 'Lando Norris', 'mclaren'),
  ('piastri', 'PIA', 'Oscar Piastri', 'mclaren'),
  ('leclerc', 'LEC', 'Charles Leclerc', 'ferrari'),
  ('hamilton', 'HAM', 'Lewis Hamilton', 'ferrari'),
  ('verstappen', 'VER', 'Max Verstappen', 'red_bull'),
  ('hadjar', 'HAD', 'Isack Hadjar', 'red_bull'),
  ('russell', 'RUS', 'George Russell', 'mercedes'),
  ('antonelli', 'ANT', 'Kimi Antonelli', 'mercedes'),
  ('alonso', 'ALO', 'Fernando Alonso', 'aston_martin'),
  ('stroll', 'STR', 'Lance Stroll', 'aston_martin'),
  ('gasly', 'GAS', 'Pierre Gasly', 'alpine'),
  ('colapinto', 'COL', 'Franco Colapinto', 'alpine'),
  ('albon', 'ALB', 'Alexander Albon', 'williams'),
  ('sainz', 'SAI', 'Carlos Sainz', 'williams'),
  ('lawson', 'LAW', 'Liam Lawson', 'racing_bulls'),
  ('lindblad', 'LIN', 'Arvid Lindblad', 'racing_bulls'),
  ('ocon', 'OCO', 'Esteban Ocon', 'haas'),
  ('bearman', 'BEA', 'Oliver Bearman', 'haas'),
  ('hulkenberg', 'HUL', 'Nico Hulkenberg', 'audi'),
  ('bortoleto', 'BOR', 'Gabriel Bortoleto', 'audi'),
  ('perez', 'PER', 'Sergio Perez', 'cadillac'),
  ('bottas', 'BOT', 'Valtteri Bottas', 'cadillac');

INSERT INTO public.races (id, round, name, circuit, country, race_start, is_final) VALUES
  ('2026_netherlands', 15, 'Dutch Grand Prix', 'Circuit Zandvoort', 'Netherlands', '2026-08-23 13:00:00+00', false),
  ('2026_italy', 16, 'Italian Grand Prix', 'Autodromo Nazionale Monza', 'Italy', '2026-09-06 13:00:00+00', false),
  ('2026_spain', 17, 'Madrid Grand Prix', 'Madring', 'Spain', '2026-09-13 13:00:00+00', false),
  ('2026_azerbaijan', 18, 'Azerbaijan Grand Prix', 'Baku City Circuit', 'Azerbaijan', '2026-09-27 11:00:00+00', false),
  ('2026_singapore', 19, 'Singapore Grand Prix', 'Marina Bay Street Circuit', 'Singapore', '2026-10-11 12:00:00+00', false),
  ('2026_usa', 20, 'United States Grand Prix', 'Circuit of the Americas, Austin', 'United States', '2026-10-25 19:00:00+00', true);