// Main story thread: lore pages (landmarks, Wren's letters, murals, keepers, partners, epilogue), the Journal page and the landmarks.
import * as THREE from 'three';
import {
  $,BIO,biomeAt,N,canvasTex,chapterCard,circ,DU,enemies,fi,grain,H,idx,ink,isAwake,meta,mk,mulberry32,PARTNERS,partnerSpeaker,
  OPAQUE,player,poly,quests,rr,say,scene,seed,setInvDirty,setTab,pickPage,SFX,SPAWNX,surf,T,tiles,toast,W,walls,
} from './game.js';

// ================= lore =================
// The mystery (docs/STORY.md): the world was folded from the First Page by the Folders; three landmarks pin it down,
// four keepers hold its seams, and the folds are failing because the First Page (The Unfolded) wants to lie flat.
// Every piece is optional and can be found in any order. Per-world state: lore.f = {key: 1} for pages found, lore.ch = chests that already gave a letter
// (keys are saved, keep them stable). Pages are read in the backpack's Journal tab (loreHTML).
export let lore={f:{}};
export const newLore=()=>({f:{},ch:[]});
// kind: landmark, letter, mural, keeper (key = the boss's quest), partner (key = the partner), epilogue.
// t title, x text, h hint while locked; partners also say their page (s) a little after they join.
export const LORE=[
  {k:'tree',kind:'landmark',t:'The Folded Tree',h:'A giant tree stands somewhere in the Paper Meadow.',
    x:'Carved into a root in tiny, careful letters: "The first fold. Everything else was folded around it. If this tree ever drops its leaves out of season, the paper is tired." Its leaves are falling now, whatever the season.'},
  {k:'clock',kind:'landmark',t:'The Broken Clocktower',h:'A tower in the Sandpaper Dunes has stopped keeping time.',
    x:'A plaque by the door: "This tower keeps the folds in time: spring, summer, fall and winter, crease by crease." The hands are stuck at the moment it cracked, and the top is torn clean away, as if something pulled the page from underneath.'},
  {k:'dragon',kind:'landmark',t:'The Paper Dragon',h:'Something huge lies half buried in the Origami Snowfield.',
    x:'The Folders\' guardian, folded to hold down the far edge of the world. A note is pinned to a rib: "It didn\'t die fighting. It unfolded itself, one pleat at a time, to see what it was before. Don\'t let the rest of the world do the same. W."'},
  {k:'l1',kind:'letter',t:'Wren\'s letter: tired paper',h:'Letters are tucked into ruin chests and buried treasure.',
    x:'To whoever finds this: we are the Folders. We made this land out of one great sheet, the First Page, and every hill is a crease we pressed. Lately the creases won\'t stay sharp. Paper gets tired, I suppose. So do Folders.'},
  {k:'l2',kind:'letter',t:'Wren\'s letter: the ink rises',h:'Letters are tucked into ruin chests and buried treasure.',
    x:'The lake rose past its banks last night, under a purple moon. That ink is what we drew the world with, and it wants to go back to being a drawing, flat and still. We have started calling that moon the Ink Moon.'},
  {k:'l3',kind:'letter',t:'Wren\'s letter: the keepers',h:'Letters are tucked into ruin chests and buried treasure.',
    x:'We asked four friends to hold the worst seams for us: the slime to glue the surface, the crane to keep the pine fold tight, the leviathan to calm the ink, and the Folio to remember every fold we ever made. I worry about asking anyone to hold on that hard for that long.'},
  {k:'l4',kind:'letter',t:'Wren\'s letter: the First Page',h:'Letters are tucked into ruin chests and buried treasure.',
    x:'Found it. Under the shrine, a corner of the First Page never took a crease. It remembers being flat. It is pulling, gently, on every seam at once, and it is patient. We will not win this by folding faster.'},
  {k:'l5',kind:'letter',t:'Wren\'s letter: the last Folder',h:'Letters are tucked into ruin chests and buried treasure.',
    x:'The others have gone into the creases. That is how a Folder ends: you press yourself into the paper and hold it from the inside. I will go too, soon. I am leaving these letters in the old rooms in case someone new comes along. Be kind to the paper. Wren'},
  {k:'m1',kind:'mural',t:'Mural: the Folding',h:'Murals are painted on the walls of old ruins and the ink shrine.',
    x:'Hands the size of hills fold one great sheet. Mountains rise along the creases, a lake of ink pools in a dip, and small paper creatures climb out of the folds.'},
  {k:'m2',kind:'mural',t:'Mural: the anchors',h:'Murals are painted on the walls of old ruins and the ink shrine.',
    x:'The world is shown pinned at three points: a tree, a tower and a long-necked dragon. Between them four figures hold the seams: a crowned blob, a bird, an inky fish and an open book.'},
  {k:'m3',kind:'mural',t:'Mural: the blank figure',h:'Murals are painted on the walls of old ruins and the ink shrine.',
    x:'A figure with no face stands in the middle, cut from paper with no creases at all. Every line of the mural bends toward it, like threads pulled from a hem.'},
  {k:'m4',kind:'mural',t:'Mural: the silver lining',h:'Murals are painted on the walls of old ruins and the ink shrine.',
    x:'The last panel shows the world unfolded flat, and then folding again by itself into shapes the Folders never made. Silver glints along the new creases.'},
  {k:'king',kind:'keeper',t:'Keeper: the King Slime',h:'Defeat the King Slime.',
    x:'Under the crown was a Folder\'s seal. The King was the glue of the surface, sticking every meadow to the page below. It held on so tightly it forgot why, and its gel came loose everywhere at once.'},
  {k:'crane',kind:'keeper',t:'Keeper: the Great Crane',h:'Defeat the Great Crane.',
    x:'The Crane was folded from the very first pine. It kept the pine fold tight for so long that every feather turned sharp. As it falls, the wind in the pines sounds like a sigh of relief.'},
  {k:'lev',kind:'keeper',t:'Keeper: the Inkwell Leviathan',h:'Defeat the Inkwell Leviathan.',
    x:'The Leviathan kept the lake calm, the same ink the world was drawn with. Under the Ink Moon it heard the ink wanting to go flat, and it began to want that too.'},
  {k:'folio',kind:'keeper',t:'Keeper: the Charred Folio',h:'Defeat the Charred Folio.',
    x:'The Folio held the instructions for every fold in the world, and burned when the underworld\'s creases tore open. One scorched line is still readable: "The First Page must never be flattened, only asked."'},
  {k:'unfolded',kind:'keeper',t:'The Unfolded',h:'Solve the riddle of the ink shrine.',
    x:'The First Page itself, the one part of the sheet that never took a crease. It never hated the world; it only remembered being flat and wanted to rest. When it fell it let go of every seam at once, and the world did not fall apart. It began to fold itself.'},
  {k:'lumi',kind:'partner',t:'Lumi remembers',h:PARTNERS.lumi.how,
    x:'Lumi was the Folders\' night-lantern, left burning in a cabin window so the dark would stay folded away. Wren used to talk to Lumi while she worked, about the paper getting tired.',
    s:['{surprised}I remember now! I was the Folders\' *night-lantern*.','{sad}Wren kept me in her window. She said the paper was getting ~tired~.']},
  {k:'snip',kind:'partner',t:'Snip remembers',h:PARTNERS.snip.how,
    x:'Snip was the Folders\' scissors, trimming loose edges so nothing came unraveled. The King Slime jarred Snip because a pair of scissors near a seam that is already coming apart is a frightening thing.',
    s:['{neutral}Snip snip... I used to trim the *Folders\'* loose edges.','{angry}That jelly king thought I would cut its seam. As if! {happy}I only snip *bad guys*.']},
  {k:'smudge',kind:'partner',t:'Smudge remembers',h:PARTNERS.smudge.how,
    x:'Smudge is a blot of the very first ink, the ink the world was drawn with. Smudge can dig through anything because, deep down, everything here is drawn with the same stuff.',
    s:['{surprised}Arf! I know why I can dig through *anything*.','{happy}I am made of the *first ink*. Everything here is drawn with it!']},
  {k:'ember',kind:'partner',t:'Ember remembers',h:PARTNERS.ember.how,
    x:'Ember is a spark that jumped from the Charred Folio as it burned. It still carries one word of the Folio\'s instructions: ask.',
    s:['{neutral}When the Folio burned, I jumped out with *one word* still in me.','{happy}The word is *ask*. I think it is for the First Page.']},
  {k:'awake',kind:'epilogue',t:'Epilogue: the world folds itself',h:'Defeat The Unfolded.',
    x:'A last note from Wren, tucked into your journal where no note was before: "If you are reading this, the First Page let go and the world is folding itself now: new creases, new shapes, Foilite shining where the paper was never pressed. It does not need Folders anymore. It needs someone to walk it. Go and see what it folds into."'},
];
const LK=Object.fromEntries(LORE.map(l=>[l.k,l]));
const KIND={landmark:'Landmarks',letter:'Wren\'s letters',mural:'Murals',keeper:'The keepers',partner:'Partners',epilogue:'Epilogue'};
export const loreCount=()=>LORE.filter(l=>lore.f[l.k]).length;
// find a page; quiet skips the toast (pages filled in on load)
export function findLore(k,quiet){if(!LK[k]||lore.f[k])return false;lore.f[k]=1;setInvDirty(true);if(!quiet){toast(`New Journal page: ${LK[k].t} (${loreCount()} of ${LORE.length})`,'gold');SFX.nice();}return true;}
// opening a chest (the first time it gives one, even if it was opened before this build): ruins (brick back wall) and buried treasure hold Wren's letters, in order
export function loreChest(i){const tr=(BIO.treasure||[]).some(([x,y])=>idx(x,y)===i);if(walls[i]!==3&&!tr)return;lore.ch=lore.ch||[];if(lore.ch.includes(i))return;const l=LORE.find(l=>l.kind==='letter'&&!lore.f[l.k]);if(l&&findLore(l.k)){lore.ch.push(i);toast(`A letter was tucked inside: "${l.t}"`);}}
// right-click a mural: find its page and open the Journal on it
export function readMural(x,y){const k='m'+((meta[idx(x,y)]&3)+1);findLore(k);openJournal(k);}
export function openJournal(k){setTab('story');if(k)pickPage('story',k);}
// the Journal (issue #144): titles only, grouped by kind, with pages not read yet marked New (lore.f[k] is 1 when found,
// 2 once read); a page opens in the reader (loreRead) instead of the list
export function readLore(k){if(lore.f[k]===1){lore.f[k]=2;setInvDirty(true);}}
export const loreUnread=()=>LORE.filter(l=>lore.f[l.k]===1).length;
export function loreHTML(){const nu=loreUnread();let h=`<div class="sideTip"><b>The Unfolding</b>The Frontier was folded from one great sheet, and its folds are coming loose. Landmarks, ruins, the keepers and your partners each hold a piece of why.</div><p class="hint">${loreCount()} of ${LORE.length} pages found${nu?`, ${nu} not read yet`:''}. Click a page to read it. Right-click a mural to read it.</p>`;
  for(const kd in KIND){const L=LORE.filter(l=>l.kind===kd);h+=`<h3 style="margin-top:8px">${KIND[kd]} · ${L.filter(l=>lore.f[l.k]).length} / ${L.length}</h3><div class="lgrid">`;
    h+=L.map(l=>lore.f[l.k]?`<div class="lore${lore.f[l.k]===1?' new':''}" data-lore="${l.k}" role="button"><b>${l.t}</b>${lore.f[l.k]===1?'<i>New</i>':''}</div>`:`<div class="lore lock" data-lore="${l.k}"><b>???</b><span>${l.h}</span></div>`).join('')+'</div>';}
  return h;}
