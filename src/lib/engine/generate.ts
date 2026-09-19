import type { CoachArchetype, Cuestionario, SlotType } from '@/lib/coaches/types';
import type { EjercicioDoc } from '@/lib/exercises/repository';
import { crearAleatorio, derivarSemilla, type Aleatorio } from './prng';
import { resolverRestricciones, type Restricciones } from './constraints';
import { DEFINICIONES, recortarPorTiempo } from './slots';
import { puntuar } from './scoring';

/**
 * Motor determinista de rutinas (§6).
 *
 * FUNCIÓN PURA: recibe el cuestionario, el arquetipo de coach y el catálogo
 * ya cargado; devuelve la rutina. No hace fetch ni toca la base de datos.
 * Eso la hace testeable sin mocks, reproducible y fácil de razonar.
 */

export interface BloqueRutina {
  exerciseId: string;
  orden: number;
  slot: SlotType;
  slotEtiqueta: string;
  sets: number;
  /** Cómo se mide el trabajo. Movilidad y cardio van por tiempo, no por reps. */
  medida: 'reps' | 'tiempo';
  repsMin: number;
  repsMax: number;
  /** Solo cuando `medida` es 'tiempo'. */
  segundos?: number;
  restSeconds: number;
  /** Nota visible cuando hubo que relajar restricciones. */
  nota?: string;
}

export interface DiaRutina {
  dayIndex: number;
  etiqueta: string;
  foco: string[];
  bloques: BloqueRutina[];
  /** Nivel de relajación que hizo falta, 0 = ninguna. */
  nivelRelajacion: number;
  /** Aviso si el día salió más corto de lo previsto. */
  aviso?: string;
}

export interface Rutina {
  coachId: string;
  splitNombre: string;
  seed: string;
  version: number;
  dias: DiaRutina[];
  avisos: string[];
  generadaEn: Date;
}

export interface EntradaGeneracion {
  userId: string;
  coach: CoachArchetype;
  cuestionario: Cuestionario;
  /** Catálogo completo ya cargado. El motor no consulta la base de datos. */
  catalogo: EjercicioDoc[];
  salt: string;
  version?: number;
}

/**
 * Niveles de degradación (§6.5).
 *
 * Con «casa sin equipo» + evitar hombro, rodilla y lumbar, un pool puede
 * quedarse vacío. Antes que devolver un día vacío o lanzar una excepción a
 * la cara del usuario, se relajan restricciones por niveles, registrando
 * cuál hizo falta para poder avisarle.
 *
 * Lo que NUNCA se relaja son las exclusiones por lesión: son seguridad, no
 * preferencia.
 */
const NIVELES = [
  'ninguna',
  'ignorar_equipo_preferido',
  'permitir_musculo_secundario',
  'permitir_repetir_ejercicio',
  'sustituir_por_seguro',
] as const;

export function generarRutina(entrada: EntradaGeneracion): Rutina {
  const { coach, cuestionario, catalogo, userId, salt } = entrada;
  const version = entrada.version ?? 1;

  const seed = derivarSemilla({ salt, userId, coachId: coach.id, cuestionario, version });
  const rng = crearAleatorio(seed);
  const restricciones = resolverRestricciones(coach, cuestionario);

  // Filtro duro: lo que ni siquiera compite.
  const permitidos = catalogo.filter((e) => cumpleRestricciones(e, restricciones));

  const split = coach.splitMatrix[cuestionario.diasPorSemana];
  const yaElegidos: EjercicioDoc[] = [];
  const dias: DiaRutina[] = [];

  for (const [indice, plantilla] of split.dias.entries()) {
    const slots = recortarPorTiempo(
      plantilla.slots,
      cuestionario.minutosPorSesion,
      coach.prescripcion.minutosPorEjercicio,
      coach.prescripcion.ejerciciosPorSesion[0],
    );

    const bloques: BloqueRutina[] = [];
    let nivelMaximo = 0;

    for (const [orden, slot] of slots.entries()) {
      const eleccion = elegirParaSlot({
        slot,
        foco: plantilla.foco,
        permitidos,
        catalogo,
        restricciones,
        cuestionario,
        yaElegidos,
        rng,
      });

      if (!eleccion) continue;

      nivelMaximo = Math.max(nivelMaximo, eleccion.nivel);
      yaElegidos.push(eleccion.ejercicio);
      bloques.push(construirBloque(eleccion.ejercicio, slot, orden, coach, restricciones, eleccion.nivel));
    }

    const minimo = coach.prescripcion.ejerciciosPorSesion[0];
    dias.push({
      dayIndex: indice,
      etiqueta: plantilla.etiqueta,
      foco: [...plantilla.foco],
      bloques,
      nivelRelajacion: nivelMaximo,
      ...(bloques.length < minimo
        ? {
            aviso: `Con tu material y tus limitaciones solo se han podido programar ${bloques.length} ejercicio${bloques.length === 1 ? '' : 's'} este día.`,
          }
        : {}),
    });
  }

  const avisos = [...restricciones.avisos];
  if (dias.some((d) => d.nivelRelajacion >= 3)) {
    avisos.push('Algunos ejercicios se repiten entre días: con tu material disponible no hay más variedad.');
  }

  return {
    coachId: coach.id,
    splitNombre: split.nombre,
    seed,
    version,
    dias,
    avisos,
    generadaEn: new Date(),
  };
}

