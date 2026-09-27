// Post-processing: bloom on light sources, vignette and per-biome/per-season color grading.
import * as THREE from 'three';
import {arenaF,biomeAt,camera,clamp,dayF,inkMoon,renderer,scene,season,SET,surfAvg,U,worldTime} from './game.js';

// ================= post-processing =================
// With Settings > Post-processing on, the scene renders into a half-float target (multisampled) and
// U.uHdr is 1, so torches, lava, glowing ores, the sun and glowing particles can go brighter than white. What
// passes the threshold is blurred at quarter size and added back as bloom; the composite then grades the color
// toward the current biome and season (GRADE, SGRADE), cools it at night and darkens the corners. Off, or where
// float targets are unsupported (postOK), the scene renders straight to the screen as it always did.
export const postOK=renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float');
const rtOpt={type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false};
let rtS=null,rtA=null,rtB=null,postFail=false;const sz=new THREE.Vector2();
// multisampled float renderbuffers are optional in WebGL 2: use the most samples RGBA16F supports, up to 4, or none
const MSAA=(()=>{try{const gl=renderer.getContext(),s=gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES);return s&&s.length?Math.min(4,Math.max(...s)):0;}catch(e){return 0;}})();
function makeTargets(){sz.set(0,0);[rtS,rtA,rtB].forEach(t=>t&&t.dispose());rtS=new THREE.WebGLRenderTarget(4,4,Object.assign({},rtOpt,{depthBuffer:true,samples:MSAA}));rtA=new THREE.WebGLRenderTarget(4,4,rtOpt);rtB=new THREE.WebGLRenderTarget(4,4,rtOpt);}
function sizeTargets(){const v=renderer.getDrawingBufferSize(new THREE.Vector2());if(v.equals(sz))return;sz.copy(v);rtS.setSize(v.x,v.y);const qx=Math.max(1,v.x>>2),qy=Math.max(1,v.y>>2);rtA.setSize(qx,qy);rtB.setSize(qx,qy);
  const px=new THREE.Vector2(1/qx,1/qy);MB.uniforms.uPx.value.set(1/v.x,1/v.y);MH.uniforms.uPx.value.copy(px);MC.uniforms.uAsp.value=v.x/v.y;}
const VS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// bright pass: 4 bilinear taps (a 4x4 box) into quarter size, keeping what is brighter than uTh
const MB=new THREE.ShaderMaterial({uniforms:{tS:{value:null},uPx:{value:new THREE.Vector2()},uTh:{value:1.}},vertexShader:VS,depthTest:false,depthWrite:false,
  fragmentShader:`uniform sampler2D tS;uniform vec2 uPx;uniform float uTh;varying vec2 vUv;void main(){vec3 c=vec3(0.);
  for(int i=0;i<4;i++){vec2 o=vec2(i==0||i==2?-1.:1.,i<2?-1.:1.)*uPx;c+=texture2D(tS,vUv+o).rgb;}c*=.25;float m=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*max(m-uTh,0.)/max(m,.001),1.);}`});
// separable 9-tap gaussian; uDir is (1,0) or (0,1) times the step in texels
const MH=new THREE.ShaderMaterial({uniforms:{tS:{value:null},uPx:{value:new THREE.Vector2()},uDir:{value:new THREE.Vector2()}},vertexShader:VS,depthTest:false,depthWrite:false,
  fragmentShader:`uniform sampler2D tS;uniform vec2 uPx;uniform vec2 uDir;varying vec2 vUv;void main(){vec2 d=uDir*uPx;
  vec3 c=texture2D(tS,vUv).rgb*.2270;c+=(texture2D(tS,vUv+d*1.3846).rgb+texture2D(tS,vUv-d*1.3846).rgb)*.3162;c+=(texture2D(tS,vUv+d*3.2308).rgb+texture2D(tS,vUv-d*3.2308).rgb)*.0703;gl_FragColor=vec4(c,1.);}`});
