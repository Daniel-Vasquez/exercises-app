/**
 * Sincroniza el catálogo de ejercicios a nuestra MongoDB (ADR-01).
 *
 * Descarga los 1.324 ejercicios, los TRADUCE EN LA INGESTA y los guarda
 * localmente. La app nunca vuelve a llamar a la API externa en una petición
 * de usuario: el motor de rutinas hace decenas de consultas de pool por
 * generación, y la API vive en un M0 gratuito que se pausa por inactividad.
 *
 * Idempotente: `upsert` por `id`. Ejecutarlo dos veces deja 1.324, no 2.648.
 *
 * Uso:  npm run sync:exercises
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { MongoClient, type AnyBulkWriteOperation, type Document } from 'mongodb';
import { ClienteEjercicios, type EjercicioApi } from '../src/lib/exercises/api-client.ts';
import { traducirNombre } from '../src/lib/i18n/name-translator.ts';
import { traducirBodyPart } from '../src/lib/i18n/body-parts.es.ts';
import { traducirEquipment } from '../src/lib/i18n/equipment.es.ts';
import { traducirMusculo, traducirMusculos } from '../src/lib/i18n/muscles.es.ts';
import { derivarPatrones } from '../src/lib/engine/patterns.ts';

const uri = process.env['MONGODB_URI'];
const nombreDb = process.env['MONGODB_DB_NAME'];
const baseUrl = process.env['PUBLIC_EXERCISES_API_URL'];

if (!uri || !nombreDb || !baseUrl) {
  console.error('❌ Faltan MONGODB_URI, MONGODB_DB_NAME o PUBLIC_EXERCISES_API_URL.');
  console.error('   Ejecuta con: node --env-file=.env scripts/sync-exercises.ts');
  process.exit(1);
}

const DICCIONARIO = 'src/lib/i18n/generated/exercise-names.es.json';
const nombresRevisados: Record<string, string> = existsSync(DICCIONARIO)
  ? (JSON.parse(readFileSync(DICCIONARIO, 'utf8')) as Record<string, string>)
  : {};

if (!Object.keys(nombresRevisados).length) {
  console.warn('⚠️  No hay diccionario de nombres. Ejecuta antes: npm run build:names');
}

/** Quita acentos y pasa a minúsculas, para el blob de búsqueda. */
function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function transformar(e: EjercicioApi) {
  // Capa 2A: diccionario revisado por id. Capa 2B: traductor por tokens.
  // Capa 2C: el nombre original, que nunca deja el sync a medias.
  const delDiccionario = nombresRevisados[e.id];
  let nombreEs: string;
  let fuente: 'dict' | 'tokens' | 'passthrough';

  if (delDiccionario) {
    nombreEs = delDiccionario;
    fuente = 'dict';
  } else {
    const { nombre, desconocidos } = traducirNombre(e.name);
    nombreEs = nombre;
    fuente = desconocidos.length && nombre === e.name ? 'passthrough' : 'tokens';
  }

  const bodyPartEs = traducirBodyPart(e.body_part);
  const targetEs = traducirMusculo(e.target);
  const equipmentEs = traducirEquipment(e.equipment);
  const muscleGroupEs = traducirMusculo(e.muscle_group);
  const secundariosEs = traducirMusculos(e.secondary_muscles ?? []);

  return {
    id: e.id,
    name_en: e.name,
    name_es: nombreEs,

    // Claves CANÓNICAS en inglés: son las que filtran en el motor.
    // El español es solo presentación (§3.6).
    body_part: e.body_part,
    body_part_es: bodyPartEs,
    target: e.target,
    target_es: targetEs,
    equipment: e.equipment,
    equipment_es: equipmentEs,
    muscle_group: e.muscle_group,
    muscle_group_es: muscleGroupEs,
    secondary_muscles: e.secondary_muscles ?? [],
    secondary_muscles_es: secundariosEs,
    category: e.category,
    tags: e.tags ?? [],

    // Ya vienen en español desde la API: passthrough puro (capa 0).
    instructions: e.instructions,
    instruction_steps: e.instruction_steps ?? [],

    media: e.media,
    attribution: e.attribution ?? null,

    // Derivado en la ingesta para el motor de rutinas (§6.6).
    patterns: derivarPatrones(e),

    search_blob: normalizarBusqueda(
      [nombreEs, e.name, bodyPartEs, targetEs, equipmentEs, muscleGroupEs, ...secundariosEs].join(' '),
    ),

    translation: { source: fuente, at: new Date().toISOString() },
    synced_at: new Date(),
  };
}

const cliente = new ClienteEjercicios({ baseUrl });
const mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });

try {
  console.log('Comprobando la API…');
  if (!(await cliente.salud())) {
    console.warn('⚠️  /health no responde. Se continúa igualmente.');
  }

  await mongo.connect();
  const coleccion = mongo.db(nombreDb).collection('exercises');

  const conteo = { dict: 0, tokens: 0, passthrough: 0 };
  let total = 0;
  let insertados = 0;
  let actualizados = 0;

  console.log('Descargando, traduciendo y escribiendo…');
  // Se escribe lote a lote (100 documentos) en vez de acumular los 1.324 en
  // memoria y enviarlos de golpe: las instrucciones son largas y un único
  // bulkWrite gigante es innecesariamente pesado.
  for await (const lote of cliente.todosLosEjercicios()) {
    const operaciones: AnyBulkWriteOperation<Document>[] = [];

    for (const bruto of lote) {
      const doc = transformar(bruto);
      conteo[doc.translation.source] += 1;
      total += 1;
      operaciones.push({
        updateOne: { filter: { id: doc.id }, update: { $set: doc }, upsert: true },
      });
    }

    const parcial = await coleccion.bulkWrite(operaciones, { ordered: false });
    insertados += parcial.upsertedCount;
    actualizados += parcial.modifiedCount;
    process.stdout.write(`\r  ${total} procesados…`);
  }
  console.log();

  const enBd = await coleccion.countDocuments();
  const sinTaxonomia = await coleccion.countDocuments({
    $or: [
      { body_part_es: { $in: [null, ''] } },
      { target_es: { $in: [null, ''] } },
      { equipment_es: { $in: [null, ''] } },
    ],
  });

  const pctTraducido = (((conteo.dict + conteo.tokens) / total) * 100).toFixed(1);

  console.log('\n  === Resultado ===');
  console.log(`  Procesados ......... ${total}`);
  console.log(`  Insertados ......... ${insertados}`);
  console.log(`  Actualizados ....... ${actualizados}`);
  console.log(`  En la colección .... ${enBd}`);
  console.log('\n  Fuente de la traducción del nombre:');
  console.log(`    diccionario ...... ${conteo.dict}`);
  console.log(`    tokens ........... ${conteo.tokens}`);
  console.log(`    passthrough (en) . ${conteo.passthrough}`);
  console.log(`    traducidos ....... ${pctTraducido}%`);
  console.log(`\n  Taxonomía sin traducir: ${sinTaxonomia} ${sinTaxonomia === 0 ? '✅' : '❌'}`);

  writeFileSync(
    'sync-report.json',
    `${JSON.stringify(
      { sincronizado: new Date().toISOString(), total, en_bd: enBd, fuentes: conteo, sin_taxonomia: sinTaxonomia },
      null,
      2,
    )}\n`,
    'utf8',
  );
} catch (error) {
  console.error('\n❌', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await mongo.close();
}
