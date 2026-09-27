// Keyboard and mouse input.
import * as THREE from 'three';
import {
  $,actKey,boundKeys,bowDrawT,burst,camDist,camera,clamp,closeSettings,cursor,cyclePartner,dropItem,
  fireHook,held,hook,initAudio,invOpen,ITEMS,keys,mapOpen,pad,padRebinding,partnerAbility,pause,player,
  pv,quickHeal,rebinding,renderBinds,renderer,saveSettings,scene,SET,setCamDist,setCursor,setInv,
  setInvDirty,setPadRebinding,setRebinding,SFX,stat,stompNice,toggleMap,upx,
  skipIntro,dlgNext,
} from './game.js';

// ================= input =================
export const mouse={x:innerWidth/2,y:innerHeight/2,l:false,r:false,lp:false,rp:false,wx:0,wy:0,onCanvas:true};
export let state='title';
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
  if(padRebinding){e.preventDefault();if(k==='escape'){setPadRebinding(null);renderBinds();}return;}
  if(rebinding){e.preventDefault();if(k!=='escape'){const other=Object.keys(SET.bind).find(a=>SET.bind[a]===k);if(other&&other!==rebinding)SET.bind[other]=SET.bind[rebinding];SET.bind[rebinding]=k;saveSettings();}setRebinding(null);renderBinds();return;}
  if([' ','tab','arrowup','arrowdown'].includes(k))e.preventDefault();if(e.repeat)return;keys[k]=true;initAudio();
  if(state==='intro'){skipIntro();return;}
  if(state==='talk'){if(k==='escape')dlgNext(true);else if(actKey('jump',k)||k==='enter'||actKey('inv',k))dlgNext();return;}
  if(k==='escape'&&!$('settings').hidden){closeSettings();return;}
  if(k==='escape'&&!$('ach').hidden){$('ach').hidden=true;return;}
  if(k==='escape'&&!$('howto').hidden){$('howto').hidden=true;return;}
  if(state==='play'){
    if(actKey('jump',k))jumpPress();
    if(actKey('inv',k))setInv(!invOpen);
    if(actKey('map',k))toggleMap();
    if(k==='escape'){if(mapOpen)toggleMap(false);else if(invOpen)setInv(false);else pause(true);}
    if(actKey('heal',k))quickHeal();
    if(actKey('dash',k))dashPress();
    if(actKey('hook',k))fireHook();
    if(actKey('partner',k))cyclePartner();if(actKey('ability',k))partnerAbility();
    if(/^[0-9]$/.test(k)&&!boundKeys().includes(k)){player.sel=(+k+9)%10;setInvDirty(true);}
    if(k==='='||k==='+'){setCamDist(SET.zoom=clamp(camDist-4,28,64));saveSettings();}if(k==='-'){setCamDist(SET.zoom=clamp(camDist+4,28,64));saveSettings();}
  }else if(state==='paused'&&k==='escape')pause(false);});
export function jumpPress(){if(player.flat)return;if(player.climb&&(keys.w||keys.arrowup)&&!keys[' '])return;if(hook.state===2){hook.state=3;player.vy=Math.max(player.vy,14);player.jbuf=0;return;}player.jbuf=.13;player.jumpAge=0;if(player.stompWin>0&&player.stompTarget)stompNice();}
// dash: short burst with i-frames, one air dash per jump
export const DASH_T=.17,DASH_I=.24,DASH_CD=.85,DASH_V=21;
export function dashPress(){const p=player;if(state!=='play'||invOpen||mapOpen||p.dead||p.dashCD>0||p.flat||p.climb||hook.state===2)return;if(!p.onGround&&p.airDashed)return;
  const l=held('left'),r=held('right');const dir=r&&!l?1:l&&!r?-1:p.face;p.face=p.dashDir=dir;p.dashT=DASH_T;p.dashI=DASH_I;p.dashCD=DASH_CD;p.ghostT=0;p.dodged=false;if(!p.onGround)p.airDashed=true;
  SFX.dash();stat('dashes');burst(p.x-dir*.3,p.y+.6,['#fbf8f0','#e9dcc0','#dcd3c2'],9,3,{grav:1,life:.45});}
