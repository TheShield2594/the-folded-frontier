// Tiles (T, TP and lookup arrays), items, badges and recipes.
import {C,METAL,SETCOL} from './game.js';

// ================= tiles =================
export const T={SCRAP:85,SHRED:86,CRATE:87,WELLDOOR:88,DOME:82,SCOPE:83,STARDOOR:84,STACKS:81,SEAM:77,RIP:78,SEWN:79,CREASE:80,SKYSTONE:68,CLOUD:69,SKYORE:70,DEEP:71,MACHINE:72,BONE:73,GATE:74,CRANK:75,TOWER:76,FAKE:64,DRIFT:65,THIN:66,SEAL:67,MURAL:63,RARE:62,FOIL:61,PEEL:55,SKETCH:56,SIGN:57,PEDESTAL:58,RUBBLE:59,ALTAR:60,CROP:52,ALCHEMY:53,PAINT5:54,PAINT1:39,PAINT2:40,PAINT3:41,PAINT4:42,BANR:43,BANB:44,BANG:45,LANTERNP:46,SHELF:47,CANDLE:48,POT:49,CLOCK:50,ARMCHAIR:51,SNOW:28,ICE:29,FROST:30,INKSTONE:31,INKORE:32,ASH:33,EMBERORE:34,ROPE:35,INK:36,LAVA:37,BLOOM:38,AIR:0,GRASS:1,DIRT:2,STONE:3,PLANK:4,TRUNK:5,COPPER:6,IRON:7,GOLD:8,SAND:9,TORCH:10,DOOR:11,TABLE:12,CHAIR:13,CHEST:14,BENCH:15,BRICK:16,GLASS:17,PLATFORM:18,FURNACE:19,ANVIL:20,BED:21,HEART:22,TUFT:23,FLOWER:24,MUSH:25,CORE:26,FLOWER2:27};
export const TP=[];export const SOLID=new Uint8Array(128),OPAQUE=new Uint8Array(128),LB=new Uint8Array(128),LIGHT=new Uint8Array(128);
function def(id,o){TP[id]=Object.assign({hard:.5,pick:0,drop:null,light:0,solid:false,col:'#888'},o);SOLID[id]=o.solid?1:0;OPAQUE[id]=o.solid&&id!==T.DOOR?1:0;LB[id]=OPAQUE[id]&&id!==T.GLASS?1:0;LIGHT[id]=o.light||0;}
def(T.AIR,{hard:0,col:'#000'});
def(T.GRASS,{solid:1,hard:.35,drop:'dirt',cell:C.grassF,top:C.grassT,col:'#6dbb4a',name:'Grass'});
def(T.DIRT,{solid:1,hard:.35,drop:'dirt',cell:C.dirt,col:'#9a6a3f'});
def(T.STONE,{solid:1,hard:.8,drop:'stone',cell:C.stone,col:'#8d8f9a'});
def(T.PLANK,{solid:1,hard:.5,drop:'wood',cell:C.plank,col:'#c98f4f'});
def(T.COPPER,{solid:1,hard:1,pick:1,drop:'copperore',cell:C.copper,col:'#e0823d'});
def(T.IRON,{solid:1,hard:1.3,pick:1,drop:'ironore',cell:C.iron,col:'#d7c0a8'});
def(T.GOLD,{solid:1,hard:1.7,pick:2,drop:'goldore',cell:C.gold,col:'#f2c14e'});
def(T.SAND,{solid:1,hard:.3,drop:'sand',cell:C.sand,col:'#e8cf8a'});
def(T.BRICK,{solid:1,hard:1,drop:'brick',cell:C.brick,col:'#b6564a'});
def(T.GLASS,{solid:1,hard:.3,drop:'glass',cell:C.glass,col:'#bfe6f0'});
def(T.CORE,{solid:1,hard:99,pick:99,cell:C.core,col:'#3b3346'});
def(T.TRUNK,{hard:1,drop:'wood',cell:C.trunk,col:'#7b5234'});
def(T.TORCH,{hard:.05,drop:'torch',cell:C.torch,light:15,col:'#f5a524'});
def(T.DOOR,{solid:1,hard:.5,drop:'door',col:'#a86b3a',floor:1});
def(T.TABLE,{hard:.4,drop:'table',cell:C.table,col:'#c98f4f',floor:1});
def(T.CHAIR,{hard:.4,drop:'chair',cell:C.chair,col:'#c98f4f',floor:1});
def(T.CHEST,{hard:.5,drop:'chest',cell:C.chest,col:'#a86b3a',floor:1});
def(T.BENCH,{hard:.5,drop:'bench',cell:C.bench,col:'#c98f4f',floor:1});
def(T.FURNACE,{hard:.8,drop:'furnace',cell:C.furnace,light:11,col:'#8d8f9a',floor:1});
def(T.ANVIL,{hard:.8,drop:'anvil',cell:C.anvil,col:'#4b4e5c',floor:1});
def(T.BED,{hard:.5,drop:'bed',cell:C.bed,col:'#d4483b',floor:1});
def(T.HEART,{hard:.6,drop:'heart',cell:C.heart,light:8,col:'#e0506b',floor:1});
def(T.TUFT,{hard:.01,cell:C.tuft,col:'#6dbb4a',floor:1,repl:1});
def(T.FLOWER,{hard:.01,cell:C.flower,col:'#e8636a',floor:1,repl:1});
def(T.FLOWER2,{hard:.01,cell:C.flower2,col:'#f4f0e6',floor:1,repl:1});
def(T.MUSH,{hard:.05,drop:'mushroom',cell:C.mush,light:5,col:'#e0823d',floor:1});
def(T.SNOW,{solid:1,hard:.3,drop:'snow',cell:C.snow,top:C.snowT,col:'#eef3f7'});
def(T.ICE,{solid:1,hard:.45,drop:'ice',cell:C.ice,col:'#bfe6f5'});
def(T.FROST,{solid:1,hard:2,pick:3,drop:'frostore',cell:C.frostOre,col:'#aee0f2'});
def(T.INKSTONE,{solid:1,hard:1.1,pick:1,drop:'inkstone',cell:C.inkst,col:'#3d3350'});
def(T.INKORE,{solid:1,hard:2.4,pick:4,drop:'inkore',cell:C.inkOre,col:'#a784e0'});
def(T.ASH,{solid:1,hard:.6,drop:'ash',cell:C.ash,col:'#5a4a4f'});
def(T.EMBERORE,{solid:1,hard:3,pick:5,drop:'emberore',cell:C.emberOre,light:6,col:'#ff8a3d'});
def(T.ROPE,{hard:.05,drop:'rope',cell:C.rope,col:'#c9a574'});
def(T.INK,{hard:0,liq:1,repl:1,col:'#3a2a5a'});def(T.LAVA,{hard:0,liq:1,repl:1,light:13,col:'#ff7a2d'});
def(T.BLOOM,{hard:.01,cell:C.bloom,col:'#e6f1f7',floor:1,repl:1});
[[T.PAINT1,'paint1',C.paint1],[T.PAINT2,'paint2',C.paint2],[T.PAINT3,'paint3',C.paint3],[T.PAINT4,'paint4',C.paint4]].forEach(([id,it,cell])=>def(id,{hard:.3,drop:it,cell,col:'#c9a24a',wallmount:1}));
[[T.BANR,'banr',C.banR,'#d4483b'],[T.BANB,'banb',C.banB,'#3f6fa8'],[T.BANG,'bang',C.banG,'#4f8a4f']].forEach(([id,it,cell,col])=>def(id,{hard:.3,drop:it,cell,col,hang:1,wallok:1}));
def(T.LANTERNP,{hard:.3,drop:'lanternp',cell:C.plant,col:'#e8636a',light:14,hang:1});
def(T.SHELF,{hard:.5,drop:'shelf',cell:C.shelf,col:'#8a5a33',floor:1});
def(T.CANDLE,{hard:.2,drop:'candle',cell:C.candle,col:'#f4f0e6',light:10,floor:1,onTable:1});
def(T.POT,{hard:.3,drop:'pot',cell:C.pot,col:'#c0633a',floor:1});
def(T.CLOCK,{hard:.5,drop:'clock',cell:C.clock,col:'#8a5a33',floor:1});
def(T.ARMCHAIR,{hard:.4,drop:'armchair',cell:C.armchair,col:'#b33a2f',floor:1});
def(T.CROP,{hard:.01,cell:C.crops[0][0],col:'#5aa83c',floor:1});
def(T.RARE,{hard:.01,cell:C.rare[0][0],col:'#b8a0e0',floor:1});
def(T.ALCHEMY,{hard:.5,drop:'alchemy',cell:C.alchemy,col:'#8a5a33',floor:1,light:5});
def(T.PAINT5,{hard:.3,drop:'paint5',cell:C.paint5,col:'#5a2a6a',wallmount:1});
def(T.PEEL,{solid:1,hard:4,drop:null,cell:C.peelS,col:'#8d8f9a'});
def(T.SKETCH,{hard:.01,cell:C.sketchB,col:'#b8b0bc'});
def(T.SIGN,{hard:99,pick:99,cell:C.sign0,col:'#a8805a'});
def(T.MURAL,{hard:99,pick:99,cell:C.murals[0],col:'#b8a07a'});
def(T.PEDESTAL,{solid:1,hard:99,pick:99,cell:C.pedestal,col:'#6c6e79'});
def(T.RUBBLE,{hard:.2,drop:'stone',cell:C.rubble,col:'#8d8f9a',floor:1,repl:1});
def(T.ALTAR,{hard:99,pick:99,cell:C.altar,col:'#b06ad0',light:6});
def(T.FOIL,{solid:1,hard:3.4,pick:6,drop:'foilore',cell:C.foilOre,light:3,col:'#e4dcf0'});
// secrets: a fake wall draws like stone (meta 0), brick (1) or dirt (2) and blocks light, but you walk through it; the temple seal only opens by ritual
def(T.FAKE,{hard:.8,drop:'stone',cell:C.stone,col:'#8d8f9a'});OPAQUE[T.FAKE]=LB[T.FAKE]=1;
def(T.SEAL,{solid:1,hard:99,pick:99,cell:C.seal,col:'#4a3570',light:3});
// seasonal: snow drifts pile on open ground in winter, thin ice covers open ink; both melt away at the thaw (seasons.js)
def(T.DRIFT,{hard:.01,cell:C.drift,col:'#f4f8fb',floor:1,repl:1});
def(T.THIN,{solid:1,hard:.3,cell:C.thinIce,col:'#cfe8f5'});
def(T.PLATFORM,{hard:.25,drop:'platform',cell:C.platform,col:'#c98f4f'});
// vertical layers (layers.js): sky islands of skystone and cloud with Skyglass Ore; the Pressed Deep, a band of slate above the underworld
// that needs a Frostsilver Pickaxe, with ancient machines (they give cogs) and great fossil skeletons (their bones always give a fossil)
def(T.SKYSTONE,{solid:1,hard:.9,drop:'skystone',cell:C.skystone,col:'#c9cfe6'});
def(T.CLOUD,{solid:1,hard:.15,drop:'cloud',cell:C.cloud,col:'#f4f6fb'});
def(T.SKYORE,{solid:1,hard:1.8,pick:3,drop:'skyore',cell:C.skyOre,light:3,col:'#9fc3ff'});
def(T.DEEP,{solid:1,hard:2.2,pick:4,drop:'deepslate',cell:C.deep,col:'#4a4a5e'});
def(T.MACHINE,{solid:1,hard:2.4,pick:4,drop:'cog',cell:C.machine,light:4,col:'#b08a4a'});
def(T.BONE,{solid:1,hard:1.4,pick:2,drop:null,cell:C.bone,col:'#efe6cf'});
// dungeons (dungeons.js): the shell and gates can't be dug through, so the puzzle, the mini-boss and the boss have to be beaten in order
def(T.TOWER,{solid:1,hard:99,pick:99,cell:C.tower,col:'#6e5a48'});
def(T.GATE,{solid:1,hard:99,pick:99,cell:C.gate,col:'#8a6a3a'});
// paper tricks (tricks.js): a stitched seam the Seam Ripper tears open, a torn hole in the page the Golden Needle sews shut
// (into a solid paper patch), and a crease mark the Bone Folder folds the page along to reach its partner
def(T.SEAM,{solid:1,hard:99,pick:99,cell:C.seam,col:'#8d8f9a'});
def(T.RIP,{hard:99,pick:99,cell:C.rip,col:'#1c1520'});
def(T.SEWN,{solid:1,hard:1.2,drop:null,cell:C.sewn,col:'#e9dcc0'});
def(T.CREASE,{hard:99,pick:99,cell:C.crease,col:'#b8a07a',light:2});
def(T.CRANK,{hard:99,pick:99,cell:C.crank[0],col:'#c9a24a'});
// the ink-sealed shelves in front of the Lost Stacks (dungeons.js): the Hollow Archive's key opens them
def(T.STACKS,{solid:1,hard:99,pick:99,cell:C.stacks,col:'#5a3c78',light:3});
// the Origami Observatory (dungeons.js): its star-chart shell, the great telescope, and the star-sealed doors of the Star Vaults that its lens opens
def(T.DOME,{solid:1,hard:99,pick:99,cell:C.dome,col:'#2a3160'});
def(T.SCOPE,{hard:99,pick:99,cell:C.scope,col:'#c9a24a',light:4});
def(T.STARDOOR,{solid:1,hard:99,pick:99,cell:C.stardoor,col:'#3a4a8a',light:5});
// the Great Scrapworks (dungeons.js): its riveted cardboard shell, the shredders in its pit (they bite and throw you up) and the
// nailed-shut Supply Crates its Crowbar opens; the Ink Wells' sealed doors, which the Sunken Inkwell Temple's Well Nib opens
def(T.SCRAP,{solid:1,hard:99,pick:99,cell:C.scrap,col:'#9a7a52'});
def(T.SHRED,{solid:1,hard:99,pick:99,cell:C.shred,col:'#8d8f9a'});
def(T.CRATE,{solid:1,hard:99,pick:99,cell:C.crate,col:'#a86b3a'});
def(T.WELLDOOR,{solid:1,hard:99,pick:99,cell:C.welldoor,col:'#3a2a5a',light:4});
export const WALLCELL=[0,C.wDirt,C.wWood,C.wStone,C.wRed,C.wBlue,C.wGreen,C.wYellow],WALLCOL=['#000','#4e3824','#5e4128','#55576a','#6a2e28','#2e4262','#3a583a','#806832'],WALLDROP=[null,null,'woodwall','stonewall','wallred','wallblue','wallgreen','wallyellow'];

