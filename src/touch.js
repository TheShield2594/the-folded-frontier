// Touch controls for phones and tablets: joystick, action buttons, tap the world to use or interact, touch backpack.
import {
  $,craft,cursor,cyclePartner,dashPress,dlgNext,dropItem,fireHook,initAudio,invOpen,ITEMS,jumpPress,mapOpen,mouse,npcs,
  pad,padInteract,partnerAbility,pause,player,quickHeal,reachOK,renderer,screenToWorld,setCursor,setInv,
  setInvDirty,shieldItem,slotClick,state,T,tileAt,toggleMap,toggleMount,touch,upx,
} from './game.js';

// ================= touch =================
// Touch mode turns on at the first touch (or on a coarse-pointer device) and off again when a real mouse moves.
// touch.held feeds held() like a key, touch.aim is the Use stick's direction, touch.world is a finger on the world.
export function setTouch(on){touch.on=on;document.body.classList.toggle('touch',on);if(!on)releaseTouch();}
let lastTouch=0;
addEventListener('touchstart',()=>{lastTouch=performance.now();if(!touch.on)setTouch(true);},{passive:true,capture:true});
addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&touch.on&&performance.now()-lastTouch>1000)setTouch(false);});
if(matchMedia('(pointer:coarse)').matches)setTouch(true);
const fingers=new Map(); // touch identifier -> what it is holding
function releaseTouch(){for(const f of fingers.values())f.up&&f.up();fingers.clear();touch.held={};touch.aim=null;touch.world=false;mouse.l=false;knob($('tStickK'),0,0);knob($('tUseK'),0,0);$('tUse').classList.remove('on');}
function knob(el,x,y){el.style.transform=`translate(${x}px,${y}px)`;}
function track(e,f){initAudio();pad.active=false;for(const t of e.changedTouches)fingers.set(t.identifier,Object.assign({x0:t.clientX,y0:t.clientY},f));}
function onMove(e){for(const t of e.changedTouches){const f=fingers.get(t.identifier);if(f&&f.move)f.move(t.clientX-f.x0,t.clientY-f.y0,t);}}
function onEnd(e){for(const t of e.changedTouches){const f=fingers.get(t.identifier);if(f){fingers.delete(t.identifier);f.up&&f.up();}}}
addEventListener('touchmove',onMove,{passive:true});
for(const ev of['touchend','touchcancel'])addEventListener(ev,onEnd,{passive:true});

// joystick: walk left/right, push up to climb, down to drop through platforms
const R=50;
$('tStick').addEventListener('touchstart',e=>{e.preventDefault();const b=$('tStick').getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;
  const move=(dx,dy,t)=>{let x=t.clientX-cx,y=t.clientY-cy;const d=Math.hypot(x,y);if(d>R){x*=R/d;y*=R/d;}knob($('tStickK'),x,y);const h=touch.held;h.left=x<-R*.35;h.right=x>R*.35;h.up=y<-R*.6;h.down=y>R*.6;};
  track(e,{move,up:()=>{const h=touch.held;h.left=h.right=h.up=h.down=false;knob($('tStickK'),0,0);}});move(0,0,e.changedTouches[0]);},{passive:false});

// Use: hold to use the held item; drag off the button to aim, like a second stick
$('tUse').addEventListener('touchstart',e=>{e.preventDefault();track(e,{
  move:(dx,dy)=>{const d=Math.hypot(dx,dy),m=Math.min(1,d/60);const k=d>0?Math.min(d,30)/d:0;knob($('tUseK'),dx*k,dy*k);touch.aim=d>12?[dx/d*m,-dy/d*m]:null;if(touch.aim)touch.aimT=1.2;},
  up:()=>{mouse.l=touch.world;knob($('tUseK'),0,0);touch.aim=null;$('tUse').classList.remove('on');}});$('tUse').classList.add('on');mouse.l=true;mouse.lp=true;},{passive:false});

// the other buttons: data-hold names a held action, data-act a one-shot press
const ACT={jump:jumpPress,interact:padInteract,dash:dashPress,hook:fireHook,heal:quickHeal,ability:partnerAbility,partner:cyclePartner,mount:()=>toggleMount(),
  inv:()=>setInv(!invOpen),map:()=>toggleMap(),pause:()=>pause(true)};
$('touch').addEventListener('touchstart',e=>{const b=e.target.closest('[data-act],[data-hold]');if(!b)return;e.preventDefault();
  const h=b.dataset.hold;b.classList.add('on');track(e,{up:()=>{b.classList.remove('on');if(h)touch.held[h]=false;}});
  if(h)touch.held[h]=true;const a=ACT[b.dataset.act];if(a&&state==='play')a();},{passive:false});

