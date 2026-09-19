import { useState } from 'react';
import CoachSelector from './CoachSelector';
import type { CoachArchetype, CoachId, QuestionDef } from '@/lib/coaches/types';

interface Props {
  coaches: CoachArchetype[];
  /** Perfil existente, si el usuario rehace el onboarding. */
  inicial?: { coachId: CoachId; respuestas: Record<string, unknown> } | null;
}

type Valor = string | string[] | number;

const ZONAS = [
  { valor: 'hombro', etiqueta: 'Hombro' },
  { valor: 'rodilla', etiqueta: 'Rodilla' },
  { valor: 'lumbar', etiqueta: 'Zona lumbar' },
  { valor: 'codo', etiqueta: 'Codo' },
  { valor: 'cuello', etiqueta: 'Cuello' },
  { valor: 'muñeca', etiqueta: 'Muñeca' },
  { valor: 'cadera', etiqueta: 'Cadera' },
] as const;

const PREGUNTAS_BASE: QuestionDef[] = [
  {
    id: 'experiencia',
    pregunta: '¿Cuánta experiencia tienes entrenando?',
    tipo: 'opcion',
    requerida: true,
    opciones: [
      { valor: 'principiante', etiqueta: 'Principiante: menos de 6 meses' },
      { valor: 'intermedio', etiqueta: 'Intermedio: entre 6 meses y 2 años' },
      { valor: 'avanzado', etiqueta: 'Avanzado: más de 2 años constante' },
    ],
  },
  {
    id: 'diasPorSemana',
    pregunta: '¿Cuántos días por semana puedes entrenar?',
    ayuda: 'Sé realista: es mejor cumplir 3 días que fallar 5.',
    tipo: 'opcion',
    requerida: true,
    opciones: [2, 3, 4, 5, 6].map((n) => ({ valor: String(n), etiqueta: `${n} días` })),
  },
  {
    id: 'minutosPorSesion',
    pregunta: '¿De cuánto tiempo dispones por sesión?',
    tipo: 'opcion',
    requerida: true,
    opciones: [30, 45, 60, 90].map((n) => ({ valor: String(n), etiqueta: `${n} minutos` })),
  },
  {
    id: 'material',
    pregunta: '¿Con qué material cuentas?',
    tipo: 'opcion',
    requerida: true,
    opciones: [
      { valor: 'casa_sin_equipo', etiqueta: 'En casa, sin equipo' },
      { valor: 'casa_mancuernas', etiqueta: 'En casa, con mancuernas o bandas' },
      { valor: 'gimnasio_basico', etiqueta: 'Gimnasio básico: barras y máquinas' },
      { valor: 'gimnasio_completo', etiqueta: 'Gimnasio completo' },
    ],
  },
  {
    id: 'objetivoPeso',
    pregunta: '¿Cuál es tu objetivo con el peso corporal?',
    tipo: 'opcion',
    requerida: true,
    opciones: [
      { valor: 'perder', etiqueta: 'Perder grasa' },
      { valor: 'mantener', etiqueta: 'Mantenerme' },
      { valor: 'ganar', etiqueta: 'Ganar masa' },
    ],
  },
  {
    id: 'zonasAEvitar',
    pregunta: '¿Hay alguna zona que debamos evitar?',
    ayuda: 'Marca las que te den molestias. Excluiré los movimientos que las carguen.',
    tipo: 'multiple',
    requerida: false,
    opciones: ZONAS,
  },
];

