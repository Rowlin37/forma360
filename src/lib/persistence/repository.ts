import { createInitialForma360State } from '@/lib/domain/initial-state';
import { generateId } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/config';
import {
  CompletedSessionLog,
  Forma360State,
  NutritionLogEntry,
  RunningSessionLog,
  SportActivityLog,
} from '@/lib/types';

export interface AuthSessionUser {
  userId: string;
  email: string;
  displayName: string;
  mode: 'supabase' | 'local';
}

interface StoredLocalAccount {
  userId: string;
  email: string;
  displayName: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

const LOCAL_ACCOUNTS_KEY = 'forma360:accounts:v1';
const LOCAL_ACTIVE_SESSION_KEY = 'forma360:active_session:v1';
const LOCAL_STATE_PREFIX = 'forma360:user_state:v1:';
const DEMO_DEFAULT_USER_ID = 'local-default-profile';

async function hashPassword(password: string, salt: string): Promise<string> {
  const payload = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Entornos sin WebCrypto
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

function readLocalAccounts(): StoredLocalAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as StoredLocalAccount[]) : [];
  } catch {
    return [];
  }
}

function writeLocalAccounts(accounts: StoredLocalAccount[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * Protección anti-duplicado determinista:
 * Impide guardar dos veces el mismo entrenamiento, partido de fútbol o comida
 * por doble clic, reintento de red o envío repetido en ventana corta.
 */
export function appendCompletedSessionDeduped(
  existing: CompletedSessionLog[],
  incoming: CompletedSessionLog
): { list: CompletedSessionLog[]; duplicateIgnored: boolean } {
  const isDuplicateKey = existing.some((item) => item.clientDedupKey === incoming.clientDedupKey);
  const isDuplicateSameDayFootball =
    incoming.sessionType === 'football' &&
    existing.some(
      (item) =>
        item.sessionType === 'football' &&
        item.performedOn === incoming.performedOn &&
        item.title.toLowerCase() === incoming.title.toLowerCase()
    );
  const isDuplicatePlannedSession =
    incoming.plannedSessionId !== null &&
    existing.some(
      (item) =>
        item.plannedSessionId === incoming.plannedSessionId &&
        item.performedOn === incoming.performedOn
    );

  if (isDuplicateKey || isDuplicateSameDayFootball || isDuplicatePlannedSession) {
    return { list: existing, duplicateIgnored: true };
  }
  return { list: [...existing, incoming], duplicateIgnored: false };
}

export function appendRunningLogDeduped(
  existing: RunningSessionLog[],
  incoming: RunningSessionLog
): { list: RunningSessionLog[]; duplicateIgnored: boolean } {
  const duplicate = existing.some(
    (r) =>
      r.clientDedupKey === incoming.clientDedupKey ||
      (r.performedOn === incoming.performedOn &&
        r.workoutMode === incoming.workoutMode &&
        r.durationMinutes === incoming.durationMinutes &&
        Math.abs(
          new Date(r.createdAt).getTime() - new Date(incoming.createdAt).getTime()
        ) < 5000)
  );
  if (duplicate) {
    return { list: existing, duplicateIgnored: true };
  }
  return { list: [...existing, incoming], duplicateIgnored: false };
}

export function appendNutritionLogDeduped(
  existing: NutritionLogEntry[],
  incoming: NutritionLogEntry,
  allowExplicitDuplicateCopy = false
): { list: NutritionLogEntry[]; duplicateIgnored: boolean } {
  if (existing.some((n) => n.clientDedupKey === incoming.clientDedupKey)) {
    return { list: existing, duplicateIgnored: true };
  }
  if (!allowExplicitDuplicateCopy) {
    const rapidIdentical = existing.some(
      (n) =>
        n.loggedOn === incoming.loggedOn &&
        n.mealSlot === incoming.mealSlot &&
        n.entryName.trim().toLowerCase() === incoming.entryName.trim().toLowerCase() &&
        n.quantity === incoming.quantity &&
        n.unit === incoming.unit &&
        Math.abs(
          new Date(n.createdAt).getTime() - new Date(incoming.createdAt).getTime()
        ) < 3000
    );
    if (rapidIdentical) {
      return { list: existing, duplicateIgnored: true };
    }
  }
  return { list: [...existing, incoming], duplicateIgnored: false };
}

export function appendSportActivityDeduped(
  existing: SportActivityLog[],
  incoming: SportActivityLog
): { list: SportActivityLog[]; duplicateIgnored: boolean } {
  const duplicate = existing.some(
    (s) =>
      s.clientDedupKey === incoming.clientDedupKey ||
      (!incoming.isRecurring &&
        s.performedOn === incoming.performedOn &&
        s.sportName.trim().toLowerCase() === incoming.sportName.trim().toLowerCase())
  );
  if (duplicate) {
    return { list: existing, duplicateIgnored: true };
  }
  return { list: [...existing, incoming], duplicateIgnored: false };
}

// =============================================================================
// REPOSITORIO UNIFICADO DE AUTENTICACIÓN Y PERSISTENCIA (SUPABASE + LOCAL)
// =============================================================================

export async function getActiveSessionUser(): Promise<AuthSessionUser | null> {
  const env = getSupabasePublicEnv();
  if (env.isConfigured) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return {
      userId: data.user.id,
      email: data.user.email ?? 'usuario@forma360.app',
      displayName:
        (data.user.user_metadata?.display_name as string | undefined) ??
        data.user.email?.split('@')[0] ??
        'Atleta Forma360',
      mode: 'supabase',
    };
  }

  if (typeof window === 'undefined') return null;
  const rawSession = window.localStorage.getItem(LOCAL_ACTIVE_SESSION_KEY);
  if (rawSession) {
    try {
      const parsed = JSON.parse(rawSession) as AuthSessionUser | { loggedOut: true };
      if ('loggedOut' in parsed && parsed.loggedOut) {
        return null;
      }
      if ('userId' in parsed) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  // En primera visita sin Supabase configurado, inicializa el perfil local transparente
  const initialLocalUser: AuthSessionUser = {
    userId: DEMO_DEFAULT_USER_ID,
    email: 'perfil-inicial@forma360.local',
    displayName: 'Perfil Inicial (90 kg → 75 kg · Media Maratón)',
    mode: 'local',
  };
  window.localStorage.setItem(LOCAL_ACTIVE_SESSION_KEY, JSON.stringify(initialLocalUser));
  return initialLocalUser;
}

export async function registerAccount(
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: AuthSessionUser | null; error?: string; requiresEmailConfirmation?: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = displayName?.trim() || normalizedEmail.split('@')[0] || 'Atleta Forma360';
  const env = getSupabasePublicEnv();

  if (env.isConfigured) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { user: null, error: 'Cliente Supabase no disponible.' };

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { display_name: cleanName },
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user && !data.session) {
      return {
        user: null,
        requiresEmailConfirmation: true,
      };
    }

    if (data.user) {
      return {
        user: {
          userId: data.user.id,
          email: data.user.email ?? normalizedEmail,
          displayName: cleanName,
          mode: 'supabase',
        },
      };
    }
    return { user: null, error: 'No se pudo completar el alta.' };
  }

  // Registro real persistente en almacenamiento local aislado por usuario
  const accounts = readLocalAccounts();
  if (accounts.some((acc) => acc.email === normalizedEmail)) {
    return { user: null, error: 'Ya existe una cuenta registrada con ese correo en este dispositivo.' };
  }

  const salt = generateId('salt');
  const passwordHash = await hashPassword(password, salt);
  const newUserId = `user-${generateId('id')}`;

  const account: StoredLocalAccount = {
    userId: newUserId,
    email: normalizedEmail,
    displayName: cleanName,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  writeLocalAccounts([...accounts, account]);

  const sessionUser: AuthSessionUser = {
    userId: newUserId,
    email: normalizedEmail,
    displayName: cleanName,
    mode: 'local',
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
  }
  return { user: sessionUser };
}

export async function signInAccount(
  email: string,
  password: string
): Promise<{ user: AuthSessionUser | null; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const env = getSupabasePublicEnv();

  if (env.isConfigured) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { user: null, error: 'Cliente Supabase no disponible.' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error || !data.user) {
      return { user: null, error: error?.message ?? 'Credenciales incorrectas.' };
    }
    return {
      user: {
        userId: data.user.id,
        email: data.user.email ?? normalizedEmail,
        displayName:
          (data.user.user_metadata?.display_name as string | undefined) ??
          normalizedEmail.split('@')[0] ??
          'Atleta Forma360',
        mode: 'supabase',
      },
    };
  }

  const accounts = readLocalAccounts();
  const match = accounts.find((acc) => acc.email === normalizedEmail);
  if (!match) {
    return { user: null, error: 'No existe ninguna cuenta con ese correo electrónico.' };
  }
  const candidateHash = await hashPassword(password, match.salt);
  if (candidateHash !== match.passwordHash) {
    return { user: null, error: 'Contraseña incorrecta.' };
  }

  const sessionUser: AuthSessionUser = {
    userId: match.userId,
    email: match.email,
    displayName: match.displayName,
    mode: 'local',
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
  }
  return { user: sessionUser };
}

export function enterQuickDemoProfile(): AuthSessionUser {
  const sessionUser: AuthSessionUser = {
    userId: DEMO_DEFAULT_USER_ID,
    email: 'perfil-inicial@forma360.local',
    displayName: 'Perfil Inicial (90 kg → 75 kg · Media Maratón)',
    mode: 'local',
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
  }
  return sessionUser;
}

export async function signOutAccount(): Promise<void> {
  const env = getSupabasePublicEnv();
  if (env.isConfigured) {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      LOCAL_ACTIVE_SESSION_KEY,
      JSON.stringify({ loggedOut: true })
    );
  }
}

