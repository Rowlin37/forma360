'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Download,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import {
  buildCustomRecipe,
  calculateFoodMacros,
  exportNutritionLogsToCsv,
  generateDailySpanishMenu,
  importNutritionLogsFromCsv,
  isFoodExcluded,
  SPANISH_SYSTEM_FOODS,
  summarizeDailyNutrition,
} from '@/lib/domain/nutrition';
import { calculateEnergyNeeds, computeBodyTrendSummary } from '@/lib/domain/physiology';
import { formatEsNumber, generateId, parseMetricInput, todayIsoInTimezone } from '@/lib/format';
import { MealSlot } from '@/lib/types';

const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Desayuno' },
  { id: 'lunch', label: 'Comida' },
  { id: 'dinner', label: 'Cena' },
  { id: 'snack', label: 'Tentempiés' },
];

export function NutritionSection() {
  const {
    state,
    updatePreferences,
    logNutritionEntry,
    deleteNutritionEntry,
    addCustomFood,
    addCustomRecipe,
    importNutritionBatch,
  } = useForma360();

  const [selectedDate, setSelectedDate] = useState<string>(
    state ? todayIsoInTimezone(state.profile.timezone) : '2026-10-22'
  );
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [selectedFoodSlug, setSelectedFoodSlug] = useState<string>('pechuga-pollo');
  const [quantity, setQuantity] = useState<string>('200');
  const [unit, setUnit] = useState<'g' | 'ml' | 'unidad' | 'racion'>('g');

  // Registro manual rápido sin obligar a todos los campos
  const [quickName, setQuickName] = useState('');
  const [quickKcal, setQuickKcal] = useState('');
  const [quickProtein, setQuickProtein] = useState('');
  const [quickGrams, setQuickGrams] = useState('250');

  // Exclusiones alimentarias editables
  const [newExclusion, setNewExclusion] = useState('');

  // Menú intercambiable
  const [menuVariants, setMenuVariants] = useState<Record<MealSlot, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  });

  // Creador de alimento / receta personalizada
  const [recipeName, setRecipeName] = useState('');
  const [recipeFood1, setRecipeFood1] = useState('lentejas-cocidas');
  const [recipeGrams1, setRecipeGrams1] = useState('240');
  const [recipeFood2, setRecipeFood2] = useState('pechuga-pollo');
  const [recipeGrams2, setRecipeGrams2] = useState('150');

  const [customFoodName, setCustomFoodName] = useState('');
  const [customFoodKcal, setCustomFoodKcal] = useState('120');
  const [customFoodProt, setCustomFoodProt] = useState('15');
  const [customFoodCarbs, setCustomFoodCarbs] = useState('8');
  const [customFoodFat, setCustomFoodFat] = useState('3');

  if (!state) return null;

  const allFoods = [...SPANISH_SYSTEM_FOODS, ...state.customFoods];
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

  const dayTotals = summarizeDailyNutrition(state.nutritionLogs, selectedDate);
  const dayEntries = state.nutritionLogs.filter((l) => l.loggedOn === selectedDate);
  const habitualEntries = state.nutritionLogs.filter((l) => l.isHabitual).slice(-6);

  const generatedMenu = generateDailySpanishMenu(
    energy.targetIntakeKcal,
    state.preferences.excludedFoods,
    state.customFoods,
    menuVariants
  );

  const handleLogFromCatalog = async (e: React.FormEvent, markHabitual = false) => {
    e.preventDefault();
    const food = allFoods.find((f) => f.slug === selectedFoodSlug) ?? allFoods[0]!;
    const qty = Math.max(1, parseMetricInput(quantity) ?? 100);
    const macros = calculateFoodMacros(food, qty, unit);

    await logNutritionEntry({
      loggedOn: selectedDate,
      mealSlot,
      entryName: food.name,
      foodSlug: food.slug,
      recipeId: null,
      dataSource: food.dataSource,
      quantity: qty,
      unit,
      gramsEquivalent: macros.gramsEquivalent,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      fiberG: macros.fiberG,
      isHabitual: markHabitual,
      notes: '',
      clientDedupKey: `food:${selectedDate}:${mealSlot}:${food.slug}:${qty}:${unit}`,
    });
  };

  const handleQuickManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    const kcal = Math.max(0, parseMetricInput(quickKcal) ?? 0);
    const prot = Math.max(0, parseMetricInput(quickProtein) ?? 0);
    const grams = Math.max(1, parseMetricInput(quickGrams) ?? 100);

    await logNutritionEntry({
      loggedOn: selectedDate,
      mealSlot,
      entryName: quickName.trim(),
      foodSlug: null,
      recipeId: null,
      dataSource: 'quick_estimate',
      quantity: grams,
      unit: 'g',
      gramsEquivalent: grams,
      kcal,
      proteinG: prot,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      isHabitual: false,
      notes: 'Estimación rápida introducida manualmente por el usuario',
      clientDedupKey: `quick:${selectedDate}:${mealSlot}:${quickName.trim().toLowerCase()}:${kcal}`,
    });

    setQuickName('');
    setQuickKcal('');
    setQuickProtein('');
  };

  const handleExportCsv = () => {
    const csv = exportNutritionLogsToCsv(state.nutritionLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forma360-nutricion-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = importNutritionLogsFromCsv(text);
    if (parsed.length > 0) {
      await importNutritionBatch(parsed);
    }
    e.target.value = '';
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim()) return;
    const f1 = allFoods.find((f) => f.slug === recipeFood1) ?? allFoods[0]!;
    const f2 = allFoods.find((f) => f.slug === recipeFood2) ?? allFoods[1]!;
    const recipe = buildCustomRecipe(recipeName, 1, [
      { food: f1, grams: Math.max(10, parseMetricInput(recipeGrams1) ?? 150) },
      { food: f2, grams: Math.max(10, parseMetricInput(recipeGrams2) ?? 150) },
    ]);
    await addCustomRecipe(recipe);
    setRecipeName('');
  };

  const handleCreateCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFoodName.trim()) return;
    await addCustomFood({
      slug: `custom-food-${generateId('f')}`,
      name: customFoodName.trim(),
      foodGroup: 'Personalizados',
      dataSource: 'user_editable',
      kcalPer100g: Math.max(0, parseMetricInput(customFoodKcal) ?? 100),
      proteinPer100g: Math.max(0, parseMetricInput(customFoodProt) ?? 10),
      carbsPer100g: Math.max(0, parseMetricInput(customFoodCarbs) ?? 10),
      fatPer100g: Math.max(0, parseMetricInput(customFoodFat) ?? 3),
      fiberPer100g: 0,
      defaultPortionName: '1 ración (100 g)',
      defaultPortionGrams: 100,
      tags: [],
    });
    setCustomFoodName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Nutrición Basada en Evidencia y Diario Alimentario
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Déficit moderado y sostenible, proteína suficiente y comida española habitual sin suplementos milagro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Fecha del diario nutricional"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
          />
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-10 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <label className="min-h-10 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Importar CSV</span>
            <input type="file" accept=".csv,text/csv" onChange={handleImportCsvFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* 4 TARJETAS DE TRANSPARENCIA ENERGÉTICA (TMB ESTIMADO vs TDEE vs OBJETIVO vs REAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-500">
            1. Metabolismo Basal Estimado
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {energy.estimatedBmrKcal} kcal/día
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            Mifflin-St Jeor (779 kcal de báscula descartado por anómalo).
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-500">
            2. Gasto Total Estimado (TDEE)
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {energy.estimatedTdeeKcal} kcal/día
          </div>
          <p className="text-[11px] text-slate-500">
            Factor actividad prudente ×{formatEsNumber(state.preferences.activityFactor, 2)} (incluye fútbol).
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 p-4 space-y-2">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            3. Objetivo de Ingesta Diaria
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {energy.targetIntakeKcal} kcal/día
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span>Déficit: -{energy.appliedDeficitKcal} kcal</span>
            <input
              type="range"
              aria-label="Ajustar déficit energético diario"
              min={250}
              max={650}
              step={50}
              value={state.preferences.targetDeficitKcal}
              onChange={(e) =>
                void updatePreferences({ targetDeficitKcal: Number(e.target.value) })
              }
              className="w-24 accent-emerald-500"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-500">
            4. Ingesta Real Registrada ({selectedDate})
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {Math.round(dayTotals.kcal)} kcal
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Prot: <strong>{formatEsNumber(dayTotals.proteinG, 1)}/{energy.proteinTargetGrams} g</strong> ·
            HC: {formatEsNumber(dayTotals.carbsG, 0)} g · Grasas: {formatEsNumber(dayTotals.fatG, 0)} g · Fibra:{' '}
            {formatEsNumber(dayTotals.fiberG, 1)} g
          </p>
        </div>
      </div>

      {energy.renalCautionActive && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-950 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Precaución renal activa en tu cuestionario: no se aplican objetivos hiperproteicos automáticos. Consulta tu ingesta proteica individual con tu nefrólogo o dietista-nutricionista.
          </span>
        </div>
      )}

      {/* REGISTRO DESDE BASE DE ALIMENTOS ESPAÑOLES + REGISTRO RÁPIDO MANUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form
          onSubmit={(e) => void handleLogFromCatalog(e, false)}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Añadir alimento habitual (España · g, ml, unidades o raciones)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="meal-slot-select" className="block text-xs font-semibold mb-1">
                Toma del día
              </label>
              <select
                id="meal-slot-select"
                value={mealSlot}
                onChange={(e) => setMealSlot(e.target.value as MealSlot)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              >
                {MEAL_SLOTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="food-item-select" className="block text-xs font-semibold mb-1">
                Alimento (fuente BEDCA / editable)
              </label>
              <select
                id="food-item-select"
                value={selectedFoodSlug}
                onChange={(e) => setSelectedFoodSlug(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              >
                {allFoods.map((f) => {
                  const excluded = isFoodExcluded(f, state.preferences.excludedFoods);
                  return (
                    <option key={f.slug} value={f.slug}>
                      {f.name} ({f.kcalPer100g} kcal/100g){excluded ? ' [Excluido en menús]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="food-qty-input" className="block text-xs font-semibold mb-1">
                Cantidad
              </label>
              <input
                id="food-qty-input"
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="food-unit-select" className="block text-xs font-semibold mb-1">
                Unidad
              </label>
              <select
                id="food-unit-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'g' | 'ml' | 'unidad' | 'racion')}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="g">Gramos (g)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="unidad">Unidades</option>
                <option value="racion">Raciones estándar</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="min-h-11 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar en diario</span>
            </button>
            <button
              type="button"
              onClick={(e) => void handleLogFromCatalog(e, true)}
              className="min-h-11 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Registrar + Guardar como habitual
            </button>
          </div>

          {habitualEntries.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Comidas habituales (1 toque para duplicar hoy)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {habitualEntries.map((hab) => (
                  <button
                    key={hab.id}
                    type="button"
                    onClick={() =>
                      void logNutritionEntry(
                        {
                          ...hab,
                          loggedOn: selectedDate,
                          clientDedupKey: `copy:${selectedDate}:${generateId('c')}`,
                        },
                        true
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{hab.entryName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* REGISTRO RÁPIDO MANUAL + CREAR ALIMENTO PROPIO */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Registro manual rápido (sin rellenar todos los campos)
          </h2>
          <form onSubmit={handleQuickManualLog} className="space-y-3">
            <input
              type="text"
              aria-label="Nombre de comida manual rápida"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Ej. Menú del día fuera: pollo asado con patatas"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-3 gap-2.5">
              <input
                type="text"
                inputMode="decimal"
                aria-label="Calorías estimadas manuales"
                value={quickKcal}
                onChange={(e) => setQuickKcal(e.target.value)}
                placeholder="Kcal est. (ej. 620)"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <input
                type="text"
                inputMode="decimal"
                aria-label="Proteínas estimadas manuales"
                value={quickProtein}
                onChange={(e) => setQuickProtein(e.target.value)}
                placeholder="Prot g (opc.)"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <input
                type="text"
                inputMode="decimal"
                aria-label="Cantidad gramos manual"
                value={quickGrams}
                onChange={(e) => setQuickGrams(e.target.value)}
                placeholder="Gramos (250)"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="min-h-11 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold text-xs"
            >
              Guardar entrada manual (etiquetada como estimación)
            </button>
          </form>

          <form
            onSubmit={handleCreateCustomFood}
            className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2"
          >
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Añadir alimento editable a mi base personal (por 100 g)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <input
                type="text"
                value={customFoodName}
                onChange={(e) => setCustomFoodName(e.target.value)}
                placeholder="Alimento..."
                className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs"
              />
              <input
                type="number"
                value={customFoodKcal}
                onChange={(e) => setCustomFoodKcal(e.target.value)}
                placeholder="Kcal"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                value={customFoodProt}
                onChange={(e) => setCustomFoodProt(e.target.value)}
                placeholder="Prot"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                value={customFoodCarbs}
                onChange={(e) => setCustomFoodCarbs(e.target.value)}
                placeholder="HC"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                value={customFoodFat}
                onChange={(e) => setCustomFoodFat(e.target.value)}
                placeholder="Grasa"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="sm:col-span-6 rounded-lg bg-slate-200 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold"
              >
                Guardar alimento personalizado
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* DIARIO DEL DÍA AGRUPADO POR DESAYUNO, COMIDA, CENA Y TENTEMPIÉS */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Diario nutricional del {selectedDate}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MEAL_SLOTS.map((slot) => {
            const items = dayEntries.filter((e) => e.mealSlot === slot.id);
            const subKcal = items.reduce((s, i) => s + i.kcal, 0);
            return (
              <div
                key={slot.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {slot.label}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {Math.round(subKcal)} kcal
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Sin registros en esta toma.</p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-xs py-1"
                    >
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.entryName}
                        </span>{' '}
                        <span className="text-slate-500">
                          ({item.quantity} {item.unit} · {Math.round(item.kcal)} kcal ·{' '}
                          {formatEsNumber(item.proteinG, 1)} g prot ·{' '}
                          {item.dataSource === 'bedca_reference' ? 'Ref. tabla' : 'Est. usuario'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteNutritionEntry(item.id)}
                        aria-label={`Borrar ${item.entryName}`}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ALIMENTOS EXCLUIDOS EDITABLES + GENERADOR DE MENÚS INTERCAMBIABLES + RECETAS */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Preferencias alimentarias y exclusiones activas en tus menús
          </h2>
          <p className="text-xs text-slate-500">
            Excluidos por defecto según tu perfil (haz clic en × si en el futuro deseas incluir alguno o añade nuevos):
          </p>

          <div className="flex flex-wrap gap-2 items-center">
            {state.preferences.excludedFoods.map((food) => (
              <span
                key={food}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-800 dark:text-rose-200"
              >
                <span>{food}</span>
                <button
                  type="button"
                  aria-label={`Quitar exclusión ${food}`}
                  onClick={() =>
                    void updatePreferences({
                      excludedFoods: state.preferences.excludedFoods.filter((x) => x !== food),
                    })
                  }
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newExclusion.trim()) return;
                void updatePreferences({
                  excludedFoods: [...state.preferences.excludedFoods, newExclusion.trim().toLowerCase()],
                });
                setNewExclusion('');
              }}
              className="inline-flex items-center gap-1.5"
            >
              <input
                type="text"
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                placeholder="Excluir otro alimento..."
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
              >
                Excluir
              </button>
            </form>
          </div>
        </div>

        {/* MENÚ DIARIO INTERCAMBIABLE */}
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Propuesta de menú diario intercambiable (~{energy.targetIntakeKcal} kcal)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedMenu.map((option) => (
              <div
                key={option.slot}
                className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    {option.slotLabel} · {option.totalKcal} kcal · {option.totalProteinG} g prot
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMenuVariants((prev) => ({
                        ...prev,
                        [option.slot]: (prev[option.slot] ?? 0) + 1,
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Otra opción</span>
                  </button>
                </div>

                <p className="text-sm font-bold text-slate-900 dark:text-white">{option.title}</p>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                  {option.items.map((ing) => (
                    <li key={ing.foodSlug}>
                      • {ing.foodName}: <strong>{ing.grams} g</strong> ({Math.round(ing.kcal)} kcal)
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() =>
                    void logNutritionEntry({
                      loggedOn: selectedDate,
                      mealSlot: option.slot,
                      entryName: option.title,
                      foodSlug: null,
                      recipeId: null,
                      dataSource: 'recipe_calculated',
                      quantity: 1,
                      unit: 'racion',
                      gramsEquivalent: option.items.reduce((s, i) => s + i.grams, 0),
                      kcal: option.totalKcal,
                      proteinG: option.totalProteinG,
                      carbsG: option.totalCarbsG,
                      fatG: option.totalFatG,
                      fiberG: 6,
                      isHabitual: false,
                      notes: 'Añadido desde el generador de menús',
                      clientDedupKey: `menu:${selectedDate}:${option.slot}:${option.title}`,
                    })
                  }
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  + Registrar esta comida en mi diario de hoy
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RECETAS PERSONALIZADAS */}
        <form
          onSubmit={handleSaveRecipe}
          className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Mis recetas caseras calculadas ({state.customRecipes.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
            <input
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Nombre receta (ej. Plato combinado post-entreno)"
              className="sm:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
            <select
              value={recipeFood1}
              onChange={(e) => setRecipeFood1(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-2 text-xs"
            >
              {allFoods.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={recipeGrams1}
              onChange={(e) => setRecipeGrams1(e.target.value)}
              placeholder="g"
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-2 text-xs"
            />
            <select
              value={recipeFood2}
              onChange={(e) => setRecipeFood2(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-2 text-xs"
            >
              {allFoods.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={recipeGrams2}
              onChange={(e) => setRecipeGrams2(e.target.value)}
              placeholder="g (ing. 2)"
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-2 text-xs"
            />
            <button
              type="submit"
              className="sm:col-span-6 rounded-xl bg-emerald-600 text-white font-semibold px-3 py-2 text-xs"
            >
              Crear receta personalizada
            </button>
          </div>

          {state.customRecipes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.customRecipes.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() =>
                    void logNutritionEntry({
                      loggedOn: selectedDate,
                      mealSlot,
                      entryName: `Receta: ${rec.name}`,
                      foodSlug: null,
                      recipeId: rec.id,
                      dataSource: 'recipe_calculated',
                      quantity: 1,
                      unit: 'racion',
                      gramsEquivalent: 350,
                      kcal: rec.kcalPerServing,
                      proteinG: rec.proteinPerServing,
                      carbsG: rec.carbsPerServing,
                      fatG: rec.fatPerServing,
                      fiberG: rec.fiberPerServing,
                      isHabitual: true,
                      notes: '',
                      clientDedupKey: `recipe:${selectedDate}:${mealSlot}:${rec.id}`,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold"
                >
                  + {rec.name} ({Math.round(rec.kcalPerServing)} kcal · {rec.proteinPerServing} g prot)
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
