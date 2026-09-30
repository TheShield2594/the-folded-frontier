// Key bindings, settings, interface size, achievements/stats (META) and input state.

// ================= settings, meta, keys =================
export const DEF_BIND={left:'a',right:'d',jump:' ',down:'s',inv:'e',heal:'h',map:'m',hook:'f',partner:'q',ability:'r',flat:'c',dash:'shift',block:'x',mount:'g'};
const ALT={left:['arrowleft'],right:['arrowright'],jump:['w','arrowup'],down:['arrowdown'],inv:['tab','i'],heal:[],map:[],hook:[],partner:[],ability:[],flat:[],dash:[],block:[],mount:[]};
export const DEF_SET={snd:true,vol:80,music:50,sfx:90,amb:70,zoom:44,ui:100,text:100,shake:true,hitstop:true,heart:true,nums:true,fg:true,post:true,houseCovers:false,cb:'off',intro:true,hints:true,motion:'auto',tele:false,tspd:'normal',blockTog:false,drawTog:false,rumble:'full',padNames:'auto'};
function loadJSON(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
export const SET=Object.assign({},DEF_SET,loadJSON('folded-frontier-settings')||{});SET.bind=Object.assign({},DEF_BIND,SET.bind||{});
// gamepad buttons (standard mapping indices); Start and the d-pad/stick stay fixed
// block starts unbound (-1): Interact blocks while held. A d-pad button bound to an action (heal ↑, flatten ↓, switch partner ←,
// partner move →) stops moving the player; down on the stick still flattens on the ground. R3 is free.
export const DEF_PAD={jump:0,interact:1,dash:2,inv:3,pl:4,pr:5,hook:6,use:7,map:8,mount:10,heal:12,flat:13,partner:14,ability:15,block:-1};
// a saved layout keeps every binding; an action it doesn't have yet gets its default button only if nothing uses that button
{const sv=SET.pad||{},used=Object.values(sv);SET.pad=Object.assign({},sv);for(const a in DEF_PAD)if(!(a in sv))SET.pad[a]=used.includes(DEF_PAD[a])?-1:DEF_PAD[a];}
// controller vibration is off, low or full (a build before that saved it as on/off)
if(!['off','low','full'].includes(SET.rumble))SET.rumble=SET.rumble===false?'off':'full';
// pad layout 2 moved the partner move and switch from the stick clicks to the d-pad and gave Mount L3; a saved layout still on
// the old defaults (partner move L3, switch R3, Mount unbound, nothing else on d-pad ← →) moves with it, once
if(!SET.padV){const q=SET.pad,o=Object.keys(q).filter(a=>!['ability','partner','mount'].includes(a)).map(a=>q[a]);
  if(q.ability===10&&q.partner===11&&!(q.mount>=0)&&!o.includes(14)&&!o.includes(15)){q.ability=15;q.partner=14;q.mount=10;}SET.padV=2;}
export const saveSettings=()=>saveJSON('folded-frontier-settings',SET);
// interface size zooms all of #ui (--ui), text size multiplies every CSS font size (--ts); upx() turns screen px into #ui px.
// Sizes above 100% are capped so the UI still has at least a 960×600 layout to work with on small screens.
let uiZ=1;
// reduced motion: 'auto' follows the system setting, 'reduce' or 'full' override it; body.rm switches off the CSS motion
const OSRM=matchMedia('(prefers-reduced-motion: reduce)');
export const reduceMotion=()=>SET.motion==='reduce'||(SET.motion!=='full'&&OSRM.matches);
// The interface is sized to the screen first (uiFit: 1 on a 768px-tall laptop, up to 1.3 on tall screens, down to .8 on short
// or narrow ones), and the Interface size setting scales that; an enlarged interface still stops where the backpack stops fitting.
export function uiFit(){return Math.max(.8,Math.min(1.3,.52+innerHeight/1600,innerWidth/1100));}
export function applyUI(){const r=document.documentElement.style,fit=uiFit();uiZ=fit*SET.ui/100;if(SET.ui>100)uiZ=Math.max(fit,Math.min(uiZ,innerWidth/960,innerHeight/600));r.setProperty('--ui',uiZ);r.setProperty('--ts',SET.text/100);document.body.classList.toggle('uibig',uiZ*SET.text/100>1.25);document.body.classList.toggle('rm',reduceMotion());}
export function upx(v){return v/uiZ+'px';}
applyUI();addEventListener('resize',applyUI);OSRM.addEventListener&&OSRM.addEventListener('change',applyUI);
export const META=Object.assign({ach:{},stats:{}},loadJSON('folded-frontier-meta')||{});
export const saveMeta=()=>saveJSON('folded-frontier-meta',META);
export const keys={};export const pad={held:{},prev:{},aimX:1,aimY:0,active:false,aimT:0};
export const touch={on:false,held:{},aim:null,aimT:0,world:false,quick:false};
export const boundKeys=()=>Object.values(SET.bind);
export function actKey(a,k){if(SET.bind[a]===k)return true;return ALT[a].includes(k)&&!boundKeys().includes(k);}
export function held(a){if(keys[SET.bind[a]])return true;for(const k of ALT[a])if(keys[k]&&!boundKeys().includes(k))return true;return !!pad.held[a]||!!touch.held[a];}
