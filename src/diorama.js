// Diorama depth: paper parallax layers per biome behind the world, and foreground cutouts in front of it.
import * as THREE from 'three';
import {
  BIO,biomeAt,camera,canvasTex,circ,CS,fi,grain,H,ink,mk,mouse,mulberry32,player,poly,rr,scene,season,SET,seed,
  skyU,state,surf,surfAvg,T,tiles,W,walls,wind,worldClock,
} from './game.js';

// ================= diorama =================
// Three paper layers stand behind the tiles: far silhouettes, hills and back foliage. Each biome has its own
// art for each layer, drawn in code on a 2048×512 strip that repeats along x. Biome segments stand a little in
// front of the forest ones and end in a torn paper edge, so walking into a biome looks like a new set piece.
// Seasons recolor the same shapes (the RNG is reseeded per layer), and swap one texture per frame.
const TW=2048,TH=512,RM=matchMedia('(prefers-reduced-motion: reduce)');
// z depth, h height in world units (bottom of the strip at the segment's ground), tw world units per repeat,
// fog: how much of the horizon color it takes, wob: paper sway, tear: torn edge width, dy: offset from the ground,
// ro: render order (clouds sit at -15, between hills and foliage), grow: how far biome pieces reach past their biome
export const LAYERS=[{k:'far',z:-70,h:40,tw:170,fog:.42,wob:0,tear:2.6,dy:-5,ro:-30,grow:30},{k:'hill',z:-40,h:24,tw:100,fog:.2,wob:.12,tear:1.7,dy:-4,ro:-20,grow:14},{k:'bush',z:-16,h:14,tw:56,fog:.06,wob:.16,tear:1.15,dy:-2,ro:-10,grow:3}];
const BIOI={forest:0,snow:1,desert:2,lake:3};
export const DU={uTint:{value:new THREE.Color(1,1,1)},uFog:{value:new THREE.Color()},uTime:{value:0},uAlpha:{value:1},uWob:{value:1}};
let segs=[],dioKey='',fgBands=[],fgTex=null;const texC=new Map(),fgDirty=new Set();
export const fgGroup=new THREE.Group();scene.add(fgGroup);
const hh=(x,k)=>{let h=Math.imul((x|0)^Math.imul(k,0x27d4eb2d),0x165667b1)^(seed|0);h=Math.imul(h^h>>>15,0x85ebca6b);h=Math.imul(h^h>>>13,0xc2b2ae35);return((h^h>>>16)>>>0)/4294967296;};
// the season a biome's art follows: snow and desert look the same all year
const vKey=b=>b==='snow'||b==='desert'?'s':({spring:'p',summer:'s',fall:'f',winter:'w'})[season().k]||'s';

// paper helpers. cut() fills a closed path as a paper cutout: a cream cut edge just inside the outline, then ink
// (and a soft shadow when asked). sheet() is a cutout whose top follows f(x) and runs off the bottom of the strip;
// it always casts a soft shadow onto the sheet or layer behind it.
function cut(t,col,lw=3,shadow=false){t.save();if(shadow){t.shadowColor='rgba(42,33,48,.34)';t.shadowBlur=16;t.shadowOffsetY=-4;}t.fillStyle=col;t.fill();t.restore();
  t.save();t.clip();t.strokeStyle='rgba(255,249,232,.62)';t.lineWidth=lw*2.4;t.lineJoin='round';t.stroke();t.restore();ink(t,lw);}
function sheet(t,f,col,lw=3){const top=()=>{t.moveTo(-2,f(-2));for(let x=4;x<=TW+2;x+=6)t.lineTo(x,f(x));};
  t.beginPath();top();t.lineTo(TW+2,TH+20);t.lineTo(-2,TH+20);t.closePath();t.save();t.shadowColor='rgba(42,33,48,.34)';t.shadowBlur=16;t.shadowOffsetY=-4;t.fillStyle=col;t.fill();t.restore();
  t.save();t.clip();t.beginPath();top();t.strokeStyle='rgba(255,249,232,.62)';t.lineWidth=lw*2.4;t.stroke();t.restore();t.beginPath();top();ink(t,lw);}
// a smooth ridge that repeats every TW pixels
function ridge(r,base,amp,k0=1){const k=[k0,k0+2+Math.floor(r()*3),k0+6+Math.floor(r()*6)],ph=[r()*6.283,r()*6.283,r()*6.283],a=6.283/TW;
  return x=>base-amp*(.5+.5*Math.sin(x*a*k[0]+ph[0]))-amp*.35*Math.sin(x*a*k[1]+ph[1])-amp*.12*Math.sin(x*a*k[2]+ph[2]);}
