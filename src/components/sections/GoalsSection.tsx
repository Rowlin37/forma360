'use client';

import React, { useState } from 'react';
import { Check, CheckCircle2, Edit3, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import { formatEsNumber, generateId, parseMetricInput } from '@/lib/format';
import { UserGoal } from '@/lib/types';

export function GoalsSection() {
  const {
    state,
    upsertGoal,
    deleteGoal,
    toggleMilestone,
    decideRecommendation,
  } = useForma360();

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<UserGoal['goalType']>('strength');
  const [newStart, setNewStart] = useState('40');
  const [newTarget, setNewTarget] = useState('70');
  const [newUnit, setNewUnit] = useState('kg');

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTargetVal, setEditTargetVal] = useState<string>('75');
  const [customNotesByRec, setCustomNotesByRec] = useState<Record<string, string>>({});

  if (!state) return null;

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const startVal = parseMetricInput(newStart) ?? 0;
    const targetVal = parseMetricInput(newTarget) ?? 10;

    await upsertGoal({
      id: generateId('goal'),
      goalType: newType,
      title: newTitle.trim(),
      description: 'Objetivo personal añadido por el usuario',
      startValue: startVal,
      currentValue: startVal,
      targetValue: targetVal,
      unit: newUnit.trim() || 'kg',
      status: 'active',
      milestones: [],
    });
    setNewTitle('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Objetivos Escalonados y Motor de Recomendaciones
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          El objetivo inicial de ~75 kg se revisa según cintura, fuerza y bienestar: mejorar cintura y rendimiento es un éxito real aunque el peso cambie despacio.
        </p>
      </div>

      {/* MOTOR DE RECOMENDACIONES EXPLICABLES (ACEPTAR / MODIFICAR / RECHAZAR) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span>Decisiones y recomendaciones transparentes del motor</span>
        </div>

        {state.recommendations.length === 0 ? (
          <p className="text-xs text-slate-500">
            Todo en orden. A medida que acumules semanas de peso, cintura y entrenamientos aparecerán aquí propuestas razonadas.
          </p>
        ) : (
          <div className="space-y-3">
            {state.recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 space-y-2.5 text-xs ${
                  rec.severity === 'medical_alert'
                    ? 'border-rose-500 bg-rose-500/5'
                    : rec.status === 'pending'
                      ? 'border-emerald-500/40 bg-slate-50 dark:bg-slate-950'
                      : 'border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {rec.title}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold">
                    Regla: {rec.ruleCode} · Estado: {rec.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-300">
                  <strong>Motivo detectado:</strong> {rec.reason}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                  <strong>Cambio propuesto:</strong> {rec.proposedAction}
                </p>

                {rec.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void decideRecommendation(rec.id, 'accepted')}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aceptar</span>
                    </button>

                    <input
                      type="text"
                      value={customNotesByRec[rec.id] ?? ''}
                      onChange={(e) =>
                        setCustomNotesByRec((prev) => ({ ...prev, [rec.id]: e.target.value }))
                      }
                      placeholder="Nota o ajuste propio opcional..."
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        void decideRecommendation(
                          rec.id,
                          'modified',
                          customNotesByRec[rec.id] || 'Ajustado manualmente'
                        )
                      }
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
                    >
                      Modificar y aplicar
                    </button>

                    <button
                      type="button"
                      onClick={() => void decideRecommendation(rec.id, 'rejected')}
                      className="px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-500/10 font-semibold inline-flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Rechazar</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TARJETAS DE OBJETIVOS E HITOS ESCALONADOS (85,5 -> 81 -> 78 -> 75 KG) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.goals.map((goal) => (
          <div
            key={goal.id}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {goal.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{goal.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Editar meta ${goal.title}`}
                  onClick={() => {
                    setEditingGoalId(goal.id);
                    setEditTargetVal(String(goal.targetValue));
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {goal.id !== 'goal-weight-main' && (
                  <button
                    type="button"
                    aria-label={`Eliminar objetivo ${goal.title}`}
                    onClick={() => void deleteGoal(goal.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between text-xs bg-slate-50 dark:bg-slate-950 rounded-xl p-3">
              <span>
                Inicio: <strong>{formatEsNumber(goal.startValue, 1)} {goal.unit}</strong>
              </span>
              <span>
                Actual: <strong>{formatEsNumber(goal.currentValue, 1)} {goal.unit}</strong>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Meta: <strong>{formatEsNumber(goal.targetValue, 1)} {goal.unit}</strong>
              </span>
            </div>

            {editingGoalId === goal.id && (
              <div className="flex items-center gap-2 text-xs">
                <label className="font-semibold">Nueva meta ({goal.unit}):</label>
                <input
                  type="text"
                  aria-label="Nuevo valor meta"
                  value={editTargetVal}
                  onChange={(e) => setEditTargetVal(e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseMetricInput(editTargetVal);
                    if (parsed !== null) {
                      void upsertGoal({ ...goal, targetValue: parsed });
                    }
                    setEditingGoalId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Guardar meta
                </button>
              </div>
            )}

            {goal.milestones.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Hitos escalonados (sin fecha límite rígida)
                </div>
                {goal.milestones.map((ms) => (
                  <button
                    key={ms.id}
                    type="button"
                    onClick={() => void toggleMilestone(goal.id, ms.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                      ms.isReached
                        ? 'border-emerald-500/40 bg-emerald-500/10 font-semibold'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span>
                      {ms.label} ({formatEsNumber(ms.targetValue, 1)} {ms.unit})
                    </span>
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        ms.isReached ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CREAR NUEVO OBJETIVO DEPORTIVO O PERSONAL */}
      <form
        onSubmit={handleCreateGoal}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
      >
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-emerald-500" />
          <span>Añadir nuevo objetivo deportivo o de fuerza (ciclismo, banca, cintura...)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
          <input
            type="text"
            aria-label="Título del nuevo objetivo"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ej. Press de banca 70 kg × 8 reps"
            className="sm:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as UserGoal['goalType'])}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          >
            <option value="strength">Fuerza</option>
            <option value="waist">Cintura</option>
            <option value="running">Carrera / Ciclismo</option>
            <option value="custom">Personalizado</option>
          </select>
          <input
            type="text"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            placeholder="Inicio"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder="Meta"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder="Unidad (kg/km)"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="sm:col-span-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 text-xs"
          >
            Crear objetivo
          </button>
        </div>
      </form>
    </div>
  );
}
