// Gamepad polling and menu navigation.
import {
  $,closeSettings,craft,cyclePartner,dashPress,fireHook,initAudio,invOpen,jumpPress,mapOpen,mouse,npcs,
  pad,padRebinding,partnerAbility,pause,placeTip,player,renderBinds,saveSettings,SET,setInv,setInvDirty,
  setPadRebinding,SFX,slotClick,state,T,tileAt,toggleMap,upx,
  skipIntro,dlgNext,toggleMount,
} from './game.js';

// ================= gamepad =================
export function handlePad(){const gps=navigator.getGamepads?navigator.getGamepads():[];let g=null;for(const x of gps)if(x&&x.connected){g=x;break;}
  if(!g){pad.held={};return;}
  const b=i=>{const x=g.buttons[i];return !!x&&(x.pressed||x.value>.35);},ax=g.axes,lx=ax[0]||0,ly=ax[1]||0,rx=ax[2]||0,ry=ax[3]||0;
  const raw=g.buttons.map((_,i)=>b(i)),rp=pad.raw||[];pad.raw=raw;
  if(padRebinding){const i=raw.findIndex((v,i)=>v&&!rp[i]);if(i>=0){if(i!==9){const other=Object.keys(SET.pad).find(a=>SET.pad[a]===i);if(other&&other!==padRebinding)SET.pad[other]=SET.pad[padRebinding];SET.pad[padRebinding]=i;saveSettings();}setPadRebinding(null);renderBinds();}pad.held={};return;}
  // gameplay actions follow SET.pad; menus keep the fixed layout (A select, X split, B/Y close)
  const dirs={up:ly<-.6||b(12),left:lx<-.35||b(14),right:lx>.35||b(15),down:ly>.6||b(13),start:b(9)};
  const h=Object.assign({},dirs);for(const a in SET.pad)h[a]=h[a]||b(SET.pad[a]);
  const fx=Object.assign({},dirs,{jump:b(0),use:b(2)||b(7),interact:b(1),inv:b(3),pr:b(5)});
  const prev=pad.prev,fprev=pad.fprev||{};const e=k=>h[k]&&!prev[k],ef=k=>fx[k]&&!fprev[k];pad.prev=h;pad.fprev=fx;pad.held=h;pad.name=g.id;pad.h=h;
  if(Object.values(h).some(Boolean)||Math.hypot(rx,ry)>.3){if(!pad.active)initAudio();pad.active=true;}
  if(Math.hypot(rx,ry)>.3){pad.aimX=rx;pad.aimY=-ry;pad.aimT=1.2;}
  if(state==='intro'){if(ef('jump')||ef('start')||ef('interact'))skipIntro();return;}
  if(state==='talk'){if(ef('start'))dlgNext(true);else if(ef('jump')||ef('interact')||ef('use'))dlgNext();return;}
  if(state==='title'){if(!$('newWorld').hidden){if(ef('jump')||ef('start'))$('createBtn').click();else if(ef('interact'))$('newWorld').hidden=true;return;}if(!$('settings').hidden||!$('ach').hidden||!$('howto').hidden){if(ef('interact')||ef('start')){closeSettings();$('ach').hidden=true;$('howto').hidden=true;}return;}if(ef('jump')||ef('start'))($('contBtn').hidden?$('newBtn'):$('contBtn')).click();return;}
  if(state==='paused'){if(ef('start')||ef('interact')){if(!$('settings').hidden)closeSettings();else if(!$('ach').hidden)$('ach').hidden=true;else pause(false);}return;}
  if(state!=='play')return;
  if(invOpen&&pad.active){menuPad(fx,ef);pad.held={};$('padHint').hidden=false;return;}$('padHint').hidden=true;
  if(e('start')){if(mapOpen)toggleMap(false);else if(invOpen)setInv(false);else pause(true);return;}
  if(e('map'))toggleMap();if(mapOpen){if(e('interact'))toggleMap(false);return;}
  if(e('inv'))setInv(!invOpen);
  if(e('jump'))jumpPress();
  if(e('dash'))dashPress();
  if(e('pl')){player.sel=(player.sel+9)%10;setInvDirty(true);}if(e('pr')){player.sel=(player.sel+1)%10;setInvDirty(true);}
  if(e('use'))mouse.lp=true;
  if(e('interact'))padInteract();if(e('hook'))fireHook();if(e('ability'))partnerAbility();if(e('partner'))cyclePartner();if(e('mount'))toggleMount();}