// ================= items =================
export const ITEMS={};
function item(id,o){ITEMS[id]=Object.assign({id,max:999,value:1},o);}
item('wood',{name:'Wood',cell:C.plank,place:T.PLANK});
item('dirt',{name:'Dirt Block',cell:C.dirt,place:T.DIRT});
item('stone',{name:'Stone Block',cell:C.stone,place:T.STONE});
item('sand',{name:'Sand Block',cell:C.sand,place:T.SAND});
item('copperore',{name:'Copper Ore',cell:C.copper,place:T.COPPER,value:3});
item('ironore',{name:'Iron Ore',cell:C.iron,place:T.IRON,value:5});
item('goldore',{name:'Gold Ore',cell:C.gold,place:T.GOLD,value:10});
item('brick',{name:'Stone Brick',cell:C.brick,place:T.BRICK,value:2});
item('glass',{name:'Glass',cell:C.glass,place:T.GLASS,value:2});
item('torch',{name:'Torch',cell:C.torch,place:T.TORCH,desc:'Lights up the dark.'});
item('platform',{name:'Wood Platform',cell:C.platform,place:T.PLATFORM,desc:'Hold S to drop through.'});
item('door',{name:'Wooden Door',cell:C.doorIcon,place:T.DOOR,value:5,max:99,desc:'Right-click to open or close.'});
item('table',{name:'Wooden Table',cell:C.table,place:T.TABLE,value:5,max:99});
item('chair',{name:'Wooden Chair',cell:C.chair,place:T.CHAIR,value:3,max:99});
item('chest',{name:'Chest',cell:C.chest,place:T.CHEST,value:8,max:99,desc:'Stores 20 stacks. Right-click to open.'});
item('bench',{name:'Workbench',cell:C.bench,place:T.BENCH,value:6,max:99,desc:'Crafting station.'});
item('furnace',{name:'Furnace',cell:C.furnace,place:T.FURNACE,value:12,max:99,desc:'Smelts ore into bars.'});
item('anvil',{name:'Iron Anvil',cell:C.anvil,place:T.ANVIL,value:30,max:99,desc:'Forges tools, weapons and armor.'});
item('bed',{name:'Bed',cell:C.bed,place:T.BED,value:20,max:99,desc:'Right-click to set your spawn point.'});
item('mushroom',{name:'Glowcap',cell:C.mush,place:T.MUSH,value:2,desc:'A softly glowing mushroom. Used in potions.'});
item('woodwall',{name:'Wood Wall',cell:C.wWood,wall:2,desc:'Background wall. Houses need these.'});
item('stonewall',{name:'Stone Wall',cell:C.wStone,wall:3,desc:'Background wall. Houses need these.'});
item('gel',{name:'Gel',cell:C.gel,desc:'Sticky and a little flammable.'});
item('lens',{name:'Lens',cell:C.lens,value:8});
item('batwing',{name:'Bat Wing',cell:C.batwing,value:6});
item('copperbar',{name:'Copper Bar',cell:C.barCu,value:6});
item('ironbar',{name:'Iron Bar',cell:C.barFe,value:10});
item('goldbar',{name:'Gold Bar',cell:C.barAu,value:20});
item('coin',{name:'Coins',cell:C.coin});
item('potion',{name:'Healing Potion',cell:C.potion,use:'heal',max:30,value:10,desc:'Restores 60 health. Press H to quick-drink.'});
item('heart',{name:'Paper Heart',cell:C.heart,use:'heart',max:10,value:50,place:T.HEART,desc:'Use to raise max health by 20.'});
item('crown',{name:'Gel Crown',cell:C.crown,use:'boss',summon:'king',max:5,value:40,desc:'Summons the King Slime.'});
item('shuriken',{name:'Paper Star',cell:C.shuri,use:'throw',dmg:12,max:250,desc:'Thrown weapon. Hold to keep throwing.'});
item('copperpick',{name:'Copper Pickaxe',cell:C.pickCu,pick:1,mine:1,max:1,value:10,desc:'Mines up to iron.'});
item('ironpick',{name:'Iron Pickaxe',cell:C.pickFe,pick:2,mine:1.45,max:1,value:30,desc:'Mines gold. Faster.'});
item('goldpick',{name:'Gold Pickaxe',cell:C.pickAu,pick:3,mine:2,max:1,value:60,desc:'Mines Frostsilver Ore. Faster.'});
item('hammer',{name:'Wooden Hammer',cell:C.hammer,hammer:1,max:1,value:4,desc:'Knocks out background walls.'});
item('woodsword',{name:'Wooden Sword',cell:C.swWood,dmg:8,kb:5,dur:.36,max:1,value:4});
item('coppersword',{name:'Copper Sword',cell:C.swCu,dmg:12,kb:5.5,dur:.34,max:1,value:12});
item('ironsword',{name:'Iron Sword',cell:C.swFe,dmg:17,kb:6,dur:.32,max:1,value:30});
item('goldsword',{name:'Gold Broadsword',cell:C.swAu,dmg:25,kb:7,dur:.3,max:1,value:60});
const MNAME={cu:'Copper',fe:'Iron',au:'Gold',fr:'Frostsilver',ik:'Inkstone',em:'Emberite',fo:'Foilite'},MDEF={cu:[1,2,1],fe:[2,3,2],au:[3,5,3],fr:[4,6,4],ik:[5,8,5],em:[7,10,7],fo:[9,13,9]};
for(const m in METAL){item('helm'+m,{name:MNAME[m]+' Helmet',cell:C['helm'+m],slot:0,def:MDEF[m][0],max:1,value:15,color:METAL[m]});item('mail'+m,{name:MNAME[m]+' Chainmail',cell:C['mail'+m],slot:1,def:MDEF[m][1],max:1,value:20,color:METAL[m]});item('legs'+m,{name:MNAME[m]+' Greaves',cell:C['legs'+m],slot:2,def:MDEF[m][2],max:1,value:15,color:METAL[m]});}
// endgame armor sets (#37): armor like the metal sets, and wearing all three pieces of one set adds its bonus (setOn() in entities.js)
export const SETS={warden:{name:'Crease Warden',kind:'Melee',bonus:'+20% melee damage, and every melee hit restores 1 life.',parts:['Helm','Plate','Greaves'],def:[7,10,7]},
  sky:{name:'Skystring',kind:'Ranged',bonus:'+20% ranged damage, bows draw 30% faster, and 1 shot in 4 uses no ammo.',parts:['Hood','Vest','Leggings'],def:[5,8,6]},
  weave:{name:'Inkweaver',kind:'Magic',bonus:'+20% magic damage, spells cost 25% less mana, and mana refills twice as fast.',parts:['Hat','Robe','Leggings'],def:[4,7,5]}};
