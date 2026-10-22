'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createCustomEquipmentItem } from '@/lib/domain/equipment';
import {
  adaptPlanToEquipmentChange,
  evaluatePostWorkoutProgression,
  generateTrainingPlan,
  reschedulePlannedSession,
} from '@/lib/domain/planner';
import { detectMeasurementAnomaly } from '@/lib/domain/physiology';
import { generateSmartRecommendations } from '@/lib/domain/recommendations';
import { generateId, todayIsoInTimezone } from '@/lib/format';
import {
  appendCompletedSessionDeduped,
  appendNutritionLogDeduped,
  appendRunningLogDeduped,
  appendSportActivityDeduped,
  AuthSessionUser,
  deleteAccountAndAllData,
  enterQuickDemoProfile,
  getActiveSessionUser,
  loadUserState,
  persistUserState,
  registerAccount,
  signInAccount,
  signOutAccount,
} from '@/lib/persistence/repository';
import { getSupabasePublicEnv } from '@/lib/supabase/config';
import {
  BodyMeasurementEntry,
  CompletedSessionLog,
  CustomRecipe,
  EquipmentCategory,
  ExerciseItem,
  FoodItem,
  Forma360State,
  NavSectionId,
  NutritionLogEntry,
  RecommendationItem,
  RunningProgressionState,
  RunningSessionLog,
  SafetyScreening,
  ThemeMode,
  TrainingPlan,
  UserGoal,
  UserPreferences,
  UserProfile,
  WellbeingEntry,
} from '@/lib/types';

