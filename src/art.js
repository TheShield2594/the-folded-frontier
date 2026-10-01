// Hand-made art: images in assets/art/ replace the procedural atlas cells and sprite sheets they name.
// Anything without a file keeps its drawn art, so the folder can fill up one picture at a time (docs/ART.md).
import {A,atlas,atlasTex,bestCache,buildNormals,C,cellXY,clearIcons,facePic,FOERIG,FOLK,HL,mk,ORES,paintCards,PORDER,portraitCache,RIGART,RIGS,rigPic,rigSkin,SET,setInvDirty,setRigArt,SHEETS,syncPlayerRig,heroArt} from './game.js';

// ================= art =================
// assets/art/atlas/<C name>.png  a 64×64 atlas cell (C.swFe → swFe.png; an array cell such as C.crack[1] → crack.1.png)
// assets/art/sheets/<name>.png   a whole SHEETS strip, frames side by side at the size the drawn sheet has
// assets/art/rigs/<rig>.<part>.png  one part of a paper cutout rig (slime.body.png; a variant as human.head.happy.png;
//   one skin key only as human@guide.head.png), without its cream edge, fitted to the bounds the drawn part covers
// Vite lists the files at build time and bundles them, so a missing picture never costs a request.
// '@art' is assets/art/ (vite.config.js); the smoke tests point it at tests/fixtures/art/.
const ART_FILES=import.meta.glob('@art/*/*.{png,webp}',{eager:true,query:'?url',import:'default'});
export const artImg={atlas:{},sheets:{},rigs:RIGART};
// assets/anim/<rig>.json  clips saved from the animation viewer (dev/anim.html, `npm run dev` then /dev/anim.html): {clip:
//   {len, loop, bl, tr}} in the format defRig() takes (rig.js). Each one replaces that clip of the rig at boot, in place, so
//   anything already holding the clip sees the new keys; a clip the rig doesn't have is added.
const ANIM_FILES=import.meta.glob('/assets/anim/*.json',{eager:true,import:'default'});
export const animOver={};
for(const[p,clips]of Object.entries(ANIM_FILES)){const k=p.match(/([^/]+)\.json$/)[1],d=RIGS[k];if(!d){console.warn(`anim: no rig "${k}" for ${p}`);continue;}
  for(const c in clips){const o=d.clips[c];if(o){for(const f in o)delete o[f];Object.assign(o,clips[c]);}else d.clips[c]=clips[c];(animOver[k]??={})[c]=1;}}

const artOrig={atlas:{},sheets:{}}; // the drawn art under each override, kept for artExport()
export let artReady=Promise.resolve(0);
const ORECELL=new Set(ORES.map(o=>o[0]));
// 'swFe' for a single cell, 'crack.1' for an array cell; anything else names no cell
function artCell(k){const p=k.split('.'),c=C[p[0]];if(Array.isArray(c))return p.length===2&&/^(0|[1-9]\d*)$/.test(p[1])?c[+p[1]]:undefined;return p.length===1?c:undefined;}
function keepOrig(kind,k,src,x,y,w,h){if(artOrig[kind][k])return;const cv=mk(w,h);cv.getContext('2d').drawImage(src,x,y,w,h,0,0,w,h);artOrig[kind][k]=cv;}
// ores keep their drawn cells in the color-vision modes, where the shape and palette carry the meaning
function paintCell(k,img){const c=artCell(k);if(typeof c!=='number'){console.warn(`art: no atlas cell "${k}"`);return false;}
  if(ORECELL.has(k.split('.')[0])&&SET.cb!=='off')return false;
  if((img.width!==64||img.height!==64)&&!artImg.atlas[k])console.warn(`art: atlas/${k} is ${img.width}×${img.height}, cells are 64×64; scaling it`);
  const[x,y]=cellXY(c);keepOrig('atlas',k,atlas,x,y,64,64);A.clearRect(x,y,64,64);A.drawImage(img,x,y,64,64);return true;}
function paintSheet(k,img){const s=SHEETS[k];if(!s||!s.getContext){console.warn(`art: no sprite sheet "${k}"`);return false;}
  if(img.width!==s.width||img.height!==s.height)console.warn(`art: sheets/${k} is ${img.width}×${img.height}, the sheet is ${s.width}×${s.height}; scaling it`);
  keepOrig('sheets',k,s,0,0,s.width,s.height);const g=s.getContext('2d');g.clearRect(0,0,s.width,s.height);g.drawImage(img,0,0,s.width,s.height);if(SHEETS[k+'T'])SHEETS[k+'T'].needsUpdate=true;delete portraitCache[k];return true;}
// repaints the atlas overrides over freshly drawn cells (applyCB redraws the ores); returns how many took
export function paintArt(){let n=0;for(const k in artImg.atlas)n+=paintCell(k,artImg.atlas[k]);if(n)atlasTex.needsUpdate=true;return n;}
// puts one picture in place (the loader, and the tests with a canvas); kind is 'atlas' or 'sheets'.
// refresh=false leaves the normal map and caches to the caller (loadArt refreshes once after the batch)
function rigPart(k){if(k.startsWith('H.')){if(heroArt(k))return true;console.warn(`art: no hero piece "${k}"`);return false;}if(k.startsWith('L.')){const[,l,pt]=k.split('.');if(HL[l]&&pt)return true;console.warn(`art: no human layer "${k}"`);return false;}const m=k.match(/^([a-z_0-9]+)(?:@([\w-]+))?\.([A-Za-z0-9+]+)(?:\.([\w-]+))?$/),d=m&&RIGS[m[1]],ps=m?m[3].split('+'):[];
  if(!d||ps.some((n,i)=>{const p=d.parts[d.pi[n]];return i&&n==='all'?ps.length>2:!p||(!p.paint&&!(i===0&&ps.length>1))||(!i&&ps.length<2&&!p.v.includes(m[4]||''));})){console.warn(`art: no rig part "${k}"`);return false;}return true;}
