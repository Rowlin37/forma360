-- =============================================================================
-- FORMA360 — MIGRACIÓN 0001: ESQUEMA RELACIONAL COMPLETO + SEGURIDAD RLS
-- Compatible con Supabase PostgreSQL y entornos PostgreSQL 15+/PGlite de test.
-- =============================================================================

-- 1. Compatibilidad de roles y esquema `auth` cuando se ejecuta fuera de Supabase
-- (En Supabase Cloud estos objetos ya existen y los bloques `IF NOT EXISTS` no alteran nada).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $body$
        SELECT COALESCE(
          NULLIF(current_setting('request.jwt.claim.sub', true), ''),
          (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
        )::uuid
      $body$;
    $fn$;
  END IF;
END
$$;

-- Función auxiliar para actualizar `updated_at`
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. TABLAS DEL DOMINIO FORMA360
-- =============================================================================

-- 2.1 Perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Atleta Forma360',
  age integer NOT NULL DEFAULT 35 CHECK (age BETWEEN 14 AND 105),
  sex_reference text NOT NULL DEFAULT 'male' CHECK (sex_reference IN ('male', 'female', 'unspecified')),
  height_cm numeric(5,1) NOT NULL DEFAULT 187.0 CHECK (height_cm BETWEEN 120 AND 240),
  height_confirmed boolean NOT NULL DEFAULT false,
  initial_weight_kg numeric(5,2) NOT NULL DEFAULT 90.00 CHECK (initial_weight_kg BETWEEN 35 AND 300),
  target_weight_kg numeric(5,2) NOT NULL DEFAULT 75.00 CHECK (target_weight_kg BETWEEN 35 AND 250),
  scale_reported_bmi numeric(4,1) DEFAULT 25.7,
  scale_reported_bmr_kcal integer DEFAULT 779,
  bmr_verified boolean NOT NULL DEFAULT false,
  fitness_level text NOT NULL DEFAULT 'restarting_home' CHECK (fitness_level IN ('sedentary', 'restarting_home', 'intermediate', 'advanced')),
  primary_goal text NOT NULL DEFAULT 'fat_loss_muscle_retention',
  long_term_sport_goal text NOT NULL DEFAULT 'half_marathon_21k',
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 Preferencias de aplicación y nutrición
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  locale text NOT NULL DEFAULT 'es-ES',
  unit_system text NOT NULL DEFAULT 'metric' CHECK (unit_system = 'metric'),
  excluded_foods text[] NOT NULL DEFAULT ARRAY['espinacas', 'queso feta', 'espárragos', 'brócoli', 'coliflor', 'pepino'],
  dietary_notes text DEFAULT '',
  meals_pattern text NOT NULL DEFAULT '4_meals' CHECK (meals_pattern IN ('3_meals', '4_meals', '5_meals', 'flexible')),
  activity_factor numeric(3,2) NOT NULL DEFAULT 1.50 CHECK (activity_factor BETWEEN 1.20 AND 2.10),
  target_deficit_kcal integer NOT NULL DEFAULT 450 CHECK (target_deficit_kcal BETWEEN 0 AND 900),
  protein_g_per_kg_target numeric(3,2) NOT NULL DEFAULT 1.85 CHECK (protein_g_per_kg_target BETWEEN 0.80 AND 2.50),
  maintenance_mode boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.3 Cuestionario inicial de salud, seguridad y disponibilidad
CREATE TABLE IF NOT EXISTS public.safety_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chest_pain_or_syncope boolean NOT NULL DEFAULT false,
  disproportionate_dyspnea boolean NOT NULL DEFAULT false,
  recent_abnormal_abdominal_distension boolean NOT NULL DEFAULT false,
  renal_disease_known boolean NOT NULL DEFAULT false,
  cardiovascular_or_metabolic_condition boolean NOT NULL DEFAULT false,
  relevant_medication text NOT NULL DEFAULT '',
  joint_pain_areas text[] NOT NULL DEFAULT ARRAY[]::text[],
  joint_pain_notes text NOT NULL DEFAULT '',
  impact_tolerance text NOT NULL DEFAULT 'low_to_moderate' CHECK (impact_tolerance IN ('low_only', 'low_to_moderate', 'good')),
  prior_experience text NOT NULL DEFAULT 'Entrenamiento previo en casa y fútbol semanal',
  preferred_days integer[] NOT NULL DEFAULT ARRAY[1, 2, 3, 5, 6, 7],
  session_duration_minutes integer NOT NULL DEFAULT 45 CHECK (session_duration_minutes BETWEEN 15 AND 150),
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.4 Equipamiento disponible y futuro
CREATE TABLE IF NOT EXISTS public.user_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('cardio', 'free_weights', 'benches', 'core', 'accessories', 'machines', 'bodyweight')),
  is_available boolean NOT NULL DEFAULT false,
  is_custom boolean NOT NULL DEFAULT false,
  available_weights_kg numeric[] NOT NULL DEFAULT ARRAY[]::numeric[],
  weights_description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

