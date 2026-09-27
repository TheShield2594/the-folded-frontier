// Constants and helpers: world sizes, seeded RNG, noise, canvas drawing helpers.

// ================= constants & helpers =================
export let W=420,H=170,N=W*H;export const CS=32;export let SPAWNX=210;
export const SIZES={s:{w:420,h:170,name:'Small',note:'420 × 170 tiles. Quick to explore.'},m:{w:640,h:220,name:'Medium',note:'640 × 220 tiles. Room for everything.'},l:{w:900,h:260,name:'Large',note:'900 × 260 tiles. A long expedition. Takes a few seconds to fold.'}};
export let worldSize='s',seedText='';
export const $=id=>document.getElementById(id);
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const rand=(a,b)=>a+Math.random()*(b-a);
export const randi=(a,b)=>Math.floor(a+Math.random()*(b-a+1));
export const pick=a=>a[Math.floor(Math.random()*a.length)];
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function makeNoise(seed){const r=mulberry32(seed);const p=new Uint16Array(512),g=new Float32Array(256);for(let i=0;i<256;i++){p[i]=i;g[i]=r();}for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));const t=p[i];p[i]=p[j];p[j]=t;}for(let i=0;i<256;i++)p[i+256]=p[i];
  const sm=t=>t*t*(3-2*t);
  function n2(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,X=xi&255,Y=yi&255;const a=g[p[p[X]+Y]],b=g[p[p[X+1]+Y]],c=g[p[p[X]+Y+1]],d=g[p[p[X+1]+Y+1]];const u=sm(xf),v=sm(yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
  function fbm(x,y,o=4){let s=0,a=.5,f=1,t=0;for(let i=0;i<o;i++){s+=a*n2(x*f+i*17.3,y*f-i*9.1);t+=a;a*=.5;f*=2;}return s/t;}
  return{n2,fbm};}
export function hexRgb(h){const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255];}
export function sh(h,f){const[r,g,b]=hexRgb(h);return`rgb(${Math.min(255,r*f|0)},${Math.min(255,g*f|0)},${Math.min(255,b*f|0)})`;}
export function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export const INK='#2a2130';
export function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
export function ink(c,w=2.5,col=INK){c.lineWidth=w;c.strokeStyle=col;c.lineJoin='round';c.lineCap='round';c.stroke();}
export function fi(c,col,w=2.5){c.fillStyle=col;c.fill();ink(c,w);}
export function circ(c,x,y,r){c.beginPath();c.arc(x,y,r,0,Math.PI*2);}
export function poly(c,pts){c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();}
export function grain(c,x,y,w,h,amt){const d=c.getImageData(x,y,w,h),a=d.data;for(let i=0;i<a.length;i+=4){if(a[i+3]===0)continue;const n=(Math.random()-.5)*amt;a[i]+=n;a[i+1]+=n;a[i+2]+=n;}c.putImageData(d,x,y);}
export function fibers(c,w,h,col,n){c.save();c.strokeStyle=col;c.lineWidth=1;c.globalAlpha=.16;for(let i=0;i<n;i++){const x=Math.random()*w,y=Math.random()*h,a=Math.random()*6.28,l=3+Math.random()*8;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke();}c.restore();}
// Imported bindings are read-only, so other modules assign these through setters.
export function setW(v){return W=v;}
export function setH(v){return H=v;}
export function setN(v){return N=v;}
export function setSPAWNX(v){return SPAWNX=v;}
export function setWorldSize(v){return worldSize=v;}
export function setSeedText(v){return seedText=v;}
