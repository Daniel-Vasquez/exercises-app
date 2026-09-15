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

  console.log('\nÍndices al día.');
} catch (error) {
  console.error('\n❌ Error creando índices:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.close();
}
