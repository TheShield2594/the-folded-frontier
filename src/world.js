// World state, world generation, secrets and structures, and tile lighting.
import {BADGES,H,LB,LIGHT,makeNoise,mulberry32,N,OPAQUE,pick,randi,SEEDIDS,SOLID,SPAWNX,T,TP,W} from './game.js';

// ================= world state =================
export let tiles=new Uint8Array(N),walls=new Uint8Array(N),meta=new Uint8Array(N),stamp=new Uint32Array(N);export let BIO={uw:0};
export let chests=new Map();export let surf=new Int16Array(W);export let surfAvg=100;export let seed=1;
export const idx=(x,y)=>y*W+x;
export function tileAt(x,y){return(x<0||x>=W||y<0||y>=H)?T.CORE:tiles[y*W+x];}
export function isSolid(x,y){if(x<0||x>=W||y<0)return true;if(y>=H)return false;const i=y*W+x,t=tiles[i];if(t===T.DOOR)return!(meta[i]&1);return SOLID[t]===1;}
export function isOpaque(x,y){return OPAQUE[tileAt(x,y)]===1;}

function ruinLoot(secret){const s=[];const add=(id,n)=>s.push({id,n});add('coin',randi(40,120)*(secret?2:1));add('tmap',1);add(pick(['goldbar','ironbar','frostore']),randi(4,10));if(Math.random()<(secret?.8:.35))add(pick(Object.keys(BADGES).map(k=>'b_'+k)),1);if(secret&&Math.random()<.5)add('bpup',1);if(Math.random()<.5)add(pick(['potiron','potregen','potnight','potswift']),randi(1,3));if(secret)add('candle',randi(1,3));while(s.length<20)s.push(null);return s;}
function treasureLoot(){const s=[];const add=(id,n)=>s.push({id,n});add('coin',randi(200,400));add('bpup',1);add(pick(Object.keys(BADGES).map(k=>'b_'+k)),1);add(pick(['goldbar','frostbar','moonink']),randi(6,12));add(pick(['kite','beacon','quilt','toolbelt','magnet','glider']),1);while(s.length<20)s.push(null);return s;}
function lootRoll(){const s=[];const add=(id,n)=>s.push({id,n});if(Math.random()<.15)add('tmap',1);if(Math.random()<.5)add(pick(['potswift','potnight','potiron','potregen','potfire']),randi(1,3));if(Math.random()<.35)add(pick(SEEDIDS.slice(0,4)),randi(2,5));
  add('potion',randi(1,3));add('torch',randi(8,20));if(Math.random()<.6)add(pick(['copperbar','ironbar','goldbar']),randi(3,8));if(Math.random()<.5)add('shuriken',randi(20,45));
  add('coin',randi(20,90));if(Math.random()<.55)add(pick(['glider','lantern','buckler','patch','glider']),1);if(Math.random()<.35)add('crown',1);
  if(Math.random()<.4)add(pick(['ironpick','ironsword']),1);if(Math.random()<.35)add(pick(['inktome','woodbow','manacrystal','launcher']),1);if(Math.random()<.4)add(pick(['arrow','firearrow','paper']),randi(25,60));if(Math.random()<.3)add('fstar',randi(2,5));if(Math.random()<.25)add('hook',1);if(Math.random()<.25)add(pick(['b_money','b_flowerf','b_close','b_spike','b_heartf','b_stomp']),1);if(Math.random()<.2)add('bpup',1);if(Math.random()<.2)add(pick(['toolbelt','magnet','paint1','paint3']),1);if(Math.random()<.2)add(pick(['fly','fly','glowlure']),randi(4,10));if(Math.random()<.4)add('rope',randi(20,50));while(s.length<20)s.push(null);return s;}
