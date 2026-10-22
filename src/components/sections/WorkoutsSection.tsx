'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
} from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import { formatEsDate, formatEsNumber, parseMetricInput, todayIsoInTimezone } from '@/lib/format';
import { CompletedSessionLog, PerformedSetLog } from '@/lib/types';

interface EditableSetRow {
  exerciseSlug: string;
  exerciseName: string;
  setIndex: number;
  targetReps: number;
  repsCompleted: string;
  loadKg: string;
  restSeconds: number;
}

function buildInitialSetRows(
  exercises: {
    exerciseSlug: string;
    exerciseName: string;
    sets: number;
    reps: string;
    suggestedLoadKg: number | null;
    restSeconds: number;
  }[]
): EditableSetRow[] {
  const generated: EditableSetRow[] = [];
  for (const ex of exercises) {
    const defaultTargetReps = Number((ex.reps.match(/\d+/) ?? ['10'])[0]) || 10;
    for (let i = 1; i <= ex.sets; i++) {
      generated.push({
        exerciseSlug: ex.exerciseSlug,
        exerciseName: ex.exerciseName,
        setIndex: i,
        targetReps: defaultTargetReps,
        repsCompleted: String(defaultTargetReps),
        loadKg: ex.suggestedLoadKg !== null ? String(ex.suggestedLoadKg) : '20',
        restSeconds: ex.restSeconds || 90,
      });
    }
  }
  return generated;
}

