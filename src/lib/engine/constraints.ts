import type { CoachArchetype, Cuestionario, Material } from '@/lib/coaches/types';
import { EXCLUSIONES_POR_ZONA, type Patron, type ZonaLesion } from './patterns';
import type { Equipment } from '@/lib/i18n/equipment.es';

/**
 * Traduce las respuestas del cuestionario a restricciones duras (§6.1, paso 1).
 *
 * Aquí se decide QUÉ puede aparecer; el scoring decide después qué es MEJOR.
 * Separarlo importa: una restricción por lesión no es una preferencia que se
 * pueda compensar con una puntuación alta.
 */

/** Material disponible según lo que declaró el usuario. */
const EQUIPO_POR_MATERIAL: Record<Material, Equipment[]> = {
  casa_sin_equipo: ['body weight', 'assisted'],
  casa_mancuernas: ['body weight', 'dumbbell', 'band', 'resistance band', 'kettlebell', 'stability ball', 'medicine ball', 'roller', 'wheel roller', 'assisted'],
  gimnasio_basico: ['body weight', 'dumbbell', 'barbell', 'ez barbell', 'band', 'resistance band', 'kettlebell', 'cable', 'leverage machine', 'smith machine', 'bench', 'assisted', 'stability ball', 'medicine ball', 'roller'] as Equipment[],
  gimnasio_completo: [
    'assisted', 'band', 'barbell', 'body weight', 'bosu ball', 'cable', 'dumbbell',
    'elliptical machine', 'ez barbell', 'hammer', 'kettlebell', 'leverage machine',
    'medicine ball', 'olympic barbell', 'resistance band', 'roller', 'rope',
    'skierg machine', 'sled machine', 'smith machine', 'stability ball',
    'stationary bike', 'stepmill machine', 'tire', 'trap bar', 'upper body ergometer',
    'weighted', 'wheel roller',
  ],
};

export interface Restricciones {
  /** Equipos que el usuario puede usar. */
  equipoDisponible: string[];
  /** Equipos que el coach prioriza, ya intersecados con lo disponible. */
  equipoPreferido: string[];
  /** Equipos penalizados por el coach. */
  equipoVetado: string[];
  /** Músculos objetivo excluidos por lesión. */
  targetsExcluidos: string[];
  /** Patrones de movimiento excluidos por lesión o por el contexto del coach. */
  patronesExcluidos: Patron[];
  /** Grupo muscular al que dar prioridad (extras de Hipertrofia). */
  grupoPrioritario: string | null;
  /** Tope de series por ejercicio, si alguna respuesta lo impone. */
  topeSeries: number | null;
  /** Avisos que se mostrarán al usuario junto a la rutina. */
  avisos: string[];
}

function comoTexto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export function resolverRestricciones(
  coach: CoachArchetype,
  cuestionario: Cuestionario,
): Restricciones {
  const avisos: string[] = [];
  let equipoDisponible: string[] = [...EQUIPO_POR_MATERIAL[cuestionario.material]];
  const targetsExcluidos = new Set<string>();
  const patronesExcluidos = new Set<Patron>();
  let grupoPrioritario: string | null = null;
  let topeSeries: number | null = null;

  // --- Lesiones (§6.6) ------------------------------------------------------
  for (const zona of cuestionario.zonasAEvitar as ZonaLesion[]) {
    const exclusion = EXCLUSIONES_POR_ZONA[zona];
    if (!exclusion) continue;
    for (const t of exclusion.targets) targetsExcluidos.add(t);
    for (const p of exclusion.patrones) patronesExcluidos.add(p);
  }
  if (cuestionario.zonasAEvitar.length) {
    avisos.push(`Se han excluido los movimientos que cargan: ${cuestionario.zonasAEvitar.join(', ')}.`);
  }

  // --- Extras específicos del coach ----------------------------------------
  const extras = cuestionario.extras ?? {};

  if (coach.id === 'fuerza') {
    // Sin técnica en los básicos, la barra libre es un riesgo: se sustituye
    // por guiado. Es la diferencia entre progresar y lesionarse.
    if (comoTexto(extras['tecnica_basicos']) === 'no') {
      equipoDisponible = equipoDisponible.filter((e) => e !== 'barbell' && e !== 'olympic barbell');
      avisos.push('Sin técnica en los básicos, se han sustituido las barras libres por máquinas guiadas.');
    }
    // Sin rack no se puede sacar una sentadilla trasera ni un press de pie
    // con seguridad: sin soporte donde dejar la barra, un fallo es peligroso.
    if (comoTexto(extras['tiene_rack']) === 'no') {
      patronesExcluidos.add('deep_squat');
      patronesExcluidos.add('overhead_press');
      avisos.push('Sin rack, se han evitado sentadilla trasera y press militar de pie.');
    }
  }

  if (coach.id === 'hipertrofia') {
    const prioridad = comoTexto(extras['grupo_prioritario']);
    if (prioridad) {
      grupoPrioritario = prioridad;
      avisos.push('Tu grupo prioritario recibe un ejercicio y una serie extra.');
    }
  }

  if (coach.id === 'definicion') {
    if (comoTexto(extras['impacto']) === 'no') {
      patronesExcluidos.add('jump');
      patronesExcluidos.add('cardio_impact');
      avisos.push('Sin impacto: se han evitado saltos y pliométricos.');
    }
    if (comoTexto(extras['relacion_cardio']) === 'odio') {
      avisos.push('Los finales son circuitos con pesas en vez de bloques de cardio.');
    }
  }

  if (coach.id === 'salud') {
    // Tras nuca carga el hombro en rotación externa extrema: no encaja con
    // un coach cuya premisa es que nadie se lesione ni abandone.
    patronesExcluidos.add('behind_neck');

    const dolor = Number(extras['dolor_actual'] ?? 0);
    if (Number.isFinite(dolor) && dolor >= 5) {
      // Con dolor alto se reduce a lo más controlable y se baja el volumen:
      // el objetivo es moverse sin empeorar, no entrenar duro.
      equipoDisponible = equipoDisponible.filter((e) =>
        ['body weight', 'assisted', 'leverage machine', 'band', 'resistance band'].includes(e),
      );
      topeSeries = 2;
      avisos.push('Con dolor de 5 o más, la rutina se limita a peso corporal y máquinas asistidas, con menos series.');
    }
  }

  // El veto del coach recorta lo disponible, pero nunca lo deja vacío.
  const trasVeto = equipoDisponible.filter((e) => !coach.equipoVetado.includes(e as Equipment));
  if (trasVeto.length) equipoDisponible = trasVeto;

  const equipoPreferido = coach.equipoPreferido.filter((e) => equipoDisponible.includes(e));

  return {
    equipoDisponible,
    equipoPreferido,
    equipoVetado: [...coach.equipoVetado],
    targetsExcluidos: [...targetsExcluidos],
    patronesExcluidos: [...patronesExcluidos],
    grupoPrioritario,
    topeSeries,
    avisos,
  };
}