-- 2.5 Biblioteca estructurada de ejercicios (del sistema + personalizados por usuario)
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('strength', 'cardio', 'mobility', 'core', 'running', 'recovery')),
  primary_muscle text NOT NULL,
  secondary_muscles text[] NOT NULL DEFAULT ARRAY[]::text[],
  movement_pattern text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  impact_level text NOT NULL CHECK (impact_level IN ('low', 'medium', 'high')),
  physical_demand integer NOT NULL DEFAULT 3 CHECK (physical_demand BETWEEN 1 AND 5),
  required_equipment text[] NOT NULL DEFAULT ARRAY['bodyweight_space'],
  instructions text[] NOT NULL DEFAULT ARRAY[]::text[],
  common_errors text[] NOT NULL DEFAULT ARRAY[]::text[],
  safety_tips text[] NOT NULL DEFAULT ARRAY[]::text[],
  easier_variants text[] NOT NULL DEFAULT ARRAY[]::text[],
  harder_variants text[] NOT NULL DEFAULT ARRAY[]::text[],
  material_substitutions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_prescription jsonb NOT NULL DEFAULT '{}'::jsonb,
  personal_notes text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, slug)
);

-- 2.6 Planes de entrenamiento y versiones
CREATE TABLE IF NOT EXISTS public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  focus text NOT NULL DEFAULT 'fat_loss_strength_base',
  duration_weeks integer NOT NULL DEFAULT 8 CHECK (duration_weeks BETWEEN 1 AND 52),
  current_week integer NOT NULL DEFAULT 1 CHECK (current_week >= 1),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number >= 1),
  change_reason text NOT NULL,
  generator_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version_number)
);

-- 2.7 Sesiones previstas en el calendario
CREATE TABLE IF NOT EXISTS public.planned_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.plan_versions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  scheduled_date date NOT NULL,
  scheduled_time text DEFAULT '18:30',
  session_type text NOT NULL CHECK (session_type IN ('strength', 'cardio', 'running', 'football', 'mobility', 'recovery', 'rest', 'review')),
  title text NOT NULL,
  objective text NOT NULL,
  warmup text NOT NULL DEFAULT '',
  cooldown text NOT NULL DEFAULT '',
  estimated_minutes integer NOT NULL DEFAULT 45 CHECK (estimated_minutes BETWEEN 0 AND 240),
  expected_rpe numeric(3,1) NOT NULL DEFAULT 7.0 CHECK (expected_rpe BETWEEN 1.0 AND 10.0),
  impact_level text NOT NULL DEFAULT 'low' CHECK (impact_level IN ('low', 'medium', 'high')),
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  progression_rule text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rescheduled', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.8 Sesiones completadas y series realizadas
CREATE TABLE IF NOT EXISTS public.completed_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planned_session_id uuid REFERENCES public.planned_sessions(id) ON DELETE SET NULL,
  session_type text NOT NULL CHECK (session_type IN ('strength', 'cardio', 'running', 'football', 'mobility', 'recovery')),
  title text NOT NULL,
  performed_on date NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 1 AND 480),
  perceived_rpe numeric(3,1) NOT NULL CHECK (perceived_rpe BETWEEN 1.0 AND 10.0),
  completed_fully boolean NOT NULL DEFAULT true,
  felt_discomfort boolean NOT NULL DEFAULT false,
  discomfort_notes text NOT NULL DEFAULT '',
  readiness_next text NOT NULL DEFAULT 'good' CHECK (readiness_next IN ('optimal', 'good', 'fatigued', 'pain_stop')),
  estimated_kcal integer CHECK (estimated_kcal IS NULL OR estimated_kcal >= 0),
  notes text NOT NULL DEFAULT '',
  client_dedup_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_dedup_key)
);

