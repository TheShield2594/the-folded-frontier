// Hand-built dungeons: layouts stored as text templates and stamped into the world. The first is the Folded Clocktower.
import {
  $,BIO,boss,burst,chapterCard,chests,enemies,H,idx,makeElite,meta,mulberry32,pick,player,quests,randi,
  removeEnemy,resetBossFx,setBoss,setTile,SFX,shake,spawnEnemy,SPAWNX,stat,surf,T,tiles,toast,tone,W,walls,
} from './game.js';

// ================= dungeons =================
// A template is a list of rows, top row first; the bottom row sits on the ground. Legend:
//   ~ open air (no back wall)   # dungeon stone (unbreakable)   . air with a stone back wall   = platform   r rope
//   E G A B gates 0-3 (E: the front door, G: opened by the crank, A: opens when the mini-boss falls, B: opens when the boss falls)
//   K winding crank   L peel wall   k sketched bridge (pops into platforms)   F fake wall (a secret)   C chest   c secret chest
//   H Paper Heart   T torch   O clock   M mini-boss   X boss   R the reward chest (appears when the boss falls)
// Rooms are rectangles in template cells [col0, row0, col1, row1]: 'arena' starts the mini-boss fight, 'boss' the boss fight.
export const DUNGEONS={
  clock:{name:'The Folded Clocktower',mini:'sentinel',boss:'mainspring',need:'crane',rooms:{boss:[1,2,21,9],arena:[1,11,21,17]},rows:[
    '#~#~#~#~#~#~#~#~#~#~#~#',
    '##########BBB##########',
    '#..........r..........#',
    '#.T........r........T.#',
    '#..........r..........#',
    '#.........Xr..........#',
    '#==........r........==#',
    '#.....................#',
    '#.....................#',
    '#.....O.........R.....#',
    '##########AAA##########',
    '#..........r..........#',
    '#.T........r........T.#',
    '#..........r..........#',
    '#==........r........==#',
    '#.....................#',
    '#..................r..#',
    '#...........M......r..#',
    '##################=r=##',
    '#..................r..#',
    '#.T................r.T#',
    '#..................r..#',
    '#.r................r..#',
    '#.r................r.C#',
    '#GGG##kkkkkkkkkkk######',
    '#.r..........##########',
    '#.r......T...##########',
    '#.r..........#####....#',
    '#.r..........#####...T#',
    '#............L####....#',
    '#.....r......L####....#',
    '#.....r......L......K.#',
    '#####=r=###############',
    '#.....r...............#',
    '#.T...r.............T.#',
    '#.....r..........######',
    'E................F..c.#',
    'E................F....#',
    'E...C....O.......F.H..#',
    '#######################']}};
const GATE={E:0,G:1,A:2,B:3};
// placed dungeons live in the saved biome data: BIO.dun[key] = {x, y (the bottom row), w, h, g: {gate: [[tile index, tile when open]...]},
// st: progress (e front door, g crank, m mini-boss beaten, c reward given), m/b/r: mini-boss, boss and reward cells}
const D=()=>BIO&&BIO.dun&&BIO.dun.clock;
function lootFor(kind){const s=[];const add=(id,n)=>s.push({id,n});
  if(kind==='C'){add('coin',randi(60,140));add('potion',randi(2,4));add('torch',randi(10,20));add('rope',randi(20,40));add(pick(['goldbar','frostbar']),randi(3,6));if(Math.random()<.5)add(pick(['potiron','potregen','potswift']),randi(1,2));}
  else if(kind==='c'){add('coin',randi(150,300));add('cog',randi(3,5));add('bpup',1);add(pick(['b_quick','b_close','b_last','toolbelt']),1);}
  else{add('clockwings',1);add('coin',randi(300,450));add('skyore',randi(8,14));add('cog',randi(4,8));}
  while(s.length<20)s.push(null);return s;}
