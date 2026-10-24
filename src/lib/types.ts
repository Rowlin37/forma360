import { z } from 'zod';

export type SexReference = 'male' | 'female' | 'unspecified';
export type FitnessLevel = 'sedentary' | 'restarting_home' | 'intermediate' | 'advanced';
export type ImpactTolerance = 'low_only' | 'low_to_moderate' | 'good';
export type ThemeMode = 'light' | 'dark' | 'system';

export type NavSectionId =
  | 'dashboard'
  | 'plan'
  | 'workouts'
  | 'running'
  | 'nutrition'
  | 'body'
  | 'exercises'
  | 'stats'
  | 'goals'
  | 'profile';

export type EquipmentCategory =
  | 'cardio'
  | 'free_weights'
  | 'benches'
  | 'core'
  | 'accessories'
  | 'machines'
  | 'bodyweight';

export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'core'
  | 'running'
  | 'recovery';

export type MovementPattern =
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'knee_dominant'
  | 'hip_hinge'
  | 'unilateral_lower'
  | 'arm_isolation'
  | 'core_antiextension'
  | 'core_antirotation'
  | 'core_flexion'
  | 'cardio_low_impact'
  | 'cardio_impact'
  | 'running_drill'
  | 'mobility_flow';

export type SessionType =
  | 'strength'
  | 'cardio'
  | 'running'
  | 'football'
  | 'mobility'
  | 'recovery'
  | 'rest'
  | 'review';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodDataSource =
  | 'bedca_reference'
  | 'user_editable'
  | 'recipe_calculated'
  | 'quick_estimate'
  | 'csv_import';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  age: number;
  sexReference: SexReference;
  heightCm: number;
  heightConfirmed: boolean;
  initialWeightKg: number;
  targetWeightKg: number;
  scaleReportedBmi: number | null;
  scaleReportedBmrKcal: number | null;
  bmrVerified: boolean;
  fitnessLevel: FitnessLevel;
  primaryGoal: string;
  longTermSportGoal: string;
  timezone: string;
  onboardingCompleted: boolean;
  updatedAt: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  locale: string;
  unitSystem: 'metric';
  excludedFoods: string[];
  dietaryNotes: string;
  mealsPattern: '3_meals' | '4_meals' | '5_meals' | 'flexible';
  activityFactor: number;
  targetDeficitKcal: number;
  proteinGPerKgTarget: number;
  maintenanceMode: boolean;
  notificationsEnabled: boolean;
}

export interface SafetyScreening {
  id: string;
  chestPainOrSyncope: boolean;
  disproportionateDyspnea: boolean;
  recentAbnormalAbdominalDistension: boolean;
  renalDiseaseKnown: boolean;
  cardiovascularOrMetabolicCondition: boolean;
  relevantMedication: string;
  jointPainAreas: string[];
  jointPainNotes: string;
  impactTolerance: ImpactTolerance;
  priorExperience: string;
  preferredDays: number[]; // 1=Lunes ... 7=Domingo
  sessionDurationMinutes: number;
  evaluatedAt: string;
}

export interface EquipmentItem {
  slug: string;
  name: string;
  category: EquipmentCategory;
  isAvailable: boolean;
  isCustom: boolean;
  availableWeightsKg: number[];
  weightsDescription: string;
}

export interface ExerciseItem {
  id: string;
  slug: string;
  demoImageUrl?: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscle: string;
  secondaryMuscles: string[];
  movementPattern: MovementPattern;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  impactLevel: 'low' | 'medium' | 'high';
  physicalDemand: 1 | 2 | 3 | 4 | 5;
  requiredEquipment: string[];
  instructions: string[];
  commonErrors: string[];
  safetyTips: string[];
  easierVariants: string[];
  harderVariants: string[];
  materialSubstitutions: { missingEquipment: string; replacementSlug: string; note: string }[];
  recommendedPrescription: {
    sets: number;
    repsOrDuration: string;
    restSeconds: number;
    rpeTarget: string;
  };
  educationalNote?: string;
  personalNotes: string;
  isCustom: boolean;
}

export interface PlannedExerciseBlock {
  exerciseSlug: string;
  exerciseName: string;
  movementPattern: MovementPattern;
  sets: number;
  reps: string;
  restSeconds: number;
  suggestedLoadKg: number | null;
  rpeTarget: string;
  fallbackExerciseName: string;
  progressionCriteria: string;
  substitutedFrom?: string;
}

export interface PlannedSession {
  id: string;
  planId: string;
  weekNumber: number; // 1..8
  dayOfWeek: number; // 1=Lun .. 7=Dom
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string;
  sessionType: SessionType;
  title: string;
  objective: string;
  warmup: string;
  cooldown: string;
  estimatedMinutes: number;
  expectedRpe: number;
  impactLevel: 'low' | 'medium' | 'high';
  exercises: PlannedExerciseBlock[];
  progressionRule: string;
  status: 'pending' | 'completed' | 'rescheduled' | 'skipped';
}

