import type { CoachArchetype } from './types';

/**
 * Elena "La Base" — Salud / principiante.
 *
 * Máquinas guiadas y peso corporal, series bajas, foco en técnica y rango.
 * Veta la barra libre a propósito: el objetivo es que el usuario no se
 * lesione ni abandone, no que levante mucho en el primer mes.
 */
export const SALUD: CoachArchetype = {
  id: 'salud',
  nombre: 'Elena',
  titulo: 'La Base',
  filosofia: 'Primero moverse bien; después moverse fuerte.',
  paraQuien: 'Empiezas de cero, vuelves tras una parada larga o quieres moverte sin dolor.',
  emoji: '🌱',
  acento: 'acento',

  prescripcion: {
    setsPorSlot: {
      compuesto_principal: 3,
      compuesto_secundario: 3,
      accesorio_empuje: 2,
      accesorio_traccion: 2,
      accesorio_pierna: 2,
      aislado: 2,
      core: 2,
      movilidad: 2,
    },
    repRange: {
      compuesto_principal: [10, 12],
      compuesto_secundario: [10, 12],
      accesorio_empuje: [12, 15],
      accesorio_traccion: [12, 15],
      accesorio_pierna: [12, 15],
      aislado: [12, 15],
      core: [10, 15],
      movilidad: [1, 1],
    },
    restSeconds: {
      compuesto_principal: 75,
      compuesto_secundario: 60,
      accesorio_empuje: 60,
      accesorio_traccion: 60,
      accesorio_pierna: 60,
      aislado: 45,
      core: 45,
      movilidad: 30,
    },
    ejerciciosPorSesion: [5, 6],
    minutosPorEjercicio: 7,
  },

  equipoPreferido: ['leverage machine', 'body weight', 'assisted', 'cable', 'band', 'dumbbell'],
  equipoVetado: ['olympic barbell', 'barbell', 'tire', 'trap bar', 'sled machine'],

  splitMatrix: {
    2: {
      nombre: 'Cuerpo completo A/B',
      dias: [
        { etiqueta: 'Día 1 · Cuerpo completo A', foco: ['upper legs', 'chest', 'back'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_traccion', 'core', 'movilidad'] },
        { etiqueta: 'Día 2 · Cuerpo completo B', foco: ['upper legs', 'shoulders', 'back'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_traccion', 'core', 'movilidad'] },
      ],
    },
    3: {
      nombre: 'Cuerpo completo A/B/C',
      dias: [
        { etiqueta: 'Día 1 · Base', foco: ['upper legs', 'chest', 'back'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_traccion', 'core', 'movilidad'] },
        { etiqueta: 'Día 2 · Postura', foco: ['back', 'shoulders', 'waist'], slots: ['compuesto_secundario', 'accesorio_traccion', 'aislado', 'core', 'movilidad'] },
        { etiqueta: 'Día 3 · Piernas y equilibrio', foco: ['upper legs', 'lower legs', 'waist'], slots: ['compuesto_principal', 'accesorio_pierna', 'core', 'movilidad'] },
      ],
    },
    4: {
      nombre: 'Torso / Pierna suave',
      dias: [
        { etiqueta: 'Día 1 · Torso', foco: ['chest', 'back', 'shoulders'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_traccion', 'movilidad'] },
        { etiqueta: 'Día 2 · Pierna', foco: ['upper legs', 'lower legs'], slots: ['compuesto_principal', 'accesorio_pierna', 'core', 'movilidad'] },
        { etiqueta: 'Día 3 · Postura', foco: ['back', 'shoulders', 'waist'], slots: ['accesorio_traccion', 'aislado', 'core', 'movilidad'] },
        { etiqueta: 'Día 4 · Pierna y core', foco: ['upper legs', 'waist'], slots: ['compuesto_secundario', 'accesorio_pierna', 'core', 'movilidad'] },
      ],
    },
    5: {
      nombre: 'Rotación suave de 5 días',
      dias: [
        { etiqueta: 'Día 1 · Piernas', foco: ['upper legs', 'lower legs'], slots: ['compuesto_principal', 'accesorio_pierna', 'core', 'movilidad'] },
        { etiqueta: 'Día 2 · Empuje', foco: ['chest', 'shoulders'], slots: ['compuesto_principal', 'accesorio_empuje', 'aislado', 'movilidad'] },
        { etiqueta: 'Día 3 · Tracción', foco: ['back', 'upper arms'], slots: ['compuesto_principal', 'accesorio_traccion', 'aislado', 'movilidad'] },
        { etiqueta: 'Día 4 · Core y postura', foco: ['waist', 'back'], slots: ['core', 'core', 'accesorio_traccion', 'movilidad'] },
        { etiqueta: 'Día 5 · Cuerpo completo', foco: ['upper legs', 'chest', 'back'], slots: ['compuesto_secundario', 'accesorio_empuje', 'accesorio_traccion', 'movilidad'] },
      ],
    },
    6: {
      nombre: 'Rotación suave de 6 días',
      dias: [
        { etiqueta: 'Día 1 · Piernas', foco: ['upper legs'], slots: ['compuesto_principal', 'accesorio_pierna', 'movilidad'] },
        { etiqueta: 'Día 2 · Empuje', foco: ['chest', 'shoulders'], slots: ['compuesto_principal', 'accesorio_empuje', 'movilidad'] },
        { etiqueta: 'Día 3 · Tracción', foco: ['back'], slots: ['compuesto_principal', 'accesorio_traccion', 'movilidad'] },
        { etiqueta: 'Día 4 · Core', foco: ['waist'], slots: ['core', 'core', 'movilidad'] },
        { etiqueta: 'Día 5 · Piernas y equilibrio', foco: ['upper legs', 'lower legs'], slots: ['compuesto_secundario', 'accesorio_pierna', 'movilidad'] },
        { etiqueta: 'Día 6 · Movilidad', foco: ['back', 'shoulders', 'waist'], slots: ['movilidad', 'movilidad', 'core'] },
      ],
    },
  },

  preguntasExtra: [
    {
      id: 'horas_sentado',
      pregunta: '¿Cuántas horas pasas sentado al día?',
      ayuda: 'Cuantas más, más trabajo de espalda alta y glúteo programaré como antídoto postural.',
      tipo: 'opcion',
      requerida: true,
      opciones: [
        { valor: 'menos4', etiqueta: 'Menos de 4' },
        { valor: 'entre4y8', etiqueta: 'Entre 4 y 8' },
        { valor: 'mas8', etiqueta: 'Más de 8' },
      ],
    },
    {
      id: 'dolor_actual',
      pregunta: '¿Tienes dolor ahora mismo? Del 0 al 10',
      ayuda: 'Con 5 o más me limito a peso corporal y máquinas asistidas, y bajo el volumen.',
      tipo: 'escala',
      min: 0,
      max: 10,
      requerida: true,
    },
    {
      id: 'objetivo_funcional',
      pregunta: '¿Qué te gustaría poder hacer sin esfuerzo?',
      tipo: 'opcion',
      requerida: false,
      opciones: [
        { valor: 'escaleras', etiqueta: 'Subir escaleras sin ahogarme' },
        { valor: 'cargar', etiqueta: 'Cargar peso (compra, nietos…)' },
        { valor: 'suelo', etiqueta: 'Levantarme del suelo con facilidad' },
        { valor: 'dolor', etiqueta: 'Moverme sin dolor de espalda' },
      ],
    },
  ],

  progresion: 'tecnica',
  progresionTexto: 'Antes de subir peso, gana rango de movimiento y control. La carga llega sola.',
};
