import { generateId } from '@/lib/format';
import {
  CustomRecipe,
  FoodDataSource,
  FoodItem,
  MealSlot,
  NutritionLogEntry,
  RecipeIngredient,
} from '@/lib/types';

/**
 * Alimentos habituales en España con valores de referencia por 100 g/ml (inspirados en tablas BEDCA).
 * Incluye también los alimentos excluidos por defecto (espinacas, queso feta, espárragos,
 * brócoli, coliflor y pepino) para que el motor de preferencias y exclusiones los filtre
 * dinámicamente a menos que el usuario cambie sus preferencias.
 */
export const SPANISH_SYSTEM_FOODS: FoodItem[] = [
  {
    id: 'fd-pollo',
    slug: 'pechuga-pollo',
    name: 'Pechuga de pollo a la plancha',
    foodGroup: 'Carnes magras',
    dataSource: 'bedca_reference',
    kcalPer100g: 113,
    proteinPer100g: 22.8,
    carbsPer100g: 0,
    fatPer100g: 2.3,
    fiberPer100g: 0,
    defaultPortionName: '1 filete mediano (180 g)',
    defaultPortionGrams: 180,
    tags: ['pechuga de pollo', 'pollo'],
    isCustom: false,
  },
  {
    id: 'fd-pavo',
    slug: 'solomillo-pavo',
    name: 'Pechuga o solomillo de pavo fresco',
    foodGroup: 'Carnes magras',
    dataSource: 'bedca_reference',
    kcalPer100g: 107,
    proteinPer100g: 23.5,
    carbsPer100g: 0,
    fatPer100g: 1.5,
    fiberPer100g: 0,
    defaultPortionName: '1 ración (180 g)',
    defaultPortionGrams: 180,
    tags: ['pavo'],
    isCustom: false,
  },
  {
    id: 'fd-ternera',
    slug: 'ternera-magra',
    name: 'Ternera magra a la plancha',
    foodGroup: 'Carnes magras',
    dataSource: 'bedca_reference',
    kcalPer100g: 138,
    proteinPer100g: 21.5,
    carbsPer100g: 0,
    fatPer100g: 5.4,
    fiberPer100g: 0,
    defaultPortionName: '1 filete (170 g)',
    defaultPortionGrams: 170,
    tags: ['ternera'],
    isCustom: false,
  },
  {
    id: 'fd-lomo-embuchado',
    slug: 'lomo-embuchado',
    name: 'Lomo embuchado ibérico/extra',
    foodGroup: 'Embutidos magros',
    dataSource: 'bedca_reference',
    kcalPer100g: 202,
    proteinPer100g: 32.0,
    carbsPer100g: 1.0,
    fatPer100g: 7.8,
    fiberPer100g: 0,
    defaultPortionName: '4 lonchas finas (45 g)',
    defaultPortionGrams: 45,
    tags: ['lomo embuchado'],
    isCustom: false,
  },
  {
    id: 'fd-jamon-serrano',
    slug: 'jamon-serrano',
    name: 'Jamón serrano sin tocino exterior',
    foodGroup: 'Embutidos magros',
    dataSource: 'bedca_reference',
    kcalPer100g: 215,
    proteinPer100g: 30.5,
    carbsPer100g: 0.5,
    fatPer100g: 9.8,
    fiberPer100g: 0,
    defaultPortionName: '1 ración tostada (45 g)',
    defaultPortionGrams: 45,
    tags: ['jamón serrano'],
    isCustom: false,
  },
  {
    id: 'fd-huevos',
    slug: 'huevos-camperos',
    name: 'Huevos enteros de gallina',
    foodGroup: 'Huevos',
    dataSource: 'bedca_reference',
    kcalPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
    fiberPer100g: 0,
    defaultPortionName: '2 huevos L (120 g)',
    defaultPortionGrams: 120,
    tags: ['huevo', 'huevos'],
    isCustom: false,
  },
  {
    id: 'fd-claras',
    slug: 'claras-pasteurizadas',
    name: 'Claras de huevo pasteurizadas',
    foodGroup: 'Huevos',
    dataSource: 'bedca_reference',
    kcalPer100g: 49,
    proteinPer100g: 11.0,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    fiberPer100g: 0,
    defaultPortionName: '150 ml',
    defaultPortionGrams: 150,
    tags: ['claras'],
    isCustom: false,
  },
  {
    id: 'fd-merluza',
    slug: 'merluza-fresca',
    name: 'Merluza al horno o plancha',
    foodGroup: 'Pescados',
    dataSource: 'bedca_reference',
    kcalPer100g: 89,
    proteinPer100g: 17.8,
    carbsPer100g: 0,
    fatPer100g: 1.8,
    fiberPer100g: 0,
    defaultPortionName: '1 lomo grande (200 g)',
    defaultPortionGrams: 200,
    tags: ['merluza', 'pescado blanco'],
    isCustom: false,
  },
  {
    id: 'fd-salmon',
    slug: 'salmon-fresco',
    name: 'Salmón fresco al horno/plancha',
    foodGroup: 'Pescados',
    dataSource: 'bedca_reference',
    kcalPer100g: 208,
    proteinPer100g: 20.4,
    carbsPer100g: 0,
    fatPer100g: 13.4,
    fiberPer100g: 0,
    defaultPortionName: '1 lomo (160 g)',
    defaultPortionGrams: 160,
    tags: ['salmón', 'omega 3'],
    isCustom: false,
  },
  {
    id: 'fd-atun',
    slug: 'atun-natural',
    name: 'Atún claro al natural escurrido',
    foodGroup: 'Pescados',
    dataSource: 'bedca_reference',
    kcalPer100g: 108,
    proteinPer100g: 24.5,
    carbsPer100g: 0,
    fatPer100g: 1.0,
    fiberPer100g: 0,
    defaultPortionName: '2 latas escurridas (112 g)',
    defaultPortionGrams: 112,
    tags: ['atún'],
    isCustom: false,
  },
  {
    id: 'fd-qfb',
    slug: 'queso-fresco-batido',
    name: 'Queso fresco batido 0% materia grasa',
    foodGroup: 'Lácteos',
    dataSource: 'bedca_reference',
    kcalPer100g: 47,
    proteinPer100g: 8.1,
    carbsPer100g: 3.5,
    fatPer100g: 0.1,
    fiberPer100g: 0,
    defaultPortionName: '1 bol (250 g)',
    defaultPortionGrams: 250,
    tags: ['queso fresco batido', 'lácteo'],
    isCustom: false,
  },
  {
    id: 'fd-yogur-griego',
    slug: 'yogur-griego-natural',
    name: 'Yogur griego natural sin azúcar',
    foodGroup: 'Lácteos',
    dataSource: 'bedca_reference',
    kcalPer100g: 97,
    proteinPer100g: 9.0,
    carbsPer100g: 3.6,
    fatPer100g: 5.0,
    fiberPer100g: 0,
    defaultPortionName: '1 envase (125 g)',
    defaultPortionGrams: 125,
    tags: ['yogur'],
    isCustom: false,
  },
  {
    id: 'fd-leche-semi',
    slug: 'leche-semidesnatada',
    name: 'Leche de vaca semidesnatada',
    foodGroup: 'Lácteos',
    dataSource: 'bedca_reference',
    kcalPer100g: 46,
    proteinPer100g: 3.3,
    carbsPer100g: 4.8,
    fatPer100g: 1.6,
    fiberPer100g: 0,
    defaultPortionName: '1 taza (200 ml)',
    defaultPortionGrams: 200,
    tags: ['leche'],
    isCustom: false,
  },
  {
    id: 'fd-pan-integral',
    slug: 'pan-integral-hogaza',
    name: 'Pan integral de barra u hogaza',
    foodGroup: 'Cereales y pan',
    dataSource: 'bedca_reference',
    kcalPer100g: 247,
    proteinPer100g: 10.5,
    carbsPer100g: 43.3,
    fatPer100g: 2.9,
    fiberPer100g: 6.8,
    defaultPortionName: '2 rebanadas (65 g)',
    defaultPortionGrams: 65,
    tags: ['pan integral'],
    isCustom: false,
  },
  {
    id: 'fd-avena',
    slug: 'copos-avena',
    name: 'Copos de avena integrales',
    foodGroup: 'Cereales y pan',
    dataSource: 'bedca_reference',
    kcalPer100g: 372,
    proteinPer100g: 13.5,
    carbsPer100g: 58.7,
    fatPer100g: 7.0,
    fiberPer100g: 10.0,
    defaultPortionName: '4 cucharadas colmadas (50 g)',
    defaultPortionGrams: 50,
    tags: ['avena'],
    isCustom: false,
  },
  {
    id: 'fd-arroz-cocido',
    slug: 'arroz-cocido',
    name: 'Arroz blanco o basmati cocido',
    foodGroup: 'Cereales y tubérculos',
    dataSource: 'bedca_reference',
    kcalPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28.2,
    fatPer100g: 0.3,
    fiberPer100g: 0.4,
    defaultPortionName: '1 guarnición cocida (180 g)',
    defaultPortionGrams: 180,
    tags: ['arroz'],
    isCustom: false,
  },
  {
    id: 'fd-patata-cocida',
    slug: 'patata-cocida-asada',
    name: 'Patata cocida o asada al horno/airfryer',
    foodGroup: 'Cereales y tubérculos',
    dataSource: 'bedca_reference',
    kcalPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20.1,
    fatPer100g: 0.1,
    fiberPer100g: 1.8,
    defaultPortionName: '1 ración muy saciante (260 g)',
    defaultPortionGrams: 260,
    tags: ['patata'],
    isCustom: false,
  },
  {
    id: 'fd-lentejas',
    slug: 'lentejas-cocidas',
    name: 'Lentejas pardinas cocidas',
    foodGroup: 'Legumbres',
    dataSource: 'bedca_reference',
    kcalPer100g: 116,
    proteinPer100g: 9.0,
    carbsPer100g: 20.1,
    fatPer100g: 0.4,
    fiberPer100g: 7.9,
    defaultPortionName: '1 plato cocido (220 g)',
    defaultPortionGrams: 220,
    tags: ['lentejas', 'legumbres'],
    isCustom: false,
  },
  {
    id: 'fd-garbanzos',
    slug: 'garbanzos-cocidos',
    name: 'Garbanzos cocidos',
    foodGroup: 'Legumbres',
    dataSource: 'bedca_reference',
    kcalPer100g: 164,
    proteinPer100g: 8.9,
    carbsPer100g: 27.4,
    fatPer100g: 2.6,
    fiberPer100g: 7.6,
    defaultPortionName: '1 plato cocido (200 g)',
    defaultPortionGrams: 200,
    tags: ['garbanzos', 'legumbres'],
    isCustom: false,
  },
  {
    id: 'fd-tomate',
    slug: 'tomate-natural',
    name: 'Tomate maduro rallado o en ensalada',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 20,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    fiberPer100g: 1.2,
    defaultPortionName: '1 tomate grande (160 g)',
    defaultPortionGrams: 160,
    tags: ['tomate', 'verdura'],
    isCustom: false,
  },
  {
    id: 'fd-calabacin',
    slug: 'calabacin-plancha',
    name: 'Calabacín salteado o en crema',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 17,
    proteinPer100g: 1.2,
    carbsPer100g: 3.1,
    fatPer100g: 0.3,
    fiberPer100g: 1.0,
    defaultPortionName: '1 calabacín mediano (220 g)',
    defaultPortionGrams: 220,
    tags: ['calabacín', 'verdura'],
    isCustom: false,
  },
  {
    id: 'fd-pimiento-asado',
    slug: 'pimiento-rojo-verde',
    name: 'Pimientos rojos y verdes asados o salteados',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 28,
    proteinPer100g: 1.0,
    carbsPer100g: 5.5,
    fatPer100g: 0.3,
    fiberPer100g: 1.8,
    defaultPortionName: '1 guarnición (180 g)',
    defaultPortionGrams: 180,
    tags: ['pimiento', 'verdura'],
    isCustom: false,
  },
  {
    id: 'fd-judias-verdes',
    slug: 'judias-verdes',
    name: 'Judías verdes cocidas al vapor',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 31,
    proteinPer100g: 1.8,
    carbsPer100g: 6.9,
    fatPer100g: 0.2,
    fiberPer100g: 3.2,
    defaultPortionName: '1 plato (200 g)',
    defaultPortionGrams: 200,
    tags: ['judías verdes', 'verdura'],
    isCustom: false,
  },
  {
    id: 'fd-champinones',
    slug: 'champinones-salteados',
    name: 'Champiñones o setas salteadas con ajo',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 24,
    proteinPer100g: 3.1,
    carbsPer100g: 3.3,
    fatPer100g: 0.4,
    fiberPer100g: 1.2,
    defaultPortionName: '1 bandeja media (180 g)',
    defaultPortionGrams: 180,
    tags: ['champiñones', 'setas'],
    isCustom: false,
  },
  {
    id: 'fd-zanahoria-lechuga',
    slug: 'mezclum-lechuga-zanahoria',
    name: 'Mezclum de brotes tiernos, lechuga y zanahoria',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 26,
    proteinPer100g: 1.3,
    carbsPer100g: 5.2,
    fatPer100g: 0.2,
    fiberPer100g: 2.1,
    defaultPortionName: '1 bol grande (150 g)',
    defaultPortionGrams: 150,
    tags: ['lechuga', 'zanahoria', 'ensalada'],
    isCustom: false,
  },
  {
    id: 'fd-platano',
    slug: 'platano-canarias',
    name: 'Plátano de Canarias',
    foodGroup: 'Frutas',
    dataSource: 'bedca_reference',
    kcalPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    defaultPortionName: '1 unidad mediana (110 g)',
    defaultPortionGrams: 110,
    tags: ['plátano', 'fruta'],
    isCustom: false,
  },
  {
    id: 'fd-manzana',
    slug: 'manzana-fresca',
    name: 'Manzana fresca con piel',
    foodGroup: 'Frutas',
    dataSource: 'bedca_reference',
    kcalPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
    defaultPortionName: '1 pieza (180 g)',
    defaultPortionGrams: 180,
    tags: ['manzana', 'fruta'],
    isCustom: false,
  },
  {
    id: 'fd-naranja',
    slug: 'naranja-mesa',
    name: 'Naranja o mandarinas enteras',
    foodGroup: 'Frutas',
    dataSource: 'bedca_reference',
    kcalPer100g: 47,
    proteinPer100g: 0.9,
    carbsPer100g: 11.8,
    fatPer100g: 0.1,
    fiberPer100g: 2.4,
    defaultPortionName: '1 naranja grande (190 g)',
    defaultPortionGrams: 190,
    tags: ['naranja', 'fruta'],
    isCustom: false,
  },
  {
    id: 'fd-aove',
    slug: 'aceite-oliva-virgen-extra',
    name: 'Aceite de oliva virgen extra (AOVE)',
    foodGroup: 'Grasas saludables',
    dataSource: 'bedca_reference',
    kcalPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
    fiberPer100g: 0,
    defaultPortionName: '1 cucharada sopera (10 g)',
    defaultPortionGrams: 10,
    tags: ['aceite', 'aove'],
    isCustom: false,
  },
  {
    id: 'fd-nueces',
    slug: 'nueces-naturales',
    name: 'Nueces o almendras al natural sin freír',
    foodGroup: 'Frutos secos',
    dataSource: 'bedca_reference',
    kcalPer100g: 620,
    proteinPer100g: 17.0,
    carbsPer100g: 11.0,
    fatPer100g: 58.0,
    fiberPer100g: 8.5,
    defaultPortionName: '1 puñado cerrado (25 g)',
    defaultPortionGrams: 25,
    tags: ['nueces', 'almendras'],
    isCustom: false,
  },

  // --- ALIMENTOS EXCLUIDOS INICIALMENTE EN EL PERFIL (editables si cambia gustos) ---
  {
    id: 'fd-espinacas',
    slug: 'espinacas-frescas',
    name: 'Espinacas frescas o salteadas',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 2.2,
    defaultPortionName: '1 ración (150 g)',
    defaultPortionGrams: 150,
    tags: ['espinacas'],
    isCustom: false,
  },
  {
    id: 'fd-queso-feta',
    slug: 'queso-feta',
    name: 'Queso feta',
    foodGroup: 'Lácteos',
    dataSource: 'bedca_reference',
    kcalPer100g: 264,
    proteinPer100g: 14.2,
    carbsPer100g: 4.1,
    fatPer100g: 21.3,
    fiberPer100g: 0,
    defaultPortionName: '1 porción (50 g)',
    defaultPortionGrams: 50,
    tags: ['queso feta', 'feta'],
    isCustom: false,
  },
  {
    id: 'fd-esparragos',
    slug: 'esparragos-trigueros',
    name: 'Espárragos trigueros o blancos',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 20,
    proteinPer100g: 2.2,
    carbsPer100g: 3.9,
    fatPer100g: 0.1,
    fiberPer100g: 2.1,
    defaultPortionName: '1 manojo (160 g)',
    defaultPortionGrams: 160,
    tags: ['espárragos', 'esparragos'],
    isCustom: false,
  },
  {
    id: 'fd-brocoli',
    slug: 'brocoli-vapor',
    name: 'Brócoli al vapor',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 34,
    proteinPer100g: 2.8,
    carbsPer100g: 6.6,
    fatPer100g: 0.4,
    fiberPer100g: 2.6,
    defaultPortionName: '1 plato (200 g)',
    defaultPortionGrams: 200,
    tags: ['brócoli', 'brocoli'],
    isCustom: false,
  },
  {
    id: 'fd-coliflor',
    slug: 'coliflor-cocida',
    name: 'Coliflor cocida o gratinada',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 25,
    proteinPer100g: 1.9,
    carbsPer100g: 5.0,
    fatPer100g: 0.3,
    fiberPer100g: 2.0,
    defaultPortionName: '1 plato (200 g)',
    defaultPortionGrams: 200,
    tags: ['coliflor'],
    isCustom: false,
  },
  {
    id: 'fd-pepino',
    slug: 'pepino-fresco',
    name: 'Pepino fresco',
    foodGroup: 'Verduras y hortalizas',
    dataSource: 'bedca_reference',
    kcalPer100g: 15,
    proteinPer100g: 0.7,
    carbsPer100g: 3.6,
    fatPer100g: 0.1,
    fiberPer100g: 0.5,
    defaultPortionName: '1 pepino mediano (150 g)',
    defaultPortionGrams: 150,
    tags: ['pepino'],
    isCustom: false,
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function isFoodExcluded(food: FoodItem, excludedFoods: string[]): boolean {
  if (!excludedFoods.length) return false;
  const haystacks = [food.name, food.slug, ...food.tags].map(normalizeText);
  return excludedFoods.some((rawExcluded) => {
    const term = normalizeText(rawExcluded);
    if (!term) return false;
    return haystacks.some((h) => h.includes(term));
  });
}

export function calculateFoodMacros(
  food: FoodItem,
  quantity: number,
  unit: 'g' | 'ml' | 'unidad' | 'racion'
): {
  gramsEquivalent: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
} {
  const gramsEquivalent =
    unit === 'g' || unit === 'ml'
      ? quantity
      : Math.round(quantity * food.defaultPortionGrams * 10) / 10;

  const factor = gramsEquivalent / 100;
  return {
    gramsEquivalent,
    kcal: Math.round(food.kcalPer100g * factor * 10) / 10,
    proteinG: Math.round(food.proteinPer100g * factor * 10) / 10,
    carbsG: Math.round(food.carbsPer100g * factor * 10) / 10,
    fatG: Math.round(food.fatPer100g * factor * 10) / 10,
    fiberG: Math.round(food.fiberPer100g * factor * 10) / 10,
  };
}

export function buildCustomRecipe(
  name: string,
  servings: number,
  rawIngredients: { food: FoodItem; grams: number }[],
  notes = ''
): CustomRecipe {
  const safeServings = Math.max(1, Math.round(servings));
  const ingredients: RecipeIngredient[] = rawIngredients.map(({ food, grams }) => {
    const macros = calculateFoodMacros(food, grams, 'g');
    return {
      foodSlug: food.slug,
      foodName: food.name,
      grams,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      fiberG: macros.fiberG,
    };
  });

  const totals = ingredients.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.proteinG,
      carbs: acc.carbs + item.carbsG,
      fat: acc.fat + item.fatG,
      fiber: acc.fiber + item.fiberG,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    id: generateId('recipe'),
    name: name.trim(),
    servings: safeServings,
    ingredients,
    kcalPerServing: Math.round((totals.kcal / safeServings) * 10) / 10,
    proteinPerServing: Math.round((totals.protein / safeServings) * 10) / 10,
    carbsPerServing: Math.round((totals.carbs / safeServings) * 10) / 10,
    fatPerServing: Math.round((totals.fat / safeServings) * 10) / 10,
    fiberPerServing: Math.round((totals.fiber / safeServings) * 10) / 10,
    notes,
    createdAt: new Date().toISOString(),
  };
}

export function summarizeDailyNutrition(logs: NutritionLogEntry[], dateIso: string) {
  const dayLogs = logs.filter((l) => l.loggedOn === dateIso);
  return dayLogs.reduce(
    (acc, item) => ({
      kcal: Math.round((acc.kcal + item.kcal) * 10) / 10,
      proteinG: Math.round((acc.proteinG + item.proteinG) * 10) / 10,
      carbsG: Math.round((acc.carbsG + item.carbsG) * 10) / 10,
      fatG: Math.round((acc.fatG + item.fatG) * 10) / 10,
      fiberG: Math.round((acc.fiberG + item.fiberG) * 10) / 10,
      entriesCount: acc.entriesCount + 1,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, entriesCount: 0 }
  );
}

export interface GeneratedMealOption {
  slot: MealSlot;
  slotLabel: string;
  title: string;
  items: { foodSlug: string; foodName: string; grams: number; kcal: number; proteinG: number }[];
  totalKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
}

interface MenuTemplateBlueprint {
  title: string;
  components: { slug: string; baseGrams: number }[];
}

const MENU_TEMPLATES: Record<MealSlot, MenuTemplateBlueprint[]> = {
  breakfast: [
    {
      title: 'Tostadas integrales con tomate natural, AOVE y jamón serrano + leche',
      components: [
        { slug: 'pan-integral-hogaza', baseGrams: 75 },
        { slug: 'tomate-natural', baseGrams: 120 },
        { slug: 'jamon-serrano', baseGrams: 55 },
        { slug: 'aceite-oliva-virgen-extra', baseGrams: 8 },
        { slug: 'leche-semidesnatada', baseGrams: 200 },
      ],
    },
    {
      title: 'Bol de queso fresco batido 0% con copos de avena, plátano y nueces',
      components: [
        { slug: 'queso-fresco-batido', baseGrams: 250 },
        { slug: 'copos-avena', baseGrams: 55 },
        { slug: 'platano-canarias', baseGrams: 110 },
        { slug: 'nueces-naturales', baseGrams: 20 },
      ],
    },
    {
      title: 'Revuelto de huevos camperos y claras con pan de hogaza y naranja',
      components: [
        { slug: 'huevos-camperos', baseGrams: 120 },
        { slug: 'claras-pasteurizadas', baseGrams: 120 },
        { slug: 'pan-integral-hogaza', baseGrams: 65 },
        { slug: 'naranja-mesa', baseGrams: 190 },
      ],
    },
  ],
  lunch: [
    {
      title: 'Pechuga de pollo a la plancha con patata asada, pimientos asados y AOVE',
      components: [
        { slug: 'pechuga-pollo', baseGrams: 210 },
        { slug: 'patata-cocida-asada', baseGrams: 270 },
        { slug: 'pimiento-rojo-verde', baseGrams: 180 },
        { slug: 'aceite-oliva-virgen-extra', baseGrams: 10 },
        { slug: 'manzana-fresca', baseGrams: 170 },
      ],
    },
    {
      title: 'Lentejas pardinas estofadas con verduras + lomo embuchado magro',
      components: [
        { slug: 'lentejas-cocidas', baseGrams: 280 },
        { slug: 'pimiento-rojo-verde', baseGrams: 120 },
        { slug: 'lomo-embuchado', baseGrams: 55 },
        { slug: 'aceite-oliva-virgen-extra', baseGrams: 8 },
        { slug: 'naranja-mesa', baseGrams: 180 },
      ],
    },
    {
      title: 'Ternera magra salteada con arroz basmati, champiñones y ensalada de brotes',
      components: [
        { slug: 'ternera-magra', baseGrams: 190 },
        { slug: 'arroz-cocido', baseGrams: 190 },
        { slug: 'champinones-salteados', baseGrams: 160 },
        { slug: 'mezclum-lechuga-zanahoria', baseGrams: 120 },
        { slug: 'aceite-oliva-virgen-extra', baseGrams: 10 },
      ],
    },
  ],
  dinner: [
    {
      title: 'Merluza al horno con judías verdes, patata cocida y chorrito de AOVE',
      components: [
        { slug: 'merluza-fresca', baseGrams: 230 },
        { slug: 'judias-verdes', baseGrams: 200 },
        { slug: 'patata-cocida-asada', baseGrams: 200 },
        { slug: 'aceite-oliva-virgen-extra', baseGrams: 10 },
      ],
    },
    {
      title: 'Salmón a la plancha con calabacín salteado y tomate aliñado',
      components: [
        { slug: 'salmon-fresco', baseGrams: 175 },
        { slug: 'calabacin-plancha', baseGrams: 220 },
        { slug: 'tomate-natural', baseGrams: 160 },
        { slug: 'aceite-oliva-virgen-extra', baseGrams: 6 },
      ],
    },
    {
      title: 'Tortilla francesa proteica con atún al natural, champiñones y pan integral',
      components: [
        { slug: 'huevos-camperos', baseGrams: 120 },
        { slug: 'atun-natural', baseGrams: 112 },
        { slug: 'champinones-salteados', baseGrams: 180 },
        { slug: 'pan-integral-hogaza', baseGrams: 50 },
        { slug: 'aceite-oliva-virgen-extra', baseGrams: 6 },
      ],
    },
  ],
  snack: [
    {
      title: 'Yogur griego natural con plátano y nueces (ideal pre/post fútbol)',
      components: [
        { slug: 'yogur-griego-natural', baseGrams: 125 },
        { slug: 'platano-canarias', baseGrams: 110 },
        { slug: 'nueces-naturales', baseGrams: 15 },
      ],
    },
    {
      title: 'Queso fresco batido 0% con manzana troceada y canela',
      components: [
        { slug: 'queso-fresco-batido', baseGrams: 220 },
        { slug: 'manzana-fresca', baseGrams: 180 },
      ],
    },
    {
      title: 'Pulga integral de pavo con tomate natural rallado',
      components: [
        { slug: 'pan-integral-hogaza', baseGrams: 50 },
        { slug: 'solomillo-pavo', baseGrams: 70 },
        { slug: 'tomate-natural', baseGrams: 60 },
      ],
    },
  ],
};

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Tentempié / Merienda',
};

/**
 * Genera un menú diario intercambiable adaptado a las kcal objetivo y respetando
 * estrictamente la lista de alimentos excluidos del usuario.
 */
export function generateDailySpanishMenu(
  targetKcal: number,
  excludedFoods: string[],
  customFoods: FoodItem[] = [],
  variantIndices: Record<MealSlot, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
): GeneratedMealOption[] {
  const allFoods = [...SPANISH_SYSTEM_FOODS, ...customFoods];
  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Primero construir con factor base 1.0 filtrando cualquier ingrediente excluido
  const rawMeals = slots.map((slot) => {
    const candidates = MENU_TEMPLATES[slot];
    const safeCandidates = candidates.filter((tpl) =>
      tpl.components.every((comp) => {
        const f = allFoods.find((item) => item.slug === comp.slug);
        return f ? !isFoodExcluded(f, excludedFoods) : true;
      })
    );

    const activePool = safeCandidates.length > 0 ? safeCandidates : candidates;
    const chosen = activePool[Math.abs(variantIndices[slot] ?? 0) % activePool.length]!;

    const validComponents = chosen.components
      .map((comp) => {
        const food = allFoods.find((f) => f.slug === comp.slug);
        if (!food || isFoodExcluded(food, excludedFoods)) return null;
        return { food, grams: comp.baseGrams };
      })
      .filter((x): x is { food: FoodItem; grams: number } => x !== null);

    return { slot, title: chosen.title, validComponents };
  });

  const unscaledKcal = rawMeals.reduce((sum, meal) => {
    return (
      sum +
      meal.validComponents.reduce(
        (mSum, c) => mSum + calculateFoodMacros(c.food, c.grams, 'g').kcal,
        0
      )
    );
  }, 0);

  const scaleFactor =
    unscaledKcal > 0 ? Math.min(1.55, Math.max(0.7, targetKcal / unscaledKcal)) : 1;

  return rawMeals.map(({ slot, title, validComponents }) => {
    const items = validComponents.map(({ food, grams }) => {
      const scaledGrams = Math.max(5, Math.round((grams * scaleFactor) / 5) * 5);
      const macros = calculateFoodMacros(food, scaledGrams, 'g');
      return {
        foodSlug: food.slug,
        foodName: food.name,
        grams: scaledGrams,
        kcal: macros.kcal,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
      };
    });

    return {
      slot,
      slotLabel: SLOT_LABELS[slot],
      title,
      items: items.map(({ foodSlug, foodName, grams, kcal, proteinG }) => ({
        foodSlug,
        foodName,
        grams,
        kcal,
        proteinG,
      })),
      totalKcal: Math.round(items.reduce((s, i) => s + i.kcal, 0)),
      totalProteinG: Math.round(items.reduce((s, i) => s + i.proteinG, 0) * 10) / 10,
      totalCarbsG: Math.round(items.reduce((s, i) => s + i.carbsG, 0) * 10) / 10,
      totalFatG: Math.round(items.reduce((s, i) => s + i.fatG, 0) * 10) / 10,
    };
  });
}

/**
 * Exporta e importa registros nutricionales en CSV compatible con Excel/LibreOffice.
 */
export function exportNutritionLogsToCsv(logs: NutritionLogEntry[]): string {
  const header = 'fecha,toma,alimento,cantidad,unidad,gramos_eq,kcal,proteinas_g,carbohidratos_g,grasas_g,fibra_g,fuente';
  const rows = logs.map((l) => {
    const safeName = `"${l.entryName.replace(/"/g, '""')}"`;
    return [
      l.loggedOn,
      l.mealSlot,
      safeName,
      l.quantity,
      l.unit,
      l.gramsEquivalent,
      l.kcal,
      l.proteinG,
      l.carbsG,
      l.fatG,
      l.fiberG,
      l.dataSource,
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export function importNutritionLogsFromCsv(csvText: string): NutritionLogEntry[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const parsed: NutritionLogEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]!;
    // Soportar nombres entrecomillados simples o CSV estándar
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const ch = rawLine[c]!;
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());

    if (cols.length < 10) continue;
    const loggedOn = cols[0] ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(loggedOn)) continue;

    const rawSlot = cols[1] as MealSlot;
    const mealSlot: MealSlot = ['breakfast', 'lunch', 'dinner', 'snack'].includes(rawSlot)
      ? rawSlot
      : 'lunch';
    const entryName = cols[2] || 'Alimento importado';
    const quantity = Number(cols[3]) || 100;
    const rawUnit = cols[4] as 'g' | 'ml' | 'unidad' | 'racion';
    const unit = ['g', 'ml', 'unidad', 'racion'].includes(rawUnit) ? rawUnit : 'g';
    const gramsEquivalent = Number(cols[5]) || quantity;
    const kcal = Number(cols[6]) || 0;
    const proteinG = Number(cols[7]) || 0;
    const carbsG = Number(cols[8]) || 0;
    const fatG = Number(cols[9]) || 0;
    const fiberG = Number(cols[10]) || 0;

    parsed.push({
      id: generateId('nlog'),
      loggedOn,
      mealSlot,
      entryName,
      foodSlug: null,
      recipeId: null,
      dataSource: 'csv_import' as FoodDataSource,
      quantity,
      unit,
      gramsEquivalent,
      kcal,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      isHabitual: false,
      notes: 'Importado desde CSV',
      clientDedupKey: `csv:${loggedOn}:${mealSlot}:${entryName}:${kcal}:${i}`,
      createdAt: new Date().toISOString(),
    });
  }

  return parsed;
}
