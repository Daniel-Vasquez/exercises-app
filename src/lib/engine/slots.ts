import type { SlotType } from '@/lib/coaches/types';
import type { Patron } from './patterns';

/**
 * Qué busca cada ranura (§6.2).
 *
 * Una ranura es un ROL dentro de la sesión, no un grupo muscular. Esto es lo
 * que hace que un día generado se lea como escrito por un entrenador —lo
 * pesado y compuesto primero, los aislados al final— sea cual sea el
 * ejercicio concreto que salga elegido.
 */

/** Patrones que implican varias articulaciones. */
export const PATRONES_COMPUESTOS: Patron[] = [
  'deep_squat',
  'hip_hinge_loaded',
  'horizontal_push',
  'overhead_press',
  'vertical_pull',
  'bent_over_row',
  'lunge',
  'dip',
  'front_rack',
];

export interface DefinicionSlot {
  /** Patrones que descalifican al ejercicio para esta ranura. */
  patronesProhibidos?: Patron[];
  /** Cómo se mide el trabajo: repeticiones o segundos. */
  medida: 'reps' | 'tiempo';
  /** Músculos objetivo típicos de esta ranura. */
  targets: string[];
  /** Partes del cuerpo aceptables, si la ranura las acota. */
  bodyParts?: string[];
  /** Debe tener al menos uno de estos patrones. */
  patronesRequeridos?: Patron[];
  /** Penaliza si es compuesto (para ranuras de aislamiento). */
  prefiereCompuesto: boolean;
  /** Etiqueta legible para la UI. */
  etiqueta: string;
}

const EMPUJE = ['pectorals', 'delts', 'triceps', 'serratus anterior'];
const TRACCION = ['lats', 'upper back', 'biceps', 'traps', 'forearms', 'levator scapulae'];
const PIERNA = ['quads', 'hamstrings', 'glutes', 'calves', 'abductors', 'adductors'];
const CORE = ['abs', 'spine'];

export const DEFINICIONES: Record<SlotType, DefinicionSlot> = {
  compuesto_principal: {
    targets: [...EMPUJE, ...TRACCION, ...PIERNA],
    patronesRequeridos: PATRONES_COMPUESTOS,
    prefiereCompuesto: true,
    patronesProhibidos: ['stretch'],
    medida: 'reps',
    etiqueta: 'Compuesto principal',
  },
  compuesto_secundario: {
    targets: [...EMPUJE, ...TRACCION, ...PIERNA],
    patronesRequeridos: PATRONES_COMPUESTOS,
    prefiereCompuesto: true,
    patronesProhibidos: ['stretch'],
    medida: 'reps',
    etiqueta: 'Compuesto secundario',
  },
  accesorio_empuje: {
    targets: EMPUJE,
    prefiereCompuesto: false,
    patronesProhibidos: ['stretch'],
    medida: 'reps',
    etiqueta: 'Accesorio de empuje',
  },
  accesorio_traccion: {
    targets: TRACCION,
    prefiereCompuesto: false,
    patronesProhibidos: ['stretch'],
    medida: 'reps',
    etiqueta: 'Accesorio de tracción',
  },
  accesorio_pierna: {
    targets: PIERNA,
    prefiereCompuesto: false,
    patronesProhibidos: ['stretch'],
    medida: 'reps',
    etiqueta: 'Accesorio de pierna',
  },
  aislado: {
    targets: [...EMPUJE, ...TRACCION, ...PIERNA],
    prefiereCompuesto: false,
    patronesProhibidos: ['stretch'],
    medida: 'reps',
    etiqueta: 'Aislamiento',
  },
  core: {
    targets: CORE,
    bodyParts: ['waist'],
    prefiereCompuesto: false,
    patronesProhibidos: ['stretch'],
    medida: 'reps',
    etiqueta: 'Core',
  },
  cardio_finisher: {
    targets: ['cardiovascular system'],
    bodyParts: ['cardio'],
    prefiereCompuesto: false,
    patronesProhibidos: ['stretch'],
    medida: 'tiempo',
    etiqueta: 'Final metabólico',
  },
  movilidad: {
    targets: [],
    // Al revés que las demás: aquí un estiramiento es exactamente lo que toca.
    patronesRequeridos: ['stretch'],
    prefiereCompuesto: false,
    medida: 'tiempo',
    etiqueta: 'Movilidad',
  },
};

/** ¿El ejercicio es compuesto, según sus patrones derivados? */
export function esCompuesto(patrones: readonly string[]): boolean {
  return patrones.some((p) => PATRONES_COMPUESTOS.includes(p as Patron));
}

/**
 * Recorta la lista de ranuras al tiempo disponible.
 *
 * Se respeta siempre el mínimo del coach: es preferible una sesión corta
 * bien estructurada que una lista de ejercicios sin principio compuesto.
 */
export function recortarPorTiempo(
  slots: readonly SlotType[],
  minutosDisponibles: number,
  minutosPorEjercicio: number,
  minimoEjercicios: number,
): SlotType[] {
  const caben = Math.floor(minutosDisponibles / minutosPorEjercicio);
  const objetivo = Math.max(minimoEjercicios, Math.min(slots.length, caben));
  return slots.slice(0, objetivo);
}