export interface ToastNotice {
  id: string;
  tone: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface Forma360ContextValue {
  user: AuthSessionUser | null;
  state: Forma360State | null;
  loading: boolean;
  isSupabaseCloud: boolean;
  activeSection: NavSectionId;
  setActiveSection: (section: NavSectionId) => void;
  selectedSessionForLogId: string | null;
  startLoggingPlannedSession: (sessionId: string) => void;
  toasts: ToastNotice[];
  notify: (message: string, tone?: ToastNotice['tone']) => void;
  dismissToast: (id: string) => void;

  // Auth actions
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ ok: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  openDemoProfile: () => Promise<void>;
  logout: () => Promise<void>;
  deleteMyAccount: () => Promise<{ ok: boolean; error?: string }>;

  // Domain actions
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  saveSafetyScreening: (screening: Omit<SafetyScreening, 'id' | 'evaluatedAt'>, regeneratePlan?: boolean) => Promise<void>;

  // Equipment & exercises
  toggleEquipment: (slug: string, isAvailable: boolean) => Promise<number>;
  updateEquipmentWeights: (slug: string, weightsKg: number[], description: string) => Promise<void>;
  addCustomEquipment: (name: string, category: EquipmentCategory, description: string) => Promise<void>;
  saveExerciseNote: (slug: string, note: string) => Promise<void>;
  addCustomExercise: (exercise: Omit<ExerciseItem, 'id' | 'isCustom'>) => Promise<void>;

  // Plan & sessions
  regeneratePlan: (focus?: TrainingPlan['focus'], durationWeeks?: number) => Promise<void>;
  regenerateCurrentWeekOnly: (weekNumber: number) => Promise<void>;
  moveSessionToDate: (sessionId: string, newDateIso: string, newDayOfWeek: number) => Promise<string | null>;
  logCompletedWorkout: (
    session: Omit<CompletedSessionLog, 'id' | 'createdAt'>
  ) => Promise<{ saved: boolean; progressionMessage: string }>;
  deleteCompletedWorkout: (id: string) => Promise<void>;
  addRecurringOrManualSport: (params: {
    sportName: string;
    performedOn: string | null;
    recurringDayOfWeek: number | null;
    isRecurring: boolean;
    durationMinutes: number;
    effortLevel: 'light' | 'moderate' | 'high' | 'maximal';
    perceivedRpe: number;
    notes: string;
  }) => Promise<boolean>;

  // Running
  updateRunningConfig: (patch: Partial<RunningProgressionState>) => Promise<void>;
  logRunningSession: (
    entry: Omit<RunningSessionLog, 'id' | 'createdAt'>
  ) => Promise<{ saved: boolean }>;

  // Nutrition
  logNutritionEntry: (
    entry: Omit<NutritionLogEntry, 'id' | 'createdAt'>,
    allowExplicitCopy?: boolean
  ) => Promise<{ saved: boolean }>;
  deleteNutritionEntry: (id: string) => Promise<void>;
  addCustomFood: (food: Omit<FoodItem, 'id' | 'isCustom'>) => Promise<void>;
  addCustomRecipe: (recipe: CustomRecipe) => Promise<void>;
  importNutritionBatch: (entries: NutritionLogEntry[]) => Promise<number>;

  // Body & Wellbeing
  addBodyMeasurement: (
    input: Omit<
      BodyMeasurementEntry,
      'id' | 'createdAt' | 'isAnomalous' | 'anomalyReason' | 'anomalyConfirmedByUser'
    >,
    forceConfirmAnomaly?: boolean
  ) => Promise<{ saved: boolean; requiresConfirmation?: boolean; anomalyReason?: string }>;
  confirmMeasurementAnomaly: (id: string) => Promise<void>;
  deleteBodyMeasurement: (id: string) => Promise<void>;
  saveWellbeingEntry: (entry: Omit<WellbeingEntry, 'id'>) => Promise<void>;

  // Goals & Recommendations
  upsertGoal: (goal: UserGoal) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  toggleMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  decideRecommendation: (
    recId: string,
    decision: 'accepted' | 'modified' | 'rejected',
    note?: string
  ) => Promise<void>;
}

const Forma360Context = createContext<Forma360ContextValue | null>(null);

export function Forma360Provider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [state, setState] = useState<Forma360State | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<NavSectionId>('dashboard');
  const [selectedSessionForLogId, setSelectedSessionForLogId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const isSupabaseCloud = getSupabasePublicEnv().isConfigured;

  const notify = useCallback((message: string, tone: ToastNotice['tone'] = 'success') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev.slice(-3), { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Carga inicial de sesión y estado
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const activeUser = await getActiveSessionUser();
        if (!mounted) return;
        if (activeUser) {
          setUser(activeUser);
          const loaded = await loadUserState(activeUser);
          if (mounted) {
            setState(loaded);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Sincronización de tema Claro / Oscuro / Sistema
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const mode = state?.preferences.theme ?? 'system';
    const root = document.documentElement;
    const apply = () => {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldDark = mode === 'dark' || (mode === 'system' && prefersDark);
      root.classList.toggle('dark', shouldDark);
    };
    apply();
    if (mode === 'system' && typeof window !== 'undefined') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
    return undefined;
  }, [state?.preferences.theme]);

  // Helper central de guardado con refresco de recomendaciones
  const commitState = useCallback(
    async (updater: (prev: Forma360State) => Forma360State) => {
      if (!user || !state) return;
      const updatedRaw = updater(state);
      const refDate = todayIsoInTimezone(updatedRaw.profile.timezone);
      const withRecs: Forma360State = {
        ...updatedRaw,
        recommendations: generateSmartRecommendations(updatedRaw, refDate),
      };
      setState(withRecs);
      await persistUserState(user, withRecs);
    },
    [user, state]
  );

  // --- AUTENTICACIÓN ---
  const login = useCallback(async (email: string, password: string) => {
    const res = await signInAccount(email, password);
    if (!res.user) {
      return { ok: false, error: res.error ?? 'No se pudo iniciar sesión.' };
    }
    setUser(res.user);
    const loaded = await loadUserState(res.user);
    setState(loaded);
    setActiveSection('dashboard');
    notify(`Sesión iniciada como ${res.user.email}`, 'success');
    return { ok: true };
  }, [notify]);

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await registerAccount(email, password, displayName);
      if (res.requiresEmailConfirmation) {
        notify('Revisa tu correo electrónico para confirmar tu cuenta en Supabase.', 'info');
        return { ok: true, requiresEmailConfirmation: true };
      }
      if (!res.user) {
        return { ok: false, error: res.error ?? 'Error al registrar usuario.' };
      }
      setUser(res.user);
      const loaded = await loadUserState(res.user);
      setState(loaded);
      setActiveSection('dashboard');
      notify(`Cuenta creada: bienvenido a Forma360, ${res.user.displayName}`, 'success');
      return { ok: true };
    },
    [notify]
  );

  const openDemoProfile = useCallback(async () => {
    const demoUser = enterQuickDemoProfile();
    setUser(demoUser);
    const loaded = await loadUserState(demoUser);
    setState(loaded);
    setActiveSection('dashboard');
  }, []);

  const logout = useCallback(async () => {
    await signOutAccount();
    setUser(null);
    setState(null);
    notify('Sesión cerrada correctamente. Tus datos permanecen guardados.', 'info');
  }, [notify]);

  const deleteMyAccount = useCallback(async () => {
    if (!user) return { ok: false, error: 'Sin sesión activa.' };
    const result = await deleteAccountAndAllData(user);
    if (result.ok) {
      setUser(null);
      setState(null);
      notify('Cuenta y todos los registros asociados eliminados.', 'warning');
    }
    return result;
  }, [user, notify]);

  // --- PERFIL Y CUESTIONARIO ---
  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      await commitState((prev) => {
        const nextProfile = {
          ...prev.profile,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        const nextGoals = prev.goals.map((g) =>
          g.goalType === 'weight' && patch.targetWeightKg !== undefined
            ? { ...g, targetValue: patch.targetWeightKg }
            : g
        );
        return { ...prev, profile: nextProfile, goals: nextGoals };
      });
      notify('Perfil actualizado y cálculos metabólicos ajustados.', 'success');
    },
    [commitState, notify]
  );

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      await commitState((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, ...patch },
      }));
      notify('Preferencias guardadas.', 'success');
    },
    [commitState, notify]
  );

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      await commitState((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, theme: mode },
      }));
    },
    [commitState]
  );

  const saveSafetyScreening = useCallback(
    async (
      screeningInput: Omit<SafetyScreening, 'id' | 'evaluatedAt'>,
      regenerate = true
    ) => {
      await commitState((prev) => {
        const screening: SafetyScreening = {
          ...screeningInput,
          id: generateId('scr'),
          evaluatedAt: new Date().toISOString(),
        };
        const updatedProfile: UserProfile = {
          ...prev.profile,
          onboardingCompleted: true,
          updatedAt: new Date().toISOString(),
        };
        const nextPlan = regenerate
          ? generateTrainingPlan({
              profile: updatedProfile,
              screening,
              equipment: prev.equipment,
              customExercises: prev.customExercises,
              startDateIso: prev.plan.startDate,
              planFocus: prev.plan.focus,
              durationWeeks: prev.plan.durationWeeks,
            })
          : prev.plan;

        return {
          ...prev,
          profile: updatedProfile,
          screening,
          plan: nextPlan,
        };
      });
      notify('Evaluación de salud y disponibilidad guardada.', 'success');
    },
    [commitState, notify]
  );

  // --- EQUIPAMIENTO Y CATÁLOGO DE EJERCICIOS ---
  const toggleEquipment = useCallback(
    async (slug: string, isAvailable: boolean): Promise<number> => {
      let swapped = 0;
      await commitState((prev) => {
        const nextEquipment = prev.equipment.map((eq) =>
          eq.slug === slug ? { ...eq, isAvailable } : eq
        );
        const allowAdvancedCore =
          (prev.profile.fitnessLevel === 'intermediate' ||
            prev.profile.fitnessLevel === 'advanced') &&
          !prev.screening.jointPainAreas.includes('lumbar');

        const { updatedPlan, swappedCount } = adaptPlanToEquipmentChange(
          prev.plan,
          nextEquipment,
          prev.customExercises,
          allowAdvancedCore
        );
        swapped = swappedCount;
        return {
          ...prev,
          equipment: nextEquipment,
          plan: updatedPlan,
        };
      });
      notify(
        swapped > 0
          ? `Equipamiento actualizado: ${swapped} ejercicios adaptados en tus próximas sesiones sin perder historial.`
          : 'Disponibilidad de equipamiento actualizada.',
        'info'
      );
      return swapped;
    },
    [commitState, notify]
  );

  const updateEquipmentWeights = useCallback(
    async (slug: string, weightsKg: number[], description: string) => {
      await commitState((prev) => ({
        ...prev,
        equipment: prev.equipment.map((eq) =>
          eq.slug === slug
            ? { ...eq, availableWeightsKg: weightsKg, weightsDescription: description }
            : eq
        ),
      }));
      notify('Pesos y detalle de material guardados.', 'success');
    },
    [commitState, notify]
  );

  const addCustomEquipment = useCallback(
    async (name: string, category: EquipmentCategory, description: string) => {
      await commitState((prev) => ({
        ...prev,
        equipment: [
          ...prev.equipment,
          createCustomEquipmentItem(name, category, description),
        ],
      }));
      notify(`Material "${name}" añadido a tu inventario.`, 'success');
    },
    [commitState, notify]
  );

  const saveExerciseNote = useCallback(
    async (slug: string, note: string) => {
      await commitState((prev) => ({
        ...prev,
        exerciseNotes: { ...prev.exerciseNotes, [slug]: note },
      }));
      notify('Nota personal guardada en la ficha del ejercicio.', 'success');
    },
    [commitState, notify]
  );

  const addCustomExercise = useCallback(
    async (exercise: Omit<ExerciseItem, 'id' | 'isCustom'>) => {
      await commitState((prev) => ({
        ...prev,
        customExercises: [
          ...prev.customExercises,
          { ...exercise, id: generateId('cust-ex'), isCustom: true },
        ],
      }));
      notify(`Ejercicio personalizado "${exercise.name}" añadido a tu biblioteca.`, 'success');
    },
    [commitState, notify]
  );

  // --- PLANIFICACIÓN Y SESIONES ---
  const regeneratePlan = useCallback(
    async (focus?: TrainingPlan['focus'], durationWeeks = 8) => {
      await commitState((prev) => {
        const refDate = todayIsoInTimezone(prev.profile.timezone);
        const fresh = generateTrainingPlan({
          profile: prev.profile,
          screening: prev.screening,
          equipment: prev.equipment,
          customExercises: prev.customExercises,
          startDateIso: refDate,
          planFocus: focus ?? prev.plan.focus,
          durationWeeks,
        });
        return {
          ...prev,
          plan: {
            ...fresh,
            versions: [
              ...prev.plan.versions,
              {
                versionNumber: prev.plan.versions.length + 1,
                changeReason: `Plan regenerado (${durationWeeks} semanas · enfoque ${focus ?? prev.plan.focus}).`,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        };
      });
      notify('Nuevo plan multissemanal generado.', 'success');
    },
    [commitState, notify]
  );

  const regenerateCurrentWeekOnly = useCallback(
    async (weekNumber: number) => {
      await commitState((prev) => {
        const freshTemplate = generateTrainingPlan({
          profile: prev.profile,
          screening: prev.screening,
          equipment: prev.equipment,
          customExercises: prev.customExercises,
          startDateIso: prev.plan.startDate,
          planFocus: prev.plan.focus,
          durationWeeks: prev.plan.durationWeeks,
        });

        const completedDatesOrDays = new Set(
          prev.plan.sessions
            .filter((s) => s.weekNumber === weekNumber && s.status === 'completed')
            .map((s) => s.dayOfWeek)
        );

        const mergedSessions = prev.plan.sessions.map((existing) => {
          if (existing.weekNumber !== weekNumber || existing.status === 'completed') {
            return existing;
          }
          if (completedDatesOrDays.has(existing.dayOfWeek)) {
            return existing;
          }
          const replacement = freshTemplate.sessions.find(
            (cand) => cand.weekNumber === weekNumber && cand.dayOfWeek === existing.dayOfWeek
          );
          return replacement ? { ...replacement, id: existing.id } : existing;
        });

        return {
          ...prev,
          plan: {
            ...prev.plan,
            sessions: mergedSessions,
            versions: [
              ...prev.plan.versions,
              {
                versionNumber: prev.plan.versions.length + 1,
                changeReason: `Semana ${weekNumber} regenerada conservando las sesiones ya completadas.`,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        };
      });
      notify(`Semana ${weekNumber} reorganizada respetando tus entrenamientos ya realizados.`, 'info');
    },
    [commitState, notify]
  );

  const moveSessionToDate = useCallback(
    async (sessionId: string, newDateIso: string, newDayOfWeek: number) => {
      let warningText: string | null = null;
      await commitState((prev) => {
        const { updatedPlan, warning } = reschedulePlannedSession(
          prev.plan,
          sessionId,
          newDateIso,
          newDayOfWeek
        );
        warningText = warning;
        return { ...prev, plan: updatedPlan };
      });
      if (warningText) {
        notify(warningText, 'warning');
      } else {
        notify('Sesión reprogramada correctamente.', 'success');
      }
      return warningText;
    },
    [commitState, notify]
  );

  const startLoggingPlannedSession = useCallback((sessionId: string) => {
    setSelectedSessionForLogId(sessionId);
    setActiveSection('workouts');
  }, []);

  const logCompletedWorkout = useCallback(
    async (sessionInput: Omit<CompletedSessionLog, 'id' | 'createdAt'>) => {
      let wasDuplicate = false;
      const newRecord: CompletedSessionLog = {
        ...sessionInput,
        id: generateId('cs'),
        createdAt: new Date().toISOString(),
      };
      const progressionEval = evaluatePostWorkoutProgression(newRecord);

      await commitState((prev) => {
        const { list, duplicateIgnored } = appendCompletedSessionDeduped(
          prev.completedSessions,
          newRecord
        );
        wasDuplicate = duplicateIgnored;
        if (duplicateIgnored) {
          return prev;
        }

        // Marcar sesión prevista como completada y actualizar carga orientativa en la siguiente sesión
        const maxLoadBySlug = new Map<string, number>();
        for (const s of newRecord.sets) {
          const cur = maxLoadBySlug.get(s.exerciseSlug) ?? 0;
          if (s.loadKg > cur) maxLoadBySlug.set(s.exerciseSlug, s.loadKg);
        }

        const updatedSessions = prev.plan.sessions.map((ps) => {
          if (ps.id === newRecord.plannedSessionId) {
            return { ...ps, status: 'completed' as const };
          }
          if (ps.status === 'pending' && maxLoadBySlug.size > 0) {
            return {
              ...ps,
              exercises: ps.exercises.map((ex) => {
                const used = maxLoadBySlug.get(ex.exerciseSlug);
                if (used === undefined) return ex;
                const proposed = Math.max(0, used + progressionEval.deltaKg);
                return { ...ex, suggestedLoadKg: proposed };
              }),
            };
          }
          return ps;
        });

        return {
          ...prev,
          completedSessions: list,
          plan: { ...prev.plan, sessions: updatedSessions },
        };
      });

      if (wasDuplicate) {
        notify('Registro duplicado detectado: ya habías guardado esta sesión hoy.', 'warning');
        return { saved: false, progressionMessage: 'Duplicado evitado.' };
      }

      notify('Sesión guardada. ' + progressionEval.summary, 'success');
      return { saved: true, progressionMessage: progressionEval.summary };
    },
    [commitState, notify]
  );

  const deleteCompletedWorkout = useCallback(
    async (id: string) => {
      await commitState((prev) => ({
        ...prev,
        completedSessions: prev.completedSessions.filter((s) => s.id !== id),
      }));
      notify('Registro de sesión eliminado.', 'info');
    },
    [commitState, notify]
  );

  const addRecurringOrManualSport = useCallback(
    async (params: {
      sportName: string;
      performedOn: string | null;
      recurringDayOfWeek: number | null;
      isRecurring: boolean;
      durationMinutes: number;
      effortLevel: 'light' | 'moderate' | 'high' | 'maximal';
      perceivedRpe: number;
      notes: string;
    }) => {
      let dup = false;
      await commitState((prev) => {
        const { list, duplicateIgnored } = appendSportActivityDeduped(prev.sportActivities, {
          id: generateId('sport'),
          ...params,
          clientDedupKey: `sport:${params.sportName}:${params.performedOn ?? params.recurringDayOfWeek}`,
        });
        dup = duplicateIgnored;
        return duplicateIgnored ? prev : { ...prev, sportActivities: list };
      });
      if (dup) {
        notify('Esa actividad deportiva ya figura registrada.', 'warning');
        return false;
      }
      notify('Actividad deportiva añadida a tu carga semanal.', 'success');
      return true;
    },
    [commitState, notify]
  );

  // --- CARRERA Y MEDIA MARATÓN ---
  const updateRunningConfig = useCallback(
    async (patch: Partial<RunningProgressionState>) => {
      await commitState((prev) => ({
        ...prev,
        running: {
          ...prev.running,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      }));
      notify('Configuración de carrera actualizada.', 'success');
    },
    [commitState, notify]
  );

  const logRunningSession = useCallback(
    async (entry: Omit<RunningSessionLog, 'id' | 'createdAt'>) => {
      let dup = false;
      const newLog: RunningSessionLog = {
        ...entry,
        id: generateId('run'),
        createdAt: new Date().toISOString(),
      };

      await commitState((prev) => {
        const { list, duplicateIgnored } = appendRunningLogDeduped(prev.runningLogs, newLog);
        dup = duplicateIgnored;
        if (duplicateIgnored) return prev;

        const maxKm = Math.max(prev.running.longestDistanceKm, newLog.distanceKm ?? 0);
        const maxMin =
          newLog.workoutMode === 'easy_continuous' || newLog.workoutMode === 'long_run'
            ? Math.max(prev.running.longestContinuousMinutes, newLog.durationMinutes)
            : prev.running.longestContinuousMinutes;

        const nextGoals = prev.goals.map((g) => {
          if (g.goalType !== 'running') return g;
          return {
            ...g,
            currentValue: maxKm,
            milestones: g.milestones.map((m) =>
              maxKm >= m.targetValue && !m.isReached
                ? { ...m, isReached: true, reachedOn: newLog.performedOn }
                : m
            ),
          };
        });

        return {
          ...prev,
          runningLogs: list,
          running: {
            ...prev.running,
            longestDistanceKm: maxKm,
            longestContinuousMinutes: maxMin,
            halfMarathonReadyBase:
              prev.running.halfMarathonReadyBase ||
              (maxKm >= 8.5 && newLog.jointDiscomfort <= 2),
            updatedAt: new Date().toISOString(),
          },
          goals: nextGoals,
        };
      });

      if (dup) {
        notify('Esta sesión de carrera ya estaba registrada.', 'warning');
        return { saved: false };
      }
      notify('Sesión de carrera guardada y progresión actualizada.', 'success');
      return { saved: true };
    },
    [commitState, notify]
  );

  // --- NUTRICIÓN ---
  const logNutritionEntry = useCallback(
    async (
      entry: Omit<NutritionLogEntry, 'id' | 'createdAt'>,
      allowExplicitCopy = false
    ) => {
      let dup = false;
      const item: NutritionLogEntry = {
        ...entry,
        id: generateId('meal'),
        createdAt: new Date().toISOString(),
      };
      await commitState((prev) => {
        const { list, duplicateIgnored } = appendNutritionLogDeduped(
          prev.nutritionLogs,
          item,
          allowExplicitCopy
        );
        dup = duplicateIgnored;
        return duplicateIgnored ? prev : { ...prev, nutritionLogs: list };
      });
      if (dup) {
        notify('Se evitó guardar dos veces el mismo alimento por doble envío.', 'warning');
        return { saved: false };
      }
      notify(`Añadido: ${entry.entryName} (${Math.round(entry.kcal)} kcal).`, 'success');
      return { saved: true };
    },
    [commitState, notify]
  );

  const deleteNutritionEntry = useCallback(
    async (id: string) => {
      await commitState((prev) => ({
        ...prev,
        nutritionLogs: prev.nutritionLogs.filter((n) => n.id !== id),
      }));
      notify('Registro nutricional eliminado.', 'info');
    },
    [commitState, notify]
  );

  const addCustomFood = useCallback(
    async (food: Omit<FoodItem, 'id' | 'isCustom'>) => {
      await commitState((prev) => ({
        ...prev,
        customFoods: [...prev.customFoods, { ...food, id: generateId('food'), isCustom: true }],
      }));
      notify(`Alimento "${food.name}" guardado en tu despensa personal.`, 'success');
    },
    [commitState, notify]
  );

  const addCustomRecipe = useCallback(
    async (recipe: CustomRecipe) => {
      await commitState((prev) => ({
        ...prev,
        customRecipes: [...prev.customRecipes, recipe],
      }));
      notify(`Receta "${recipe.name}" guardada.`, 'success');
    },
    [commitState, notify]
  );

  const importNutritionBatch = useCallback(
    async (entries: NutritionLogEntry[]) => {
      let addedCount = 0;
      await commitState((prev) => {
        let acc = prev.nutritionLogs;
        for (const item of entries) {
          const res = appendNutritionLogDeduped(acc, item, true);
          if (!res.duplicateIgnored) {
            acc = res.list;
            addedCount += 1;
          }
        }
        return { ...prev, nutritionLogs: acc };
      });
      notify(`Importación CSV completada: ${addedCount} registros añadidos.`, 'success');
      return addedCount;
    },
    [commitState, notify]
  );

  // --- SEGUIMIENTO CORPORAL Y BIENESTAR ---
  const addBodyMeasurement = useCallback(
    async (
      input: Omit<
        BodyMeasurementEntry,
        'id' | 'createdAt' | 'isAnomalous' | 'anomalyReason' | 'anomalyConfirmedByUser'
      >,
      forceConfirmAnomaly = false
    ) => {
      if (!state) return { saved: false };
      const anomaly = detectMeasurementAnomaly(
        {
          measuredOn: input.measuredOn,
          weightKg: input.weightKg,
          waistCm: input.waistCm,
          scaleBmrReported: input.scaleBmrReported,
        },
        state.bodyMeasurements
      );

      if (anomaly.isAnomalous && !forceConfirmAnomaly) {
        return {
          saved: false,
          requiresConfirmation: true,
          anomalyReason: anomaly.reason,
        };
      }

      const newEntry: BodyMeasurementEntry = {
        ...input,
        id: generateId('bm'),
        isAnomalous: anomaly.isAnomalous,
        anomalyReason: anomaly.reason,
        anomalyConfirmedByUser: forceConfirmAnomaly,
        createdAt: new Date().toISOString(),
      };

      await commitState((prev) => {
        const nextList = [...prev.bodyMeasurements, newEntry];
        const nextGoals = prev.goals.map((g) => {
          if (g.goalType === 'weight' && input.weightKg !== null) {
            return {
              ...g,
              currentValue: input.weightKg,
              milestones: g.milestones.map((m) =>
                input.weightKg! <= m.targetValue && !m.isReached
                  ? { ...m, isReached: true, reachedOn: input.measuredOn }
                  : m
              ),
            };
          }
          return g;
        });

        return {
          ...prev,
          bodyMeasurements: nextList,
          goals: nextGoals,
        };
      });

      notify('Medición corporal guardada y tendencias actualizadas.', 'success');
      return { saved: true };
    },
    [state, commitState, notify]
  );

  const confirmMeasurementAnomaly = useCallback(
    async (id: string) => {
      await commitState((prev) => ({
        ...prev,
        bodyMeasurements: prev.bodyMeasurements.map((m) =>
          m.id === id ? { ...m, anomalyConfirmedByUser: true } : m
        ),
      }));
      notify('Lectura confirmada e incorporada a tus medias móviles.', 'info');
    },
    [commitState, notify]
  );

  const deleteBodyMeasurement = useCallback(
    async (id: string) => {
      await commitState((prev) => ({
        ...prev,
        bodyMeasurements: prev.bodyMeasurements.filter((m) => m.id !== id),
      }));
      notify('Medición eliminada.', 'info');
    },
    [commitState, notify]
  );

  const saveWellbeingEntry = useCallback(
    async (entry: Omit<WellbeingEntry, 'id'>) => {
      await commitState((prev) => {
        const filtered = prev.wellbeingLogs.filter((w) => w.loggedOn !== entry.loggedOn);
        return {
          ...prev,
          wellbeingLogs: [...filtered, { ...entry, id: generateId('wb') }],
        };
      });
      notify('Registro de sueño, energía y digestión guardado.', 'success');
    },
    [commitState, notify]
  );

  // --- OBJETIVOS Y MOTOR DE RECOMENDACIONES ---
  const upsertGoal = useCallback(
    async (goal: UserGoal) => {
      await commitState((prev) => {
        const exists = prev.goals.some((g) => g.id === goal.id);
        const nextGoals = exists
          ? prev.goals.map((g) => (g.id === goal.id ? goal : g))
          : [...prev.goals, goal];
        const nextProfile =
          goal.goalType === 'weight'
            ? { ...prev.profile, targetWeightKg: goal.targetValue }
            : prev.profile;
        return { ...prev, goals: nextGoals, profile: nextProfile };
      });
      notify('Objetivo guardado.', 'success');
    },
    [commitState, notify]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      await commitState((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== goalId),
      }));
      notify('Objetivo eliminado.', 'info');
    },
    [commitState, notify]
  );

  const toggleMilestone = useCallback(
    async (goalId: string, milestoneId: string) => {
      await commitState((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id !== goalId
            ? g
            : {
                ...g,
                milestones: g.milestones.map((m) =>
                  m.id === milestoneId
                    ? {
                        ...m,
                        isReached: !m.isReached,
                        reachedOn: !m.isReached
                          ? todayIsoInTimezone(prev.profile.timezone)
                          : null,
                      }
                    : m
                ),
              }
        ),
      }));
    },
    [commitState]
  );

  const decideRecommendation = useCallback(
    async (
      recId: string,
      decision: 'accepted' | 'modified' | 'rejected',
      note = ''
    ) => {
      await commitState((prev) => {
        const target = prev.recommendations.find((r) => r.id === recId);
        let nextProfile = prev.profile;
        let nextPrefs = prev.preferences;
        let nextPlan = prev.plan;

        if (target && (decision === 'accepted' || decision === 'modified')) {
          if (target.actionPayload.type === 'confirm_height_and_bmr') {
            nextProfile = {
              ...prev.profile,
              heightConfirmed: true,
              bmrVerified: true,
            };
          } else if (
            target.actionPayload.type === 'adjust_calories' &&
            target.actionPayload.deltaKcal
          ) {
            nextPrefs = {
              ...prev.preferences,
              targetDeficitKcal: Math.min(
                700,
                prev.preferences.targetDeficitKcal + target.actionPayload.deltaKcal
              ),
            };
          } else if (target.actionPayload.type === 'deload_week') {
            nextPlan = {
              ...prev.plan,
              sessions: prev.plan.sessions.map((s) =>
                s.weekNumber === prev.plan.currentWeek && s.status === 'pending'
                  ? {
                      ...s,
                      expectedRpe: Math.max(5.5, s.expectedRpe - 1),
                      exercises: s.exercises.map((e) => ({
                        ...e,
                        sets: Math.max(2, e.sets - 1),
                      })),
                    }
                  : s
              ),
            };
          }
        }

        const nextRecs: RecommendationItem[] = prev.recommendations.map((r) =>
          r.id === recId
            ? {
                ...r,
                status: decision,
                userNote: note,
                decidedAt: new Date().toISOString(),
              }
            : r
        );

        return {
          ...prev,
          profile: nextProfile,
          preferences: nextPrefs,
          plan: nextPlan,
          recommendations: nextRecs,
        };
      });
      notify(
        decision === 'accepted'
          ? 'Recomendación aplicada al plan.'
          : decision === 'modified'
            ? 'Recomendación aplicada con tus notas.'
            : 'Recomendación descartada y archivada en el historial.',
        'info'
      );
    },
    [commitState, notify]
  );

  const value = useMemo<Forma360ContextValue>(
    () => ({
      user,
      state,
      loading,
      isSupabaseCloud,
      activeSection,
      setActiveSection,
      selectedSessionForLogId,
      startLoggingPlannedSession,
      toasts,
      notify,
      dismissToast,
      login,
      register,
      openDemoProfile,
      logout,
      deleteMyAccount,
      updateProfile,
      updatePreferences,
      setThemeMode,
      saveSafetyScreening,
      toggleEquipment,
      updateEquipmentWeights,
      addCustomEquipment,
      saveExerciseNote,
      addCustomExercise,
      regeneratePlan,
      regenerateCurrentWeekOnly,
      moveSessionToDate,
      logCompletedWorkout,
      deleteCompletedWorkout,
      addRecurringOrManualSport,
      updateRunningConfig,
      logRunningSession,
      logNutritionEntry,
      deleteNutritionEntry,
      addCustomFood,
      addCustomRecipe,
      importNutritionBatch,
      addBodyMeasurement,
      confirmMeasurementAnomaly,
      deleteBodyMeasurement,
      saveWellbeingEntry,
      upsertGoal,
      deleteGoal,
      toggleMilestone,
      decideRecommendation,
    }),
    [
      user,
      state,
      loading,
      isSupabaseCloud,
      activeSection,
      selectedSessionForLogId,
      startLoggingPlannedSession,
      toasts,
      notify,
      dismissToast,
      login,
      register,
      openDemoProfile,
      logout,
      deleteMyAccount,
      updateProfile,
      updatePreferences,
      setThemeMode,
      saveSafetyScreening,
      toggleEquipment,
      updateEquipmentWeights,
      addCustomEquipment,
      saveExerciseNote,
      addCustomExercise,
      regeneratePlan,
      regenerateCurrentWeekOnly,
      moveSessionToDate,
      logCompletedWorkout,
      deleteCompletedWorkout,
      addRecurringOrManualSport,
      updateRunningConfig,
      logRunningSession,
      logNutritionEntry,
      deleteNutritionEntry,
      addCustomFood,
      addCustomRecipe,
      importNutritionBatch,
      addBodyMeasurement,
      confirmMeasurementAnomaly,
      deleteBodyMeasurement,
      saveWellbeingEntry,
      upsertGoal,
      deleteGoal,
      toggleMilestone,
      decideRecommendation,
    ]
  );

  return <Forma360Context.Provider value={value}>{children}</Forma360Context.Provider>;
}

export function useForma360(): Forma360ContextValue {
  const ctx = useContext(Forma360Context);
  if (!ctx) {
    throw new Error('useForma360 debe usarse dentro de <Forma360Provider>.');
  }
  return ctx;
}