export interface PlanVersionRecord {
  versionNumber: number;
  changeReason: string;
  createdAt: string;
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  focus: 'fat_loss_strength_base' | 'hypertrophy' | 'max_strength' | 'endurance_maintenance';
  durationWeeks: number;
  currentWeek: number;
  startDate: string;
  versions: PlanVersionRecord[];
  sessions: PlannedSession[];
}

export interface PerformedSetLog {
  exerciseSlug: string;
  exerciseName: string;
  setIndex: number;
  targetReps: number;
  repsCompleted: number;
  loadKg: number;
  rpe: number;
  restSeconds: number;
}

export interface CompletedSessionLog {
  id: string;
  plannedSessionId: string | null;
  sessionType: 'strength' | 'cardio' | 'running' | 'football' | 'mobility' | 'recovery';
  title: string;
  performedOn: string;
  durationMinutes: number;
  perceivedRpe: number;
  completedFully: boolean;
  feltDiscomfort: boolean;
  discomfortNotes: string;
  readinessNext: 'optimal' | 'good' | 'fatigued' | 'pain_stop';
  estimatedKcal: number | null;
  sets: PerformedSetLog[];
  notes: string;
  clientDedupKey: string;
  createdAt: string;
}

export interface SportActivityLog {
  id: string;
  sportName: string;
  performedOn: string | null;
  recurringDayOfWeek: number | null;
  isRecurring: boolean;
  durationMinutes: number;
  effortLevel: 'light' | 'moderate' | 'high' | 'maximal';
  perceivedRpe: number;
  notes: string;
  clientDedupKey: string;
}

export interface RunningProgressionState {
  currentStage: number; // 1..8
  walkSeconds: number;
  runSeconds: number;
  repetitions: number;
  longestContinuousMinutes: number;
  longestDistanceKm: number;
  hasSportsWatch: boolean;
  hasTreadmill: boolean;
  halfMarathonReadyBase: boolean;
  updatedAt: string;
}

export interface RunningSessionLog {
  id: string;
  stageAtTime: number;
  performedOn: string;
  workoutMode:
    | 'brisk_walk'
    | 'walk_run_intervals'
    | 'easy_continuous'
    | 'tempo_progressive'
    | 'long_run'
    | 'recovery';
  walkSeconds: number;
  runSeconds: number;
  repetitions: number;
  durationMinutes: number;
  distanceKm: number | null;
  avgHeartRate: number | null;
  routeDescription: string;
  perceivedRpe: number;
  jointDiscomfort: number; // 0..10
  discomfortLocation: string;
  notes: string;
  clientDedupKey: string;
  createdAt: string;
}

export interface FoodItem {
  id: string;
  slug: string;
  name: string;
  foodGroup: string;
  dataSource: FoodDataSource;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  defaultPortionName: string;
  defaultPortionGrams: number;
  tags: string[];
  isCustom: boolean;
}

