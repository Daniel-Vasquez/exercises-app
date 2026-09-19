import { z } from 'zod';
import { esFechaValida } from '@/lib/progress/metrics';

/** Validación del registro diario. Mismo esquema en cliente y servidor. */

export const esquemaSerie = z.object({
  setNumber: z.number().int().min(1).max(20),
  // Topes deliberadamente generosos pero finitos: evitan que un error de
  // tecleo (300 repeticiones, 2000 kg) contamine las gráficas de progreso.
  reps: z.number().int().min(0).max(200).nullable(),
  weightKg: z.number().min(0).max(500).nullable(),
  done: z.boolean(),
});

export const esquemaEntrada = z.object({
  exerciseId: z.string().min(1).max(40),
  sets: z.array(esquemaSerie).max(20),
});

export const esquemaRegistro = z.object({
  dayIndex: z.number().int().min(0).max(6),
  routineId: z.string().length(24).nullable().optional(),
  entries: z.array(esquemaEntrada).max(20),
});

export type EntradaRegistroValidada = z.infer<typeof esquemaRegistro>;

export function validarFecha(valor: string): boolean {
  return esFechaValida(valor);
}
