// Player, enemy defs, NPCs, boss, quests and inventory helpers.
import * as THREE from 'three';
import {
  bossIntro,
  $,BADGES,BIO,blk,burst,clamp,H,heal,hurtPlayer,iconTex,inkMoon,isNight,isSolid,ITEMS,pad,rand,
  renderQuests,scene,setInvDirty,FOERIG,makeRig,SFX,shake,SHEETS,sky,spriteMat,spriteMesh,stat,T,tileAt,toast,U,NDL,
  updateCoins,W,
} from './game.js';

// ================= entities =================
export const player={buffs:{},partners:[],partner:null,badges:[],badgesOn:[],bpUps:0,x:0,y:0,w:.78,h:1.82,vx:0,vy:0,face:1,rot:0,hp:100,max:100,inv:new Array(40).fill(null),armor:[null,null,null],acc:[null,null,null],look:null,sel:0,coins:0,
  onGround:false,coyote:0,jbuf:0,jumpAge:9,usedDouble:false,swing:null,lastSwingEnd:-9,niceNext:false,inv_t:0,spawn:{x:0,y:0},regenT:0,potT:0,mineP:0,mineTile:-1,placeT:0,walkT:0,dead:false,deadT:0,stompWin:0,stompTarget:null,dashT:0,dashCD:0,dashI:0,dashDir:1,airDashed:false,ghostT:0,dashPing:0,sheetDirty:true,mesh:null,mat:null,prevY:0};
export let enemies=[],pickups=[],projs=[],npcs=[],boss=null;
export let worldTime=7.5,quests={},hintT=0;
export const QUESTS=[['tree','Chop down a tree'],['bar','Smelt a bar at a furnace'],['house','Build a house for the Merchant'],['heart','Find and use a Paper Heart'],['iron','Forge iron gear at an anvil'],['king','Defeat the King Slime'],['crane','Defeat the Great Crane'],['lev','Defeat the Inkwell Leviathan'],['folio','Defeat the Charred Folio'],['unfolded','Solve the riddle of the ink shrine']];
export function questDone(k){if(quests[k])return;quests[k]=true;const q=QUESTS.find(q=>q[0]===k);toast(`Quest complete: ${q[1]}`,'gold');SFX.nice();renderQuests();}

export function boxHits(x,y,w,h,prevY,drop){const x0=Math.floor(x-w/2),x1=Math.floor(x+w/2-1e-6),y0=Math.floor(y),y1=Math.floor(y+h-1e-6);
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){if(isSolid(tx,ty))return true;if(prevY!=null&&!drop&&ty===y0&&tileAt(tx,ty)===T.PLATFORM&&prevY>=ty+1-1e-3)return true;}return false;}
export function collide(e,dt){const steps=Math.max(1,Math.ceil(Math.max(Math.abs(e.vx),Math.abs(e.vy))*dt/.3));const sdt=dt/steps;const wasGround=e.onGround;e.onGround=false;e.hitWall=0;e.hitCeil=false;
  for(let s=0;s<steps;s++){
    const ox=e.x;e.x+=e.vx*sdt;
    if(boxHits(e.x,e.y,e.w,e.h)){
      if(e.step&&wasGround&&!boxHits(e.x,Math.floor(e.y+1e-3)+1,e.w,e.h)&&!boxHits(ox,Math.floor(e.y+1e-3)+1,e.w,e.h)){e.y=Math.floor(e.y+1e-3)+1;e.stepped=.12;}
      else{if(e.vx>0)e.x=Math.floor(e.x+e.w/2)-e.w/2-1e-4;else if(e.vx<0)e.x=Math.floor(e.x-e.w/2)+1+e.w/2+1e-4;else e.x=ox;e.hitWall=e.vx>0?1:-1;e.vx=0;}}
    const py=e.y;e.y+=e.vy*sdt;
    if(e.vy<=0){if(boxHits(e.x,e.y,e.w,e.h,py,e.drop)){e.y=Math.floor(e.y)+1;if(e.vy<-1)e.landV=e.vy;e.vy=0;e.onGround=true;}}
    else if(boxHits(e.x,e.y,e.w,e.h)){e.y=Math.floor(e.y+e.h)-e.h-1e-4;e.vy=0;e.hitCeil=true;}}
  e.x=clamp(e.x,1+e.w/2,W-1-e.w/2);}