export function loreRead(k){const l=k&&LK[k];if(!l||!lore.f[k])return '';const L=LORE.filter(o=>o.kind===l.kind&&lore.f[o.k]),i=L.indexOf(l);
  return `<div class="row loreNav"><button type="button" class="ghost loreBack">‹ All pages</button><small>${KIND[l.kind]} · ${i+1} of ${L.length} found</small></div><article class="loreRead"><h2>${l.t}</h2><p>${l.x}</p></article>`+
    (L.length>1?`<div class="row loreNav">${i>0?`<div class="lore" data-lore="${L[i-1].k}" role="button"><b>‹ ${L[i-1].t}</b></div>`:''}${i<L.length-1?`<div class="lore" data-lore="${L[i+1].k}" role="button" style="margin-left:auto"><b>${L[i+1].t} ›</b></div>`:''}</div>`:'');}

// ================= murals =================
// Painted once per world into ruin rooms and the shrine (new worlds right after generation, older saves on their next
// load): a free spot on a brick back wall two tiles above the floor, one per room where there are enough (see the fallbacks below). BIO.murals = murals painted; under 4 retries on the next load.
export function placeMurals(){if(!BIO||!BIO.uw||BIO.murals>=4)return;const rng=mulberry32(seed+6161),cand=[],deep=(x,y)=>y<=surf[x]-20&&Math.abs(x-SPAWNX)>=30;
  // murals already painted (a world that came up short is topped up on its next load, keeping the numbers it has)
  const out=[],have=new Set();for(let i=0;i<N;i++)if(tiles[i]===T.MURAL){out.push([i%W,(i/W)|0]);have.add(meta[i]&3);}
  const miss=[0,1,2,3].filter(n=>!have.has(n));
  for(let y=3;y<H-2;y++)for(let x=2;x<W-2;x++){const i=y*W+x;if(walls[i]!==3||tiles[i]!==T.AIR||walls[i-1]!==3||walls[i+1]!==3)continue;
    // ruins and the shrine sit deep and away from home, which keeps murals out of rooms a player walled with brick
    if(!deep(x,y))continue;
    if(tiles[i-W]===T.AIR&&tiles[i-1]===T.AIR&&tiles[i+1]===T.AIR&&(tiles[i-2*W]===T.BRICK||tiles[i-2*W]===T.STONE))cand.push([x,y]);}
  for(let i=cand.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cand[i],cand[j]]=[cand[j],cand[i]];}
  const add=[],far=(c,dx,dy)=>out.concat(add).every(o=>Math.abs(o[0]-c[0])>dx||Math.abs(o[1]-c[1])>dy),need=()=>add.length<miss.length;
  for(const c of cand)if(need()&&far(c,14,10))add.push(c);
  // too few rooms (small worlds): share a room, then a deep natural cave wall, then any deep open spot with a floor,
  // each a full scan of the world rather than random tries
  for(const c of cand)if(need()&&far(c,2,2))add.push(c);
  const scan=ok=>{for(let y=3;y<H-2&&need();y++)for(let x=2;x<W-2&&need();x++){const i=y*W+x;if(deep(x,y)&&tiles[i]===T.AIR&&tiles[i-W]===T.AIR&&OPAQUE[tiles[i-2*W]]&&ok(i)&&far([x,y],6,6))add.push([x,y]);}};
  scan(i=>walls[i]===1);scan(()=>1);
  add.forEach(([x,y],k)=>{const i=idx(x,y);tiles[i]=T.MURAL;meta[i]=miss[k];});BIO.murals=have.size+add.length;}

