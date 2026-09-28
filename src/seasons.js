// Seasons: a spring/summer/fall/winter cycle counted in in-game days. Seasons change crop growth,
// weather odds, tree canopies, sky tint and drifting particles, and each has a festival day.
import * as THREE from 'three';
import {
  addItem,BIO,canvasTex,markDirty,meta,mk,mulberry32,N,SPAWNX,seed,SOLID,scene,fi,poly,pick,randi,reduceMotion,stat,biomeAt,blk,emit,C,camera,CHH,CW,dayF,dirty,dropItem,H,idx,inkMoon,isNight,npcs,NPCDEF,player,rand,
  setWeather,setWind,SFX,sky,surf,surfAvg,T,tiles,toast,townSpots,W,walls,weather,worldTime,
} from './game.js';

// ================= seasons =================
export const SEASON_DAYS=5,FEST_DAY=3;
// grow: growth multiplier per crop type (sunpetal, frostleaf, inkreed, emberbloom, wheat) for crops outdoors.
// wx: odds a clear spell turns to clear again or to rain (snow in winter); the rest is wind.
export const SEASONS=[
  {k:'spring',n:'Spring',grow:[1.5,.5,1.2,1,1.2],wx:[.4,.42],sky:'#f7d3e0',parts:['#f6b7cf','#fbe3ec','#fbf8f0'],fest:'Blossom Festival',festTip:'Crops grow twice as fast today and flowers bloom around town.'},
  {k:'summer',n:'Summer',grow:[1.6,.25,1,1,1.4],wx:[.65,.2],sky:'#ffe7a8',parts:['#fff3a6','#ffd66b'],fest:'Starfall Night',festTip:'Tonight the sky is full of falling stars.'},
  {k:'fall',n:'Fall',grow:[.6,1,1.4,1,1.6],wx:[.38,.27],sky:'#f4b27a',parts:['#e0823d','#d4483b','#f1c04f','#a86b3a'],fest:'Harvest Fair',festTip:'Grown crops give double harvests today.'},
  {k:'winter',n:'Winter',grow:[0,1.6,.5,1,0],wx:[.45,.35],sky:'#d6e6f2',parts:['#fbf8f0','#e6f1f7'],fest:'Lantern Night',festTip:'The townsfolk leave gifts for you.'}];
export let worldDay=0;
export const seasonIdx=()=>Math.floor(worldDay/SEASON_DAYS)%4;
export const season=()=>SEASONS[seasonIdx()];
export const seasonDay=()=>worldDay%SEASON_DAYS+1;
export const festival=()=>seasonDay()===FEST_DAY?season():null;
export const isFest=k=>{const f=festival();return !!f&&f.k===k;};
export function seasonInfo(){const s=season(),d=seasonDay();return{k:s.k,n:s.n,day:d,fest:d===FEST_DAY?s.fest:null,festIn:d<FEST_DAY?FEST_DAY-d:null,year:Math.floor(worldDay/(SEASON_DAYS*4))+1};}
// crops under a placed background wall, or deep underground, are sheltered and ignore the season
export const sheltered=i=>walls[i]>=2||(i/W|0)<surf[i%W]-8;
export function cropGrowChance(i,ty){const base=weather==='rain'?.16:.08;if(sheltered(i))return base;return base*season().grow[ty]*(isFest('spring')?2:1);}
// the moon is full every 4th night (the night that ends a day where worldDay%4===3)
export const fullMoon=()=>worldDay%4===3;
// rare crops (T.RARE, type in meta>>2): moon lily needs a full or Ink Moon night and open sky; thunderroot grows only
// from lightning (lightningStrike in gameplay.js); sunfruit needs daylight on open sky with no background wall;
// ghost mushrooms need the dark, deep underground. Seasons and shelter don't apply.
export function rareGrowChance(i,ty){const y=i/W|0,deep=y<surf[i%W]-8;
  if(ty===0)return !deep&&sky[i]>=12&&isNight()&&(fullMoon()||inkMoon)?.05:0;
  if(ty===2){if(deep||sky[i]<15||walls[i]||dayF(worldTime)<.5)return 0;const k=season().k;return .06*(k==='summer'?1.5:k==='winter'?.3:1)*(weather==='rain'?.5:1);}
  if(ty===3)return y<surf[i%W]-20&&!sky[i]&&blk[i]<6?.05:0;return 0;}
