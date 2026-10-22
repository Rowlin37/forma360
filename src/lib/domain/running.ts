import {
  CompletedSessionLog,
  RunningProgressionState,
  RunningSessionLog,
  SportActivityLog,
} from '@/lib/types';

export interface RunningStageDefinition {
  stage: number;
  title: string;
  subtitle: string;
  targetDescription: string;
  defaultWalkSeconds: number;
  defaultRunSeconds: number;
  defaultRepetitions: number;
  paceGuidance: string;
  noWatchAlternative: string;
  advancementCriteria: string;
}

/**
 * Los 8 peldaños progresivos desde sedentarismo / reinicio hasta Media Maratón (21,1 km),
 * sin fechas rígidas ni exigencia de alcanzar 75 kg antes de empezar con prudencia.
 */
export const RUNNING_STAGES: RunningStageDefinition[] = [
  {
    stage: 1,
    title: '1. Base cardiovascular de bajo impacto',
    subtitle: 'Adaptación cardiorrespiratoria sin estrés articular extra',
    targetDescription: '2-3 sesiones semanales de 30-40 min combinando bici estática Zona 2 y caminata.',
    defaultWalkSeconds: 300,
    defaultRunSeconds: 0,
    defaultRepetitions: 6,
    paceGuidance: 'Intensidad conversacional cómoda (RPE 4/10).',
    noWatchAlternative: 'Respira por la nariz o mantén frases largas sin entrecortarte.',
    advancementCriteria: 'Completar 2 semanas seguidas sin molestias en gemelos, Aquiles ni rodillas.',
  },
  {
    stage: 2,
    title: '2. Caminar a paso vivo sostenido',
    subtitle: 'Fortalecimiento tendinoso y del pie previo al trote',
    targetDescription: '40 a 55 minutos de caminata enérgica continua (cadencia viva).',
    defaultWalkSeconds: 300,
    defaultRunSeconds: 0,
    defaultRepetitions: 9,
    paceGuidance: 'Paso vivo y decidido (RPE 4-5/10), sin llegar a marchar forzado.',
    noWatchAlternative: 'Cuenta minutos con el móvil en el bolsillo; céntrate en cadencia ágil.',
    advancementCriteria: 'Caminar 45-50 min cómodamente recuperando al 100 % al día siguiente.',
  },
  {
    stage: 3,
    title: '3. Intervalos conservadores Caminar-Correr (Ca-Co)',
    subtitle: 'Introducción gradual al impacto elástico',
    targetDescription: 'Alternar bloques suaves de caminata y trote ligero (p. ej. 6 × [4 min andar + 1 min trotar] -> [2 min andar + 3 min trotar]).',
    defaultWalkSeconds: 240,
    defaultRunSeconds: 60,
    repetitionsCountHint: 6,
    defaultRepetitions: 6,
    paceGuidance: 'Trote tan suave como caminar deprisa (RPE 5/10). Prohibido esprintar.',
    noWatchAlternative: 'Usa el temporizador sonoro integrado de Forma360 en el móvil.',
    advancementCriteria: 'Acumular 18-20 min totales de trote en bloques con molestia <= 1/10.',
  } as RunningStageDefinition,
  {
    stage: 4,
    title: '4. Carrera continua cómoda (20-30 min)',
    subtitle: 'Consolidación aeróbica continua y primer hito de 1 km -> 3 km',
    targetDescription: 'Rodaje continuo suave de 20 a 30 minutos sin parar (o 1 pausa breve de hidratación).',
    defaultWalkSeconds: 60,
    defaultRunSeconds: 600,
    defaultRepetitions: 3,
    paceGuidance: 'Ritmo conversacional real (Zona 2, RPE 5-6/10). El ritmo por km aún es secundario.',
    noWatchAlternative: 'Corre por tiempo (25 min ida y vuelta: 12,5 min ida + 12,5 min vuelta).',
    advancementCriteria: 'Correr 30 min continuos con sensación de poder seguir 5 min más.',
  },
  {
    stage: 5,
    title: '5. Completar tus primeros 5 km sólidos',
    subtitle: 'Primer gran hito de fondo popular',
    targetDescription: 'Completar 5,0 km continuos (o ~32-38 min) con buena postura y sin sobrecarga.',
    defaultWalkSeconds: 0,
    defaultRunSeconds: 2100,
    defaultRepetitions: 1,
    paceGuidance: 'Salida conservadora los primeros 2 km (RPE 5) y ritmo fluido estable al final (RPE 6-7).',
    noWatchAlternative: 'Recorrido urbano o parque medido una sola vez en mapa (5 km).',
    advancementCriteria: 'Completar 5 km dos veces en 3 semanas sin dolor articular residual.',
  },
  {
    stage: 6,
    title: '6. Mejorar la resistencia y completar 10 km',
    subtitle: 'Construcción de volumen aeróbico real compatible con el fútbol',
    targetDescription: 'Tirada larga progresiva de 6 -> 8 -> 10 km en fin de semana + rodaje suave entre semana.',
    defaultWalkSeconds: 0,
    defaultRunSeconds: 3600,
    defaultRepetitions: 1,
    paceGuidance: '85 % del tiempo en Zona 2 suave; el fútbol del miércoles ya aporta tu estímulo intenso (VO2max).',
    noWatchAlternative: 'Control por tiempo (55-68 min cómodos) + escalas de esfuerzo percibido.',
    advancementCriteria: 'Completar 10 km cómodos y acumular base estable durante al menos 3-4 semanas.',
  },
  {
    stage: 7,
    title: '7. Preparación específica para Media Maratón (21,1 km)',
    subtitle: 'Se desbloquea al consolidar la base aeróbica sin molestias',
    targetDescription: 'Progresión prudente de tirada larga (12 -> 14 -> 16 -> 18 km con semanas de descarga cada 3-4 semanas).',
    defaultWalkSeconds: 60,
    defaultRunSeconds: 1200,
    defaultRepetitions: 4,
    paceGuidance: 'Tiradas largas lentas + ensayo de hidratación e ingesta de carbohidratos a partir de 75 min.',
    noWatchAlternative: 'Estrategia Ca-Co de larga distancia (ej. 15 min trote + 1 min beber andando) totalmente válida.',
    advancementCriteria: 'Superar tirada de 16-18 km asimilando bien la carga semanal total.',
  },
  {
    stage: 8,
    title: '8. Descarga (Tapering), recuperación y estrategia 21,1 km',
    subtitle: 'Llegar fresco, hidratado y disfrutar cruzando la meta',
    targetDescription: 'Reducción gradual del 30-50 % del volumen las 2 semanas previas manteniendo chispa suave.',
    defaultWalkSeconds: 0,
    defaultRunSeconds: 2400,
    defaultRepetitions: 1,
    paceGuidance: 'Empezar la carrera 10-15 s/km más suave que tu ritmo objetivo los primeros 5 km.',
    noWatchAlternative: 'Controlar respiración y sensaciones por bloques de 5 km + avituallamientos.',
    advancementCriteria: 'Completar los 21,1 km con salud e integridad muscular.',
  },
];

