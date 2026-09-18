/**
 * Genera `src/lib/i18n/generated/exercise-names.es.json`.
 *
 * Aplica el traductor por tokens a los 1.324 nombres y escribe el resultado
 * como un JSON plano `id → nombre en español`, PENSADO PARA REVISIÓN HUMANA.
 *
 * Que esté versionado en git es el punto: corregir "Prensa de banco" por
 * "Press de banca" es un diff de una línea, revisable, sin tocar código ni
 * volver a ejecutar nada. En el sync el lookup es O(1) por `id`.
 *
 * Uso:  npm run build:names
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { ClienteEjercicios } from '../src/lib/exercises/api-client.ts';
import { traducirNombre } from '../src/lib/i18n/name-translator.ts';

const baseUrl = process.env['PUBLIC_EXERCISES_API_URL'];
if (!baseUrl) {
  console.error('❌ Falta PUBLIC_EXERCISES_API_URL.');
  console.error('   Ejecuta con: node --env-file=.env scripts/build-name-dictionary.ts');
  process.exit(1);
}

const SALIDA = 'src/lib/i18n/generated/exercise-names.es.json';
const INFORME = 'sync-report.json';

const cliente = new ClienteEjercicios({ baseUrl });

console.log('Descargando catálogo…');
const nombres: Record<string, string> = {};
const enIngles: Record<string, string> = {};
const frecuenciaDesconocidos = new Map<string, number>();
let total = 0;
let completos = 0;

// Se conservan las correcciones manuales ya hechas: regenerar no debe
// deshacer el trabajo de revisión.
const previos: Record<string, string> = existsSync(SALIDA)
  ? (JSON.parse(readFileSync(SALIDA, 'utf8')) as Record<string, string>)
  : {};
const revisadosPrevios = new Set(Object.keys(previos));

for await (const lote of cliente.todosLosEjercicios()) {
  for (const ejercicio of lote) {
    total += 1;
    enIngles[ejercicio.id] = ejercicio.name;

    const { nombre, desconocidos } = traducirNombre(ejercicio.name);
    nombres[ejercicio.id] = nombre;

    if (desconocidos.length === 0) completos += 1;
    for (const token of desconocidos) {
      frecuenciaDesconocidos.set(token, (frecuenciaDesconocidos.get(token) ?? 0) + 1);
    }
  }
  process.stdout.write(`\r  ${total} ejercicios procesados…`);
}
console.log();

mkdirSync('src/lib/i18n/generated', { recursive: true });

// Orden estable por id → los diffs de git son legibles.
const ordenado = Object.fromEntries(Object.entries(nombres).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(SALIDA, `${JSON.stringify(ordenado, null, 2)}\n`, 'utf8');

const pendientes = [...frecuenciaDesconocidos.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([token, veces]) => ({ token, veces }));

writeFileSync(
  INFORME,
  `${JSON.stringify(
    {
      generado: new Date().toISOString(),
      total,
      traduccion_completa: completos,
      porcentaje: Number(((completos / total) * 100).toFixed(1)),
      tokens_sin_traducir: pendientes.length,
      pendientes: pendientes.slice(0, 120),
      muestra: Object.fromEntries(
        Object.entries(ordenado)
          .slice(0, 25)
          .map(([id, es]) => [id, { en: enIngles[id], es }]),
      ),
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const pct = ((completos / total) * 100).toFixed(1);
console.log(`\n  Total ................ ${total}`);
console.log(`  Traducción completa .. ${completos} (${pct}%)`);
console.log(`  Tokens pendientes .... ${pendientes.length}`);
if (revisadosPrevios.size) {
  console.log(`  ⚠️  Se sobrescribieron ${revisadosPrevios.size} entradas previas.`);
}
console.log(`\n  Diccionario → ${SALIDA}`);
console.log(`  Informe     → ${INFORME}`);

if (pendientes.length) {
  console.log('\n  Tokens sin traducir más frecuentes:');
  for (const { token, veces } of pendientes.slice(0, 25)) {
    console.log(`    ${String(veces).padStart(4)} × ${token}`);
  }
}
