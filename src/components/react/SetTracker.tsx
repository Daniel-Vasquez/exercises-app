import { useRef, useState } from 'react';
import type { SerieRegistrada } from '@/lib/progress/metrics';

interface Props {
  exerciseId: string;
  series: SerieRegistrada[];
  /** Medida prescrita: repeticiones o segundos. */
  medida: 'reps' | 'tiempo';
  segundos?: number | undefined;
  repsMin: number;
  repsMax: number;
  /** Valores de la última sesión, como marca de agua en los campos. */
  sugerencia?: { reps: number | null; weightKg: number | null } | undefined;
  onCambio: (exerciseId: string, series: SerieRegistrada[]) => void;
  onSerieHecha?: (() => void) | undefined;
}

/**
 * Registro de series de UN ejercicio. Componente reutilizable (Tanda 5).
 *
 * Los campos son NO CONTROLADOS y se leen por referencia. El motivo
 * principal no es la hidratación sino el tecleo: un input controlado que
 * parsea el valor en cada pulsación convierte "2." en 2 y borra el punto
 * mientras el usuario escribe "2.5". Con campos no controlados el navegador
 * mantiene el texto y solo se interpreta al leerlo.
 *
 * El diseño asume uso real: pantalla pequeña, una mano, manos sudadas.
 * De ahí los objetivos de 44 px, `inputMode` numérico y que marcar la serie
 * sea un solo toque grande.
 */
export default function SetTracker({
  exerciseId,
  series,
  medida,
  segundos,
  repsMin,
  repsMax,
  sugerencia,
  onCambio,
  onSerieHecha,
}: Props) {
  // Modelo vivo: se muta aquí y se emite hacia arriba, sin re-render por tecla.
  const modelo = useRef<SerieRegistrada[]>(series.map((s) => ({ ...s })));

  // El estado de "hecha" SÍ es estado de React: cambia por toque, no por
  // tecla, y el botón tiene que repintarse. Los valores numéricos, en
  // cambio, viven en el DOM y en el ref: no necesitan re-render.
  const [hechas, setHechas] = useState<boolean[]>(() => series.map((s) => s.done));
  const refsReps = useRef<Record<number, HTMLInputElement | null>>({});
  const refsPeso = useRef<Record<number, HTMLInputElement | null>>({});

  const emitir = () => onCambio(exerciseId, modelo.current.map((s) => ({ ...s })));

  const aNumero = (texto: string): number | null => {
    const limpio = texto.replace(',', '.').trim();
    if (limpio === '') return null;
    const n = Number(limpio);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const fijarReps = (numero: number, texto: string) => {
    const serie = modelo.current[numero - 1];
    if (!serie) return;
    const n = aNumero(texto);
    serie.reps = n === null ? null : Math.round(n);
    emitir();
  };

  const fijarPeso = (numero: number, texto: string) => {
    const serie = modelo.current[numero - 1];
    if (!serie) return;
    serie.weightKg = aNumero(texto);
    emitir();
  };

  const alternar = (numero: number) => {
    const serie = modelo.current[numero - 1];
    if (!serie) return;

    serie.done = !serie.done;
    setHechas((previas) => previas.map((v, i) => (i === numero - 1 ? serie.done : v)));

    if (serie.done) {
      // Al marcar, se rellena lo que falte con lo prescrito o con lo último
      // que hizo: entrenando, nadie quiere teclear lo que ya es obvio.
      if (serie.reps === null && medida === 'reps') {
        serie.reps = sugerencia?.reps ?? repsMin;
        const campo = refsReps.current[numero];
        if (campo) campo.value = String(serie.reps);
      }
      if (serie.weightKg === null && sugerencia?.weightKg != null) {
        serie.weightKg = sugerencia.weightKg;
        const campo = refsPeso.current[numero];
        if (campo) campo.value = String(serie.weightKg);
      }
      serie.completedAt = new Date().toISOString();
      onSerieHecha?.();
    } else {
      serie.completedAt = null;
    }

    emitir();
  };

  const objetivo = medida === 'tiempo' ? `${segundos ?? 40} s` : `${repsMin}-${repsMax}`;

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">
        Series de este ejercicio. Objetivo: {objetivo}.
      </caption>
      <thead>
        <tr style={{ color: 'var(--texto-suave)' }}>
          <th scope="col" className="text-left font-normal text-xs pb-1 w-10">
            Serie
          </th>
          <th scope="col" className="text-left font-normal text-xs pb-1">
            {medida === 'tiempo' ? 'Segundos' : 'Reps'}
          </th>
          <th scope="col" className="text-left font-normal text-xs pb-1">
            Kg
          </th>
          <th scope="col" className="text-right font-normal text-xs pb-1 w-14">
            Hecha
          </th>
        </tr>
      </thead>
      <tbody>
        {series.map((serie) => {
          const hecha = hechas[serie.setNumber - 1] ?? false;
          return (
            <tr key={serie.setNumber}>
              <td className="py-1 tabular-nums" style={{ color: 'var(--texto-suave)' }}>
                {serie.setNumber}
              </td>
              <td className="py-1 pr-2">
                <input
                  ref={(el) => {
                    refsReps.current[serie.setNumber] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  defaultValue={serie.reps ?? ''}
                  placeholder={
                    medida === 'tiempo'
                      ? String(segundos ?? 40)
                      : String(sugerencia?.reps ?? repsMin)
                  }
                  onChange={(e) => fijarReps(serie.setNumber, e.target.value)}
                  aria-label={`Repeticiones de la serie ${serie.setNumber}`}
                  className="w-full min-h-11 px-2 rounded-lg border text-center tabular-nums transition-colors focus:border-acento-500"
                  style={CAMPO}
                />
              </td>
              <td className="py-1 pr-2">
                <input
                  ref={(el) => {
                    refsPeso.current[serie.setNumber] = el;
                  }}
                  type="text"
                  inputMode="decimal"
                  defaultValue={serie.weightKg ?? ''}
                  placeholder={sugerencia?.weightKg != null ? String(sugerencia.weightKg) : '—'}
                  onChange={(e) => fijarPeso(serie.setNumber, e.target.value)}
                  aria-label={`Peso en kilos de la serie ${serie.setNumber}`}
                  className="w-full min-h-11 px-2 rounded-lg border text-center tabular-nums transition-colors focus:border-acento-500"
                  style={CAMPO}
                />
              </td>
              <td className="py-1 text-right">
                <button
                  type="button"
                  onClick={() => alternar(serie.setNumber)}
                  aria-pressed={hecha}
                  aria-label={`Marcar la serie ${serie.setNumber} como hecha`}
                  className={[
                    'min-h-11 min-w-11 rounded-xl border font-medium transition-colors',
                    hecha ? 'bg-exito-500 border-exito-500 text-white' : 'hover:border-acento-300',
                  ].join(' ')}
                  style={hecha ? undefined : { borderColor: 'var(--borde)', color: 'var(--texto-suave)' }}
                >
                  {hecha ? '✓' : '○'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const CAMPO = {
  borderColor: 'var(--borde)',
  backgroundColor: 'var(--superficie)',
  color: 'var(--texto)',
} as const;
