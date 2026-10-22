import { addDaysIso, generateId, startOfIsoWeek } from '@/lib/format';
import {
  CompletedSessionLog,
  EquipmentItem,
  ExerciseItem,
  PlannedExerciseBlock,
  PlannedSession,
  SafetyScreening,
  TrainingPlan,
  UserProfile,
} from '@/lib/types';
import { resolveCompatibleExercise } from './exercises';

export interface PlanGenerationOptions {
  profile: UserProfile;
  screening: SafetyScreening;
  equipment: EquipmentItem[];
  customExercises?: ExerciseItem[];
  startDateIso: string; // Lunes o cualquier día de la semana 1
  planFocus?: TrainingPlan['focus'];
  durationWeeks?: number;
  existingCompletedSessions?: CompletedSessionLog[];
}

function buildStrengthBlock(
  preferredSlug: string,
  sets: number,
  reps: string,
  restSeconds: number,
  rpeTarget: string,
  equipment: EquipmentItem[],
  customExercises: ExerciseItem[],
  allowAdvancedCore: boolean,
  suggestedLoadKg: number | null = null
): PlannedExerciseBlock {
  const { exercise, substitutedFrom } = resolveCompatibleExercise(
    preferredSlug,
    equipment,
    customExercises,
    allowAdvancedCore
  );

  return {
    exerciseSlug: exercise.slug,
    exerciseName: exercise.name,
    movementPattern: exercise.movementPattern,
    sets,
    reps,
    restSeconds,
    suggestedLoadKg,
    rpeTarget,
    fallbackExerciseName: exercise.easierVariants[0] ?? 'Variante controlada con peso corporal',
    progressionCriteria:
      'Si completas todas las series en el tope de repeticiones con RPE <= 8 y cero molestias articulares, sube 2-2,5 kg (o +1 rep si no tienes discos intermedios).',
    substitutedFrom,
  };
}

/**
 * Genera el programa inicial de 8 semanas (o N semanas configurables) integrando:
 * - 2 sesiones semanales de fuerza de cuerpo completo (Rutina A lunes, Rutina B viernes)
 * - 1-2 sesiones aeróbicas suaves de bajo impacto / caminar-correr (martes y sábado)
 * - Fútbol habitual de los miércoles (60-90 min, esfuerzo alto) con descarga el jueves
 * - Fútbol habitual de los domingos (20 min) + revisión semanal de cintura/progreso
 * - Semana 8 programada explícitamente como Semana de Descarga y Recuperación (Regla 7)
 */
