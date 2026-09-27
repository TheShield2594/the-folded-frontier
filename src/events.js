// World events beyond the Ink Moon: the Paper Storm, the Traveling Merchant and the Paper Army.
// Each rolls at dawn or dusk, is announced with a card, a toast and the event bar, and pays out rewards.
// `wev` is saved with the world.
import {
  $,addItem,burst,camera,chapterCard,clamp,dropItem,enemies,fcount,groundY,H,hasNPC,idx,inkMoon,isSolid,
  ITEMS,makeElite,makeNPC,npcs,pick,player,quests,rand,randi,scene,setWeather,setWeatherT,setWind,SFX,
  shake,spawnEnemy,SPAWNX,stat,surf,toast,townSpots,W,walls,weather,worldDay,
} from './game.js';

// ================= events =================
// k: the big event running ('storm' or 'army', or null); pend/at: a storm due to start at hour `at` today;
// t/dur: seconds of storm left and in total; n/goal: Paper Army soldiers defeated and needed;
// cd: dawns before another big event may start; trav: the Traveling Merchant's visit {x, y, stock} or null.
export const newWev=()=>({k:null,pend:null,at:0,t:0,dur:1,dir:1,n:0,goal:0,cd:2,trav:null});
export let wev=newWev();
export const EVENTS={storm:['Paper Storm','Parcels are falling from the sky. Grab them before the wind does!'],army:['The Paper Army','Folded soldiers are marching on the town. Hold the line until dawn!']};
// [id, min, max, weight]
const STORM_LOOT=[['paper',3,8,30],['coin',8,25,20],['seed_sun',2,4,8],['seed_wheat',2,4,8],['rope',5,12,8],['fstar',1,1,6],['potion',1,2,6],['plume',1,1,3],['paint1',1,1,2],['paint2',1,1,2],['paint3',1,1,2],['paint4',1,1,2],['tmap',1,1,1]];
const ARMY_LOOT=['b_money','b_close','b_spike','b_flowerf','bpup','potiron','potregen','goldbar'];
const TRAVEL=[['b_money',450],['b_close',320],['b_spike',260],['b_flowerf',280],['bpup',520],['moonlure',15],['fcrate',90],['paint5',140],['potnight',45],['potfire',70],['magnet',220],['seed_ember',14],['seed_ink',12],['seed_frost',10],['moonink',40],['seed_moon',30],['seed_thunder',25],['seed_sunf',20],['spore_ghost',20]];
function wpick(list){let s=0;for(const r of list)s+=r[3];let v=Math.random()*s;for(const r of list){v-=r[3];if(v<=0)return r;}return list[0];}
const give=(id,n)=>{const l=addItem(id,n);if(l)dropItem(id,l,player.x,player.y+1);};
const onSurface=()=>player.y>surf[clamp(Math.floor(player.x),0,W-1)]-12;
function announce(k){const[n,sub]=EVENTS[k];chapterCard(null,n,sub,'A world event');toast(`${n}! ${sub}`,k==='army'?'bad':'gold');}
function groundAt(x){let y=H-8;while(y>4&&!isSolid(x,y))y--;return y+1;}
function spawnNear(type,side){const x=clamp(Math.floor(player.x+side*rand(22,32)),3,W-4),y=groundAt(x);if(Math.abs(y-player.y)>30||walls[idx(x,y)]>=2||isSolid(x,y)||isSolid(x,y+1))return null;return spawnEnemy(type,x+.5,y);}
// rolled at each dawn: the army retreats, a storm may be on its way, the Traveling Merchant may visit
export function evDawn(){if(wev.k==='army')endArmy(false);if(wev.cd>0)wev.cd--;if(wev.trav)travLeave();
  if(!wev.trav&&hasNPC('merchant')&&worldDay>=2&&Math.random()<.3)travArrive();
  if(!wev.k&&!wev.pend&&wev.cd<=0&&worldDay>=2&&Math.random()<.18){wev.pend='storm';wev.at=rand(8,14);setTimeout(()=>toast('The wind smells of paper today. A storm may be coming…'),wev.trav?4200:1200);}}
// rolled at each dusk: the Traveling Merchant leaves, and once the King Slime is beaten the Paper Army may march
export function evDusk(){wev.pend=null;if(wev.trav)travLeave();if(!wev.k&&!inkMoon&&quests.king&&wev.cd<=0&&Math.random()<.16)startArmy();}
let parcelT=2,foeT=4;
export function updateEvents(dt,hour){if(wev.pend==='storm'&&!wev.k&&hour>=wev.at&&hour<19)startStorm();
  if(wev.k==='storm')updateStorm(dt);else if(wev.k==='army')updateArmy(dt);updateBar();}

