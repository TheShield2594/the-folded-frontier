import {defineConfig} from 'vite';

export default defineConfig({
  // Relative URLs, so dist/ works from any path (GitHub Pages serves it from /the-folded-frontier/).
  base: './',
  // three.js alone is ~600 kB, so the single game bundle is expected to be large.
  build: {chunkSizeWarningLimit: 1000},
});