export function biomeAt(x,y){if(!BIO||!BIO.uw)return 'forest';if(y<BIO.uw+5)return 'under';if(x>=BIO.snow[0]&&x<=BIO.snow[1])return 'snow';if(Math.abs(x-BIO.lake[0])<=BIO.lake[1]+6&&y>BIO.lake[2]-40)return 'lake';if(x>=BIO.desert[0]&&x<=BIO.desert[1])return 'desert';return 'forest';}
export let curBio='';export const BIONAME={forest:'Paper Meadow',snow:'Origami Snowfield',lake:'Ink Lake',desert:'Sandpaper Dunes',under:'Burnt Underworld'};
export function generate(sd){
  seed=sd;const nz=makeNoise(sd),nz2=makeNoise(sd+99),rng=mulberry32(sd+7);
  tiles.fill(0);walls.fill(0);meta.fill(0);chests=new Map();
  const base0=Math.round(H*.6),UW=Math.max(22,Math.floor(H*.14));const snowLeft=rng()<.5;
  const snow=snowLeft?[Math.floor(W*.06),Math.floor(W*.25)]:[Math.floor(W*.75),Math.floor(W*.94)];
  const desert=snowLeft?[Math.floor(W*.31),Math.floor(W*.40)]:[Math.floor(W*.60),Math.floor(W*.69)];
  const lw=Math.max(24,Math.floor(W*.065)),lx=snowLeft?Math.floor(W*.76):Math.floor(W*.24);
  BIO={snow,desert,lake:[lx,lw,0],uw:UW};const inR=(x,r)=>x>=r[0]&&x<=r[1];
  const hAt=x=>base0+(nz.fbm(x/70,.5,3)-.5)*30+(nz.n2(x/14,3.3)-.5)*5+(inR(x,snow)?(nz.n2(x/26,9)-.35)*16:0);const base=Math.round(hAt(SPAWNX));
  for(let x=0;x<W;x++){let h=hAt(x);const d=Math.abs(x-SPAWNX-4);if(d<20){const k=d<13?1:1-(d-13)/7;h=h*(1-k)+base*k;}surf[x]=Math.round(h);}
  const wl=Math.min(surf[lx-lw],surf[lx+lw])-1;BIO.lake[2]=wl;
  for(let x=lx-lw;x<=lx+lw;x++){const d=(x-lx)/lw;const dep=Math.round(21*Math.sqrt(Math.max(0,1-d*d)));surf[x]=Math.min(surf[x],wl-dep+(Math.abs(d)>.92?1:0));}
  let sum=0;for(let x=0;x<W;x++)sum+=surf[x];surfAvg=sum/W;
  for(let x=0;x<W;x++){const s=surf[x],dirtD=7+Math.floor(nz.n2(x/9,7)*5),dz=inR(x,desert),sz=inR(x,snow),lz=Math.abs(x-lx)<=lw,nearLake=Math.abs(x-lx)<lw+10;
    const ashTop=UW+Math.floor(nz.n2(x/20,4)*7);
    for(let y=0;y<=s;y++){let t;
      if(y<=1||(y<=3&&nz.n2(x/3,y*.9)>.5))t=T.CORE;
      else if(y<ashTop)t=T.ASH;
      else if(y===s)t=dz?T.SAND:sz?T.SNOW:lz?T.INKSTONE:T.GRASS;
      else if(y>s-dirtD)t=dz?T.SAND:sz?T.SNOW:lz?T.INKSTONE:T.DIRT;
      else t=T.STONE;
      if(t===T.STONE&&nz2.fbm(x/12,y/12,2)>.66)t=T.DIRT;
      if(t===T.DIRT&&y<s-2&&nz2.fbm(x/10+50,y/10,2)>.69)t=T.STONE;
      if(sz&&(t===T.STONE||t===T.DIRT)&&nz2.fbm(x/9+30,y/9,2)>.58)t=T.ICE;
      if(nearLake&&t!==T.CORE&&t!==T.ASH&&y>s-26&&y<s)t=T.INKSTONE;
      if(t!==T.CORE&&t!==T.ASH&&y<s-6&&y>ashTop+3&&!(nearLake&&y>s-40)){const c=nz.fbm(x/26,y/15,4),worm=Math.abs(nz2.fbm(x/48,y/30,3)-.5);if(c>.63||(worm<.026&&y<s-9))t=T.AIR;}
      if(t===T.STONE||t===T.ICE){const dep=s-y;if(sz&&dep>22&&nz.n2(x/4+1500,y/4)>.78)t=T.FROST;else if(t===T.STONE){if(dep>45&&nz.n2(x/4+900,y/4+100)>.83)t=T.GOLD;else if(dep>20&&nz2.n2(x/4.5+700,y/4.5)>.82)t=T.IRON;else if(dep>4&&nz.n2(x/4.2+300,y/4.2+300)>.8)t=T.COPPER;}}
      if(t===T.INKSTONE&&y<s-3&&nz2.n2(x/4+2100,y/4)>.74)t=T.INKORE;
      if(t===T.ASH){if(y>=5&&y<=UW-2&&nz.fbm(x/30,y/8+50,3)>.43)t=T.AIR;else if(nz.n2(x/4+3000,y/4)>.79)t=T.EMBERORE;}
      const i=idx(x,y);tiles[i]=t;if(y<s-1&&t!==T.CORE&&y>=ashTop+2)walls[i]=1;}}
  for(let k=0;k<Math.round(W*1.2);k++){const x=Math.floor(4+rng()*(W-8)),y=Math.floor(6+rng()*(UW-8));const i=idx(x,y);if(tiles[i]===T.AIR&&tiles[i-W]===T.ASH&&y>8){tiles[i]=T.CROP;meta[i]=3*4+2;}}
  for(let x=lx-lw-8;x<=lx+lw+8;x++){const s2=surf[x];const i=idx(x,s2+1);if(tiles[idx(x,s2)]===T.INKSTONE&&tiles[i]===T.AIR&&rng()<.12){tiles[i]=T.CROP;meta[i]=2*4+2;}}
  // lava pools in the underworld
  for(let x=2;x<W-2;x++)for(let y=2;y<=7;y++){const i=idx(x,y);if(tiles[i]===T.AIR)tiles[i]=T.LAVA;}
  // ink lake
  for(let x=lx-lw;x<=lx+lw;x++)for(let y=surf[x]+1;y<=wl;y++){const i=idx(x,y);if(tiles[i]===T.AIR)tiles[i]=T.INK;}
  const shafts=[];
  // cave entrances
  for(let k=0;k<Math.round(W/105);k++){let x=Math.floor(20+rng()*(W-40));if(Math.abs(x-SPAWNX)<30||Math.abs(x-lx)<lw+12)continue;const s=surf[x];let cx=x;shafts.push(x);
    for(let y=s+1;y>s-38;y--){cx+=Math.round((nz.n2(y/6,k*10)-.5)*2);for(let dx=-2;dx<=2;dx++)for(let dy=-1;dy<=1;dy++){const tx=cx+dx,ty=y+dy;if(tx<2||tx>=W-2||ty<5)continue;if(dx*dx+dy*dy<=4){const i=idx(tx,ty);if(TP[tiles[i]].liq)continue;tiles[i]=T.AIR;if(ty>s-4)walls[i]=0;}}}}
  // trees & surface decor
  let last=-10;for(let x=3;x<W-3;x++){const s=surf[x];const top=tiles[idx(x,s)];if((top!==T.GRASS&&top!==T.SNOW)||tiles[idx(x,s+1)]!==T.AIR)continue;
    const nearSpawn=x>SPAWNX-6&&x<SPAWNX+18,sz=top===T.SNOW;
    if(!nearSpawn&&x-last>=4&&rng()<(sz?.3:.24)&&surf[x-1]===s&&surf[x+1]===s&&s+12<H){const h=(sz?6:5)+Math.floor(rng()*5);for(let y=s+1;y<=s+h;y++)tiles[idx(x,y)]=T.TRUNK;meta[idx(x,s+h)]=sz?3:(rng()<.5?1:2);last=x;continue;}
    const r=rng();if(sz){if(r<.14)tiles[idx(x,s+1)]=T.BLOOM;else if(r<.19){tiles[idx(x,s+1)]=T.CROP;meta[idx(x,s+1)]=1*4+2;}continue;}if(top===T.GRASS&&r>.96){tiles[idx(x,s+1)]=T.CROP;meta[idx(x,s+1)]=2;continue;}if(r<.3)tiles[idx(x,s+1)]=T.TUFT;else if(r<.37)tiles[idx(x,s+1)]=T.FLOWER;else if(r<.41)tiles[idx(x,s+1)]=T.FLOWER2;else if(r<.43)tiles[idx(x,s+1)]=T.MUSH;}
  for(let k=0;k<Math.round(W*5.2);k++){const x=Math.floor(2+rng()*(W-4)),y=Math.floor(UW+4+rng()*(surf[x]-UW-16));if(y<6)continue;if(tiles[idx(x,y)]===T.AIR&&OPAQUE[tiles[idx(x,y-1)]]&&rng()<.16)tiles[idx(x,y)]=T.MUSH;}
  const placed=[];const findFloor=(minDepth)=>{for(let a=0;a<60;a++){const x=Math.floor(8+rng()*(W-16));const top=surf[x]-minDepth;if(top<UW+8)continue;let y=Math.floor(UW+6+rng()*(top-UW-6));for(;y>UW+4;y--){if(tiles[idx(x,y)]===T.AIR&&tiles[idx(x,y+1)]===T.AIR&&OPAQUE[tiles[idx(x,y-1)]])break;}if(y<=UW+4)continue;if(placed.some(p=>Math.abs(p[0]-x)+Math.abs(p[1]-y)<14))continue;placed.push([x,y]);return[x,y];}return null;};
  for(let k=0;k<Math.round(W/19);k++){const p=findFloor(14);if(!p)continue;const i=idx(p[0],p[1]);tiles[i]=T.CHEST;chests.set(i,lootRoll());}
  for(let k=0;k<Math.round(W/35);k++){const p=findFloor(24);if(!p)continue;tiles[idx(p[0],p[1])]=T.HEART;}
  // ---- secrets & structures
  BIO.camps=[];BIO.treasure=[];BIO.shown=[];
  const setT=(x,y,t,m=0)=>{if(x<1||y<1||x>=W-1||y>=H-1)return;const i=idx(x,y);tiles[i]=t;meta[i]=m;};
  // sketched bridges over shafts
  for(const x of shafts){const y=surf[x];for(let dx=-5;dx<=5;dx++){const tx=x+dx;if(tiles[idx(tx,y)]===T.AIR&&tiles[idx(tx,y-1)]===T.AIR)setT(tx,y,T.SKETCH,1);}}
  // abandoned camps
  const nC=Math.max(2,Math.round(W/190));for(let k=0,tries=0;k<nC&&tries<80;tries++){const x0c=Math.floor(12+rng()*(W-36));if(Math.abs(x0c-SPAWNX)<40||Math.abs(x0c-lx)<lw+16||BIO.camps.some(c=>Math.abs(c.x0-x0c)<40))continue;
    const L=surf[x0c];let flat=true;for(let x=x0c-1;x<=x0c+11;x++)if(Math.abs(surf[x]-L)>2)flat=false;if(!flat)continue;
    for(let x=x0c-1;x<=x0c+11;x++){for(let y=L+1;y<=L+8;y++){setT(x,y,T.AIR);walls[idx(x,y)]=0;}if(surf[x]<L)for(let y=surf[x]+1;y<=L;y++)setT(x,y,T.DIRT);setT(x,L,x>=x0c&&x<=x0c+9&&rng()<.8?T.PLANK:T.GRASS);}
    for(let y=L+1;y<=L+3;y++){if(rng()<.6)setT(x0c,y,T.PLANK);if(rng()<.5)setT(x0c+9,y,T.PLANK);}
    for(let x=x0c;x<=x0c+9;x++){if(rng()<.35)setT(x,L+5,T.PLANK);for(let y=L+1;y<=L+4;y++)if(rng()<.45)walls[idx(x,y)]=2;}
    for(let x=x0c+2;x<=x0c+7;x++)if(rng()<.5&&tiles[idx(x,L+1)]===T.AIR)setT(x,L+1,T.RUBBLE);
    setT(x0c-1,L+1,T.SIGN,0);BIO.camps.push({x0:x0c,L,sx:x0c-1,sy:L+1,done:false});k++;}
  // ruins with secret rooms and crawlspaces
  const nR=Math.max(3,Math.round(W/120));for(let k=0,tries=0;k<nR&&tries<120;tries++){const rx=Math.floor(20+rng()*(W-50));if(Math.abs(rx-lx)<lw+14)continue;const top=surf[rx]-30;if(top<UW+20)continue;const ry=Math.floor(UW+14+rng()*(top-UW-14));
    const rw=12,rh=6;for(let x=rx-1;x<=rx+rw;x++)for(let y=ry-1;y<=ry+rh;y++){const edge=x===rx-1||x===rx+rw||y===ry-1||y===ry+rh;setT(x,y,edge?(rng()<.88?T.BRICK:T.STONE):T.AIR);walls[idx(x,y)]=3;}
    for(let x=rx;x<rx+rw;x++)if(rng()<.25)setT(x,ry,T.RUBBLE);setT(rx+2,ry,T.CHEST);chests.set(idx(rx+2,ry),ruinLoot(false));setT(rx+rw-3,ry+3,T.TORCH);
    // sketched stairs up the right side to a shaft
    for(let s2=0;s2<5;s2++)setT(rx+rw-5+s2,ry+s2,T.SKETCH,2);for(let y=ry+rh;y<=ry+rh+3;y++)setT(rx+rw-1,y,T.AIR);
    // secret room behind peel wall (left)
    if(rng()<.75){for(let x=rx-6;x<=rx-2;x++)for(let y=ry-1;y<=ry+4;y++){const edge=x===rx-6||y===ry-1||y===ry+4;setT(x,y,edge?T.BRICK:T.AIR);walls[idx(x,y)]=3;}for(let y=ry;y<=ry+3;y++)setT(rx-1,y,T.PEEL,1);setT(rx-4,ry,T.CHEST);chests.set(idx(rx-4,ry),ruinLoot(true));setT(rx-5,ry+2,T.TORCH);}
    // crawlspace to an alcove (right, floor level, 1 tile tall)
    else{for(let x=rx+rw;x<=rx+rw+6;x++){setT(x,ry,T.AIR);setT(x,ry-1,T.BRICK);setT(x,ry+1,T.BRICK);walls[idx(x,ry)]=3;}for(let x=rx+rw+7;x<=rx+rw+10;x++)for(let y=ry-1;y<=ry+3;y++){const edge=x===rx+rw+10||y===ry-1||y===ry+3;setT(x,y,edge?T.BRICK:T.AIR);walls[idx(x,y)]=3;}setT(rx+rw+8,ry,T.CHEST);chests.set(idx(rx+rw+8,ry),ruinLoot(true));}
    k++;}
  // loose peel walls in caves: hidden pockets
  for(let k=0;k<Math.round(W/40);k++){const x=Math.floor(10+rng()*(W-20)),y=Math.floor(UW+12+rng()*Math.max(1,surf[x]-UW-30));if(tiles[idx(x,y)]!==T.STONE)continue;let ok=true;for(let dx=-2;dx<=2;dx++)for(let dy=-1;dy<=2;dy++)if(tiles[idx(x+dx,y+dy)]!==T.STONE&&tiles[idx(x+dx,y+dy)]!==T.DIRT)ok=false;if(!ok)continue;
    for(let dx=-1;dx<=1;dx++)for(let dy=0;dy<=1;dy++){setT(x+dx,y+dy,T.AIR);walls[idx(x+dx,y+dy)]=1;}setT(x,y,T.CHEST);chests.set(idx(x,y),ruinLoot(false));for(let dx=-2;dx<=2;dx++)for(let dy=-1;dy<=2;dy++){const t=tiles[idx(x+dx,y+dy)];if(t===T.STONE||t===T.DIRT)setT(x+dx,y+dy,T.PEEL,0);}}
  // buried treasure
  for(let k=0,tries=0;k<6&&tries<200;tries++){const x=Math.floor(10+rng()*(W-20)),y=Math.floor(UW+10+rng()*Math.max(1,surf[x]-UW-40));if(!OPAQUE[tiles[idx(x,y)]]||!OPAQUE[tiles[idx(x,y-1)]]||TP[tiles[idx(x,y)]].pick>2)continue;setT(x,y,T.CHEST);chests.set(idx(x,y),treasureLoot());BIO.treasure.push([x,y]);k++;}
  // the shrine
  for(let tries=0;tries<80;tries++){const sx=Math.floor(30+rng()*(W-60));if(Math.abs(sx-SPAWNX)<50||Math.abs(sx-lx)<lw+16)continue;const sy=Math.floor(UW+10+(surf[sx]-UW)*.4);
    for(let x=sx-9;x<=sx+9;x++)for(let y=sy-1;y<=sy+8;y++){const edge=x===sx-9||x===sx+9||y===sy-1||y===sy+8;setT(x,y,edge?T.BRICK:T.AIR);walls[idx(x,y)]=3;}
    setT(sx,sy,T.ALTAR);for(const dx of[-7,-4,-1,2,5]){const px=sx+dx+(dx>0?1:0);setT(px,sy,T.PEDESTAL);}setT(sx-8,sy+5,T.TORCH);setT(sx+8,sy+5,T.TORCH);
    for(let y=sy;y<=sy+3;y++)setT(sx+9,y,T.PEEL,1);BIO.shrine=[sx,sy];break;}
  const L=surf[SPAWNX],x0=SPAWNX+2;
  for(let x=x0-2;x<=x0+13;x++)for(let y=L+1;y<=L+10;y++){const i=idx(x,y);tiles[i]=T.AIR;walls[i]=0;}
  for(let x=x0-2;x<=x0+13;x++){tiles[idx(x,L)]=(x>=x0&&x<=x0+11)?T.PLANK:T.GRASS;for(let y=L-1;y>L-4;y--)if(tiles[idx(x,y)]===T.AIR)tiles[idx(x,y)]=T.DIRT;}
  for(let y=L+1;y<=L+5;y++){tiles[idx(x0+11,y)]=T.PLANK;if(y>=L+3)tiles[idx(x0,y)]=T.PLANK;}
  tiles[idx(x0,L+1)]=T.DOOR;tiles[idx(x0,L+2)]=T.DOOR;meta[idx(x0,L+2)]=2;
  tiles[idx(x0+11,L+3)]=T.GLASS;tiles[idx(x0+11,L+4)]=T.GLASS;
  for(let x=x0-1;x<=x0+12;x++)tiles[idx(x,L+6)]=T.BRICK;for(let x=x0+1;x<=x0+10;x++)tiles[idx(x,L+7)]=T.BRICK;for(let x=x0+3;x<=x0+8;x++)tiles[idx(x,L+8)]=T.BRICK;
  for(let x=x0;x<=x0+11;x++)for(let y=L+1;y<=L+5;y++)walls[idx(x,y)]=2;
  tiles[idx(x0+2,L+1)]=T.BED;tiles[idx(x0+4,L+1)]=T.CHEST;tiles[idx(x0+6,L+1)]=T.BENCH;tiles[idx(x0+8,L+1)]=T.TABLE;tiles[idx(x0+9,L+1)]=T.CHAIR;tiles[idx(x0+5,L+4)]=T.TORCH;tiles[idx(x0+9,L+4)]=T.TORCH;
  const st=[{id:'woodwall',n:60},{id:'wood',n:40},{id:'torch',n:10},{id:'gel',n:6},{id:'potion',n:3},{id:'platform',n:10},{id:'woodbow',n:1},{id:'arrow',n:40},{id:'rope',n:30}];while(st.length<20)st.push(null);chests.set(idx(x0+4,L+1),st);
  return{spawn:{x:SPAWNX-4+.5,y:L+1},bed:{x:x0+2,y:L+1}};
}

