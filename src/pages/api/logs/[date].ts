import type { APIRoute } from 'astro';
import { exigirSesionApi, esRespuesta } from '@/lib/auth/guards';
import { esquemaRegistro, validarFecha } from '@/lib/validation/logs';
import { guardarRegistro, obtenerRegistro } from '@/lib/logs/repository';

export const prerender = false;

function json(cuerpo: unknown, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** GET /api/logs/2026-09-19?dayIndex=0 */
export const GET: APIRoute = async (contexto) => {
  const sesion = exigirSesionApi(contexto);
  if (esRespuesta(sesion)) return sesion;

  const date = contexto.params['date'] ?? '';
  if (!validarFecha(date)) return json({ error: 'Fecha no válida. Formato: YYYY-MM-DD.' }, 400);

  const dayIndex = Number(contexto.url.searchParams.get('dayIndex') ?? '0');
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    return json({ error: 'dayIndex no válido.' }, 400);
  }

  const registro = await obtenerRegistro(sesion.usuario.id, date, dayIndex);
  return json({ registro: registro ?? null }, 200);
};

/**
 * PUT /api/logs/2026-09-19
 *
 * Idempotente: reenviar el mismo cuerpo actualiza el registro en lugar de
 * crear otro. Lo garantiza el índice único {userId, date, dayIndex}, no
 * solo la lógica de la aplicación.
 */
export const PUT: APIRoute = async (contexto) => {
  const sesion = exigirSesionApi(contexto);
  if (esRespuesta(sesion)) return sesion;

  const date = contexto.params['date'] ?? '';
  if (!validarFecha(date)) return json({ error: 'Fecha no válida. Formato: YYYY-MM-DD.' }, 400);

  let bruto: unknown;
  try {
    bruto = await contexto.request.json();
  } catch {
    return json({ error: 'El cuerpo de la petición no es JSON válido.' }, 400);
  }

  const analisis = esquemaRegistro.safeParse(bruto);
  if (!analisis.success) {
    return json(
      {
        error: 'Datos de entrenamiento no válidos.',
        errores: analisis.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      },
      400,
    );
  }

  try {
    const registro = await guardarRegistro(sesion.usuario.id, {
      date,
      dayIndex: analisis.data.dayIndex,
      routineId: analisis.data.routineId ?? null,
      entries: analisis.data.entries,
    });

    return json(
      { ok: true, totals: registro.totals, status: registro.status, updatedAt: registro.updatedAt },
      200,
    );
  } catch (error) {
    console.error('[logs] Fallo al guardar el registro:', error);
    return json({ error: 'No se pudo guardar tu entrenamiento.' }, 500);
  }
};
