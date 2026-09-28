// Paper tricks beyond peeling, popping out and folding flat (issue #80): three tools that open ways back into places you
// already passed. The Seam Ripper tears open a stitched seam in the rock (tear), the Golden Needle sews a torn hole in the
// page shut into a paper bridge (stitch) and the Bone Folder folds the page along a crease mark to step out at its partner
// (fold). Each tool is crafted from a boss's materials, and every spot they open is a side pocket with loot, never the way on.
import {
  BIO,burst,camT,chests,countItem,explored,guideEv,hook,idx,meta,mulberry32,player,popUp,reduceMotion,ruinLoot,
  seed,setTile,SFX,shake,SOLID,SPAWNX,stat,surf,T,tiles,toast,treasureLoot,walls,W,H,
} from './game.js';

// ================= paper tricks =================
// BIO.trick (planned once per world; older saves on their next load, after their chests are restored):
//   seam: [[x, bottom y, opened]] the seam column in front of a hidden brick pocket;
//   rip: [[x, y, sewn]] one cell of each torn hole (the hole is every T.RIP joined to it), across a corridor to a pocket;
//   fold: [[ax, ay, bx, by]] crease pairs: a on a cave floor, b inside a vault sealed all round (T.SEAL), so folding is the only way in.
export const TRICKS={tear:{item:'ripper',tile:T.SEAM},stitch:{item:'needle',tile:T.RIP},fold:{item:'folder',tile:T.CREASE}};
const ROCK=new Set([T.STONE,T.DIRT,T.COPPER,T.IRON,T.GOLD,T.ICE,T.SNOW,T.SAND,T.FROST,T.INKSTONE,T.INKORE]);
export function planTricks(){if(!BIO||!BIO.uw||BIO.trick)return;const rng=mulberry32(seed+8117),tr=BIO.trick={seam:[],rip:[],fold:[]};
  const lx=BIO.lake?BIO.lake[0]:-1e4,deep=(x,y)=>y<=surf[x]-15&&y>BIO.uw+10&&Math.abs(x-SPAWNX)>30&&Math.abs(x-lx)>24;
  const used=[],free=(x,y,r)=>!used.some(u=>Math.abs(u[0]-x)<r&&Math.abs(u[1]-y)<r*.6);
  // a rect of plain rock with no placed wall (x0..x1, y0..y1 inclusive)
  const rock=(x0,x1,y0,y1)=>{if(x0<2||x1>W-3||y0<2||y1>H-3)return false;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=idx(x,y);if(walls[i]>1||!ROCK.has(tiles[i]))return false;}return true;};
  const put=(x,y,t,m=0)=>{const i=idx(x,y);tiles[i]=t;meta[i]=m;};
  // cave floors: open for three rows over solid ground, deep enough, away from the town and the lake; shuffled with the world seed
  const spots=[];for(let y=BIO.uw+12;y<H-8;y++)for(let x=12;x<W-12;x++){if(!deep(x,y)||!SOLID[tiles[idx(x,y-1)]])continue;let ok=true;for(let r=0;r<=2&&ok;r++){const i=idx(x,y+r);if(tiles[i]!==T.AIR||walls[i]>1)ok=false;}if(ok)spots.push([x,y]);}
  for(let i=spots.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[spots[i],spots[j]]=[spots[j],spots[i]];}
  // tear: a seam column in the cave wall, a small brick pocket with a chest behind it
  const nS=Math.max(2,Math.round(W/200));
  for(const[x,y]of spots){if(tr.seam.length>=nS)break;if(!free(x,y,30))continue;
    for(const d of[1,-1]){const c=k=>x+k*d;if(!rock(Math.min(c(1),c(8)),Math.max(c(1),c(8)),y-1,y+3))continue;
      for(let r=0;r<=2;r++)put(c(1),y+r,T.SEAM);
      for(let k=2;k<=8;k++)for(let r=-1;r<=3;r++){const edge=k===8||r===-1||r===3;put(c(k),y+r,edge?T.BRICK:T.AIR);walls[idx(c(k),y+r)]=3;}
      const ci=idx(c(5),y);tiles[ci]=T.CHEST;chests.set(ci,ruinLoot(true));tr.seam.push([c(1),y,0]);used.push([x,y]);break;}}
  // stitch: a low corridor dug into the rock with a torn hole ten tiles across in its floor, and a pocket past it
  const nR=Math.max(2,Math.round(W/220));
  for(const[x,y]of spots){if(tr.rip.length>=nR)break;if(!free(x,y,30))continue;
    for(const d of[1,-1]){const c=k=>x+k*d;if(!rock(Math.min(c(1),c(18)),Math.max(c(1),c(18)),y-5,y+3))continue;
      for(let k=1;k<=17;k++)for(let r=0;r<=2;r++)put(c(k),y+r,T.AIR);
      for(let k=4;k<=13;k++)for(let r=-4;r<=-1;r++)put(c(k),y+r,T.RIP);
      for(let k=14;k<=18;k++)for(let r=-1;r<=3;r++){const edge=k===18||r===-1||r===3;if(edge)put(c(k),y+r,T.BRICK);walls[idx(c(k),y+r)]=3;}
      const ci=idx(c(16),y);tiles[ci]=T.CHEST;chests.set(ci,ruinLoot(true));tr.rip.push([c(8),y-1,0]);used.push([x,y]);break;}}
  // fold: a crease on a cave floor and its partner in a sealed vault of rock some way off, with a chest of treasure
  const nF=Math.max(1,Math.round(W/300));
  for(const[x,y]of spots){if(tr.fold.length>=nF)break;if(!free(x,y,30)||tiles[idx(x,y)]!==T.AIR)continue;
    for(let a=0;a<120;a++){const vx=Math.round(x+(rng()<.5?-1:1)*(25+rng()*45)),vy=Math.round(y-8-rng()*30);if(vx<14||vx>W-26||vy<=BIO.uw+12||!free(vx,vy,20))continue;
      if(!rock(vx-1,vx+11,vy-1,vy+7))continue;
      for(let X=vx;X<=vx+10;X++)for(let Y=vy;Y<=vy+6;Y++){const edge=X===vx||X===vx+10||Y===vy||Y===vy+6;put(X,Y,edge?T.SEAL:T.AIR);walls[idx(X,Y)]=3;}
      put(vx+2,vy+1,T.CREASE);put(vx+5,vy+1,T.CANDLE);const ci=idx(vx+8,vy+1);tiles[ci]=T.CHEST;chests.set(ci,treasureLoot());
      put(x,y,T.CREASE);tr.fold.push([x,y,vx+2,vy+1]);used.push([x,y],[vx+5,vy+3]);break;}}}

