import {
  BodyMeasurementEntry,
  SafetyScreening,
  UserPreferences,
  UserProfile,
} from '@/lib/types';

export interface EnergyCalculationResult {
  estimatedBmrKcal: number;
  katchMcArdleReferenceKcal: number | null;
  estimatedTdeeKcal: number;
  targetIntakeKcal: number;
  appliedDeficitKcal: number;
  proteinTargetGrams: number;
  proteinRangeGrams: [number, number];
  fatTargetGrams: number;
  carbsTargetGrams: number;
  estimatedWeeklyLossKgRange: [number, number];
  scaleBmrAnomalyFlagged: boolean;
  scaleBmrWarningMessage: string | null;
  heightConfirmationPending: boolean;
  renalCautionActive: boolean;
  minimumFloorApplied: boolean;
}

/**
 * Estima la estatura orientativa en cm a partir del peso (kg) y el IMC comunicado,
 * tal y como indica el perfil inicial (90 kg e IMC 25,7 -> ~187,1 cm).
 */
export function suggestHeightFromWeightAndBmi(weightKg: number, bmi: number): number {
  if (weightKg <= 0 || bmi <= 0) return 175;
  const meters = Math.sqrt(weightKg / bmi);
  return Math.round(meters * 1000) / 10;
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  if (heightM <= 0) return 0;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Regla obligatoria 4 y Sección 11:
 * NUNCA usa las 779 kcal/día de la báscula para calcular la dieta.
 * Calcula el metabolismo basal estimado con Mifflin-St Jeor, aplica un factor
 * de actividad prudente, protege contra déficits extremos y contextualiza la proteína.
 */
export function calculateEnergyNeeds(
  profile: UserProfile,
  preferences: UserPreferences,
  currentWeightKg: number,
  screening?: SafetyScreening,
  latestBodyFatEstimate?: number | null
): EnergyCalculationResult {
  const weight = currentWeightKg > 0 ? currentWeightKg : profile.initialWeightKg;
  const height = profile.heightCm > 0 ? profile.heightCm : 187;

  // Ecuación de Mifflin-St Jeor (estándar validado en sobrepeso y normopeso)
  const sexConstant =
    profile.sexReference === 'male' ? 5 : profile.sexReference === 'female' ? -161 : -78;

  const estimatedBmrKcal = Math.round(10 * weight + 6.25 * height - 5 * profile.age + sexConstant);

  // Referencia complementaria Katch-McArdle (informativa, usando masa libre de grasa estimada)
  let katchMcArdleReferenceKcal: number | null = null;
  if (latestBodyFatEstimate && latestBodyFatEstimate > 5 && latestBodyFatEstimate < 55) {
    const leanMassKg = weight * (1 - latestBodyFatEstimate / 100);
    katchMcArdleReferenceKcal = Math.round(370 + 21.6 * leanMassKg);
  }

  // Detección explícita de lectura anómala de TMB en báscula (ej. 779 kcal/día)
  const reportedBmr = profile.scaleReportedBmrKcal;
  const scaleBmrAnomalyFlagged =
    reportedBmr !== null &&
    !profile.bmrVerified &&
    (reportedBmr < 1150 || Math.abs(reportedBmr - estimatedBmrKcal) > 450);

  const scaleBmrWarningMessage = scaleBmrAnomalyFlagged
    ? `La báscula comunicó ${reportedBmr} kcal/día de metabolismo basal, un valor incompatible con ${weight} kg y tu masa libre de grasa estimada (~${estimatedBmrKcal} kcal/día por Mifflin-St Jeor). Forma360 NO utiliza esas ${reportedBmr} kcal para tu dieta: verifica la estatura y unidades en la app de tu báscula.`
    : null;

  const estimatedTdeeKcal = Math.round(estimatedBmrKcal * preferences.activityFactor);

  // Suelo seguro para evitar dietas extremas (Regla 3 y Sección 11)
  const safeMinimumFloor = profile.sexReference === 'male' ? 1550 : 1350;
  const rawRequestedDeficit = preferences.maintenanceMode
    ? 0
    : Math.min(Math.max(preferences.targetDeficitKcal, 0), 750);

  const unclampedIntake = estimatedTdeeKcal - rawRequestedDeficit;
  const minimumFloorApplied = unclampedIntake < safeMinimumFloor;
  const targetIntakeKcal = Math.max(safeMinimumFloor, unclampedIntake);
  const appliedDeficitKcal = Math.max(0, estimatedTdeeKcal - targetIntakeKcal);

  // Pérdida semanal orientativa (~7.700 kcal por kg de tejido adiposo mixto, expresada como rango)
  const centerWeeklyLoss = (appliedDeficitKcal * 7) / 7700;
  const estimatedWeeklyLossKgRange: [number, number] = preferences.maintenanceMode
    ? [0, 0.1]
    : [
        Math.max(0.15, Math.round(centerWeeklyLoss * 0.8 * 100) / 100),
        Math.round(centerWeeklyLoss * 1.15 * 100) / 100,
      ];

  // Proteína contextualizada respecto al peso objetivo (75 kg) y salud renal
  const renalCautionActive = Boolean(screening?.renalDiseaseKnown);
  const referenceBodyWeight = Math.max(profile.targetWeightKg, weight * 0.82);

  let proteinRangeGrams: [number, number];
  let proteinTargetGrams: number;

  if (renalCautionActive) {
    // Regla obligatoria Sección 11: no aplicar objetivos altos automáticamente ante patología renal
    proteinRangeGrams = [
      Math.round(referenceBodyWeight * 0.8),
      Math.round(referenceBodyWeight * 1.1),
    ];
    proteinTargetGrams = Math.round(referenceBodyWeight * 1.0);
  } else {
    proteinRangeGrams = [
      Math.round(referenceBodyWeight * 1.6),
      Math.round(referenceBodyWeight * 2.1),
    ];
    proteinTargetGrams = Math.round(referenceBodyWeight * preferences.proteinGPerKgTarget);
  }

  // Grasas mínimas hormonales (~0,85 g/kg peso objetivo, mín. 25 % kcal) y resto carbohidratos para rendir en fútbol y fuerza
  const fatTargetGrams = Math.max(
    Math.round(referenceBodyWeight * 0.85),
    Math.round((targetIntakeKcal * 0.25) / 9)
  );
  const remainingKcalForCarbs = Math.max(
    200,
    targetIntakeKcal - proteinTargetGrams * 4 - fatTargetGrams * 9
  );
  const carbsTargetGrams = Math.round(remainingKcalForCarbs / 4);

  return {
    estimatedBmrKcal,
    katchMcArdleReferenceKcal,
    estimatedTdeeKcal,
    targetIntakeKcal,
    appliedDeficitKcal,
    proteinTargetGrams,
    proteinRangeGrams,
    fatTargetGrams,
    carbsTargetGrams,
    estimatedWeeklyLossKgRange,
    scaleBmrAnomalyFlagged,
    scaleBmrWarningMessage,
    heightConfirmationPending: !profile.heightConfirmed,
    renalCautionActive,
    minimumFloorApplied,
  };
}

export interface WeightTrendPoint {
  date: string;
  weightKg: number;
  movingAvg7d: number;
  waistCm: number | null;
  bodyFatPctEstimate: number | null;
}

export interface BodyTrendSummary {
  latestWeightKg: number;
  initialWeightKg: number;
  totalChangeKg: number;
  avg7dWeightKg: number;
  change7dKg: number | null;
  change30dKg: number | null;
  change90dKg: number | null;
  latestWaistCm: number | null;
  initialWaistCm: number | null;
  waistChangeCm: number | null;
  latestBodyFatEstimate: number | null;
  latestMuscleEstimateKg: number | null;
  latestVisceralRating: number | null;
  estimatedWeeksToNextMilestone: number | null;
  nextMilestoneKg: number | null;
  series: WeightTrendPoint[];
}

const DEFAULT_MILESTONES_KG = [85.5, 81, 78, 75];

/**
 * Calcula tendencias reales con media móvil de 7 días para evitar sobrerreaccionar
 * al agua corporal, glucógeno, digestión o inflamación aguda post-fútbol.
 */
export function computeBodyTrendSummary(
  measurements: BodyMeasurementEntry[],
  initialWeightKg: number,
  targetWeightKg: number
): BodyTrendSummary {
  const validSorted = [...measurements]
    .filter((m) => !m.isAnomalous || m.anomalyConfirmedByUser)
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));

  const weightEntries = validSorted.filter((m): m is BodyMeasurementEntry & { weightKg: number } =>
    typeof m.weightKg === 'number'
  );

  const series: WeightTrendPoint[] = weightEntries.map((entry, idx) => {
    const windowStart = Math.max(0, idx - 6);
    const slice = weightEntries.slice(windowStart, idx + 1);
    const avg = slice.reduce((acc, item) => acc + item.weightKg, 0) / slice.length;
    return {
      date: entry.measuredOn,
      weightKg: entry.weightKg,
      movingAvg7d: Math.round(avg * 100) / 100,
      waistCm: entry.waistCm,
      bodyFatPctEstimate: entry.bodyFatPctEstimate,
    };
  });

  const latestWeightKg =
    series.length > 0 ? series[series.length - 1]!.weightKg : initialWeightKg;
  const avg7dWeightKg =
    series.length > 0 ? series[series.length - 1]!.movingAvg7d : initialWeightKg;

  const findWeightDaysAgo = (days: number): number | null => {
    if (weightEntries.length < 2) return null;
    const latestDate = new Date(weightEntries[weightEntries.length - 1]!.measuredOn + 'T12:00:00Z');
    const cutoffMs = latestDate.getTime() - days * 86_400_000;
    let closest: (typeof weightEntries)[number] | null = null;
    for (const candidate of weightEntries) {
      const t = new Date(candidate.measuredOn + 'T12:00:00Z').getTime();
      if (t <= cutoffMs) {
        closest = candidate;
      }
    }
    return closest ? Math.round((avg7dWeightKg - closest.weightKg) * 100) / 100 : null;
  };

  const waistEntries = validSorted.filter((m): m is BodyMeasurementEntry & { waistCm: number } =>
    typeof m.waistCm === 'number'
  );
  const initialWaistCm = waistEntries[0]?.waistCm ?? null;
  const latestWaistCm = waistEntries[waistEntries.length - 1]?.waistCm ?? null;
  const waistChangeCm =
    initialWaistCm !== null && latestWaistCm !== null && waistEntries.length >= 2
      ? Math.round((latestWaistCm - initialWaistCm) * 10) / 10
      : null;

  const latestBodyFatEntry = [...validSorted]
    .reverse()
    .find((m) => m.bodyFatPctEstimate !== null);
  const latestMuscleEntry = [...validSorted]
    .reverse()
    .find((m) => m.muscleMassKgEstimate !== null);
  const latestVisceralEntry = [...validSorted]
    .reverse()
    .find((m) => m.visceralFatRating !== null);

  const milestones = [...DEFAULT_MILESTONES_KG.filter((m) => m > targetWeightKg), targetWeightKg];
  const nextMilestoneKg = milestones.find((m) => avg7dWeightKg > m + 0.15) ?? null;

  const change7d = findWeightDaysAgo(7);
  let estimatedWeeksToNextMilestone: number | null = null;
  if (nextMilestoneKg !== null && change7d !== null && change7d < -0.15) {
    const weeklyLossRate = Math.abs(change7d);
    estimatedWeeksToNextMilestone = Math.max(
      1,
      Math.round((avg7dWeightKg - nextMilestoneKg) / weeklyLossRate)
    );
  }

  return {
    latestWeightKg,
    initialWeightKg,
    totalChangeKg: Math.round((latestWeightKg - initialWeightKg) * 100) / 100,
    avg7dWeightKg,
    change7dKg: change7d,
    change30dKg: findWeightDaysAgo(30),
    change90dKg: findWeightDaysAgo(90),
    latestWaistCm,
    initialWaistCm,
    waistChangeCm,
    latestBodyFatEstimate: latestBodyFatEntry?.bodyFatPctEstimate ?? null,
    latestMuscleEstimateKg: latestMuscleEntry?.muscleMassKgEstimate ?? null,
    latestVisceralRating: latestVisceralEntry?.visceralFatRating ?? null,
    estimatedWeeksToNextMilestone,
    nextMilestoneKg,
    series,
  };
}

