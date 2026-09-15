/// <reference types="astro/client" />

import type { Sesion } from '@/lib/auth/auth';

declare global {
  namespace App {
    interface Locals {
      /** Usuario de la sesión actual, o null si es anónimo. Lo fija el middleware. */
      user: Sesion['user'] | null;
      /** Sesión activa, o null. La fija el middleware. */
      session: Sesion['session'] | null;
    }
  }
}

export {};
