// World events beyond the Ink Moon: the Paper Storm, the Traveling Merchant, the Paper Army, the Meteor Shower,
// the Eclipse and the Monster Migration.
// Each rolls at dawn or dusk, is announced with a card, a toast and the event bar, and pays out rewards.
// `wev` is saved with the world.
import {
  $,addItem,burst,camera,chapterCard,clamp,dropItem,enemies,fcount,groundY,H,hasNPC,idx,inkMoon,isSolid,
  ITEMS,makeElite,makeNPC,npcs,pick,player,quests,rand,randi,scene,setWeather,setWeatherT,setWind,SFX,
  shake,spawnEnemy,SPAWNX,stat,surf,toast,townSpots,W,walls,weather,worldDay,
  BIO,BIONAME,biomeAt,emit,hurtPlayer,isAwake,setTile,T,tileAt,
} from './game.js';

// ================= events =================
// k: the big event running ('storm', 'army', 'meteor' or 'eclipse', or null); pend/at: a storm or eclipse due at hour `at` today;
// t/dur: seconds of storm, shower or eclipse left and in total; n/goal: foes defeated and needed (army, eclipse), craters (meteor);
// cd: dawns before another big event may start; trav: the Traveling Merchant's visit {x, y, stock} or null;
// mig: a Monster Migration {from, to, days left, n, goal} or null (runs for days beside the other events).
export const newWev=()=>({k:null,pend:null,at:0,t:0,dur:1,dir:1,n:0,goal:0,cd:2,trav:null,mig:null});
export let wev=newWev();
export const EVENTS={storm:['Paper Storm','Parcels are falling from the sky. Grab them before the wind does!'],army:['The Paper Army','Folded soldiers are marching on the town. Hold the line until dawn!'],
  meteor:['Meteor Shower','Stars are falling tonight! Where they land, rare ore waits in the craters.'],eclipse:['Eclipse','The sun folds shut at midday, and the things that hate the light wake up. Survive until it opens.'],
  mig:['Monster Migration','A herd is on the move.']};
// [id, min, max, weight]
const STORM_LOOT=[['paper',3,8,30],['coin',8,25,20],['seed_sun',2,4,8],['seed_wheat',2,4,8],['rope',5,12,8],['fstar',1,1,6],['potion',1,2,6],['plume',1,1,3],['paint1',1,1,2],['paint2',1,1,2],['paint3',1,1,2],['paint4',1,1,2],['tmap',1,1,1]];
const ARMY_LOOT=['b_money','b_close','b_spike','b_flowerf','bpup','potiron','potregen','goldbar'];
const TRAVEL=[['b_money',450],['b_close',320],['b_spike',260],['b_flowerf',280],['bpup',520],['moonlure',15],['fcrate',90],['paint5',140],['potnight',45],['potfire',70],['magnet',220],['seed_ember',14],['seed_ink',12],['seed_frost',10],['moonink',40],['seed_moon',30],['seed_thunder',25],['seed_sunf',20],['spore_ghost',20]];
function wpick(list){let s=0;for(const r of list)s+=r[3];let v=Math.random()*s;for(const r of list){v-=r[3];if(v<=0)return r;}return list[0];}
const give=(id,n)=>{const l=addItem(id,n);if(l)dropItem(id,l,player.x,player.y+1);};
const onSurface=()=>player.y>surf[clamp(Math.floor(player.x),0,W-1)]-12;
function announce(k,s2){const[n,s1]=EVENTS[k],sub=s2||s1;chapterCard(null,n,sub,'A world event');toast(`${n}! ${sub}`,k==='army'||k==='eclipse'?'bad':'gold');}
function groundAt(x){let y=Math.min(H-8,surf[x]+24);while(y>4&&!isSolid(x,y))y--;return y+1;}
function spawnNear(type,side){const x=clamp(Math.floor(player.x+side*rand(22,32)),3,W-4),y=groundAt(x);if(Math.abs(y-player.y)>30||walls[idx(x,y)]>=2||isSolid(x,y)||isSolid(x,y+1))return null;return spawnEnemy(type,x+.5,y);}
// rolled at each dawn: the army retreats, the meteors stop, a migration moves on or goes home, a storm or (after two bosses)
// an eclipse may be on its way, a migration may start, the Traveling Merchant may visit
export function evDawn(){if(wev.k==='army')endArmy(false);if(wev.k==='meteor')endMeteor();if(wev.cd>0)wev.cd--;if(wev.trav)travLeave();
  if(wev.mig&&--wev.mig.days<=0)endMig(false);
  if(!wev.trav&&hasNPC('merchant')&&worldDay>=2&&Math.random()<.3)travArrive();
  if(wev.k||wev.pend||wev.cd>0||worldDay<2)return;const r=Math.random(),later=wev.trav?4200:1200;
  if(r<.18){wev.pend='storm';wev.at=rand(8,14);setTimeout(()=>toast('The wind smells of paper today. A storm may be coming…'),later);}
  else if(r<.23&&bossesBeaten()>=2){wev.pend='eclipse';wev.at=rand(10.5,14);setTimeout(()=>toast('The birds have gone quiet this morning. Something is wrong with the sun…','bad'),later);}
  else if(r<.33&&!wev.mig&&quests.king&&worldDay>=4){const w0=wev;setTimeout(()=>{if(wev===w0)startMig();},later+1500);}}