/**
 * Detecta lecturas inusuales antes de permitir que alteren tendencias o recomendaciones.
 */
export function detectMeasurementAnomaly(
  candidate: {
    measuredOn: string;
    weightKg: number | null;
    waistCm: number | null;
    scaleBmrReported?: number | null;
  },
  existingMeasurements: BodyMeasurementEntry[]
): { isAnomalous: boolean; reason?: string } {
  if (candidate.scaleBmrReported && candidate.scaleBmrReported < 1150) {
    return {
      isAnomalous: true,
      reason: `El metabolismo basal comunicado (${candidate.scaleBmrReported} kcal/día) es anormalmente bajo para un adulto y requiere verificación.`,
    };
  }

  const sorted = [...existingMeasurements].sort((a, b) =>
    b.measuredOn.localeCompare(a.measuredOn)
  );

  if (candidate.weightKg !== null) {
    const prevWeight = sorted.find((m) => m.weightKg !== null);
    if (prevWeight && prevWeight.weightKg !== null) {
      const daysApart = Math.max(
        1,
        Math.abs(
          (new Date(candidate.measuredOn + 'T12:00:00Z').getTime() -
            new Date(prevWeight.measuredOn + 'T12:00:00Z').getTime()) /
            86_400_000
        )
      );
      const diff = Math.abs(candidate.weightKg - prevWeight.weightKg);
      if (daysApart <= 3 && diff > 2.6) {
        return {
          isAnomalous: true,
          reason: `Cambio brusco de ${diff.toFixed(1).replace('.', ',')} kg en pocos días respecto a ${prevWeight.weightKg.toFixed(1).replace('.', ',')} kg. Confirma si la báscula estaba en suelo firme y en ayunas antes de recalcular objetivos.`,
        };
      }
    }
  }

  if (candidate.waistCm !== null) {
    const prevWaist = sorted.find((m) => m.waistCm !== null);
    if (prevWaist && prevWaist.waistCm !== null) {
      const diffW = Math.abs(candidate.waistCm - prevWaist.waistCm);
      if (diffW > 6.5) {
        return {
          isAnomalous: true,
          reason: `Variación de ${diffW.toFixed(1).replace('.', ',')} cm en cintura respecto al registro previo (${prevWaist.waistCm} cm). Verifica que mediste al nivel del ombligo tras espirar normal.`,
        };
      }
    }
  }

  return { isAnomalous: false };
}
