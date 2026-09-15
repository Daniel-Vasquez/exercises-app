import { MongoClient, type Db } from 'mongodb';
import { MONGODB_URI, MONGODB_DB_NAME } from 'astro:env/server';

/**
 * Cliente de MongoDB compartido por toda la app (ADR-04, riesgo R5).
 *
 * En serverless cada invocación puede reutilizar el mismo proceso Node. Si
 * creásemos un MongoClient por petición, cada uno abriría su propio pool y
 * agotaríamos el límite de conexiones de Atlas bajo carga.
 *
 * La instancia se cachea en `globalThis` y no en una variable de módulo,
 * porque el HMR de Vite recarga los módulos en desarrollo y acabaríamos
 * dejando clientes huérfanos en cada guardado de archivo.
 *
 * El cliente se construye de forma SÍNCRONA y no se espera a `connect()`:
 * el driver conecta de forma perezosa en la primera operación. Esto permite
 * entregarle una `Db` a Better Auth, que la exige de forma síncrona, sin
 * bloquear el arranque del módulo.
 *
 * Better Auth recibe esta MISMA instancia (ver lib/auth/auth.ts): un único
 * pool para la autenticación y para las colecciones de dominio.
 */

const CLAVE_GLOBAL = Symbol.for('coachapp.mongo');

const contenedor = globalThis as unknown as Record<symbol, MongoClient | undefined>;

export function obtenerCliente(): MongoClient {
  const existente = contenedor[CLAVE_GLOBAL];
  if (existente) return existente;

  const client = new MongoClient(MONGODB_URI, {
    // Timeouts cortos: en serverless conviene fallar rápido y devolver un
    // error antes que quedarse colgado hasta agotar el tiempo de la función.
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    // Pool pequeño: muchas instancias serverless, no un servidor único.
    maxPoolSize: 10,
    minPoolSize: 0,
    retryWrites: true,
  });

  contenedor[CLAVE_GLOBAL] = client;
  return client;
}

/** Base de datos de la app. Síncrona: el driver conecta al primer uso. */
export function obtenerDb(): Db {
  return obtenerCliente().db(MONGODB_DB_NAME);
}

/**
 * Comprueba la conectividad real contra el cluster.
 * Útil para diagnósticos; las rutas normales no necesitan llamarla.
 */
export async function verificarConexion(): Promise<{ ok: boolean; mensaje: string }> {
  try {
    const resultado = await obtenerDb().command({ ping: 1 });
    return { ok: resultado['ok'] === 1, mensaje: 'Conexión correcta.' };
  } catch (error) {
    return { ok: false, mensaje: error instanceof Error ? error.message : String(error) };
  }
}