const ghosts=[];
function ghostMat(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{map:{value:null},uFrame:{value:0},uFrames:{value:1},uA:{value:0}},
  vertexShader:`uniform float uFrame;uniform float uFrames;varying vec2 vUv;void main(){vUv=vec2((uv.x+uFrame)/uFrames,uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D map;uniform float uA;varying vec2 vUv;void main(){vec4 t=texture2D(map,vUv);if(t.a<.5)discard;gl_FragColor=vec4(mix(t.rgb,vec3(.98,.95,.88),.6),uA);}`});}
export function spawnGhost(){const p=player;let g=ghosts.find(g=>g.a<=0);if(!g){if(ghosts.length>=8)return;const m=new THREE.Mesh(p.mesh.geometry,ghostMat());m.renderOrder=3;scene.add(m);g={m,a:0};ghosts.push(g);}
  const u=g.m.material.uniforms,pu=p.mat.uniforms;u.map.value=pu.map.value;u.uFrame.value=pu.uFrame.value;u.uFrames.value=pu.uFrames.value;g.m.geometry=p.mesh.geometry;
  g.m.position.set(p.mesh.position.x,p.mesh.position.y,.13);g.m.rotation.copy(p.mesh.rotation);g.m.scale.copy(p.mesh.scale);g.a=.5;g.m.visible=true;}
export function updateGhosts(dt){for(const g of ghosts){if(g.a<=0){g.m.visible=false;continue;}g.a-=dt*2.6;g.m.material.uniforms.uA.value=Math.max(0,g.a);}}
export function updateDashHud(dt){const p=player,el=$('dashCd');if(p.dead||state!=='play'){el.hidden=true;return;}
  if(p.dashCD>0){el.hidden=false;el.classList.remove('ready');el.style.setProperty('--f',((1-p.dashCD/DASH_CD)*360).toFixed(1)+'deg');p.dashPing=.3;}
  else if(p.dashPing>0){if(!el.classList.contains('ready')){el.classList.add('ready');el.style.setProperty('--f','360deg');SFX.ready();}p.dashPing-=dt;if(p.dashPing<=0){el.hidden=true;el.classList.remove('ready');}}
  else{el.hidden=true;return;}
  pv.set(p.x,p.y-.3,.5).project(camera);el.style.left=upx((pv.x+1)/2*innerWidth);el.style.top=upx((1-pv.y)/2*innerHeight);}
// bow draw meter: fills above the head and turns gold at full draw
export function updateDrawHud(){const p=player,el=$('drawCd');if(!p.draw||p.dead||state!=='play'){el.hidden=true;return;}const c=Math.min(1,p.draw.t/bowDrawT(ITEMS[p.draw.id]));
  el.hidden=false;el.classList.toggle('full',p.draw.full);el.style.setProperty('--f',(c*360).toFixed(1)+'deg');pv.set(p.x,p.y+2.45,.5).project(camera);el.style.left=upx((pv.x+1)/2*innerWidth);el.style.top=upx((1-pv.y)/2*innerHeight);}
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.l=mouse.r=false;});
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;pad.active=false;if(cursor){const c=$('cursorItem');c.style.left=upx(e.clientX);c.style.top=upx(e.clientY);}if(!$('tip').hidden)placeTip(e.clientX+16,e.clientY+14);});
export function placeTip(x,y){const tp=$('tip'),r=tp.getBoundingClientRect();tp.style.left=upx(Math.max(4,Math.min(x,innerWidth-r.width-8)));tp.style.top=upx(Math.max(4,Math.min(y,innerHeight-r.height-8)));}
renderer.domElement.addEventListener('mousedown',e=>{initAudio();if(state==='talk'){if(e.button!==1)dlgNext();return;}if(state!=='play')return;if(e.button===0){if(cursor){dropItem(cursor.id,cursor.n,player.x+player.face*.8,player.y+1.2,player.face*6,4,1);setCursor(null);setInvDirty(true);return;}mouse.l=true;mouse.lp=true;}if(e.button===2){mouse.r=true;mouse.rp=true;}});
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false;if(e.button===2)mouse.r=false;});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{if(state!=='play')return;if(invOpen&&e.target.closest&&e.target.closest('#panel'))return;player.sel=(player.sel+(e.deltaY>0?1:-1)+10)%10;setInvDirty(true);},{passive:true});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
// Imported bindings are read-only, so other modules assign these through setters.
export function setState(v){return state=v;}
