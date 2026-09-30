// Gamepad polling and menu navigation.
import {
  $,craftRec,cyclePartner,dashPress,fireHook,initAudio,invOpen,jumpPress,mapOpen,mouse,npcs,
  pad,padRebinding,partnerAbility,pause,placeTip,player,renderBinds,saveSettings,SET,setInv,setInvDirty,
  setPadRebinding,SFX,slotClick,state,T,tileAt,toggleMap,upx,
  skipIntro,introNext,dlgNext,cycleTab,toggleMount,quickHeal,reachOK,meta,idx,padLabels,
} from './game.js';

// ================= gamepad =================
export function handlePad(){const gps=navigator.getGamepads?navigator.getGamepads():[];let g=null;for(const x of gps)if(x&&x.connected){g=x;break;}
  if(!g){pad.held={};return;}
  const b=i=>{const x=g.buttons[i];return !!x&&(x.pressed||x.value>.35);},ax=g.axes,lx=ax[0]||0,ly=ax[1]||0,rx=ax[2]||0,ry=ax[3]||0;
  const raw=g.buttons.map((_,i)=>b(i)),rp=pad.raw||[];pad.raw=raw;
  if(padRebinding){const i=raw.findIndex((v,i)=>v&&!rp[i]);if(i>=0){if(i!==9){const other=Object.keys(SET.pad).find(a=>SET.pad[a]===i);if(other&&other!==padRebinding)SET.pad[other]=SET.pad[padRebinding];SET.pad[padRebinding]=i;saveSettings();}setPadRebinding(null);renderBinds();}pad.held={};return;}
  // gameplay actions follow SET.pad; menus keep the fixed layout (A select, X split, B/Y close) and the whole d-pad,
  // while in play a d-pad button bound to an action (Quick heal on ↑) no longer moves the player
  const bnd=Object.values(SET.pad),dp=i=>b(i)&&!bnd.includes(i);
  const dirs={up:ly<-.6||dp(12),left:lx<-.35||dp(14),right:lx>.35||dp(15),down:ly>.6||dp(13),start:b(9)};
  const h=Object.assign({},dirs);for(const a in SET.pad)h[a]=h[a]||b(SET.pad[a]);
  pad.dn=dirs.down&&(dp(13)||ly>Math.abs(lx)*1.2);
  const fx={up:ly<-.6||b(12),left:lx<-.35||b(14),right:lx>.35||b(15),down:ly>.6||b(13),start:b(9),jump:b(0),use:b(2)||b(7),interact:b(1),inv:b(3),pl:b(4),pr:b(5)};
  const prev=pad.prev,fprev=pad.fprev||{};const e=k=>h[k]&&!prev[k],ef=k=>fx[k]&&!fprev[k];pad.prev=h;pad.fprev=fx;pad.held=h;if(pad.name!==g.id){pad.name=g.id;padLabels();}pad.g=g;rumbleTick();pad.h=h;
  if(Object.values(h).some(Boolean)||Math.hypot(rx,ry)>.3){if(!pad.active)initAudio();pad.active=true;}
  // right stick aim (placed in view.js padAim): its direction, and its tilt past the dead zone (full at .9) as aimR
  {const m=Math.hypot(rx,ry);if(m>.3){pad.aimX=rx/m;pad.aimY=-ry/m;pad.aimR=Math.min(1,(m-.3)/.6);pad.aimT=1.2;}}
  if(state==='intro'){if(ef('start')||ef('interact'))skipIntro();else if(ef('jump')||ef('use'))introNext();return;}
  if(state==='talk'){if(ef('start'))dlgNext(true);else if(ef('jump')||ef('interact')||ef('use'))dlgNext();return;}
  if(state==='title'||state==='paused'){overPad(fx,ef);return;}
  if(state!=='play')return;
  if(invOpen&&pad.active){menuPad(fx,ef);pad.held={};$('padHint').hidden=false;return;}$('padHint').hidden=true;
  if(e('start')){if(mapOpen)toggleMap(false);else if(invOpen)setInv(false);else pause(true);return;}
  if(e('map'))toggleMap();if(mapOpen){if(e('interact'))toggleMap(false);return;}
  if(e('inv'))setInv(!invOpen);
  if(e('jump'))jumpPress();
  if(e('dash'))dashPress();
  if(e('pl')){player.sel=(player.sel+9)%10;setInvDirty(true);}if(e('pr')){player.sel=(player.sel+1)%10;setInvDirty(true);}
  if(e('use'))mouse.lp=true;
  // Interact also blocks while held, unless it just reached something (so opening a chest doesn't raise the shield) or Block has its own button
  if(e('interact'))pad.noBlk=padInteract();if(!h.interact)pad.noBlk=false;pad.blk=h.interact&&!pad.noBlk&&!(SET.pad.block>=0);
  if(e('heal'))quickHeal();if(e('hook'))fireHook();if(e('ability'))partnerAbility();if(e('partner'))cyclePartner();if(e('mount'))toggleMount();}
