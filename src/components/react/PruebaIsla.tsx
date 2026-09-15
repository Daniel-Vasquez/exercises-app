import { useState } from 'react';

/**
 * TANDA 0 — Smoke test de hidratación.
 *
 * Verifica que las islas React responden a eventos, que el estado sobrevive
 * a la hidratación y que los tokens de Tailwind 4 se aplican dentro de React.
 *
 * Reproduce en miniatura el gesto central de la app (marcar una serie hecha)
 * para validar de paso el tamaño de pulsación en móvil y el foco de teclado,
 * que son criterios de aceptación de la Tanda 5.
 *
 * ⚠️ Este componente se elimina en la Tanda 5, cuando llegue el SetTracker real.
 */

interface Serie {
  numero: number;
  hecha: boolean;
}

const SERIES_INICIALES: Serie[] = [
  { numero: 1, hecha: false },
  { numero: 2, hecha: false },
  { numero: 3, hecha: false },
];

export default function PruebaIsla() {
  const [series, setSeries] = useState<Serie[]>(SERIES_INICIALES);

  const alternar = (numero: number) => {
    setSeries((previas) =>
      previas.map((serie) =>
        serie.numero === numero ? { ...serie, hecha: !serie.hecha } : serie,
      ),
    );
  };

  const completadas = series.filter((serie) => serie.hecha).length;

  return (
    <div
      className="rounded-tarjeta border p-5"
      style={{ borderColor: 'var(--borde)', backgroundColor: 'var(--superficie-alt)' }}
    >
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h3 className="font-semibold">Press de banca con mancuernas</h3>
        <span className="text-sm tabular-nums" style={{ color: 'var(--texto-suave)' }}>
          {completadas}/{series.length} series
        </span>
      </div>

      <ul className="flex flex-wrap gap-2">
        {series.map((serie) => (
          <li key={serie.numero}>
            <button
              type="button"
              onClick={() => alternar(serie.numero)}
              aria-pressed={serie.hecha}
              // min-h-11: 44px, objetivo mínimo de pulsación en móvil
              className={[
                'min-h-11 min-w-11 px-4 rounded-xl border text-sm font-medium transition-colors',
                serie.hecha
                  ? 'bg-acento-500 border-acento-500 text-white'
                  : 'hover:border-acento-300',
              ].join(' ')}
              style={
                serie.hecha ? undefined : { borderColor: 'var(--borde)', color: 'var(--texto)' }
              }
            >
              {serie.hecha ? '✓' : ''} Serie {serie.numero}
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm" style={{ color: 'var(--texto-suave)' }}>
        {completadas === series.length
          ? '✅ Hidratación, estado y estilos funcionando.'
          : 'Pulsa las series para comprobar la hidratación de la isla.'}
      </p>
    </div>
  );
}
