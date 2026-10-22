'use client';

import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Lock,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  SkipForward,
} from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import { evaluateRunningStatus, RUNNING_STAGES } from '@/lib/domain/running';
import { formatEsDate, formatEsNumber, parseMetricInput, todayIsoInTimezone } from '@/lib/format';
import { RunningSessionLog } from '@/lib/types';

export function RunningSection() {
  const { state, updateRunningConfig, logRunningSession } = useForma360();

  // Temporizador interactivo Caminar-Correr en vivo
  const [timerActive, setTimerActive] = useState(false);
  const [currentRep, setCurrentRep] = useState(1);
  const [phase, setPhase] = useState<'walk' | 'run'>('walk');
  const [secondsLeft, setSecondsLeft] = useState<number>(state?.running.walkSeconds ?? 240);

  // Registro de sesión de carrera
  const [runDate, setRunDate] = useState<string>(() =>
    state ? todayIsoInTimezone(state.profile.timezone) : '2026-10-22'
  );
  const [workoutMode, setWorkoutMode] =
    useState<RunningSessionLog['workoutMode']>('walk_run_intervals');
  const [durationMinutes, setDurationMinutes] = useState('32');
  const [distanceKm, setDistanceKm] = useState('3,6');
  const [heartRate, setHeartRate] = useState('');
  const [routeDescription, setRouteDescription] = useState('Parque lineal / llano');
  const [rpe, setRpe] = useState('5.5');
  const [discomfort, setDiscomfort] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!timerActive || !state) return;
    const handle = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        // Cambio automático de tramo
        if (phase === 'walk' && state.running.runSeconds > 0) {
          setPhase('run');
          return state.running.runSeconds;
        }
        if (currentRep < state.running.repetitions) {
          setCurrentRep((r) => r + 1);
          setPhase('walk');
          return Math.max(30, state.running.walkSeconds);
        }
        setTimerActive(false);
        return 0;
      });
    }, 1000);
    return () => clearInterval(handle);
  }, [timerActive, phase, currentRep, state]);

  if (!state) return null;

  const todayIso = todayIsoInTimezone(state.profile.timezone);
  const status = evaluateRunningStatus(
    state.running,
    state.runningLogs,
    state.completedSessions,
    state.sportActivities,
    todayIso
  );

  const handleSaveRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const dur = Math.max(5, parseMetricInput(durationMinutes) ?? 30);
    const dist = parseMetricInput(distanceKm);
    const hr = parseMetricInput(heartRate);

    await logRunningSession({
      stageAtTime: state.running.currentStage,
      performedOn: runDate || todayIso,
      workoutMode,
      walkSeconds: state.running.walkSeconds,
      runSeconds: state.running.runSeconds,
      repetitions: state.running.repetitions,
      durationMinutes: dur,
      distanceKm: dist !== null ? Math.max(0, dist) : null,
      avgHeartRate: hr !== null ? Math.round(hr) : null,
      routeDescription: routeDescription.trim(),
      perceivedRpe: Math.min(10, Math.max(1, parseMetricInput(rpe) ?? 5.5)),
      jointDiscomfort: Math.min(10, Math.max(0, Math.round(parseMetricInput(discomfort) ?? 0))),
      discomfortLocation: Number(discomfort) > 0 ? 'Controlar gemelo/Aquiles/rodilla' : '',
      notes,
      clientDedupKey: `run:${runDate || todayIso}:${workoutMode}:${dur}:${dist ?? 'na'}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Módulo de Carrera: De Base Segura a Media Maratón (21,1 km)
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sin fechas rígidas ni exigencia de esperar a pesar 75 kg: la progresión depende de tus tendones, tu recuperación del fútbol y tus sensaciones.
        </p>
      </div>

      {/* HITOS DE DISTANCIA Y SEMÁFORO DE IMPACTO (CARRERA + FÚTBOL) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Award className="w-4 h-4 text-emerald-500" />
            <span>Hitos progresivos de resistencia</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {status.milestones.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border p-3 space-y-1 ${
                  m.achieved
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {formatEsNumber(m.targetKm, 1)} km
                  </span>
                  {m.achieved && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">{m.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">{status.halfMarathonGateReason}</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Carga semanal de impacto
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                status.impactStatus === 'high_caution'
                  ? 'bg-rose-500/15 text-rose-600'
                  : status.impactStatus === 'moderate'
                    ? 'bg-amber-500/15 text-amber-600'
                    : 'bg-emerald-500/15 text-emerald-600'
              }`}
            >
              {status.combinedImpactScore} / 100
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Fútbol contabilizado: <strong>{status.weeklyFootballImpactMinutes} min/sem</strong> · Carrera últimos 7 días:{' '}
            <strong>{status.weeklyRunningMinutes} min</strong>.
          </p>
          <div className="flex items-center gap-4 text-xs pt-1">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={state.running.hasSportsWatch}
                onChange={(e) => void updateRunningConfig({ hasSportsWatch: e.target.checked })}
                className="accent-emerald-600"
              />
              <span>Tengo reloj GPS/FC</span>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={state.running.hasTreadmill}
                onChange={(e) => void updateRunningConfig({ hasTreadmill: e.target.checked })}
                className="accent-emerald-600"
              />
              <span>Tengo cinta</span>
            </label>
          </div>
        </div>
      </div>

      {/* CONFIGURADOR CAMINAR-CORRER + TEMPORIZADOR INTERACTIVO EN VIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Configurador de intervalos Caminar-Correr (Ca-Co)
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="walk-sec-input" className="block text-xs font-semibold mb-1">
                Caminar (seg)
              </label>
              <input
                id="walk-sec-input"
                type="number"
                min={0}
                max={1800}
                step={15}
                value={state.running.walkSeconds}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value));
                  void updateRunningConfig({ walkSeconds: val });
                  setSecondsLeft(val);
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label htmlFor="run-sec-input" className="block text-xs font-semibold mb-1">
                Correr suave (seg)
              </label>
              <input
                id="run-sec-input"
                type="number"
                min={0}
                max={3600}
                step={15}
                value={state.running.runSeconds}
                onChange={(e) =>
                  void updateRunningConfig({ runSeconds: Math.max(0, Number(e.target.value)) })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label htmlFor="reps-count-input" className="block text-xs font-semibold mb-1">
                Repeticiones
              </label>
              <input
                id="reps-count-input"
                type="number"
                min={1}
                max={25}
                value={state.running.repetitions}
                onChange={(e) =>
                  void updateRunningConfig({
                    repetitions: Math.min(25, Math.max(1, Number(e.target.value))),
                  })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 p-3.5 text-xs space-y-2">
            <p className="font-semibold text-blue-900 dark:text-blue-200">
              Siguiente progresión recomendada ({status.nextIntervalSuggestion.repetitions} × [
              {status.nextIntervalSuggestion.walkSeconds}s andar /{' '}
              {status.nextIntervalSuggestion.runSeconds}s trotar]):
            </p>
            <p className="text-blue-900/80 dark:text-blue-200/80">
              {status.nextIntervalSuggestion.rationale}
            </p>
            <button
              type="button"
              onClick={() =>
                void updateRunningConfig({
                  walkSeconds: status.nextIntervalSuggestion.walkSeconds,
                  runSeconds: status.nextIntervalSuggestion.runSeconds,
                  repetitions: status.nextIntervalSuggestion.repetitions,
                })
              }
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              Aplicar progresión sugerida
            </button>
          </div>
        </div>

        {/* TEMPORIZADOR DE INTERVALOS EN VIVO (SIN NECESITAR RELOJ DEPORTIVO) */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Temporizador en vivo (sustituye reloj GPS)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-semibold">
              Bloque {currentRep} de {state.running.repetitions}
            </span>
          </div>

          <div className="text-center py-2 space-y-1">
            <div
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                phase === 'walk'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {phase === 'walk' ? 'TRAMO CAMINANDO A PASO VIVO' : 'TRAMO TROTE SUAVE CONVERSACIONAL'}
            </div>
            <div className="font-mono text-5xl font-bold tracking-tight">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setTimerActive((v) => !v)}
              className="min-h-11 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
            >
              {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{timerActive ? 'Pausar' : 'Iniciar intervalos'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (phase === 'walk' && state.running.runSeconds > 0) {
                  setPhase('run');
                  setSecondsLeft(state.running.runSeconds);
                } else {
                  setPhase('walk');
                  setCurrentRep((r) => (r >= state.running.repetitions ? 1 : r + 1));
                  setSecondsLeft(state.running.walkSeconds || 60);
                }
              }}
              className="min-h-11 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center gap-1"
            >
              <SkipForward className="w-4 h-4" />
              <span>Siguiente tramo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTimerActive(false);
                setCurrentRep(1);
                setPhase('walk');
                setSecondsLeft(state.running.walkSeconds || 180);
              }}
              aria-label="Reiniciar temporizador de carrera"
              className="min-h-11 p-2.5 rounded-xl bg-white/10 hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* LAS 8 ETAPAS DEL ITINERARIO HACIA MEDIA MARATÓN */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Itinerario adaptable en 8 etapas (selecciona tu etapa actual)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RUNNING_STAGES.map((stg) => {
            const isCurrent = state.running.currentStage === stg.stage;
            const isHalfMarathonGateLocked = stg.stage >= 7 && !status.halfMarathonUnlocked;

            return (
              <div
                key={stg.stage}
                className={`rounded-xl border p-4 space-y-2 transition ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {stg.title}
                    </h3>
                    <p className="text-xs text-slate-500">{stg.subtitle}</p>
                  </div>
                  {isHalfMarathonGateLocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                      <Lock className="w-3 h-3" />
                      <span>Requiere base</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void updateRunningConfig({
                          currentStage: stg.stage,
                          walkSeconds: stg.defaultWalkSeconds,
                          runSeconds: stg.defaultRunSeconds,
                          repetitions: stg.defaultRepetitions,
                        })
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isCurrent ? 'Etapa activa' : 'Activar etapa'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{stg.targetDescription}</p>
                <p className="text-[11px] text-slate-500">
                  <strong>Sin reloj:</strong> {stg.noWatchAlternative}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* FORMULARIO DE REGISTRO DE SESIÓN DE CARRERA */}
      <form
        onSubmit={handleSaveRun}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Registrar sesión de caminata o carrera
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="run-log-date" className="block text-xs font-semibold mb-1">
              Fecha
            </label>
            <input
              id="run-log-date"
              type="date"
              value={runDate}
              onChange={(e) => setRunDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="run-log-mode" className="block text-xs font-semibold mb-1">
              Modalidad
            </label>
            <select
              id="run-log-mode"
              value={workoutMode}
              onChange={(e) =>
                setWorkoutMode(e.target.value as RunningSessionLog['workoutMode'])
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="brisk_walk">Caminata a paso vivo</option>
              <option value="walk_run_intervals">Intervalos Caminar-Correr</option>
              <option value="easy_continuous">Carrera continua cómoda</option>
              <option value="long_run">Tirada larga progresiva</option>
            </select>
          </div>

          <div>
            <label htmlFor="run-log-duration" className="block text-xs font-semibold mb-1">
              Duración total (min)
            </label>
            <input
              id="run-log-duration"
              type="text"
              inputMode="decimal"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="run-log-km" className="block text-xs font-semibold mb-1">
              Distancia opcional (km)
            </label>
            <input
              id="run-log-km"
              type="text"
              inputMode="decimal"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="Ej. 5,0"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="run-log-hr" className="block text-xs font-semibold mb-1">
              FC media opc. (ppm)
            </label>
            <input
              id="run-log-hr"
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="run-log-rpe" className="block text-xs font-semibold mb-1">
              Esfuerzo RPE (1–10)
            </label>
            <input
              id="run-log-rpe"
              type="text"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="run-log-pain" className="block text-xs font-semibold mb-1">
              Molestia articular (0–10)
            </label>
            <input
              id="run-log-pain"
              type="number"
              min={0}
              max={10}
              value={discomfort}
              onChange={(e) => setDiscomfort(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="run-log-route" className="block text-xs font-semibold mb-1">
              Ruta / terreno (opcional)
            </label>
            <input
              id="run-log-route"
              type="text"
              value={routeDescription}
              onChange={(e) => setRouteDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Sensaciones respiratorias, calzado o notas..."
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
        />

        {Number(discomfort) >= 4 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-950 dark:text-amber-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Con molestia {'>='} 4/10, sustituye la próxima sesión de carrera por bicicleta estática y revisa descarga de sóleo/glúteo medio.
            </span>
          </div>
        )}

        <button
          type="submit"
          className="min-h-12 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
        >
          Guardar sesión de carrera
        </button>

        {state.runningLogs.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Historial reciente de carrera ({state.runningLogs.length})
            </h3>
            {[...state.runningLogs].reverse().map((r) => (
              <div
                key={r.id}
                className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 flex flex-wrap justify-between gap-2 text-xs"
              >
                <span>
                  <strong>{formatEsDate(r.performedOn)}</strong> · Etapa {r.stageAtTime} ·{' '}
                  {r.durationMinutes} min
                  {r.distanceKm !== null ? ` · ${formatEsNumber(r.distanceKm, 2)} km` : ''}
                  {r.routeDescription ? ` · ${r.routeDescription}` : ''}
                </span>
                <span className="text-slate-500">
                  RPE {formatEsNumber(r.perceivedRpe, 1)} · Molestia {r.jointDiscomfort}/10
                </span>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
