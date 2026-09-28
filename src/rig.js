// Paper cutout rig: characters as paper pieces pinned at joints, posed by keyframed clips (issue #98).
import * as THREE from 'three';
import {
  canvasTex,circ,fi,grain,HL,ink,INK,LIMB,mk,poly,POSES,PF,reduceMotion,rr,scene,
} from './game.js';

// ================= rig =================
// A rig is data. defRig(kind, {w, h, ox, oy, s, parts, clips}):
//  w,h: the design frame in px (the size the old sheet frames had); ox,oy: the design point that sits at the mesh origin
//  (default bottom centre); s: world units per design px (1/60, as sheets used).
//  parts, back to front (the array order is the draw order): {n name, at [x,y] pivot in design px, up parent name,
//  paint(t, skin, variant) the drawing, loc 1 if paint draws around the pivot (limbs) rather than in design coordinates,
//  clip [x0,y0,x1,y1] keeps only that design rect of the drawing, v variant names (swaps, '' first), wob wobble amount}.
//  A part with no paint is a bare joint (the root).
// Clips: {len seconds, loop, bl blend-in seconds, tr: {part: {r, x, y, sx, sy, sw: keys}}}. Keys are [time, value, easing
//  to the next key] (EZR names); r is radians (canvas turn: positive is clockwise on screen), x/y design px, sx/sy scale,
//  sw a variant name that holds until the next key ('-' hides the part).
// A skin is what a rig wears: an object the paint functions read (for humans, the look o of drawHuman). rigSkin() bakes
// every part and variant of a skin once into one texture, so armor, clothes, hair and expressions are part swaps and
// re-bakes, never new frame sheets.
// At runtime every rig is one mesh with one material: makeRig() builds it, rigPlay() picks a clip (blending from the pose
// it was in), rigSet() pins a part for this frame (the swinging arm), rigUpdate() poses it. The material has the uniforms
// sprites have (uTint, uFlash, uOut, uCr...), so tinting, hit flashes, attack outlines and boss creases work on rigs too.
// Paper touches: each part wobbles a little (not with reduced motion), casts a soft drop shadow on the parts behind it,
// and the turn to face the other way (mesh.rotation.y) shades the paper as it goes edge-on.
export const RIGS={};
export const EZR={lin:x=>x,io:x=>x<.5?2*x*x:1-(2-2*x)**2/2,o2:x=>1-(1-x)**2,i2:x=>x*x};
export function defRig(k,d){d.kind=k;d.ox??=d.w/2;d.oy??=d.h;d.s??=1/60;d.pi={};d.clips??={};
  d.parts.forEach((p,i)=>{d.pi[p.n]=i;p.i=i;p.v??=[''];p.wob??=p.paint?.018:0;});
  for(const p of d.parts)p.pa=p.up!=null?d.pi[p.up]:-1;
  // pose order: parents before children
  const done=new Set();d.topo=[];const add=p=>{if(done.has(p.i))return;if(p.pa>=0)add(d.parts[p.pa]);done.add(p.i);d.topo.push(p.i);};d.parts.forEach(add);
  return RIGS[k]=d;}
// static clip from channel values {part: {r, x, ...}}, and a looping clip from a list of [time, values] (the last key closes the loop)
export const still=(v,bl)=>({len:0,bl,tr:Object.fromEntries(Object.entries(v).map(([p,c])=>[p,Object.fromEntries(Object.entries(c).map(([ch,x])=>[ch,[[0,x]]]))]))});
export function loopClip(len,keys,ez='io',bl){const tr={};for(const[t,v]of keys)for(const p in v)for(const ch in v[p]){const a=(tr[p]??={})[ch]??=[];a.push([t,v[p][ch],typeof v[p][ch]==='string'?null:ez]);}
  for(const p in tr)for(const ch in tr[p]){const a=tr[p][ch];if(a[a.length-1][0]<len)a.push([len,a[0][1]]);}return{len,loop:1,bl,tr};}