export const EN={
  slime:{w:.9,h:.7,hp:14,dmg:7,def:0,sheet:'slime',slimy:1,fw:96,fh:80,coins:[1,4],drops:[['gel',1,2,1]],col:['#6cc57a','#8fe09a','#4f9d5a']},
  bslime:{w:.9,h:.7,hp:26,dmg:11,def:2,sheet:'bslime',slimy:1,fw:96,fh:80,coins:[2,6],drops:[['gel',2,4,1]],col:['#5aa7e0','#8fcaf0']},
  zombie:{w:.8,h:1.8,hp:42,dmg:14,def:4,sheet:'zombie',fw:96,fh:144,coins:[3,9],drops:[['patch',1,1,.06]],col:['#a8c79a','#6b5b8a'],step:1},
  eye:{w:.85,h:.85,hp:30,dmg:12,def:2,fly:1,sheet:'eye',fw:96,fh:96,coins:[2,7],drops:[['lens',1,1,.45]],col:['#f4f0e6','#8a3fb0']},
  bat:{w:.8,h:.6,hp:18,dmg:10,def:0,fly:1,sheet:'bat',fw:96,fh:64,coins:[2,5],drops:[['batwing',1,1,.4]],col:['#6b4c8f','#5a3f7a']},
  knight:{w:.85,h:1.85,hp:85,dmg:20,def:8,sheet:'knight',fw:96,fh:144,coins:[10,25],drops:[['buckler',1,1,.1],['ironbar',1,3,.35],['goldore',2,5,.25]],col:['#b48a5a','#8e6a40'],step:1},
  blot:{w:.95,h:.75,hp:70,dmg:24,def:6,sheet:'blot',fw:96,fh:80,coins:[6,14],drops:[['gel',2,5,1],['inksac',1,1,.3]],col:['#4a3570','#8a78b0'],slimy:1},
  foldfox:{w:1.4,h:1,hp:70,dmg:22,def:6,sheet:'foldfox',fw:128,fh:96,coins:[8,18],drops:[['plume',1,1,.08],['pet_kit',1,1,.03]],col:['#e0823d','#f4f0e6'],step:1},
  flurry:{w:.9,h:.9,hp:45,dmg:18,def:4,fly:1,sheet:'flurry',fw:80,fh:80,coins:[5,12],drops:[['frostore',1,3,.3]],col:['#f6f9fb','#aee0f2']},
  inksquid:{w:1.1,h:.9,hp:85,dmg:26,def:8,fly:1,sheet:'inksquid',fw:96,fh:96,coins:[10,22],drops:[['inksac',1,2,.6]],col:['#6b4c8f','#3a2a5a']},
  cinderbat:{w:.8,h:.6,hp:70,dmg:34,def:10,fly:1,sheet:'cinderbat',fw:96,fh:64,coins:[12,25],drops:[['emberore',1,2,.2]],col:['#ff8a3d','#3a2a24']},
  ashimp:{w:.85,h:1.85,hp:130,dmg:36,def:14,sheet:'ashimp',fw:96,fh:144,coins:[18,35],drops:[['emberbar',1,2,.15],['ash',2,5,.5]],col:['#9a3b2a','#3a2a24','#ff8a3d'],step:1},
  wraith:{w:1,h:1.5,hp:90,dmg:30,def:10,fly:1,noclip:1,sheet:'wraith',fw:96,fh:128,coins:[15,30],drops:[],col:['#5a2a6a','#b06ad0']},
  crane:{w:4.2,h:2.6,hp:1500,dmg:30,def:12,fly:1,noclip:1,sheet:'crane',fw:360,fh:240,boss:1,name:'Great Crane',quest:'crane',coins:[400,520],drops:[['b_defend',1,1,1],['plume',6,10,1],['featherbow',1,1,.5],['frostbar',5,10,1]],col:['#f4f0e6','#b9cfe0','#d4483b']},
  lev:{w:2.4,h:1.9,hp:2300,dmg:34,def:14,fly:1,noclip:1,worm:1,sheet:'lev',fw:180,fh:140,boss:1,name:'Inkwell Leviathan',quest:'lev',coins:[600,800],drops:[['b_power',1,1,1],['inkheart',3,5,1],['tidetome',1,1,.5],['inkbar',5,10,1]],col:['#4a3570','#8a5fc0','#f1c04f']},
  levseg:{w:1.8,h:1.8,hp:1,dmg:28,def:14,fly:1,noclip:1,worm:1,sheet:'levseg',fw:140,fh:140,coins:[0,0],drops:[],col:['#4a3570','#8a5fc0']},
  levtail:{w:1.4,h:1.4,hp:1,dmg:24,def:14,fly:1,noclip:1,worm:1,sheet:'levtail',fw:140,fh:140,coins:[0,0],drops:[],col:['#4a3570','#8a5fc0']},
  folio:{w:4.4,h:3.6,hp:3300,dmg:40,def:18,fly:1,noclip:1,sheet:'folio',fw:340,fh:280,boss:1,name:'Charred Folio',quest:'folio',coins:[900,1200],drops:[['b_last',1,1,1],['b_happy',1,1,1],['cinder',3,5,1],['emberstaff',1,1,.5],['emberbar',6,12,1]],col:['#e9dcc0','#ff7a2d','#3a2a24']},
  unfolded:{w:3,h:4.6,hp:5400,dmg:44,def:22,sheet:'unfolded',fw:300,fh:360,boss:1,name:'The Unfolded',quest:'unfolded',coins:[1500,2000],drops:[['foldblade',1,1,1],['pet_crease',1,1,1],['bpup',1,2,1],['moonink',10,20,1]],col:['#f4f0e6','#e9dcc0','#b06ad0'],step:1},
  // forest
  crumple:{w:.9,h:.9,hp:30,dmg:12,def:2,center:1,sheet:'crumple',fw:80,fh:80,coins:[2,6],drops:[['paper',1,2,.6]],col:['#efe6d2','#cbbd9f'],name:'Crumple'},
  toadstool:{w:.9,h:1.1,hp:36,dmg:10,def:2,sheet:'toadstool',fw:96,fh:96,coins:[3,7],drops:[['mushroom',1,2,.7]],col:['#d4483b','#f4f0e6'],name:'Toadstool Lobber',step:1},
  // desert
  dunefin:{w:1.3,h:.9,hp:60,dmg:20,def:5,sheet:'dunefin',fw:128,fh:96,coins:[6,14],drops:[['sand',2,4,1],['goldore',1,2,.2]],col:['#e3c77d','#b98f4a'],name:'Dune Fin'},
  scarab:{w:1.2,h:.9,hp:70,dmg:18,def:10,sheet:'scarab',fw:112,fh:80,coins:[6,15],drops:[['goldore',1,3,.35],['copperore',2,4,.4]],col:['#3f7a8a','#f1c04f'],name:'Shell Scarab',step:1},
  sunkite:{w:1.2,h:.8,hp:40,dmg:18,def:3,fly:1,sheet:'sunkite',fw:112,fh:80,coins:[5,12],drops:[['paper',1,3,.5],['plume',1,1,.12]],col:['#f1c04f','#d4483b'],name:'Sun Kite'},
  // snowfield
  snowroll:{w:1.1,h:1,hp:60,dmg:18,def:4,slimy:1,split:'snowlet',sheet:'snowroll',fw:96,fh:96,coins:[5,12],drops:[['snow',2,4,1],['ice',1,2,.3]],col:['#f6f9fb','#aee0f2'],name:'Snow Roller'},
  snowlet:{w:.6,h:.55,hp:16,dmg:10,def:2,slimy:1,sheet:'snowlet',fw:64,fh:56,coins:[1,3],drops:[['snow',1,1,.6]],col:['#f6f9fb','#aee0f2'],name:'Snowlet'},
  frostpuff:{w:.9,h:.9,hp:50,dmg:16,def:4,fly:1,sheet:'frostpuff',fw:96,fh:96,coins:[6,13],drops:[['frostore',1,2,.35],['ice',1,2,.5]],col:['#dff2fa','#7fc6e4'],name:'Frost Puff'},
  // ink lake
  inkwisp:{w:.8,h:1,hp:55,dmg:24,def:6,fly:1,noclip:1,sheet:'inkwisp',fw:80,fh:96,coins:[8,16],drops:[['inksac',1,1,.4]],col:['#3a2a5a','#8a5fc0'],name:'Ink Wisp'},
  quillfish:{w:1,h:.7,hp:60,dmg:22,def:6,sheet:'quillfish',fw:96,fh:72,coins:[8,18],drops:[['inksac',1,1,.3],['plume',1,1,.08]],col:['#4a6fa0','#f4f0e6'],name:'Quillfish'},
  // burnt underworld
  cracker:{w:.8,h:1.2,hp:60,dmg:48,def:8,sheet:'cracker',fw:80,fh:112,coins:[12,24],drops:[['ash',1,3,.6],['emberore',1,1,.2]],col:['#d4483b','#ffd66b'],name:'Firecracker Imp',step:1},
  ashspider:{w:1.1,h:.7,hp:95,dmg:32,def:12,sheet:'ashspider',fw:112,fh:72,coins:[14,28],drops:[['ash',1,2,.5],['rope',2,5,.4]],col:['#3a2a24','#ff8a3d'],name:'Ash Spider',step:1},
  king:{w:4.4,h:3.3,hp:750,dmg:26,def:6,sheet:'king',fw:340,fh:280,boss:1,name:'King Slime',quest:'king',slimy:1,coins:[250,320],drops:[['b_nice',1,1,1],['ribbon',1,1,1],['gel',20,35,1],['goldbar',5,10,1],['starstaff',1,1,.6],['fstar',5,10,1]],col:['#5aa7e0','#8fcaf0','#f1c04f']},
};
// damage types: weak takes ×1.5, resists take ×.5. Fire burns (damage over time), ink stains (slows), water soaks (takes +25% damage, hits 25% softer).
// Water puts out fire and fire dries a soak. Last column is the type an enemy's own hits carry.
export const ELEM={fire:{name:'Fire',st:'Burning',col:['#ff8a3d','#ffd66b'],icon:'fireball'},ink:{name:'Ink',st:'Inked',col:['#3a2a5a','#8a5fc0'],icon:'inkball'},water:{name:'Water',st:'Soaked',col:['#5aa7e0','#bfe3f7'],icon:'bubble'}};
[['slime','fire'],['bslime','fire','water'],['zombie','fire'],['eye','ink'],['knight','water'],['crumple','fire'],['toadstool','fire'],['sunkite','fire'],['scarab','ink','fire'],['dunefin','water','fire'],
 ['foldfox','fire','water'],['flurry','fire','water','water'],['snowroll','fire','water','water'],['snowlet','fire','water','water'],['frostpuff','fire','water','water'],
 ['blot','water','ink','ink'],['inksquid','water','ink','ink'],['inkwisp','water','ink','ink'],['quillfish','','ink','ink'],['wraith','water','ink','ink'],
 ['cinderbat','water','fire','fire'],['ashimp','water','fire','fire'],['cracker','water','fire','fire'],['ashspider','water','fire','fire'],
 ['king','fire','water'],['crane','fire','water'],['lev','water','ink','ink'],['levseg','water','ink','ink'],['levtail','water','ink','ink'],['folio','water','fire','fire'],['unfolded','fire','ink','ink']
].forEach(([k,w,r,el])=>{Object.assign(EN[k],{weak:w||null,res:r||null,elem:el||null});});
// bestiary: order, display names and where each enemy lives (segments of the Leviathan are part of it)
export const BEST=[['slime','Green Slime','Forest, by day'],['bslime','Blue Slime','Caves'],['zombie','Paper Zombie','Surface, at night'],['eye','Watcher Eye','Surface, at night'],['crumple','Crumple','Forest'],['toadstool','Toadstool Lobber','Forest, by day'],
  ['bat','Cave Bat','Caves'],['knight','Cardboard Knight','Deep caves'],['dunefin','Dune Fin','Desert'],['scarab','Shell Scarab','Desert and desert caves'],['sunkite','Sun Kite','Desert'],
  ['foldfox','Fold Fox','Origami Snowfield'],['flurry','Flurry','Origami Snowfield'],['snowroll','Snow Roller','Origami Snowfield'],['snowlet','Snowlet','Origami Snowfield, from Snow Rollers'],['frostpuff','Frost Puff','Origami Snowfield'],
  ['blot','Ink Blot','Ink Lake'],['inksquid','Ink Squid','Ink Lake, in the ink'],['inkwisp','Ink Wisp','Ink Lake'],['quillfish','Quillfish','Ink Lake, in the ink'],
  ['cinderbat','Cinder Bat','Burnt Underworld'],['ashimp','Ash Imp','Burnt Underworld'],['cracker','Firecracker Imp','Burnt Underworld'],['ashspider','Ash Spider','Burnt Underworld ceilings'],['wraith','Ink Wraith','Surface, under the Ink Moon'],
  ['king','King Slime','Boss · summoned on the surface'],['crane','Great Crane','Boss · Origami Snowfield'],['lev','Inkwell Leviathan','Boss · Ink Lake'],['folio','Charred Folio','Boss · Burnt Underworld'],['unfolded','The Unfolded','Secret boss · the ink shrine']];
