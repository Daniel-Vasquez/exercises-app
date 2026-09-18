/**
 * Músculos — diccionario ÚNICO y compartido por `target`, `muscle_group` y
 * `secondary_muscles`.
 *
 * La API expone dos listas (`GET /targets`, 19 valores, y `GET /muscles`, 29)
 * que se solapan en 9 términos (biceps, calves, forearms, glutes, hamstrings,
 * lats, traps, triceps, upper back). Mantener dos diccionarios separados
 * garantizaría que tarde o temprano divergieran y que el mismo músculo
 * apareciese con dos nombres distintos en la misma pantalla.
 *
 * Unión: 39 términos. Cobertura 100% por construcción.
 */
export const MUSCLES_ES = {
  'abdominals': 'Abdominales',
  'abductors': 'Abductores',
  'abs': 'Abdominales',
  'adductors': 'Aductores',
  'ankle stabilizers': 'Estabilizadores del tobillo',
  'ankles': 'Tobillos',
  'biceps': 'Bíceps',
  'calves': 'Gemelos',
  'cardiovascular system': 'Sistema cardiovascular',
  'chest': 'Pecho',
  'core': 'Core',
  'deltoids': 'Deltoides',
  'delts': 'Deltoides',
  'forearms': 'Antebrazos',
  'glutes': 'Glúteos',
  'hamstrings': 'Isquiotibiales',
  'hands': 'Manos',
  'hip flexors': 'Flexores de cadera',
  'latissimus dorsi': 'Dorsal ancho',
  'lats': 'Dorsales',
  'levator scapulae': 'Elevador de la escápula',
  'lower back': 'Zona lumbar',
  'obliques': 'Oblicuos',
  'pectorals': 'Pectorales',
  'quadriceps': 'Cuádriceps',
  'quads': 'Cuádriceps',
  'rhomboids': 'Romboides',
  'rotator cuff': 'Manguito rotador',
  'serratus anterior': 'Serrato anterior',
  'shoulders': 'Hombros',
  'soleus': 'Sóleo',
  'spine': 'Columna',
  'traps': 'Trapecios',
  'trapezius': 'Trapecio',
  'triceps': 'Tríceps',
  'upper back': 'Espalda alta',
  'wrist extensors': 'Extensores de muñeca',
  'wrist flexors': 'Flexores de muñeca',
  'wrists': 'Muñecas',
} as const satisfies Record<string, string>;

export type Musculo = keyof typeof MUSCLES_ES;

export const MUSCULOS = Object.keys(MUSCLES_ES) as Musculo[];

export function traducirMusculo(valor: string): string {
  return MUSCLES_ES[valor as Musculo] ?? valor;
}

export function traducirMusculos(valores: readonly string[]): string[] {
  return valores.map(traducirMusculo);
}