for(const k in SETS){const S=SETS[k];['helm','mail','legs'].forEach((pc,i)=>item(pc+'_'+k,{name:S.name+' '+S.parts[i],cell:C[pc+'_'+k],slot:i,def:S.def[i],set:k,max:1,value:[70,95,80][i],color:SETCOL[k]}));}
item('woodbow',{name:'Wooden Bow',cell:C.bowW,ranged:1,ammo:'arrow',dmg:6,ut:.45,spd:21,max:1,value:10,desc:'Fires arrows from your backpack. Hold to keep shooting.'});
item('goldbow',{name:'Gold Bow',cell:C.bowG,ranged:1,ammo:'arrow',dmg:14,ut:.32,spd:28,max:1,value:60,desc:'Fast, hard-hitting arrows.'});
item('launcher',{name:'Plane Launcher',cell:C.launch,ranged:1,ammo:'paper',dmg:10,ut:.28,spd:15,max:1,value:50,desc:'Folds Paper Sheets into planes that curve toward enemies.'});
item('arrow',{name:'Wooden Arrow',cell:C.arrow,ammoOf:'arrow',adm:4,proj:'arrow'});
item('firearrow',{name:'Flaming Arrow',cell:C.farrow,ammoOf:'arrow',adm:8,proj:'firearrow',value:2,desc:'Lights up tunnels as it flies, and burns what it hits.'});
item('waterarrow',{name:'Soaking Arrow',cell:C.warrow,ammoOf:'arrow',adm:6,proj:'warrow',value:2,desc:'Soaks what it hits. Puts out fire, and fire creatures hate it.'});
item('inkarrow',{name:'Inkblot Arrow',cell:C.iarrow,ammoOf:'arrow',adm:7,proj:'iarrow',value:2,desc:'Stains what it hits with slowing ink.'});
item('piercearrow',{name:'Needle Arrow',cell:C.parrow,ammoOf:'arrow',adm:5,proj:'parrow',value:2,desc:'A thin, hard tip that passes through two enemies.'});
item('bouncearrow',{name:'Ricochet Arrow',cell:C.rarrow,ammoOf:'arrow',adm:5,proj:'rarrow',value:2,desc:'Glances off an enemy it hits toward the next one nearby, twice, and bounces off walls once.'});
item('paper',{name:'Paper Sheet',cell:C.paper,ammoOf:'paper',adm:2,proj:'plane',desc:'Ammo for the Plane Launcher.'});
item('inktome',{name:'Ink Bolt',cell:C.tomeInk,magic:1,mana:5,dmg:15,ut:.4,spd:17,proj:'ink',max:1,value:40,desc:'Flings bouncing blots of ink.'});
item('cranetome',{name:'Crane Swarm',cell:C.tomeCrane,magic:1,mana:10,dmg:11,ut:.55,spd:13,proj:'crane',count:3,max:1,value:90,desc:'Releases three paper cranes that hunt enemies.'});
item('starstaff',{name:'Starfall Staff',cell:C.staff,magic:1,mana:14,dmg:30,ut:.6,spd:30,proj:'star',max:1,value:150,desc:'Calls a star down on the spot you aim at. Passes through walls.'});
item('fstar',{name:'Fallen Star',cell:C.fstar,value:5,desc:'Drops from the night sky. Used for magic.'});
item('manacrystal',{name:'Mana Crystal',cell:C.mcrys,use:'mana',max:10,value:30,desc:'Use to raise max mana by 20.'});
item('manapotion',{name:'Mana Potion',cell:C.mpot,use:'manapot',max:30,value:8,desc:'Restores 60 mana. Drunk automatically when a spell needs it.'});
item('inkball',{name:'Ink Bolt',cell:C.inkball});item('crane',{name:'Paper Crane',cell:C.crane});
item('snow',{name:'Snow Block',cell:C.snowT,place:T.SNOW});item('ice',{name:'Ice Block',cell:C.ice,place:T.ICE});item('ash',{name:'Ash Block',cell:C.ash,place:T.ASH});item('inkstone',{name:'Inkstone',cell:C.inkst,place:T.INKSTONE});
item('frostore',{name:'Frostsilver Ore',cell:C.frostOre,place:T.FROST,value:14,desc:'Needs a Gold Pickaxe or better.'});
item('inkore',{name:'Inkstone Ore',cell:C.inkOre,place:T.INKORE,value:20,desc:'Needs a Frostsilver Pickaxe or better.'});
item('emberore',{name:'Emberite Ore',cell:C.emberOre,place:T.EMBERORE,value:28,desc:'Needs an Inkstone Pickaxe or better.'});
item('frostbar',{name:'Frostsilver Bar',cell:C.barFr,value:30});item('inkbar',{name:'Inkstone Bar',cell:C.barIk,value:45});item('emberbar',{name:'Emberite Bar',cell:C.barEm,value:65});
item('frostpick',{name:'Frostsilver Pickaxe',cell:C.pickFr,pick:4,mine:2.4,max:1,value:90,desc:'Mines Inkstone Ore.'});
item('inkpick',{name:'Inkstone Pickaxe',cell:C.pickIk,pick:5,mine:2.9,max:1,value:130,desc:'Mines Emberite Ore.'});
item('emberpick',{name:'Emberite Pickaxe',cell:C.pickEm,pick:6,mine:3.6,max:1,value:180,desc:'Chews through anything.'});
item('frostblade',{name:'Frostsilver Blade',cell:C.swFr,dmg:32,kb:6.5,dur:.29,elem:'water',max:1,value:90,desc:'Frost-melt soaks whatever it cuts.'});
item('inkcutlass',{name:'Ink Cutlass',cell:C.swIk,dmg:41,kb:7,dur:.27,elem:'ink',max:1,value:130,desc:'Leaves a slowing ink stain.'});
item('embersword',{name:'Emberite Greatsword',cell:C.swEm,dmg:54,kb:8,dur:.3,elem:'fire',max:1,value:180,desc:'Sets enemies alight.'});
item('plume',{name:'Crane Plume',cell:C.plume,value:20,desc:'Dropped by the Great Crane.'});
item('inkheart',{name:'Ink Heart',cell:C.inkheart,value:30,desc:'Dropped by the Inkwell Leviathan.'});
item('cinder',{name:'Cinder Core',cell:C.cinder,value:40,desc:'Dropped by the Charred Folio.'});
item('inksac',{name:'Ink Sac',cell:C.inksac,value:6});
item('charm',{name:'Crane Charm',cell:C.charm,use:'boss',summon:'crane',max:5,value:40,desc:'Summons the Great Crane. Use it in the Origami Snowfield.'});
item('inkwell',{name:'Bottomless Inkwell',cell:C.inkwell,use:'boss',summon:'lev',max:5,value:60,desc:'Summons the Inkwell Leviathan. Use it at the Ink Lake.'});
item('bookmark',{name:'Burnt Bookmark',cell:C.bookmark,use:'boss',summon:'folio',max:5,value:80,desc:'Summons the Charred Folio. Use it in the Burnt Underworld.'});
item('rope',{name:'Rope',cell:C.ropeIt,place:T.ROPE,desc:'Climb with W and S. Click a rope to extend it downward.'});
item('hook',{name:'Grappling Hook',cell:C.hook,hook:1,max:1,value:60,desc:'Press F (or LT) to fire. Jump to let go.'});
item('featherbow',{name:'Feather Bow',cell:C.bowFr,ranged:1,ammo:'arrow',dmg:16,ut:.38,spd:26,count:3,max:1,value:120,desc:'Fires three arrows for the price of one.'});
item('tidetome',{name:'Tidal Tome',cell:C.tomeTide,magic:1,mana:12,dmg:20,ut:.5,spd:18,proj:'bubble',count:5,max:1,value:160,desc:'A fan of bouncing water bolts that soak foes.'});
item('emberstaff',{name:'Ember Staff',cell:C.staffEm,magic:1,mana:16,dmg:46,ut:.55,spd:20,proj:'emberball',max:1,value:220,desc:'Lobs fireballs that explode.'});
item('fireball',{name:'Fireball',cell:C.fireball});item('bubble',{name:'Water Bolt',cell:C.bubble});item('foldwave',{name:'Paper Wave',cell:C.foldwave});
item('tmap',{name:'Torn Treasure Map',cell:C.tmap,use:'tmap',max:20,value:40,desc:'Use it to mark a buried treasure on your world map (M).'});
item('foldblade',{name:'The Unfolded Edge',cell:C.foldblade,dmg:72,kb:9,dur:.3,wave:1,max:1,value:500,desc:'Legendary. Every swing sends out a slicing paper wave.'});item('crescent',{name:'Crescent',cell:C.crescent});
item('moonbow',{name:'Moonstring Bow',cell:C.bowMoon,ranged:1,ammo:'arrow',dmg:20,ut:.3,spd:30,pierce:1,max:1,value:90,desc:'Arrows pierce through one enemy.'});
item('moontome',{name:'Moonlit Tome',cell:C.tomeMoon,magic:1,mana:8,dmg:22,ut:.38,spd:16,proj:'crescent',max:1,value:100,desc:'Casts crescent moons that hunt enemies.'});
item('swallowtail',{name:'Swallowtail Launcher',cell:C.launchMoon,ranged:1,ammo:'paper',dmg:16,ut:.26,spd:16,count:2,max:1,value:100,desc:'Folds two homing planes per shot.'});
item('paint1',{name:'Painting: Paper Moon',cell:C.paint1,place:T.PAINT1,max:99,value:40,desc:'Hangs on a background wall.'});
item('paint2',{name:'Painting: Crane at Dusk',cell:C.paint2,place:T.PAINT2,max:99,value:40,desc:'Hangs on a background wall.'});
item('paint3',{name:'Painting: Folded Meadow',cell:C.paint3,place:T.PAINT3,max:99,value:40,desc:'Hangs on a background wall.'});
item('paint4',{name:'Painting: Still Life with Glowcap',cell:C.paint4,place:T.PAINT4,max:99,value:40,desc:'Hangs on a background wall.'});
item('banr',{name:'Red Star Banner',cell:C.banR,place:T.BANR,max:99,value:20,desc:'Hangs from a ceiling or a background wall.'});
item('banb',{name:'Blue Crane Banner',cell:C.banB,place:T.BANB,max:99,value:20,desc:'Hangs from a ceiling or a background wall.'});
item('bang',{name:'Green Leaf Banner',cell:C.banG,place:T.BANG,max:99,value:20,desc:'Hangs from a ceiling or a background wall.'});
item('lanternp',{name:'Paper Lantern',cell:C.plant,place:T.LANTERNP,max:99,value:6,desc:'Hangs from a ceiling. Bright, cozy light.'});
item('shelf',{name:'Bookshelf',cell:C.shelf,place:T.SHELF,max:99,value:12,desc:'Counts as a table for houses.'});
item('candle',{name:'Candle',cell:C.candle,place:T.CANDLE,max:99,value:3,desc:'Can sit on a table, workbench or bookshelf.'});
item('pot',{name:'Potted Plant',cell:C.pot,place:T.POT,max:99,value:4});
item('clock',{name:'Grandfather Clock',cell:C.clock,place:T.CLOCK,max:99,value:18,desc:'Right-click it to check the time.'});
item('armchair',{name:'Armchair',cell:C.armchair,place:T.ARMCHAIR,max:99,value:10,desc:'Counts as a chair for houses.'});
item('wallred',{name:'Red Paper Wall',cell:C.wRed,wall:4});item('wallblue',{name:'Blue Paper Wall',cell:C.wBlue,wall:5});item('wallgreen',{name:'Green Paper Wall',cell:C.wGreen,wall:6});item('wallyellow',{name:'Yellow Paper Wall',cell:C.wYellow,wall:7});
item('kite',{name:'Kite Ribbon',cell:C.kite,acc:['djump','speed'],max:1,value:220,desc:'Double jump, +20% run speed and higher jumps.'});
item('beacon',{name:'Beacon Shield',cell:C.beacon,acc:['light','def'],v:4,block:.5,max:1,value:180,desc:'+4 defense and lights a wide area around you.'});
item('quilt',{name:'Quilted Shield',cell:C.quilt,acc:'def',v:7,block:.55,max:1,value:140,desc:'+7 defense.'});
item('toolbelt',{name:'Tool Belt',cell:C.toolbelt,acc:'reach',max:1,value:120,desc:'+2 tiles of reach for mining and building.'});
item('magnet',{name:'Paper Magnet',cell:C.magnet,acc:'magnet',max:1,value:100,desc:'Pulls in dropped items from much farther away.'});
export const BADGES={stomp:['Power Stomp',1,'Stomps deal double damage.',C.bStomp],dip:['Double Dip',2,'Healing potions heal 50% more.',C.bDip],nice:['Nice Streak',1,'Wider timing for every NICE! hit.',C.bNice],
  power:['Power Plus',3,'+15% damage from everything you do.',C.bPower],defend:['Defend Plus',2,'+3 defense.',C.bDefend],heartf:['Heart Finder',1,'Defeated enemies sometimes drop hearts.',C.bHeartF],
  flowerf:['Flower Finder',1,'Defeated enemies sometimes drop mana stars.',C.bFlowerF],money:['Money Money',2,'Enemies drop 50% more coins.',C.bMoney],quick:['Quick Change',1,'Partner moves recharge 30% faster.',C.bQuick],
  happy:['Happy Heart',2,'Slowly regain life at all times.',C.bHappy],close:['Close Call',1,'At low life, sometimes dodge a hit completely.',C.bClose],feather:['Feather Fall',1,'Hold jump while falling to glide down.',C.bFeather],
  last:['Last Stand',2,'Take half damage while below 20% life.',C.bLast],spike:['Spike Shield',1,'Safely stomp spiky and armored foes.',C.bSpike],lure:["Angler's Luck",1,'+15 fishing power.',C.bLure]};
