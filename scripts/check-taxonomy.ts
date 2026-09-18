/**
 * Verifica que los diccionarios cubren TODA la taxonomía que expone la API.
 *
 * Pensado para CI: si el dataset crece y aparece un `equipment` o un `target`
 * nuevo, esto falla aquí en vez de mostrarle al usuario una etiqueta en
 * inglés en producción.
 *
 * Uso:  npm run check:taxonomy
 */
import { ClienteEjercicios } from '../src/lib/exercises/api-client.ts';
import { BODY_PARTS_ES } from '../src/lib/i18n/body-parts.es.ts';
import { EQUIPMENT_ES } from '../src/lib/i18n/equipment.es.ts';
import { MUSCLES_ES } from '../src/lib/i18n/muscles.es.ts';

const baseUrl = process.env['PUBLIC_EXERCISES_API_URL'];
if (!baseUrl) {
  console.error('❌ Falta PUBLIC_EXERCISES_API_URL.');
  process.exit(1);
}

const cliente = new ClienteEjercicios({ baseUrl });

const comprobaciones = [
  { recurso: 'body-parts', diccionario: BODY_PARTS_ES, archivo: 'body-parts.es.ts' },
  { recurso: 'equipments', diccionario: EQUIPMENT_ES, archivo: 'equipment.es.ts' },
  { recurso: 'targets', diccionario: MUSCLES_ES, archivo: 'muscles.es.ts' },
  { recurso: 'muscles', diccionario: MUSCLES_ES, archivo: 'muscles.es.ts' },
] as const;

let fallos = 0;

for (const { recurso, diccionario, archivo } of comprobaciones) {
  const valores = await cliente.taxonomia(recurso);
  const faltantes = valores.filter((v) => !(v in diccionario));

  if (faltantes.length) {
    fallos += faltantes.length;
    console.error(`❌ ${recurso}: ${faltantes.length} sin traducir → añádelos a ${archivo}`);
    for (const f of faltantes) console.error(`     '${f}': '',`);
  } else {
    console.log(`✅ ${recurso.padEnd(12)} ${valores.length} términos, todos traducidos`);
  }
}

if (fallos) {
  console.error(`\n❌ ${fallos} término(s) sin traducción.`);
  process.exit(1);
}
console.log('\nTaxonomía completa.');
