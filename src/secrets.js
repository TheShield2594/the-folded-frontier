// Secrets beyond peel walls and treasure maps: fake walls you walk straight through, invisible-ink messages that only
// show under a light, and the Sunken Temple under the Ink Lake, which a ritual opens. None of it gates progress.
import * as THREE from 'three';
import {
  BIO,biomeAt,blk,burst,chests,countItem,fcount,folk,idx,inkMoon,isNight,meta,mk,mulberry32,player,pt,removeItem,
  RSEEDS,ruinLoot,scene,seed,selItem,setTile,SFX,shake,SOLID,SPAWNX,stat,surf,T,tiles,toast,treasureLoot,walls,W,H,
} from './game.js';

// ================= secrets =================
// BIO.sec (planned once per world; older saves on their next load, after their chests are restored):
//   fake: [[x, y, found]] (a fake tile's meta picks its look: 0 stone, 1 brick, 2 dirt) the first fake-wall column of each hidden room and whether you have walked through it;
//   ink: [[x, y, key]] invisible-ink messages (INKMSG keys); temple: [x, top y, opened] or null.
// Messages you have read are saved in folk.ink ('x,y').
export const INKMSG={
  fake:'Knock if you like, but you need not. This wall is only painted on. Walk through.',
  temple:'A temple sleeps under the lake. When the moon runs with ink, swim above it carrying a Moon Lily, and it will wake.',
  fish:'Four giants swim this world: one in the forest ponds, one under winter ice, one in the lava, and one that rises only under the Ink Moon.',
  pond:'In the hot months the shallow ponds give back what they swallowed.',
};
const ROCK=new Set([T.STONE,T.DIRT,T.COPPER,T.IRON,T.GOLD,T.ICE,T.SNOW,T.SAND,T.FROST,T.INKSTONE,T.INKORE]),LAKEROCK=new Set([T.INKSTONE,T.INKORE,T.STONE,T.DIRT]);
export function planSecrets(){if(!BIO||!BIO.uw||BIO.sec||!BIO.lake)return;const rng=mulberry32(seed+7373),sec=BIO.sec={fake:[],ink:[],temple:null};
  const deep=(x,y)=>y<=surf[x]-15&&y>BIO.uw+10&&Math.abs(x-SPAWNX)>30;
  // fake walls: a cave floor beside plain rock; two columns of painted stone or dirt hide a small dark brick room with a chest.
  // Every spot that fits is listed (a full scan), then shuffled with the world seed and taken far apart.
  const nF=Math.max(3,Math.round(W/140)),cand=[];
  for(let y=BIO.uw+12;y<H-8;y++)for(let x=12;x<W-12;x++){if(!deep(x,y)||!SOLID[tiles[idx(x,y-1)]])continue;let ok=true;for(let r=0;r<=2&&ok;r++){const i=idx(x,y+r);if(tiles[i]!==T.AIR||walls[i]>1)ok=false;}if(!ok)continue;
    for(const d of[1,-1]){let good=true;for(let c=1;c<=9&&good;c++)for(let r=-1;r<=3&&good;r++){const i=idx(x+c*d,y+r),t=tiles[i];if(walls[i]>1||(c<=2&&r>=0&&r<=2?t!==T.STONE&&t!==T.DIRT:!ROCK.has(t)))good=false;}if(good)cand.push([x,y,d]);}}
  for(let i=cand.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cand[i],cand[j]]=[cand[j],cand[i]];}
  for(const[x,y,d]of cand){if(sec.fake.length>=nF)break;if(sec.fake.some(f=>Math.abs(f[0]-x)<30&&Math.abs(f[1]-y)<20))continue;
    for(let c=1;c<=9;c++)for(let r=-1;r<=3;r++){const i=idx(x+c*d,y+r);if(c<=2){if(r>=0&&r<=2){meta[i]=tiles[i]===T.DIRT?2:0;tiles[i]=T.FAKE;}continue;}
      const edge=c===9||r===-1||r===3;tiles[i]=edge?T.BRICK:T.AIR;meta[i]=0;walls[i]=3;}
    const ci=idx(x+6*d,y);tiles[ci]=T.CHEST;chests.set(ci,ruinLoot(true));
    sec.fake.push([x+d,y,0]);sec.ink.push([x-d,y+1,'fake']);}
  // the Sunken Temple: a sealed chamber in the rock under the middle of the Ink Lake, with a sealed shaft up to the lake bed
  {const lx=BIO.lake[0],fl=surf[lx],yT=fl-5;let ok=yT-7>BIO.uw+4;
    for(let x=lx-8;x<=lx+8&&ok;x++)for(let y=yT-7;y<=fl;y++){const i=idx(x,y);if(walls[i]>1||!LAKEROCK.has(tiles[i])){ok=false;break;}}
    if(ok){for(let x=lx-7;x<=lx+7;x++)for(let y=yT-6;y<=yT;y++){const i=idx(x,y),edge=x===lx-7||x===lx+7||y===yT-6||y===yT;tiles[i]=edge?T.SEAL:T.AIR;meta[i]=0;walls[i]=3;}
      for(let x=lx-1;x<=lx+1;x++)for(let y=yT;y<=fl;y++){const i=idx(x,y);tiles[i]=T.SEAL;meta[i]=1;}
      const a=idx(lx-4,yT-5),b=idx(lx+4,yT-5);tiles[a]=tiles[b]=T.CHEST;chests.set(a,treasureLoot());
      const st=[{id:'moonlure',n:15},{id:'moonink',n:10},{id:RSEEDS[0],n:3},{id:'bpup',n:1},{id:'coin',n:600}];while(st.length<20)st.push(null);chests.set(b,st);
      tiles[idx(lx,yT-5)]=T.CANDLE;sec.temple=[lx,yT,0];}}
  // messages about the temple and the other secrets, on back walls of the shrine and ruin rooms
  if(BIO.shrine){const[sx,sy]=BIO.shrine;if(tiles[idx(sx-5,sy+3)]===T.AIR)sec.ink.push([sx-5,sy+3,'temple']);}
  const rooms=[];for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){const i=y*W+x;if(walls[i]===3&&tiles[i]===T.AIR&&tiles[i-W]===T.AIR&&deep(x,y)&&!sec.ink.some(m=>Math.abs(m[0]-x)<16&&Math.abs(m[1]-y)<10))rooms.push([x,y]);}
  for(const key of(sec.temple?['fish','pond','temple']:['fish','pond'])){if(!rooms.length)break;const r=rooms.splice(Math.floor(rng()*rooms.length),1)[0];
    for(let j=rooms.length-1;j>=0;j--)if(Math.abs(rooms[j][0]-r[0])<16&&Math.abs(rooms[j][1]-r[1])<10)rooms.splice(j,1);sec.ink.push([r[0],r[1],key]);}}