// composite: scene + bloom, then saturation, tint (gain), a paper-warm lift, vignette and a little dither against banding
const MC=new THREE.ShaderMaterial({uniforms:{tS:{value:null},tB:{value:null},uBloom:{value:3.2},uSat:{value:1},uTint:{value:new THREE.Vector3(1,1,1)},uLift:{value:new THREE.Vector3()},uVig:{value:.28},uAsp:{value:1}},vertexShader:VS,depthTest:false,depthWrite:false,
  fragmentShader:`uniform sampler2D tS;uniform sampler2D tB;uniform float uBloom;uniform float uSat;uniform vec3 uTint;uniform vec3 uLift;uniform float uVig;uniform float uAsp;varying vec2 vUv;
  void main(){vec3 c=min(texture2D(tS,vUv).rgb,vec3(1.))+texture2D(tB,vUv).rgb*uBloom;c=min(c,vec3(1.));float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,uSat)*uTint;c=c+uLift*(1.-c);
  vec2 q=(vUv-.5)*vec2(uAsp,1.);float v=smoothstep(1.05,.25,length(q)*1.1);c*=mix(1.-uVig,1.,v);
  c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(clamp(c,0.,1.),1.);}`});
const pScene=new THREE.Scene(),pCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),MB);quad.frustumCulled=false;pScene.add(quad);
function pass(m,target){quad.material=m;renderer.setRenderTarget(target);renderer.render(pScene,pCam);}
// grading targets: tint (rgb gain), saturation, vignette; seasons multiply the biome's look (snow and the underworld ignore them)
const GRADE={forest:{t:[1,1,.97],s:1.06,v:.24},snow:{t:[.96,.99,1.05],s:.92,v:.22},desert:{t:[1.05,1,.9],s:1.05,v:.26},lake:{t:[.96,.96,1.05],s:1,v:.28},under:{t:[1.07,.93,.86],s:1.1,v:.42}};
const SGRADE={spring:{t:[1,1.02,.99],s:1.05},summer:{t:[1.03,1.01,.95],s:1.08},fall:{t:[1.06,.98,.9],s:1.02},winter:{t:[.96,.98,1.05],s:.88}};
const cur={t:new THREE.Vector3(1,1,1),s:1,v:.28},tgt={t:new THREE.Vector3(),s:1,v:.28};
function updateGrade(dt){const cx=camera.position.x,cy=camera.position.y,b=biomeAt(cx,cy-3),g=GRADE[b]||GRADE.forest,sg=b==='snow'||b==='under'?null:SGRADE[season().k];
  const under=clamp((surfAvg-8-cy+4)/18,0,1),f=dayF(worldTime),night=(1-f)*(1-under);
  tgt.t.set(g.t[0],g.t[1],g.t[2]);tgt.s=g.s;tgt.v=g.v+under*.1;if(sg){tgt.t.multiply(new THREE.Vector3(...sg.t));tgt.s*=sg.s;}
  tgt.t.multiply(new THREE.Vector3(1-night*.05,1-night*.03,1+night*.06));tgt.s*=1-night*.12;
  if(inkMoon)tgt.t.multiply(new THREE.Vector3(1+night*.06,1-night*.06,1+night*.08));if(arenaF>0){tgt.t.multiply(new THREE.Vector3(1+arenaF*.08,1-arenaF*.04,1-arenaF*.02));tgt.v+=arenaF*.12;}
  const k=Math.min(1,dt*1.5);cur.t.lerp(tgt.t,k);cur.s+=(tgt.s-cur.s)*k;cur.v+=(tgt.v-cur.v)*k;
  MC.uniforms.uTint.value.copy(cur.t);MC.uniforms.uSat.value=cur.s;MC.uniforms.uVig.value=cur.v;MC.uniforms.uLift.value.set(.018,.012,.004);}
export const postOn=()=>postOK&&!postFail&&SET.post!==false;
// called from the main loop in place of renderer.render(scene, camera)
export function renderFrame(dt){const on=postOn();U.uHdr.value=on?1:0;
  if(!on){if(rtS){[rtS,rtA,rtB].forEach(t=>t.dispose());rtS=null;sz.set(0,0);}renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
  if(!rtS)makeTargets();sizeTargets();updateGrade(dt);
  renderer.setRenderTarget(rtS);
  // a scene target the device can't render to turns post-processing off for the session and draws straight to the screen
  if(!rtS.checked){rtS.checked=1;const gl=renderer.getContext();if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){postFail=true;renderFrame(dt);return;}}
  renderer.render(scene,camera);
  MB.uniforms.tS.value=rtS.texture;pass(MB,rtA);
  for(const st of[1,2,3.5]){MH.uniforms.tS.value=rtA.texture;MH.uniforms.uDir.value.set(st,0);pass(MH,rtB);MH.uniforms.tS.value=rtB.texture;MH.uniforms.uDir.value.set(0,st);pass(MH,rtA);}
  MC.uniforms.tS.value=rtS.texture;MC.uniforms.tB.value=rtA.texture;pass(MC,null);}
