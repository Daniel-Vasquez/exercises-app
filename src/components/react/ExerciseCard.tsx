import { useState } from 'react';

interface Props {
  nombre: string;
  imagenUrl: string;
  gifUrl: string;
  musculo: string;
  equipo: string;
  instrucciones?: string[] | undefined;
}

/**
 * Cabecera de un ejercicio.
 *
 * El GIF NO se descarga en la carga inicial (riesgo R2): con 5-9 ejercicios
 * por sesión serían varios megas de datos móviles y de CPU antes de que el
 * usuario mire siquiera. Se muestra la miniatura estática y el GIF solo
 * cuando se pide, que es lo que recomienda la propia API: más del 85% de
 * ahorro de transferencia.
 */
export default function ExerciseCard({
  nombre,
  imagenUrl,
  gifUrl,
  musculo,
  equipo,
  instrucciones,
}: Props) {
  const [animado, setAnimado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setAnimado((v) => !v)}
          aria-label={animado ? `Detener la animación de ${nombre}` : `Ver ${nombre} en movimiento`}
          className="relative shrink-0 rounded-lg overflow-hidden focus-visible:outline-2"
          style={{ backgroundColor: 'var(--superficie-alt)' }}
        >
          <img
            src={animado ? gifUrl : imagenUrl}
            alt=""
            width="64"
            height="64"
            loading="lazy"
            decoding="async"
            className="w-16 h-16 object-cover"
          />
          {!animado && (
            <span
              className="absolute inset-0 grid place-items-center text-white text-lg"
              style={{ backgroundColor: 'rgb(0 0 0 / 0.25)' }}
              aria-hidden="true"
            >
              ▶
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm leading-snug">{nombre}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--texto-suave)' }}>
            {musculo} · {equipo}
          </p>
          {instrucciones && instrucciones.length > 0 && (
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="text-xs mt-1 underline min-h-11 sm:min-h-0"
              style={{ color: 'var(--texto-suave)' }}
            >
              {abierto ? 'Ocultar instrucciones' : 'Cómo se hace'}
            </button>
          )}
        </div>
      </div>

      {abierto && instrucciones && (
        <ol
          className="text-sm mt-3 grid gap-1.5 list-decimal pl-5"
          style={{ color: 'var(--texto-suave)' }}
        >
          {instrucciones.map((paso, i) => (
            <li key={i}>{paso}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
