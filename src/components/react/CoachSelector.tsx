import type { CoachArchetype, CoachId } from '@/lib/coaches/types';

interface Props {
  coaches: CoachArchetype[];
  seleccionado: CoachId | null;
  onSeleccionar: (id: CoachId) => void;
}

/**
 * Tarjetas de los 4 arquetipos.
 *
 * Se renderiza como grupo de radio real (`role="radiogroup"` + inputs
 * ocultos) en lugar de divs con onClick: así funciona con teclado y con
 * lector de pantalla sin tener que reimplementar el comportamiento.
 */
export default function CoachSelector({ coaches, seleccionado, onSeleccionar }: Props) {
  return (
    <div role="radiogroup" aria-label="Elige tu entrenador" className="grid gap-3 sm:grid-cols-2">
      {coaches.map((coach) => {
        const activo = seleccionado === coach.id;
        return (
          <label
            key={coach.id}
            className={[
              'relative block rounded-tarjeta border p-5 cursor-pointer transition-all',
              activo ? 'border-acento-500 ring-2 ring-acento-500/30' : 'hover:border-acento-300',
            ].join(' ')}
            style={{
              borderColor: activo ? undefined : 'var(--borde)',
              backgroundColor: activo ? 'color-mix(in oklch, var(--color-acento-500) 6%, var(--superficie))' : 'var(--superficie-alt)',
            }}
          >
            <input
              type="radio"
              name="coach"
              value={coach.id}
              checked={activo}
              onChange={() => onSeleccionar(coach.id)}
              className="sr-only"
            />

            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none" aria-hidden="true">{coach.emoji}</span>
              <div className="min-w-0">
                <p className="font-semibold">
                  {coach.nombre} <span style={{ color: 'var(--texto-suave)' }}>«{coach.titulo}»</span>
                </p>
                <p className="text-sm mt-1 italic" style={{ color: 'var(--texto-suave)' }}>
                  {coach.filosofia}
                </p>
              </div>
              {activo && (
                <span className="ml-auto text-acento-600 dark:text-acento-300 shrink-0" aria-hidden="true">✓</span>
              )}
            </div>

            <p className="text-sm mt-3">{coach.paraQuien}</p>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--texto-suave)' }}>
              <div className="flex justify-between gap-2">
                <dt>Repeticiones</dt>
                <dd className="tabular-nums">{rangoReps(coach)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Descanso</dt>
                <dd className="tabular-nums">{rangoDescanso(coach)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Por sesión</dt>
                <dd className="tabular-nums">{coach.prescripcion.ejerciciosPorSesion.join('–')} ejercicios</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Progresión</dt>
                <dd className="capitalize">{coach.progresion}</dd>
              </div>
            </dl>
          </label>
        );
      })}
    </div>
  );
}

/** Rango global de repeticiones del coach, de la ranura más pesada a la más ligera. */
function rangoReps(coach: CoachArchetype): string {
  const rangos = Object.values(coach.prescripcion.repRange).filter(
    (r): r is readonly [number, number] => Array.isArray(r) && r[0] > 1,
  );
  if (!rangos.length) return '—';
  return `${Math.min(...rangos.map((r) => r[0]))}–${Math.max(...rangos.map((r) => r[1]))}`;
}

function rangoDescanso(coach: CoachArchetype): string {
  const valores = Object.values(coach.prescripcion.restSeconds).filter(
    (v): v is number => typeof v === 'number' && v >= 30,
  );
  if (!valores.length) return '—';
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const fmt = (s: number) => (s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
}