export let bestiary={};
export function bestKill(e){const b=bestiary[e.type]||(bestiary[e.type]={k:0,d:{}});b.k++;if(e.elite)b.e=(b.e||0)+1;
  if(e.trait&&TRAITS[e.trait]){const tr=b.tr||(b.tr={});if(!tr[e.trait]&&!Object.values(bestiary).some(o=>o.tr&&o.tr[e.trait]))toast(`New elite trait in the bestiary: ${TRAITS[e.trait].n}!`,'gold');tr[e.trait]=(tr[e.trait]||0)+1;}
  if(b.k===1){const row=BEST.find(r=>r[0]===e.type);toast(`New bestiary entry: ${row?row[1]:e.type}!`,'gold');stat('bestiary');}}
export const bestDrop=(e,id,n)=>{const b=bestiary[e.type];if(b)b.d[id]=(b.d[id]||0)+n;};
export function spawnEnemy(type,x,y){const d=EN[type];const e={type,d,x,y,w:d.w,h:d.h,vx:0,vy:0,hp:d.hp,max:d.hp,face:1,rot:0,t:rand(0,2),timer:rand(.5,2),flash:0,dying:0,onGround:false,step:d.step,kb:0,hitCD:0};
  e.sw=d.fw/60;e.sh=d.fh/60;const fr=FOERIG[d.sheet];if(fr){e.rig=makeRig(fr[0],fr[1],d.sheet);e.mesh=e.rig.mesh;}else e.mesh=spriteMesh(SHEETS[d.sheet+'T'],2,e.sw,e.sh,!d.fly&&!d.center);e.mesh.position.z=.1+enemies.length%8*.006;enemies.push(e);if(inkMoon&&isNight()&&!d.boss&&!d.worm){e.inked=true;e.hp=e.max=Math.round(e.hp*1.7);}
  // an awakened world (awaken.js) makes every foe tougher; the Leviathan's segments share its life, so they are skipped
  if(BIO.awake&&(!d.worm||type==='lev')){e.awake=true;e.hp=e.max=Math.round(e.max*(d.boss?1.5:1.8));}
  if(d.boss){boss=e;$('boss').hidden=false;$('boss').classList.remove('p1','p2');$('boss').querySelector('.bn').textContent=d.name;bossIntro(e);}
  if(d.worm&&type==='lev'){e.segs=[];e.ang=0;for(let k=0;k<12;k++){const sg=spawnEnemy(k===11?'levtail':'levseg',x-(k+1)*1.2,y);sg.parent=e;e.segs.push(sg);}}return e;}
