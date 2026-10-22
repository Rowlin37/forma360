import { generateId } from '@/lib/format';
import { Forma360State, RecommendationItem } from '@/lib/types';
import { calculateEnergyNeeds, computeBodyTrendSummary } from './physiology';

/**
 * Motor transparente de reglas explicables (Sección 13 y Reglas 1-10).
 * No realiza recortes agresivos diarios ni castiga con ejercicio.
 * Cada recomendación expone el motivo fisiológico, la regla activada y permite
 * Aceptar, Modificar o Rechazar dejando constancia auditable.
 */
export function generateSmartRecommendations(
  state: Forma360State,
  referenceDateIso: string
): RecommendationItem[] {
  const existingByRule = new Map<string, RecommendationItem>();
  for (const rec of state.recommendations) {
    existingByRule.set(rec.ruleCode, rec);
  }

  const trend = computeBodyTrendSummary(
    state.bodyMeasurements,
    state.profile.initialWeightKg,
    state.profile.targetWeightKg
  );
  const energy = calculateEnergyNeeds(
    state.profile,
    state.preferences,
    trend.avg7dWeightKg,
    state.screening,
    trend.latestBodyFatEstimate
  );

  const candidates: RecommendationItem[] = [];

  // 1. REGLA DE SEGURIDAD CARDIOVASCULAR (Regla obligatoria 8)
  if (state.screening.chestPainOrSyncope || state.screening.disproportionateDyspnea) {
    candidates.push({
      id: existingByRule.get('SAFETY_CARDIO_STOP')?.id ?? generateId('rec'),
      ruleCode: 'SAFETY_CARDIO_STOP',
      area: 'safety',
      severity: 'medical_alert',
      title: 'Atención prioritaria: interrumpe el esfuerzo y solicita valoración médica',
      reason:
        'Has marcado dolor torácico, mareos/desmayos o falta de aire desproporcionada en tu cuestionario de salud.',
      proposedAction:
        'Suspender sesiones intensas (incluido fútbol y series) hasta recibir autorización médica presencial.',
      actionPayload: { type: 'medical_stop' },
      status: existingByRule.get('SAFETY_CARDIO_STOP')?.status ?? 'pending',
      userNote: existingByRule.get('SAFETY_CARDIO_STOP')?.userNote ?? '',
      createdAt: existingByRule.get('SAFETY_CARDIO_STOP')?.createdAt ?? new Date().toISOString(),
      decidedAt: existingByRule.get('SAFETY_CARDIO_STOP')?.decidedAt ?? null,
    });
  }

  // 2. REGLA DE VOLUMEN ABDOMINAL ANÓMALO (Regla obligatoria 9)
  if (state.screening.recentAbnormalAbdominalDistension) {
    candidates.push({
      id: existingByRule.get('SAFETY_ABDOMINAL_CHECK')?.id ?? generateId('rec'),
      ruleCode: 'SAFETY_ABDOMINAL_CHECK',
      area: 'safety',
      severity: 'medical_alert',
      title: 'No atribuyas automáticamente la distensión abdominal a grasa corporal',
      reason:
        'Has indicado un aumento abdominal reciente, rápido, persistente, duro, doloroso o con síntomas digestivos.',
      proposedAction:
        'Consultar con un profesional sanitario para descartar causas digestivas, viscerales o médicas antes de aplicar déficit.',
      actionPayload: { type: 'medical_stop' },
      status: existingByRule.get('SAFETY_ABDOMINAL_CHECK')?.status ?? 'pending',
      userNote: existingByRule.get('SAFETY_ABDOMINAL_CHECK')?.userNote ?? '',
      createdAt: existingByRule.get('SAFETY_ABDOMINAL_CHECK')?.createdAt ?? new Date().toISOString(),
      decidedAt: existingByRule.get('SAFETY_ABDOMINAL_CHECK')?.decidedAt ?? null,
    });
  }

  // 3. REGLA DE ESTATURA Y METABOLISMO BASAL DE BÁSCULA (Regla 4)
  if (!state.profile.heightConfirmed || energy.scaleBmrAnomalyFlagged) {
    candidates.push({
      id: existingByRule.get('VERIFY_PROFILE_BMR')?.id ?? generateId('rec'),
      ruleCode: 'VERIFY_PROFILE_BMR',
      area: 'body_tracking',
      severity: 'important',
      title: 'Confirma tu estatura exacta y descarta el basal de 779 kcal/día de la báscula',
      reason: `La báscula Xiaomi comunicó 779 kcal/día de basal, incompatible con ${state.profile.initialWeightKg} kg y ~63,5 kg de masa muscular estimada. Forma360 estima ~${energy.estimatedBmrKcal} kcal/día (Mifflin-St Jeor) con estatura orientativa de ${state.profile.heightCm} cm.`,
      proposedAction:
        'Confirmar tu estatura medida descalzo y marcar como revisada la lectura anómala de la báscula.',
      actionPayload: { type: 'confirm_height_and_bmr' },
      status: existingByRule.get('VERIFY_PROFILE_BMR')?.status ?? 'pending',
      userNote: existingByRule.get('VERIFY_PROFILE_BMR')?.userNote ?? '',
      createdAt: existingByRule.get('VERIFY_PROFILE_BMR')?.createdAt ?? new Date().toISOString(),
      decidedAt: existingByRule.get('VERIFY_PROFILE_BMR')?.decidedAt ?? null,
    });
  }

  // Analizar sesiones recientes
  const recentSessions = state.completedSessions.slice(-6);
  const strengthSessions = state.completedSessions.filter((s) => s.sessionType === 'strength');
  const strengthImproving = (() => {
    if (strengthSessions.length < 2) return false;
    const firstVol = strengthSessions[0]!.sets.reduce(
      (sum, set) => sum + set.loadKg * set.repsCompleted,
      0
    );
    const lastVol = strengthSessions[strengthSessions.length - 1]!.sets.reduce(
      (sum, set) => sum + set.loadKg * set.repsCompleted,
      0
    );
    return lastVol > firstVol;
  })();

  // 4. RECOMPOSICIÓN CORPORAL EXITOSA (Cintura baja + Fuerza sube aunque el peso apenas cambie)
  if (
    trend.waistChangeCm !== null &&
    trend.waistChangeCm <= -1.0 &&
    strengthImproving &&
    trend.change7dKg !== null &&
    Math.abs(trend.change7dKg) < 0.25
  ) {
    candidates.push({
      id: existingByRule.get('RECOMP_KEEP_CALORIES')?.id ?? generateId('rec'),
      ruleCode: 'RECOMP_KEEP_CALORIES',
      area: 'nutrition',
      severity: 'info',
      title: 'Recomposición en marcha: NO recortes calorías por el peso estancado',
      reason: `Tu cintura ha bajado ${Math.abs(trend.waistChangeCm).toFixed(1).replace('.', ',')} cm y tu volumen de fuerza ha mejorado aunque la báscula se mueva poco esta semana.`,
      proposedAction: `Mantener tu objetivo actual de ${energy.targetIntakeKcal} kcal/día y ${energy.proteinTargetGrams} g de proteína.`,
      actionPayload: { type: 'keep_course' },
      status: existingByRule.get('RECOMP_KEEP_CALORIES')?.status ?? 'pending',
      userNote: existingByRule.get('RECOMP_KEEP_CALORIES')?.userNote ?? '',
      createdAt:
        existingByRule.get('RECOMP_KEEP_CALORIES')?.createdAt ?? new Date().toISOString(),
      decidedAt: existingByRule.get('RECOMP_KEEP_CALORIES')?.decidedAt ?? null,
    });
  }

  // 5. FATIGA ACUMULADA O DOLOR ARTICULAR -> REDUCCIÓN TEMPORAL DE CARGA
  const highFatigueCount = recentSessions.filter(
    (s) => s.perceivedRpe >= 9 || s.feltDiscomfort || s.readinessNext === 'fatigued'
  ).length;

  if (highFatigueCount >= 2) {
    candidates.push({
      id: existingByRule.get('FATIGUE_DELOAD')?.id ?? generateId('rec'),
      ruleCode: 'FATIGUE_DELOAD',
      area: 'recovery',
      severity: 'important',
      title: 'Fatiga acumulada detectada: aplica mini-descarga preventiva esta semana',
      reason:
        'Al menos 2 sesiones recientes reflejan RPE >= 9, fatiga residual o molestias articulares sumadas al fútbol.',
      proposedAction:
        'Reducir 1 serie por ejercicio y bajar el RPE objetivo 1 punto en las sesiones pendientes de la semana actual.',
      actionPayload: { type: 'deload_week', loadFactor: 0.85 },
      status: existingByRule.get('FATIGUE_DELOAD')?.status ?? 'pending',
      userNote: existingByRule.get('FATIGUE_DELOAD')?.userNote ?? '',
      createdAt: existingByRule.get('FATIGUE_DELOAD')?.createdAt ?? new Date().toISOString(),
      decidedAt: existingByRule.get('FATIGUE_DELOAD')?.decidedAt ?? null,
    });
  }

  // 6. SESIONES PERDIDAS -> CONTINUIDAD REALISTA SIN DUPLICAR ENTRENAMIENTOS (Regla 3)
  const overduePending = state.plan.sessions.filter(
    (s) => s.status === 'pending' && s.scheduledDate < referenceDateIso && s.sessionType !== 'rest'
  );
  if (overduePending.length >= 3) {
    candidates.push({
      id: existingByRule.get('MISSED_SESSIONS_RESET')?.id ?? generateId('rec'),
      ruleCode: 'MISSED_SESSIONS_RESET',
      area: 'training',
      severity: 'suggestion',
      title: 'Retoma la continuidad sin acumular ni castigarte por sesiones pasadas',
      reason: `Tienes ${overduePending.length} sesiones anteriores sin registrar. Intentar "recuperarlas" seguidas dispara el riesgo de lesión.`,
      proposedAction:
        'Archivar sin penalización las sesiones vencidas y continuar normalmente con tu sesión de hoy.',
      actionPayload: { type: 'keep_course' },
      status: existingByRule.get('MISSED_SESSIONS_RESET')?.status ?? 'pending',
      userNote: existingByRule.get('MISSED_SESSIONS_RESET')?.userNote ?? '',
      createdAt:
        existingByRule.get('MISSED_SESSIONS_RESET')?.createdAt ?? new Date().toISOString(),
      decidedAt: existingByRule.get('MISSED_SESSIONS_RESET')?.decidedAt ?? null,
    });
  }

  // 7. ESTANCAMIENTO DE PESO -> REVISAR CALIDAD DE REGISTRO Y CINTURA ANTES DE RECORTAR
  if (
    state.bodyMeasurements.length >= 5 &&
    trend.change30dKg !== null &&
    trend.change30dKg > -0.3 &&
    (trend.waistChangeCm === null || trend.waistChangeCm >= -0.3)
  ) {
    candidates.push({
      id: existingByRule.get('PLATEAU_AUDIT_FIRST')?.id ?? generateId('rec'),
      ruleCode: 'PLATEAU_AUDIT_FIRST',
      area: 'nutrition',
      severity: 'suggestion',
      title: 'Meseta de 4 semanas: revisa aceite/picoteos o aplica ajuste suave (-120 kcal)',
      reason:
        'La media móvil de peso y la cintura apenas han variado en 30 días. Antes de un recorte brusco conviene auditar cucharadas de aceite, bebidas y raciones del fin de semana.',
      proposedAction:
        'Ajustar el déficit +120 kcal/día de forma moderada o añadir 2.000 pasos diarios de caminata.',
      actionPayload: { type: 'adjust_calories', deltaKcal: 120 },
      status: existingByRule.get('PLATEAU_AUDIT_FIRST')?.status ?? 'pending',
      userNote: existingByRule.get('PLATEAU_AUDIT_FIRST')?.userNote ?? '',
      createdAt:
        existingByRule.get('PLATEAU_AUDIT_FIRST')?.createdAt ?? new Date().toISOString(),
      decidedAt: existingByRule.get('PLATEAU_AUDIT_FIRST')?.decidedAt ?? null,
    });
  }

  // Conservar también decisiones previas para mantener historial auditable
  const activeRuleCodes = new Set(candidates.map((c) => c.ruleCode));
  const historicalDecisions = state.recommendations.filter(
    (r) => !activeRuleCodes.has(r.ruleCode) && r.status !== 'pending'
  );

  return [...candidates, ...historicalDecisions];
}
