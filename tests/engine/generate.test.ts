import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generarRutina } from '@/lib/engine/generate';
import { COACHES } from '@/lib/coaches';
import { catalogoAmplio, cuestionario, ejercicio } from './fixtures.ts';

const SALT = 'salt-de-pruebas';
const catalogo = catalogoAmplio();

function generar(opciones: Parameters<typeof generarRutina>[0] extends infer T ? Partial<T> : never) {
  return generarRutina({
    userId: 'usuario-a',
    coach: COACHES.hipertrofia,
    cuestionario: cuestionario(),
    catalogo,
    salt: SALT,
    ...(opciones as object),
  } as Parameters<typeof generarRutina>[0]);
}

describe('determinismo', () => {
  it('la misma entrada produce exactamente la misma rutina, 100 veces', () => {
    const referencia = JSON.stringify(quitarFecha(generar({})));
    for (let i = 0; i < 100; i += 1) {
      assert.equal(JSON.stringify(quitarFecha(generar({}))), referencia, `divergió en la iteración ${i}`);
    }
  });

  it('dos usuarios con respuestas idénticas reciben rutinas distintas', () => {
    const a = generar({ userId: 'usuario-a' });
    const b = generar({ userId: 'usuario-b' });
    assert.notEqual(a.seed, b.seed, 'las semillas deberían diferir');
    assert.notEqual(
      JSON.stringify(idsDe(a)),
      JSON.stringify(idsDe(b)),
      'dos usuarios distintos no deberían recibir la misma selección',
    );
  });

  it('cambiar la versión cambia la rutina del mismo usuario', () => {
    const v1 = generar({ version: 1 });
    const v2 = generar({ version: 2 });
    assert.notEqual(v1.seed, v2.seed);
  });

  it('la semilla queda registrada en la rutina', () => {
    const r = generar({});
    assert.match(r.seed, /^[0-9a-f]{32}$/);
  });
});

describe('estructura', () => {
  it('genera tantos días como pidió el usuario', () => {
    for (const dias of [2, 3, 4, 5, 6] as const) {
      const r = generar({ cuestionario: cuestionario({ diasPorSemana: dias }) });
      assert.equal(r.dias.length, dias, `${dias} días por semana`);
    }
  });

  it('ningún día queda vacío', () => {
    const r = generar({});
    for (const dia of r.dias) {
      assert.ok(dia.bloques.length > 0, `el día "${dia.etiqueta}" quedó vacío`);
    }
  });

  it('el primer bloque del día es un compuesto cuando la plantilla lo pide', () => {
    const r = generar({});
    for (const dia of r.dias) {
      const primero = dia.bloques[0];
      if (!primero) continue;
      assert.ok(
        primero.slot.startsWith('compuesto') || dia.bloques.every((b) => !b.slot.startsWith('compuesto')),
        `el día "${dia.etiqueta}" no empieza por el compuesto`,
      );
    }
  });

  it('no repite el mismo ejercicio dentro de un día', () => {
    const r = generar({});
    for (const dia of r.dias) {
      const ids = dia.bloques.map((b) => b.exerciseId);
      assert.equal(new Set(ids).size, ids.length, `ejercicio repetido en "${dia.etiqueta}"`);
    }
  });

  it('menos tiempo por sesión produce sesiones más cortas', () => {
    const corta = generar({ cuestionario: cuestionario({ minutosPorSesion: 30 }) });
    const larga = generar({ cuestionario: cuestionario({ minutosPorSesion: 90 }) });
    const media = (r: ReturnType<typeof generar>) =>
      r.dias.reduce((s, d) => s + d.bloques.length, 0) / r.dias.length;
    assert.ok(media(corta) <= media(larga), 'una sesión de 30 min no debería tener más ejercicios que una de 90');
  });
});