// ---- tear: the Seam Ripper rips the seam open from the bottom up
export function tearSeam(x,y){if(!countItem('ripper')){toast('The rock is stitched shut along this seam. A seam ripper could open it.');SFX.rustle(.15,.4);return;}
  const cells=[];let y0=y;while(tiles[idx(x,y0-1)]===T.SEAM)y0--;for(let yy=y0;tiles[idx(x,yy)]===T.SEAM;yy++)cells.push(yy);
  // the seam is marked open only once its last stitch is torn (a save in between keeps the rest to tear); timers from a
  // world that was left meanwhile do nothing
  const b=BIO,s=b.trick&&b.trick.seam.find(s=>s[0]===x&&Math.abs(s[1]-y)<=3);
  cells.forEach((cy,n)=>setTimeout(()=>{if(BIO!==b)return;if(tiles[idx(x,cy)]===T.SEAM){setTile(x,cy,T.AIR);burst(x+.5,cy+.5,['#8d8f9a','#e9dcc0','#d4483b'],10,4);SFX.rustle(.2,.6);}if(s&&n===cells.length-1)s[2]=1;},n*110));
  SFX.peel();shake(.15);toast('You rip the seam open. There was a pocket behind the rock!','gold');stat('tears');guideEv('tear');}
// ---- stitch: the Golden Needle sews the whole hole shut, column by column; its top row becomes a paper patch you can walk on
export function stitchRip(x,y){if(!countItem('needle')){toast('The page is torn right through here. A needle and thread could mend it.');SFX.rustle(.15,.4);return;}
  const seen=new Set([idx(x,y)]),q=[[x,y]],cells=[];while(q.length&&cells.length<400){const[cx,cy]=q.pop();cells.push([cx,cy]);
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,i=idx(nx,ny);if(nx<0||ny<0||nx>=W||ny>=H||seen.has(i)||tiles[i]!==T.RIP)continue;seen.add(i);q.push([nx,ny]);}}
  const xs=cells.map(c=>c[0]),x0=Math.min(...xs),x1=Math.max(...xs),dir=player.x<(x0+x1)/2?1:-1;
  const b=BIO;cells.forEach(([cx,cy])=>{const k=dir>0?cx-x0:x1-cx;setTimeout(()=>{if(BIO!==b||tiles[idx(cx,cy)]!==T.RIP)return;const top=tiles[idx(cx,cy+1)]!==T.RIP&&!seen.has(idx(cx,cy+1));
    setTile(cx,cy,top?T.SEWN:T.AIR);if(top){burst(cx+.5,cy+.9,['#e9dcc0','#fbf8f0','#d4483b'],6,3);SFX.rustle(.15,.5);}},120+k*90);});
  // marked sewn after the last column (each column is sewn in one step, so a save in between leaves whole columns to sew)
  const r=b.trick&&b.trick.rip.find(r=>seen.has(idx(r[0],r[1])));if(r)setTimeout(()=>{if(BIO===b)r[2]=1;},121+(x1-x0)*90);
  SFX.nice();toast('Stitch by stitch, the tear closes into a paper bridge.','gold');stat('stitches');guideEv('stitch');}