// stamp a template with its bottom row on ground level L at column x0 (fills dirt under it, clears a way in on the left)
function stamp(key,x0,L){const dg=DUNGEONS[key],rows=dg.rows,h=rows.length,w=rows[0].length,g={0:[],1:[],2:[],3:[]},o={x:x0,y:L,w,h,g,st:{}};
  const at=(c,r)=>[x0+c,L+(h-1-r)],ch=(c,r)=>r>=0&&r<h&&c>=0&&c<w?rows[r][c]:' ';
  for(let x=x0-3;x<x0+w+2;x++){for(let y=Math.min(surf[x],L)-2;y<L;y++){const i=idx(x,y);if(tiles[i]===T.AIR||tiles[i]===T.TUFT||tiles[i]===T.FLOWER||tiles[i]===T.FLOWER2){tiles[i]=T.DIRT;walls[i]=0;}}
    if(surf[x]<L)surf[x]=L;if(x<x0||x>=x0+w){const i=idx(x,L);if(!tiles[i]||tiles[i]===T.TUFT)tiles[i]=T.GRASS;for(let y=L+1;y<=L+4;y++){const j=idx(x,y);if(x<x0){tiles[j]=T.AIR;meta[j]=0;walls[j]=0;}}}}
  for(let r=0;r<h;r++)for(let c=0;c<w;c++){const k=rows[r][c],[x,y]=at(c,r),i=idx(x,y);let t=T.AIR,m=0,wl=3;
    switch(k){case '~':wl=0;break;case '#':t=T.TOWER;break;case '=':t=T.PLATFORM;break;case 'r':t=T.ROPE;break;case 'K':t=T.CRANK;break;case 'L':t=T.PEEL;m=1;break;
      case 'k':t=T.SKETCH;m=1;break;case 'F':t=T.FAKE;m=1;break;case 'H':t=T.HEART;break;case 'T':t=T.TORCH;break;case 'O':t=T.CLOCK;break;
      case 'C':case 'c':t=T.CHEST;chests.set(i,lootFor(k));break;case 'M':o.m=[x,y];break;case 'X':o.b=[x,y];break;case 'R':o.r=[x,y];break;
      case 'E':case 'G':case 'A':case 'B':{t=T.GATE;m=GATE[k];const rope=ch(c,r-1)==='r'||ch(c,r+1)==='r';g[m].push([i,k==='E'?T.AIR:rope?T.ROPE:k==='B'?T.AIR:T.PLATFORM]);break;}}
    tiles[i]=t;meta[i]=m;walls[i]=wl;}
  const box=([c0,r0,c1,r1])=>{const[a,b]=at(c0,r1),[cc,d]=at(c1,r0);return[a,b,cc,d];};o.rooms={};for(const k in dg.rooms)o.rooms[k]=box(dg.rooms[k]);return o;}
const NATURAL=new Set([T.AIR,T.GRASS,T.DIRT,T.STONE,T.SAND,T.SNOW,T.ICE,T.TUFT,T.FLOWER,T.FLOWER2,T.MUSH,T.BLOOM,T.TRUNK,T.COPPER,T.IRON,T.GOLD,T.CROP,T.DRIFT,T.RUBBLE]);
// Dungeons are planned at generation and, for saves made before they existed, the first time the save loads. A spot must be
// untouched natural ground (no placed walls, chests or builds), fairly flat, away from the town, the Ink Lake and the camps;
// a world with no such spot gets no clocktower rather than one stamped over the player's work.
export function planDungeons(sd){if(!BIO||!BIO.uw||BIO.dun)return;BIO.dun={};const r=mulberry32(sd+733),dg=DUNGEONS.clock,w=dg.rows[0].length,h=dg.rows.length,cand=[];
  for(let x0=24;x0<W-24-w;x0+=2){if(Math.abs(x0+w/2-SPAWNX)<70||BIO.lake&&Math.abs(x0+w/2-BIO.lake[0])<BIO.lake[1]+w/2+20)continue;if((BIO.camps||[]).some(c=>Math.abs(c.x0+5-(x0+w/2))<w/2+18))continue;
    let lo=1e9,hi=-1;for(let x=x0-3;x<x0+w+2;x++){lo=Math.min(lo,surf[x]);hi=Math.max(hi,surf[x]);}if(hi-lo>7||hi+h+3>H-3)continue;const L=hi;
    let ok=true;for(let x=x0-3;x<x0+w+2&&ok;x++)for(let y=lo-3;y<L+h+2;y++){const i=idx(x,y);if(!NATURAL.has(tiles[i])||walls[i]>1||chests.has(i)){ok=false;break;}}if(ok)cand.push([x0,L]);}
  if(!cand.length)return;const[x0,L]=cand[Math.floor(r()*cand.length)];BIO.dun.clock=stamp('clock',x0,L);}
