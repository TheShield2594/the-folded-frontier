// three.js renderer, scene and camera, chunk meshes, procedural sprite sheets and particles.
import * as THREE from 'three';
import {
  $,atlas,blk,C,canopyCell,cellXY,circ,computeLight,CS,fi,grain,H,idx,INK,ink,isOpaque,ITEMS,LB,lightAt,meta,mk,
  mulberry32,N,OPAQUE,pick,player,poly,rand,rr,seed,SET,sh,sky,stamp,surfAvg,T,tileAt,tiles,TP,W,
  WALLCELL,walls,
} from './game.js';

// ================= three setup =================
export const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x1b1a26);
$('view').appendChild(renderer.domElement);
export const scene=new THREE.Scene();
export const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,1,400);
export let camDist=SET.zoom;
export const atlasTex=new THREE.CanvasTexture(atlas);atlasTex.anisotropy=renderer.capabilities.getMaxAnisotropy();atlasTex.minFilter=THREE.LinearMipmapLinearFilter;
export const U={map:{value:atlasTex},uSky:{value:new THREE.Vector3(1,1,1)},uP:{value:new THREE.Vector3(0,0,4)},uGlow:{value:.35},uDL:{value:Array.from({length:8},()=>new THREE.Vector4(0,0,1,0))},uDLC:{value:Array.from({length:8},()=>new THREE.Vector3())}};
export const worldMat=new THREE.ShaderMaterial({uniforms:U,side:THREE.DoubleSide,
  vertexShader:`attribute vec3 aL;varying vec2 vUv;varying vec3 vL;varying vec3 vW;void main(){vUv=uv;vL=aL;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform sampler2D map;uniform vec3 uSky;uniform vec3 uP;uniform float uGlow;uniform vec4 uDL[8];uniform vec3 uDLC[8];varying vec2 vUv;varying vec3 vL;varying vec3 vW;
  void main(){vec4 t=texture2D(map,vUv);if(t.a<.5)discard;float s=pow(vL.x/15.,1.6);float b=pow(vL.y/15.,1.45);
  vec3 L=uSky*s+vec3(1.,.8,.55)*b*1.15;float d=distance(vW.xy,uP.xy);L+=vec3(1.,.88,.66)*uGlow*clamp(1.-d/uP.z,0.,1.);for(int i=0;i<8;i++){float dd=distance(vW.xy,uDL[i].xy);L+=uDLC[i]*uDL[i].w*clamp(1.-dd/uDL[i].z,0.,1.);}
  L=clamp(L,vec3(.035,.03,.05),vec3(1.25));gl_FragColor=vec4(t.rgb*L*vL.z,1.);}`});
const liquidMat=new THREE.ShaderMaterial({uniforms:U,side:THREE.DoubleSide,transparent:true,depthWrite:false,vertexShader:worldMat.vertexShader,
  fragmentShader:worldMat.fragmentShader.replace('if(t.a<.5)discard;','if(t.a<.1)discard;if(vL.z>1.5){gl_FragColor=vec4(t.rgb*1.1,.93);return;}').replace('gl_FragColor=vec4(t.rgb*L*vL.z,1.);','gl_FragColor=vec4(t.rgb*L*vL.z,.8);')});
export function spriteMat(tex,frames=1){return new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{map:{value:tex},uFrame:{value:0},uFrames:{value:frames},uTint:{value:new THREE.Vector3(1,1,1)},uFlash:{value:0}},
  vertexShader:`uniform float uFrame;uniform float uFrames;varying vec2 vUv;void main(){vUv=vec2((uv.x+uFrame)/uFrames,uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D map;uniform vec3 uTint;uniform float uFlash;varying vec2 vUv;void main(){vec4 t=texture2D(map,vUv);if(t.a<.5)discard;gl_FragColor=vec4(mix(t.rgb*uTint,vec3(1.),uFlash),1.);}`});}
export function canvasTex(c){const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;}

