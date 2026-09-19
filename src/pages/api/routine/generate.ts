import type { APIRoute } from 'astro';
import { exigirSesionApi, esRespuesta } from '@/lib/auth/guards';
import { generarYGuardar } from '@/lib/routines/service';

export const prerender = false;

/** Genera la rutina del usuario en sesión y la deja como activa. */
export const POST: APIRoute = async (contexto) => {
  const sesion = exigirSesionApi(contexto);
  if (esRespuesta(sesion)) return sesion;

  try {
    const resultado = await generarYGuardar(sesion.usuario.id);

    if (!resultado.ok) {
      return new Response(JSON.stringify({ error: resultado.error }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { rutina } = resultado;
    return new Response(
      JSON.stringify({
        ok: true,
        splitNombre: rutina.splitNombre,
        version: rutina.version,
        dias: rutina.dias.length,
        ejercicios: rutina.dias.reduce((s, d) => s + d.bloques.length, 0),
        avisos: rutina.avisos,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[routine/generate] Fallo al generar la rutina:', error);
    return new Response(JSON.stringify({ error: 'No se pudo generar tu rutina.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
