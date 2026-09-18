/**
 * Equipamiento (`equipment`) — conjunto cerrado de 28 valores,
 * enumerado desde `GET /equipments`.
 *
 * Estos valores son además los que el cuestionario cruza con el material
 * disponible del usuario, así que la clave inglesa es parte de la lógica de
 * negocio, no solo de la traducción.
 */
export const EQUIPMENT_ES = {
  'assisted': 'Asistido',
  'band': 'Banda elástica',
  'barbell': 'Barra',
  'body weight': 'Peso corporal',
  'bosu ball': 'Bosu',
  'cable': 'Polea',
  'dumbbell': 'Mancuerna',
  'elliptical machine': 'Elíptica',
  'ez barbell': 'Barra Z',
  'hammer': 'Martillo',
  'kettlebell': 'Pesa rusa',
  'leverage machine': 'Máquina de palanca',
  'medicine ball': 'Balón medicinal',
  'olympic barbell': 'Barra olímpica',
  'resistance band': 'Banda de resistencia',
  'roller': 'Rodillo',
  'rope': 'Cuerda',
  'skierg machine': 'Máquina SkiErg',
  'sled machine': 'Trineo de empuje',
  'smith machine': 'Máquina Smith',
  'stability ball': 'Fitball',
  'stationary bike': 'Bicicleta estática',
  'stepmill machine': 'Escaladora',
  'tire': 'Neumático',
  'trap bar': 'Barra hexagonal',
  'upper body ergometer': 'Ergómetro de brazos',
  'weighted': 'Con peso añadido',
  'wheel roller': 'Rueda abdominal',
} as const satisfies Record<string, string>;

export type Equipment = keyof typeof EQUIPMENT_ES;

export const EQUIPMENTS = Object.keys(EQUIPMENT_ES) as Equipment[];

export function traducirEquipment(valor: string): string {
  return EQUIPMENT_ES[valor as Equipment] ?? valor;
}