export function applyArt(kind,k,img,refresh=true){const ok=kind==='atlas'?paintCell(k,img):kind==='sheets'?paintSheet(k,img):kind==='rigs'&&rigPart(k);if(!ok)return false;
  if(kind==='rigs'){RIGART[k]=img;if(refresh)rigRefresh();return true;}
  artImg[kind][k]=img;if(kind==='atlas')atlasTex.needsUpdate=true;if(refresh)artRefresh(kind==='atlas');return true;}
// new rig art: every skin re-bakes (live rigs on their next rigUpdate), then the still pictures drawn from rigs at boot
// (foe and partner sheets, townsfolk pictures, card faces) are redrawn in place and the hand-made sheets and cells go back on top
function rigRefresh(){setRigArt();syncPlayerRig();const redo=(k,pic)=>{const T=SHEETS[k+'T'];if(!SHEETS[k]?.getContext||!pic)return;SHEETS[k]=pic;if(T){T.image=pic;T.needsUpdate=true;}};
  for(const k in FOERIG){const[r,sk]=FOERIG[k],d=RIGS[r];redo(k,rigPic(r,sk,r==='human'?'idle':['fly','idle','swim'].find(c=>d.clips[c]),0,k));}
  for(const k of PORDER)redo('p_'+k,rigPic('p_'+k,{},'idle',0,'p_'+k));for(const k in FOLK)redo(k,facePic(k));
  for(const k in artImg.sheets)paintSheet(k,artImg.sheets[k]);for(const k in portraitCache)delete portraitCache[k];paintCards();paintArt();atlasTex.needsUpdate=true;}
function artRefresh(atlasN){if(atlasN)buildNormals();clearIcons();for(const k in bestCache)delete bestCache[k];setInvDirty(true);}
export function loadArt(){const jobs=[];
  for(const[p,url]of Object.entries(ART_FILES)){const m=p.match(/\/(atlas|sheets|rigs)\/([^/]+)\.(png|webp)$/);if(!m){console.warn(`art: ignoring ${p} (use assets/art/atlas/, sheets/ or rigs/)`);continue;}
    jobs.push(new Promise(res=>{const img=new Image();img.onload=()=>res([m[1],m[2],img]);img.onerror=()=>{console.warn(`art: could not load ${p}`);res(null);};img.src=url;}));}
  if(!jobs.length)return artReady;
  return artReady=Promise.all(jobs).then(r=>{let a=0,n=0,g=0;for(const j of r)if(j&&applyArt(...j,false)){n++;if(j[0]==='atlas')a++;if(j[0]==='rigs')g++;}if(g)rigRefresh();artRefresh(a||g);return n;});}
// for artists: the names that can be replaced and their sizes, and the drawn art as a PNG to paint over
// (in the dev console: g=await import('/src/game.js'); g.artList(); g.artExport('sheets','folio'))
export function artList(){const out={atlas:{},sheets:{}};for(const k in C){const c=C[k];if(Array.isArray(c))c.forEach((_,i)=>out.atlas[k+'.'+i]='64×64');else if(typeof c==='number')out.atlas[k]='64×64';}
  for(const k in SHEETS){const s=SHEETS[k];if(s&&s.getContext)out.sheets[k]=`${s.width}×${s.height}`;}
  out.rigs={};for(const k in RIGS){const S=drawnRig(k);if(!S)continue;RIGS[k].parts.forEach((p,i)=>{for(const v in S.cells[i]){const c=S.cells[i][v];if(c.iw)out.rigs[k+'.'+p.n+(v?'.'+v:'')]=`${c.iw}×${c.ih}`;}});}return out;}
// a rig's drawn skin with no hand-made parts (the first foe that wears it, else a plain one; the human rig as the Guide)
function drawnRig(k){const f=Object.values(FOERIG).find(e=>e[0]===k),sk=k==='human'?FOLK.guide:f?f[1]:{},keep={...RIGART};for(const n in RIGART)delete RIGART[n];
  try{const S=rigSkin(k,sk,null);S.tex.dispose();return S;}catch(e){return null;}finally{Object.assign(RIGART,keep);}}
// (the drawn art is exported even when a hand-made picture has replaced it)
export function artExport(kind,k){let cv=artOrig[kind]?.[k];
  if(!cv&&kind==='rigs'){const[r,n,v='']=k.split('.'),S=RIGS[r]&&drawnRig(r),i=S&&RIGS[r].pi[n],c=i!=null&&S.cells[i][v];if(!c||!c.iw)return null;
    cv=mk(c.iw,c.ih);cv.getContext('2d').drawImage(S.img,c.ax+10,c.ay+10,c.iw,c.ih,0,0,c.iw,c.ih);}
  else if(!cv&&kind==='atlas'){const c=artCell(k);if(typeof c!=='number')return null;cv=mk(64,64);const[x,y]=cellXY(c);cv.getContext('2d').drawImage(atlas,x,y,64,64,0,0,64,64);}
  else if(!cv){const s=SHEETS[k];if(kind!=='sheets'||!s||!s.getContext)return null;cv=s;}
  const url=cv.toDataURL('image/png'),a=document.createElement('a');a.href=url;a.download=`${k}.png`;a.click();return url;}