// jagged peaks with snow caps
function peaks(t,r,base,amp,col,cap){const P=[];for(let x=0;x<TW-60;x+=100+r()*130)P.push([x,base-amp*(.4+.6*r())]);
  const Q=[];P.forEach((a,i)=>{const b=P[i+1]||[TW,P[0][1]];Q.push(a,[(a[0]+b[0])/2+(r()-.5)*30,Math.max(a[1],b[1])+amp*(.22+.3*r())]);});Q.push([TW,P[0][1]]);
  const f=x=>{x=((x%TW)+TW)%TW;for(let i=0;i<Q.length-1;i++)if(x<=Q[i+1][0])return Q[i][1]+(Q[i+1][1]-Q[i][1])*(x-Q[i][0])/(Q[i+1][0]-Q[i][0]);return Q[0][1];};
  sheet(t,f,col,3);if(!cap)return;
  for(let i=0;i<Q.length-1;i+=2){const[px,py]=Q[i],L=i?Q[i-1]:[Q[Q.length-2][0]-TW,Q[Q.length-2][1]],R=Q[i+1],k=.3;
    const lx=px+(L[0]-px)*k,ly=py+(L[1]-py)*k,rx=px+(R[0]-px)*k,ry=py+(R[1]-py)*k,pts=[px,py,rx,ry];
    for(let j=1;j<4;j++){const u=j/4;pts.push(rx+(lx-rx)*u,ry+(ly-ry)*u+(j%2?10:-4));}pts.push(lx,ly);poly(t,pts);fi(t,cap,2);}}
function mesa(t,x,y,w,h,col){const s=h*.35;poly(t,[x-w/2-s,y,x-w/2,y-h,x+w/2,y-h,x+w/2+s,y]);cut(t,col,3);
  t.save();t.clip();t.strokeStyle='rgba(120,60,40,.25)';t.lineWidth=6;for(let yy=y-h+24;yy<y;yy+=28){t.beginPath();t.moveTo(x-w,yy);t.lineTo(x+w,yy+5);t.stroke();}t.restore();}
function tree(t,x,y,s,trunk,c,cap){rr(t,x-4*s,y-28*s,8*s,30*s,3*s);cut(t,trunk,2);circ(t,x,y-38*s,20*s);cut(t,c,2.5);if(cap){t.beginPath();t.arc(x,y-38*s,20*s,Math.PI*1.1,Math.PI*1.9);t.quadraticCurveTo(x,y-44*s,x-16*s,y-49*s);fi(t,cap,1.5);}}
function bigTree(t,x,y,s,trunk,cols,dots){rr(t,x-9*s,y-120*s,18*s,124*s,6*s);cut(t,trunk,3);
  [[-40,-128,50],[40,-138,48],[0,-176,58],[-8,-116,42]].forEach(([dx,dy,rd],k)=>{circ(t,x+dx*s,y+dy*s,rd*s);cut(t,cols[k%cols.length],3);if(dots)for(let j=0;j<4;j++){circ(t,x+(dx+Math.cos(j*1.9+k)*rd*.55)*s,y+(dy+Math.sin(j*1.9+k)*rd*.5)*s,5*s);fi(t,dots,1.5);}});}
function pine(t,x,y,s,col,snow){rr(t,x-4*s,y-14*s,8*s,16*s,2*s);cut(t,'#6b4a33',2);for(let i=0;i<3;i++){const w=(28-i*7)*s,yb=y-(10+i*17)*s,ht=28*s;poly(t,[x-w,yb,x,yb-ht,x+w,yb]);cut(t,col,2.5);
  if(snow){poly(t,[x-w*.46,yb-ht*.54,x,yb-ht,x+w*.46,yb-ht*.54,x+w*.2,yb-ht*.44,x,yb-ht*.54,x-w*.2,yb-ht*.44]);fi(t,snow,1.5);}}}
function willow(t,x,y,s,col,trunk){rr(t,x-4*s,y-34*s,8*s,36*s,3*s);cut(t,trunk,2);t.beginPath();t.moveTo(x-28*s,y-8*s);t.quadraticCurveTo(x-32*s,y-54*s,x,y-58*s);t.quadraticCurveTo(x+32*s,y-54*s,x+28*s,y-8*s);
  for(let k=1;k<6;k++)t.lineTo(x+28*s-k*56*s/5,y-(k%2?18:6)*s);t.closePath();cut(t,col,2.5);}