// elites: tougher, bigger, gold-starred, better loot. Only rolled for natural spawns.
export const ELITE_TINT=new THREE.Vector3(1.22,1.06,.72),ELITE_LOOT=['potion','potion','manapotion','potswift','potiron','potregen','fstar'];
// traits (#84): each elite rolls one, which changes how it looks (tint, a trait mark beside its star with its own shape) and fights.
// elem: the type its hits carry; res/weak override the foe's own; hp/dmg/spd/sz multiply; w: roll weight. Effects live where they run
// (hurtEnemy for armored, the contact hit for vampiric, killEnemy for explosive and golden, updateEnemies for speed and particles).
export const TRAITS={
  burning:{n:'Burning',tip:'Its hits set you alight. Douse it with water.',tint:[1.35,.82,.6],elem:'fire',res:'fire',weak:'water',w:3},
  frosted:{n:'Frosted',tip:'Slow and soaking. Fire thaws it.',tint:[.78,.95,1.35],elem:'water',res:'water',weak:'fire',spd:.8,w:3},
  giant:{n:'Giant',tip:'Huge, slow and hard to knock back.',tint:[1.05,1,.95],hp:1.6,dmg:1.3,spd:.85,sz:1.5,w:3},
  swift:{n:'Swift',tip:'Twice as fast on its feet, but frail.',tint:[1.08,1.12,.9],hp:.75,spd:1.6,w:3},
  armored:{n:'Armored',tip:'Shrugs off ordinary hits. Crits and weak spots get through.',tint:[.82,.85,.92],w:2},
  vampiric:{n:'Vampiric',tip:'Heals when it hurts you.',tint:[1.25,.7,.78],w:2},
  explosive:{n:'Explosive',tip:'Bursts a moment after it falls. Step away!',tint:[1.2,.95,.7],w:2},
  inky:{n:'Ink-infused',tip:'Its hits slow you with ink. Drips Moon Ink.',tint:[.8,.62,1.2],elem:'ink',res:'ink',w:2},
  golden:{n:'Golden',tip:'Made of gilt paper. Drops a fortune in coins.',tint:[1.35,1.15,.55],hp:.9,w:1},
};
for(const k in TRAITS)TRAITS[k].tv=new THREE.Vector3(...TRAITS[k].tint);
function rollTrait(){let s=0;for(const k in TRAITS)s+=TRAITS[k].w;let v=Math.random()*s;for(const k in TRAITS){v-=TRAITS[k].w;if(v<=0)return k;}return 'giant';}
export function makeElite(e,trait){const k=TRAITS[trait]?trait:rollTrait(),tr=TRAITS[k],sz=tr.sz||1.2;e.elite=true;e.trait=k;e.hp=e.max=Math.round(e.max*2.6*(tr.hp||1));e.w*=sz;e.h*=sz;
  if(tr.elem)e.elem=tr.elem;if(tr.res)e.res=tr.res;if(tr.weak)e.weak=tr.weak;return e;}