// ================= landmarks =================
// Three anchors of the story that stand far behind the tiles (z -24, between the hills and the back foliage), big
// enough to see from a long way off. Placed from the seed (BIO.marks = [[key, x, ground y], ...]), found by walking up
// to them, and marked on the world map. The art is drawn in code on a canvas (MARKS[k].draw).
const MZ=-24;
export const MARKS={
  tree:{n:'The Folded Tree',w:28,h:30,cw:512,ch:640,draw:drawTree},
  clock:{n:'The Broken Clocktower',w:12,h:29,cw:256,ch:640,draw:drawClock},
  dragon:{n:'The Paper Dragon',w:42,h:16,cw:1024,ch:400,draw:drawDragon},
};
export function planMarks(){if(!BIO||!BIO.uw||BIO.marks||!BIO.snow)return;const rng=mulberry32(seed+8585),out=[];
  const ground=x=>{let y=H;for(let d=-6;d<=6;d++)y=Math.min(y,surf[Math.max(0,Math.min(W-1,x+d))]);return y;};
  const clear=x=>Math.abs(x-SPAWNX)>=40&&!(BIO.camps||[]).some(c=>Math.abs(c.x0+5-x)<24)&&Math.abs(x-BIO.lake[0])>BIO.lake[1]+20;
  // the tree: somewhere in the open meadow, not too far from home
  const F=[];for(let x=30;x<W-30;x+=3)if(biomeAt(x,surf[x])==='forest'&&clear(x))F.push(x);F.sort((a,b)=>Math.abs(a-SPAWNX)-Math.abs(b-SPAWNX));
  if(F.length){const x=F[Math.floor(rng()*Math.min(F.length,Math.max(1,F.length/3)))];out.push(['tree',x,ground(x)]);}
  // the clocktower in the dunes, the dragon in the snowfield: a few tries for a spot clear of camps
  const inside=(r,s)=>{let x=0;for(let a=0;a<12;a++){x=Math.round((r[0]+r[1])/2+(rng()-.5)*(r[1]-r[0])*s);if(clear(x))break;}return x;};
  {const x=inside(BIO.desert,.6);out.push(['clock',x,ground(x)]);}{const x=inside(BIO.snow,.7);out.push(['dragon',x,ground(x)]);}
  BIO.marks=out;}
