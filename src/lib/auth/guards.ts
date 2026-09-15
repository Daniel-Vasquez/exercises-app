import type { APIContext, AstroGlobal } from 'astro';
import type { Usuario } from '@/lib/auth/auth';

/**
 * Guardias de sesión para páginas y endpoints.
 *
 * La sesión la resuelve el middleware una sola vez por petición y la deja en
 * `locals`; estas funciones solo la leen. Nunca se acepta un userId que venga
 * del cliente (riesgo R6): el identificador sale siempre de la sesión.
 */

/** Exige sesión en una página `.astro`. Redirige a /login si no la hay. */
export function exigirSesion(
  contexto: AstroGlobal | APIContext,
): { usuario: Usuario } | Response {
  const usuario = contexto.locals.user;

  if (!usuario) {
    const destino = contexto.url.pathname + contexto.url.search;
    return contexto.redirect(`/login?redirigir=${encodeURIComponent(destino)}`);
  }

  return { usuario };
}

/** Exige sesión en un endpoint de API. Devuelve 401 JSON si no la hay. */
export function exigirSesionApi(contexto: APIContext): { usuario: Usuario } | Response {
  const usuario = contexto.locals.user;

  if (!usuario) {
    return new Response(JSON.stringify({ error: 'No autenticado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { usuario };
}

/** Discrimina el resultado de los guardias anteriores. */
export function esRespuesta(valor: unknown): valor is Response {
  return valor instanceof Response;
}
