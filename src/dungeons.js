// Hand-built dungeons: layouts stored as text templates and stamped into the world. The Great Scrapworks and the Folded
// Clocktower stand on the surface; the Hollow Archive is dug into the rock under a small gatehouse, and its key opens the Lost
// Stacks; the Origami Observatory floats among the sky islands, and its lens opens the Star Vaults; the Sunken Inkwell Temple is
// dug in under the Ink Lake's shore. The Scrapworks' Crowbar opens the Supply Crates and the Temple's Well Nib the Ink Wells.
import {
  $,BIO,boss,burst,cardId,chapterCard,hurtPlayer,chests,countItem,EN,enemies,H,idx,makeElite,meta,mulberry32,pick,player,quests,randi,
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
//   V telescope   Q crease that folds to its partner q (the Bone Folder folds from Q; q always folds back)   Y skystone   U cloud
//   Z shredder (bites and throws you up)   i ink (static, like every liquid here: swim through it)
// Rooms are rectangles in template cells [col0, row0, col1, row1]: 'arena' starts the mini-boss fight, 'boss' the boss fight.
// need: the quest that opens the front door. cut: at generation it may take the spot that cuts the fewest generated structures, like a
// dug-in dungeon (small worlds are crowded), and on load it still needs untouched ground. lake: placed near the Ink Lake's shore when it can be. sky: placed in empty sky among the islands instead of on the ground. far: how far from the town it stays (70 columns unless set). lay: what layerAt() calls the inside (no foes spawn there). minion: foes the boss
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
    '#########################']},
  // the Origami Observatory, after the Folio: it floats among the sky islands (sky: stamped into empty sky, its ground row a
  // floor over a skystone foundation). The crank is sealed in a vault that only a fold reaches (Q on the hall floor, its
  // partner q inside, which folds you back out tool or not); then the Stargazer, and the Starfold under the dome. The roof
  // hatch opens onto the sky when it falls
  obs:{name:'The Origami Observatory',mini:'gazer',boss:'starfold',need:'folio',sky:1,lay:'observatory',wall:T.DOME,rooms:{boss:[5,4,25,10],arena:[5,12,25,18]},
    card:'Paper stars turn slowly overhead.',miniCard:'The keeper of the charts looks up from its lens.',miniDone:'The Stargazer folds shut. A hatch in the ceiling swings open!',
    done:'The dome\'s hatch swings open to the sky, and a chest glints under the telescope.',
    gates:['The Origami Observatory is shut like a folded chart. It will only open once the Charred Folio has burned out.','A brass hatch. The crank that opens it is sealed away somewhere on this floor.',
      'This hatch opens when the Stargazer falls.','The dome\'s hatch answers only to the Starfold.'],rows:[
    '~~~~~~~~~~~###BBB###~~~~~~~',
    '~~~~~~~~~##....r....##~~~~~',
    '~~~~~~~##......r......##~~~',
    '~~~~~~#........r........#~~',
    '~~~~~#.T.......r.......T.#~',
    '~~~~#..........r..........#',
    '~~~~#==........r........==#',
    '~~~~#.........Xr..........#',
    '~~~~#..........r..........#',
    '~~~~#..........r..........#',
    '~~~~#....V.....r....R.....#',
    '~~~~##########AAA##########',
    '~~~~#..........r..........#',
    '~~~~#.T........r........T.#',
    '~~~~#..........r..........#',
    '~~~~###........r........==#',
    '~~~~#..F...............r..#',
    '~~~~#..F...............r..#',
    '~~~~#cHF........M......r..#',
    '~~~~##################GGG##',
    '~~~~#......#....#......r..#',
    '~~~~#.T....#....#......r.T#',
    '~~~~#.q..K.#....#......r..#',
    '~~~~########....#......r..#',
    '~~~~#.......T...L......r..#',
    '~~~~E...........L......r..#',
    '~~~~E...........L......r..#',
    '~~~~E...Q.......L......r.C#',
    'UUUU#######################',
    '~~~~~YYYYYYYYYYYYYYYYYYYYY~',
    '~~~~~~YYYYYYYYYYYYYYYYYYY~~',
    '~~~~~~~UUYYYYYYYYYYYYYUU~~~',
    '~~~~~~~~~~UUU~~~~~UUU~~~~~~']},
  // the Sunken Inkwell Temple, after The Unfolded: dug in beside the Ink Lake under a small gatehouse. Swim down the ink shaft,
  // tear the seam, fold into the crank's vault, sew the torn curtain and peel the last wall, then the Drowned Scribe and the Grand
  // Nib; the long rope beside the halls leads back up
  temple:{name:'The Sunken Inkwell Temple',mini:'scribe',boss:'nib',minion:'blot',need:'unfolded',ground:6,carve:1,lake:1,far:46,lay:'inkwell',wall:T.SEAL,rooms:{boss:[1,29,21,38],arena:[1,21,21,27]},
    card:'The ink here is older than the page.',miniCard:'A scribe who never stopped writing, even underwater.',miniDone:'The Drowned Scribe dissolves. A gate in the floor swings open!',
    done:'The gate to the long rope swings open, and a chest surfaces in the Grand Nib\'s chamber.',
    gates:['The Sunken Inkwell Temple is sealed with the oldest ink there is. Only the one who solved the ink shrine\'s riddle may enter.','A gate in the floor. The crank that opens it is sealed away somewhere on this floor.',
      'This gate opens when the Drowned Scribe falls.','This gate answers only to the Grand Nib.'],rows:[
    '#~#~#~#~#~#~#~#~#~#~#~#~#',
    '#########################',
    '#.......................#',
    'E..T.......n.......T....#',
    'E.......................#',
    'E......n.......n........#',
    '#####iii###############r#',
    '#...#iii#......S....T.#r#',
    '#.T.#iii#......S......#r#',
    '#...#iii#......S......#r#',
    '#q.K#iii#......S......#r#',
    '#####iii#......S......#r#',
    '#.T..iii.......S......#r#',
    '#.........bn...S.b.Q..#r#',
    '###################GGG#r#',
    '#..r......PP..#.....r.#r#',
    '#..r..T...PP..#.T...r.#r#',
    '#..r......PP..L.....r.#r#',
    '#..r......PP..L.....r.#r#',
    '#..r..b.b.PP..L..b..r.#r#',
    '###r###################r#',
    '#..r..................#r#',
    '#..rT..............T..#r#',
    '#..r..................#r#',
    '#..r==............===.#r#',
    '#...................FH#r#',
    '#...................F.#r#',
    '#..........M........Fc#r#',
    '##########AAA##########r#',
    '#.....................#r#',
    '#.T.................T.#r#',
    '#..........X..........#r#',
    '#.....................#r#',
    '#===...............===#r#',
    '#.....................#r#',
    '#.T.................T.#r#',
    '#.....................Br#',
    '#.....................Br#',
    '#...n.b.........R.b...Br#',
    '#########################']},
  // the Great Scrapworks, after the King Slime: an early dungeon built from the paper tricks you start with. Peel the wall at the
  // door, flatten through the crawlspace to the crank, pop the sketched bridge over the shredder pit, then the Scrap Foreman and
  // the Pulper; the roof hatch lets you out
  scrap:{name:'The Great Scrapworks',mini:'foreman',boss:'pulper',minion:'crumple',need:'king',far:46,cut:1,lay:'scrapworks',wall:T.SCRAP,rooms:{boss:[1,3,21,9],arena:[1,11,21,17]},
    card:'Somewhere inside, rollers are still turning.',miniCard:'The foreman wants to see your work order.',miniDone:'The Scrap Foreman clocks out. A hatch in the ceiling swings open!',
    done:'The roof hatch swings open, and a bin of salvage clatters down in the pulping room.',
    gates:['The Great Scrapworks is chained shut. The chain looks like it would give once the King Slime stops bouncing.','A hatch in the ceiling. A crank somewhere on this floor should open it.',
      'This hatch opens when the Scrap Foreman falls.','The roof hatch answers only to the Pulper.'],rows:[
    '~~##~~~~~~~~~~~~~~~##~~',
    '~~##~~~~~~~~~~~~~~~##~~',
    '##########BBB##########',
    '#..........r..........#',
    '#.T........r........T.#',
    '#..........r..........#',
    '#==........r........==#',
    '#.....X....r..........#',
    '#.....................#',
    '#...............R.....#',
    '##########AAA##########',
    '#..........r..........#',
    '#.T........r........T.#',
    '#..........r..........#',
    '#==........r........==#',
    '#.....................#',
    '#..................r..#',
    '#.....M............r..#',
    '##################=r=##',
    '#..................r..#',
    '#.T................r..#',
    '#..................rF.#',
    '#.r................rFH#',
    '#.r................rFc#',
    '#GGG#kkkkkkkkk#########',
    '#.r.#.........#########',
    '#.r.#.........#########',
    '#.r.#ZZZZZZZZZ#########',
    '#.r.###################',
    '#.r..........##..#....#',
    '#.r.T........##..#..T.#',
    '#.r..........##..L....E',
    '#.r..........##..L....E',
    '#..K.C...........L....E',
    '#######################']}};
