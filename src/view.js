// Mining crack and highlight overlays, day/night sky and the camera.
import * as THREE from 'three';
import {
  atlasTex,BIO,biomeAt,C,camDist,camera,cellUV,clamp,clouds,cursor,H,hasAcc,hasBuff,hillsFar,hillsNear,
  inkMoon,lerp,moonMesh,mouse,N,OPAQUE,pad,player,rainF,rand,reachOK,scene,selItem,setShakeT,setSnowF,
  shakeT,skyMesh,skyU,snowF,snowFar,snowNear,SPAWNX,state,sunMesh,surfAvg,T,tiles,U,W,worldMat,
  worldTime,
} from './game.js';

// ================= crack/highlight overlays =================
const crackMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({uniforms:U,vertexShader:worldMat.vertexShader,fragmentShader:worldMat.fragmentShader,side:THREE.DoubleSide}));{const g=crackMesh.geometry;g.setAttribute('aL',new THREE.Float32BufferAttribute([15,15,1,15,15,1,15,15,1,15,15,1],3));}crackMesh.position.z=.53;scene.add(crackMesh);
const hlMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:atlasTex,transparent:true,opacity:.75,depthTest:false}));hlMesh.position.z=.55;hlMesh.renderOrder=5;scene.add(hlMesh);
function setPlaneUV(mesh,uv){const a=mesh.geometry.attributes.uv;a.setXY(0,uv[0],uv[3]);a.setXY(1,uv[2],uv[3]);a.setXY(2,uv[0],uv[1]);a.setXY(3,uv[2],uv[1]);a.needsUpdate=true;}
setPlaneUV(hlMesh,cellUV(C.hl));
export function updateOverlays(){const p=player;const it=selItem();const tx=Math.floor(mouse.wx),ty=Math.floor(mouse.wy);
  const show=state==='play'&&!p.dead&&it&&(it.pick||it.hammer||it.place!=null||it.wall||it.seed!=null||it.bucket)&&!cursor;hlMesh.visible=!!show;
  if(show){hlMesh.position.set(tx+.5,ty+.5,.55);const ok=reachOK(tx,ty);hlMesh.material.color.set(ok?0xffffff:0xff7a6a);hlMesh.material.opacity=ok?.8:.45;}
  const mt=p.mineTile;crackMesh.visible=mt>=0&&mt<N&&p.mineP>.05&&tiles[mt]!==T.AIR;if(crackMesh.visible){const x=mt%W,y=(mt/W)|0;crackMesh.position.set(x+.5,y+.5,OPAQUE[tiles[mt]]?.53:.03);setPlaneUV(crackMesh,cellUV(C.crack[Math.min(2,Math.floor(p.mineP*3))]));}}