export function WorkoutsSection() {
  const {
    state,
    selectedSessionForLogId,
    logCompletedWorkout,
    deleteCompletedWorkout,
    addRecurringOrManualSport,
  } = useForma360();

  const initialChosenSession = (() => {
    if (!state) return undefined;
    const strengthSessions = state.plan.sessions.filter((s) => s.sessionType === 'strength');
    return (
      state.plan.sessions.find((s) => s.id === selectedSessionForLogId) ??
      strengthSessions.find((s) => s.status !== 'completed') ??
      strengthSessions[0]
    );
  })();

  const [tab, setTab] = useState<'strength' | 'football' | 'cardio'>(() => {
    if (initialChosenSession?.sessionType === 'football') return 'football';
    if (
      initialChosenSession?.sessionType === 'cardio' ||
      initialChosenSession?.sessionType === 'recovery'
    ) {
      return 'cardio';
    }
    return 'strength';
  });
  const [selectedPlannedId, setSelectedPlannedId] = useState<string>(
    initialChosenSession?.id ?? ''
  );
  const [dateIso, setDateIso] = useState<string>(() =>
    state ? todayIsoInTimezone(state.profile.timezone) : '2026-10-22'
  );
  const [durationMinutes, setDurationMinutes] = useState<string>(
    initialChosenSession ? String(initialChosenSession.estimatedMinutes) : '45'
  );
  const [perceivedRpe, setPerceivedRpe] = useState<number>(7.5);
  const [completedFully, setCompletedFully] = useState<boolean>(true);
  const [feltDiscomfort, setFeltDiscomfort] = useState<boolean>(false);
  const [discomfortNotes, setDiscomfortNotes] = useState<string>('');
  const [readinessNext, setReadinessNext] =
    useState<CompletedSessionLog['readinessNext']>('good');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [rows, setRows] = useState<EditableSetRow[]>(() =>
    initialChosenSession ? buildInitialSetRows(initialChosenSession.exercises) : []
  );
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Temporizador de descanso entre series
  const [restRemaining, setRestRemaining] = useState<number>(90);
  const [restRunning, setRestRunning] = useState<boolean>(false);

  // Formulario fútbol / deporte
  const [footballPreset, setFootballPreset] = useState<'wednesday' | 'sunday' | 'custom'>('wednesday');
  const [sportCustomName, setSportCustomName] = useState('Fútbol sala con amigos');
  const [sportDuration, setSportDuration] = useState('75');
  const [sportRpe, setSportRpe] = useState('8');

  // Formulario cardio suave / bicicleta
  const [cardioTitle, setCardioTitle] = useState(
    initialChosenSession &&
      (initialChosenSession.sessionType === 'cardio' ||
        initialChosenSession.sessionType === 'recovery')
      ? initialChosenSession.title
      : 'Bicicleta estática aeróbica Zona 2'
  );
  const [cardioMinutes, setCardioMinutes] = useState(
    initialChosenSession ? String(initialChosenSession.estimatedMinutes) : '35'
  );
  const [cardioRpe, setCardioRpe] = useState('5');

  useEffect(() => {
    if (!restRunning) return;
    const interval = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          setRestRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restRunning]);

  if (!state) return null;

  const strengthSessionsInPlan = state.plan.sessions.filter(
    (s) => s.sessionType === 'strength'
  );

  const handleSelectSessionChange = (sessionId: string) => {
    setSelectedPlannedId(sessionId);
    const found = state.plan.sessions.find((s) => s.id === sessionId);
    if (!found) return;
    setDurationMinutes(String(found.estimatedMinutes));
    const generated: EditableSetRow[] = [];
    for (const ex of found.exercises) {
      const target = Number((ex.reps.match(/\d+/) ?? ['10'])[0]) || 10;
      for (let i = 1; i <= ex.sets; i++) {
        generated.push({
          exerciseSlug: ex.exerciseSlug,
          exerciseName: ex.exerciseName,
          setIndex: i,
          targetReps: target,
          repsCompleted: String(target),
          loadKg: ex.suggestedLoadKg !== null ? String(ex.suggestedLoadKg) : '20',
          restSeconds: ex.restSeconds || 90,
        });
      }
    }
    setRows(generated);
  };

  const handleSaveStrengthWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = state.plan.sessions.find((s) => s.id === selectedPlannedId);
    const title = chosen ? chosen.title : 'Sesión de fuerza en casa';

    const sets: PerformedSetLog[] = rows.map((r) => ({
      exerciseSlug: r.exerciseSlug,
      exerciseName: r.exerciseName,
      setIndex: r.setIndex,
      targetReps: r.targetReps,
      repsCompleted: Math.max(0, Math.round(parseMetricInput(r.repsCompleted) ?? 0)),
      loadKg: Math.max(0, parseMetricInput(r.loadKg) ?? 0),
      rpe: perceivedRpe,
      restSeconds: r.restSeconds,
    }));

    const dur = Math.max(5, Math.round(parseMetricInput(durationMinutes) ?? 45));
    // Estimación orientativa conservadora (~5 kcal/min en fuerza doméstica)
    const estimatedKcal = Math.round(dur * 5.2);

    const result = await logCompletedWorkout({
      plannedSessionId: chosen?.id ?? null,
      sessionType: 'strength',
      title,
      performedOn: dateIso,
      durationMinutes: dur,
      perceivedRpe,
      completedFully,
      feltDiscomfort,
      discomfortNotes,
      readinessNext,
      estimatedKcal,
      sets,
      notes: sessionNotes,
      clientDedupKey: `strength:${dateIso}:${chosen?.id ?? title}`,
    });

    setLastFeedback(result.progressionMessage);
  };

  const handleSaveFootball = async (e: React.FormEvent) => {
    e.preventDefault();
    const title =
      footballPreset === 'wednesday'
        ? 'Fútbol del miércoles (60-90 min)'
        : footballPreset === 'sunday'
          ? 'Fútbol del domingo (20 min)'
          : sportCustomName.trim() || 'Actividad deportiva';

    const dur = Math.max(10, Math.round(parseMetricInput(sportDuration) ?? 75));
    const rpe = Math.min(10, Math.max(1, parseMetricInput(sportRpe) ?? 8));

    const res = await logCompletedWorkout({
      plannedSessionId: null,
      sessionType: 'football',
      title,
      performedOn: dateIso,
      durationMinutes: dur,
      perceivedRpe: rpe,
      completedFully: true,
      feltDiscomfort,
      discomfortNotes,
      readinessNext,
      estimatedKcal: Math.round(dur * 8.5),
      sets: [],
      notes: sessionNotes || 'Contabilizado en la carga semanal sin duplicar actividad.',
      clientDedupKey: `football:${dateIso}:${title.toLowerCase()}`,
    });

    if (footballPreset === 'custom' && res.saved) {
      await addRecurringOrManualSport({
        sportName: title,
        performedOn: dateIso,
        recurringDayOfWeek: null,
        isRecurring: false,
        durationMinutes: dur,
        effortLevel: rpe >= 7.5 ? 'high' : 'moderate',
        perceivedRpe: rpe,
        notes: sessionNotes,
      });
    }

    setLastFeedback(res.progressionMessage);
  };

  const handleSaveCardio = async (e: React.FormEvent) => {
    e.preventDefault();
    const dur = Math.max(5, Math.round(parseMetricInput(cardioMinutes) ?? 30));
    const rpe = Math.min(10, Math.max(1, parseMetricInput(cardioRpe) ?? 5));

    const res = await logCompletedWorkout({
      plannedSessionId: null,
      sessionType: 'cardio',
      title: cardioTitle.trim() || 'Bicicleta estática Zona 2',
      performedOn: dateIso,
      durationMinutes: dur,
      perceivedRpe: rpe,
      completedFully: true,
      feltDiscomfort: false,
      discomfortNotes: '',
      readinessNext: 'good',
      estimatedKcal: Math.round(dur * 6.4),
      sets: [],
      notes: sessionNotes,
      clientDedupKey: `cardio:${dateIso}:${cardioTitle.trim().toLowerCase()}:${dur}`,
    });

    setLastFeedback(res.progressionMessage);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Registro de Entrenamientos y Adaptación
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Registra series, cargas, RPE y sensaciones. Incluye protección automática contra registros duplicados.
          </p>
        </div>

        {/* TEMPORIZADOR DE DESCANSO ENTRE SERIES */}
        <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 flex items-center gap-3 self-start">
          <Timer className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Descanso series
            </div>
            <div className="font-mono font-bold text-lg leading-tight">
              {Math.floor(restRemaining / 60)}:
              {String(restRemaining % 60).padStart(2, '0')}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRestRunning((r) => !r)}
              aria-label={restRunning ? 'Pausar descanso' : 'Iniciar descanso'}
              className="p-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold"
            >
              {restRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            {[60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setRestRemaining(sec);
                  setRestRunning(true);
                }}
                className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold"
              >
                {sec}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setRestRunning(false);
                setRestRemaining(90);
              }}
              aria-label="Reiniciar temporizador"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE TIPO DE SESIÓN */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800 max-w-lg">
        {(
          [
            { id: 'strength', label: 'Fuerza (Series/Kg)' },
            { id: 'football', label: 'Fútbol / Deporte' },
            { id: 'cardio', label: 'Bici / Movilidad' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
              tab === item.id
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {lastFeedback && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-start gap-2.5 text-xs text-emerald-950 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Evaluación post-sesión aplicada:</p>
            <p className="mt-0.5">{lastFeedback}</p>
          </div>
        </div>
      )}

      {/* 1. FORMULARIO DE FUERZA CON SERIES Y EVALUACIÓN DE PROGRESIÓN */}
      {tab === 'strength' && (
        <form
          onSubmit={handleSaveStrengthWorkout}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="workout-session-picker"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                Sesión del plan
              </label>
              <select
                id="workout-session-picker"
                value={selectedPlannedId}
                onChange={(e) => handleSelectSessionChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
              >
                {strengthSessionsInPlan.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.status === 'completed' ? 'Completada' : formatEsDate(s.scheduledDate)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="workout-date"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                Fecha realizada
              </label>
              <input
                id="workout-date"
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Series realizadas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Series, repeticiones y carga utilizada (kg)
              </h2>
              <button
                type="button"
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    {
                      exerciseSlug: prev[prev.length - 1]?.exerciseSlug ?? 'goblet-squat',
                      exerciseName:
                        prev[prev.length - 1]?.exerciseName ?? 'Sentadilla Goblet con mancuerna',
                      setIndex: (prev[prev.length - 1]?.setIndex ?? 0) + 1,
                      targetReps: 10,
                      repsCompleted: '10',
                      loadKg: '16',
                      restSeconds: 90,
                    },
                  ])
                }
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir serie</span>
              </button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {rows.map((row, idx) => (
                <div
                  key={`${row.exerciseSlug}-${idx}`}
                  className="p-3 bg-slate-50/50 dark:bg-slate-950/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                >
                  <div className="sm:col-span-6 font-semibold text-slate-800 dark:text-slate-200">
                    Serie {row.setIndex} · {row.exerciseName}
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <label className="text-slate-500">Carga (kg):</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Carga kg serie ${row.setIndex} ${row.exerciseName}`}
                      value={row.loadKg}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, loadKg: e.target.value } : item
                          )
                        )
                      }
                      className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <label className="text-slate-500">Reps:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Repeticiones serie ${row.setIndex} ${row.exerciseName}`}
                      value={row.repsCompleted}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, repsCompleted: e.target.value } : item
                          )
                        )
                      }
                      className="w-16 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHECK-IN BREVE POST-SESIÓN */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Evaluación rápida post-sesión (ajusta automáticamente tus próximas cargas)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Esfuerzo percibido RPE: <strong>{formatEsNumber(perceivedRpe, 1)} / 10</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={perceivedRpe}
                  onChange={(e) => setPerceivedRpe(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="readiness-select"
                  className="block text-xs font-semibold mb-1"
                >
                  ¿Cómo te ves para la siguiente sesión?
                </label>
                <select
                  id="readiness-select"
                  value={readinessNext}
                  onChange={(e) =>
                    setReadinessNext(e.target.value as CompletedSessionLog['readinessNext'])
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                >
                  <option value="optimal">Con energía óptima (listo para progresar)</option>
                  <option value="good">Bien / fatiga normal de entrenamiento</option>
                  <option value="fatigued">Bastante fatigado (consolidar sin subir peso)</option>
                  <option value="pain_stop">Con sobrecarga o dolor (reducir carga)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="strength-minutes"
                  className="block text-xs font-semibold mb-1"
                >
                  Duración real (min)
                </label>
                <input
                  id="strength-minutes"
                  type="number"
                  min={10}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-xs">
              <label className="inline-flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={completedFully}
                  onChange={(e) => setCompletedFully(e.target.checked)}
                  className="rounded accent-emerald-600"
                />
                <span>He completado el entrenamiento previsto</span>
              </label>

              <label className="inline-flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                <input
                  type="checkbox"
                  checked={feltDiscomfort}
                  onChange={(e) => setFeltDiscomfort(e.target.checked)}
                  className="rounded accent-amber-600"
                />
                <span>He notado dolor articular, pinchazo o molestia inusual</span>
              </label>
            </div>

            {feltDiscomfort && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={discomfortNotes}
                  onChange={(e) => setDiscomfortNotes(e.target.value)}
                  placeholder="Describe zona y sensación (ej. tirantez en isquio derecho o hombro)..."
                  className="w-full rounded-xl border border-amber-500/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                />
                <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Si aparece dolor torácico, mareo o falta de aire desproporcionada, interrumpe el ejercicio de inmediato y acude a valoración médica.
                  </span>
                </p>
              </div>
            )}
          </div>

          <input
            type="text"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Notas opcionales de la sesión (sensaciones, agarre, energía previa)..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />

          <button
            type="submit"
            className="w-full sm:w-auto min-h-12 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
          >
            Finalizar y guardar sesión de fuerza
          </button>
        </form>
      )}

      {/* 2. FORMULARIO FÚTBOL MIÉRCOLES / DOMINGO (SIN DUPLICADOS) */}
      {tab === 'football' && (
        <form
          onSubmit={handleSaveFootball}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Registrar partido de fútbol o actividad deportiva
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            El fútbol del miércoles (60–90 min) supone un esfuerzo intermitente alto y de impacto; Forma360 evita duplicar registros del mismo partido en el mismo día.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setFootballPreset('wednesday');
                setSportDuration('75');
                setSportRpe('8');
              }}
              className={`p-3.5 rounded-xl border text-left text-xs ${
                footballPreset === 'wednesday'
                  ? 'border-emerald-500 bg-emerald-500/10 font-semibold'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="font-bold">Fútbol Miércoles</div>
              <div className="text-slate-500 mt-0.5">60–90 min · Carga alta (RPE 8)</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFootballPreset('sunday');
                setSportDuration('20');
                setSportRpe('6');
              }}
              className={`p-3.5 rounded-xl border text-left text-xs ${
                footballPreset === 'sunday'
                  ? 'border-emerald-500 bg-emerald-500/10 font-semibold'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="font-bold">Fútbol Domingo</div>
              <div className="text-slate-500 mt-0.5">~20 min · Carga moderada (RPE 6)</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFootballPreset('custom');
                setSportDuration('60');
                setSportRpe('7');
              }}
              className={`p-3.5 rounded-xl border text-left text-xs ${
                footballPreset === 'custom'
                  ? 'border-emerald-500 bg-emerald-500/10 font-semibold'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="font-bold">Otro deporte / pachanga</div>
              <div className="text-slate-500 mt-0.5">Pádel, bici ruta, senderismo...</div>
            </button>
          </div>

          {footballPreset === 'custom' && (
            <div>
              <label className="block text-xs font-semibold mb-1">Nombre de la actividad</label>
              <input
                type="text"
                value={sportCustomName}
                onChange={(e) => setSportCustomName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="football-date" className="block text-xs font-semibold mb-1">
                Fecha del partido
              </label>
              <input
                id="football-date"
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="football-duration" className="block text-xs font-semibold mb-1">
                Duración real (min)
              </label>
              <input
                id="football-duration"
                type="number"
                value={sportDuration}
                onChange={(e) => setSportDuration(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="football-rpe" className="block text-xs font-semibold mb-1">
                Esfuerzo percibido (1–10)
              </label>
              <input
                id="football-rpe"
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={sportRpe}
                onChange={(e) => setSportRpe(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="min-h-12 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
          >
            Guardar actividad en mi carga semanal
          </button>
        </form>
      )}

      {/* 3. FORMULARIO CARDIO SUAVE / BICICLETA ESTÁTICA / MOVILIDAD */}
      {tab === 'cardio' && (
        <form
          onSubmit={handleSaveCardio}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Registrar Bicicleta Estática, Caminata o Movilidad
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="cardio-type-input" className="block text-xs font-semibold mb-1">
                Tipo de sesión
              </label>
              <input
                id="cardio-type-input"
                type="text"
                value={cardioTitle}
                onChange={(e) => setCardioTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="cardio-min-input" className="block text-xs font-semibold mb-1">
                Minutos
              </label>
              <input
                id="cardio-min-input"
                type="number"
                min={5}
                max={240}
                value={cardioMinutes}
                onChange={(e) => setCardioMinutes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="cardio-rpe-input" className="block text-xs font-semibold mb-1">
                RPE (1–10)
              </label>
              <input
                id="cardio-rpe-input"
                type="number"
                min={1}
                max={10}
                value={cardioRpe}
                onChange={(e) => setCardioRpe(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Nota de rigor: las calorías de actividad (~{Math.round((Number(cardioMinutes) || 30) * 6.4)}{' '}
            kcal orientativas) se guardan solo como referencia fisiológica estimada, nunca como calorías exactas para «compensar» comidas.
          </p>

          <button
            type="submit"
            className="min-h-12 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
          >
            Guardar sesión de cardio / movilidad
          </button>
        </form>
      )}

      {/* HISTORIAL RECIENTE DE ENTRENAMIENTOS COMPLETADOS */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Sesiones registradas ({state.completedSessions.length})
        </h3>

        {state.completedSessions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            Todavía no has completado ninguna sesión. Empieza hoy con Fuerza A, Bicicleta Zona 2 o registra tu partido del miércoles.
          </p>
        ) : (
          <div className="space-y-2">
            {[...state.completedSessions].reverse().map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {item.title} · <span className="text-emerald-600">{formatEsDate(item.performedOn)}</span>
                  </div>
                  <div className="text-slate-500">
                    {item.durationMinutes} min · RPE {formatEsNumber(item.perceivedRpe, 1)}
                    {item.sets.length > 0 ? ` · ${item.sets.length} series registradas` : ''}
                    {item.estimatedKcal ? ` · ~${item.estimatedKcal} kcal est.` : ''}
                  </div>
                </div>

                {confirmDeleteId === item.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void deleteCompletedWorkout(item.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold"
                    >
                      Confirmar borrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(item.id)}
                    aria-label={`Eliminar ${item.title}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
