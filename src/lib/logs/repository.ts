import { ObjectId, type Collection } from 'mongodb';
import { obtenerDb } from '@/lib/db/client';
import { aObjectId } from '@/lib/profiles/repository';
import { calcularTotales, estaCompleto, type EntradaRegistrada, type Totales } from '@/lib/progress/metrics';

/**
 * Registros diarios de entrenamiento (§4.5).
 *
 * `date` es un STRING «YYYY-MM-DD» en hora LOCAL del usuario, no un Date.
 * Guardarlo como Date lo convertiría a UTC y desplazaría los entrenamientos
 * nocturnos al día siguiente en el calendario.
 *
 * `totals` va desnormalizado a propósito: el calendario y la pantalla de
 * progreso leen agregados de semanas o meses enteros, y recalcular sumando
 * series en cada carga sería caro sin ninguna ventaja.
 */

export type EstadoRegistro = 'in_progress' | 'completed' | 'skipped';

export interface RegistroDoc {
  _id?: ObjectId;
  userId: ObjectId;
  routineId: ObjectId | null;
  date: string;
  dayIndex: number;
  status: EstadoRegistro;
  entries: EntradaRegistrada[];
  totals: Totales;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

function coleccion(): Collection<RegistroDoc> {
  return obtenerDb().collection<RegistroDoc>('workout_logs');
}

export async function obtenerRegistro(
  userId: string,
  date: string,
  dayIndex: number,
): Promise<RegistroDoc | null> {
  const id = aObjectId(userId);
  if (!id) return null;
  return coleccion().findOne({ userId: id, date, dayIndex });
}

export async function registrosEntreFechas(
  userId: string,
  desde: string,
  hasta: string,
): Promise<RegistroDoc[]> {
  const id = aObjectId(userId);
  if (!id) return [];
  return coleccion()
    .find({ userId: id, date: { $gte: desde, $lte: hasta } })
    .sort({ date: -1 })
    .toArray();
}

/**
 * Guarda el registro del día. IDEMPOTENTE: reenviar el mismo PUT actualiza,
 * nunca duplica. Lo garantiza el índice único {userId, date, dayIndex}.
 */
export async function guardarRegistro(
  userId: string,
  datos: {
    date: string;
    dayIndex: number;
    routineId: string | null;
    entries: EntradaRegistrada[];
  },
): Promise<RegistroDoc> {
  const id = aObjectId(userId);
  if (!id) throw new Error('Identificador de usuario no válido.');

  const totals = calcularTotales(datos.entries);
  const completo = estaCompleto(totals);
  const ahora = new Date();

  await coleccion().updateOne(
    { userId: id, date: datos.date, dayIndex: datos.dayIndex },
    {
      $set: {
        entries: datos.entries,
        totals,
        status: completo ? 'completed' : 'in_progress',
        completedAt: completo ? ahora : null,
        updatedAt: ahora,
        routineId: datos.routineId ? new ObjectId(datos.routineId) : null,
      },
      $setOnInsert: { userId: id, date: datos.date, dayIndex: datos.dayIndex, startedAt: ahora },
    },
    { upsert: true },
  );

  const guardado = await coleccion().findOne({ userId: id, date: datos.date, dayIndex: datos.dayIndex });
  if (!guardado) throw new Error('No se pudo guardar el registro.');
  return guardado;
}

/**
 * Últimos valores registrados de cada ejercicio, para autorrellenar.
 *
 * Es lo que más tiempo ahorra al usuario real: entrenando, con las manos
 * ocupadas, nadie quiere teclear el mismo peso otra vez.
 */
export async function ultimosValores(
  userId: string,
  exerciseIds: readonly string[],
): Promise<Record<string, { reps: number | null; weightKg: number | null }>> {
  const id = aObjectId(userId);
  if (!id || !exerciseIds.length) return {};

  const registros = await coleccion()
    .find({ userId: id, 'entries.exerciseId': { $in: [...exerciseIds] } })
    .sort({ date: -1 })
    .limit(40)
    .toArray();

  const resultado: Record<string, { reps: number | null; weightKg: number | null }> = {};

  // Los registros vienen de más reciente a más antiguo: la primera
  // coincidencia de cada ejercicio es la buena.
  for (const registro of registros) {
    for (const entrada of registro.entries) {
      if (resultado[entrada.exerciseId]) continue;
      const hechas = entrada.sets.filter((s) => s.done && (s.reps || s.weightKg));
      const ultima = hechas[hechas.length - 1];
      if (ultima) {
        resultado[entrada.exerciseId] = { reps: ultima.reps, weightKg: ultima.weightKg };
      }
    }
  }

  return resultado;
}