const GATE={E:0,G:1,A:2,B:3};
// placed dungeons live in the saved biome data: BIO.dun[key] = {x, y (the bottom row), w, h, g: {gate: [[tile index, tile when open]...]},
// st: progress (e front door, g crank, m mini-boss beaten, c reward given), m/b/r: mini-boss, boss and reward cells, rooms, fold:
// [[ax, ay, bx, by]] crease pairs}, or null when the world had no room for it; BIO.dun.stacks = [[x, y, opened]] the Lost Stacks'
// sealed doors (the column's bottom cell), BIO.dun.vaults the same for the Star Vaults
const D=k=>BIO&&BIO.dun&&BIO.dun[k];
function lootFor(key,kind){const s=[];const add=(id,n)=>s.push({id,n});
  if(key==='scrap'){if(kind==='C'){add('coin',randi(40,90));add('potion',randi(2,3));add('torch',randi(10,20));add('rope',randi(20,30));add(pick(['ironbar','goldbar']),randi(3,6));if(Math.random()<.5)add(pick(['potiron','potswift']),1);}
    else if(kind==='c'){add('coin',randi(120,200));add('bpup',1);add(pick(['b_quick','b_close','b_stomp','toolbelt']),1);}
    else{add('crowbar',1);add('coin',randi(200,300));add('goldbar',randi(6,10));add('gel',randi(15,25));}}
  else if(key==='temple'){if(kind==='C'){add('coin',randi(200,320));add('potion',randi(3,5));add('foilbar',randi(2,4));add('moonink',randi(4,8));if(Math.random()<.5)add(pick(['potiron','potregen','potswift']),randi(1,2));}
    else if(kind==='c'){add('coin',randi(400,600));add('bpup',1);add(pick(['b_quick','b_close','b_last','b_dip','b_nice']),1);add('foilbar',randi(3,6));}
    else{add('wellnib',1);add('coin',randi(800,1100));add('foilbar',randi(8,12));add('bpup',1);}}
  else if(key==='obs'){if(kind==='C'){add('coin',randi(100,180));add('potion',randi(3,5));add('torch',randi(10,20));add('skybar',randi(3,6));add('emberbar',randi(2,4));add('fstar',randi(3,6));if(Math.random()<.5)add(pick(['potiron','potregen','potswift']),randi(1,2));}
    else if(kind==='c'){add('coin',randi(250,400));add('bpup',1);add(pick(['b_quick','b_close','b_last','b_dip','b_nice']),1);add('fstar',randi(5,8));}
    else{add('starlens',1);add('coin',randi(450,650));add('skybar',randi(8,12));add('bpup',1);}}
  else if(key==='arch'){if(kind==='C'){add('coin',randi(80,160));add('potion',randi(2,4));add('torch',randi(10,20));add('inkbar',randi(3,6));add('moonink',randi(2,5));if(Math.random()<.5)add(pick(['potiron','potregen','potswift']),randi(1,2));}
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
function stamp(key,x0,L){const dg=DUNGEONS[key],rows=dg.rows,h=rows.length,w=rows[0].length,G=dg.ground??h-1,g={0:[],1:[],2:[],3:[]},o={x:x0,y:L-(h-1-G),w,h,g,st:{}},fq={};
  const at=(c,r)=>[x0+c,L+(G-r)],ch=(c,r)=>r>=0&&r<h&&c>=0&&c<w?rows[r][c]:' ';
  if(!dg.sky)for(let x=x0-3;x<x0+w+2;x++){for(let y=Math.min(surf[x],L)-2;y<L;y++){const i=idx(x,y);if(tiles[i]===T.AIR||tiles[i]===T.TUFT||tiles[i]===T.FLOWER||tiles[i]===T.FLOWER2){tiles[i]=T.DIRT;walls[i]=0;}}
    if(surf[x]<L)surf[x]=L;if(x<x0||x>=x0+w){const i=idx(x,L);if(!tiles[i]||tiles[i]===T.TUFT)tiles[i]=T.GRASS;for(let y=L+1;y<=L+4;y++){const j=idx(x,y);if(x<x0){tiles[j]=T.AIR;meta[j]=0;walls[j]=0;}}}}
  for(let r=0;r<h;r++)for(let c=0;c<w;c++){const k=rows[r][c],[x,y]=at(c,r),i=idx(x,y);let t=T.AIR,m=0,wl=3;chests.delete(i);
    switch(k){case '~':wl=0;break;case '#':t=dg.wall;break;case '=':t=T.PLATFORM;break;case 'r':t=T.ROPE;break;case 'K':t=T.CRANK;break;case 'L':t=T.PEEL;m=1;break;
      case 'k':t=T.SKETCH;m=1;break;case 'F':t=T.FAKE;m=1;break;case 'H':t=T.HEART;break;case 'T':t=T.TORCH;break;case 'O':t=T.CLOCK;break;
      case 'S':t=T.SEAM;break;case 'P':t=T.RIP;break;case 'b':t=T.SHELF;break;case 'n':t=T.CANDLE;break;
      case 'V':t=T.SCOPE;break;case 'Y':t=T.SKYSTONE;wl=0;break;case 'U':t=T.CLOUD;wl=0;break;case 'Q':case 'q':t=T.CREASE;fq[k]=[x,y];break;case 'Z':t=T.SHRED;break;case 'i':t=T.INK;break;
      case 'C':case 'c':t=T.CHEST;chests.set(i,lootFor(key,k));break;case 'M':o.m=[x,y];break;case 'X':o.b=[x,y];break;case 'R':o.r=[x,y];break;
      case 'E':case 'G':case 'A':case 'B':{t=T.GATE;m=GATE[k];const rope=ch(c,r-1)==='r'||ch(c,r+1)==='r';g[m].push([i,k==='E'?T.AIR:rope?T.ROPE:k==='B'?T.AIR:T.PLATFORM]);break;}}
    tiles[i]=t;meta[i]=m;walls[i]=wl;}
  const box=([c0,r0,c1,r1])=>{const[a,b]=at(c0,r1),[cc,d]=at(c1,r0);return[a,b,cc,d];};o.rooms={};for(const k in dg.rooms)o.rooms[k]=box(dg.rooms[k]);
  if(fq.Q&&fq.q)o.fold=[[...fq.Q,...fq.q]];return o;}
const NATURAL=new Set([T.AIR,T.GRASS,T.DIRT,T.STONE,T.SAND,T.SNOW,T.ICE,T.TUFT,T.FLOWER,T.FLOWER2,T.MUSH,T.BLOOM,T.TRUNK,T.COPPER,T.IRON,T.GOLD,T.CROP,T.DRIFT,T.RUBBLE]);
// Dungeons are planned at generation (gen) and, for saves made before the Clocktower existed, the first time the save loads.
// A spot must be fairly flat on top, away from the town, the Ink Lake, the camps and the other dungeons, and a sunk dungeon
// must end above the Pressed Deep. On load it must also be untouched natural ground and rock (no placed walls, chests or builds),
// so a world with no such spot gets none (BIO.dun[key] = null) rather than one stamped over the player's work. A dungeon dug
// into the rock (carve) is too big to find untouched rock for, so it is only placed at generation, where it takes the spot that
// cuts the fewest generated structures (never another dungeon, the Pressed Deep, ink or lava; chests under it are dropped):
// older saves don't get it. The Lost Stacks are planned once, after the dungeons, and only where the Hollow Archive is.
// A sky dungeon waits for the sky islands (planSky), so generation and loading call this again after them; it needs only empty
// sky, so older saves get it on load too, and the Star Vaults its lens opens with it.
export function planDungeons(sd,gen){if(!BIO||!BIO.uw)return;const dn=BIO.dun||(BIO.dun={});let n=0;
  for(const k in DUNGEONS){n++;if(dn[k]!==undefined)continue;const dg=DUNGEONS[k];if(dg.sky&&!BIO.sky)continue;dn[k]=dg.carve&&!gen?null:dg.sky?placeSky(k,mulberry32(sd+733*n)):place(k,mulberry32(sd+733*n),gen);}
  if(dn.stacks===undefined)dn.stacks=dn.arch?planStacks(mulberry32(sd+977)):null;
  if(dn.vaults===undefined&&dn.obs!==undefined)dn.vaults=dn.obs?planVaults(mulberry32(sd+1013)):null;
  if(dn.crates===undefined)dn.crates=dn.scrap?planCrates(mulberry32(sd+1051)):null;
  if(dn.wells===undefined)dn.wells=dn.temple?planWells(mulberry32(sd+1093)):null;}
const KEEP=new Set([T.TOWER,T.GATE,T.SEAL,T.DEEP,T.INK,T.LAVA,T.CORE,T.MACHINE,T.BONE]);
// a lake dungeon keeps within 150 columns of the Ink Lake (it may stand right at the shore), or anywhere when nowhere there fits
// (relax); a dungeon that may cut (dg.cut) tries once more at generation with tighter margins (relax 2: a crowded small
// world still gets it, a little closer to the town, the camps, the lake and its neighbours); sky dungeons don't count for spacing, and a dungeon dug into the rock takes rougher ground (its gatehouse sits on a mound)
function place(k,r,gen,relax){const dg=DUNGEONS[k],w=dg.rows[0].length,h=dg.rows.length,G=dg.ground??h-1,dn=BIO.dun,floor=BIO.deep?BIO.deep[1]:BIO.uw,cut=(dg.carve||dg.cut)&&gen,cand=[];
  const shore=dg.lake&&!relax&&BIO.lake&&BIO.lake[0]>0,tight=relax===2;
  for(let x0=24;x0<W-24-w;x0+=2){if(shore&&Math.abs(x0+w/2-BIO.lake[0])>BIO.lake[1]+w/2+150)continue;if(Math.abs(x0+w/2-SPAWNX)<(tight?34:dg.far||70)||BIO.lake&&Math.abs(x0+w/2-BIO.lake[0])<BIO.lake[1]+w/2+(dg.lake||tight?4:dg.cut?10:20))continue;if((BIO.camps||[]).some(c=>Math.abs(c.x0+5-(x0+w/2))<w/2+(tight?4:dg.cut?10:18)))continue;
    if(Object.entries(dn).some(([q,o])=>o&&o.w&&!DUNGEONS[q].sky&&Math.abs(o.x+o.w/2-(x0+w/2))<(o.w+w)/2+(tight?3:dg.carve||dg.cut?8:DUNGEONS[q].carve?12:30)))continue;
    let lo=1e9,hi=-1;for(let x=x0-3;x<x0+w+2;x++){lo=Math.min(lo,surf[x]);hi=Math.max(hi,surf[x]);}const L=hi,B=L-(h-1-G);if(hi-lo>(dg.carve?10:7)||L+G+4>H-3||B<floor+8)continue;
    let ok=true,n=0;for(let x=x0-3;x<x0+w+2&&ok;x++)for(let y=Math.min(lo-3,B-2);y<L+G+3;y++){const i=idx(x,y);if(!NATURAL.has(tiles[i])||walls[i]>1||chests.has(i)){if(!cut||KEEP.has(tiles[i])){ok=false;break;}n++;}}if(ok)cand.push([x0,L,n]);}
  if(!cand.length)return shore?place(k,r,gen,1):cut&&!tight?place(k,r,gen,2):null;const best=Math.min(...cand.map(c=>c[2])),pool=cand.filter(c=>c[2]<=best+40),[x0,L]=pool[Math.floor(r()*pool.length)];return stamp(k,x0,L);}
// empty sky (no tile, no placed wall) in a rect, inside the world's edges
function openSky(x0,x1,y0,y1){if(x0<1||x1>W-2||y0<1||y1>H-2)return false;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=idx(x,y);if(tiles[i]!==T.AIR||walls[i])return false;}return true;}
// a sky dungeon floats in empty sky over the sky floor, near an island (horizontally within 24 columns) and as low as it fits,
// with three clear cells all round; among the spots nearest an island one is picked with the seed
function placeSky(k,r){const dg=DUNGEONS[k],rows=dg.rows,w=rows[0].length,h=rows.length,G=dg.ground??h-1,s=BIO.sky,cand=[];if(!s||!s.is||!s.is.length)return null;
  for(let x0=8;x0<W-8-w;x0+=2){const near=Math.min(...s.is.map(o=>Math.max(0,o[0]-(x0+w),x0-o[1])));if(near>24)continue;
    for(let L=s.y+3+(h-1-G);L+G+3<=H-2;L++)if(openSky(x0-3,x0+w+2,L-(h-1-G)-3,L+G+3)){cand.push([x0,L,near]);break;}}
  if(!cand.length)return null;const best=Math.min(...cand.map(c=>c[2])),pool=cand.filter(c=>c[2]<=best+8),[x0,L]=pool[Math.floor(r()*pool.length)];return stamp(k,x0,L);}
// the Star Vaults: small rooms sealed in star-chart paper, floating in the high sky, their door a star seal (T.STARDOOR) facing the
// nearest island with a cloud ledge outside it, their shell unbreakable (T.DOME), so the Star Lens is the only way in
function vaultLoot(){const s=[];const add=(id,n)=>s.push({id,n});add('coin',randi(350,550));add('bpup',1);add('skybar',randi(6,12));add('fstar',randi(6,10));
  add(pick(['kite','beacon','pendant','b_feather','glider','magnet']),1);if(Math.random()<.5)add(pick(['b_quick','b_close','b_last','b_nice']),1);add(cardId(2),1);while(s.length<20)s.push(null);return s;}
function planVaults(rng){const s=BIO.sky,out=[];if(!s||!s.is||!s.is.length)return out;const n=Math.max(2,Math.round(W/180));
  for(let t=0;t<800&&out.length<n;t++){const x0=12+Math.floor(rng()*(W-36)),y0=s.y+6+Math.floor(rng()*Math.max(1,H-18-s.y));
    if(out.some(o=>Math.abs(o[0]-x0)<40)||!openSky(x0-4,x0+15,y0-3,y0+9))continue;
    const cx=x0+5.5,isl=s.is.reduce((a,o)=>Math.abs((o[0]+o[1])/2-cx)<Math.abs((a[0]+a[1])/2-cx)?o:a),d=(isl[0]+isl[1])/2<cx?-1:1,dx=d<0?x0:x0+11;
    for(let x=x0;x<=x0+11;x++)for(let y=y0;y<=y0+6;y++){const i=idx(x,y),edge=x===x0||x===x0+11||y===y0||y===y0+6;tiles[i]=edge?T.DOME:T.AIR;meta[i]=0;walls[i]=3;}
    for(let y=y0+1;y<=y0+3;y++)tiles[idx(dx,y)]=T.STARDOOR;for(let k=1;k<=3;k++)tiles[idx(dx+d*k,y0)]=T.CLOUD;
    const c=q=>d<0?x0+q:x0+11-q;tiles[idx(c(3),y0+1)]=T.CANDLE;tiles[idx(c(6),y0+1)]=T.SCOPE;const ci=idx(c(9),y0+1);tiles[ci]=T.CHEST;chests.set(ci,vaultLoot());
    out.push([dx,y0+1,0]);}
  return out;}
// the Lost Stacks: small reading rooms sealed in the rock of deep caves, their doors a shelf sealed with ink (T.STACKS) facing a
// cave floor, their shell unbreakable (T.SEAL), so the Archive Key is the only way in. Each holds a chest of treasure.
const ROCK=new Set([T.STONE,T.DIRT,T.COPPER,T.IRON,T.GOLD,T.ICE,T.SNOW,T.SAND,T.FROST,T.INKSTONE,T.INKORE]);
function stacksLoot(){const s=[];const add=(id,n)=>s.push({id,n});add('coin',randi(250,450));add('bpup',1);add(pick(['b_quick','b_close','b_last','b_dip','b_nice']),1);
  add(pick(['moonink','inkbar','goldbar']),randi(6,12));add(pick(['moontome','moonbow','kite','beacon','quilt','magnet','glider']),1);if(Math.random()<.6)add('fstar',randi(3,6));add(cardId(2),1);while(s.length<20)s.push(null);return s;}
// sealed rooms in the rock beside a cave floor (the Lost Stacks, the Supply Crates, the Ink Wells): 11 wide and 6 tall, a door of
// o.door facing the floor, a shell of o.shell, the props o.deco ([column, tile]) and a chest at column 7. o.at(x, y) says which
// cave floors may take one, o.rock which tiles may be carved; away from the town and the lake, spread out, o.n of them
function planRooms(rng,o){const out=[],lx=BIO.lake?BIO.lake[0]:-1e4,spots=[],RK=o.rock||ROCK;
  const rock=(x0,x1,y0,y1)=>{if(x0<2||x1>W-3||y0<2||y1>H-3)return false;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=idx(x,y);if(walls[i]>1||!RK.has(tiles[i])||chests.has(i))return false;}return true;};
  for(let y=2;y<H-8;y++)for(let x=12;x<W-12;x++){if(!o.at(x,y)||Math.abs(x-SPAWNX)<40||Math.abs(x-lx)<30||!SOLID[tiles[idx(x,y-1)]])continue;let ok=true;for(let q=0;q<=2&&ok;q++){const i=idx(x,y+q);if(tiles[i]!==T.AIR||walls[i]>1)ok=false;}if(ok)spots.push([x,y]);}
  for(let i=spots.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[spots[i],spots[j]]=[spots[j],spots[i]];}
  for(const[x,y]of spots){if(out.length>=o.n)break;if(out.some(p=>Math.abs(p[0]-x)<40&&Math.abs(p[1]-y)<24))continue;
    for(const d of[1,-1]){const c=k=>x+k*d;if(!rock(Math.min(c(1),c(11)),Math.max(c(1),c(11)),y-1,y+4))continue;
      for(let k=1;k<=11;k++)for(let q=-1;q<=4;q++){const edge=k===1||k===11||q===-1||q===4,i=idx(c(k),y+q);tiles[i]=edge?o.shell:T.AIR;meta[i]=0;walls[i]=3;}
      for(let q=0;q<=2;q++)tiles[idx(c(1),y+q)]=o.door;
      for(const[k,t]of o.deco)tiles[idx(c(k),y)]=t;const ci=idx(c(7),y);tiles[ci]=T.CHEST;chests.set(ci,o.loot());
      out.push([c(1),y,0]);break;}}
  return out;}