function cactus(t,x,y,s,col){rr(t,x-24*s,y-44*s,10*s,24*s,5*s);cut(t,col,2);rr(t,x-24*s,y-26*s,22*s,9*s,4.5*s);cut(t,col,2);rr(t,x+14*s,y-54*s,10*s,22*s,5*s);cut(t,col,2);rr(t,x+2*s,y-38*s,22*s,9*s,4.5*s);cut(t,col,2);
  rr(t,x-8*s,y-64*s,16*s,68*s,8*s);cut(t,col,2.5);t.strokeStyle='rgba(42,33,48,.25)';t.lineWidth=1.5*s;t.beginPath();t.moveTo(x,y-58*s);t.lineTo(x,y);t.stroke();}
function rock(t,x,y,w,h,col){t.beginPath();t.moveTo(x-w/2,y);t.quadraticCurveTo(x-w/2,y-h,x-w*.1,y-h);t.quadraticCurveTo(x+w/2,y-h*1.05,x+w/2,y);t.closePath();cut(t,col,2.5);}
function bushes(t,r,n,base,cols,dots){for(let i=0;i<n;i++){const x=(i+r())*TW/n,rd=38+r()*34;circ(t,x,base-rd*.35,rd);cut(t,cols[i%cols.length],3);
  if(dots)for(let j=0;j<3;j++){circ(t,x+(r()-.5)*rd,base-rd*(.4+r()*.6),5);fi(t,dots,1.5);}}}
function blades(t,r,n,base,hmin,hmax,cols,head){for(let i=0;i<n;i++){const x=r()*TW,h=hmin+r()*(hmax-hmin),b=(r()-.5)*34,c=cols[i%cols.length],hd=head&&r()<.3;
  poly(t,[x-5,base+12,x+b,base-h,x+5,base+12]);fi(t,c,2);if(hd){rr(t,x+b*.84-6,base-h*.84,12,34,6);fi(t,head,2);}}}
// soft band of mist across the lower part of a layer
function mist(t,y,a){t.save();t.globalCompositeOperation='source-atop';const g=t.createLinearGradient(0,y-60,0,y+60);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,`rgba(250,248,255,${a})`);g.addColorStop(1,'rgba(255,255,255,0)');t.fillStyle=g;t.fillRect(0,y-60,TW,120);t.restore();}

