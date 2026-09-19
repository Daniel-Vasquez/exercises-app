import { useCallback, useEffect, useRef, useState } from 'react';
import SetTracker from './SetTracker';
import ExerciseCard from './ExerciseCard';
import RestTimer from './RestTimer';
import { calcularTotales, type EntradaRegistrada, type SerieRegistrada } from '@/lib/progress/metrics';

export interface BloqueVista {
  exerciseId: string;
  orden: number;
  slotEtiqueta: string;
  sets: number;
  medida: 'reps' | 'tiempo';
  repsMin: number;
  repsMax: number;
  segundos?: number;
  restSeconds: number;
  nombre: string;
  musculo: string;
  equipo: string;
  imagenUrl: string;
  gifUrl: string;
  instrucciones: string[];
}

interface Props {
  date: string;
  dayIndex: number;
  routineId: string | null;
  bloques: BloqueVista[];
  /** Registro ya guardado en servidor, si lo hay. */
  entradasIniciales: EntradaRegistrada[];
  sugerencias: Record<string, { reps: number | null; weightKg: number | null }>;
}

type EstadoGuardado = 'guardado' | 'guardando' | 'pendiente' | 'sin_cambios';

const DEBOUNCE_MS = 800;

/**
 * Orquesta el registro de un día de entrenamiento.
 *
 * El guardado es OPTIMISTA y con rebote: escribir un peso no debe disparar
 * una petición por tecla. Y antes de cada intento se deja un borrador en
 * localStorage, porque en un gimnasio de sótano la cobertura desaparece y
 * perder una sesión registrada es la forma más rápida de que alguien deje
 * de usar la app (riesgo R9).
 */
