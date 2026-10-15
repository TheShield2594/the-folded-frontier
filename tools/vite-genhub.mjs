// The world generation worker's module hub (src/genworker.js).
//
// Every game module imports its shared names from './game.js', which loads the whole game: three.js setup, the DOM, the
// canvas atlas. A worker can't run most of that, so the worker gets its own hub instead. Inside the worker, './game.js'
// resolves to a virtual module that re-exports the real modules generation needs (GEN), loaded a second time with a
// '?gen' query so they import this hub too. Every other name those modules import (sound, rendering, UI, gameplay) is a
// no-op stub, worked out here from their import lists, so nothing has to be kept in sync by hand, and three.js is empty.
//
// Generation code must only use names from GEN modules: a stubbed call does nothing, so generation that started to lean
// on runtime code would quietly go wrong. The smoke test that builds the same seed in the worker and on the main thread
// and compares the worlds catches that. A GEN module's top-level code must not touch the DOM.
import fs from 'node:fs';
import path from 'node:path';

export const GEN=['util','items','world','layers','dungeons','lore','secrets','tricks','seasons'];
const HUB='\0ff-genhub',STUBS='\0ff-genhub-stubs',THREE='\0ff-genhub-three',Q='?gen';

export default function genHub(src){
  const file=m=>path.join(src,m+'.js');
  const isGen=id=>!!id&&(id.endsWith(Q)||path.basename(id.split('?')[0])==='genworker.js');
  // is `n` exported by this source? Errs towards yes: a name wrongly taken as exported fails loudly when the worker
  // links ("does not provide an export"), while one wrongly stubbed would hide the real export
  const exports=(s,n)=>{const e=n.replace(/[$]/g,'\\$&');return new RegExp(`export\\s+(?:async\\s+)?(?:function\\*?|class)\\s+${e}(?![\\w$])`).test(s)||
    [...s.matchAll(/export\s+(?:const|let)\s([^\n]*)/g)].some(m=>new RegExp(`(?:^|[\\s,;])${e}\\s*=`).test(m[1]));};
  // the stubs live in a module of their own with no imports, which the hub loads first: GEN modules read some of them at
  // their top level (items.js reads the atlas cells C), before the hub itself has run
  function stubCode(){
    const srcs=GEN.map(m=>fs.readFileSync(file(m),'utf8')),need=new Set();
    for(const s of srcs){const m=s.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/game\.js['"]/);if(m)for(const n of m[1].split(','))if(n.trim())need.add(n.trim());}
    const stubs=[...need].filter(n=>!srcs.some(s=>exports(s,n)));
    return 'const S=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>0:k==="then"?undefined:S,apply:()=>S,construct:()=>S});\n'+
      (stubs.length?`export const ${stubs.map(n=>n+'=S').join(',')};`:'export {};');}
  const hubCode=()=>[`export * from ${JSON.stringify(STUBS)};`,...GEN.map(m=>`export * from ${JSON.stringify(file(m)+Q)};`)].join('\n');
  return {
    name:'ff-genhub',enforce:'pre',
    resolveId(source,importer){
      if(source==='./game.js'&&isGen(importer))return HUB;
      if(source===STUBS)return STUBS;
      // generation draws nothing: three.js is an empty namespace in the worker (a GEN module using it at its top level
      // throws there), which keeps it out of the worker's bundle
      if(source==='three'&&isGen(importer))return THREE;
      // relative imports between GEN modules stay in the worker's graph
      if(importer&&importer.endsWith(Q)&&source.startsWith('./')&&source!=='./game.js')return path.join(path.dirname(importer.slice(0,-Q.length)),source)+Q;
      return null;},
    load(id){if(id===HUB)return hubCode();if(id===STUBS)return stubCode();if(id===THREE)return 'export {};';return null;},
  };}