export const traitOf=e=>e.trait&&TRAITS[e.trait];
export const edmg=e=>e.d.dmg*(e.elite?1.4*((traitOf(e)||{}).dmg||1):1)*(e.inked?1.3:1)*(e.awake?1.3:1)*(e.st&&e.st.soak>0?.75:1);
export function crackerBoom(e){e.dying=.05;e.mesh.visible=false;const cx=e.x,cy=e.y+e.h/2,r=e.elite?4:3.2;burst(cx,cy,['#ff8a3d','#ffd66b','#d4483b','#fbf8f0'],36,8,{bright:1});SFX.boom();shake(.35);
  const p=player;if(!p.dead&&Math.hypot(p.x-cx,p.y+.9-cy)<r)hurtPlayer(edmg(e),cx,e,'fire');
  for(const o of enemies)if(o!==e&&!o.dying&&!o.d.boss&&!o.parent&&Math.hypot(o.x-cx,o.y+o.h/2-cy)<r){o.vx=(o.x>cx?1:-1)*8;o.vy=8;}}
export function removeEnemy(e){if(e.mark)scene.remove(e.mark);if(e.star)scene.remove(e.star);if(e.tmark)scene.remove(e.tmark);if(e.thread){scene.remove(e.thread);e.thread.material.dispose();}if(e.bar)scene.remove(...e.bar);scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}
export function dropItem(id,n,x,y,vx,vy,delay=0){const p={id,n,x,y,vx:vx??rand(-2,2),vy:vy??rand(3,6),w:.5,h:.5,t:delay,age:0};p.mesh=new THREE.Mesh(new THREE.PlaneGeometry(.62,.62),spriteMat(iconTex(id)));p.mesh.position.z=.22;scene.add(p.mesh);pickups.push(p);}

