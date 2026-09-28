// Hand-built dungeons: layouts stored as text templates and stamped into the world. The Folded Clocktower stands on the
// surface; the Hollow Archive is dug into the rock under a small gatehouse, and its key opens the Lost Stacks.
import {
  $,BIO,boss,burst,cardId,chapterCard,chests,countItem,EN,enemies,H,idx,makeElite,meta,mulberry32,pick,player,quests,randi,
  removeEnemy,resetBossFx,setBoss,setTile,SFX,shake,SOLID,spawnEnemy,SPAWNX,stat,surf,T,tiles,toast,tone,W,walls,
} from './game.js';

// ================= dungeons =================
// A template is a list of rows, top row first. Row `ground` (the bottom row unless set) sits on ground level; rows under it
// are dug into the rock, so a dungeon can stand on the surface or be sunk below it. Legend:
//   ~ open air (no back wall)   # the dungeon's wall tile (unbreakable)   . air with a back wall   = platform   r rope
//   E G A B gates 0-3 (E: the front door, G: opened by the crank, A: opens when the mini-boss falls, B: opens when the boss falls)
//   K winding crank   L peel wall   k sketched bridge (pops into platforms)   F fake wall (a secret)   C chest   c secret chest
//   S stitched seam (the Seam Ripper tears it)   P torn page (the Golden Needle sews it)   b bookshelf   n candle
//   H Paper Heart   T torch   O clock   M mini-boss   X boss   R the reward chest (appears when the boss falls)
// Rooms are rectangles in template cells [col0, row0, col1, row1]: 'arena' starts the mini-boss fight, 'boss' the boss fight.
// need: the quest that opens the front door. far: how far from the town it stays (70 columns unless set). lay: what layerAt() calls the inside (no foes spawn there). minion: foes the boss
// calls, cleared when the fight ends. Text: card (the front door's chapter card), gates (each closed gate's message), miniCard
// and miniDone (the mini-boss's card and fall), done (the reward).
export const DUNGEONS={
  clock:{name:'The Folded Clocktower',mini:'sentinel',boss:'mainspring',need:'crane',lay:'tower',wall:T.TOWER,rooms:{boss:[1,2,21,9],arena:[1,11,21,17]},
    card:'Something inside is still ticking.',miniCard:'The tower\'s guardian winds itself up.',miniDone:'The Clockwork Sentinel winds down. The gate above swings open!',
    done:'The roof gate swings open, and a chest ticks in the clock chamber.',
    gates:['The door of the Folded Clocktower is wound tight. Its gears only stir once the Great Crane has fallen.','A brass gate. Somewhere on this floor a crank must wind it open.',
      'This gate opens when the tower\'s guardian falls.','The roof gate answers only to the Mainspring.'],rows:[
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
    '#######################']},
  // the Hollow Archive, after the Leviathan: tear the seam (Seam Ripper) to reach the crank, sew the torn curtain (Golden Needle),
  // peel the last wall, beat the Stack Warden, then the Bookmoth; the long rope beside the stacks leads back up
  arch:{name:'The Hollow Archive',mini:'warden',boss:'bookmoth',minion:'mothling',need:'lev',ground:6,carve:1,far:46,lay:'archive',wall:T.SEAL,rooms:{boss:[1,32,21,45],arena:[1,22,21,30]},
    card:'Pages rustle somewhere far below.',miniCard:'The keeper of the stacks closes its ledger.',miniDone:'The Stack Warden crumples. A gate in the floor swings open!',
    done:'The gate to the long rope swings open, and a chest settles in the Bookmoth\'s chamber.',
    gates:['The Hollow Archive is sealed with ink. It will only open once the Inkwell Leviathan is gone.','A gate in the floor. A crank somewhere on this floor should open it.',
      'This gate opens when the Stack Warden falls.','This gate answers only to the Bookmoth.'],rows:[
    '#~#~#~#~#~#~#~#~#~#~#~#~#',
    '#########################',
    '#.......................#',
    'E..T................T...#',
    'E.......................#',
    'E........b....bn........#',
    '######r################r#',
    '#.....r....#.......#..#r#',
    '#.T...r....#....T..#..#r#',
    '#.....r....#.......#..#r#',
    '#.....r....#.......#..#r#',
    '#.....r....S.......F..#r#',
    '#.....r....S.......F..#r#',
    '#.b.b.r.Cb.S.b..K..FcH#r#',
    '##GGG##################r#',
    '#..r.....##....#......#r#',
    '#..r..T..##..T.#......#r#',
    '#..r.....PP....#......#r#',
    '#..r.....PP....L....r.#r#',
    '#..r.....PP....L....r.#r#',
    '#b.r.b.b.PP.bn.L....r.#r#',
    '####################r##r#',
    '#...................r.#r#',
    '#...................r.#r#',
    '#.T................Tr.#r#',
    '#...................r.#r#',
    '#...................r.#r#',
    '#===...............=r=#r#',
    '#...................r.#r#',
    '#...................r.#r#',
    '#.....M.............r.#r#',
    '##########AAA##########r#',
    '#.....................#r#',
    '#.....................#r#',
    '#.....................#r#',
    '#.T.................T.#r#',
    '#..........X..........#r#',
    '#.....................#r#',
    '#.....................#r#',
    '#===...............===#r#',
    '#.....................#r#',
    '#.T.................T.#r#',
    '#........=====........#r#',
    '#.....................Br#',
    '#.....................Br#',
    '#...b.b.........R.b...Br#',
    '#########################']}};