// rolled at each dusk: the Traveling Merchant leaves; once the King Slime is beaten the Paper Army may march, or stars may fall
export function evDusk(){if(wev.pend==='storm')wev.pend=null;if(wev.trav)travLeave();if(wev.k==='eclipse')endEclipse();if(wev.k||inkMoon||wev.cd>0)return;const r=Math.random();
  if(quests.king&&r<.16)startArmy();else if(r<.28&&worldDay>=3)startMeteor();}
let parcelT=2,foeT=4;
export function updateEvents(dt,hour){if(wev.pend==='storm'&&!wev.k&&hour>=wev.at&&hour<19)startStorm();
  if(wev.pend==='eclipse'&&!wev.k&&hour>=wev.at&&hour<16)startEclipse();else if(wev.pend==='eclipse'&&hour>=16)wev.pend=null;
  if(wev.k==='storm')updateStorm(dt);else if(wev.k==='army')updateArmy(dt);else if(wev.k==='meteor')updateMeteor(dt);else if(wev.k==='eclipse')updateEclipse(dt);
  setEclF(eclF+((wev.k==='eclipse'?clamp(Math.min(wev.dur-wev.t,wev.t)/6,0,1):0)-eclF)*Math.min(1,dt*1.5));
  if(wev.mig)updateMig(dt);updateBar();}

// --- paper storm: a long gale full of paper scraps; parcels of loot fall near the player on the surface
function startStorm(){Object.assign(wev,{pend:null,k:'storm',dur:rand(140,190),dir:Math.random()<.5?-1:1,cd:3});wev.t=wev.dur;setWeather('wind');setWind(wev.dir*1.8);setWeatherT(wev.t+5);announce('storm');SFX.rustle(.8);shake(.15);}
function updateStorm(dt){wev.t-=dt;setWind(wev.dir*(1.6+Math.sin(performance.now()/900)*.4));if(weather!=='wind')setWeather('wind');setWeatherT(Math.max(5,wev.t+5));
  const cam=camera.position,up=onSurface();if(up&&Math.random()<dt*22)burst(cam.x-wev.dir*26,cam.y+rand(-8,12),['#fbf8f0','#f4f0e6','#e9dcc0','#dfe6ea'],1,.6,{grav:.3,life:4,up:0,bright:1,s:1.6});
  parcelT-=dt;if(up&&parcelT<=0){parcelT=rand(3,6);const x=clamp(player.x+rand(-14,14),3,W-4),y=Math.min(H-4,Math.max(player.y+12,surf[Math.floor(x)]+8)),r=wpick(STORM_LOOT);dropItem(r[0],randi(r[1],r[2]),x,y,wev.dir*3,-1);burst(x,y,['#fbf8f0','#e9dcc0'],6,2,{bright:1});}
  foeT-=dt;if(up&&foeT<=0){foeT=rand(7,11);if(enemies.filter(e=>e.type==='crumple'&&!e.dying).length<4)spawnNear('crumple',-wev.dir);}
  if(wev.t<=0){wev.k=null;setWeather('clear');setWind(0);setWeatherT(rand(120,240));toast('The paper storm blows over. What a mess!','gold');stat('storms');fcount('storm');}}

