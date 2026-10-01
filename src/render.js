// three.js renderer, scene and camera, chunk meshes, procedural sprite sheets and particles.
import * as THREE from 'three';
import {
  reduceMotion,$,atlas,ATH,ATW,blk,buildDiorama,C,canopyCell,cellXY,circ,computeLight,CS,fi,grain,H,idx,INK,ink,isOpaque,ITEMS,LB,lightAt,meta,mk,
  LIGHT,mulberry32,N,OPAQUE,pick,player,poly,rand,rr,seed,SET,sh,sky,stamp,surfAvg,T,tileAt,tiles,TP,W,
  WALLCELL,walls,markFg,
  buildMarks,rigPic,playerRigKind,
} from './game.js';

// ================= three setup =================
// All art is drawn in sRGB and the shaders mix colors as-is, so keep three.js out of color management
// (on by default since r152): no sRGB-to-linear conversion of colors, no sRGB encode on output.
THREE.ColorManagement.enabled=false;
export const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x1b1a26);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
$('view').appendChild(renderer.domElement);
export const scene=new THREE.Scene();
export const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,1,400);
export let camDist=SET.zoom;
export const atlasTex=new THREE.CanvasTexture(atlas);atlasTex.anisotropy=renderer.capabilities.getMaxAnisotropy();atlasTex.minFilter=THREE.LinearMipmapLinearFilter;
// Lighting: tiles carry propagated sky/block light per vertex (aL.xy, 0-15) and a face shade (aL.z; 2 marks lava,
// 3-4 an emissive tile whose glow is aL.z-3). nmap is a normal map made from the atlas art (buildNormals), so ink
// lines, folds and grain catch the sun or moon (uSun: direction xyz, strength w), the player's glow and up to NDL
// dynamic lights (uDL: x, y, radius, strength; uDLC: color), filled each frame by updateDynLights().
// uHdr is 1 while post-processing renders to a float target, letting lights and emissive tiles go past 1 for bloom.
export const NDL=16;
export const nmapC=mk(ATW,ATH);export const nmapTex=new THREE.CanvasTexture(nmapC);nmapTex.minFilter=THREE.LinearMipmapLinearFilter;
export const U={map:{value:atlasTex},nmap:{value:nmapTex},uSky:{value:new THREE.Vector3(1,1,1)},uP:{value:new THREE.Vector3(0,0,4)},uGlow:{value:.35},uSun:{value:new THREE.Vector4(0,.6,.8,0)},uHdr:{value:0},
  uDL:{value:Array.from({length:NDL},()=>new THREE.Vector4(0,0,1,0))},uDLC:{value:Array.from({length:NDL},()=>new THREE.Vector3())}};
// height from the art (ink sinks, paper and highlights rise, transparent edges drop away), blurred once, then a Sobel-style
// slope per pixel. Rebuilt when atlas cells are redrawn (applyCB).
export function buildNormals(){const w=ATW,h=ATH,src=atlas.getContext('2d').getImageData(0,0,w,h).data,H0=new Float32Array(w*h),H1=new Float32Array(w*h);
  for(let i=0,j=0;i<w*h;i++,j+=4)H0[i]=src[j+3]/255*(.3+.7*(src[j]*.3+src[j+1]*.55+src[j+2]*.15)/255);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;H1[i]=(H0[i-w-1]+H0[i-w]+H0[i-w+1]+H0[i-1]+H0[i]*2+H0[i+1]+H0[i+w-1]+H0[i+w]+H0[i+w+1])*.1;}
  const g=nmapC.getContext('2d'),out=g.createImageData(w,h),d=out.data,k=2.4;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,dx=(H1[x<w-1?i+1:i]-H1[x?i-1:i])*k,dy=(H1[y<h-1?i+w:i]-H1[y?i-w:i])*k,l=1/Math.sqrt(dx*dx+dy*dy+1),j=i*4;
    // canvas y runs down, world y up: the slope along y flips sign
    d[j]=(-dx*l*.5+.5)*255;d[j+1]=(dy*l*.5+.5)*255;d[j+2]=(l*.5+.5)*255;d[j+3]=255;}
  g.putImageData(out,0,0);nmapTex.needsUpdate=true;}
buildNormals();
export const worldMat=new THREE.ShaderMaterial({uniforms:U,side:THREE.DoubleSide,
  vertexShader:`attribute vec3 aL;varying vec2 vUv;varying vec3 vL;varying vec3 vW;void main(){vUv=uv;vL=aL;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform sampler2D map;uniform sampler2D nmap;uniform vec3 uSky;uniform vec3 uP;uniform float uGlow;uniform vec4 uSun;uniform float uHdr;uniform vec4 uDL[${NDL}];uniform vec3 uDLC[${NDL}];varying vec2 vUv;varying vec3 vL;varying vec3 vW;
  void main(){vec4 t=texture2D(map,vUv);if(t.a<.5)discard;vec3 n=normalize(texture2D(nmap,vUv).xyz*2.-1.);float em=vL.z>2.5?vL.z-3.:0.,shd=em>0.?1.:vL.z;
  float s=pow(vL.x/15.,1.6)*(1.+.5*uSun.w*(max(dot(n,uSun.xyz),0.)-uSun.z));float b=pow(vL.y/15.,1.45)*(1.+.3*(n.z-1.));
  vec3 L=uSky*s+vec3(1.,.8,.55)*b*1.15;vec2 dp=uP.xy-vW.xy;float d=length(dp);L+=vec3(1.,.88,.66)*uGlow*clamp(1.-d/uP.z,0.,1.)*(1.+.5*(max(dot(n,normalize(vec3(dp,1.4))),0.)-1.4/length(vec3(dp,1.4))));
  for(int i=0;i<${NDL};i++){if(uDL[i].w<=0.)continue;vec2 q=uDL[i].xy-vW.xy;float dd=length(q);if(dd>=uDL[i].z)continue;L+=uDLC[i]*uDL[i].w*(1.-dd/uDL[i].z)*(1.+.6*(max(dot(n,normalize(vec3(q,1.2))),0.)-1.2/length(vec3(q,1.2))));}
  L=clamp(L,vec3(.035,.03,.05),vec3(1.25));vec3 c=min(t.rgb*L*shd,vec3(1.));
  if(em>0.){float f=smoothstep(.45,.85,max(t.r,t.g));c=max(c,t.rgb*.95*f)+t.rgb*f*em*(.35+uHdr*1.1);}
  gl_FragColor=vec4(c,1.);}`});
const liquidMat=new THREE.ShaderMaterial({uniforms:U,side:THREE.DoubleSide,transparent:true,depthWrite:false,vertexShader:worldMat.vertexShader,
  fragmentShader:worldMat.fragmentShader.replace('if(t.a<.5)discard;','if(t.a<.1)discard;if(vL.z>1.5){gl_FragColor=vec4(t.rgb*(1.1+uHdr*.55),.93);return;}').replace('gl_FragColor=vec4(c,1.);','gl_FragColor=vec4(c,.8);')});
