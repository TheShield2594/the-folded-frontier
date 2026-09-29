// Hand-made art: images in assets/art/ replace the procedural atlas cells and sprite sheets they name.
// Anything without a file keeps its drawn art, so the folder can fill up one picture at a time (docs/ART.md).
import {A,atlas,atlasTex,bestCache,buildNormals,C,cellXY,clearIcons,mk,ORES,portraitCache,SET,setInvDirty,SHEETS} from './game.js';

// ================= art =================
// assets/art/atlas/<C name>.png  a 64×64 atlas cell (C.swFe → swFe.png; an array cell such as C.crack[1] → crack.1.png)
// assets/art/sheets/<name>.png   a whole SHEETS strip, frames side by side at the size the drawn sheet has
// Vite lists the files at build time and bundles them, so a missing picture never costs a request.
// '@art' is assets/art/ (vite.config.js); the smoke tests point it at tests/fixtures/art/.
const ART_FILES=import.meta.glob('@art/*/*.{png,webp}',{eager:true,query:'?url',import:'default'});
export const artImg={atlas:{},sheets:{}};
const artOrig={atlas:{},sheets:{}}; // the drawn art under each override, kept for artExport()
export let artReady=Promise.resolve(0);
const ORECELL=new Set(ORES.map(o=>o[0]));
// 'swFe' for a single cell, 'crack.1' for an array cell; anything else names no cell
function artCell(k){const p=k.split('.'),c=C[p[0]];if(Array.isArray(c))return p.length===2&&/^(0|[1-9]\d*)$/.test(p[1])?c[+p[1]]:undefined;return p.length===1?c:undefined;}
function keepOrig(kind,k,src,x,y,w,h){if(artOrig[kind][k])return;const cv=mk(w,h);cv.getContext('2d').drawImage(src,x,y,w,h,0,0,w,h);artOrig[kind][k]=cv;}
// ores keep their drawn cells in the color-vision modes, where the shape and palette carry the meaning
function paintCell(k,img){const c=artCell(k);if(typeof c!=='number'){console.warn(`art: no atlas cell "${k}"`);return false;}
  if(ORECELL.has(k.split('.')[0])&&SET.cb!=='off')return false;
  if(img.width!==64||img.height!==64)console.warn(`art: atlas/${k} is ${img.width}×${img.height}, cells are 64×64; scaling it`);
  const[x,y]=cellXY(c);keepOrig('atlas',k,atlas,x,y,64,64);A.clearRect(x,y,64,64);A.drawImage(img,x,y,64,64);return true;}
function paintSheet(k,img){const s=SHEETS[k];if(!s||!s.getContext){console.warn(`art: no sprite sheet "${k}"`);return false;}
  if(img.width!==s.width||img.height!==s.height)console.warn(`art: sheets/${k} is ${img.width}×${img.height}, the sheet is ${s.width}×${s.height}; scaling it`);
  keepOrig('sheets',k,s,0,0,s.width,s.height);const g=s.getContext('2d');g.clearRect(0,0,s.width,s.height);g.drawImage(img,0,0,s.width,s.height);if(SHEETS[k+'T'])SHEETS[k+'T'].needsUpdate=true;delete portraitCache[k];return true;}
// repaints the atlas overrides over freshly drawn cells (applyCB redraws the ores); returns how many took
export function paintArt(){let n=0;for(const k in artImg.atlas)n+=paintCell(k,artImg.atlas[k]);if(n)atlasTex.needsUpdate=true;return n;}
// puts one picture in place (the loader, and the tests with a canvas); kind is 'atlas' or 'sheets'.
// refresh=false leaves the normal map and caches to the caller (loadArt refreshes once after the batch)
export function applyArt(kind,k,img,refresh=true){const ok=kind==='atlas'?paintCell(k,img):kind==='sheets'&&paintSheet(k,img);if(!ok)return false;
  artImg[kind][k]=img;if(kind==='atlas')atlasTex.needsUpdate=true;if(refresh)artRefresh(kind==='atlas');return true;}
function artRefresh(atlasN){if(atlasN)buildNormals();clearIcons();for(const k in bestCache)delete bestCache[k];setInvDirty(true);}
export function loadArt(){const jobs=[];
  for(const[p,url]of Object.entries(ART_FILES)){const m=p.match(/\/art\/(atlas|sheets)\/([^/]+)\.(png|webp)$/);if(!m){console.warn(`art: ignoring ${p} (use assets/art/atlas/ or assets/art/sheets/)`);continue;}
    jobs.push(new Promise(res=>{const img=new Image();img.onload=()=>res([m[1],m[2],img]);img.onerror=()=>{console.warn(`art: could not load ${p}`);res(null);};img.src=url;}));}
  if(!jobs.length)return artReady;
  return artReady=Promise.all(jobs).then(r=>{let a=0,n=0;for(const j of r)if(j&&applyArt(...j,false)){n++;if(j[0]==='atlas')a++;}artRefresh(a);return n;});}
// for artists: the names that can be replaced and their sizes, and the drawn art as a PNG to paint over
// (in the dev console: g=await import('/src/game.js'); g.artList(); g.artExport('sheets','folio'))
export function artList(){const out={atlas:{},sheets:{}};for(const k in C){const c=C[k];if(Array.isArray(c))c.forEach((_,i)=>out.atlas[k+'.'+i]='64×64');else if(typeof c==='number')out.atlas[k]='64×64';}
  for(const k in SHEETS){const s=SHEETS[k];if(s&&s.getContext)out.sheets[k]=`${s.width}×${s.height}`;}return out;}
// (the drawn art is exported even when a hand-made picture has replaced it)
export function artExport(kind,k){let cv=artOrig[kind]?.[k];
  if(!cv&&kind==='atlas'){const c=artCell(k);if(typeof c!=='number')return null;cv=mk(64,64);const[x,y]=cellXY(c);cv.getContext('2d').drawImage(atlas,x,y,64,64,0,0,64,64);}
  else if(!cv){const s=SHEETS[k];if(kind!=='sheets'||!s||!s.getContext)return null;cv=s;}
  const url=cv.toDataURL('image/png'),a=document.createElement('a');a.href=url;a.download=`${k}.png`;a.click();return url;}