export function lightAt(x,y){const tx=clamp(Math.floor(x),0,W-1),ty=clamp(Math.floor(y),0,H-1),i=ty*W+tx;const s=Math.pow(sky[i]/15,1.6),b=Math.pow(blk[i]/15,1.45);const sk=U.uSky.value;
  const d=Math.hypot(x-U.uP.value.x,y-U.uP.value.y);let gl=U.uGlow.value*clamp(1-d/U.uP.value.z,0,1);for(let k=0;k<NDL;k++){const l=U.uDL.value[k];if(l.w)gl+=clamp(1-Math.hypot(x-l.x,y-l.y)/l.z,0,1)*.9;}
  return[clamp(sk.x*s+b*1.15+gl,.16,1.2),clamp(sk.y*s+b*.92+gl*.88,.15,1.2),clamp(sk.z*s+b*.63+gl*.66,.17,1.2)];}
export function setTint(mat,x,y){const L=lightAt(x,y);mat.uniforms.uTint.value.set(L[0],L[1],L[2]);}

// ================= inventory helpers =================
export function maxOf(id){return ITEMS[id].max;}
export function addItem(id,n){if(id==='hpheart'){heal(10);return 0;}if(id==='mpstar'){player.mana=Math.min(player.maxMana,player.mana+10);return 0;}
  if(ITEMS[id]&&ITEMS[id].badge){const k=ITEMS[id].badge;if(player.badges.includes(k)){player.coins+=50;updateCoins();toast(`You already own ${BADGES[k][0]}. Got 50 coins instead.`);}else{player.badges.push(k);toast(`New badge: ${BADGES[k][0]}! Equip it from the Party menu.`,'gold');SFX.nice();stat('badges');}return 0;}
  if(id==='coin'){player.coins+=n;updateCoins();stat('coins',n);return 0;}const inv=player.inv;const mx=maxOf(id);
  for(let i=0;i<40&&n>0;i++){const s=inv[i];if(s&&s.id===id&&s.n<mx){const k=Math.min(n,mx-s.n);s.n+=k;n-=k;}}
  for(let i=0;i<40&&n>0;i++){if(!inv[i]){const k=Math.min(n,mx);inv[i]={id,n:k};n-=k;}}setInvDirty(true);return n;}
