import type { APIRoute } from 'astro';
import { exigirSesionApi, esRespuesta } from '@/lib/auth/guards';
import { obtenerRutinaActiva } from '@/lib/routines/repository';
import { obtenerVarios } from '@/lib/exercises/repository';

export const prerender = false;

/**
 * Devuelve la rutina activa con los ejercicios ya resueltos.
 *
 * La rutina guarda solo `exerciseId`; aquí se hidratan contra el catálogo,
 * de modo que una corrección de traducción se refleja al instante en las
 * rutinas ya generadas.
 */
export const GET: APIRoute = async (contexto) => {
  const sesion = exigirSesionApi(contexto);
  if (esRespuesta(sesion)) return sesion;

  const rutina = await obtenerRutinaActiva(sesion.usuario.id);
  if (!rutina) {
    return new Response(JSON.stringify({ rutina: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ids = rutina.dias.flatMap((d) => d.bloques.map((b) => b.exerciseId));
  const ejercicios = await obtenerVarios([...new Set(ids)]);
  const porId = new Map(ejercicios.map((e) => [e.id, e]));

  return new Response(
    JSON.stringify({
      rutina: {
        splitNombre: rutina.splitNombre,
        coachId: rutina.coachId,
        version: rutina.version,
        avisos: rutina.avisos,
        dias: rutina.dias.map((d) => ({
          ...d,
          bloques: d.bloques.map((b) => ({ ...b, ejercicio: porId.get(b.exerciseId) ?? null })),
        })),
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