// ART[layer][biome](ctx, rng, season variant: s summer, p spring, f fall, w winter)
const ART=[{
  forest:(t,r,v)=>{const c=v==='w'?['#d3e0ea','#bccdda']:['#a9c9cf','#91b6be'];sheet(t,ridge(r,250,130,2),c[0]);sheet(t,ridge(r,330,90,3),c[1]);},
  snow:(t,r)=>{peaks(t,r,190,190,'#a3b7cb','#f5f9fc');peaks(t,r,290,140,'#8ca4bb','#f5f9fc');},
  desert:(t,r)=>{sheet(t,ridge(r,360,50,2),'#e7bf98');for(let i=0;i<6;i++){const x=(i+r())*TW/6,w=90+r()*160,h=90+r()*120;mesa(t,x,420,w,h,i%2?'#d99f7c':'#cf8f6f');}sheet(t,ridge(r,440,20,4),'#e2b48c');},
  lake:(t,r,v)=>{const c=v==='w'?['#d8dff0','#c6cfe4']:['#b6acd6','#a095c8'];sheet(t,ridge(r,290,100,2),c[0]);sheet(t,ridge(r,360,60,4),c[1]);mist(t,390,.35);},
},{
  forest:(t,r,v)=>{const P={s:['#b6d99a','#9ccb86',['#5f9e54','#77b366'],null],p:['#bcdca0','#a4d08e',['#6aa95c','#f2a9c4','#79b86a'],null],f:['#dccb86','#d2b673',['#d9823b','#c4553a','#e3a948'],null],w:['#eef3f7','#e2eaf0',['#b9ccd9','#a9bfcf'],'#fbfdff']}[v]||[];
    const f1=ridge(r,300,80,2),f2=ridge(r,380,60,3);sheet(t,f1,P[0]);for(let i=0;i<14;i++){const x=r()*TW;tree(t,x,f1(x)+8,.9+r()*.5,'#7b5234',P[2][i%P[2].length],P[3]);}
    sheet(t,f2,P[1]);for(let i=0;i<10;i++){const x=r()*TW;tree(t,x,f2(x)+8,1.2+r()*.5,'#7b5234',P[2][(i+1)%P[2].length],P[3]);}},
  snow:(t,r)=>{const f1=ridge(r,290,90,2),f2=ridge(r,370,60,3);sheet(t,f1,'#e6eef5');for(let i=0;i<16;i++){const x=r()*TW;pine(t,x,f1(x)+8,.8+r()*.5,'#5b8f98','#f5f9fc');}
    sheet(t,f2,'#d7e4ee');for(let i=0;i<12;i++){const x=r()*TW;pine(t,x,f2(x)+8,1.1+r()*.5,'#4f7f88','#f5f9fc');}},
  desert:(t,r)=>{const f1=ridge(r,310,70,2),f2=ridge(r,390,55,3);sheet(t,f1,'#efd6a0');sheet(t,f2,'#e4c283');
    t.save();t.globalCompositeOperation='source-atop';t.strokeStyle='rgba(160,110,60,.22)';t.lineWidth=3;for(let i=0;i<22;i++){const x=r()*TW,y=f2(x)+20+r()*60;t.beginPath();t.moveTo(x-70,y);t.quadraticCurveTo(x,y-12,x+70,y);t.stroke();}t.restore();
    for(let i=0;i<7;i++){const x=r()*TW;cactus(t,x,f2(x)+10,.55+r()*.3,'#6f9a5a');}},
  lake:(t,r,v)=>{const P={s:['#b5d4bb','#9fc4a8','#6f9f7c'],p:['#bddac2','#a6cbb0','#7eae88'],f:['#d4c48f','#c8b37a','#c98a4a'],w:['#eaf0f4','#dde7ee','#b9ccd9']}[v]||[];
    const f1=ridge(r,310,70,2),f2=ridge(r,390,45,4);sheet(t,f1,P[0]);sheet(t,f2,P[1]);for(let i=0;i<9;i++){const x=r()*TW;willow(t,x,f2(x)+8,1+r()*.5,P[2],'#7b5234');}mist(t,430,.3);},
},{
  forest:(t,r,v)=>{const P={s:[['#3f7a3b','#4f8a45'],['#5a9a4c','#4a8a42','#66a656'],'#3f7a3b',null],p:[['#4f8a45','#5a9a4c'],['#5fa050','#4f9046','#6aae5a'],'#447f3e','#f6b7cf'],
      f:[['#c46a2f','#a8492f','#d69a3a'],['#c97b35','#b4552f','#d9a441'],'#8a6a3a',null],w:[['#dfe8ef','#cbd9e4'],['#e8eff4','#d6e2eb','#f2f6f9'],'#e4ecf2',null]}[v]||[];
    for(let i=0;i<5;i++)bigTree(t,(i+r())*TW/5,470,.85+r()*.35,'#6b4a33',P[0],P[3]);bushes(t,r,26,470,P[1],P[3]);sheet(t,ridge(r,480,14,4),P[2]);},
  snow:(t,r)=>{for(let i=0;i<11;i++)pine(t,(i+r())*TW/11,480,1.8+r()*1.2,i%2?'#3f6f78':'#467a80','#f5f9fc');bushes(t,r,20,478,['#eef4f8','#e0eaf1'],null);sheet(t,ridge(r,486,10,5),'#f2f7fa');},
  desert:(t,r)=>{for(let i=0;i<6;i++)cactus(t,(i+r())*TW/6,480,1.3+r()*.7,'#5f8a4f');for(let i=0;i<9;i++)rock(t,r()*TW,482,60+r()*80,34+r()*40,i%2?'#b88a64':'#c79a70');sheet(t,ridge(r,478,14,3),'#dcb574');
    t.strokeStyle='#8a6a3a';t.lineWidth=3;for(let i=0;i<10;i++){const x=r()*TW;for(let k=0;k<5;k++){t.beginPath();t.moveTo(x,478);t.lineTo(x+(k-2)*9,450-r()*16);t.stroke();}}},
  lake:(t,r,v)=>{const P={s:[['#5f8f5a','#7aa86a','#4f7f4c'],'#7b5234','#6d9a62'],p:[['#6a9d60','#86b474','#57894f'],'#7b5234','#77a66a'],f:[['#b8a05a','#c9b06a','#9f8a4a'],'#6b4a33','#9a8a54'],w:[['#c9b98a','#d8cba0','#b3a47a'],'#6b4a33','#eef4f8']}[v]||[];
    blades(t,r,130,476,70,190,P[0],P[1]);sheet(t,ridge(r,482,10,5),P[2]);},
}];
// paper grain as a tiled speckle pattern laid over what is drawn (no pixel readback, so it stays cheap on big strips)
let grainPat=null;
function paperGrain(t){if(!grainPat){const c=mk(256,256),g=c.getContext('2d'),d=g.createImageData(256,256);for(let i=0;i<d.data.length;i+=4){const v=Math.random()<.5?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=Math.random()*16;}g.putImageData(d,0,0);grainPat=t.createPattern(c,'repeat');}
  t.save();t.globalCompositeOperation='source-atop';t.fillStyle=grainPat;t.fillRect(0,0,TW,TH);t.restore();}
