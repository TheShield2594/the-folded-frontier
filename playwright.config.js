// Playwright smoke tests (tests/). Run with `npm test`; the config starts the Vite dev server itself.
import {defineConfig,devices,chromium} from '@playwright/test';
import {existsSync} from 'node:fs';

// Claude Code cloud sessions ship one preinstalled Chromium that may not match this Playwright version;
// use it when Playwright's own build isn't installed. Elsewhere, run `npx playwright install chromium`.
const pre='/opt/pw-browsers/chromium';
const executablePath=!existsSync(chromium.executablePath())&&existsSync(pre)?pre:undefined;
const PORT=5199;

export default defineConfig({
  testDir:'tests',
  // world generation and software WebGL are slow in headless Chromium
  timeout:120_000,
  expect:{timeout:30_000},
  fullyParallel:false,
  workers:1,
  forbidOnly:!!process.env.CI,
  retries:0,
  reporter:process.env.CI?[['list'],['html',{open:'never'}]]:'list',
  use:{
    ...devices['Desktop Chrome'],
    baseURL:`http://localhost:${PORT}/`,
    trace:'retain-on-failure',
    launchOptions:{executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']},
  },
  webServer:{
    command:`npx vite --port ${PORT} --strictPort`,
    url:`http://localhost:${PORT}/`,
    reuseExistingServer:!process.env.CI,
    timeout:60_000,
  },
});
