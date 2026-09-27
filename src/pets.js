// Pets (cosmetic followers) and mounts.
import {
  boxHits,burst,canvasTex,circ,fi,hook,INK,ink,isSolid,ITEMS,makeSheet,player,poly,rr,setTint,SFX,SHEETS,
  scene,spriteMesh,stat,state,toast,
} from './game.js';

// ================= pets & mounts =================
// A pet follows you while its item is in your backpack; use the item to call it or send it home (player.pet, saved).
// A mount is ridden while its item is in your backpack: use the item or press the Mount key (player.mount, not saved).
// `how` is shown in the Party menu until you own one.
export const PETS={
  frog:{name:'Paper Frog',item:'pet_frog',hop:1,how:'Fold one at a Workbench from Paper Sheets and Gel.'},
  kit:{name:'Fox Kit',item:'pet_kit',how:'Fold Foxes in the Origami Snowfield sometimes leave a cub behind.'},
  moth:{name:'Lamp Moth',item:'pet_moth',fly:1,how:'The Farmer has a favor to ask once the harvest supper is over.'},
  crease:{name:'Little Crease',item:'pet_crease',fly:1,how:'Dropped by The Unfolded, and now and then by elite foes in an awakened world.'},
};
export const PETORDER=['frog','kit','moth','crease'];
// spd/jump multiply run speed and jump height; h is the rider's hitbox height; lift raises the rider's sprite onto the saddle
export const MOUNTS={stag:{name:'Origami Stag',item:'stag',spd:1.65,jump:1.15,h:2.45,lift:.58,how:'Forge one at an Iron Anvil from Paper Sheets, Gold Bars and Crane Plumes.'}};
export const petS={x:0,y:0,vy:0,t:0,rot:0,hopT:0,type:null,mesh:null,checkT:0};
const ride={mesh:null,t:0,dustT:0,checkT:0};
// sprites face right. Pets are 96×96 (ground pets stand on the bottom edge), the stag is 160×112 with 3 frames: stand, gallop, gallop.
export function drawPet(t,k,f){
  if(k==='frog'){const j=f?-8:0;
    if(f){poly(t,[30,78+j,6,92,16,95,38,82+j]);fi(t,'#4f9a36',2);}else{poly(t,[14,88,8,94,36,94,32,84]);fi(t,'#4f9a36',2);}
    poly(t,[18,88+j,28,60+j,58,54+j,78,66+j,76,88+j]);fi(t,'#6dbb4a');poly(t,[28,60+j,58,54+j,52,88+j]);t.fillStyle='rgba(255,255,255,.18)';t.fill();
    t.beginPath();t.moveTo(28,60+j);t.lineTo(52,88+j);ink(t,1.5,'rgba(42,33,48,.35)');
    poly(t,[64,82+j,70,95,82,95,74,80+j]);fi(t,'#4f9a36',2);
    for(const[x,y]of[[60,52],[74,56]]){circ(t,x,y+j,7);fi(t,'#fbf8f0',2);circ(t,x+1.5,y+j,3);t.fillStyle=INK;t.fill();}
    t.beginPath();t.moveTo(70,72+j);t.quadraticCurveTo(76,76+j,80,72+j);ink(t,1.8);}
  else if(k==='kit'){const b=f?2:0;
    for(const[x,o]of[[30,b],[40,-b],[58,-b],[66,b]]){rr(t,x-3,78,7,16+o-(o>0?o*2:0),3);fi(t,'#c96a2a',2);}
    poly(t,[24,70,6,50,10,62,4,74,22,80]);fi(t,'#e0823d',2);poly(t,[6,50,10,62,4,58]);fi(t,'#f4f0e6',1.5);
    poly(t,[20,72,40,58,66,60,72,80,24,82]);fi(t,'#e0823d');poly(t,[40,58,66,60,56,80]);t.fillStyle='rgba(255,255,255,.2)';t.fill();
    poly(t,[60,60,70,40,80,50,90,60,74,72]);fi(t,'#e0823d');poly(t,[70,44,72,28,80,48]);fi(t,'#e0823d',2);poly(t,[73,42,74,34,77,45]);t.fillStyle='#3a2a24';t.fill();
    poly(t,[78,58,92,62,78,68]);fi(t,'#f4f0e6',2);circ(t,91,62,2.2);t.fillStyle=INK;t.fill();circ(t,76,54,2.6);t.fill();}
  else if(k==='moth'){const w=f?.55:1;
    t.save();t.translate(48,50);t.scale(w,1);t.translate(-48,-50);
    for(const s of[-1,1]){poly(t,[48,46,48+s*36,18,48+s*30,50]);fi(t,'#e9dcc0');poly(t,[48,52,48+s*26,76,48+s*10,70]);fi(t,'#d8c8a6');circ(t,48+s*24,34,5);fi(t,'#b06ad0',1.5);}
    t.restore();
    t.beginPath();t.ellipse(48,52,6,15,0,0,6.28);fi(t,'#6b4430');t.beginPath();t.ellipse(48,64,5,7,0,0,6.28);fi(t,'#ffd66b',2);
    for(const s of[-1,1]){t.beginPath();t.moveTo(48+s*2,38);t.quadraticCurveTo(48+s*6,26,48+s*12,24);ink(t,1.8);}
    circ(t,45,42,1.8);t.fillStyle=INK;t.fill();circ(t,51,42,1.8);t.fill();}
  else{const fl=f?6:0;
    poly(t,[24,30,70,22,76,66,32,74]);fi(t,'#f4f0e6');poly(t,[70,22,76,66,58+fl,40-fl]);fi(t,'#e9dcc0',2);
    t.beginPath();t.moveTo(24,30);t.lineTo(76,66);t.moveTo(46,26);t.lineTo(52,70);ink(t,1.6,'rgba(176,106,208,.7)');
    circ(t,40,46,3.2);t.fillStyle=INK;t.fill();circ(t,54,44,3.2);t.fill();t.beginPath();t.moveTo(42,56);t.quadraticCurveTo(47,60,52,55);ink(t,1.8);
    poly(t,[30,80,34,86,40,82,36,90,42,94,34,92,30,98,28,90,20,90,27,86]);t.fillStyle='rgba(176,106,208,.8)';t.fill();}}
