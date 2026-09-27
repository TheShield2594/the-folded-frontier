// Boss presentation: the arrival title card and camera move, the crease-and-tear phase change with a camera pull-back,
// the torn arena at 25% life and the defeat sequence before the loot drops. The fights themselves live in gameplay.js.
import * as THREE from 'three';
import {
  $,boss,burst,camera,camFocus,canvasTex,circ,grain,INK,mk,player,rand,reduceMotion,scene,SFX,shake,tone,
} from './game.js';

// ================= boss presentation =================
// title cards: [kicker, tagline]; the name comes from EN[type].name
const BOSSCARD={king:['Sovereign of the Surface','Every hop shakes the page.'],crane:['Guardian of the Folded Pines','A thousand folds, one sharp beak.'],
  lev:['Terror of the Inkwell','It swims where the ink runs deepest.'],folio:['The Burning Book','Every chapter ends in flame.'],
  unfolded:['The First Page','It remembers the world before it was folded.']};
export const INTRO_T=2,DEFEAT_T=2.6;
let cardT=null;
function showCard(e){const c=BOSSCARD[e.type]||['A boss appears',''],el=$('bossCard');$('bcKick').textContent=c[0];$('bcName').textContent=e.d.name;$('bcSub').textContent=c[1];
  $('chapter').hidden=true;el.hidden=false;el.className='in';clearTimeout(cardT);cardT=setTimeout(()=>{el.className='out';cardT=setTimeout(()=>{el.hidden=true;el.className='';},500);},2600);}
// a short camera move; reduced motion skips it (the card and sounds still play)
function focus(at,zoom,dur){if(reduceMotion())return;camFocus.at=at;camFocus.zoom=zoom;camFocus.dur=camFocus.t=dur;}
const mid=e=>()=>[(e.x+player.x)/2,(e.y+e.h/2+player.y+1)/2];
// a low three-note sting under the title card
function sting(){[146,174,110].forEach((f,i)=>tone(f,f*.98,.5,'sawtooth',.07,i*.22));tone(55,40,1.4,'sine',.2,.66);}

// arrival: the boss holds still (immune, no contact damage) while the card shows and the camera looks at it
export function bossIntro(e){e.act='intro';e.at=INTRO_T;e.look={ph:0,tear:0};showCard(e);sting();shake(.25);focus(()=>[e.x,e.y+e.h/2],1.12,INTRO_T+.4);}
// a boss (or a Leviathan segment) that must not hurt or be hurt right now
export function bossHeld(e){const b=e.parent||e;return b.act==='intro'||b.act==='defeat';}
// phase change: freeze, crease, tear open into the new silhouette; the camera pulls back to show the fight
export function bossPhaseFx(e,ph){const L=e.look||(e.look={ph:0,tear:0});L.from=L.tear;L.ph=ph;focus(mid(e),1.3,2.1);if(ph>=2)startArena(e);}
export function bossDefeatFx(e){focus(()=>[e.x,e.y+e.h/2],.86,DEFEAT_T+.3);SFX.tear();shake(.5);}
const TEARW=[0,.6,1];
const sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// per frame: creases (uCr.x lines, .y ink, .z tear width) and a squash while refolding; Leviathan segments copy the head
export function bossLook(e,m,dt){const b=e.parent||e,L=b.look||(b.look={ph:0,tear:0}),u=m.material.uniforms.uCr;if(!u)return;
  let lines=L.ph,ink=L.ph?.55:0,tear=TEARW[L.ph]||0,sq=1;
  if(b.act==='phase'){const k=1-Math.max(0,b.at)/1.3;ink=Math.min(1,k*2.2);tear=(L.from||0)+((TEARW[L.ph]||0)-(L.from||0))*sm((k-.45)/.4);sq=1-.1*Math.sin(Math.min(1,k/.45)*Math.PI/2)+.14*sm((k-.45)/.3)*(1-sm((k-.8)/.2));}
  else if(b.act==='defeat'){const k=1-Math.max(0,b.at)/DEFEAT_T;lines=2;ink=1;tear=(TEARW[L.ph]||0)+sm(k/.8)*.9;sq=1-.25*sm((k-.7)/.3);
    if(!e.parent){m.position.x+=Math.sin(b.t*60)*.06*(1-k*.5);if(Math.random()<dt*(10+k*30))burst(e.x+rand(-.5,.5)*e.w,e.y+rand(0,e.h),['#fbf8f0','#e9dcc0',e.d.col[0]],1,rand(3,7),{grav:5,life:1});}}
  if(!e.parent)L.tear=tear;u.value.set(lines,ink,tear);if(sq!==1)m.scale.set(m.scale.x/Math.sqrt(sq),m.scale.y*sq,1);}