describe('exclusiones por lesión', () => {
  it('evitar rodilla elimina sentadilla profunda, saltos y zancadas', () => {
    const r = generar({ cuestionario: cuestionario({ zonasAEvitar: ['rodilla'] }) });
    const prohibidos = ['deep_squat', 'jump', 'lunge'];
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      for (const p of prohibidos) {
        assert.ok(!e.patterns.includes(p as never), `${e.name_es} incluye el patrón ${p}`);
      }
    }
  });

  it('evitar hombro elimina el target delts y el press por encima de la cabeza', () => {
    const r = generar({ cuestionario: cuestionario({ zonasAEvitar: ['hombro'] }) });
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      assert.notEqual(e.target, 'delts', `${e.name_es} apunta a delts`);
      assert.ok(!e.patterns.includes('overhead_press' as never));
    }
  });

  it('evitar lumbar elimina bisagra de cadera cargada y remo inclinado', () => {
    const r = generar({ cuestionario: cuestionario({ zonasAEvitar: ['lumbar'] }) });
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      assert.ok(!e.patterns.includes('hip_hinge_loaded' as never));
      assert.ok(!e.patterns.includes('bent_over_row' as never));
    }
  });

  it('CASO EXTREMO: casa sin equipo + hombro, rodilla y lumbar sigue dando rutina válida', () => {
    const r = generar({
      coach: COACHES.salud,
      cuestionario: cuestionario({
        material: 'casa_sin_equipo',
        zonasAEvitar: ['hombro', 'rodilla', 'lumbar'],
        diasPorSemana: 3,
        experiencia: 'principiante',
        extras: { horas_sentado: 'mas8', dolor_actual: 2 },
      }),
    });

    assert.equal(r.dias.length, 3);
    const total = r.dias.reduce((s, d) => s + d.bloques.length, 0);
    assert.ok(total > 0, 'la rutina quedó completamente vacía');
    for (const dia of r.dias) {
      assert.ok(dia.bloques.length > 0, `el día "${dia.etiqueta}" quedó vacío`);
    }
  });

  it('las exclusiones por lesión NUNCA se relajan, ni en el caso extremo', () => {
    const r = generar({
      coach: COACHES.salud,
      cuestionario: cuestionario({
        material: 'casa_sin_equipo',
        zonasAEvitar: ['hombro', 'rodilla', 'lumbar', 'codo', 'muñeca'],
        diasPorSemana: 6,
        extras: { horas_sentado: 'mas8', dolor_actual: 3 },
      }),
    });
    const prohibidos = ['overhead_press', 'deep_squat', 'jump', 'lunge', 'hip_hinge_loaded', 'bent_over_row'];
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      for (const p of prohibidos) {
        assert.ok(!e.patterns.includes(p as never), `relajó una exclusión de seguridad: ${p}`);
      }
    }
  });
});

describe('material disponible', () => {
  it('casa sin equipo solo programa peso corporal o asistido', () => {
    const r = generar({ cuestionario: cuestionario({ material: 'casa_sin_equipo' }) });
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      assert.ok(['body weight', 'assisted'].includes(e.equipment), `usó ${e.equipment} sin equipo disponible`);
    }
  });

  it('casa con mancuernas nunca programa barra ni polea', () => {
    const r = generar({ cuestionario: cuestionario({ material: 'casa_mancuernas' }) });
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      assert.ok(!['barbell', 'olympic barbell', 'cable'].includes(e.equipment), `usó ${e.equipment}`);
    }
  });
});

describe('coherencia con el coach', () => {
  it('Fuerza prescribe repeticiones bajas y descansos largos', () => {
    const r = generar({
      coach: COACHES.fuerza,
      cuestionario: cuestionario({ experiencia: 'avanzado', extras: { tecnica_basicos: 'si', tiene_rack: 'si' } }),
    });
    const principales = r.dias.flatMap((d) => d.bloques).filter((b) => b.slot === 'compuesto_principal');
    assert.ok(principales.length > 0, 'no programó ningún compuesto principal');
    for (const b of principales) {
      assert.ok(b.repsMax <= 6, `repeticiones demasiado altas: ${b.repsMin}-${b.repsMax}`);
      assert.ok(b.restSeconds >= 180, `descanso demasiado corto: ${b.restSeconds}s`);
    }
  });

  it('Definición prescribe repeticiones altas y descansos cortos', () => {
    const r = generar({
      coach: COACHES.definicion,
      cuestionario: cuestionario({ extras: { relacion_cardio: 'gusta', impacto: 'si' } }),
    });
    for (const b of r.dias.flatMap((d) => d.bloques)) {
      if (b.slot === 'movilidad' || b.slot === 'cardio_finisher') continue;
      assert.ok(b.repsMin >= 12, `repeticiones demasiado bajas: ${b.repsMin}`);
      assert.ok(b.restSeconds <= 45, `descanso demasiado largo: ${b.restSeconds}s`);
    }
  });

  it('Salud nunca programa barra libre, aunque haya gimnasio completo', () => {
    const r = generar({
      coach: COACHES.salud,
      cuestionario: cuestionario({ material: 'gimnasio_completo', extras: { horas_sentado: 'menos4', dolor_actual: 0 } }),
    });
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      assert.ok(!['barbell', 'olympic barbell'].includes(e.equipment), `Elena programó ${e.equipment}`);
    }
  });
});