export const inClock=(x,y)=>{const d=D();return!!d&&x>=d.x&&x<d.x+d.w&&y>=d.y&&y<d.y+d.h+1;};
export const clockNear=(x0,x1)=>{const d=D();return!!d&&x0<d.x+d.w&&x1>=d.x;};
export const clockRoom=()=>{const d=D();return d?d.rooms.boss:null;};
const inRoom=(b,x,y)=>x>=b[0]&&x<b[2]+1&&y>=b[1]&&y<b[3]+1;
function openGate(d,g,fx=true){for(const[i,t]of d.g[g]){if(tiles[i]!==T.GATE)continue;const x=i%W,y=(i/W)|0;setTile(x,y,t,0);if(fx)burst(x+.5,y+.5,['#c9a24a','#e0b04a','#fbf8f0'],6,3,{grav:3});}
  if(fx){SFX.door();tone(220,330,.35,'square',.05);tone(330,440,.3,'triangle',.06,.2);shake(.2);}}
function closeGate(d,g){for(const[i]of d.g[g]){const x=i%W,y=(i/W)|0;if(tiles[i]!==T.GATE)setTile(x,y,T.GATE,g);}SFX.door();tone(330,180,.4,'square',.06);shake(.25);}
const GATEMSG=['The door of the Folded Clocktower is wound tight. Its gears only stir once the Great Crane has fallen.','A brass gate. Somewhere on this floor a crank must wind it open.',
  'This gate opens when the tower\'s guardian falls.','The roof gate answers only to the Mainspring.'];
export function gateAt(x,y){const d=D();if(!d)return;const g=meta[idx(x,y)]&3;
  if(g===0&&quests[DUNGEONS.clock.need]){d.st.e=1;openGate(d,0);chapterCard(null,DUNGEONS.clock.name,'Something inside is still ticking.','A dungeon');stat('dungeons');return;}
  toast(GATEMSG[g]);SFX.pick();}
export function crankAt(x,y){const d=D(),i=idx(x,y);if(!d||meta[i]&1){toast('The crank is wound tight.');return;}setTile(x,y,T.CRANK,1);d.st.g=1;SFX.nice();tone(180,260,.5,'sawtooth',.04);
  setTimeout(()=>{openGate(d,1);toast('Somewhere above, a gate grinds open.','gold');},600);}
// fights: the mini-boss appears when you step into the arena and the boss when you reach the clock chamber (which shuts behind you).
// Leaving the tower or falling in the fight resets it, so a lost fight never strands the boss outside or the player inside.
let miniE=null,dunT=0;
export function updateDungeons(dt){const d=D();if(!d||(dunT-=dt)>0)return;dunT=.25;const p=player,px=p.x,py=p.y+.9,st=d.st,inside=inClock(px,py)&&!p.dead;
  if(!st.m){if(miniE&&(miniE.dying||!enemies.includes(miniE))){if(miniE.hp<=0){st.m=1;openGate(d,2);toast('The Clockwork Sentinel winds down. The gate above swings open!','gold');}miniE=null;}
    else if(miniE&&!inside){removeEnemy(miniE);enemies.splice(enemies.indexOf(miniE),1);miniE=null;}
    else if(!miniE&&inside&&inRoom(d.rooms.arena,px,py)&&d.m){miniE=makeElite(spawnEnemy(DUNGEONS.clock.mini,d.m[0]+.5,d.m[1]));miniE.vy=6;burst(miniE.x,miniE.y+1,['#c9a24a','#fbf8f0'],24,6);SFX.boom();shake(.3);
      chapterCard(null,'Clockwork Sentinel','The tower\'s guardian winds itself up.','Mini-boss');}}
  const e=boss&&boss.type===DUNGEONS.clock.boss?boss:null;
  if(e&&!e.defeat&&!inside){removeEnemy(e);enemies.splice(enemies.indexOf(e),1);setBoss(null);$('boss').hidden=true;resetBossFx();if(st.m)openGate(d,2,false);}
  else if(!e&&!boss&&st.m&&!quests.clock&&inside&&p.onGround&&inRoom(d.rooms.boss,px,p.y+.05)&&d.b){closeGate(d,2);spawnEnemy(DUNGEONS.clock.boss,d.b[0]+.5,d.b[1]-1);}
  if(quests.clock&&!st.c){st.c=1;openGate(d,2,false);openGate(d,3);if(d.r){const i=idx(d.r[0],d.r[1]);if(tiles[i]===T.AIR){setTile(d.r[0],d.r[1],T.CHEST);chests.set(i,lootFor('R'));}}
    setTimeout(()=>toast('The roof gate swings open, and a chest ticks in the clock chamber.','gold'),1500);}}