// --- the Paper Army: folded soldiers march in from both sides until enough fall or the sun rises
const bossesBeaten=()=>['king','crane','lev','folio'].filter(k=>quests[k]).length;
export function startArmy(){Object.assign(wev,{k:'army',n:0,goal:20+5*bossesBeaten(),cd:3});announce('army');SFX.boom();shake(.3);foeT=3;}
function updateArmy(dt){foeT-=dt;if(foeT>0||player.dead||!onSurface())return;foeT=rand(1.1,1.9);if(enemies.filter(e=>e.army&&!e.dying).length>=6+bossesBeaten())return;
  const pool=['crumple','crumple','zombie','toadstool'];if(quests.crane)pool.push('knight','foldfox');if(quests.lev)pool.push('knight','blot');
  const e=spawnNear(pick(pool),Math.random()<.5?-1:1);if(!e)return;e.army=true;if(Math.random()<.12)makeElite(e);}
// called when any enemy is defeated
export function evKill(e){if(e.army&&wev.k==='army'){wev.n++;if(wev.n>=wev.goal)endArmy(true);}
  if(e.ecl&&wev.k==='eclipse'&&wev.n<wev.goal){wev.n++;if(wev.n>=wev.goal){toast('The eclipse foes are thinning out. Hold on until the sun opens!','gold');SFX.nice();}}
  if(e.mig&&wev.mig){wev.mig.n++;if(wev.mig.n>=wev.mig.goal)endMig(true);}}

// --- meteor shower: a night of falling stars; now and then one lands near the player on the surface, leaving a crater lined
// with ore from a tier the player has reached (and a Fallen Star). Craters stay away from town, the lake and placed walls.
const NATG=new Set([T.GRASS,T.DIRT,T.STONE,T.SAND,T.SNOW,T.ASH,T.ICE]),PLANT=new Set([T.TUFT,T.FLOWER,T.FLOWER2,T.BLOOM,T.MUSH]);
let rocks=[],meteorT=6,streakT=0;
function startMeteor(){Object.assign(wev,{k:'meteor',dur:rand(150,200),n:0,cd:3});wev.t=wev.dur;rocks=[];meteorT=rand(5,9);announce('meteor');SFX.nice();}
function oreTier(){const o=[T.GOLD];if(quests.king)o.push(T.FROST);if(quests.crane)o.push(T.INKORE);if(quests.lev)o.push(T.EMBERORE);if(isAwake())o.push(T.FOIL);return o.slice(-2);}
function craterSpot(){for(let a=0;a<12;a++){const x=Math.floor(player.x+(Math.random()<.5?-1:1)*rand(7,26));if(x<6||x>W-7||Math.abs(x-SPAWNX)<22)continue;
  if(BIO&&BIO.lake&&Math.abs(x-BIO.lake[0])<BIO.lake[1]+8)continue;const g=groundAt(x)-1;if(!NATG.has(tileAt(x,g))||walls[idx(x,g)]>=2||Math.abs(g-player.y)>20)continue;return[x,g];}return null;}
function updateMeteor(dt){wev.t-=dt;const cam=camera.position,up=onSurface();
  streakT-=dt;if(up&&streakT<=0){streakT=rand(.3,1.1);const x=cam.x+rand(-30,30),y=cam.y+rand(10,16);for(let q=0;q<8;q++)burst(x-q*.7,y+q*.4,['#fff3c0','#ffd66b','#fbf8f0'],1,.15,{grav:0,life:.7-q*.06,up:0,bright:1,glow:1,s:1.2-q*.1});}
  meteorT-=dt;if(up&&meteorT<=0){meteorT=rand(14,22);const c=craterSpot();if(c){const side=Math.random()<.5?-1:1;rocks.push({x:c[0]+.5-side*14,y:c[1]+24,tx:c[0]+.5,ty:c[1]+1,t:0,T:1.6});SFX.rustle(.5,.6);}}
  for(let i=rocks.length-1;i>=0;i--){const r=rocks[i];r.t+=dt;const f=Math.min(1,r.t/r.T),x=r.x+(r.tx-r.x)*f,y=r.y+(r.ty-r.y)*f*f;
    emit('embers',x,y,{n:3,cols:['#ffd66b','#ff8a3d','#fbf8f0'],spd:1.5,life:.6,glow:1,bright:1});if(Math.random()<dt*14)burst(r.tx+rand(-1.5,1.5),r.ty+.1,['#ffd66b','#fbf8f0'],1,.5,{grav:0,life:.3,bright:1});
    if(f>=1){rocks.splice(i,1);meteorStrike(Math.floor(r.tx),r.ty-1);}}
  if(wev.t<=0)endMeteor();}