// sky
export const skyU={uTop:{value:new THREE.Color()},uBot:{value:new THREE.Color()},uStars:{value:0},uTime:{value:0}};
export const skyMesh=new THREE.Mesh(new THREE.PlaneGeometry(700,420),new THREE.ShaderMaterial({uniforms:skyU,depthWrite:false,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 uTop;uniform vec3 uBot;uniform float uStars;uniform float uTime;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec3 c=mix(uBot,uTop,smoothstep(.3,.75,vUv.y));vec2 g=floor(vUv*vec2(420.,250.));float r=h(g);float st=step(.994,r)*uStars*(.55+.45*sin(uTime*2.+r*60.));gl_FragColor=vec4(c+st*vec3(1.,.95,.8),1.);}`}));
skyMesh.position.z=-120;scene.add(skyMesh);
function discTex(sun){const c=mk(256,256),t=c.getContext('2d');t.translate(128,128);if(sun){for(let i=0;i<12;i++){t.save();t.rotate(i/12*6.283);poly(t,[-12,-70,12,-70,0,-112]);fi(t,'#f7c948',4);t.restore();}circ(t,0,0,66);fi(t,'#ffd96a',5);circ(t,-18,-18,20);t.fillStyle='rgba(255,255,255,.45)';t.fill();}
  else{t.beginPath();t.arc(0,0,70,0,6.283);t.arc(30,-20,60,0,6.283,true);fi(t,'#f4f0e6',5);circ(t,-30,20,8);t.fillStyle='rgba(42,33,48,.12)';t.fill();}
  const s=mk(256,256),g=s.getContext('2d');g.drawImage(c,0,0);return canvasTex(s);}
export const sunMesh=new THREE.Mesh(new THREE.PlaneGeometry(14,14),new THREE.MeshBasicMaterial({map:discTex(1),transparent:true,depthWrite:false}));
export const moonMesh=new THREE.Mesh(new THREE.PlaneGeometry(11,11),new THREE.MeshBasicMaterial({map:discTex(0),transparent:true,depthWrite:false}));
sunMesh.position.z=moonMesh.position.z=-100;scene.add(sunMesh,moonMesh);
function hillTex(cols,seed2,amp,trees){const c=mk(1024,512),t=c.getContext('2d');const r=mulberry32(seed2);
  const top=y=>y;for(let L=0;L<2;L++){t.beginPath();t.moveTo(-12,530);const ph=r()*6,base=190+L*60;for(let x=-12;x<=1036;x+=8){const y=base-amp*(.5+.5*Math.sin(x/1024*Math.PI*2*2+ph))-amp*.4*Math.sin(x/1024*Math.PI*2*5+ph*2);t.lineTo(x,top(y));}t.lineTo(1036,530);t.closePath();fi(t,cols[L],4);
    if(trees&&L===1){for(let k=0;k<9;k++){const x=r()*1000+12,y=base-amp*(.5+.5*Math.sin(x/1024*Math.PI*4+ph))-amp*.4*Math.sin(x/1024*Math.PI*10+ph*2);poly(t,[x-9,y+6,x,y-24,x+9,y+6]);fi(t,cols[2],3);}}}
  grain(t,0,0,1024,512,10);const tx=canvasTex(c);tx.wrapS=THREE.RepeatWrapping;return tx;}
function hillLayer(tex,z,w,h,rep,y){tex.repeat.set(rep,1);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.5,depthWrite:true}));m.position.set(W/2,y,z);scene.add(m);return m;}
export let hillsFar,hillsNear;
export const clouds=[];
function makeCloud(){const c=mk(256,128),t=c.getContext('2d');const bl=[[70,80,34],[120,64,44],[175,78,36],[100,90,28],[150,92,28]];for(const[x,y,r]of bl){circ(t,x,y+4,r);t.fillStyle='rgba(42,33,48,.15)';t.fill();}for(const[x,y,r]of bl){circ(t,x,y,r);fi(t,'#fbf8f0',3.5);}t.fillStyle='#fbf8f0';t.fillRect(60,86,130,20);return canvasTex(c);}
export let snowFar=null,snowNear=null,snowF=0;
export function buildBackdrop(){[hillsFar,hillsNear,snowFar,snowNear].forEach(m=>{if(m){scene.remove(m);m.geometry.dispose();}});
  hillsFar=hillLayer(hillTex(['#86b7b9','#6fa1a8','#5b8f98'],seed+3,55,true),-45,W+300,70,8,surfAvg+1);
  hillsNear=hillLayer(hillTex(['#7cae6a','#5f9754','#3f7a3b'],seed+5,60,true),-16,W+160,44,10,surfAvg-4);
  snowFar=hillLayer(hillTex(['#dfe9f0','#c9d9e4','#a9c3d3'],seed+13,55,true),-44.5,W+300,70,8,surfAvg+1);snowNear=hillLayer(hillTex(['#eef4f8','#d6e4ee','#9fb6c6'],seed+15,60,true),-15.6,W+160,44,10,surfAvg-4);[snowFar,snowNear].forEach(m=>{m.visible=false;});
  clouds.forEach(c=>scene.remove(c));clouds.length=0;const ct=makeCloud();for(let i=0;i<9;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(10,5),new THREE.MeshBasicMaterial({map:ct,transparent:true,alphaTest:.4}));m.position.set(rand(0,W),surfAvg+rand(16,30),-30-rand(0,10));m.userData.s=rand(.3,.9);scene.add(m);clouds.push(m);}}

// ================= chunk meshes =================
export let CW=Math.ceil(W/CS),CHH=Math.ceil(H/CS);export let chunks=[],liqChunks=[];export const dirty=new Set();
export function cellUV(c){const[x,y]=cellXY(c);return regionUV(x,y,64,64);}
function regionUV(px,py,w,h){const e=.6/1024,f=.6/2048;return[px/1024+e,1-(py+h)/2048+f,(px+w)/1024-e,1-py/2048-f];}
export function buildChunk(cx,cy){const P=[],UV=[],L=[],I=[];let vc=0;const LP={P:[],UV:[],L:[],I:[],vc:0};
  const lquad=(v,uv,l,shd)=>{LP.P.push(...v);LP.UV.push(uv[0],uv[1],uv[2],uv[1],uv[2],uv[3],uv[0],uv[3]);for(let k=0;k<4;k++)LP.L.push(l[k][0],l[k][1],shd);const c=LP.vc;LP.I.push(c,c+1,c+2,c,c+2,c+3);LP.vc+=4;};
  const quad=(v,uv,l,shd)=>{P.push(...v);UV.push(uv[0],uv[1],uv[2],uv[1],uv[2],uv[3],uv[0],uv[3]);for(let k=0;k<4;k++)L.push(l[k][0],l[k][1],shd);I.push(vc,vc+1,vc+2,vc,vc+2,vc+3);vc+=4;};
  const cl=(x,y)=>{let s=0,b=0,w=0;for(let dx=-1;dx<=0;dx++)for(let dy=-1;dy<=0;dy++){const tx=x+dx,ty=y+dy;if(tx<0||ty<0||tx>=W||ty>=H)continue;const i=ty*W+tx;const wt=LB[tiles[i]]?.3:1;s+=sky[i]*wt;b+=blk[i]*wt;w+=wt;}return w?[s/w,b/w]:[0,0];};
  const flat=(x,y)=>{if(x<0||y<0||x>=W||y>=H)return[15,0];const i=y*W+x;return[sky[i],blk[i]];};
  const x0=cx*CS,y0=cy*CS,x1=Math.min(W,x0+CS),y1=Math.min(H,y0+CS);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*W+x,t=tiles[i];
    const c4=()=>[cl(x,y),cl(x+1,y),cl(x+1,y+1),cl(x,y+1)];
    if(OPAQUE[t]){const d=TP[t];const uv=cellUV(t===T.PEEL&&meta[i]?C.peelB:d.cell);quad([x,y,.5,x+1,y,.5,x+1,y+1,.5,x,y+1,.5],uv,c4(),.93);
      if(!isOpaque(x,y+1)&&y+1<H){const f=flat(x,y+1);quad([x,y+1,.5,x+1,y+1,.5,x+1,y+1,-.5,x,y+1,-.5],cellUV(d.top||d.cell),[f,f,f,f],1.02);}
      if(y>0&&!isOpaque(x,y-1)){const f=flat(x,y-1);quad([x,y,-.5,x+1,y,-.5,x+1,y,.5,x,y,.5],uv,[f,f,f,f],.45);}
      if(x>0&&!isOpaque(x-1,y)){const f=flat(x-1,y);quad([x,y,-.5,x,y,.5,x,y+1,.5,x,y+1,-.5],uv,[f,f,f,f],.7);}
      if(x<W-1&&!isOpaque(x+1,y)){const f=flat(x+1,y);quad([x+1,y,.5,x+1,y,-.5,x+1,y+1,-.5,x+1,y+1,.5],uv,[f,f,f,f],.7);}
      continue;}
    const w=walls[i];if(w){quad([x,y,-.5,x+1,y,-.5,x+1,y+1,-.5,x,y+1,-.5],cellUV(WALLCELL[w]),c4(),.52);}
    if(t===T.AIR)continue;
    if(TP[t].liq){const top=tileAt(x,y+1)!==t;const lava=t===T.LAVA;lquad([x,y,.42,x+1,y,.42,x+1,y+1,.42,x,y+1,.42],cellUV(lava?(top?C.lavaT:C.lavaF):(top?C.inkT:C.inkF)),c4(),lava?2:1);continue;}
    let cell=TP[t].cell,z=0;if(t===T.SKETCH)cell=meta[i]===2?C.sketchS:C.sketchB;if(t===T.SIGN)cell=meta[i]?C.sign1:C.sign0;if(t===T.CROP){const m=meta[i];cell=C.crops[Math.min(4,m>>2)][Math.min(2,m&3)];}
    if(t===T.DOOR){const m=meta[i];cell=(m&1)?((m&2)?C.doorOT:C.doorOB):((m&2)?C.doorT:C.doorB);}
    if(t===T.TRUNK)z=-.2;
    const l4=c4();quad([x,y,z,x+1,y,z,x+1,y+1,z,x,y+1,z],cellUV(cell),l4,1);
    if(t===T.TRUNK&&meta[i]){const r=canopyCell(meta[i]);const f=flat(x,y);quad([x-1.5,y+.2,-.25,x+2.5,y+.2,-.25,x+2.5,y+4.2,-.25,x-1.5,y+4.2,-.25],regionUV(r[0],r[1],256,256),[f,f,f,f],1);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setAttribute('aL',new THREE.Float32BufferAttribute(L,3));g.setIndex(I);
  const k=cy*CW+cx;if(chunks[k]){chunks[k].geometry.dispose();chunks[k].geometry=g;}else{chunks[k]=new THREE.Mesh(g,worldMat);scene.add(chunks[k]);}
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(LP.P,3));lg.setAttribute('uv',new THREE.Float32BufferAttribute(LP.UV,2));lg.setAttribute('aL',new THREE.Float32BufferAttribute(LP.L,3));lg.setIndex(LP.I);
  if(liqChunks[k]){liqChunks[k].geometry.dispose();liqChunks[k].geometry=lg;}else{liqChunks[k]=new THREE.Mesh(lg,liquidMat);liqChunks[k].renderOrder=3;scene.add(liqChunks[k]);}}
export function rebuildAll(){crops=new Set();for(let i=0;i<N;i++)if(tiles[i]===T.CROP)crops.add(i);computeLight();for(let cy=0;cy<CHH;cy++)for(let cx=0;cx<CW;cx++)buildChunk(cx,cy);dirty.clear();}
export let lightDirty=false,lx0=1e9,lx1=-1;
export function markChunk(x,y){for(const[dx,dy]of[[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const cx=Math.floor((x+dx)/CS),cy=Math.floor((y+dy)/CS);if(cx>=0&&cy>=0&&cx<CW&&cy<CHH)dirty.add(cy*CW+cx);}}
export function markDirty(x,y){lightDirty=true;lx0=Math.min(lx0,x);lx1=Math.max(lx1,x);const c0=Math.max(0,Math.floor((x-16)/CS)),c1=Math.min(CW-1,Math.floor((x+16)/CS)),r1=Math.min(CHH-1,Math.floor((y+16)/CS));for(let cx=c0;cx<=c1;cx++)for(let cy=0;cy<=r1;cy++)dirty.add(cy*CW+cx);}
let liqTick=0;
export function simLiquids(){const p=player;liqTick++;const x0=Math.max(1,Math.floor(p.x)-50),x1=Math.min(W-2,Math.floor(p.x)+50),y0=Math.max(1,Math.floor(p.y)-34),y1=Math.min(H-2,Math.floor(p.y)+34);const flip=liqTick&1;
  const move=(i,j,x,y)=>{const t=tiles[i];tiles[j]=t;tiles[i]=T.AIR;stamp[j]=liqTick;markChunk(x,y);if(t===T.LAVA)markDirty(x,y);};
  for(let y=y0;y<=y1;y++)for(let k=0;k<=x1-x0;k++){const x=flip?x0+k:x1-k,i=y*W+x,t=tiles[i];if(t!==T.INK&&t!==T.LAVA)continue;if(stamp[i]===liqTick)continue;
    if(t===T.LAVA&&(tiles[i-1]===T.INK||tiles[i+1]===T.INK||tiles[i+W]===T.INK||tiles[i-W]===T.INK)){tiles[i]=T.INKSTONE;markDirty(x,y);burst(x+.5,y+.5,['#8a78b0','#fbf8f0'],6,2,{grav:-3});continue;}
    if(tiles[i-W]===T.AIR||(TP[tiles[i-W]].repl&&!TP[tiles[i-W]].liq&&tiles[i-W]!==T.AIR)){if(tiles[i-W]!==T.AIR)tiles[i-W]=T.AIR;move(i,i-W,x,y);continue;}
    const d=Math.random()<.5?-1:1;for(const dd of[d,-d]){const n=i+dd;if(tiles[n]===T.AIR&&(tiles[n-W]===T.AIR||tiles[i+W]===t)){move(i,n,x,y);break;}}}}
export let crops=new Set();
export function setTile(x,y,t,m=0){if(x<0||y<0||x>=W||y>=H)return;const i=idx(x,y);tiles[i]=t;meta[i]=m;if(t===T.CROP)crops.add(i);else crops.delete(i);markDirty(x,y);}

// ================= sprites & sheets =================
export function makeSheet(n,fw,fh,draw,b=4){const out=mk(n*fw,fh),o=out.getContext('2d');for(let f=0;f<n;f++){const tmp=mk(fw,fh),t=tmp.getContext('2d');draw(t,f);grain(t,0,0,fw,fh,12);const sil=mk(fw,fh),s=sil.getContext('2d');s.drawImage(tmp,0,0);s.globalCompositeOperation='source-in';s.fillStyle='#fbf5e6';s.fillRect(0,0,fw,fh);
  o.save();o.beginPath();o.rect(f*fw,0,fw,fh);o.clip();for(let i=0;i<16;i++){const a=i/16*Math.PI*2;o.drawImage(sil,f*fw+Math.cos(a)*b,Math.sin(a)*b);}o.drawImage(tmp,f*fw,0);o.restore();}return out;}
function leg(t,x,y,a,col,boot){t.save();t.translate(x,y);t.rotate(a);rr(t,-6.5,-4,13,28,6);fi(t,col);if(boot){rr(t,-7,17,17,11,5);fi(t,boot);}t.restore();}
function arm(t,x,y,a,col,skin){t.save();t.translate(x,y);t.rotate(a);rr(t,-5.5,-3,11,22,5.5);fi(t,col);circ(t,0,22,5.5);fi(t,skin);t.restore();}
function drawHuman(t,o){t.save();t.translate(0,o.bob||0);const hip=110;
  leg(t,43,hip,o.legB,sh(o.greaves||o.pants,.8),sh(o.boots,.8));
  arm(t,42,82,o.armB,sh(o.mail||o.tunic,.78),sh(o.skin,.85));
  if(o.back)o.back(t);
  rr(t,33,72,31,42,11);fi(t,o.mail||o.tunic);
  if(o.mail){t.fillStyle='rgba(42,33,48,.35)';for(let y=80;y<108;y+=7)for(let x=39;x<60;x+=7){circ(t,x,y,1.4);t.fill();}}
  else{t.fillStyle='rgba(255,255,255,.18)';t.fillRect(37,76,6,30);}
  t.fillStyle=o.belt||'#5a3a22';t.fillRect(34,102,29,5);
  leg(t,53,hip,o.legA,o.greaves||o.pants,o.boots);
  circ(t,50,50,22);fi(t,o.skin);
  if(o.helm){t.beginPath();t.moveTo(26,54);t.quadraticCurveTo(24,24,50,24);t.quadraticCurveTo(76,24,74,50);t.lineTo(66,48);t.lineTo(66,40);t.lineTo(34,40);t.lineTo(34,56);t.closePath();fi(t,o.helm);t.fillStyle='rgba(255,255,255,.35)';t.fillRect(38,29,14,4);}
  else if(o.hair){t.beginPath();t.moveTo(29,60);t.quadraticCurveTo(22,26,50,26);t.quadraticCurveTo(76,26,73,46);t.lineTo(66,39);t.lineTo(61,45);t.lineTo(55,37);t.lineTo(47,42);t.lineTo(41,36);t.lineTo(37,52);t.closePath();fi(t,o.hair);}
  const ey=o.eyeY||50;for(const ex of[58,48]){t.beginPath();t.ellipse(ex,ey,3,o.blink?1:5,0,0,6.28);t.fillStyle=o.eyeCol||INK;t.fill();if(!o.blink){circ(t,ex+1,ey-2,1.3);t.fillStyle='#fff';t.fill();}}
  if(!o.noBlush){circ(t,63,58,4);t.fillStyle='rgba(230,110,110,.45)';t.fill();}
  t.beginPath();t.arc(58,59,3.5,.2,2.6);ink(t,2);
  if(o.scarf){rr(t,32,67,35,9,4);fi(t,o.scarf);t.beginPath();t.moveTo(36,70);t.quadraticCurveTo(24,72+(o.wave||0),16,82+(o.wave||0));t.lineTo(22,84+(o.wave||0));t.quadraticCurveTo(28,78,38,76);t.closePath();fi(t,o.scarf,2);}
  if(o.extra)o.extra(t);
  arm(t,55,82,o.armA,o.mail||o.tunic,o.skin);
  if(o.front)o.front(t);
  t.restore();}
const POSES=[{legA:.03,legB:-.03,armA:.12,armB:-.12},{legA:.03,legB:-.03,armA:.18,armB:-.08,bob:1.5,wave:2}];
for(let k=0;k<4;k++){const ph=k/4*Math.PI*2,s=Math.sin(ph);POSES.push({legA:s*.6,legB:-s*.6,armA:-s*.65,armB:s*.65,bob:-Math.abs(Math.cos(ph))*2.5+1,wave:s*3});}
POSES.push({legA:-.7,legB:.4,armA:-2.5,armB:-.5,wave:-4},{legA:.3,legB:-.3,armA:-2.9,armB:-2.5,wave:5},{legA:.25,legB:-.25,armA:-1.6,armB:.25});
export function playerSheet(){const eq={};const a=player.armor;if(a[0])eq.helm=ITEMS[a[0].id].color;if(a[1])eq.mail=ITEMS[a[1].id].color;if(a[2])eq.greaves=ITEMS[a[2].id].color;
  return makeSheet(9,96,144,(t,f)=>drawHuman(t,Object.assign({skin:'#f1cfa6',hair:'#5a3526',tunic:'#2f7f86',pants:'#3b3552',boots:'#6b4430',scarf:'#d4483b',
    back:tt=>{tt.beginPath();tt.moveTo(38,74);tt.lineTo(58,104);ink(tt,3.5,'#6b4430');rr(tt,24,92,16,16,4);fi(tt,'#b9874f',2);}},eq,POSES[f])));}
export const SHEETS={};
function slimeDraw(col,crown){return(t,f,w,h)=>{const cx=w/2,by=h-7,sq=f?1:0;const sw=w*.78*(1+sq*.16),sh_=h*.66*(1-sq*.22);
  t.beginPath();t.moveTo(cx-sw/2,by);t.bezierCurveTo(cx-sw/2-4,by-sh_*1.25,cx+sw/2+4,by-sh_*1.25,cx+sw/2,by);t.closePath();fi(t,col,crown?5:3);
  t.beginPath();t.ellipse(cx-sw*.22,by-sh_*.68,sw*.1,sh_*.12,-.5,0,6.28);t.fillStyle='rgba(255,255,255,.6)';t.fill();
  const er=crown?9:3.4;for(const ex of[cx+sw*.1,cx+sw*.3]){t.beginPath();t.ellipse(ex,by-sh_*.45,er*.8,er*1.4,0,0,6.28);t.fillStyle=INK;t.fill();circ(t,ex+er*.3,by-sh_*.45-er*.5,er*.35);t.fillStyle='#fff';t.fill();}
  if(crown){const cy=by-sh_*.93,s=2.6;poly(t,[cx-18*s,cy,cx+18*s,cy,cx+20*s,cy-22*s,cx+10*s,cy-10*s,cx,cy-26*s,cx-10*s,cy-10*s,cx-20*s,cy-22*s]);fi(t,'#f1c04f',5);circ(t,cx,cy-9*s,4*s);fi(t,'#e0506b',4);}
  else{t.beginPath();t.arc(cx+sw*.2,by-sh_*.25,3,.2,2.9);ink(t,2);}};}
export function buildSheets(){
  SHEETS.slime=makeSheet(2,96,80,(t,f)=>slimeDraw('#6cc57a')(t,f,96,80));
  SHEETS.bslime=makeSheet(2,96,80,(t,f)=>slimeDraw('#5aa7e0')(t,f,96,80));
  SHEETS.king=makeSheet(2,340,280,(t,f)=>slimeDraw('#5aa7e0',1)(t,f,340,280),6);
  SHEETS.zombie=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#a8c79a',hair:'#3e5a3a',tunic:'#6b5b8a',pants:'#4a4058',boots:'#3a3040',legA:f?.4:-.3,legB:f?-.4:.3,armA:-1.45,armB:-1.3,eyeCol:'#c0392b',noBlush:1,bob:f?1:0,
    extra:tt=>{tt.fillStyle='#2a2130';tt.fillRect(40,95,6,10);tt.fillRect(52,85,4,8);}}));
  SHEETS.knight=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#c7a57a',helm:'#b48a5a',mail:'#b48a5a',greaves:'#9a7448',boots:'#6b4a2f',pants:'#6b4a2f',tunic:'#b48a5a',legA:f?.35:-.3,legB:f?-.35:.3,armA:-.4,armB:.2,eyeCol:'#f1c04f',noBlush:1,eyeY:47,
    front:tt=>{rr(tt,58,70,24,34,8);fi(tt,'#8e6a40');circ(tt,70,87,5);fi(tt,'#f1c04f',2);}}));
  SHEETS.guide=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#e8b88f',hair:'#7a4b2a',tunic:'#4f7fa6',pants:'#3b3552',boots:'#5a3a22',scarf:'#f1c04f',legA:f?.4:.03,legB:f?-.4:-.03,armA:f?-.3:-.9,armB:.1,bob:f?-1:0,wave:f?3:0,
    front:tt=>{tt.save();tt.translate(66,88);tt.rotate(-.3);rr(tt,-9,-12,18,22,2);fi(tt,'#f4f0e6',2);tt.strokeStyle='#d4483b';tt.lineWidth=1.5;tt.beginPath();tt.moveTo(-5,-4);tt.lineTo(0,2);tt.lineTo(5,-6);tt.stroke();tt.restore();}}));
  SHEETS.painter=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#c98a60',hair:'#2a2130',tunic:'#f4f0e6',pants:'#3f6fa8',boots:'#3a2c22',legA:f?.4:.03,legB:f?-.4:-.03,armA:f?-.3:-1.2,armB:.1,bob:f?-1:0,
    extra:tt=>{tt.beginPath();tt.ellipse(52,28,22,8,-.15,0,6.28);fi(tt,'#d4483b');circ(tt,52,20,3);fi(tt,'#d4483b',2);for(const[x,y,c]of[[42,84,'#d4483b'],[52,96,'#3f6fa8'],[46,104,'#f1c04f']]){circ(tt,x,y,3);tt.fillStyle=c;tt.fill();}},
    front:tt=>{tt.beginPath();tt.ellipse(72,78,12,9,-.4,0,6.28);fi(tt,'#c98f4f',2);for(const[x,y,c]of[[68,74,'#d4483b'],[75,74,'#3f6fa8'],[76,81,'#f1c04f']]){circ(tt,x,y,2.4);tt.fillStyle=c;tt.fill();}}}));
  SHEETS.nurse=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#f3d2b0',hair:'#a8483f',tunic:'#f4f0e6',pants:'#e8e2d6',boots:'#e8636a',legA:f?.4:.03,legB:f?-.4:-.03,armA:f?-.3:.1,armB:.1,bob:f?-1:0,
    extra:tt=>{circ(tt,30,36,9);fi(tt,'#a8483f',2);rr(tt,38,22,26,8,3);fi(tt,'#fbf8f0',2);tt.beginPath();tt.moveTo(51,31);tt.bezierCurveTo(46,26,44,22,48,21);tt.bezierCurveTo(50,21,51,23,51,24);tt.bezierCurveTo(51,23,52,21,54,21);tt.bezierCurveTo(58,22,56,26,51,31);tt.fillStyle='#e0506b';tt.fill();tt.beginPath();tt.moveTo(49,94);tt.bezierCurveTo(42,88,42,82,46,82);tt.bezierCurveTo(48,82,49,84,49,85);tt.bezierCurveTo(49,84,50,82,52,82);tt.bezierCurveTo(56,82,56,88,49,94);tt.fillStyle='#e0506b';tt.fill();}}));
  SHEETS.tinkerer=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#e0a878',hair:'#e0823d',tunic:'#c96a2a',pants:'#6b4a2f',boots:'#3a2c22',belt:'#3a2c22',legA:f?.4:.03,legB:f?-.4:-.03,armA:f?-.4:-.6,armB:.2,bob:f?-1:0,
    extra:tt=>{rr(tt,30,36,42,8,3);fi(tt,'#5a3a22',2);for(const x of[46,62]){circ(tt,x,40,7);fi(tt,'#a9adb8',2.5);circ(tt,x,40,4);tt.fillStyle='#bfe6f0';tt.fill();}},
    front:tt=>{tt.save();tt.translate(66,92);tt.rotate(-.6);rr(tt,-2,-14,4,20,2);fi(tt,'#8a5a33',1.5);rr(tt,-6,-18,12,6,2);fi(tt,'#a9adb8',1.5);tt.restore();}}));
  SHEETS.angler=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#e8b88f',hair:'#6b4430',tunic:'#3f7a5f',pants:'#4a4058',boots:'#3a3040',belt:'#2a2130',legA:f?.4:.03,legB:f?-.4:-.03,armA:f?-.5:-.9,armB:.1,bob:f?-1:0,
    extra:tt=>{tt.beginPath();tt.ellipse(50,34,28,7,-.08,0,6.28);fi(tt,'#c9a574');tt.beginPath();tt.moveTo(30,34);tt.quadraticCurveTo(32,12,50,12);tt.quadraticCurveTo(68,12,70,32);tt.closePath();fi(tt,'#c9a574');tt.fillStyle='#d4483b';tt.fillRect(31,26,38,4);poly(tt,[62,24,70,14,68,26]);fi(tt,'#fbf8f0',1.5);},
    front:tt=>{tt.beginPath();tt.moveTo(60,104);tt.lineTo(90,24);ink(tt,4,INK);tt.beginPath();tt.moveTo(60,104);tt.lineTo(90,24);ink(tt,2,'#c98f4f');tt.beginPath();tt.moveTo(90,24);tt.quadraticCurveTo(94,60,86,80);ink(tt,1,'rgba(42,33,48,.6)');circ(tt,86,83,3);fi(tt,'#d4483b',1.5);}}));
  SHEETS.merchant=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#f0c9a0',hair:'#e8e2d6',tunic:'#7a4b2a',pants:'#4a3a2e',boots:'#3a2c22',legA:f?.4:.03,legB:f?-.4:-.03,armA:f?-.3:.1,armB:.1,bob:f?-1:0,
    extra:tt=>{tt.beginPath();tt.moveTo(40,60);tt.quadraticCurveTo(52,86,68,62);tt.quadraticCurveTo(60,68,52,64);tt.closePath();fi(tt,'#f4f0e6',2);tt.beginPath();tt.moveTo(24,36);tt.lineTo(78,36);tt.lineTo(70,30);tt.quadraticCurveTo(52,8,32,30);tt.closePath();fi(tt,'#3f7a3b');tt.fillStyle='#f1c04f';tt.fillRect(33,30,36,4);}}));
  SHEETS.eye=makeSheet(2,96,96,(t,f)=>{for(let k=0;k<3;k++){t.beginPath();t.moveTo(34,48+(k-1)*10);t.quadraticCurveTo(18,40+(k-1)*14+(f?6:-6),6,48+(k-1)*16);ink(t,5,'#4a2a5a');}circ(t,52,48,24);fi(t,'#f4f0e6',3);
    t.strokeStyle='rgba(200,40,60,.5)';t.lineWidth=1.3;for(let k=0;k<5;k++){t.beginPath();t.moveTo(30,40+k*4);t.lineTo(42,44+k*2);t.stroke();}circ(t,60,48,11);fi(t,'#8a3fb0',2);circ(t,62,48,5);t.fillStyle=INK;t.fill();circ(t,58,44,3);t.fillStyle='#fff';t.fill();});
  SHEETS.unfolded=makeSheet(2,300,360,(t,f)=>{const cx=150,lg=f?10:-10;
    for(const[x,o]of[[122,lg],[178,-lg]]){poly(t,[x-20,250,x+20,250,x+14+o,350,x-26+o,350]);fi(t,'#e9dcc0',5);t.beginPath();t.moveTo(x-6,250);t.lineTo(x-2+o,350);ink(t,2,'rgba(42,33,48,.25)');}
    for(const s2 of[-1,1]){poly(t,[cx+s2*70,120,cx+s2*118,150+(f?-10:10),cx+s2*122,250,cx+s2*96,255,cx+s2*80,170]);fi(t,'#e9dcc0',5);}
    poly(t,[cx-76,110,cx+76,110,cx+60,262,cx-60,262]);fi(t,'#f4f0e6',5);for(let y=130;y<250;y+=16){t.beginPath();t.moveTo(cx-50,y);t.lineTo(cx+50,y+2);ink(t,1.5,'rgba(42,33,48,.2)');}
    t.beginPath();t.moveTo(cx-76,110);t.lineTo(cx+60,262);t.moveTo(cx+76,110);t.lineTo(cx-60,262);ink(t,2,'rgba(42,33,48,.2)');
    poly(t,[cx-50,20,cx+50,20,cx+56,104,cx-56,104]);fi(t,'#f4f0e6',5);poly(t,[cx+50,20,cx+56,104,cx+40,60]);t.fillStyle='#d9ccb4';t.fill();
    for(const ex of[cx-20,cx+18]){t.beginPath();t.ellipse(ex,64,11,8,0,0,6.28);t.fillStyle='#2a1a3a';t.fill();circ(t,ex+2,64,4);t.fillStyle='#e0b0ff';t.fill();}
    t.beginPath();t.moveTo(cx-24,90);t.lineTo(cx-8,84);t.lineTo(cx+8,92);t.lineTo(cx+24,84);ink(t,3);},6);
  SHEETS.wraith=makeSheet(2,96,128,(t,f)=>{const w=f?6:-6;t.beginPath();t.moveTo(20,112);t.quadraticCurveTo(14,40,48,14);t.quadraticCurveTo(82,40,76,112);for(let x=76;x>=20;x-=14){t.quadraticCurveTo(x-7,112+(((x/14)|0)%2?10:-2)+w*.5,x-14,112);}t.closePath();fi(t,'#3a1a4a',3);t.beginPath();t.moveTo(30,60);t.quadraticCurveTo(48,30,66,60);ink(t,2,'rgba(200,150,255,.35)');for(const x of[40,58]){t.beginPath();t.ellipse(x,52,5,7,0,0,6.28);t.fillStyle='#e0b0ff';t.fill();}t.beginPath();t.ellipse(49,72,6,4,0,0,6.28);t.fillStyle='#1a0a24';t.fill();});
  SHEETS.cinderbat=makeSheet(2,96,64,(t,f)=>batDraw(t,f,'#3a2a24','#2a1e1a','#ff8a3d'));
  SHEETS.bat=makeSheet(2,96,64,(t,f)=>{const up=f?-16:14;for(const s of[-1,1]){t.beginPath();t.moveTo(48,32);t.quadraticCurveTo(48+s*20,32+up-8,48+s*42,26+up);t.quadraticCurveTo(48+s*32,40+up*.3,48+s*26,34+up*.2);t.quadraticCurveTo(48+s*18,44,48,38);t.closePath();fi(t,'#5a3f7a',2.5);}
    t.beginPath();t.ellipse(48,36,11,13,0,0,6.28);fi(t,'#6b4c8f');poly(t,[40,26,43,14,47,25]);fi(t,'#6b4c8f',2);poly(t,[49,25,53,14,56,26]);fi(t,'#6b4c8f',2);circ(t,44,34,2.2);t.fillStyle='#f1c04f';t.fill();circ(t,52,34,2.2);t.fill();poly(t,[45,42,47,46,49,42]);t.fillStyle='#fff';t.fill();});
  for(const k of Object.keys(SHEETS))SHEETS[k+'T']=canvasTex(SHEETS[k]);}
export const INKTINT=new THREE.Vector3(.85,.6,1.15);
export const markGeo=new THREE.PlaneGeometry(.6,.6),markMat=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.5,depthTest:false});
const barBgGeo=new THREE.PlaneGeometry(1,.17),barFgGeo=new THREE.PlaneGeometry(1,.09);barFgGeo.translate(.5,0,0);
const barBgMat=new THREE.MeshBasicMaterial({color:0x2a2130,depthTest:false}),barFgMat=new THREE.MeshBasicMaterial({color:0xe0506b,depthTest:false}),barFgEliteMat=new THREE.MeshBasicMaterial({color:0xf1c04f,depthTest:false});
export const eliteMat=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.5,depthTest:false}),threadGeo=new THREE.PlaneGeometry(.05,1);threadGeo.translate(0,.5,0);
export function updateEnemyFx(e,dt){const top=e.y+e.h+(e.d.fly?.15:.3);e.hpShow=(e.hpShow||0)-dt;
  if(e.elite){if(!e.star){e.star=new THREE.Mesh(markGeo,eliteMat);e.star.renderOrder=8;scene.add(e.star);}e.star.visible=!e.burrow;e.star.position.set(e.x,top+.25+Math.sin(e.t*3)*.08,.69);e.star.rotation.z=Math.sin(e.t*2)*.2;}
  if(e.warn){if(!e.mark){e.mark=new THREE.Mesh(markGeo,markMat);e.mark.renderOrder=8;scene.add(e.mark);}e.mark.visible=true;const k=(SET.cb&&SET.cb!=='off'?1.3:1)*(1+.18*Math.sin(e.t*20));e.mark.scale.set(k,k,1);e.mark.position.set(e.x,top+(e.elite?1.05:.6),.7);}else if(e.mark)e.mark.visible=false;
  const show=!e.d.boss&&e.hpShow>0&&e.hp<e.max;if(show&&!e.bar){const bg=new THREE.Mesh(barBgGeo,barBgMat),fg=new THREE.Mesh(barFgGeo,e.elite?barFgEliteMat:barFgMat);bg.renderOrder=6;fg.renderOrder=7;scene.add(bg,fg);e.bar=[bg,fg];}
  if(e.bar){e.bar[0].visible=e.bar[1].visible=show;if(show){const bw=Math.max(.9,e.w+.2);e.bar[0].scale.x=bw;e.bar[0].position.set(e.x,top+.12,.66);e.bar[1].scale.x=Math.max(.001,(bw-.08)*e.hp/e.max);e.bar[1].position.set(e.x-bw/2+.04,top+.12,.67);}}}
function batDraw(t,f,c1,c2,eye){const up=f?-16:14;for(const s of[-1,1]){t.beginPath();t.moveTo(48,32);t.quadraticCurveTo(48+s*20,32+up-8,48+s*42,26+up);t.quadraticCurveTo(48+s*32,40+up*.3,48+s*26,34+up*.2);t.quadraticCurveTo(48+s*18,44,48,38);t.closePath();fi(t,c2,2.5);}
  t.beginPath();t.ellipse(48,36,11,13,0,0,6.28);fi(t,c1);poly(t,[40,26,43,14,47,25]);fi(t,c1,2);poly(t,[49,25,53,14,56,26]);fi(t,c1,2);circ(t,44,34,2.4);t.fillStyle=eye;t.fill();circ(t,52,34,2.4);t.fill();}
function snowDraw(w,h){return(t,f)=>{const cx=w/2,sq=f?1:0,r=Math.min(w,h)*.4,rx=r*(1+sq*.12),ry=r*(1-sq*.15),cy=h-6-ry;
  t.beginPath();t.ellipse(cx,cy,rx,ry,0,0,6.28);fi(t,'#f6f9fb',3);t.beginPath();t.ellipse(cx-rx*.35,cy-ry*.4,rx*.22,ry*.14,-.5,0,6.28);t.fillStyle='rgba(174,224,242,.6)';t.fill();
  for(const ex of[cx+rx*.12,cx+rx*.42]){circ(t,ex,cy-ry*.14,r*.08+1);t.fillStyle=INK;t.fill();}poly(t,[cx+rx*.3,cy+ry*.04,cx+rx*1.05,cy+ry*.16,cx+rx*.3,cy+ry*.28]);fi(t,'#e0823d',1.5);
  t.beginPath();t.moveTo(cx-rx*.6,cy+ry*.5);t.quadraticCurveTo(cx,cy+ry*.8,cx+rx*.5,cy+ry*.6);ink(t,1.2,'rgba(42,33,48,.25)');};}
// newer biome enemies: every sheet faces right, 2 frames
export function buildMoreSheets(){
  SHEETS.crumple=makeSheet(2,80,80,(t,f)=>{const pts=[];for(let i=0;i<14;i++){const a=i/14*6.283+f*.2,r=(i%2?25:31)+((i*7)%5)-2;pts.push(40+Math.cos(a)*r,40+Math.sin(a)*r);}poly(t,pts);fi(t,'#efe6d2',3);
    t.beginPath();for(let i=0;i<5;i++){const a=i*1.3+f;t.moveTo(40+Math.cos(a)*6,40+Math.sin(a)*6);t.lineTo(40+Math.cos(a)*26,40+Math.sin(a)*26);}ink(t,1.4,'rgba(42,33,48,.35)');
    for(const ex of[46,58]){circ(t,ex,37,3.4);t.fillStyle=INK;t.fill();}t.beginPath();t.moveTo(41,29);t.lineTo(50,32);t.moveTo(63,29);t.lineTo(54,32);ink(t,2.4);t.beginPath();t.moveTo(47,49);t.lineTo(57,47);ink(t,2);});
  SHEETS.toadstool=makeSheet(2,96,96,(t,f)=>{const sq=f?5:0;rr(t,32,48+sq,32,44-sq,12);fi(t,'#f4ecd8',3);for(const ex of[50,59]){t.beginPath();t.ellipse(ex,64+sq*.5,2.6,4.2,0,0,6.28);t.fillStyle=INK;t.fill();}t.beginPath();t.arc(55,74+sq*.5,3,.2,2.9);ink(t,2);
    t.beginPath();t.moveTo(8,54+sq);t.bezierCurveTo(8,10+sq*1.6,88,10+sq*1.6,88,54+sq);t.closePath();fi(t,'#d4483b',3.5);for(const[x,y,r]of[[30,36,6],[52,26,7],[72,38,5],[46,46,4]]){circ(t,x,y+sq,r);t.fillStyle='#fbf5e6';t.fill();}});
  SHEETS.dunefin=makeSheet(2,128,96,(t,f)=>{const o=f?4:-4;poly(t,[48,46,62,6,80,46]);fi(t,'#b98f4a',3);poly(t,[10,58+o,24,66,10,80-o]);fi(t,'#b98f4a',3);
    t.beginPath();t.moveTo(20,66);t.quadraticCurveTo(50,36,96,48);t.quadraticCurveTo(124,56,122,68);t.quadraticCurveTo(100,90,56,86);t.quadraticCurveTo(28,82,20,66);t.closePath();fi(t,'#e3c77d',3);
    t.beginPath();t.moveTo(60,82);t.quadraticCurveTo(92,84,118,70);ink(t,1.5,'rgba(42,33,48,.3)');poly(t,[98,72,102,78,106,72,110,77,114,70]);t.fillStyle='#fbf5e6';t.fill();ink(t,1.5);
    circ(t,104,58,4);t.fillStyle=INK;t.fill();circ(t,105,57,1.4);t.fillStyle='#fff';t.fill();poly(t,[60,84,70,94,74,84]);fi(t,'#b98f4a',2);});
  SHEETS.scarab=makeSheet(2,112,80,(t,f)=>{const lg=f?5:-5;for(const[x,o]of[[34,lg],[52,-lg],[70,lg]]){t.beginPath();t.moveTo(x,60);t.lineTo(x+o-6,76);ink(t,4);}
    poly(t,[84,44,104,40,108,52,100,62,84,60]);fi(t,'#2c5763',3);poly(t,[100,42,110,24,106,44]);fi(t,'#f1c04f',2);circ(t,98,48,2.8);t.fillStyle='#ffd66b';t.fill();
    t.beginPath();t.moveTo(14,64);t.bezierCurveTo(12,14,92,10,90,64);t.closePath();fi(t,'#3f7a8a',3.5);t.beginPath();t.moveTo(52,19);t.lineTo(52,64);ink(t,2.5);
    t.beginPath();t.moveTo(14,64);t.lineTo(90,64);ink(t,4,'#f1c04f');for(const[x,y]of[[34,36],[68,34],[40,52],[64,52]]){circ(t,x,y,4);t.fillStyle='rgba(255,255,255,.25)';t.fill();}});
  SHEETS.sunkite=makeSheet(2,112,80,(t,f)=>{const w=f?6:-6;t.beginPath();t.moveTo(30,40);t.quadraticCurveTo(18,40+w,8,34-w);t.quadraticCurveTo(0,30,4,44+w);ink(t,2.5,'#d4483b');for(const[x,y]of[[18,40+w*.6],[8,36-w*.4]]){poly(t,[x-4,y-4,x+4,y+4,x+4,y-4,x-4,y+4]);fi(t,'#f1c04f',1.5);}
    poly(t,[30,40,70,6,106,40,70,74]);fi(t,'#f1c04f',3.5);poly(t,[70,6,106,40,70,40]);t.fillStyle='#d4483b';t.fill();ink(t,3);poly(t,[30,40,70,74,70,40]);t.fillStyle='#e0823d';t.fill();ink(t,3);
    t.beginPath();t.moveTo(30,40);t.lineTo(106,40);t.moveTo(70,6);t.lineTo(70,74);ink(t,1.6,'rgba(42,33,48,.45)');circ(t,80,32,3.4);t.fillStyle=INK;t.fill();circ(t,92,32,3.4);t.fill();t.beginPath();t.arc(86,46,4,.2,2.9);ink(t,2);});
  SHEETS.snowroll=makeSheet(2,96,96,snowDraw(96,96));
  SHEETS.snowlet=makeSheet(2,64,56,snowDraw(64,56),3);
  SHEETS.frostpuff=makeSheet(2,96,96,(t,f)=>{t.translate(48,48);for(let i=0;i<10;i++){const a=i/10*6.283+(f?.12:0);poly(t,[Math.cos(a-.16)*24,Math.sin(a-.16)*24,Math.cos(a)*40,Math.sin(a)*40,Math.cos(a+.16)*24,Math.sin(a+.16)*24]);fi(t,'#aee0f2',2);}
    circ(t,0,0,27);fi(t,'#dff2fa',3);circ(t,-8,-10,7);t.fillStyle='rgba(255,255,255,.7)';t.fill();circ(t,8,-3,3.4);t.fillStyle=INK;t.fill();circ(t,18,-3,3.4);t.fill();circ(t,14,9,4);ink(t,2);});
  SHEETS.inkwisp=makeSheet(2,80,96,(t,f)=>{const w=f?6:-6;t.beginPath();t.moveTo(40,8);t.bezierCurveTo(72,36,70,70,44,78);t.quadraticCurveTo(30+w,86,36+w,94);t.quadraticCurveTo(14+w,84,18,62);t.bezierCurveTo(12,40,30,26,40,8);t.closePath();fi(t,'#3a2a5a',3);
    t.beginPath();t.moveTo(40,24);t.bezierCurveTo(58,42,58,62,44,70);t.bezierCurveTo(30,64,28,44,40,24);t.fillStyle='#8a5fc0';t.fill();circ(t,48,50,9);fi(t,'#f4f0e6',2);circ(t,51,50,4.5);t.fillStyle=INK;t.fill();circ(t,49,47,1.6);t.fillStyle='#fff';t.fill();});
  SHEETS.quillfish=makeSheet(2,96,72,(t,f)=>{const o=f?7:-7;poly(t,[20,36,4,20+o,8,36,4,52-o]);fi(t,'#35557f',3);for(let k=0;k<4;k++){const x=36+k*11;poly(t,[x,26,x+4,6+k*2,x+9,24]);fi(t,'#f4f0e6',1.8);}
    t.beginPath();t.ellipse(52,38,34,17,0,0,6.28);fi(t,'#4a6fa0',3);t.beginPath();t.ellipse(54,44,26,8,0,0,3.14);t.fillStyle='#f4f0e6';t.fill();poly(t,[48,42,58,58,62,42]);fi(t,'#35557f',2);
    circ(t,72,32,5);fi(t,'#fbf5e6',1.5);circ(t,74,32,2.4);t.fillStyle=INK;t.fill();t.beginPath();t.moveTo(84,40);t.lineTo(78,42);ink(t,2);});
  SHEETS.cracker=makeSheet(2,80,112,(t,f)=>{const lg=f?5:-5;for(const[x,o]of[[30,lg],[48,-lg]]){rr(t,x-5+o,88,10,20,4);fi(t,'#3a2a24',2);}
    rr(t,18,30,42,62,8);fi(t,'#d4483b',3.5);t.fillStyle='#f1c04f';t.fillRect(20,42,38,6);t.fillRect(20,74,38,6);rr(t,16,24,46,12,5);fi(t,'#ffd66b',3);
    t.beginPath();t.moveTo(39,24);t.quadraticCurveTo(34,12,46,6);ink(t,3,'#5a3a22');const s=f?9:6;poly(t,[46,6-s,48,4,46+s,6,48,8,46,6+s,44,8,46-s,6,44,4]);t.fillStyle='#ffd66b';t.fill();
    for(const ex of[44,54]){circ(t,ex,58,3.2);t.fillStyle='#ffd66b';t.fill();ink(t,1.5);}t.beginPath();t.moveTo(38,50);t.lineTo(47,53);t.moveTo(60,50);t.lineTo(51,53);ink(t,2.4);});
  SHEETS.ashspider=makeSheet(2,112,72,(t,f)=>{const lg=f?4:-4;for(let k=0;k<4;k++){const x=40+k*14,o=k%2?lg:-lg;t.beginPath();t.moveTo(x,44);t.lineTo(x-8+o,24);t.lineTo(x-14+o,66);ink(t,4,'#1e1614');}
    t.beginPath();t.ellipse(38,42,26,20,0,0,6.28);fi(t,'#3a2a24',3);poly(t,[30,34,38,26,46,34,38,50]);t.fillStyle='#ff8a3d';t.fill();
    circ(t,74,46,14);fi(t,'#2a1e1a',3);for(const[x,y]of[[78,42],[86,44],[80,50]]){circ(t,x,y,2.6);t.fillStyle='#ffd66b';t.fill();}});
  for(const k of['crumple','toadstool','dunefin','scarab','sunkite','snowroll','snowlet','frostpuff','inkwisp','quillfish','cracker','ashspider'])SHEETS[k+'T']=canvasTex(SHEETS[k]);}
export function buildBiomeSheets(){
  SHEETS.blot=makeSheet(2,96,80,(t,f)=>slimeDraw('#4a3570')(t,f,96,80));
  SHEETS.foldfox=makeSheet(2,128,96,(t,f)=>{const lg=f?6:-6;for(const[x,o]of[[40,lg],[52,-lg],[80,-lg],[92,lg]]){poly(t,[x-4,62,x+4,62,x+2+o,90,x-4+o,90]);fi(t,x<60?'#b8612a':'#e0823d',2);}
    poly(t,[26,60,40,40,88,38,104,56,90,66,36,68]);fi(t,'#e0823d');poly(t,[60,66,88,40,90,66]);fi(t,'#f4f0e6',2);
    poly(t,[26,58,4,20,12,18,34,48]);fi(t,'#e0823d');poly(t,[4,20,12,18,14,30]);fi(t,'#f4f0e6',2);
    poly(t,[90,40,104,20,110,36,124,48,104,56]);fi(t,'#e0823d');poly(t,[104,20,108,8,112,26]);fi(t,'#b8612a',2);poly(t,[124,48,112,52,116,44]);fi(t,INK,1.5);circ(t,108,38,2.6);t.fillStyle=INK;t.fill();
    t.beginPath();t.moveTo(40,40);t.lineTo(60,66);t.moveTo(88,38);t.lineTo(74,66);ink(t,1.4,'rgba(42,33,48,.35)');});
  SHEETS.flurry=makeSheet(2,80,80,(t,f)=>{t.translate(40,40);t.rotate(f?.26:0);for(let i=0;i<6;i++){t.save();t.rotate(i/6*Math.PI*2);poly(t,[-4,0,4,0,3,-30,-3,-30]);fi(t,'#f6f9fb',2);poly(t,[0,-20,-8,-28,0,-24,8,-28]);fi(t,'#e6f1f7',1.5);t.restore();}circ(t,0,0,12);fi(t,'#e6f1f7',2.5);circ(t,-4,-2,2);t.fillStyle=INK;t.fill();circ(t,4,-2,2);t.fill();t.beginPath();t.arc(0,3,3,.2,2.9);ink(t,1.5);});
  SHEETS.inksquid=makeSheet(2,96,96,(t,f)=>{for(let k=0;k<4;k++){t.beginPath();t.moveTo(40,40+k*6);t.quadraticCurveTo(20,36+k*8+(f?8:-8),6,44+k*6);ink(t,6,'#4a3570');}t.beginPath();t.ellipse(58,48,28,17,0,0,6.28);fi(t,'#6b4c8f');poly(t,[80,40,94,48,80,56]);fi(t,'#8a5fc0',2);circ(t,64,44,5);fi(t,'#f4f0e6',1.5);circ(t,66,44,2.5);t.fillStyle=INK;t.fill();circ(t,50,40,4);t.fillStyle='rgba(255,255,255,.35)';t.fill();});
  SHEETS.ashimp=makeSheet(2,96,144,(t,f)=>drawHuman(t,{skin:'#9a3b2a',tunic:'#3a2a24',pants:'#2a1e1a',boots:'#1e1614',legA:f?.4:-.3,legB:f?-.4:.3,armA:-.8,armB:.3,eyeCol:'#ffd66b',noBlush:1,bob:f?1:0,
    extra:tt=>{poly(tt,[34,34,28,14,40,28]);fi(tt,'#3a2a24',2);poly(tt,[62,30,72,10,68,32]);fi(tt,'#3a2a24',2);},front:tt=>{circ(tt,70,84,7);tt.fillStyle='rgba(255,138,61,.6)';tt.fill();}}));
  SHEETS.crane=makeSheet(2,360,240,(t,f)=>{const cx=170,cy=140,up=f?1:0;const wing=(dx,col)=>{if(up)poly(t,[cx-30+dx,cy-14,cx+40+dx,cy-16,cx-10+dx,cy-126,cx-96+dx,cy-110]);else poly(t,[cx-30+dx,cy+8,cx+40+dx,cy+8,cx-4+dx,cy+96,cx-88+dx,cy+74]);fi(t,col,4);};
    wing(-20,'#b9cfe0');poly(t,[cx-60,cy,cx-156,cy-72,cx-132,cy-38,cx-68,cy+14]);fi(t,'#dce8f0',4);
    poly(t,[cx-72,cy,cx,cy-32,cx+62,cy,cx,cy+32]);fi(t,'#f4f0e6',4);t.beginPath();t.moveTo(cx-72,cy);t.lineTo(cx+62,cy);ink(t,2,'rgba(42,33,48,.3)');
    poly(t,[cx+40,cy-8,cx+120,cy-80,cx+130,cy-72,cx+56,cy+6]);fi(t,'#f4f0e6',4);poly(t,[cx+118,cy-84,cx+160,cy-64,cx+126,cy-66]);fi(t,'#f1c04f',3);circ(t,cx+120,cy-86,6);fi(t,'#d4483b',2.5);circ(t,cx+126,cy-74,3);t.fillStyle=INK;t.fill();
    wing(14,'#e6f1f7');t.beginPath();t.moveTo(cx,cy);t.lineTo(cx-40,up?cy-110:cy+80);ink(t,2,'rgba(42,33,48,.25)');},6);
  SHEETS.lev=makeSheet(2,180,140,(t,f)=>{const o=f?14:0;poly(t,[20,40,100,22,150,46,172,62-o*.4,120,70,20,100]);fi(t,'#4a3570',4);poly(t,[20,100,120,70+o,168,82+o,110,110,24,112]);fi(t,'#3a2a5a',4);
    for(let k=0;k<5;k++){poly(t,[150-k*10,62+o*.5,146-k*10,72+o*.5,142-k*10,62+o*.5]);t.fillStyle='#f4f0e6';t.fill();}poly(t,[60,24,80,0,96,26]);fi(t,'#8a5fc0',3);circ(t,118,44,9);fi(t,'#f1c04f',3);circ(t,120,44,4);t.fillStyle=INK;t.fill();},5);
  SHEETS.levseg=makeSheet(2,140,140,(t,f)=>{poly(t,[70,24,90,4,104,30]);fi(t,'#8a5fc0',3);circ(t,70,70,50);fi(t,'#4a3570',4);circ(t,70,70,34);ink(t,3,'rgba(160,130,220,.35)');poly(t,[36,98,52,128,62,102]);fi(t,'#8a5fc0',3);circ(t,56,54,8);t.fillStyle='rgba(255,255,255,.2)';t.fill();},5);
  SHEETS.levtail=makeSheet(2,140,140,(t,f)=>{poly(t,[110,70,40,40,10,20+(f?10:0),30,70,10,120-(f?10:0),40,100]);fi(t,'#4a3570',4);poly(t,[10,20,30,70,10,120]);fi(t,'#8a5fc0',3);},5);
  SHEETS.folio=makeSheet(2,340,280,(t,f)=>{const lift=f?16:0;rr(t,20,70,300,190,12);fi(t,'#6b2a1a',5);
    poly(t,[40,80,168,96,168,250,40,240]);fi(t,'#e9dcc0',4);poly(t,[172,96,300,80-lift,300,240,172,250]);fi(t,'#e9dcc0',4);
    for(const x of[60,80,100,120,140])for(let y=120;y<230;y+=16){t.beginPath();t.moveTo(x-8,y);t.lineTo(x+8,y+1);ink(t,1.5,'rgba(42,33,48,.25)');}
    for(let k=0;k<7;k++){const x=40+k*42;t.beginPath();t.moveTo(x,84);t.bezierCurveTo(x+18,60,x+10,30,x+20,6+(k%2)*14);t.bezierCurveTo(x+30,34,x+40,60,x+36,84);t.closePath();fi(t,'#ff7a2d',3);t.beginPath();t.moveTo(x+10,82);t.quadraticCurveTo(x+20,52,x+22,40);t.quadraticCurveTo(x+30,60,x+28,82);t.fillStyle='#ffd66b';t.fill();}
    t.beginPath();t.ellipse(236,168,40,30,0,0,6.28);fi(t,'#f4f0e6',4);circ(t,240,168,18);fi(t,'#ff8a3d',3);circ(t,242,168,8);t.fillStyle=INK;t.fill();circ(t,234,160,5);t.fillStyle='#fff';t.fill();
    for(const[x,y]of[[44,236],[160,246],[296,234]]){circ(t,x,y,12);t.fillStyle='#2a1e1a';t.fill();}},6);
  for(const k of['unfolded','wraith','guide','painter','nurse','tinkerer','blot','foldfox','flurry','inksquid','ashimp','crane','lev','levseg','levtail','folio','cinderbat'])SHEETS[k+'T']=canvasTex(SHEETS[k]);}
export function spriteMesh(tex,frames,w,h,anchorBottom=true){const g=new THREE.PlaneGeometry(w,h);if(anchorBottom)g.translate(0,h/2,0);const m=new THREE.Mesh(g,spriteMat(tex,frames));scene.add(m);return m;}
const iconCache={},iconTexCache={};
function iconCanvas(id){const c=mk(64,64);const[x,y]=cellXY(ITEMS[id].cell);c.getContext('2d').drawImage(atlas,x,y,64,64,0,0,64,64);return c;}
export function icon(id){return iconCache[id]||(iconCache[id]=iconCanvas(id).toDataURL());}
export function iconTex(id){return iconTexCache[id]||(iconTexCache[id]=canvasTex(iconCanvas(id)));}
// drops cached icons after their atlas cells are redrawn (color-vision mode changes the ore art)
export function clearIcons(ids){for(const id of ids){delete iconCache[id];if(iconTexCache[id]){iconTexCache[id].dispose();delete iconTexCache[id];}}}
// the "!" over an enemy winding up an attack; colorblind modes swap it for a bright warning triangle
export function drawWarnMark(){const cb=SET.cb&&SET.cb!=='off';if(markMat.map)markMat.map.dispose();
  markMat.map=canvasTex(makeSheet(1,64,64,t=>{if(cb){poly(t,[32,3,61,57,3,57]);fi(t,SET.cb==='trit'?'#ff5a8a':'#ffd23f',4.5);rr(t,28.5,19,7,23,3.5);t.fillStyle=INK;t.fill();circ(t,32,49,4);t.fill();}
    else{rr(t,23,5,18,36,9);fi(t,'#d4483b',3);circ(t,32,52,7);fi(t,'#d4483b',3);}},3));markMat.needsUpdate=true;}

// ================= particles =================
const PMAX=600;const pMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.17,.17),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),PMAX);pMesh.frustumCulled=false;
export const dummy=new THREE.Object3D();const tmpC=new THREE.Color();export const parts=[];
for(let i=0;i<PMAX;i++){dummy.scale.set(0,0,0);dummy.updateMatrix();pMesh.setMatrixAt(i,dummy.matrix);pMesh.setColorAt(i,tmpC.set(1,1,1));}scene.add(pMesh);
export function burst(x,y,cols,n,spd=5,o={}){for(let k=0;k<n;k++){if(parts.length>=PMAX)parts.shift();const a=Math.random()*Math.PI*2,v=rand(.3,1)*spd;const L=o.bright?[1,1,1]:lightAt(x,y);
  tmpC.set(pick(cols));parts.push({x:x+rand(-.3,.3),y:y+rand(-.3,.3),z:rand(.2,.7),vx:Math.cos(a)*v,vy:Math.sin(a)*v+(o.up||2),life:rand(.5,1.1)*(o.life||1),max:1,rx:rand(0,6),ry:rand(0,6),vr:rand(-12,12),r:tmpC.r*L[0],g:tmpC.g*L[1],b:tmpC.b*L[2],grav:o.grav??18,s:o.s||1});}}
export function updateParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}p.vy-=p.grav*dt;p.vx*=Math.pow(.3,dt);if(p.grav>0&&p.vy<-3)p.vy=-3+Math.sin(p.life*14)*.8;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rx+=p.vr*dt;p.ry+=p.vr*.7*dt;}
  for(let i=0;i<PMAX;i++){const p=parts[i];if(p){const s=Math.min(1,p.life*3)*p.s;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rx*.5);dummy.scale.set(s,s,s);dummy.updateMatrix();pMesh.setMatrixAt(i,dummy.matrix);pMesh.setColorAt(i,tmpC.setRGB(p.r,p.g,p.b));}else{dummy.scale.set(0,0,0);dummy.updateMatrix();pMesh.setMatrixAt(i,dummy.matrix);}}
  pMesh.instanceMatrix.needsUpdate=true;if(pMesh.instanceColor)pMesh.instanceColor.needsUpdate=true;}
// Imported bindings are read-only, so other modules assign these through setters.
export function setCamDist(v){return camDist=v;}
export function setSnowF(v){return snowF=v;}
export function setCW(v){return CW=v;}
export function setCHH(v){return CHH=v;}
export function setChunks(v){return chunks=v;}
export function setLiqChunks(v){return liqChunks=v;}
export function setLightDirty(v){return lightDirty=v;}
export function setLx0(v){return lx0=v;}
export function setLx1(v){return lx1=v;}