for(const k in BADGES){const[n,bp,d,cell]=BADGES[k];item('b_'+k,{name:n+' Badge',cell,badge:k,max:1,value:bp*30,desc:`${d} Costs ${bp} BP. Equip in the Party menu.`});}
item('bpup',{name:'BP Up',cell:C.bpUp,use:'bpup',max:10,value:80,desc:'Use to gain 1 Badge Point (up to 5 extra).'});
item('hpheart',{name:'Heart',cell:C.hpHeart});item('mpstar',{name:'Mana Star',cell:C.mpStar});
export const HERBS=[['sunpetal','Sunpetal'],['frostleaf','Frostleaf'],['inkreed','Inkreed'],['emberbloom','Emberbloom'],['wheat','Paper Wheat']];
export const SOIL=[[T.GRASS,T.DIRT],[T.SNOW],[T.INKSTONE],[T.ASH],[T.GRASS,T.DIRT]];
export const SEEDIDS=['seed_sun','seed_frost','seed_ink','seed_ember','seed_wheat'];
HERBS.forEach(([id,n],ty)=>{item(id,{name:n,cell:C.herbs[ty],value:4});item(SEEDIDS[ty],{name:n+' Seeds',cell:C.seeds[ty],seed:ty,value:2,desc:`Plant on ${['grass or dirt','snow','inkstone','ash','grass or dirt'][ty]}. ${['Thrives in spring and summer; rests outdoors in winter.','Thrives in winter; slow in summer.','Grows best in fall.','Grows the same all year.','Thrives in summer and fall; rests outdoors in winter.'][ty]} Right-click a grown plant to harvest it.`});});
// rare crops on the T.RARE tile (meta = type*4 + stage), each grown only under its own conditions (rareGrowChance in seasons.js)
export const RARE=[['moonlily','Moon Lily'],['thunderroot','Thunderroot'],['sunfruit','Sunfruit'],['ghostcap','Ghost Mushroom']];
export const RSOIL=[[T.GRASS,T.DIRT,T.SNOW],[T.GRASS,T.DIRT,T.SAND],[T.GRASS,T.DIRT,T.SAND],[T.STONE,T.DIRT,T.INKSTONE,T.ASH]];
export const RSEEDS=['seed_moon','seed_thunder','seed_sunf','spore_ghost'];
export const RAREHOW=['Grows only at night under a full moon or the Ink Moon, with open sky above.','Grows only when lightning strikes nearby during a rainstorm.','Needs open sky (no background wall) and daylight. Slow in rain and winter.','Grows only deep underground, in the dark.'];
RARE.forEach(([id,n],ty)=>{item(id,{name:n,cell:C.rareHerbs[ty],value:18,desc:'A rare plant. '+['Brewed into Moonlit Tonic.','Brewed into Thunder Tonic.','Baked into Sunfruit Tart.','Brewed into Ghostcap Draught.'][ty]});
  item(RSEEDS[ty],{name:ty===3?'Ghost Mushroom Spores':ty===0?'Moon Lily Bulb':n+' Seeds',cell:C.rareSeeds[ty],rare:ty,value:8,desc:`Plant on ${['grass, dirt or snow','grass, dirt or sand','grass, dirt or sand','stone, dirt, inkstone or ash'][ty]}. ${RAREHOW[ty]} Right-click a grown plant to harvest it.`});});
