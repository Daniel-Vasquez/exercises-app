import type { APIRoute } from 'astro';
import { esquemaOnboarding, validarExtras } from '@/lib/validation/questionnaire';
import { guardarPerfil } from '@/lib/profiles/repository';
import { exigirSesionApi, esRespuesta } from '@/lib/auth/guards';
import type { CoachId, Cuestionario } from '@/lib/coaches/types';

export const prerender = false;

function json(cuerpo: unknown, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Guarda el coach elegido y el cuestionario.
 *
 * El `userId` sale SIEMPRE de la sesión, nunca del cuerpo de la petición
 * (riesgo R6): aceptarlo del cliente permitiría escribir el perfil de otro
 * usuario enviando su identificador.
 */
export const POST: APIRoute = async (contexto) => {
  const sesion = exigirSesionApi(contexto);
  if (esRespuesta(sesion)) return sesion;

  let bruto: unknown;
  try {
    bruto = await contexto.request.json();
  } catch {
    return json({ error: 'El cuerpo de la petición no es JSON válido.' }, 400);
  }

  const analisis = esquemaOnboarding.safeParse(bruto);
  if (!analisis.success) {
    return json(
      {
        error: 'Hay respuestas que no son válidas.',
        errores: analisis.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      },
      400,
    );
  }

  const { coachId, cuestionario } = analisis.data;

  // Las preguntas obligatorias dependen del coach, así que no pueden
  // validarse con un esquema estático.
  const extras = validarExtras(coachId, cuestionario.extras);
  if (!extras.ok) {
    return json({ error: 'Faltan respuestas del entrenador elegido.', errores: extras.errores }, 400);
  }

  try {
    const perfil = await guardarPerfil(
      sesion.usuario.id,
      coachId as CoachId,
      cuestionario as Cuestionario,
    );

    return json(
      {
        ok: true,
        coachId: perfil.coachId,
        // La rutina se genera en la Tanda 4; de momento solo se confirma el perfil.
        siguiente: '/rutina',
      },
      200,
    );
  } catch (error) {
    console.error('[onboarding] Fallo al guardar el perfil:', error);
    return json({ error: 'No se pudo guardar tu perfil. Inténtalo de nuevo.' }, 500);
  }
};