export let padFocus=null,padNavT=0,padNavDir='',padLast=performance.now();
function focusables(){return[...document.querySelectorAll('#sideSheet .slot,#sideSheet .shopi,#sideSheet .pcard,#sideSheet .btile,#sideSheet .lore:not(.lock),#sideSheet .tcard,#sideSheet .ptile,#hero .bdg,#sideSheet button,#panel .slot,#panel .rec,#panel button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.closest('[hidden]');});}
function setFocus(el){if(padFocus)padFocus.classList.remove('padfocus');padFocus=el;if(!el)return;el.classList.add('padfocus');el.scrollIntoView({block:'nearest',inline:'nearest'});const r=el.getBoundingClientRect();
  if(el.matches('.slot,.rec,.tcard[data-card],[data-tip]')){el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));placeTip(r.right+8,r.top);}else $('tip').hidden=true;
  const c=$('cursorItem');c.style.left=upx(r.left+r.width*.6);c.style.top=upx(r.top+r.height*.6);}
function padMove(dir){const list=focusables();if(!list.length)return;if(!padFocus||!list.includes(padFocus)){setFocus(list.find(x=>x.classList.contains('slot'))||list[0]);return;}
  const best=nextEl(list,padFocus,dir);if(best){setFocus(best);SFX.pick();}}
// the element in a direction from cur on screen: nearest along it, straying least across it. In a form (rows of
// label and control) up/down goes to the next row whatever its column, and left/right stays on the row.
function nextEl(list,cur,dir,form){const a=cur.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;const v={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[dir];let best=null,bs=1e9;
  for(const el of list){if(el===cur)continue;const b=el.getBoundingClientRect(),dx=b.left+b.width/2-ax,dy=b.top+b.height/2-ay;const along=dx*v[0]+dy*v[1];if(along<=4)continue;const perp=Math.abs(dx*v[1]-dy*v[0]);
    if(form&&v[0]&&perp>(a.height+b.height)/2)continue;const sc=along+perp*(form&&v[1]?.5:2.2);if(sc<bs){bs=sc;best=el;}}return best;}
// title, pause and their dialogs (settings, new world, save code...): the stick or d-pad moves between controls, A presses,
// left/right change a slider or list, B or Start goes back (Start on the title screen presses like A)
let ovFocus=null,ovDir='',ovT=0,ovLast=performance.now();
const OVBACK={howto:'helpClose',newWorld:'nwCancel',settings:'setClose',ach:'achClose',codeBox:'codeClose',pause:'resBtn'},OVFIRST={newWorld:'createBtn',codeBox:'codeMake'};
function ovSet(el){if(ovFocus)ovFocus.classList.remove('padfocus');ovFocus=el;if(el){el.classList.add('padfocus');el.scrollIntoView({block:'nearest',inline:'nearest'});}}
function ovAdjust(el,d){if(el.type==='range'){const mn=+el.min||0,mx=+el.max||100,st=Math.max(+el.step||1,(mx-mn)/20);el.value=Math.max(mn,Math.min(mx,+el.value+d*st));el.dispatchEvent(new Event('input',{bubbles:true}));}
  else{const n=el.options.length;el.selectedIndex=(el.selectedIndex+d+n)%n;}el.dispatchEvent(new Event('change',{bubbles:true}));SFX.pick();}
function overPad(h,e){const now=performance.now(),dt=(now-ovLast)/1000;ovLast=now;
  if(!pad.active){ovSet(null);return;}
  const ov=[...document.querySelectorAll('.over')].filter(el=>!el.hidden&&el.id!=='loading').pop();if(!ov)return;
  const list=[...ov.querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled&&el.getClientRects().length&&!el.closest('[hidden]'));
  if(!ovFocus||!list.includes(ovFocus))ovSet((OVFIRST[ov.id]&&$(OVFIRST[ov.id]))||list.find(el=>el.tagName!=='BUTTON'||!el.classList.contains('ghost'))||list[0]||null);
  const el=ovFocus,slide=el&&(el.type==='range'||el.tagName==='SELECT');
  const dir=h.up?'up':h.down?'down':h.left?'left':h.right?'right':'';if(dir&&el){let go=false;if(dir!==ovDir){ovT=.35;go=true;}else{ovT-=dt;if(ovT<=0){ovT=slide?.07:.11;go=true;}}
    if(go){if(slide&&(dir==='left'||dir==='right'))ovAdjust(el,dir==='left'?-1:1);else{const n=nextEl(list,el,dir,1);if(n){ovSet(n);SFX.pick();}}}}ovDir=dir;
  const back=OVBACK[ov.id];
  if(e('interact')||(e('start')&&back)){if(back)$(back).click();return;}
  if(el&&(e('jump')||e('start'))){if(el.tagName==='SELECT')ovAdjust(el,1);else if(el.type==='range');else if(el.tagName==='TEXTAREA'||el.type==='text')el.focus();else el.click();}}
// a page re-rendered by a press (a Bestiary tile, a badge, a Journal page) keeps the pad's focus on the same entry, found again by its data key
const PADKEYS=['best','lore','bpg','card','p','pet','mount','b','s','m','q','t','w','a'];
function padKey(el){for(const a of PADKEYS)if(el.dataset[a]!=null)return `[data-${a}="${CSS.escape(el.dataset[a])}"]`;return null;}
function fire(el,button,shift){el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button,shiftKey:shift}));}
function menuPad(h,e){const now=performance.now(),dt=(now-padLast)/1000;padLast=now;
  if(!padFocus||!document.body.contains(padFocus)||padFocus.closest('[hidden]'))setFocus(focusables().find(x=>x.classList.contains('slot'))||null);
  const dir=h.up?'up':h.down?'down':h.left?'left':h.right?'right':'';if(dir){if(dir!==padNavDir){padNavDir=dir;padNavT=.35;padMove(dir);}else{padNavT-=dt;if(padNavT<=0){padNavT=.11;padMove(dir);}}}else padNavDir='';
  if(e('inv')||e('interact')||e('start')){setInv(false);return;}
  if(e('pl')){cycleTab(1);setFocus(null);return;}
  const el=padFocus;if(!el)return;
  if(e('jump')){const k=padKey(el),pg=el.closest('#sideBody,#hero');if(el.classList.contains('slot'))slotClick(el,0,false);else if(el.classList.contains('rec'))craftRec(el,1);else if(el.tagName==='BUTTON')el.click();else fire(el,0,false);setInvDirty(true);
    setTimeout(()=>{if(!padFocus||document.body.contains(padFocus))return;const same=k&&document.querySelector('#panel '+k),list=focusables();setFocus(same&&list.includes(same)?same:pg&&list.find(x=>pg.contains(x))||null);},0);}
  if(e('use')){if(el.classList.contains('slot'))slotClick(el,2,false);else if(el.classList.contains('rec'))craftRec(el,5);else if(el.classList.contains('shopi'))fire(el,0,true);setInvDirty(true);}
  if(e('pr')&&el.classList.contains('slot')){slotClick(el,0,true);setInvDirty(true);}}