export function countItem(id){let c=0;for(const s of player.inv)if(s&&s.id===id)c+=s.n;return c;}
export function removeItem(id,n){for(let i=39;i>=0&&n>0;i--){const s=player.inv[i];if(s&&s.id===id){const k=Math.min(n,s.n);s.n-=k;n-=k;if(!s.n)player.inv[i]=null;}}setInvDirty(true);}
export function consumeSel(){const s=player.inv[player.sel];if(!s)return;s.n--;if(s.n<=0)player.inv[player.sel]=null;setInvDirty(true);}
export const hasBuff=k=>player.buffs&&player.buffs[k]>0;
export const hasBadge=k=>player.badgesOn&&player.badgesOn.includes(k);// timing windows widen with the Nice Streak badge, and a little on gamepad to cover its extra input latency
export const niceW=()=>(hasBadge('nice')?1.7:1)*(pad.active?1.3:1);
export const NICE_WIN=.12,NICE_LATE=.09;export const inNiceWin=s=>s&&s.sword&&!s.early&&s.dur-s.t<NICE_WIN*niceW()&&s.dur-s.t>0;
const accHas=(it,k)=>Array.isArray(it.acc)?it.acc.includes(k):it.acc===k;
export function defense(){let d=0;for(const s of player.armor)if(s)d+=ITEMS[s.id].def;for(const s of player.acc)if(s&&accHas(ITEMS[s.id],'def'))d+=ITEMS[s.id].v;if(hasBadge('defend'))d+=3;if(hasBuff('iron'))d+=8;if(hasBuff('ghost'))d+=6;if(hasBuff('fed'))d+=2;if(player.st&&player.st.soak>0)d-=4;return Math.max(0,d);}
// armor sets (SETS in items.js): pieces of set k worn, the set whose bonus is on (all three pieces), and the damage multiplier it gives a kind of attack
export const setCount=k=>player.armor.filter(s=>s&&ITEMS[s.id].set===k).length;
export const fullSet=()=>{const s=player.armor[0],k=s&&ITEMS[s.id].set;return k&&setCount(k)===3?k:null;};
export const setOn=k=>fullSet()===k;
export const setMul=kind=>({melee:'warden',ranged:'sky',magic:'weave'}[kind]===fullSet()?1.2:1);
export const hasAcc=k=>player.acc.some(s=>s&&accHas(ITEMS[s.id],k));
export function shieldItem(){let b=null;for(const s of player.acc)if(s){const it=ITEMS[s.id];if(it.block&&(!b||it.block>b.block))b=it;}return b;}
export function selItem(){const s=player.inv[player.sel];return s?ITEMS[s.id]:null;}
// Imported bindings are read-only, so other modules assign these through setters.
export function setEnemies(v){return enemies=v;}
export function setPickups(v){return pickups=v;}
export function setProjs(v){return projs=v;}
export function setNpcs(v){return npcs=v;}
export function setBoss(v){return boss=v;}
export function setWorldTime(v){return worldTime=v;}
export function setQuests(v){return quests=v;}
export function setHintT(v){return hintT=v;}
export function setBestiary(v){return bestiary=v;}
