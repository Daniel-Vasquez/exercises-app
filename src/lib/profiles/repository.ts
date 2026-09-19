import { ObjectId, type Collection } from 'mongodb';
import { obtenerDb } from '@/lib/db/client';
import type { CoachId, Cuestionario } from '@/lib/coaches/types';

/**
 * Perfil del usuario: coach elegido + respuestas del cuestionario.
 * Uno por usuario (§4.3 de planificacion.md).
 *
 * ⚠️ `userId` se guarda como ObjectId, NO como string. Better Auth almacena
 * así los identificadores en `user`, `session` y `account` (hallazgo de la
 * Tanda 1). Si aquí se guardase como string, todo filtro y todo $lookup
 * contra las colecciones de autenticación devolvería cero resultados sin
 * lanzar ningún error: un fallo silencioso.
 */

export interface PerfilDoc {
  _id?: ObjectId;
  userId: ObjectId;
  coachId: CoachId;
  questionnaire: Cuestionario;
  completedAt: Date;
  updatedAt: Date;
}

function coleccion(): Collection<PerfilDoc> {
  return obtenerDb().collection<PerfilDoc>('profiles');
}

/** Convierte el id de sesión (string) al ObjectId con el que se consulta. */
export function aObjectId(userId: string): ObjectId | null {
  return ObjectId.isValid(userId) ? new ObjectId(userId) : null;
}

export async function obtenerPerfil(userId: string): Promise<PerfilDoc | null> {
  const id = aObjectId(userId);
  if (!id) return null;
  return coleccion().findOne({ userId: id });
}

export async function tienePerfil(userId: string): Promise<boolean> {
  const id = aObjectId(userId);
  if (!id) return false;
  return (await coleccion().countDocuments({ userId: id }, { limit: 1 })) > 0;
}

export async function guardarPerfil(
  userId: string,
  coachId: CoachId,
  questionnaire: Cuestionario,
): Promise<PerfilDoc> {
  const id = aObjectId(userId);
  if (!id) throw new Error('Identificador de usuario no válido.');

  const ahora = new Date();

  // upsert: rehacer el onboarding actualiza el perfil, no crea uno nuevo.
  // El índice único sobre userId lo garantiza también a nivel de base de datos.
  await coleccion().updateOne(
    { userId: id },
    {
      $set: { coachId, questionnaire, updatedAt: ahora },
      $setOnInsert: { userId: id, completedAt: ahora },
    },
    { upsert: true },
  );

  const perfil = await coleccion().findOne({ userId: id });
  if (!perfil) throw new Error('No se pudo guardar el perfil.');
  return perfil;
}
