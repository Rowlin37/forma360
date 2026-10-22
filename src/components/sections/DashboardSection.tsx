'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Play,
  Ruler,
  Scale,
  TrendingDown,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useForma360 } from '@/context/Forma360Context';
import { summarizeDailyNutrition } from '@/lib/domain/nutrition';
import { calculateEnergyNeeds, computeBodyTrendSummary } from '@/lib/domain/physiology';
import { evaluateRunningStatus, RUNNING_STAGES } from '@/lib/domain/running';
import {
  formatEsDate,
  formatEsNumber,
  parseMetricInput,
  startOfIsoWeek,
  todayIsoInTimezone,
} from '@/lib/format';

export function DashboardSection() {
  const {
    state,
    setActiveSection,
    startLoggingPlannedSession,
    addBodyMeasurement,
  } = useForma360();

  const [quickWeight, setQuickWeight] = useState('');
  const [quickWaist, setQuickWaist] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  if (!state) return null;

  const todayIso = todayIsoInTimezone(state.profile.timezone);
  const weekStart = startOfIsoWeek(todayIso);

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

  const runningStatus = evaluateRunningStatus(
    state.running,
    state.runningLogs,
    state.completedSessions,
    state.sportActivities,
    todayIso
  );

  const todayNutrition = summarizeDailyNutrition(state.nutritionLogs, todayIso);

  // Próxima sesión prevista (hoy o siguiente pendiente)
  const sortedPending = [...state.plan.sessions]
    .filter((s) => s.status !== 'completed' && s.scheduledDate >= todayIso)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const nextSession = sortedPending[0] ?? state.plan.sessions[0]!;

  // Sesiones y minutos de esta semana
  const sessionsThisWeek = state.completedSessions.filter((s) => s.performedOn >= weekStart);
  const runsThisWeek = state.runningLogs.filter((r) => r.performedOn >= weekStart);

  const totalWeeklyMinutes =
    sessionsThisWeek.reduce((acc, s) => acc + s.durationMinutes, 0) +
    runsThisWeek.reduce((acc, r) => acc + r.durationMinutes, 0);

  const plannedActiveThisWeek = state.plan.sessions.filter(
    (s) => s.weekNumber === state.plan.currentWeek && s.sessionType !== 'rest'
  ).length;
  const completedCountThisWeek = sessionsThisWeek.length + runsThisWeek.length;
  const weeklyCompliancePct =
    plannedActiveThisWeek > 0
      ? Math.min(100, Math.round((completedCountThisWeek / plannedActiveThisWeek) * 100))
      : 0;

  // Fuerza: cambio entre primera y última sesión
  const strengthSessions = state.completedSessions.filter((s) => s.sessionType === 'strength');
  const strengthStatusText = (() => {
    if (strengthSessions.length === 0) {
      return 'Listo para registrar tu primera sesión de Fuerza A en casa';
    }
    if (strengthSessions.length === 1) {
      return `Base registrada (${strengthSessions[0]!.sets.length} series) — siguiente sesión buscará consolidar o progresar`;
    }
    const firstLoad = strengthSessions[0]!.sets.reduce((s, x) => s + x.loadKg * x.repsCompleted, 0);
    const lastLoad = strengthSessions[strengthSessions.length - 1]!.sets.reduce(
      (s, x) => s + x.loadKg * x.repsCompleted,
      0
    );
    const pct = firstLoad > 0 ? Math.round(((lastLoad - firstLoad) / firstLoad) * 100) : 0;
    return pct >= 0
      ? `Manteniendo/mejorando fuerza (${pct >= 0 ? '+' : ''}${pct} % tonelaje)`
      : `Carga moderada (-${Math.abs(pct)} % por ajuste/recuperación)`;
  })();

  // Racha de hábitos sin castigar días de descanso: cuenta días activos o de descanso pautado cumplidos
  const activeDatesSet = new Set<string>([
    ...state.completedSessions.map((s) => s.performedOn),
    ...state.runningLogs.map((r) => r.performedOn),
    ...state.nutritionLogs.map((n) => n.loggedOn),
    ...state.bodyMeasurements.map((b) => b.measuredOn),
  ]);
  const habitDaysCount = activeDatesSet.size;

  // Recuperación y carga percibida reciente
  const recentRpes = state.completedSessions.slice(-4).map((s) => s.perceivedRpe);
  const avgRpe =
    recentRpes.length > 0
      ? recentRpes.reduce((a, b) => a + b, 0) / recentRpes.length
      : 7.0;

  const medicalRedFlag =
    state.screening.chestPainOrSyncope || state.screening.disproportionateDyspnea;

  const handleQuickLogBody = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseMetricInput(quickWeight);
    const waist = parseMetricInput(quickWaist);
    if (w === null && waist === null) {
      setQuickFeedback('Introduce peso (kg) o cintura (cm) para registrar.');
      return;
    }
    const res = await addBodyMeasurement({
      measuredOn: todayIso,
      sourceType: 'manual',
      weightKg: w,
      waistCm: waist,
      hipCm: null,
      bodyFatPctEstimate: null,
      visceralFatRating: null,
      visceralScaleDevice: 'Manual',
      muscleMassKgEstimate: null,
      bodyWaterPctEstimate: null,
      boneMassKgEstimate: null,
      scaleProteinPctEstimate: null,
      scaleBmiReported: null,
      scaleBmrReported: null,
      restingHrBpm: null,
      photoDataUrl: null,
      notes: 'Registro rápido desde Inicio',
    });
    if (res.requiresConfirmation) {
      setQuickFeedback(res.anomalyReason ?? 'Valor inusual: revísalo en Seguimiento corporal.');
    } else if (res.saved) {
      setQuickWeight('');
      setQuickWaist('');
      setQuickFeedback('Registro guardado y media móvil actualizada.');
    }
  };

  return (
    <div className="space-y-6">
      {/* AVISOS MÉDICOS O DE VERIFICACIÓN CRÍTICA */}
      {medicalRedFlag && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-rose-500 bg-rose-500/10 p-4 flex items-start gap-3 text-rose-950 dark:text-rose-200"
        >
          <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold">
              Seguridad ante todo: síntomas cardiovasculares marcados en tu perfil
            </p>
            <p className="text-xs leading-relaxed">
              Ante dolor torácico, mareos/desmayos o falta de aire desproporcionada, interrumpe el ejercicio intenso (incluido el fútbol del miércoles) y solicita valoración médica adecuada antes de continuar.
            </p>
          </div>
        </div>
      )}

      {(energy.heightConfirmationPending || energy.scaleBmrAnomalyFlagged || !state.profile.onboardingCompleted) && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Datos iniciales pendientes de verificar (Estatura ~187,1 cm y TMB 779 kcal)</span>
            </div>
            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
              Tu báscula Xiaomi comunicó <strong>779 kcal/día</strong> de metabolismo basal, incompatible con 90 kg y ~63,5 kg de masa muscular. Forma360 <strong>descarta ese dato</strong> y estima <strong>{energy.estimatedBmrKcal} kcal/día</strong> (Mifflin-St Jeor). Completa tu cuestionario breve y confirma tu estatura exacta.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className="shrink-0 min-h-11 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
          >
            <span>Verificar perfil y cuestionario</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CABECERA Y ACCIÓN PRINCIPAL DEL DÍA ("¿Qué me toca hacer hoy?") */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-6 shadow-md border border-slate-800 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
              <span>¿Qué me toca hacer hoy? · {formatEsDate(nextSession.scheduledDate, true)}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {nextSession.title}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">{nextSession.objective}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div className="flex flex-wrap gap-4 text-xs text-slate-300">
              <span>Duración: <strong>{nextSession.estimatedMinutes} min</strong></span>
              <span>Esfuerzo objetivo: <strong>RPE {formatEsNumber(nextSession.expectedRpe, 1)}/10</strong></span>
              <span>Impacto: <strong>{nextSession.impactLevel === 'low' ? 'Bajo' : nextSession.impactLevel === 'medium' ? 'Moderado' : 'Alto'}</strong></span>
            </div>

            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => startLoggingPlannedSession(nextSession.id)}
                className="flex-1 sm:flex-initial min-h-12 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Registrar sesión</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('plan')}
                className="min-h-12 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs"
              >
                Ver semana
              </button>
            </div>
          </div>
        </div>

        {/* REGISTRO EXPRÉS EN 10 SEGUNDOS */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-500" />
              <span>Registro rápido de hoy</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              El peso diario fluctúa por agua y glucógeno; evaluamos siempre tu media móvil de 7 días.
            </p>
          </div>

          <form onSubmit={handleQuickLogBody} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="dash-quick-weight"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  Peso (kg)
                </label>
                <input
                  id="dash-quick-weight"
                  type="text"
                  inputMode="decimal"
                  value={quickWeight}
                  onChange={(e) => setQuickWeight(e.target.value)}
                  placeholder="Ej. 89,4"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="dash-quick-waist"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  Cintura (cm)
                </label>
                <input
                  id="dash-quick-waist"
                  type="text"
                  inputMode="decimal"
                  value={quickWaist}
                  onChange={(e) => setQuickWaist(e.target.value)}
                  placeholder="Ej. 96,0"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full min-h-11 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:opacity-95 text-white font-semibold text-xs"
            >
              Guardar medición del día
            </button>
            {quickFeedback && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                {quickFeedback}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* MÉTRICAS CLAVE RESPONDIENDO A LAS PREGUNTAS DEL USUARIO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Peso actual y media 7d */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Peso y Media 7 días</span>
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatEsNumber(trend.latestWeightKg, 1)} kg
            </span>
            <span className="text-xs font-medium text-slate-500">
              (media 7d: {formatEsNumber(trend.avg7dWeightKg, 2)} kg)
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Objetivo ref.: <strong>{formatEsNumber(state.profile.targetWeightKg, 1)} kg</strong> · Falta{' '}
            <strong>
              {formatEsNumber(Math.max(0, trend.avg7dWeightKg - state.profile.targetWeightKg), 1)} kg
            </strong>
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            {trend.nextMilestoneKg
              ? `Próximo hito: ${formatEsNumber(trend.nextMilestoneKg, 1)} kg${
                  trend.estimatedWeeksToNextMilestone
                    ? ` (~${trend.estimatedWeeksToNextMilestone} sem.)`
                    : ''
                }`
              : 'Objetivo de peso alcanzado'}
          </p>
        </div>

        {/* 2. Cintura y grasa estimada */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Cintura y Composición</span>
            <Ruler className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {trend.latestWaistCm !== null ? `${formatEsNumber(trend.latestWaistCm, 1)} cm` : 'Sin medir aún'}
            </span>
            {trend.waistChangeCm !== null && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ({trend.waistChangeCm > 0 ? '+' : ''}
                {formatEsNumber(trend.waistChangeCm, 1)} cm)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Grasa est. báscula:{' '}
            <strong>{formatEsNumber(trend.latestBodyFatEstimate, 1)} %</strong> (orientativa BIA)
          </p>
          <button
            type="button"
            onClick={() => setActiveSection('body')}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {trend.latestWaistCm === null
              ? 'Ver cómo tomar tu 1.ª medida semanal →'
              : 'Ver gráficas separadas de evolución →'}
          </button>
        </div>

        {/* 3. Cumplimiento semanal, minutos y fuerza */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Cumplimiento y Fuerza</span>
            <Dumbbell className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {weeklyCompliancePct} %
            </span>
            <span className="text-xs text-slate-500">
              · {totalWeeklyMinutes} min esta semana
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
            {strengthStatusText}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            <span>Constancia: {habitDaysCount} días con registro (descansar suma salud)</span>
          </div>
        </div>

        {/* 4. Nutrición del día y recuperación */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Nutrición Hoy y Carga</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {Math.round(todayNutrition.kcal)}
            </span>
            <span className="text-xs text-slate-500">
              / {energy.targetIntakeKcal} kcal obj.
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Proteína hoy: <strong>{formatEsNumber(todayNutrition.proteinG, 1)} g</strong> /{' '}
            {energy.proteinTargetGrams} g
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
            <span>
              Carga media: RPE {formatEsNumber(avgRpe, 1)} · Impacto fútbol+carrera{' '}
              {runningStatus.combinedImpactScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* GRÁFICA DE TENDENCIA DE PESO + ETAPA ACTUAL DE MEDIA MARATÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tendencia de peso real vs. Media móvil de 7 días
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ritmo previsto saludable: -{formatEsNumber(energy.estimatedWeeklyLossKgRange[0], 2)} a -
                {formatEsNumber(energy.estimatedWeeklyLossKgRange[1], 2)} kg/semana (estimación energética).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('body')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Añadir histórico / cintura →
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={['dataMin - 2', 'dataMax + 1']} tick={{ fontSize: 11 }} unit=" kg" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  name="Peso registrado (kg)"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="movingAvg7d"
                  name="Media móvil 7 días (kg)"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Footprints className="w-4 h-4" />
                <span>Rumbo a Media Maratón</span>
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold">
                Etapa {state.running.currentStage}/8
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {RUNNING_STAGES[state.running.currentStage - 1]?.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Esquema actual Caminar-Correr: <strong>{state.running.repetitions} ×</strong> (
              {Math.round(state.running.walkSeconds / 60)} min caminar +{' '}
              {formatEsNumber(state.running.runSeconds / 60, 1)} min trote suave).
            </p>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Carga de impacto combinada:
              </p>
              <p>
                Fútbol habitual ({runningStatus.weeklyFootballImpactMinutes} min/sem) + Carrera (
                {runningStatus.weeklyRunningMinutes} min/sem).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('running')}
            className="w-full min-h-11 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold text-xs inline-flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Abrir temporizador Ca-Co y etapas 21K</span>
          </button>
        </div>
      </div>
    </div>
  );
}
