import { generateId, todayIsoInTimezone } from '@/lib/format';
import { Forma360State, SafetyScreening, UserGoal, UserPreferences, UserProfile } from '@/lib/types';
import { createInitialEquipmentCatalog } from './equipment';
import { suggestHeightFromWeightAndBmi } from './physiology';
import { generateTrainingPlan } from './planner';
import { generateSmartRecommendations } from './recommendations';

export interface SeedProfileParams {
  userId: string;
  email: string;
  displayName?: string;
  storageMode: 'supabase' | 'local';
  referenceDateIso?: string;
}

/**
 * Construye el estado inicial exacto del usuario en Forma360 a partir de los
 * datos reales comunicados en la especificación, sin inventar progresos ficticios
 * y separando rigurosamente mediciones manuales vs estimaciones de báscula Xiaomi.
 */
export function createInitialForma360State(params: SeedProfileParams): Forma360State {
  const timezone = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'Europe/Madrid';
  const refDate = params.referenceDateIso ?? todayIsoInTimezone(timezone);
  const suggestedHeight = suggestHeightFromWeightAndBmi(90, 25.7); // 187.1 cm (pendiente de confirmar)

  const profile: UserProfile = {
    userId: params.userId,
    email: params.email,
    displayName: params.displayName?.trim() || 'Perfil Personal Forma360',
    age: 35,
    sexReference: 'male',
    heightCm: suggestedHeight,
    heightConfirmed: false, // Obligatorio confirmar durante configuración inicial
    initialWeightKg: 90.0,
    targetWeightKg: 75.0,
    scaleReportedBmi: 25.7,
    scaleReportedBmrKcal: 779, // Señalado como pendiente de verificar; NUNCA usado en dieta
    bmrVerified: false,
    fitnessLevel: 'restarting_home',
    primaryGoal: 'Reducir grasa abdominal/visceral excesiva preservando masa muscular y fuerza',
    longTermSportGoal: 'Completar una Media Maratón (21,1 km) con progresión segura',
    timezone,
    onboardingCompleted: false,
    updatedAt: new Date().toISOString(),
  };

  const preferences: UserPreferences = {
    theme: 'system',
    locale: 'es-ES',
    unitSystem: 'metric',
    excludedFoods: [
      'espinacas',
      'queso feta',
      'espárragos',
      'brócoli',
      'coliflor',
      'pepino',
    ],
    dietaryNotes: 'Comida casera española variada, priorizando saciedad y adherencia.',
    mealsPattern: '4_meals',
    activityFactor: 1.5,
    targetDeficitKcal: 450,
    proteinGPerKgTarget: 1.85,
    maintenanceMode: false,
    notificationsEnabled: false,
  };

  const screening: SafetyScreening = {
    id: generateId('scr'),
    chestPainOrSyncope: false,
    disproportionateDyspnea: false,
    recentAbnormalAbdominalDistension: false,
    renalDiseaseKnown: false,
    cardiovascularOrMetabolicCondition: false,
    relevantMedication: '',
    jointPainAreas: [],
    jointPainNotes: '',
    impactTolerance: 'low_to_moderate',
    priorExperience: 'Experiencia previa entrenando en casa + fútbol habitual miércoles y domingo',
    preferredDays: [1, 2, 3, 5, 6, 7],
    sessionDurationMinutes: 45,
    evaluatedAt: new Date().toISOString(),
  };

  const equipment = createInitialEquipmentCatalog();

  const plan = generateTrainingPlan({
    profile,
    screening,
    equipment,
    startDateIso: refDate,
    durationWeeks: 8,
  });

  const goals: UserGoal[] = [
    {
      id: 'goal-weight-main',
      goalType: 'weight',
      title: 'Recomposición corporal saludable (referencia ~75 kg)',
      description:
        'Reducir exceso de grasa abdominal y visceral conservando masa muscular. Revisable según evolución de cintura, fuerza y bienestar.',
      startValue: 90.0,
      currentValue: 90.0,
      targetValue: 75.0,
      unit: 'kg',
      status: 'active',
      milestones: [
        {
          id: 'ms-855',
          label: 'Hito 1 · Primer escalón (-5 % peso corporal)',
          targetValue: 85.5,
          unit: 'kg',
          sortOrder: 1,
          isReached: false,
          reachedOn: null,
        },
        {
          id: 'ms-810',
          label: 'Hito 2 · Consolidación (-10 % peso corporal)',
          targetValue: 81.0,
          unit: 'kg',
          sortOrder: 2,
          isReached: false,
          reachedOn: null,
        },
        {
          id: 'ms-780',
          label: 'Hito 3 · Composición atlética sostenible',
          targetValue: 78.0,
          unit: 'kg',
          sortOrder: 3,
          isReached: false,
          reachedOn: null,
        },
        {
          id: 'ms-750',
          label: 'Hito 4 · Referencia orientativa inicial (~75 kg)',
          targetValue: 75.0,
          unit: 'kg',
          sortOrder: 4,
          isReached: false,
          reachedOn: null,
        },
      ],
    },
    {
      id: 'goal-running-21k',
      goalType: 'running',
      title: 'Progresión segura hasta Media Maratón (21,1 km)',
      description:
        'Itinerario de 8 etapas sin fechas rígidas ni impacto brusco, compatible con el fútbol de los miércoles.',
      startValue: 0,
      currentValue: 0,
      targetValue: 21.1,
      unit: 'km',
      status: 'active',
      milestones: [
        { id: 'ms-run-1', label: '1 km continuo cómodo', targetValue: 1, unit: 'km', sortOrder: 1, isReached: false, reachedOn: null },
        { id: 'ms-run-5', label: 'Completar 5 km sin molestias', targetValue: 5, unit: 'km', sortOrder: 2, isReached: false, reachedOn: null },
        { id: 'ms-run-10', label: 'Completar 10 km sólidos', targetValue: 10, unit: 'km', sortOrder: 3, isReached: false, reachedOn: null },
        { id: 'ms-run-21', label: 'Meta Media Maratón 21,1 km', targetValue: 21.1, unit: 'km', sortOrder: 4, isReached: false, reachedOn: null },
      ],
    },
  ];

  const baseState: Forma360State = {
    schemaVersion: 1,
    storageMode: params.storageMode,
    profile,
    preferences,
    screening,
    equipment,
    customExercises: [],
    exerciseNotes: {},
    plan,
    completedSessions: [],
    sportActivities: [
      {
        id: 'sport-wed-football',
        sportName: 'Fútbol de los miércoles (60–90 min)',
        performedOn: null,
        recurringDayOfWeek: 3,
        isRecurring: true,
        durationMinutes: 75,
        effortLevel: 'high',
        perceivedRpe: 8.0,
        notes: 'Esfuerzo cardiovascular y neuromuscular elevado; requiere descarga el jueves.',
        clientDedupKey: 'recurring:wednesday-football',
      },
      {
        id: 'sport-sun-football',
        sportName: 'Fútbol de los domingos (~20 min)',
        performedOn: null,
        recurringDayOfWeek: 7,
        isRecurring: true,
        durationMinutes: 20,
        effortLevel: 'moderate',
        perceivedRpe: 6.0,
        notes: 'Partido breve dominical incluido en la carga semanal.',
        clientDedupKey: 'recurring:sunday-football',
      },
    ],
    running: {
      currentStage: 1,
      walkSeconds: 240,
      runSeconds: 60,
      repetitions: 6,
      longestContinuousMinutes: 0,
      longestDistanceKm: 0,
      hasSportsWatch: false,
      hasTreadmill: false,
      halfMarathonReadyBase: false,
      updatedAt: new Date().toISOString(),
    },
    runningLogs: [],
    customFoods: [],
    customRecipes: [],
    nutritionLogs: [],
    bodyMeasurements: [
      {
        id: 'bm-initial-baseline',
        measuredOn: refDate,
        sourceType: 'xiaomi_scale_estimate',
        weightKg: 90.0,
        waistCm: null,
        hipCm: null,
        bodyFatPctEstimate: 25.7,
        visceralFatRating: null,
        visceralScaleDevice: 'Báscula Xiaomi (estimación BIA doméstica)',
        muscleMassKgEstimate: 63.5,
        bodyWaterPctEstimate: 51.0,
        boneMassKgEstimate: 3.4,
        scaleProteinPctEstimate: 19.6,
        scaleBmiReported: 25.7,
        scaleBmrReported: 779,
        restingHrBpm: null,
        photoDataUrl: null,
        isAnomalous: false,
        anomalyConfirmedByUser: true,
        notes:
          'Punto de partida inicial comunicado por báscula Xiaomi. Composición corporal conservada como estimación orientativa doméstica; metabolismo basal de 779 kcal/día pendiente de verificación.',
        createdAt: new Date().toISOString(),
      },
    ],
    goals,
    wellbeingLogs: [],
    recommendations: [],
  };

  baseState.recommendations = generateSmartRecommendations(baseState, refDate);
  return baseState;
}
