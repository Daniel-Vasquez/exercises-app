// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// ADR-03: renderizado en servidor con islas. Todas las rutas son específicas
// del usuario y viven detrás de sesión, así que el pre-render estático no aporta.
// Solo la landing pública puede optar por `export const prerender = true`.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
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