function tKey(li,b){return li+'|'+b+'|'+vKey(b);}
function getTex(li,b){const k=tKey(li,b);let tx=texC.get(k);if(tx)return tx;const c=mk(TW,TH),t=c.getContext('2d'),s=((seed|0)^Math.imul(li+1,0x9e3779b1)^Math.imul(BIOI[b]+1,0x85ebca6b))|0;
  // drawn once, then again shifted a strip left and right but clipped to the edges, so shapes crossing an edge wrap
  for(const ox of[0,-TW,TW]){t.save();if(ox){t.beginPath();t.rect(ox<0?0:TW-200,0,200,TH);t.clip();}t.translate(ox,0);ART[li][b](t,mulberry32(s),vKey(b));t.restore();}
  // visible folds: a soft crease every few hundred pixels, dark on one side and light on the other
  const n=li===0?3:4;t.save();t.globalCompositeOperation='source-atop';for(let i=0;i<n;i++){const x=(i+.5)*TW/n,g=t.createLinearGradient(x-110,0,x+110,0);
    g.addColorStop(0,'rgba(42,33,48,0)');g.addColorStop(.5,'rgba(42,33,48,.12)');g.addColorStop(.5,'rgba(255,250,236,.14)');g.addColorStop(1,'rgba(255,250,236,0)');t.fillStyle=g;t.fillRect(x-110,0,220,TH);}t.restore();
  paperGrain(t);tx=canvasTex(c);tx.wrapS=THREE.RepeatWrapping;texC.set(k,tx);return tx;}

const LVS=`uniform float uTime;uniform float uWob;uniform float uAmp;uniform float uY0;uniform float uH;varying float vX;varying float vY;varying float vV;
void main(){vec4 w=modelMatrix*vec4(position,1.);vX=w.x;vY=w.y;vV=(w.y-uY0)/uH;w.y+=sin(uTime*.7+w.x*.09)*uAmp*uWob*uv.y;gl_Position=projectionMatrix*viewMatrix*w;}`;
const LFS=`uniform sampler2D map;uniform vec3 uTint;uniform vec3 uFog;uniform float uFogK;uniform float uAlpha;uniform float uTW;uniform float uOff;uniform float uTear;uniform vec2 uEnd;varying float vX;varying float vY;varying float vV;
float h1(float n){return fract(sin(n*127.1)*43758.5453);}float n1(float x){float i=floor(x),f=fract(x);return mix(h1(i),h1(i+1.),f*f*(3.-2.*f));}
void main(){if(vV>1.)discard;vec4 t=texture2D(map,vec2(vX/uTW+uOff,clamp(vV,.002,.998)));if(t.a<.02)discard;vec3 c=mix(t.rgb*uTint,uFog,uFogK);
  float e=min(vX-uEnd.x,uEnd.y-vX),tr=uTear*(1.+.8*n1(vY*.9/uTear)+.35*n1(vY*3.7/uTear));if(e<tr)discard;
  if(e<tr+.1*uTear)c=vec3(.165,.13,.19)*uTint;else if(e<tr+.3*uTear)c=mix(c,vec3(1.,.97,.9)*uTint,.55);gl_FragColor=vec4(c,t.a*uAlpha);}`;
function avgSurf(a,b){a=Math.max(0,Math.floor(a));b=Math.min(W-1,Math.ceil(b));if(b<a)return surfAvg;let s=0;for(let x=a;x<=b;x++)s+=surf[x];return s/(b-a+1);}
function makeSeg(li,b,x0,x1,y0){const L=LAYERS[li],w=x1-x0,ext=40,g=new THREE.PlaneGeometry(w,L.h+ext,Math.max(1,Math.ceil(w/8)),1);g.translate(0,(L.h-ext)/2,0);
  const front=b!=='forest',m=new THREE.Mesh(g,new THREE.ShaderMaterial({vertexShader:LVS,fragmentShader:LFS,transparent:true,depthWrite:false,
    uniforms:{map:{value:null},uTint:DU.uTint,uFog:DU.uFog,uTime:DU.uTime,uAlpha:DU.uAlpha,uWob:DU.uWob,uAmp:{value:L.wob},uY0:{value:y0},uH:{value:L.h},
      uTW:{value:L.tw},uOff:{value:hh(li*7+BIOI[b],9)},uFogK:{value:L.fog},uTear:{value:L.tear},uEnd:{value:new THREE.Vector2(x0,x1)}}}));
  m.position.set((x0+x1)/2,y0,L.z+(front?.4:0));m.renderOrder=L.ro+(front?1:0);m.visible=false;scene.add(m);segs.push({m,li,b,x0,x1,key:null});}