// invisible ink shows when a light is close: a held torch, Lumi, or a placed light nearby (block light at the spot)
const inkM=new Map(),inkTex={},near=new Set();let inkBIO=null,secT=0;
function inkTexture(key){if(inkTex[key])return inkTex[key];const c=mk(256,120),t=c.getContext('2d');t.strokeStyle='#e4c8ff';t.fillStyle='#e4c8ff';t.lineCap='round';t.shadowColor='#b06ad0';t.shadowBlur=10;t.lineWidth=3;
  let s=key.length*977;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let ln=0;ln<3;ln++){let x=70+r()*10;const y=30+ln*30;t.beginPath();t.moveTo(x,y);while(x<236-r()*30){const w=6+r()*10;t.quadraticCurveTo(x+w/2,y-8-r()*8,x+w,y+(r()-.5)*4);x+=w;if(r()<.18){x+=8;t.moveTo(x,y);}}t.stroke();}
  t.lineWidth=4;t.beginPath();
  if(key==='fake'){t.rect(14,22,40,52);t.moveTo(34,22);t.lineTo(34,74);t.moveTo(14,48);t.lineTo(54,48);}
  else if(key==='temple'){t.arc(34,48,20,0,6.283);t.moveTo(46,34);t.arc(40,42,16,-.9,2.4,true);}
  else if(key==='fish'){t.moveTo(10,48);t.bezierCurveTo(22,26,46,26,58,48);t.bezierCurveTo(46,70,22,70,10,48);t.moveTo(10,48);t.lineTo(4,38);t.moveTo(10,48);t.lineTo(4,58);}
  else{t.moveTo(34,20);t.quadraticCurveTo(54,52,34,72);t.quadraticCurveTo(14,52,34,20);}
  t.stroke();const tex=new THREE.CanvasTexture(c);tex.minFilter=THREE.LinearFilter;tex.generateMipmaps=false;return inkTex[key]=tex;}
