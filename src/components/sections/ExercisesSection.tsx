'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, Search, Wrench } from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import { getActiveEquipmentSet, isExerciseCompatibleWithEquipment } from '@/lib/domain/equipment';
import { getAllExercises } from '@/lib/domain/exercises';
import { generateId, parseMetricInput } from '@/lib/format';
import { EquipmentCategory, ExerciseCategory } from '@/lib/types';

export function ExercisesSection() {
  const {
    state,
    toggleEquipment,
    updateEquipmentWeights,
    addCustomEquipment,
    saveExerciseNote,
    addCustomExercise,
  } = useForma360();

  const [categoryFilter, setCategoryFilter] = useState<'all' | ExerciseCategory>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [onlyAvailableMaterial, setOnlyAvailableMaterial] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSlug, setExpandedSlug] = useState<string | null>('bench-press-barbell');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  // Añadir material personalizado
  const [newMatName, setNewMatName] = useState('');
  const [newMatCategory, setNewMatCategory] = useState<EquipmentCategory>('accessories');
  const [newMatDesc, setNewMatDesc] = useState('');

  // Pesos disponibles por material
  const [editingEqSlug, setEditingEqSlug] = useState<string | null>(null);
  const [weightsCsvInput, setWeightsCsvInput] = useState('');

  // Crear ejercicio personalizado
  const [customExName, setCustomExName] = useState('');
  const [customExMuscle, setCustomExMuscle] = useState('Espalda media');
  const [customExCategory, setCustomExCategory] = useState<ExerciseCategory>('strength');
  const [customExEquip, setCustomExEquip] = useState('dumbbells');
  const [customExSteps, setCustomExSteps] = useState('');

  if (!state) return null;

  const activeSet = getActiveEquipmentSet(state.equipment);
  const allExercises = getAllExercises(state.customExercises, state.exerciseNotes);

  const filteredExercises = allExercises.filter((ex) => {
    if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false;
    if (difficultyFilter !== 'all' && ex.difficulty !== difficultyFilter) return false;
    if (onlyAvailableMaterial && !isExerciseCompatibleWithEquipment(ex.requiredEquipment, activeSet)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscle.toLowerCase().includes(q) ||
        ex.movementPattern.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const compatibleCount = allExercises.filter((ex) =>
    isExerciseCompatibleWithEquipment(ex.requiredEquipment, activeSet)
  ).length;

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customExName.trim()) return;
    await addCustomExercise({
      slug: `user-ex-${generateId('ex')}`,
      name: customExName.trim(),
      category: customExCategory,
      primaryMuscle: customExMuscle.trim() || 'Cuerpo completo',
      secondaryMuscles: [],
      movementPattern: 'horizontal_push',
      difficulty: 'beginner',
      impactLevel: 'low',
      physicalDemand: 3,
      requiredEquipment: [customExEquip],
      instructions: customExSteps.trim()
        ? customExSteps.split('\n').filter(Boolean)
        : ['Ejecuta el movimiento con control técnico en todo el rango articular.'],
      commonErrors: ['Usar inercia o acortar recorrido'],
      safetyTips: ['Respeta dolor articular cero y deja 2 repeticiones en recámara.'],
      easierVariants: ['Con menor carga o peso corporal'],
      harderVariants: ['Aumentando control excéntrico de 3 s'],
      materialSubstitutions: [],
      recommendedPrescription: {
        sets: 3,
        repsOrDuration: '8-12 repeticiones',
        restSeconds: 90,
        rpeTarget: 'RPE 7-8',
      },
      personalNotes: '',
    });
    setCustomExName('');
    setCustomExSteps('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Catálogo de Ejercicios y Equipamiento Dinámico
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Activa o desactiva cualquier material en tiempo real: tu plan adapta automáticamente los ejercicios incompatibles sin reconstruirse desde cero ({compatibleCount}/{allExercises.length} ejercicios compatibles hoy).
        </p>
      </div>

      {/* PANEL DE EQUIPAMIENTO DINÁMICO ACTUAL + FUTURO */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Wrench className="w-4 h-4 text-emerald-500" />
            <span>Mi inventario de material (casa actual + futuro gimnasio/accesorios)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {state.equipment.map((eq) => (
            <div
              key={eq.slug}
              className={`rounded-xl border p-3 flex flex-col justify-between gap-2 transition ${
                eq.isAvailable
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-200 dark:border-slate-800 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {eq.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {eq.availableWeightsKg.length > 0
                      ? `Pesos: ${eq.availableWeightsKg.join(', ')} kg`
                      : eq.weightsDescription}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={eq.slug === 'bodyweight_space'}
                  aria-pressed={eq.isAvailable}
                  aria-label={`Cambiar disponibilidad de ${eq.name}`}
                  onClick={() => void toggleEquipment(eq.slug, !eq.isAvailable)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    eq.isAvailable
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {eq.isAvailable ? 'Disponible' : 'Activar'}
                </button>
              </div>

              {eq.category === 'free_weights' && (
                <div>
                  {editingEqSlug === eq.slug ? (
                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        value={weightsCsvInput}
                        onChange={(e) => setWeightsCsvInput(e.target.value)}
                        placeholder="Ej. 2.5, 5, 10, 15"
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nums = weightsCsvInput
                            .split(/[;,]/)
                            .map((s) => parseMetricInput(s))
                            .filter((n): n is number => n !== null && n > 0);
                          void updateEquipmentWeights(
                            eq.slug,
                            nums,
                            nums.length ? `Disponibles: ${nums.join(', ')} kg` : eq.weightsDescription
                          );
                          setEditingEqSlug(null);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEqSlug(eq.slug);
                        setWeightsCsvInput(eq.availableWeightsKg.join(', '));
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Indicar discos / pesos exactos (kg)
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Añadir otro equipamiento futuro */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newMatName.trim()) return;
            void addCustomEquipment(newMatName, newMatCategory, newMatDesc || 'Añadido por el usuario');
            setNewMatName('');
            setNewMatDesc('');
          }}
          className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2"
        >
          <input
            type="text"
            value={newMatName}
            onChange={(e) => setNewMatName(e.target.value)}
            placeholder="Añadir otro material futuro (ej. Chaleco lastrado, TRX...)"
            className="sm:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <select
            value={newMatCategory}
            onChange={(e) => setNewMatCategory(e.target.value as EquipmentCategory)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          >
            <option value="accessories">Accesorios</option>
            <option value="free_weights">Peso libre</option>
            <option value="cardio">Cardio</option>
            <option value="machines">Máquinas</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold px-3 py-2 text-xs"
          >
            + Añadir material
          </button>
        </form>
      </div>

      {/* NOTA ACLARATORIA ABDOMINALES Y GRASA VISCERAL */}
      <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-700 dark:text-slate-300">
        <strong>Criterio de entrenamiento abdominal:</strong> Ejercicios como plancha, dead bug, crunch controlado o rueda abdominal fortalecen y estabilizan el tronco (clave para correr y levantar peso sin dolor lumbar), pero <strong>no queman grasa localizada del abdomen</strong>. La reducción de cintura y exceso de grasa visceral se logra combinando déficit calórico moderado, fuerza global y trabajo cardiovascular constante.
      </div>

      {/* BUSCADOR Y FILTROS DE LA BIBLIOTECA */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar músculo o ejercicio..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | ExerciseCategory)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
        >
          <option value="all">Todas las categorías ({allExercises.length})</option>
          <option value="strength">Fuerza</option>
          <option value="core">Core y abdominales</option>
          <option value="cardio">Cardio y bajo impacto</option>
          <option value="running">Carrera</option>
          <option value="recovery">Movilidad y recuperación</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) =>
            setDifficultyFilter(
              e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced'
            )
          }
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
        >
          <option value="all">Cualquier dificultad</option>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzado</option>
        </select>

        <label className="inline-flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={onlyAvailableMaterial}
            onChange={(e) => setOnlyAvailableMaterial(e.target.checked)}
            className="accent-emerald-600"
          />
          <span>Solo con mi material activo</span>
        </label>
      </div>

      {/* FICHAS ESTRUCTURADAS DE EJERCICIOS */}
      <div className="space-y-3">
        {filteredExercises.map((ex) => {
          const isCompatible = isExerciseCompatibleWithEquipment(ex.requiredEquipment, activeSet);
          const isOpen = expandedSlug === ex.slug;

          return (
            <div
              key={ex.slug}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3"
            >
              <button
                type="button"
                onClick={() => setExpandedSlug(isOpen ? null : ex.slug)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {ex.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isCompatible
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isCompatible ? 'Compatible hoy' : 'Requiere material inactivo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ex.primaryMuscle} · Dificultad:{' '}
                    {ex.difficulty === 'beginner'
                      ? 'Principiante'
                      : ex.difficulty === 'intermediate'
                        ? 'Intermedia'
                        : 'Avanzada'}{' '}
                    · Impacto: {ex.impactLevel === 'low' ? 'Bajo' : ex.impactLevel === 'medium' ? 'Medio' : 'Alto'}
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Instrucciones paso a paso:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                      {ex.instructions.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <p className="text-slate-500">
                      <strong>Dosis orientativa:</strong> {ex.recommendedPrescription.sets} ×{' '}
                      {ex.recommendedPrescription.repsOrDuration} (descanso{' '}
                      {ex.recommendedPrescription.restSeconds} s · {ex.recommendedPrescription.rpeTarget})
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p>
                      <strong className="text-rose-600 dark:text-rose-400">Errores frecuentes:</strong>{' '}
                      {ex.commonErrors.join(' · ')}
                    </p>
                    <p>
                      <strong className="text-emerald-600 dark:text-emerald-400">Seguridad:</strong>{' '}
                      {ex.safetyTips.join(' ')}
                    </p>
                    <p>
                      <strong>Más sencillo:</strong> {ex.easierVariants.join(', ')} ·{' '}
                      <strong>Progresión:</strong> {ex.harderVariants.join(', ')}
                    </p>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={noteDrafts[ex.slug] ?? ex.personalNotes}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [ex.slug]: e.target.value }))
                        }
                        placeholder="Notas personales (ej. altura banco, agarre, disco usado)..."
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void saveExerciseNote(
                            ex.slug,
                            noteDrafts[ex.slug] ?? ex.personalNotes
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-semibold"
                      >
                        Guardar nota
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREAR EJERCICIO PERSONALIZADO */}
      <form
        onSubmit={handleCreateExercise}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
      >
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-emerald-500" />
          <span>Crear ejercicio personalizado en mi biblioteca</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            value={customExName}
            onChange={(e) => setCustomExName(e.target.value)}
            placeholder="Nombre del ejercicio"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={customExMuscle}
            onChange={(e) => setCustomExMuscle(e.target.value)}
            placeholder="Músculo principal"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <select
            value={customExCategory}
            onChange={(e) => setCustomExCategory(e.target.value as ExerciseCategory)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          >
            <option value="strength">Fuerza</option>
            <option value="core">Core</option>
            <option value="cardio">Cardio</option>
            <option value="mobility">Movilidad</option>
          </select>
          <select
            value={customExEquip}
            onChange={(e) => setCustomExEquip(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          >
            {state.equipment.map((eq) => (
              <option key={eq.slug} value={eq.slug}>
                {eq.name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          rows={2}
          value={customExSteps}
          onChange={(e) => setCustomExSteps(e.target.value)}
          placeholder="Instrucciones paso a paso (una por línea)..."
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
        >
          Guardar ejercicio en mi biblioteca
        </button>
      </form>
    </div>
  );
}
