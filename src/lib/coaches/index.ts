import type { CoachArchetype, CoachId } from './types';
import { FUERZA } from './fuerza';
import { HIPERTROFIA } from './hipertrofia';
import { DEFINICION } from './definicion';
import { SALUD } from './salud';

export const COACHES: Record<CoachId, CoachArchetype> = {
  fuerza: FUERZA,
  hipertrofia: HIPERTROFIA,
  definicion: DEFINICION,
  salud: SALUD,
};

/** Orden de presentación en el selector. */
export const COACHES_LISTA: CoachArchetype[] = [SALUD, HIPERTROFIA, DEFINICION, FUERZA];

export const COACH_IDS = Object.keys(COACHES) as CoachId[];

export function obtenerCoach(id: string): CoachArchetype | null {
  return COACHES[id as CoachId] ?? null;
}

export function esCoachId(valor: unknown): valor is CoachId {
  return typeof valor === 'string' && valor in COACHES;
}

export * from './types';
