// Paper cutout rig: characters as paper pieces pinned at joints, posed by keyframed clips (issue #98).
import * as THREE from 'three';
import {
  canvasTex,circ,fi,grain,HL,ink,INK,LIMB,mk,poly,POSES,PF,reduceMotion,rr,scene,sh,
} from './game.js';

// ================= rig =================
// A rig is data. defRig(kind, {w, h, ox, oy, s, parts, clips}):
//  w,h: the design frame in px (the size the old sheet frames had); ox,oy: the design point that sits at the mesh origin
//  (default bottom centre); s: world units per design px (1/60, as sheets used).
//  parts, back to front (the array order is the draw order): {n name, at [x,y] pivot in design px, up parent name,
//  paint(t, skin, variant) the drawing, loc 1 if paint draws around the pivot (limbs) rather than in design coordinates,
//  clip [x0,y0,x1,y1] keeps only that design rect of the drawing, v variant names (swaps, '' first), wob wobble amount,
//  slot [x0,y0,x1,y1] a held-item slot (no paint: rigHold() cuts a picture into it, that design rect around the pivot),
//  rigid 1 to follow the parent's pivot and turn but not its stretch (a held sword stays a sword while the arm stretches)}.
//  A part with no paint or slot is a bare joint (the root).
// Clips: {len seconds, loop, bl blend-in seconds, tr: {part: {r, x, y, sx, sy, sw: keys}}}. Keys are [time, value, easing
//  to the next key] (EZR names); r is radians (canvas turn: positive is clockwise on screen), x/y design px, sx/sy scale,
//  sw a variant name that holds until the next key ('-' hides the part).
// A skin is what a rig wears: an object the paint functions read (for humans, the look o that render.js HL paints). rigSkin() bakes
// every part and variant of a skin once into one texture, so armor, clothes, hair and expressions are part swaps and
// re-bakes, never new frame sheets.
// At runtime every rig is one mesh with one material: makeRig() builds it, rigPlay() picks a clip (blending from the pose
// it was in), rigSet() pins a part for this frame (the swinging arm), rigUpdate() poses it. The material has the uniforms
// sprites have (uTint, uFlash, uOut, uCr...), so tinting, hit flashes, attack outlines and boss creases work on rigs too;
// uPF (part a, flash a, part b, flash b) flashes one or two parts alone (the held weapon's nice window, the parrying shield).
// Paper touches: each part wobbles a little (not with reduced motion), casts a soft drop shadow on the parts behind it,
// and the turn to face the other way (mesh.rotation.y) shades the paper as it goes edge-on.
export const RIGS={};
// bend: a limb painted as one picture over two bones (the part and its bend joint, an elbow or knee) is cut into SEG strips
// along its length, and each strip row follows the upper bone above the joint and the lower one below it, blended over bw
// design px around the joint, so the limb curves at the elbow instead of breaking into two stickers
const SEG=8;
export const EZR={lin:x=>x,io:x=>x<.5?2*x*x:1-(2-2*x)**2/2,o2:x=>1-(1-x)**2,i2:x=>x*x};
export function defRig(k,d){d.kind=k;d.ox??=d.w/2;d.oy??=d.h;d.s??=1/60;d.res??=1;d.pi={};d.clips??={};
  d.parts.forEach((p,i)=>{d.pi[p.n]=i;p.i=i;p.v??=[''];p.wob??=p.paint?.018:0;});
  for(const p of d.parts){p.pa=p.up!=null?d.pi[p.up]:-1;p.bi=p.bend!=null?d.pi[p.bend]:-1;p.ns=p.bi>=0?SEG:1;}
  // quads: every part's outline strip first (drawn behind the whole figure), then per part its shadow strip and itself
  let nq=0;for(const p of d.parts){p.oo=nq;nq+=p.ns;}d.NQ=nq;let o=nq;for(const p of d.parts){p.os=o;p.om=o+p.ns;o+=p.ns*2;}
  // pose order: parents before children
  const done=new Set();d.topo=[];const add=p=>{if(done.has(p.i))return;if(p.pa>=0)add(d.parts[p.pa]);done.add(p.i);d.topo.push(p.i);};d.parts.forEach(add);
  return RIGS[k]=d;}
// static clip from channel values {part: {r, x, ...}}, and a looping clip from a list of [time, values] (the last key closes the loop)
export const still=(v,bl)=>({len:0,bl,tr:Object.fromEntries(Object.entries(v).map(([p,c])=>[p,Object.fromEntries(Object.entries(c).map(([ch,x])=>[ch,[[0,x]]]))]))});
export function loopClip(len,keys,ez='io',bl){const tr={};for(const[t,v]of keys)for(const p in v)for(const ch in v[p]){const a=(tr[p]??={})[ch]??=[];a.push([t,v[p][ch],typeof v[p][ch]==='string'?null:ez]);}
  for(const p in tr)for(const ch in tr[p]){const a=tr[p][ch];if(a[a.length-1][0]<len)a.push([len,a[0][1]]);}return{len,loop:1,bl,tr};}

// ---- skins: every part and variant drawn once, cropped and packed into one texture
// RF: canvases whose pixels are read back (the crop scan, paper grain) stay in memory, as a GPU readback per piece is slow
const PAD=10,BORDER=3,EDGE=[1.4,4],skins=new Map(),RF={willReadFrequently:true};
// res: texels per design px for a rig drawn from big paintings (the hero), so it stays crisp when the camera zooms;
// edge: the rig's pieces get no paper edge of their own, the outline pass draws one cream edge round the whole figure
// hand-made parts (art.js, assets/art/rigs/): RIGART['slime.body'], or 'human@guide.head.happy' for one skin key and variant.
// A picture is fitted to the bounds the drawn part covers, so the pivot and joints stay put; setRigArt() re-bakes every skin.
export const RIGART={};let rigGen=0;
export function setRigArt(){skins.clear();for(const k in HREF)delete HREF[k];return++rigGen;}
// the merged pieces a skin uses: {part: [joined parts]} from the art names, the skin key's own first
function rigMerge(k,key){const out={};for(const pre of key!=null?[k+'@'+key+'.',k+'.']:[k+'.']){for(const n in RIGART){if(!n.startsWith(pre))continue;const ps=n.slice(pre.length).split('.')[0].split('+');
  if(ps.length>1&&!out[ps[0]])out[ps[0]]=ps.slice(1);}if(Object.keys(out).length)break;}return out;}
// the frames painted for a merged piece (<name>.<frame>: w1, w2, wind, atk, hurt, blink), picked by the clips' sw channel
const rigFrames=(k,key,n)=>{const pre=[k+(key!=null?'@'+key:'')+'.'+n+'.',k+'.'+n+'.'];return Object.keys(RIGART).filter(a=>pre.some(q=>a.startsWith(q))).map(a=>a.slice(a.lastIndexOf('.')+1));};
const rigArtFor=(k,key,n,v)=>{const t=n+(v?'.'+v:'');return(key!=null&&RIGART[k+'@'+key+'.'+t])||RIGART[k+'.'+t];};
// a cut-out piece: w x h of src (drawn at dw x dh) with paper grain and the cream paper edge, PAD px of margin all round
function paperPiece(src,sx,sy,w,h,dw=w,dh=h,bd=BORDER){const cw=dw+PAD*2,chh=dh+PAD*2,tmp=mk(cw,chh),t=tmp.getContext('2d',RF);t.drawImage(src,sx,sy,w,h,PAD,PAD,dw,dh);grain(t,0,0,cw,chh,12);
  if(!bd)return tmp;const sil=mk(cw,chh),s=sil.getContext('2d');s.drawImage(tmp,0,0);s.globalCompositeOperation='source-in';s.fillStyle='#fbf5e6';s.fillRect(0,0,cw,chh);
  const out=mk(cw,chh),o=out.getContext('2d');for(let i=0;i<16;i++){const an=i/16*Math.PI*2;o.drawImage(sil,Math.cos(an)*bd,Math.sin(an)*bd);}o.drawImage(tmp,0,0);return out;}