CREATE TABLE IF NOT EXISTS public.performed_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  completed_session_id uuid NOT NULL REFERENCES public.completed_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_slug text NOT NULL,
  exercise_name text NOT NULL,
  set_index integer NOT NULL CHECK (set_index >= 1),
  target_reps integer,
  reps_completed integer NOT NULL CHECK (reps_completed >= 0),
  load_kg numeric(6,2) NOT NULL DEFAULT 0 CHECK (load_kg >= 0),
  rpe numeric(3,1) CHECK (rpe IS NULL OR (rpe BETWEEN 1.0 AND 10.0)),
  rest_seconds integer DEFAULT 90,
  notes text NOT NULL DEFAULT ''
);

-- 2.9 Actividades deportivas recurrentes o puntuales (Fútbol miércoles/domingo, etc.)
CREATE TABLE IF NOT EXISTS public.sport_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_name text NOT NULL,
  performed_on date,
  recurring_day_of_week integer CHECK (recurring_day_of_week IS NULL OR recurring_day_of_week BETWEEN 1 AND 7),
  is_recurring boolean NOT NULL DEFAULT false,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 5 AND 360),
  effort_level text NOT NULL CHECK (effort_level IN ('light', 'moderate', 'high', 'maximal')),
  perceived_rpe numeric(3,1) NOT NULL DEFAULT 7.5 CHECK (perceived_rpe BETWEEN 1.0 AND 10.0),
  notes text NOT NULL DEFAULT '',
  client_dedup_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_dedup_key)
);

-- 2.10 Progresión y sesiones de carrera hacia Media Maratón
CREATE TABLE IF NOT EXISTS public.running_progressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_stage integer NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 8),
  walk_seconds integer NOT NULL DEFAULT 240 CHECK (walk_seconds >= 0),
  run_seconds integer NOT NULL DEFAULT 60 CHECK (run_seconds >= 0),
  repetitions integer NOT NULL DEFAULT 6 CHECK (repetitions BETWEEN 1 AND 30),
  longest_continuous_minutes numeric(5,1) NOT NULL DEFAULT 0,
  longest_distance_km numeric(5,2) NOT NULL DEFAULT 0,
  has_sports_watch boolean NOT NULL DEFAULT false,
  has_treadmill boolean NOT NULL DEFAULT false,
  half_marathon_ready_base boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.running_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_at_time integer NOT NULL CHECK (stage_at_time BETWEEN 1 AND 8),
  performed_on date NOT NULL,
  workout_mode text NOT NULL CHECK (workout_mode IN ('brisk_walk', 'walk_run_intervals', 'easy_continuous', 'tempo_progressive', 'long_run', 'recovery')),
  walk_seconds integer DEFAULT 0,
  run_seconds integer DEFAULT 0,
  repetitions integer DEFAULT 1,
  duration_minutes numeric(5,1) NOT NULL CHECK (duration_minutes > 0),
  distance_km numeric(5,2) CHECK (distance_km IS NULL OR distance_km >= 0),
  avg_heart_rate integer CHECK (avg_heart_rate IS NULL OR avg_heart_rate BETWEEN 40 AND 230),
  route_description text NOT NULL DEFAULT '',
  perceived_rpe numeric(3,1) NOT NULL CHECK (perceived_rpe BETWEEN 1.0 AND 10.0),
  joint_discomfort integer NOT NULL DEFAULT 0 CHECK (joint_discomfort BETWEEN 0 AND 10),
  discomfort_location text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  client_dedup_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_dedup_key)
);

