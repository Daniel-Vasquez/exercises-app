import { createHash } from 'node:crypto';

/**
 * Generador pseudoaleatorio determinista (§6.4).
 *
 * El requisito es doble y aparentemente contradictorio:
 *   - El MISMO usuario con las MISMAS respuestas debe recibir SIEMPRE la
 *     misma rutina. Si no, "regenerar" sería una tragaperras y los tests
 *     necesitarían mocks.
 *   - Usuarios DISTINTOS con respuestas idénticas deben recibir rutinas
 *     distintas, o el producto se siente genérico.
 *
 * Se resuelve sembrando el generador con un hash del usuario + sus
 * respuestas, en lugar de usar Math.random(). Por esto mismo se descartó el
 * endpoint /exercises/random de la API: no es reproducible.
 */

/** Deriva una semilla estable y legible a partir de las entradas. */
export function derivarSemilla(partes: {
  salt: string;
  userId: string;
  coachId: string;
  cuestionario: unknown;
  version: number;
}): string {
  const material = [
    partes.salt,
    partes.userId,
    partes.coachId,
    JSON.stringify(partes.cuestionario, Object.keys(partes.cuestionario as object).sort()),
    String(partes.version),
  ].join('|');

  return createHash('sha256').update(material).digest('hex').slice(0, 32);
}

/** Convierte la semilla hexadecimal en el entero de 32 bits que usa mulberry32. */
function semillaAEntero(semilla: string): number {
  let h = 0;
  for (let i = 0; i < semilla.length; i += 1) {
    h = Math.imul(31, h) + semilla.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}

export interface Aleatorio {
  /** Número en [0, 1). */
  siguiente(): number;
  /** Entero en [0, max). */
  entero(max: number): number;
  /** Elige un elemento. */
  elegir<T>(items: readonly T[]): T | undefined;
  /** Copia barajada (Fisher-Yates); no muta la entrada. */
  barajar<T>(items: readonly T[]): T[];
}

/**
 * mulberry32: PRNG de 32 bits, rápido y con buena distribución para este uso.
 * No es criptográfico, y no necesita serlo: solo desempata elecciones.
 */
export function crearAleatorio(semilla: string): Aleatorio {
  let estado = semillaAEntero(semilla);

  const siguiente = (): number => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const entero = (max: number): number => (max <= 0 ? 0 : Math.floor(siguiente() * max));

  return {
    siguiente,
    entero,
    elegir: <T,>(items: readonly T[]): T | undefined =>
      items.length ? items[entero(items.length)] : undefined,
    barajar: <T,>(items: readonly T[]): T[] => {
      const copia = [...items];
      for (let i = copia.length - 1; i > 0; i -= 1) {
        const j = entero(i + 1);
        [copia[i], copia[j]] = [copia[j]!, copia[i]!];
      }
      return copia;
    },
  };
}
