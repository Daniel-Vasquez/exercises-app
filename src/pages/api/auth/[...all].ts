import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth/auth';

// Better Auth expone todos sus endpoints (/api/auth/sign-in, /sign-up,
// /sign-out, /get-session…) bajo esta única ruta comodín.
export const prerender = false;

/**
 * El handler se envuelve para registrar los fallos.
 *
 * Sin esto, una excepción aquí llega al navegador como un 500 con el cuerpo
 * vacío y sin rastro: no hay forma de saber qué falló salvo leer los logs de
 * la plataforma, y ni siquiera aparece qué operación lo provocó.
 */
export const ALL: APIRoute = async ({ request }) => {
  try {
    return await auth.handler(request);
  } catch (error) {
    const ruta = new URL(request.url).pathname;
    const causa = error instanceof Error ? error : new Error(String(error));

    // Va a los logs del servidor (Runtime Logs en Vercel), nunca al cliente.
    console.error(
      `[auth] Fallo en ${request.method} ${ruta}: ${causa.name}: ${causa.message}`,
      causa.stack,
    );

    // Al cliente solo un mensaje genérico: el detalle de un error de base de
    // datos puede incluir la cadena de conexión.
    return new Response(
      JSON.stringify({ error: 'Error interno al procesar la autenticación.', ruta }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