const markTex={};let markMeshes=[];
const MVS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const MFS=`uniform sampler2D map;uniform vec3 uTint;uniform vec3 uFog;uniform float uAlpha;varying vec2 vUv;void main(){vec4 t=texture2D(map,vUv);if(t.a<.5)discard;gl_FragColor=vec4(mix(t.rgb*uTint,uFog,.12),uAlpha);}`;
export function buildMarks(){markMeshes.forEach(m=>{scene.remove(m);m.geometry.dispose();m.material.dispose();});markMeshes=[];
  for(const[k,x,y]of(BIO&&BIO.marks)||[]){const d=MARKS[k];if(!d)continue;if(!markTex[k]){const c=mk(d.cw,d.ch),t=c.getContext('2d');d.draw(t,d.cw,d.ch);grain(t,0,0,d.cw,d.ch,10);markTex[k]=canvasTex(c);}
    const g=new THREE.PlaneGeometry(d.w,d.h);g.translate(0,d.h/2,0);
    const m=new THREE.Mesh(g,new THREE.ShaderMaterial({vertexShader:MVS,fragmentShader:MFS,transparent:true,depthWrite:false,uniforms:{map:{value:markTex[k]},uTint:DU.uTint,uFog:DU.uFog,uAlpha:DU.uAlpha}}));
    m.position.set(x,y-3,MZ);m.renderOrder=-12;scene.add(m);markMeshes.push(m);}}
