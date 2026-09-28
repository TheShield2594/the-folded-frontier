// Vertical layers: the sky islands above the surface and the Pressed Deep between the caves and the underworld.
import {
  BIO,chapterCard,chests,clamp,H,idx,makeNoise,meta,mulberry32,pick,player,popUp,randi,reduceMotion,SFX,stat,surf,T,tiles,W,walls,
  clockNear,dunAt,DUNGEONS,
} from './game.js';

// ================= layers =================
// which layer a point is in: inside a dungeon its lay (dungeons.js: 'tower' the Folded Clocktower, 'archive' the Hollow Archive), 'sky' above the sky floor of a world that has
// islands, 'deep' in the Pressed Deep band, otherwise null. Worlds made before the layers existed have neither (BIO.sky/BIO.deep).
export function layerAt(x,y){if(!BIO||!BIO.uw)return null;{const k=dunAt(x,y);if(k)return DUNGEONS[k].lay;}const s=BIO.sky;if(s&&s.is&&s.is.length&&y>=s.y)return 'sky';
  const d=BIO.deep;if(d&&y>=d[0]-3&&y<=d[1]+3)return 'deep';return null;}
export function skyLoot(){const s=[];const add=(id,n)=>s.push({id,n});add('coin',randi(120,260));add('skybar',randi(3,7));add('cloud',randi(20,40));
  add(pick(['kite','beacon','pendant','b_feather','b_quick','magnet']),1);if(Math.random()<.5)add('fstar',randi(3,6));if(Math.random()<.4)add('bpup',1);
  if(Math.random()<.5)add(pick(['potswift','potregen','potiron']),randi(1,3));while(s.length<20)s.push(null);return s;}
function machineLoot(){const s=[];const add=(id,n)=>s.push({id,n});add('cog',randi(3,6));add('coin',randi(80,200));add(pick(['goldbar','frostbar','ironbar']),randi(4,9));
  if(Math.random()<.5)add(pick(['toolbelt','lantern','clock','magnet','tackle']),1);if(Math.random()<.35)add('heart',1);if(Math.random()<.5)add(pick(['potiron','potnight','potghost']),randi(1,3));
  while(s.length<20)s.push(null);return s;}

