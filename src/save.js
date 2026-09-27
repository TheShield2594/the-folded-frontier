// Saving and loading, save migration, new/load world, pause and title flow, save codes.
import {
  $,addItem,angler,applyVolumes,bestiary,BIO,bob,buildBackdrop,camT,chests,chunks,clearHouses,CS,dirty,
  enemies,explored,generate,H,hook,houses,initAudio,inkMoon,liqChunks,makeNPC,mapBase,mapOpen,mapS,mbx,
  META,meta,mk,N,nightsSeen,npcs,parts,pickups,player,projs,quests,rebuildAll,registerHouseAt,
  removeEnemy,renderQuests,saveMeta,scene,seed,seedText,setAngler,setBestiary,setBIO,setBlk,setBoss,
  setChests,setCHH,setChunks,setCurBio,setCW,setEnemies,setExplored,setH,setHeartsKey,setHintT,
  setInkMoon,setInv,setInvDirty,setLiqChunks,setMapBase,setMapOpen,setMapS,setMbImg,setMbx,setMeta,setN,
  setNightsSeen,setNpcs,setPickups,setProjs,setQuests,setSeed,setSeedText,setSky,setSoundOn,setSPAWNX,
  setStamp,setState,setSurf,setSurfAvg,setTiles,setVisited,setW,setWalls,setWeather,setWeatherT,setWind,
  setWorldSize,setWorldTime,SIZES,soundOn,state,surf,syncPartners,tiles,toast,updateCoins,visited,W,
  walls,weather,weatherT,wind,worldSize,worldTime,
  newTut,playIntro,SET,setTut,tut,
} from './game.js';

// ================= save/load =================
const SAVE_KEY='folded-frontier-save-v1';
function b64(u8){let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s);}
function unb64(s,u8){const b=atob(s);for(let i=0;i<b.length;i++)u8[i]=b.charCodeAt(i);}
let lastSaveJSON='';
export function save(){try{const data={v:SAVE_VER,seed,tiles:b64(tiles),walls:b64(walls),meta:b64(meta),surf:Array.from(surf),chests:Array.from(chests.entries()),
  p:{x:player.x,y:player.y,hp:player.hp,max:player.max,mana:player.mana,maxMana:player.maxMana,buffs:player.buffs,world:{weather,weatherT,wind,inkMoon,nightsSeen},partners:player.partners,partner:player.partner,badges:player.badges,badgesOn:player.badgesOn,bpUps:player.bpUps,inv:player.inv,armor:player.armor,acc:player.acc,coins:player.coins,spawn:player.spawn,sel:player.sel},time:worldTime,quests,npcs:npcs.map(n=>({type:n.type,x:n.x,y:n.y,home:n.home}))};
  data.explored=b64(explored);data.w=W;data.h=H;data.size=worldSize;data.seedText=seedText;data.bio=BIO;data.visited=[...visited];data.houses=houses.map(h=>[h.sx,h.sy]);data.bestiary=bestiary;data.angler=angler;data.tut=tut;lastSaveJSON=JSON.stringify(data);localStorage.setItem(SAVE_KEY,lastSaveJSON);saveMeta();return true;}catch(e){return false;}}
// save format history: v1 original; v2 adds the per-world bestiary. Older saves are upgraded on load.
const SAVE_VER=2;
function migrateSave(d){d.v=d.v||1;
  if(d.v<2){d.bestiary={};d.v=2;}
  return d;}
export function loadSave(){try{const s=localStorage.getItem(SAVE_KEY);return s?JSON.parse(s):null;}catch(e){return null;}}
function hasSave(){try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;}}

// ================= lifecycle =================
function allocWorld(w,h){setW(w);setH(h);setN(W*H);setSPAWNX(Math.floor(W/2));setTiles(new Uint8Array(N));setWalls(new Uint8Array(N));setMeta(new Uint8Array(N));setStamp(new Uint32Array(N));setSky(new Uint8Array(N));setBlk(new Uint8Array(N));setExplored(new Uint8Array(N));setSurf(new Int16Array(W));
  chunks.concat(liqChunks).forEach(m=>{if(m){scene.remove(m);m.geometry.dispose();}});setChunks([]);setLiqChunks([]);setCW(Math.ceil(W/CS));setCHH(Math.ceil(H/CS));dirty.clear();
  setMapBase(mk(W,H));setMbx(mapBase.getContext('2d'));setMbImg(mbx.createImageData(W,H));setMapS(W<=420?3:2);$('mapC').width=W*mapS;$('mapC').height=H*mapS;hook.state=0;}
