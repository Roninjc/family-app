import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Config separada de vite.config.ts: los módulos testeados no dependen de
// SvelteKit, así que basta el plugin de svelte (para los tests de componente)
// sin cargar el plugin completo de sveltekit.
export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      // SvelteKit virtual modules stubbed for tests
      '$app/environment': fileURLToPath(
        new URL('./tests/mocks/app-environment.ts', import.meta.url)
      ),
      '$env/dynamic/private': fileURLToPath(
        new URL('./tests/mocks/env-dynamic-private.ts', import.meta.url)
      ),
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
    },
    // Los tests de componente montan Svelte en jsdom: hay que resolver el
    // runtime de cliente, no el de SSR.
    conditions: ['browser']
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
})