// =============================================================================
// LECTURA Y ESCRITURA DE ESTADO COMPLETO (SUPABASE RELACIONAL O LOCAL AISLADO)
// =============================================================================

export async function loadUserState(user: AuthSessionUser): Promise<Forma360State> {
  if (user.mode === 'supabase') {
    const cloudState = await loadStateFromSupabaseTables(user);
    if (cloudState) {
      return cloudState;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(`${LOCAL_STATE_PREFIX}${user.userId}`);
    if (raw) {
      try {
        return JSON.parse(raw) as Forma360State;
      } catch {
        // Reconstruir si el JSON estuviera corrupto
      }
    }
  }

  const seeded = createInitialForma360State({
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    storageMode: user.mode,
  });

  await persistUserState(user, seeded);
  return seeded;
}

export async function persistUserState(
  user: AuthSessionUser,
  nextState: Forma360State
): Promise<void> {
  // Copia de respaldo rápida local aislada por `userId`
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      `${LOCAL_STATE_PREFIX}${user.userId}`,
      JSON.stringify(nextState)
    );
  }

  if (user.mode === 'supabase') {
    await syncStateToSupabaseTables(user.userId, nextState);
  }
}

export async function deleteAccountAndAllData(user: AuthSessionUser): Promise<{ ok: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(`${LOCAL_STATE_PREFIX}${user.userId}`);
    const remaining = readLocalAccounts().filter((acc) => acc.userId !== user.userId);
    writeLocalAccounts(remaining);
    window.localStorage.setItem(LOCAL_ACTIVE_SESSION_KEY, JSON.stringify({ loggedOut: true }));
  }

  if (user.mode === 'supabase') {
    const res = await fetch('/api/account', { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? 'Error al eliminar los datos en el servidor.' };
    }
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
  }

  return { ok: true };
}