// ================= lighting =================
export let sky=new Uint8Array(N),blk=new Uint8Array(N);const QS=1<<19,QM=QS-1,Q=new Int32Array(QS);
function spread(arr,qt){let qh=0;const go=(n,v)=>{const nv=v-(LB[tiles[n]]?2:1);if(nv>arr[n]){arr[n]=nv;Q[qt]=n;qt=(qt+1)&QM;}};
  while(qh!==qt){const i=Q[qh];qh=(qh+1)&QM;const v=arr[i];if(v<=1)continue;const x=i%W;if(x>0)go(i-1,v);if(x<W-1)go(i+1,v);if(i>=W)go(i-W,v);if(i<N-W)go(i+W,v);}}
export function computeLightStrip(x0,x1){x0=Math.max(0,x0);x1=Math.min(W-1,x1);for(let y=0;y<H;y++){const r=y*W;for(let x=x0;x<=x1;x++){sky[r+x]=0;blk[r+x]=0;}}
  let qt=0;for(let x=x0;x<=x1;x++)for(let y=H-1;y>=0;y--){const i=y*W+x;if(LB[tiles[i]]||walls[i]===1)break;sky[i]=15;Q[qt]=i;qt=(qt+1)&QM;}
  for(const bx of[x0-1,x1+1]){if(bx<0||bx>=W)continue;for(let y=0;y<H;y++){const i=y*W+bx;if(sky[i]>1){Q[qt]=i;qt=(qt+1)&QM;}}}spread(sky,qt);
  qt=0;const uwg=BIO&&BIO.uw?BIO.uw-1:0;for(let y=0;y<H;y++)for(let x=x0;x<=x1;x++){const i=y*W+x;let l=LIGHT[tiles[i]];if(!l&&y<uwg&&tiles[i]===T.AIR)l=8;if(l){blk[i]=l;Q[qt]=i;qt=(qt+1)&QM;}}
  for(const bx of[x0-1,x1+1]){if(bx<0||bx>=W)continue;for(let y=0;y<H;y++){const i=y*W+bx;if(blk[i]>1){Q[qt]=i;qt=(qt+1)&QM;}}}spread(blk,qt);}