// a meteor landing on the ground tile (x, g); exported so the smoke test can drop one
export function meteorStrike(x,g){burst(x+.5,g+1,['#ff8a3d','#ffd66b','#d4483b','#fbf8f0','#6a5a50'],50,10,{bright:1});SFX.boom();shake(.55);
  if(!player.dead&&Math.hypot(player.x-x-.5,player.y-g-1)<3.2)hurtPlayer(20,x+.5,null,'fire');
  const ore=oreTier();let placed=0;
  const tree=tx=>[1,2,3,4].some(k=>tileAt(tx,g+k)===T.TRUNK);
  for(let dx=-3;dx<=3;dx++)for(let dy=-2;dy<=2;dy++){const tx=x+dx,ty=g+dy;if(walls[idx(tx,ty)]>=2||tree(tx))continue;const t=tileAt(tx,ty),bowl=dx*dx/9+(dy+.5)*(dy+.5)/4<=1&&dy>=-1;
    if(bowl&&(NATG.has(t)||PLANT.has(t)))setTile(tx,ty,T.AIR,0);else if(dy>=1&&PLANT.has(t))setTile(tx,ty,T.AIR,0);}
  for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=0;dy++){const tx=x+dx,ty=g+dy;if(walls[idx(tx,ty)]>=2||!NATG.has(tileAt(tx,ty)))continue;
    if(Math.random()<.55){setTile(tx,ty,pick(ore),0);placed++;}}
  dropItem('fstar',randi(1,3),x+.5,g+1,0,4);wev.n++;fcount('meteor');stat('meteors');
  if(placed)toast('A meteor struck nearby! Its crater glitters with ore.','gold');}
function endMeteor(){wev.k=null;rocks=[];toast(wev.n?`The meteor shower is over. ${wev.n} crater${wev.n>1?'s':''} full of ore to dig.`:'The meteor shower fades with the dawn.','gold');}

// --- eclipse: a rare, dangerous daytime event once two bosses are beaten. The sky goes dark (eclF, read by updateSky),
// night foes spawn in greater numbers and more of them are elite. Defeat enough of them before the sun opens for a reward.
export let eclF=0;
export const eclipseOn=()=>wev.k==='eclipse';
function startEclipse(){Object.assign(wev,{pend:null,k:'eclipse',dur:rand(150,190),n:0,goal:10+3*bossesBeaten(),cd:4});wev.t=wev.dur;announce('eclipse');SFX.boom();shake(.3);foeT=2;}
function updateEclipse(dt){wev.t-=dt;foeT-=dt;
  if(foeT<=0&&onSurface()&&!player.dead){foeT=rand(3,5);if(enemies.filter(e=>e.ecl&&!e.dying).length<5+bossesBeaten()){const pool=['zombie','eye','wraith'];if(quests.crane)pool.push('knight','inkwisp');const e=spawnNear(pick(pool),Math.random()<.5?-1:1);if(e){e.ecl=true;if(Math.random()<.25)makeElite(e);}}}
  if(wev.t<=0)endEclipse();}
function endEclipse(){const won=wev.n>=wev.goal;wev.k=null;
  if(!won){toast('The sun unfolds again. The eclipse foes melt away into shadow.');for(const e of enemies)if(e.ecl&&!e.dying){e.dying=.3;burst(e.x,e.y+e.h/2,['#3a1a4a','#7a5aa0'],10,4);}return;}
  chapterCard(null,'The sun returns','You weathered the eclipse.','A world event');SFX.nice();give('coin',wev.goal*12);give('fstar',randi(4,7));give('moonink',randi(4,7));give(pick(ARMY_LOOT),1);
  setTimeout(()=>toast('Something bright fell out of the sky as the sun opened. Your pack is heavier.','gold'),800);stat('eclipses');fcount('eclipse');}

// --- monster migration: for a few days one surface biome's foes turn up in another, in herds; defeat enough to drive them home
const MIGR={forest:[['slime','crumple','toadstool'],['zombie','eye','crumple']],snow:[['foldfox','flurry','snowroll','frostpuff'],['foldfox','flurry','frostpuff']],desert:[['dunefin','scarab','sunkite'],['scarab','sunkite','dunefin']]};
const MIGCOL={forest:['#6dbb4a','#a8d86a'],snow:['#eef6ff','#bfe3f7'],desert:['#e3c77d','#c9a574']};
let migT=6;
function startMig(){if(wev.mig||wev.cd>0)return;const ks=Object.keys(MIGR),from=pick(ks),to=pick(ks.filter(k=>k!==from));
  wev.mig={from,to,days:3,n:0,goal:14+2*bossesBeaten()};wev.cd=Math.max(wev.cd,2);migT=4;announce('mig',`Foes of the ${BIONAME[from]} are moving into the ${BIONAME[to]} for a few days. Drive them home!`);SFX.rustle(.6);}