function inkLit(x,y){const p=player,it=selItem(),cx=x+.5,cy=y+.5;if(it&&it.id==='torch'&&Math.hypot(p.x-cx,p.y+1-cy)<7)return true;
  if(p.partner==='lumi'&&pt.mesh&&pt.mesh.visible&&Math.hypot(pt.x-cx,pt.y-cy)<7)return true;return blk[idx(x,y)]>=9;}
function readInk(m){const k=m[0]+','+m[1];toast(`The glowing ink reads: “${INKMSG[m[2]]}”`,'gold');if(!folk.ink[k]){folk.ink[k]=1;stat('inks');SFX.nice();}}
export function clearSecrets(){for(const o of inkM.values()){scene.remove(o);o.geometry.dispose();o.material.dispose();}inkM.clear();near.clear();}
export function updateSecrets(dt){if(!BIO||!BIO.sec)return;if(inkBIO!==BIO){clearSecrets();inkBIO=BIO;}const p=player,s=BIO.sec;
  s.ink.forEach((m,k)=>{const dx=m[0]+.5-p.x,dy=m[1]+.5-(p.y+1),dist=Math.hypot(dx,dy);let o=inkM.get(k);
    if(dist>40){if(o)o.visible=false;return;}
    if(!o){o=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.6),new THREE.MeshBasicMaterial({map:inkTexture(m[2]),transparent:true,opacity:0,depthWrite:false,fog:false}));o.position.set(m[0]+.5,m[1]+.7,-.44);o.renderOrder=-1;scene.add(o);inkM.set(k,o);}
    const mat=o.material;mat.opacity+=((inkLit(m[0],m[1])?.95:0)-mat.opacity)*Math.min(1,dt*3);o.visible=mat.opacity>.01;
    if(mat.opacity>.6&&dist<3.5){if(!near.has(k)){near.add(k);readInk(m);}}else if(dist>7)near.delete(k);});
  // fake walls: the first time you step into one
  const fx=Math.floor(p.x),fy=Math.floor(p.y+1);if(tiles[idx(fx,fy)]===T.FAKE)for(const f of s.fake){if(f[2]||Math.abs(f[0]-fx)>2||fy<f[1]-1||fy>f[1]+3)continue;f[2]=1;fcount('fake');stat('fakewalls');SFX.peel();
    toast('This wall is only painted on! You walk straight through.','gold');}
  secT-=dt;if(secT>0)return;secT=1;
  // the Sunken Temple ritual: swim in the Ink Lake above the temple under an Ink Moon, carrying a Moon Lily
  const tp=s.temple;if(tp&&!tp[2]&&inkMoon&&isNight()&&p.inLiq===T.INK&&Math.abs(p.x-tp[0])<16&&biomeAt(p.x,p.y)==='lake'&&countItem('moonlily')>0)openTemple(tp);}
function openTemple(tp){tp[2]=1;removeItem('moonlily',1);const[lx,yT]=tp,cells=[];for(let y=H-2;y>=yT;y--)for(let x=lx-1;x<=lx+1;x++){const i=idx(x,y);if(tiles[i]===T.SEAL&&meta[i]===1)cells.push([x,y]);}
  toast('The Moon Lily dissolves in the ink… something beneath the lake unseals!','gold');SFX.boom();shake(.5);stat('temple');fcount('temple');
  cells.forEach(([x,y],n)=>setTimeout(()=>{if(tiles[idx(x,y)]!==T.SEAL)return;setTile(x,y,T.AIR);burst(x+.5,y+.5,['#b06ad0','#e0b0ff','#2e2446'],8,4,{grav:-2,bright:1});if(n%3===0)SFX.rustle(.2,.6);},300+n*70));
  setTimeout(()=>toast('The Sunken Temple lies open at the bottom of the Ink Lake.','gold'),600+cells.length*70);}