// =============================================================================
// SINCRONIZACIÓN RELACIONAL REAL CON TABLAS SUPABASE PROTEGIDAS POR RLS
// =============================================================================

async function loadStateFromSupabaseTables(user: AuthSessionUser): Promise<Forma360State | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.userId)
    .maybeSingle();

  if (error || !profileRow) {
    return null;
  }

  const [
    prefsRes,
    screeningRes,
    equipmentRes,
    measurementsRes,
    nutritionRes,
    completedRes,
    runningProgRes,
    runningLogsRes,
    goalsRes,
    milestonesRes,
    recsRes,
  ] = await Promise.all([
    supabase.from('user_preferences').select('*').eq('user_id', user.userId).maybeSingle(),
    supabase
      .from('safety_screenings')
      .select('*')
      .eq('user_id', user.userId)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('user_equipment').select('*').eq('user_id', user.userId),
    supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.userId)
      .order('measured_on', { ascending: true }),
    supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', user.userId)
      .order('logged_on', { ascending: true }),
    supabase
      .from('completed_sessions')
      .select('*, performed_sets(*)')
      .eq('user_id', user.userId)
      .order('performed_on', { ascending: true }),
    supabase.from('running_progressions').select('*').eq('user_id', user.userId).maybeSingle(),
    supabase
      .from('running_logs')
      .select('*')
      .eq('user_id', user.userId)
      .order('performed_on', { ascending: true }),
    supabase.from('goals').select('*').eq('user_id', user.userId),
    supabase.from('goal_milestones').select('*').eq('user_id', user.userId),
    supabase.from('recommendations').select('*').eq('user_id', user.userId),
  ]);

  const base = createInitialForma360State({
    userId: user.userId,
    email: user.email,
    displayName: profileRow.display_name,
    storageMode: 'supabase',
  });

  base.profile = {
    userId: user.userId,
    email: user.email,
    displayName: profileRow.display_name,
    age: Number(profileRow.age),
    sexReference: profileRow.sex_reference,
    heightCm: Number(profileRow.height_cm),
    heightConfirmed: Boolean(profileRow.height_confirmed),
    initialWeightKg: Number(profileRow.initial_weight_kg),
    targetWeightKg: Number(profileRow.target_weight_kg),
    scaleReportedBmi:
      profileRow.scale_reported_bmi !== null ? Number(profileRow.scale_reported_bmi) : null,
    scaleReportedBmrKcal:
      profileRow.scale_reported_bmr_kcal !== null
        ? Number(profileRow.scale_reported_bmr_kcal)
        : null,
    bmrVerified: Boolean(profileRow.bmr_verified),
    fitnessLevel: profileRow.fitness_level,
    primaryGoal: profileRow.primary_goal,
    longTermSportGoal: profileRow.long_term_sport_goal,
    timezone: profileRow.timezone,
    onboardingCompleted: Boolean(profileRow.onboarding_completed),
    updatedAt: profileRow.updated_at,
  };

  if (prefsRes.data) {
    base.preferences = {
      theme: prefsRes.data.theme,
      locale: prefsRes.data.locale,
      unitSystem: 'metric',
      excludedFoods: prefsRes.data.excluded_foods ?? base.preferences.excludedFoods,
      dietaryNotes: prefsRes.data.dietary_notes ?? '',
      mealsPattern: prefsRes.data.meals_pattern,
      activityFactor: Number(prefsRes.data.activity_factor),
      targetDeficitKcal: Number(prefsRes.data.target_deficit_kcal),
      proteinGPerKgTarget: Number(prefsRes.data.protein_g_per_kg_target),
      maintenanceMode: Boolean(prefsRes.data.maintenance_mode),
      notificationsEnabled: Boolean(prefsRes.data.notifications_enabled),
    };
  }

  if (screeningRes.data) {
    base.screening = {
      id: screeningRes.data.id,
      chestPainOrSyncope: Boolean(screeningRes.data.chest_pain_or_syncope),
      disproportionateDyspnea: Boolean(screeningRes.data.disproportionate_dyspnea),
      recentAbnormalAbdominalDistension: Boolean(
        screeningRes.data.recent_abnormal_abdominal_distension
      ),
      renalDiseaseKnown: Boolean(screeningRes.data.renal_disease_known),
      cardiovascularOrMetabolicCondition: Boolean(
        screeningRes.data.cardiovascular_or_metabolic_condition
      ),
      relevantMedication: screeningRes.data.relevant_medication ?? '',
      jointPainAreas: screeningRes.data.joint_pain_areas ?? [],
      jointPainNotes: screeningRes.data.joint_pain_notes ?? '',
      impactTolerance: screeningRes.data.impact_tolerance,
      priorExperience: screeningRes.data.prior_experience ?? '',
      preferredDays: screeningRes.data.preferred_days ?? [1, 2, 3, 5, 6, 7],
      sessionDurationMinutes: Number(screeningRes.data.session_duration_minutes),
      evaluatedAt: screeningRes.data.evaluated_at,
    };
  }

  if (equipmentRes.data && equipmentRes.data.length > 0) {
    base.equipment = equipmentRes.data.map((eq) => ({
      slug: eq.slug,
      name: eq.name,
      category: eq.category,
      isAvailable: Boolean(eq.is_available),
      isCustom: Boolean(eq.is_custom),
      availableWeightsKg: (eq.available_weights_kg ?? []).map(Number),
      weightsDescription: eq.weights_description ?? '',
    }));
  }

  if (measurementsRes.data && measurementsRes.data.length > 0) {
    base.bodyMeasurements = measurementsRes.data.map((m) => ({
      id: m.id,
      measuredOn: m.measured_on,
      sourceType: m.source_type,
      weightKg: m.weight_kg !== null ? Number(m.weight_kg) : null,
      waistCm: m.waist_cm !== null ? Number(m.waist_cm) : null,
      hipCm: m.hip_cm !== null ? Number(m.hip_cm) : null,
      bodyFatPctEstimate:
        m.body_fat_pct_estimate !== null ? Number(m.body_fat_pct_estimate) : null,
      visceralFatRating:
        m.visceral_fat_rating !== null ? Number(m.visceral_fat_rating) : null,
      visceralScaleDevice: m.visceral_scale_device ?? 'Báscula doméstica',
      muscleMassKgEstimate:
        m.muscle_mass_kg_estimate !== null ? Number(m.muscle_mass_kg_estimate) : null,
      bodyWaterPctEstimate:
        m.body_water_pct_estimate !== null ? Number(m.body_water_pct_estimate) : null,
      boneMassKgEstimate:
        m.bone_mass_kg_estimate !== null ? Number(m.bone_mass_kg_estimate) : null,
      scaleProteinPctEstimate:
        m.scale_protein_pct_estimate !== null ? Number(m.scale_protein_pct_estimate) : null,
      scaleBmiReported:
        m.scale_bmi_reported !== null ? Number(m.scale_bmi_reported) : null,
      scaleBmrReported:
        m.scale_bmr_reported !== null ? Number(m.scale_bmr_reported) : null,
      restingHrBpm: m.resting_hr_bpm !== null ? Number(m.resting_hr_bpm) : null,
      photoDataUrl: m.photo_storage_path,
      isAnomalous: Boolean(m.is_anomalous),
      anomalyConfirmedByUser: Boolean(m.anomaly_confirmed_by_user),
      notes: m.notes ?? '',
      createdAt: m.created_at,
    }));
  }

  if (nutritionRes.data) {
    base.nutritionLogs = nutritionRes.data.map((n) => ({
      id: n.id,
      loggedOn: n.logged_on,
      mealSlot: n.meal_slot,
      entryName: n.entry_name,
      foodSlug: null,
      recipeId: n.recipe_id,
      dataSource: n.data_source,
      quantity: Number(n.quantity),
      unit: n.unit,
      gramsEquivalent: Number(n.grams_equivalent),
      kcal: Number(n.kcal),
      proteinG: Number(n.protein_g),
      carbsG: Number(n.carbs_g),
      fatG: Number(n.fat_g),
      fiberG: Number(n.fiber_g),
      isHabitual: Boolean(n.is_habitual),
      notes: n.notes ?? '',
      clientDedupKey: n.client_dedup_key,
      createdAt: n.created_at,
    }));
  }

  if (completedRes.data) {
    base.completedSessions = completedRes.data.map((cs) => ({
      id: cs.id,
      plannedSessionId: cs.planned_session_id,
      sessionType: cs.session_type,
      title: cs.title,
      performedOn: cs.performed_on,
      durationMinutes: Number(cs.duration_minutes),
      perceivedRpe: Number(cs.perceived_rpe),
      completedFully: Boolean(cs.completed_fully),
      feltDiscomfort: Boolean(cs.felt_discomfort),
      discomfortNotes: cs.discomfort_notes ?? '',
      readinessNext: cs.readiness_next,
      estimatedKcal: cs.estimated_kcal !== null ? Number(cs.estimated_kcal) : null,
      sets: (cs.performed_sets ?? []).map((s: Record<string, unknown>) => ({
        exerciseSlug: String(s.exercise_slug),
        exerciseName: String(s.exercise_name),
        setIndex: Number(s.set_index),
        targetReps: Number(s.target_reps ?? 8),
        repsCompleted: Number(s.reps_completed),
        loadKg: Number(s.load_kg),
        rpe: Number(s.rpe ?? 8),
        restSeconds: Number(s.rest_seconds ?? 90),
      })),
      notes: cs.notes ?? '',
      clientDedupKey: cs.client_dedup_key,
      createdAt: cs.created_at,
    }));
  }

  if (runningProgRes.data) {
    base.running = {
      currentStage: Number(runningProgRes.data.current_stage),
      walkSeconds: Number(runningProgRes.data.walk_seconds),
      runSeconds: Number(runningProgRes.data.run_seconds),
      repetitions: Number(runningProgRes.data.repetitions),
      longestContinuousMinutes: Number(runningProgRes.data.longest_continuous_minutes),
      longestDistanceKm: Number(runningProgRes.data.longest_distance_km),
      hasSportsWatch: Boolean(runningProgRes.data.has_sports_watch),
      hasTreadmill: Boolean(runningProgRes.data.has_treadmill),
      halfMarathonReadyBase: Boolean(runningProgRes.data.half_marathon_ready_base),
      updatedAt: runningProgRes.data.updated_at,
    };
  }

  if (runningLogsRes.data) {
    base.runningLogs = runningLogsRes.data.map((rl) => ({
      id: rl.id,
      stageAtTime: Number(rl.stage_at_time),
      performedOn: rl.performed_on,
      workoutMode: rl.workout_mode,
      walkSeconds: Number(rl.walk_seconds ?? 0),
      runSeconds: Number(rl.run_seconds ?? 0),
      repetitions: Number(rl.repetitions ?? 1),
      durationMinutes: Number(rl.duration_minutes),
      distanceKm: rl.distance_km !== null ? Number(rl.distance_km) : null,
      avgHeartRate: rl.avg_heart_rate !== null ? Number(rl.avg_heart_rate) : null,
      routeDescription: rl.route_description ?? '',
      perceivedRpe: Number(rl.perceived_rpe),
      jointDiscomfort: Number(rl.joint_discomfort),
      discomfortLocation: rl.discomfort_location ?? '',
      notes: rl.notes ?? '',
      clientDedupKey: rl.client_dedup_key,
      createdAt: rl.created_at,
    }));
  }

  if (goalsRes.data && goalsRes.data.length > 0) {
    const msRows = milestonesRes.data ?? [];
    base.goals = goalsRes.data.map((g) => ({
      id: g.id,
      goalType: g.goal_type,
      title: g.title,
      description: g.description ?? '',
      startValue: Number(g.start_value ?? 0),
      currentValue: Number(g.current_value ?? 0),
      targetValue: Number(g.target_value ?? 0),
      unit: g.unit,
      status: g.status,
      milestones: msRows
        .filter((m) => m.goal_id === g.id)
        .map((m) => ({
          id: m.id,
          label: m.label,
          targetValue: Number(m.target_value),
          unit: m.unit,
          sortOrder: Number(m.sort_order),
          isReached: Boolean(m.is_reached),
          reachedOn: m.reached_on,
        })),
    }));
  }

  if (recsRes.data && recsRes.data.length > 0) {
    base.recommendations = recsRes.data.map((r) => ({
      id: r.id,
      ruleCode: r.rule_code,
      area: r.area,
      severity: r.severity,
      title: r.title,
      reason: r.reason,
      proposedAction: r.proposed_action,
      actionPayload: r.action_payload ?? { type: 'keep_course' },
      status: r.status,
      userNote: r.user_note ?? '',
      createdAt: r.created_at,
      decidedAt: r.decided_at,
    }));
  }

  return base;
}