item('alchemy',{name:'Alchemy Desk',cell:C.alchemy,place:T.ALCHEMY,max:99,value:30,desc:'Brews potions. Counts as a table.'});
export const BUFFS={swift:['Swiftness','potswift','+25% run speed.'],night:['Night Vision','potnight','See much farther in the dark.'],fire:['Fire Resistance','potfire','Immune to lava, half damage from fireballs.'],iron:['Ironskin','potiron','+8 defense.'],regen:['Regeneration','potregen','Regain 2 life per second.'],fed:['Well Fed','bread','+2 defense, +5% damage, speed and slow healing.'],fishing:['Fishing','potfish','+15 fishing power.'],lunar:['Moonlit','potlunar','At night: +3 life per second and +10% damage.'],charged:['Charged','potthunder','+20% run speed and +10% damage.'],ghost:['Ghostly','potghost','+6 defense and see farther in the dark.']};
item('potswift',{name:'Swiftness Potion',cell:C.potSwift,use:'buff',buff:'swift',dur:240,max:30,value:12,desc:'+25% run speed for 4 minutes.'});
item('potnight',{name:'Night Vision Potion',cell:C.potNight,use:'buff',buff:'night',dur:240,max:30,value:12,desc:'See much farther in the dark for 4 minutes.'});
item('potfire',{name:'Fire Resistance Potion',cell:C.potFire,use:'buff',buff:'fire',dur:240,max:30,value:15,desc:'Immune to lava for 4 minutes. Essential in the underworld.'});
item('potiron',{name:'Ironskin Potion',cell:C.potIron,use:'buff',buff:'iron',dur:240,max:30,value:15,desc:'+8 defense for 4 minutes.'});
item('potregen',{name:'Regeneration Potion',cell:C.potRegen,use:'buff',buff:'regen',dur:240,max:30,value:12,desc:'Regain 2 life per second for 4 minutes.'});
item('potlunar',{name:'Moonlit Tonic',cell:C.potLunar,use:'buff',buff:'lunar',dur:300,max:30,value:30,desc:'At night: +3 life per second and +10% damage. Lasts 5 minutes.'});
item('potthunder',{name:'Thunder Tonic',cell:C.potThunder,use:'buff',buff:'charged',dur:240,max:30,value:30,desc:'+20% run speed and +10% damage for 4 minutes.'});
item('potghost',{name:'Ghostcap Draught',cell:C.potGhost,use:'buff',buff:'ghost',dur:300,max:30,value:30,desc:'+6 defense and see farther in the dark for 5 minutes.'});
item('suntart',{name:'Sunfruit Tart',cell:C.sunTart,use:'buff',buff:'fed',dur:900,max:30,value:24,desc:'Well Fed for 15 minutes.'});
item('bread',{name:'Paper Bread',cell:C.bread,use:'buff',buff:'fed',dur:360,max:30,value:6,desc:'Well Fed for 6 minutes.'});
item('bucket',{name:'Bucket',cell:C.bucket,bucket:'empty',max:10,value:10,desc:'Click ink or lava to scoop it up.'});
item('bucketink',{name:'Ink Bucket',cell:C.bucketInk,bucket:'ink',max:10,value:10,desc:'Click an empty spot to pour.'});
item('bucketlava',{name:'Lava Bucket',cell:C.bucketLava,bucket:'lava',max:10,value:10,desc:'Click an empty spot to pour. Hot!'});
item('moonink',{name:'Moon Ink',cell:C.moonink,value:15,desc:'Drips from creatures under the Ink Moon.'});
item('pendant',{name:'Moon Pendant',cell:C.pendant,acc:['light','nightregen'],max:1,value:150,desc:'Lights your way and slowly heals you at night.'});
item('paint5',{name:'Painting: Ink Moon',cell:C.paint5,place:T.PAINT5,max:99,value:60,desc:'Hangs on a background wall.'});
item('patch',{name:'Stitched Patch',cell:C.patch,acc:'def',v:2,max:1,value:25,desc:'+2 defense.'});
item('buckler',{name:'Iron Buckler',cell:C.buckler,acc:'def',v:4,block:.45,max:1,value:40,desc:'+4 defense.'});
item('glider',{name:'Paper Glider',cell:C.glider,acc:'djump',max:1,value:80,desc:'Jump again in mid-air.'});
item('lantern',{name:"Miner's Lantern",cell:C.lantern,acc:'light',max:1,value:60,desc:'Lights a wide area around you.'});
item('ribbon',{name:'Royal Ribbon',cell:C.ribbon,acc:'speed',max:1,value:120,desc:'+20% run speed and higher jumps.'});
// warhammers: slow overhead slams, big damage and knockback, briefly stagger what they hit
const HAMS={cu:[19,11,.62,20],fe:[27,12,.6,45],au:[40,13,.58,90],fr:[52,13.5,.56,135,'water'],ik:[66,14,.55,195,'ink'],em:[86,15,.56,270,'fire'],fo:[108,16,.54,360]};
for(const m in HAMS){const[dmg,kb,dur,value,elem]=HAMS[m];item('ham'+m,{name:MNAME[m]+' Warhammer',cell:C['ham'+m],dmg,kb,dur,heavy:1,elem,max:1,value,desc:'Slow, heavy slams that knock enemies flying and stagger them. Hold at the top of the swing to charge: a full charge sends a shockwave along the ground that cracks shells and armor.'});}
// shields go in an accessory slot: hold right-click (or the Block key) to block, raise it just before a hit to parry
item('shwood',{name:'Wooden Shield',cell:C.shwood,acc:'def',v:1,block:.35,max:1,value:8});
const SHS={cu:[2,.4,20],fe:[3,.45,40],au:[4,.5,80],fr:[5,.55,120],ik:[6,.6,170],em:[8,.65,240],fo:[10,.7,320]};
for(const m in SHS){const[v,block,value]=SHS[m];item('sh'+m,{name:MNAME[m]+' Shield',cell:C['sh'+m],acc:'def',v,block,max:1,value});}
// fishing: a rod casts a bobber into ink (or lava, with the Emberite Rod). Bait in the backpack is required; rod + bait power set how soon fish bite and what comes up.
item('rodwood',{name:'Wooden Fishing Rod',cell:C.rodW,rod:1,fpow:10,max:1,value:10,desc:'Cast into an ink pool with bait in your backpack. Click again when the bobber dips.'});
item('rodiron',{name:'Iron Fishing Rod',cell:C.rodFe,rod:1,fpow:22,max:1,value:40,desc:'A stiffer rod. Fish bite sooner.'});
item('rodfrost',{name:'Frostsilver Rod',cell:C.rodFr,rod:1,fpow:36,max:1,value:100,desc:'Cold-drawn line that rare fish can\'t resist.'});
item('rodember',{name:'Emberite Rod',cell:C.rodEm,rod:1,fpow:50,lava:1,max:1,value:180,desc:'Its line shrugs off heat, so it can fish in lava.'});
item('fly',{name:'Paper Fly',cell:C.fly,bait:10,value:1,desc:'Basic bait. Used up when you land a catch.'});
item('glowlure',{name:'Glow Lure',cell:C.glowlure,bait:25,value:3,desc:'Better bait. Fish can see it from the deep.'});
item('moonlure',{name:'Moon Lure',cell:C.moonlure,bait:45,value:8,desc:'The best bait. Rare fish follow it anywhere.'});
// fish: [name, where, value, smallest and largest size in cm, legendary]
export const FISH={minnow:['Paper Minnow','Common in any ink pool.',3,4,14],koi:['Crane Koi','Folded from a paper crane. Lives in the Origami Snowfield.',10,20,60],inkfish:['Inkfish','Only the Ink Lake is deep enough for it.',10,18,55],
  sandsole:['Sandpaper Sole','Hides in ink pools in the Sandpaper Dunes.',10,15,45],nightkoi:['Moonlit Koi','Rises in any ink pool at night.',10,20,65],goldfin:['Golden Fin','Rare. Needs strong bait and a good rod.',60,12,35],lavafish:['Lava Snapper','Swims in the lava of the Burnt Underworld.',25,25,70],
  blossomtrout:['Blossom Trout','Bites only in spring, when petals fall on the water.',14,18,50],sunperch:['Sun Perch','Basks near the top of the water in summer, by day.',14,12,38],maplecarp:['Maple Carp','Fattens up in fall. Its scales turn red with the leaves.',14,25,75],
  icepike:['Icicle Pike','Only bites in winter, through a hole in the ice.',16,30,90],stormeel:['Storm Eel','Only bites in the rain or a Paper Storm.',22,40,110],
  oldcrease:['Old Crease','Legendary. A carp folded a thousand times, hiding in forest ponds.',250,90,160,1],glacierjaw:['Glacier Jaw','Legendary. Swims under the snowfield ice in winter.',300,110,190,1],
  moonscale:['Moonscale','Legendary. Surfaces in the Ink Lake only under an Ink Moon.',400,120,210,1],magmaw:['Magmaw','Legendary. The king of the lava, too hot for any rod but Emberite.',450,140,240,1]};