// tap the world: talk to townsfolk and open doors/chests/signs where you tap, otherwise use the held item there
const TAPT=new Set([T.SEAM,T.RIP,T.CREASE,T.CRANK,T.GATE,T.STACKS,T.STARDOOR,T.MURAL,T.PEEL,T.SKETCH,T.SIGN,T.ALTAR,T.DOOR,T.CHEST,T.CROP,T.RARE,T.CLOCK,T.BED]);
function tapTarget(wx,wy){if(npcs.some(n=>Math.abs(wx-n.x)<1&&wy>n.y-.3&&wy<n.y+2.2))return true;const tx=Math.floor(wx),ty=Math.floor(wy);return reachOK(tx,ty,6.5)&&TAPT.has(tileAt(tx,ty));}
renderer.domElement.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];$('tip').hidden=true;
  if(state==='talk'){initAudio();dlgNext();return;}if(state!=='play')return;
  if(cursor){dropItem(cursor.id,cursor.n,player.x+player.face*.8,player.y+1.2,player.face*6,4,1);setCursor(null);setInvDirty(true);return;}
  if(invOpen){setInv(false);return;}if(mapOpen){toggleMap(false);return;}
  mouse.x=t.clientX;mouse.y=t.clientY;[mouse.wx,mouse.wy]=screenToWorld(mouse.x,mouse.y);
  if(tapTarget(mouse.wx,mouse.wy)){initAudio();pad.active=false;mouse.rp=true;return;}
  touch.world=true;mouse.l=true;mouse.lp=true;
  track(e,{move:(dx,dy,t)=>{mouse.x=t.clientX;mouse.y=t.clientY;},up:()=>{touch.world=[...fingers.values()].some(f=>f.world&&f.id!==t.identifier);mouse.l=touch.world||$('tUse').classList.contains('on');},world:true,id:t.identifier});},{passive:false});
$('map').addEventListener('click',()=>{if(touch.on)toggleMap(false);});

// backpack by touch: tap = click, long-press = right-click (split / drop one), Quick move makes taps shift-clicks
let sl=null;
document.addEventListener('touchstart',e=>{const el=e.target.closest&&e.target.closest('.slot,.rec');if(sl)clearTimeout(sl.timer);sl=null;if(!el||e.touches.length>1)return;const t=e.changedTouches[0];initAudio();
  sl={el,x:t.clientX,y:t.clientY,timer:setTimeout(()=>{if(!sl||sl.el!==el)return;sl.long=true;if(el.classList.contains('slot'))slotClick(el,2,false);else craft(+el.dataset.r,5);setInvDirty(true);if(navigator.vibrate)navigator.vibrate(12);},450)};},{passive:true});
document.addEventListener('touchmove',e=>{if(!sl)return;const t=e.changedTouches[0];if(Math.hypot(t.clientX-sl.x,t.clientY-sl.y)>10){clearTimeout(sl.timer);sl=null;}},{passive:true});
document.addEventListener('touchcancel',()=>{if(!sl)return;clearTimeout(sl.timer);sl=null;},{passive:true});
document.addEventListener('touchend',e=>{if(!sl)return;const{el,x,y,long}=sl;clearTimeout(sl.timer);sl=null;e.preventDefault(); // no emulated mousedown after this
  if(!long){if(el.classList.contains('slot'))slotClick(el,0,touch.quick);else craft(+el.dataset.r,touch.quick?5:1);}setInvDirty(true);
  if(invOpen){el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:x,clientY:y}));const c=$('cursorItem');c.style.left=upx(x);c.style.top=upx(y-40);}},{passive:false});
$('quickBtn').addEventListener('click',()=>{touch.quick=!touch.quick;$('quickBtn').classList.toggle('on',touch.quick);$('quickBtn').textContent=touch.quick?'Quick move: on':'Quick move';});

// shown only in touch mode while playing; the action buttons hide while a menu is up, and buttons you can't use yet stay out of the way
let checkT=0;
export function updateTouch(dt){const el=$('touch'),show=touch.on&&!pad.active&&state==='play'&&!player.dead;if(el.hidden!==!show){el.hidden=!show;if(!show)releaseTouch();}if(!show)return;
  const menu=invOpen||mapOpen;if(menu!==el.classList.contains('menu')){el.classList.toggle('menu',menu);if(menu)releaseTouch();}
  $('tInv').classList.toggle('on',invOpen);$('tMap').classList.toggle('on',mapOpen);
  if((checkT-=dt)>0)return;checkT=.5;const has=f=>player.inv.some(s=>s&&f(ITEMS[s.id],s));
  $('tHook').hidden=!has(it=>it.hook);$('tBlock').hidden=!shieldItem();$('tMount').hidden=!player.mount&&!has(it=>it.mount);
  $('tAbility').hidden=!player.partner;$('tPartner').hidden=player.partners.length<2;$('tHeal').hidden=!has((it,s)=>s.id==='potion');}
