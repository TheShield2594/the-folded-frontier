// Player feel touches (issues #132, #138): footsteps and landings by surface, movement sounds, footprints, speed lines,
// slow motion on big moments, hit confirmation on the weapon and the low-health state.
import * as THREE from 'three';
import {
  $,burst,clamp,emit,hasAcc,HARD_LAND,invOpen,ITEMS,lightAt,mapOpen,player,postOn,rand,reduceMotion,scene,season,SET,SFX,sh,
  slowAudio,SMAT,T,tileAt,TP,weather,
} from './game.js';

// ================= footsteps =================
// A foot plants where the walk and run clips swing the legs to their extremes: gait phases STEP_PH (both rigs). What's underfoot
// is read at the feet first (ink or a drift you wade through), then from the ground tile (SMAT). Soft ground keeps prints.
export const STEP_PH=[.25,.75];
const METAL=new Set(['cu','fe','au','fr','em','fo','warden']);
const DUSTK={snow:'dustSnow',sand:'dustSand',ink:'splashInk'};
export function groundTile(p){const gy=Math.floor(p.y-.5);let t=tileAt(Math.floor(p.x),gy);if(!t)t=tileAt(Math.floor(p.x-p.w*.4),gy)||tileAt(Math.floor(p.x+p.w*.4),gy);return t;}
export function footMat(p){const ft=tileAt(Math.floor(p.x),Math.floor(p.y+.1));if(p.inLiq||ft===T.INK||ft===T.LAVA)return'ink';if(ft===T.DRIFT)return'snow';return SMAT[groundTile(p)]||'stone';}
const metalWorn=()=>player.armor.some(s=>s&&METAL.has(s.id.replace(/^(helm|mail|legs)_?/,'')));
// prints stay on sand, snow and drifts, and on dirt and grass in spring or rain
const soft=(m,t)=>m==='snow'||m==='sand'||(m==='dirt'&&(t===T.DIRT||t===T.GRASS)&&(weather==='rain'||season().k==='spring'));
const crossed=(a,b,ph)=>b>=a?a<ph&&b>=ph:a<ph||b>=ph;
function surfaceDust(p,m,t,x,n=1){const k=DUSTK[m]||(m==='dirt'&&t===T.GRASS&&season().k==='fall'?'dustLeaf':null);
  if(k)emit(k,x,p.y+.05,{n:Math.max(1,Math.round((PFXN[k]||3)*n*.5))});
  if(!k||k==='dustLeaf'){if(t&&TP[t]&&TP[t].solid)burst(x,p.y+.05,[sh(TP[t].col,1.1),'#e9dfc9'],Math.round(2*n),1.2,{up:1.2,grav:6,life:.5});}}
const PFXN={dustSnow:4,dustSand:5,dustLeaf:2,splashInk:6};
function footfall(p,side){const m=footMat(p),t=groundTile(p),x=p.x-p.face*.15;SFX.step(m,.6+.4*clamp(Math.abs(p.vx)/7,0,1));surfaceDust(p,m,t,x);if(soft(m,t))footprint(x,Math.floor(p.y-.5)+1,side,t,0);}
// called at the end of updatePlayer() with the clip it picked
export function feelUpdate(dt,c){const p=player;
  if(p.onGround&&(c==='walk'||c==='run')&&!p.mount&&p.gait0!=null)for(const ph of STEP_PH)if(crossed(p.gait0,p.gait,ph))footfall(p,ph===STEP_PH[0]?0:1);
  p.gait0=c==='walk'||c==='run'?p.gait:null;
  // a mount's hooves keep their own phase, two knocks per contact
  if(p.mount&&p.onGround&&Math.abs(p.vx)>.5){const h0=p.hoof||0;p.hoof=h0+dt*Math.abs(p.vx)/2.2;if(Math.floor(p.hoof*2)!==Math.floor(h0*2)){const m=footMat(p),t=groundTile(p),x=p.x-p.face*.4;SFX.hoof(m,.8);surfaceDust(p,m,t,x,1.5);if(soft(m,t))footprint(x,Math.floor(p.y-.5)+1,Math.floor(p.hoof*2)&1,t,1);}}
  // rope creak on every other hand-over-hand
  if(p.climb){const k=Math.floor((p.climbT||0)/2);if(k!==p.creakK){if(p.creakK!=null)SFX.creak();p.creakK=k;}}else p.creakK=null;
  p.hitFlash=Math.max(0,(p.hitFlash||0)-dt);
  speedLines(dt);lowHealth(dt);updatePrints();}