// The Pressed Deep: a band of slate (T.DEEP, pick 4) across the whole world above the underworld, so the underworld and everything
// in the band wait for the Frostsilver Pickaxe. A solid crust of at least four rows stays on each side; caverns inside hold
// ink lakes (the world's water), gold veins, ancient machines with a chest beside them and great fossil skeletons.
export function genDeep(sd){const d=BIO.deep;if(!d)return;const nz=makeNoise(sd+501),r=mulberry32(sd+502),[y0,y1]=d,LO=new Int16Array(W),HI=new Int16Array(W);
  for(let x=0;x<W;x++){const lo=LO[x]=y0+Math.round((nz.n2(x/13,1.7)-.5)*5),hi=HI[x]=y1+Math.round((nz.n2(x/13,8.1)-.5)*5);
    for(let y=lo;y<=hi;y++){const i=idx(x,y);if(tiles[i]===T.CORE)continue;let t=T.DEEP;
      if(y>lo+3&&y<hi-3&&x>2&&x<W-3){if(nz.fbm(x/30,y/9,3)>.54)t=T.AIR;else if(nz.n2(x/4+800,y/4+60)>.8)t=T.GOLD;}
      tiles[i]=t;meta[i]=0;walls[i]=1;}}
  const inner=(x,y)=>x>3&&x<W-4&&y>LO[x]+3&&y<HI[x]-3;
  // a cavern floor: open air with slate under it
  const floor=()=>{for(let a=0;a<150;a++){const x=Math.floor(8+r()*(W-16));for(let y=HI[x]-4;y>LO[x]+4;y--){const i=idx(x,y);if(tiles[i]===T.AIR&&tiles[i-W]===T.DEEP&&tiles[i+W]===T.AIR&&tiles[i+2*W]===T.AIR)return[x,y];}}return null;};
  // underground ink lakes: fill a basin up to three rows deep, only where both ends are walled in
  for(let k=0;k<Math.round(W/45);k++){const f=floor();if(!f)continue;const[fx,fy]=f;
    for(let lv=0;lv<3;lv++){const y=fy+lv;let a=fx,b=fx;while(a>0&&tiles[idx(a-1,y)]===T.AIR&&fx-a<16)a--;while(b<W-1&&tiles[idx(b+1,y)]===T.AIR&&b-fx<16)b++;
      if(tiles[idx(a-1,y)]===T.AIR||tiles[idx(b+1,y)]===T.AIR)break;let held=true;for(let x=a;x<=b;x++){const u=tiles[idx(x,y-1)];if(u===T.AIR)held=false;}if(!held)break;
      for(let x=a;x<=b;x++)tiles[idx(x,y)]=T.INK;}}
  // ancient machines: a block of brass works on a cavern floor, a chest beside it
  const used=[];for(let k=0,tries=0;k<Math.max(3,Math.round(W/70))&&tries<400;tries++){const f=floor();if(!f)continue;const[fx,fy]=f;if(used.some(u=>Math.abs(u-fx)<30))continue;
    let ok=true;for(let x=fx-3;x<=fx+3&&ok;x++)for(let y=fy;y<=fy+3;y++)if(!inner(x,y)||tiles[idx(x,y)]!==T.AIR)ok=false;for(let x=fx-3;x<=fx+3&&ok;x++)if(tiles[idx(x,fy-1)]===T.AIR||tiles[idx(x,fy-1)]===T.INK)ok=false;if(!ok)continue;
    for(let x=fx-2;x<=fx+2;x++)for(let y=fy;y<=fy+2;y++)if(!(y===fy+2&&(x===fx-2||x===fx+2)))tiles[idx(x,y)]=T.MACHINE;
    const ci=idx(fx+3,fy);tiles[ci]=T.CHEST;chests.set(ci,machineLoot());used.push(fx);k++;}
  // fossil skeletons pressed into the slate: a spine, ribs hanging under it and a skull at one end. Only in the band's inside,
  // so digging the bones (pick 2) never opens a way through the crust.
  for(let k=0,tries=0;k<Math.max(3,Math.round(W/60))&&tries<600;tries++){const len=9+Math.floor(r()*6),x0=Math.floor(10+r()*(W-30)),y=Math.floor(y0+5+r()*Math.max(1,y1-y0-10)),dir=r()<.5?1:-1;
    let ok=true;for(let s=-1;s<=len+3&&ok;s++)for(let dy=-4;dy<=2;dy++){const x=x0+s*dir;if(!inner(x,y+dy)||tiles[idx(x,y+dy)]!==T.DEEP)ok=false;}if(!ok)continue;
    for(let s=0;s<len;s++){const x=x0+s*dir;tiles[idx(x,y+Math.round(Math.sin(s*.5)*.6))]=T.BONE;if(s%2===1&&s<len-2)for(let dy=1;dy<=(s>2&&s<len-4?3:2);dy++)tiles[idx(x,y-dy)]=T.BONE;}
    for(let s=len;s<len+3;s++)for(let dy=-1;dy<=1;dy++)if(!(s===len+2&&dy!==0))tiles[idx(x0+s*dir,y+dy)]=T.BONE;k++;}}

// Sky islands: floating grass-topped islands of skystone with Skyglass Ore, trees, clouds, and ruined shrines with a chest.
// Planned at generation, and the first time an older save loads (only where the sky is still empty, never over player builds).
// BIO.sky = {y: sky floor, is: [[x0, x1, top y]...]}. Sunlight passes through everything above the sky floor (world.js).
export function planSky(sd){if(!BIO||!BIO.uw||BIO.sky)return;const r=mulberry32(sd+611),nz=makeNoise(sd+612);
  let top=0;for(let x=0;x<W;x++)top=Math.max(top,surf[x]);const sf=top+12,is=[],n=Math.max(4,Math.round(W/70)),slot=(W-60)/n;
  for(let k=0;k<n;k++)for(let a=0;a<8;a++){const hw=Math.floor(7+r()*8),cx=Math.floor(30+slot*k+r()*slot),x0=cx-hw,x1=cx+hw,d=5+Math.floor(r()*5);if(x0<6||x1>W-7)continue;
    let ls=0;for(let x=x0-4;x<=x1+4;x++)ls=Math.max(ls,surf[clamp(x,0,W-1)]);const lo=Math.max(sf+3,ls+26)+d,hi=H-12;if(lo>hi)continue;const ty=Math.floor(lo+r()*Math.min(18,hi-lo));
    if(is.some(o=>x0<o[1]+10&&x1>o[0]-10)||clockNear(x0-8,x1+8))continue;
    let ok=true;for(let x=x0-4;x<=x1+4&&ok;x++)for(let y=ty-d-4;y<=Math.min(H-2,ty+9);y++){const i=idx(x,y);if(tiles[i]!==T.AIR||walls[i]){ok=false;break;}}if(!ok)continue;
    island(x0,x1,ty,d,r,nz);is.push([x0,x1,ty]);break;}
  BIO.sky={y:is.length?sf:H+1,is};
  // ruined shrines on about half the islands, at least two
  let nr=0;is.forEach((o,k)=>{if(nr>=2&&r()<.45)return;if(ruin(o,r))nr++;});}
