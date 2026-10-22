import { describe, expect, it } from 'vitest';
import { createInitialForma360State } from '@/lib/domain/initial-state';
import {
  buildCustomRecipe,
  calculateFoodMacros,
  exportNutritionLogsToCsv,
  generateDailySpanishMenu,
  importNutritionLogsFromCsv,
  SPANISH_SYSTEM_FOODS,
  summarizeDailyNutrition,
} from '@/lib/domain/nutrition';
import {
  calculateEnergyNeeds,
  computeBodyTrendSummary,
  detectMeasurementAnomaly,
  suggestHeightFromWeightAndBmi,
} from '@/lib/domain/physiology';
import {
  adaptPlanToEquipmentChange,
  evaluatePostWorkoutProgression,
  reschedulePlannedSession,
} from '@/lib/domain/planner';
import { generateSmartRecommendations } from '@/lib/domain/recommendations';
import { evaluateRunningStatus } from '@/lib/domain/running';
import {
  appendCompletedSessionDeduped,
  appendNutritionLogDeduped,
  appendRunningLogDeduped,
} from '@/lib/persistence/repository';

describe('Forma360 — Perfil inicial, fisiología, seguridad y planificación adaptable', () => {
  it('inicializa el perfil real (90 kg, 35 años, IMC 25,7) sugiriendo ~187,1 cm sin darlo por definitivo y descartando las 779 kcal de TMB', () => {
    const suggested = suggestHeightFromWeightAndBmi(90, 25.7);
    expect(suggested).toBeCloseTo(187.1, 1);

    const state = createInitialForma360State({
      userId: 'u-test',
      email: 'test@forma360.es',
      storageMode: 'local',
      referenceDateIso: '2026-10-22',
    });

    expect(state.profile.heightConfirmed).toBe(false);
    expect(state.profile.bmrVerified).toBe(false);

    const energy = calculateEnergyNeeds(
      state.profile,
      state.preferences,
      90,
      state.screening,
      25.7
    );

    // Regla 4: NUNCA usa las 779 kcal/día de la báscula
    expect(energy.scaleBmrAnomalyFlagged).toBe(true);
    expect(energy.estimatedBmrKcal).toBeGreaterThan(1800);
    expect(energy.targetIntakeKcal).toBeGreaterThan(2100);
    expect(energy.appliedDeficitKcal).toBe(450);

    // Si existe patología renal, desactiva objetivos altos de proteína automáticamente
    const renalEnergy = calculateEnergyNeeds(
      state.profile,
      state.preferences,
      90,
      { ...state.screening, renalDiseaseKnown: true },
      25.7
    );
    expect(renalEnergy.renalCautionActive).toBe(true);
    expect(renalEnergy.proteinTargetGrams).toBeLessThanOrEqual(80);
  });

  it('genera el plan de 8 semanas integrando el fútbol del miércoles, semana de descarga y sustitución dinámica de equipamiento', () => {
    const state = createInitialForma360State({
      userId: 'u-plan',
      email: 'plan@forma360.es',
      storageMode: 'local',
      referenceDateIso: '2026-10-22',
    });

    expect(state.plan.sessions.length).toBe(56); // 8 semanas * 7 días estructurados

    // Miércoles es fútbol de carga alta (RPE 8) y jueves es recuperación activa
    const wed = state.plan.sessions.find((s) => s.weekNumber === 1 && s.dayOfWeek === 3)!;
    const thu = state.plan.sessions.find((s) => s.weekNumber === 1 && s.dayOfWeek === 4)!;
    expect(wed.sessionType).toBe('football');
    expect(wed.expectedRpe).toBeGreaterThanOrEqual(8);
    expect(thu.sessionType).toBe('recovery');

    // Rueda abdominal NO se prescribe automáticamente en principiante / reinicio
    const hasAutoAbWheel = state.plan.sessions.some((s) =>
      s.exercises.some((ex) => ex.exerciseSlug === 'ab-wheel-rollout')
    );
    expect(hasAutoAbWheel).toBe(false);

    // Al desactivar barra recta y activar barra de dominadas, sustituye dinámicamente
    const modifiedEquipment = state.equipment.map((eq) => {
      if (eq.slug === 'straight_bar') return { ...eq, isAvailable: false };
      if (eq.slug === 'pullup_bar') return { ...eq, isAvailable: true };
      return eq;
    });

    const { updatedPlan, swappedCount } = adaptPlanToEquipmentChange(
      state.plan,
      modifiedEquipment,
      [],
      false
    );
    expect(swappedCount).toBeGreaterThan(0);

    const week1StrengthA = updatedPlan.sessions.find(
      (s) => s.weekNumber === 1 && s.dayOfWeek === 1
    )!;
    expect(week1StrengthA.exercises[0]?.exerciseSlug).toBe('dumbbell-bench-press');

    const week1StrengthB = updatedPlan.sessions.find(
      (s) => s.weekNumber === 1 && s.dayOfWeek === 5
    )!;
    expect(
      week1StrengthB.exercises.some((e) => e.exerciseSlug === 'pull-up-bar-vertical')
    ).toBe(true);

    // Mover Fuerza A pegada al fútbol del miércoles emite aviso anti-sobrecarga
    const wedDate = wed.scheduledDate;
    const { warning } = reschedulePlannedSession(updatedPlan, week1StrengthA.id, wedDate, 3);
    expect(warning).toBeTruthy();
  });

  it('calcula media móvil de peso de 7 días, detecta lecturas anómalas y respeta recomposición corporal en recomendaciones', () => {
    const state = createInitialForma360State({
      userId: 'u-body',
      email: 'body@forma360.es',
      storageMode: 'local',
      referenceDateIso: '2026-10-01',
    });

    // Lectura anómala (+5 kg en 1 día) exige confirmación previa
    const anomaly = detectMeasurementAnomaly(
      { measuredOn: '2026-10-02', weightKg: 95.4, waistCm: null },
      state.bodyMeasurements
    );
    expect(anomaly.isAnomalous).toBe(true);

    // Simular evolución con cintura bajando 2 cm y fuerza mejorando aunque peso casi igual
    state.bodyMeasurements.push(
      {
        ...state.bodyMeasurements[0]!,
        id: 'bm-1',
        measuredOn: '2026-10-02',
        weightKg: 89.9,
        waistCm: 98.0,
      },
      {
        ...state.bodyMeasurements[0]!,
        id: 'bm-2',
        measuredOn: '2026-10-15',
        weightKg: 89.8,
        waistCm: 95.8,
      }
    );

    const trend = computeBodyTrendSummary(state.bodyMeasurements, 90, 75);
    expect(trend.waistChangeCm).toBeCloseTo(-2.2, 1);

    state.completedSessions.push(
      {
        id: 'cs-1',
        plannedSessionId: null,
        sessionType: 'strength',
        title: 'Fuerza A',
        performedOn: '2026-10-03',
        durationMinutes: 45,
        perceivedRpe: 7.5,
        completedFully: true,
        feltDiscomfort: false,
        discomfortNotes: '',
        readinessNext: 'good',
        estimatedKcal: 230,
        sets: [
          {
            exerciseSlug: 'goblet-squat',
            exerciseName: 'Sentadilla Goblet',
            setIndex: 1,
            targetReps: 10,
            repsCompleted: 10,
            loadKg: 16,
            rpe: 7.5,
            restSeconds: 90,
          },
        ],
        notes: '',
        clientDedupKey: 'k1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cs-2',
        plannedSessionId: null,
        sessionType: 'strength',
        title: 'Fuerza A',
        performedOn: '2026-10-14',
        durationMinutes: 45,
        perceivedRpe: 7.5,
        completedFully: true,
        feltDiscomfort: false,
        discomfortNotes: '',
        readinessNext: 'optimal',
        estimatedKcal: 240,
        sets: [
          {
            exerciseSlug: 'goblet-squat',
            exerciseName: 'Sentadilla Goblet',
            setIndex: 1,
            targetReps: 10,
            repsCompleted: 10,
            loadKg: 20,
            rpe: 7.5,
            restSeconds: 90,
          },
        ],
        notes: '',
        clientDedupKey: 'k2',
        createdAt: new Date().toISOString(),
      }
    );

    const prog = evaluatePostWorkoutProgression(state.completedSessions[1]!);
    expect(prog.decision).toBe('increase');

    const recs = generateSmartRecommendations(state, '2026-10-16');
    expect(recs.some((r) => r.ruleCode === 'RECOMP_KEEP_CALORIES')).toBe(true);
  });

  it('gestiona progresión Caminar-Correr, protege Media Maratón sin base y evita duplicados accidentales de sesiones, fútbol y comidas', () => {
    const state = createInitialForma360State({
      userId: 'u-run',
      email: 'run@forma360.es',
      storageMode: 'local',
      referenceDateIso: '2026-10-22',
    });

    const initialRunStatus = evaluateRunningStatus(
      state.running,
      [],
      [],
      state.sportActivities,
      '2026-10-22'
    );
    expect(initialRunStatus.halfMarathonUnlocked).toBe(false);
    expect(initialRunStatus.weeklyFootballImpactMinutes).toBe(95); // 75 mié + 20 dom

    // Anti-duplicación de partido de fútbol el mismo día
    const matchLog = {
      id: 'f1',
      plannedSessionId: null,
      sessionType: 'football' as const,
      title: 'Fútbol del miércoles (60-90 min)',
      performedOn: '2026-10-21',
      durationMinutes: 80,
      perceivedRpe: 8,
      completedFully: true,
      feltDiscomfort: false,
      discomfortNotes: '',
      readinessNext: 'good' as const,
      estimatedKcal: 650,
      sets: [],
      notes: '',
      clientDedupKey: 'football:2026-10-21:wed',
      createdAt: new Date().toISOString(),
    };
    const firstSave = appendCompletedSessionDeduped([], matchLog);
    const secondAccidentalSave = appendCompletedSessionDeduped(firstSave.list, {
      ...matchLog,
      id: 'f2',
      clientDedupKey: 'different-key-same-day-match',
    });
    expect(firstSave.duplicateIgnored).toBe(false);
    expect(secondAccidentalSave.duplicateIgnored).toBe(true);
    expect(secondAccidentalSave.list).toHaveLength(1);

    // Anti-duplicación en carrera
    const runItem = {
      id: 'r1',
      stageAtTime: 3,
      performedOn: '2026-10-22',
      workoutMode: 'walk_run_intervals' as const,
      walkSeconds: 180,
      runSeconds: 120,
      repetitions: 6,
      durationMinutes: 30,
      distanceKm: 3.5,
      avgHeartRate: 142,
      routeDescription: 'Parque',
      perceivedRpe: 5.5,
      jointDiscomfort: 0,
      discomfortLocation: '',
      notes: '',
      clientDedupKey: 'run-unique-1',
      createdAt: new Date().toISOString(),
    };
    const rFirst = appendRunningLogDeduped([], runItem);
    const rDup = appendRunningLogDeduped(rFirst.list, runItem);
    expect(rDup.duplicateIgnored).toBe(true);

    // Nutrición: excluye los 6 alimentos configurados, calcula macros, evita doble envío y soporta CSV
    const menu = generateDailySpanishMenu(2350, state.preferences.excludedFoods);
    const allGeneratedNames = menu
      .flatMap((m) => m.items.map((i) => i.foodName.toLowerCase()))
      .join(' ');
    for (const excluded of ['espinacas', 'feta', 'espárragos', 'brócoli', 'coliflor', 'pepino']) {
      expect(allGeneratedNames).not.toContain(excluded);
    }

    const chicken = SPANISH_SYSTEM_FOODS.find((f) => f.slug === 'pechuga-pollo')!;
    const macros = calculateFoodMacros(chicken, 200, 'g');
    expect(macros.kcal).toBeCloseTo(226, 0);
    expect(macros.proteinG).toBeCloseTo(45.6, 1);

    const recipe = buildCustomRecipe('Pollo con arroz post-fútbol', 1, [
      { food: chicken, grams: 200 },
      { food: SPANISH_SYSTEM_FOODS.find((f) => f.slug === 'arroz-cocido')!, grams: 200 },
    ]);
    expect(recipe.kcalPerServing).toBeCloseTo(486, 0);

    const nowIso = new Date().toISOString();
    const mealEntry = {
      id: 'm1',
      loggedOn: '2026-10-22',
      mealSlot: 'lunch' as const,
      entryName: chicken.name,
      foodSlug: chicken.slug,
      recipeId: null,
      dataSource: 'bedca_reference' as const,
      quantity: 200,
      unit: 'g' as const,
      gramsEquivalent: 200,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      carbsG: 0,
      fatG: macros.fatG,
      fiberG: 0,
      isHabitual: true,
      notes: '',
      clientDedupKey: 'meal-k1',
      createdAt: nowIso,
    };

    const mFirst = appendNutritionLogDeduped([], mealEntry);
    const mAccidentalDoubleClick = appendNutritionLogDeduped(mFirst.list, {
      ...mealEntry,
      id: 'm2',
      clientDedupKey: 'meal-k2-within-1s',
    });
    expect(mAccidentalDoubleClick.duplicateIgnored).toBe(true);

    const summary = summarizeDailyNutrition(mFirst.list, '2026-10-22');
    expect(summary.kcal).toBeCloseTo(226, 0);

    const csv = exportNutritionLogsToCsv(mFirst.list);
    const reimported = importNutritionLogsFromCsv(csv);
    expect(reimported).toHaveLength(1);
    expect(reimported[0]?.kcal).toBeCloseTo(226, 0);
  });
});