export function generateTrainingPlan(options: PlanGenerationOptions): TrainingPlan {
  const {
    profile,
    screening,
    equipment,
    customExercises = [],
    startDateIso,
    planFocus = 'fat_loss_strength_base',
    durationWeeks = 8,
  } = options;

  const mondayWeek1 = startOfIsoWeek(startDateIso);
  const planId = generateId('plan');

  const hasBackPain = screening.jointPainAreas.includes('lumbar');
  const hasKneeOrAnklePain =
    screening.jointPainAreas.includes('rodillas') ||
    screening.jointPainAreas.includes('tobillos');

  const allowAdvancedCore =
    (profile.fitnessLevel === 'intermediate' || profile.fitnessLevel === 'advanced') &&
    !hasBackPain;

  const sessions: PlannedSession[] = [];

  for (let week = 1; week <= durationWeeks; week++) {
    const isDeloadWeek = week === 8 || week % 8 === 0;
    const isIntroPhase = week <= 2;

    const mainSets = isDeloadWeek ? 2 : isIntroPhase ? 3 : 4;
    const accessorySets = isDeloadWeek ? 2 : 3;
    const targetStrengthRpe = isDeloadWeek ? 6.5 : isIntroPhase ? 7.0 : 8.0;
    const rpeText = isDeloadWeek ? 'RPE 6-6,5 (descarga activa)' : isIntroPhase ? 'RPE 7 (técnica y base)' : 'RPE 7,5-8';
    const bikeMinutes = isDeloadWeek ? 25 : Math.min(45, 28 + week * 2);
    const saturdayCardioMinutes = isDeloadWeek ? 25 : Math.min(45, 25 + week * 3);

    const weekOffset = (week - 1) * 7;

    // DÍA 1 (LUNES): FUERZA A — CUERPO COMPLETO (48h antes del fútbol del miércoles)
    sessions.push({
      id: generateId('sess'),
      planId,
      weekNumber: week,
      dayOfWeek: 1,
      scheduledDate: addDaysIso(mondayWeek1, weekOffset + 0),
      scheduledTime: '18:30',
      sessionType: 'strength',
      title: isDeloadWeek
        ? `Semana ${week} · Fuerza A (Descarga y técnica)`
        : `Semana ${week} · Fuerza A — Cuerpo completo`,
      objective:
        'Preservar y ganar masa muscular en tren superior e inferior sin generar agujetas incapacitantes para el fútbol del miércoles.',
      warmup:
        '6 min: 3 min bici estática suave + movilidad torácica, círculos escapulares, 10 sentadillas al aire y 1 serie de aproximación al 50 %.',
      cooldown: '4 min: respiración nasal lenta + estiramiento suave de pectoral y flexores de cadera.',
      estimatedMinutes: screening.sessionDurationMinutes,
      expectedRpe: targetStrengthRpe,
      impactLevel: 'low',
      exercises: [
        buildStrengthBlock(
          'bench-press-barbell',
          mainSets,
          '8-10',
          120,
          rpeText,
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          hasKneeOrAnklePain ? 'box-squat-bodyweight' : 'goblet-squat',
          mainSets,
          '8-12',
          90,
          rpeText,
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          'one-arm-dumbbell-row',
          accessorySets,
          '10-12 / lado',
          90,
          rpeText,
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          'hip-thrust-glute-bridge',
          accessorySets,
          '12-15',
          75,
          rpeText,
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          'dead-bug',
          accessorySets,
          '8-10 lentas / lado',
          60,
          'Control lumbar total',
          equipment,
          customExercises,
          allowAdvancedCore
        ),
      ],
      progressionRule: isDeloadWeek
        ? 'Semana de descarga: mantén el peso habitual reduciendo 1-2 series para supercompensar tendones y sistema nervioso.'
        : 'Aumenta carga únicamente cuando completes todas las series con técnica limpia y RPE <= 8.',
      status: 'pending',
    });

    // DÍA 2 (MARTES): CARDIO SUAVE BAJO IMPACTO (Zona 2 previa al miércoles)
    const bikeResolved = resolveCompatibleExercise(
      'stationary-bike-z2',
      equipment,
      customExercises,
      allowAdvancedCore
    );
    sessions.push({
      id: generateId('sess'),
      planId,
      weekNumber: week,
      dayOfWeek: 2,
      scheduledDate: addDaysIso(mondayWeek1, weekOffset + 1),
      scheduledTime: '19:00',
      sessionType: 'cardio',
      title: `Semana ${week} · Base aeróbica sin impacto (${bikeMinutes} min)`,
      objective:
        'Sumar oxidación de grasas y capilarización mitocondrial en Zona 2 dejando las piernas frescas para el fútbol de mañana.',
      warmup: '4 min de pedaleo o caminata muy suave progresiva.',
      cooldown: '3 min disminuyendo resistencia + movilidad de tobillos.',
      estimatedMinutes: bikeMinutes,
      expectedRpe: 4.5,
      impactLevel: 'low',
      exercises: [
        {
          exerciseSlug: bikeResolved.exercise.slug,
          exerciseName: bikeResolved.exercise.name,
          movementPattern: 'cardio_low_impact',
          sets: 1,
          reps: `${bikeMinutes} min Zona 2 conversacional`,
          restSeconds: 0,
          suggestedLoadKg: null,
          rpeTarget: 'RPE 4-5 (hablar frases completas sin jadear)',
          fallbackExerciseName: 'Caminata a paso vivo en llano',
          progressionCriteria: 'Suma +2 a +4 minutos semanales manteniendo frecuencia cardíaca cómoda.',
          substitutedFrom: bikeResolved.substitutedFrom,
        },
      ],
      progressionRule: 'Prioriza constancia y cero fatiga muscular residual para el miércoles.',
      status: 'pending',
    });

    // DÍA 3 (MIÉRCOLES): FÚTBOL HABITUAL EXIGENTE (60-90 MIN)
    sessions.push({
      id: generateId('sess'),
      planId,
      weekNumber: week,
      dayOfWeek: 3,
      scheduledDate: addDaysIso(mondayWeek1, weekOffset + 2),
      scheduledTime: '20:00',
      sessionType: 'football',
      title: 'Fútbol del miércoles (60-90 min · Carga alta)',
      objective:
        'Actividad deportiva principal de alta intensidad intermitente. Contabilizada íntegramente en la carga neuromuscular y de impacto semanal.',
      warmup:
        'Obligatorio 8 min antes de jugar: trote suave, movilidad dinámica de aductores, isquiosurales y progresiones al 70 % para proteger gemelos e isquios.',
      cooldown: 'Hidratación con agua/electrolitos y cena rica en proteína + carbohidrato de reposición.',
      estimatedMinutes: 75,
      expectedRpe: 8.0,
      impactLevel: 'high',
      exercises: [],
      progressionRule:
        'No añadas entrenamiento de piernas ni series de carrera este día; registra duración real y posibles sobrecargas.',
      status: 'pending',
    });

    // DÍA 4 (JUEVES): RECUPERACIÓN ACTIVA Y MOVILIDAD POST-FÚTBOL
    sessions.push({
      id: generateId('sess'),
      planId,
      weekNumber: week,
      dayOfWeek: 4,
      scheduledDate: addDaysIso(mondayWeek1, weekOffset + 3),
      scheduledTime: '19:30',
      sessionType: 'recovery',
      title: 'Descarga y movilidad regenerativa post-partido',
      objective:
        'Facilitar el retorno venoso, reducir rigidez de cadera/tobillo tras los sprints del miércoles y llegar recuperado a Fuerza B.',
      warmup: 'Respiración diafragmática lenta.',
      cooldown: 'Descanso prioritario (objetivo 7-8 h de sueño).',
      estimatedMinutes: 18,
      expectedRpe: 2.5,
      impactLevel: 'low',
      exercises: [
        buildStrengthBlock(
          'post-football-mobility-flow',
          1,
          '15-20 min suaves',
          0,
          'RPE 2-3 (sin dolor)',
          equipment,
          customExercises,
          allowAdvancedCore
        ),
      ],
      progressionRule: 'Si hay fatiga alta, puede convertirse en descanso pasivo completo sin penalizar tu racha.',
      status: 'pending',
    });

    // DÍA 5 (VIERNES): FUERZA B — CUERPO COMPLETO
    sessions.push({
      id: generateId('sess'),
      planId,
      weekNumber: week,
      dayOfWeek: 5,
      scheduledDate: addDaysIso(mondayWeek1, weekOffset + 4),
      scheduledTime: '18:30',
      sessionType: 'strength',
      title: isDeloadWeek
        ? `Semana ${week} · Fuerza B (Descarga y control)`
        : `Semana ${week} · Fuerza B — Cadena posterior, hombro y core`,
      objective:
        'Reforzar bisagra de cadera (protección isquiosural), empuje vertical, tracción dorsal, estabilidad unilateral y brazos.',
      warmup:
        '6 min: movilidad de cadera bisagra con pica/barra vacía, dislocaciones de hombro y 1 serie ligera.',
      cooldown: '4 min de vuelta a la calma respiratoria.',
      estimatedMinutes: screening.sessionDurationMinutes,
      expectedRpe: targetStrengthRpe,
      impactLevel: 'low',
      exercises: [
        buildStrengthBlock(
          hasBackPain ? 'romanian-deadlift-dumbbell' : 'romanian-deadlift-barbell',
          mainSets,
          '8-10',
          105,
          rpeText,
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          'dumbbell-overhead-press',
          mainSets,
          '8-12',
          90,
          rpeText,
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          'dumbbell-pullover-lat',
          accessorySets,
          '10-12',
          75,
          rpeText,
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          'reverse-lunge-controlled',
          accessorySets,
          '8-10 / pierna',
          75,
          rpeText,
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          'ez-bar-biceps-triceps',
          2,
          '10-12',
          60,
          'RPE 8',
          equipment,
          customExercises,
          allowAdvancedCore
        ),
        buildStrengthBlock(
          allowAdvancedCore && week >= 5 ? 'ab-wheel-rollout' : 'front-plank',
          accessorySets,
          allowAdvancedCore && week >= 5 ? '6-8 controladas' : '35-45 s activos',
          60,
          'Cero caída lumbar',
          equipment,
          customExercises,
          allowAdvancedCore
        ),
      ],
      progressionRule:
        'Prioriza control excéntrico en el peso muerto rumano; es tu seguro de lesiones para correr y jugar al fútbol.',
      status: 'pending',
    });

    // DÍA 6 (SÁBADO): PROGRESIÓN DE CARRERA / CAMINAR-CORRER O BAJO IMPACTO
    const runLowImpact = screening.impactTolerance === 'low_only' || hasKneeOrAnklePain;
    sessions.push({
      id: generateId('sess'),
      planId,
      weekNumber: week,
      dayOfWeek: 6,
      scheduledDate: addDaysIso(mondayWeek1, weekOffset + 5),
      scheduledTime: '10:00',
      sessionType: runLowImpact ? 'cardio' : 'running',
      title: runLowImpact
        ? `Semana ${week} · Caminata activa o Bici sin impacto (${saturdayCardioMinutes} min)`
        : `Semana ${week} · Progresión Caminar-Correr (${saturdayCardioMinutes} min)`,
      objective: runLowImpact
        ? 'Construir base cardiovascular protegiendo articulaciones antes de introducir tramos de trote.'
        : 'Adaptar progresivamente tendones y base aeróbica en el itinerario hacia 5 km, 10 km y Media Maratón.',
      warmup: '6 min de caminata dinámica de menos a más + movilidad de tobillo.',
      cooldown: '5 min de caminata suave + hidratación.',
      estimatedMinutes: saturdayCardioMinutes,
      expectedRpe: 5.5,
      impactLevel: runLowImpact ? 'low' : 'medium',
      exercises: [
        buildStrengthBlock(
          runLowImpact ? 'brisk-walking-outdoor' : 'walk-run-progressive',
          1,
          `${saturdayCardioMinutes} min según etapa actual`,
          0,
          'RPE 5 (conversacional)',
          equipment,
          customExercises,
          allowAdvancedCore
        ),
      ],
      progressionRule:
        'Aumenta tramos de carrera solo si terminas fresco y con molestia articular 0-2/10 a las 24 horas.',
      status: 'pending',
    });

    // DÍA 7 (DOMINGO): FÚTBOL SUAVE (20 MIN) + DESCANSO Y REVISIÓN SEMANAL
    sessions.push({
      id: generateId('sess'),
      planId,
      weekNumber: week,
      dayOfWeek: 7,
      scheduledDate: addDaysIso(mondayWeek1, weekOffset + 6),
      scheduledTime: '11:30',
      sessionType: 'football',
      title: 'Fútbol del domingo (20 min) + Revisión semanal y descanso',
      objective:
        'Actividad lúdica corta + medición semanal consistente de cintura y descanso para iniciar la siguiente semana recuperado.',
      warmup: '5 min de movilidad articular ligera antes de entrar.',
      cooldown: 'Tarde libre de descanso y organización nutricional sencilla.',
      estimatedMinutes: 20,
      expectedRpe: 6.0,
      impactLevel: 'medium',
      exercises: [],
      progressionRule: 'Registra peso y perímetro de cintura en ayunas para evaluar la tendencia real.',
      status: 'pending',
    });
  }

  return {
    id: planId,
    name: 'Plan Inicial Forma360 — 8 Semanas (Fuerza + Base + Fútbol)',
    description:
      'Diseñado para pasar de 90 kg hacia una composición más magra preservando masa muscular, protegiendo articulaciones frente al fútbol de miércoles/domingo y construyendo la base hacia 5K, 10K y Media Maratón.',
    focus: planFocus,
    durationWeeks,
    currentWeek: 1,
    startDate: mondayWeek1,
    versions: [
      {
        versionNumber: 1,
        changeReason: 'Generación inicial adaptada al perfil, fútbol semanal y material doméstico.',
        createdAt: new Date().toISOString(),
      },
    ],
    sessions,
  };
}