function island(x0,x1,ty,d,r,nz){const cx=(x0+x1)/2,hw=(x1-x0)/2,set=(x,y,t,m=0)=>{if(x<1||x>=W-1||y<1||y>=H-1)return;const i=idx(x,y);tiles[i]=t;meta[i]=m;};
  for(let x=x0;x<=x1;x++){const u=(x-cx)/hw,e=Math.max(0,1-u*u),top=ty+Math.round((nz.n2(x/6,ty)-.5)*2*e)-(Math.abs(u)>.82?1:0),bot=ty-Math.max(1,Math.round(d*Math.pow(e,.6)+(nz.n2(x/4,ty+9)-.5)*3));
    for(let y=bot;y<=top;y++){let t=y===top?T.GRASS:y>top-3?T.DIRT:T.SKYSTONE;if(t===T.SKYSTONE&&nz.n2(x/3.5+900,y/3.5)>.7)t=T.SKYORE;set(x,y,t);}
    if(r()<.55*e+.15)set(x,bot-1,T.CLOUD);}
  for(const s of[-1,1])for(let k=1;k<=3;k++){const x=s<0?x0-k:x1+k;for(let y=ty-2;y<=ty-1;y++)if(r()<.7-k*.15)set(x,y,T.CLOUD);}
  let last=-9;for(let x=x0+2;x<=x1-2;x++){let y=ty+2;while(y>ty-3&&tiles[idx(x,y)]===T.AIR)y--;if(tiles[idx(x,y)]!==T.GRASS||tiles[idx(x,y+1)]!==T.AIR)continue;
    if(x-last>=5&&r()<.3&&y+8<H-2&&tiles[idx(x-1,y)]===T.GRASS&&tiles[idx(x+1,y)]===T.GRASS){const h=4+Math.floor(r()*3);for(let k=1;k<=h;k++)set(x,y+k,T.TRUNK);meta[idx(x,y+h)]=r()<.5?1:2;last=x;continue;}
    const q=r();if(q<.3)set(x,y+1,T.TUFT);else if(q<.42)set(x,y+1,T.FLOWER2);else if(q<.5)set(x,y+1,T.FLOWER);}}
// a small ruined brick shrine on the island top (brick back wall, so its chest also gives one of Wren's letters)
function ruin([x0,x1,ty],r){const w=9,rx=Math.floor((x0+x1)/2-w/2);if(rx<x0+1||rx+w>x1)return false;const fl=ty;
  for(let x=rx;x<rx+w;x++){for(let y=fl-2;y<=fl;y++){const i=idx(x,y);if(tiles[i]===T.AIR||tiles[i]===T.CLOUD)tiles[i]=T.DIRT;}tiles[idx(x,fl)]=T.BRICK;
    for(let y=fl+1;y<=fl+6;y++){const i=idx(x,y),edge=x===rx||x===rx+w-1||y===fl+6;meta[i]=0;tiles[i]=edge&&!(x===rx&&y<=fl+2)&&r()<.85?T.BRICK:T.AIR;walls[i]=y<fl+6?3:0;}}
  const ci=idx(rx+w-3,fl+1);tiles[ci]=T.CHEST;chests.set(ci,skyLoot());tiles[idx(rx+2,fl+4)]=T.TORCH;return true;}

// a chapter card the first time the player reaches each layer (BIO.seen)
let layT=0;
export function updateLayers(dt){if((layT-=dt)>0||!BIO||!BIO.uw)return;layT=.5;const p=player,l=layerAt(p.x,p.y+.9);if(l!=='sky'&&l!=='deep')return;const seen=BIO.seen||(BIO.seen={});if(seen[l])return;seen[l]=1;
  if(l==='sky')chapterCard(null,'The Sky Islands','Paper islands adrift above the clouds.','A new page');else chapterCard(null,'The Pressed Deep','Pages pressed flat for ages, and the machines that pressed them.','A new page');
  SFX.nice();stat('v_'+l);if(!reduceMotion())popUp();}