export function dormant(i,ty){return !sheltered(i)&&season().grow[ty]===0;}
// forest trees change canopy with the season; snow biome pines stay as they are
export function canopyCell(m){const k=season().k;if(m<3){if(k==='fall')return C.canopyFall[m-1];if(k==='winter')return C.canopyWinter;if(k==='spring'&&m===1)return C.canopySpring;}return C.canopy[m-1];}
function redrawAll(){for(let k=0;k<CW*CHH;k++)dirty.add(k);}
// weather roll for the current season: returns 'clear', 'rain', 'snow' or 'wind'
export function rollWeather(){const[cl,rn]=season().wx,r=Math.random();if(r<cl)return'clear';if(r<cl+rn)return season().k==='winter'?'snow':'rain';return'wind';}
// runs at each dawn
export function newDay(){const ps=seasonIdx();setWorldDay(worldDay+1);const s=season(),f=festival(),turned=seasonIdx()!==ps;
  if(turned){seasonWorld();redrawAll();if(weather==='snow'&&s.k!=='winter'){setWeather('clear');setWind(0);}toast(`${s.n} has arrived! ${['Blossoms open and the rain returns.','Long warm days. Sunpetal and wheat love it.','Leaves turn and the wheat ripens fast.','Snow falls. Outdoor sunpetal and wheat rest until spring.'][seasonIdx()]}`,'gold');}
  if(f){setTimeout(()=>toast(`Today is the ${f.fest}! ${f.festTip}`,'gold'),turned?1500:0);if(f.k==='spring')bloomTown();if(f.k==='winter')giftDay();if(npcs.some(n=>n.type==='angler'&&n.home))setTimeout(()=>toast(`The Angler is holding a fishing contest for the ${f.fest}! Catch something big today and show them.`,'good'),turned?5000:3500);}}
function bloomTown(){let n=0;for(const x of townSpots()){if(n>=14)break;if(Math.random()<.5)continue;const y=groundY(x);if(y<0||tiles[idx(x,y-1)]!==T.GRASS)continue;setTileQuiet(x,y,Math.random()<.5?T.FLOWER:T.FLOWER2);n++;}}
function giftDay(){const folk=npcs.filter(n=>n.home);if(!folk.length){setTimeout(()=>toast('No townsfolk to celebrate with yet. Build them homes!'),3000);return;}
  const p=player,give=(id,n)=>{const l=addItem(id,n);if(l)dropItem(id,l,p.x,p.y+1);};let coins=0;
  for(const n of folk){coins+=20;const g=GIFTS[n.type];if(g)give(g[0],g[1]);}give('coin',coins);SFX.nice();
  setTimeout(()=>toast(`Gifts from ${folk.map(n=>NPCDEF[n.type].name).join(', ')}: ${coins} coins and more!`,'gold'),3000);}