const GATE={E:0,G:1,A:2,B:3};
// placed dungeons live in the saved biome data: BIO.dun[key] = {x, y (the bottom row), w, h, g: {gate: [[tile index, tile when open]...]},
// st: progress (e front door, g crank, m mini-boss beaten, c reward given), m/b/r: mini-boss, boss and reward cells, rooms}, or null
// when the world had no room for it; BIO.dun.stacks = [[x, y, opened]] the Lost Stacks' sealed doors (the column's bottom cell)
const D=k=>BIO&&BIO.dun&&BIO.dun[k];
function lootFor(key,kind){const s=[];const add=(id,n)=>s.push({id,n});
  if(key==='arch'){if(kind==='C'){add('coin',randi(80,160));add('potion',randi(2,4));add('torch',randi(10,20));add('inkbar',randi(3,6));add('moonink',randi(2,5));if(Math.random()<.5)add(pick(['potiron','potregen','potswift']),randi(1,2));}
    else if(kind==='c'){add('coin',randi(200,350));add('bpup',1);add(pick(['b_quick','b_close','b_last','b_dip']),1);add('fstar',randi(3,6));}
    else{add('archkey',1);add('coin',randi(350,500));add('moonink',randi(6,10));add('bpup',1);}}
  else if(kind==='C'){add('coin',randi(60,140));add('potion',randi(2,4));add('torch',randi(10,20));add('rope',randi(20,40));add(pick(['goldbar','frostbar']),randi(3,6));if(Math.random()<.5)add(pick(['potiron','potregen','potswift']),randi(1,2));}
  else if(kind==='c'){add('coin',randi(150,300));add('cog',randi(3,5));add('bpup',1);add(pick(['b_quick','b_close','b_last','toolbelt']),1);}
  else{add('clockwings',1);add('coin',randi(300,450));add('skyore',randi(8,14));add('cog',randi(4,8));}
  // a trading card: often in the plain chests, always in the secret chest and the reward (issue #67)
  if(kind!=='C'||Math.random()<.5)add(cardId(kind==='C'?1:2),1);
  while(s.length<20)s.push(null);return s;}
