'use client';

import React, { useState } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useForma360 } from '@/context/Forma360Context';
import { computeBodyTrendSummary } from '@/lib/domain/physiology';
import { addDaysIso, formatEsNumber, todayIsoInTimezone } from '@/lib/format';

export function StatsSection() {
  const { state } = useForma360();
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90 | 365>(30);
  const [selectedExerciseSlug, setSelectedExerciseSlug] = useState<string>('bench-press-barbell');

  if (!state) return null;

  const todayIso = todayIsoInTimezone(state.profile.timezone);
  const cutoffDate = addDaysIso(todayIso, -rangeDays);

  const trend = computeBodyTrendSummary(
    state.bodyMeasurements,
    state.profile.initialWeightKg,
    state.profile.targetWeightKg
  );

  const filteredSessions = state.completedSessions.filter((s) => s.performedOn >= cutoffDate);
  const filteredRuns = state.runningLogs.filter((r) => r.performedOn >= cutoffDate);
  const filteredNutrition = state.nutritionLogs.filter((n) => n.loggedOn >= cutoffDate);

  const totalMinutesInPeriod =
    filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0) +
    filteredRuns.reduce((acc, r) => acc + r.durationMinutes, 0);

  const totalRunKm = filteredRuns.reduce((acc, r) => acc + (r.distanceKm ?? 0), 0);

  // Media diaria real de proteína en días registrados
  const byNutritionDay = new Map<string, number>();
  for (const n of filteredNutrition) {
    byNutritionDay.set(n.loggedOn, (byNutritionDay.get(n.loggedOn) ?? 0) + n.proteinG);
  }
  const avgProteinDaily =
    byNutritionDay.size > 0
      ? Array.from(byNutritionDay.values()).reduce((a, b) => a + b, 0) / byNutritionDay.size
      : 0;

  // Evolución de carga máxima por ejercicio en sesiones de fuerza
  const distinctLoggedExercises = Array.from(
    new Set(
      state.completedSessions.flatMap((s) => s.sets.map((x) => `${x.exerciseSlug}|${x.exerciseName}`))
    )
  ).map((pair) => {
    const [slug, name] = pair.split('|');
    return { slug: slug ?? '', name: name ?? '' };
  });

  const activeExerciseSlug =
    distinctLoggedExercises.find((e) => e.slug === selectedExerciseSlug)?.slug ??
    distinctLoggedExercises[0]?.slug ??
    selectedExerciseSlug;

  const strengthSeries = state.completedSessions
    .filter((s) => s.sets.some((set) => set.exerciseSlug === activeExerciseSlug))
    .map((s) => {
      const relevant = s.sets.filter((set) => set.exerciseSlug === activeExerciseSlug);
      const topLoad = Math.max(...relevant.map((r) => r.loadKg));
      const volume = relevant.reduce((sum, r) => sum + r.loadKg * r.repsCompleted, 0);
      return {
        date: s.performedOn,
        topLoadKg: topLoad,
        volumeKg: volume,
      };
    });

  // Minutos acumulados por fecha
  const minutesByDayMap = new Map<string, number>();
  for (const s of filteredSessions) {
    minutesByDayMap.set(s.performedOn, (minutesByDayMap.get(s.performedOn) ?? 0) + s.durationMinutes);
  }
  for (const r of filteredRuns) {
    minutesByDayMap.set(r.performedOn, (minutesByDayMap.get(r.performedOn) ?? 0) + r.durationMinutes);
  }
  const activityBarData = Array.from(minutesByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({ date, minutes }));

  // Logros constructivos y no punitivos
  const positiveAchievements = [
    {
      title: 'Punto de partida honesto establecido',
      detail: 'Perfil inicial registrado distinguiendo peso real de estimaciones de báscula.',
      unlocked: true,
    },
    {
      title: 'Primera sesión de fuerza completada',
      detail: 'Estímulo clave para preservar masa muscular durante la pérdida de grasa.',
      unlocked: state.completedSessions.some((s) => s.sessionType === 'strength'),
    },
    {
      title: 'Constancia combinada con el fútbol',
      detail: 'Al menos 3 sesiones acumuladas respetando descanso y control de carga.',
      unlocked: state.completedSessions.length + state.runningLogs.length >= 3,
    },
    {
      title: 'Primera medición consistente de cintura',
      detail: 'Indicador clave de reducción de grasa abdominal más fiable que el peso diario.',
      unlocked: state.bodyMeasurements.some((b) => b.waistCm !== null),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Historial, Estadísticas y Evolución Global
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Compara ventanas temporales y valora tu progreso por fuerza, cintura, resistencia y adherencia, no solo por la báscula.
          </p>
        </div>

        <div className="inline-flex rounded-xl p-1 bg-slate-200/70 dark:bg-slate-800 self-start">
          {([7, 30, 90, 365] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                rangeDays === days
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {days === 365 ? 'Todo' : `${days} días`}
            </button>
          ))}
        </div>
      </div>

      {/* COMPARATIVAS 7 / 30 / 90 DÍAS Y VOLUMEN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">Inicial vs Media actual</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatEsNumber(trend.initialWeightKg, 1)} → {formatEsNumber(trend.avg7dWeightKg, 1)} kg
          </div>
          <p className="text-[11px] text-slate-500">
            7d: {trend.change7dKg !== null ? `${formatEsNumber(trend.change7dKg, 2)} kg` : '—'} · 30d:{' '}
            {trend.change30dKg !== null ? `${formatEsNumber(trend.change30dKg, 2)} kg` : '—'} · 90d:{' '}
            {trend.change90dKg !== null ? `${formatEsNumber(trend.change90dKg, 2)} kg` : '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">
            Actividad en periodo ({rangeDays}d)
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {totalMinutesInPeriod} min
          </div>
          <p className="text-[11px] text-slate-500">
            {filteredSessions.length} sesiones entrenadas + {filteredRuns.length} salidas de carrera
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">Distancia corriendo</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatEsNumber(totalRunKm, 2)} km
          </div>
          <p className="text-[11px] text-slate-500">
            Etapa actual: {state.running.currentStage}/8 hacia Media Maratón
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">Adherencia proteica media</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {byNutritionDay.size > 0 ? `${formatEsNumber(avgProteinDaily, 0)} g/día` : 'Sin días aún'}
          </div>
          <p className="text-[11px] text-slate-500">
            {byNutritionDay.size} días con registro alimentario en el periodo
          </p>
        </div>
      </div>

      {/* GRÁFICOS DE PROGRESIÓN DE FUERZA Y MINUTOS ACTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Progresión de fuerza por ejercicio</span>
            </h2>
            {distinctLoggedExercises.length > 0 && (
              <select
                value={activeExerciseSlug}
                onChange={(e) => setSelectedExerciseSlug(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs"
              >
                {distinctLoggedExercises.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {strengthSeries.length === 0 ? (
            <p className="text-xs text-slate-500 py-12 text-center">
              Completa tus primeras sesiones de fuerza en «Entrenamientos» para ver la curva de carga máxima y volumen total.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={strengthSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="topLoadKg"
                    name="Carga máx. (kg)"
                    stroke="#10b981"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Minutos de actividad acumulados por día
          </h2>
          {activityBarData.length === 0 ? (
            <p className="text-xs text-slate-500 py-12 text-center">
              Registra una sesión de fuerza, bici, carrera o tu partido de fútbol para visualizar la carga diaria.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityBarData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" min" />
                  <Tooltip />
                  <Bar dataKey="minutes" name="Minutos activos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* LOGROS DE CONSTANCIA Y MEJORA PERSONAL (SIN MENSAJES CULPABILIZADORES) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Award className="w-4 h-4 text-emerald-500" />
          <span>Hitos de constancia y salud (descansar a tiempo también es entrenar)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {positiveAchievements.map((ach) => (
            <div
              key={ach.title}
              className={`rounded-xl border p-3.5 text-xs space-y-1 ${
                ach.unlocked
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-slate-200 dark:border-slate-800 opacity-70'
              }`}
            >
              <div className="font-bold text-slate-900 dark:text-white">{ach.title}</div>
              <p className="text-slate-600 dark:text-slate-400">{ach.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
