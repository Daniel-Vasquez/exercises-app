// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// ADR-03: renderizado en servidor con islas. Todas las rutas son específicas
// del usuario y viven detrás de sesión, así que el pre-render estático no aporta.
// Solo la landing pública puede optar por `export const prerender = true`.
//
// Adaptador: @astrojs/vercel (funciones serverless). NO usar @astrojs/node aquí:
// el modo standalone compila un servidor autónomo en dist/server/entry.mjs que
// Vercel nunca llega a invocar, dejando el sitio sin nada que servir.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],

  // ADR-02: Tailwind 4 se integra como plugin de Vite, no mediante
  // @astrojs/tailwind (congelado en la era Tailwind 3). La configuración
  // del tema vive en CSS, en src/styles/global.css.
  vite: {
    plugins: [tailwindcss()],
  },

  // Esquema de variables de entorno (Tanda 1). Astro las valida al arrancar y
  // las expone tipadas vía `astro:env/server`, en vez de leer process.env a
  // ciegas. Si falta una o está malformada, el fallo es explícito y temprano,
  // no un error opaco a mitad del login.
  env: {
    schema: {
      // `startsWith` atrapa comillas sobrantes o esquemas mal escritos.
      MONGODB_URI: envField.string({ context: 'server', access: 'secret', startsWith: 'mongodb' }),
      MONGODB_DB_NAME: envField.string({ context: 'server', access: 'secret' }),
      // 32 chars = lo que produce `openssl rand -base64 32`; descarta secretos de juguete.
      BETTER_AUTH_SECRET: envField.string({ context: 'server', access: 'secret', min: 32 }),
      // `url: true` rechaza un valor entrecomillado, que no parsea como URL.
      BETTER_AUTH_URL: envField.string({ context: 'server', access: 'secret', url: true }),
      // Catálogo de ejercicios. Público y sin clave: solo lo usan los scripts
      // de sincronización, nunca una petición de usuario (ADR-01).
      // Sal de la semilla del motor (§6.4). Tiene valor por defecto para que
      // el proyecto arranque, pero conviene fijar una propia: cambiarla altera
      // todas las rutinas que se generen a partir de ese momento.
      ROUTINE_SEED_SALT: envField.string({
        context: 'server',
        access: 'secret',
        default: 'coachapp-semilla-por-defecto',
      }),
      ROUTINE_ENGINE_VERSION: envField.number({
        context: 'server',
        access: 'public',
        default: 1,
      }),
      PUBLIC_EXERCISES_API_URL: envField.string({
        context: 'server',
        access: 'public',
        url: true,
        default: 'https://exercises-dataset-rho.vercel.app/api/v1',
      }),
    },
  },

  server: {
    port: 4321,
  },
});
