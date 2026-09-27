// Key bindings, settings, interface size, achievements/stats (META) and input state.

// ================= settings, meta, keys =================
export const DEF_BIND={left:'a',right:'d',jump:' ',down:'s',inv:'e',heal:'h',map:'m',hook:'f',partner:'q',ability:'r',flat:'c',dash:'shift',block:'x',mount:'g'};
const ALT={left:['arrowleft'],right:['arrowright'],jump:['w','arrowup'],down:['arrowdown'],inv:['tab','i'],heal:[],map:[],hook:[],partner:[],ability:[],flat:[],dash:[],block:[],mount:[]};
export const DEF_SET={snd:true,vol:80,music:50,sfx:90,amb:70,zoom:44,ui:100,text:100,shake:true,hitstop:true,nums:true,fg:true,houseCovers:false,cb:'off',intro:true,hints:true};
function loadJSON(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
export const SET=Object.assign({},DEF_SET,loadJSON('folded-frontier-settings')||{});SET.bind=Object.assign({},DEF_BIND,SET.bind||{});
// gamepad buttons (standard mapping indices); Start and the d-pad/stick stay fixed
// mount starts unbound (-1): every button is taken, and the mount item can also be used from the hotbar
export const DEF_PAD={jump:0,interact:1,dash:2,inv:3,pl:4,pr:5,hook:6,use:7,map:8,ability:10,partner:11,mount:-1};
SET.pad=Object.assign({},DEF_PAD,SET.pad||{});
export const saveSettings=()=>saveJSON('folded-frontier-settings',SET);
// interface size zooms all of #ui (--ui), text size multiplies every CSS font size (--ts); upx() turns screen px into #ui px.
// Sizes above 100% are capped so the UI still has at least a 960×600 layout to work with on small screens.
let uiZ=1;
export function applyUI(){const r=document.documentElement.style;uiZ=SET.ui/100;if(uiZ>1)uiZ=Math.max(1,Math.min(uiZ,innerWidth/960,innerHeight/600));r.setProperty('--ui',uiZ);r.setProperty('--ts',SET.text/100);document.body.classList.toggle('uibig',uiZ*SET.text/100>1.25);}
export function upx(v){return v/uiZ+'px';}
applyUI();addEventListener('resize',applyUI);
export const META=Object.assign({ach:{},stats:{}},loadJSON('folded-frontier-meta')||{});
export const saveMeta=()=>saveJSON('folded-frontier-meta',META);
export const keys={};export const pad={held:{},prev:{},aimX:1,aimY:0,active:false,aimT:0};
export const boundKeys=()=>Object.values(SET.bind);
export function actKey(a,k){if(SET.bind[a]===k)return true;return ALT[a].includes(k)&&!boundKeys().includes(k);}
export function held(a){if(keys[SET.bind[a]])return true;for(const k of ALT[a])if(keys[k]&&!boundKeys().includes(k))return true;return !!pad.held[a];}