const GIFTS={merchant:['potion',2],guide:['torch',10],painter:['candle',2],nurse:['potregen',1],tinkerer:['rope',20],angler:['grilledfish',2],farmer:['bread',3],scout:['potnight',1],curator:['candle',3]};
// the first free floor cell above the ground at column x, or -1
export function groundY(x){if(x<1||x>=W-1)return -1;for(let y=Math.min(H-3,surf[x]+14);y>Math.max(2,surf[x]-6);y--){const t=tiles[idx(x,y)];if(t===T.AIR||t===T.TUFT)continue;const i=idx(x,y+1);if(t===T.GRASS||t===T.DIRT||t===T.SNOW||t===T.SAND||t===T.STONE||t===T.PLANK||t===T.BRICK)return(tiles[i]===T.AIR||tiles[i]===T.TUFT)&&!walls[i]?y+1:-1;return -1;}return -1;}
function setTileQuiet(x,y,t){tiles[idx(x,y)]=t;dirty.add(Math.floor(y/32)*CW+Math.floor(x/32));}
// the seasonal sky tint, applied on top of the day/night sky
export function seasonSky(skyU,cB,f,under){const s=season();skyU.uBot.value.lerp(cB.set(s.sky),.16*f*(1-under));if(s.k==='winter')skyU.uTop.value.lerp(cB.set('#b6d0e2'),.18*f*(1-under));}
// drifting petals, leaves, fireflies or snow in surface view
export function seasonAmbient(dt){const cx=camera.position.x,cy=camera.position.y;if(cy<surfAvg-18)return;const b=biomeAt(cx,cy-3);if(b==='under'||b==='snow')return;const s=season();
  if(s.k==='spring'&&b!=='desert'&&Math.random()<dt*4)emit('petals',cx+rand(-26,26),cy+10,{cols:s.parts});
  else if(s.k==='fall'&&b!=='desert'&&Math.random()<dt*5)emit('leaves',cx+rand(-26,26),cy+10,{cols:s.parts,grav:.7,life:6,up:-.2});
  else if(s.k==='summer'&&b!=='desert'&&isNight()&&Math.random()<dt*3)emit('fireflies',cx+rand(-24,24),cy+rand(-6,4),{cols:s.parts});
  else if(s.k==='winter'&&Math.random()<dt*(weather==='snow'?30:6))emit('snow',cx+rand(-26,26),cy+10,{cols:s.parts,grav:1.1});}

// ================= seasonal routes =================
// Seasons change where you can go. Winter freezes open ink into thin ice you can walk on (T.THIN; breaking it
// leaves a fishing hole) and heaps snow drifts (T.DRIFT) on open ground; spring melt floods a few low cave basins;
// summer dries the shallow ponds, and their muddy beds give up a cache once a year; fall brings migrating paper
// cranes and golden leaves under the forest trees. Ponds and basins are planned once per world (BIO.sea, older
// saves on their next load) on natural ground away from town. seasonWorld() puts the world in the state of the
// current season and undoes the others; it only turns its own tiles back (ice to ink, drifts to air, planned
// cells between ink and air), so nothing is ever written into a player's build.
const NATG=new Set([T.GRASS,T.DIRT,T.SNOW,T.STONE,T.SAND]),awayTown=x=>Math.abs(x-SPAWNX-6)>52;
export function planSeasons(){if(!BIO||!BIO.uw||BIO.sea||!BIO.snow)return;const rng=mulberry32(seed+4242),sea=BIO.sea={po:[],fl:[]},used=[];
  const lake=x=>Math.abs(x-BIO.lake[0])<=BIO.lake[1]+14,camp=x=>(BIO.camps||[]).some(c=>x>c.x0-12&&x<c.x0+22),free=(x,r)=>used.every(u=>Math.abs(u-x)>r);
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  // shallow ponds on gentle forest and snow ground (at most 2 tiles of slope): the water line is the lowest ground in the
  // span, two tiles deep in the middle and one at the ends, and higher ground in the span is cut down to it. Every spot
  // that fits is listed (a full scan), shuffled with the world seed and taken far apart.
  const pc=[];for(let x0=10;x0<W-22;x0++){const x1=x0+5+(x0%2);let L=1e9,M=-1;for(let x=x0;x<=x1;x++){L=Math.min(L,surf[x]);M=Math.max(M,surf[x]);}
    if(M-L>2||surf[x0-1]<L||surf[x1+1]<L||!awayTown(x0-1)||!awayTown(x1+1)||lake(x0)||lake(x1)||camp(x0)||camp(x1))continue;const b=biomeAt(x0,L);if(b!=='forest'&&b!=='snow')continue;
    let ok=true;for(let x=x0-1;x<=x1+1&&ok;x++)for(let y=L-3;y<=surf[x]+4&&ok;y++){const i=idx(x,y),t=tiles[i];if(walls[i]>=2)ok=false;else if(y<=surf[x]&&!NATG.has(t))ok=false;else if(y>surf[x]&&t!==T.AIR&&t!==T.TUFT&&t!==T.FLOWER&&t!==T.FLOWER2&&t!==T.BLOOM)ok=false;}
    if(ok)pc.push([x0,x1,L]);}
  const nP=Math.max(3,Math.round(W/130));for(const[x0,x1,L]of shuffle(pc)){if(sea.po.length>=nP)break;if(!free(x0,24))continue;
    const c=[];for(let x=x0;x<=x1;x++){const d=x===x0||x===x1?1:2;for(let y=L-d+1;y<=surf[x]+1;y++){const i=idx(x,y);tiles[i]=T.AIR;walls[i]=0;if(y<=L)c.push(i);}
      const bed=idx(x,L-d);if(tiles[bed]===T.GRASS||tiles[bed]===T.SNOW)tiles[bed]=T.DIRT;surf[x]=Math.min(surf[x],L);}
    sea.po.push({c,x:(x0+x1)/2,y:L-1,yr:-1});used.push(x0);}
  // spring flood basins: a dip in a cave passage near the surface, walled in on both sides, one or two tiles deep
  const fc=[];for(let x=12;x<W-12;x++){if(!awayTown(x)||lake(x))continue;for(let y=Math.max(BIO.uw+12,surf[x]-36);y<=surf[x]-8;y++){const i0=idx(x,y);if(tiles[i0]!==T.AIR||!SOLID[tiles[i0-W]]||SOLID[tiles[i0-1]]===0)continue;
    // x is the left end of a run: its left neighbour is a wall
    let b=x;while(b<x+15&&tiles[idx(b+1,y)]===T.AIR&&SOLID[tiles[idx(b+1,y-1)]])b++;if(b-x<2||b-x>13||!SOLID[tiles[idx(b+1,y)]])continue;
    let ok=true;for(let xx=x;xx<=b&&ok;xx++)for(let yy=y;yy<=y+2;yy++){const i=idx(xx,yy);if(walls[i]>1||(yy===y&&tiles[i]!==T.AIR))ok=false;}if(ok)fc.push([x,b,y]);}}
  const nF=Math.max(3,Math.round(W/110));for(const[a,b,y]of shuffle(fc)){if(sea.fl.length>=nF)break;if(!free(a,20))continue;
    const c=[];for(let xx=a;xx<=b;xx++)c.push(idx(xx,y));let up=SOLID[tiles[idx(a-1,y+1)]]&&SOLID[tiles[idx(b+1,y+1)]];for(let xx=a;xx<=b&&up;xx++)if(tiles[idx(xx,y+1)]!==T.AIR)up=false;if(up)for(let xx=a;xx<=b;xx++)c.push(idx(xx,y+1));
    sea.fl.push(c);used.push(a);}}
