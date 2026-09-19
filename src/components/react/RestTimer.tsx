import { useEffect, useRef, useState } from 'react';

interface Props {
  segundos: number;
  /** Clave que, al cambiar, reinicia la cuenta (una serie recién marcada). */
  disparador: number;
}

/**
 * Cuenta atrás del descanso.
 *
 * Se apoya en marcas de tiempo absolutas, no en ir restando un segundo por
 * intervalo: en móvil el navegador ralentiza los timers cuando la pantalla
 * se apaga o la pestaña pierde foco, y un contador incremental se quedaría
 * corto justo cuando el usuario está descansando.
 */
export default function RestTimer({ segundos, disparador }: Props) {
  const [restante, setRestante] = useState<number | null>(null);
  const finRef = useRef<number>(0);

  useEffect(() => {
    if (disparador === 0) return;

    finRef.current = Date.now() + segundos * 1000;
    setRestante(segundos);

    const id = setInterval(() => {
      const quedan = Math.ceil((finRef.current - Date.now()) / 1000);
      if (quedan <= 0) {
        setRestante(null);
        clearInterval(id);
      } else {
        setRestante(quedan);
      }
    }, 250);

    return () => clearInterval(id);
  }, [disparador, segundos]);

  if (restante === null) return null;

  const minutos = Math.floor(restante / 60);
  const resto = restante % 60;

  return (
    <p
      className="text-sm tabular-nums mt-2"
      role="status"
      aria-live="polite"
      style={{ color: 'var(--color-acento-600)' }}
    >
      Descanso: {minutos > 0 ? `${minutos}:${String(resto).padStart(2, '0')}` : `${resto} s`}
    </p>
  );
}