// ---- skins: every part and variant drawn once, cropped and packed into one texture
const PAD=10,BORDER=3,skins=new Map();
export function rigSkin(k,skin,key){const ck=key!=null?k+':'+key:null;if(ck&&skins.has(ck))return skins.get(ck);
  const d=RIGS[k],M=Math.ceil(Math.max(d.w,d.h)*.3),W=d.w+M*2,H=d.h+M*2,pieces=[];
  for(const p of d.parts){if(!p.paint)continue;for(const v of p.v){const c=mk(W,H),t=c.getContext('2d');t.translate(M,M);
    if(p.clip){t.beginPath();t.rect(p.clip[0],p.clip[1],p.clip[2]-p.clip[0],p.clip[3]-p.clip[1]);t.clip();}if(p.loc)t.translate(p.at[0],p.at[1]);
    t.lineJoin='round';t.lineCap='round';p.paint(t,skin,v);
    const a=t.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[(y*W+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    if(x1<0)continue;pieces.push({p:p.i,v,c,x0,y0,w:x1-x0+1,h:y1-y0+1});}}
  // shelf packing, tallest first
  const AW=Math.max(256,...pieces.map(q=>q.w+PAD*2));let x=0,y=0,row=0;
  for(const q of pieces.slice().sort((a,b)=>b.h-a.h)){if(x+q.w+PAD*2>AW){x=0;y+=row;row=0;}q.ax=x;q.ay=y;x+=q.w+PAD*2;row=Math.max(row,q.h+PAD*2);}
  const AH=y+row,img=mk(AW,Math.max(1,AH)),o=img.getContext('2d'),cells=d.parts.map(()=>({}));
  for(const q of pieces){const cw=q.w+PAD*2,chh=q.h+PAD*2,tmp=mk(cw,chh),t=tmp.getContext('2d');t.drawImage(q.c,q.x0,q.y0,q.w,q.h,PAD,PAD,q.w,q.h);grain(t,0,0,cw,chh,12);
    // the cream paper edge every cut-out piece has (makeSheet gives whole sprites the same)
    const sil=mk(cw,chh),s=sil.getContext('2d');s.drawImage(tmp,0,0);s.globalCompositeOperation='source-in';s.fillStyle='#fbf5e6';s.fillRect(0,0,cw,chh);
    for(let i=0;i<16;i++){const an=i/16*Math.PI*2;o.drawImage(sil,q.ax+Math.cos(an)*BORDER,q.ay+Math.sin(an)*BORDER);}o.drawImage(tmp,q.ax,q.ay);
    // the design rect this cell covers at rest (pivot-relative), and its uv rect
    const dx=q.x0-M-PAD,dy=q.y0-M-PAD,P=d.parts[q.p];
    cells[q.p][q.v]={l:[dx-P.at[0],dy-P.at[1],dx+cw-P.at[0],dy+chh-P.at[1]],uv:[q.ax/AW,1-(q.ay+chh)/AH,(q.ax+cw)/AW,1-q.ay/AH],ax:q.ax,ay:q.ay,w:cw,h:chh};}
  const S={img,cells,tex:canvasTex(img),key:ck};if(ck)skins.set(ck,S);return S;}

// ---- clips
function chan(K,t,len,loop){if(loop&&len>0){t%=len;if(t<0)t+=len;}if(t<=K[0][0])return K[0][1];
  for(let i=0;i<K.length-1;i++){const a=K[i],b=K[i+1];if(t<=b[0]){if(typeof a[1]==='string')return t>=b[0]?b[1]:a[1];const u=(t-a[0])/((b[0]-a[0])||1);return a[1]+(b[1]-a[1])*(EZR[a[2]]||EZR.lin)(u);}}
  return K[K.length-1][1];}
const CH=['r','x','y','sx','sy'],DEF={r:0,x:0,y:0,sx:1,sy:1};
function blankPose(n){return Array.from({length:n},()=>({r:0,x:0,y:0,sx:1,sy:1,sw:''}));}
function samplePose(d,c,t,out){for(const o of out){o.r=o.x=o.y=0;o.sx=o.sy=1;o.sw='';}const cl=d.clips[c];if(!cl)return;
  for(const pn in cl.tr){const i=d.pi[pn];if(i==null)continue;const tr=cl.tr[pn],o=out[i];for(const ch in tr)o[ch]=chan(tr[ch],t,cl.len,cl.loop);}}

// ---- material: sprite uniforms plus the paper touches. Quads come in three kinds (aSh): 0 a part, 1 its drop shadow
// (moved by uSh in the rig's own plane; rigUpdate mirrors it with the turn, so it always falls down and right), 2 the silhouette outline pass drawn behind everything.
// Parts are coplanar and the material writes no depth: within a rig the index order is the draw order (painter's), so pieces
// never fight in depth at any angle of the turn; between objects the transparent pass sorts back to front. It still tests
// depth, so opaque things in front (the held tool, the shield) cover it.
export function rigMat(tex){return new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,forceSinglePass:true,
  uniforms:{map:{value:tex},uFrame:{value:0},uFrames:{value:1},uTint:{value:new THREE.Vector3(1,1,1)},uFlash:{value:0},uOut:{value:new THREE.Vector4(0,0,0,0)},uPx:{value:new THREE.Vector2()},
    uCr:{value:new THREE.Vector3()},uSh:{value:new THREE.Vector2(.028,-.034)},uBack:{value:0}},
  vertexShader:`attribute vec2 aQ;attribute vec4 aCell;attribute float aSh;uniform vec2 uSh;varying vec2 vUv;varying vec2 vQ;varying vec4 vCell;varying float vSh;
    void main(){vUv=uv;vQ=aQ;vCell=aCell;vSh=aSh;vec3 p=position;if(aSh>.5&&aSh<1.5)p.xy+=uSh;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
  fragmentShader:`uniform sampler2D map;uniform vec3 uTint;uniform float uFlash;uniform vec4 uOut;uniform vec2 uPx;uniform vec3 uCr;uniform float uBack;varying vec2 vUv;varying vec2 vQ;varying vec4 vCell;varying float vSh;
    void main(){vec4 t=texture2D(map,vUv);
    if(vSh>1.5){if(uOut.a<=0.)discard;float a=t.a;for(int i=0;i<8;i++){float an=float(i)*.785398;a=max(a,texture2D(map,clamp(vUv+vec2(cos(an),sin(an))*uPx,vCell.xy,vCell.zw)).a);}
      if(a<.5)discard;gl_FragColor=vec4(uOut.rgb,1.);return;}
    if(t.a<.5)discard;
    if(vSh>.5){gl_FragColor=vec4(.1,.07,.13,.2);return;}
    float cd=9.,cw=0.;if(uCr.x>0.){vec2 q=vQ;cd=abs(q.x*.9+q.y-1.05+.035*sin(q.y*47.));if(uCr.x>1.5)cd=min(cd,abs(q.x-q.y*.7-.12+.03*sin(q.x*53.+1.)));
      cw=uCr.z*(.03+.02*sin(q.x*91.+q.y*67.));if(cd<cw)discard;}
    vec3 c=t.rgb*uTint*(1.-.2*uBack);if(cw>0.&&cd<cw+.018)c=vec3(.98,.95,.88)*uTint;else if(cd<.011)c=mix(c,vec3(.16,.13,.19),uCr.y);
    gl_FragColor=vec4(mix(c,vec3(1.),uFlash),1.);}`});}

// ---- instances
// makeRig(kind, skin, key): key names a shared skin (townsfolk of one type share one texture); null bakes a private one
export function makeRig(k,skin,key,o={}){const d=RIGS[k],n=d.parts.length,Q=n*3,g=new THREE.BufferGeometry();
  const A=(sz)=>new THREE.BufferAttribute(new Float32Array(Q*4*sz),sz);
  g.setAttribute('position',A(3));g.setAttribute('uv',A(2));g.setAttribute('aQ',A(2));g.setAttribute('aCell',A(4));g.setAttribute('aSh',A(1));
  for(const nm of['position','uv','aQ','aCell'])g.attributes[nm].setUsage(THREE.DynamicDrawUsage);
  const I=[],PI=[];for(let q=0;q<Q;q++){const b=q*4;I.push(b,b+1,b+2,b,b+2,b+3);}for(let i=0;i<n;i++){const b=(n+i*2+1)*4;PI.push(b,b+1,b+2,b,b+2,b+3);}g.setIndex(I);
  // quad q: 0..n-1 outlines, then per part a shadow and the part itself
  for(let i=0;i<n;i++)for(let v=0;v<4;v++){g.attributes.aSh.array[i*4+v]=2;g.attributes.aSh.array[(n+i*2)*4+v]=1;}
  const r=Math.max(d.w,d.h)*d.s;g.boundingSphere=new THREE.Sphere(new THREE.Vector3((d.w/2-d.ox)*d.s,(d.oy-d.h/2)*d.s,0),r);
  const S=rigSkin(k,skin,key),mat=rigMat(S.tex),mesh=new THREE.Mesh(g,mat);if(o.add!==false)scene.add(mesh);
  const R={d,k,S,mesh,mat,g,PI,t:Math.random()*9,c:null,ct:0,sp:1,w:1,bl:.1,cur:blankPose(n),from:blankPose(n),last:blankPose(n),ov:new Array(n).fill(null),ovl:new Array(n).fill(null),ow:new Float32Array(n),
    M:new Float32Array(n*6),abs:new Float32Array(n),vis:new Array(n).fill(''),shadow:o.shadow!==false};
  rigPlay(R,o.clip||'idle');rigUpdate(R,0);return R;}
// re-dress a rig (new armor, a new look): bakes the new skin and drops the old texture if nothing shares it
export function rigReskin(R,skin,key){const old=R.S;R.S=rigSkin(R.k,skin,key);R.mat.uniforms.map.value=R.S.tex;R.vis.fill(null);if(!old.key&&old!==R.S)old.tex.dispose();rigUpdate(R,0);}
export function rigFree(R){scene.remove(R.mesh);R.g.dispose();R.mat.dispose();if(!R.S.key)R.S.tex.dispose();}
// rigPlay(R, clip, {t, bl, sp}): switch clips, blending from the current pose over bl seconds; t sets the clip time
// (phase-driven clips like walk), sp its speed
export function rigPlay(R,c,o={}){if(c!==R.c){if(!R.d.clips[c])return;for(let i=0;i<R.last.length;i++)Object.assign(R.from[i],R.last[i]);R.c=c;R.ct=0;R.w=R.c0?0:1;R.c0=1;R.bl=o.bl??R.d.clips[c].bl??.1;}
  if(o.t!=null)R.ct=o.t;R.sp=o.sp??1;}
// rigSet(R, part, {r, x, y, sx, sy, sw, abs, snap}): hold a part this frame (sw swaps it). abs: r is measured on screen, not from the parent;
// snap: no ease in. When rigSet stops being called the part eases back to the clip.
export function rigSet(R,p,o){const i=R.d.pi[p];if(i!=null)R.ov[i]=o;}
// where a part's pivot is now, in world units from the mesh origin (facing right, before the mesh's own transform)
export function rigJoint(R,p){const i=R.d.pi[p],d=R.d;return[(R.M[i*6+4]-d.ox)*d.s,(d.oy-R.M[i*6+5])*d.s];}
export function rigUpdate(R,dt){const d=R.d,n=d.parts.length,rm=reduceMotion();R.t+=dt;R.ct+=dt*R.sp;R.w=Math.min(1,R.w+dt/Math.max(.001,R.bl));
  samplePose(d,R.c,R.ct,R.cur);const w=EZR.io(R.w);
  for(let i=0;i<n;i++){const a=R.from[i],b=R.cur[i],L=R.last[i];for(const ch of CH)L[ch]=a[ch]+(b[ch]-a[ch])*w;L.sw=w<.5?a.sw:b.sw;
    const ov=R.ov[i];if(ov){R.ovl[i]=ov;R.ow[i]=ov.snap?1:Math.min(1,R.ow[i]+dt/.08);}else R.ow[i]=Math.max(0,R.ow[i]-dt/.12);R.ov[i]=null;
    const ow=R.ow[i],ol=R.ovl[i];if(ow>0&&ol){for(const ch of CH)if(ol[ch]!=null&&!(ch==='r'&&ol.abs))L[ch]+=(ol[ch]-L[ch])*ow;if(ol.sw!=null&&ow>.5)L.sw=ol.sw;}}
  const M=R.M,P=d.parts;
  for(const i of d.topo){const p=P[i],L=R.last[i],j=p.pa;let r=L.r;if(p.wob&&!rm)r+=p.wob*(Math.sin(R.t*2.3+i*1.7)+.5*Math.sin(R.t*3.7+i*2.9));
    const ol=R.ovl[i];if(ol&&ol.abs&&ol.r!=null&&R.ow[i]>0){const pa=j>=0?R.abs[j]:0;r+=(ol.r-pa-r)*R.ow[i];}
    let px=p.at[0]+L.x,py=p.at[1]+L.y;if(j>=0){px-=P[j].at[0];py-=P[j].at[1];}
    const c=Math.cos(r),s=Math.sin(r),la=c*L.sx,lb=s*L.sx,lc=-s*L.sy,ld=c*L.sy,o=i*6;
    if(j<0){M[o]=la;M[o+1]=lb;M[o+2]=lc;M[o+3]=ld;M[o+4]=px;M[o+5]=py;R.abs[i]=r;}
    else{const q=j*6,A=M[q],B=M[q+1],C=M[q+2],D=M[q+3];M[o]=A*la+C*lb;M[o+1]=B*la+D*lb;M[o+2]=A*lc+C*ld;M[o+3]=B*lc+D*ld;M[o+4]=A*px+C*py+M[q+4];M[o+5]=B*px+D*py+M[q+5];R.abs[i]=R.abs[j]+r;}}
  const pos=R.g.attributes.position.array,uv=R.g.attributes.uv.array,aq=R.g.attributes.aQ.array,ac=R.g.attributes.aCell.array;let uvDirty=false;
  for(let i=0;i<n;i++){const cs=R.S.cells[i],L=R.last[i],cell=L.sw!=='-'&&cs&&(cs[L.sw]||cs['']),o=i*6,qs=[i,n+i*2,n+i*2+1];
    if(!cell){for(const q of qs)pos.fill(0,q*12,q*12+12);continue;}
    const l=cell.l,X=[l[0],l[2],l[2],l[0]],Y=[l[3],l[3],l[1],l[1]];
    for(let v=0;v<4;v++){const x=M[o]*X[v]+M[o+2]*Y[v]+M[o+4],y=M[o+1]*X[v]+M[o+3]*Y[v]+M[o+5],wx=(x-d.ox)*d.s,wy=(d.oy-y)*d.s;
      for(const q of qs){const b=q*4+v;pos[b*3]=wx;pos[b*3+1]=wy;aq[b*2]=x/d.w;aq[b*2+1]=1-y/d.h;}}
    if(!R.shadow)pos.fill(0,(n+i*2)*12,(n+i*2)*12+12);
    if(R.vis[i]!==cell){R.vis[i]=cell;uvDirty=true;const u=cell.uv,U=[u[0],u[2],u[2],u[0]],V=[u[1],u[1],u[3],u[3]];
      for(const q of qs)for(let v=0;v<4;v++){const b=q*4+v;uv[b*2]=U[v];uv[b*2+1]=V[v];ac[b*4]=u[0];ac[b*4+1]=u[1];ac[b*4+2]=u[2];ac[b*4+3]=u[3];}}}
  R.g.attributes.position.needsUpdate=true;R.g.attributes.aQ.needsUpdate=true;if(uvDirty){R.g.attributes.uv.needsUpdate=true;R.g.attributes.aCell.needsUpdate=true;}
  // edge-on in the turn: the paper darkens a little as it flips over
  const cf=Math.cos(R.mesh.rotation.y);R.mat.uniforms.uBack.value=1-Math.abs(cf);R.mat.uniforms.uSh.value.set(cf<0?-.028:.028,-.034);}
// a copy of the rig's current pose (parts only) for afterimages; reuses geo when given
export function rigSnap(R,geo){const src=R.g.attributes;if(!geo||!geo.userData.rig){geo=new THREE.BufferGeometry();geo.userData.rig=1;geo.setAttribute('position',src.position.clone());geo.setAttribute('uv',src.uv.clone());geo.setIndex(R.PI);}
  else{geo.attributes.position.array.set(src.position.array);geo.attributes.uv.array.set(src.uv.array);geo.attributes.position.needsUpdate=geo.attributes.uv.needsUpdate=true;}
  geo.boundingSphere=R.g.boundingSphere.clone();return geo;}
// a still picture of a rig (portraits, bestiary sketches, sheets for things that are not animated): design-sized canvas
export function rigPic(k,skin,clip,t=0,key){const d=RIGS[k],S=rigSkin(k,skin,key),R={d,S,t:0,c:null,ct:0,sp:0,w:1,bl:.1,cur:blankPose(d.parts.length),from:blankPose(d.parts.length),last:blankPose(d.parts.length),
  ov:[],ovl:[],ow:new Float32Array(d.parts.length),M:new Float32Array(d.parts.length*6),abs:new Float32Array(d.parts.length),vis:[],shadow:false,g:null,mesh:null};
  samplePose(d,clip||'idle',t,R.cur);for(let i=0;i<R.last.length;i++)Object.assign(R.last[i],R.cur[i]);
  const P=d.parts,M=R.M;for(const i of d.topo){const p=P[i],L=R.last[i],j=p.pa;let px=p.at[0]+L.x,py=p.at[1]+L.y;if(j>=0){px-=P[j].at[0];py-=P[j].at[1];}
    const c=Math.cos(L.r),s=Math.sin(L.r),la=c*L.sx,lb=s*L.sx,lc=-s*L.sy,ld=c*L.sy,o=i*6;
    if(j<0){M.set([la,lb,lc,ld,px,py],o);}else{const q=j*6,A=M[q],B=M[q+1],C=M[q+2],D=M[q+3];M.set([A*la+C*lb,B*la+D*lb,A*lc+C*ld,B*lc+D*ld,A*px+C*py+M[q+4],B*px+D*py+M[q+5]],o);}}
  const c=mk(d.w,d.h),t2=c.getContext('2d');for(let i=0;i<P.length;i++){const cs=S.cells[i],cell=cs&&(cs[R.last[i].sw]||cs['']);if(!cell)continue;const o=i*6;
    t2.setTransform(M[o],M[o+1],M[o+2],M[o+3],M[o+4],M[o+5]);t2.drawImage(S.img,cell.ax,cell.ay,cell.w,cell.h,cell.l[0],cell.l[1],cell.w,cell.h);}return c;}

// ================= human rig =================
// The player, townsfolk and human-shaped foes. Each part bakes the drawHuman layers (render.js HL) that belong to it, in
// HUMAN_ORDER's order; limbs are drawn around their joint. `extra` accessories split at the neck: above it they ride the
// head, below it the body. The head swaps between expressions.
const hl=(...L)=>(t,o)=>{for(const[p,l]of L)HL[l](t,p,o,LIMB[p]?LIMB[p][2]:1);};
const headV=(t,o,v)=>hl(['head','body'],['head','hair'],['head','armor'],['head','face'],['head','hat'])(t,v?Object.assign({},o,v==='blink'?{blink:1}:{face:v}):o);
defRig('human',{w:96,h:144,parts:[
  {n:'root',at:[48,138]},
  {n:'cape',at:[44,70],up:'torso',paint:hl(['back','cape']),wob:.03},
  {n:'hairB',at:[36,42],up:'head',paint:hl(['back','hair']),wob:.03},
  {n:'legB',at:LIMB.legB,up:'root',loc:1,paint:hl(['legB','pants'],['legB','armor'],['legB','boots'])},
  {n:'armB',at:LIMB.armB,up:'torso',loc:1,paint:hl(['armB','shirt'],['armB','armor'],['armB','body'])},
  {n:'pack',at:[44,84],up:'torso',paint:hl(['back','acc'])},
  {n:'torso',at:[48,110],up:'root',paint:hl(['torso','shirt'],['torso','armor'],['torso','pants']),wob:.008},
  {n:'legA',at:LIMB.legA,up:'root',loc:1,paint:hl(['legA','pants'],['legA','armor'],['legA','boots'])},
  {n:'head',at:[50,72],up:'torso',paint:headV,v:['','blink','happy','hurt','ko'],wob:.01},
  {n:'scarf',at:[40,72],up:'torso',paint:hl(['neck','cape']),wob:.012},
  {n:'hacc',at:[50,72],up:'head',paint:hl(['head','acc']),clip:[-60,-60,160,67],wob:0},
  {n:'bacc',at:[48,90],up:'torso',paint:hl(['head','acc']),clip:[-60,67,160,220],wob:0},
  {n:'armA',at:LIMB.armA,up:'torso',loc:1,paint:hl(['armA','shirt'],['armA','armor'],['armA','body'])},
  {n:'front',at:[62,88],up:'torso',paint:hl(['front','acc']),wob:.01}]});
// a render.js pose (legA, armA, lean, bob, wave, face, blink...) as channel values
export function poseCh(o){const w=o.wave||0,v={legA:{r:o.legA||0},legB:{r:o.legB||0},armB:{r:o.armB||0},root:{r:o.lean||0,y:o.bob||0},cape:{r:-w/54},hairB:{r:-w/40},scarf:{r:-w*.012},head:{sw:o.face||(o.blink?'blink':'')}};
  if(!o.noArm)v.armA={r:o.armA||0};return v;}
// every pose in POSES becomes a clip: PF names (land, dash, hurt...), sw0-sw3 for the swing bodies (frames 9-12) and the
// loops built from the same numbers: idle breathes and blinks, walk is the old four frames made continuous
const HC=RIGS.human.clips;export const FCLIP=[];
for(const k in PF){FCLIP[PF[k]]=k;HC[k]=still(poseCh(POSES[PF[k]]),.07);}
for(let i=0;i<4;i++){FCLIP[9+i]='sw'+i;HC['sw'+i]=still(poseCh(POSES[9+i]),.05);}
for(const k of['hurt','parry','land'])HC[k].bl=.04;HC.death.bl=.08;
HC.idle=loopClip(2.6,[[0,poseCh(POSES[0])],[1.3,poseCh(POSES[1])]],'io',.16);HC.idle.tr.head.sw=[[0,''],[1.9,'blink'],[2.02,''],[2.6,'']];
{const K=[];for(let k=0;k<12;k++){const ph=k/12*Math.PI*2,s=Math.sin(ph);K.push([k/12,poseCh({legA:s*.6,legB:-s*.6,armA:-s*.65,armB:s*.65,bob:-Math.abs(Math.cos(ph))*2.5+1,wave:s*3})]);}HC.walk=loopClip(1,K,'lin',.12);delete HC.walk.tr.head;}
HC.climb=loopClip(2,[[0,poseCh(POSES[PF.climb0])],[1,poseCh(POSES[PF.climb1])]],'io',.1);
HC.cheer=loopClip(.4,[[0,poseCh(POSES[PF.cheer0])],[.2,poseCh(POSES[PF.cheer1])]],'io',.08);
HC.reel=loopClip(.17,[[0,poseCh(POSES[PF.reel0])],[.085,poseCh(POSES[PF.reel1])]],'io',.06);
// townsfolk and foes: a slower amble, and the shamble of the paper undead (arms out, stiff)
HC.amble=loopClip(.8,[[0,poseCh({legA:.4,legB:-.4,armA:-.3,armB:.1,bob:-1})],[.2,poseCh({legA:.03,legB:-.03,armA:.1,armB:.1})],[.4,poseCh({legA:-.4,legB:.4,armA:.25,armB:-.2,bob:-1})],[.6,poseCh({legA:.03,legB:-.03,armA:.1,armB:.1})]],'io',.15);
HC.shamble=loopClip(.8,[[0,poseCh({legA:-.3,legB:.3,armA:-1.45,armB:-1.3,lean:.04})],[.4,poseCh({legA:.4,legB:-.4,armA:-1.35,armB:-1.4,bob:1,lean:.08})]],'io',.15);
HC.march=loopClip(.8,[[0,poseCh({legA:-.3,legB:.3,armA:-.4,armB:.2})],[.4,poseCh({legA:.35,legB:-.35,armA:-.4,armB:.2,bob:1})]],'io',.15);

// ================= creature rigs =================
// Slimes (and the King Slime): a jelly body that squashes, a shine, eyes that blink and the king's crown.
function slimeGeo(w,h){return{cx:w/2,by:h-7,sw:w*.78,sh:h*.66};}
function slimeRig(k,w,h,crown){const G=slimeGeo(w,h),{cx,by,sw,sh:sh_}=G,er=crown?9:3.4;
  const parts=[{n:'root',at:[cx,by]},
    {n:'body',at:[cx,by],up:'root',wob:0,paint:(t,s)=>{t.beginPath();t.moveTo(cx-sw/2,by);t.bezierCurveTo(cx-sw/2-4,by-sh_*1.25,cx+sw/2+4,by-sh_*1.25,cx+sw/2,by);t.closePath();fi(t,s.col,crown?5:3);
      t.beginPath();t.ellipse(cx-sw*.22,by-sh_*.68,sw*.1,sh_*.12,-.5,0,6.28);t.fillStyle='rgba(255,255,255,.6)';t.fill();}},
    {n:'eyes',at:[cx+sw*.2,by-sh_*.45],up:'body',v:['','blink'],wob:.02,paint:(t,s,v)=>{for(const ex of[cx+sw*.1,cx+sw*.3]){if(v){t.beginPath();t.moveTo(ex-er*.8,by-sh_*.45);t.lineTo(ex+er*.8,by-sh_*.45);ink(t,crown?4:2);continue;}
      t.beginPath();t.ellipse(ex,by-sh_*.45,er*.8,er*1.4,0,0,6.28);t.fillStyle=INK;t.fill();circ(t,ex+er*.3,by-sh_*.45-er*.5,er*.35);t.fillStyle='#fff';t.fill();}}}];
  if(crown){const cy=by-sh_*.93,s2=2.6;parts.push({n:'crown',at:[cx,cy],up:'body',wob:.03,paint:t=>{poly(t,[cx-18*s2,cy,cx+18*s2,cy,cx+20*s2,cy-22*s2,cx+10*s2,cy-10*s2,cx,cy-26*s2,cx-10*s2,cy-10*s2,cx-20*s2,cy-22*s2]);fi(t,'#f1c04f',5);circ(t,cx,cy-9*s2,4*s2);fi(t,'#e0506b',4);}});}
  else parts.push({n:'mouth',at:[cx+sw*.2,by-sh_*.25],up:'body',wob:.02,paint:t=>{t.beginPath();t.arc(cx+sw*.2,by-sh_*.25,3,.2,2.9);ink(t,2);}});
  const q=crown?.9:1;
  defRig(k,{w,h,oy:h,parts,clips:{
    idle:loopClip(1.6*q,[[0,{body:{sx:1,sy:1},eyes:{sw:''}}],[.8*q,{body:{sx:1.04,sy:.95}}],[1.25*q,{eyes:{sw:'blink'}}],[1.35*q,{eyes:{sw:''}}]],'io',.12),
    crouch:still({body:{sx:1.16,sy:.78},eyes:{y:3},mouth:{y:2}},.08),
    air:still({body:{sx:.92,sy:1.1}},.08)}});}
slimeRig('slime',96,80);slimeRig('king',340,280,1);
// Bats (and cinder bats): two wings pinned at the shoulders that flap, a body with ears and eyes
function batRig(k){const wing=(side)=>(t,s)=>{t.beginPath();t.moveTo(48,32);t.quadraticCurveTo(48+side*20,24,48+side*42,26);t.quadraticCurveTo(48+side*32,40,48+side*26,34);t.quadraticCurveTo(48+side*18,44,48,38);t.closePath();fi(t,s.c2,2.5);};
  defRig(k,{w:96,h:64,oy:32,parts:[{n:'root',at:[48,34]},{n:'wingB',at:[46,34],up:'root',paint:wing(-1),wob:0},
    {n:'body',at:[48,36],up:'root',paint:(t,s)=>{t.beginPath();t.ellipse(48,36,11,13,0,0,6.28);fi(t,s.c1);poly(t,[40,26,43,14,47,25]);fi(t,s.c1,2);poly(t,[49,25,53,14,56,26]);fi(t,s.c1,2);
      circ(t,44,34,2.3);t.fillStyle=s.eye;t.fill();circ(t,52,34,2.3);t.fill();if(s.fang){poly(t,[45,42,47,46,49,42]);t.fillStyle='#fff';t.fill();}}},
    {n:'wingA',at:[50,34],up:'root',paint:wing(1),wob:0}],
    clips:{fly:loopClip(.25,[[0,{wingA:{r:-.5},wingB:{r:.5},body:{y:-2}}],[.125,{wingA:{r:.45},wingB:{r:-.45},body:{y:1}}]],'io',.05)}});}
batRig('bat');
// The floating eye: tentacles that wave, the eyeball, and an iris that looks at you (rigSet 'iris')
defRig('eye',{w:96,h:96,oy:48,parts:[{n:'root',at:[52,48]},
  ...[0,1,2].map(k=>({n:'ten'+k,at:[34,48+(k-1)*10],up:'root',wob:0,paint:t=>{t.beginPath();t.moveTo(34,48+(k-1)*10);t.quadraticCurveTo(18,40+(k-1)*14,6,48+(k-1)*16);ink(t,5,'#4a2a5a');}})),
  {n:'ball',at:[52,48],up:'root',paint:t=>{circ(t,52,48,24);fi(t,'#f4f0e6',3);t.strokeStyle='rgba(200,40,60,.5)';t.lineWidth=1.3;for(let k=0;k<5;k++){t.beginPath();t.moveTo(30,40+k*4);t.lineTo(42,44+k*2);t.stroke();}}},
  {n:'iris',at:[60,48],up:'ball',wob:0,paint:t=>{circ(t,60,48,11);fi(t,'#8a3fb0',2);circ(t,62,48,5);t.fillStyle=INK;t.fill();circ(t,58,44,3);t.fillStyle='#fff';t.fill();}}],
  clips:{fly:loopClip(.5,[[0,{ten0:{r:.25},ten1:{r:-.1},ten2:{r:-.3},ball:{r:-.03}}],[.25,{ten0:{r:-.2},ten1:{r:.15},ten2:{r:.25},ball:{r:.03}}]],'io',.1)}});
// which rig and skin an enemy sheet name uses (entities.js spawnEnemy); arms: the arm pose a human foe holds
export const HUMANFOE={
  zombie:{skin:'#a8c79a',hair:'#3e5a3a',tunic:'#6b5b8a',pants:'#4a4058',boots:'#3a3040',eyeCol:'#c0392b',noBlush:1,extra:t=>{t.fillStyle='#2a2130';t.fillRect(40,95,6,10);t.fillRect(52,85,4,8);},clip:'shamble'},
  knight:{skin:'#c7a57a',helm:'#b48a5a',mail:'#b48a5a',greaves:'#9a7448',boots:'#6b4a2f',pants:'#6b4a2f',tunic:'#b48a5a',eyeCol:'#f1c04f',noBlush:1,eyeY:47,
    front:t=>{rr(t,58,70,24,34,8);fi(t,'#8e6a40');circ(t,70,87,5);fi(t,'#f1c04f',2);},clip:'march'},
  ashimp:{skin:'#9a3b2a',tunic:'#3a2a24',pants:'#2a1e1a',boots:'#1e1614',eyeCol:'#ffd66b',noBlush:1,
    extra:t=>{poly(t,[34,34,28,14,40,28]);fi(t,'#3a2a24',2);poly(t,[62,30,72,10,68,32]);fi(t,'#3a2a24',2);},front:t=>{circ(t,70,84,7);t.fillStyle='rgba(255,138,61,.6)';t.fill();},clip:'march',arm:-.8}};
export const FOERIG={slime:['slime',{col:'#6cc57a'}],bslime:['slime',{col:'#5aa7e0'}],blot:['slime',{col:'#4a3570'}],king:['king',{col:'#5aa7e0'}],
  bat:['bat',{c1:'#6b4c8f',c2:'#5a3f7a',eye:'#f1c04f',fang:1}],cinderbat:['bat',{c1:'#3a2a24',c2:'#2a1e1a',eye:'#ff8a3d'}],eye:['eye',{}],
  zombie:['human',HUMANFOE.zombie],knight:['human',HUMANFOE.knight],ashimp:['human',HUMANFOE.ashimp]};
// the enemies' still pictures (bestiary sketches) come from their rigs; the T textures stay for anything that still wants a sheet
export function buildRigSheets(SHEETS){for(const k in FOERIG){if(SHEETS[k])continue;const[r,s]=FOERIG[k],d=RIGS[r];SHEETS[k]=rigPic(r,s,r==='human'?'idle':d.clips.fly?'fly':'idle',0,k);SHEETS[k+'T']=canvasTex(SHEETS[k]);}}
