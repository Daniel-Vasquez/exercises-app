import { z } from 'zod';
import { COACH_IDS, obtenerCoach } from '@/lib/coaches';
import { ZONAS_LESION } from '@/lib/engine/patterns';

/**
 * Esquema del cuestionario de onboarding.
 *
 * Es la ÚNICA fuente de verdad de la validación: el cliente lo usa para dar
 * respuesta inmediata y el servidor para decidir. Duplicar las reglas en dos
 * sitios garantiza que acaben divergiendo, y la que importa es la del
 * servidor, porque el cliente es manipulable.
 */

export const esquemaBase = z.object({
  experiencia: z.enum(['principiante', 'intermedio', 'avanzado']),
  diasPorSemana: z.coerce.number().int().min(2).max(6),
  minutosPorSesion: z.coerce.number().int().refine((v) => [30, 45, 60, 90].includes(v), {
    message: 'Elige 30, 45, 60 o 90 minutos.',
  }),
  material: z.enum(['casa_sin_equipo', 'casa_mancuernas', 'gimnasio_basico', 'gimnasio_completo']),
  zonasAEvitar: z.array(z.enum(ZONAS_LESION as [string, ...string[]])).default([]),
  objetivoPeso: z.enum(['perder', 'mantener', 'ganar']),
});

export const esquemaOnboarding = z.object({
  coachId: z.enum(COACH_IDS as [string, ...string[]]),
  cuestionario: esquemaBase.extend({
    extras: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()])).default({}),
  }),
});

export type EntradaOnboarding = z.infer<typeof esquemaOnboarding>;

/**
 * Valida las preguntas extra CONTRA EL COACH ELEGIDO.
 *
 * No puede hacerse con un esquema estático: las preguntas obligatorias
 * dependen del coach. Sin esta comprobación, alguien podría enviar el
 * cuestionario de Fuerza habiendo elegido Salud, y el motor recibiría
 * respuestas que no sabe interpretar.
 */
export function validarExtras(
  coachId: string,
  extras: Record<string, unknown>,
): { ok: true } | { ok: false; errores: string[] } {
  const coach = obtenerCoach(coachId);
  if (!coach) return { ok: false, errores: ['Coach desconocido.'] };

  const errores: string[] = [];

  for (const pregunta of coach.preguntasExtra) {
    const valor = extras[pregunta.id];
    const vacio = valor === undefined || valor === null || valor === '';

    if (pregunta.requerida && vacio) {
      errores.push(`Falta responder: ${pregunta.pregunta}`);
      continue;
    }
    if (vacio) continue;

    if (pregunta.tipo === 'escala') {
      const n = Number(valor);
      const min = pregunta.min ?? 0;
      const max = pregunta.max ?? 10;
      if (!Number.isFinite(n) || n < min || n > max) {
        errores.push(`"${pregunta.pregunta}" debe estar entre ${min} y ${max}.`);
      }
      continue;
    }

    const permitidos = (pregunta.opciones ?? []).map((o) => o.valor);
    const valores = Array.isArray(valor) ? valor : [valor];
    for (const v of valores) {
      if (!permitidos.includes(String(v))) {
        errores.push(`Respuesta no válida en "${pregunta.pregunta}".`);
      }
    }
  }

  // Se rechazan claves que el coach no pidió: evita guardar basura en el perfil.
  const esperadas = new Set(coach.preguntasExtra.map((p) => p.id));
  for (const clave of Object.keys(extras)) {
    if (!esperadas.has(clave)) errores.push(`La pregunta "${clave}" no pertenece a este coach.`);
  }

  return errores.length ? { ok: false, errores } : { ok: true };
}