const planStacks=rng=>planRooms(rng,{n:Math.max(2,Math.round(W/180)),at:(x,y)=>y>=BIO.uw+12&&y<=surf[x]-20,shell:T.SEAL,door:T.STACKS,deco:[[3,T.SHELF],[4,T.SHELF],[9,T.SHELF],[10,T.SHELF],[6,T.CANDLE]],loot:stacksLoot});
// the Supply Crates: nailed-shut storerooms in the shallow caves, above the Pressed Deep (the Scrapworks' Crowbar opens them)
function crateLoot(){const s=[];const add=(id,n)=>s.push({id,n});add('coin',randi(80,160));add(pick(['copperbar','ironbar','goldbar']),randi(5,10));add('torch',randi(10,20));add('rope',randi(15,30));
  add(pick(['potion','potiron','potswift','potregen']),randi(2,3));if(Math.random()<.35)add('bpup',1);if(Math.random()<.5)add(pick(['b_stomp','b_dip','b_heartf','glider','hook']),1);if(Math.random()<.5)add(cardId(1),1);while(s.length<20)s.push(null);return s;}
const planCrates=rng=>planRooms(rng,{n:Math.max(3,Math.round(W/140)),at:(x,y)=>y<=surf[x]-10&&y>=surf[x]-50&&y>(BIO.deep?BIO.deep[1]+6:BIO.uw+12),shell:T.SCRAP,door:T.CRATE,deco:[[3,T.POT],[4,T.POT],[9,T.POT],[5,T.TORCH]],loot:crateLoot});
// the Ink Wells: sealed grottos in the caverns of the Pressed Deep and the caves just above and below it (the Temple's Well Nib
// opens them); worlds with no Deep get none
function wellLoot(){const s=[];const add=(id,n)=>s.push({id,n});add('coin',randi(500,800));add('bpup',1);add('foilbar',randi(4,8));add('moonink',randi(8,14));
  add(pick(['b_quick','b_close','b_last','b_dip','b_nice']),1);if(Math.random()<.6)add('fstar',randi(4,8));add(cardId(2),1);while(s.length<20)s.push(null);return s;}