// stamp a template with its ground row on ground level L at column x0 (fills dirt under the ground row's neighbours, clears
// a way in on the left)
function stamp(key,x0,L){const dg=DUNGEONS[key],rows=dg.rows,h=rows.length,w=rows[0].length,G=dg.ground??h-1,g={0:[],1:[],2:[],3:[]},o={x:x0,y:L-(h-1-G),w,h,g,st:{}};
  const at=(c,r)=>[x0+c,L+(G-r)],ch=(c,r)=>r>=0&&r<h&&c>=0&&c<w?rows[r][c]:' ';
  for(let x=x0-3;x<x0+w+2;x++){for(let y=Math.min(surf[x],L)-2;y<L;y++){const i=idx(x,y);if(tiles[i]===T.AIR||tiles[i]===T.TUFT||tiles[i]===T.FLOWER||tiles[i]===T.FLOWER2){tiles[i]=T.DIRT;walls[i]=0;}}
    if(surf[x]<L)surf[x]=L;if(x<x0||x>=x0+w){const i=idx(x,L);if(!tiles[i]||tiles[i]===T.TUFT)tiles[i]=T.GRASS;for(let y=L+1;y<=L+4;y++){const j=idx(x,y);if(x<x0){tiles[j]=T.AIR;meta[j]=0;walls[j]=0;}}}}
  for(let r=0;r<h;r++)for(let c=0;c<w;c++){const k=rows[r][c],[x,y]=at(c,r),i=idx(x,y);let t=T.AIR,m=0,wl=3;chests.delete(i);
    switch(k){case '~':wl=0;break;case '#':t=dg.wall;break;case '=':t=T.PLATFORM;break;case 'r':t=T.ROPE;break;case 'K':t=T.CRANK;break;case 'L':t=T.PEEL;m=1;break;
      case 'k':t=T.SKETCH;m=1;break;case 'F':t=T.FAKE;m=1;break;case 'H':t=T.HEART;break;case 'T':t=T.TORCH;break;case 'O':t=T.CLOCK;break;
      case 'S':t=T.SEAM;break;case 'P':t=T.RIP;break;case 'b':t=T.SHELF;break;case 'n':t=T.CANDLE;break;
      case 'C':case 'c':t=T.CHEST;chests.set(i,lootFor(key,k));break;case 'M':o.m=[x,y];break;case 'X':o.b=[x,y];break;case 'R':o.r=[x,y];break;
      case 'E':case 'G':case 'A':case 'B':{t=T.GATE;m=GATE[k];const rope=ch(c,r-1)==='r'||ch(c,r+1)==='r';g[m].push([i,k==='E'?T.AIR:rope?T.ROPE:k==='B'?T.AIR:T.PLATFORM]);break;}}
    tiles[i]=t;meta[i]=m;walls[i]=wl;}
  const box=([c0,r0,c1,r1])=>{const[a,b]=at(c0,r1),[cc,d]=at(c1,r0);return[a,b,cc,d];};o.rooms={};for(const k in dg.rooms)o.rooms[k]=box(dg.rooms[k]);return o;}
const NATURAL=new Set([T.AIR,T.GRASS,T.DIRT,T.STONE,T.SAND,T.SNOW,T.ICE,T.TUFT,T.FLOWER,T.FLOWER2,T.MUSH,T.BLOOM,T.TRUNK,T.COPPER,T.IRON,T.GOLD,T.CROP,T.DRIFT,T.RUBBLE]);
// Dungeons are planned at generation (gen) and, for saves made before the Clocktower existed, the first time the save loads.
// A spot must be fairly flat on top, away from the town, the Ink Lake, the camps and the other dungeons, and a sunk dungeon
// must end above the Pressed Deep. On load it must also be untouched natural ground and rock (no placed walls, chests or builds),
// so a world with no such spot gets none (BIO.dun[key] = null) rather than one stamped over the player's work. A dungeon dug
// into the rock (carve) is too big to find untouched rock for, so it is only placed at generation, where it takes the spot that
// cuts the fewest generated structures (never another dungeon, the Pressed Deep, ink or lava; chests under it are dropped):
// older saves don't get it. The Lost Stacks are planned once, after the dungeons, and only where the Hollow Archive is.
export function planDungeons(sd,gen){if(!BIO||!BIO.uw)return;const dn=BIO.dun||(BIO.dun={});let n=0;
  for(const k in DUNGEONS){n++;if(dn[k]===undefined)dn[k]=DUNGEONS[k].carve&&!gen?null:place(k,mulberry32(sd+733*n),gen);}
  if(dn.stacks===undefined)dn.stacks=dn.arch?planStacks(mulberry32(sd+977)):null;}