async function syncStateToSupabaseTables(userId: string, state: Forma360State): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  await supabase.from('profiles').upsert({
    user_id: userId,
    display_name: state.profile.displayName,
    age: state.profile.age,
    sex_reference: state.profile.sexReference,
    height_cm: state.profile.heightCm,
    height_confirmed: state.profile.heightConfirmed,
    initial_weight_kg: state.profile.initialWeightKg,
    target_weight_kg: state.profile.targetWeightKg,
    scale_reported_bmi: state.profile.scaleReportedBmi,
    scale_reported_bmr_kcal: state.profile.scaleReportedBmrKcal,
    bmr_verified: state.profile.bmrVerified,
    fitness_level: state.profile.fitnessLevel,
    primary_goal: state.profile.primaryGoal,
    long_term_sport_goal: state.profile.longTermSportGoal,
    timezone: state.profile.timezone,
    onboarding_completed: state.profile.onboardingCompleted,
  });

  await supabase.from('user_preferences').upsert({
    user_id: userId,
    theme: state.preferences.theme,
    locale: state.preferences.locale,
    excluded_foods: state.preferences.excludedFoods,
    dietary_notes: state.preferences.dietaryNotes,
    meals_pattern: state.preferences.mealsPattern,
    activity_factor: state.preferences.activityFactor,
    target_deficit_kcal: state.preferences.targetDeficitKcal,
    protein_g_per_kg_target: state.preferences.proteinGPerKgTarget,
    maintenance_mode: state.preferences.maintenanceMode,
    notifications_enabled: state.preferences.notificationsEnabled,
  });

  await supabase.from('running_progressions').upsert({
    user_id: userId,
    current_stage: state.running.currentStage,
    walk_seconds: state.running.walkSeconds,
    run_seconds: state.running.runSeconds,
    repetitions: state.running.repetitions,
    longest_continuous_minutes: state.running.longestContinuousMinutes,
    longest_distance_km: state.running.longestDistanceKm,
    has_sports_watch: state.running.hasSportsWatch,
    has_treadmill: state.running.hasTreadmill,
    half_marathon_ready_base: state.running.halfMarathonReadyBase,
  });

  if (state.equipment.length > 0) {
    await supabase.from('user_equipment').upsert(
      state.equipment.map((eq) => ({
        user_id: userId,
        slug: eq.slug,
        name: eq.name,
        category: eq.category,
        is_available: eq.isAvailable,
        is_custom: eq.isCustom,
        available_weights_kg: eq.availableWeightsKg,
        weights_description: eq.weightsDescription,
      })),
      { onConflict: 'user_id,slug' }
    );
  }

  if (state.nutritionLogs.length > 0) {
    await supabase.from('nutrition_logs').upsert(
      state.nutritionLogs.map((n) => ({
        user_id: userId,
        logged_on: n.loggedOn,
        meal_slot: n.mealSlot,
        entry_name: n.entryName,
        data_source: n.dataSource,
        quantity: n.quantity,
        unit: n.unit,
        grams_equivalent: n.gramsEquivalent,
        kcal: n.kcal,
        protein_g: n.proteinG,
        carbs_g: n.carbsG,
        fat_g: n.fatG,
        fiber_g: n.fiberG,
        is_habitual: n.isHabitual,
        notes: n.notes,
        client_dedup_key: n.clientDedupKey,
      })),
      { onConflict: 'user_id,client_dedup_key' }
    );
  }

  if (state.runningLogs.length > 0) {
    await supabase.from('running_logs').upsert(
      state.runningLogs.map((rl) => ({
        user_id: userId,
        stage_at_time: rl.stageAtTime,
        performed_on: rl.performedOn,
        workout_mode: rl.workoutMode,
        walk_seconds: rl.walkSeconds,
        run_seconds: rl.runSeconds,
        repetitions: rl.repetitions,
        duration_minutes: rl.durationMinutes,
        distance_km: rl.distanceKm,
        avg_heart_rate: rl.avgHeartRate,
        route_description: rl.routeDescription,
        perceived_rpe: rl.perceivedRpe,
        joint_discomfort: rl.jointDiscomfort,
        discomfort_location: rl.discomfortLocation,
        notes: rl.notes,
        client_dedup_key: rl.clientDedupKey,
      })),
      { onConflict: 'user_id,client_dedup_key' }
    );
  }
}
