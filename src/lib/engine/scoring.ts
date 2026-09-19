import type { EjercicioDoc } from '@/lib/exercises/repository';
import type { SlotType } from '@/lib/coaches/types';
import { DEFINICIONES, esCompuesto } from './slots';
import type { Restricciones } from './constraints';

/**
 * Puntuación de un ejercicio para una ranura concreta (§6.3).
 *
 * El scoring decide qué es MEJOR entre lo permitido; las restricciones duras
 * ya decidieron qué es POSIBLE. Un ejercicio vetado no compite aquí: se
 * eliminó antes.
 */

export interface ContextoScoring {
  slot: SlotType;
  /** Partes del cuerpo del foco del día. */
  focoDia: string[];
  restricciones: Restricciones;
  experiencia: 'principiante' | 'intermedio' | 'avanzado';
  /** Ejercicios ya elegidos en toda la rutina, para penalizar repeticiones. */
  yaElegidos: EjercicioDoc[];
}

export function puntuar(ejercicio: EjercicioDoc, contexto: ContextoScoring): number {
  const definicion = DEFINICIONES[contexto.slot];
  let puntos = 0;

  // Equipo que el coach prioriza: es la señal más fuerte de su filosofía.
  if (contexto.restricciones.equipoPreferido.includes(ejercicio.equipment)) puntos += 40;
  if (contexto.restricciones.equipoVetado.includes(ejercicio.equipment)) puntos -= 50;

  // Encaje del patrón con el rol de la ranura.
  const compuesto = esCompuesto(ejercicio.patterns);
  if (definicion.prefiereCompuesto && compuesto) puntos += 30;
  if (!definicion.prefiereCompuesto && !compuesto) puntos += 20;
  if (!definicion.prefiereCompuesto && compuesto) puntos -= 10;

  // El músculo objetivo es el foco principal del día, no solo secundario.
  if (definicion.targets.includes(ejercicio.target)) puntos += 20;
  if (contexto.focoDia.includes(ejercicio.body_part)) puntos += 15;

  // Grupo prioritario del usuario (extras de Hipertrofia).
  const prioritario = contexto.restricciones.grupoPrioritario;
  if (prioritario && ejercicio.body_part === prioritario) puntos += 15;

  // Complejidad acorde a la experiencia: a un principiante no se le programa
  // una arrancada olímpica aunque encaje en la ranura.
  puntos += ajustePorExperiencia(ejercicio, contexto.experiencia);

  // Variedad: penaliza duplicar el mismo estímulo dentro de la rutina.
  puntos -= penalizacionSimilitud(ejercicio, contexto.yaElegidos);

  return puntos;
}

const EQUIPO_TECNICO = ['olympic barbell', 'barbell', 'trap bar', 'bosu ball'];

function ajustePorExperiencia(
  ejercicio: EjercicioDoc,
  experiencia: ContextoScoring['experiencia'],
): number {
  const tecnico = EQUIPO_TECNICO.includes(ejercicio.equipment);
  if (experiencia === 'principiante') return tecnico ? -15 : 10;
  if (experiencia === 'avanzado') return tecnico ? 10 : 0;
  return 0;
}

/**
 * Penaliza el parecido con lo ya elegido.
 *
 * Sin esto salen rutinas con tres variantes del mismo curl: el scoring las
 * puntúa igual de bien porque, aisladamente, las tres son buenas.
 */
function penalizacionSimilitud(ejercicio: EjercicioDoc, yaElegidos: readonly EjercicioDoc[]): number {
  let penalizacion = 0;

  for (const previo of yaElegidos) {
    if (previo.id === ejercicio.id) return 1000; // nunca repetir el mismo
    const mismoTarget = previo.target === ejercicio.target;
    const mismoEquipo = previo.equipment === ejercicio.equipment;
    const patronComun = previo.patterns.some((p) => ejercicio.patterns.includes(p as never));

    if (mismoTarget && patronComun) penalizacion += 25;
    else if (mismoTarget && mismoEquipo) penalizacion += 15;
    else if (mismoTarget) penalizacion += 8;
  }

  return penalizacion;
}