/**
 * Sustituye dinámicamente los ejercicios incompatibles de todas las sesiones
 * pendientes cuando el usuario activa o desactiva equipamiento, SIN borrar
 * sesiones ya completadas ni reconstruir el plan desde cero.
 */
export function adaptPlanToEquipmentChange(
  plan: TrainingPlan,
  equipment: EquipmentItem[],
  customExercises: ExerciseItem[],
  allowAdvancedCore: boolean
): { updatedPlan: TrainingPlan; swappedCount: number } {
  let swappedCount = 0;

  const updatedSessions = plan.sessions.map((session) => {
    if (session.status === 'completed' || session.exercises.length === 0) {
      return session;
    }

    const nextExercises = session.exercises.map((block) => {
      const { exercise, substitutedFrom } = resolveCompatibleExercise(
        block.exerciseSlug,
        equipment,
        customExercises,
        allowAdvancedCore
      );
      if (exercise.slug !== block.exerciseSlug) {
        swappedCount += 1;
        return {
          ...block,
          exerciseSlug: exercise.slug,
          exerciseName: exercise.name,
          movementPattern: exercise.movementPattern,
          fallbackExerciseName: exercise.easierVariants[0] ?? block.fallbackExerciseName,
          substitutedFrom: substitutedFrom ?? block.exerciseName,
        };
      }
      return block;
    });

    return {
      ...session,
      exercises: nextExercises,
    };
  });

  const nextVersionNumber = (plan.versions[plan.versions.length - 1]?.versionNumber ?? 1) + 1;

  return {
    swappedCount,
    updatedPlan: {
      ...plan,
      sessions: updatedSessions,
      versions:
        swappedCount > 0
          ? [
              ...plan.versions,
              {
                versionNumber: nextVersionNumber,
                changeReason: `Adaptación automática de ${swappedCount} bloques por actualización de equipamiento disponible.`,
                createdAt: new Date().toISOString(),
              },
            ]
          : plan.versions,
    },
  };
}

