import type { CoachArchetype } from './types';

/**
 * Nadia "La Escultora" — Hipertrofia.
 *
 * Volumen repartido, descansos medios, mucho trabajo de aislamiento.
 * El grupo prioritario del usuario recibe un ejercicio y una serie extra.
 */
export const HIPERTROFIA: CoachArchetype = {
  id: 'hipertrofia',
  nombre: 'Nadia',
  titulo: 'La Escultora',
  filosofia: 'El músculo crece con volumen bien aplicado, no con heroicidades.',
  paraQuien: 'Quieres ganar masa visible y puedes entrenar 3 o más días por semana.',
  emoji: '💪',
  acento: 'acento',

  prescripcion: {
    setsPorSlot: {
      compuesto_principal: 4,
      compuesto_secundario: 4,
      accesorio_empuje: 3,
      accesorio_traccion: 3,
      accesorio_pierna: 3,
      aislado: 3,
      core: 3,
      movilidad: 1,
    },
    repRange: {
      compuesto_principal: [6, 8],
      compuesto_secundario: [8, 10],
      accesorio_empuje: [8, 12],
      accesorio_traccion: [8, 12],
      accesorio_pierna: [8, 12],
      aislado: [12, 15],
      core: [12, 20],
      movilidad: [1, 1],
    },
    restSeconds: {
      compuesto_principal: 120,
      compuesto_secundario: 90,
      accesorio_empuje: 75,
      accesorio_traccion: 75,
      accesorio_pierna: 75,
      aislado: 60,
      core: 45,
      movilidad: 30,
    },
    ejerciciosPorSesion: [6, 7],
    minutosPorEjercicio: 8,
  },

  equipoPreferido: ['dumbbell', 'cable', 'leverage machine', 'barbell', 'smith machine', 'ez barbell'],
  equipoVetado: ['tire', 'sled machine'],

  splitMatrix: {
    2: {
      nombre: 'Cuerpo completo A/B',
      dias: [
        { etiqueta: 'Día 1 · Empuje + pierna', foco: ['chest', 'shoulders', 'upper legs'], slots: ['compuesto_principal', 'accesorio_empuje', 'accesorio_pierna', 'aislado', 'core'] },
        { etiqueta: 'Día 2 · Tracción + pierna', foco: ['back', 'upper arms', 'upper legs'], slots: ['compuesto_principal', 'accesorio_traccion', 'accesorio_pierna', 'aislado', 'core'] },
      ],
    },
    3: {
      nombre: 'Empuje / Tracción / Pierna',
      dias: [
        { etiqueta: 'Día 1 · Empuje', foco: ['chest', 'shoulders', 'upper arms'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje', 'aislado', 'aislado', 'core'] },
        { etiqueta: 'Día 2 · Tracción', foco: ['back', 'upper arms'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_traccion', 'aislado', 'aislado', 'core'] },
        { etiqueta: 'Día 3 · Pierna', foco: ['upper legs', 'lower legs', 'waist'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_pierna', 'aislado', 'core'] },
      ],
    },
    4: {
      nombre: 'Torso / Pierna',
      dias: [
        { etiqueta: 'Día 1 · Torso (empuje)', foco: ['chest', 'shoulders', 'upper arms'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje', 'aislado', 'aislado'] },
        { etiqueta: 'Día 2 · Pierna', foco: ['upper legs', 'lower legs'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_pierna', 'aislado', 'core'] },
        { etiqueta: 'Día 3 · Torso (tracción)', foco: ['back', 'upper arms', 'shoulders'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_traccion', 'aislado', 'aislado'] },
        { etiqueta: 'Día 4 · Pierna + core', foco: ['upper legs', 'lower legs', 'waist'], slots: ['compuesto_secundario', 'accesorio_pierna', 'aislado', 'core', 'core'] },
      ],
    },
    5: {
      nombre: 'PPL + Torso/Pierna',
      dias: [
        { etiqueta: 'Día 1 · Empuje', foco: ['chest', 'shoulders'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje', 'aislado', 'aislado'] },
        { etiqueta: 'Día 2 · Tracción', foco: ['back', 'upper arms'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_traccion', 'aislado', 'aislado'] },
        { etiqueta: 'Día 3 · Pierna', foco: ['upper legs', 'lower legs'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_pierna', 'aislado', 'core'] },
        { etiqueta: 'Día 4 · Torso', foco: ['chest', 'back', 'shoulders'], slots: ['compuesto_secundario', 'accesorio_empuje', 'accesorio_traccion', 'aislado', 'aislado'] },
        { etiqueta: 'Día 5 · Pierna + brazo', foco: ['upper legs', 'upper arms', 'waist'], slots: ['compuesto_secundario', 'accesorio_pierna', 'aislado', 'aislado', 'core'] },
      ],
    },
    6: {
      nombre: 'Empuje / Tracción / Pierna ×2',
      dias: [
        { etiqueta: 'Día 1 · Empuje (fuerza)', foco: ['chest', 'shoulders'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje', 'aislado'] },
        { etiqueta: 'Día 2 · Tracción (fuerza)', foco: ['back', 'upper arms'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_traccion', 'aislado'] },
        { etiqueta: 'Día 3 · Pierna (fuerza)', foco: ['upper legs', 'lower legs'], slots: ['compuesto_principal', 'accesorio_pierna', 'aislado', 'core'] },
        { etiqueta: 'Día 4 · Empuje (volumen)', foco: ['chest', 'shoulders', 'upper arms'], slots: ['compuesto_secundario', 'accesorio_empuje', 'aislado', 'aislado'] },
        { etiqueta: 'Día 5 · Tracción (volumen)', foco: ['back', 'upper arms'], slots: ['compuesto_secundario', 'accesorio_traccion', 'aislado', 'aislado'] },
        { etiqueta: 'Día 6 · Pierna (volumen)', foco: ['upper legs', 'lower legs', 'waist'], slots: ['compuesto_secundario', 'accesorio_pierna', 'aislado', 'core'] },
      ],
    },
  },

  preguntasExtra: [
    {
      id: 'grupo_prioritario',
      pregunta: '¿Qué grupo muscular quieres priorizar?',
      ayuda: 'Recibirá un ejercicio y una serie extra en cada sesión que lo trabaje.',
      tipo: 'opcion',
      requerida: true,
      opciones: [
        { valor: 'chest', etiqueta: 'Pecho' },
        { valor: 'back', etiqueta: 'Espalda' },
        { valor: 'shoulders', etiqueta: 'Hombros' },
        { valor: 'upper arms', etiqueta: 'Brazos' },
        { valor: 'upper legs', etiqueta: 'Piernas y glúteos' },
      ],
    },
    {
      id: 'tolerancia_fallo',
      pregunta: '¿Qué tal llevas entrenar cerca del fallo muscular?',
      ayuda: 'Con tolerancia alta añadiré técnicas de intensidad en el último ejercicio de aislamiento.',
      tipo: 'opcion',
      requerida: true,
      opciones: [
        { valor: 'alta', etiqueta: 'Bien, me gusta apretar' },
        { valor: 'media', etiqueta: 'Prefiero dejar alguna repetición en reserva' },
        { valor: 'baja', etiqueta: 'Prefiero terminar cómodo' },
      ],
    },
  ],

  progresion: 'doble',
  progresionTexto: 'Sube repeticiones hasta el tope del rango; cuando llegues, sube el peso y vuelve al rango bajo.',
};