// --- paper storm: a long gale full of paper scraps; parcels of loot fall near the player on the surface
function startStorm(){Object.assign(wev,{pend:null,k:'storm',dur:rand(140,190),dir:Math.random()<.5?-1:1,cd:3});wev.t=wev.dur;setWeather('wind');setWind(wev.dir*1.8);setWeatherT(wev.t+5);announce('storm');SFX.rustle(.8);shake(.15);}
function updateStorm(dt){wev.t-=dt;setWind(wev.dir*(1.6+Math.sin(performance.now()/900)*.4));if(weather!=='wind')setWeather('wind');setWeatherT(Math.max(5,wev.t+5));
  const cam=camera.position,up=onSurface();if(up&&Math.random()<dt*22)burst(cam.x-wev.dir*26,cam.y+rand(-8,12),['#fbf8f0','#f4f0e6','#e9dcc0','#dfe6ea'],1,.6,{grav:.3,life:4,up:0,bright:1,s:1.6});
  parcelT-=dt;if(up&&parcelT<=0){parcelT=rand(3,6);const x=clamp(player.x+rand(-14,14),3,W-4),y=Math.min(H-4,Math.max(player.y+12,surf[Math.floor(x)]+8)),r=wpick(STORM_LOOT);dropItem(r[0],randi(r[1],r[2]),x,y,wev.dir*3,-1);burst(x,y,['#fbf8f0','#e9dcc0'],6,2,{bright:1});}
  foeT-=dt;if(up&&foeT<=0){foeT=rand(7,11);if(enemies.filter(e=>e.type==='crumple'&&!e.dying).length<4)spawnNear('crumple',-wev.dir);}
  if(wev.t<=0){wev.k=null;setWeather('clear');setWind(0);setWeatherT(rand(120,240));toast('The paper storm blows over. What a mess!','gold');stat('storms');fcount('storm');}}

// --- the Paper Army: folded soldiers march in from both sides until enough fall or the sun rises
const bossesBeaten=()=>['king','crane','lev','folio'].filter(k=>quests[k]).length;
function startArmy(){Object.assign(wev,{k:'army',n:0,goal:20+5*bossesBeaten(),cd:3});announce('army');SFX.boom();shake(.3);foeT=3;}
function updateArmy(dt){foeT-=dt;if(foeT>0||player.dead||!onSurface())return;foeT=rand(1.1,1.9);if(enemies.filter(e=>e.army&&!e.dying).length>=6+bossesBeaten())return;
  const pool=['crumple','crumple','zombie','toadstool'];if(quests.crane)pool.push('knight','foldfox');if(quests.lev)pool.push('knight','blot');
  const e=spawnNear(pick(pool),Math.random()<.5?-1:1);if(!e)return;e.army=true;if(Math.random()<.12)makeElite(e);}
// called when any enemy is defeated
export function evKill(e){if(!e.army||wev.k!=='army')return;wev.n++;if(wev.n>=wev.goal)endArmy(true);}
function endArmy(won){wev.k=null;for(const e of enemies)if(e.army&&!e.dying){e.dying=.3;burst(e.x,e.y+e.h/2,['#fbf8f0','#e9dcc0'],10,4);}
  if(!won){toast('Dawn breaks and the Paper Army folds up and retreats.');return;}
  chapterCard(null,'Victory!','The Paper Army folds and flees. The town is safe.','A world event');SFX.nice();give('coin',wev.goal*10);give(pick(ARMY_LOOT),1);give(pick(ARMY_LOOT),1);give('banr',1);
  setTimeout(()=>toast(`You held the line! The town rewards you with ${wev.goal*10} coins and spoils of war.`,'gold'),800);stat('armies');fcount('army');}

// --- the Traveling Merchant: sets up on the town green for one day with rare stock
function travArrive(){let x=-1,y=-1;for(const c of townSpots()){if(Math.abs(c-SPAWNX)<4)continue;const g=groundY(c);if(g>=0){x=c;y=g;break;}}if(x<0){x=SPAWNX;y=surf[x]+1;}
  const pool=TRAVEL.slice(),stock=[];while(stock.length<5)stock.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  wev.trav={x:x+.5,y,stock};placeTrav();setTimeout(()=>toast('A Traveling Merchant has set up in town with rare goods! They leave at dusk.','gold'),1200);fcount('trav');}
function placeTrav(){const t=wev.trav;const n=npcs.find(n=>n.type==='traveler')||makeNPC('traveler',t.x,t.y+.1,null);n.roam={minX:Math.floor(t.x)-4,maxX:Math.floor(t.x)+4,y:t.y};}
function travLeave(){const n=npcs.find(n=>n.type==='traveler');if(n){scene.remove(n.mesh);if(n.bub)n.bub.remove();npcs.splice(npcs.indexOf(n),1);burst(n.x,n.y+1,['#b0503a','#f1c04f','#fbf8f0'],14,3);}wev.trav=null;toast('The Traveling Merchant packed up and left town.');}
// after loading a world: drop anything this build doesn't know, and put the Traveling Merchant back
export function restoreEvents(){if(wev.k&&!EVENTS[wev.k])wev.k=null;if(wev.trav){wev.trav.stock=(wev.trav.stock||[]).filter(r=>Array.isArray(r)&&ITEMS[r[0]]);placeTrav();}
  else{const n=npcs.find(n=>n.type==='traveler');if(n){scene.remove(n.mesh);npcs.splice(npcs.indexOf(n),1);}}}

// the event bar under the boss bar
function updateBar(){const el=$('evbar');let name=null,f=-1;
  if(wev.k==='storm'){name='Paper Storm';f=wev.t/wev.dur;}else if(wev.k==='army'){name=`The Paper Army · ${wev.n} / ${wev.goal}${onSurface()?'':' · return to the surface'}`;f=1-wev.n/wev.goal;}else if(wev.trav)name='Traveling Merchant in town · leaves at dusk';
  el.hidden=!name;if(!name)return;if(el.dataset.k!==name){el.dataset.k=name;el.querySelector('.en').textContent=name;el.className=wev.k||'trav';}el.querySelector('.eb').hidden=f<0;if(f>=0)el.querySelector('.eb i').style.width=clamp(f*100,0,100)+'%';}
// Imported bindings are read-only, so other modules assign these through setters.
export function setWev(v){return wev=v;}
