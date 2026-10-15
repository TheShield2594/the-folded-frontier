// Saving and loading, save migration, new/load world, pause and title flow, save codes.
import {
  $,addItem,angler,applyVolumes,bestiary,BIO,bob,buildBackdrop,camT,chests,chunks,clearHouses,CS,dirty,
  enemies,explored,generate,H,hook,houses,initAudio,inkMoon,liqChunks,makeNPC,mapBase,mapOpen,mapS,mbx,
  META,meta,mk,N,nightsSeen,npcs,parts,pickups,player,projs,quests,rebuildAll,registerHouseAt,
  removeEnemy,renderQuests,resetBossFx,saveMeta,scene,seed,seedText,setAngler,setBestiary,setBIO,setBlk,setBoss,
  setChests,setCHH,setChunks,setCurBio,setCW,setEnemies,setExplored,setH,setHeartsKey,setHintT,
  setInkMoon,setInv,setInvDirty,setLiqChunks,setMapBase,setMapOpen,setMapS,setMbImg,setMbx,setMeta,setN,
  setNightsSeen,setNpcs,setPickups,setProjs,setQuests,setSeed,setSeedText,setSky,setSPAWNX,
  setStamp,setState,setSurf,setSurfAvg,setTiles,setVisited,setW,setWalls,setWeather,setWeatherT,setWind,
  setWorldSize,setWorldTime,SIZES,state,surf,syncPartners,tiles,toast,updateCoins,visited,W,
  walls,weather,weatherT,wind,worldSize,worldTime,
  newTut,playIntro,SET,setTut,tut,playerSpeaker,say,INTROSAY,clearDlg,
  BADGES,ITEMS,NPCDEF,PARTNERS,setTown,setWorldDay,town,worldDay,
  folk,newFolk,newWev,restoreEvents,setFolk,setWev,wev,
  newPals,pals,setPals,
  dismount,PETS,
  lore,newLore,setLore,placeMurals,planMarks,syncLore,
  newAngler,planSecrets,planTricks,planSeasons,seasonWorld,planDungeons,planSky,
  perfLap,perfFold,perfLoad,perfSave,perfCode,
  endDie,cleanLook,LOOK,lookPic,
  cards,newCards,setCards,CARDS,CARDPAGES,
  closePack,sizeLight,dropChunks,
} from './game.js';