const KEEP=new Set([T.TOWER,T.GATE,T.SEAL,T.DEEP,T.INK,T.LAVA,T.CORE,T.MACHINE,T.BONE]);
function place(k,r,gen){const dg=DUNGEONS[k],w=dg.rows[0].length,h=dg.rows.length,G=dg.ground??h-1,dn=BIO.dun,floor=BIO.deep?BIO.deep[1]:BIO.uw,cut=dg.carve&&gen,cand=[];
  for(let x0=24;x0<W-24-w;x0+=2){if(Math.abs(x0+w/2-SPAWNX)<(dg.far||70)||BIO.lake&&Math.abs(x0+w/2-BIO.lake[0])<BIO.lake[1]+w/2+20)continue;if((BIO.camps||[]).some(c=>Math.abs(c.x0+5-(x0+w/2))<w/2+18))continue;
    if(Object.values(dn).some(o=>o&&o.w&&Math.abs(o.x+o.w/2-(x0+w/2))<(o.w+w)/2+(dg.carve?8:30)))continue;
    let lo=1e9,hi=-1;for(let x=x0-3;x<x0+w+2;x++){lo=Math.min(lo,surf[x]);hi=Math.max(hi,surf[x]);}const L=hi,B=L-(h-1-G);if(hi-lo>7||L+G+4>H-3||B<floor+8)continue;
    let ok=true,n=0;for(let x=x0-3;x<x0+w+2&&ok;x++)for(let y=Math.min(lo-3,B-2);y<L+G+3;y++){const i=idx(x,y);if(!NATURAL.has(tiles[i])||walls[i]>1||chests.has(i)){if(!cut||KEEP.has(tiles[i])){ok=false;break;}n++;}}if(ok)cand.push([x0,L,n]);}
  if(!cand.length)return null;const best=Math.min(...cand.map(c=>c[2])),pool=cand.filter(c=>c[2]<=best+40),[x0,L]=pool[Math.floor(r()*pool.length)];return stamp(k,x0,L);}
// the Lost Stacks: small reading rooms sealed in the rock of deep caves, their doors a shelf sealed with ink (T.STACKS) facing a
// cave floor, their shell unbreakable (T.SEAL), so the Archive Key is the only way in. Each holds a chest of treasure.
const ROCK=new Set([T.STONE,T.DIRT,T.COPPER,T.IRON,T.GOLD,T.ICE,T.SNOW,T.SAND,T.FROST,T.INKSTONE,T.INKORE]);
function stacksLoot(){const s=[];const add=(id,n)=>s.push({id,n});add('coin',randi(250,450));add('bpup',1);add(pick(['b_quick','b_close','b_last','b_dip','b_nice']),1);
  add(pick(['moonink','inkbar','goldbar']),randi(6,12));add(pick(['moontome','moonbow','kite','beacon','quilt','magnet','glider']),1);if(Math.random()<.6)add('fstar',randi(3,6));add(cardId(2),1);while(s.length<20)s.push(null);return s;}
