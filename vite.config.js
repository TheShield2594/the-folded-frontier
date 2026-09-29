import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

// Hand-made art (src/art.js) is globbed from '@art', which is assets/art/. The smoke tests point it at
// tests/fixtures/art/ with FF_ART_DIR (playwright.config.js), so their test pictures never reach a real build.
const art=fileURLToPath(new URL(process.env.FF_ART_DIR||'assets/art',import.meta.url));

export default defineConfig({
  // Relative URLs, so dist/ works from any path (GitHub Pages serves it from /the-folded-frontier/).
  base: './',
  resolve: {alias: {'@art': art}},
  // three.js alone is ~600 kB, so the single game bundle is expected to be large.
  build: {chunkSizeWarningLimit: 1000},
});
