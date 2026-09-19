import { ROUTINE_SEED_SALT } from 'astro:env/server';
import { generarRutina } from '@/lib/engine/generate';
import { obtenerCoach } from '@/lib/coaches';
import { obtenerPerfil } from '@/lib/profiles/repository';
import { guardarComoActiva, siguienteVersion, type RutinaDoc } from './repository';
import { obtenerDb } from '@/lib/db/client';
import type { EjercicioDoc } from '@/lib/exercises/repository';

/**
 * Une el motor puro con la base de datos.
 *
 * El motor no consulta nada (ADR-05): aquí se carga el catálogo y se le
 * entrega ya en memoria. Traer el catálogo de una vez, en lugar de hacer una
 * consulta por ranura, evita decenas de idas y vueltas a Mongo por
 * generación, que era justo el motivo del ADR-01.
 */

/** Campos mínimos que el motor necesita. Nada de instrucciones ni blobs. */
const PROYECCION_MOTOR = {
  _id: 0,
  id: 1,
  name_es: 1,
  name_en: 1,
  body_part: 1,
  target: 1,
  equipment: 1,
  patterns: 1,
} as const;

export async function generarYGuardar(userId: string): Promise<
  { ok: true; rutina: RutinaDoc } | { ok: false; error: string }
> {
  const perfil = await obtenerPerfil(userId);
  if (!perfil) return { ok: false, error: 'Todavía no has completado el cuestionario.' };

  const coach = obtenerCoach(perfil.coachId);
  if (!coach) return { ok: false, error: 'El entrenador de tu perfil ya no existe.' };

  const catalogo = (await obtenerDb()
    .collection('exercises')
    .find({}, { projection: PROYECCION_MOTOR })
    .toArray()) as unknown as EjercicioDoc[];

  if (!catalogo.length) {
    return {
      ok: false,
      error: 'El catálogo de ejercicios está vacío. Ejecuta `npm run sync:exercises`.',
    };
  }

  const version = await siguienteVersion(userId);

  const rutina = generarRutina({
    userId,
    coach,
    cuestionario: perfil.questionnaire,
    catalogo,
    salt: ROUTINE_SEED_SALT,
    version,
  });

  const guardada = await guardarComoActiva(userId, rutina, perfil.questionnaire);
  return { ok: true, rutina: guardada };
}