function planStacks(rng){const out=[],lx=BIO.lake?BIO.lake[0]:-1e4,spots=[];
  const rock=(x0,x1,y0,y1)=>{if(x0<2||x1>W-3||y0<2||y1>H-3)return false;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=idx(x,y);if(walls[i]>1||!ROCK.has(tiles[i])||chests.has(i))return false;}return true;};
  for(let y=BIO.uw+12;y<H-8;y++)for(let x=12;x<W-12;x++){if(y>surf[x]-20||Math.abs(x-SPAWNX)<40||Math.abs(x-lx)<30||!SOLID[tiles[idx(x,y-1)]])continue;let ok=true;for(let q=0;q<=2&&ok;q++){const i=idx(x,y+q);if(tiles[i]!==T.AIR||walls[i]>1)ok=false;}if(ok)spots.push([x,y]);}
  for(let i=spots.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[spots[i],spots[j]]=[spots[j],spots[i]];}
  const n=Math.max(2,Math.round(W/180));
  for(const[x,y]of spots){if(out.length>=n)break;if(out.some(o=>Math.abs(o[0]-x)<40&&Math.abs(o[1]-y)<24))continue;
    for(const d of[1,-1]){const c=k=>x+k*d;if(!rock(Math.min(c(1),c(11)),Math.max(c(1),c(11)),y-1,y+4))continue;
      for(let k=1;k<=11;k++)for(let q=-1;q<=4;q++){const edge=k===1||k===11||q===-1||q===4,i=idx(c(k),y+q);tiles[i]=edge?T.SEAL:T.AIR;meta[i]=0;walls[i]=3;}
      for(let q=0;q<=2;q++)tiles[idx(c(1),y+q)]=T.STACKS;
      for(const k of[3,4,9,10])tiles[idx(c(k),y)]=T.SHELF;tiles[idx(c(6),y)]=T.CANDLE;const ci=idx(c(7),y);tiles[ci]=T.CHEST;chests.set(ci,stacksLoot());
      out.push([c(1),y,0]);break;}}
  return out;}
const opening=new Set();
export function stacksAt(x,y){if(!countItem('archkey')){toast('Shelves sealed shut with ink, a keyhole in the middle. The key of the Hollow Archive would fit it.');SFX.pick();return;}
  // a door already dissolving ignores more clicks (a door saved halfway can still be opened on a later load)
  let y0=y;while(tiles[idx(x,y0-1)]===T.STACKS)y0--;const k=idx(x,y0);if(opening.has(k))return;opening.add(k);const b=BIO,s=(b.dun&&b.dun.stacks||[]).find(s=>s[0]===x&&Math.abs(s[1]-y)<=3);let n=0;
  for(let yy=y0;tiles[idx(x,yy)]===T.STACKS;yy++,n++){const cy=yy;setTimeout(()=>{if(BIO!==b||tiles[idx(x,cy)]!==T.STACKS)return;setTile(x,cy,T.AIR);burst(x+.5,cy+.5,['#3a2a5a','#e0b0ff','#e9dcc0'],10,4);SFX.rustle(.2,.6);},n*120);}
  setTimeout(()=>opening.delete(k),n*120+1);
  if(s)s[2]=1;SFX.door();tone(330,494,.4,'triangle',.06);toast('The ink seal dissolves. Behind it: the Lost Stacks!','gold');stat('stacks');}
const inD=(d,x,y)=>x>=d.x&&x<d.x+d.w&&y>=d.y&&y<d.y+d.h+1;
// which dungeon a point is in (its key), or null
export function dunAt(x,y){if(!BIO||!BIO.dun)return null;for(const k in DUNGEONS){const d=D(k);if(d&&inD(d,x,y))return k;}return null;}
export const inClock=(x,y)=>{const d=D('clock');return!!d&&inD(d,x,y);};
export const clockNear=(x0,x1)=>{const d=D('clock');return!!d&&x0<d.x+d.w&&x1>=d.x;};
export const dunRoom=k=>{const d=D(k);return d?d.rooms.boss:null;};
export const clockRoom=()=>dunRoom('clock');
const inRoom=(b,x,y)=>x>=b[0]&&x<b[2]+1&&y>=b[1]&&y<b[3]+1;
function openGate(d,g,fx=true){for(const[i,t]of d.g[g]){if(tiles[i]!==T.GATE)continue;const x=i%W,y=(i/W)|0;setTile(x,y,t,0);if(fx)burst(x+.5,y+.5,['#c9a24a','#e0b04a','#fbf8f0'],6,3,{grav:3});}
  if(fx){SFX.door();tone(220,330,.35,'square',.05);tone(330,440,.3,'triangle',.06,.2);shake(.2);}}