-- 2.11 Alimentos, recetas personalizadas y diario nutricional
CREATE TABLE IF NOT EXISTS public.foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  food_group text NOT NULL,
  data_source text NOT NULL CHECK (data_source IN ('bedca_reference', 'user_editable', 'recipe_calculated', 'quick_estimate')),
  kcal_per_100g numeric(6,1) NOT NULL CHECK (kcal_per_100g >= 0),
  protein_per_100g numeric(5,1) NOT NULL CHECK (protein_per_100g >= 0),
  carbs_per_100g numeric(5,1) NOT NULL CHECK (carbs_per_100g >= 0),
  fat_per_100g numeric(5,1) NOT NULL CHECK (fat_per_100g >= 0),
  fiber_per_100g numeric(5,1) NOT NULL DEFAULT 0 CHECK (fiber_per_100g >= 0),
  default_portion_name text NOT NULL DEFAULT '100 g',
  default_portion_grams numeric(6,1) NOT NULL DEFAULT 100 CHECK (default_portion_grams > 0),
  is_system boolean NOT NULL DEFAULT false,
  UNIQUE (owner_user_id, slug)
);

CREATE TABLE IF NOT EXISTS public.custom_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  servings integer NOT NULL DEFAULT 1 CHECK (servings >= 1),
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  kcal_per_serving numeric(6,1) NOT NULL CHECK (kcal_per_serving >= 0),
  protein_per_serving numeric(5,1) NOT NULL CHECK (protein_per_serving >= 0),
  carbs_per_serving numeric(5,1) NOT NULL CHECK (carbs_per_serving >= 0),
  fat_per_serving numeric(5,1) NOT NULL CHECK (fat_per_serving >= 0),
  fiber_per_serving numeric(5,1) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on date NOT NULL,
  meal_slot text NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  entry_name text NOT NULL,
  food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL,
  recipe_id uuid REFERENCES public.custom_recipes(id) ON DELETE SET NULL,
  data_source text NOT NULL CHECK (data_source IN ('bedca_reference', 'user_editable', 'recipe_calculated', 'quick_estimate', 'csv_import')),
  quantity numeric(7,2) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL CHECK (unit IN ('g', 'ml', 'unidad', 'racion')),
  grams_equivalent numeric(7,2) NOT NULL CHECK (grams_equivalent > 0),
  kcal numeric(7,1) NOT NULL CHECK (kcal >= 0),
  protein_g numeric(6,1) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g numeric(6,1) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g numeric(6,1) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  fiber_g numeric(6,1) NOT NULL DEFAULT 0 CHECK (fiber_g >= 0),
  is_habitual boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  client_dedup_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_dedup_key)
);

