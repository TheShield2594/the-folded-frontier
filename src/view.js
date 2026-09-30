// Mining crack and highlight overlays, day/night sky and the camera.
import * as THREE from 'three';
import {
  arenaF,eclF,atlasTex,BIO,biomeAt,boltF,C,camDist,camera,cellUV,clamp,clouds,cursor,dioLight,H,hasAcc,hasBuff,
  fullMoon,inkMoon,lerp,moonMesh,season,seasonSky,mouse,N,OPAQUE,pad,player,rainF,reachOK,scene,selItem,setTrauma,setSnowF,
  trauma,camKick,KICK_W,camPunch,setCamPunch,makeNoise,hook,boss,enemies,reduceMotion,ITEMS,SET,skyMesh,skyU,snowF,SPAWNX,state,sunMesh,surfAvg,T,tiles,U,W,worldMat,
  worldTime,touch,
} from './game.js';

// ================= crack/highlight overlays =================
const crackMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({uniforms:U,vertexShader:worldMat.vertexShader,fragmentShader:worldMat.fragmentShader,side:THREE.DoubleSide}));{const g=crackMesh.geometry;g.setAttribute('aL',new THREE.Float32BufferAttribute([15,15,1,15,15,1,15,15,1,15,15,1],3));}crackMesh.position.z=.53;scene.add(crackMesh);
const hlMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:atlasTex,transparent:true,opacity:.75,depthTest:false}));hlMesh.position.z=.55;hlMesh.renderOrder=5;scene.add(hlMesh);
function setPlaneUV(mesh,uv){const a=mesh.geometry.attributes.uv;a.setXY(0,uv[0],uv[3]);a.setXY(1,uv[2],uv[3]);a.setXY(2,uv[0],uv[1]);a.setXY(3,uv[2],uv[1]);a.needsUpdate=true;}
setPlaneUV(hlMesh,cellUV(C.hl));
// items used on one tile (the highlight shows it, and gamepad aim snaps to it)
export const aimsTile=it=>!!it&&!!(it.pick||it.hammer||it.place!=null||it.wall||it.seed!=null||it.bucket);
export function updateOverlays(){const p=player;const it=selItem();const tx=Math.floor(mouse.wx),ty=Math.floor(mouse.wy);
  const show=state==='play'&&!p.dead&&aimsTile(it)&&!cursor;hlMesh.visible=!!show;
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
// How the camera follows the player (issue #136):
//  vertical deadzone: in the air it holds the last ground height while the player stays within CAM_UP above it (a full jump
//   is ~4.1 tiles, so jumping on flat ground never moves it) or CAM_DN below; past that, and on ropes, in liquid, on the hook
//   or dead, it follows (fw eases 0 -> 1); landing eases it to the new ground
//  lookahead: LOOK_X toward the facing, turning over ~LOOK_T*3 s so quick turns don't whip it, plus a little velocity; aiming a
//   bow or spell leads partway toward the cursor instead; falling for FALL_LOOK s looks down, more the faster the fall
//  combat zoom: a few percent closer (CZOOM) while a boss or an elite is near; smoothing is exponential, so it feels the same at any fps
//  shake: trauma (shake() in gameplay.js) squared times smooth noise, plus a small roll; kick(): a spring offset along a hit
const CAM_UP=4.6,CAM_DN=2.5,LOOK_X=2.5,LOOK_T=.5,FALL_LOOK=.4,CZOOM=.95,SHAKE_MAX=1.1,SHAKE_ROLL=.035,TRAUMA_DECAY=1.5;
export const cam={gy:null,fw:1,look:0,ly:0,down:0,fallT:0,zoom:1,nt:0};const camNoise=makeNoise(7);
const ease=(r,dt)=>1-Math.exp(-dt*r),wig=(t,o)=>clamp((camNoise.n2(t,o)-.5)*3,-1,1);
export function updateCamera(dt){const p=player,play=state!=='title';let tx=p.x,ty=p.y+1.2,zk=1;
  // Screen shake off or reduced motion stops shake, kicks and the punch-in already under way, not just new ones
  if(!SET.shake||reduceMotion()){if(trauma)setTrauma(0);if(camPunch)setCamPunch(0);camKick.x=camKick.y=camKick.vx=camKick.vy=0;}
  if(play){const direct=p.climb||p.inLiq||hook.state===2||p.dead;
    if(p.onGround||direct||cam.gy==null)cam.gy=p.y;
    if(direct)cam.fw=1;else if(p.onGround)cam.fw=0;else if(p.y>cam.gy+CAM_UP||p.y<cam.gy-CAM_DN)cam.fw=Math.min(1,cam.fw+dt*4);
    cam.fallT=!p.onGround&&!direct&&p.vy<-4?cam.fallT+dt:0;const dg=cam.fallT>FALL_LOOK?Math.min(4,(-p.vy-4)*.14):0;cam.down+=(dg-cam.down)*ease(dg>cam.down?3:5,dt);
    const aim=!p.dead&&(p.draw||(p.swing&&p.swing.aim!=null&&!(ITEMS[p.swing.tool]||{}).rod));let lg=p.dead?0:p.face*LOOK_X,lyg=0;
    if(aim){lg=clamp((mouse.wx-p.x)*.35,-LOOK_X*1.3,LOOK_X*1.3);lyg=clamp((mouse.wy-p.y-1)*.25,-1.5,1.5);}
    cam.look+=(lg-cam.look)*ease(aim?4:1/LOOK_T,dt);cam.ly+=(lyg-cam.ly)*ease(4,dt);
    tx=p.x+cam.look+p.vx*.12;ty=lerp(cam.gy,p.y,cam.fw)+1.2+(p.stepOff||0)-cam.down+cam.ly;
    let near=false;if(!p.dead&&!reduceMotion()){if(boss&&!boss.dying&&Math.hypot(boss.x-p.x,boss.y-p.y)<24)near=true;else for(const e of enemies)if(e.elite&&!e.dying&&Math.abs(e.x-p.x)<12&&Math.abs(e.y-p.y)<8){near=true;break;}}
    cam.zoom+=((near?CZOOM:1)-cam.zoom)*ease(near?1.2:.8,dt);zk=cam.zoom*(1-.07*camPunch*camPunch);setCamPunch(Math.max(0,camPunch-dt*3));}
  else{cam.gy=null;cam.fw=1;cam.look=cam.ly=cam.down=0;cam.zoom=1;}
  // camFocus (boss intros and defeats) overrides all of the above while it runs
  if(camFocus.t>0&&play){camFocus.t-=dt;const e=camFocus.t,w=Math.max(0,Math.min(1,(camFocus.dur-e)/.45,e/.6)),s2=w*w*(3-2*w),f=camFocus.at&&camFocus.at();if(f){tx=lerp(tx,f[0],s2);ty=lerp(ty,f[1],s2);}zk=lerp(zk,camFocus.zoom,s2);}
  // a long fall follows faster, so the player doesn't drop out of the bottom of the view
  const kx=play?ease(6,dt):1,ky=play?ease(5+cam.fw*Math.max(0,-p.vy)*.25,dt):1;camT.x+=(tx-camT.x)*kx;camT.y+=(ty-camT.y)*ky;
  const cd=camDist*zk,vh=2*cd*Math.tan(16*Math.PI/180),vw=vh*camera.aspect;const cx=clamp(camT.x,vw/2+1,W-vw/2-1),cy=clamp(camT.y,vh/2+2,H-vh/2);
  // shake: trauma decays at TRAUMA_DECAY a second; kick: a critically damped spring (KICK_W rad/s), substepped so it holds at 30 fps
  let sx=0,sy=0,roll=0;cam.nt+=dt;if(trauma>0){setTrauma(Math.max(0,trauma-dt*TRAUMA_DECAY));const s2=trauma*trauma;sx=s2*SHAKE_MAX*wig(cam.nt*17,.5);sy=s2*SHAKE_MAX*wig(cam.nt*17,9.5);roll=s2*SHAKE_ROLL*wig(cam.nt*11,21.5);}
  const K=camKick;if(K.x||K.y||K.vx||K.vy){const n=4,h=dt/n;for(let i=0;i<n;i++){K.vx+=(-KICK_W*KICK_W*K.x-2*KICK_W*K.vx)*h;K.vy+=(-KICK_W*KICK_W*K.y-2*KICK_W*K.vy)*h;K.x+=K.vx*h;K.y+=K.vy*h;}
    if(Math.abs(K.x)+Math.abs(K.y)<1e-4&&Math.abs(K.vx)+Math.abs(K.vy)<1e-3)K.x=K.y=K.vx=K.vy=0;sx+=K.x;sy+=K.y;}
  camera.position.set(cx+sx,cy+3.6+sy,cd);camera.lookAt(cx+sx,cy+.4+sy,0);if(roll)camera.rotateZ(roll);
  // mouse world
  [mouse.wx,mouse.wy]=screenToWorld(mouse.x,mouse.y);
  if(pad.active&&state==='play')padAim(p,dt);
  // touch: aim with the Use stick (kept briefly after letting go), else just ahead of the player, unless a finger is on the world
  else if(touch.on&&state==='play'&&!touch.world){if(touch.aim){touch.aimX=touch.aim[0];touch.aimY=touch.aim[1];}touch.aimT-=dt;if(touch.aim||touch.aimT>0){mouse.wx=p.x+touch.aimX*4.5;mouse.wy=p.y+1+touch.aimY*4.5;}else{mouse.wx=p.x+p.face*1.3;mouse.wy=p.y+.5;}}
  const nv=hasBuff('night')||hasBuff('ghost');U.uP.value.set(p.x,p.y+1,hasAcc('light')?11:nv?10:4.5);U.uGlow.value=p.dead?0:(hasAcc('light')?.95:nv?.75:.32);}
// gamepad aim: the right stick's tilt sets how far out, from beside the player to the edge of reach (the Reach accessory
// included), eased so a shaky thumb doesn't jitter it; tile tools snap to a tile and keep it until the aim is well into
// the next one. With the stick let go the aim stays put briefly, then sits just ahead of the player.
function padAim(p,dt){pad.aimT-=dt;const it=selItem(),snap=aimsTile(it)&&!cursor;
  if(pad.aimT<=0){pad.ax=null;pad.cell=null;mouse.wx=p.x+p.face*1.3;mouse.wy=p.y+.5;if(snap){mouse.wx=Math.floor(mouse.wx)+.5;mouse.wy=Math.floor(mouse.wy)+.5;}return;}
  const r=1.2+(pad.aimR??1)*((hasAcc('reach')?7.5:5.5)-1.2),gx=p.x+pad.aimX*r,gy=p.y+.9+pad.aimY*r;
  if(pad.ax==null){pad.ax=gx;pad.ay=gy;}else{const k=Math.min(1,dt*22);pad.ax+=(gx-pad.ax)*k;pad.ay+=(gy-pad.ay)*k;}
  if(!snap){pad.cell=null;mouse.wx=pad.ax;mouse.wy=pad.ay;return;}
  const c=pad.cell,m=.22;if(!c||pad.ax<c[0]-m||pad.ax>c[0]+1+m||pad.ay<c[1]-m||pad.ay>c[1]+1+m)pad.cell=[Math.floor(pad.ax),Math.floor(pad.ay)];
  mouse.wx=pad.cell[0]+.5;mouse.wy=pad.cell[1]+.5;}
// screen px to world coordinates on the z=.5 plane the tiles sit on
export function screenToWorld(x,y){const v=new THREE.Vector3((x/innerWidth)*2-1,-(y/innerHeight)*2+1,.5).unproject(camera).sub(camera.position).normalize();const t=(.5-camera.position.z)/v.z;return[camera.position.x+v.x*t,camera.position.y+v.y*t];}
// Imported bindings are read-only, so other modules assign these through setters.
export function setWorldClock(v){return worldClock=v;}