export default function DiaEntreno({
  date,
  dayIndex,
  routineId,
  bloques,
  entradasIniciales,
  sugerencias,
}: Props) {
  const claveBorrador = `coachapp:log:${date}:${dayIndex}`;

  const [entradas, setEntradas] = useState<EntradaRegistrada[]>(() =>
    construirEntradas(bloques, entradasIniciales),
  );
  const [estado, setEstado] = useState<EstadoGuardado>('sin_cambios');
  const [disparadorDescanso, setDisparadorDescanso] = useState(0);
  const [descansoActual, setDescansoActual] = useState(90);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoEnviado = useRef<string>('');

  const guardar = useCallback(
    async (payload: EntradaRegistrada[]) => {
      const cuerpo = JSON.stringify({ dayIndex, routineId, entries: payload });

      // El borrador se escribe ANTES de intentar la red: si la petición
      // falla o el navegador se cierra, lo tecleado sobrevive.
      try {
        localStorage.setItem(claveBorrador, JSON.stringify({ guardadoEn: Date.now(), entries: payload }));
      } catch {
        // Modo privado o cuota llena: no es motivo para romper el guardado.
      }

      if (cuerpo === ultimoEnviado.current) {
        setEstado('guardado');
        return;
      }

      setEstado('guardando');
      try {
        const respuesta = await fetch(`/api/logs/${date}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: cuerpo,
        });
        if (!respuesta.ok) throw new Error(String(respuesta.status));

        ultimoEnviado.current = cuerpo;
        setEstado('guardado');
        try {
          localStorage.removeItem(claveBorrador);
        } catch {
          /* irrelevante */
        }
      } catch {
        // Se conserva el borrador y se reintenta al recuperar la conexión.
        setEstado('pendiente');
      }
    },
    [claveBorrador, date, dayIndex, routineId],
  );

  const alCambiar = useCallback(
    (exerciseId: string, series: SerieRegistrada[]) => {
      setEntradas((previas) => {
        const siguientes = previas.map((e) => (e.exerciseId === exerciseId ? { ...e, sets: series } : e));

        if (temporizador.current) clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => void guardar(siguientes), DEBOUNCE_MS);

        return siguientes;
      });
      setEstado('guardando');
    },
    [guardar],
  );

  // Recupera el borrador si es más reciente que lo que llegó del servidor.
  // Se hace en un efecto, tras la hidratación: leer localStorage durante el
  // render del servidor provocaría una discrepancia de hidratación.
  const [versionBorrador, setVersionBorrador] = useState(0);
  useEffect(() => {
    try {
      const crudo = localStorage.getItem(claveBorrador);
      if (!crudo) return;
      const borrador = JSON.parse(crudo) as { guardadoEn: number; entries: EntradaRegistrada[] };
      if (!borrador?.entries?.length) return;

      setEntradas(construirEntradas(bloques, borrador.entries));
      // Cambiar la versión remonta los SetTracker, para que los campos no
      // controlados adopten los valores del borrador.
      setVersionBorrador((v) => v + 1);
      setEstado('pendiente');
    } catch {
      /* borrador corrupto: se ignora */
    }
    // Solo al montar: recuperar el borrador es una acción de arranque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reintenta al volver la conexión.
  useEffect(() => {
    const alVolver = () => {
      if (estado === 'pendiente') void guardar(entradas);
    };
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [estado, entradas, guardar]);

  // Avisa si se intenta salir con cambios sin enviar.
  useEffect(() => {
    const alSalir = (e: BeforeUnloadEvent) => {
      if (estado === 'guardando' || estado === 'pendiente') e.preventDefault();
    };
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [estado]);

  const totales = calcularTotales(entradas);
  const completo = totales.setsPlanned > 0 && totales.setsCompleted === totales.setsPlanned;

  return (
    <div>
      <div
        className="flex items-center justify-between gap-3 mb-4 px-3 py-2 rounded-xl border sticky top-14 z-10 backdrop-blur"
        style={{
          borderColor: 'var(--borde)',
          backgroundColor: 'color-mix(in oklch, var(--superficie) 90%, transparent)',
        }}
      >
        <p className="text-sm tabular-nums">
          <strong>{totales.setsCompleted}</strong>
          <span style={{ color: 'var(--texto-suave)' }}>/{totales.setsPlanned} series</span>
          {totales.volumeKg > 0 && (
            <span style={{ color: 'var(--texto-suave)' }}> · {totales.volumeKg} kg</span>
          )}
        </p>
        <EstadoGuardadoUI estado={estado} completo={completo} />
      </div>

      <div className="grid gap-4">
        {bloques.map((bloque) => {
          const entrada = entradas.find((e) => e.exerciseId === bloque.exerciseId);
          if (!entrada) return null;

          return (
            <article
              key={`${bloque.exerciseId}-${bloque.orden}`}
              className="rounded-tarjeta border p-4"
              style={{ borderColor: 'var(--borde)' }}
            >
              <p className="text-xs mb-2" style={{ color: 'var(--texto-suave)' }}>
                {bloque.orden}. {bloque.slotEtiqueta} · objetivo{' '}
                {bloque.medida === 'tiempo'
                  ? `${bloque.sets}×${bloque.segundos}s`
                  : `${bloque.sets}×${bloque.repsMin}-${bloque.repsMax}`}
              </p>

              <ExerciseCard
                nombre={bloque.nombre}
                imagenUrl={bloque.imagenUrl}
                gifUrl={bloque.gifUrl}
                musculo={bloque.musculo}
                equipo={bloque.equipo}
                instrucciones={bloque.instrucciones}
              />

              <div className="mt-3">
                <SetTracker
                  key={`${bloque.exerciseId}-${versionBorrador}`}
                  exerciseId={bloque.exerciseId}
                  series={entrada.sets}
                  medida={bloque.medida}
                  segundos={bloque.segundos}
                  repsMin={bloque.repsMin}
                  repsMax={bloque.repsMax}
                  sugerencia={sugerencias[bloque.exerciseId]}
                  onCambio={alCambiar}
                  onSerieHecha={() => {
                    setDescansoActual(bloque.restSeconds);
                    setDisparadorDescanso((v) => v + 1);
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>

      <RestTimer segundos={descansoActual} disparador={disparadorDescanso} />
    </div>
  );
}

function EstadoGuardadoUI({ estado, completo }: { estado: EstadoGuardado; completo: boolean }) {
  if (completo && estado === 'guardado') {
    return (
      <p className="text-sm font-medium" style={{ color: 'var(--color-exito-500)' }}>
        ✓ Día completado
      </p>
    );
  }

  const textos: Record<EstadoGuardado, string> = {
    sin_cambios: '',
    guardando: 'Guardando…',
    guardado: '✓ Guardado',
    pendiente: 'Sin conexión · guardado local',
  };

  return (
    <p
      className="text-xs"
      role="status"
      aria-live="polite"
      style={{ color: estado === 'pendiente' ? 'var(--color-parcial-500)' : 'var(--texto-suave)' }}
    >
      {textos[estado]}
    </p>
  );
}

/** Une la plantilla de la rutina con lo ya registrado, respetando lo guardado. */
function construirEntradas(
  bloques: readonly BloqueVista[],
  guardadas: readonly EntradaRegistrada[],
): EntradaRegistrada[] {
  return bloques.map((bloque) => {
    const previa = guardadas.find((e) => e.exerciseId === bloque.exerciseId);

    const sets: SerieRegistrada[] = Array.from({ length: bloque.sets }, (_, i) => {
      const numero = i + 1;
      const guardada = previa?.sets.find((s) => s.setNumber === numero);
      return (
        guardada ?? {
          setNumber: numero,
          reps: null,
          weightKg: null,
          done: false,
        }
      );
    });

    return { exerciseId: bloque.exerciseId, sets };
  });
}