const ROCKD=new Set([...ROCK,T.DEEP,T.ASH,T.EMBERORE]);
const planWells=rng=>BIO.deep?planRooms(rng,{n:Math.max(2,Math.round(W/180)),at:(x,y)=>y>=BIO.deep[0]-10&&y<=BIO.deep[1]+10,rock:ROCKD,shell:T.SEAL,door:T.WELLDOOR,deco:[[3,T.CANDLE],[9,T.CANDLE],[5,T.SHELF]],loot:wellLoot}):[];
// a sealed door (a column of tile t) that an item opens, cell by cell; list is its BIO.dun list ([x, y, opened]), st the stat
const opening=new Set();
function unseal(x,y,t,item,list,locked,msg,cols,st){if(!countItem(item)){toast(locked);SFX.pick();return;}
  // a door already dissolving ignores more clicks (a door saved halfway can still be opened on a later load)
  let y0=y;while(tiles[idx(x,y0-1)]===t)y0--;const k=idx(x,y0);if(opening.has(k))return;opening.add(k);const b=BIO,s=(b.dun&&b.dun[list]||[]).find(s=>s[0]===x&&Math.abs(s[1]-y)<=3);let n=0;
  for(let yy=y0;tiles[idx(x,yy)]===t;yy++,n++){const cy=yy;setTimeout(()=>{if(BIO!==b||tiles[idx(x,cy)]!==t)return;setTile(x,cy,T.AIR);burst(x+.5,cy+.5,cols,10,4);SFX.rustle(.2,.6);},n*120);}
  setTimeout(()=>opening.delete(k),n*120+1);
  if(s)s[2]=1;SFX.door();tone(330,494,.4,'triangle',.06);toast(msg,'gold');stat(st);}
