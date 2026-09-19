import type { CoachArchetype } from './types';

/**
 * Marco "El Fundamento" — Fuerza / Powerlifting.
 *
 * Pocas series, mucha carga, descansos largos. Progresión lineal en peso.
 * Rechaza el material asistido y los superficies inestables: buscan
 * estabilidad para mover cargas, no propiocepción.
 */
export const FUERZA: CoachArchetype = {
  id: 'fuerza',
  nombre: 'Marco',
  titulo: 'El Fundamento',
  filosofia: 'Domina cinco movimientos y el resto llega solo.',
  paraQuien: 'Quieres ser más fuerte de verdad y tienes acceso a barra. Intermedio o avanzado.',
  emoji: '🏋️',
  acento: 'acento',

  prescripcion: {
    setsPorSlot: {
      compuesto_principal: 5,
      compuesto_secundario: 4,
      accesorio_empuje: 3,
      accesorio_traccion: 3,
      accesorio_pierna: 3,
      aislado: 3,
      core: 3,
      movilidad: 1,
    },
    repRange: {
      compuesto_principal: [3, 5],
      compuesto_secundario: [4, 6],
      accesorio_empuje: [6, 8],
      accesorio_traccion: [6, 8],
      accesorio_pierna: [6, 8],
      aislado: [8, 10],
      core: [8, 12],
      movilidad: [1, 1],
    },
    restSeconds: {
      compuesto_principal: 300,
      compuesto_secundario: 240,
      accesorio_empuje: 180,
      accesorio_traccion: 180,
      accesorio_pierna: 180,
      aislado: 120,
      core: 90,
      movilidad: 30,
    },
    ejerciciosPorSesion: [4, 5],
    minutosPorEjercicio: 12,
  },

  equipoPreferido: ['barbell', 'olympic barbell', 'trap bar', 'ez barbell', 'dumbbell'],
  equipoVetado: ['assisted', 'bosu ball', 'elliptical machine', 'stationary bike'],

  splitMatrix: {
    2: {
      nombre: 'Cuerpo completo A/B',
      dias: [
        { etiqueta: 'Día 1 · Empuje pesado', foco: ['upper legs', 'chest', 'shoulders'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje', 'core'] },
        { etiqueta: 'Día 2 · Tracción pesada', foco: ['back', 'upper legs', 'upper arms'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_traccion', 'core'] },
      ],
    },
    3: {
      nombre: 'Cuerpo completo A/B/C',
      dias: [
        { etiqueta: 'Día 1 · Sentadilla', foco: ['upper legs', 'waist'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_pierna', 'core'] },
        { etiqueta: 'Día 2 · Press banca', foco: ['chest', 'shoulders', 'upper arms'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje', 'aislado'] },
        { etiqueta: 'Día 3 · Peso muerto', foco: ['back', 'upper legs'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_traccion', 'core'] },
      ],
    },
    4: {
      nombre: 'Torso / Pierna',
      dias: [
        { etiqueta: 'Día 1 · Torso pesado', foco: ['chest', 'back', 'shoulders'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje', 'accesorio_traccion'] },
        { etiqueta: 'Día 2 · Pierna pesada', foco: ['upper legs', 'lower legs'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_pierna', 'core'] },
        { etiqueta: 'Día 3 · Torso volumen', foco: ['chest', 'back', 'upper arms'], slots: ['compuesto_secundario', 'accesorio_empuje', 'accesorio_traccion', 'aislado'] },
        { etiqueta: 'Día 4 · Pierna volumen', foco: ['upper legs', 'lower legs', 'waist'], slots: ['compuesto_secundario', 'accesorio_pierna', 'aislado', 'core'] },
      ],
    },
    5: {
      nombre: 'Torso / Pierna + accesorios',
      dias: [
        { etiqueta: 'Día 1 · Sentadilla', foco: ['upper legs'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_pierna', 'core'] },
        { etiqueta: 'Día 2 · Press banca', foco: ['chest', 'upper arms'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje', 'aislado'] },
        { etiqueta: 'Día 3 · Peso muerto', foco: ['back', 'upper legs'], slots: ['compuesto_principal', 'accesorio_traccion', 'core'] },
        { etiqueta: 'Día 4 · Press militar', foco: ['shoulders', 'upper arms'], slots: ['compuesto_principal', 'accesorio_empuje', 'aislado'] },
        { etiqueta: 'Día 5 · Accesorios', foco: ['back', 'upper arms', 'waist'], slots: ['accesorio_traccion', 'aislado', 'core', 'movilidad'] },
      ],
    },
    6: {
      nombre: 'Torso / Pierna ×3',
      dias: [
        { etiqueta: 'Día 1 · Torso pesado', foco: ['chest', 'back'], slots: ['compuesto_principal', 'compuesto_secundario', 'accesorio_empuje'] },
        { etiqueta: 'Día 2 · Pierna pesada', foco: ['upper legs'], slots: ['compuesto_principal', 'accesorio_pierna', 'core'] },
        { etiqueta: 'Día 3 · Torso medio', foco: ['shoulders', 'upper arms'], slots: ['compuesto_secundario', 'accesorio_empuje', 'aislado'] },
        { etiqueta: 'Día 4 · Pierna medio', foco: ['upper legs', 'lower legs'], slots: ['compuesto_secundario', 'accesorio_pierna', 'aislado'] },
        { etiqueta: 'Día 5 · Torso ligero', foco: ['back', 'chest'], slots: ['accesorio_traccion', 'accesorio_empuje', 'aislado'] },
        { etiqueta: 'Día 6 · Pierna ligera', foco: ['upper legs', 'waist'], slots: ['accesorio_pierna', 'core', 'movilidad'] },
      ],
    },
  },

  preguntasExtra: [
    {
      id: 'tecnica_basicos',
      pregunta: '¿Conoces la técnica de sentadilla, peso muerto y press de banca?',
      ayuda: 'Si no la dominas, sustituiré la barra libre por máquinas guiadas hasta que la tengas.',
      tipo: 'opcion',
      requerida: true,
      opciones: [
        { valor: 'si', etiqueta: 'Sí, las tres con confianza' },
        { valor: 'parcial', etiqueta: 'Alguna sí, otras no' },
        { valor: 'no', etiqueta: 'No, o nunca las he hecho' },
      ],
    },
    {
      id: 'tiene_rack',
      pregunta: '¿Tienes acceso a rack o jaula de sentadillas?',
      ayuda: 'Sin rack no puedo programar sentadilla trasera ni press militar de pie con seguridad.',
      tipo: 'opcion',
      requerida: true,
      opciones: [
        { valor: 'si', etiqueta: 'Sí' },
        { valor: 'no', etiqueta: 'No' },
      ],
    },
  ],

  progresion: 'lineal',
  progresionTexto: 'Sube 2,5 kg cuando completes todas las series en el rango alto de repeticiones.',
};