/** Restricciones duras. Las de lesión nunca se relajan. */
function cumpleRestricciones(ejercicio: EjercicioDoc, r: Restricciones): boolean {
  if (!r.equipoDisponible.includes(ejercicio.equipment)) return false;
  if (r.targetsExcluidos.includes(ejercicio.target)) return false;
  if (ejercicio.patterns.some((p) => r.patronesExcluidos.includes(p))) return false;
  return true;
}

interface ArgsEleccion {
  slot: SlotType;
  foco: string[];
  permitidos: EjercicioDoc[];
  catalogo: EjercicioDoc[];
  restricciones: Restricciones;
  cuestionario: Cuestionario;
  yaElegidos: EjercicioDoc[];
  rng: Aleatorio;
}

function elegirParaSlot(args: ArgsEleccion): { ejercicio: EjercicioDoc; nivel: number } | null {
  const definicion = DEFINICIONES[args.slot];

  for (let nivel = 0; nivel < NIVELES.length; nivel += 1) {
    const candidatos = candidatosParaNivel(args, nivel);
    if (!candidatos.length) continue;

    const contexto = {
      slot: args.slot,
      focoDia: args.foco,
      restricciones:
        nivel >= 1 ? { ...args.restricciones, equipoPreferido: [] } : args.restricciones,
      experiencia: args.cuestionario.experiencia,
      yaElegidos: nivel >= 3 ? [] : args.yaElegidos,
    };

    // Se puntúa, se ordena y se desempata con el PRNG sembrado: así la
    // elección es reproducible pero no siempre la misma para todos.
    const puntuados = args.rng
      .barajar(candidatos)
      .map((e) => ({ ejercicio: e, puntos: puntuar(e, contexto) }))
      .sort((a, b) => b.puntos - a.puntos);

    const mejor = puntuados[0];
    if (mejor) return { ejercicio: mejor.ejercicio, nivel };
  }

  void definicion;
  return null;
}

function candidatosParaNivel(args: ArgsEleccion, nivel: number): EjercicioDoc[] {
  const definicion = DEFINICIONES[args.slot];
  const usados = new Set(args.yaElegidos.map((e) => e.id));

  const base = args.permitidos.filter((e) => {
    if (nivel < 3 && usados.has(e.id)) return false;

    if (definicion.patronesProhibidos?.some((p) => e.patterns.includes(p))) return false;

    // Nivel 4: solo se exige que sea seguro; se ignoran foco y ranura.
    if (nivel >= 4) return true;

    // Los patrones prohibidos de la ranura no se relajan en ningún nivel:
    // un estiramiento nunca es un accesorio de fuerza, por escaso que sea
    // el material disponible.
    if (definicion.patronesProhibidos?.some((p) => e.patterns.includes(p))) return false;

    if (definicion.bodyParts && !definicion.bodyParts.includes(e.body_part)) return false;

    const enFoco = args.foco.includes(e.body_part);
    const targetEncaja = definicion.targets.length === 0 || definicion.targets.includes(e.target);

    // Nivel 2: se acepta que el músculo del día sea secundario, no principal.
    if (nivel >= 2) return enFoco || targetEncaja;

    if (!enFoco) return false;
    if (!targetEncaja) return false;

    // Movilidad exige estiramiento en todos los niveles; los compuestos solo
    // en el nivel 0, porque ahí sí conviene poder relajar.
    if (definicion.patronesRequeridos) {
      const exigirSiempre = args.slot === 'movilidad';
      if (exigirSiempre || nivel === 0) {
        return e.patterns.some((p) => definicion.patronesRequeridos!.includes(p));
      }
    }
    return true;
  });

  return base;
}

function construirBloque(
  ejercicio: EjercicioDoc,
  slot: SlotType,
  orden: number,
  coach: CoachArchetype,
  restricciones: Restricciones,
  nivel: number,
): BloqueRutina {
  const p = coach.prescripcion;
  let sets = p.setsPorSlot[slot] ?? 3;
  const rango = p.repRange[slot] ?? [8, 12];
  const descanso = p.restSeconds[slot] ?? 90;

  // Grupo prioritario: una serie extra (extras de Hipertrofia).
  if (restricciones.grupoPrioritario && ejercicio.body_part === restricciones.grupoPrioritario) {
    sets += 1;
  }
  // Tope por dolor alto (extras de Salud). Se aplica el último: es seguridad.
  if (restricciones.topeSeries !== null) sets = Math.min(sets, restricciones.topeSeries);

  const definicion = DEFINICIONES[slot];

  // Prescribir "1-1 repeticiones" para un estiramiento o un final metabólico
  // no significa nada para quien lo lee. Esas ranuras se miden en segundos.
  const porTiempo = definicion.medida === 'tiempo';
  const segundos = slot === 'movilidad' ? 40 : 60;

  return {
    exerciseId: ejercicio.id,
    orden: orden + 1,
    slot,
    slotEtiqueta: definicion.etiqueta,
    sets,
    medida: definicion.medida,
    repsMin: porTiempo ? 1 : rango[0],
    repsMax: porTiempo ? 1 : rango[1],
    ...(porTiempo ? { segundos } : {}),
    restSeconds: descanso,
    ...(nivel >= 2 ? { nota: 'Adaptado a tu material y limitaciones disponibles.' } : {}),
  };
}