// landing: v is the landing speed (negative); a hop taps, a long fall thumps, sparks fly off metal and the clocktower on a hard one
export function landFx(v){const p=player,m=footMat(p),t=groundTile(p),f=clamp((-v-6)/26,0,1),heavy=v<HARD_LAND;
  if(p.mount)SFX.hoof(m,.8+f);else SFX.land(m,f,heavy,heavy);
  if(f>.15)surfaceDust(p,m,t,p.x,1+f*2);if(heavy&&(m==='metal'||t===T.TOWER||t===T.GATE))emit('sparkLand',p.x,p.y+.05);
  if(soft(m,t)&&f>.1){const gy=Math.floor(p.y-.5)+1;footprint(p.x-.12,gy,0,t,p.mount?1:0);footprint(p.x+.12,gy,1,t,p.mount?1:0);}}
export const skidFx=()=>SFX.skid(footMat(player));
export const jumpFx=()=>SFX.cloth(metalWorn());
// stepping into or out of ink
export function dipFx(out){const p=player;SFX.dip(out);emit('splashInk',p.x,p.y+(out?.3:.8),{n:out?5:9});}

// ================= footprints =================
// Paper-cut ovals a shade darker than the ground, lying on its top face under the player's feet (one instanced mesh, drawn
// before the rigs). They fade over PRINT_T s; the oldest is reused past PRINT_MAX. Nothing is saved.
const PRINT_MAX=40,PRINT_T=6,prints=[];let printI=0,printsLive=0;
const prGeo=new THREE.PlaneGeometry(.24,.13);prGeo.rotateX(-Math.PI/2);prGeo.setAttribute('aA',new THREE.InstancedBufferAttribute(new Float32Array(PRINT_MAX),1));
const prMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  vertexShader:`attribute float aA;varying vec3 vC;varying vec2 vUv;varying float vA;void main(){vC=instanceColor;vUv=uv;vA=aA;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vC;varying vec2 vUv;varying float vA;void main(){float d=length((vUv-.5)*2.);if(d>1.||vA<=0.)discard;gl_FragColor=vec4(vC*(d>.72?.82:1.),vA*.8);}`});
const prMesh=new THREE.InstancedMesh(prGeo,prMat,PRINT_MAX);prMesh.frustumCulled=false;prMesh.renderOrder=-2;
{const o=new THREE.Object3D(),c=new THREE.Color(0,0,0);o.scale.set(0,0,0);o.updateMatrix();for(let i=0;i<PRINT_MAX;i++){prMesh.setMatrixAt(i,o.matrix);prMesh.setColorAt(i,c);}}scene.add(prMesh);
const prO=new THREE.Object3D(),prC=new THREE.Color();
export function footprint(x,gy,side,t,hoof){const i=printI;printI=(printI+1)%PRINT_MAX;const L=lightAt(x,gy+.5);prC.set(sh(TP[t]&&TP[t].col||'#9a6a3f',.7));prC.setRGB(prC.r*L[0],prC.g*L[1],prC.b*L[2]);
  prO.position.set(x,gy+.012,side?.26:.05);prO.rotation.set(0,rand(-.12,.12),0);prO.scale.set(hoof?.75:1,1,hoof?1.2:1);prO.updateMatrix();prMesh.setMatrixAt(i,prO.matrix);prMesh.setColorAt(i,prC);
  prMesh.instanceMatrix.needsUpdate=true;prMesh.instanceColor.needsUpdate=true;prints[i]=performance.now()/1000;printsLive=PRINT_T;}
function updatePrints(){if(printsLive<=0)return;const now=performance.now()/1000,a=prGeo.attributes.aA;let live=0;
  for(let i=0;i<PRINT_MAX;i++){const age=prints[i]==null?PRINT_T:now-prints[i];const v=age<PRINT_T*.6?1:Math.max(0,1-(age-PRINT_T*.6)/(PRINT_T*.4));a.array[i]=v;if(v>0)live++;}
  a.needsUpdate=true;if(!live)printsLive=0;}
export const printCount=()=>{const now=performance.now()/1000;return prints.filter(t=>t!=null&&now-t<PRINT_T).length;};

