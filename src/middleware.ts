import { defineMiddleware } from 'astro:middleware';
import { auth } from '@/lib/auth/auth';

/**
 * Resuelve la sesión una sola vez por petición y protege las rutas privadas.
 *
 * Centralizarlo aquí evita que cada página repita la comprobación — y que
 * alguna se olvide de hacerla, que es como se filtran datos entre usuarios
 * (riesgo R6).
 */

/** Rutas que exigen sesión. Se comparan por prefijo. */
const RUTAS_PRIVADAS = ['/onboarding', '/rutina', '/calendario', '/progreso'] as const;

/** Rutas a las que no tiene sentido entrar con la sesión ya iniciada. */
const RUTAS_DE_INVITADO = ['/login', '/registro'] as const;

function coincide(ruta: string, prefijos: readonly string[]): boolean {
  return prefijos.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`));
}

export const onRequest = defineMiddleware(async (contexto, siguiente) => {
  const { url, request, locals, redirect } = contexto;

  // Los endpoints de Better Auth se gestionan solos: no deben pasar por los
  // guardias ni volver a resolver la sesión.
  if (url.pathname.startsWith('/api/auth')) {
    return siguiente();
  }

  const sesion = await auth.api.getSession({ headers: request.headers });

  locals.user = sesion?.user ?? null;
  locals.session = sesion?.session ?? null;

  const autenticado = locals.user !== null;

  if (!autenticado && coincide(url.pathname, RUTAS_PRIVADAS)) {
    // Se conserva el destino para devolver al usuario donde iba tras entrar.
    const destino = url.pathname + url.search;
    return redirect(`/login?redirigir=${encodeURIComponent(destino)}`);
  }

  if (autenticado && coincide(url.pathname, RUTAS_DE_INVITADO)) {
    return redirect('/');
  }

  return siguiente();
});
