import type { EjercicioDoc } from '@/lib/exercises/repository';
import type { Cuestionario } from '@/lib/coaches/types';

/**
 * Catálogo sintético para los tests.
 *
 * Deliberadamente NO se usa la base de datos: el motor es una función pura
 * (ADR-05) y sus tests deben poder ejecutarse sin red ni Mongo. El catálogo
 * real se prueba aparte, en la verificación del sync.
 */
let contador = 0;

export function ejercicio(parcial: Partial<EjercicioDoc>): EjercicioDoc {
  contador += 1;
  return {
    id: parcial.id ?? `T${String(contador).padStart(4, '0')}`,
    name_en: parcial.name_en ?? 'test exercise',
    name_es: parcial.name_es ?? 'Ejercicio de prueba',
    body_part: parcial.body_part ?? 'chest',
    body_part_es: 'Pecho',
    target: parcial.target ?? 'pectorals',
    target_es: 'Pectorales',
    equipment: parcial.equipment ?? 'dumbbell',
    equipment_es: 'Mancuerna',
    muscle_group: parcial.muscle_group ?? 'chest',
    muscle_group_es: 'Pecho',
    secondary_muscles: [],
    secondary_muscles_es: [],
    instructions: '',
    instruction_steps: [],
    media: { image_url: '', gif_url: '' },
    patterns: parcial.patterns ?? [],
    tags: [],
    ...parcial,
  } as EjercicioDoc;
}

/** Catálogo amplio, con material variado y patrones representativos. */
export function catalogoAmplio(): EjercicioDoc[] {
  const docs: EjercicioDoc[] = [];
  const combinaciones: Array<[string, string, string[]]> = [
    ['chest', 'pectorals', ['horizontal_push']],
    ['back', 'lats', ['vertical_pull']],
    ['back', 'upper back', ['bent_over_row']],
    ['upper legs', 'quads', ['deep_squat']],
    ['upper legs', 'hamstrings', ['hip_hinge_loaded']],
    ['upper legs', 'glutes', ['hip_hinge_loaded']],
    ['shoulders', 'delts', ['overhead_press']],
    ['upper arms', 'biceps', []],
    ['upper arms', 'triceps', []],
    ['lower legs', 'calves', []],
    ['waist', 'abs', ['core_flexion']],
    ['cardio', 'cardiovascular system', ['cardio_impact']],
  ];
  const equipos = ['body weight', 'dumbbell', 'barbell', 'cable', 'leverage machine', 'band', 'kettlebell'];

  for (const [bodyPart, target, patterns] of combinaciones) {
    for (const equipment of equipos) {
      docs.push(
        ejercicio({
          body_part: bodyPart,
          target,
          equipment,
          patterns: patterns as EjercicioDoc['patterns'],
          name_es: `${target} con ${equipment}`,
        }),
      );
    }
  }
  return docs;
}

export function cuestionario(parcial: Partial<Cuestionario> = {}): Cuestionario {
  return {
    experiencia: 'intermedio',
    diasPorSemana: 4,
    minutosPorSesion: 60,
    material: 'gimnasio_completo',
    zonasAEvitar: [],
    objetivoPeso: 'mantener',
    extras: {},
    ...parcial,
  };
}