function seedFrom(txt){txt=(txt||'').trim();if(/^\d{1,9}$/.test(txt))return +txt;let h=2166136261;for(const c of txt){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function clearEntities(){enemies.forEach(removeEnemy);setEnemies([]);pickups.forEach(k=>scene.remove(k.mesh));setPickups([]);projs.forEach(q=>scene.remove(q.m));setProjs([]);npcs.forEach(n=>{scene.remove(n.mesh);if(n.bub)n.bub.remove();});setNpcs([]);setBoss(null);$('boss').hidden=true;parts.length=0;player.st={};player.draw=null;player.blocking=false;bob.state=0;}
export function newWorld(sd,size='s',txt){clearHouses();setVisited(new Set());const S=SIZES[size]||SIZES.s;clearEntities();allocWorld(S.w,S.h);setWorldSize(size);setSeedText(txt||String(sd));setCurBio('');const g=generate(sd);const p=player;p.x=g.spawn.x;p.y=g.spawn.y;p.spawn={x:g.spawn.x,y:g.spawn.y};p.hp=p.max=100;p.mana=p.maxMana=20;p.coins=0;p.buffs={};setWeather('clear');setWeatherT(150);setWind(0);setInkMoon(false);setNightsSeen(0);p.partners=[];p.partner=null;p.badges=[];p.badgesOn=[];p.bpUps=0;p.inv=new Array(40).fill(null);p.armor=[null,null,null];p.acc=[null,null,null];p.sel=0;
  [['copperpick',1],['coppersword',1],['hammer',1],['torch',12],['potion',2],['wood',20]].forEach(([id,n])=>addItem(id,n));setWorldTime(7.5);setQuests({});setBestiary({});setAngler({caught:0,done:0,day:0,q:null,qday:-1,seen:{}});setTut(newTut());p.sheetDirty=true;explored.fill(0);
  rebuildAll();buildBackdrop();camT.x=p.x;camT.y=p.y;registerHouseAt(g.bed.x,g.bed.y);}
export function loadWorld(d){d=migrateSave(d);setTut(d.tut&&typeof d.tut==='object'?Object.assign({s:99,seen:{}},d.tut):{s:99,seen:{peel:1,pop:1,flat:1}});setBestiary(d.bestiary&&typeof d.bestiary==='object'?d.bestiary:{});setAngler(Object.assign({caught:0,done:0,day:0,q:null,qday:-1,seen:{}},d.angler||{}));if(d.p&&d.p.world){const w=Object.assign({weather:'clear',weatherT:150,wind:0,inkMoon:false,nightsSeen:0},d.p.world);setWeather(w.weather);setWeatherT(w.weatherT);setWind(w.wind);setInkMoon(w.inkMoon);setNightsSeen(w.nightsSeen);;}clearEntities();allocWorld(d.w||420,d.h||170);setWorldSize(d.size||'s');setSeedText(d.seedText||String(d.seed));setBIO(d.bio||{uw:0});setCurBio('');clearHouses();setVisited(new Set(d.visited||[]));setSeed(d.seed);unb64(d.tiles,tiles);unb64(d.walls,walls);unb64(d.meta,meta);setSurf(Int16Array.from(d.surf));let s=0;for(const v of surf)s+=v;setSurfAvg(s/W);setChests(new Map(d.chests));
  const p=player,q=d.p;Object.assign(p,{x:q.x,y:q.y,hp:q.hp,max:q.max,maxMana:q.maxMana||20,mana:q.mana??20,buffs:q.buffs||{},partners:q.partners||[],partner:q.partner||null,badges:q.badges||[],badgesOn:q.badgesOn||[],bpUps:q.bpUps||0,inv:q.inv,armor:q.armor,acc:q.acc,coins:q.coins,spawn:q.spawn,sel:q.sel||0});setWorldTime(d.time);setQuests(d.quests||{});if(d.explored)unb64(d.explored,explored);else explored.fill(1);p.sheetDirty=true;
  rebuildAll();buildBackdrop();if(d.houses)setTimeout(()=>d.houses.forEach(([x,y])=>registerHouseAt(x,y)),0);if(d.npcs)d.npcs.forEach(n=>makeNPC(n.type,n.x,n.y,n.home));else if(d.npc)makeNPC('merchant',d.npc.x,d.npc.y,d.npc.home);camT.x=p.x;camT.y=p.y;}
function startPlay(){syncPartners(true);setState('play');setMapOpen(false);$('map').hidden=true;$('title').hidden=true;player.dead=false;player.mesh.visible=true;$('dead').hidden=true;setInvDirty(true);setHeartsKey('');renderQuests();updateCoins();setHintT(0);$('help').style.opacity=1;initAudio();}
export function pause(on){if(on){$('seedTxt').textContent=`Seed ${seedText} · ${(SIZES[worldSize]||SIZES.s).name} world`;if(mapOpen){setMapOpen(false);$('map').hidden=true;}setState('paused');$('pause').hidden=false;save();toast('Game saved.','good');}else{setState('play');$('pause').hidden=true;}}
let nwSize='m';
function renderSize(){[...$('sizeSeg').children].forEach(b=>b.classList.toggle('on',b.dataset.s===nwSize));$('sizeNote').textContent=SIZES[nwSize].note;}
const randomSeedText=()=>String(Math.floor(Math.random()*1e9));
$('newBtn').addEventListener('click',()=>{initAudio();$('seedIn').value=randomSeedText();renderSize();$('newWorld').hidden=false;});
$('seedRnd').addEventListener('click',()=>{$('seedIn').value=randomSeedText();});
$('sizeSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;nwSize=b.dataset.s;renderSize();});
$('nwCancel').addEventListener('click',()=>{$('newWorld').hidden=true;});
$('seedIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')$('createBtn').click();});
$('createBtn').addEventListener('click',()=>{const txt=$('seedIn').value.trim()||randomSeedText();$('newWorld').hidden=true;$('loading').hidden=false;
  setTimeout(()=>{newWorld(seedFrom(txt),nwSize,txt);$('loading').hidden=true;save();const go=()=>{startPlay();toast('Welcome to your new world! Your cabin chest has supplies.','gold');};if(SET.intro)playIntro(go);else go();},60);});
$('contBtn').addEventListener('click',()=>{const d=loadSave();if(!d){toast('No save found.','bad');return;}loadWorld(d);startPlay();toast('Welcome back!','good');});
$('resBtn').addEventListener('click',()=>pause(false));
async function packCode(json){const payload=JSON.stringify({save:JSON.parse(json),meta:META});if(typeof CompressionStream==='undefined')return 'FF0:'+btoa(unescape(encodeURIComponent(payload)));const st=new Blob([payload]).stream().pipeThrough(new CompressionStream('gzip'));return 'FF1:'+b64(new Uint8Array(await new Response(st).arrayBuffer()));}
async function unpackCode(code){code=code.replace(/\s+/g,'');if(code.startsWith('FF0:'))return JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));if(!code.startsWith('FF1:'))throw new Error('That does not look like a Folded Frontier save code.');const u8=Uint8Array.from(atob(code.slice(4)),c=>c.charCodeAt(0));const st=new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(st).text());}
function openCode(fromTitle){$('codeMsg').textContent='';$('codeTxt').value='';$('codeMake').hidden=!!fromTitle;$('codeCopy').hidden=!!fromTitle;$('codeBox').hidden=false;}
$('codeBtn').addEventListener('click',()=>openCode(false));$('code2Btn').addEventListener('click',()=>{initAudio();openCode(true);});
$('codeClose').addEventListener('click',()=>{$('codeBox').hidden=true;});
$('codeTxt').addEventListener('keydown',e=>e.stopPropagation());
$('codeMake').addEventListener('click',async()=>{if(!save()&&!lastSaveJSON){$('codeMsg').textContent='Could not read your world.';return;}$('codeMsg').textContent='Packing…';try{const c=await packCode(lastSaveJSON);$('codeTxt').value=c;$('codeTxt').select();$('codeMsg').textContent=`Code ready (${Math.round(c.length/1024)} KB of text). Press Copy, or Ctrl+C while it is selected.`;}catch(e){$('codeMsg').textContent='Packing failed: '+e.message;}});
$('codeCopy').addEventListener('click',()=>{const v=$('codeTxt').value;if(!v)return;const ok=()=>{$('codeMsg').textContent='Copied to your clipboard.';};const fb=()=>{$('codeTxt').select();$('codeMsg').textContent='Your browser blocked copying. The code is selected, so press Ctrl+C (or Cmd+C).';};try{navigator.clipboard.writeText(v).then(ok,fb);}catch(e){fb();}});
$('codeLoad').addEventListener('click',async()=>{const v=$('codeTxt').value.trim();if(!v){$('codeMsg').textContent='Paste a code first.';return;}try{const d=await unpackCode(v);if(!d.save||!d.save.tiles)throw new Error('That code is missing world data.');
  if(d.meta){Object.assign(META.ach,d.meta.ach||{});for(const k in (d.meta.stats||{}))META.stats[k]=Math.max(META.stats[k]||0,d.meta.stats[k]);saveMeta();}
  loadWorld(d.save);$('codeBox').hidden=true;$('pause').hidden=true;if(state!=='play')startPlay();else setState('play');save();toast('World loaded from save code!','gold');}catch(e){$('codeMsg').textContent=e.message||'That code could not be read.';}});
$('saveBtn').addEventListener('click',()=>{toast(save()?'Game saved.':'Saving is not available in this browser.',save()?'good':'bad');});
$('quitBtn').addEventListener('click',()=>{save();setState('title');$('pause').hidden=true;$('title').hidden=false;$('contBtn').hidden=!hasSave();setInv(false);});
function toggleSound(){setSoundOn(!soundOn);applyVolumes();$('sndBtn').textContent=$('snd2Btn').textContent='Sound: '+(soundOn?'On':'Off');}
$('sndBtn').addEventListener('click',()=>{initAudio();toggleSound();});$('snd2Btn').addEventListener('click',()=>{initAudio();toggleSound();});
// title background: painted art from assets/title.webp; if it fails to load the plain overlay stays
{const im=new Image();im.onload=()=>$('title').classList.add('bg');im.src='assets/title.webp';}
// title letters
$('logo').innerHTML='Folded Frontier'.split(' ').map((w,wi)=>`<span style="display:inline-block;white-space:nowrap">${[...w].map((c,i)=>`<span style="animation-delay:${(wi*7+i)*45}ms">${c}</span>`).join('')}</span>`).join(' ');