for(const k in FISH){const f=FISH[k];item(k,{name:f[0],cell:C[k],fish:1,leg:f[5]||0,max:f[5]?99:999,value:f[2],desc:f[1]+(f[5]?' It fights hard: keep clicking as it thrashes. The Curator would give it a tank.':' Cook it at a furnace, or bring it to the Angler.')});}
item('goldleaf',{name:'Golden Leaf',cell:C.goldleaf,value:6,desc:'Drifts down from forest trees in fall. Gilded Lures are made from it.'});
item('leaflure',{name:'Gilded Lure',cell:C.leaflure,bait:35,value:5,desc:'Good bait, glittering with fall gold.'});
item('soggy',{name:'Soggy Paper',cell:C.soggy,value:0,desc:'Not a fish. Better bait and rods catch less of this.'});
item('fcrate',{name:'Fishing Crate',cell:C.fcrate,use:'crate',max:99,value:25,desc:'Use it to open. Coins, bars, bait, and sometimes something special.'});
item('grilledfish',{name:'Grilled Fish',cell:C.grilled,use:'buff',buff:'fed',dur:480,max:30,value:8,desc:'Well Fed for 8 minutes.'});
item('potfish',{name:'Fishing Potion',cell:C.potFish,use:'buff',buff:'fishing',dur:300,max:30,value:12,desc:'+15 fishing power for 5 minutes.'});
item('tackle',{name:'Tackle Box',cell:C.tackle,acc:'tackle',max:1,value:150,desc:'+10 fishing power, and a 30% chance to keep your bait on a catch.'});
item('bobber',{name:'Bobber',cell:C.bobber});
// museum: fossils turn up now and then when digging dirt, sand, stone and ash underground. The Curator displays them.
const FOSSIL={fos_amm:['Paper Ammonite',C.fosAmm,30,'A spiral shell pressed flat between the pages of the earth.'],fos_tri:['Folded Trilobite',C.fosTri,30,'Folded along every segment, a long time ago.'],
  fos_fern:['Pressed Fern',C.fosFern,20,'Someone left it in a book a few million years ago.'],fos_skull:['Inkosaur Skull',C.fosSkull,90,'Very rare. Only found deep underground.'],
  fos_spine:['Paperback Spine',C.fosSpine,120,'A vertebra the size of a book, from the great skeletons of the Pressed Deep.'],fos_claw:['Crease Claw',C.fosClaw,120,'One claw of a giant pressed into the deep slate.'],
  fos_wing:['Folded Wingbone',C.fosWing,140,'A wingbone from something that flew before the sky had islands.']};
for(const k in FOSSIL){const[name,cell,value,d]=FOSSIL[k];item(k,{name,cell,fossil:1,value,desc:d+' The Curator would love to display it.'});}

