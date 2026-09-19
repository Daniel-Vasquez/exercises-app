import { ObjectId, type Collection } from 'mongodb';
import { obtenerDb } from '@/lib/db/client';
import { aObjectId } from '@/lib/profiles/repository';
import type { Rutina } from '@/lib/engine/generate';
import type { Cuestionario } from '@/lib/coaches/types';

/**
 * Rutinas generadas (§4.4).
 *
 * Como máximo UNA activa por usuario: generar una nueva archiva la anterior
 * en lugar de borrarla, para no perder el histórico al que se enlazan los
 * registros de entrenamiento.
 *
 * Los bloques guardan `exerciseId`, no el ejercicio embebido: una sola
 * fuente de verdad, y re-traducir el catálogo mejora automáticamente todas
 * las rutinas ya existentes.
 */

export interface RutinaDoc extends Omit<Rutina, 'generadaEn'> {
  _id?: ObjectId;
  userId: ObjectId;
  status: 'active' | 'archived';
  /** Copia del cuestionario en el momento de generar, para poder auditar. */
  inputsSnapshot: Cuestionario;
  generatedAt: Date;
  archivedAt: Date | null;
}

function coleccion(): Collection<RutinaDoc> {
  return obtenerDb().collection<RutinaDoc>('routines');
}

export async function obtenerRutinaActiva(userId: string): Promise<RutinaDoc | null> {
  const id = aObjectId(userId);
  if (!id) return null;
  return coleccion().findOne({ userId: id, status: 'active' });
}

export async function contarRutinas(userId: string): Promise<number> {
  const id = aObjectId(userId);
  if (!id) return 0;
  return coleccion().countDocuments({ userId: id });
}

/** Guarda la rutina como activa y archiva cualquier anterior del usuario. */
export async function guardarComoActiva(
  userId: string,
  rutina: Rutina,
  cuestionario: Cuestionario,
): Promise<RutinaDoc> {
  const id = aObjectId(userId);
  if (!id) throw new Error('Identificador de usuario no válido.');

  const ahora = new Date();
  const col = coleccion();

  // Se archiva ANTES de insertar: si el orden fuese el inverso y la segunda
  // operación fallase, el usuario quedaría con dos rutinas activas.
  await col.updateMany(
    { userId: id, status: 'active' },
    { $set: { status: 'archived', archivedAt: ahora } },
  );

  const { generadaEn, ...resto } = rutina;
  const doc: RutinaDoc = {
    ...resto,
    userId: id,
    status: 'active',
    inputsSnapshot: cuestionario,
    generatedAt: generadaEn,
    archivedAt: null,
  };

  const resultado = await col.insertOne(doc);
  return { ...doc, _id: resultado.insertedId };
}

/** Siguiente número de versión, para que "regenerar" dé un resultado distinto. */
export async function siguienteVersion(userId: string): Promise<number> {
  const id = aObjectId(userId);
  if (!id) return 1;
  const ultima = await coleccion()
    .find({ userId: id })
    .sort({ version: -1 })
    .limit(1)
    .toArray();
  return (ultima[0]?.version ?? 0) + 1;
}