export function rigSkin(k,skin,key){const ck=key!=null?k+':'+key:null;if(ck&&skins.has(ck))return skins.get(ck);
  const d=RIGS[k],M=Math.ceil(Math.max(d.w,d.h)*.3),rs=d.res,W=(d.w+M*2)*rs,H=(d.h+M*2)*rs,pieces=[];
  // merged art (<rig>[@key].<part>+<part>...): one painted piece covers the first part and the ones joined to it (a body
  // painted with its arms or wings on; <part>+all joins every other part, root+all is a whole cut-out moved by its root),
  // as tall as all their drawn bounds together; the joined parts stop drawing
  const mg=rigMerge(k,key),mn={};for(const n in mg){mn[n]=[n,...mg[n]].join('+');if(mg[n][0]==='all')mg[n]=d.parts.filter(q=>q.n!==n).map(q=>q.n);}const gone=new Set(Object.values(mg).flat());
  const draw=(t,p,v)=>{t.save();if(p.clip){t.beginPath();t.rect(p.clip[0],p.clip[1],p.clip[2]-p.clip[0],p.clip[3]-p.clip[1]);t.clip();}if(p.loc)t.translate(p.at[0],p.at[1]);
    t.lineJoin='round';t.lineCap='round';p.paint(t,skin,v);t.restore();};
  for(const p of d.parts){if(gone.has(p.n))continue;if(p.slot){const[a,b,c,e]=p.slot;pieces.push({p:p.i,v:'',slot:1,x0:(M+p.at[0]+a)*rs,y0:(M+p.at[1]+b)*rs,w:(c-a)*rs,h:(e-b)*rs});continue;}if(!p.paint&&!mg[p.n])continue;for(const v of mg[p.n]?[...new Set([...p.v,...rigFrames(k,key,mn[p.n])])]:p.v){const c=mk(W,H),t=c.getContext('2d',RF);t.setTransform(rs,0,0,rs,M*rs,M*rs);
    if(p.paint)draw(t,p,v);if(mg[p.n])for(const n of mg[p.n]){const q=d.parts[d.pi[n]];if(q.paint)draw(t,q,'');}
    const a=t.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[(y*W+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    if(x1<0)continue;const art=rigArtFor(k,key,mn[p.n]||p.n,v);let pc=c;
    // a part's artS scales its merged painting about the drawn bounds' centre (a flier whose frames share one tall canvas, wings up and down)
    if(art&&mg[p.n]){const S2=p.artS||1,h=Math.round((y1-y0+1)*S2),w=Math.min(W-2,Math.round(art.width/art.height*h));y0=Math.max(0,Math.round((y0+y1-h)/2));y1=Math.min(H-1,y0+h-1);x0=Math.max(0,Math.round((x0+x1-w)/2));x1=Math.min(W-1,x0+w-1);}
    if(art){pc=mk(W,H);pc.getContext('2d').drawImage(art,x0,y0,x1-x0+1,y1-y0+1);}
    pieces.push({p:p.i,v,c:pc,x0,y0,w:x1-x0+1,h:y1-y0+1});}}
  // shelf packing, tallest first
  const AW=Math.max(256,...pieces.map(q=>q.w+PAD*2));let x=0,y=0,row=0;
  for(const q of pieces.slice().sort((a,b)=>b.h-a.h)){if(x+q.w+PAD*2>AW){x=0;y+=row;row=0;}q.ax=x;q.ay=y;x+=q.w+PAD*2;row=Math.max(row,q.h+PAD*2);}
  const AH=y+row,img=mk(AW,Math.max(1,AH)),o=img.getContext('2d'),cells=d.parts.map(()=>({}));
  for(const q of pieces){const cw=q.w+PAD*2,chh=q.h+PAD*2;
    // the cream paper edge every cut-out piece has (makeSheet gives whole sprites the same); a slot stays empty until rigHold
    if(!q.slot)o.drawImage(paperPiece(q.c,q.x0,q.y0,q.w,q.h,q.w,q.h,d.edge?0:BORDER*rs),q.ax,q.ay);
    // the design rect this cell covers at rest (pivot-relative), and its uv rect
    const dx=(q.x0-PAD)/rs-M,dy=(q.y0-PAD)/rs-M,P=d.parts[q.p];
    cells[q.p][q.v]={l:[dx-P.at[0],dy-P.at[1],dx+cw/rs-P.at[0],dy+chh/rs-P.at[1]],uv:[q.ax/AW,1-(q.ay+chh)/AH,(q.ax+cw)/AW,1-q.ay/AH],ax:q.ax,ay:q.ay,w:cw,h:chh,iw:q.w,ih:q.h};}
  const S={img,cells,tex:canvasTex(img),key:ck,gen:rigGen,whole:!!mg[d.parts[0].n]};if(ck)skins.set(ck,S);return S;}

// a design point (x, y from the part's pivot) posed: through the part's matrix, or for a bent limb blended between its
// upper and lower bone around the joint
const smooth=(a,b,x)=>{const u=Math.min(1,Math.max(0,(x-a)/(b-a)));return u*u*(3-2*u);};
function skinPt(P,M,p,x,y,out){const o=p.i*6;if(p.bi<0){out[0]=M[o]*x+M[o+2]*y+M[o+4];out[1]=M[o+1]*x+M[o+3]*y+M[o+5];return out;}
  const b=P[p.bi],ex=b.at[0]-p.at[0],ey=b.at[1]-p.at[1],bw=p.bw??7,w=smooth(ey-bw,ey+bw,y),q=b.i*6,lx=x-ex,ly=y-ey;
  out[0]=(M[o]*x+M[o+2]*y+M[o+4])*(1-w)+(M[q]*lx+M[q+2]*ly+M[q+4])*w;out[1]=(M[o+1]*x+M[o+3]*y+M[o+5])*(1-w)+(M[q+1]*lx+M[q+3]*ly+M[q+5])*w;return out;}
const SP=[0,0];
// one triangle of a picture cell drawn onto a canvas: tri holds [design x, design y, canvas x, canvas y] per corner
function picTri(t,img,cell,l,tri){const sx=cell.w/(l[2]-l[0]),sy=cell.h/(l[3]-l[1]),[a,b,c]=tri,u=q=>cell.ax+(q[0]-l[0])*sx,v=q=>cell.ay+(q[1]-l[1])*sy;
  const x0=u(a),y0=v(a),x1=u(b),y1=v(b),x2=u(c),y2=v(c),den=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);if(!den)return;
  const m11=((b[2]-a[2])*(y2-y0)-(c[2]-a[2])*(y1-y0))/den,m12=((b[3]-a[3])*(y2-y0)-(c[3]-a[3])*(y1-y0))/den,m21=((c[2]-a[2])*(x1-x0)-(b[2]-a[2])*(x2-x0))/den,m22=((c[3]-a[3])*(x1-x0)-(b[3]-a[3])*(x2-x0))/den;
  const cx=(a[2]+b[2]+c[2])/3,cy=(a[3]+b[3]+c[3])/3,g=q=>{const dx=q[2]-cx,dy=q[3]-cy,d=Math.hypot(dx,dy)||1;return[q[2]+dx/d*.6,q[3]+dy/d*.6];};
  t.save();t.setTransform(1,0,0,1,0,0);t.beginPath();t.moveTo(...g(a));t.lineTo(...g(b));t.lineTo(...g(c));t.closePath();t.clip();
  t.setTransform(m11,m12,m21,m22,a[2]-m11*x0-m21*y0,a[3]-m12*x0-m22*y0);t.drawImage(img,0,0);t.restore();}

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
  uniforms:{map:{value:tex},uFrame:{value:0},uFrames:{value:1},uTint:{value:new THREE.Vector3(1,1,1)},uFlash:{value:0},uOut:{value:new THREE.Vector4(0,0,0,0)},uPx:{value:new THREE.Vector2()},uEdge:{value:new THREE.Vector2()},
    uCr:{value:new THREE.Vector3()},uSh:{value:new THREE.Vector2(.028,-.034)},uBack:{value:0},uPF:{value:new THREE.Vector4(-1,0,-1,0)}},
  vertexShader:`attribute vec2 aQ;attribute vec4 aCell;attribute float aSh;attribute float aP;uniform vec2 uSh;varying vec2 vUv;varying vec2 vQ;varying vec4 vCell;varying float vSh;varying float vP;
    void main(){vUv=uv;vQ=aQ;vCell=aCell;vSh=aSh;vP=aP;vec3 p=position;if(aSh>.5&&aSh<1.5)p.xy+=uSh;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
  fragmentShader:`uniform sampler2D map;uniform vec3 uTint;uniform float uFlash;uniform vec4 uOut;uniform vec2 uPx;uniform vec2 uEdge;uniform vec3 uCr;uniform float uBack;uniform vec4 uPF;varying vec2 vUv;varying vec2 vQ;varying vec4 vCell;varying float vSh;varying float vP;
    void main(){vec4 t=texture2D(map,vUv);
    if(vSh>1.5){if(uOut.a>0.){float a=t.a;for(int i=0;i<8;i++){float an=float(i)*.785398;a=max(a,texture2D(map,clamp(vUv+vec2(cos(an),sin(an))*uPx,vCell.xy,vCell.zw)).a);}
        if(a<.5)discard;gl_FragColor=vec4(uOut.rgb,1.);return;}
      // edge rigs: one ink line and cream paper edge round the whole figure (these quads draw behind every part)
      if(uEdge.y<=0.)discard;vec2 ts=1./vec2(textureSize(map,0));float ai=t.a,ac=t.a;
      for(int i=0;i<12;i++){float an=float(i)*.5236;vec2 d=vec2(cos(an),sin(an))*ts;
        ai=max(ai,max(texture2D(map,clamp(vUv+d*uEdge.x*.5,vCell.xy,vCell.zw)).a,texture2D(map,clamp(vUv+d*uEdge.x,vCell.xy,vCell.zw)).a));
        ac=max(ac,max(texture2D(map,clamp(vUv+d*uEdge.y*.5,vCell.xy,vCell.zw)).a,texture2D(map,clamp(vUv+d*uEdge.y,vCell.xy,vCell.zw)).a));}
      if(ac<.5)discard;gl_FragColor=vec4(ai>=.5?vec3(.165,.129,.188)*uTint:vec3(.984,.961,.902)*uTint,1.);return;}
    if(t.a<.5)discard;
    if(vSh>.5){gl_FragColor=vec4(.1,.07,.13,.2);return;}
    float cd=9.,cw=0.;if(uCr.x>0.){vec2 q=vQ;cd=abs(q.x*.9+q.y-1.05+.035*sin(q.y*47.));if(uCr.x>1.5)cd=min(cd,abs(q.x-q.y*.7-.12+.03*sin(q.x*53.+1.)));
      cw=uCr.z*(.03+.02*sin(q.x*91.+q.y*67.));if(cd<cw)discard;}
    vec3 c=t.rgb*uTint*(1.-.2*uBack);if(cw>0.&&cd<cw+.018)c=vec3(.98,.95,.88)*uTint;else if(cd<.011)c=mix(c,vec3(.16,.13,.19),uCr.y);
    float fl=uFlash;if(abs(vP-uPF.x)<.5)fl=max(fl,uPF.y);if(abs(vP-uPF.z)<.5)fl=max(fl,uPF.w);
    gl_FragColor=vec4(mix(c,vec3(1.),fl),1.);}`});}

// ---- instances
// makeRig(kind, skin, key): key names a shared skin (townsfolk of one type share one texture); null bakes a private one
export function makeRig(k,skin,key,o={}){const d=RIGS[k],n=d.parts.length,Q=d.NQ*3,g=new THREE.BufferGeometry();
  const A=(sz)=>new THREE.BufferAttribute(new Float32Array(Q*4*sz),sz);
  g.setAttribute('position',A(3));g.setAttribute('uv',A(2));g.setAttribute('aQ',A(2));g.setAttribute('aCell',A(4));g.setAttribute('aSh',A(1));g.setAttribute('aP',A(1));
  for(const nm of['position','uv','aQ','aCell'])g.attributes[nm].setUsage(THREE.DynamicDrawUsage);
  const I=[],PI=[];for(let q=0;q<Q;q++){const b=q*4;I.push(b,b+1,b+2,b,b+2,b+3);}for(const p of d.parts)for(let s=0;s<p.ns;s++){const b=(p.om+s)*4;PI.push(b,b+1,b+2,b,b+2,b+3);}g.setIndex(I);
  // quads (defRig): all the outline strips, then per part its shadow strip and itself
  for(const p of d.parts)for(let s=0;s<p.ns;s++)for(let v=0;v<4;v++){g.attributes.aSh.array[(p.oo+s)*4+v]=2;g.attributes.aSh.array[(p.os+s)*4+v]=1;for(const q of[p.oo+s,p.os+s,p.om+s])g.attributes.aP.array[q*4+v]=p.i;}
  const r=Math.max(d.w,d.h)*d.s;g.boundingSphere=new THREE.Sphere(new THREE.Vector3((d.w/2-d.ox)*d.s,(d.oy-d.h/2)*d.s,0),r);
  const S=rigSkin(k,skin,key),mat=rigMat(S.tex),mesh=new THREE.Mesh(g,mat);if(o.add!==false)scene.add(mesh);if(d.edge)mat.uniforms.uEdge.value.set(EDGE[0]*d.res,EDGE[1]*d.res);
  const R={d,k,S,mesh,mat,g,PI,t:Math.random()*9,c:null,ct:0,sp:1,w:1,bl:.1,cur:blankPose(n),from:blankPose(n),last:blankPose(n),ov:new Array(n).fill(null),ovl:new Array(n).fill(null),ow:new Float32Array(n),
    M:new Float32Array(n*6),abs:new Float32Array(n),vis:new Array(n).fill(''),shadow:o.shadow!==false,hs:new Array(n).fill(null),hk:new Array(n).fill(null)};
  R.sk=skin;R.key=key;rigPlay(R,o.clip||'idle');rigUpdate(R,0);return R;}
// re-dress a rig (new armor, a new look): bakes the new skin and drops the old texture if nothing shares it
export function rigReskin(R,skin,key){const old=R.S;R.sk=skin;R.key=key;R.S=rigSkin(R.k,skin,key);R.mat.uniforms.map.value=R.S.tex;R.vis.fill(null);if(!old.key&&old!==R.S)old.tex.dispose();rigUpdate(R,0);}
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
// a point given in a part's own design px (from its pivot), posed, in world units from the mesh origin (facing right)
export function rigPt(R,p,x,y){const i=R.d.pi[p],d=R.d,M=R.M,o=i*6;return[(M[o]*x+M[o+2]*y+M[o+4]-d.ox)*d.s,(d.oy-(M[o+1]*x+M[o+3]*y+M[o+5]))*d.s];}
// rigHold(R, part, src): cut a picture (a canvas, such as an item's icon) into a slot part as a paper piece, or null to
// empty it (the part hides). Pieces are cached per picture, so switching items is one copy into the skin; a re-dress
// (rigReskin) re-cuts on the next call. Only for private skins (the player's): a shared skin would show it on every wearer.
const slotCut=new WeakMap();
export function rigHold(R,p,src){const i=R.d.pi[p];if(i==null||R.S.key)return;if(R.hs[i]===src&&R.hk[i]===R.S)return;R.hs[i]=src;R.hk[i]=R.S;if(!src)return;
  const cell=R.S.cells[i][''];if(!cell)return;let m=slotCut.get(src);if(!m)slotCut.set(src,m={});const k=cell.iw+'x'+cell.ih;
  const pc=m[k]||(m[k]=paperPiece(src,0,0,src.width,src.height,cell.iw,cell.ih,BORDER*R.d.res)),t=R.S.img.getContext('2d');
  t.clearRect(cell.ax,cell.ay,cell.w,cell.h);t.drawImage(pc,cell.ax,cell.ay);R.S.tex.needsUpdate=true;}
export function rigUpdate(R,dt){if(R.S.gen!==rigGen&&R.mesh)rigReskin(R,R.sk,R.key);const d=R.d,n=d.parts.length,rm=reduceMotion();R.t+=dt;R.ct+=dt*R.sp;R.w=Math.min(1,R.w+dt/Math.max(.001,R.bl));
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
    else if(p.rigid){const q=j*6,a=R.abs[j]+r,ca=Math.cos(a),sa=Math.sin(a);M[o]=ca*L.sx;M[o+1]=sa*L.sx;M[o+2]=-sa*L.sy;M[o+3]=ca*L.sy;M[o+4]=M[q]*px+M[q+2]*py+M[q+4];M[o+5]=M[q+1]*px+M[q+3]*py+M[q+5];R.abs[i]=a;}
    else{const q=j*6,A=M[q],B=M[q+1],C=M[q+2],D=M[q+3];M[o]=A*la+C*lb;M[o+1]=B*la+D*lb;M[o+2]=A*lc+C*ld;M[o+3]=B*lc+D*ld;M[o+4]=A*px+C*py+M[q+4];M[o+5]=B*px+D*py+M[q+5];R.abs[i]=R.abs[j]+r;}}
  const pos=R.g.attributes.position.array,uv=R.g.attributes.uv.array,aq=R.g.attributes.aQ.array,ac=R.g.attributes.aCell.array;let uvDirty=false;
  for(let i=0;i<n;i++){const p=P[i],ns=p.ns,cs=R.S.cells[i],L=R.last[i],cell=L.sw!=='-'&&(!p.slot||R.hs[i])&&cs&&(cs[L.sw]||cs['']);
    if(!cell){for(const q0 of[p.oo,p.os,p.om])pos.fill(0,q0*12,(q0+ns)*12);continue;}
    const l=cell.l,X=[l[0],l[2],l[2],l[0]];
    for(let sg=0;sg<ns;sg++){const ya=l[1]+(l[3]-l[1])*sg/ns,yb=l[1]+(l[3]-l[1])*(sg+1)/ns,Y=[yb,yb,ya,ya],qs=[p.oo+sg,p.os+sg,p.om+sg];
      for(let v=0;v<4;v++){skinPt(P,M,p,X[v],Y[v],SP);const x=SP[0],y=SP[1],wx=(x-d.ox)*d.s,wy=(d.oy-y)*d.s;
        for(const q of qs){const b=q*4+v;pos[b*3]=wx;pos[b*3+1]=wy;aq[b*2]=x/d.w;aq[b*2+1]=1-y/d.h;}}}
    if(!R.shadow)pos.fill(0,p.os*12,(p.os+ns)*12);
    if(R.vis[i]!==cell){R.vis[i]=cell;uvDirty=true;const u=cell.uv,U=[u[0],u[2],u[2],u[0]];
      for(let sg=0;sg<ns;sg++){const va=u[3]+(u[1]-u[3])*sg/ns,vb=u[3]+(u[1]-u[3])*(sg+1)/ns,V=[vb,vb,va,va];
        for(const q of[p.oo+sg,p.os+sg,p.om+sg])for(let v=0;v<4;v++){const b=q*4+v;uv[b*2]=U[v];uv[b*2+1]=V[v];ac[b*4]=u[0];ac[b*4+1]=u[1];ac[b*4+2]=u[2];ac[b*4+3]=u[3];}}}}
  R.g.attributes.position.needsUpdate=true;R.g.attributes.aQ.needsUpdate=true;if(uvDirty){R.g.attributes.uv.needsUpdate=true;R.g.attributes.aCell.needsUpdate=true;}
  // edge-on in the turn: the paper darkens a little as it flips over
  const cf=Math.cos(R.mesh.rotation.y);R.mat.uniforms.uBack.value=1-Math.abs(cf);R.mat.uniforms.uSh.value.set(cf<0?-.028:.028,-.034);}
// a copy of the rig's current pose (parts only) for afterimages; reuses geo when given
export function rigSnap(R,geo){const src=R.g.attributes;if(!geo||!geo.userData.rig){geo=new THREE.BufferGeometry();geo.userData.rig=1;geo.setAttribute('position',src.position.clone());geo.setAttribute('uv',src.uv.clone());geo.setIndex(R.PI);}
  else{geo.attributes.position.array.set(src.position.array);geo.attributes.uv.array.set(src.uv.array);geo.attributes.position.needsUpdate=geo.attributes.uv.needsUpdate=true;}
  geo.boundingSphere=R.g.boundingSphere.clone();return geo;}
// a still picture of a rig (portraits, bestiary sketches, sheets for things that are not animated): design-sized canvas
// skin is a look to bake (shared under key, or baked for this picture alone when key is null) or an already baked skin (R.S);
// set holds channel values over the clip's pose, {part: {r, sw, ...}} (a townsperson's tool arm, a portrait's expression)
export function rigPic(k,skin,clip,t=0,key,set,sc=1){const d=RIGS[k],own=!skin?.cells&&key==null,S=skin?.cells?skin:rigSkin(k,skin,key),R={d,S,t:0,c:null,ct:0,sp:0,w:1,bl:.1,cur:blankPose(d.parts.length),from:blankPose(d.parts.length),last:blankPose(d.parts.length),
  ov:[],ovl:[],ow:new Float32Array(d.parts.length),M:new Float32Array(d.parts.length*6),abs:new Float32Array(d.parts.length),vis:[],shadow:false,g:null,mesh:null};
  samplePose(d,clip||'idle',t,R.cur);for(let i=0;i<R.last.length;i++)Object.assign(R.last[i],R.cur[i]);
  if(set)for(const pn in set){const i=d.pi[pn];if(i!=null)Object.assign(R.last[i],set[pn]);}
  const P=d.parts,M=R.M;for(const i of d.topo){const p=P[i],L=R.last[i],j=p.pa;let px=p.at[0]+L.x,py=p.at[1]+L.y;if(j>=0){px-=P[j].at[0];py-=P[j].at[1];}
    const c=Math.cos(L.r),s=Math.sin(L.r),la=c*L.sx,lb=s*L.sx,lc=-s*L.sy,ld=c*L.sy,o=i*6;
    if(j<0){M.set([la,lb,lc,ld,px,py],o);}else{const q=j*6,A=M[q],B=M[q+1],C=M[q+2],D=M[q+3];M.set([A*la+C*lb,B*la+D*lb,A*lc+C*ld,B*lc+D*ld,A*px+C*py+M[q+4],B*px+D*py+M[q+5]],o);}}
  // a whole painted cut-out can be wider or taller than the rig's frame: the picture grows to fit it
  const wc=S.whole&&S.cells[0][''],pad=wc?Math.ceil(Math.max(0,-(P[0].at[0]+wc.l[0]),P[0].at[0]+wc.l[2]-d.w,-(P[0].at[1]+wc.l[1]))):0;
  const c=mk(Math.ceil((d.w+pad*2)*sc),Math.ceil((d.h+pad)*sc)),t2=c.getContext('2d');for(let i=0;i<P.length;i++){const p=P[i];if(p.slot)continue;const cs=S.cells[i],sw=R.last[i].sw,cell=sw!=='-'&&cs&&(cs[sw]||cs['']);if(!cell)continue;const o=i*6,l=cell.l,lw=l[2]-l[0],lh=l[3]-l[1];
    if(p.bi<0){t2.setTransform(M[o]*sc,M[o+1]*sc,M[o+2]*sc,M[o+3]*sc,(M[o+4]+pad)*sc,(M[o+5]+pad)*sc);t2.drawImage(S.img,cell.ax,cell.ay,cell.w,cell.h,l[0],l[1],lw,lh);continue;}
    // a bent limb: each strip as two triangles, each on its own exact affine, clipped a hair wide so no seam shows
    for(let sg=0;sg<p.ns;sg++){const ya=l[1]+lh*sg/p.ns,yb=l[1]+lh*(sg+1)/p.ns,Q=[[l[0],ya],[l[2],ya],[l[2],yb],[l[0],yb]].map(([x,y])=>{const w=skinPt(P,M,p,x,y,[0,0]);return[x,y,(w[0]+pad)*sc,(w[1]+pad)*sc];});
      for(const tri of[[Q[0],Q[1],Q[2]],[Q[0],Q[2],Q[3]]])picTri(t2,S.img,cell,l,tri);}}
  // the whole figure's paper edge (edge rigs): the silhouette grown a few px in cream, under the picture
  if(d.edge){const ring=(col,r)=>{const e=mk(c.width,c.height),et=e.getContext('2d');et.drawImage(c,0,0);et.globalCompositeOperation='source-in';et.fillStyle=col;et.fillRect(0,0,e.width,e.height);
      const o=mk(c.width,c.height),ot=o.getContext('2d');for(const k of[.5,1])for(let i=0;i<16;i++){const an=i/16*Math.PI*2;ot.drawImage(e,Math.cos(an)*r*k,Math.sin(an)*r*k);}return o;};
    const o2=mk(c.width,c.height),ot=o2.getContext('2d');ot.drawImage(ring('#fbf5e6',EDGE[1]*sc),0,0);ot.drawImage(ring(INK,EDGE[0]*sc),0,0);ot.drawImage(c,0,0);if(own)S.tex.dispose();o2.whole=!!wc;return o2;}
  if(own)S.tex.dispose();c.whole=!!wc;return c;}

// ================= human rig =================
// The player, townsfolk and human-shaped foes. Each part bakes the human layers (render.js HL) that belong to it, in
// the order its hl() lists give; limbs are drawn around their joint. `extra` accessories split at the neck: above it they ride the
// head, below it the body. The head swaps between expressions: blink, happy, hurt and ko in play, and the dialogue
// portraits' surprised, sad and angry, which add brows (facePic in render.js).
const hl=(...L)=>(t,o)=>{for(const[p,l]of L){const k=LIMB[p]?LIMB[p][2]:1;if(!hlArt(t,p,l,o,k))HL[l](t,p,o,k);}};
// painted layers (art.js, assets/art/rigs/L.<layer>.<part>[.<style>]): a light greyscale picture that replaces one layer's
// drawing on one human part, fitted to the bounds that drawing covers and tinted (multiply) with the look's colour for the
// layer, so every hair, shirt, skin and armour colour and any mix of them still comes from one picture per shape
// the face is painted per expression in colour (L.face.head, .blink, .happy, .hurt, .ko, .surprised, .sad, .angry), only for the
// plain face (a foe's coloured eyes or missing blush stay drawn); the pack is the player's (its draw callback carries art:'pack')
const LSTY={face:o=>o.eyeCol||o.noBlush||o.eyeY?'-':o.blink?'blink':o.face||'',hair:o=>o.hairS||'short',hat:o=>o.hatS,cape:(o,p)=>p==='neck'&&o.cape?'short':'',
  acc:(o,p)=>(p==='back'?o.back:p==='head'?o.extra:o.front)?.art||'-'};
const LCOL={body:o=>o.skin,hair:o=>o.hair,hat:o=>o.hatS==='straw'?null:o.hat,shirt:o=>o.tunic,pants:(o,p)=>p==='torso'?o.belt||'#5a3a22':o.pants,boots:o=>o.boots,
  cape:(o,p)=>p==='back'?o.cape&&sh(o.cape,.8):o.scarf,armor:(o,p)=>p==='head'?o.helm:p==='torso'||p[0]==='a'?o.mail:o.greaves,acc:()=>'#b9874f'};
// the box a painting fills: the drawn layer's bounds, or another drawing's (every face fills the head, so expressions don't shift)
const LBOX={face:(u,p,o,k)=>HL.body(u,'head',o,k)};
// a painting that shouldn't fill its whole box: [scale, x anchor, y anchor] (0 left/top, 1 right/bottom)
const LFIT={'L.hat.head.cap':[.9,.35,1]};
function hlArt(t,p,l,o,k){const st=LSTY[l]?LSTY[l](o,p):'';if(st==='-')return false;const n='L.'+l+'.'+p+(st?'.'+st:''),art=RIGART[n];if(!art)return false;
  const c=t.canvas,W=c.width,H=c.height,u=mk(W,H).getContext('2d',RF);u.setTransform(t.getTransform());u.lineJoin='round';u.lineCap='round';(LBOX[l]||HL[l])(u,p,o,k);
  const a=u.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[(y*W+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return true;let col=LCOL[l]&&LCOL[l](o,p);if(col&&k<1)col=sh(col,k);
  const f=LFIT[n];if(f){const w0=x1-x0+1,h0=y1-y0+1;x0+=Math.round(w0*(1-f[0])*f[1]);y0+=Math.round(h0*(1-f[0])*f[2]);x1=x0+Math.round(w0*f[0])-1;y1=y0+Math.round(h0*f[0])-1;}
  const w=x1-x0+1,h=y1-y0+1,pc=mk(w,h),q=pc.getContext('2d');q.drawImage(art,0,0,w,h);
  if(col){q.globalCompositeOperation='multiply';q.fillStyle=col;q.fillRect(0,0,w,h);q.globalCompositeOperation='destination-in';q.drawImage(art,0,0,w,h);}
  t.save();t.setTransform(1,0,0,1,0,0);t.drawImage(pc,x0,y0);t.restore();return true;}
const BROW={surprised:1,sad:1,angry:1};
const headV=(t,o,v)=>hl(['head','body'],['head','hair'],['head','armor'],['head','face'],['head','hat'])(t,v?Object.assign({},o,v==='blink'?{blink:1}:{face:v,brow:BROW[v]}):o);
defRig('human',{w:96,h:144,arml:22/60,sho:[7,56],parts:[
  {n:'root',at:[48,138]},
  {n:'cape',at:[44,70],up:'torso',paint:hl(['back','cape']),wob:.03},
  {n:'hairB',at:[36,42],up:'head',paint:hl(['back','hair']),wob:.03},
  {n:'legB',at:LIMB.legB,up:'root',loc:1,paint:hl(['legB','pants'],['legB','armor'],['legB','boots'])},
  {n:'armB',at:LIMB.armB,up:'torso',loc:1,paint:hl(['armB','shirt'],['armB','armor'],['armB','body'])},
  {n:'pack',at:[44,84],up:'torso',paint:hl(['back','acc'])},
  {n:'torso',at:[48,110],up:'root',paint:hl(['torso','shirt'],['torso','armor'],['torso','pants']),wob:.008},
  {n:'legA',at:LIMB.legA,up:'root',loc:1,paint:hl(['legA','pants'],['legA','armor'],['legA','boots'])},
  {n:'head',at:[50,72],up:'torso',paint:headV,v:['','blink','happy','hurt','ko','surprised','sad','angry'],wob:.01},
  {n:'scarf',at:[40,72],up:'torso',paint:hl(['neck','cape']),wob:.012},
  {n:'hacc',at:[50,72],up:'head',paint:hl(['head','acc']),clip:[-60,-60,160,67],wob:0},
  {n:'bacc',at:[48,90],up:'torso',paint:hl(['head','acc']),clip:[-60,67,160,220],wob:0},
  {n:'armA',at:LIMB.armA,up:'torso',loc:1,paint:hl(['armA','shirt'],['armA','armor'],['armA','body'])},
  {n:'front',at:[62,88],up:'torso',paint:hl(['front','acc']),wob:.01},
  // the held weapon or tool at the front hand (22 px down the arm, ARML in gameplay.js) and the raised shield: slots that
  // gameplay fills with the item's icon (rigHold); the icon's corner is the grip, so the blade runs up and to the right
  {n:'held',at:[LIMB.armA[0],LIMB.armA[1]+22],up:'armA',slot:[-8,-67,67,8],rigid:1,wob:0},
  {n:'shield',at:[66,94],up:'root',slot:[-30,-30,30,30],rigid:1,wob:0}]});
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
// a whole painted cut-out (human@<foe>.root+all) moves as one piece from its feet and swaps painted frames (sw): breathe and
// blink, a stepping walk, wind up, charge or strike, throw, flinch; a frame that isn't painted falls back to the standing one
HC.pidle=loopClip(2.4,[[0,{root:{sy:1,sx:1}}],[1.2,{root:{sy:1.02,sx:.99}}]],'io',.15);HC.pidle.tr.root.sw=[[0,''],[1.9,'blink'],[2.02,''],[2.4,'']];
HC.pwalk=loopClip(.56,[[0,{root:{r:-.03,y:0,sw:'w1'}}],[.14,{root:{r:0,y:-3}}],[.28,{root:{r:.03,y:0,sw:'w2'}}],[.42,{root:{r:0,y:-3}}]],'io',.1);
HC.pwind=still({root:{r:-.06,x:-2,sy:.97,sw:'wind'}},.08);HC.pdash=still({root:{r:.08,x:3,sw:'atk'}},.05);HC.prest=still({root:{r:.02}},.15);
HC.patk=loopClip(.5,[[0,{root:{r:0,x:0,sw:'wind'}}],[.18,{root:{r:.08,x:3,sw:'atk'}}],[.4,{root:{r:.04,x:1,sw:'atk'}}]],'io',.06);
HC.pthrow=loopClip(.36,[[0,{root:{r:-.05,sy:.97,sw:'wind'}}],[.1,{root:{r:.08,sy:1.02,x:2,sw:'atk'}}],[.3,{root:{r:0,sy:1,x:0,sw:'atk'}}],[.36,{root:{r:0,sy:1,x:0,sw:''}}]],'io',.05);HC.pthrow.loop=0;
HC.phurt=still({root:{r:-.1,x:-3,sw:'hurt'}},.04);
HC.march=loopClip(.8,[[0,poseCh({legA:-.3,legB:.3,armA:-.4,armB:.2})],[.4,poseCh({legA:.35,legB:-.35,armA:-.4,armB:.2,bob:1})]],'io',.15);

// ================= hero rig =================
// The player as the painted hero (assets/art/rigs/H.<piece>[.<variant>]): a head per expression, the tunic, one arm and one
// leg, painted whole at high resolution and placed by their own joints rather than fitted to drawn shapes. Arms and legs
// bend (bend: the elbow and knee bones fore/shin), so each limb stays one painting that curves; the pieces have no paper
// edge of their own (edge), the outline pass draws one ink line and cream edge round the whole figure. The head sits
// behind the tunic so the neck goes into the collar. Part names match the human rig, so gameplay (armA, held, shield) and
// every clip work on either; the player falls back to the drawn human rig until the paintings have loaded (heroReady).
// HPIC: [picture, x, y, w, h] the rect it fills around the part's pivot, in design px; HDIM darkens the far limbs.
const HPIC={head:['H.head',-16.2,-37.4,34.1,38.7],torso:['H.torso',-17,-23,34.3,40],arm:['H.arm',-6.8,-2.6,13.6,43.1],leg:['H.leg',-9.5,-3.8,19,56]};
const HDIM={armB:.72,legB:.78};
// a hero picture's name (H.<piece>[.<variant>]) that some part paints
export const heroArt=k=>Object.values(HPIC).some(h=>k===h[0]||k.startsWith(h[0]+'.'));
export const heroReady=()=>['H.head','H.torso','H.arm','H.leg'].every(k=>RIGART[k]),playerRigKind=()=>heroReady()?'hero':'human';
const heroPart=(k,dim=1)=>(t,o,v)=>{const[n,x,y,w,h]=HPIC[k],nv=RIGART[n+(v?'.'+v:'')]?n+(v?'.'+v:''):n,img=RIGART[nv];if(!img)return;
  t.drawImage(heroTint(img,RIGART[nv+'.mask'],o,dim),x,y,w,h);};
// the look's colours on a painting: its mask (H.<piece>.mask) weighs each pixel as tunic (red) or skin (green); the tunic
// takes the shirt colour with the painted shading (luminance against the region's mean), skin is scaled channel by channel
// so the blush and warm shadows stay; dim darkens the far limbs. Cached per picture and colours.
// the painted tunic and skin colours every piece is measured against: the torso's tunic and the head's skin, so a
// small or shaded region (a hand in shadow) takes the same colour as the rest of the body
const HREF={};function heroRef(n,ch){const k=n+ch;if(HREF[k])return HREF[k];const img=RIGART[n],mq=RIGART[n+'.mask'];if(!img||!mq)return null;
  const W=img.width,H=img.height,c=mk(W,H),t=c.getContext('2d',RF);t.drawImage(img,0,0);const a=t.getImageData(0,0,W,H).data;t.clearRect(0,0,W,H);t.drawImage(mq,0,0,W,H);const q=t.getImageData(0,0,W,H).data;
  const s=[0,0,0,0];for(let i=0;i<a.length;i+=4){const w=q[i+ch]/255;if(w>.5){s[0]+=a[i]*w;s[1]+=a[i+1]*w;s[2]+=a[i+2]*w;s[3]+=w;}}return HREF[k]=s[3]?s.slice(0,3).map(x=>x/s[3]):null;}
const HTC=new WeakMap(),hexv=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
function heroTint(img,mk2,o,dim){let m=HTC.get(img);if(!m)HTC.set(img,m={});const key=o.tunic+o.skin+dim;if(m[key])return m[key];
  const W=img.width,H=img.height,c=mk(W,H),t=c.getContext('2d',RF);t.drawImage(img,0,0);if(!mk2&&dim===1)return m[key]=c;
  const id=t.getImageData(0,0,W,H),a=id.data;let q=null;if(mk2){const c2=mk(W,H),t2=c2.getContext('2d',RF);t2.drawImage(mk2,0,0,W,H);q=t2.getImageData(0,0,W,H).data;}
  const T=o.tunic?hexv(o.tunic):null,Sk=o.skin?hexv(o.skin):null,lu=(r,g,b)=>.3*r+.59*g+.11*b,rt=heroRef('H.torso',0),rs=heroRef('H.head',1),lt=rt&&lu(...rt);
  for(let i=0;i<a.length;i+=4){let r=a[i],g=a[i+1],b=a[i+2];
    if(q){const wt=q[i]/255,ws=q[i+1]/255;
      if(wt>0&&T&&rt){const k=lu(r,g,b)/lt;r+=(T[0]*k-r)*wt;g+=(T[1]*k-g)*wt;b+=(T[2]*k-b)*wt;}
      if(ws>0&&Sk&&rs){r+=(r*Sk[0]/rs[0]-r)*ws;g+=(g*Sk[1]/rs[1]-g)*ws;b+=(b*Sk[2]/rs[2]-b)*ws;}}
    const f=1-dim;a[i]=Math.min(255,r*dim+58*f*.5);a[i+1]=Math.min(255,g*dim+40*f*.5);a[i+2]=Math.min(255,b*dim+76*f*.5);}
  t.putImageData(id,0,0);return m[key]=c;}
const ELB=18,KNEE=26,HAND=35,BL=.62; // BL: the held item's size against the drawn human's (the hero's arms are longer, its weapons smaller)
defRig('hero',{w:96,h:144,res:3,edge:1,arml:HAND/60,sho:[-5,67],stride:2.5,blade:BL,parts:[
  {n:'root',at:[48,138]},
  {n:'armB',at:[40,71],up:'torso',loc:1,paint:heroPart('arm',HDIM.armB),bend:'foreB'},
  {n:'foreB',at:[40,71+ELB],up:'armB'},
  {n:'legB',at:[44,86],up:'root',loc:1,paint:heroPart('leg',HDIM.legB),bend:'shinB',bw:6},
  {n:'shinB',at:[44,86+KNEE],up:'legB'},
  {n:'legA',at:[52,86],up:'root',loc:1,paint:heroPart('leg'),bend:'shinA',bw:6},
  {n:'shinA',at:[52,86+KNEE],up:'legA'},
  {n:'head',at:[50,67],up:'torso',loc:1,paint:heroPart('head'),v:['','blink','happy','hurt','ko','surprised','sad','angry'],wob:.01},
  {n:'torso',at:[48,88],up:'root',loc:1,paint:heroPart('torso'),wob:.006},
  {n:'armA',at:[43,71],up:'torso',loc:1,paint:heroPart('arm'),bend:'foreA'},
  {n:'foreA',at:[43,71+ELB],up:'armA'},
  {n:'held',at:[43,71+HAND-3],up:'foreA',slot:[-8,-67,67,8].map(v=>v*BL),rigid:1,wob:0},
  {n:'shield',at:[62,100],up:'root',slot:[-22,-22,22,22],rigid:1,wob:0}]});
// The hero's own animation set. hp(o) turns a pose into channels: thighs legA/legB and knees kA/kB (the shin's bend,
// positive folds the foot back), upper arms armA/armB and elbows eA/eB (negative bends the forearm forward), lean and
// bob (the root), sq squash (root sy, with sx the other way so the volume holds), br the chest's breath, hr the head's
// tilt, face an expression. noArm leaves the front arm to gameplay, straight at the elbow so the weapon lines up.
const hp=o=>{const sq=o.sq??1,v={root:{r:o.lean||0,y:o.bob||0,x:o.x||0,sy:sq,sx:1/Math.sqrt(sq)},legA:{r:o.legA||0},legB:{r:o.legB||0},shinA:{r:o.kA??.08},shinB:{r:o.kB??.08},
  armB:{r:o.armB||0},foreB:{r:o.eB??-.15},torso:{sy:o.br||1},head:{r:o.hr||0,sw:o.face||(o.blink?'blink':'')}};
  if(!o.noArm){v.armA={r:o.armA||0};v.foreA={r:o.eA??-.15};}else v.foreA={r:0};return v;};
const HPOSE={hold:{legA:-.22,kA:.3,legB:.22,kB:.18,armA:-1.6,eA:-.2,armB:.25},
  jump:{legA:-.75,kA:1.1,legB:.3,kB:.95,armA:-.7,eA:-1.1,armB:1.1,eB:-.5,lean:-.04,sq:1.04,hr:-.06},
  fall:{legA:-.25,kA:.4,legB:.3,kB:.6,armA:-1.25,eA:-.7,armB:2.2,eB:-.6,sq:1.02,hr:.05},
  land:{legA:-.6,kA:1.15,legB:-.2,kB:.85,armA:-.55,eA:-.5,armB:.6,eB:-.3,lean:.14,bob:5,sq:.92},
  dash:{legA:-1.05,kA:.55,legB:.95,kB:.95,armA:1,eA:-.25,armB:1.3,eB:-.2,lean:.24,sq:.97},
  hurt:{legA:.3,kA:.45,legB:-.45,kB:.2,armA:-.95,eA:-.55,armB:-.6,eB:-.4,lean:-.22,x:-2,bob:1,face:'hurt',hr:-.12},
  death:{legA:.6,kA:.5,legB:-.2,kB:.3,armA:.4,eA:-.3,armB:.7,lean:-.17,bob:4,face:'ko'},
  flat:{legA:-.75,legB:.75,armA:-1.9,armB:1.9,blink:1},
  mine0:{legA:-.35,kA:.45,legB:.35,kB:.3,armB:.6,lean:-.1,bob:1,noArm:1},mine1:{legA:-.45,kA:.55,legB:.4,kB:.35,armB:-.55,lean:.2,bob:3.5,noArm:1},
  bow:{legA:-.45,kA:.4,legB:.45,kB:.25,armB:-1.35,eB:0,lean:-.06,noArm:1},bowrel:{legA:-.45,kA:.4,legB:.45,kB:.25,armB:.75,lean:.04,noArm:1},
  cast:{legA:-.4,kA:.35,legB:.3,kB:.3,armB:-2.3,eB:-.3,lean:-.1,bob:-1,noArm:1},
  block:{legA:-.5,kA:.6,legB:.5,kB:.4,armA:-1.5,eA:-.6,armB:-.3,lean:-.08,bob:2.5,sq:.97},parry:{legA:-.6,kA:.5,legB:.45,kB:.3,armA:-2.2,eA:-.2,armB:.6,lean:.12,face:'happy'},
  fcast:{legA:-.4,kA:.35,legB:.4,kB:.25,armB:.45,lean:.15,noArm:1},reel0:{legA:-.3,kA:.35,legB:.3,kB:.25,armB:-1.1,eB:-.5,lean:-.12,noArm:1},reel1:{legA:-.3,kA:.4,legB:.3,kB:.3,armB:-.8,eB:-.6,lean:-.16,bob:1,noArm:1},
  climb0:{legA:-.9,kA:1.4,legB:.1,kB:.2,armA:-2.9,eA:-.15,armB:-2.2,eB:-.5},climb1:{legA:.1,kA:.2,legB:-.9,kB:1.4,armA:-2.2,eA:-.5,armB:-2.9,eB:-.15},
  cheer0:{legA:-.15,kA:.3,legB:.15,kB:.3,armA:-2.95,eA:-.25,armB:2.8,eB:-.3,bob:-3,sq:1.04,face:'happy',hr:-.08},cheer1:{legA:-.1,kA:.15,legB:.1,kB:.15,armA:-2.7,eA:-.45,armB:2.5,eB:-.5,face:'happy'},
  sw0:{legA:-.25,kA:.35,legB:.25,kB:.2,armB:.25,noArm:1},sw1:{legA:-.1,kA:.55,legB:.5,kB:.45,armB:.9,eB:-.3,lean:-.13,bob:1.5,sq:.97,noArm:1},
  sw2:{legA:-.45,kA:.35,legB:.35,kB:.25,armB:-.6,eB:-.4,lean:.07,noArm:1},sw3:{legA:-.75,kA:.5,legB:.55,kB:.15,armB:-1.1,eB:-.5,lean:.17,bob:3.5,noArm:1}};
{const HR=RIGS.hero.clips;HR.hold=still(hp(HPOSE.hold),.07);
  for(const k in HPOSE)HR[k]=still(hp(HPOSE[k]),/^sw/.test(k)?.05:.07);
  for(const k of['hurt','parry','land'])HR[k].bl=.04;HR.death.bl=.08;
  HR.fall.bl=.18;HR.jump.bl=.06;
  // idle: breathing (the chest swells, the head rides up a hair), arms settle, a blink
  HR.idle=loopClip(2.8,[[0,hp({legA:-.05,legB:.06,kA:.08,kB:.1,armA:.06,armB:-.08,eA:-.15,eB:-.18})],[1.4,hp({legA:-.05,legB:.06,kA:.12,kB:.14,armA:.1,armB:-.03,eA:-.2,eB:-.22,br:1.02,bob:.6,hr:-.02})]],'io',.18);
  HR.idle.tr.head.sw=[[0,''],[2,'blink'],[2.12,''],[2.8,'']];
  // walk: one stride per cycle; knees fold on the leg swinging through, the body drops on each contact and rises at
  // the pass, the arms swing against the legs with the elbows bending on the forward swing, a small forward lean
  {const K=[],N=16;for(let i=0;i<N;i++){const ph=i/N,s=Math.sin(ph*Math.PI*2),c=Math.cos(ph*Math.PI*2);
      K.push([ph,hp({legA:-.5*s,legB:.5*s,kA:.1+.85*Math.max(0,c)**1.4,kB:.1+.85*Math.max(0,-c)**1.4,armA:.55*s,armB:-.55*s,
        eA:-.15-.55*Math.max(0,-s),eB:-.15-.55*Math.max(0,s),lean:.06,bob:2.2*Math.abs(s)-1.2,hr:.02*Math.abs(c)})]);}
    HR.walk=loopClip(1,K,'lin',.12);delete HR.walk.tr.head.sw;}
  const mk2=(a,b,len,bl)=>loopClip(len,[[0,hp(HPOSE[a])],[len/2,hp(HPOSE[b])]],'io',bl);
  HR.climb=mk2('climb0','climb1',2,.1);HR.cheer=mk2('cheer0','cheer1',.4,.08);HR.reel=mk2('reel0','reel1',.17,.06);
  for(const k in HC)if(!HR[k])HR[k]=HC[k];}

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
    clips:{fly:loopClip(.25,[[0,{wingA:{r:-.5},wingB:{r:.5},body:{y:-2,sy:1.05,sx:.97}}],[.125,{wingA:{r:.45},wingB:{r:-.45},body:{y:1,sy:.93,sx:1.03}}]],'io',.05)}});}
batRig('bat');
// The floating eye: tentacles that wave, the eyeball, and an iris that looks at you (rigSet 'iris')
defRig('eye',{w:96,h:96,oy:48,parts:[{n:'root',at:[52,48]},
  ...[0,1,2].map(k=>({n:'ten'+k,at:[34,48+(k-1)*10],up:'root',wob:0,paint:t=>{t.beginPath();t.moveTo(34,48+(k-1)*10);t.quadraticCurveTo(18,40+(k-1)*14,6,48+(k-1)*16);ink(t,5,'#4a2a5a');}})),
  {n:'ball',at:[52,48],up:'root',paint:t=>{circ(t,52,48,24);fi(t,'#f4f0e6',3);t.strokeStyle='rgba(200,40,60,.5)';t.lineWidth=1.3;for(let k=0;k<5;k++){t.beginPath();t.moveTo(30,40+k*4);t.lineTo(42,44+k*2);t.stroke();}}},
  {n:'iris',at:[60,48],up:'ball',wob:0,paint:t=>{circ(t,60,48,11);fi(t,'#8a3fb0',2);circ(t,62,48,5);t.fillStyle=INK;t.fill();circ(t,58,44,3);t.fillStyle='#fff';t.fill();}}],
  clips:{fly:loopClip(.5,[[0,{ten0:{r:.25},ten1:{r:-.1},ten2:{r:-.3},ball:{r:-.03}}],[.25,{ten0:{r:-.2},ten1:{r:.15},ten2:{r:.25},ball:{r:.03}}]],'io',.1)}});
// ---- the rest of the foes (issue #108): each drawn in its old sheet's frame, split at the joints
// osc(len, {part: {ch: [amp, phase, base, cycles]}}): a looping sine on each channel (base defaults to 1 for scales)
function osc(len,spec,bl){const K=[],N=16;for(let k=0;k<N;k++){const u=k/N,v={};for(const p in spec){v[p]={};for(const ch in spec[p]){const[a,o=0,b=ch[0]==='s'?1:0,f=1]=spec[p][ch];v[p][ch]=b+a*Math.sin(u*Math.PI*2*f+o);}}K.push([u*len,v]);}return loopClip(len,K,'lin',bl);}
// add channels to a clip: a full turn (spin), or held swaps
const spin=(c,p,turn)=>{((c.tr[p]??={}).r=[[0,0,'lin'],[c.len,turn]]);return c;};
const swk=(c,p,keys)=>{(c.tr[p]??={}).sw=keys;return c;};
const blinkAt=(c,p,at)=>swk(c,p,[[0,''],[at,'blink'],[at+.1,''],[c.len,'']]);
const gearP=(t,x,y,r,n)=>{t.beginPath();for(let k=0;k<n*2;k++){const a=k/(n*2)*Math.PI*2,q=k%2?r*.8:r;t.lineTo(x+Math.cos(a-.1)*q,y+Math.sin(a-.1)*q);t.lineTo(x+Math.cos(a+.1)*q,y+Math.sin(a+.1)*q);}t.closePath();};
const eyeDot=(t,x,y,r,v)=>{if(v==='blink'){t.beginPath();t.moveTo(x-r,y);t.lineTo(x+r,y);ink(t,2);return;}circ(t,x,y,r);t.fillStyle=INK;t.fill();};

// Forest: the Crumple (a balled-up page that rolls; gameplay spins the mesh) and the Toadstool Lobber (cap on a stem)
defRig('crumple',{w:80,h:80,oy:40,parts:[{n:'root',at:[40,40]},
  {n:'body',at:[40,40],up:'root',wob:0,paint:t=>{const pts=[];for(let i=0;i<14;i++){const a=i/14*6.283,r=(i%2?25:31)+((i*7)%5)-2;pts.push(40+Math.cos(a)*r,40+Math.sin(a)*r);}poly(t,pts);fi(t,'#efe6d2',3);
    t.beginPath();for(let i=0;i<5;i++){const a=i*1.3;t.moveTo(40+Math.cos(a)*6,40+Math.sin(a)*6);t.lineTo(40+Math.cos(a)*26,40+Math.sin(a)*26);}ink(t,1.4,'rgba(42,33,48,.35)');}},
  {n:'face',at:[52,40],up:'body',v:['','blink'],wob:.02,paint:(t,s,v)=>{for(const ex of[46,58])eyeDot(t,ex,37,3.4,v);t.beginPath();t.moveTo(41,29);t.lineTo(50,32);t.moveTo(63,29);t.lineTo(54,32);ink(t,2.4);t.beginPath();t.moveTo(47,49);t.lineTo(57,47);ink(t,2);}}],
  clips:{idle:blinkAt(osc(1.4,{body:{sx:[.03],sy:[-.03]},face:{y:[1,1]}},.12),'face',1)}});
defRig('toadstool',{w:96,h:96,parts:[{n:'root',at:[48,92]},
  {n:'stem',at:[48,92],up:'root',v:['','blink'],paint:(t,s,v)=>{rr(t,32,48,32,44,12);fi(t,'#f4ecd8',3);for(const ex of[50,59]){if(v){t.beginPath();t.moveTo(ex-3,64);t.lineTo(ex+3,64);ink(t,2);}else{t.beginPath();t.ellipse(ex,64,2.6,4.2,0,0,6.28);t.fillStyle=INK;t.fill();}}t.beginPath();t.arc(55,74,3,.2,2.9);ink(t,2);}},
  {n:'cap',at:[48,54],up:'stem',paint:t=>{t.beginPath();t.moveTo(8,54);t.bezierCurveTo(8,10,88,10,88,54);t.closePath();fi(t,'#d4483b',3.5);for(const[x,y,r]of[[30,36,6],[52,26,7],[72,38,5],[46,46,4]]){circ(t,x,y,r);t.fillStyle='#fbf5e6';t.fill();}}}],
  clips:{idle:blinkAt(osc(1.6,{stem:{sy:[.03]},cap:{r:[.03,1]}},.15),'stem',1.2),
    walk:osc(.5,{root:{r:[.07]},stem:{sy:[.04,1.57,1,2]},cap:{r:[-.07]}},.12),
    wind:still({stem:{sy:.86,sx:1.06},cap:{r:-.24,sx:1.04}},.15)}});

// Desert: the Dune Fin (a sand shark: fin, tail and a body that leaps), the Shell Scarab and the Sun Kite
defRig('dunefin',{w:128,h:96,parts:[{n:'root',at:[64,90]},
  {n:'fin',at:[64,46],up:'body',paint:t=>{poly(t,[48,46,62,6,80,46]);fi(t,'#b98f4a',3);}},
  {n:'tail',at:[22,66],up:'body',paint:t=>{poly(t,[10,56,24,66,10,82]);fi(t,'#b98f4a',3);}},
  {n:'body',at:[64,86],up:'root',wob:.008,paint:t=>{t.beginPath();t.moveTo(20,66);t.quadraticCurveTo(50,36,96,48);t.quadraticCurveTo(124,56,122,68);t.quadraticCurveTo(100,90,56,86);t.quadraticCurveTo(28,82,20,66);t.closePath();fi(t,'#e3c77d',3);
    t.beginPath();t.moveTo(60,82);t.quadraticCurveTo(92,84,118,70);ink(t,1.5,'rgba(42,33,48,.3)');poly(t,[98,72,102,78,106,72,110,77,114,70]);t.fillStyle='#fbf5e6';t.fill();ink(t,1.5);
    circ(t,104,58,4);t.fillStyle=INK;t.fill();circ(t,105,57,1.4);t.fillStyle='#fff';t.fill();poly(t,[60,84,70,94,74,84]);fi(t,'#b98f4a',2);}}],
  clips:{swim:osc(.6,{tail:{r:[.3]},fin:{r:[.06,1]},body:{r:[.03,2]}},.1),
    up:still({body:{r:-.35},tail:{r:.35},fin:{r:.1}},.12),down:still({body:{r:.35},tail:{r:-.25},fin:{r:-.1}},.2),
    flop:osc(.45,{body:{r:[.12]},tail:{r:[.5,1]},fin:{r:[.15,2]}},.1)}});
// beetles: the Shell Scarab and the Clockwork Beetle (layers.js) share a body: legs, a head and a shell that lifts to show the soft glowing inside
function beetleRig(k,o){const legs=[34,52,70].map((x,i)=>({n:'leg'+i,at:[x,60],up:'root',wob:0,paint:t=>{t.beginPath();t.moveTo(x,60);t.lineTo(x-6,76);ink(t,4,o.leg);}}));
  const parts=[{n:'root',at:[56,74]},...legs,
    {n:'belly',at:[52,56],up:'root',wob:0,paint:t=>{t.beginPath();t.ellipse(52,55,33,9,0,0,6.28);fi(t,'#ffe58a',2.5);for(const x of[36,52,68]){t.beginPath();t.moveTo(x,49);t.lineTo(x,61);ink(t,1.5,'rgba(176,128,26,.6)');}}},
    {n:'head',at:[86,54],up:'root',paint:t=>{poly(t,[84,44,104,40,108,52,100,62,84,60]);fi(t,o.head,3);if(o.horn){poly(t,[100,42,110,24,106,44]);fi(t,'#f1c04f',2);}circ(t,98,48,o.horn?2.8:3.2);t.fillStyle='#ffd66b';t.fill();}},
    {n:'shell',at:[16,64],up:'root',paint:t=>{t.beginPath();t.moveTo(14,64);t.bezierCurveTo(12,14,92,10,90,64);t.closePath();fi(t,o.shell,3.5);if(o.horn){t.beginPath();t.moveTo(52,19);t.lineTo(52,64);ink(t,2.5);}
      t.beginPath();t.moveTo(14,64);t.lineTo(90,64);ink(t,4,o.band);if(o.horn)for(const[x,y]of[[34,36],[68,34],[40,52],[64,52]]){circ(t,x,y,4);t.fillStyle='rgba(255,255,255,.25)';t.fill();}}}];
  if(!o.horn)parts.push({n:'gear',at:[52,44],up:'shell',wob:0,paint:t=>{gearP(t,52,44,13,7);fi(t,'#e0b04a',2);circ(t,52,44,4);t.fillStyle='#6b5234';t.fill();}},
    {n:'key',at:[44,18],up:'shell',wob:0,paint:t=>{t.save();t.translate(44,18);rr(t,-3,-14,6,16,2);fi(t,'#a9adb8',2);t.beginPath();t.ellipse(-8,-16,7,5,0,0,6.28);t.ellipse(8,-16,7,5,0,0,6.28);fi(t,'#c9a24a',2);t.restore();}});
  const walk=osc(.4,{leg0:{r:[.35]},leg1:{r:[.35,3.14]},leg2:{r:[.35]},shell:{y:[.8,0,0,2]},head:{y:[.8,0,0,2]}},.1),idle=osc(1.6,{shell:{sy:[.015]},head:{r:[.04,1]}},.15),
    wind=osc(.16,{shell:{r:[.02,0,.06],sy:[.01,0,.94]},head:{r:[.03,0,.15],x:[1,0,-3]},leg0:{r:[.05,0,-.3]},leg1:{r:[.05,1,-.3]},leg2:{r:[.05,2,-.3]}},.1),
    dash=osc(.18,{leg0:{r:[.45]},leg1:{r:[.45,3.14]},leg2:{r:[.45]},shell:{r:[.02,0,-.04]},head:{r:[.02,0,-.1]}},.06),open=still({shell:{r:-.55},head:{r:-.25,y:2}},.12);
  // the wind-up key turns (seen edge-on as it goes round) and the gear on the shell spins
  if(!o.horn){for(const[c,n]of[[walk,1],[idle,.5],[wind,2],[dash,2],[open,.25]]){if(!c.len)Object.assign(c,{len:4,loop:1});spin(c,'gear',Math.PI*2/7*Math.ceil(c.len*n*3));c.tr.key={sx:osc(c.len,{k:{sx:[1,0,0,Math.max(1,Math.round(c.len*n))]}}).tr.k.sx};}}
  defRig(k,{w:112,h:80,parts,clips:{idle,walk,wind,dash,open}});}
beetleRig('scarab',{leg:INK,head:'#2c5763',shell:'#3f7a8a',band:'#f1c04f',horn:1});
beetleRig('clockbug',{leg:'#4a3a26',head:'#6b5234',shell:'#b08a4a',band:'#6b5234'});
defRig('sunkite',{w:112,h:80,oy:40,parts:[{n:'root',at:[56,40]},
  {n:'tail',at:[30,40],up:'kite',wob:0,paint:t=>{t.beginPath();t.moveTo(30,40);t.quadraticCurveTo(18,40,8,34);t.quadraticCurveTo(0,30,4,44);ink(t,2.5,'#d4483b');for(const[x,y]of[[18,40],[8,36]]){poly(t,[x-4,y-4,x+4,y+4,x+4,y-4,x-4,y+4]);fi(t,'#f1c04f',1.5);}}},
  {n:'kite',at:[70,40],up:'root',paint:t=>{poly(t,[30,40,70,6,106,40,70,74]);fi(t,'#f1c04f',3.5);poly(t,[70,6,106,40,70,40]);t.fillStyle='#d4483b';t.fill();ink(t,3);poly(t,[30,40,70,74,70,40]);t.fillStyle='#e0823d';t.fill();ink(t,3);
    t.beginPath();t.moveTo(30,40);t.lineTo(106,40);t.moveTo(70,6);t.lineTo(70,74);ink(t,1.6,'rgba(42,33,48,.45)');circ(t,80,32,3.4);t.fillStyle=INK;t.fill();circ(t,92,32,3.4);t.fill();t.beginPath();t.arc(86,46,4,.2,2.9);ink(t,2);}}],
  clips:{fly:osc(.7,{tail:{r:[.28],sy:[.25,1.2]},kite:{r:[.05,1],sx:[.03,2]}},.1),wind:still({kite:{sx:.88,sy:1.08,r:-.1},tail:{r:-.45}},.12),dive:still({kite:{sx:1.06,sy:.94},tail:{r:.4,sy:1.3}},.08)}});

// Snowfield: the Snow Roller and Snowlet (hopping snowballs with a carrot nose), the Frost Puff and the Flurry
function snowRig(k,w,h){const cx=w/2,r=Math.min(w,h)*.4,cy=h-6-r;
  defRig(k,{w,h,parts:[{n:'root',at:[cx,h-6]},
    {n:'body',at:[cx,h-6],up:'root',wob:0,paint:t=>{t.beginPath();t.ellipse(cx,cy,r,r,0,0,6.28);fi(t,'#f6f9fb',3);t.beginPath();t.ellipse(cx-r*.35,cy-r*.4,r*.22,r*.14,-.5,0,6.28);t.fillStyle='rgba(174,224,242,.6)';t.fill();
      t.beginPath();t.moveTo(cx-r*.6,cy+r*.5);t.quadraticCurveTo(cx,cy+r*.8,cx+r*.5,cy+r*.6);ink(t,1.2,'rgba(42,33,48,.25)');}},
    {n:'face',at:[cx+r*.3,cy],up:'body',v:['','blink'],wob:.015,paint:(t,s,v)=>{for(const ex of[cx+r*.12,cx+r*.42])eyeDot(t,ex,cy-r*.14,r*.08+1,v);poly(t,[cx+r*.3,cy+r*.04,cx+r*1.05,cy+r*.16,cx+r*.3,cy+r*.28]);fi(t,'#e0823d',1.5);}}],
    clips:{idle:blinkAt(osc(1.8,{body:{sx:[.02],sy:[-.02]}},.12),'face',1.3),crouch:still({body:{sx:1.12,sy:.85},face:{y:2}},.08),air:still({body:{sx:.93,sy:1.08}},.08)}});}
snowRig('snowroll',96,96);snowRig('snowlet',64,56);
defRig('frostpuff',{w:96,h:96,oy:48,parts:[{n:'root',at:[48,48]},
  {n:'spikes',at:[48,48],up:'root',wob:0,paint:t=>{t.translate(48,48);for(let i=0;i<10;i++){const a=i/10*6.283;poly(t,[Math.cos(a-.16)*24,Math.sin(a-.16)*24,Math.cos(a)*40,Math.sin(a)*40,Math.cos(a+.16)*24,Math.sin(a+.16)*24]);fi(t,'#aee0f2',2);}}},
  {n:'body',at:[48,48],up:'root',v:['','blink'],paint:(t,s,v)=>{circ(t,48,48,27);fi(t,'#dff2fa',3);circ(t,40,38,7);t.fillStyle='rgba(255,255,255,.7)';t.fill();eyeDot(t,56,45,3.4,v);eyeDot(t,66,45,3.4,v);circ(t,62,57,4);ink(t,2);}}],
  clips:{fly:blinkAt(spin(osc(3,{body:{sx:[.03,0,1,2],sy:[-.03,0,1,2]}},.12),'spikes',Math.PI*2/10*2),'body',2.2),
    puff:spin(osc(.3,{body:{sx:[.04,0,1.08],sy:[.04,0,1.08]},spikes:{sx:[.05,1,1.15],sy:[.05,1,1.15]}},.15),'spikes',Math.PI*2/10)}});
defRig('flurry',{w:80,h:80,oy:40,parts:[{n:'root',at:[40,40]},
  {n:'arms',at:[40,40],up:'root',wob:0,paint:t=>{t.translate(40,40);for(let i=0;i<6;i++){t.save();t.rotate(i/6*Math.PI*2);poly(t,[-4,0,4,0,3,-30,-3,-30]);fi(t,'#f6f9fb',2);poly(t,[0,-20,-8,-28,0,-24,8,-28]);fi(t,'#e6f1f7',1.5);t.restore();}}},
  {n:'core',at:[40,40],up:'root',v:['','blink'],paint:(t,s,v)=>{circ(t,40,40,12);fi(t,'#e6f1f7',2.5);if(v){t.beginPath();t.moveTo(34,38);t.lineTo(38,38);t.moveTo(42,38);t.lineTo(46,38);ink(t,1.5);}else{circ(t,36,38,2);t.fillStyle=INK;t.fill();circ(t,44,38,2);t.fill();}t.beginPath();t.arc(40,43,3,.2,2.9);ink(t,1.5);}}],
  clips:{fly:blinkAt(spin(osc(2,{core:{y:[1.5,0,0,2],r:[.1,1]}},.1),'arms',Math.PI*2/6*2),'core',1.4)}});

// Ink Lake: the Ink Wisp (a flame of ink with a tail and an eye that watches you), the Quillfish and the Ink Squid
defRig('inkwisp',{w:80,h:96,oy:48,parts:[{n:'root',at:[40,48]},
  {n:'tail',at:[36,72],up:'body',paint:t=>{t.beginPath();t.moveTo(46,70);t.quadraticCurveTo(30,84,36,94);t.quadraticCurveTo(14,84,20,62);t.closePath();fi(t,'#3a2a5a',3);}},
  {n:'body',at:[40,60],up:'root',paint:t=>{t.beginPath();t.moveTo(40,8);t.bezierCurveTo(72,36,70,70,44,78);t.quadraticCurveTo(26,82,18,62);t.bezierCurveTo(12,40,30,26,40,8);t.closePath();fi(t,'#3a2a5a',3);
    t.beginPath();t.moveTo(40,24);t.bezierCurveTo(58,42,58,62,44,70);t.bezierCurveTo(30,64,28,44,40,24);t.fillStyle='#8a5fc0';t.fill();circ(t,48,50,9);fi(t,'#f4f0e6',2);}},
  {n:'iris',at:[51,50],up:'body',wob:0,paint:t=>{circ(t,51,50,4.5);t.fillStyle=INK;t.fill();circ(t,49,47,1.6);t.fillStyle='#fff';t.fill();}}],
  clips:{fly:osc(.9,{tail:{r:[.3]},body:{r:[.04,1],sy:[.03,2]}},.1),aim:still({body:{sy:1.08,sx:.93},tail:{r:-.35}},.1),strike:still({body:{r:.25,sx:1.1,sy:.9},tail:{r:.5}},.06)}});
defRig('quillfish',{w:96,h:72,parts:[{n:'root',at:[52,55]},
  {n:'tail',at:[20,36],up:'body',paint:t=>{poly(t,[20,36,4,20,8,36,4,52]);fi(t,'#35557f',3);}},
  {n:'quills',at:[52,26],up:'body',wob:0,paint:t=>{for(let k=0;k<4;k++){const x=36+k*11;poly(t,[x,26,x+4,6+k*2,x+9,24]);fi(t,'#f4f0e6',1.8);}}},
  {n:'body',at:[52,40],up:'root',paint:t=>{t.beginPath();t.ellipse(52,38,34,17,0,0,6.28);fi(t,'#4a6fa0',3);t.beginPath();t.ellipse(54,44,26,8,0,0,3.14);t.fillStyle='#f4f0e6';t.fill();
    circ(t,72,32,5);fi(t,'#fbf5e6',1.5);circ(t,74,32,2.4);t.fillStyle=INK;t.fill();t.beginPath();t.moveTo(84,40);t.lineTo(78,42);ink(t,2);}},
  {n:'fin',at:[54,44],up:'body',paint:t=>{poly(t,[48,42,58,58,62,42]);fi(t,'#35557f',2);}}],
  clips:{swim:osc(.5,{tail:{r:[.35]},fin:{r:[.3,1]},body:{r:[.03,2]},quills:{sy:[.05,2]}},.1),air:still({body:{r:-.25},quills:{sy:1.25},tail:{r:.3},fin:{r:-.3}},.1),
    flop:osc(.35,{body:{r:[.15]},tail:{r:[.6,1]},fin:{r:[.4,2]},quills:{sy:[.15,0,1.1]}},.1)}});
defRig('inksquid',{w:96,h:96,oy:48,parts:[{n:'root',at:[58,48]},
  ...[0,1,2,3].map(k=>({n:'ten'+k,at:[42,40+k*6],up:'body',wob:0,paint:t=>{t.beginPath();t.moveTo(42,40+k*6);t.quadraticCurveTo(20,36+k*8,6,44+k*6);ink(t,6,'#4a3570');}})),
  {n:'body',at:[58,48],up:'root',paint:t=>{t.beginPath();t.ellipse(58,48,28,17,0,0,6.28);fi(t,'#6b4c8f');poly(t,[80,40,94,48,80,56]);fi(t,'#8a5fc0',2);circ(t,64,44,5);fi(t,'#f4f0e6',1.5);circ(t,66,44,2.5);t.fillStyle=INK;t.fill();circ(t,50,40,4);t.fillStyle='rgba(255,255,255,.35)';t.fill();}}],
  clips:{swim:osc(.8,{body:{sx:[.06],sy:[-.05]},ten0:{r:[.3]},ten1:{r:[.3,.8]},ten2:{r:[.3,1.6]},ten3:{r:[.3,2.4]}},.1),
    dry:osc(1.4,{body:{sy:[.03,0,.94],sx:[.02,0,1.05]},ten0:{r:[.05,0,.35]},ten1:{r:[.05,1,.2]},ten2:{r:[.05,2,-.1]},ten3:{r:[.05,3,-.3]}},.2)}});
// the Fold Fox (Origami Snowfield): four legs, a folded body, a tail and a head with an ear that twitches
defRig('foldfox',{w:128,h:96,parts:[{n:'root',at:[64,90]},
  ...[[40,'legH0'],[52,'legH1'],[80,'legF0'],[92,'legF1']].map(([x,n])=>({n,at:[x,62],up:'body',wob:0,paint:t=>{poly(t,[x-4,62,x+4,62,x+2,90,x-4,90]);fi(t,x<60?'#b8612a':'#e0823d',2);}})),
  {n:'body',at:[64,60],up:'root',wob:.006,paint:t=>{poly(t,[26,60,40,40,88,38,104,56,90,66,36,68]);fi(t,'#e0823d');poly(t,[60,66,88,40,90,66]);fi(t,'#f4f0e6',2);t.beginPath();t.moveTo(40,40);t.lineTo(60,66);t.moveTo(88,38);t.lineTo(74,66);ink(t,1.4,'rgba(42,33,48,.35)');}},
  {n:'tail',at:[30,54],up:'body',paint:t=>{poly(t,[26,58,4,20,12,18,34,48]);fi(t,'#e0823d');poly(t,[4,20,12,18,14,30]);fi(t,'#f4f0e6',2);}},
  {n:'head',at:[96,48],up:'body',paint:t=>{poly(t,[90,40,104,20,110,36,124,48,104,56]);fi(t,'#e0823d');poly(t,[124,48,112,52,116,44]);fi(t,INK,1.5);circ(t,108,38,2.6);t.fillStyle=INK;t.fill();}},
  {n:'ear',at:[108,24],up:'head',paint:t=>{poly(t,[104,20,108,8,112,26]);fi(t,'#b8612a',2);}}],
  clips:{idle:swk(osc(2.4,{tail:{r:[.12]},head:{r:[.04,1]},body:{sy:[.012,2]}},.15),'ear',[[0,'']]),
    run:osc(.45,{legH0:{r:[.5]},legH1:{r:[.5,.6]},legF0:{r:[.5,3.14]},legF1:{r:[.5,3.74]},body:{r:[.05,1.57]},root:{y:[2,1.57,-1,2]},tail:{r:[.2,1]},head:{r:[.05,2]}},.1),
    wind:still({root:{y:3},body:{r:.1},head:{r:.14},ear:{r:-.3},tail:{r:-.45},legF0:{r:-.5},legF1:{r:-.4},legH0:{r:.4},legH1:{r:.3}},.12),
    air:still({legF0:{r:-.8},legF1:{r:-.7},legH0:{r:.8},legH1:{r:.7},tail:{r:.25},body:{r:-.12},ear:{r:.3}},.1)}});
RIGS.foldfox.clips.idle.tr.ear.r=[[0,0,'io'],[1.6,0,'io'],[1.7,-.35,'io'],[1.85,0],[2.4,0]];

// Burnt Underworld: the Firecracker Imp (a lit fuse on legs), the Ash Spider (drops from the ceiling) and the Ink Wraith
defRig('cracker',{w:80,h:112,parts:[{n:'root',at:[39,108]},
  ...[[30,'legB'],[48,'legA']].map(([x,n])=>({n,at:[x,90],up:'root',wob:0,paint:t=>{rr(t,x-5,88,10,20,4);fi(t,'#3a2a24',2);}})),
  {n:'body',at:[39,90],up:'root',paint:t=>{rr(t,18,30,42,62,8);fi(t,'#d4483b',3.5);t.fillStyle='#f1c04f';t.fillRect(20,42,38,6);t.fillRect(20,74,38,6);rr(t,16,24,46,12,5);fi(t,'#ffd66b',3);
    for(const ex of[44,54]){circ(t,ex,58,3.2);t.fillStyle='#ffd66b';t.fill();ink(t,1.5);}t.beginPath();t.moveTo(38,50);t.lineTo(47,53);t.moveTo(60,50);t.lineTo(51,53);ink(t,2.4);}},
  {n:'fuse',at:[39,24],up:'body',paint:t=>{t.beginPath();t.moveTo(39,24);t.quadraticCurveTo(34,12,46,6);ink(t,3,'#5a3a22');}},
  {n:'spark',at:[46,6],up:'fuse',wob:0,paint:t=>{const s=7;poly(t,[46,6-s,48,4,46+s,6,48,8,46,6+s,44,8,46-s,6,44,4]);t.fillStyle='#ffd66b';t.fill();}}],
  clips:{idle:osc(.3,{spark:{sx:[.25],sy:[.25],r:[.3,1]},body:{sy:[.01,0,1]}},.1),
    walk:osc(.3,{legA:{r:[.4]},legB:{r:[.4,3.14]},body:{r:[.05,1.57],y:[1,0,0,2]},fuse:{r:[.12,2]},spark:{sx:[.3],sy:[.3,.5]}},.1),
    fuse:osc(.12,{body:{x:[1.5],sy:[.03,1,.97]},fuse:{r:[.15]},spark:{sx:[.5,0,1.5],sy:[.5,1,1.5]}},.06)}});
defRig('ashspider',{w:112,h:72,parts:[{n:'root',at:[56,66]},
  ...[0,1,2,3].map(k=>{const x=40+k*14;return{n:'leg'+k,at:[x,44],up:'root',wob:0,paint:t=>{t.beginPath();t.moveTo(x,44);t.lineTo(x-8,24);t.lineTo(x-14,66);ink(t,4,'#1e1614');}};}),
  {n:'abdomen',at:[48,44],up:'root',paint:t=>{t.beginPath();t.ellipse(38,42,26,20,0,0,6.28);fi(t,'#3a2a24',3);poly(t,[30,34,38,26,46,34,38,50]);t.fillStyle='#ff8a3d';t.fill();}},
  {n:'head',at:[64,46],up:'root',paint:t=>{circ(t,74,46,14);fi(t,'#2a1e1a',3);for(const[x,y]of[[78,42],[86,44],[80,50]]){circ(t,x,y,2.6);t.fillStyle='#ffd66b';t.fill();}}}],
  clips:{idle:osc(1.2,{abdomen:{sy:[.03]},head:{r:[.04,1]}},.12),walk:osc(.3,{leg0:{r:[.3]},leg1:{r:[.3,3.14]},leg2:{r:[.3]},leg3:{r:[.3,3.14]},abdomen:{y:[1,1.57,0,2]}},.08),
    hang:osc(1.6,{leg0:{r:[.06,0,.5]},leg1:{r:[.06,1,.3]},leg2:{r:[.06,2,-.3]},leg3:{r:[.06,3,-.5]},abdomen:{sy:[.02,0,.95]}},.15),drop:still({leg0:{r:-.45},leg1:{r:-.2},leg2:{r:.2},leg3:{r:.45}},.08)}});
// the wraith's robe is two pieces: the tattered hem behind (its points ripple) and the hood and body in front
const hem=w=>t=>{t.beginPath();t.moveTo(20,80);t.lineTo(76,80);t.lineTo(76,112);for(let x=76;x>=20;x-=14){t.quadraticCurveTo(x-7,112+(((x/14)|0)%2?10:-2)+w*.5,x-14,112);}t.closePath();fi(t,'#3a1a4a',3);};
defRig('wraith',{w:96,h:128,oy:64,parts:[{n:'root',at:[48,64]},
  {n:'hem',at:[48,84],up:'body',v:['','b'],paint:(t,s,v)=>hem(v?6:-6)(t)},
  {n:'body',at:[48,60],up:'root',paint:t=>{t.beginPath();t.moveTo(20,100);t.quadraticCurveTo(14,40,48,14);t.quadraticCurveTo(82,40,76,100);t.quadraticCurveTo(48,108,20,100);t.closePath();fi(t,'#3a1a4a',3);
    t.beginPath();t.moveTo(30,60);t.quadraticCurveTo(48,30,66,60);ink(t,2,'rgba(200,150,255,.35)');t.beginPath();t.ellipse(49,72,6,4,0,0,6.28);t.fillStyle='#1a0a24';t.fill();}},
  {n:'eyes',at:[49,52],up:'body',v:['','blink'],wob:0,paint:(t,s,v)=>{for(const x of[40,58]){t.beginPath();t.ellipse(x,52,5,v?1.5:7,0,0,6.28);t.fillStyle='#e0b0ff';t.fill();}}}],
  clips:{fly:swk(blinkAt(osc(1,{hem:{r:[.06],x:[2,1]},body:{r:[.03,2]},eyes:{sy:[.08,0,1,2]}},.12),'eyes',.7),'hem',[[0,''],[.25,'b'],[.5,''],[.75,'b'],[1,'b']])}});
// the Paper Ray (sky islands): wings that beat above and below a long body, and a thread of a tail
defRig('skyray',{w:128,h:80,oy:40,parts:[{n:'root',at:[64,44]},
  {n:'tail',at:[18,44],up:'body',paint:t=>{t.beginPath();t.moveTo(18,44);t.quadraticCurveTo(4,50,2,62);ink(t,2.5,'#6a7fb8');}},
  {n:'wingT',at:[60,40],up:'body',paint:t=>{t.beginPath();t.moveTo(30,44);t.quadraticCurveTo(52,30,64,6);t.quadraticCurveTo(76,30,96,40);t.closePath();fi(t,'#dfe7fb',3);t.beginPath();t.moveTo(42,40);t.quadraticCurveTo(60,22,64,14);ink(t,1.4,'rgba(42,33,48,.3)');}},
  {n:'wingB',at:[56,52],up:'body',paint:t=>{t.beginPath();t.moveTo(34,50);t.lineTo(80,54);t.quadraticCurveTo(64,74,40,70);t.quadraticCurveTo(34,60,34,50);t.closePath();fi(t,'#dfe7fb',3);t.beginPath();t.moveTo(46,54);t.quadraticCurveTo(52,62,48,66);ink(t,1.4,'rgba(42,33,48,.3)');}},
  {n:'body',at:[64,46],up:'root',paint:t=>{t.beginPath();t.moveTo(18,44);t.quadraticCurveTo(50,34,80,36);t.quadraticCurveTo(120,38,124,46);t.quadraticCurveTo(100,56,78,56);t.quadraticCurveTo(46,56,18,44);t.closePath();fi(t,'#dfe7fb',3);
    t.beginPath();t.moveTo(78,42);t.quadraticCurveTo(100,40,122,46);ink(t,1.4,'rgba(42,33,48,.3)');circ(t,104,42,3.2);t.fillStyle=INK;t.fill();circ(t,113,43,3);t.fill();t.beginPath();t.arc(108,49,3.5,.3,2.8);ink(t,1.8);
    for(const[x,y]of[[70,44],[86,48]]){circ(t,x,y,3);t.fillStyle='#8fd0ff';t.fill();}}}],
  clips:{fly:osc(.9,{wingT:{sy:[.35,0,.75]},wingB:{sy:[.35,3.14,.75]},tail:{r:[.2,1]},body:{r:[.03,1.57]}},.1),wind:still({wingT:{sy:1.15},wingB:{sy:.4},tail:{r:-.3}},.12),dive:still({wingT:{sy:.45},wingB:{sy:.45},tail:{r:.4}},.08)}});

// ================= boss rigs =================
// The Great Crane: a back wing, tail, body, neck, head and the front wing. The wings beat by folding over the shoulder
// line (sy through 0 is the wing edge-on), which is how the old up/down frames read.
{const cx=170,cy=140,wing=(dx,col,crease)=>t=>{poly(t,[cx-30+dx,cy-14,cx+40+dx,cy-16,cx-10+dx,cy-126,cx-96+dx,cy-110]);fi(t,col,4);if(crease){t.beginPath();t.moveTo(cx+5+dx,cy-15);t.lineTo(cx-40+dx,cy-112);ink(t,2,'rgba(42,33,48,.25)');}};
defRig('crane',{w:360,h:240,oy:120,parts:[{n:'root',at:[cx,cy]},
  {n:'wingB',at:[cx-15,cy-12],up:'body',paint:wing(-20,'#b9cfe0')},
  {n:'tail',at:[cx-64,cy+4],up:'body',paint:t=>{poly(t,[cx-60,cy,cx-156,cy-72,cx-132,cy-38,cx-68,cy+14]);fi(t,'#dce8f0',4);}},
  {n:'body',at:[cx,cy],up:'root',wob:.006,paint:t=>{poly(t,[cx-72,cy,cx,cy-32,cx+62,cy,cx,cy+32]);fi(t,'#f4f0e6',4);t.beginPath();t.moveTo(cx-72,cy);t.lineTo(cx+62,cy);ink(t,2,'rgba(42,33,48,.3)');}},
  {n:'neck',at:[cx+48,cy],up:'body',paint:t=>{poly(t,[cx+40,cy-8,cx+120,cy-80,cx+130,cy-72,cx+56,cy+6]);fi(t,'#f4f0e6',4);}},
  {n:'head',at:[cx+124,cy-76],up:'neck',paint:t=>{poly(t,[cx+118,cy-84,cx+160,cy-64,cx+126,cy-66]);fi(t,'#f1c04f',3);circ(t,cx+120,cy-86,6);fi(t,'#d4483b',2.5);circ(t,cx+126,cy-74,3);t.fillStyle=INK;t.fill();}},
  {n:'wingA',at:[cx+19,cy-12],up:'body',paint:wing(14,'#e6f1f7',1)}],
  clips:{fly:osc(.75,{wingA:{sy:[.95,1.57,.1]},wingB:{sy:[.95,1.97,.1]},neck:{r:[.05,1.57]},head:{r:[.06,2.5]},tail:{r:[.05,1]},root:{y:[5,1.57]}},.15),
    wind:osc(.2,{wingA:{sy:[.04,0,1.1],r:[.02,0,-.15]},wingB:{sy:[.04,1,1.1],r:[.02,1,-.1]},neck:{r:[.03,0,-.35]},head:{r:[.03,1,-.2]},tail:{r:[.02,0,.1]}},.15),
    swoop:still({wingA:{sy:.22,r:.35},wingB:{sy:.22,r:.3},neck:{r:.3},head:{r:.15},tail:{r:-.1}},.1),
    volley:osc(.35,{wingA:{sy:[.35,0,.8]},wingB:{sy:[.35,.4,.8]},neck:{r:[.06]},head:{r:[.08,1]}},.1)}});}
// The Inkwell Leviathan: a head with a hinged jaw and a crest, body segments with fins, and a tail fluke. Each is its own
// enemy (gameplay turns them with the worm's angle), so each segment gets its own rig and plays a step behind the one before.
defRig('lev',{w:180,h:140,oy:70,parts:[{n:'root',at:[90,70]},
  {n:'jaw',at:[26,104],up:'head',paint:t=>{poly(t,[20,100,120,70,168,82,110,110,24,112]);fi(t,'#3a2a5a',4);}},
  {n:'head',at:[40,70],up:'root',paint:t=>{poly(t,[20,40,100,22,150,46,172,62,120,70,20,100]);fi(t,'#4a3570',4);for(let k=0;k<5;k++){poly(t,[150-k*10,62,146-k*10,72,142-k*10,62]);t.fillStyle='#f4f0e6';t.fill();}
    circ(t,118,44,9);fi(t,'#f1c04f',3);circ(t,120,44,4);t.fillStyle=INK;t.fill();}},
  {n:'crest',at:[78,24],up:'head',paint:t=>{poly(t,[60,24,80,0,96,26]);fi(t,'#8a5fc0',3);}}],
  clips:{swim:osc(.8,{jaw:{r:[.05,0,.07]},crest:{r:[.1,1]},head:{r:[.02,2]}},.12),wind:osc(.14,{jaw:{r:[.03,0,.34]},crest:{r:[.05,0,-.15]},head:{r:[.02,1,-.05]}},.1),lunge:still({jaw:{r:.2},crest:{r:.22}},.08)}});
defRig('levseg',{w:140,h:140,oy:70,parts:[{n:'root',at:[70,70]},
  {n:'finT',at:[86,28],up:'body',paint:t=>{poly(t,[70,24,90,4,104,30]);fi(t,'#8a5fc0',3);}},
  {n:'body',at:[70,70],up:'root',paint:t=>{circ(t,70,70,50);fi(t,'#4a3570',4);circ(t,70,70,34);ink(t,3,'rgba(160,130,220,.35)');circ(t,56,54,8);t.fillStyle='rgba(255,255,255,.2)';t.fill();}},
  {n:'finB',at:[50,100],up:'body',paint:t=>{poly(t,[36,98,52,128,62,102]);fi(t,'#8a5fc0',3);}}],
  clips:{swim:osc(.8,{finT:{r:[.2]},finB:{r:[.2,1.2]},body:{sx:[.03],sy:[-.03]}},.1)}});
defRig('levtail',{w:140,h:140,oy:70,parts:[{n:'root',at:[70,70]},
  {n:'fluke',at:[38,70],up:'stalk',paint:t=>{poly(t,[44,46,10,20,30,70,10,120,44,94]);fi(t,'#4a3570',4);poly(t,[10,20,30,70,10,120]);fi(t,'#8a5fc0',3);}},
  {n:'stalk',at:[104,70],up:'root',paint:t=>{poly(t,[110,70,40,40,30,70,40,100]);fi(t,'#4a3570',4);}}],
  clips:{swim:osc(.6,{fluke:{sy:[.15],r:[.15,1]},stalk:{r:[.05,2]}},.1)}});
// The Charred Folio: a burnt book. Flames rise from behind the cover, the right page lifts, a loose page turns over when it
// casts, and its eye follows you.
{const FL=[0,1,2,3,4,5,6];const flames=(a,b=1)=>Object.fromEntries(FL.map(k=>['f'+k,{sy:[a,k*1.9,b,3],r:[.05,k*1.3,0,2]}]));
const pageR=(col,lines)=>t=>{poly(t,[172,96,300,80,300,240,172,250]);fi(t,col,4);if(lines)for(const x of[196,216,256,276])for(let y=110;y<230;y+=16){t.beginPath();t.moveTo(x-8,y);t.lineTo(x+8,y+1);ink(t,1.5,'rgba(42,33,48,.25)');}};
const folio={idle:osc(1.6,{...flames(.12),pageR:{r:[.025,0,-.025]},pageL:{r:[.012,1]}},.15),
  turn:{len:.55,bl:.08,tr:{...osc(.55,flames(.18,1.1)).tr,pageR:{r:[[0,-.06]]},turn:{sw:[[0,''],[.55,'']],sx:[[0,1,'io'],[.55,-1]],r:[[0,0,'io'],[.28,-.06,'io'],[.55,0]]}}},
  fire:osc(.5,{...flames(.15,1.15),eye:{sx:[.03,0,1.15],sy:[.03,0,1.2]},pageR:{r:[.02,0,-.06]}},.1),
  rain:osc(.5,{...flames(.22,1.35),pageR:{r:[.04,0,-.08]},pageL:{r:[.03,1]}},.1)};
for(const k of['idle','fire','rain'])swk(folio[k],'turn',[[0,'-']]);
defRig('folio',{w:340,h:280,oy:140,parts:[{n:'root',at:[170,140]},
  ...FL.map(k=>{const x=40+k*42;return{n:'f'+k,at:[x+18,84],up:'cover',wob:0,paint:t=>{t.beginPath();t.moveTo(x,84);t.bezierCurveTo(x+18,60,x+10,30,x+20,6+(k%2)*14);t.bezierCurveTo(x+30,34,x+40,60,x+36,84);t.closePath();fi(t,'#ff7a2d',3);
    t.beginPath();t.moveTo(x+10,82);t.quadraticCurveTo(x+20,52,x+22,40);t.quadraticCurveTo(x+30,60,x+28,82);t.fillStyle='#ffd66b';t.fill();}};}),
  {n:'cover',at:[170,165],up:'root',wob:.004,paint:t=>{rr(t,20,70,300,190,12);fi(t,'#6b2a1a',5);}},
  {n:'pageL',at:[168,250],up:'cover',wob:.004,paint:t=>{poly(t,[40,80,168,96,168,250,40,240]);fi(t,'#e9dcc0',4);for(const x of[60,80,100,120,140])for(let y=120;y<230;y+=16){t.beginPath();t.moveTo(x-8,y);t.lineTo(x+8,y+1);ink(t,1.5,'rgba(42,33,48,.25)');}}},
  {n:'pageR',at:[172,250],up:'cover',wob:.004,paint:pageR('#e9dcc0')},
  {n:'eye',at:[236,168],up:'pageR',paint:t=>{t.beginPath();t.ellipse(236,168,40,30,0,0,6.28);fi(t,'#f4f0e6',4);}},
  {n:'iris',at:[240,168],up:'eye',wob:0,paint:t=>{circ(t,240,168,18);fi(t,'#ff8a3d',3);circ(t,242,168,8);t.fillStyle=INK;t.fill();circ(t,234,160,5);t.fillStyle='#fff';t.fill();}},
  {n:'turn',at:[172,250],up:'cover',wob:0,paint:pageR('#f4ecd8',1)},
  {n:'soot',at:[170,240],up:'cover',wob:0,paint:t=>{for(const[x,y]of[[44,236],[160,246],[296,234]]){circ(t,x,y,12);t.fillStyle='#2a1e1a';t.fill();}}}],
  clips:folio});}
// The Unfolded: a paper giant with legs, two long arms, a creased body and a head whose eyes burn brighter in its last phase
{const cx=150;
defRig('unfolded',{w:300,h:360,parts:[{n:'root',at:[cx,350]},
  ...[[122,'legL'],[178,'legR']].map(([x,n])=>({n,at:[x,252],up:'root',wob:0,paint:t=>{poly(t,[x-20,250,x+20,250,x+14,350,x-26,350]);fi(t,'#e9dcc0',5);t.beginPath();t.moveTo(x-6,250);t.lineTo(x-2,350);ink(t,2,'rgba(42,33,48,.25)');}})),
  ...[[-1,'armL'],[1,'armR']].map(([s2,n])=>({n,at:[cx+s2*72,126],up:'torso',paint:t=>{poly(t,[cx+s2*70,120,cx+s2*118,150,cx+s2*122,250,cx+s2*96,255,cx+s2*80,170]);fi(t,'#e9dcc0',5);}})),
  {n:'torso',at:[cx,258],up:'root',wob:.004,paint:t=>{poly(t,[cx-76,110,cx+76,110,cx+60,262,cx-60,262]);fi(t,'#f4f0e6',5);for(let y=130;y<250;y+=16){t.beginPath();t.moveTo(cx-50,y);t.lineTo(cx+50,y+2);ink(t,1.5,'rgba(42,33,48,.2)');}
    t.beginPath();t.moveTo(cx-76,110);t.lineTo(cx+60,262);t.moveTo(cx+76,110);t.lineTo(cx-60,262);ink(t,2,'rgba(42,33,48,.2)');}},
  {n:'head',at:[cx,108],up:'torso',v:['','glare'],paint:(t,s,v)=>{poly(t,[cx-50,20,cx+50,20,cx+56,104,cx-56,104]);fi(t,'#f4f0e6',5);poly(t,[cx+50,20,cx+56,104,cx+40,60]);t.fillStyle='#d9ccb4';t.fill();
    for(const ex of[cx-20,cx+18]){t.beginPath();t.ellipse(ex,64,11,v?6:8,0,0,6.28);t.fillStyle='#2a1a3a';t.fill();circ(t,ex+2,64,v?5:4);t.fillStyle=v?'#ff7ab0':'#e0b0ff';t.fill();}
    t.beginPath();t.moveTo(cx-24,90);t.lineTo(cx-8,84);t.lineTo(cx+8,92);t.lineTo(cx+24,84);ink(t,3);}}],
  clips:{idle:osc(2.2,{torso:{sy:[.015]},head:{y:[2,1],r:[.03,2]},armL:{r:[.05]},armR:{r:[-.05]}},.2),
    walk:osc(1.1,{legL:{r:[.22]},legR:{r:[.22,3.14]},armL:{r:[.15,3.14]},armR:{r:[.15,3.14]},torso:{r:[.02,1.57],y:[3,1.57,0,2]},head:{r:[.03,2]}},.2),
    wind:still({torso:{y:8,sy:.95},armL:{r:.6},armR:{r:-.6},head:{y:4,r:.05},legL:{r:-.08},legR:{r:.08}},.15),
    leap:still({armL:{r:2.4},armR:{r:-2.4},legL:{r:.25},legR:{r:-.25},head:{r:-.05}},.12),
    volley:osc(.28,{armR:{r:[.3,0,-1.6]},armL:{r:[.08,0,.3]},torso:{r:[.02,0,-.03]}},.08),
    shred:osc(.15,{armL:{r:[.2,0,2.2]},armR:{r:[.2,1.5,-2.2]},torso:{x:[2]}},.1),
    fold:still({armL:{r:-.55},armR:{r:.55},head:{y:10}},.2)}});}
// The Mainspring (the Folded Clocktower's boss): the gear rim turns, the hands keep time (gameplay sets them), the pupils
// follow you and the mouth opens to chime
{const cx=120,cy=120,hand=(l,w,col)=>t=>{t.save();t.translate(cx,cy);poly(t,[-w,0,0,-l,w,0,0,w*1.5]);fi(t,col,2.5);t.restore();};
defRig('mainspring',{w:240,h:240,oy:120,parts:[{n:'root',at:[cx,cy]},
  {n:'rim',at:[cx,cy],up:'root',wob:0,paint:t=>{gearP(t,cx,cy,108,16);fi(t,'#b08a4a',4);gearP(t,cx,cy,96,16);t.fillStyle='rgba(255,230,160,.25)';t.fill();}},
  {n:'face',at:[cx,cy],up:'root',wob:.004,paint:t=>{circ(t,cx,cy,84);fi(t,'#f4ecd8',4);for(let k=0;k<12;k++){const a=k/12*Math.PI*2;t.beginPath();t.moveTo(cx+Math.cos(a)*70,cy+Math.sin(a)*70);t.lineTo(cx+Math.cos(a)*(k%3?78:80),cy+Math.sin(a)*(k%3?78:80));ink(t,k%3?3:6);}}},
  {n:'eyes',at:[cx,98],up:'face',v:['','blink'],paint:(t,s,v)=>{for(const[ex,ey]of[[92,98],[148,98]]){t.beginPath();t.ellipse(ex,ey,11,v?3:15,0,0,6.28);fi(t,'#fbf8f0',2.5);}}},
  {n:'pupils',at:[cx,101],up:'eyes',wob:0,paint:t=>{for(const ex of[96,152]){circ(t,ex,101,6);t.fillStyle=INK;t.fill();}}},
  {n:'brows',at:[cx,84],up:'face',paint:t=>{t.beginPath();t.moveTo(78,78);t.lineTo(104,88);t.moveTo(162,78);t.lineTo(136,88);ink(t,5);}},
  {n:'mouth',at:[cx,160],up:'face',v:['','open'],paint:(t,s,v)=>{if(v){t.beginPath();t.ellipse(cx,160,16,12,0,0,6.28);fi(t,'#3a2a24',3);return;}t.beginPath();t.arc(cx,cy+46,16,Math.PI+.4,-.4);ink(t,4);}},
  {n:'handH',at:[cx,cy],up:'face',wob:0,paint:hand(44,7,'#6b5234')},
  {n:'handM',at:[cx,cy],up:'face',wob:0,paint:hand(64,5,'#d4483b')},
  {n:'cap',at:[cx,cy],up:'face',wob:0,paint:t=>{circ(t,cx,cy,9);fi(t,'#c9a24a',2.5);}}],
  clips:{idle:blinkAt(osc(2.4,{face:{r:[.015]},brows:{y:[1.5,1]}},.15),'eyes',1.7),wind:still({brows:{y:6},eyes:{sy:.8},face:{sx:1.04,sy:1.04}},.1),
    chime:swk(osc(.3,{face:{sx:[.03,0,1.05],sy:[.03,0,1.05]},brows:{y:[2,0,-4]}},.1),'mouth',[[0,'open']])}});}
// The Bookmoth (the Hollow Archive's boss), seen from the side like the crane: two pairs of wings cut from book pages
// (lines of script, a blot for an eyespot) that flap by folding edge-on, a banded body like a book's spine, feathery quill
// antennae and big eyes that blink
{const cx=150,cy=120,page=(pts,col,spot)=>t=>{poly(t,pts);fi(t,col,4);t.save();t.clip();t.fillStyle='rgba(42,33,48,.35)';
    const[x0,y0,x1,y1]=[Math.min(...pts.filter((v,i)=>!(i%2))),Math.min(...pts.filter((v,i)=>i%2)),Math.max(...pts.filter((v,i)=>!(i%2))),Math.max(...pts.filter((v,i)=>i%2))];
    for(let y=y0+10;y<y1;y+=9)t.fillRect(x0+8,y,(x1-x0)*(.45+.4*Math.abs(Math.sin(y*.7))),2);t.restore();
    if(spot){circ(t,spot[0],spot[1],spot[2]);fi(t,'#3a2a5a',3);circ(t,spot[0]+2,spot[1]-2,spot[2]*.4);t.fillStyle='#e0b0ff';t.fill();}};
defRig('bookmoth',{w:300,h:220,oy:110,parts:[{n:'root',at:[cx,cy]},
  {n:'hindB',at:[cx-6,cy+4],up:'root',paint:page([cx-6,cy+4,cx-92,cy+44,cx-70,cy+80,cx-20,cy+72,cx+14,cy+14],'#cdbfa6')},
  {n:'wingB',at:[cx-2,cy-12],up:'root',paint:page([cx-2,cy-12,cx-112,cy-96,cx-54,cy-110,cx+2,cy-104,cx+34,cy-22],'#d9ccb4')},
  {n:'body',at:[cx,cy],up:'root',wob:.006,paint:t=>{t.beginPath();t.ellipse(cx-6,cy+4,62,20,.08,0,6.28);fi(t,'#6b5a78',4);
    for(const x of[-44,-26,-8,10])t.fillStyle='#c9a24a',t.fillRect(cx+x,cy-12+(x<0?2:0),6,30);t.beginPath();t.ellipse(cx-6,cy+4,62,20,.08,0,6.28);ink(t,4);}},
  {n:'head',at:[cx+54,cy-4],up:'body',wob:.01,paint:t=>{for(const[a,l]of[[-1.1,58],[-.75,50]]){const ex=cx+60+Math.cos(a)*l,ey=cy-14+Math.sin(a)*l;t.beginPath();t.moveTo(cx+60,cy-14);t.quadraticCurveTo(cx+62+Math.cos(a)*l*.5,cy-30,ex,ey);ink(t,3);
      for(let k=1;k<6;k++){const u=k/6,px=cx+60+(ex-cx-60)*u,py=cy-14+(ey-cy+14)*u;t.beginPath();t.moveTo(px,py);t.lineTo(px+7,py+3);ink(t,1.6);}}
    circ(t,cx+66,cy-2,24);fi(t,'#7a6a88',4);}},
  {n:'eyes',at:[cx+74,cy-6],up:'head',v:['','blink'],paint:(t,s,v)=>{if(v){t.beginPath();t.moveTo(cx+62,cy-6);t.lineTo(cx+86,cy-6);ink(t,4);return;}t.beginPath();t.ellipse(cx+74,cy-6,12,14,0,0,6.28);fi(t,'#2a1a3a',3);circ(t,cx+78,cy-11,4);t.fillStyle='#e0b0ff';t.fill();}},
  {n:'hindA',at:[cx+2,cy+6],up:'root',paint:page([cx+2,cy+6,cx-76,cy+52,cx-48,cy+86,cx-4,cy+76,cx+24,cy+18],'#e9dcc0',[cx-40,cy+56,9])},
  {n:'wingA',at:[cx+8,cy-12],up:'root',paint:page([cx+8,cy-12,cx-96,cy-102,cx-30,cy-116,cx+22,cy-108,cx+46,cy-22],'#fbf5e6',[cx-26,cy-74,13])}],
  clips:{fly:blinkAt(osc(.5,{wingA:{sy:[.85,0,.2]},wingB:{sy:[.85,.5,.2]},hindA:{sy:[.3,0,.85]},hindB:{sy:[.3,.5,.85]},root:{y:[6,1.57]},head:{r:[.04,1]}},.15),'eyes',.3),
    wind:osc(.16,{wingA:{sy:[.08,0,1.05]},wingB:{sy:[.08,1,1.05]},hindA:{sy:[.05]},hindB:{sy:[.05,1]},root:{r:[.02,0,-.22]}},.12),
    dive:still({wingA:{sy:.25,r:.4},wingB:{sy:.25,r:.35},hindA:{sy:.5,r:.2},hindB:{sy:.5,r:.2},root:{r:.28},head:{r:.1}},.1),
    dust:osc(.22,{wingA:{sy:[.6,0,.45]},wingB:{sy:[.6,.6,.45]},hindA:{sy:[.3,0,.8]},hindB:{sy:[.3,.6,.8]},root:{y:[3]}},.1)}});}
// The Starfold (the Origami Observatory's boss): a paper star folded from two layers of points, each point a light and a shaded
// face meeting at its crease. Gameplay turns the layers against each other; the whole star folds shut edge-on to cross the sky
{const cx=130,cy=130,ray=(R,r,rot,c1,c2)=>t=>{for(let k=0;k<5;k++){const a=rot-Math.PI/2+k*Math.PI*2/5,b1=a-Math.PI/5,b2=a+Math.PI/5,tip=[cx+Math.cos(a)*R,cy+Math.sin(a)*R];
    poly(t,[cx,cy,cx+Math.cos(b1)*r,cy+Math.sin(b1)*r,...tip]);fi(t,c1,3.5);poly(t,[cx,cy,...tip,cx+Math.cos(b2)*r,cy+Math.sin(b2)*r]);fi(t,c2,3.5);}};
defRig('starfold',{w:260,h:260,oy:130,parts:[{n:'root',at:[cx,cy]},
  {n:'back',at:[cx,cy],up:'root',wob:0,paint:ray(98,52,Math.PI/5,'#3a4a8a','#232a58')},
  {n:'rays',at:[cx,cy],up:'root',wob:0,paint:ray(122,54,0,'#fbe9a0','#e0b84a')},
  {n:'face',at:[cx,cy],up:'root',wob:.004,paint:t=>{circ(t,cx,cy,48);fi(t,'#fbf5e6',4);t.beginPath();t.moveTo(cx-44,cy+18);t.lineTo(cx+44,cy-18);ink(t,1.4,'rgba(42,33,48,.22)');}},
  {n:'eyes',at:[cx,cy-8],up:'face',v:['','blink'],paint:(t,s,v)=>{for(const ex of[cx-17,cx+17]){if(v){t.beginPath();t.moveTo(ex-9,cy-8);t.lineTo(ex+9,cy-8);ink(t,4);continue;}
    t.beginPath();t.ellipse(ex,cy-8,8,11,0,0,6.28);t.fillStyle=INK;t.fill();circ(t,ex+3,cy-12,3);t.fillStyle='#fff3c0';t.fill();}}},
  {n:'mouth',at:[cx,cy+20],up:'face',v:['','open'],paint:(t,s,v)=>{if(v){t.beginPath();t.ellipse(cx,cy+20,12,9,0,0,6.28);fi(t,'#2a3160',3);return;}t.beginPath();t.arc(cx,cy+10,13,.5,Math.PI-.5);ink(t,3.5);}}],
  clips:{idle:blinkAt(osc(2,{face:{y:[3]},rays:{sx:[.03],sy:[.03,1.57]}},.15),'eyes',1.4),
    wind:still({face:{sx:1.08,sy:.92},rays:{sx:1.1,sy:1.1},back:{sx:1.12,sy:1.12}},.1),
    fold:osc(.5,{root:{sx:[.45,1.57,.55]}},.08),
    shoot:swk(osc(.3,{face:{sx:[.04,0,1.04],sy:[.04,0,1.04]}},.08),'mouth',[[0,'open']])}});}
// The Pulper (the Great Scrapworks' boss): a riveted cardboard mill on stubby legs, a hopper on top spilling scraps, two rollers
// for a mouth that gameplay spins, and one grumpy gauge for an eye
{const cx=140,cy=120;
defRig('pulper',{w:280,h:230,oy:228,parts:[{n:'root',at:[cx,226]},
  {n:'legB',at:[cx-50,196],up:'root',paint:t=>{rr(t,cx-66,188,30,38,6);fi(t,'#6b5234',3.5);}},
  {n:'legA',at:[cx+50,196],up:'root',paint:t=>{rr(t,cx+36,188,30,38,6);fi(t,'#6b5234',3.5);}},
  {n:'body',at:[cx,150],up:'root',wob:.004,paint:t=>{rr(t,cx-104,70,208,126,14);fi(t,'#9a7a52',4.5);t.fillStyle='#b8966a';for(let y=82;y<190;y+=18)t.fillRect(cx-98,y,196,7);
    for(const[x,y]of[[-92,82],[92,82],[-92,182],[92,182]]){circ(t,cx+x,y,5);t.fillStyle='#8d8f9a';t.fill();ink(t,1.6);}rr(t,cx-70,136,140,48,10);fi(t,'#3a3040',3.5);}},
  {n:'hopper',at:[cx,70],up:'body',paint:t=>{poly(t,[cx-80,20,cx+80,20,cx+50,74,cx-50,74]);fi(t,'#8e6a40',4);for(const[x,y,r]of[[-40,14,.3],[10,8,-.4],[46,16,.2],[-10,18,.8]]){t.save();t.translate(cx+x,y);t.rotate(r);rr(t,-12,-8,24,16,2);fi(t,'#fbf8f0',2);t.restore();}}},
  {n:'rollA',at:[cx-32,160],up:'body',wob:0,paint:t=>{circ(t,cx-32,160,20);fi(t,'#a9adb8',3);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;t.beginPath();t.moveTo(cx-32,160);t.lineTo(cx-32+Math.cos(a)*18,160+Math.sin(a)*18);ink(t,2.4,'#5a5c68');}}},
  {n:'rollB',at:[cx+32,160],up:'body',wob:0,paint:t=>{circ(t,cx+32,160,20);fi(t,'#a9adb8',3);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;t.beginPath();t.moveTo(cx+32,160);t.lineTo(cx+32+Math.cos(a)*18,160+Math.sin(a)*18);ink(t,2.4,'#5a5c68');}}},
  {n:'gauge',at:[cx,106],up:'body',v:['','blink'],paint:(t,s,v)=>{circ(t,cx,106,24);fi(t,'#f4ecd8',4);if(v){t.beginPath();t.moveTo(cx-16,106);t.lineTo(cx+16,106);ink(t,4);return;}
    t.beginPath();t.moveTo(cx,106);t.lineTo(cx+14,94);ink(t,3.5,'#d4483b');circ(t,cx,106,4);t.fillStyle=INK;t.fill();t.beginPath();t.moveTo(cx-22,84);t.lineTo(cx+6,92);ink(t,5);}}],
  clips:{idle:blinkAt(osc(1.2,{body:{sy:[.015,0,1]},hopper:{r:[.02]}},.15),'gauge',.9),
    walk:osc(.6,{legA:{r:[.25]},legB:{r:[.25,3.14]},body:{y:[3,0,0,2]},hopper:{r:[.04]}},.12),
    wind:still({body:{sy:.9,sx:1.06},hopper:{r:-.12},legA:{r:-.2},legB:{r:.2}},.12),
    shred:osc(.2,{body:{sx:[.03,0,1.03]},hopper:{r:[.08]}},.08)}});}
// The Grand Nib (the Sunken Inkwell Temple's boss): a gold pen nib hanging point down, its slit running from the breather hole
// (its eye, which blinks) to the point, with a bead of ink at the tip that swells before it writes
{const cx=120,cy=140;
defRig('nib',{w:240,h:280,oy:140,parts:[{n:'root',at:[cx,cy]},
  {n:'collar',at:[cx,40],up:'root',paint:t=>{rr(t,cx-62,14,124,40,10);fi(t,'#3a2a5a',4);t.fillStyle='#6b4c8f';t.fillRect(cx-54,24,108,8);}},
  {n:'body',at:[cx,cy],up:'root',wob:.004,paint:t=>{poly(t,[cx-70,50,cx+70,50,cx+56,150,cx,262,cx-56,150]);fi(t,'#c9a24a',4.5);
    poly(t,[cx-70,50,cx-10,50,cx-6,150,cx,262,cx-56,150]);t.fillStyle='rgba(255,243,192,.35)';t.fill();
    for(const s of[-1,1]){t.beginPath();t.moveTo(cx+s*44,70);t.bezierCurveTo(cx+s*46,110,cx+s*30,150,cx+s*12,190);ink(t,2,'rgba(107,82,52,.6)');}
    t.beginPath();t.moveTo(cx,128);t.lineTo(cx,258);ink(t,3.5);}},
  {n:'eye',at:[cx,112],up:'body',v:['','blink'],paint:(t,s,v)=>{if(v){t.beginPath();t.moveTo(cx-16,112);t.lineTo(cx+16,112);ink(t,4);return;}t.beginPath();t.ellipse(cx,112,16,18,0,0,6.28);fi(t,'#1c1520',3);circ(t,cx+5,106,5);t.fillStyle='#8fcaf0';t.fill();}},
  {n:'drop',at:[cx,262],up:'body',paint:t=>{t.beginPath();t.moveTo(cx,256);t.bezierCurveTo(cx+14,266,cx+10,280,cx,280);t.bezierCurveTo(cx-10,280,cx-14,266,cx,256);fi(t,'#3a2a5a',2.5);}}],
  clips:{idle:blinkAt(osc(2,{root:{r:[.05]},drop:{sy:[.15,0,1]}},.15),'eye',1.3),
    wind:still({root:{r:0},body:{sy:.92},drop:{sx:1.4,sy:1.4}},.1),
    dive:still({root:{r:0},body:{sy:1.08,sx:.94}},.08),
    write:osc(.4,{root:{r:[.3]},drop:{sy:[.3,0,1.1]}},.1)}});}
// which rig and skin an enemy sheet name uses (entities.js spawnEnemy); arms: the arm pose a human foe holds
export const HUMANFOE={
  zombie:{skin:'#a8c79a',hair:'#3e5a3a',tunic:'#6b5b8a',pants:'#4a4058',boots:'#3a3040',eyeCol:'#c0392b',noBlush:1,extra:t=>{t.fillStyle='#2a2130';t.fillRect(40,95,6,10);t.fillRect(52,85,4,8);},clip:'shamble'},
  knight:{skin:'#c7a57a',helm:'#b48a5a',mail:'#b48a5a',greaves:'#9a7448',boots:'#6b4a2f',pants:'#6b4a2f',tunic:'#b48a5a',eyeCol:'#f1c04f',noBlush:1,eyeY:47,
    front:t=>{rr(t,58,70,24,34,8);fi(t,'#8e6a40');circ(t,70,87,5);fi(t,'#f1c04f',2);},clip:'march'},
  sentinel:{skin:'#b08a4a',helm:'#c9a24a',mail:'#b08a4a',greaves:'#8a6a3a',boots:'#4a3a26',pants:'#6b5234',tunic:'#c9a24a',eyeCol:'#8fd0ff',noBlush:1,eyeY:47,
    front:t=>{circ(t,70,87,13);fi(t,'#e0b04a');for(let k=0;k<8;k++){const a=k/8*Math.PI*2;circ(t,70+Math.cos(a)*13,87+Math.sin(a)*13,3);t.fillStyle='#e0b04a';t.fill();}circ(t,70,87,4);fi(t,'#6b5234',2);},clip:'march'},
  // the Hollow Archive's keeper: a hooded paper librarian with an open ledger and ink-dark eyes
  warden:{skin:'#e9dcc0',tunic:'#5a3c78',pants:'#3a2a4a',boots:'#2a1e2a',belt:'#c9a24a',eyeCol:'#7a3fb0',noBlush:1,eyeY:51,
    extra:t=>{t.beginPath();t.moveTo(24,60);t.quadraticCurveTo(20,22,50,20);t.quadraticCurveTo(80,22,76,56);t.lineTo(70,46);t.quadraticCurveTo(50,34,32,48);t.closePath();fi(t,'#3a2a4a');rr(t,40,72,20,40,4);t.fillStyle='rgba(201,162,74,.5)';t.fillRect(48,74,3,36);},
    front:t=>{t.save();t.translate(68,90);t.rotate(-.2);poly(t,[-14,-10,0,-6,0,10,-14,6]);fi(t,'#f4ecd8',2);poly(t,[0,-6,14,-10,14,6,0,10]);fi(t,'#fbf8f0',2);t.fillStyle='rgba(42,33,48,.45)';for(const y of[-4,0,4]){t.fillRect(-11,y,8,1.2);t.fillRect(3,y-1,8,1.2);}t.restore();},clip:'march',arm:-.7},
  // the Origami Observatory's keeper: a star-chart robe, a tall folded hat with stars on it and a brass astrolabe
  gazer:{skin:'#dfe6f7',tunic:'#2a3160',pants:'#1e2448',boots:'#141833',belt:'#c9a24a',eyeCol:'#f7d046',noBlush:1,eyeY:51,
    extra:t=>{poly(t,[22,42,78,42,60,2]);fi(t,'#2a3160',3);t.beginPath();t.moveTo(41,42);t.lineTo(60,2);ink(t,1.4,'rgba(143,160,224,.6)');t.beginPath();t.ellipse(50,42,32,6,0,0,6.28);fi(t,'#3a4a8a',2.5);
      for(const[x,y,r]of[[50,26,4],[62,16,3],[40,36,2.6]]){const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.45:r;pts.push(x+Math.cos(a)*d,y+Math.sin(a)*d);}poly(t,pts);t.fillStyle='#f7d046';t.fill();}},
    front:t=>{circ(t,70,88,12);fi(t,'#c9a24a',2.5);circ(t,70,88,7);ink(t,1.6,'#6b5234');t.beginPath();t.moveTo(60,92);t.lineTo(80,84);ink(t,2.4);circ(t,70,88,2.5);t.fillStyle=INK;t.fill();},clip:'march',arm:-.7},
  // the Great Scrapworks' foreman: a hard hat, overalls and a clipboard of work orders
  foreman:{skin:'#e8c4a0',tunic:'#3f6fa8',pants:'#2e4a78',boots:'#3a2a1e',belt:'#8e6a40',eyeCol:'#2a2130',hair:'#6b4a2a',
    extra:t=>{t.beginPath();t.ellipse(50,30,28,16,0,Math.PI,0);t.closePath();fi(t,'#e0b04a',3);t.fillStyle='#e0b04a';t.fillRect(20,28,60,6);t.strokeStyle=INK;t.lineWidth=2.4;t.strokeRect(20,28,60,6);},
    front:t=>{rr(t,60,80,22,28,3);fi(t,'#8e6a40',2);rr(t,63,84,16,20,2);fi(t,'#fbf8f0',1.4);t.fillStyle='rgba(42,33,48,.45)';for(const y of[88,93,98])t.fillRect(66,y,10,1.6);},clip:'march',arm:-.6},
  // the Sunken Inkwell Temple's scribe: robes soaked through with ink, a dripping quill and pale, drowned eyes
  scribe:{skin:'#b8c4d8',tunic:'#3a2a5a',pants:'#2a1e3a',boots:'#1c1520',belt:'#6b4c8f',eyeCol:'#8fcaf0',noBlush:1,eyeY:51,
    extra:t=>{t.beginPath();t.moveTo(26,58);t.quadraticCurveTo(22,20,50,18);t.quadraticCurveTo(78,20,74,58);t.lineTo(68,44);t.quadraticCurveTo(50,32,32,44);t.closePath();fi(t,'#2a1e3a');
      for(const x of[34,52,66]){t.beginPath();t.moveTo(x,56);t.quadraticCurveTo(x+2,66,x,72);ink(t,2.4,'#3a2a5a');}},
    front:t=>{t.save();t.translate(70,86);t.rotate(-.5);poly(t,[0,-22,5,-6,0,10,-5,-6]);fi(t,'#e9dcc0',1.6);t.beginPath();t.moveTo(0,10);t.lineTo(0,16);ink(t,2.4,'#3a2a5a');t.restore();},clip:'march',arm:-.7},
  ashimp:{skin:'#9a3b2a',tunic:'#3a2a24',pants:'#2a1e1a',boots:'#1e1614',eyeCol:'#ffd66b',noBlush:1,
    extra:t=>{poly(t,[34,34,28,14,40,28]);fi(t,'#3a2a24',2);poly(t,[62,30,72,10,68,32]);fi(t,'#3a2a24',2);},front:t=>{circ(t,70,84,7);t.fillStyle='rgba(255,138,61,.6)';t.fill();},clip:'march',arm:-.8}};
export const FOERIG={slime:['slime',{col:'#6cc57a'}],bslime:['slime',{col:'#5aa7e0'}],blot:['slime',{col:'#4a3570'}],king:['king',{col:'#5aa7e0'}],
  bat:['bat',{c1:'#6b4c8f',c2:'#5a3f7a',eye:'#f1c04f',fang:1}],cinderbat:['bat',{c1:'#3a2a24',c2:'#2a1e1a',eye:'#ff8a3d'}],eye:['eye',{}],
  zombie:['human',HUMANFOE.zombie],knight:['human',HUMANFOE.knight],sentinel:['human',HUMANFOE.sentinel],ashimp:['human',HUMANFOE.ashimp],warden:['human',HUMANFOE.warden],gazer:['human',HUMANFOE.gazer],foreman:['human',HUMANFOE.foreman],scribe:['human',HUMANFOE.scribe],
  mothling:['bat',{c1:'#e8dcc4',c2:'#b8a0d0',eye:'#2a2130'}],
  // every other foe and boss wears its own rig's colors
  ...Object.fromEntries(['crumple','toadstool','dunefin','scarab','clockbug','sunkite','snowroll','snowlet','frostpuff','flurry','inkwisp','quillfish','inksquid','foldfox','cracker','ashspider','wraith','skyray',
    'crane','lev','levseg','levtail','folio','unfolded','mainspring','bookmoth','starfold','pulper','nib'].map(k=>[k,[k,{}]]))};
// the enemies' still pictures (bestiary sketches) come from their rigs; the T textures stay for anything that still wants a sheet
export function buildRigSheets(SHEETS){for(const k in FOERIG){if(SHEETS[k])continue;const[r,s]=FOERIG[k],d=RIGS[r];SHEETS[k]=rigPic(r,s,r==='human'?'idle':['fly','idle','swim'].find(c=>d.clips[c]),0,k);SHEETS[k+'T']=canvasTex(SHEETS[k]);}}