// ================= foreground cutouts =================
// Grass, rocks, reeds and cacti stand on the natural surface in front of the tiles (z 1.25–2.75). They are
// batched into one mesh per 32-column band, rebuilt when a chunk in that band changes, and fade out where they
// cover the player or the cursor. Settings > Foreground scenery hides them.
const FGN=16,FGS=[1.5,1.9,1.6,1.3,1.5,1.3,2.2,2.4,1.7,1.4,2.4,2.1,1.5,1.5,1.9,1],FGSW=[1,1,1,0,1,0,.5,0,1,0,1,1,1,0,.6,0];
const FGSET={forest:{s:[0,1,2,3,0,15],p:[0,2,14,14,3,1],f:[12,13,3,12,15],w:[4,5,6,4]},snow:[4,5,6,4,6],desert:[7,8,9,8,15],lake:{s:[10,11,10,0,3],p:[10,11,2,0],f:[10,12,11,3],w:[4,10,5]}};
function fgSet(b){const s=FGSET[b]||FGSET.forest;return Array.isArray(s)?s:s[vKey(b)]||s.s;}
function fgArt(){const c=mk(1024,256),t=c.getContext('2d'),r=mulberry32(4242);
  const cell=(i,fn)=>{t.save();t.translate((i%8)*128,Math.floor(i/8)*128);fn();t.restore();};
  const tuft=(cols,n,h,sp,cap)=>{for(let i=0;i<n;i++){const x=64+(i-(n-1)/2)*sp+(r()-.5)*6,hh2=h*(.6+.4*r()),b=(r()-.5)*28;poly(t,[x-7,126,x+b,126-hh2,x+7,126]);cut(t,cols[i%cols.length],2.5,false);
    if(cap){poly(t,[x+b*.7-6,126-hh2*.7,x+b,126-hh2,x+b*.7+6,126-hh2*.7]);fi(t,cap,1.5);}}};
  const stone=(col,cap)=>{rock(t,64,124,92,56,col);if(cap){t.beginPath();t.moveTo(30,92);t.quadraticCurveTo(54,62,98,84);t.quadraticCurveTo(70,78,30,92);fi(t,cap,1.5);}};
  cell(0,()=>tuft(['#3f7a3b','#4f8a45','#5a9a4c'],7,70,11));
  cell(1,()=>{for(let i=0;i<5;i++){t.save();t.translate(64,126);t.rotate((i-2)*.32);t.beginPath();t.moveTo(0,0);t.quadraticCurveTo(-14,-50,0,-96);t.quadraticCurveTo(14,-50,0,0);cut(t,i%2?'#4f8a45':'#3f7a3b',2.5,false);t.restore();}});
  cell(2,()=>{tuft(['#4f8a45','#5a9a4c'],6,54,12);[[40,70,'#e8636a'],[64,58,'#f1c04f'],[88,74,'#f4f0e6'],[56,84,'#b08ad6']].forEach(([x,y,c])=>{circ(t,x,y,8);fi(t,c,2);circ(t,x,y,3);t.fillStyle='#2a2130';t.fill();});});
  cell(3,()=>{stone('#8d8f9a');tuft(['#5a9a4c','#4f8a45'],4,26,9);});
  cell(4,()=>tuft(['#4f7f88','#5b8f98','#467a80'],6,62,12,'#f5f9fc'));
  cell(5,()=>stone('#9aa8b8','#f5f9fc'));
  cell(6,()=>pine(t,64,126,1.25,'#3f6f78','#f5f9fc'));
  cell(7,()=>{t.save();t.shadowBlur=0;cactus(t,64,124,1.6,'#5f8a4f');t.restore();});
  cell(8,()=>tuft(['#b89a5a','#a08a4a','#c9ae6a'],7,64,11));
  cell(9,()=>stone('#c98466'));
  cell(10,()=>{tuft(['#5f8f5a','#7aa86a','#4f7f4c'],7,110,9);});
  cell(11,()=>{tuft(['#5f8f5a','#4f7f4c'],5,96,12);[[46,30],[80,22]].forEach(([x,y])=>{rr(t,x-7,y,14,40,7);fi(t,'#7b5234',2);});});
  cell(12,()=>tuft(['#c9853d','#b4552f','#d9a441'],7,62,11));
  cell(13,()=>{for(let i=0;i<9;i++){circ(t,24+i*10,118-Math.sin(i/8*Math.PI)*26,16);fi(t,['#c65a3a','#e0823d','#d9a441'][i%3],2);}});
  cell(14,()=>{[[44,96,28],[84,96,28],[64,76,32]].forEach(([x,y,rd])=>{circ(t,x,y,rd);cut(t,'#5a9a4c',2.5,false);});for(let i=0;i<7;i++){circ(t,34+r()*60,60+r()*56,6);fi(t,'#f6b7cf',1.5);}});
  cell(15,()=>{rock(t,48,124,50,30,'#8d8f9a');rock(t,84,124,40,22,'#a0a2ad');});
  grain(t,0,0,1024,256,8);return canvasTex(c);}