// world awakening: Foilite seeds itself deep underground once The Unfolded falls (see awaken.js)
item('foilore',{name:'Foilite Ore',cell:C.foilOre,place:T.FOIL,value:36,desc:'Only appears once the world awakens. Needs an Emberite Pickaxe or better.'});
item('foilbar',{name:'Foilite Bar',cell:C.barFo,value:85});
item('foilpick',{name:'Foilite Pickaxe',cell:C.pickFo,pick:7,mine:4.4,max:1,value:240,desc:'Folds rock out of the way.'});
item('foilsaber',{name:'Foilite Saber',cell:C.swFo,dmg:66,kb:8,dur:.26,max:1,value:240,desc:'Light as a sheet, sharp as its edge.'});
// pets follow you around (use the item to call or send home); mounts are ridden (use the item or the Mount key). See pets.js.
item('pet_frog',{name:'Paper Frog',cell:C.petFrog,pet:'frog',max:1,value:40,desc:'Pet. A folded frog that hops after you. Use it to call or send it home.'});
item('pet_kit',{name:'Fox Kit',cell:C.petKit,pet:'kit',max:1,value:120,desc:'Pet. A Fold Fox cub that trots at your heels. Use it to call or send it home.'});
item('pet_moth',{name:'Lamp Moth',cell:C.petMoth,pet:'moth',max:1,value:150,desc:'Pet. A paper moth with a little light inside. Use it to call or send it home.'});
item('pet_crease',{name:'Little Crease',cell:C.petCrease,pet:'crease',max:1,value:400,desc:'Pet. A scrap of The Unfolded that followed you home. Use it to call or send it home.'});
item('stag',{name:'Origami Stag',cell:C.stag,mount:'stag',max:1,value:300,desc:'Mount. Use it (or press the Mount key) to ride: much faster running and higher jumps.'});
// sky islands and the Pressed Deep (layers.js), and the Folded Clocktower (dungeons.js)
item('skystone',{name:'Skystone',cell:C.skystone,place:T.SKYSTONE});
item('cloud',{name:'Cloud Block',cell:C.cloud,place:T.CLOUD,desc:'A puff of folded cloud, soft enough to dig by hand.'});
item('skyore',{name:'Skyglass Ore',cell:C.skyOre,place:T.SKYORE,value:24,desc:'Grows in the skystone of floating islands. Needs a Gold Pickaxe or better.'});
item('skybar',{name:'Skyglass Bar',cell:C.barSky,value:45});
item('deepslate',{name:'Pressed Slate',cell:C.deep,place:T.DEEP,desc:'Pages pressed flat for ages. Needs a Frostsilver Pickaxe or better.'});
item('cog',{name:'Ancient Cog',cell:C.cog,value:15,desc:'Pried from the old machines of the Pressed Deep.'});
item('clockwings',{name:'Clockwork Wings',cell:C.clockwings,acc:['fly','djump'],max:1,value:400,desc:'Brass and paper wings from the Folded Clocktower. Hold Jump in mid-air to fly for a moment; they rewind on the ground. Reaches the sky islands.'});
item('crowbar',{name:'Crowbar',cell:C.crowbar,max:1,value:180,desc:'From the Pulper\'s bin in the Great Scrapworks. While it is in your backpack, right-click a nailed-shut Supply Crate in the caves to pry it open.'});
item('wellnib',{name:'Well Nib',cell:C.wellnib,max:1,value:700,desc:'The Grand Nib\'s own point, from the Sunken Inkwell Temple. While it is in your backpack, right-click a sealed Ink Well in the Pressed Deep to write it open.'});
item('starlens',{name:'Star Lens',cell:C.starlens,max:1,value:520,desc:'The great telescope\'s lens, from the Origami Observatory. While it is in your backpack, right-click a star-sealed door high in the sky to open the Star Vault behind it.'});
item('archkey',{name:'Archive Key',cell:C.archkey,max:1,value:420,desc:'From the heart of the Hollow Archive. While it is in your backpack, right-click an ink-sealed shelf deep underground to open the Lost Stacks behind it.'});
item('ripper',{name:'Seam Ripper',cell:C.ripper,max:1,value:90,desc:'A paper trick: while it is in your backpack, right-click a stitched seam in the rock to tear it open.'});
item('needle',{name:'Golden Needle',cell:C.needle,max:1,value:150,desc:'A paper trick: while it is in your backpack, right-click a torn hole in the page to sew it shut.'});
item('folder',{name:'Bone Folder',cell:C.folder,max:1,value:240,desc:'A paper trick: while it is in your backpack, right-click a crease mark to fold the page along it and step out at the other end.'});
item('skyhook',{name:'Skyglass Hook',cell:C.skyhook,hook:1,max:1,value:180,desc:'A grappling hook with a skyglass tip: reaches almost twice as far and pulls faster. Press F (or LT) to fire.'});
item('skyblade',{name:'Skyglass Saber',cell:C.swSky,dmg:36,kb:6,dur:.25,max:1,value:140,desc:'Light as air. Quick cuts.'});
item('gear',{name:'Spinning Gear',cell:C.cog});

