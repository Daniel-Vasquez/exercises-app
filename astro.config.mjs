// @ts-check
import { defineConfig } from 'astro/config';
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

  server: {
    port: 4321,
  },
});
