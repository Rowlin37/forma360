import { EquipmentCategory, EquipmentItem } from '@/lib/types';

/**
 * Inventario inicial de equipamiento de Forma360.
 * Incluye exactamente el material disponible actualmente en casa (activo) y
 * el equipamiento futuro previsto en la especificación (inactivo hasta activarlo),
 * sin presuponer kilos exactos hasta que el usuario los indique o confirme.
 */
export function createInitialEquipmentCatalog(): EquipmentItem[] {
  return [
    // --- MATERIAL INICIALMENTE DISPONIBLE EN CASA (10 elementos) ---
    {
      slug: 'bodyweight_space',
      name: 'Peso corporal, suelo y espacio doméstico',
      category: 'bodyweight',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Esterilla, pared y espacio libre en casa',
    },
    {
      slug: 'stationary_bike',
      name: 'Bicicleta estática',
      category: 'cardio',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Resistencia regulable para cardio sin impacto',
    },
    {
      slug: 'jump_rope',
      name: 'Cuerda para saltar',
      category: 'cardio',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Usar solo si hay buena tolerancia tendinosa/articular',
    },
    {
      slug: 'bench_press_bench',
      name: 'Banco de press de banca',
      category: 'benches',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Banco plano estable para empujes y apoyos',
    },
    {
      slug: 'weight_plates',
      name: 'Pesas y discos',
      category: 'free_weights',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Pendiente de detallar discos exactos disponibles',
    },
    {
      slug: 'dumbbells',
      name: 'Mancuernas',
      category: 'free_weights',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Mancuernas domésticas (introduce tus pesos disponibles)',
    },
    {
      slug: 'straight_bar',
      name: 'Barra recta',
      category: 'free_weights',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Barra recta doméstica (indica peso de la barra en kg)',
    },
    {
      slug: 'ez_bar',
      name: 'Barra EZ o barra en zigzag',
      category: 'free_weights',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Ergonómica para codos y muñecas',
    },
    {
      slug: 'ab_wheel',
      name: 'Rueda abdominal',
      category: 'core',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Introducir progresivamente tras dominar plancha y dead bug',
    },
    {
      slug: 'ab_bench',
      name: 'Banco de abdominales',
      category: 'core',
      isAvailable: true,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Útil para inclinación controlada y apoyo',
    },

    // --- EQUIPAMIENTO FUTURO PREVISTO (INICIALMENTE DESACTIVADO) ---
    {
      slug: 'resistance_bands',
      name: 'Bandas elásticas',
      category: 'accessories',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Tensión progresiva, face pulls, press Pallof y asistencia',
    },
    {
      slug: 'kettlebells',
      name: 'Kettlebells (pesas rusas)',
      category: 'free_weights',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Swings, sentadilla goblet y transporte cargado',
    },
    {
      slug: 'pullup_bar',
      name: 'Barra de dominadas',
      category: 'accessories',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Desbloquea tracción vertical real (dominadas y colgados)',
    },
    {
      slug: 'adjustable_bench',
      name: 'Banco ajustable (inclinado/declinado)',
      category: 'benches',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Permite press inclinado, remo pecho apoyado y hombro sentado',
    },
    {
      slug: 'cable_pulley',
      name: 'Poleas',
      category: 'machines',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Jalones al pecho, remo en polea y rotaciones controladas',
    },
    {
      slug: 'gym_machines',
      name: 'Máquinas de gimnasio',
      category: 'machines',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Prensa de piernas, curl femoral, multipower y máquinas guiadas',
    },
    {
      slug: 'treadmill',
      name: 'Cinta de correr',
      category: 'cardio',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Caminata en pendiente e intervalos controlados con lluvia/frío',
    },
    {
      slug: 'outdoor_bike',
      name: 'Bicicleta de exterior',
      category: 'cardio',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Salidas aeróbicas de fondo sin impacto de carrera',
    },
    {
      slug: 'rowing_machine',
      name: 'Máquina de remo (ergómetro)',
      category: 'cardio',
      isAvailable: false,
      isCustom: false,
      availableWeightsKg: [],
      weightsDescription: 'Cardio completo de bajo impacto tren superior + inferior',
    },
  ];
}

export function getActiveEquipmentSet(equipment: EquipmentItem[]): Set<string> {
  const active = new Set<string>(['bodyweight_space']);
  for (const item of equipment) {
    if (item.isAvailable) {
      active.add(item.slug);
    }
  }
  return active;
}

export function isExerciseCompatibleWithEquipment(
  requiredEquipment: string[],
  activeSlugs: Set<string>
): boolean {
  if (!requiredEquipment.length) return true;
  return requiredEquipment.every((req) => activeSlugs.has(req));
}

export function createCustomEquipmentItem(
  name: string,
  category: EquipmentCategory,
  weightsDescription = ''
): EquipmentItem {
  const cleanSlug =
    'custom_' +
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

  return {
    slug: `${cleanSlug}_${Date.now().toString(36).slice(-4)}`,
    name: name.trim(),
    category,
    isAvailable: true,
    isCustom: true,
    availableWeightsKg: [],
    weightsDescription,
  };
}