// what Interact reaches on a gamepad: every tile interact() (gameplay.js) handles; crops only once they are ripe unless aimed at
const PADT=new Set([T.PEEL,T.SKETCH,T.CRANK,T.GATE,T.STACKS,T.STARDOOR,T.CRATE,T.WELLDOOR,T.SEAM,T.RIP,T.CREASE,T.SIGN,T.MURAL,T.ALTAR,T.DOOR,T.CHEST,T.CLOCK,T.BED]);
const padTile=(x,y,aim)=>{const t=tileAt(x,y);return PADT.has(t)||((t===T.CROP||t===T.RARE)&&(aim||(meta[idx(x,y)]&3)>=2));};
// the townsperson (in talking range, as interact() needs) or tile under the right-stick aim first, else the nearest one around the player; true when it reached something
export function padInteract(){const p=player;
  if(pad.aimT>0){const tx=Math.floor(mouse.wx),ty=Math.floor(mouse.wy);if(npcs.some(n=>Math.abs(n.x-p.x)<6&&Math.abs(mouse.wx-n.x)<.8&&mouse.wy>n.y-.2&&mouse.wy<n.y+2)||(padTile(tx,ty,true)&&reachOK(tx,ty,6.5))){mouse.rp=true;return true;}}
  let best=null,bd=9;for(const n of npcs){if(Math.abs(n.x-p.x)>=3||Math.abs(n.y-p.y)>=2.5)continue;const d=Math.hypot(n.x-p.x,n.y+1-(p.y+.9));if(d<bd){bd=d;best=[n.x,n.y+1];}}
  for(let y=Math.floor(p.y)-1;y<=Math.floor(p.y)+3;y++)for(let x=Math.floor(p.x)-3;x<=Math.floor(p.x)+3;x++){if(!padTile(x,y))continue;const d=Math.hypot(x+.5-p.x,y+.5-(p.y+.9));if(d<bd){bd=d;best=[x+.5,y+.5];}}
  if(best){mouse.wx=best[0];mouse.wy=best[1];mouse.rp=true;return true;}return false;}
