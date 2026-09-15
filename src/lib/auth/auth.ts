import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from 'astro:env/server';
import { obtenerCliente, obtenerDb } from '@/lib/db/client';

/**
 * Configuración de Better Auth (ADR-04).
 *
 * Según la especificación del proyecto: registro y login con nombre, correo y
 * contraseña. SIN verificación de correo y SIN recuperación de contraseña, por
 * eso no hay proveedor de email configurado.
 *
 * El adaptador recibe el cliente singleton compartido, de modo que las
 * colecciones de Better Auth (user, session, account, verification) y las de
 * dominio (profiles, routines, workout_logs) viven en la misma base de datos
 * y comparten un único pool de conexiones.
 */
export const auth = betterAuth({
  appName: 'CoachApp',
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,

  database: mongodbAdapter(obtenerDb(), {
    // Pasar el cliente habilita transacciones. Atlas es un replica set, así
    // que las soporta; en un mongod suelto habría que poner transaction: false.
    client: obtenerCliente(),
  }),

  emailAndPassword: {
    enabled: true,
    // Sin verificación de correo (spec): el usuario entra al registrarse.
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  session: {
    // 30 días: nadie quiere volver a iniciar sesión en mitad del gimnasio.
    expiresIn: 60 * 60 * 24 * 30,
    // Renueva la sesión si se usa pasado un día, para que el uso habitual
    // no la deje caducar nunca.
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  advanced: {
    // El prefijo `__Secure-` de la cookie lo decide esta opción, no el
    // atributo `secure` de abajo. Fijarla explícitamente evita depender de
    // cómo Better Auth infiera el entorno.
    useSecureCookies: import.meta.env.PROD,

    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      // Ligado al modo de compilación, NO al esquema de BETTER_AUTH_URL.
      // Si se dedujera de la URL, un .env local que apunte al dominio de
      // producción emitiría cookies con prefijo `__Secure-`, que el navegador
      // rechaza sobre http://localhost: la sesión no persistiría en local y
      // el fallo sería silencioso.
      secure: import.meta.env.PROD,
    },
  },

  // Orígenes permitidos. En desarrollo se admite localhost además de la URL
  // configurada, para que la app funcione aunque el .env local apunte a
  // producción por descuido.
  trustedOrigins: import.meta.env.PROD
    ? [BETTER_AUTH_URL]
    : [BETTER_AUTH_URL, 'http://localhost:4321', 'http://127.0.0.1:4321'],
});

export type Sesion = typeof auth.$Infer.Session;
export type Usuario = Sesion['user'];