// the world in the current season's state; returns true when a tile changed
export function seasonWorld(){if(!BIO||!BIO.sea)return false;const k=season().k;let x0=1e9,x1=-1,yT=0;const set=(i,t)=>{if(tiles[i]===t)return;tiles[i]=t;const x=i%W;x0=Math.min(x0,x);x1=Math.max(x1,x);yT=Math.max(yT,(i/W|0));};
  for(const p of BIO.sea.po)for(const i of p.c){if(k==='summer'){if(tiles[i]===T.INK||tiles[i]===T.THIN)set(i,T.AIR);}else if(tiles[i]===T.AIR&&walls[i]<2)set(i,T.INK);}
  for(const c of BIO.sea.fl)for(const i of c){if(k==='spring'){if(tiles[i]===T.AIR&&walls[i]<2)set(i,T.INK);}else if(tiles[i]===T.INK)set(i,T.AIR);}
  if(k==='winter'){for(let x=2;x<W-2;x++){let y=Math.min(H-2,surf[x]+30);while(y>surf[x]-4&&(tiles[idx(x,y)]===T.AIR||tiles[idx(x,y)]===T.DRIFT))y--;const i=idx(x,y),t=tiles[i],b=biomeAt(x,y);if(b==='desert'||b==='under'||walls[i]>=2||walls[i+W]>=2)continue;
      if(t===T.INK&&tiles[i+W]===T.AIR)set(i,T.THIN);else if(awayTown(x)&&tiles[i+W]===T.AIR&&(t===T.GRASS||t===T.SNOW||t===T.DIRT)&&((x*7919+worldDay)%10)<7)set(i+W,T.DRIFT);}}
  else for(let i=0;i<N;i++){const t=tiles[i];if(t===T.THIN)set(i,T.INK);else if(t===T.DRIFT)set(i,T.AIR);}
  if(x1>=0){markDirty(x0,yT);markDirty(x1,yT);return true;}return false;}
