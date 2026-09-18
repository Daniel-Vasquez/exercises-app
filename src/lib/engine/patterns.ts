/**
 * Derivación de patrones de movimiento.
 *
 * La API no expone esta información, pero el motor de rutinas la necesita
 * para excluir ejercicios según las lesiones del usuario (§6.6): "evitar
 * hombro" no es "excluir el target delts", porque un press militar carga el
 * hombro aunque su target sea otro.
 *
 * Se derivan UNA VEZ en la ingesta y se guardan en el documento, en lugar de
 * recalcularlos en cada generación de rutina (coherente con el ADR-01).
 */

export const PATRONES = [
  'overhead_press',
  'wide_grip_push',
  'horizontal_push',
  'deep_squat',
  'lunge',
  'jump',
  'hip_hinge_loaded',
  'bent_over_row',
  'vertical_pull',
  'skullcrusher',
  'dip',
  'neck_bridge',
  'shrug_heavy',
  'front_rack',
  'straight_bar_curl',
  'core_flexion',
  'rotation',
  'isometric',
  'cardio_impact',
] as const;

export type Patron = (typeof PATRONES)[number];

interface Regla {
  patron: Patron;
  /** Se evalúa sobre el nombre en inglés en minúsculas. */
  nombre?: RegExp;
  targets?: string[];
  equipos?: string[];
  bodyParts?: string[];
  /** Todas las condiciones presentes deben cumplirse. */
}

const REGLAS: Regla[] = [
  { patron: 'overhead_press', nombre: /\b(overhead|military|shoulder|arnold|push press|jerk)\b.*\bpress\b|\bpress\b.*\boverhead\b/ },
  { patron: 'overhead_press', nombre: /\b(snatch|clean and jerk)\b/ },
  { patron: 'wide_grip_push', nombre: /\bwide[- ]grip\b/, targets: ['pectorals', 'delts'] },
  { patron: 'horizontal_push', nombre: /\b(bench press|chest press|push[- ]?up|fly|flye)\b/ },
  { patron: 'deep_squat', nombre: /\b(squat|sissy|pistol|hack)\b/ },
  { patron: 'lunge', nombre: /\b(lunge|split squat|step[- ]?up|curtsey)\b/ },
  { patron: 'jump', nombre: /\b(jump|jumping|plyo|hop|box jump|burpee|skater)\b/ },
  { patron: 'hip_hinge_loaded', nombre: /\b(deadlift|good morning|hip thrust|romanian|swing|clean)\b/ },
  { patron: 'bent_over_row', nombre: /\b(bent[- ]?over|pendlay)\b.*\brow\b/ },
  { patron: 'bent_over_row', nombre: /\brow\b/, equipos: ['barbell', 'olympic barbell', 'ez barbell', 't-bar'] },
  { patron: 'vertical_pull', nombre: /\b(pull[- ]?up|chin[- ]?up|pulldown|pull[- ]?down|lat pull)\b/ },
  { patron: 'skullcrusher', nombre: /\b(skull ?crusher|french press|lying triceps extension)\b/ },
  { patron: 'dip', nombre: /\bdip\b/ },
  { patron: 'neck_bridge', nombre: /\b(neck|bridge)\b/, bodyParts: ['neck'] },
  { patron: 'shrug_heavy', nombre: /\bshrug\b/ },
  { patron: 'front_rack', nombre: /\b(front squat|front rack|clean|thruster|zercher)\b/ },
  { patron: 'straight_bar_curl', nombre: /\bcurl\b/, equipos: ['barbell', 'olympic barbell'] },
  { patron: 'core_flexion', nombre: /\b(crunch|sit[- ]?up|jackknife|v[- ]?up|leg raise)\b/ },
  { patron: 'rotation', nombre: /\b(twist|rotation|rotational|russian|windmill|wood ?chop)\b/ },
  { patron: 'isometric', nombre: /\b(plank|hold|isometric|wall sit|hang)\b/ },
  { patron: 'cardio_impact', nombre: /\b(run|sprint|jump rope|jumping jack|mountain climber)\b/ },
];

export interface EntradaPatron {
  name: string;
  target: string;
  equipment: string;
  body_part: string;
}

/** Devuelve todos los patrones que encajan con un ejercicio. */
export function derivarPatrones(ejercicio: EntradaPatron): Patron[] {
  const nombre = ejercicio.name.toLowerCase();
  const encontrados = new Set<Patron>();

  for (const regla of REGLAS) {
    if (regla.nombre && !regla.nombre.test(nombre)) continue;
    if (regla.targets && !regla.targets.includes(ejercicio.target)) continue;
    if (regla.equipos && !regla.equipos.includes(ejercicio.equipment)) continue;
    if (regla.bodyParts && !regla.bodyParts.includes(ejercicio.body_part)) continue;
    encontrados.add(regla.patron);
  }

  return [...encontrados];
}

/**
 * Zonas del cuerpo que el usuario puede pedir evitar, y qué excluyen.
 * Lo consume el motor en la Tanda 4 (§6.6 de planificacion.md).
 */
export const EXCLUSIONES_POR_ZONA = {
  hombro: { targets: ['delts'], patrones: ['overhead_press', 'wide_grip_push', 'dip'] },
  rodilla: { targets: [], patrones: ['deep_squat', 'jump', 'lunge'] },
  lumbar: { targets: ['spine'], patrones: ['hip_hinge_loaded', 'bent_over_row'] },
  codo: { targets: [], patrones: ['skullcrusher', 'dip', 'straight_bar_curl'] },
  cuello: { targets: ['levator scapulae', 'traps'], patrones: ['neck_bridge', 'shrug_heavy'] },
  muñeca: { targets: ['forearms'], patrones: ['front_rack', 'straight_bar_curl'] },
  cadera: { targets: ['abductors', 'adductors'], patrones: ['deep_squat', 'jump', 'hip_hinge_loaded'] },
} as const satisfies Record<string, { targets: string[]; patrones: Patron[] }>;

export type ZonaLesion = keyof typeof EXCLUSIONES_POR_ZONA;

export const ZONAS_LESION = Object.keys(EXCLUSIONES_POR_ZONA) as ZonaLesion[];