export interface RecipeIngredient {
  foodSlug: string;
  foodName: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface CustomRecipe {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  kcalPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  fiberPerServing: number;
  notes: string;
  createdAt: string;
}

export interface NutritionLogEntry {
  id: string;
  loggedOn: string;
  mealSlot: MealSlot;
  entryName: string;
  foodSlug: string | null;
  recipeId: string | null;
  dataSource: FoodDataSource;
  quantity: number;
  unit: 'g' | 'ml' | 'unidad' | 'racion';
  gramsEquivalent: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  isHabitual: boolean;
  notes: string;
  clientDedupKey: string;
  createdAt: string;
}

export interface BodyMeasurementEntry {
  id: string;
  measuredOn: string;
  sourceType: 'manual' | 'xiaomi_scale_estimate' | 'mixed';
  weightKg: number | null;
  waistCm: number | null;
  hipCm: number | null;
  bodyFatPctEstimate: number | null;
  visceralFatRating: number | null;
  visceralScaleDevice: string;
  muscleMassKgEstimate: number | null;
  bodyWaterPctEstimate: number | null;
  boneMassKgEstimate: number | null;
  scaleProteinPctEstimate: number | null;
  scaleBmiReported: number | null;
  scaleBmrReported: number | null;
  restingHrBpm: number | null;
  photoDataUrl: string | null;
  isAnomalous: boolean;
  anomalyReason?: string;
  anomalyConfirmedByUser: boolean;
  notes: string;
  createdAt: string;
}

export interface GoalMilestone {
  id: string;
  label: string;
  targetValue: number;
  unit: string;
  sortOrder: number;
  isReached: boolean;
  reachedOn: string | null;
}

export interface UserGoal {
  id: string;
  goalType: 'weight' | 'waist' | 'running' | 'strength' | 'adherence' | 'custom';
  title: string;
  description: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: 'active' | 'achieved' | 'paused' | 're_evaluated';
  milestones: GoalMilestone[];
}

export interface WellbeingEntry {
  id: string;
  loggedOn: string;
  sleepHours: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  digestionQuality: 1 | 2 | 3 | 4 | 5;
  generalWellbeing: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface RecommendationItem {
  id: string;
  ruleCode: string;
  area: 'safety' | 'training' | 'running' | 'nutrition' | 'recovery' | 'body_tracking';
  severity: 'info' | 'suggestion' | 'important' | 'medical_alert';
  title: string;
  reason: string;
  proposedAction: string;
  actionPayload: {
    type:
      | 'confirm_height_and_bmr'
      | 'adjust_calories'
      | 'deload_week'
      | 'advance_running_stage'
      | 'adjust_load'
      | 'medical_stop'
      | 'keep_course';
    deltaKcal?: number;
    loadFactor?: number;
    exerciseSlug?: string;
    newLoadKg?: number;
  };
  status: 'pending' | 'accepted' | 'modified' | 'rejected';
  userNote: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface Forma360State {
  schemaVersion: number;
  storageMode: 'supabase' | 'local';
  profile: UserProfile;
  preferences: UserPreferences;
  screening: SafetyScreening;
  equipment: EquipmentItem[];
  customExercises: ExerciseItem[];
  exerciseNotes: Record<string, string>;
  plan: TrainingPlan;
  completedSessions: CompletedSessionLog[];
  sportActivities: SportActivityLog[];
  running: RunningProgressionState;
  runningLogs: RunningSessionLog[];
  customFoods: FoodItem[];
  customRecipes: CustomRecipe[];
  nutritionLogs: NutritionLogEntry[];
  bodyMeasurements: BodyMeasurementEntry[];
  goals: UserGoal[];
  wellbeingLogs: WellbeingEntry[];
  recommendations: RecommendationItem[];
}

// =============================================================================
// ESQUEMAS DE VALIDACIÓN ESTRICTA CON ZOD
// =============================================================================

export const authCredentialsSchema = z.object({
  email: z.string().trim().email('Introduce un correo electrónico válido.'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  displayName: z.string().trim().min(2, 'Introduce un nombre o alias.').optional(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, 'El nombre no puede estar vacío.'),
  age: z.number().int().min(14, 'Edad mínima 14 años.').max(105, 'Edad máxima 105 años.'),
  sexReference: z.enum(['male', 'female', 'unspecified']),
  heightCm: z
    .number()
    .min(120, 'La estatura debe ser de al menos 120 cm.')
    .max(240, 'La estatura no puede superar 240 cm.'),
  heightConfirmed: z.boolean(),
  targetWeightKg: z
    .number()
    .min(40, 'El peso objetivo debe ser razonable (>= 40 kg).')
    .max(220, 'El peso objetivo debe ser <= 220 kg.'),
  fitnessLevel: z.enum(['sedentary', 'restarting_home', 'intermediate', 'advanced']),
  timezone: z.string().trim().min(3),
});

export const bodyMeasurementInputSchema = z
  .object({
    measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.'),
    sourceType: z.enum(['manual', 'xiaomi_scale_estimate', 'mixed']),
    weightKg: z.number().min(30).max(300).nullable(),
    waistCm: z.number().min(45).max(200).nullable(),
    hipCm: z.number().min(50).max(220).nullable(),
    bodyFatPctEstimate: z.number().min(3).max(65).nullable(),
    visceralFatRating: z.number().min(1).max(59).nullable(),
    muscleMassKgEstimate: z.number().min(15).max(150).nullable(),
    bodyWaterPctEstimate: z.number().min(25).max(80).nullable(),
    boneMassKgEstimate: z.number().min(1).max(10).nullable(),
    restingHrBpm: z.number().int().min(30).max(180).nullable(),
    notes: z.string().max(500).default(''),
  })
  .refine(
    (val) =>
      val.weightKg !== null ||
      val.waistCm !== null ||
      val.bodyFatPctEstimate !== null ||
      val.visceralFatRating !== null ||
      val.muscleMassKgEstimate !== null,
    { message: 'Introduce al menos una medición (peso, cintura o composición).' }
  );

export const nutritionEntryInputSchema = z.object({
  loggedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.'),
  mealSlot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  entryName: z.string().trim().min(1, 'Indica el nombre del alimento o comida.'),
  quantity: z.number().positive('La cantidad debe ser mayor que 0.').max(5000),
  unit: z.enum(['g', 'ml', 'unidad', 'racion']),
  kcal: z.number().min(0).max(6000),
  proteinG: z.number().min(0).max(400),
  carbsG: z.number().min(0).max(800),
  fatG: z.number().min(0).max(400),
  fiberG: z.number().min(0).max(150),
});

export const goalInputSchema = z.object({
  goalType: z.enum(['weight', 'waist', 'running', 'strength', 'adherence', 'custom']),
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().trim().max(300).default(''),
  startValue: z.number(),
  currentValue: z.number(),
  targetValue: z.number(),
  unit: z.string().trim().min(1),
});