// ================= save/load =================
const SAVE_KEY='folded-frontier-save-v1';
function b64(u8){let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s);}
// the tile arrays come as base64 (a save code, a one-record save) or as bytes (region saves)
function unb64(s,u8){if(typeof s!=='string'){u8.set(s);return;}const b=atob(s);for(let i=0;i<b.length;i++)u8[i]=b.charCodeAt(i);}
// The world save lives in IndexedDB (database 'folded-frontier', store 'saves'). The main record (SAVE_KEY) holds the save's
// JSON without its tile arrays, gzipped with CompressionStream, plus the world's size and how many regions it has
// ({f: 2, z, w, h, rw, n, id}). The tiles, walls, meta and explored bytes go in region records of RW columns each
// (SAVE_KEY+':r:0000', ...), gzipped. A save writes only the regions that changed since the last stored save (snap, the arrays as
// they were stored), in one transaction with the main record, so it is all or nothing; every region carries the id of the
// full write it belongs to, which the main record names. A save in the one-record format of the builds before ({z: the whole
// JSON}) still loads, and the next save writes all its regions. Where IndexedDB can't open (blocked storage, some private modes)
// saves fall back to localStorage as the whole JSON, uncompressed, as before; a save an older build left in localStorage is read
// at boot, and the first save that reaches IndexedDB removes it. Writes run one at a time in order (saveQ), so an older save
// never lands after a newer one, and saveIdle() waits for them. The newest save is also kept in memory (last: its JSON and a copy
// of the arrays), which Continue and save codes read, so they stay synchronous.
let last=null,snap=null,wid=0,lastRegions=0;
let saveWarned=false,saveQ=Promise.resolve(true);
const DB_STORE='saves';let dbP=null;
function db(){return dbP||(dbP=new Promise((ok,no)=>{const r=indexedDB.open('folded-frontier',1);r.onupgradeneeded=()=>r.result.createObjectStore(DB_STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onblocked=()=>no(new Error('blocked'));})
  .catch(e=>{console.warn('IndexedDB is not available, saving to localStorage:',e&&e.message);return null;}));}
const tx=(d,mode,f)=>new Promise((ok,no)=>{const t=d.transaction(DB_STORE,mode),q=f(t.objectStore(DB_STORE));t.oncomplete=()=>ok(q.result);t.onerror=t.onabort=()=>no(t.error||new DOMException('Saving was cancelled.','AbortError'));});
const gz=(src,ds)=>new Response(new Blob([src]).stream().pipeThrough(ds?new DecompressionStream('gzip'):new CompressionStream('gzip')));
// a one-record save (backups, the tests' planted saves) is {z: gzipped JSON bytes}, or {s: the JSON text} where CompressionStream is missing
async function putRec(key,json){const d=await db();if(!d){localStorage.setItem(key,json);return json.length;}
  const r=typeof CompressionStream==='undefined'?{s:json}:{z:new Uint8Array(await gz(json).arrayBuffer())};await tx(d,'readwrite',s=>s.put(r,key));
  if(key===SAVE_KEY)try{localStorage.removeItem(SAVE_KEY);}catch(_){}return r.z?r.z.length:json.length;}
async function getRec(key){const d=await db();if(d){const r=await tx(d,'readonly',s=>s.get(key));if(r)return r.z?gz(r.z,1).text():r.s;}try{return localStorage.getItem(key);}catch(e){return null;}}
const RW=64,RKEY=SAVE_KEY+':r:',rkey=k=>RKEY+String(k).padStart(4,'0'),AKEYS=['tiles','walls','meta','explored'];
// region k's bytes: for each of the four arrays (row-major, w*h), its rows of RW columns
function regionBytes(A,k,w,h){const x0=k*RW,cw=Math.min(RW,w-x0),out=new Uint8Array(4*cw*h);let o=0;for(const a of A)for(let y=0;y<h;y++){out.set(a.subarray(y*w+x0,y*w+x0+cw),o);o+=cw;}return out;}
function regionPut(A,k,w,h,b){const x0=k*RW,cw=Math.min(RW,w-x0);if(!b||b.length!==4*cw*h)throw new Error('This save is missing part of its world.');let o=0;for(const a of A)for(let y=0;y<h;y++){a.set(b.subarray(o,o+cw),y*w+x0);o+=cw;}}
function regionSame(A,B,k,w,h){const x0=k*RW,x1=Math.min(w,x0+RW);for(let j=0;j<4;j++){const a=A[j],b=B[j];for(let y=0;y<h;y++){const r=y*w;for(let x=x0;x<x1;x++)if(a[r+x]!==b[r+x])return false;}}return true;}
const zipB=async u=>typeof CompressionStream==='undefined'?{b:u}:{z:new Uint8Array(await gz(u).arrayBuffer())};
const zipS=async s=>typeof CompressionStream==='undefined'?{s}:{z:new Uint8Array(await gz(s).arrayBuffer())};
// the whole save as one JSON string (save codes, backups, the localStorage fallback)
function fullJSON(json,A){if(!A)return json;const d=JSON.parse(json);AKEYS.forEach((k,j)=>d[k]=b64(A[j]));return JSON.stringify(d);}
const withArrays=(d,A)=>{if(A&&d&&typeof d==='object')AKEYS.forEach((k,j)=>d[k]=A[j]);return d;};
async function writeSave(json,A,w,h){const d=await db();if(!d){const s=fullJSON(json,A);localStorage.setItem(SAVE_KEY,s);lastRegions=0;return s.length;}
  const n=Math.ceil(w/RW),same=snap&&snap.w===w&&snap.h===h,ch=[];for(let k=0;k<n;k++)if(!same||!regionSame(A,snap.A,k,w,h))ch.push(k);
  const id=same?wid:1+Math.floor(Math.random()*2e9),recs=await Promise.all(ch.map(async k=>Object.assign(await zipB(regionBytes(A,k,w,h)),{id})));
  const main=Object.assign(await zipS(json),{f:2,w,h,rw:RW,n,id});
  await tx(d,'readwrite',s=>{ch.forEach((k,i)=>s.put(recs[i],rkey(k)));s.delete(IDBKeyRange.bound(rkey(n),RKEY+'￿'));return s.put(main,SAVE_KEY);});
  wid=id;snap={A,w,h};lastRegions=ch.length;try{localStorage.removeItem(SAVE_KEY);}catch(_){}
  let bytes=(main.z||main.s).length;for(const r of recs)bytes+=(r.z||r.b).length;return bytes;}
// the stored save as {json, A, w, h, id} (A null for a save in the one-record format), or null when there is none
async function readSave(){const d=await db();if(d){const r=await tx(d,'readonly',s=>s.get(SAVE_KEY));if(r){const json=r.z?await gz(r.z,1).text():r.s;if(r.f!==2)return {json,A:null};
  const rs=await tx(d,'readonly',s=>s.getAll(IDBKeyRange.bound(rkey(0),rkey(r.n-1))));if(rs.length!==r.n)throw new Error('This save is missing part of its world.');
  const A=AKEYS.map(()=>new Uint8Array(r.w*r.h));for(let k=0;k<r.n;k++){if(rs[k].id!==r.id)throw new Error('This save is missing part of its world.');regionPut(A,k,r.w,r.h,rs[k].z?new Uint8Array(await gz(rs[k].z,1).arrayBuffer()):rs[k].b);}
  return {json,A,w:r.w,h:r.h,id:r.id};}}
  let s=null;try{s=localStorage.getItem(SAVE_KEY);}catch(e){}return s?{json:s,A:null}:null;}
function saveData(){const data={v:SAVE_VER,seed,surf:Array.from(surf),chests:Array.from(chests.entries()),
  p:{x:player.x,y:player.y,hp:player.hp,max:player.max,mana:player.mana,maxMana:player.maxMana,buffs:player.buffs,world:{weather,weatherT,wind,inkMoon,nightsSeen,day:worldDay},partners:player.partners,partner:player.partner,pet:player.pet,badges:player.badges,badgesOn:player.badgesOn,bpUps:player.bpUps,inv:player.inv,armor:player.armor,acc:player.acc,coins:player.coins,spawn:player.spawn,sel:player.sel,look:player.look},time:worldTime,quests,npcs:npcs.map(n=>({type:n.type,x:n.x,y:n.y,home:n.home}))};
  data.w=W;data.h=H;data.size=worldSize;data.seedText=seedText;data.bio=BIO;data.visited=[...visited];data.houses=houses.map(h=>[h.sx,h.sy]);data.bestiary=bestiary;data.angler=angler;data.tut=tut;data.town=town;data.folk=folk;data.ev=wev;data.pals=pals;data.lore=lore;data.cards=cards;return data;}
function saveFail(t0){perfSave(performance.now()-t0,last?last.json.length:0,false);if(!saveWarned){saveWarned=true;toast('Could not save: browser storage is full or blocked. Make a save code from the pause menu to keep this world.','bad');}return false;}
// takes the world as it is now and stores it; resolves true once it is stored, false (with a warning toast) if storage refused it
export function save(){const t0=performance.now();let json,A;try{json=JSON.stringify(saveData());A=[tiles,walls,meta,explored].map(a=>a.slice());}catch(e){return Promise.resolve(saveFail(t0));}last={json,A};const w=W,h=H;
  return saveQ=saveQ.then(()=>writeSave(json,A,w,h)).then(n=>{saveMeta();perfSave(performance.now()-t0,json.length,true,n);saveWarned=false;return true;},()=>{snap=null;return saveFail(t0);});}
// how many regions the last stored save wrote (the tests check that a small change writes one)
export const savedRegions=()=>lastRegions;
export const saveIdle=()=>saveQ;
// the stored save, read after any save still being written (null when there is none); boot uses it, and the tests check it
export async function storedSave(){await saveQ;const r=await readSave();return r?JSON.parse(fullJSON(r.json,r.A)):null;}
// for the tests: puts a save in storage as an older or newer build would have left it
export function storeSave(json){return saveQ=saveQ.then(()=>putRec(SAVE_KEY,json)).then(()=>{snap=null;return true;});}
// boot: reads the stored save into memory; a save that can't be read or parsed comes back as an empty object, so loadWorld()
// fails on it and loadFailed() keeps a copy instead of the next save overwriting it
export async function bootSave(){let r=null;try{r=await readSave();}catch(e){console.warn('Could not read the save:',e);}last=r;if(!r)return null;if(r.A){snap={A:r.A,w:r.w,h:r.h};wid=r.id;}
  try{return withArrays(JSON.parse(r.json),r.A);}catch(e){return {};}}
// save format history: v1 original; v2 adds the per-world bestiary; v3 fills in anything builds older than
// the repo left out (biome ranges, camps, treasure, shrine, mana, world state) and adds seasons and the town; v4 adds the
// vertical layers and dungeons (BIO.sky, BIO.deep, BIO.dun).
// Older saves are upgraded on load by MIGRATE, one step per version in order (MIGRATE[n] takes a save from v n-1 to v n).
// A save with no version is v0, which the v1 format matches, so it runs every step. A save from a newer build than this one
// is refused with SaveTooNew instead of being read wrong. To change the format, bump SAVE_VER and add MIGRATE[SAVE_VER].
export const SAVE_VER=4;
const arr=(a,n)=>{a=Array.isArray(a)?a.slice(0,n):[];while(a.length<n)a.push(null);return a;};
export class SaveTooNew extends Error{constructor(v){super(`This world was saved by a newer version of The Folded Frontier (save format ${v}; this version reads up to ${SAVE_VER}). Reload the page to get the latest version, then try again.`);this.name='SaveTooNew';this.v=v;}}
const saveVer=v=>Number.isSafeInteger(v)&&v>0?v:0;
// throws SaveTooNew for a save (or save code) from a newer build
export function checkSaveVer(v){v=saveVer(v);if(v>SAVE_VER)throw new SaveTooNew(v);return v;}
const MIGRATE={
  2:d=>{d.bestiary={};},
  3:d=>{const b=d.bio=d.bio&&typeof d.bio==='object'?d.bio:{uw:0};
    // with no biome ranges, biomeAt() and the sky would read b.snow[0] and crash; empty ranges match nothing
    if(b.uw){if(!Array.isArray(b.snow))b.snow=[-1,-2];if(!Array.isArray(b.desert))b.desert=[-1,-2];if(!Array.isArray(b.lake))b.lake=[-1e4,0,0];}
    for(const k of['camps','treasure','shown'])if(!Array.isArray(b[k]))b[k]=[];b.camps=b.camps.filter(c=>c&&typeof c==='object');
    if(b.shrine&&!Array.isArray(b.shrine))delete b.shrine;
    const p=d.p=d.p&&typeof d.p==='object'?d.p:{};p.world=Object.assign({},p.world);if(p.world.day==null)p.world.day=d.angler&&d.angler.day||0;
    if(!Array.isArray(d.chests))d.chests=[];if(typeof d.time!=='number')d.time=7.5;if(!d.quests||typeof d.quests!=='object')d.quests={};
    d.town={f:{},used:[]};},
  // v4, dungeons and layers: older worlds are not regenerated. They get the Folded Clocktower (planDungeons) and the sky islands
  // (planSky) stamped in on this load, but only on untouched natural ground and empty sky, so nothing the player built is covered;
  // a world with no spot that fits goes without. The Pressed Deep needs rows the older world sizes don't have, so those worlds
  // have no deep layer (BIO.deep stays unset) and their underworld stays open to any pickaxe, as before.
  // The Hollow Archive (issue #81) needs no version step: it is dug too deep into the rock to find untouched room for in a
  // played world, so saves made before it (v4 or older) are left alone: planDungeons() sets BIO.dun.arch and BIO.dun.stacks to
  // null on their next load, and they keep their terrain.
  // The Origami Observatory and its Star Vaults (issue #81) need no version step either: they only take empty sky, so any save
  // with sky islands gets them on its next load (planDungeons() runs again after planSky()); a world with no empty sky that
  // fits gets null for both.
  // The Great Scrapworks and its Supply Crates (issue #81) are placed on load like the Clocktower, only on untouched ground; the
  // Sunken Inkwell Temple and its Ink Wells, dug into the rock like the Archive, are not: older saves get null for them.
  4:d=>{const b=d.bio;if(b&&b.dun&&typeof b.dun!=='object')delete b.dun;if(b&&b.sky&&(typeof b.sky!=='object'||!Array.isArray(b.sky.is)))delete b.sky;},
};
function migrateSave(d){if(!d||typeof d!=='object')throw new Error('This save is missing its world data.');d.v=checkSaveVer(d.v);
  const raw=v=>typeof v==='string'||v instanceof Uint8Array;if(!raw(d.tiles)||!raw(d.walls)||!raw(d.meta)||!Array.isArray(d.surf))throw new Error('This save is missing its world data.');
  while(d.v<SAVE_VER){const v=d.v+1;if(MIGRATE[v])MIGRATE[v](d);d.v=v;}
  return d;}
// Every load cleans the parts that reference game data, so a save that names an item, NPC, partner or badge
// this build doesn't have still loads instead of crashing later.
const okItem=s=>s&&typeof s==='object'&&ITEMS[s.id]&&s.n>0?s:null;
function cleanSave(d){const p=d.p;p.inv=arr(p.inv,40).map(okItem);p.armor=arr(p.armor,3).map(okItem);p.acc=arr(p.acc,3).map(okItem);
  p.max=+p.max||100;p.hp=Math.min(p.max,+p.hp||p.max);p.coins=+p.coins||0;p.sel=Math.min(39,Math.max(0,p.sel|0));
  p.partners=Array.isArray(p.partners)?p.partners.filter(k=>PARTNERS[k]):[];if(!PETS[p.pet])p.pet=null;if(!p.partners.includes(p.partner))p.partner=null;
  p.badges=Array.isArray(p.badges)?p.badges.filter(k=>BADGES[k]):[];p.badgesOn=Array.isArray(p.badgesOn)?p.badgesOn.filter(k=>p.badges.includes(k)):[];
  d.chests=d.chests.filter(c=>Array.isArray(c)&&Array.isArray(c[1])).map(([i,st])=>[i,arr(st,20).map(okItem)]);
  if(Array.isArray(d.npcs))d.npcs=d.npcs.filter(n=>n&&NPCDEF[n.type]);if(d.npc&&typeof d.npc!=='object')d.npc=null;
  if(!Array.isArray(d.houses))d.houses=[];if(!Array.isArray(d.visited))d.visited=[];
  if(!d.town||typeof d.town!=='object')d.town={};d.town={f:Object.assign({},d.town.f),used:Array.isArray(d.town.used)?d.town.used:[]};
  return d;}
// If a save can't be loaded, keep a copy of it so a later new world can't overwrite the only one. Each different
// failed save gets its own timestamped key; the same save failing again (boot, then Continue) is stored once.
// Returns the message to show the player.
export function loadFailed(e){const tooNew=e instanceof SaveTooNew;if(tooNew)console.warn(e.message);else console.error('Could not load the save:',e);const msg=tooNew?e.message+' Your world was kept in this browser.':'This save could not be loaded. A copy was kept in your browser; start a new world or load a save code.';
  const s=last&&fullJSON(last.json,last.A);if(s)saveQ=saveQ.then(async()=>{const pre=SAVE_KEY+'-backup',d=await db();const keys=d?await tx(d,'readonly',t=>t.getAllKeys()):Object.keys(localStorage);
    for(const k of keys)if(typeof k==='string'&&k.startsWith(pre)&&await getRec(k)===s)return true;await putRec(pre+'-'+Date.now(),s);return true;}).catch(()=>true);
  return msg;}
// the newest save, from memory (Continue reads it synchronously)
export function loadSave(){if(!last)return null;try{return withArrays(JSON.parse(last.json),last.A);}catch(e){return {};}}
const hasSave=()=>!!last;
// set once boot has read the save and built the world; the title buttons wait for it
export let booted=false;export function setBooted(v){return booted=v;}

// ================= lifecycle =================
function allocWorld(w,h){setW(w);setH(h);setN(W*H);setSPAWNX(Math.floor(W/2));sizeLight(N);setTiles(new Uint8Array(N));setWalls(new Uint8Array(N));setMeta(new Uint8Array(N));setStamp(new Uint32Array(N));setSky(new Uint8Array(N));setBlk(new Uint8Array(N));setExplored(new Uint8Array(N));setSurf(new Int16Array(W));
  dropChunks();setChunks([]);setLiqChunks([]);setCW(Math.ceil(W/CS));setCHH(Math.ceil(H/CS));dirty.clear();
  setMapBase(mk(W,H));setMbx(mapBase.getContext('2d'));setMbImg(mbx.createImageData(W,H));setMapS(W<=420?3:2);$('mapC').width=W*mapS;$('mapC').height=H*mapS;hook.state=0;}
function seedFrom(txt){txt=(txt||'').trim();if(/^\d{1,9}$/.test(txt))return +txt;let h=2166136261;for(const c of txt){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function clearEntities(){enemies.forEach(removeEnemy);setEnemies([]);pickups.forEach(k=>scene.remove(k.mesh));setPickups([]);projs.forEach(q=>scene.remove(q.m));setProjs([]);npcs.forEach(n=>{scene.remove(n.mesh);if(n.bub)n.bub.remove();});setNpcs([]);setBoss(null);$('boss').hidden=true;resetBossFx();parts.length=0;player.st={};player.draw=null;player.blocking=false;bob.state=0;}
export function newWorld(sd,size='s',txt,look){clearHouses();setVisited(new Set());const S=SIZES[size]||SIZES.s;perfLap();clearEntities();allocWorld(S.w,S.h);setWorldSize(size);setSeedText(txt||String(sd));setCurBio('');const g=generate(sd);perfLap('gen');placeMurals();planMarks();planSecrets();planTricks();planSeasons();perfLap('lore');setLore(newLore());const p=player;p.x=g.spawn.x;p.y=g.spawn.y;p.spawn={x:g.spawn.x,y:g.spawn.y};p.hp=p.max=100;p.mana=p.maxMana=20;p.coins=0;p.buffs={};setWeather('clear');setWeatherT(150);setWind(0);setInkMoon(false);setNightsSeen(0);dismount(true);p.pet=null;p.partners=[];p.partner=null;p.badges=[];p.badgesOn=[];p.bpUps=0;p.inv=new Array(40).fill(null);p.armor=[null,null,null];p.acc=[null,null,null];p.sel=0;p.look=cleanLook(look);
  [['copperpick',1],['coppersword',1],['hammer',1],['torch',12],['potion',2],['wood',20]].forEach(([id,n])=>addItem(id,n));setWorldTime(7.5);setQuests({});setBestiary({});setAngler(newAngler());setTut(newTut());setWorldDay(0);setTown({f:{},used:[]});setFolk(newFolk());setWev(newWev());setPals(newPals());setCards(newCards());seasonWorld();p.sheetDirty=true;explored.fill(0);
  perfLap('misc');rebuildAll();perfLap('chunks');buildBackdrop();perfLap('back');perfFold();camT.x=p.x;camT.y=p.y;registerHouseAt(g.bed.x,g.bed.y);}
export function loadWorld(d){const t0=performance.now();d=cleanSave(migrateSave(d));setTown(d.town);{const f=Object.assign(newFolk(),d.folk&&typeof d.folk==='object'?d.folk:{});for(const k in f)if(!f[k]||typeof f[k]!=='object')f[k]={};setFolk(f);}setWev(Object.assign(newWev(),d.ev&&typeof d.ev==='object'?d.ev:{}));{const q=Object.assign(newPals(),d.pals&&typeof d.pals==='object'?d.pals:{});for(const k in q)if(!q[k]||typeof q[k]!=='object')q[k]={};setPals(q);}{const c=Object.assign(newCards(),d.cards&&typeof d.cards==='object'?d.cards:{});for(const k of['have','pg'])if(!c[k]||typeof c[k]!=='object')c[k]={};for(const k in c.have)if(!CARDS.some(x=>x[0]===k)||!Number.isSafeInteger(c.have[k])||c.have[k]<=0)delete c.have[k];for(const k in c.pg)if(!CARDPAGES.some(p=>p.id===k))delete c.pg[k];setCards(c);}setTut(d.tut&&typeof d.tut==='object'?Object.assign({s:99,seen:{}},d.tut):{s:99,seen:{peel:1,pop:1,flat:1}});setBestiary(d.bestiary&&typeof d.bestiary==='object'?d.bestiary:{});{const a=Object.assign(newAngler(),d.angler&&typeof d.angler==='object'?d.angler:{});for(const k of['seen','rec'])if(!a[k]||typeof a[k]!=='object')a[k]={};setAngler(a);}{const w=Object.assign({weather:'clear',weatherT:150,wind:0,inkMoon:false,nightsSeen:0,day:0},d.p.world);setWeather(w.weather);setWeatherT(w.weatherT);setWind(w.wind);setInkMoon(w.inkMoon);setNightsSeen(w.nightsSeen);setWorldDay(w.day|0);}clearEntities();allocWorld(d.w||420,d.h||170);setWorldSize(d.size||'s');setSeedText(d.seedText||String(d.seed));setBIO(d.bio||{uw:0});setCurBio('');clearHouses();setVisited(new Set(d.visited||[]));setSeed(d.seed);unb64(d.tiles,tiles);unb64(d.walls,walls);unb64(d.meta,meta);setSurf(Int16Array.from(d.surf));let s=0;for(const v of surf)s+=v;setSurfAvg(s/W);placeMurals();planMarks();planSeasons();seasonWorld();setLore({f:Object.assign({},d.lore&&d.lore.f&&typeof d.lore.f==='object'?d.lore.f:{}),ch:d.lore&&Array.isArray(d.lore.ch)?d.lore.ch.filter(Number.isInteger):[]});setChests(new Map(d.chests));planSecrets();planDungeons(d.seed);planSky(d.seed);planDungeons(d.seed);planTricks();
  const p=player,q=d.p;const sx=Number.isFinite(q.x)?q.x:W/2;Object.assign(p,{x:sx,y:Number.isFinite(q.y)?q.y:surf[Math.floor(sx)]+2,hp:q.hp,max:q.max,maxMana:q.maxMana||20,mana:q.mana??20,buffs:q.buffs||{},partners:q.partners||[],partner:q.partner||null,pet:q.pet||null,badges:q.badges||[],badgesOn:q.badgesOn||[],bpUps:q.bpUps||0,inv:q.inv,armor:q.armor,acc:q.acc,coins:q.coins,spawn:q.spawn&&Number.isFinite(q.spawn.x)?q.spawn:{x:sx,y:Number.isFinite(q.y)?q.y:surf[Math.floor(sx)]+2},sel:q.sel||0,look:cleanLook(q.look)});dismount(true);setWorldTime(d.time%24);setQuests(d.quests||{});if(d.explored)unb64(d.explored,explored);else explored.fill(1);p.sheetDirty=true;
  rebuildAll();buildBackdrop();if(d.houses)setTimeout(()=>d.houses.forEach(([x,y])=>registerHouseAt(x,y)),0);if(d.npcs)d.npcs.forEach(n=>makeNPC(n.type,n.x,n.y,n.home));else if(d.npc)makeNPC('merchant',d.npc.x,d.npc.y,d.npc.home);restoreEvents();syncLore();camT.x=p.x;camT.y=p.y;perfLoad(performance.now()-t0);}
function startPlay(){clearDlg();closePack();endDie();syncPartners(true);setState('play');setMapOpen(false);$('map').hidden=true;$('title').hidden=true;player.dead=false;player.mesh.visible=true;$('dead').hidden=true;setInvDirty(true);setHeartsKey('');renderQuests();updateCoins();setHintT(0);$('help').style.opacity=1;initAudio();}
export function pause(on){if(on){$('seedTxt').textContent=`Seed ${seedText} · ${(SIZES[worldSize]||SIZES.s).name} world`;if(mapOpen){setMapOpen(false);$('map').hidden=true;}setState('paused');$('pause').hidden=false;save().then(ok=>{if(ok)toast('Game saved.','good');});}else{setState('play');$('pause').hidden=true;}}
let nwSize='m';
function renderSize(){[...$('sizeSeg').children].forEach(b=>b.classList.toggle('on',b.dataset.s===nwSize));$('sizeNote').textContent=SIZES[nwSize].note;}
const randomSeedText=()=>String(Math.floor(Math.random()*1e9));
// the look picker: style rows cycle with ‹ ›, colour rows are swatches; the preview is the player's standing frame (lookPic)
const LOOKROW={hairS:'Hair',hair:'Hair color',skin:'Skin',tunic:'Shirt',hatS:'Hat',capeS:'Neck',acc:'Accent'},LOOKNAME={hatS:{none:'None',cap:'Cap',beret:'Beret',straw:'Straw hat',beanie:'Beanie'},capeS:{scarf:'Scarf',cape:'Cape',none:'None'}};
let nwLook=cleanLook(),lookBuilt=false;
const lookName=(k,v)=>{const n=LOOK[k][v];return(LOOKNAME[k]&&LOOKNAME[k][n])||n[0].toUpperCase()+n.slice(1);};
function renderLook(){const rows=$('lookRows');
  if(!lookBuilt){lookBuilt=true;rows.innerHTML=Object.keys(LOOKROW).map(k=>`<span>${LOOKROW[k]}</span>`+(LOOK[k][0][0]==='#'?`<div class="sws" role="group" aria-label="${LOOKROW[k]}">${LOOK[k].map((c,i)=>`<button type="button" data-k="${k}" data-v="${i}" style="--c:${c}" aria-label="${LOOKROW[k]} ${i+1}"></button>`).join('')}</div>`
    :`<div class="cyc"><button type="button" data-k="${k}" data-d="-1" aria-label="Previous ${LOOKROW[k].toLowerCase()}">‹</button><b data-n="${k}"></b><button type="button" data-k="${k}" data-d="1" aria-label="Next ${LOOKROW[k].toLowerCase()}">›</button></div>`)).join('');}
  rows.querySelectorAll('.sws button').forEach(b=>{const on=nwLook[b.dataset.k]===+b.dataset.v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
  rows.querySelectorAll('b[data-n]').forEach(b=>b.textContent=lookName(b.dataset.n,nwLook[b.dataset.n]));
  const c=$('lookPrev'),t=c.getContext('2d');t.clearRect(0,0,96,144);t.drawImage(lookPic(nwLook),0,0);}
$('lookRows').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k,n=LOOK[k].length;nwLook[k]=b.dataset.d?(nwLook[k]+ +b.dataset.d+n)%n:+b.dataset.v;renderLook();});
$('lookRnd').addEventListener('click',()=>{for(const k in LOOK)nwLook[k]=Math.floor(Math.random()*LOOK[k].length);renderLook();});
$('newBtn').addEventListener('click',()=>{initAudio();$('seedIn').value=randomSeedText();renderSize();renderLook();$('newWorld').hidden=false;});
$('seedRnd').addEventListener('click',()=>{$('seedIn').value=randomSeedText();});
$('sizeSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;nwSize=b.dataset.s;renderSize();});
$('nwCancel').addEventListener('click',()=>{$('newWorld').hidden=true;});
$('seedIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')$('createBtn').click();});
$('createBtn').addEventListener('click',()=>{if(!booted)return;const txt=$('seedIn').value.trim()||randomSeedText();$('newWorld').hidden=true;$('loading').hidden=false;
  setTimeout(()=>{newWorld(seedFrom(txt),nwSize,txt,nwLook);$('loading').hidden=true;save();const go=()=>{startPlay();toast('Welcome to your new world! Your cabin chest has supplies.','gold');};if(SET.intro)playIntro(()=>{go();say(playerSpeaker(),INTROSAY,{wait:2});});else go();},60);});
$('contBtn').addEventListener('click',()=>{if(!booted)return;const d=loadSave();if(!d){toast('No save found.','bad');return;}try{loadWorld(d);}catch(e){const m=loadFailed(e);newWorld(Math.floor(Math.random()*1e9));toast(m,'bad');return;}startPlay();toast('Welcome back!','good');});
$('resBtn').addEventListener('click',()=>pause(false));
async function packCode(json){const payload=JSON.stringify({v:SAVE_VER,save:JSON.parse(json),meta:META});if(typeof CompressionStream==='undefined')return 'FF0:'+btoa(unescape(encodeURIComponent(payload)));const st=new Blob([payload]).stream().pipeThrough(new CompressionStream('gzip'));return 'FF1:'+b64(new Uint8Array(await new Response(st).arrayBuffer()));}
async function unpackCode(code){code=code.replace(/\s+/g,'');if(code.startsWith('FF0:'))return JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));if(!code.startsWith('FF1:'))throw new Error('That does not look like a Folded Frontier save code.');const u8=Uint8Array.from(atob(code.slice(4)),c=>c.charCodeAt(0));const st=new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(st).text());}
function openCode(fromTitle){$('codeMsg').textContent='';$('codeTxt').value='';$('codeMake').hidden=!!fromTitle;$('codeCopy').hidden=!!fromTitle;$('codeBox').hidden=false;}
$('codeBtn').addEventListener('click',()=>openCode(false));$('code2Btn').addEventListener('click',()=>{initAudio();openCode(true);});
$('codeClose').addEventListener('click',()=>{$('codeBox').hidden=true;});
$('codeTxt').addEventListener('keydown',e=>e.stopPropagation());
$('codeMake').addEventListener('click',async()=>{save();if(!last){$('codeMsg').textContent='Could not read your world.';return;}$('codeMsg').textContent='Packing…';try{const c=await packCode(fullJSON(last.json,last.A));perfCode(c.length);$('codeTxt').value=c;$('codeTxt').select();$('codeMsg').textContent=`Code ready (${Math.round(c.length/1024)} KB of text). Press Copy, or Ctrl+C while it is selected.`;}catch(e){$('codeMsg').textContent='Packing failed: '+e.message;}});
$('codeCopy').addEventListener('click',()=>{const v=$('codeTxt').value;if(!v)return;const ok=()=>{$('codeMsg').textContent='Copied to your clipboard.';};const fb=()=>{$('codeTxt').select();$('codeMsg').textContent='Your browser blocked copying. The code is selected, so press Ctrl+C (or Cmd+C).';};try{navigator.clipboard.writeText(v).then(ok,fb);}catch(e){fb();}});
$('codeLoad').addEventListener('click',async()=>{if(!booted)return;const v=$('codeTxt').value.trim();if(!v){$('codeMsg').textContent='Paste a code first.';return;}try{const d=await unpackCode(v);checkSaveVer(d&&d.v);if(!d.save||!d.save.tiles)throw new Error('That code is missing world data.');checkSaveVer(d.save.v);
  if(d.meta){Object.assign(META.ach,d.meta.ach||{});for(const k in (d.meta.stats||{}))META.stats[k]=Math.max(META.stats[k]||0,d.meta.stats[k]);saveMeta();}
  loadWorld(d.save);$('codeBox').hidden=true;$('pause').hidden=true;if(state!=='play')startPlay();else setState('play');save();toast('World loaded from save code!','gold');}catch(e){$('codeMsg').textContent=e.message||'That code could not be read.';}});
$('saveBtn').addEventListener('click',()=>{save().then(ok=>{if(ok)toast('Game saved.','good');});});
$('quitBtn').addEventListener('click',()=>{save();setState('title');$('pause').hidden=true;$('title').hidden=false;$('contBtn').hidden=!hasSave();setInv(false);});
$('helpBtn').addEventListener('click',()=>{$('howto').hidden=false;});$('helpClose').addEventListener('click',()=>{$('howto').hidden=true;});
// title background: painted art from assets/title.webp; if it fails to load the plain overlay stays
{const im=new Image();im.onload=()=>$('title').classList.add('bg');im.src='assets/title.webp';}
// title letters
$('logo').innerHTML='Folded Frontier'.split(' ').map((w,wi)=>`<span style="display:inline-block;white-space:nowrap">${[...w].map((c,i)=>`<span style="animation-delay:${(wi*7+i)*45}ms">${c}</span>`).join('')}</span>`).join(' ');