// ================= time/sky =================
export let worldClock=0;
export function isNight(){return worldTime>=19.5||worldTime<4.5;}
export function dayF(h){if(h<5||h>=20)return 0;if(h<7)return(h-5)/2;if(h<18)return 1;return 1-(h-18)/2;}
const cA=new THREE.Color(),cB=new THREE.Color();
export function updateSky(){const h=worldTime,f=dayF(h),warm=f>0&&f<1?Math.sin(f*Math.PI):0;const night=[.2,.24,.48],day=[1,.98,.94];
  const s=[lerp(night[0],day[0],f),lerp(night[1],day[1],f),lerp(night[2],day[2],f)];U.uSky.value.set(s[0]*lerp(1,1.08,warm),s[1]*lerp(1,.82,warm),s[2]*lerp(1,.66,warm));
  const under=clamp((surfAvg-8-camera.position.y+4)/18,0,1);
  cA.set('#0f1230').lerp(cB.set('#6fc3df'),f).lerp(cB.set('#7b6fb0'),warm*.7).lerp(cB.set('#191320'),under);skyU.uTop.value.copy(cA);
  cA.set('#2c2a55').lerp(cB.set('#e7f3ea'),f).lerp(cB.set('#f4a86a'),warm*.8).lerp(cB.set('#241a28'),under);skyU.uBot.value.copy(cA);
  const cb=biomeAt(camera.position.x,camera.position.y-3);
  if(BIO&&BIO.uw){const uwf=clamp((BIO.uw+16-camera.position.y)/12,0,1);if(uwf>0){skyU.uTop.value.lerp(cB.set('#2a0e0a'),uwf);skyU.uBot.value.lerp(cB.set('#8a3414'),uwf);}
    const sd=camera.position.x<BIO.snow[0]?BIO.snow[0]-camera.position.x:camera.position.x>BIO.snow[1]?camera.position.x-BIO.snow[1]:0;setSnowF(snowF+((clamp(1-sd/25,0,1)*(1-under)-snowF)*.15));
    const ld=Math.max(0,Math.abs(camera.position.x-BIO.lake[0])-BIO.lake[1]);const lf=clamp(1-ld/25,0,1)*(1-under);skyU.uBot.value.lerp(cB.set('#9a88c0'),lf*.35);skyU.uTop.value.lerp(cB.set('#b6d7e6'),snowF*.3*f);}
  const sw=snowF>.5;[snowFar,snowNear].forEach(m=>{if(m)m.visible=sw;});[hillsFar,hillsNear].forEach(m=>{if(m)m.visible=!sw;});
  if(rainF>0){skyU.uTop.value.lerp(cB.set('#6f7f8f'),rainF*.6*f+rainF*.2);skyU.uBot.value.lerp(cB.set('#a9b4bf'),rainF*.5*f);U.uSky.value.multiplyScalar(1-rainF*.25);}
  if(inkMoon){const im=(1-f)*(1-under);skyU.uTop.value.lerp(cB.set('#2a0f3a'),im);skyU.uBot.value.lerp(cB.set('#6a2a5a'),im);moonMesh.material.color.set(0xd08aff);}else moonMesh.material.color.set(0xffffff);
  skyU.uStars.value=(1-f)*(1-under)*(1-rainF);skyU.uTime.value=worldClock;
  const cx=camera.position.x,cy=camera.position.y;skyMesh.position.x=cx;skyMesh.position.y=cy;
  const sa=(h-6)/12*Math.PI;sunMesh.position.set(cx-Math.cos(sa)*55,cy-2+Math.sin(sa)*34,-100);sunMesh.visible=sa>-0.3&&sa<Math.PI+.3&&under<.9;
  const ma=(((h+12)%24)-6)/12*Math.PI;moonMesh.position.set(cx-Math.cos(ma)*55,cy-2+Math.sin(ma)*34,-100);moonMesh.visible=ma>-0.3&&ma<Math.PI+.3&&under<.9;
  const tint=lerp(.35,1,f)*(1-under*.6);[hillsFar,hillsNear].forEach(m=>{if(m)m.material.color.setRGB(tint*lerp(1,1.05,warm),tint*lerp(1,.85,warm),tint*lerp(1.05,.8,warm));});
  [snowFar,snowNear].forEach(m=>{if(m)m.material.color.setRGB(tint,tint,tint*1.02);});
  clouds.forEach(c=>{c.material.color.setRGB(tint*lerp(1,1.1,warm),tint*lerp(1,.85,warm),tint*lerp(1,.8,warm));});}

// ================= camera =================
export const camT={x:SPAWNX,y:100};
export function updateCamera(dt){const p=player;const tx=p.x+p.vx*.25,ty=p.y+1.2;const k=state==='title'?1:Math.min(1,dt*6);camT.x+=(tx-camT.x)*k;camT.y+=(ty-camT.y)*Math.min(1,dt*5);
  const vh=2*camDist*Math.tan(16*Math.PI/180),vw=vh*camera.aspect;const cx=clamp(camT.x,vw/2+1,W-vw/2-1),cy=clamp(camT.y,vh/2+2,H-vh/2);
  let sx=0,sy=0;if(shakeT>0){setShakeT(shakeT-(dt));sx=rand(-1,1)*shakeT*.6;sy=rand(-1,1)*shakeT*.6;}
  camera.position.set(cx+sx,cy+3.6+sy,camDist);camera.lookAt(cx+sx,cy+.4+sy,0);
  // mouse world
  const v=new THREE.Vector3((mouse.x/innerWidth)*2-1,-(mouse.y/innerHeight)*2+1,.5).unproject(camera).sub(camera.position).normalize();const t=(.5-camera.position.z)/v.z;mouse.wx=camera.position.x+v.x*t;mouse.wy=camera.position.y+v.y*t;
  if(pad.active&&state==='play'){pad.aimT-=dt;if(pad.aimT>0){mouse.wx=p.x+pad.aimX*4.5;mouse.wy=p.y+1+pad.aimY*4.5;}else{mouse.wx=p.x+p.face*1.3;mouse.wy=p.y+.5;}}
  const nv=hasBuff('night');U.uP.value.set(p.x,p.y+1,hasAcc('light')?11:nv?10:4.5);U.uGlow.value=p.dead?0:(hasAcc('light')?.95:nv?.75:.32);}
// Imported bindings are read-only, so other modules assign these through setters.
export function setWorldClock(v){return worldClock=v;}