export function spriteMat(tex,frames=1){return new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{map:{value:tex},uFrame:{value:0},uFrames:{value:frames},uTint:{value:new THREE.Vector3(1,1,1)},uFlash:{value:0},uOut:{value:new THREE.Vector4(0,0,0,0)},uPx:{value:new THREE.Vector2()},uCr:{value:new THREE.Vector3()}},
  vertexShader:`uniform float uFrame;uniform float uFrames;varying vec2 vUv;void main(){vUv=vec2((uv.x+uFrame)/uFrames,uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  // uOut (rgb, on) draws a solid outline uPx texels wide around the sprite, kept inside the current frame (Settings > Outline enemies about to attack)
  // uCr (creases 0-2, ink 0-1, tear width) folds ink lines across a boss and tears them open into gaps with paper-white edges (boss.js)
  fragmentShader:`uniform sampler2D map;uniform vec3 uTint;uniform float uFlash;uniform vec4 uOut;uniform vec2 uPx;uniform float uFrame;uniform float uFrames;uniform vec3 uCr;varying vec2 vUv;void main(){vec4 t=texture2D(map,vUv);
    float cd=9.,cw=0.;if(uCr.x>0.&&t.a>=.5){vec2 q=vec2(vUv.x*uFrames-uFrame,vUv.y);cd=abs(q.x*.9+q.y-1.05+.035*sin(q.y*47.));if(uCr.x>1.5)cd=min(cd,abs(q.x-q.y*.7-.12+.03*sin(q.x*53.+1.)));
      cw=uCr.z*(.03+.02*sin(q.x*91.+q.y*67.));if(cd<cw)discard;}
    if(t.a<.5){if(uOut.a<=0.)discard;float x0=uFrame/uFrames+uPx.x*.5,x1=(uFrame+1.)/uFrames-uPx.x*.5,a=0.;
      for(int i=0;i<8;i++){float an=float(i)*.785398;a=max(a,texture2D(map,vec2(clamp(vUv.x+cos(an)*uPx.x,x0,x1),vUv.y+sin(an)*uPx.y)).a);}
      if(a<.5)discard;gl_FragColor=vec4(uOut.rgb,1.);return;}
    vec3 c=t.rgb*uTint;if(cw>0.&&cd<cw+.018)c=vec3(.98,.95,.88)*uTint;else if(cd<.011)c=mix(c,vec3(.16,.13,.19),uCr.y);
    gl_FragColor=vec4(mix(c,vec3(1.),uFlash),1.);}`});}
// outline color for a winding-up enemy: red, or the warning mark's color in color-vision modes
const TELECOL={off:new THREE.Color('#ff3b2a'),deut:new THREE.Color('#ffd23f'),prot:new THREE.Color('#ffd23f'),trit:new THREE.Color('#ff5a8a')};
export function teleOutline(m,on,t){const u=m.material.uniforms;if(!u.uOut)return;if(!on){u.uOut.value.w=0;return;}const c=TELECOL[SET.cb]||TELECOL.off,k=.8+.2*Math.sin(t*18),img=u.map.value&&u.map.value.image;
  u.uOut.value.set(c.r*k,c.g*k,c.b*k,1);if(img)u.uPx.value.set(6/img.width,6/img.height);}
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
sunMesh.position.z=moonMesh.position.z=-100;sunMesh.renderOrder=moonMesh.renderOrder=-100;scene.add(sunMesh,moonMesh);
export const clouds=[];
function makeCloud(){const c=mk(256,128),t=c.getContext('2d');const bl=[[70,80,34],[120,64,44],[175,78,36],[100,90,28],[150,92,28]];for(const[x,y,r]of bl){circ(t,x,y+4,r);t.fillStyle='rgba(42,33,48,.15)';t.fill();}for(const[x,y,r]of bl){circ(t,x,y,r);fi(t,'#fbf8f0',3.5);}t.fillStyle='#fbf8f0';t.fillRect(60,86,130,20);return canvasTex(c);}
export let snowF=0;
export function buildBackdrop(){buildDiorama();buildMarks();
  clouds.forEach(c=>scene.remove(c));clouds.length=0;const ct=makeCloud();for(let i=0;i<9;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(10,5),new THREE.MeshBasicMaterial({map:ct,transparent:true,alphaTest:.4}));m.position.set(rand(0,W),surfAvg+rand(16,30),-30-rand(0,10));m.userData.s=rand(.3,.9);m.renderOrder=-15;scene.add(m);clouds.push(m);}}

// ================= chunk meshes =================
export let CW=Math.ceil(W/CS),CHH=Math.ceil(H/CS);export let chunks=[],liqChunks=[];export const dirty=new Set();
export function cellUV(c){const[x,y]=cellXY(c);return regionUV(x,y,64,64);}
function regionUV(px,py,w,h){const e=.6/ATW,f=.6/ATH;return[px/ATW+e,1-(py+h)/ATH+f,(px+w)/ATW-e,1-py/ATH-f];}
// emissive tiles (anything that gives light, apart from liquids) glow in the world shader: face shade 3 + glow
const EMIS=(t,shd)=>LIGHT[t]&&!TP[t].liq?3+LIGHT[t]/16:shd;
export function buildChunk(cx,cy){markFg(cx);const P=[],UV=[],L=[],I=[];let vc=0;const LP={P:[],UV:[],L:[],I:[],vc:0};
  const lquad=(v,uv,l,shd)=>{LP.P.push(...v);LP.UV.push(uv[0],uv[1],uv[2],uv[1],uv[2],uv[3],uv[0],uv[3]);for(let k=0;k<4;k++)LP.L.push(l[k][0],l[k][1],shd);const c=LP.vc;LP.I.push(c,c+1,c+2,c,c+2,c+3);LP.vc+=4;};
  const quad=(v,uv,l,shd)=>{P.push(...v);UV.push(uv[0],uv[1],uv[2],uv[1],uv[2],uv[3],uv[0],uv[3]);for(let k=0;k<4;k++)L.push(l[k][0],l[k][1],shd);I.push(vc,vc+1,vc+2,vc,vc+2,vc+3);vc+=4;};
  const cl=(x,y)=>{let s=0,b=0,w=0;for(let dx=-1;dx<=0;dx++)for(let dy=-1;dy<=0;dy++){const tx=x+dx,ty=y+dy;if(tx<0||ty<0||tx>=W||ty>=H)continue;const i=ty*W+tx;const wt=LB[tiles[i]]?.3:1;s+=sky[i]*wt;b+=blk[i]*wt;w+=wt;}return w?[s/w,b/w]:[0,0];};
  const flat=(x,y)=>{if(x<0||y<0||x>=W||y>=H)return[15,0];const i=y*W+x;return[sky[i],blk[i]];};
  const x0=cx*CS,y0=cy*CS,x1=Math.min(W,x0+CS),y1=Math.min(H,y0+CS);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*W+x,t=tiles[i];
    const c4=()=>[cl(x,y),cl(x+1,y),cl(x+1,y+1),cl(x,y+1)];
    if(OPAQUE[t]){const d=TP[t];const uv=cellUV(t===T.PEEL&&meta[i]?C.peelB:t===T.FAKE?[C.stone,C.brick,C.dirt][meta[i]]||C.stone:t===T.SEAL&&meta[i]?C.sealDoor:d.cell);quad([x,y,.5,x+1,y,.5,x+1,y+1,.5,x,y+1,.5],uv,c4(),EMIS(t,.93));
      if(!isOpaque(x,y+1)&&y+1<H){const f=flat(x,y+1);quad([x,y+1,.5,x+1,y+1,.5,x+1,y+1,-.5,x,y+1,-.5],cellUV(d.top||d.cell),[f,f,f,f],1.02);}
      if(y>0&&!isOpaque(x,y-1)){const f=flat(x,y-1);quad([x,y,-.5,x+1,y,-.5,x+1,y,.5,x,y,.5],uv,[f,f,f,f],.45);}
      if(x>0&&!isOpaque(x-1,y)){const f=flat(x-1,y);quad([x,y,-.5,x,y,.5,x,y+1,.5,x,y+1,-.5],uv,[f,f,f,f],.7);}
      if(x<W-1&&!isOpaque(x+1,y)){const f=flat(x+1,y);quad([x+1,y,.5,x+1,y,-.5,x+1,y+1,-.5,x+1,y+1,.5],uv,[f,f,f,f],.7);}
      continue;}
    const w=walls[i];if(w){quad([x,y,-.5,x+1,y,-.5,x+1,y+1,-.5,x,y+1,-.5],cellUV(WALLCELL[w]),c4(),.52);}
    if(t===T.AIR)continue;
    if(TP[t].liq){const top=tileAt(x,y+1)!==t;const lava=t===T.LAVA;lquad([x,y,.42,x+1,y,.42,x+1,y+1,.42,x,y+1,.42],cellUV(lava?(top?C.lavaT:C.lavaF):(top?C.inkT:C.inkF)),c4(),lava?2:1);continue;}
    let cell=TP[t].cell,z=0;if(t===T.SKETCH)cell=meta[i]===2?C.sketchS:C.sketchB;if(t===T.SIGN)cell=meta[i]?C.sign1:C.sign0;if(t===T.CRANK)cell=C.crank[meta[i]&1];if(t===T.MURAL){cell=C.murals[meta[i]&3];z=-.45;}if(t===T.CREASE)z=-.45;if(t===T.CROP){const m=meta[i];cell=C.crops[Math.min(4,m>>2)][Math.min(2,m&3)];}if(t===T.RARE){const m=meta[i];cell=C.rare[Math.min(3,m>>2)][Math.min(2,m&3)];}
    if(t===T.DOOR){const m=meta[i];cell=(m&1)?((m&2)?C.doorOT:C.doorOB):((m&2)?C.doorT:C.doorB);}
    if(t===T.TRUNK)z=-.2;
    const l4=c4();quad([x,y,z,x+1,y,z,x+1,y+1,z,x,y+1,z],cellUV(cell),l4,EMIS(t,1));
    if(t===T.TRUNK&&meta[i]){const r=canopyCell(meta[i]);const f=flat(x,y);quad([x-1.5,y+.2,-.25,x+2.5,y+.2,-.25,x+2.5,y+4.2,-.25,x-1.5,y+4.2,-.25],regionUV(r[0],r[1],256,256),[f,f,f,f],1);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setAttribute('aL',new THREE.Float32BufferAttribute(L,3));g.setIndex(I);
  const k=cy*CW+cx;if(chunks[k]){chunks[k].geometry.dispose();chunks[k].geometry=g;}else{chunks[k]=new THREE.Mesh(g,worldMat);scene.add(chunks[k]);}
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(LP.P,3));lg.setAttribute('uv',new THREE.Float32BufferAttribute(LP.UV,2));lg.setAttribute('aL',new THREE.Float32BufferAttribute(LP.L,3));lg.setIndex(LP.I);
  if(liqChunks[k]){liqChunks[k].geometry.dispose();liqChunks[k].geometry=lg;}else{liqChunks[k]=new THREE.Mesh(lg,liquidMat);liqChunks[k].renderOrder=3;scene.add(liqChunks[k]);}}
export function rebuildAll(){crops=new Set();for(let i=0;i<N;i++)if(tiles[i]===T.CROP||tiles[i]===T.RARE)crops.add(i);computeLight();for(let cy=0;cy<CHH;cy++)for(let cx=0;cx<CW;cx++)buildChunk(cx,cy);dirty.clear();}
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
export function setTile(x,y,t,m=0){if(x<0||y<0||x>=W||y>=H)return;const i=idx(x,y);tiles[i]=t;meta[i]=m;if(t===T.CROP||t===T.RARE)crops.add(i);else crops.delete(i);markDirty(x,y);}

// ================= sprites & sheets =================
export function makeSheet(n,fw,fh,draw,b=4){const out=mk(n*fw,fh),o=out.getContext('2d');for(let f=0;f<n;f++){const tmp=mk(fw,fh),t=tmp.getContext('2d');draw(t,f);grain(t,0,0,fw,fh,12);const sil=mk(fw,fh),s=sil.getContext('2d');s.drawImage(tmp,0,0);s.globalCompositeOperation='source-in';s.fillStyle='#fbf5e6';s.fillRect(0,0,fw,fh);
  o.save();o.beginPath();o.rect(f*fw,0,fw,fh);o.clip();for(let i=0;i<16;i++){const a=i/16*Math.PI*2;o.drawImage(sil,f*fw+Math.cos(a)*b,Math.sin(a)*b);}o.drawImage(tmp,f*fw,0);o.restore();}return out;}
// Humans (the player and townsfolk) are drawn as layers over body parts, back to front. The look `o` says what each layer wears:
//  body: skin | face: eyeCol, eyeY, noBlush, blink, face (an expression), brow (brows over it) | hair: hair color, hairS style | hat: hat color, hatS style
//  shirt: tunic | pants: pants, belt | boots: boots | cape: scarf (at the neck), cape (down the back) | acc: back/extra/front draw callbacks
//  armor: helm, mail, greaves, the worn armor's colors, drawn over the clothes
// A layer with nothing to wear on a part draws nothing. The human rig (rig.js) lists which layers each of its parts bakes, back
// to front, into its own paper piece, so any mix of armor, clothes and cosmetics is one re-bake of the rig's skin
// (player.sheetDirty), not a new hand-drawn sheet. Still pictures (portraits, the look preview) are rigPic() of the same rig.
// The held weapon and the shield are slots on the rig (rigHold); the status overlays are their own meshes (gameplay.js).
const HIP=110;export const LIMB={legB:[43,HIP,.8],armB:[42,82,.78],legA:[53,HIP,1],armA:[55,82,1]};
const isArm=p=>p==='armA'||p==='armB',isLeg=p=>p==='legA'||p==='legB';
// hair styles: [cap over the head, piece behind the head (drawn before the body)]
const HAIRCAP={short:[29,60,22,26,50,26,76,26,73,46],long:[28,66,20,24,50,25,77,25,74,47],bun:[29,60,22,26,50,26,76,26,73,46],pony:[29,60,22,26,50,26,76,26,73,46]};
function hairCap(t,o){const s=o.hairS||'short';
  if(s==='spiky'){poly(t,[29,58,20,40,31,36,26,20,42,28,46,12,56,25,68,14,67,30,80,30,73,46,66,39,61,45,55,37,47,42,41,36,37,52]);fi(t,o.hair);return;}
  if(s==='curly'){const B=[[32,52,7],[31,40,8],[38,30,8],[50,26,9],[62,28,8],[70,37,7],[40,40,6],[54,36,5]];t.beginPath();for(const[x,y,r]of B){t.moveTo(x+r,y);t.arc(x,y,r,0,6.28);}ink(t,5);t.fillStyle=o.hair;t.fill();
    t.fillStyle='rgba(255,255,255,.2)';for(const[x,y]of[[38,28],[50,23],[62,26]]){circ(t,x,y,2.4);t.fill();}return;}
  const c=HAIRCAP[s]||HAIRCAP.short;t.beginPath();t.moveTo(c[0],c[1]);t.quadraticCurveTo(c[2],c[3],c[4],c[5]);t.quadraticCurveTo(c[6],c[7],c[8],c[9]);t.lineTo(66,39);t.lineTo(61,45);t.lineTo(55,37);t.lineTo(47,42);t.lineTo(41,36);
  t.lineTo(37,s==='long'?66:52);t.closePath();fi(t,o.hair);}
function hairBack(t,o){const s=o.hairS,w=o.wave||0;if(s==='long'){t.beginPath();t.moveTo(30,42);t.quadraticCurveTo(18,70,24+w*.4,92);t.lineTo(40+w*.3,90);t.quadraticCurveTo(36,70,42,48);t.closePath();fi(t,o.hair);}
  else if(s==='bun'){circ(t,29,31,9);fi(t,o.hair);t.beginPath();t.moveTo(34,24);t.lineTo(37,36);ink(t,3,sh(o.hair,.6));}
  else if(s==='pony'){t.beginPath();t.moveTo(34,32);t.quadraticCurveTo(14,32,12+w,64);t.quadraticCurveTo(22,56,24,50);t.quadraticCurveTo(28,44,36,46);t.closePath();fi(t,o.hair);circ(t,31,38,4);fi(t,o.scarf||'#d4483b',2);}}
function hat(t,o){const s=o.hatS,c=o.hat;
  if(s==='cap'){t.beginPath();t.moveTo(28,44);t.quadraticCurveTo(28,20,50,20);t.quadraticCurveTo(70,20,72,40);t.closePath();fi(t,c);rr(t,58,36,24,7,3.5);fi(t,sh(c,.8));circ(t,50,21,3);fi(t,sh(c,.8),2);}
  else if(s==='beret'){t.beginPath();t.ellipse(46,30,25,10,-.12,0,6.28);fi(t,c);t.beginPath();t.moveTo(44,20);t.lineTo(42,13);ink(t,3);}
  else if(s==='straw'){t.beginPath();t.ellipse(50,36,34,7,-.05,0,6.28);fi(t,'#e0c07a');t.beginPath();t.moveTo(32,36);t.quadraticCurveTo(32,14,50,14);t.quadraticCurveTo(68,14,68,36);t.closePath();fi(t,'#e0c07a');
    rr(t,32,28,36,7,2);fi(t,c,2);t.strokeStyle='rgba(42,33,48,.25)';t.lineWidth=1;for(let x=38;x<66;x+=6){t.beginPath();t.moveTo(x,17);t.lineTo(x-2,27);t.stroke();}}
  else if(s==='beanie'){t.beginPath();t.moveTo(27,46);t.quadraticCurveTo(26,18,50,18);t.quadraticCurveTo(74,18,73,44);t.closePath();fi(t,c);rr(t,26,38,48,9,4);fi(t,sh(c,.8));circ(t,50,15,6);fi(t,'#fbf8f0');}}
export const HL={
  body(t,p,o,k){if(isArm(p)){circ(t,0,22,5.5);fi(t,k<1?sh(o.skin,.85):o.skin);}else if(p==='head'){circ(t,50,50,22);fi(t,o.skin);}},
  shirt(t,p,o,k){if(isArm(p)){rr(t,-5.5,-3,11,22,5.5);fi(t,k<1?sh(o.tunic,k):o.tunic);}else if(p==='torso'){rr(t,33,72,31,42,11);fi(t,o.tunic);t.fillStyle='rgba(255,255,255,.18)';t.fillRect(37,76,6,30);}},
  pants(t,p,o,k){if(isLeg(p)){rr(t,-6.5,-4,13,28,6);fi(t,k<1?sh(o.pants,k):o.pants);}else if(p==='torso'){t.fillStyle=o.belt||'#5a3a22';t.fillRect(34,102,29,5);}},
  boots(t,p,o,k){if(isLeg(p)&&o.boots){rr(t,-7,17,17,11,5);fi(t,k<1?sh(o.boots,k):o.boots);}},
  armor(t,p,o,k){const s=c=>k<1?sh(c,k):c;
    if(isLeg(p)&&o.greaves){rr(t,-6.5,-4,13,26,6);fi(t,s(o.greaves));circ(t,0,9,4.5);fi(t,s(sh(o.greaves,1.2)),2);}
    else if(isArm(p)&&o.mail){rr(t,-5.5,-3,11,20,5.5);fi(t,s(o.mail));circ(t,0,1,7.5);fi(t,s(sh(o.mail,1.15)),2);}
    else if(p==='torso'&&o.mail){rr(t,33,72,31,42,11);fi(t,o.mail);t.fillStyle='rgba(42,33,48,.35)';for(let y=80;y<108;y+=7)for(let x=39;x<60;x+=7){circ(t,x,y,1.4);t.fill();}}
    else if(p==='head'&&o.helm){t.beginPath();t.moveTo(26,54);t.quadraticCurveTo(24,24,50,24);t.quadraticCurveTo(76,24,74,50);t.lineTo(66,48);t.lineTo(66,40);t.lineTo(34,40);t.lineTo(34,56);t.closePath();fi(t,o.helm);t.fillStyle='rgba(255,255,255,.35)';t.fillRect(38,29,14,4);}},
  hair(t,p,o){if(!o.hair||o.helm)return;if(p==='head')hairCap(t,o);else if(p==='back')hairBack(t,o);},
  hat(t,p,o){if(o.hatS&&o.hatS!=='none'&&!o.helm)hat(t,o);},
  cape(t,p,o){const w=o.wave||0;
    if(p==='back'&&o.cape){t.beginPath();t.moveTo(34,70);t.quadraticCurveTo(22,96,14+w,124);t.lineTo(30+w*.6,128);t.quadraticCurveTo(38,104,52,74);t.closePath();fi(t,sh(o.cape,.8));}
    else if(p==='neck'&&o.scarf){rr(t,32,67,35,9,4);fi(t,o.scarf);if(o.cape)return;t.beginPath();t.moveTo(36,70);t.quadraticCurveTo(24,72+w,16,82+w);t.lineTo(22,84+w);t.quadraticCurveTo(28,78,38,76);t.closePath();fi(t,o.scarf,2);}},
  acc(t,p,o){const f=p==='back'?o.back:p==='head'?o.extra:o.front;if(f)f(t);},
  face(t,p,o){const ey=o.eyeY||50,X=o.face;
    for(const ex of[58,48]){if(X==='happy'){t.beginPath();t.arc(ex,ey+2,3.8,3.5,5.9);ink(t,2.6,o.eyeCol||INK);continue;}
      // hurt: eyes squeezed shut; ko: crossed out (the death pose)
      if(X==='hurt'){const d=ex>50?-1:1;t.beginPath();t.moveTo(ex-3.5*d,ey-3.5);t.lineTo(ex+3*d,ey);t.lineTo(ex-3.5*d,ey+3.5);ink(t,2.4,o.eyeCol||INK);continue;}
      if(X==='ko'){t.beginPath();t.moveTo(ex-3,ey-3);t.lineTo(ex+3,ey+3);t.moveTo(ex+3,ey-3);t.lineTo(ex-3,ey+3);ink(t,2.4,o.eyeCol||INK);continue;}
      const r=X==='surprised'?1.3:1;t.beginPath();t.ellipse(ex,ey,3*r,o.blink?1:5*r,0,0,6.28);t.fillStyle=o.eyeCol||INK;t.fill();if(!o.blink){circ(t,ex+1,ey-2,1.3*r);t.fillStyle='#fff';t.fill();}}
    // brows only on the portraits' expressions (the head variants surprised, sad and angry)
    if(o.brow){const b=X==='sad'?[-7,-10]:X==='angry'?[-10,-6]:[-12,-12];for(const[x0,x1]of[[44,51],[62,55]]){t.beginPath();t.moveTo(x0,ey+b[0]);t.lineTo(x1,ey+b[1]);ink(t,2.4);}}
    if(!o.noBlush){circ(t,63,58,X==='happy'?5:4);t.fillStyle='rgba(230,110,110,.45)';t.fill();}
    t.beginPath();if(X==='happy'){t.moveTo(53.5,58);t.quadraticCurveTo(58,67,62.5,58);t.closePath();fi(t,'#9a3b3b',1.8);}else if(X==='surprised'||X==='hurt'){t.ellipse(58,61,2.6,3.6,0,0,6.28);fi(t,'#6a2a2a',1.6);}
    else if(X==='sad'||X==='ko'){t.arc(58,64,3.5,3.5,5.9);ink(t,2);}else if(X==='angry'){t.moveTo(54,61.5);t.lineTo(58,60);t.lineTo(62,61.5);ink(t,2);}else{t.arc(58,59,3.5,.2,2.6);ink(t,2);}}};
// Player poses: the numbers the human rig's clips are built from (rig.js turns each into a clip, and the idle, walk, climb,
// cheer and reel loops blend between them). 0-1 idle, 2-5 walk, 6 jump, 7 fall, 8 hold (a tool or item at rest)
export const POSES=[{legA:.03,legB:-.03,armA:.12,armB:-.12},{legA:.03,legB:-.03,armA:.18,armB:-.08,bob:1.5,wave:2}];
for(let k=0;k<4;k++){const ph=k/4*Math.PI*2,s=Math.sin(ph);POSES.push({legA:s*.6,legB:-s*.6,armA:-s*.65,armB:s*.65,bob:-Math.abs(Math.cos(ph))*2.5+1,wave:s*3});}
POSES.push({legA:-.7,legB:.4,armA:-2.5,armB:-.5,wave:-4},{legA:.3,legB:-.3,armA:-2.9,armB:-2.5,wave:5},{legA:.25,legB:-.25,armA:-1.6,armB:.25});
// swing bodies (poses 9-12) leave the front arm to gameplay, which pins the rig's arm to the weapon every frame (rigSet).
// 9 hold, 10 coiled back (weight on the back foot), 11 mid-strike, 12 lunged forward into the follow-through
export const SWPOSE=[{legA:.25,legB:-.25,armB:.25},{legA:-.35,legB:.5,armB:.9,lean:-.13,bob:1,wave:-3},{legA:.45,legB:-.3,armB:-.6,lean:.07,wave:3},{legA:.7,legB:-.55,armB:-1.1,lean:.17,bob:3.5,wave:5}];
for(const o of SWPOSE)o.noArm=1;POSES.push(...SWPOSE);
// the rest of the animation set, by name (PF.land etc.). Arm angles: 0 hangs down, negative swings forward, positive back.
// noArm poses are aimed or tool poses whose front arm gameplay holds; face swaps the head to that expression.
const MOREPOSE={land:{legA:.55,legB:-.5,armA:-.55,armB:.55,bob:4},dash:{legA:-.9,legB:.75,armA:.95,armB:1.25,lean:.2,wave:7},
  hurt:{legA:.35,legB:-.45,armA:.9,armB:1.2,lean:-.2,bob:1,wave:-5,face:'hurt'},death:{legA:.65,legB:-.15,armA:.35,armB:.6,lean:-.17,bob:4,face:'ko'},
  flat:{legA:-.75,legB:.75,armA:-1.9,armB:1.9,blink:1},mine0:{legA:.35,legB:-.35,armB:.6,lean:-.1,bob:1,noArm:1},mine1:{legA:.5,legB:-.4,armB:-.55,lean:.2,bob:3.5,noArm:1},
  bow:{legA:.45,legB:-.45,armB:-1.35,lean:-.06,noArm:1},bowrel:{legA:.45,legB:-.45,armB:.75,lean:.04,wave:3,noArm:1},cast:{legA:.4,legB:-.3,armB:-2.4,lean:-.1,wave:4,bob:-1,noArm:1},
  block:{legA:.5,legB:-.5,armA:-1.5,armB:-.3,lean:-.08,bob:2},parry:{legA:.6,legB:-.45,armA:-2.2,armB:.6,lean:.12,wave:4,face:'happy'},
  fcast:{legA:.4,legB:-.4,armB:.45,lean:.15,noArm:1},reel0:{legA:.3,legB:-.3,armB:-1.1,lean:-.12,noArm:1},reel1:{legA:.3,legB:-.3,armB:-.8,lean:-.16,bob:1,noArm:1},
  climb0:{legA:-.6,legB:.1,armA:-2.9,armB:-2.2},climb1:{legA:.1,legB:-.6,armA:-2.2,armB:-2.9},
  cheer0:{legA:.2,legB:-.2,armA:-2.8,armB:2.8,bob:-3,wave:4,face:'happy'},cheer1:{legA:-.1,legB:.1,armA:-2.5,armB:2.5,wave:-3,face:'happy'},
  // issue #137: run is the stride extreme the run loop swings through (rig.js); skid plants the front foot and leans back when
  // reversing at speed; landh is a hard landing with the front hand down; hurtb a hit from behind (thrown forward)
  run:{legA:.95,legB:-.95,armA:-1.15,armB:1.15,lean:.16,bob:4,wave:7},skid:{legA:-.75,legB:.35,armA:-1.2,armB:-.8,lean:-.2,bob:3,wave:-3},
  landh:{legA:-1.3,legB:1.1,armA:-.6,armB:1.1,lean:.6,bob:20,hr:-.2},hurtb:{legA:-.4,legB:.45,armA:1.1,armB:1.3,lean:.2,bob:1,wave:4,face:'hurt'}};
export const PF={idle:0,walk:2,jump:6,fall:7,hold:8,swing:9};for(const k in MOREPOSE){PF[k]=POSES.length;POSES.push(MOREPOSE[k]);}
// the front shoulder in pose f in world units from the bottom of the player mesh (the swing trail's curve; the live arm reads the rig)
export function shoulderAt(f){const o=POSES[f]||{},l=o.lean||0,[sx,sy]=player.rig?.d.sho||[7,56],x=sx*Math.cos(l)+sy*Math.sin(l),y=sx*Math.sin(l)-sy*Math.cos(l)+138+(o.bob||0);return[x/60,(144-y)/60];}
// Player customization (New World dialog, saved as p.look): each field is an index into its list, so a save can't carry a bad value.
// hat and cape take the accent color; the straw hat keeps its own straw.
export const LOOK={hairS:['short','long','spiky','bun','pony','curly'],hair:['#5a3526','#2a2130','#a86b3a','#e0b04f','#c9503a','#e8e2d6','#5a6fb0','#d97aa0'],
  skin:['#f1cfa6','#f6dcc0','#e0a878','#c98a60','#9a6440','#6b4430'],tunic:['#2f7f86','#d4483b','#4f7fa6','#3f7a5f','#7a5aa8','#e0a04f','#3b3552','#e8e2d6'],
  hatS:['none','cap','beret','straw','beanie'],capeS:['scarf','cape','none'],acc:['#d4483b','#f1c04f','#3f7a5f','#4f7fa6','#7a5aa8','#2a2130']};
export function cleanLook(l){const o={};for(const k in LOOK){const v=l&&l[k];o[k]=Number.isInteger(v)&&v>=0&&v<LOOK[k].length?v:0;}return o;}
export function lookColors(l){l=cleanLook(l);const a=LOOK.acc[l.acc],c=LOOK.capeS[l.capeS];
  return{skin:LOOK.skin[l.skin],hair:LOOK.hair[l.hair],hairS:LOOK.hairS[l.hairS],tunic:LOOK.tunic[l.tunic],hatS:LOOK.hatS[l.hatS],hat:a,scarf:c==='none'?null:a,cape:c==='cape'?a:null};}
// playerLook(): what the player wears now (the look picked at world creation plus worn armor), the skin of the player's rig
export function playerLook(look=player.look,a=player.armor||[]){const eq={};if(a[0])eq.helm=ITEMS[a[0].id].color;if(a[1])eq.mail=ITEMS[a[1].id].color;if(a[2])eq.greaves=ITEMS[a[2].id].color;
  // the painted hero wears each piece's own painting, named by its metal or set (helmfe -> fe, helm_warden -> warden)
  const ak=i=>a[i]&&a[i].id.replace(/^(helm|mail|legs)_?/,'');eq.helmK=ak(0);eq.mailK=ak(1);eq.greavesK=ak(2);
  return Object.assign({pants:'#3b3552',boots:'#6b4430',back:PACK},lookColors(look),eq);}
// the player's satchel on its strap (painted as L.acc.back.pack, tinted with its leather colour)
const PACK=Object.assign(tt=>{tt.beginPath();tt.moveTo(38,74);tt.lineTo(58,104);ink(tt,3.5,'#6b4430');rr(tt,24,92,16,16,4);fi(tt,'#b9874f',2);},{art:'pack'});
// Still pictures of humans come from the human rig (rigPic), so a portrait is the same paper cut-out as the one in the world.
// lookPic(look): the player standing in a given look, for the New World dialog's preview (a new world starts with no armor)
export function lookPic(look){return rigPic(playerRigKind(),playerLook(look,[]),'idle',0);}
// folkPose(k): a townsperson standing as in town, holding their tool
const folkPose=k=>{const o=FOLK[k];return{armA:{r:o.arm},armB:{r:o.armB??.1}};};
// facePic(k, expr): an NPC type (or 'player', in the skin the player's rig wears now) standing, with the head swapped to
// the expression (happy, surprised, sad, angry; null for the plain face), for dialogue portraits
export function facePic(k,expr){const pl=k==='player';if(!pl&&!FOLK[k])return null;
  return rigPic(pl?player.rig?.k||'human':'human',pl?player.rig?.S||playerLook():FOLK[k],'idle',0,pl?null:k,Object.assign(pl?{}:folkPose(k),{head:{sw:expr||''},root:{sw:expr||''}}));}
// Townsfolk looks (the human layers' o): their rigs wear these (rig.js), and SHEETS[k] is the still picture for portraits.
// arm: the front arm angle they stand with (holding their tool), armB the back arm's.
export const FOLK={
  guide:{skin:'#e8b88f',hair:'#7a4b2a',tunic:'#4f7fa6',pants:'#3b3552',boots:'#5a3a22',scarf:'#f1c04f',
    front:tt=>{tt.save();tt.translate(66,88);tt.rotate(-.3);rr(tt,-9,-12,18,22,2);fi(tt,'#f4f0e6',2);tt.strokeStyle='#d4483b';tt.lineWidth=1.5;tt.beginPath();tt.moveTo(-5,-4);tt.lineTo(0,2);tt.lineTo(5,-6);tt.stroke();tt.restore();},arm:-.9},
  painter:{skin:'#c98a60',hair:'#2a2130',tunic:'#f4f0e6',pants:'#3f6fa8',boots:'#3a2c22',
    extra:tt=>{tt.beginPath();tt.ellipse(52,28,22,8,-.15,0,6.28);fi(tt,'#d4483b');circ(tt,52,20,3);fi(tt,'#d4483b',2);for(const[x,y,c]of[[42,84,'#d4483b'],[52,96,'#3f6fa8'],[46,104,'#f1c04f']]){circ(tt,x,y,3);tt.fillStyle=c;tt.fill();}},
    front:tt=>{tt.beginPath();tt.ellipse(72,78,12,9,-.4,0,6.28);fi(tt,'#c98f4f',2);for(const[x,y,c]of[[68,74,'#d4483b'],[75,74,'#3f6fa8'],[76,81,'#f1c04f']]){circ(tt,x,y,2.4);tt.fillStyle=c;tt.fill();}},arm:-1.2},
  nurse:{skin:'#f3d2b0',hair:'#a8483f',tunic:'#f4f0e6',pants:'#e8e2d6',boots:'#e8636a',
    extra:tt=>{circ(tt,30,36,9);fi(tt,'#a8483f',2);rr(tt,38,22,26,8,3);fi(tt,'#fbf8f0',2);tt.beginPath();tt.moveTo(51,31);tt.bezierCurveTo(46,26,44,22,48,21);tt.bezierCurveTo(50,21,51,23,51,24);tt.bezierCurveTo(51,23,52,21,54,21);tt.bezierCurveTo(58,22,56,26,51,31);tt.fillStyle='#e0506b';tt.fill();tt.beginPath();tt.moveTo(49,94);tt.bezierCurveTo(42,88,42,82,46,82);tt.bezierCurveTo(48,82,49,84,49,85);tt.bezierCurveTo(49,84,50,82,52,82);tt.bezierCurveTo(56,82,56,88,49,94);tt.fillStyle='#e0506b';tt.fill();},arm:.1},
  tinkerer:{skin:'#e0a878',hair:'#e0823d',tunic:'#c96a2a',pants:'#6b4a2f',boots:'#3a2c22',belt:'#3a2c22',
    extra:tt=>{rr(tt,30,36,42,8,3);fi(tt,'#5a3a22',2);for(const x of[46,62]){circ(tt,x,40,7);fi(tt,'#a9adb8',2.5);circ(tt,x,40,4);tt.fillStyle='#bfe6f0';tt.fill();}},
    front:tt=>{tt.save();tt.translate(66,92);tt.rotate(-.6);rr(tt,-2,-14,4,20,2);fi(tt,'#8a5a33',1.5);rr(tt,-6,-18,12,6,2);fi(tt,'#a9adb8',1.5);tt.restore();},arm:-.6,armB:.2},
  angler:{skin:'#e8b88f',hair:'#6b4430',tunic:'#3f7a5f',pants:'#4a4058',boots:'#3a3040',belt:'#2a2130',
    extra:tt=>{tt.beginPath();tt.ellipse(50,34,28,7,-.08,0,6.28);fi(tt,'#c9a574');tt.beginPath();tt.moveTo(30,34);tt.quadraticCurveTo(32,12,50,12);tt.quadraticCurveTo(68,12,70,32);tt.closePath();fi(tt,'#c9a574');tt.fillStyle='#d4483b';tt.fillRect(31,26,38,4);poly(tt,[62,24,70,14,68,26]);fi(tt,'#fbf8f0',1.5);},
    front:tt=>{tt.beginPath();tt.moveTo(60,104);tt.lineTo(90,24);ink(tt,4,INK);tt.beginPath();tt.moveTo(60,104);tt.lineTo(90,24);ink(tt,2,'#c98f4f');tt.beginPath();tt.moveTo(90,24);tt.quadraticCurveTo(94,60,86,80);ink(tt,1,'rgba(42,33,48,.6)');circ(tt,86,83,3);fi(tt,'#d4483b',1.5);},arm:-.9},
  merchant:{skin:'#f0c9a0',hair:'#e8e2d6',tunic:'#7a4b2a',pants:'#4a3a2e',boots:'#3a2c22',
    extra:tt=>{tt.beginPath();tt.moveTo(40,60);tt.quadraticCurveTo(52,86,68,62);tt.quadraticCurveTo(60,68,52,64);tt.closePath();fi(tt,'#f4f0e6',2);tt.beginPath();tt.moveTo(24,36);tt.lineTo(78,36);tt.lineTo(70,30);tt.quadraticCurveTo(52,8,32,30);tt.closePath();fi(tt,'#3f7a3b');tt.fillStyle='#f1c04f';tt.fillRect(33,30,36,4);},arm:.1},
  farmer:{skin:'#d9a070',hair:'#a86b3a',tunic:'#e8dcc0',pants:'#5a7fa8',boots:'#5a3a22',belt:'#5a7fa8',
    extra:tt=>{for(const x of[42,58]){rr(tt,x-3,72,6,24,2);fi(tt,'#5a7fa8',1.5);}tt.beginPath();tt.ellipse(50,31,32,7,0,0,6.28);fi(tt,'#e9c46a');tt.beginPath();tt.moveTo(32,31);tt.quadraticCurveTo(34,10,50,10);tt.quadraticCurveTo(66,10,68,30);tt.closePath();fi(tt,'#e9c46a');tt.fillStyle='#d4483b';tt.fillRect(33,24,34,4);},
    front:tt=>{tt.save();tt.translate(70,86);tt.rotate(.25);for(let k=-2;k<=2;k++){tt.beginPath();tt.moveTo(0,16);tt.lineTo(k*3,-10);ink(tt,1.6,'#b98f4a');tt.beginPath();tt.ellipse(k*3,-13,2.4,6,k*.1,0,6.28);fi(tt,'#e9c46a',1.2);}rr(tt,-6,2,12,4,2);fi(tt,'#d4483b',1.2);tt.restore();},arm:-.8},
  scout:{skin:'#b97a50',hair:'#2a2130',tunic:'#8a6a3a',pants:'#4a5a3a',boots:'#3a2c22',scarf:'#3f7a5f',belt:'#3a2c22',
    extra:tt=>{tt.beginPath();tt.moveTo(26,36);tt.quadraticCurveTo(28,14,50,14);tt.quadraticCurveTo(72,14,74,34);tt.lineTo(86,38);tt.lineTo(72,40);tt.closePath();fi(tt,'#c9a574');tt.fillStyle='#6b4430';tt.fillRect(28,30,45,4);},
    front:tt=>{tt.save();tt.translate(68,88);tt.rotate(-.5);rr(tt,-5,-14,10,28,4);fi(tt,'#f4f0e6',2);tt.beginPath();tt.moveTo(-5,-4);tt.lineTo(5,-4);tt.moveTo(-5,4);tt.lineTo(5,4);ink(tt,1.4,'#d4483b');tt.restore();},arm:-.7},
  curator:{skin:'#f0c9a0',hair:'#c9c2b6',tunic:'#5a3a6a',pants:'#3a3040',boots:'#2a2130',belt:'#3a3040',
    extra:tt=>{poly(tt,[42,70,50,74,42,78]);fi(tt,'#d4483b',1.5);poly(tt,[58,70,50,74,58,78]);fi(tt,'#d4483b',1.5);circ(tt,58,50,7);ink(tt,2,'#c9a24a');tt.beginPath();tt.moveTo(64,53);tt.quadraticCurveTo(68,64,62,74);ink(tt,1,'#c9a24a');},
    front:tt=>{tt.save();tt.translate(70,84);tt.rotate(-.4);rr(tt,-2,2,4,16,2);fi(tt,'#6b4430',1.5);circ(tt,0,-6,8);fi(tt,'rgba(191,230,240,.7)',2.5);tt.restore();},arm:-.5},
  traveler:{skin:'#e0b48a',hair:'#5a3a22',tunic:'#b0503a',pants:'#4a3a2e',boots:'#3a2c22',belt:'#f1c04f',
    back:tt=>{rr(tt,12,58,26,44,8);fi(tt,'#8a5a33');rr(tt,14,50,22,12,5);fi(tt,'#a86b3a',2);tt.beginPath();tt.moveTo(16,78);tt.lineTo(36,78);ink(tt,2,'#5a3a22');circ(tt,20,106,6);fi(tt,'#d4483b',2);rr(tt,6,40,6,26,2);fi(tt,'#e9dcc0',1.5);},
    extra:tt=>{tt.beginPath();tt.moveTo(24,52);tt.quadraticCurveTo(22,18,50,18);tt.quadraticCurveTo(78,18,76,44);tt.lineTo(70,36);tt.quadraticCurveTo(50,28,32,38);tt.closePath();fi(tt,'#7a3a2a');},arm:-.6}};
export const SHEETS={};
export function buildSheets(){
  for(const k in FOLK)SHEETS[k]=facePic(k);
  // the player's status overlays (gameplay.js statusOverlay): 0 paper flames, 1 ink blots and drips, 2 water drops
  SHEETS.pstatus=makeSheet(3,96,144,(t,f)=>{
    if(f===0){for(const[x,y,h,c]of[[26,126,26,'#ff8a3d'],[70,128,30,'#ff8a3d'],[34,98,20,'#ffd66b'],[66,84,22,'#ffd66b'],[22,72,18,'#ff8a3d'],[76,58,16,'#ffd66b']]){t.beginPath();t.moveTo(x-7,y);t.quadraticCurveTo(x-8,y-h*.6,x,y-h);t.quadraticCurveTo(x+8,y-h*.6,x+7,y);t.closePath();fi(t,c,2);t.beginPath();t.moveTo(x-3,y);t.quadraticCurveTo(x,y-h*.7,x+3,y);t.closePath();t.fillStyle='#fff3c0';t.fill();}}
    else if(f===1){for(const[x,y,r]of[[44,86,6],[58,98,4.5],[40,56,4],[62,40,3.5],[50,112,4]]){circ(t,x,y,r);fi(t,'#3a2a5a',1.8);circ(t,x+r*.8,y+r*.6,r*.4);t.fillStyle='#3a2a5a';t.fill();}
      for(const[x,y,l]of[[36,62,14],[60,104,12],[48,90,10]]){rr(t,x-2,y,4,l,2);fi(t,'#3a2a5a',1.5);circ(t,x,y+l,3);t.fillStyle='#3a2a5a';t.fill();}}
    else for(const[x,y,r]of[[30,40,4],[70,52,3.5],[26,80,4.5],[74,96,4],[40,20,3.5],[62,24,3]]){t.beginPath();t.moveTo(x,y-r*2);t.quadraticCurveTo(x+r,y-r*.3,x+r,y+r*.3);t.arc(x,y+r*.3,r,0,Math.PI);t.quadraticCurveTo(x-r,y-r*.3,x,y-r*2);fi(t,'#a8e4ff',1.8);circ(t,x-r*.35,y,r*.3);t.fillStyle='#fff';t.fill();}});
  for(const k of Object.keys(SHEETS))SHEETS[k+'T']=canvasTex(SHEETS[k]);}
export const INKTINT=new THREE.Vector3(.85,.6,1.15);
export const markGeo=new THREE.PlaneGeometry(.6,.6),markMat=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.5,depthTest:false});
const barBgGeo=new THREE.PlaneGeometry(1,.17),barFgGeo=new THREE.PlaneGeometry(1,.09);barFgGeo.translate(.5,0,0);
const barBgMat=new THREE.MeshBasicMaterial({color:0x2a2130,depthTest:false}),barFgMat=new THREE.MeshBasicMaterial({color:0xe0506b,depthTest:false}),barFgEliteMat=new THREE.MeshBasicMaterial({color:0xf1c04f,depthTest:false});
export const eliteMat=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.5,depthTest:false}),threadGeo=new THREE.PlaneGeometry(.05,1);threadGeo.translate(0,.5,0);
// elite trait marks: a round paper badge with a glyph of its own shape per trait, so traits read without color (#84)
const TGLYPH={
  burning:t=>{t.beginPath();t.moveTo(32,12);t.quadraticCurveTo(48,28,44,40);t.quadraticCurveTo(42,52,32,52);t.quadraticCurveTo(20,52,20,40);t.quadraticCurveTo(22,30,28,26);t.quadraticCurveTo(28,34,32,34);t.quadraticCurveTo(30,22,32,12);fi(t,'#ff8a3d',3);},
  frosted:t=>{for(let k=0;k<3;k++){const a=k*Math.PI/3;t.beginPath();t.moveTo(32-Math.cos(a)*18,32-Math.sin(a)*18);t.lineTo(32+Math.cos(a)*18,32+Math.sin(a)*18);ink(t,7);ink(t,3.5,'#bfe3f7');}circ(t,32,32,4);fi(t,'#eef6ff',2);},
  giant:t=>{poly(t,[32,12,50,32,40,32,40,52,24,52,24,32,14,32]);fi(t,'#c9a574',3);},
  swift:t=>{for(const x of[14,30]){poly(t,[x,16,x+12,16,x+22,32,x+12,48,x,48,x+10,32]);fi(t,'#f4f0e6',3);}},
  armored:t=>{t.beginPath();t.moveTo(32,12);t.lineTo(50,18);t.quadraticCurveTo(50,44,32,54);t.quadraticCurveTo(14,44,14,18);t.closePath();fi(t,'#a9b0bf',3);t.beginPath();t.moveTo(32,16);t.lineTo(32,50);ink(t,2.5);},
  vampiric:t=>{for(const x of[22,42]){poly(t,[x-8,16,x+8,16,x,48]);fi(t,'#fbf8f0',3);}t.beginPath();t.moveTo(12,16);t.lineTo(52,16);ink(t,4,'#d4483b');},
  explosive:t=>{circ(t,30,36,14);fi(t,'#3b3346',3);t.beginPath();t.moveTo(38,24);t.quadraticCurveTo(44,14,50,16);ink(t,3);circ(t,51,14,4);fi(t,'#ffd66b',2);},
  inky:t=>{t.beginPath();t.moveTo(32,10);t.quadraticCurveTo(48,34,46,40);t.arc(32,40,14,0,Math.PI);t.quadraticCurveTo(16,34,32,10);fi(t,'#6a4a9a',3);circ(t,27,40,3);t.fillStyle='#c8b0f0';t.fill();},
  golden:t=>{circ(t,32,32,19);fi(t,'#f1c04f',3);circ(t,32,32,12);ink(t,2.5,'#b0801a');t.beginPath();t.moveTo(32,24);t.lineTo(32,40);ink(t,3,'#b0801a');},
};
const tmats={},tmarkGeo=new THREE.PlaneGeometry(.46,.46);
function traitMat(k){if(!tmats[k]){tmats[k]=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.5,depthTest:false,map:canvasTex(makeSheet(1,64,64,t=>{circ(t,32,32,28);fi(t,'#fbf5e6',3);(TGLYPH[k]||TGLYPH.giant)(t);},3))});}return tmats[k];}
export function updateEnemyFx(e,dt){const top=e.y+e.h+(e.d.fly?.15:.3);e.hpShow=(e.hpShow||0)-dt;
  if(e.trait){if(!e.tmark){e.tmark=new THREE.Mesh(tmarkGeo,traitMat(e.trait));e.tmark.renderOrder=8;scene.add(e.tmark);}const k=SET.cb&&SET.cb!=='off'?1.3:1;e.tmark.scale.set(k,k,1);e.tmark.visible=!e.burrow;e.tmark.position.set(e.x+.5*k,top+.2+Math.sin(e.t*3+1)*.06,.69);}
  if(e.elite){if(!e.star){e.star=new THREE.Mesh(markGeo,eliteMat);e.star.renderOrder=8;scene.add(e.star);}e.star.visible=!e.burrow;e.star.position.set(e.x,top+.25+Math.sin(e.t*3)*.08,.69);e.star.rotation.z=Math.sin(e.t*2)*.2;}
  if(e.warn){if(!e.mark){e.mark=new THREE.Mesh(markGeo,markMat);e.mark.renderOrder=8;scene.add(e.mark);}e.mark.visible=true;const k=(SET.cb&&SET.cb!=='off'?1.3:1)*(SET.tele?1.35:1)*(1+.18*Math.sin(e.t*20));e.mark.scale.set(k,k,1);e.mark.position.set(e.x,top+(e.elite?1.05:.6),.7);}else if(e.mark)e.mark.visible=false;
  const show=!e.d.boss&&e.hpShow>0&&e.hp<e.max;if(show&&!e.bar){const bg=new THREE.Mesh(barBgGeo,barBgMat),fg=new THREE.Mesh(barFgGeo,e.elite?barFgEliteMat:barFgMat);bg.renderOrder=6;fg.renderOrder=7;scene.add(bg,fg);e.bar=[bg,fg];}
  if(e.bar){e.bar[0].visible=e.bar[1].visible=show;if(show){const bw=Math.max(.9,e.w+.2);e.bar[0].scale.x=bw;e.bar[0].position.set(e.x,top+.12,.66);e.bar[1].scale.x=Math.max(.001,(bw-.08)*e.hp/e.max);e.bar[1].position.set(e.x-bw/2+.04,top+.12,.67);}}}
export function spriteMesh(tex,frames,w,h,anchorBottom=true){const g=new THREE.PlaneGeometry(w,h);if(anchorBottom)g.translate(0,h/2,0);const m=new THREE.Mesh(g,spriteMat(tex,frames));scene.add(m);return m;}
const iconCache={},iconTexCache={};
function iconCanvas(id){const c=mk(64,64);const[x,y]=cellXY(ITEMS[id].cell);c.getContext('2d').drawImage(atlas,x,y,64,64,0,0,64,64);return c;}
export function icon(id){return iconCache[id]||(iconCache[id]=iconCanvas(id).toDataURL());}
// an icon straight from an atlas cell (tabs whose picture is not an item)
export function cellIcon(c){const k='#'+c;if(iconCache[k])return iconCache[k];const cv=mk(64,64),[x,y]=cellXY(c);cv.getContext('2d').drawImage(atlas,x,y,64,64,0,0,64,64);return iconCache[k]=cv.toDataURL();}
export function iconTex(id){return iconTexCache[id]||(iconTexCache[id]=canvasTex(iconCanvas(id)));}
// drops cached icons after their atlas cells are redrawn (color-vision mode changes the ore art); no ids drops them all
export function clearIcons(ids=[...new Set([...Object.keys(iconCache),...Object.keys(iconTexCache)])]){for(const id of ids){delete iconCache[id];if(iconTexCache[id]){iconTexCache[id].dispose();delete iconTexCache[id];}}}
// the "!" over an enemy winding up an attack; colorblind modes swap it for a bright warning triangle
export function drawWarnMark(){const cb=SET.cb&&SET.cb!=='off';if(markMat.map)markMat.map.dispose();
  markMat.map=canvasTex(makeSheet(1,64,64,t=>{if(cb){poly(t,[32,3,61,57,3,57]);fi(t,SET.cb==='trit'?'#ff5a8a':'#ffd23f',4.5);rr(t,28.5,19,7,23,3.5);t.fillStyle=INK;t.fill();circ(t,32,49,4);t.fill();}
    else{rr(t,23,5,18,36,9);fi(t,'#d4483b',3);circ(t,32,52,7);fi(t,'#d4483b',3);}},3));markMat.needsUpdate=true;}

// ================= particles =================
// One shared particle system. Emitters are data (PFX): colors, count, speed, gravity, life, size, and how each
// particle moves and looks (drag, sway for things that flutter, spin, glow). emit(kind, x, y, o) spawns from an
// emitter, with o overriding any field; burst(x, y, cols, n, spd, o) is the same with the emitter written inline.
// Glowing particles draw as soft round sparks and, with post-processing on, bright enough to bloom; the rest are
// flat paper bits lit where they spawn. Reduced motion stops the sway and spin.
export const PFX={
  dust:{cols:['#e9dfc9','#c9a574'],n:6,spd:2.5,up:1},
  hit:{cols:['#fffaf0','#ffe58a'],n:5,spd:7,grav:0,life:.25,up:0,glow:1},
  sparks:{cols:['#fff3c0','#f1c04f','#fbf8f0'],n:7,spd:3,grav:0,life:.3,glow:1},
  embers:{cols:['#ff8a3d','#ffd66b'],n:1,spd:.4,grav:-1.5,life:4,up:0,glow:1,s:.6,sway:.6},
  ink:{cols:['#3a2a5a','#8a78b0'],n:8,spd:3,grav:6,life:.7},
  snow:{cols:['#fbf8f0','#e6f1f7'],n:1,spd:.4,grav:1.2,life:5,up:-.5,bright:1,s:.8,drag:.8,sway:1.4},
  leaves:{cols:['#6dbb4a','#c9a574','#fbf8f0'],n:1,spd:.5,grav:.5,life:5,up:0,s:1.1,drag:.7,sway:2.2,spin:1.6},
  petals:{n:1,spd:.4,grav:.5,life:6,up:-.2,bright:1,s:.9,drag:.8,sway:1.8,spin:1.2},
  fireflies:{n:1,spd:.3,grav:-.05,life:3,up:.1,bright:1,s:.5,glow:1,sway:1},
  // surface dust per footstep material (issue #138, feel.js DUSTK): snow flecks, sand grains, fall leaf bits, ink splashes, sparks
  dustSnow:{cols:['#fbf8f0','#e6f1f7','#d5e6ef'],n:4,spd:1.8,grav:5,life:.7,up:1.6,s:.7,drag:.6},
  dustSand:{cols:['#e8cf8a','#d9b86a','#f3e2b0'],n:5,spd:2.2,grav:14,life:.45,up:1.8,s:.5},
  dustLeaf:{cols:['#d9822b','#c9a574','#e0b04a','#b5532c'],n:2,spd:1.4,grav:2,life:1.2,up:1.5,s:.9,drag:.8,sway:1.5,spin:1.4},
  splashInk:{cols:['#3a2a5a','#8a78b0','#6a5a90'],n:6,spd:3,grav:14,life:.5,up:3.5,s:.8},
  sparkLand:{cols:['#fff3c0','#ffd66b','#f1c04f'],n:8,spd:5,grav:10,life:.3,up:1.5,glow:1,s:.6},
};
const PMAX=700;
const pGeo=new THREE.PlaneGeometry(.17,.17);pGeo.setAttribute('aG',new THREE.InstancedBufferAttribute(new Float32Array(PMAX),1));
const pMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{uHdr:U.uHdr},
  vertexShader:`attribute float aG;varying vec3 vC;varying vec2 vUv;varying float vG;void main(){vC=instanceColor;vUv=uv;vG=aG;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uHdr;varying vec3 vC;varying vec2 vUv;varying float vG;void main(){if(vG<.5){gl_FragColor=vec4(vC,1.);return;}
    float d=length(vUv-.5)*2.;if(d>1.)discard;float a=smoothstep(1.,.2,d);gl_FragColor=vec4(vC*(1.+(1.-d)*(.35+uHdr*1.4)),a);}`});
export const pMesh=new THREE.InstancedMesh(pGeo,pMat,PMAX);pMesh.frustumCulled=false;pMesh.renderOrder=1;
export const dummy=new THREE.Object3D();const tmpC=new THREE.Color();export const parts=[];
for(let i=0;i<PMAX;i++){dummy.scale.set(0,0,0);dummy.updateMatrix();pMesh.setMatrixAt(i,dummy.matrix);pMesh.setColorAt(i,tmpC.set(1,1,1));}scene.add(pMesh);
export function emit(k,x,y,o={}){const e=k?Object.assign({},PFX[k],o):o,cols=e.cols||['#fbf8f0'],n=e.n??1,spd=e.spd??5,glow=!!e.glow;
  for(let q=0;q<n;q++){if(parts.length>=PMAX)parts.shift();const a=Math.random()*Math.PI*2,v=rand(.3,1)*spd;const L=e.bright||glow?[1,1,1]:lightAt(x,y);
    tmpC.set(pick(cols));const j=e.jit??.3;parts.push({x:x+rand(-j,j),y:y+rand(-j,j),z:rand(.2,.7),vx:Math.cos(a)*v,vy:Math.sin(a)*v+(e.up??2),life:rand(.5,1.1)*(e.life||1),rx:rand(0,6),ry:rand(0,6),vr:rand(-12,12)*(e.spin??1),
      r:tmpC.r*L[0],g:tmpC.g*L[1],b:tmpC.b*L[2],grav:e.grav??18,s:(e.s||1)*(glow?1.35:1),drag:e.drag??.3,sway:e.sway||0,ph:rand(0,6.283),glow});}}
export function burst(x,y,cols,n,spd=5,o={}){o=Object.assign({},o,{cols,n,spd});if(o.bright&&!o.glow&&o.life&&o.life<=.6)o.glow=1;emit(null,x,y,o);}
export function updateParts(dt){const rm=reduceMotion(),gA=pGeo.attributes.aG;
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}p.vy-=p.grav*dt;p.vx*=Math.pow(p.drag,dt);if(p.grav>0&&p.vy<-3)p.vy=-3+Math.sin(p.life*14)*.8;
    p.x+=p.vx*dt+(p.sway&&!rm?Math.sin(p.life*2.3+p.ph)*p.sway*dt:0);p.y+=p.vy*dt;if(!rm){p.rx+=p.vr*dt;p.ry+=p.vr*.7*dt;}}
  for(let i=0;i<PMAX;i++){const p=parts[i];if(p){const s=Math.min(1,p.life*3)*p.s;dummy.position.set(p.x,p.y,p.z);if(p.glow)dummy.rotation.set(0,0,0);else dummy.rotation.set(p.rx,p.ry,p.rx*.5);dummy.scale.set(s,s,s);dummy.updateMatrix();pMesh.setMatrixAt(i,dummy.matrix);pMesh.setColorAt(i,tmpC.setRGB(p.r,p.g,p.b));gA.array[i]=p.glow?1:0;}else{dummy.scale.set(0,0,0);dummy.updateMatrix();pMesh.setMatrixAt(i,dummy.matrix);}}
  pMesh.instanceMatrix.needsUpdate=true;if(pMesh.instanceColor)pMesh.instanceColor.needsUpdate=true;gA.needsUpdate=true;}
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