describe('extras del coach', () => {
  it('Hipertrofia da una serie extra al grupo prioritario', () => {
    const r = generar({
      coach: COACHES.hipertrofia,
      cuestionario: cuestionario({ extras: { grupo_prioritario: 'back', tolerancia_fallo: 'alta' } }),
    });
    const bloques = r.dias.flatMap((d) => d.bloques);
    const deEspalda = bloques.filter((b) => catalogo.find((x) => x.id === b.exerciseId)?.body_part === 'back');
    const otros = bloques.filter((b) => catalogo.find((x) => x.id === b.exerciseId)?.body_part !== 'back');
    if (deEspalda.length && otros.length) {
      const maxEspalda = Math.max(...deEspalda.map((b) => b.sets));
      const maxOtros = Math.max(...otros.map((b) => b.sets));
      assert.ok(maxEspalda > maxOtros, 'el grupo prioritario no recibió series extra');
    }
  });

  it('Salud con dolor alto limita a 2 series y a material seguro', () => {
    const r = generar({
      coach: COACHES.salud,
      cuestionario: cuestionario({
        material: 'gimnasio_completo',
        extras: { horas_sentado: 'mas8', dolor_actual: 8 },
      }),
    });
    for (const b of r.dias.flatMap((d) => d.bloques)) {
      assert.ok(b.sets <= 2, `programó ${b.sets} series con dolor alto`);
    }
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      assert.ok(
        ['body weight', 'assisted', 'leverage machine', 'band', 'resistance band'].includes(e.equipment),
        `material no seguro con dolor alto: ${e.equipment}`,
      );
    }
  });

  it('Fuerza sin técnica sustituye la barra libre', () => {
    const r = generar({
      coach: COACHES.fuerza,
      cuestionario: cuestionario({ extras: { tecnica_basicos: 'no', tiene_rack: 'si' } }),
    });
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      assert.ok(!['barbell', 'olympic barbell'].includes(e.equipment), `mantuvo ${e.equipment} sin técnica`);
    }
  });

  it('Fuerza sin rack evita sentadilla profunda y press por encima de la cabeza', () => {
    const r = generar({
      coach: COACHES.fuerza,
      cuestionario: cuestionario({ extras: { tecnica_basicos: 'si', tiene_rack: 'no' } }),
    });
    for (const id of idsDe(r)) {
      const e = catalogo.find((x) => x.id === id)!;
      assert.ok(!e.patterns.includes('deep_squat' as never));
      assert.ok(!e.patterns.includes('overhead_press' as never));
    }
  });
});

