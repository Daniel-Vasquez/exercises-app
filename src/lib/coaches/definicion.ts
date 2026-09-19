import type { CoachArchetype } from './types';

/**
 * Kenji "El Motor" — Pérdida de grasa / funcional.
 *
 * Alta densidad: muchos ejercicios, descansos cortos, formato circuito.
 * La progresión es por DENSIDAD (bajar el descanso), no por carga, para que
 * las sesiones no se alarguen cuando el objetivo es precisamente el tiempo.
 */
export const DEFINICION: CoachArchetype = {
  id: 'definicion',
  nombre: 'Kenji',
  titulo: 'El Motor',
  filosofia: 'La grasa se derrite con densidad y constancia, no con castigo.',
  paraQuien: 'Quieres recomposición corporal y tienes poco tiempo por sesión.',
  emoji: '🔥',
  acento: 'acento',

  prescripcion: {
    setsPorSlot: {
      compuesto_principal: 3,
      compuesto_secundario: 3,
      accesorio_empuje: 3,
      accesorio_traccion: 3,
      accesorio_pierna: 3,
      aislado: 2,
      core: 3,
      cardio_finisher: 1,
      movilidad: 1,
    },
    repRange: {
      compuesto_principal: [12, 15],
      compuesto_secundario: [12, 15],
      accesorio_empuje: [15, 20],
      accesorio_traccion: [15, 20],
      accesorio_pierna: [15, 20],
      aislado: [15, 20],
      core: [15, 25],
      cardio_finisher: [1, 1],
      movilidad: [1, 1],
    },
    restSeconds: {
      compuesto_principal: 45,
      compuesto_secundario: 45,
      accesorio_empuje: 30,
      accesorio_traccion: 30,
      accesorio_pierna: 30,
      aislado: 30,
      core: 30,
      cardio_finisher: 60,
      movilidad: 20,
    },
    ejerciciosPorSesion: [7, 9],
    minutosPorEjercicio: 5,
  },

  equipoPreferido: ['body weight', 'kettlebell', 'band', 'dumbbell', 'resistance band', 'medicine ball'],
  equipoVetado: ['olympic barbell', 'trap bar'],

  splitMatrix: {
    2: {
      nombre: 'Cuerpo completo A/B',
      dias: [
        { etiqueta: 'Día 1 · Circuito completo', foco: ['upper legs', 'chest', 'back', 'waist'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_traccion', 'accesorio_pierna', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 2 · Circuito completo', foco: ['upper legs', 'shoulders', 'back', 'waist'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_traccion', 'accesorio_pierna', 'core', 'cardio_finisher'] },
      ],
    },
    3: {
      nombre: 'Cuerpo completo ×3',
      dias: [
        { etiqueta: 'Día 1 · Tren inferior', foco: ['upper legs', 'lower legs', 'waist'], slots: ['compuesto_principal', 'accesorio_pierna', 'accesorio_pierna', 'core', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 2 · Tren superior', foco: ['chest', 'back', 'shoulders', 'upper arms'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_traccion', 'aislado', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 3 · Mixto', foco: ['upper legs', 'back', 'chest', 'waist'], slots: ['compuesto_principal', 'accesorio_pierna', 'accesorio_traccion', 'accesorio_empuje', 'core', 'cardio_finisher'] },
      ],
    },
    4: {
      nombre: 'Torso / Pierna',
      dias: [
        { etiqueta: 'Día 1 · Torso', foco: ['chest', 'back', 'shoulders'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_traccion', 'aislado', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 2 · Pierna', foco: ['upper legs', 'lower legs'], slots: ['compuesto_principal', 'accesorio_pierna', 'accesorio_pierna', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 3 · Torso', foco: ['chest', 'back', 'upper arms'], slots: ['compuesto_secundario', 'accesorio_empuje', 'accesorio_traccion', 'aislado', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 4 · Pierna + core', foco: ['upper legs', 'waist'], slots: ['compuesto_secundario', 'accesorio_pierna', 'core', 'core', 'cardio_finisher'] },
      ],
    },
    5: {
      nombre: 'Rotación de 5 días',
      dias: [
        { etiqueta: 'Día 1 · Tren inferior', foco: ['upper legs', 'lower legs'], slots: ['compuesto_principal', 'accesorio_pierna', 'accesorio_pierna', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 2 · Empuje', foco: ['chest', 'shoulders'], slots: ['compuesto_principal', 'accesorio_empuje', 'aislado', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 3 · Tracción', foco: ['back', 'upper arms'], slots: ['compuesto_principal', 'accesorio_traccion', 'aislado', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 4 · Core y cardio', foco: ['waist', 'cardio'], slots: ['core', 'core', 'core', 'cardio_finisher', 'movilidad'] },
        { etiqueta: 'Día 5 · Cuerpo completo', foco: ['upper legs', 'chest', 'back'], slots: ['compuesto_principal', 'accesorio_pierna', 'accesorio_empuje', 'accesorio_traccion', 'cardio_finisher'] },
      ],
    },
    6: {
      nombre: 'Rotación de 6 días',
      dias: [
        { etiqueta: 'Día 1 · Tren inferior', foco: ['upper legs'], slots: ['compuesto_principal', 'accesorio_pierna', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 2 · Empuje', foco: ['chest', 'shoulders'], slots: ['compuesto_principal', 'accesorio_empuje', 'aislado', 'cardio_finisher'] },
        { etiqueta: 'Día 3 · Tracción', foco: ['back', 'upper arms'], slots: ['compuesto_principal', 'accesorio_traccion', 'aislado', 'cardio_finisher'] },
        { etiqueta: 'Día 4 · Pierna y glúteo', foco: ['upper legs', 'lower legs'], slots: ['compuesto_secundario', 'accesorio_pierna', 'core', 'cardio_finisher'] },
        { etiqueta: 'Día 5 · Torso completo', foco: ['chest', 'back', 'shoulders'], slots: ['accesorio_empuje', 'accesorio_traccion', 'aislado', 'cardio_finisher'] },
        { etiqueta: 'Día 6 · Core y movilidad', foco: ['waist', 'cardio'], slots: ['core', 'core', 'cardio_finisher', 'movilidad'] },
      ],
    },
  },

  preguntasExtra: [
    {
      id: 'relacion_cardio',
      pregunta: '¿Qué tal te llevas con el cardio?',
      ayuda: 'Si lo odias, monto los finales en circuito con pesas en vez de bloques de cardio.',
      tipo: 'opcion',
      requerida: true,
      opciones: [
        { valor: 'gusta', etiqueta: 'Me gusta' },
        { valor: 'tolero', etiqueta: 'Lo tolero' },
        { valor: 'odio', etiqueta: 'Lo odio' },
      ],
    },
    {
      id: 'impacto',
      pregunta: '¿Puedes hacer ejercicios de salto e impacto?',
      ayuda: 'Depende del espacio, de los vecinos y de tus articulaciones.',
      tipo: 'opcion',
      requerida: true,
      opciones: [
        { valor: 'si', etiqueta: 'Sí, sin problema' },
        { valor: 'no', etiqueta: 'No: sin espacio o sin impacto' },
      ],
    },
  ],

  progresion: 'densidad',
  progresionTexto: 'Mantén el peso y recorta 5 segundos de descanso cada semana. Cuando no puedas más, sube carga.',
};
