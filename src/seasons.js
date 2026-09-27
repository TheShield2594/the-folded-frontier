// Seasons: a spring/summer/fall/winter cycle counted in in-game days. Seasons change crop growth,
// weather odds, tree canopies, sky tint and drifting particles, and each has a festival day.
import {
  addItem,biomeAt,blk,burst,C,camera,CHH,CW,dayF,dirty,dropItem,H,idx,inkMoon,isNight,npcs,NPCDEF,player,rand,
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
  if(turned){redrawAll();if(weather==='snow'&&s.k!=='winter'){setWeather('clear');setWind(0);}toast(`${s.n} has arrived! ${['Blossoms open and the rain returns.','Long warm days. Sunpetal and wheat love it.','Leaves turn and the wheat ripens fast.','Snow falls. Outdoor sunpetal and wheat rest until spring.'][seasonIdx()]}`,'gold');}
  if(f){setTimeout(()=>toast(`Today is the ${f.fest}! ${f.festTip}`,'gold'),turned?1500:0);if(f.k==='spring')bloomTown();if(f.k==='winter')giftDay();}}
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
  if(s.k==='spring'&&b!=='desert'&&Math.random()<dt*4)burst(cx+rand(-26,26),cy+10,s.parts,1,.4,{grav:.5,life:6,up:-.2,bright:1,s:.9});
  else if(s.k==='fall'&&b!=='desert'&&Math.random()<dt*5)burst(cx+rand(-26,26),cy+10,s.parts,1,.5,{grav:.7,life:6,up:-.2,bright:0,s:1.1});
  else if(s.k==='summer'&&b!=='desert'&&isNight()&&Math.random()<dt*3)burst(cx+rand(-24,24),cy+rand(-6,4),s.parts,1,.3,{grav:-.05,life:3,up:.1,bright:1,s:.5});
  else if(s.k==='winter'&&Math.random()<dt*(weather==='snow'?30:6))burst(cx+rand(-26,26),cy+10,s.parts,1,.4,{grav:1.1,life:5,up:-.5,bright:1,s:.8});}
// Imported bindings are read-only, so other modules assign these through setters.
export function setWorldDay(v){return worldDay=v;}
