import { createAuthClient } from 'better-auth/react';

/**
 * Cliente de autenticación para las islas React.
 *
 * Sin `baseURL`: al servirse desde el mismo origen que la app, el cliente usa
 * rutas relativas. Fijarlo aquí obligaría a exponer la URL como variable
 * PUBLIC_ y a mantenerla sincronizada entre entornos — justo el tipo de
 * desajuste que rompe las cookies de sesión.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
