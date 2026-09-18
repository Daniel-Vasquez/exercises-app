import type { Collection } from 'mongodb';
import { obtenerDb } from '@/lib/db/client';
import type { BodyPart } from '@/lib/i18n/body-parts.es';
import type { Equipment } from '@/lib/i18n/equipment.es';
import type { Patron } from '@/lib/engine/patterns';

/**
 * Acceso al catálogo local de ejercicios.
 *
 * Todas las consultas van contra NUESTRA MongoDB, nunca contra la API remota
 * (ADR-01). Los filtros usan siempre las claves canónicas en inglés; los
 * campos `_es` son solo presentación.
 */

export interface EjercicioDoc {
  id: string;
  name_en: string;
  name_es: string;
  body_part: string;
  body_part_es: string;
  target: string;
  target_es: string;
  equipment: string;
  equipment_es: string;
  muscle_group: string;
  muscle_group_es: string;
  secondary_muscles: string[];
  secondary_muscles_es: string[];
  instructions: string;
  instruction_steps: string[];
  media: { image_url: string; gif_url: string };
  patterns: Patron[];
  tags: string[];
}

function coleccion(): Collection<EjercicioDoc> {
  return obtenerDb().collection<EjercicioDoc>('exercises');
}

/** Proyección por defecto: evita traer instrucciones en los listados. */
const RESUMEN = {
  id: 1, name_es: 1, body_part_es: 1, target_es: 1, equipment_es: 1,
  equipment: 1, body_part: 1, target: 1, patterns: 1, media: 1, _id: 0,
} as const;

export interface FiltroPool {
  /** Zonas del cuerpo del foco del día. */
  bodyParts?: BodyPart[] | string[];
  /** Material del que dispone el usuario. */
  equipos?: Equipment[] | string[];
  /** Músculos objetivo a excluir por lesión. */
  targetsExcluidos?: string[];
  /** Patrones de movimiento a excluir por lesión. */
  patronesExcluidos?: Patron[] | string[];
  /** Ids ya usados en la rutina, para no repetir. */
  idsExcluidos?: string[];
  limite?: number;
}

/**
 * Consulta de pool: la que ejecuta el motor de rutinas decenas de veces por
 * generación. Se apoya en el índice { body_part, equipment }.
 */
export async function buscarPool(filtro: FiltroPool): Promise<EjercicioDoc[]> {
  const consulta: Record<string, unknown> = {};

  if (filtro.bodyParts?.length) consulta['body_part'] = { $in: filtro.bodyParts };
  if (filtro.equipos?.length) consulta['equipment'] = { $in: filtro.equipos };
  if (filtro.targetsExcluidos?.length) consulta['target'] = { $nin: filtro.targetsExcluidos };
  if (filtro.patronesExcluidos?.length) consulta['patterns'] = { $nin: filtro.patronesExcluidos };
  if (filtro.idsExcluidos?.length) consulta['id'] = { $nin: filtro.idsExcluidos };

  return coleccion()
    .find(consulta, { projection: RESUMEN })
    .limit(filtro.limite ?? 200)
    .toArray() as unknown as Promise<EjercicioDoc[]>;
}

export async function obtenerPorId(id: string): Promise<EjercicioDoc | null> {
  return coleccion().findOne({ id }, { projection: { _id: 0 } }) as unknown as Promise<EjercicioDoc | null>;
}

export async function obtenerVarios(ids: string[]): Promise<EjercicioDoc[]> {
  if (!ids.length) return [];
  const docs = (await coleccion()
    .find({ id: { $in: ids } }, { projection: { _id: 0 } })
    .toArray()) as unknown as EjercicioDoc[];

  // Se devuelve en el orden pedido: la rutina define el orden de los bloques
  // y $in no lo respeta.
  const porId = new Map(docs.map((d) => [d.id, d]));
  return ids.map((id) => porId.get(id)).filter((d): d is EjercicioDoc => d !== undefined);
}

/**
 * Búsqueda en español sobre el índice de texto.
 * El endpoint /search de la API remota no sirve: solo entiende inglés (§3.5).
 */
export async function buscarEnEspanol(termino: string, limite = 20): Promise<EjercicioDoc[]> {
  const texto = termino.trim();
  if (!texto) return [];

  return coleccion()
    .find({ $text: { $search: texto } }, { projection: { ...RESUMEN, score: { $meta: 'textScore' } } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limite)
    .toArray() as unknown as Promise<EjercicioDoc[]>;
}

export async function contarCatalogo(): Promise<number> {
  return coleccion().countDocuments();
}