/**
 * Permite cambiar/arrastrar una sesión a otro día de la semana sin eliminar
 * el resto del plan ni acumular automáticamente dos sesiones exigentes seguidas.
 */
export function reschedulePlannedSession(
  plan: TrainingPlan,
  sessionId: string,
  newDateIso: string,
  newDayOfWeek: number
): {
  updatedPlan: TrainingPlan;
  warning: string | null;
} {
  const targetSession = plan.sessions.find((s) => s.id === sessionId);
  if (!targetSession) {
    return { updatedPlan: plan, warning: null };
  }

  const isTargetDemanding =
    targetSession.expectedRpe >= 7 ||
    targetSession.sessionType === 'strength' ||
    targetSession.sessionType === 'football';

  const prevDate = addDaysIso(newDateIso, -1);
  const nextDate = addDaysIso(newDateIso, 1);

  const collidingSameDay = plan.sessions.filter(
    (s) => s.id !== sessionId && s.scheduledDate === newDateIso && s.expectedRpe >= 6.5
  );
  const adjacentHard = plan.sessions.filter(
    (s) =>
      s.id !== sessionId &&
      (s.scheduledDate === prevDate || s.scheduledDate === nextDate) &&
      (s.expectedRpe >= 7.5 || s.sessionType === 'football')
  );

  let warning: string | null = null;
  let adjustedRpe = targetSession.expectedRpe;

  if (isTargetDemanding && collidingSameDay.length > 0) {
    warning =
      'Aviso anti-sobrecarga: ya existe una sesión exigente en ese día. Se ha reducido automáticamente el volumen/RPE objetivo de la sesión movida para no duplicar carga máxima.';
    adjustedRpe = Math.max(6.0, targetSession.expectedRpe - 1.0);
  } else if (isTargetDemanding && adjacentHard.length > 0) {
    warning = `Aviso de recuperación: esta nueva fecha queda pegada a "${adjacentHard[0]!.title}". Deja 2 repeticiones extra en recámara (RPE moderado) para proteger tendones e isquios.`;
    adjustedRpe = Math.min(targetSession.expectedRpe, 7.0);
  }

  const updatedSessions = plan.sessions.map((s) => {
    if (s.id !== sessionId) return s;
    return {
      ...s,
      scheduledDate: newDateIso,
      dayOfWeek: newDayOfWeek,
      expectedRpe: adjustedRpe,
      status: 'rescheduled' as const,
      exercises:
        adjustedRpe < targetSession.expectedRpe
          ? s.exercises.map((ex) => ({
              ...ex,
              sets: Math.max(2, ex.sets - 1),
              rpeTarget: 'RPE 6,5-7 (ajustado por proximidad a otra carga)',
            }))
          : s.exercises,
    };
  });

  return {
    updatedPlan: {
      ...plan,
      sessions: updatedSessions,
    },
    warning,
  };
}