export interface RunningReadinessReport {
  weeklyRunningMinutes: number;
  weeklyFootballImpactMinutes: number;
  combinedImpactScore: number; // 0..100
  impactStatus: 'safe' | 'moderate' | 'high_caution';
  halfMarathonUnlocked: boolean;
  halfMarathonGateReason: string;
  milestones: {
    id: string;
    label: string;
    targetKm: number;
    achieved: boolean;
  }[];
  nextIntervalSuggestion: {
    walkSeconds: number;
    runSeconds: number;
    repetitions: number;
    rationale: string;
  };
}

export function evaluateRunningStatus(
  progression: RunningProgressionState,
  runningLogs: RunningSessionLog[],
  completedSessions: CompletedSessionLog[],
  sportActivities: SportActivityLog[],
  referenceDateIso: string
): RunningReadinessReport {
  const cutoffMs = new Date(referenceDateIso + 'T12:00:00Z').getTime() - 7 * 86_400_000;

  const recentRuns = runningLogs.filter(
    (r) => new Date(r.performedOn + 'T12:00:00Z').getTime() >= cutoffMs
  );
  const weeklyRunningMinutes = recentRuns.reduce((sum, r) => sum + r.durationMinutes, 0);

  // Contabilizar impacto del fútbol (miércoles 75 min + domingo 20 min si no hay registro puntual)
  const loggedFootballSessions = completedSessions.filter(
    (s) =>
      s.sessionType === 'football' &&
      new Date(s.performedOn + 'T12:00:00Z').getTime() >= cutoffMs
  );
  const recurringFootballMinutes = sportActivities
    .filter((a) => a.isRecurring)
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  const weeklyFootballImpactMinutes =
    loggedFootballSessions.length > 0
      ? loggedFootballSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
      : recurringFootballMinutes || 95;

  // El fútbol del miércoles implica sprints, frenadas y cambios de dirección (factor impacto 1.25x)
  const combinedImpactScore = Math.min(
    100,
    Math.round((weeklyRunningMinutes * 0.8 + weeklyFootballImpactMinutes * 0.55))
  );

  const recentPain = recentRuns.some((r) => r.jointDiscomfort >= 4);
  const maxLoggedKm = runningLogs.reduce(
    (max, r) => Math.max(max, r.distanceKm ?? 0),
    progression.longestDistanceKm
  );

  const halfMarathonUnlocked =
    progression.halfMarathonReadyBase ||
    (maxLoggedKm >= 8.5 && !recentPain && progression.currentStage >= 6);

  const halfMarathonGateReason = halfMarathonUnlocked
    ? 'Base aeróbica verificada (>= 8,5-10 km sin dolor articular): el bloque específico de 21,1 km está habilitado.'
    : `Preparación específica de 21,1 km protegida por seguridad: consolida antes la Etapa 6 (rodaje cómodo de ~8,5-10 km sin molestias; actual máx. ${maxLoggedKm
        .toFixed(1)
        .replace('.', ',')} km). Sin prisa ni fechas rígidas.`;

  // Sugerencia conservadora del siguiente ajuste Caminar-Correr
  let nextWalk = progression.walkSeconds;
  let nextRun = progression.runSeconds;
  const nextReps = progression.repetitions;
  let rationale =
    'Mantén el esquema actual al menos 1-2 sesiones más para consolidar tendones sin prisa.';

  if (recentPain) {
    nextRun = Math.max(30, progression.runSeconds - 30);
    nextWalk = progression.walkSeconds + 30;
    rationale =
      'Se detectaron molestias articulares (>= 4/10): reducimos tramo de carrera +30 s de caminata o sustituimos por bicicleta estática esta semana.';
  } else if (recentRuns.length >= 2 && recentRuns.every((r) => r.perceivedRpe <= 6.5 && r.jointDiscomfort <= 2)) {
    nextRun = progression.runSeconds + 30;
    nextWalk = Math.max(60, progression.walkSeconds - 15);
    rationale =
      'Últimas sesiones asimiladas con RPE suave y sin dolor: puedes añadir +30 s de trote por repetición (no superes +10 % de volumen semanal).';
  }

  return {
    weeklyRunningMinutes: Math.round(weeklyRunningMinutes),
    weeklyFootballImpactMinutes,
    combinedImpactScore,
    impactStatus:
      recentPain || combinedImpactScore >= 82
        ? 'high_caution'
        : combinedImpactScore >= 55
          ? 'moderate'
          : 'safe',
    halfMarathonUnlocked,
    halfMarathonGateReason,
    milestones: [
      { id: 'm-1k', label: 'Primer 1 km continuo sin ahogo', targetKm: 1, achieved: maxLoggedKm >= 1 },
      { id: 'm-5k', label: 'Completar 5 km cómodos', targetKm: 5, achieved: maxLoggedKm >= 5 },
      { id: 'm-10k', label: 'Completar 10 km sólidos', targetKm: 10, achieved: maxLoggedKm >= 10 },
      {
        id: 'm-21k',
        label: 'Media Maratón (21,1 km)',
        targetKm: 21.1,
        achieved: maxLoggedKm >= 21.05,
      },
    ],
    nextIntervalSuggestion: {
      walkSeconds: nextWalk,
      runSeconds: nextRun,
      repetitions: nextReps,
      rationale,
    },
  };
}
