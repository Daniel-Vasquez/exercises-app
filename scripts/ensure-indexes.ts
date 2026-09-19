/**
 * Crea los índices que la aplicación necesita.
 *
 * Better Auth no crea índices por su cuenta: sin esto, `user` y `session`
 * solo tienen `_id_`. Dos consecuencias concretas:
 *
 *   1. Cada petición pasa por el middleware, que resuelve la sesión buscando
 *      por `token`. Sin índice eso es un escaneo completo de `session` en
 *      TODAS las peticiones, y empeora según crece la colección.
 *   2. Sin índice único en `user.email`, dos registros simultáneos con el
 *      mismo correo pueden colarse: la comprobación previa y la inserción no
 *      son atómicas.
 *
 * Es idempotente: crear un índice existente no hace nada.
 *
 * Uso:  npm run ensure:indexes
 */
import { MongoClient } from 'mongodb';

const uri = process.env['MONGODB_URI'];
const nombreDb = process.env['MONGODB_DB_NAME'];

if (!uri || !nombreDb) {
  console.error('❌ Faltan MONGODB_URI o MONGODB_DB_NAME.');
  console.error('   Ejecuta con: node --env-file=.env scripts/ensure-indexes.ts');
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });

try {
  await client.connect();
  const db = client.db(nombreDb);
  console.log(`Base de datos: ${db.databaseName}\n`);

  // --- Colecciones de Better Auth -----------------------------------------
  await db.collection('user').createIndex({ email: 1 }, { unique: true, name: 'email_unico' });
  console.log('  ✅ user.email_unico (único)');

  await db.collection('session').createIndex({ token: 1 }, { unique: true, name: 'token_unico' });
  console.log('  ✅ session.token_unico (único) — lo usa el middleware en cada petición');

  await db.collection('session').createIndex({ userId: 1 }, { name: 'por_usuario' });
  console.log('  ✅ session.por_usuario');

  await db.collection('session').createIndex({ expiresAt: 1 }, { name: 'por_caducidad' });
  console.log('  ✅ session.por_caducidad');
  // Nota: NO se pone TTL (expireAfterSeconds) todavía. Borrar sesiones
  // automáticamente es deseable, pero conviene decidirlo en la Tanda 9 tras
  // comprobar cómo trata Better Auth la renovación, no de forma implícita aquí.

  await db.collection('account').createIndex({ userId: 1 }, { name: 'por_usuario' });
  console.log('  ✅ account.por_usuario');

  await db
    .collection('account')
    .createIndex({ providerId: 1, accountId: 1 }, { name: 'por_proveedor' });
  console.log('  ✅ account.por_proveedor');

  // --- Catálogo de ejercicios (Tanda 2) -----------------------------------
  await db.collection('exercises').createIndex({ id: 1 }, { unique: true, name: 'id_unico' });
  console.log('  ✅ exercises.id_unico (único) — lo usa el upsert del sync');

  // Consulta de pool del motor de rutinas: filtra por foco muscular del día
  // cruzado con el material disponible del usuario.
  await db
    .collection('exercises')
    .createIndex({ body_part: 1, equipment: 1 }, { name: 'por_zona_y_equipo' });
  console.log('  ✅ exercises.por_zona_y_equipo');

  await db.collection('exercises').createIndex({ target: 1 }, { name: 'por_target' });
  console.log('  ✅ exercises.por_target');

  await db.collection('exercises').createIndex({ patterns: 1 }, { name: 'por_patron' });
  console.log('  ✅ exercises.por_patron — exclusiones por lesión');

  // Búsqueda en español. El endpoint /search de la API remota queda
  // descartado: solo entiende inglés (§3.5).
  await db
    .collection('exercises')
    .createIndex(
      { name_es: 'text', search_blob: 'text' },
      { name: 'busqueda_es', default_language: 'spanish', weights: { name_es: 10, search_blob: 1 } },
    );
  console.log('  ✅ exercises.busqueda_es (texto, español)');

  // --- Perfiles (Tanda 3) --------------------------------------------------
  // Único: un solo perfil por usuario. Rehacer el onboarding actualiza,
  // no duplica, y la base de datos lo garantiza aunque la app fallara.
  await db.collection('profiles').createIndex({ userId: 1 }, { unique: true, name: 'usuario_unico' });
  console.log('  ✅ profiles.usuario_unico (único)');

  // --- Rutinas (Tanda 4) ---------------------------------------------------
  await db.collection('routines').createIndex({ userId: 1, status: 1 }, { name: 'por_usuario_estado' });
  console.log('  ✅ routines.por_usuario_estado — busca la rutina activa');

  await db.collection('routines').createIndex({ userId: 1, version: -1 }, { name: 'por_version' });
  console.log('  ✅ routines.por_version');

  console.log('\nÍndices al día.');
} catch (error) {
  console.error('\n❌ Error creando índices:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.close();
}
