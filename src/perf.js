// Performance overlay for testing on real hardware (issue #16). Open the game with ?perf in the URL.
// Frame times are split into game update, chunk rebuilds and rendering (CPU side; the GPU shows up as
// a lower FPS than the three add up to). World fold/load and save timings are recorded even when the
// overlay is off, so the report has them. The buttons stage the busy scenes the issue asks about.
import {
  $,W,H,SIZES,SPAWNX,surf,worldSize,seedText,enemies,npcs,projs,parts,player,renderer,curBio,spawnEnemy,startArmy,toast,state,
} from './game.js';

// ================= perf =================
export const perf={on:/[?&]perf\b/.test(location.search),ft:[],up:[],ch:[],re:[],fold:null,load:0,save:null,code:0,samples:[],t:0,lap:0,laps:{}};
const FN=300;// frames in the rolling window (about 5 s at 60 FPS)
export function perfLap(k){const n=performance.now();if(k)perf.laps[k]=n-perf.lap;else perf.laps={};perf.lap=n;}
export function perfFold(){const l=perf.laps;perf.fold={...l,total:Object.values(l).reduce((a,b)=>a+b,0)};}
export function perfLoad(ms){perf.load=ms;}
export function perfSave(ms,chars,ok){perf.save={ms,chars,ok};}
export function perfCode(n){perf.code=n;}
const push=(a,v)=>{a.push(v);if(a.length>FN)a.shift();};
export function perfFrame(el,up,ch,re){if(!perf.on)return;push(perf.ft,el*1000);push(perf.up,up);push(perf.ch,ch);push(perf.re,re);
  const n=performance.now();if(n-perf.t>500){perf.t=n;drawPerf();}}
export function perfStart(){if(perf.on){renderer.info.autoReset=false;renderer.info.reset();}}
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0,pct=(a,p)=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*p))];};
const f1=v=>v.toFixed(1),f0=v=>Math.round(v);
function storeChars(){let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);n+=k.length+(localStorage.getItem(k)||'').length;}}catch(e){}return n;}
function gpu(){try{const gl=renderer.getContext(),x=gl.getExtension('WEBGL_debug_renderer_info');return x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}catch(e){return '?';}}
function stats(){const ft=perf.ft,a=avg(ft);return {fps:a?1000/a:0,low:(p=>p?1000/p:0)(pct(ft,.99)),ms:a,p99:pct(ft,.99),max:ft.length?Math.max(...ft):0,up:avg(perf.up),ch:avg(perf.ch),re:avg(perf.re),upMax:perf.up.length?Math.max(...perf.up):0,
  calls:renderer.info.render.calls,tris:renderer.info.render.triangles,en:enemies.length,npc:npcs.length,pj:projs.length,pt:parts.length,bio:curBio||'-',x:Math.round(player.x),y:Math.round(player.y)};}
function lines(){const s=stats(),S=SIZES[worldSize]||SIZES.s,f=perf.fold,v=perf.save;
  return [`FPS ${f0(s.fps)} · 1% low ${f0(s.low)} · frame ${f1(s.ms)} ms (99th ${f1(s.p99)}, worst ${f1(s.max)})`,
    `CPU update ${f1(s.up)} (worst ${f1(s.upMax)}) · chunks ${f1(s.ch)} · render ${f1(s.re)} ms`,
    `Draw calls ${s.calls} · triangles ${Math.round(s.tris/1000)}k · ${innerWidth}×${innerHeight} @${devicePixelRatio}x`,
    `${S.name} ${W}×${H} · ${s.bio} at ${s.x},${s.y} · enemies ${s.en} · NPCs ${s.npc} · shots ${s.pj} · particles ${s.pt}`,
    `Fold ${f?`${f0(f.total)} ms (gen ${f0(f.gen||0)}, murals ${f0(f.lore||0)}, chunks ${f0(f.chunks||0)}, backdrop ${f0(f.back||0)})`:'-'} · load ${perf.load?f0(perf.load)+' ms':'-'}`,
    `Save ${v?`${v.ok?'':'FAILED '}${(v.chars/1e6).toFixed(2)}M chars in ${f0(v.ms)} ms`:'-'} · storage ${(storeChars()/1e6).toFixed(2)}M chars · code ${perf.code?(perf.code/1024).toFixed(0)+' KB':'-'}`];}
function drawPerf(){const el=$('perf');if(!el)return;$('perfTxt').textContent=lines().join('\n');}
export function perfReport(){const n=navigator,s=stats();
  return [`Folded Frontier perf report · ${new Date().toISOString()}`,`Browser ${n.userAgent}`,`GPU ${gpu()} · ${n.hardwareConcurrency||'?'} threads · ${n.deviceMemory?n.deviceMemory+' GB':'? GB'} · screen ${screen.width}×${screen.height}`,
    `World seed ${seedText}`,...lines(),...perf.samples.map(x=>`Sample ${x.k}: FPS ${f0(x.fps)}, 1% low ${f0(x.low)}, update ${f1(x.up)} ms (worst ${f1(x.upMax)}), render ${f1(x.re)} ms, ${x.calls} calls, enemies ${x.en}, particles ${x.pt}`)].join('\n');}
// busy scenes: the town green, a Paper Army invasion, a boss fight
const STAGE={
  town:()=>{player.x=SPAWNX+.5;player.y=surf[SPAWNX]+2;player.vx=player.vy=0;},
  army:()=>startArmy(),
  boss:()=>spawnEnemy('king',player.x+14,player.y+6),
};
if(perf.on){$('perf').hidden=false;
  $('perf').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;b.blur();const k=b.dataset.p;
    if(STAGE[k]){if(state!=='play'){toast('Start or continue a world first.','bad');return;}STAGE[k]();perf.ft.length=perf.up.length=perf.ch.length=perf.re.length=0;toast(`Staged: ${k}. Take a sample after a few seconds.`);}
    else if(k==='sample'){const s=stats();perf.samples.push({k:`${s.bio} (${s.x},${s.y})`,...s});toast(`Sample ${perf.samples.length} kept.`,'good');}
    else if(k==='copy'){const r=perfReport();const ok=()=>toast('Report copied.','good');const fb=()=>{console.log(r);toast('Copying was blocked; the report is in the console.');};try{navigator.clipboard.writeText(r).then(ok,fb);}catch(_){fb();}}});}