// paper cutout: fill, a cream cut edge inside the outline, then ink
function cut(t,col,lw=4){t.fillStyle=col;t.fill();t.save();t.clip();t.strokeStyle='rgba(255,249,232,.6)';t.lineWidth=lw*2.2;t.lineJoin='round';t.stroke();t.restore();ink(t,lw);}
function crease(t,x0,y0,x1,y1,a=.3){t.beginPath();t.moveTo(x0,y0);t.lineTo(x1,y1);t.strokeStyle=`rgba(42,33,48,${a})`;t.lineWidth=2.5;t.stroke();}
function drawTree(t,w,h){const r=mulberry32(77),cx=w/2;
  // pleated trunk: alternating light and dark facets, flaring into roots
  poly(t,[cx-44,h-4,cx-30,h-60,cx-26,h*.5,cx+26,h*.5,cx+30,h-60,cx+44,h-4]);cut(t,'#8a5a3a',5);
  for(let k=-2;k<=2;k++){const x=cx+k*11;poly(t,[x-5,h-8,x-4,h*.51,x+5,h*.51,x+6,h-8]);t.fillStyle=k%2?'rgba(42,33,48,.18)':'rgba(255,240,215,.16)';t.fill();}
  for(const s of[-1,1]){poly(t,[cx+s*30,h-40,cx+s*80,h-4,cx+s*40,h-4]);cut(t,'#7a4e32',4);}
  for(const s of[-1,1]){poly(t,[cx+s*14,h*.6,cx+s*130,h*.44,cx+s*136,h*.47,cx+s*22,h*.66]);cut(t,'#8a5a3a',4);}
  // canopy of origami fans, a few dropping out of season
  const fan=(x,y,rd,col)=>{const n=7;for(let i=0;i<n;i++){const a0=Math.PI*(1.05+i/n*.9),a1=Math.PI*(1.05+(i+1)/n*.9);poly(t,[x,y,x+Math.cos(a0)*rd,y+Math.sin(a0)*rd,x+Math.cos(a1)*rd,y+Math.sin(a1)*rd]);cut(t,i%2?col:shade(col),3);}};
  const cols=['#5a9a4c','#4f8a45','#6aa856','#3f7a3b'];
  for(const[dx,dy,rd]of[[-160,.5,110],[160,.48,110],[-86,.4,130],[86,.38,130],[0,.33,150],[-40,.47,100],[50,.46,100]])fan(cx+dx,h*dy,rd,cols[Math.floor(r()*cols.length)]);
  for(let i=0;i<7;i++){const x=cx+(r()-.5)*300,y=h*(.58+r()*.36);t.save();t.translate(x,y);t.rotate(r()*6);poly(t,[0,-12,9,0,0,12,-9,0]);cut(t,r()<.5?'#d9a441':'#c65a3a',2);t.restore();}}
