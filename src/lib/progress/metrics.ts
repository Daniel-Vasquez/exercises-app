/**
 * Métricas de entrenamiento. Funciones puras, sin I/O.
 */

export interface SerieRegistrada {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  done: boolean;
  completedAt?: string | null;
}

export interface EntradaRegistrada {
  exerciseId: string;
  sets: SerieRegistrada[];
}

export interface Totales {
  volumeKg: number;
  setsCompleted: number;
  setsPlanned: number;
}

/**
 * Volumen = Σ (repeticiones × peso) de las series COMPLETADAS.
 *
 * Solo cuentan las marcadas: una serie con valores escritos pero sin marcar
 * es una intención, no trabajo hecho, y contarla inflaría el progreso.
 * Las series a peso corporal (sin kg) suman 0 al volumen pero sí cuentan
 * como serie completada.
 */
export function calcularTotales(entradas: readonly EntradaRegistrada[]): Totales {
  let volumeKg = 0;
  let setsCompleted = 0;
  let setsPlanned = 0;

  for (const entrada of entradas) {
    for (const serie of entrada.sets) {
      setsPlanned += 1;
      if (!serie.done) continue;
      setsCompleted += 1;
      if (serie.reps && serie.weightKg) volumeKg += serie.reps * serie.weightKg;
    }
  }

  // Se redondea a un decimal: los medios kilos existen, los microgramos no.
  return { volumeKg: Math.round(volumeKg * 10) / 10, setsCompleted, setsPlanned };
}

/** Un día está completo cuando todas sus series están marcadas. */
export function estaCompleto(totales: Totales): boolean {
  return totales.setsPlanned > 0 && totales.setsCompleted === totales.setsPlanned;
}

/**
 * Fecha local en formato YYYY-MM-DD.
 *
 * ⚠️ NO usar toISOString(): convierte a UTC, así que un entrenamiento a las
 * 22:00 en México se guardaría con la fecha del día siguiente y el
 * calendario lo pintaría en la casilla equivocada. El día de entrenamiento
 * es un concepto de calendario local, no un instante (§4.5).
 */
export function fechaLocal(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function esFechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [y, m, d] = valor.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const fecha = new Date(y, m - 1, d);
  return fecha.getFullYear() === y && fecha.getMonth() === m - 1 && fecha.getDate() === d;
}