// ---- the torn arena: at 25% life the sky rips open behind the fight and paper scraps fall
export let arenaF=0;let arena=null;
function ripTex(){const c=mk(1024,256),t=c.getContext('2d');const top=[],bot=[];
  for(let x=0;x<=1024;x+=16){const e=Math.min(x,1024-x)/512,h=10+e*90;top.push(x,128-h*(.75+Math.random()*.45));bot.push(x,128+h*(.7+Math.random()*.45));}
  const path=()=>{t.beginPath();t.moveTo(top[0],top[1]);for(let i=2;i<top.length;i+=2)t.lineTo(top[i],top[i+1]);for(let i=bot.length-2;i>=0;i-=2)t.lineTo(bot[i],bot[i+1]);t.closePath();};
  t.save();t.translate(0,6);path();t.fillStyle='rgba(20,14,26,.35)';t.fill();t.restore();
  path();t.fillStyle='#fbf3e0';t.fill();t.save();t.translate(512,128);t.scale(.93,.8);t.translate(-512,-128);path();const g=t.createLinearGradient(0,40,0,216);g.addColorStop(0,'#3a1030');g.addColorStop(.5,'#8a2a3a');g.addColorStop(1,'#2a0f2a');t.fillStyle=g;t.fill();
  for(let k=0;k<40;k++){circ(t,rand(120,900),rand(90,166),rand(1,2.6));t.fillStyle='rgba(255,210,150,.7)';t.fill();}t.restore();
  path();t.lineWidth=5;t.strokeStyle=INK;t.stroke();grain(t,0,0,1024,256,10);return canvasTex(c);}
const ripMat=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,opacity:0});
const ripMesh=new THREE.Mesh(new THREE.PlaneGeometry(110,28),ripMat);ripMesh.renderOrder=-20;ripMesh.visible=false;scene.add(ripMesh);
function startArena(e){if(ripMat.map)ripMat.map.dispose();ripMat.map=ripTex();ripMat.needsUpdate=true;arena={e,t:0};SFX.peel();}
export function resetBossFx(){arena=null;arenaF=0;ripMesh.visible=false;camFocus.t=0;const el=$('bossCard');clearTimeout(cardT);el.hidden=true;el.className='';}
// runs every frame from the main loop
export function updateBossFx(dt){const live=arena&&boss===arena.e&&!arena.e.dying;if(arena&&!live)arena.t=Math.min(arena.t,1.2);
  if(arena)arena.t+=live?dt:-dt*1.5;arenaF=arena?sm(arena.t/1.2):0;if(arena&&arena.t<=0)arena=null;
  ripMesh.visible=arenaF>0;if(!ripMesh.visible)return;const cx=camera.position.x,cy=camera.position.y,rm=reduceMotion();
  ripMesh.position.set(cx,cy+7,-55);ripMesh.scale.set(rm?1:Math.max(.02,arenaF),rm?1:.4+.6*arenaF,1);ripMat.opacity=rm?arenaF:Math.min(1,arenaF*3);
  if(live&&Math.random()<dt*(rm?4:14))burst(cx+rand(-28,28),cy+15,['#fbf8f0','#efe3c8','#e0d2b4','#f6d6c8'],1,.4,{grav:1,life:6,up:-.3,s:1.5});}
