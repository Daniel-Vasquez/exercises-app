/**
 * Partes del cuerpo (`body_part`) — conjunto cerrado de 10 valores,
 * enumerado desde `GET /body-parts`. Cobertura 100% por construcción.
 *
 * La clave en inglés es la CANÓNICA: es la que usan los filtros del motor de
 * rutinas. El español es solo presentación (§3.6 de planificacion.md).
 */
export const BODY_PARTS_ES = {
  'back': 'Espalda',
  'cardio': 'Cardio',
  'chest': 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  'neck': 'Cuello',
  'shoulders': 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  'waist': 'Core y abdomen',
} as const satisfies Record<string, string>;

/** Tipo derivado del diccionario: un `body_part` inexistente no compila. */
export type BodyPart = keyof typeof BODY_PARTS_ES;

export const BODY_PARTS = Object.keys(BODY_PARTS_ES) as BodyPart[];

export function traducirBodyPart(valor: string): string {
  return BODY_PARTS_ES[valor as BodyPart] ?? valor;
}