function closeGate(d,g){for(const[i]of d.g[g]){const x=i%W,y=(i/W)|0;if(tiles[i]!==T.GATE)setTile(x,y,T.GATE,g);}SFX.door();tone(330,180,.4,'square',.06);shake(.25);}
export function gateAt(x,y){const k=dunAt(x,y),d=D(k);if(!d)return;const dg=DUNGEONS[k],g=meta[idx(x,y)]&3;
  if(g===0&&quests[dg.need]){d.st.e=1;openGate(d,0);chapterCard(null,dg.name,dg.card,'A dungeon');stat('dungeons');return;}
  toast(dg.gates[g]);SFX.pick();}
export function crankAt(x,y){const d=D(dunAt(x,y)),i=idx(x,y);if(!d||meta[i]&1){toast('The crank is wound tight.');return;}setTile(x,y,T.CRANK,1);d.st.g=1;SFX.nice();tone(180,260,.5,'sawtooth',.04);
  const b=BIO;setTimeout(()=>{if(BIO!==b)return;openGate(d,1);toast('Somewhere nearby, a gate grinds open.','gold');},600);}
// fights: the mini-boss appears when you step into the arena and the boss when you reach its chamber (which shuts behind you).
// Leaving the dungeon or falling in the fight resets it, so a lost fight never strands the boss outside or the player inside.
const miniE={};let dunT=0;
const drop=e=>{removeEnemy(e);const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);};
export function updateDungeons(dt){if(!BIO||!BIO.dun||(dunT-=dt)>0)return;dunT=.25;for(const k in DUNGEONS){const d=D(k);if(d)runDungeon(k,d);}}
function runDungeon(k,d){const dg=DUNGEONS[k],p=player,px=p.x,py=p.y+.9,st=d.st,inside=inD(d,px,py)&&!p.dead,q=EN[dg.boss].quest,m=miniE[k];
  const clear=()=>{if(dg.minion)for(const o of enemies.filter(o=>o.type===dg.minion&&!o.dying)){burst(o.x,o.y+o.h/2,EN[o.type].col,8,3);drop(o);}};
  if(!st.m){if(m&&(m.dying||!enemies.includes(m))){if(m.hp<=0){st.m=1;openGate(d,2);toast(dg.miniDone,'gold');}miniE[k]=null;}
    else if(m&&!inside){drop(m);miniE[k]=null;}
    else if(!m&&inside&&inRoom(d.rooms.arena,px,py)&&d.m){const e=miniE[k]=makeElite(spawnEnemy(dg.mini,d.m[0]+.5,d.m[1]));e.vy=6;burst(e.x,e.y+1,['#c9a24a','#fbf8f0'],24,6);SFX.boom();shake(.3);
      chapterCard(null,EN[dg.mini].name,dg.miniCard,'Mini-boss');}}
  const e=boss&&boss.type===dg.boss?boss:null;
  if(e&&!e.defeat&&!inside){drop(e);setBoss(null);$('boss').hidden=true;resetBossFx();clear();if(st.m)openGate(d,2,false);}
  else if(!e&&!boss&&st.m&&!quests[q]&&inside&&p.onGround&&inRoom(d.rooms.boss,px,p.y+.05)&&d.b){closeGate(d,2);spawnEnemy(dg.boss,d.b[0]+.5,d.b[1]-1);}
  if(quests[q]&&!st.c){st.c=1;clear();openGate(d,2,false);openGate(d,3);if(d.r){const i=idx(d.r[0],d.r[1]);if(tiles[i]===T.AIR){setTile(d.r[0],d.r[1],T.CHEST);chests.set(i,lootFor(k,'R'));}}
    setTimeout(()=>toast(dg.done,'gold'),1500);}}