export const RECIPES=[
 ['bench',1,[['wood',10]],null],['torch',3,[['wood',1],['gel',1]],null],['platform',2,[['wood',1]],null],
 ['woodwall',4,[['wood',1]],'bench'],['door',1,[['wood',6]],'bench'],['table',1,[['wood',8]],'bench'],['chair',1,[['wood',4]],'bench'],
 ['chest',1,[['wood',8]],'bench'],['bed',1,[['wood',15],['gel',5]],'bench'],['hammer',1,[['wood',8]],'bench'],['woodsword',1,[['wood',7]],'bench'],
 ['potion',1,[['gel',2],['mushroom',1]],'bench'],['glider',1,[['batwing',4],['gel',10]],'bench'],
 ['furnace',1,[['stone',20],['wood',4],['torch',3]],'bench'],
 ['copperbar',1,[['copperore',3]],'furnace'],['ironbar',1,[['ironore',3]],'furnace'],['goldbar',1,[['goldore',4]],'furnace'],
 ['brick',1,[['stone',2]],'furnace'],['glass',1,[['sand',2]],'furnace'],['stonewall',4,[['brick',1]],'bench'],
 ['anvil',1,[['ironbar',5]],'bench'],
 ['coppersword',1,[['copperbar',8]],'anvil'],['ironsword',1,[['ironbar',10]],'anvil'],['goldsword',1,[['goldbar',12]],'anvil'],
 ['ironpick',1,[['ironbar',12],['wood',3]],'anvil'],['goldpick',1,[['goldbar',14],['wood',4]],'anvil'],
 ['helmcu',1,[['copperbar',10]],'anvil'],['mailcu',1,[['copperbar',15]],'anvil'],['legscu',1,[['copperbar',12]],'anvil'],
 ['helmfe',1,[['ironbar',10]],'anvil'],['mailfe',1,[['ironbar',15]],'anvil'],['legsfe',1,[['ironbar',12]],'anvil'],
 ['helmau',1,[['goldbar',10]],'anvil'],['mailau',1,[['goldbar',15]],'anvil'],['legsau',1,[['goldbar',12]],'anvil'],
 ['shuriken',15,[['ironbar',1]],'anvil'],['lantern',1,[['lens',3],['glass',2],['goldbar',2]],'anvil'],['crown',1,[['gel',25],['goldbar',5]],'anvil'],
 ['frostbar',1,[['frostore',4]],'furnace'],['inkbar',1,[['inkore',4]],'furnace'],['emberbar',1,[['emberore',4],['ash',1]],'furnace'],
 ['frostpick',1,[['frostbar',15],['plume',5]],'anvil'],['inkpick',1,[['inkbar',15],['inkheart',3]],'anvil'],['emberpick',1,[['emberbar',18],['cinder',3]],'anvil'],
 ['frostblade',1,[['frostbar',14]],'anvil'],['inkcutlass',1,[['inkbar',14],['inkheart',1]],'anvil'],['embersword',1,[['emberbar',16],['cinder',2]],'anvil'],
 ['helmfr',1,[['frostbar',12]],'anvil'],['mailfr',1,[['frostbar',18]],'anvil'],['legsfr',1,[['frostbar',14]],'anvil'],
 ['helmik',1,[['inkbar',12]],'anvil'],['mailik',1,[['inkbar',18]],'anvil'],['legsik',1,[['inkbar',14]],'anvil'],
 ['helmem',1,[['emberbar',12],['cinder',1]],'anvil'],['mailem',1,[['emberbar',18],['cinder',1]],'anvil'],['legsem',1,[['emberbar',14],['cinder',1]],'anvil'],
 ['charm',1,[['paper',20],['frostbar',8]],'anvil'],['inkwell',1,[['inkbar',10],['inksac',5]],'anvil'],['bookmark',1,[['emberbar',12],['ash',10]],'anvil'],
 ['rope',5,[['paper',1]],null],['hook',1,[['ironbar',4],['rope',10]],'anvil'],
 ['shelf',1,[['wood',20],['paper',5]],'bench'],['candle',1,[['gel',2],['torch',1]],'bench'],['lanternp',1,[['paper',4],['torch',1]],'bench'],['pot',1,[['stone',6],['mushroom',1]],'bench'],
 ['clock',1,[['wood',10],['glass',2],['ironbar',1]],'anvil'],['armchair',1,[['wood',8],['paper',4]],'bench'],
 ['alchemy',1,[['wood',12],['glass',3]],'bench'],
 ['moonbow',1,[['goldbar',10],['moonink',8],['batwing',4]],'anvil'],['moontome',1,[['goldbar',8],['moonink',10],['fstar',5]],'anvil'],['swallowtail',1,[['launcher',1],['goldbar',8],['moonink',6]],'anvil'],
 ['potswift',1,[['sunpetal',2],['gel',1],['glass',1]],'alchemy'],['potnight',1,[['frostleaf',2],['lens',1],['glass',1]],'alchemy'],['potfire',1,[['emberbloom',2],['ash',2],['glass',1]],'alchemy'],
 ['potiron',1,[['inkreed',2],['ironbar',1],['glass',1]],'alchemy'],['potregen',1,[['sunpetal',1],['mushroom',2],['glass',1]],'alchemy'],['potion',2,[['sunpetal',1],['gel',2],['glass',1]],'alchemy'],
 ['potlunar',1,[['moonlily',1],['frostleaf',1],['glass',1]],'alchemy'],['potthunder',1,[['thunderroot',1],['sunpetal',1],['glass',1]],'alchemy'],['potghost',1,[['ghostcap',2],['glass',1]],'alchemy'],
 ['suntart',1,[['sunfruit',2],['wheat',2]],'furnace'], ['bread',1,[['wheat',3]],'furnace'],['bucket',1,[['ironbar',3]],'anvil'],
 ['pendant',1,[['moonink',12],['goldbar',2],['lens',1]],'anvil'],['paint5',1,[['moonink',3],['paper',1]],'bench'],
 ['woodbow',1,[['wood',10]],'bench'],['arrow',5,[['wood',1],['stone',1]],null],['firearrow',5,[['arrow',5],['torch',1]],null],['paper',10,[['wood',2]],'bench'],
 ['goldbow',1,[['goldbar',10]],'anvil'],['launcher',1,[['ironbar',12],['lens',3]],'anvil'],
 ['waterarrow',5,[['arrow',5],['ice',1]],null],['inkarrow',5,[['arrow',5],['inksac',1]],null],['piercearrow',5,[['arrow',5],['ironbar',1]],'anvil'],['bouncearrow',5,[['arrow',5],['gel',2]],null],
 ['hamcu',1,[['copperbar',12],['wood',4]],'anvil'],['hamfe',1,[['ironbar',14],['wood',4]],'anvil'],['hamau',1,[['goldbar',16],['wood',4]],'anvil'],
 ['hamfr',1,[['frostbar',16],['plume',2]],'anvil'],['hamik',1,[['inkbar',16],['inkheart',1]],'anvil'],['hamem',1,[['emberbar',18],['cinder',2]],'anvil'],
 ['shwood',1,[['wood',12]],'bench'],['shcu',1,[['copperbar',8],['wood',4]],'anvil'],['shfe',1,[['ironbar',9],['wood',4]],'anvil'],['shau',1,[['goldbar',10],['wood',4]],'anvil'],
 ['shfr',1,[['frostbar',12]],'anvil'],['shik',1,[['inkbar',12],['inksac',2]],'anvil'],['shem',1,[['emberbar',14],['cinder',1]],'anvil'],
 ['rodwood',1,[['wood',10],['rope',5]],'bench'],['rodiron',1,[['ironbar',8],['rope',10]],'anvil'],['rodfrost',1,[['frostbar',10],['plume',2]],'anvil'],['rodember',1,[['emberbar',12],['cinder',1]],'anvil'],
 ['fly',5,[['paper',1],['gel',1]],null],['glowlure',3,[['mushroom',1],['gel',2]],'bench'],['moonlure',3,[['moonink',1],['fstar',1]],'bench'],
 ['grilledfish',1,[['minnow',2]],'furnace'],['grilledfish',1,[['koi',1]],'furnace'],['grilledfish',1,[['inkfish',1]],'furnace'],['grilledfish',1,[['sandsole',1]],'furnace'],['grilledfish',1,[['nightkoi',1]],'furnace'],['grilledfish',2,[['lavafish',1]],'furnace'],['grilledfish',1,[['blossomtrout',1]],'furnace'],['grilledfish',1,[['sunperch',1]],'furnace'],['grilledfish',1,[['maplecarp',1]],'furnace'],['grilledfish',1,[['icepike',1]],'furnace'],['grilledfish',1,[['stormeel',1]],'furnace'],['leaflure',3,[['goldleaf',2],['fly',3]],'bench'],
 ['potfish',1,[['minnow',1],['sunpetal',1],['glass',1]],'alchemy'],
 ['manacrystal',1,[['fstar',5]],null],['manapotion',2,[['gel',2],['fstar',1]],'bench'],
 ['pet_frog',1,[['paper',12],['gel',6]],'bench'],['stag',1,[['paper',40],['goldbar',8],['plume',3]],'anvil'],
 ['foilbar',1,[['foilore',4]],'furnace'],['foilpick',1,[['foilbar',18],['moonink',6]],'anvil'],['foilsaber',1,[['foilbar',16]],'anvil'],
 ['helmfo',1,[['foilbar',12]],'anvil'],['mailfo',1,[['foilbar',18]],'anvil'],['legsfo',1,[['foilbar',14]],'anvil'],
 ['hamfo',1,[['foilbar',18],['wood',4]],'anvil'],
 ['helm_warden',1,[['emberbar',10],['cinder',2]],'anvil'],['mail_warden',1,[['emberbar',16],['cinder',3]],'anvil'],['legs_warden',1,[['emberbar',12],['cinder',2]],'anvil'],
 ['helm_sky',1,[['emberbar',8],['plume',4],['batwing',4]],'anvil'],['mail_sky',1,[['emberbar',12],['plume',6],['batwing',6]],'anvil'],['legs_sky',1,[['emberbar',10],['plume',5],['batwing',4]],'anvil'],
 ['helm_weave',1,[['emberbar',8],['inkheart',2],['fstar',8]],'anvil'],['mail_weave',1,[['emberbar',12],['inkheart',3],['fstar',12]],'anvil'],['legs_weave',1,[['emberbar',10],['inkheart',2],['fstar',10]],'anvil'],['shfo',1,[['foilbar',14]],'anvil'],
 ['skybar',1,[['skyore',4]],'furnace'],['skyhook',1,[['skybar',10],['cog',4],['hook',1]],'anvil'],['skyblade',1,[['skybar',14],['cog',2]],'anvil'],['clock',1,[['wood',8],['cog',2]],'bench'],
 ['ripper',1,[['ironbar',4],['plume',2]],'anvil'],['needle',1,[['goldbar',4],['inkheart',1],['rope',5]],'anvil'],['folder',1,[['fos_amm',1],['fos_tri',1],['cinder',1]],'anvil'],
 ['inktome',1,[['fstar',5],['gel',8],['mushroom',3]],'bench'],['cranetome',1,[['fstar',10],['goldbar',8],['batwing',4]],'anvil'],['starstaff',1,[['fstar',20],['goldbar',12]],'anvil'],
];
export const SHOP=[['rodwood',40],['fly',3],['tmap',150],['seed_sun',5],['seed_wheat',5],['bucket',60],['b_stomp',60],['b_dip',150],['b_heartf',120],['torch',5],['rope',1],['hook',200],['potion',25],['arrow',1],['paper',1],['manapotion',20],['woodbow',30],['shuriken',3],['glass',4],['bed',60],['crown',180],['lantern',300],['glider',450]];