export function computeLight(){sky.fill(0);blk.fill(0);let qt=0;
  for(let x=0;x<W;x++)for(let y=H-1;y>=0;y--){const i=y*W+x;if(LB[tiles[i]]||walls[i]===1)break;sky[i]=15;Q[qt]=i;qt=(qt+1)&QM;}
  spread(sky,qt);qt=0;const uwg=BIO&&BIO.uw?(BIO.uw-1)*W:0;for(let i=0;i<N;i++){let l=LIGHT[tiles[i]];if(!l&&i<uwg&&tiles[i]===T.AIR)l=8;if(l){blk[i]=l;Q[qt]=i;qt=(qt+1)&QM;}}spread(blk,qt);}
// Imported bindings are read-only, so other modules assign these through setters.
export function setTiles(v){return tiles=v;}
export function setWalls(v){return walls=v;}
export function setMeta(v){return meta=v;}
export function setStamp(v){return stamp=v;}
export function setBIO(v){return BIO=v;}
export function setChests(v){return chests=v;}
export function setSurf(v){return surf=v;}
export function setSurfAvg(v){return surfAvg=v;}
export function setSeed(v){return seed=v;}
export function setCurBio(v){return curBio=v;}
export function setSky(v){return sky=v;}
export function setBlk(v){return blk=v;}