export function migPick(bio,under,night){const m=wev.mig;if(!m||under||bio!==m.to||Math.random()>.55)return null;return pick(MIGR[m.from][night?1:0]);}
function updateMig(dt){const m=wev.mig,here=onSurface()&&biomeAt(player.x,player.y)===m.to;if(!here)return;
  if(Math.random()<dt*6){const cam=camera.position;burst(cam.x+rand(-24,24),cam.y+rand(-4,12),MIGCOL[m.from],1,.8,{grav:.4,life:3,bright:1,s:1.3});}
  migT-=dt;if(migT>0)return;migT=rand(25,40);if(enemies.filter(e=>e.mig&&!e.dying).length>=5)return;const side=Math.random()<.5?-1:1;
  for(let k=0,n=randi(2,3);k<n;k++){const e=spawnNear(pick(MIGR[m.from][0]),side);if(e){e.mig=true;e.vx=-side*3;}}}
function endMig(won){const m=wev.mig;wev.mig=null;if(!m)return;for(const e of enemies)if(e.mig&&!e.dying){e.dying=.3;burst(e.x,e.y+e.h/2,MIGCOL[m.from].concat(['#fbf8f0']),10,4);}
  if(!won){toast(`The migrants head back to the ${BIONAME[m.from]}.`);return;}
  chapterCard(null,'Herd turned home',`The ${BIONAME[m.to]} is quiet again.`,'A world event');SFX.nice();give('coin',m.goal*8);give('fstar',randi(2,4));give(pick(ARMY_LOOT),1);
  setTimeout(()=>toast(`You drove the migrants back to the ${BIONAME[m.from]}! The town sends ${m.goal*8} coins.`,'gold'),800);stat('migrations');fcount('mig');}
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
export function restoreEvents(){if(wev.k&&!EVENTS[wev.k])wev.k=null;if(wev.pend&&!EVENTS[wev.pend])wev.pend=null;if(wev.mig&&!(MIGR[wev.mig.from]&&MIGR[wev.mig.to]))wev.mig=null;rocks=[];if(wev.trav){wev.trav.stock=(wev.trav.stock||[]).filter(r=>Array.isArray(r)&&ITEMS[r[0]]);placeTrav();}
  else{const n=npcs.find(n=>n.type==='traveler');if(n){scene.remove(n.mesh);npcs.splice(npcs.indexOf(n),1);}}}

// the event bar under the boss bar
function updateBar(){const el=$('evbar');let name=null,f=-1;
  let cls=wev.k;if(wev.k==='storm'){name='Paper Storm';f=wev.t/wev.dur;}else if(wev.k==='army'){name=`The Paper Army · ${wev.n} / ${wev.goal}${onSurface()?'':' · return to the surface'}`;f=1-wev.n/wev.goal;}
  else if(wev.k==='meteor'){name=`Meteor Shower · ${wev.n} crater${wev.n===1?'':'s'}${onSurface()?'':' · watch from the surface'}`;f=wev.t/wev.dur;}
  else if(wev.k==='eclipse'){name=`Eclipse · ${Math.min(wev.n,wev.goal)} / ${wev.goal} foes${wev.n>=wev.goal?' · hold on!':''}`;f=wev.t/wev.dur;}
  else if(wev.mig){const m=wev.mig;cls='mig';name=`Migration into the ${BIONAME[m.to]} · ${m.n} / ${m.goal}`;f=1-m.n/m.goal;}
  else if(wev.trav){cls='trav';name='Traveling Merchant in town · leaves at dusk';}
  el.hidden=!name;if(!name)return;if(el.dataset.k!==name){el.dataset.k=name;el.querySelector('.en').textContent=name;el.className=cls;}el.querySelector('.eb').hidden=f<0;if(f>=0)el.querySelector('.eb i').style.width=clamp(f*100,0,100)+'%';}
// Imported bindings are read-only, so other modules assign these through setters.
export function setWev(v){return wev=v;}
export function setEclF(v){return eclF=v;}
