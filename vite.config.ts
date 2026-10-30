import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Relative base so the build works under https://<user>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { chunkSizeWarningLimit: 1600 },
});