describe('calidad de la selección', () => {
  const conEstiramientos = [
    ...catalogoAmplio(),
    ejercicio({ id: 'S001', body_part: 'chest', target: 'pectorals', equipment: 'body weight', patterns: ['stretch'], name_es: 'Estiramiento de pecho' }),
    ejercicio({ id: 'S002', body_part: 'back', target: 'lats', equipment: 'body weight', patterns: ['stretch'], name_es: 'Estiramiento dorsal' }),
    ejercicio({ id: 'S003', body_part: 'upper legs', target: 'hamstrings', equipment: 'body weight', patterns: ['stretch'], name_es: 'Estiramiento isquios' }),
  ];

  it('un estiramiento nunca ocupa una ranura de fuerza', () => {
    const r = generarRutina({
      userId: 'u', coach: COACHES.salud, catalogo: conEstiramientos, salt: SALT,
      cuestionario: cuestionario({ material: 'casa_sin_equipo', diasPorSemana: 6, extras: { horas_sentado: 'mas8', dolor_actual: 1 } }),
    });
    for (const dia of r.dias) {
      for (const b of dia.bloques) {
        if (b.slot === 'movilidad') continue;
        const e = conEstiramientos.find((x) => x.id === b.exerciseId)!;
        assert.ok(!e.patterns.includes('stretch' as never), `${e.name_es} ocupó la ranura ${b.slot}`);
      }
    }
  });

  it('la ranura de movilidad se mide en segundos, no en repeticiones', () => {
    const r = generarRutina({
      userId: 'u', coach: COACHES.salud, catalogo: conEstiramientos, salt: SALT,
      cuestionario: cuestionario({ diasPorSemana: 3, extras: { horas_sentado: 'menos4', dolor_actual: 0 } }),
    });
    const movilidad = r.dias.flatMap((d) => d.bloques).filter((b) => b.slot === 'movilidad');
    for (const b of movilidad) {
      assert.equal(b.medida, 'tiempo');
      assert.ok((b.segundos ?? 0) > 0, 'la movilidad debería prescribir segundos');
    }
  });

  it('las ranuras de fuerza se miden en repeticiones', () => {
    const r = generarRutina({
      userId: 'u', coach: COACHES.hipertrofia, catalogo: conEstiramientos, salt: SALT,
      cuestionario: cuestionario({ extras: { grupo_prioritario: 'back', tolerancia_fallo: 'media' } }),
    });
    for (const b of r.dias.flatMap((d) => d.bloques)) {
      if (b.slot === 'movilidad' || b.slot === 'cardio_finisher') continue;
      assert.equal(b.medida, 'reps', `${b.slot} debería medirse en repeticiones`);
      assert.ok(b.repsMax > 1);
    }
  });

  it('Salud nunca programa movimientos tras nuca', () => {
    const conTrasNuca = [
      ...catalogoAmplio(),
      ejercicio({ id: 'N001', body_part: 'shoulders', target: 'delts', equipment: 'body weight', patterns: ['behind_neck'], name_es: 'Press tras nuca' }),
    ];
    const r = generarRutina({
      userId: 'u', coach: COACHES.salud, catalogo: conTrasNuca, salt: SALT,
      cuestionario: cuestionario({ extras: { horas_sentado: 'menos4', dolor_actual: 0 } }),
    });
    assert.ok(!idsDe(r).includes('N001'), 'Elena programó un movimiento tras nuca');
  });
});

describe('robustez', () => {
  it('con un catálogo diminuto no lanza excepción y avisa', () => {
    const minimo = [ejercicio({ body_part: 'chest', target: 'pectorals', equipment: 'body weight' })];
    const r = generarRutina({
      userId: 'u',
      coach: COACHES.salud,
      cuestionario: cuestionario({ material: 'casa_sin_equipo', diasPorSemana: 3 }),
      catalogo: minimo,
      salt: SALT,
    });
    assert.equal(r.dias.length, 3);
    assert.ok(r.dias.some((d) => d.aviso), 'debería avisar de que los días salieron cortos');
  });

  it('con catálogo vacío devuelve días vacíos pero no revienta', () => {
    const r = generarRutina({
      userId: 'u',
      coach: COACHES.salud,
      cuestionario: cuestionario({ diasPorSemana: 2 }),
      catalogo: [],
      salt: SALT,
    });
    assert.equal(r.dias.length, 2);
    assert.ok(r.dias.every((d) => d.aviso));
  });
});

function idsDe(r: { dias: Array<{ bloques: Array<{ exerciseId: string }> }> }): string[] {
  return r.dias.flatMap((d) => d.bloques.map((b) => b.exerciseId));
}

function quitarFecha<T extends { generadaEn: Date }>(r: T): Omit<T, 'generadaEn'> {
  const { generadaEn, ...resto } = r;
  void generadaEn;
  return resto;
}
