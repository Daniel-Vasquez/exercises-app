/// <reference types="astro/client" />

// La Tanda 1 amplía App.Locals con `user` y `session` de Better Auth,
// inyectados por src/middleware.ts.
declare namespace App {
  interface Locals {}
}