function shade(c){const n=parseInt(c.slice(1),16),f=.82;return`rgb(${(n>>16)*f|0},${(n>>8&255)*f|0},${(n&255)*f|0})`;}
function drawClock(t,w,h){const cx=w/2;
  // tapered stone tower whose top has been torn away
  t.beginPath();t.moveTo(cx-100,h-4);t.lineTo(cx-78,h*.2);t.lineTo(cx-60,h*.14);t.lineTo(cx-38,h*.2);t.lineTo(cx-14,h*.1);t.lineTo(cx+10,h*.19);t.lineTo(cx+34,h*.12);t.lineTo(cx+56,h*.22);t.lineTo(cx+78,h*.18);t.lineTo(cx+100,h-4);t.closePath();cut(t,'#c98466',5);
  t.save();t.clip();t.strokeStyle='rgba(120,60,40,.3)';t.lineWidth=3;for(let y=h*.24;y<h;y+=34){t.beginPath();t.moveTo(0,y);t.lineTo(w,y+4);t.stroke();for(let x=((y/34)%2)*30;x<w;x+=60){t.beginPath();t.moveTo(x,y);t.lineTo(x,y+34);t.stroke();}}t.restore();
  crease(t,cx-60,h*.14,cx-10,h*.9,.18);crease(t,cx+34,h*.12,cx+20,h*.8,.18);
  // the stopped clock, a crack through its face and gears showing at the tear
  circ(t,cx,h*.33,62);cut(t,'#f4ecd8',5);for(let i=0;i<12;i++){const a=i/12*6.283;t.beginPath();t.moveTo(cx+Math.cos(a)*50,h*.33+Math.sin(a)*50);t.lineTo(cx+Math.cos(a)*(i%3?44:38),h*.33+Math.sin(a)*(i%3?44:38));ink(t,i%3?2.5:4);}
  t.beginPath();t.moveTo(cx,h*.33);t.lineTo(cx-8,h*.33-40);ink(t,6);t.beginPath();t.moveTo(cx,h*.33);t.lineTo(cx+30,h*.33+10);ink(t,5);circ(t,cx,h*.33,6);fi(t,'#2a2130',1);
  t.beginPath();t.moveTo(cx+18,h*.33-58);t.lineTo(cx+8,h*.33-20);t.lineTo(cx+24,h*.33+4);t.lineTo(cx+12,h*.33+60);ink(t,3);
  for(const[x,y,rd]of[[cx-36,h*.16,20],[cx+20,h*.14,16]]){t.beginPath();for(let i=0;i<16;i++){const a=i/16*6.283,q=i%2?rd:rd*1.28;t.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}t.closePath();cut(t,'#c9a24a',3);circ(t,x,y,rd*.35);fi(t,'#6c6e79',2);}
  rr(t,cx-26,h-110,52,106,26);cut(t,'#5a3a2a',4);for(const y of[h*.55,h*.72]){rr(t,cx-16,y,32,44,16);cut(t,'#3a2a3a',3);}}