// summer: the first time you come near a dried pond each year, its mud gives up whatever sank there
let seaT=0,flock=null,flockT=20,leafT=8;
export function updateSeasonWorld(dt){const p=player,k=season().k;seaT-=dt;if(seaT<=0&&BIO&&BIO.sea){seaT=1;
    if(k==='summer'){const yr=Math.floor(worldDay/(SEASON_DAYS*4));for(const q of BIO.sea.po){if(q.yr===yr||Math.abs(q.x-p.x)>10||Math.abs(q.y-p.y)>6)continue;q.yr=yr;const g=(id,n)=>dropItem(id,n,q.x+rand(-1.5,1.5),q.y+1);
      g('coin',randi(20,60));g(pick(['fly','fly','glowlure','leaflure']),randi(3,6));if(Math.random()<.5)g(pick(['fcrate','soggy','potfish']),1);if(Math.random()<.2)g('tmap',1);if(Math.random()<.15)g('tackle',1);
      toast('The dried pond bed glints. Something was lost in the mud!','gold');SFX.coin();stat('ponds');}}}
  // fall: golden leaves drift down from forest trees near you, in daylight
  if(k==='fall'&&!isNight()&&biomeAt(p.x,p.y)==='forest'&&p.y>surf[Math.max(0,Math.min(W-1,Math.floor(p.x)))]-6){leafT-=dt;if(leafT<=0){leafT=rand(9,18);
    for(let a=0;a<12;a++){const x=Math.floor(p.x+rand(-14,14));if(x<1||x>=W-1)continue;let y=surf[x]+1;if(tiles[idx(x,y)]!==T.TRUNK)continue;while(tiles[idx(x,y+1)]===T.TRUNK)y++;if(meta[idx(x,y)]&&meta[idx(x,y)]<3){dropItem('goldleaf',1,x+rand(-1,2),y+2.5,rand(-.6,.6),0);break;}}}}
  updateMigration(dt,k);}
// fall migration: a V of paper cranes crosses the sky now and then (just scenery)
function craneTex(){const c=mk(64,48),t=c.getContext('2d');poly(t,[4,30,30,24,34,6,40,24,60,20,44,32,30,36]);fi(t,'#fbf8f0',2.5);poly(t,[30,24,34,6,40,24]);fi(t,'#e6e1d6',2);poly(t,[4,30,12,24,14,30]);fi(t,'#d4483b',2);return canvasTex(c);}
function updateMigration(dt,k){if(flock){flock.t+=dt;const f=flock;f.g.position.x+=f.dir*dt*7;for(const m of f.g.children)m.scale.y=reduceMotion()?1:.75+Math.sin(f.t*6+m.userData.o)*.25;
    if(f.t>40||k!=='fall'){scene.remove(f.g);f.g.children.forEach(m=>m.geometry.dispose());flock=null;}return;}
  if(k!=='fall'||isNight()||camera.position.y<surfAvg-12)return;flockT-=dt;if(flockT>0)return;flockT=rand(35,70);
  const dir=Math.random()<.5?1:-1,g=new THREE.Group(),n=5+Math.floor(Math.random()*5);if(!craneMat)craneMat=new THREE.MeshBasicMaterial({map:craneTex(),transparent:true,depthWrite:false,fog:false});
  for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(3,2.25),craneMat);const r=Math.ceil(i/2),s=i%2?1:-1;m.position.set(-dir*r*3,s*r*1.5,0);m.scale.x=dir;m.userData.o=i;m.renderOrder=-9;g.add(m);}
  g.position.set(camera.position.x-dir*40,camera.position.y+rand(9,14),-12);scene.add(g);flock={g,t:0,dir};stat('migrations');}
let craneMat=null;
// Imported bindings are read-only, so other modules assign these through setters.
export function setWorldDay(v){return worldDay=v;}
