/**
 * Cliente de la API de ejercicios.
 *
 * Se usa EXCLUSIVAMENTE desde los scripts de sincronización, nunca durante
 * una petición de usuario (ADR-01): la API vive en un Atlas M0 gratuito que
 * se pausa por inactividad y en funciones serverless con arranque en frío.
 */

export interface EjercicioApi {
  id: string;
  name: string;
  category: string;
  body_part: string;
  target: string;
  muscle_group: string;
  secondary_muscles: string[];
  equipment: string;
  media_id: string;
  media: { image_url: string; gif_url: string };
  instructions: string;
  instruction_steps: string[];
  tags: string[];
  attribution?: string;
}

interface Sobre<T> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number; total_pages: number; has_next_page: boolean };
}

export interface OpcionesCliente {
  baseUrl: string;
  timeoutMs?: number;
  reintentos?: number;
}

export class ClienteEjercicios {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly reintentos: number;

  constructor({ baseUrl, timeoutMs = 15_000, reintentos = 3 }: OpcionesCliente) {
    // Se normaliza la barra final: `${base}/exercises` con una base acabada en
    // "/" produce "//exercises", que la API responde con un 308 y rompe el
    // recorrido de páginas.
    this.base = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
    this.reintentos = reintentos;
  }

  private async pedir<T>(ruta: string): Promise<Sobre<T>> {
    const url = `${this.base}${ruta}`;
    let ultimoError: unknown;

    for (let intento = 1; intento <= this.reintentos; intento += 1) {
      const control = new AbortController();
      const temporizador = setTimeout(() => control.abort(), this.timeoutMs);

      try {
        const respuesta = await fetch(url, { signal: control.signal });

        // 4xx no se reintenta: la petición está mal y reintentarla dará igual.
        if (respuesta.status >= 400 && respuesta.status < 500) {
          throw new Error(
            `${respuesta.status} ${respuesta.statusText} en ${ruta}. ` +
              `¿Es correcta PUBLIC_EXERCISES_API_URL? Debe terminar en /api/v1`,
          );
        }
        if (!respuesta.ok) throw new Error(`${respuesta.status} ${respuesta.statusText} en ${ruta}`);

        return (await respuesta.json()) as Sobre<T>;
      } catch (error) {
        ultimoError = error;
        if (error instanceof Error && error.message.includes('¿Es correcta')) throw error;
        if (intento < this.reintentos) {
          // Espera exponencial: 400ms, 800ms, 1600ms…
          await new Promise((r) => setTimeout(r, 400 * 2 ** (intento - 1)));
        }
      } finally {
        clearTimeout(temporizador);
      }
    }

    throw new Error(
      `No se pudo obtener ${ruta} tras ${this.reintentos} intentos: ${String(ultimoError)}`,
    );
  }

  async salud(): Promise<boolean> {
    try {
      const url = `${this.base}/health`;
      const r = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
      return r.ok;
    } catch {
      return false;
    }
  }

  async taxonomia(recurso: 'body-parts' | 'targets' | 'equipments' | 'muscles'): Promise<string[]> {
    const { data } = await this.pedir<string[]>(`/${recurso}`);
    return data;
  }

  /** Recorre el catálogo completo página a página. */
  async *todosLosEjercicios(porPagina = 100): AsyncGenerator<EjercicioApi[]> {
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const { data, meta } = await this.pedir<EjercicioApi[]>(
        `/exercises?limit=${porPagina}&page=${pagina}`,
      );
      totalPaginas = meta?.total_pages ?? 1;
      yield data;
      pagina += 1;
    } while (pagina <= totalPaginas);
  }
}
