import type { APIRoute } from 'astro';
import { verificarConexion } from '@/lib/db/client';

export const prerender = false;

/**
 * Diagnóstico de la instancia en ejecución.
 *
 * Existe porque un 500 en serverless llega al navegador con el cuerpo vacío:
 * sin esto, la única forma de ver la causa es el panel de logs de Vercel.
 *
 * Nunca devuelve valores de variables de entorno, solo si están presentes y
 * bien formadas. Los mensajes de error se sanean antes de salir, porque los
 * errores del driver de MongoDB pueden incluir la cadena de conexión con
 * credenciales.
 */

/** Elimina credenciales y hosts de cualquier texto antes de exponerlo. */
function sanear(texto: string): string {
  return texto
    .replace(/mongodb(\+srv)?:\/\/[^\s]*/gi, '[uri-oculta]')
    .replace(/:[^:@/\s]+@/g, ':[oculto]@');
}

export const GET: APIRoute = async () => {
  const inicio = Date.now();

  // Se leen sin pasar por astro:env a propósito: ese módulo lanza al importar
  // si alguna variable falta, y este endpoint debe poder INFORMAR de eso en
  // lugar de caerse con el mismo error que intenta diagnosticar.
  //
  // Se consultan las dos fuentes: en Vercel las variables llegan por
  // process.env, mientras que en desarrollo Astro carga el .env en
  // import.meta.env. Mirar solo una daría un "FALTA" falso.
  const leer = (clave: string): string =>
    process.env[clave] ?? (import.meta.env[clave] as string | undefined) ?? '';

  const requeridas = [
    'MONGODB_URI',
    'MONGODB_DB_NAME',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
  ] as const;

  const entorno: Record<string, string> = {};
  for (const clave of requeridas) {
    const valor = leer(clave);
    if (!valor) {
      entorno[clave] = 'FALTA';
    } else if (valor.startsWith('"') || valor.endsWith('"')) {
      entorno[clave] = 'PRESENTE pero entrecomillada ⚠️';
    } else {
      entorno[clave] = `presente (${valor.length} chars)`;
    }
  }

  // Comprobaciones de forma, sin revelar los valores.
  const uri = leer('MONGODB_URI');
  const authUrl = leer('BETTER_AUTH_URL');
  const forma = {
    uri_empieza_por_mongodb: uri.startsWith('mongodb'),
    uri_trae_credenciales: /:\/\/[^:]+:[^@]+@/.test(uri),
    auth_url_es_url_valida: URL.canParse(authUrl),
    auth_url_sin_barra_final: authUrl.length > 0 && !authUrl.endsWith('/'),
    secreto_longitud_suficiente: leer('BETTER_AUTH_SECRET').length >= 32,
  };

  let base: { ok: boolean; mensaje: string };
  try {
    base = await verificarConexion();
  } catch (error) {
    base = {
      ok: false,
      mensaje: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }

  const cuerpo = {
    ok: base.ok,
    base_de_datos: base.ok ? 'conectada' : 'error',
    detalle: sanear(base.mensaje),
    nombre_bd: leer('MONGODB_DB_NAME') || '(sin definir)',
    entorno,
    forma,
    ms: Date.now() - inicio,
  };

  return new Response(JSON.stringify(cuerpo, null, 2), {
    status: base.ok ? 200 : 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