/**
 * Calcula de forma transparente la propuesta de carga para la siguiente sesión
 * en función del esfuerzo percibido (RPE), repeticiones completadas y molestias.
 */
export function evaluatePostWorkoutProgression(sessionLog: CompletedSessionLog): {
  decision: 'increase' | 'maintain' | 'reduce';
  deltaKg: number;
  summary: string;
} {
  if (sessionLog.feltDiscomfort || sessionLog.readinessNext === 'pain_stop') {
    return {
      decision: 'reduce',
      deltaKg: -2.5,
      summary:
        'Has comunicado molestias o fatiga articular: NO subimos peso. Proponemos reducir un 5-10 % la carga o usar la variante amable en la próxima sesión.',
    };
  }

  if (!sessionLog.completedFully || sessionLog.perceivedRpe >= 9 || sessionLog.readinessNext === 'fatigued') {
    return {
      decision: 'maintain',
      deltaKg: 0,
      summary:
        'Esfuerzo percibido elevado (RPE >= 9) o sesión exigente: consolidamos la carga actual antes de añadir kilos para asegurar buena técnica y recuperación.',
    };
  }

  if (sessionLog.sets.length > 0 && sessionLog.perceivedRpe <= 8) {
    const allHitTarget = sessionLog.sets.every((s) => s.repsCompleted >= s.targetReps);
    if (allHitTarget) {
      return {
        decision: 'increase',
        deltaKg: 2.5,
        summary:
          'Completaste todas las series previstas con RPE controlado (<= 8) y sin molestias: proponemos +2,5 kg (o +1 repetición por serie según tus discos disponibles).',
      };
    }
  }

  return {
    decision: 'maintain',
    deltaKg: 0,
    summary:
      'Buen trabajo de consolidación: mantén el peso actual buscando sumar +1 repetición limpia por serie en la siguiente semana.',
  };
}
