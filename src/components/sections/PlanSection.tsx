'use client';

import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import {
  addDaysIso,
  DAY_NAMES_ES,
  formatEsDate,
  formatEsNumber,
  startOfIsoWeek,
  todayIsoInTimezone,
} from '@/lib/format';
import { PlannedSession, TrainingPlan } from '@/lib/types';

export function PlanSection() {
  const {
    state,
    startLoggingPlannedSession,
    moveSessionToDate,
    regeneratePlan,
    regenerateCurrentWeekOnly,
  } = useForma360();

  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [selectedWeek, setSelectedWeek] = useState<number>(state?.plan.currentWeek ?? 1);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [planFocus, setPlanFocus] = useState<TrainingPlan['focus']>(
    state?.plan.focus ?? 'fat_loss_strength_base'
  );
  const [durationWeeks, setDurationWeeks] = useState<number>(state?.plan.durationWeeks ?? 8);
  const [lastMoveNotice, setLastMoveNotice] = useState<string | null>(null);

  if (!state) return null;

  const todayIso = todayIsoInTimezone(state.profile.timezone);
  const weekSessions = state.plan.sessions
    .filter((s) => s.weekNumber === selectedWeek)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const mondayOfSelectedWeek = addDaysIso(
    startOfIsoWeek(state.plan.startDate),
    (selectedWeek - 1) * 7
  );

  const handleDropOnDay = async (targetDayOfWeek: number) => {
    if (!draggedSessionId) return;
    const newDate = addDaysIso(mondayOfSelectedWeek, targetDayOfWeek - 1);
    const warn = await moveSessionToDate(draggedSessionId, newDate, targetDayOfWeek);
    setLastMoveNotice(warn);
    setDraggedSessionId(null);
  };

  const handleSelectDayMove = async (session: PlannedSession, newDayOfWeek: number) => {
    const newDate = addDaysIso(mondayOfSelectedWeek, newDayOfWeek - 1);
    const warn = await moveSessionToDate(session.id, newDate, newDayOfWeek);
    setLastMoveNotice(warn);
  };

  const badgeByType: Record<PlannedSession['sessionType'], string> = {
    strength: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    cardio: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    running: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    football: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    mobility: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    recovery: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
    rest: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    review: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mi Plan y Organización Semanal
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {state.plan.name} · Arrastra o cambia cualquier sesión de día sin perder tu progresión.
          </p>
        </div>

        {/* Selector Vista Día / Semana / Mes */}
        <div className="inline-flex rounded-xl p-1 bg-slate-200/70 dark:bg-slate-800 self-start">
          {(
            [
              { id: 'day', label: 'Día' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mes (4 sem.)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                viewMode === tab.id
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* PANEL DE CONFIGURACIÓN Y REGENERACIÓN DEL MOTOR DE PLANES */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
            <span>Motor adaptable de planificación ({state.plan.durationWeeks} semanas)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void regenerateCurrentWeekOnly(selectedWeek)}
              className="min-h-10 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerar Semana {selectedWeek} (conserva completadas)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label
              htmlFor="plan-focus-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Objetivo del bloque (preparado para etapas actuales y futuras)
            </label>
            <select
              id="plan-focus-select"
              value={planFocus}
              onChange={(e) => setPlanFocus(e.target.value as TrainingPlan['focus'])}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium"
            >
              <option value="fat_loss_strength_base">
                Pérdida de grasa + Conservación muscular + Fútbol + Base carrera
              </option>
              <option value="hypertrophy">Hipertrofia y ganancia muscular estructurada</option>
              <option value="max_strength">Fuerza máxima progresiva</option>
              <option value="endurance_maintenance">
                Mantenimiento de peso y priorización aeróbica (Media Maratón)
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="plan-weeks-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Duración del ciclo
            </label>
            <select
              id="plan-weeks-select"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium"
            >
              <option value={4}>4 semanas (microciclo corto)</option>
              <option value={8}>8 semanas (7 carga + 1 descarga)</option>
              <option value={12}>12 semanas (ciclo extendido)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void regeneratePlan(planFocus, durationWeeks)}
            className="min-h-10 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
          >
            Generar nuevo ciclo
          </button>
        </div>

        {/* Selector de semana 1..N */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
          {Array.from({ length: state.plan.durationWeeks }, (_, idx) => idx + 1).map((wk) => (
            <button
              key={wk}
              type="button"
              onClick={() => setSelectedWeek(wk)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                selectedWeek === wk
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-500 dark:text-slate-950 dark:border-emerald-500'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Semana {wk} {wk % 8 === 0 ? '· Descarga' : ''}
            </button>
          ))}
        </div>
      </div>

      {lastMoveNotice && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-950 dark:text-amber-200">
          {lastMoveNotice}
        </div>
      )}

      {/* VISTA SEMANA (DRAG & DROP + SELECTOR DE DÍA) */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DAY_NAMES_ES.map((dayName, idx) => {
            const dow = idx + 1;
            const dayIso = addDaysIso(mondayOfSelectedWeek, idx);
            const daySessions = weekSessions.filter((s) => s.dayOfWeek === dow);

            return (
              <div
                key={dow}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void handleDropOnDay(dow)}
                className={`rounded-2xl border p-4 space-y-3 transition ${
                  dayIso === todayIso
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {dayName}
                    </span>
                    <span className="text-xs text-slate-500">{formatEsDate(dayIso)}</span>
                  </div>
                  {dayIso === todayIso && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                      HOY
                    </span>
                  )}
                </div>

                {daySessions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Día libre / descanso completo (puedes soltar una sesión aquí si necesitas reorganizar).
                  </p>
                ) : (
                  daySessions.map((session) => (
                    <div
                      key={session.id}
                      draggable
                      onDragStart={() => setDraggedSessionId(session.id)}
                      className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1.5 ${
                              badgeByType[session.sessionType]
                            }`}
                          >
                            {session.sessionType.toUpperCase()} · RPE{' '}
                            {formatEsNumber(session.expectedRpe, 1)}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {session.title}
                          </h3>
                        </div>
                        {session.status === 'completed' && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {session.objective}
                      </p>

                      {session.exercises.length > 0 && (
                        <ul className="space-y-1.5 border-t border-slate-200/70 dark:border-slate-800 pt-2.5">
                          {session.exercises.map((ex, i) => (
                            <li
                              key={`${ex.exerciseSlug}-${i}`}
                              className="text-xs flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300"
                            >
                              <span className="truncate">
                                <strong>
                                  {ex.sets}×{ex.reps}
                                </strong>{' '}
                                · {ex.exerciseName}
                                {ex.substitutedFrom && (
                                  <em className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                    {' '}
                                    (adaptado)
                                  </em>
                                )}
                              </span>
                              {ex.suggestedLoadKg !== null && (
                                <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">
                                  {formatEsNumber(ex.suggestedLoadKg, 1)} kg
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{session.estimatedMinutes} min</span>
                          <span>· Mover a:</span>
                          <select
                            aria-label={`Mover sesión ${session.title} a otro día`}
                            value={session.dayOfWeek}
                            onChange={(e) =>
                              void handleSelectDayMove(session, Number(e.target.value))
                            }
                            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-800 dark:text-slate-200"
                          >
                            {DAY_NAMES_ES.map((d, dIdx) => (
                              <option key={d} value={dIdx + 1}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => startLoggingPlannedSession(session.id)}
                          className="min-h-9 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{session.status === 'completed' ? 'Repetir/Ver' : 'Realizar'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA DÍA DETALLADA */}
      {viewMode === 'day' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES_ES.map((name, i) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedDayIndex(i + 1)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                  selectedDayIndex === i + 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {weekSessions
            .filter((s) => s.dayOfWeek === selectedDayIndex)
            .map((session) => (
              <div key={session.id} className="space-y-4 pt-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {session.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {session.objective}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
                    <p className="font-bold text-slate-900 dark:text-white mb-1">Calentamiento</p>
                    <p className="text-slate-600 dark:text-slate-400">{session.warmup}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
                    <p className="font-bold text-slate-900 dark:text-white mb-1">
                      Vuelta a la calma y progresión
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {session.cooldown} · {session.progressionRule}
                    </p>
                  </div>
                </div>
                {session.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {idx + 1}. {ex.exerciseName}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {ex.sets} series × {ex.reps} · Descanso {ex.restSeconds} s
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Esfuerzo: {ex.rpeTarget} · Alternativa si falta material: {ex.fallbackExerciseName}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {ex.progressionCriteria}
                    </p>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      {/* VISTA MES (4 SEMANAS DE UN VISTAZO) */}
      {viewMode === 'month' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 overflow-x-auto">
          <div className="min-w-[680px] space-y-3">
            <div className="grid grid-cols-7 gap-2 text-xs font-bold text-slate-500 px-1">
              {DAY_NAMES_ES.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            {[1, 2, 3, 4].map((wk) => (
              <div key={wk} className="grid grid-cols-7 gap-2">
                {DAY_NAMES_ES.map((_, dIdx) => {
                  const s = state.plan.sessions.find(
                    (item) => item.weekNumber === wk && item.dayOfWeek === dIdx + 1
                  );
                  return (
                    <div
                      key={`${wk}-${dIdx}`}
                      onClick={() => {
                        setSelectedWeek(wk);
                        setViewMode('week');
                      }}
                      className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 hover:border-emerald-500 transition space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>S{wk}</span>
                        <span>{s ? formatEsDate(s.scheduledDate) : ''}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {s ? s.title.replace(/^Semana \d+ · /, '') : 'Descanso'}
                      </p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORIAL DE VERSIONES DEL PLAN */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Calendar className="w-4 h-4" />
          <span>Versiones registradas de tu plan ({state.plan.versions.length})</span>
        </div>
        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
          {state.plan.versions.slice(-4).reverse().map((v) => (
            <p key={v.versionNumber}>
              <strong>v{v.versionNumber}:</strong> {v.changeReason}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
