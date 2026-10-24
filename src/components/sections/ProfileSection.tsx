'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import { DAY_SHORT_ES, parseMetricInput } from '@/lib/format';
import { profileUpdateSchema, SafetyScreening, UserProfile } from '@/lib/types';

const JOINT_AREAS = ['rodillas', 'tobillos', 'lumbar', 'hombros', 'cadera', 'muñecas'];

export function ProfileSection() {
  const {
    user,
    state,
    updateProfile,
    updatePreferences,
    saveSafetyScreening,
    deleteMyAccount,
  } = useForma360();

  const [displayName, setDisplayName] = useState(state?.profile.displayName ?? '');
  const [age, setAge] = useState(String(state?.profile.age ?? 35));
  const [sexRef, setSexRef] = useState<UserProfile['sexReference']>(
    state?.profile.sexReference ?? 'male'
  );
  const [heightCm, setHeightCm] = useState(String(state?.profile.heightCm ?? 187.1));
  const [targetWeightKg, setTargetWeightKg] = useState(
    String(state?.profile.targetWeightKg ?? 75)
  );
  const [fitnessLevel, setFitnessLevel] = useState<UserProfile['fitnessLevel']>(
    state?.profile.fitnessLevel ?? 'restarting_home'
  );
  const [timezone, setTimezone] = useState(state?.profile.timezone ?? 'Europe/Madrid');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Estado cuestionario inicial de seguridad (Regla 10)
  const [chestPain, setChestPain] = useState(state?.screening.chestPainOrSyncope ?? false);
  const [dyspnea, setDyspnea] = useState(state?.screening.disproportionateDyspnea ?? false);
  const [abdominalFlag, setAbdominalFlag] = useState(
    state?.screening.recentAbnormalAbdominalDistension ?? false
  );
  const [renalFlag, setRenalFlag] = useState(state?.screening.renalDiseaseKnown ?? false);
  const [medication, setMedication] = useState(state?.screening.relevantMedication ?? '');
  const [jointAreas, setJointAreas] = useState<string[]>(state?.screening.jointPainAreas ?? []);
  const [impactTol, setImpactTol] = useState<SafetyScreening['impactTolerance']>(
    state?.screening.impactTolerance ?? 'low_to_moderate'
  );
  const [preferredDays, setPreferredDays] = useState<number[]>(
    state?.screening.preferredDays ?? [1, 2, 3, 5, 6, 7]
  );
  const [sessionMinutes, setSessionMinutes] = useState(
    String(state?.screening.sessionDurationMinutes ?? 45)
  );

  // Confirmación explícita borrado de cuenta
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');

  if (!state || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const parsed = profileUpdateSchema.safeParse({
      displayName,
      age: Math.round(parseMetricInput(age) ?? 35),
      sexReference: sexRef,
      heightCm: parseMetricInput(heightCm) ?? 187,
      heightConfirmed: true,
      targetWeightKg: parseMetricInput(targetWeightKg) ?? 75,
      fitnessLevel,
      timezone,
    });

    if (!parsed.success) {
      setProfileError(parsed.error.issues[0]?.message ?? 'Datos de perfil inválidos.');
      return;
    }

    await updateProfile({
      ...parsed.data,
      bmrVerified: true,
    });
  };

  const handleSaveQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSafetyScreening(
      {
        chestPainOrSyncope: chestPain,
        disproportionateDyspnea: dyspnea,
        recentAbnormalAbdominalDistension: abdominalFlag,
        renalDiseaseKnown: renalFlag,
        cardiovascularOrMetabolicCondition: chestPain || dyspnea,
        relevantMedication: medication,
        jointPainAreas: jointAreas,
        jointPainNotes: '',
        impactTolerance: impactTol,
        priorExperience: 'Confirmado en cuestionario de inicio Forma360',
        preferredDays,
        sessionDurationMinutes: Math.min(120, Math.max(20, Number(sessionMinutes) || 45)),
      },
      true
    );
  };

  const handleExportFullJson = () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forma360-backup-completo-${user.userId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Mi Perfil, Cuestionario de Salud y Privacidad
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Confirma tu estatura real, revisa el cuestionario inicial de seguridad y gestiona tus copias exportables.
        </p>
      </div>

      {/* 1. PERFIL ANTROPOMÉTRICO Y VERIFICACIÓN DE ESTATURA / TMB 779 KCAL */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            1. Datos personales y confirmación de estatura
          </h2>
          {state.profile.heightConfirmed ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Estatura verificada</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-600">
              Pendiente confirmar ~187,1 cm
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-semibold mb-1">
              Nombre / Alias
            </label>
            <input
              id="prof-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="prof-age" className="block text-xs font-semibold mb-1">
              Edad (años)
            </label>
            <input
              id="prof-age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="prof-height" className="block text-xs font-semibold mb-1">
              Estatura real descalzo (cm)
            </label>
            <input
              id="prof-height"
              type="text"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full rounded-xl border border-emerald-500/60 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="prof-sex" className="block text-xs font-semibold mb-1">
              Referencia ecuación TMB
            </label>
            <select
              id="prof-sex"
              value={sexRef}
              onChange={(e) => setSexRef(e.target.value as UserProfile['sexReference'])}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            >
              <option value="male">Masculino (Mifflin +5)</option>
              <option value="female">Femenino (Mifflin -161)</option>
              <option value="unspecified">Promedio neutro (-78)</option>
            </select>
          </div>

          <div>
            <label htmlFor="prof-target-weight" className="block text-xs font-semibold mb-1">
              Peso orientativo meta (kg)
            </label>
            <input
              id="prof-target-weight"
              type="text"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label htmlFor="prof-level" className="block text-xs font-semibold mb-1">
              Nivel físico actual
            </label>
            <select
              id="prof-level"
              value={fitnessLevel}
              onChange={(e) =>
                setFitnessLevel(e.target.value as UserProfile['fitnessLevel'])
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            >
              <option value="sedentary">Sedentario / inicio prudente</option>
              <option value="restarting_home">Retomando con base previa en casa</option>
              <option value="intermediate">Intermedio consolidado</option>
              <option value="advanced">Avanzado</option>
            </select>
          </div>

          <div>
            <label htmlFor="prof-tz" className="block text-xs font-semibold mb-1">
              Zona horaria
            </label>
            <select
              id="prof-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            >
              <option value="Europe/Madrid">Europe/Madrid (Península)</option>
              <option value="Atlantic/Canary">Atlantic/Canary (Canarias)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={state.preferences.maintenanceMode}
            onChange={(e) =>
              void updatePreferences({ maintenanceMode: e.target.checked })
            }
            className="accent-emerald-600"
          />
          <span>
            Activar Modo Mantenimiento Energético (0 kcal de déficit al alcanzar tu objetivo saludable)
          </span>
        </label>

        {profileError && (
          <p role="alert" className="text-xs text-rose-600 font-semibold">
            {profileError}
          </p>
        )}

        <div>
          <button
            type="submit"
            className="min-h-11 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
          >
            Confirmar estatura, descartar TMB 779 kcal y guardar perfil
          </button>
        </div>
      </form>

      {/* 2. CUESTIONARIO INICIAL DE SALUD, LESIONES Y CONTRAINDICACIONES (REGLAS 8, 9 Y 10) */}
      <form
        onSubmit={handleSaveQuestionnaire}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          2. Cuestionario de seguridad, molestias articulares y disponibilidad
        </h2>
        <p className="text-xs text-slate-500">
          Forma360 no realiza diagnósticos médicos ni sustituye a profesionales sanitarios. Usa estas respuestas para proteger tus articulaciones y detectar banderas rojas.
        </p>

        <div className="space-y-2.5 text-xs">
          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
            <input
              type="checkbox"
              checked={chestPain}
              onChange={(e) => setChestPain(e.target.checked)}
              className="mt-0.5 accent-rose-600"
            />
            <span>
              ¿Has sentido dolor u opresión torácica, mareos intensos o desmayos al realizar esfuerzo físico?
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
            <input
              type="checkbox"
              checked={dyspnea}
              onChange={(e) => setDyspnea(e.target.checked)}
              className="mt-0.5 accent-rose-600"
            />
            <span>
              ¿Experimentas falta de aire desproporcionada con esfuerzos leves o al estar tumbado?
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
            <input
              type="checkbox"
              checked={abdominalFlag}
              onChange={(e) => setAbdominalFlag(e.target.checked)}
              className="mt-0.5 accent-amber-600"
            />
            <span>
              ¿El aumento de volumen abdominal es muy reciente, rápido, persistente, duro, doloroso o va acompañado de síntomas digestivos importantes?
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
            <input
              type="checkbox"
              checked={renalFlag}
              onChange={(e) => setRenalFlag(e.target.checked)}
              className="mt-0.5 accent-amber-600"
            />
            <span>
              ¿Tienes enfermedad renal conocida o indicación médica de restringir proteínas?
            </span>
          </label>
        </div>

        {(chestPain || dyspnea || abdominalFlag) && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500 bg-rose-500/10 p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2"
          >
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>
              <strong>Recomendación prudente:</strong> has señalado un síntoma que no debe atribuirse sin más a falta de forma o grasa abdominal. Solicita valoración médica antes de realizar esfuerzos intensos.
            </span>
          </div>
        )}

        <div className="space-y-2 text-xs">
          <div className="font-semibold">
            ¿Molestias articulares o lesiones previas a proteger?
          </div>
          <div className="flex flex-wrap gap-2">
            {JOINT_AREAS.map((area) => {
              const active = jointAreas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() =>
                    setJointAreas((prev) =>
                      active ? prev.filter((a) => a !== area) : [...prev, area]
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl border capitalize font-semibold ${
                    active
                      ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Tolerancia inicial al impacto</label>
            <select
              value={impactTol}
              onChange={(e) =>
                setImpactTol(e.target.value as SafetyScreening['impactTolerance'])
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            >
              <option value="low_only">Priorizar solo bajo impacto al empezar (bici/caminar)</option>
              <option value="low_to_moderate">Bajo impacto + intervalos suaves caminar-correr</option>
              <option value="good">Buena tolerancia articular actual</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Tiempo habitual por sesión (min)</label>
            <input
              type="number"
              min={20}
              max={120}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Medicación relevante (opcional)</label>
            <input
              type="text"
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              placeholder="Opcional..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="font-semibold">Días preferidos disponibles:</div>
          <div className="flex flex-wrap gap-1.5">
            {DAY_SHORT_ES.map((d, idx) => {
              const dayNum = idx + 1;
              const selected = preferredDays.includes(dayNum);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setPreferredDays((prev) =>
                      selected ? prev.filter((x) => x !== dayNum) : [...prev, dayNum]
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg font-bold ${
                    selected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="min-h-11 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs"
        >
          Guardar evaluación y adaptar mi plan de 8 semanas
        </button>
      </form>

      {/* 3. EXPORTACIÓN Y BORRADO SEGURO DE CUENTA */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          3. Copias de Seguridad y Borrado de Cuenta
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportFullJson}
            className="min-h-11 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar copia completa de mis datos (.JSON)</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="font-bold text-rose-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Zona sensible: Eliminar mi cuenta y todos mis datos</span>
          </div>
          <p className="text-slate-500">
            Escribe <strong>ELIMINAR</strong> para habilitar el borrado irreversible de tu perfil, entrenamientos, mediciones y comidas.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              aria-label="Confirmación para eliminar cuenta"
              value={deleteConfirmWord}
              onChange={(e) => setDeleteConfirmWord(e.target.value)}
              placeholder="Escribe ELIMINAR"
              className="rounded-xl border border-rose-300 dark:border-rose-800 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            />
            <button
              type="button"
              disabled={deleteConfirmWord !== 'ELIMINAR'}
              onClick={() => void deleteMyAccount()}
              className="min-h-10 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Borrar cuenta y datos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
