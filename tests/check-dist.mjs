// Checks that `npm run build` bundled none of the smoke tests' art pictures (tests/fixtures/art/).
// Vite inlines images under 4 kB as base64 and copies larger ones into dist/assets/, so look for both.
// Run after a build: `node tests/check-dist.mjs` (CI does, in test.yml).
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

const walk=d=>readdirSync(d).flatMap(f=>{const p=join(d,f);return statSync(p).isDirectory()?walk(p):[p];});
const fixtures=walk('tests/fixtures/art').filter(p=>/\.(png|webp)$/.test(p));
const dist=walk('dist').map(p=>({p,b:readFileSync(p)}));
const found=[];
for(const f of fixtures){const b=readFileSync(f),b64=b.toString('base64');
  for(const d of dist)if(d.b.equals(b)||d.b.includes(b64))found.push(`${f} in ${d.p}`);}
if(found.length){console.error('The build contains test art:\n  '+found.join('\n  '));process.exit(1);}
console.log(`dist/ holds none of the ${fixtures.length} test art pictures.`);
