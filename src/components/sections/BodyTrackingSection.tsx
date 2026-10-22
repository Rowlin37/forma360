'use client';

import React, { useState } from 'react';
import { AlertTriangle, Camera, Info, Trash2 } from 'lucide-react';
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
import { computeBodyTrendSummary } from '@/lib/domain/physiology';
import { formatEsDate, formatEsNumber, parseMetricInput, todayIsoInTimezone } from '@/lib/format';
import { bodyMeasurementInputSchema } from '@/lib/types';

export function BodyTrackingSection() {
  const {
    state,
    addBodyMeasurement,
    deleteBodyMeasurement,
    saveWellbeingEntry,
  } = useForma360();

  const [measuredOn, setMeasuredOn] = useState<string>(
    state ? todayIsoInTimezone(state.profile.timezone) : '2026-10-22'
  );
  const [sourceType, setSourceType] =
    useState<'manual' | 'xiaomi_scale_estimate' | 'mixed'>('mixed');
  const [weightKg, setWeightKg] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipCm, setHipCm] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [visceralRating, setVisceralRating] = useState('');
  const [visceralDevice, setVisceralDevice] = useState('Báscula Xiaomi (escala orientativa 1-30)');
  const [muscleKg, setMuscleKg] = useState('');
  const [waterPct, setWaterPct] = useState('');
  const [boneKg, setBoneKg] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingAnomalyReason, setPendingAnomalyReason] = useState<string | null>(null);

  // Bienestar diario
  const [sleepHours, setSleepHours] = useState('7.5');
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [digestionQuality, setDigestionQuality] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [wellbeingNotes, setWellbeingNotes] = useState('');

  if (!state) return null;

  const trend = computeBodyTrendSummary(
    state.bodyMeasurements,
    state.profile.initialWeightKg,
    state.profile.targetWeightKg
  );

  const waistSeries = [...state.bodyMeasurements]
    .filter((m) => m.waistCm !== null)
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn))
    .map((m) => ({
      date: m.measuredOn,
      waistCm: m.waistCm,
    }));

  const compositionSeries = [...state.bodyMeasurements]
    .filter((m) => m.bodyFatPctEstimate !== null || m.muscleMassKgEstimate !== null)
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn))
    .map((m) => ({
      date: m.measuredOn,
      bodyFat: m.bodyFatPctEstimate,
      muscleKg: m.muscleMassKgEstimate,
    }));

  const submitMeasurement = async (forceAnomaly = false) => {
    setValidationError(null);

    const candidate = {
      measuredOn,
      sourceType,
      weightKg: parseMetricInput(weightKg),
      waistCm: parseMetricInput(waistCm),
      hipCm: parseMetricInput(hipCm),
      bodyFatPctEstimate: parseMetricInput(bodyFatPct),
      visceralFatRating: parseMetricInput(visceralRating),
      muscleMassKgEstimate: parseMetricInput(muscleKg),
      bodyWaterPctEstimate: parseMetricInput(waterPct),
      boneMassKgEstimate: parseMetricInput(boneKg),
      restingHrBpm: parseMetricInput(restingHr) ? Math.round(parseMetricInput(restingHr)!) : null,
      notes,
    };

    const validated = bodyMeasurementInputSchema.safeParse(candidate);
    if (!validated.success) {
      setValidationError(validated.error.issues[0]?.message ?? 'Revisa los valores numéricos.');
      return;
    }

    const res = await addBodyMeasurement(
      {
        ...validated.data,
        visceralScaleDevice: visceralDevice,
        scaleProteinPctEstimate: null,
        scaleBmiReported: null,
        scaleBmrReported: null,
        photoDataUrl,
      },
      forceAnomaly
    );

    if (res.requiresConfirmation) {
      setPendingAnomalyReason(res.anomalyReason ?? 'Lectura inusual detectada.');
      return;
    }

    setPendingAnomalyReason(null);
    setWeightKg('');
    setWaistCm('');
    setHipCm('');
    setBodyFatPct('');
    setVisceralRating('');
    setMuscleKg('');
    setWaterPct('');
    setBoneKg('');
    setRestingHr('');
    setPhotoDataUrl(null);
    setNotes('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Seguimiento Corporal: Peso, Cintura y Composición
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Separamos estrictamente mediciones manuales reales (peso, cinta métrica) de estimaciones por bioimpedancia de báscula Xiaomi.
        </p>
      </div>

      {/* GUÍA PRÁCTICA DE MEDICIÓN CONSISTENTE DE CINTURA */}
      <div className="rounded-2xl bg-blue-500/10 border border-blue-500/25 p-4 flex items-start gap-3 text-xs text-blue-950 dark:text-blue-200">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Cómo medir el perímetro de cintura 1 vez por semana de forma fiable:
          </p>
          <p>
            Mide siempre el mismo día (ej. domingo por la mañana), en ayunas tras ir al baño, de pie con el abdomen relajado al final de una espiración normal, rodeando horizontalmente a la altura del ombligo sin apretar la piel. Nota importante: el índice de «grasa visceral» de una báscula doméstica es una estimación indirecta por impedancia eléctrica, no equivale a un TAC o DEXA clínico.
          </p>
        </div>
      </div>

      {/* FORMULARIO DE REGISTRO FLEXIBLE (NO OBLIGA A RELLENAR TODO) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitMeasurement(false);
        }}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Nuevo registro corporal (rellena solo los datos de hoy)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="body-date" className="block text-xs font-semibold mb-1">
              Fecha
            </label>
            <input
              id="body-date"
              type="date"
              value={measuredOn}
              onChange={(e) => setMeasuredOn(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="body-source" className="block text-xs font-semibold mb-1">
              Origen del dato
            </label>
            <select
              id="body-source"
              value={sourceType}
              onChange={(e) =>
                setSourceType(e.target.value as 'manual' | 'xiaomi_scale_estimate' | 'mixed')
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="mixed">Peso + Cinta manual + Báscula Xiaomi</option>
              <option value="manual">Solo medición manual (peso/cinta)</option>
              <option value="xiaomi_scale_estimate">Lectura app báscula Xiaomi</option>
            </select>
          </div>

          <div>
            <label htmlFor="body-weight" className="block text-xs font-semibold mb-1">
              Peso corporal (kg)
            </label>
            <input
              id="body-weight"
              type="text"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ej. 88,9"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-semibold"
            />
          </div>

          <div>
            <label htmlFor="body-waist" className="block text-xs font-semibold mb-1">
              Perímetro cintura (cm)
            </label>
            <input
              id="body-waist"
              type="text"
              inputMode="decimal"
              value={waistCm}
              onChange={(e) => setWaistCm(e.target.value)}
              placeholder="Ej. 96,5"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
          <div>
            <label htmlFor="body-hip" className="block text-[11px] font-semibold mb-1">
              Cadera opc. (cm)
            </label>
            <input
              id="body-hip"
              type="text"
              inputMode="decimal"
              value={hipCm}
              onChange={(e) => setHipCm(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            />
          </div>
          <div>
            <label htmlFor="body-fat" className="block text-[11px] font-semibold mb-1">
              Grasa est. (%)
            </label>
            <input
              id="body-fat"
              type="text"
              inputMode="decimal"
              value={bodyFatPct}
              onChange={(e) => setBodyFatPct(e.target.value)}
              placeholder="25,7"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            />
          </div>
          <div>
            <label htmlFor="body-visceral" className="block text-[11px] font-semibold mb-1">
              Visceral báscula
            </label>
            <input
              id="body-visceral"
              type="text"
              inputMode="decimal"
              value={visceralRating}
              onChange={(e) => setVisceralRating(e.target.value)}
              placeholder="Índice 1-30"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            />
          </div>
          <div>
            <label htmlFor="body-muscle" className="block text-[11px] font-semibold mb-1">
              Músculo est. (kg)
            </label>
            <input
              id="body-muscle"
              type="text"
              inputMode="decimal"
              value={muscleKg}
              onChange={(e) => setMuscleKg(e.target.value)}
              placeholder="63,5"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            />
          </div>
          <div>
            <label htmlFor="body-water" className="block text-[11px] font-semibold mb-1">
              Agua est. (%)
            </label>
            <input
              id="body-water"
              type="text"
              inputMode="decimal"
              value={waterPct}
              onChange={(e) => setWaterPct(e.target.value)}
              placeholder="51,0"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            />
          </div>
          <div>
            <label htmlFor="body-rhr" className="block text-[11px] font-semibold mb-1">
              FC reposo (ppm)
            </label>
            <input
              id="body-rhr"
              type="number"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              placeholder="Ej. 62"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <input
            type="text"
            value={visceralDevice}
            onChange={(e) => setVisceralDevice(e.target.value)}
            aria-label="Dispositivo y escala de grasa visceral"
            placeholder="Dispositivo y escala (ej. Xiaomi Body Composition Scale · 1-30)"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-600 dark:text-slate-300">
            <Camera className="w-4 h-4 text-emerald-500" />
            <span>Adjuntar foto opcional privada de progreso</span>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>

        {validationError && (
          <p role="alert" className="text-xs text-rose-600 font-semibold">
            {validationError}
          </p>
        )}

        {pendingAnomalyReason && (
          <div
            role="alert"
            className="rounded-xl border border-amber-500 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-950 dark:text-amber-200"
          >
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Registro inusual detectado — ¿Confirmas que el dato es real?</span>
            </div>
            <p>{pendingAnomalyReason}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void submitMeasurement(true)}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold"
              >
                Sí, confirmar y guardar
              </button>
              <button
                type="button"
                onClick={() => setPendingAnomalyReason(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-400"
              >
                Corregir cifra
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="min-h-12 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
        >
          Guardar medición corporal
        </button>
      </form>

      {/* TRES GRÁFICOS SEPARADOS: 1. PESO, 2. CINTURA, 3. COMPOSICIÓN ESTIMADA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            1. Peso y Media Móvil 7 días (kg)
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={['dataMin - 2', 'dataMax + 1']} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="weightKg" name="Peso diario" stroke="#94a3b8" strokeWidth={2} />
                <Line type="monotone" dataKey="movingAvg7d" name="Media 7d" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            2. Perímetro de Cintura (cm)
          </h3>
          {waistSeries.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500 text-center px-4">
              Introduce tu primera medición semanal de cintura arriba para visualizar aquí tu reducción real de volumen abdominal.
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waistSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="waistCm" name="Cintura (cm)" stroke="#3b82f6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            3. Estimaciones Báscula (% Grasa / Músculo kg)
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compositionSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="bodyFat" name="% Grasa est." stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="muscleKg" name="Músculo est. (kg)" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* REGISTRO DE SUEÑO, ENERGÍA, DIGESTIÓN Y BIENESTAR */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void saveWellbeingEntry({
            loggedOn: measuredOn,
            sleepHours: parseMetricInput(sleepHours) ?? 7.5,
            sleepQuality,
            energyLevel,
            digestionQuality,
            generalWellbeing: energyLevel,
            notes: wellbeingNotes,
          });
          setWellbeingNotes('');
        }}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Notas de sueño, energía, digestión y bienestar general
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Horas de sueño</label>
            <input
              type="text"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Calidad sueño (1–5)</label>
            <select
              value={sleepQuality}
              onChange={(e) => setSleepQuality(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Energía diaria (1–5)</label>
            <select
              value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Digestión (1–5)</label>
            <select
              value={digestionQuality}
              onChange={(e) => setDigestionQuality(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={wellbeingNotes}
            onChange={(e) => setWellbeingNotes(e.target.value)}
            placeholder="Sensación abdominal, estrés laboral, descanso post-fútbol..."
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold text-xs"
          >
            Guardar bienestar
          </button>
        </div>
      </form>

      {/* HISTORIAL DE MEDICIONES CORPORALES */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Historial de mediciones ({state.bodyMeasurements.length})
        </h3>
        {[...state.bodyMeasurements].reverse().map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div>
              <strong>{formatEsDate(m.measuredOn)}</strong> ·{' '}
              {m.weightKg !== null ? `${formatEsNumber(m.weightKg, 1)} kg` : 'Sin peso'}{' '}
              {m.waistCm !== null ? `· Cintura ${formatEsNumber(m.waistCm, 1)} cm` : ''}
              {m.bodyFatPctEstimate !== null
                ? ` · Grasa est. ${formatEsNumber(m.bodyFatPctEstimate, 1)} %`
                : ''}
              <span className="text-slate-400">
                {' '}
                ({m.sourceType === 'xiaomi_scale_estimate' ? 'Báscula Xiaomi' : 'Manual/Mixto'})
              </span>
            </div>
            {m.id !== 'bm-initial-baseline' && (
              <button
                type="button"
                onClick={() => void deleteBodyMeasurement(m.id)}
                aria-label={`Eliminar medición del ${m.measuredOn}`}
                className="p-1.5 text-slate-400 hover:text-rose-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
