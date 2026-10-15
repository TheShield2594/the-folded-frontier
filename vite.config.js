import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import genHub from './tools/vite-genhub.mjs';

// Hand-made art (src/art.js) is globbed from '@art', which is assets/art/. The smoke tests point it at
// tests/fixtures/art/ with FF_ART_DIR (playwright.config.js), so their test pictures never reach a real build.
const art=fileURLToPath(new URL(process.env.FF_ART_DIR||'assets/art',import.meta.url));
const src=fileURLToPath(new URL('src',import.meta.url));

export default defineConfig({
  // Relative URLs, so dist/ works from any path (GitHub Pages serves it from /the-folded-frontier/).
  base: './',
  resolve: {alias: {'@art': art}},
  // World generation runs in a worker with its own module hub (tools/vite-genhub.mjs): in dev the worker's modules go
  // through the main plugins, in a build through worker.plugins.
  plugins: [genHub(src)],
  worker: {format: 'es', plugins: ()=>[genHub(src)]},
  // three.js alone is ~600 kB, so the single game bundle is expected to be large.
  build: {chunkSizeWarningLimit: 1000},
});