export const stacksAt=(x,y)=>unseal(x,y,T.STACKS,'archkey','stacks','Shelves sealed shut with ink, a keyhole in the middle. The key of the Hollow Archive would fit it.',
  'The ink seal dissolves. Behind it: the Lost Stacks!',['#3a2a5a','#e0b0ff','#e9dcc0'],'stacks');
export const vaultAt=(x,y)=>unseal(x,y,T.STARDOOR,'starlens','vaults','A door sealed with a paper star. Seen through the right lens, the star might come apart.',
  'The star seal unfolds. Behind it: a Star Vault!',['#232a58','#f7d046','#fff3c0'],'vaults');
export const crateAt=(x,y)=>unseal(x,y,T.CRATE,'crowbar','crates','A crate nailed shut, stamped SUPPLIES. A crowbar would pry it open.',
  'The nails squeal out. Behind the crate: a supply room!',['#a86b3a','#e9dcc0','#8d8f9a'],'crates');
export const wellAt=(x,y)=>unseal(x,y,T.WELLDOOR,'wellnib','wells','A door sealed with a drop of the oldest ink. It is waiting to be written open.',
  'You write a line across the seal, and it opens like a page. Behind it: an Ink Well!',['#3a2a5a','#6b4c8f','#c9a24a'],'wells');
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
// shredders (the Scrapworks' pit) bite whoever stands on them and throw them up
function shredCheck(){const p=player;if(p.dead||p.vy>0)return;const y=Math.floor(p.y-.05);for(let x=Math.floor(p.x-p.w/2);x<=Math.floor(p.x+p.w/2);x++)if(tiles[idx(x,y)]===T.SHRED){hurtPlayer(16,x+.5,null);p.vy=17;p.onGround=false;
  burst(p.x,p.y+.2,['#e6e1d6','#fbf8f0','#8d8f9a'],12,5,{grav:6});SFX.rustle(.3,.8);return;}}
export function updateDungeons(dt){if(!BIO||!BIO.dun)return;shredCheck();if((dunT-=dt)>0)return;dunT=.25;for(const k in DUNGEONS){const d=D(k);if(d)runDungeon(k,d);}}
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