// ---- fold: the Bone Folder folds the page so the two creases meet, and you step out of the other one. The vault's own
// crease always folds you back out, tool or not, so leaving the folder in the vault's chest can't shut you in.
export function foldAt(x,y){const f=BIO.trick&&BIO.trick.fold.find(f=>f[0]===x&&f[1]===y||f[2]===x&&f[3]===y);if(!f)return;const out=f[0]===x&&f[1]===y;
  if(out&&!countItem('folder')){toast('A crease runs down the page here, as if it was once folded shut. A bone folder could fold it again.');SFX.rustle(.15,.4);return;}
  const p=player,[tx,ty]=f[0]===x&&f[1]===y?[f[2],f[3]]:[f[0],f[1]],cols=['#e9dcc0','#fbf8f0','#b06ad0'];burst(p.x,p.y+1,cols,24,5,{grav:0});
  p.x=tx+.5;p.y=ty;p.vx=p.vy=0;hook.state=0;camT.x=p.x;camT.y=p.y+1;burst(p.x,p.y+1,cols,24,5,{grav:0});if(!reduceMotion())popUp();SFX.peel();shake(.2);
  toast(out?'The page folds shut along the crease, and you step out somewhere sealed away.':'The page folds you back along the crease.','gold');stat('folds');guideEv('fold');}
// the world map (drawMap) marks every trick spot you have explored and not used up, each with its own shape so they
// read in every color-vision mode: a zig-zag seam, a torn hole, a crease triangle. Opened seams and sewn holes drop off;
// the outer crease stays, since it can be folded again. Nothing new is saved: explored already is.
export function drawTrickMarks(g,S){const tr=BIO&&BIO.trick;if(!tr)return;const seen=(x,y)=>explored[idx(x,y)];
  const at=(x,y,draw)=>{const X=(x+.5)*S,Y=(H-y-.5)*S;g.save();g.translate(X,Y);g.lineJoin='round';g.lineCap='round';draw();g.restore();};
  for(const[x,y,o]of tr.seam)if(!o&&seen(x,y+1))at(x,y+1,()=>{g.fillStyle='#8d8f9a';g.fillRect(-6,-9,12,18);g.lineWidth=2;g.strokeStyle='#2a2130';g.strokeRect(-6,-9,12,18);
    g.beginPath();g.moveTo(0,-9);for(let k=1;k<=4;k++)g.lineTo(k%2?-3:3,-9+k*4.5);g.lineWidth=3;g.strokeStyle='#d4483b';g.stroke();});
  for(const[x,y,o]of tr.rip)if(!o&&seen(x,y))at(x,y,()=>{g.beginPath();g.moveTo(-10,-5);for(let k=0;k<=4;k++)g.lineTo(-10+k*5,k%2?-2:-6);g.lineTo(10,5);for(let k=4;k>=0;k--)g.lineTo(-10+k*5,k%2?2:6);g.closePath();
    g.fillStyle='#1c1520';g.fill();g.lineWidth=2;g.strokeStyle='#e9dcc0';g.stroke();});
  for(const[x,y,vx,vy]of tr.fold)for(const[cx,cy]of[[x,y],[vx,vy]])if(seen(cx,cy))at(cx,cy,()=>{g.beginPath();g.moveTo(0,-9);g.lineTo(8,7);g.lineTo(-8,7);g.closePath();g.fillStyle='#e9dcc0';g.fill();g.lineWidth=2;g.strokeStyle='#2a2130';g.stroke();
    g.beginPath();g.moveTo(0,-9);g.lineTo(0,7);g.setLineDash([3,2]);g.strokeStyle='#b06ad0';g.stroke();g.setLineDash([]);});}
export function trickAt(t,x,y){if(t===T.SEAM)tearSeam(x,y);else if(t===T.RIP)stitchRip(x,y);else if(t===T.CREASE)foldAt(x,y);}

// a torn hole has no page to stand on: stepping into one throws you back to where you last stood. It is a locked door,
// not a trap, so it costs no life
let safe=null,ripT=0,trBIO=null;
export function updateTricks(dt){const p=player;ripT-=dt;if(trBIO!==BIO){trBIO=BIO;safe=null;}if(p.dead||!BIO||!BIO.uw)return;
  const x0=Math.floor(p.x-p.w/2),x1=Math.floor(p.x+p.w/2),y0=Math.floor(p.y),y1=Math.floor(p.y+p.h);let inRip=false,nearRip=false;
  for(let y=y0-1;y<=y1;y++)for(let x=x0-1;x<=x1+1;x++){if(tiles[idx(x,y)]!==T.RIP)continue;nearRip=true;if(x>=x0&&x<=x1&&y>=y0)inRip=true;}
  if(!inRip){if(p.onGround&&!nearRip)safe={x:p.x,y:p.y};return;}
  burst(p.x,p.y+.8,['#1c1520','#5a3c78','#e9dcc0'],14,4,{grav:-2});if(safe){p.x=safe.x;p.y=safe.y;}else p.y+=3;p.vx=p.vy=0;SFX.rustle(.2,.5);
  if(ripT<=0){ripT=4;toast('The torn page will not hold you. It could be sewn shut.','bad');}}
