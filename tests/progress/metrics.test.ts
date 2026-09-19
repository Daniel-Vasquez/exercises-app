import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularTotales, estaCompleto, fechaLocal, esFechaValida } from '@/lib/progress/metrics';

const serie = (n: number, reps: number | null, kg: number | null, done: boolean) => ({
  setNumber: n,
  reps,
  weightKg: kg,
  done,
});

describe('cálculo de volumen', () => {
  it('suma repeticiones por peso de las series marcadas', () => {
    const t = calcularTotales([
      { exerciseId: 'a', sets: [serie(1, 10, 60, true), serie(2, 8, 62.5, true)] },
    ]);
    assert.equal(t.volumeKg, 10 * 60 + 8 * 62.5);
    assert.equal(t.setsCompleted, 2);
  });

  it('IGNORA las series con valores pero sin marcar', () => {
    const t = calcularTotales([
      { exerciseId: 'a', sets: [serie(1, 10, 60, true), serie(2, 10, 60, false)] },
    ]);
    assert.equal(t.volumeKg, 600, 'una serie escrita pero no marcada es intención, no trabajo');
    assert.equal(t.setsCompleted, 1);
    assert.equal(t.setsPlanned, 2);
  });

  it('el peso corporal suma 0 al volumen pero cuenta como serie hecha', () => {
    const t = calcularTotales([{ exerciseId: 'a', sets: [serie(1, 15, null, true)] }]);
    assert.equal(t.volumeKg, 0);
    assert.equal(t.setsCompleted, 1);
  });

  it('redondea a un decimal', () => {
    const t = calcularTotales([{ exerciseId: 'a', sets: [serie(1, 3, 2.555, true)] }]);
    assert.equal(t.volumeKg, 7.7);
  });

  it('un día está completo solo si todas las series están marcadas', () => {
    assert.equal(estaCompleto({ volumeKg: 0, setsCompleted: 3, setsPlanned: 3 }), true);
    assert.equal(estaCompleto({ volumeKg: 0, setsCompleted: 2, setsPlanned: 3 }), false);
    assert.equal(estaCompleto({ volumeKg: 0, setsCompleted: 0, setsPlanned: 0 }), false);
  });
});

describe('fecha local (el bug clásico del calendario)', () => {
  it('un entrenamiento a las 23:30 se guarda en SU día, no en el siguiente', () => {
    // Con toISOString() esta fecha se convertiría a UTC y, en cualquier zona
    // horaria negativa, saltaría al día siguiente.
    const noche = new Date(2026, 8, 19, 23, 30, 0);
    assert.equal(fechaLocal(noche), '2026-09-19');
  });

  it('un entrenamiento a las 00:30 tampoco retrocede de día', () => {
    const madrugada = new Date(2026, 8, 19, 0, 30, 0);
    assert.equal(fechaLocal(madrugada), '2026-09-19');
  });

  it('rellena con ceros meses y días de un dígito', () => {
    assert.equal(fechaLocal(new Date(2026, 0, 5, 12, 0, 0)), '2026-01-05');
  });

  it('valida el formato y rechaza fechas imposibles', () => {
    assert.equal(esFechaValida('2026-09-19'), true);
    assert.equal(esFechaValida('2026-02-30'), false);
    assert.equal(esFechaValida('2026-13-01'), false);
    assert.equal(esFechaValida('19-09-2026'), false);
    assert.equal(esFechaValida('ayer'), false);
  });
});