-- 2.12 Mediciones corporales y composición (separando manual vs báscula doméstica)
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  source_type text NOT NULL DEFAULT 'mixed' CHECK (source_type IN ('manual', 'xiaomi_scale_estimate', 'mixed')),
  weight_kg numeric(5,2) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 30 AND 300),
  waist_cm numeric(5,1) CHECK (waist_cm IS NULL OR waist_cm BETWEEN 45 AND 200),
  hip_cm numeric(5,1) CHECK (hip_cm IS NULL OR hip_cm BETWEEN 50 AND 220),
  body_fat_pct_estimate numeric(4,1) CHECK (body_fat_pct_estimate IS NULL OR body_fat_pct_estimate BETWEEN 3 AND 65),
  visceral_fat_rating numeric(4,1) CHECK (visceral_fat_rating IS NULL OR visceral_fat_rating BETWEEN 1 AND 59),
  visceral_scale_device text DEFAULT 'Báscula Xiaomi (escala orientativa 1-30)',
  muscle_mass_kg_estimate numeric(5,2) CHECK (muscle_mass_kg_estimate IS NULL OR muscle_mass_kg_estimate BETWEEN 15 AND 150),
  body_water_pct_estimate numeric(4,1) CHECK (body_water_pct_estimate IS NULL OR body_water_pct_estimate BETWEEN 25 AND 80),
  bone_mass_kg_estimate numeric(4,2) CHECK (bone_mass_kg_estimate IS NULL OR bone_mass_kg_estimate BETWEEN 1.0 AND 10.0),
  scale_protein_pct_estimate numeric(4,1) CHECK (scale_protein_pct_estimate IS NULL OR scale_protein_pct_estimate BETWEEN 5 AND 35),
  scale_bmi_reported numeric(4,1),
  scale_bmr_reported integer,
  resting_hr_bpm integer CHECK (resting_hr_bpm IS NULL OR resting_hr_bpm BETWEEN 30 AND 180),
  photo_storage_path text,
  is_anomalous boolean NOT NULL DEFAULT false,
  anomaly_confirmed_by_user boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.13 Objetivos, hitos y evaluaciones de bienestar
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('weight', 'waist', 'running', 'strength', 'adherence', 'custom')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_value numeric(7,2),
  current_value numeric(7,2),
  target_value numeric(7,2),
  unit text NOT NULL DEFAULT 'kg',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 're_evaluated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  target_value numeric(7,2) NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  sort_order integer NOT NULL DEFAULT 1,
  is_reached boolean NOT NULL DEFAULT false,
  reached_on date
);

CREATE TABLE IF NOT EXISTS public.wellbeing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on date NOT NULL,
  sleep_hours numeric(3,1) CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 18),
  sleep_quality integer CHECK (sleep_quality IS NULL OR sleep_quality BETWEEN 1 AND 5),
  energy_level integer CHECK (energy_level IS NULL OR energy_level BETWEEN 1 AND 5),
  digestion_quality integer CHECK (digestion_quality IS NULL OR digestion_quality BETWEEN 1 AND 5),
  general_wellbeing integer CHECK (general_wellbeing IS NULL OR general_wellbeing BETWEEN 1 AND 5),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);

-- 2.14 Motor de recomendaciones y registro auditable de decisiones
CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_code text NOT NULL,
  area text NOT NULL CHECK (area IN ('safety', 'training', 'running', 'nutrition', 'recovery', 'body_tracking')),
  severity text NOT NULL CHECK (severity IN ('info', 'suggestion', 'important', 'medical_alert')),
  title text NOT NULL,
  reason text NOT NULL,
  proposed_action text NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'modified', 'rejected')),
  user_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