export default function Questionnaire({ coaches, inicial = null }: Props) {
  const [paso, setPaso] = useState(inicial ? 1 : 0);
  const [coachId, setCoachId] = useState<CoachId | null>(inicial?.coachId ?? null);
  const [respuestas, setRespuestas] = useState<Record<string, Valor>>(
    (inicial?.respuestas as Record<string, Valor>) ?? { zonasAEvitar: [] },
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const coach = coaches.find((c) => c.id === coachId) ?? null;
  // Las preguntas del último paso dependen del coach: por eso el cuestionario
  // no puede ser una lista estática.
  const pasos: Array<{ titulo: string; preguntas: QuestionDef[] }> = [
    { titulo: 'Elige tu entrenador', preguntas: [] },
    { titulo: 'Sobre ti', preguntas: PREGUNTAS_BASE },
    { titulo: coach ? `${coach.nombre} quiere saber…` : 'Afinemos', preguntas: coach?.preguntasExtra ?? [] },
  ];

  const pasoActual = pasos[paso]!;
  const esUltimo = paso === pasos.length - 1;

  const fijar = (id: string, valor: Valor) => {
    setRespuestas((prev) => ({ ...prev, [id]: valor }));
    setError(null);
  };

  const alternarMultiple = (id: string, valor: string) => {
    const actuales = (respuestas[id] as string[] | undefined) ?? [];
    fijar(id, actuales.includes(valor) ? actuales.filter((v) => v !== valor) : [...actuales, valor]);
  };

  const faltantes = (preguntas: QuestionDef[]) =>
    preguntas.filter((p) => {
      if (!p.requerida) return false;
      const v = respuestas[p.id];
      return v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
    });

  const siguiente = () => {
    if (paso === 0 && !coachId) {
      setError('Elige un entrenador para continuar.');
      return;
    }
    const pendientes = faltantes(pasoActual.preguntas);
    if (pendientes.length) {
      setError(`Falta responder: ${pendientes[0]!.pregunta}`);
      return;
    }
    setError(null);
    setPaso((p) => p + 1);
  };

  const enviar = async () => {
    const pendientes = faltantes(pasoActual.preguntas);
    if (pendientes.length) {
      setError(`Falta responder: ${pendientes[0]!.pregunta}`);
      return;
    }

    setEnviando(true);
    setError(null);

    const idsExtra = new Set((coach?.preguntasExtra ?? []).map((p) => p.id));
    const extras: Record<string, Valor> = {};
    for (const [clave, valor] of Object.entries(respuestas)) {
      if (idsExtra.has(clave)) extras[clave] = valor;
    }

    const cuerpo = {
      coachId,
      cuestionario: {
        experiencia: respuestas['experiencia'],
        diasPorSemana: Number(respuestas['diasPorSemana']),
        minutosPorSesion: Number(respuestas['minutosPorSesion']),
        material: respuestas['material'],
        objetivoPeso: respuestas['objetivoPeso'],
        zonasAEvitar: (respuestas['zonasAEvitar'] as string[]) ?? [],
        extras,
      },
    };

    const respuesta = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });

    if (!respuesta.ok) {
      const datos = (await respuesta.json().catch(() => null)) as { error?: string; errores?: string[] } | null;
      setError(datos?.errores?.[0] ?? datos?.error ?? 'No se pudo guardar. Inténtalo de nuevo.');
      setEnviando(false);
      return;
    }

    window.location.href = '/';
  };

  return (
    <div>
      <ol className="flex items-center gap-2 mb-6 text-sm" aria-label="Progreso">
        {pasos.map((p, i) => (
          <li key={p.titulo} className="flex items-center gap-2">
            <span
              className={[
                'w-7 h-7 rounded-full grid place-items-center text-xs font-medium',
                i <= paso ? 'bg-acento-500 text-white' : '',
              ].join(' ')}
              style={i <= paso ? undefined : { backgroundColor: 'var(--superficie-alt)', color: 'var(--texto-suave)' }}
              aria-current={i === paso ? 'step' : undefined}
            >
              {i + 1}
            </span>
            {i < pasos.length - 1 && <span aria-hidden="true" style={{ color: 'var(--borde)' }}>—</span>}
          </li>
        ))}
      </ol>

      <h2 className="text-xl font-bold mb-5">{pasoActual.titulo}</h2>

      {paso === 0 && (
        <CoachSelector coaches={coaches} seleccionado={coachId} onSeleccionar={setCoachId} />
      )}

      {paso > 0 && (
        <div className="grid gap-6">
          {pasoActual.preguntas.map((p) => (
            <Pregunta
              key={p.id}
              definicion={p}
              valor={respuestas[p.id]}
              onFijar={(v) => fijar(p.id, v)}
              onAlternar={(v) => alternarMultiple(p.id, v)}
            />
          ))}
          {pasoActual.preguntas.length === 0 && (
            <p style={{ color: 'var(--texto-suave)' }}>Este entrenador no necesita más datos.</p>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="text-sm rounded-lg px-3 py-2 border mt-5"
          style={{
            color: 'var(--color-fallo-500)',
            borderColor: 'var(--color-fallo-500)',
            backgroundColor: 'color-mix(in oklch, var(--color-fallo-500) 8%, transparent)',
          }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-8">
        {paso > 0 && (
          <button
            type="button"
            onClick={() => { setPaso((p) => p - 1); setError(null); }}
            className="min-h-11 px-5 rounded-xl border font-medium transition-colors hover:border-acento-300"
            style={{ borderColor: 'var(--borde)' }}
          >
            Atrás
          </button>
        )}
        <button
          type="button"
          onClick={esUltimo ? enviar : siguiente}
          disabled={enviando}
          className="min-h-11 px-5 rounded-xl bg-acento-500 text-white font-medium transition-colors hover:bg-acento-600 disabled:opacity-60 ml-auto"
        >
          {enviando ? 'Guardando…' : esUltimo ? 'Crear mi rutina' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}

function Pregunta({
  definicion,
  valor,
  onFijar,
  onAlternar,
}: {
  definicion: QuestionDef;
  valor: Valor | undefined;
  onFijar: (v: Valor) => void;
  onAlternar: (v: string) => void;
}) {
  const { id, pregunta, ayuda, tipo, opciones = [], min = 0, max = 10 } = definicion;

  return (
    <fieldset>
      <legend className="font-medium mb-1">
        {pregunta}
        {!definicion.requerida && (
          <span className="font-normal text-sm ml-2" style={{ color: 'var(--texto-suave)' }}>
            (opcional)
          </span>
        )}
      </legend>
      {ayuda && (
        <p className="text-sm mb-3" style={{ color: 'var(--texto-suave)' }}>{ayuda}</p>
      )}

      {tipo === 'escala' ? (
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={min}
            max={max}
            value={Number(valor ?? min)}
            onChange={(e) => onFijar(Number(e.target.value))}
            className="flex-1 accent-acento-500 min-h-11"
            aria-describedby={`${id}-valor`}
          />
          <output id={`${id}-valor`} className="tabular-nums font-medium w-8 text-right">
            {Number(valor ?? min)}
          </output>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {opciones.map((op) => {
            const multiple = tipo === 'multiple';
            const activo = multiple
              ? ((valor as string[] | undefined) ?? []).includes(op.valor)
              : valor === op.valor;

            return (
              <label
                key={op.valor}
                className={[
                  'flex items-center gap-3 min-h-11 px-4 rounded-xl border cursor-pointer transition-colors',
                  activo ? 'border-acento-500' : 'hover:border-acento-300',
                ].join(' ')}
                style={{
                  borderColor: activo ? undefined : 'var(--borde)',
                  backgroundColor: activo
                    ? 'color-mix(in oklch, var(--color-acento-500) 8%, transparent)'
                    : undefined,
                }}
              >
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={id}
                  value={op.valor}
                  checked={activo}
                  onChange={() => (multiple ? onAlternar(op.valor) : onFijar(op.valor))}
                  className="accent-acento-500"
                />
                <span className="text-sm">{op.etiqueta}</span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