function fgUV(i){const e=.5/1024,f=.5/256,u=(i%8)*128/1024,v=1-(Math.floor(i/8)+1)*.5;return[u+e,v+f,u+.125-e,v+.5-f];}
export const FU={map:{value:null},uTint:{value:new THREE.Color(1,1,1)},uP:{value:new THREE.Vector3()},uM:{value:new THREE.Vector3()},uTime:DU.uTime,uWob:DU.uWob,uWind:{value:0}};
const fgMat=new THREE.ShaderMaterial({uniforms:FU,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:`uniform float uTime;uniform float uWob;uniform float uWind;attribute float aS;varying vec2 vUv;varying vec3 vW;
  void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);w.x+=(sin(uTime*1.7+w.x*1.3)*(.06+abs(uWind)*.3)+uWind*.3)*aS*uWob;vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  // project each pixel onto the play plane along the view ray, then fade near the player box and the cursor
  fragmentShader:`uniform sampler2D map;uniform vec3 uTint;uniform vec3 uP;uniform vec3 uM;varying vec2 vUv;varying vec3 vW;
  void main(){vec4 t=texture2D(map,vUv);if(t.a<.5)discard;vec3 d=vW-cameraPosition;vec2 q=cameraPosition.xy+d.xy*((.3-cameraPosition.z)/d.z);
  vec2 a=abs(q-uP.xy)/vec2(1.,1.5);float k=mix(1.,smoothstep(.85,1.6,max(a.x,a.y)),uP.z);k=min(k,mix(1.,smoothstep(.7,1.5,length(q-uM.xy)),uM.z));
  gl_FragColor=vec4(t.rgb*uTint,mix(.2,1.,k));}`});
const NAT=new Set([T.GRASS,T.DIRT,T.SAND,T.SNOW,T.STONE,T.ICE,T.ASH]),SEE=new Set([T.TUFT,T.FLOWER,T.FLOWER2,T.MUSH,T.BLOOM,T.TRUNK]);
// top of the natural ground in column x, or -1 when the surface there is built, walled, liquid or dug out
function groundAt(x){for(let y=H-1;y>0;y--){const t=tiles[y*W+x];if(t===T.AIR||SEE.has(t))continue;if(!NAT.has(t)||y<surf[x]-6||y+1<H&&walls[(y+1)*W+x])return -1;return y+1;}return -1;}
function buildFgBand(b){const old=fgBands[b];if(old){fgGroup.remove(old);old.geometry.dispose();fgBands[b]=null;}
  const Q=[],x0=b*CS,x1=Math.min(W,x0+CS),on=x=>hh(x,1)<.24;
  for(let x=x0;x<x1;x++){if(!on(x)||on(x-1)||on(x-2))continue;const gy=groundAt(x);if(gy<0)continue;const set=fgSet(biomeAt(x,gy)),c=set[Math.floor(hh(x,2)*set.length)],s=FGS[c]*(.8+hh(x,3)*.45);
    Q.push({c,s,z:1.25+hh(x,4)*1.5,x:x+.5+(hh(x,5)-.5)*.8,y:gy-.1*s,fl:hh(x,6)<.5});}
  if(!Q.length)return;Q.sort((a,b)=>a.z-b.z);const P=[],UV=[],S=[],I=[];
  Q.forEach((q,k)=>{const[u0,v0,u1,v1]=fgUV(q.c),a=q.fl?u1:u0,e=q.fl?u0:u1,w=q.s/2,sw=FGSW[q.c];P.push(q.x-w,q.y,q.z,q.x+w,q.y,q.z,q.x+w,q.y+q.s,q.z,q.x-w,q.y+q.s,q.z);
    UV.push(a,v0,e,v0,e,v1,a,v1);S.push(0,0,sw,sw);const n=k*4;I.push(n,n+1,n+2,n,n+2,n+3);});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setAttribute('aS',new THREE.Float32BufferAttribute(S,1));g.setIndex(I);g.computeBoundingSphere();
  const m=new THREE.Mesh(g,fgMat);m.renderOrder=4;fgGroup.add(m);fgBands[b]=m;}
export function markFg(cx){fgDirty.add(cx);}

// ================= diorama lifecycle =================
export function buildDiorama(){segs.forEach(s=>{scene.remove(s.m);s.m.geometry.dispose();s.m.material.dispose();});segs=[];texC.forEach(t=>t.dispose());texC.clear();dioKey=season().k;
  const B0=BIO&&BIO.uw&&BIO.snow&&BIO.desert&&BIO.lake?[['snow',BIO.snow[0]-4,BIO.snow[1]+4],['desert',BIO.desert[0]-4,BIO.desert[1]+4],['lake',BIO.lake[0]-BIO.lake[1]-10,BIO.lake[0]+BIO.lake[1]+10]].sort((a,b)=>a[1]-b[1]):[];
  LAYERS.forEach((L,li)=>{
    // deeper layers show more of the world at once, so their biome pieces are widened to still fill the view
    const B=B0.map(([b,a,c])=>{const e=Math.min(L.grow,(c-a)*.5);return[b,a-e,c+e];});
    for(let i=0;i+1<B.length;i++)if(B[i][2]>B[i+1][1]-4){const m=(B0[i][2]+B0[i+1][1])/2;B[i][2]=Math.max(B0[i][2],m+2);B[i+1][1]=Math.min(B0[i+1][1],m-2);}
    // forest fills the gaps, tucked 8 columns under each neighbour's torn edge
    const F=[];let x=-150;for(const[,a,b]of B){if(a+8>x+2)F.push(['forest',x,a+8]);x=Math.max(x,b-8);}F.push(['forest',x,W+150]);
    F.concat(B).forEach(([b,x0,x1])=>makeSeg(li,b,x0,x1,(b==='lake'?BIO.lake[2]+1:avgSurf(x0,x1)+1)+L.dy));});
  if(!fgTex)FU.map.value=fgTex=fgArt();fgBands.forEach(m=>{if(m){fgGroup.remove(m);m.geometry.dispose();}});fgBands=new Array(Math.ceil(W/CS)).fill(null);fgDirty.clear();for(let b=0;b<fgBands.length;b++)buildFgBand(b);}
// light from updateSky: day/night tint, horizon fog color, fade out underground
export function dioLight(r,g,b,under){DU.uTint.value.setRGB(r,g,b);DU.uFog.value.copy(skyU.uBot.value);DU.uAlpha.value=1-under;FU.uTint.value.setRGB(r*.94,g*.94,b*.94);}
export function updateDiorama(){DU.uTime.value=worldClock;DU.uWob.value=RM.matches?0:1;FU.uWind.value=wind;fgGroup.visible=SET.fg!==false;
  FU.uP.value.set(player.x,player.y+1.1,state==='play'&&!player.dead?1:0);FU.uM.value.set(mouse.wx,mouse.wy,state==='play'?1:0);
  const k=season().k;if(k!==dioKey){dioKey=k;for(let b=0;b<fgBands.length;b++)fgDirty.add(b);}
  // textures are drawn as the camera nears a segment and redrawn when the season changes, one per frame, nearest
  // first, so a new world or a new season never stalls a frame for long. Segments the camera has left far behind
  // give their texture up.
  const cx=camera.position.x;let best=null,bd=150,drop=false;
  for(const s of segs){const key=tKey(s.li,s.b),d=Math.max(0,s.x0-cx,cx-s.x1);
    if(d>=150){if(s.key){s.key=null;s.m.visible=false;s.m.material.uniforms.map.value=null;drop=true;}continue;}
    if(s.key===key)continue;
    if(texC.has(key)){s.m.material.uniforms.map.value=texC.get(key);s.key=key;s.m.visible=true;drop=true;}else if(d<bd||d===bd&&best&&s.li<best.li){best=s;bd=d;}}
  if(best){best.m.material.uniforms.map.value=getTex(best.li,best.b);best.key=tKey(best.li,best.b);best.m.visible=true;}
  if(best||drop){const used=new Set(segs.map(q=>q.key));for(const[kk,tx]of texC)if(!used.has(kk)){tx.dispose();texC.delete(kk);}}
  let n=0;for(const b of fgDirty){fgDirty.delete(b);if(b<fgBands.length)buildFgBand(b);if(++n>=4)break;}}
