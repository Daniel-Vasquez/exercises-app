import type { Equipment } from '@/lib/i18n/equipment.es';
import type { BodyPart } from '@/lib/i18n/body-parts.es';
import type { ZonaLesion } from '@/lib/engine/patterns';

/**
 * Los 4 arquetipos de entrenador (§5 de planificacion.md).
 *
 * Son DATOS PUROS: sin IA, sin llamadas externas, sin estado. Cada coach
 * aporta identidad, parámetros de prescripción, matriz de splits y las
 * preguntas extra con las que adapta el cuestionario.
 *
 * El motor de rutinas (Tanda 4) consume este objeto tal cual; cambiar la
 * filosofía de un coach es cambiar datos, no lógica.
 */

export type CoachId = 'fuerza' | 'hipertrofia' | 'definicion' | 'salud';

/**
 * Ranuras de una sesión. La abstracción central del motor: un día no es
 * "6 ejercicios de pecho" sino una secuencia de ROLES, lo que garantiza
 * sesiones estructuralmente sanas (lo pesado y compuesto primero, los
 * aislados al final) sea cual sea el ejercicio concreto que salga elegido.
 */
export const SLOTS = [
  'compuesto_principal',
  'compuesto_secundario',
  'accesorio_empuje',
  'accesorio_traccion',
  'accesorio_pierna',
  'aislado',
  'core',
  'cardio_finisher',
  'movilidad',
] as const;

export type SlotType = (typeof SLOTS)[number];

/** Un día dentro de una plantilla de split. */
export interface DiaPlantilla {
  etiqueta: string;
  /** Zonas del cuerpo en las que se centra el día. */
  foco: BodyPart[];
  /** Ranuras en orden de ejecución. */
  slots: SlotType[];
}

export interface SplitTemplate {
  nombre: string;
  dias: DiaPlantilla[];
}

export type Experiencia = 'principiante' | 'intermedio' | 'avanzado';
export type Material = 'casa_sin_equipo' | 'casa_mancuernas' | 'gimnasio_basico' | 'gimnasio_completo';
export type ObjetivoPeso = 'perder' | 'mantener' | 'ganar';
export type DiasPorSemana = 2 | 3 | 4 | 5 | 6;

/** Pregunta extra con la que un coach adapta el cuestionario. */
export interface QuestionDef {
  id: string;
  pregunta: string;
  /** Texto de apoyo opcional bajo la pregunta. */
  ayuda?: string;
  tipo: 'opcion' | 'multiple' | 'escala';
  opciones?: ReadonlyArray<{ valor: string; etiqueta: string }>;
  /** Solo para `escala`. */
  min?: number;
  max?: number;
  requerida: boolean;
}

export interface Prescripcion {
  setsPorSlot: Partial<Record<SlotType, number>>;
  repRange: Partial<Record<SlotType, readonly [number, number]>>;
  restSeconds: Partial<Record<SlotType, number>>;
  /** Mínimo y máximo de ejercicios por sesión. */
  ejerciciosPorSesion: readonly [number, number];
  /** Minutos estimados por ejercicio, para recortar según el tiempo disponible. */
  minutosPorEjercicio: number;
}

export interface CoachArchetype {
  id: CoachId;
  nombre: string;
  titulo: string;
  filosofia: string;
  paraQuien: string;
  emoji: string;
  /** Token de color de Tailwind definido en global.css. */
  acento: string;

  prescripcion: Prescripcion;

  /** Equipamiento que el coach prioriza al puntuar ejercicios (§6.3). */
  equipoPreferido: Equipment[];
  /** Equipamiento que penaliza fuertemente. */
  equipoVetado: Equipment[];

  splitMatrix: Record<DiasPorSemana, SplitTemplate>;
  preguntasExtra: QuestionDef[];

  progresion: 'lineal' | 'doble' | 'densidad' | 'tecnica';
  /** Cómo se explica la progresión al usuario, en su idioma. */
  progresionTexto: string;
}

/** Respuestas del cuestionario base, comunes a los 4 coaches. */
export interface RespuestasBase {
  experiencia: Experiencia;
  diasPorSemana: DiasPorSemana;
  minutosPorSesion: 30 | 45 | 60 | 90;
  material: Material;
  zonasAEvitar: ZonaLesion[];
  objetivoPeso: ObjetivoPeso;
}

export interface Cuestionario extends RespuestasBase {
  /** Respuestas a las preguntas extra del coach elegido. */
  extras: Record<string, string | string[] | number>;
}