// ================= speed lines =================
// At dash speed, falling faster than SPEED_FALL or flying on the Wings, faint paper strips streak behind the player and fade
// where they were left (drawn with the dash ghosts, render order -1). Off with reduced motion.
const SPEED_FALL=-24,SL_MAX=14,lines=[];let slT=0;
const slGeo=new THREE.PlaneGeometry(1,.04);
export function speedLines(dt){const p=player;const fly=p.flying&&!p.onGround,go=!reduceMotion()&&!p.dead&&!p.climb&&(p.dashT>0||p.vy<SPEED_FALL||fly);
  if(go){slT-=dt;const v=Math.hypot(p.vx,p.vy)||1,k=clamp((v-10)/20,.35,1);while(slT<=0){slT+=.035;let l=lines.find(l=>l.a<=0);
      if(!l&&lines.length<SL_MAX){const m=new THREE.Mesh(slGeo,new THREE.MeshBasicMaterial({color:0xfbf8f0,transparent:true,depthWrite:false,opacity:0}));m.renderOrder=-1;scene.add(m);l={m,a:0};lines.push(l);}
      if(!l)break;const dx=p.vx/v,dy=p.vy/v,o=rand(-.9,.9),b=rand(.5,1.4),len=rand(.6,1.3)*(.6+k);
      l.m.position.set(p.x-dx*b-dy*o,p.y+.9-dy*b+dx*o,rand(.1,.3));l.m.rotation.set(0,0,Math.atan2(dy,dx));l.m.scale.set(len,1,1);l.a=l.a0=.5*k;l.m.visible=true;}}
  for(const l of lines){if(l.a<=0){l.m.visible=false;continue;}l.a-=dt*l.a0/.2;l.m.material.opacity=Math.max(0,l.a);}}
export const speedLineCount=()=>lines.filter(l=>l.a>0).length;

// ================= slow motion =================
// On a parry, a counter-slash kill, an elite's finishing blow and a boss's last hit, game time eases to SLOW_K over SLOW_IN s,
// holds, and eases back over SLOW_OUT s. It runs after any hit pause (main.js calls slowScale only once hitStop is spent), and
// sound effects drop in pitch under a lowpass while it lasts. Off with Settings > Hit pause off or reduced motion.
const SLOW_K=.35,SLOW_IN=.05,SLOW_OUT=.15;export const slow={t:-1,hold:0};
export function slowMo(hold=.3){if(!SET.hitstop||reduceMotion())return;if(slow.t>=0&&slow.t<SLOW_IN+slow.hold){slow.hold=Math.max(slow.hold,slow.t+hold-SLOW_IN);return;}slow.t=0;slow.hold=hold;}
export function slowScale(dt){if(slow.t<0)return 1;slow.t+=dt;const t=slow.t,h=SLOW_IN+slow.hold;
  const k=t<SLOW_IN?t/SLOW_IN:t<h?1:t<h+SLOW_OUT?1-(t-h)/SLOW_OUT:0;if(t>=h+SLOW_OUT||!SET.hitstop||reduceMotion()){slowEnd();return 1;}slowAudio(k);return 1-(1-SLOW_K)*k;}
export function slowEnd(){if(slow.t<0)return;slow.t=-1;slowAudio(0);}

// ================= hit confirmation =================
// a connecting melee hit flashes the held weapon (updateTool reads p.hitFlash into uPF) and draws a small bright arc at the contact
export const HITFLASH_T=.12;
export function hitConfirm(x,y,face){player.hitFlash=HITFLASH_T;const r=.42;for(let i=0;i<7;i++){const a=(i/6-.5)*2.1;emit(null,x-face*r*.6+face*Math.cos(a)*r,y+Math.sin(a)*r,{cols:['#fffaf0','#ffe58a'],n:1,spd:.6,grav:0,life:.2,up:0,glow:1,s:.7,jit:0});}}

// ================= low health =================
// Below LOW_HP of full life: a slow, quiet heartbeat (quicker as life runs out; silent while the backpack or map is open, or
// with Settings > Low-health heartbeat off), a desaturated grade and a red vignette edge (post.js reads lowF; without
// post-processing the #vig overlay gets the edge instead). The vignette pulses with the beat unless motion is reduced.
export const LOW_HP=.25;export let lowF=0;let beatT=0,beatF=0;
function lowHealth(dt){const p=player,low=!p.dead&&p.hp<p.max*LOW_HP;lowF+=((low?1:0)-lowF)*Math.min(1,dt*3);
  if(low){beatT-=dt;if(beatT<=0){const h=p.hp/(p.max*LOW_HP);beatT=.8+.4*h;beatF=1;if(SET.heart!==false&&!invOpen&&!mapOpen)SFX.heart();}}else beatT=0;
  beatF=Math.max(0,beatF-dt*2.5);const v=$('vig');if(v){v.classList.toggle('low',lowF>.05&&!postOn());v.style.setProperty('--low',(lowF*(reduceMotion()?1:.8+.2*beatF)).toFixed(3));}}
export function lowPulse(){return lowF*(reduceMotion()?1:.8+.2*beatF);}
// out of play (pause, title, a conversation): no slow motion, no low-health edge
export function feelIdle(){slowEnd();if(lowF){lowF=0;const v=$('vig');if(v){v.classList.remove('low');v.style.setProperty('--low','0');}}}