// controller rumble (issue #133): rumble(weak, strong, ms) runs the pad's two motors (the light high one and the heavy low one) on
// the pad the last input came from, scaled by Settings > Controller vibration (SET.rumble: off, low, full). A new effect never
// cuts off a stronger one still playing: the two combine, keeping each motor's max until the longer one ends. Each event calls
// it with its own profile where it happens (beside its hitPause, so both start on the same frame); shake() adds one only for
// big moments that have none of their own (rumbledNow()). rumbleFade() eases one down over a boss's defeat.
const RUMSC={off:0,low:.5,full:1};let rum={w:0,s:0,end:0,at:-1},fade=null;
// stops whatever the pad is playing (Controller vibration set to Off mid-effect)
function rumStop(g){const v=g.vibrationActuator,h=g.hapticActuators&&g.hapticActuators[0],a=v&&typeof v.reset==='function'?v:h&&typeof h.reset==='function'?h:null;
  if(a)try{Promise.resolve(a.reset()).catch(()=>{});}catch(e){}}
function rumPlay(g,w,s,ms){const sc=RUMSC[SET.rumble]||0;w=Math.min(1,w*sc);s=Math.min(1,s*sc);
  try{const v=g.vibrationActuator,h=g.hapticActuators&&g.hapticActuators[0];if(v&&v.playEffect)Promise.resolve(v.playEffect('dual-rumble',{startDelay:0,duration:Math.round(ms),weakMagnitude:w,strongMagnitude:s})).catch(()=>{});else if(h&&h.pulse)Promise.resolve(h.pulse(Math.max(w,s),Math.round(ms))).catch(()=>{});}catch(e){}}
export function rumble(w,s,ms){const g=pad.g;if(!RUMSC[SET.rumble]){if(fade||performance.now()<rum.end){fade=null;rum.end=0;if(g)rumStop(g);}return;}if(!pad.active||!g||!(ms>0)||!(w>0||s>0))return;const now=performance.now();rum.at=now;
  if(now<rum.end){if(w<=rum.w&&s<=rum.s&&now+ms<=rum.end)return;w=Math.max(w,rum.w);s=Math.max(s,rum.s);ms=Math.max(ms,rum.end-now);}
  rum={w,s,end:now+ms,at:now};fade=null;rumPlay(g,w,s,ms);}
export const rumbledNow=()=>performance.now()-rum.at<2;
export function rumbleFade(w,s,ms){rumble(w,s,120);fade={w,s,t0:performance.now(),ms,next:0};}
// steps a running fade down every 100 ms (called from handlePad each frame)
function rumbleTick(){if(!fade)return;const now=performance.now(),k=1-(now-fade.t0)/fade.ms;if(k<=0||!pad.active||!pad.g||!RUMSC[SET.rumble]){fade=null;return;}
  if(now<fade.next)return;fade.next=now+100;rum={w:fade.w*k,s:fade.s*k,end:now+120,at:rum.at};rumPlay(pad.g,fade.w*k,fade.s*k,120);}
// Imported bindings are read-only, so other modules assign these through setters.
export function setPadFocus(v){return padFocus=v;}