function drawDragon(t,w,h){const by=h-30;
  // a long paper skeleton lying in the snow: arched spine, folded ribs, skull and a broken wing frame
  t.beginPath();t.moveTo(60,by);for(let x=60;x<=w-240;x+=10)t.lineTo(x,by-120-Math.sin((x-60)/(w-300)*Math.PI)*110);t.lineWidth=22;t.strokeStyle='#2a2130';t.stroke();t.lineWidth=14;t.strokeStyle='#f4f0e6';t.stroke();
  for(let x=200;x<=w-320;x+=46){const top=by-120-Math.sin((x-60)/(w-300)*Math.PI)*110;for(const s of[-1,1]){t.beginPath();t.moveTo(x,top);t.quadraticCurveTo(x+s*40,top+60,x+s*18,by+10);t.lineWidth=13;t.strokeStyle='#2a2130';t.stroke();t.lineWidth=7;t.strokeStyle=s>0?'#f4f0e6':'#dcd3c2';t.stroke();}}
  t.beginPath();t.moveTo(60,by);t.quadraticCurveTo(20,by-10,8,by-40);t.lineWidth=12;t.strokeStyle='#2a2130';t.stroke();t.lineWidth=6;t.strokeStyle='#f4f0e6';t.stroke();
  // wing frame
  const wx=w*.42,wy=by-220;for(const[a,b]of[[wx-160,wy-110],[wx-60,wy-150],[wx+40,wy-120]]){t.beginPath();t.moveTo(wx,wy);t.lineTo(a,b);t.lineWidth=10;t.strokeStyle='#2a2130';t.stroke();t.lineWidth=5;t.strokeStyle='#f4f0e6';t.stroke();}
  poly(t,[wx,wy,wx-160,wy-110,wx-120,wy-60]);t.fillStyle='rgba(244,240,230,.55)';t.fill();ink(t,2);
  // skull resting on the snow
  const sx=w-210,sy=by-40;poly(t,[sx,sy-70,sx+120,sy-60,sx+190,sy-10,sx+120,sy+10,sx+60,sy+26,sx,sy+20]);cut(t,'#f4f0e6',5);
  poly(t,[sx+10,sy-66,sx-30,sy-130,sx+34,sy-72]);cut(t,'#e9dcc0',4);poly(t,[sx+120,sy+10,sx+190,sy-10,sx+180,sy+24,sx+110,sy+30]);cut(t,'#dcd3c2',4);
  circ(t,sx+80,sy-32,15);fi(t,'#2a2130',2);for(let k=0;k<5;k++){poly(t,[sx+118+k*14,sy+10,sx+124+k*14,sy+24,sx+130+k*14,sy+8]);fi(t,'#fbf8f0',1.5);}
  crease(t,sx+20,sy-60,sx+90,sy+14,.25);
  // snow drifting over the bones
  t.beginPath();t.moveTo(0,h);for(let x=0;x<=w;x+=40)t.lineTo(x,by+6-Math.sin(x*.02)*10-Math.sin(x*.057)*6);t.lineTo(w,h);t.closePath();cut(t,'#f6f9fb',4);}

// ================= story updates =================
// runs every frame while playing: landmarks found by walking up to them, keeper pages when a boss falls, partner
// pages (said aloud) a little after a partner joins, and the epilogue a while after the World Awakening
let loreT=0,awT=12;const palT={};
const BOSSK=['king','crane','lev','folio','unfolded'];
export function updateLore(dt){if(player.dead)return;if((loreT-=dt)>0)return;loreT=.5;
  for(const[k,x,y]of BIO.marks||[]){if(lore.f[k]||Math.abs(player.x-x)>14||player.y<y-14)continue;findLore(k);chapterCard(null,MARKS[k].n,'A page of the story has been found.','Landmark');}
  for(const k of BOSSK)if(quests[k]&&!lore.f[k])findLore(k);
  for(const k of player.partners){if(lore.f[k]||!LK[k])continue;palT[k]=(palT[k]??10)-.5;if(palT[k]>0||enemies.some(e=>Math.abs(e.x-player.x)<16&&Math.abs(e.y-player.y)<12))continue;findLore(k);if(LK[k].s)say(partnerSpeaker(k),LK[k].s,{wait:1});}
  if(isAwake()&&!lore.f.awake&&(awT-=.5)<=0)findLore('awake');}
// on load: fill in pages already earned (bosses beaten, partners met, an awakened world) without toasts
export function syncLore(){for(const k of BOSSK)if(quests[k])findLore(k,true);for(const k of player.partners)findLore(k,true);if(isAwake())findLore('awake',true);awT=12;}
// Imported bindings are read-only, so other modules assign these through setters.
export function setLore(v){return lore=v;}