export function drawStag(t,f){const g=f===1?1:f===2?-1:0;
  const leg=(x,y,a,c)=>{const ex=x+Math.sin(a)*34,ey=y+Math.cos(a)*34;t.beginPath();t.moveTo(x,y);t.lineTo(ex,ey);ink(t,9,INK);t.beginPath();t.moveTo(x,y);t.lineTo(ex,ey);ink(t,5.5,c);rr(t,ex-5,ey-2,10,7,2);fi(t,'#6b4430',1.5);};
  leg(46,68,-.35*g,'#d8ccb0');leg(112,66,.4*g,'#d8ccb0');
  poly(t,[34,40,22,30,30,52]);fi(t,'#e9dcc0',2);
  poly(t,[30,56,36,40,72,32,116,36,130,54,114,72,46,74]);fi(t,'#f4f0e6');
  poly(t,[72,32,116,36,98,72,60,72]);t.fillStyle='rgba(200,180,140,.28)';t.fill();
  t.beginPath();t.moveTo(72,32);t.lineTo(60,72);t.moveTo(116,36);t.lineTo(98,72);ink(t,1.5,'rgba(42,33,48,.3)');
  leg(56,70,.35*g,'#f4f0e6');leg(122,64,-.4*g,'#f4f0e6');
  poly(t,[108,44,122,20,136,24,130,52]);fi(t,'#f4f0e6');
  for(const[x,s]of[[126,-1],[132,1]]){t.beginPath();t.moveTo(x,18);t.lineTo(x+s*6,6);t.lineTo(x+s*2,0);t.moveTo(x+s*6,6);t.lineTo(x+s*14,2);ink(t,3.5,'#c9a574');}
  poly(t,[120,16,144,20,154,28,136,32,124,28]);fi(t,'#f4f0e6');poly(t,[124,16,118,6,130,14]);fi(t,'#e9dcc0',2);
  circ(t,137,21,2.6);t.fillStyle=INK;t.fill();circ(t,153,27,2.4);t.fill();
  poly(t,[62,34,98,34,94,52,66,52]);fi(t,'#d4483b');t.fillStyle='#f1c04f';t.fillRect(66,46,28,3);}