-- =============================================================================
-- 3. ÍNDICES DE RENDIMIENTO
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_planned_sessions_user_week ON public.planned_sessions(user_id, week_number, day_of_week);
CREATE INDEX IF NOT EXISTS idx_completed_sessions_user_date ON public.completed_sessions(user_id, performed_on DESC);
CREATE INDEX IF NOT EXISTS idx_performed_sets_user_exercise ON public.performed_sets(user_id, exercise_slug);
CREATE INDEX IF NOT EXISTS idx_running_logs_user_date ON public.running_logs(user_id, performed_on DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON public.nutrition_logs(user_id, logged_on DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON public.body_measurements(user_id, measured_on DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_status ON public.recommendations(user_id, status);

-- Triggers `updated_at`
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trg_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.training_plans;
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.training_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_planned_sessions_updated_at ON public.planned_sessions;
CREATE TRIGGER trg_planned_sessions_updated_at BEFORE UPDATE ON public.planned_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) ESTRICTA EN TODAS LAS TABLAS
-- Cada usuario autenticado únicamente puede leer, insertar, modificar y borrar
-- sus propios registros. Catálogos globales (`is_system = true`) son solo lectura.
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY profiles_own_all ON public.profiles
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY preferences_own_all ON public.user_preferences
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.safety_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_screenings FORCE ROW LEVEL SECURITY;
CREATE POLICY screenings_own_all ON public.safety_screenings
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.user_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_equipment FORCE ROW LEVEL SECURITY;
CREATE POLICY equipment_own_all ON public.user_equipment
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises FORCE ROW LEVEL SECURITY;
CREATE POLICY exercises_select_system_or_own ON public.exercises
  FOR SELECT TO anon, authenticated
  USING (is_system = true OR (SELECT auth.uid()) = owner_user_id);
CREATE POLICY exercises_insert_own ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (is_system = false AND (SELECT auth.uid()) = owner_user_id);
CREATE POLICY exercises_update_own ON public.exercises
  FOR UPDATE TO authenticated
  USING (is_system = false AND (SELECT auth.uid()) = owner_user_id)
  WITH CHECK (is_system = false AND (SELECT auth.uid()) = owner_user_id);
CREATE POLICY exercises_delete_own ON public.exercises
  FOR DELETE TO authenticated
  USING (is_system = false AND (SELECT auth.uid()) = owner_user_id);

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY plans_own_all ON public.training_plans
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY plan_versions_own_all ON public.plan_versions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.planned_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY planned_sessions_own_all ON public.planned_sessions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.completed_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY completed_sessions_own_all ON public.completed_sessions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.performed_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performed_sets FORCE ROW LEVEL SECURITY;
CREATE POLICY performed_sets_own_all ON public.performed_sets
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.sport_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_activities FORCE ROW LEVEL SECURITY;
CREATE POLICY sport_activities_own_all ON public.sport_activities
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.running_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.running_progressions FORCE ROW LEVEL SECURITY;
CREATE POLICY running_progressions_own_all ON public.running_progressions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.running_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.running_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY running_logs_own_all ON public.running_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods FORCE ROW LEVEL SECURITY;
CREATE POLICY foods_select_system_or_own ON public.foods
  FOR SELECT TO anon, authenticated
  USING (is_system = true OR (SELECT auth.uid()) = owner_user_id);
CREATE POLICY foods_insert_own ON public.foods
  FOR INSERT TO authenticated
  WITH CHECK (is_system = false AND (SELECT auth.uid()) = owner_user_id);
CREATE POLICY foods_update_own ON public.foods
  FOR UPDATE TO authenticated
  USING (is_system = false AND (SELECT auth.uid()) = owner_user_id)
  WITH CHECK (is_system = false AND (SELECT auth.uid()) = owner_user_id);
CREATE POLICY foods_delete_own ON public.foods
  FOR DELETE TO authenticated
  USING (is_system = false AND (SELECT auth.uid()) = owner_user_id);

ALTER TABLE public.custom_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_recipes FORCE ROW LEVEL SECURITY;
CREATE POLICY recipes_own_all ON public.custom_recipes
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY nutrition_logs_own_all ON public.nutrition_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements FORCE ROW LEVEL SECURITY;
CREATE POLICY body_measurements_own_all ON public.body_measurements
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals FORCE ROW LEVEL SECURITY;
CREATE POLICY goals_own_all ON public.goals
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones FORCE ROW LEVEL SECURITY;
CREATE POLICY goal_milestones_own_all ON public.goal_milestones
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.wellbeing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellbeing_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY wellbeing_logs_own_all ON public.wellbeing_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations FORCE ROW LEVEL SECURITY;
CREATE POLICY recommendations_own_all ON public.recommendations
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Permisos de acceso de rol PostgreSQL (sujetos siempre a RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.exercises, public.foods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Bucket privado de Storage para fotos opcionales de progreso (cuando `storage.buckets` existe en Supabase)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('progress-photos', 'progress-photos', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END
$$;
