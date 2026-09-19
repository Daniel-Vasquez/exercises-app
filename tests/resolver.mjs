import { statSync } from 'node:fs';
import { resolve as resolverRuta, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

/**
 * Resolvedor de módulos para el runner de tests.
 *
 * Cubre dos cosas que Vite hace dentro de la app pero `node --test` no:
 *   - el alias `@/*` → `src/*`
 *   - los imports relativos SIN extensión (`./prng`), que el ESM de Node
 *     exige explícitos
 *
 * Hacerlo aquí evita ensuciar el código fuente con rutas relativas y
 * extensiones solo para poder ejecutar los tests.
 */
const EXTENSIONES = ['.ts', '.tsx', '.mts', '.js', '/index.ts', '/index.tsx', '/index.js'];

/** Debe ser un FICHERO: un directorio existente no es un módulo resoluble. */
function esFichero(ruta) {
  try {
    return statSync(ruta).isFile();
  } catch {
    return false;
  }
}

function primeraQueExiste(base) {
  if (esFichero(base)) return base;
  for (const ext of EXTENSIONES) {
    const candidato = `${base}${ext}`;
    if (esFichero(candidato)) return candidato;
  }
  return null;
}

export async function resolve(especificador, contexto, siguiente) {
  if (especificador.startsWith('@/')) {
    const encontrado = primeraQueExiste(resolverRuta(process.cwd(), 'src', especificador.slice(2)));
    if (encontrado) return { url: pathToFileURL(encontrado).href, shortCircuit: true };
  }

  if (especificador.startsWith('.') && contexto.parentURL?.startsWith('file:')) {
    const base = resolverRuta(dirname(fileURLToPath(contexto.parentURL)), especificador);
    const encontrado = primeraQueExiste(base);
    if (encontrado) return { url: pathToFileURL(encontrado).href, shortCircuit: true };
  }

  return siguiente(especificador, contexto);
}