export function buildPetSheets(){for(const k of PETORDER){SHEETS['pet_'+k]=makeSheet(2,96,96,(t,f)=>drawPet(t,k,f));SHEETS['pet_'+k+'T']=canvasTex(SHEETS['pet_'+k]);}
  SHEETS.stag=makeSheet(3,160,112,(t,f)=>drawStag(t,f));SHEETS.stagT=canvasTex(SHEETS.stag);}
const hasIt=id=>player.inv.some(s=>s&&s.id===id);
// pets: using the item calls or dismisses that pet
export function togglePet(k){const p=player;if(p.pet===k){p.pet=null;toast(`${PETS[k].name} heads home.`);SFX.rustle(.3);}
  else{p.pet=k;petS.type=null;toast(`${PETS[k].name} is following you.`,'good');SFX.pick();stat('pets');}if(petS.mesh)burst(petS.x,petS.y+.4,['#fbf8f0','#e9dcc0'],10,3,{grav:0});}
// ground height near y for a pet: the top of the first solid tile with room above it, scanning down
function groundAt(x,y){const tx=Math.floor(x);for(let ty=Math.floor(y+2);ty>=Math.floor(y-10);ty--)if(isSolid(tx,ty)&&!isSolid(tx,ty+1))return ty+1;return null;}
function updatePet(dt){const p=player,k=p.pet;
  if(k&&(petS.checkT-=dt)<=0){petS.checkT=.5;if(!hasIt(PETS[k].item)){p.pet=null;return;}}
  if(!k||p.dead){if(petS.mesh)petS.mesh.visible=false;return;}const def=PETS[k];
  if(petS.type!==k){if(petS.mesh){scene.remove(petS.mesh);petS.mesh.geometry.dispose();petS.mesh.material.dispose();}petS.mesh=spriteMesh(SHEETS['pet_'+k+'T'],2,1,1,!def.fly);petS.mesh.position.z=.14;petS.type=k;petS.x=p.x-p.face*2;petS.y=p.y+(def.fly?2:0);petS.vy=0;}
  petS.t+=dt;const tx=p.x-p.face*2.4,m=petS.mesh;
  if(Math.hypot(petS.x-p.x,petS.y-p.y)>16){petS.x=tx;petS.y=p.y+(def.fly?2:0);petS.vy=0;burst(petS.x,petS.y+.5,['#fbf8f0','#e9dcc0'],10,3,{grav:0});}
  let moving=false,f=0;
  if(def.fly){const ty=p.y+p.h+.3+Math.sin(petS.t*2.6)*.3;petS.x+=(tx-petS.x)*Math.min(1,dt*3.5);petS.y+=(ty-petS.y)*Math.min(1,dt*3.5);moving=Math.abs(tx-petS.x)>.3;f=Math.floor(petS.t*(moving?10:6))%2;}
  else{const dx=tx-petS.x,g=groundAt(petS.x,petS.y),onG=g!=null&&petS.y<=g+.02&&petS.vy<=0;petS.hopT-=dt;
    if(def.hop){if(onG&&Math.abs(dx)>.7&&petS.hopT<=0){petS.vy=9+Math.min(4,Math.abs(dx)*.4);petS.hopT=.3;SFX.rustle(.08,1.6);}if(!onG)petS.x+=Math.sign(dx)*Math.min(Math.abs(dx)*5,12)*dt;}
    else if(Math.abs(dx)>.4){petS.x+=Math.sign(dx)*Math.min(Math.abs(dx)*4,13)*dt;moving=true;}
    const ga=groundAt(petS.x+Math.sign(dx)*.5,petS.y);if(onG&&ga!=null&&ga>petS.y+.3&&ga-petS.y<4)petS.vy=Math.sqrt(80*(ga-petS.y+.5));
    petS.vy-=40*dt;petS.y+=petS.vy*dt;const g2=groundAt(petS.x,petS.y);if(g2!=null&&petS.y<g2&&petS.vy<=0){petS.y=g2;petS.vy=0;}
    f=def.hop?(g2!=null&&petS.y<=g2+.02?0:1):moving?Math.floor(petS.t*10)%2:0;}
  const face=Math.abs(tx-petS.x)>.3?(tx>petS.x?1:-1):p.face;petS.rot+=((face>0?0:Math.PI)-petS.rot)*Math.min(1,dt*12);
  m.visible=true;m.rotation.y=petS.rot;m.position.set(petS.x,petS.y,.14);m.material.uniforms.uFrame.value=f;
  if(k==='moth')m.material.uniforms.uTint.value.set(1.1,1.08,1.02);else setTint(m.material,petS.x,petS.y+.5);}