export let padFocus=null,padNavT=0,padNavDir='',padLast=performance.now();
function focusables(){return[...document.querySelectorAll('#sideSheet .slot,#sideSheet .shopi,#sideSheet .pcard,#sideSheet .bdg,#panel .slot,#panel .rec,#panel button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.closest('[hidden]');});}
function setFocus(el){if(padFocus)padFocus.classList.remove('padfocus');padFocus=el;if(!el)return;el.classList.add('padfocus');el.scrollIntoView({block:'nearest',inline:'nearest'});const r=el.getBoundingClientRect();
  if(el.classList.contains('slot')){el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));placeTip(r.right+8,r.top);}else $('tip').hidden=true;
  const c=$('cursorItem');c.style.left=upx(r.left+r.width*.6);c.style.top=upx(r.top+r.height*.6);}
function padMove(dir){const list=focusables();if(!list.length)return;if(!padFocus||!list.includes(padFocus)){setFocus(list.find(x=>x.classList.contains('slot'))||list[0]);return;}
  const a=padFocus.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;const v={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[dir];let best=null,bs=1e9;
  for(const el of list){if(el===padFocus)continue;const b=el.getBoundingClientRect(),dx=b.left+b.width/2-ax,dy=b.top+b.height/2-ay;const along=dx*v[0]+dy*v[1];if(along<=4)continue;const perp=Math.abs(dx*v[1]-dy*v[0]);const sc=along+perp*2.2;if(sc<bs){bs=sc;best=el;}}if(best){setFocus(best);SFX.pick();}}
function fire(el,button,shift){el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button,shiftKey:shift}));}
function menuPad(h,e){const now=performance.now(),dt=(now-padLast)/1000;padLast=now;
  if(!padFocus||!document.body.contains(padFocus)||padFocus.closest('[hidden]'))setFocus(focusables().find(x=>x.classList.contains('slot'))||null);
  const dir=h.up?'up':h.down?'down':h.left?'left':h.right?'right':'';if(dir){if(dir!==padNavDir){padNavDir=dir;padNavT=.35;padMove(dir);}else{padNavT-=dt;if(padNavT<=0){padNavT=.11;padMove(dir);}}}else padNavDir='';
  if(e('inv')||e('interact')||e('start')){setInv(false);return;}
  const el=padFocus;if(!el)return;
  if(e('jump')){if(el.classList.contains('slot'))slotClick(el,0,false);else if(el.classList.contains('rec'))craft(+el.dataset.r,1);else if(el.tagName==='BUTTON')el.click();else fire(el,0,false);setInvDirty(true);setTimeout(()=>{if(padFocus&&!document.body.contains(padFocus))setFocus(null);},0);}
  if(e('use')){if(el.classList.contains('slot'))slotClick(el,2,false);else if(el.classList.contains('rec'))craft(+el.dataset.r,5);else if(el.classList.contains('shopi'))fire(el,0,true);setInvDirty(true);}
  if(e('pr')&&el.classList.contains('slot')){slotClick(el,0,true);setInvDirty(true);}}
function padInteract(){const p=player;{const n=npcs.find(n=>Math.abs(n.x-p.x)<3&&Math.abs(n.y-p.y)<2.5);if(n){mouse.wx=n.x;mouse.wy=n.y+1;mouse.rp=true;return;}}
  let best=null,bd=9;for(let y=Math.floor(p.y)-1;y<=Math.floor(p.y)+3;y++)for(let x=Math.floor(p.x)-3;x<=Math.floor(p.x)+3;x++){const t=tileAt(x,y);if(t===T.DOOR||t===T.CHEST||t===T.BED){const d=Math.hypot(x+.5-p.x,y+.5-(p.y+.9));if(d<bd){bd=d;best=[x,y];}}}
  if(best){mouse.wx=best[0]+.5;mouse.wy=best[1]+.5;mouse.rp=true;}}
// Imported bindings are read-only, so other modules assign these through setters.
export function setPadFocus(v){return padFocus=v;}
