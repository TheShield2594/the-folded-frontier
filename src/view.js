// Mining crack and highlight overlays, day/night sky and the camera.
import * as THREE from 'three';
import {
  arenaF,eclF,atlasTex,BIO,biomeAt,boltF,C,camDist,camera,cellUV,clamp,clouds,cursor,dioLight,H,hasAcc,hasBuff,
  fullMoon,inkMoon,lerp,moonMesh,season,seasonSky,mouse,N,OPAQUE,pad,player,rainF,rand,reachOK,scene,selItem,setShakeT,setSnowF,
  shakeT,skyMesh,skyU,snowF,SPAWNX,state,sunMesh,surfAvg,T,tiles,U,W,worldMat,
  worldTime,touch,
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
  seasonSky(skyU,cB,f,under);
  if(rainF>0){skyU.uTop.value.lerp(cB.set('#6f7f8f'),rainF*.6*f+rainF*.2);skyU.uBot.value.lerp(cB.set('#a9b4bf'),rainF*.5*f);U.uSky.value.multiplyScalar(1-rainF*.25);}
  // an eclipse (events.js) folds the sun shut: a dusky violet sky, dim light and a few stars at midday
  if(eclF>0){const ef=eclF*(1-under);skyU.uTop.value.lerp(cB.set('#140c22'),ef*.85);skyU.uBot.value.lerp(cB.set('#5a2a4a'),ef*.7);U.uSky.value.multiplyScalar(1-ef*.55);}
  if(arenaF>0){const af=arenaF*(1-under);skyU.uTop.value.lerp(cB.set('#3a1430'),af*.55);skyU.uBot.value.lerp(cB.set('#b0503a'),af*.4);}
  if(boltF>0){const bf=boltF*(1-under);skyU.uTop.value.lerp(cB.set('#eeeaff'),bf*.7);skyU.uBot.value.lerp(cB.set('#fffbe8'),bf*.6);U.uSky.value.multiplyScalar(1+bf*.5);}
  if(inkMoon){const im=(1-f)*(1-under);skyU.uTop.value.lerp(cB.set('#2a0f3a'),im);skyU.uBot.value.lerp(cB.set('#6a2a5a'),im);moonMesh.material.color.set(0xd08aff);}else moonMesh.material.color.set(0xffffff);moonMesh.scale.setScalar(fullMoon()&&!inkMoon?1.35:1);
  skyU.uStars.value=Math.max((1-f)*(1-under)*(1-rainF),eclF*.6*(1-under));skyU.uTime.value=worldClock;
  const cx=camera.position.x,cy=camera.position.y;skyMesh.position.x=cx;skyMesh.position.y=cy;
  const sa=(h-6)/12*Math.PI;sunMesh.position.set(cx-Math.cos(sa)*55,cy-2+Math.sin(sa)*34,-100);sunMesh.visible=sa>-0.3&&sa<Math.PI+.3&&under<.9;
  const ma=(((h+12)%24)-6)/12*Math.PI;moonMesh.position.set(cx-Math.cos(ma)*55,cy-2+Math.sin(ma)*34,-100);moonMesh.visible=ma>-0.3&&ma<Math.PI+.3&&under<.9;
  // the sun (or the moon, dimmer) lights the normal-mapped paper from where it hangs in the sky; with post-processing both glow past white
  {const a=f>.05?sa:ma,dx=-Math.cos(a),dy=Math.max(.15,Math.sin(a)),l=Math.hypot(dx,dy,1.1);U.uSun.value.set(dx/l,dy/l,1.1/l,(f>.05?f:.45)*(1-under)*(1-rainF*.6));}
  const hd=U.uHdr.value;sunMesh.material.color.setScalar(1+.7*hd);if(eclF>0){sunMesh.material.color.lerp(cB.set('#1a1024'),eclF*.92);U.uSun.value.w*=1-eclF*.7;}moonMesh.material.color.multiplyScalar(1+.35*hd);
  const tint=lerp(.35,1,f)*(1-under*.6)*(1-eclF*.5);dioLight(tint*lerp(1,1.05,warm),tint*lerp(1,.85,warm),tint*lerp(1.05,.8,warm),under);
  clouds.forEach(c=>{c.material.color.setRGB(tint*lerp(1,1.1,warm),tint*lerp(1,.85,warm),tint*lerp(1,.8,warm));});}

// ================= camera =================
export const camT={x:SPAWNX,y:100};
// camFocus: a short camera move set by boss.js (at() -> [x, y] to look at, zoom multiplies the distance); eases in and out over dur seconds
export const camFocus={t:0,dur:1,at:null,zoom:1};
export function updateCamera(dt){const p=player;let tx=p.x+p.vx*.25,ty=p.y+1.2+(p.stepOff||0),zk=1;
  if(camFocus.t>0&&state!=='title'){camFocus.t-=dt;const e=camFocus.t,w=Math.max(0,Math.min(1,(camFocus.dur-e)/.45,e/.6)),s2=w*w*(3-2*w),f=camFocus.at&&camFocus.at();if(f){tx=lerp(tx,f[0],s2);ty=lerp(ty,f[1],s2);}zk=lerp(1,camFocus.zoom,s2);}
  const k=state==='title'?1:Math.min(1,dt*6);camT.x+=(tx-camT.x)*k;camT.y+=(ty-camT.y)*Math.min(1,dt*5);
  const cd=camDist*zk,vh=2*cd*Math.tan(16*Math.PI/180),vw=vh*camera.aspect;const cx=clamp(camT.x,vw/2+1,W-vw/2-1),cy=clamp(camT.y,vh/2+2,H-vh/2);
  let sx=0,sy=0;if(shakeT>0){setShakeT(shakeT-(dt));sx=rand(-1,1)*shakeT*.6;sy=rand(-1,1)*shakeT*.6;}
  camera.position.set(cx+sx,cy+3.6+sy,cd);camera.lookAt(cx+sx,cy+.4+sy,0);
  // mouse world
  [mouse.wx,mouse.wy]=screenToWorld(mouse.x,mouse.y);
  if(pad.active&&state==='play'){pad.aimT-=dt;if(pad.aimT>0){mouse.wx=p.x+pad.aimX*4.5;mouse.wy=p.y+1+pad.aimY*4.5;}else{mouse.wx=p.x+p.face*1.3;mouse.wy=p.y+.5;}}
  // touch: aim with the Use stick (kept briefly after letting go), else just ahead of the player, unless a finger is on the world
  else if(touch.on&&state==='play'&&!touch.world){if(touch.aim){touch.aimX=touch.aim[0];touch.aimY=touch.aim[1];}touch.aimT-=dt;if(touch.aim||touch.aimT>0){mouse.wx=p.x+touch.aimX*4.5;mouse.wy=p.y+1+touch.aimY*4.5;}else{mouse.wx=p.x+p.face*1.3;mouse.wy=p.y+.5;}}
  const nv=hasBuff('night')||hasBuff('ghost');U.uP.value.set(p.x,p.y+1,hasAcc('light')?11:nv?10:4.5);U.uGlow.value=p.dead?0:(hasAcc('light')?.95:nv?.75:.32);}
// screen px to world coordinates on the z=.5 plane the tiles sit on
export function screenToWorld(x,y){const v=new THREE.Vector3((x/innerWidth)*2-1,-(y/innerHeight)*2+1,.5).unproject(camera).sub(camera.position).normalize();const t=(.5-camera.position.z)/v.z;return[camera.position.x+v.x*t,camera.position.y+v.y*t];}
// Imported bindings are read-only, so other modules assign these through setters.
export function setWorldClock(v){return worldClock=v;}