// mounts
const mountItem=()=>{for(const s of player.inv)if(s&&ITEMS[s.id].mount)return ITEMS[s.id].mount;return null;};
export function toggleMount(k){const p=player;if(state!=='play'||p.dead)return;if(p.mount){dismount();return;}
  k=k||mountItem();if(!k){toast('You have no mount. Forge an Origami Stag at an Iron Anvil.');return;}const M=MOUNTS[k];
  if(p.flat||p.climb||hook.state===2){toast('Get your footing before you mount.','bad');return;}
  if(boxHits(p.x,p.y,p.w,M.h)){toast('Not enough headroom to mount here.','bad');return;}
  p.mount=k;p.h=M.h;ride.checkT=.5;SFX.unfold();burst(p.x,p.y+.8,['#fbf8f0','#e9dcc0','#d4483b'],16,4,{grav:3});stat('mounts');}
export function dismount(quiet){const p=player;if(!p.mount)return;p.mount=null;p.rideY=0;p.h=p.flat?.85:1.82;if(ride.mesh)ride.mesh.visible=false;if(!quiet){SFX.rustle(.3);burst(p.x,p.y+.6,['#fbf8f0','#e9dcc0'],12,3,{grav:3});}}
function updateMount(dt){const p=player,k=p.mount;
  if(k&&(ride.checkT-=dt)<=0){ride.checkT=.5;if(!hasIt(MOUNTS[k].item)){dismount();return;}}
  if(!k||p.dead){if(ride.mesh)ride.mesh.visible=false;p.rideY=0;return;}const M=MOUNTS[k];
  if(!ride.mesh){ride.mesh=spriteMesh(SHEETS.stagT,3,160/60,112/60,true);}
  ride.t+=dt;const run=p.onGround&&Math.abs(p.vx)>.8,bob=run?Math.abs(Math.sin(ride.t*13))*.08:0;p.rideY=M.lift+bob;
  const m=ride.mesh;m.visible=true;m.rotation.y=p.rot;m.position.set(p.x,p.y+bob*.5,.155);m.material.uniforms.uFrame.value=!p.onGround?1:run?1+Math.floor(ride.t*9)%2:0;
  m.material.uniforms.uFlash.value=p.mat.uniforms.uFlash.value;setTint(m.material,p.x,p.y+1);
  if(run&&Math.abs(p.vx)>6){ride.dustT-=dt;if(ride.dustT<=0){ride.dustT=.1;burst(p.x-p.face*.9,p.y+.05,['#e9dfc9','#c9a574'],2,1.5,{up:1.2,grav:6,life:.45});}}}
export function updatePets(dt){updatePet(dt);updateMount(dt);}
export function hidePets(){if(petS.mesh)petS.mesh.visible=false;if(ride.mesh)ride.mesh.visible=false;}
