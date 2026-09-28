// Player physics, combat, mining/placing, enemy AI, spawning, bosses and events.
import * as THREE from 'three';
import {
  bossDefeatFx,bossHeld,bossLook,bossPhaseFx,crops,DEFEAT_T,markChunk,RARE,RARECOL,RAREHOW,reduceMotion,RSEEDS,RSOIL,teleOutline,wev,
  $,AC,addItem,ambBus,BADGES,FCLIP,HUMANFOE,FOLK,rigPlay,rigSet,rigUpdate,rigJoint,bestDrop,bestKill,BIO,biomeAt,boss,boxHits,BUFFS,burst,camera,camT,chests,
  clamp,collide,consumeSel,countItem,crackerBoom,cursor,DASH_V,defense,dormant,dropItem,dummy,edmg,ELEM,
  ELITE_LOOT,ELITE_TINT,TRAITS,traitOf,eclipseOn,migPick,EN,enemies,floatText,H,hasAcc,hasBadge,hasBuff,held,HERBCOL,HERBS,iconTex,idx,
  INKTINT,inNiceWin,isFest,invOpen,isNight,isOpaque,isSolid,ITEMS,keys,touch,lerp,lightAt,makeElite,markDirty,meta,
  mouse,N,NICE_LATE,niceW,noise,noiseBuf,NPCDEF,npcs,OPAQUE,openSide,pad,parts,pick,pickups,player,
  popUp,projs,pt,pv,questDone,quests,rand,randi,removeEnemy,removeItem,rollWeather,scene,SEEDIDS,selItem,SET,
  setBoss,setInv,shoulderAt,setInvDirty,setTile,setTint,SFX,sh,shieldItem,SOIL,SOLID,spawnEnemy,spawnGhost,
  spriteMat,stat,state,surf,surfAvg,syncPartners,T,talkTo,threadGeo,tileAt,tiles,toast,tone,TP,U,
  palEv,partnerCheer,FISH,season,festival,worldDay,hasNPC,META,
  updateCoins,updateDashHud,updateDrawHud,updateEnemyFx,updateGhosts,upx,W,WALLCOL,WALLDROP,walls,
  worldClock,worldTime,digFossil,evKill,fcount,npcLine,plain,clockRoom,layerAt,crankAt,gateAt,
  guideEv,dismount,MOUNTS,petS,toggleMount,togglePet,NDL,emit,loreChest,readMural,PF,lookColors,SHEETS,canvasTex,fullSet,setOn,setMul,SETS,
} from './game.js';

// ================= gameplay =================
export const FLY_T=1.6;
export function reachOK(tx,ty,r=6){r+=hasAcc('reach')?2:0;return Math.hypot(tx+.5-player.x,ty+.5-(player.y+.9))<=r;}
export function breakTile(x,y,drop=true){const i=idx(x,y),t=tiles[i];if(t===T.AIR)return;const d=TP[t];
  if(t===T.CROP){const m=meta[i],ty=Math.min(4,m>>2),st=m&3;setTile(x,y,T.AIR);if(drop){if(st>=2){dropItem(HERBS[ty][0],randi(1,2),x+.5,y+.5);dropItem(SEEDIDS[ty],randi(1,3),x+.5,y+.5);stat('harvests');fcount('harvest');}else dropItem(SEEDIDS[ty],1,x+.5,y+.5);}burst(x+.5,y+.5,['#5aa83c','#86d15f'],6,3);SFX.dig();return true;}
  if(t===T.RARE){const m=meta[i],ty=Math.min(3,m>>2),st=m&3;setTile(x,y,T.AIR);if(drop){if(st>=2){dropItem(RARE[ty][0],1,x+.5,y+.5);dropItem(RSEEDS[ty],randi(1,2),x+.5,y+.5);stat('harvests');fcount('harvest');}else dropItem(RSEEDS[ty],1,x+.5,y+.5);}burst(x+.5,y+.5,[RARECOL[ty],'#86d15f'],6,3);SFX.dig();return true;}
  if(t===T.THIN){setTile(x,y,T.INK);burst(x+.5,y+.5,['#cfe8f5','#fbf8f0','#8fb8d0'],10,4);SFX.brk();supportCheck(x,y);return true;}
  if(drop&&t===T.TUFT&&Math.random()<.07)dropItem('seed_sun',1,x+.5,y+.5);if(drop&&t===T.BLOOM&&Math.random()<.12)dropItem('seed_frost',1,x+.5,y+.5);
  if(t===T.CHEST){const box=chests.get(i);if(box&&box.some(Boolean)){toast('Empty the chest before breaking it.','bad');return false;}chests.delete(i);}
  if(t===T.TRUNK){let by=y;while(tileAt(x,by-1)===T.TRUNK)by--;let ty=by,n=0;while(tileAt(x,ty)===T.TRUNK){setTile(x,ty,T.AIR);burst(x+.5,ty+.5,['#7b5234','#5a3a22'],4,3);n++;ty++;}
    burst(x+.5,ty+2,['#5aa83c','#86d15f','#3f7a2b'],30,6,{grav:6,life:1.6});dropItem('wood',n+3,x+.5,by+1);SFX.brk();questDone('tree');stat('trees');supportCheck(x,by);return true;}
  if(t===T.DOOR){const top=meta[i]&2;const oy=top?y-1:y+1;if(tileAt(x,oy)===T.DOOR)setTile(x,oy,T.AIR);}
  const dId=t===T.FAKE&&meta[i]?['stone','brick','dirt'][meta[i]]:d.drop;setTile(x,y,T.AIR);if(drop&&dId)dropItem(dId,1,x+.5,y+.5);if(drop)digFossil(x,y,t);
  burst(x+.5,y+.5,[d.col,sh(d.col,.75),sh(d.col,1.2)],OPAQUE[t]?12:6,4.5);SFX.brk();supportCheck(x,y);return true;}
function supportCheck(x,y){const dn=tileAt(x,y-1);if(dn!==T.AIR&&TP[dn]&&TP[dn].hang&&!(isSolid(x,y)||tileAt(x,y)===T.PLATFORM||(TP[dn].wallok&&walls[idx(x,y-1)])))breakTile(x,y-1);const up=tileAt(x,y+1);if(up===T.TRUNK){breakTile(x,y+1);return;}if(up!==T.AIR&&TP[up].floor&&!isSolid(x,y)&&!(up===T.DOOR&&(meta[idx(x,y+1)]&2)))breakTile(x,y+1);
  for(const[dx,dy]of[[0,1],[-1,0],[1,0],[0,-1]]){const nx=x+dx,ny=y+dy;if(tileAt(nx,ny)===T.TORCH&&!torchSupported(nx,ny))breakTile(nx,ny);}}
function torchSupported(x,y){return walls[idx(x,y)]>0||isOpaque(x,y-1)||isOpaque(x-1,y)||isOpaque(x+1,y);}
function entityIn(x,y){const hit=e=>e.x+e.w/2>x&&e.x-e.w/2<x+1&&e.y+e.h>y&&e.y<y+1;return hit(player)||enemies.some(hit)||npcs.some(hit);}
function tryPlace(it,tx,ty){if(!reachOK(tx,ty))return false;const i=idx(tx,ty);if(tx<1||ty<1||tx>=W-1||ty>=H-6)return false;
  if(it.rare!=null){const cur=tiles[i];if(cur!==T.AIR&&!(TP[cur].repl&&!TP[cur].liq))return false;if(!RSOIL[it.rare].includes(tileAt(tx,ty-1)))return false;setTile(tx,ty,T.RARE,it.rare*4);return true;}
  if(it.seed!=null){const cur=tiles[i];if(cur!==T.AIR&&!(TP[cur].repl&&!TP[cur].liq))return false;if(!SOIL[it.seed].includes(tileAt(tx,ty-1)))return false;setTile(tx,ty,T.CROP,it.seed*4);return true;}
  if(it.wall){if(walls[i]||OPAQUE[tiles[i]])return false;const nb=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>walls[idx(tx+dx,ty+dy)]||isSolid(tx+dx,ty+dy));if(!nb)return false;walls[i]=it.wall;markDirty(tx,ty);return true;}
  const t=it.place,cur=tiles[i];
  if(t===T.ROPE&&cur===T.ROPE){let y=ty;while(tileAt(tx,y)===T.ROPE)y--;if(tileAt(tx,y)===T.AIR&&reachOK(tx,y,9)){setTile(tx,y,T.ROPE);return true;}return false;}
  if(cur!==T.AIR&&!TP[cur].repl)return false;const d=TP[t];
  if(t===T.ROPE){if(!(isSolid(tx,ty+1)||tileAt(tx,ty+1)===T.ROPE||tileAt(tx,ty-1)===T.ROPE||tileAt(tx,ty+1)===T.PLATFORM))return false;setTile(tx,ty,T.ROPE);return true;}
  if(t===T.DOOR){if(tileAt(tx,ty+1)!==T.AIR||!isOpaque(tx,ty-1)||entityIn(tx,ty)||entityIn(tx,ty+1))return false;setTile(tx,ty,T.DOOR,0);setTile(tx,ty+1,T.DOOR,2);return true;}
  if(d.floor&&!(isOpaque(tx,ty-1)||(d.onTable&&[T.TABLE,T.BENCH,T.SHELF].includes(tileAt(tx,ty-1)))))return false;
  if(d.wallmount&&!walls[i])return false;
  if(d.hang&&!(isSolid(tx,ty+1)||tileAt(tx,ty+1)===T.PLATFORM||(d.wallok&&walls[i])))return false;
  if(t===T.TORCH&&!torchSupported(tx,ty))return false;
  if(SOLID[t]){if(entityIn(tx,ty))return false;const nb=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>isSolid(tx+dx,ty+dy)||tileAt(tx+dx,ty+dy)===T.PLATFORM)||walls[i];if(!nb)return false;}
  if(t===T.PLATFORM){const nb=[[1,0],[-1,0],[0,-1]].some(([dx,dy])=>isSolid(tx+dx,ty+dy)||tileAt(tx+dx,ty+dy)===T.PLATFORM)||walls[i];if(!nb)return false;}
  setTile(tx,ty,t,0);if(t===T.CHEST)chests.set(i,new Array(20).fill(null));return true;}
export function hurtEnemy(e,dmg,dir,kb=5,crit=false,elem=null){if(e.dying)return;if(e.folded){floatText(e.x,e.y+e.h,'Folded!','crit');return;}if(e.parent){e.flash=.12;return hurtEnemy(e.parent,dmg,dir,0,crit,elem);}
  if(e.act==='phase'){if(!(e.tagT>0)){e.tagT=.5;floatText(e.x,e.y+e.h,'refolding','miss');}return;}if(bossHeld(e))return;
  if(e.burrow){floatText(e.x,e.y+.6,'dug in','miss');burst(e.x,e.y+.2,['#e3c77d','#c9a574'],5,3,{up:1});return;}
  const cracked=e.broke>worldClock;if(e.type==='scarab'&&!cracked&&e.act!=='open'&&dir===-e.face&&player.y<e.y+e.h-.3){dmg*=.15;kb*=.3;floatText(e.x,e.y+e.h+.4,'clink!','miss');tone(1400,1100,.07,'square',.06);}
  let tag=null;if(elem){if((e.weak||e.d.weak)===elem){dmg*=1.5;tag='weak';stat('weakhits');}else if((e.res||e.d.res)===elem){dmg*=.5;tag='res';}}if(e.st&&e.st.soak>0)dmg*=1.25;
  if(e.trait==='armored'&&!crit&&!cracked&&tag!=='weak'){dmg*=.5;kb=0;if(!(e.tagT>0)){e.tagT=.8;floatText(e.x,e.y+e.h+.6,'armored','miss');}tone(1300,1000,.06,'square',.05);}
  if(e.elite)kb*=e.trait==='giant'?.15:.5;if(hasBadge('power'))dmg*=1.15;if(hasBuff('fed'))dmg*=1.05;if(hasBuff('charged')||(hasBuff('lunar')&&isNight()))dmg*=1.1;const real=Math.max(1,Math.round(dmg-(cracked?0:e.d.def/2)));e.hp-=real;e.flash=.12;e.vx=dir*kb*(e.d.boss?.25:1);if(!e.d.fly||true)e.vy=Math.max(e.vy,e.d.boss?2:5);
  floatText(e.x,e.y+e.h,crit?real+'!':real,crit?'crit':tag==='weak'?'weak':'');if(tag&&!(e.tagT>0)){e.tagT=1.2;floatText(e.x,e.y+e.h+.6,tag==='weak'?'weak!':'resist',tag==='weak'?'tag '+elem:'miss');}burst(e.x,e.y+e.h/2,e.d.col,5,4);emit('hit',e.x-dir*e.w*.3,e.y+e.h/2,{n:crit?9:5});SFX.hit();shake(crit?.25:.1);hitPause(crit?.09:.04);e.hpShow=3;
  if(e.hp<=0)killEnemy(e);else if(elem&&tag!=='res')applyStatus(e,elem,real);}
// a boss's last hit starts its defeat sequence (updateEnemies holds it for DEFEAT_T, then kills it for real and the loot drops)
function killEnemy(e){if(e.d.boss&&!e.parent){if(!e.defeat){e.defeat=true;e.act='defeat';e.at=DEFEAT_T;e.hp=0;e.st=null;hitPause(.35);bossDefeatFx(e);return;}if(e.act==='defeat')return;}e.dying=.3;stat('kills');bestKill(e);evKill(e);palEv('kill',e);hitPause(e.d.boss?.35:.07);SFX.brk();burst(e.x,e.y+e.h/2,e.d.col.concat(['#fbf8f0']),e.d.boss?80:22,e.d.boss?9:6,{grav:9,life:1.3});
  const[c0,c1]=e.d.coins;const coins=Math.round(randi(c0,c1)*(hasBadge('money')?1.5:1)*(e.elite?3:1)*(e.awake?1.5:1));if(!e.parent&&!e.d.boss){if(hasBadge('heartf')&&Math.random()<.22)dropItem('hpheart',1,e.x,e.y+e.h/2);if(hasBadge('flowerf')&&Math.random()<.22)dropItem('mpstar',1,e.x,e.y+e.h/2);}dropItem('coin',e.inked?coins*2:coins,e.x,e.y+e.h/2);if(e.inked||e.type==='wraith'){if(Math.random()<.5)dropItem('moonink',randi(1,e.type==='wraith'?3:2),e.x,e.y+e.h/2);if(e.inked&&Math.random()<.05)dropItem('seed_moon',1,e.x,e.y+e.h/2);}else if(isNight()&&!e.d.boss&&!e.parent&&Math.random()<.04)dropItem('moonink',1,e.x,e.y+e.h/2);for(const[id,a,b,p]of e.d.drops)if(Math.random()<(e.elite?Math.min(1,p*2):p)){const n=randi(a,b)+(e.elite?1:0);dropItem(id,n,e.x,e.y+e.h/2);bestDrop(e,id,n);}
  if(e.trait==='golden'){dropItem('coin',coins*4+randi(20,60),e.x,e.y+e.h/2);if(Math.random()<.35)dropItem('goldbar',1,e.x,e.y+e.h/2);burst(e.x,e.y+e.h/2,['#f1c04f','#fff3c0','#d4a02a'],30,6,{bright:1});}
  else if(e.trait==='inky'&&Math.random()<.7)dropItem('moonink',randi(1,3),e.x,e.y+e.h/2);
  if(e.trait==='explosive')fuses.push({x:e.x,y:e.y+e.h/2,t:.8,dmg:edmg(e)*1.3,src:e});
  if(e.elite){dropItem(pick(ELITE_LOOT),1,e.x,e.y+e.h/2);stat('elites');if(e.awake&&Math.random()<.02)dropItem('pet_crease',1,e.x,e.y+e.h/2);}
  if(e.d.split)for(let k=0,n=e.elite?3:2;k<n;k++){const s=spawnEnemy(e.d.split,e.x+(k-(n-1)/2)*.5,e.y+.2);s.vx=(k-(n-1)/2)*5||rand(-2,2);s.vy=9;s.timer=rand(.5,1);}
  if(e.segs)e.segs.forEach(sg=>{if(!sg.dying){sg.dying=.35;burst(sg.x,sg.y+sg.h/2,e.d.col,14,6,{grav:6});}});
  if(e.d.boss){questDone(e.d.quest);partnerCheer(2);playerCheer(1.6);setTimeout(()=>syncPartners(),1200);if(e.type==='king')stat('kings');else stat('k_'+e.type);setBoss(null);$('boss').hidden=true;toast(`${e.d.name} has been defeated!`,'gold');SFX.boom();shake(.6);}}
export function stompNice(){const e=player.stompTarget;player.stompWin=0;player.stompTarget=null;if(!e||e.dying)return;hurtEnemy(e,14*(hasBadge('stomp')?2:1),player.face,3,true);stat('nices');floatText(e.x,e.y+e.h+.6,'NICE!','nice');SFX.nice();player.vy=Math.max(player.vy,17);}
function steam(x,y){burst(x,y,['#fbf8f0','#dfe6ea','#c9d4da'],10,2.5,{grav:-3,life:.8});SFX.sizzle();}
// statuses from typed damage. Enemies keep them in e.st, the player in player.st (seconds left). Bosses shrug them off twice as fast.
function applyStatus(e,elem,n){const st=e.st||(e.st={burn:0,ink:0,soak:0}),b=e.d.boss?.5:1;
  if(elem==='fire'){if(st.soak>0){st.soak=0;steam(e.x,e.y+e.h/2);return;}if(!(st.burn>0))e.burnT=.5;st.burn=3*b;e.burnDmg=Math.max(2,Math.round(n*.15));}
  else if(elem==='water'){if(st.burn>0){st.burn=0;steam(e.x,e.y+e.h/2);}st.soak=4*b;}
  else if(elem==='ink')st.ink=2.5*b;}
function tickStatus(e,dt){const st=e.st;st.ink-=dt;st.soak-=dt;if(!(st.burn>0))return;st.burn-=dt;e.burnT-=dt;
  if(e.burnT<=0&&!e.folded){e.burnT=.5;e.hp-=e.burnDmg;e.hpShow=3;floatText(e.x,e.y+e.h,e.burnDmg,'tag fire');if(e.hp<=0)killEnemy(e);}}
const BURNTINT=new THREE.Vector3(1.25,.85,.7),STAINTINT=new THREE.Vector3(.7,.62,.95),SOAKTINT=new THREE.Vector3(.8,.95,1.22);
function statusFx(e,m,dt){const st=e.st,u=m.material.uniforms.uTint.value,rx=()=>e.x+rand(-.4,.4)*e.w;
  if(st.burn>0){u.multiply(BURNTINT);if(Math.random()<dt*22)emit('embers',rx(),e.y+rand(.1,.8)*e.h,{cols:ELEM.fire.col,spd:1,grav:-5,life:.5,sway:0});}
  if(st.ink>0){u.multiply(STAINTINT);if(Math.random()<dt*10)emit('ink',rx(),e.y+e.h*.3,{cols:ELEM.ink.col,n:1,spd:.4});}
  if(st.soak>0){u.multiply(SOAKTINT);m.scale.x*=1.04;m.scale.y*=.93;if(Math.random()<dt*9)burst(rx(),e.y+rand(.2,1)*e.h,ELEM.water.col,1,.4,{grav:8,life:.6});}}
function playerStatus(elem){const p=player,st=p.st||(p.st={});
  if(elem==='fire'){if(hasBuff('fire'))return;if(st.soak>0){st.soak=0;steam(p.x,p.y+1);return;}st.burn=3;}
  else if(elem==='water'){if(st.burn>0){st.burn=0;steam(p.x,p.y+1);}st.soak=4;}
  else if(elem==='ink')st.ink=2.5;}
export const PSTAT={burn:['fire','Losing life. Swim in ink or get soaked to put it out.'],ink:['ink','Moving slower.'],soak:['water','-4 defense, but you can\'t catch fire.']};
function updatePlayerStatus(dt){const p=player,st=p.st;if(!st)return;for(const k in st)st[k]-=dt;
  if(st.burn>0){if(p.inLiq===T.INK||hasBuff('fire'))st.burn=0;else{p.hp-=4*dt;p.regenT=0;if(Math.random()<dt*20)emit('embers',p.x+rand(-.3,.3),p.y+rand(.2,1.6),{cols:ELEM.fire.col,spd:1,grav:-5,life:.5,sway:0});if(p.hp<=0){p.hp=0;die();return;}}}
  if(st.ink>0&&Math.random()<dt*8)emit('ink',p.x+rand(-.3,.3),p.y+1,{cols:ELEM.ink.col,n:1,spd:.4});
  if(st.soak>0&&Math.random()<dt*8)burst(p.x+rand(-.3,.3),p.y+rand(.3,1.7),ELEM.water.col,1,.4,{grav:8,life:.6});}
// status overlays: a burning, ink-stained or soaked player is tinted like an enemy (statusFx) and wears a cut-paper overlay
// (SHEETS.pstatus: 0 flames, 1 ink, 2 drips) as its own mesh over the sprite; burning shows over ink over soaked
let stMesh=null;
function statusOverlay(dt){const p=player,st=p.st||{},m=p.mesh,f=st.burn>0?0:st.ink>0?1:st.soak>0?2:-1;
  if(f>=0){const u=p.mat.uniforms.uTint.value;if(st.burn>0)u.multiply(BURNTINT);if(st.ink>0)u.multiply(STAINTINT);if(st.soak>0)u.multiply(SOAKTINT);}
  if(f<0||p.dead||!m.visible){if(stMesh)stMesh.visible=false;return;}
  if(!stMesh){const g=new THREE.PlaneGeometry(1.6,2.4);g.translate(0,1.2,0);stMesh=new THREE.Mesh(g,spriteMat(canvasTex(SHEETS.pstatus),3));stMesh.renderOrder=4;scene.add(stMesh);}
  p.stT=(p.stT||0)+dt;const u=stMesh.material.uniforms;u.uFrame.value=f;setTint(stMesh.material,p.x,p.y+1);
  stMesh.visible=true;stMesh.position.set(p.x,m.position.y+(f===2&&!reduceMotion()?-Math.abs(Math.sin(p.stT*3))*.05:0),.2);
  // flames flicker by flipping the cut-out every few frames
  const fl=f===0&&!reduceMotion()&&Math.floor(p.stT*9)&1?-1:1;stMesh.scale.set(m.scale.x*fl,m.scale.y,1);stMesh.rotation.y=m.rotation.y;}
// shields: the best shield worn in an accessory slot blocks. Raising it within PARRY_W of a hit parries: no damage, attacker staggered, projectiles bounce back.
const PARRY_W=.2,COUNTER_W=.9;
function parry(src){const p=player;p.inv_t=.35;p.parryT=.3;p.counterT=COUNTER_W;p.parryOK=false;p.shieldFlash=.3;stat('parries');const cx=p.x+p.face*.7,cy=p.y+1.1;
  floatText(cx,p.y+2.4,'PARRY!','nice');SFX.parry();hitPause(.12);shake(.22);burst(cx,cy,['#fff3c0','#f1c04f','#fbf8f0'],18,7,{grav:0,life:.35,bright:1});$('vig').classList.add('parry');setTimeout(()=>$('vig').classList.remove('parry'),200);
  if(src.k){const sp=Math.hypot(src.vx,src.vy)*1.2;src.hostile=false;src.src='parry';src.hit=new Set();src.dmg*=1.5;src.t=0;src.vx=p.face*Math.max(Math.abs(src.vx),sp*.8);src.vy=-src.vy*.5;return;}
  const e=src.parent||src;if(e.dying)return;e.stun=e.d.boss?.5:1.4;e.vx=(e.x>p.x?1:-1)*(e.d.boss?2:9);if(!e.d.fly)e.vy=Math.max(e.vy,5);e.flash=.2;burst(e.x,e.y+e.h+.2,['#fff3c0','#ffe58a'],8,2,{grav:0,life:.6,bright:1});}
export function hurtPlayer(dmg,from,src,elem){if(player.dead)return;if(player.dashI>0){if(!player.dodged){player.dodged=true;floatText(player.x,player.y+2.1,'DODGE!','nice');stat('dodges');}return;}if(player.inv_t>0)return;
  let blk=0;if(player.blocking&&src&&(from-player.x)*player.face>-.25){if(player.parryOK&&player.blockT<PARRY_W*niceW()){parry(src);return 'parry';}blk=(shieldItem()||{block:0}).block;}
  if(hasBadge('close')&&player.hp<player.max*.25&&Math.random()<.25){player.inv_t=.5;floatText(player.x,player.y+2,'MISS!','nice');return;}let real=Math.max(1,Math.round(dmg*(1-blk)-defense()/2));if(hasBadge('last')&&player.hp<player.max*.2)real=Math.max(1,Math.round(real/2));player.hp-=real;player.inv_t=.7;player.regenT=0;const kb=blk?.35:1;player.vx=(player.x<from?-1:1)*7*kb;player.vy=7*kb;
  floatText(player.x,player.y+2,real,'p');if(blk){SFX.block();shake(.1);hitPause(.04);burst(player.x+player.face*.6,player.y+1.1,['#fbf8f0','#dcd3c2','#ffe58a'],8,4,{grav:0,life:.3});stat('blocks');}
  else{player.hurtT=.3;SFX.hurt();shake(.25);hitPause(.06);$('vig').classList.add('hurt');setTimeout(()=>$('vig').classList.remove('hurt'),180);burst(player.x,player.y+1,['#d4483b','#fbf8f0'],6,4);if(elem)playerStatus(elem);}
  if(player.hp<=0){player.hp=0;die();}}
function die(){dismount(true);player.dead=true;player.deadT=4;player.dieT=0;player.swing=null;player.draw=null;const lost=Math.floor(player.coins*.25);player.coins-=lost;updateCoins();SFX.die();stat('deaths');$('dead').hidden=false;if(lost)toast(`Dropped ${lost} coins in the tumble.`,'bad');}
function respawn(){endDie();player.dead=false;player.dashT=player.dashCD=player.dashI=0;player.st={};player.draw=null;player.blocking=player.blockOn=false;player.hp=player.max;player.x=player.spawn.x;player.y=player.spawn.y;player.vx=player.vy=0;player.mesh.visible=true;$('dead').hidden=true;player.inv_t=2;}
// the death pose: the player buckles (the 'ko' face), tips over backward for DIE_T seconds, then bursts into scraps and the sheet hides until respawn
const DIE_T=.7;
function dieAnim(dt){const p=player,m=p.mesh;if(p.dieT==null)return;p.dieT+=dt;const k=Math.min(1,p.dieT/DIE_T);rigPlay(p.rig,'death');rigUpdate(p.rig,dt);p.mat.uniforms.uFlash.value=0;
  m.scale.set(1,1-.12*k,1);m.rotation.z=reduceMotion()?0:k*k*1.3;setTint(p.mat,p.x,p.y+1);statusOverlay(0);
  if(k>=1){const c=lookColors(p.look);endDie();m.visible=false;burst(p.x,p.y+.6,[c.tunic,c.scarf||'#d4483b',c.skin,'#fbf8f0'],50,7,{grav:8,life:1.5});SFX.crunch();}}
export function endDie(){const p=player;p.dieT=null;if(p.mesh){p.mesh.rotation.z=0;p.mesh.scale.set(1,1,1);}}
// a little celebration: arms up and a hop (boss defeated, a partner joins, a quest or achievement done)
export function playerCheer(t=1.2){if(!player.dead)player.cheerT=Math.max(player.cheerT||0,t);}
export function quickHeal(){if(player.potT>0){toast(`Potion sickness: wait ${Math.ceil(player.potT)}s.`,'bad');return;}const k=player.inv.findIndex(s=>s&&s.id==='potion');if(k<0){toast('No healing potions.','bad');return;}const s=player.inv[k];s.n--;if(!s.n)player.inv[k]=null;setInvDirty(true);heal(60*(hasBadge('dip')?1.5:1));player.potT=30;SFX.potion();}
export function heal(n){const h=Math.min(n,player.max-player.hp);player.hp+=h;floatText(player.x,player.y+2,'+'+Math.round(h),'heal');burst(player.x,player.y+1,['#9be27d','#fbf8f0'],10,3,{grav:-2});}
export let shakeT=0;export let hitStop=0;function hitPause(t){if(SET.hitstop)hitStop=Math.max(hitStop,t);}
export function shake(a){if(!SET.shake||reduceMotion())return;shakeT=Math.max(shakeT,a);}
function useItem(it,dt,pressed){const tx=Math.floor(mouse.wx),ty=Math.floor(mouse.wy);const p=player;
  if(it.pet||it.mount){if(mouse.lp){if(it.pet)togglePet(it.pet);else toggleMount(it.mount);}return;}
  if(it.rod){if(mouse.lp)fishClick(it);return;}
  if(it.bucket){if(!mouse.lp)return;if(!reachOK(tx,ty))return;const t=tileAt(tx,ty);
    if(it.bucket==='empty'){if(t!==T.INK&&t!==T.LAVA)return;setTile(tx,ty,T.AIR);consumeSel();const f=t===T.INK?'bucketink':'bucketlava';if(addItem(f,1))dropItem(f,1,p.x,p.y+1);SFX.door();emit(t===T.INK?'ink':'sparks',tx+.5,ty+.5,t===T.INK?{grav:18,life:1}:{cols:['#ff7a2d','#ffd66b'],n:8,spd:3,grav:18,life:1});stat('scoops');}
    else{if(!(t===T.AIR||(TP[t].repl&&!TP[t].liq)))return;setTile(tx,ty,it.bucket==='ink'?T.INK:T.LAVA);consumeSel();if(addItem('bucket',1))dropItem('bucket',1,p.x,p.y+1);SFX.door();}return;}
  if(it.ranged&&it.ammo==='arrow'){drawBow(it,dt);return;}
  if(it.ranged||it.magic){p.placeT-=dt;if(p.placeT>0)return;p.placeT=(it.ranged?fireRanged(it):castMagic(it,pressed))?it.ut:.25;return;}
  if(it.pick){p.face=mouse.wx>p.x?1:-1;if(!p.swing)p.swing={t:0,dur:.26/it.mine**.3,tool:it.id,tool2:true};
    const t=tileAt(tx,ty);const i=idx(tx,ty);if(t===T.AIR||TP[t].liq||!reachOK(tx,ty)||tx<0||ty<0||tx>=W||ty>=H){p.mineP=0;return;}
    const d=TP[t];if(d.pick>it.pick){if(p.mineTile!==-2){toast(t===T.CORE?'Nothing can break the cardboard core.':'You need a stronger pickaxe for this.','bad');p.mineTile=-2;}return;}
    if(p.mineTile!==i){p.mineTile=i;p.mineP=0;}p.mineP+=dt*it.mine/d.hard;p.digT=(p.digT||0)-dt;if(p.digT<=0){p.digT=.2;SFX.dig();burst(tx+.5,ty+.5,[d.col,sh(d.col,.75)],2,2.5);}
    if(p.mineP>=1){if(breakTile(tx,ty))stat('mined');p.mineP=0;p.mineTile=-1;}return;}
  if(it.hammer){p.face=mouse.wx>p.x?1:-1;if(!p.swing)p.swing={t:0,dur:.3,tool:it.id};if(tx<0||ty<0||tx>=W||ty>=H)return;const i=idx(tx,ty);if(!walls[i]||OPAQUE[tiles[i]]||!reachOK(tx,ty))return;
    if(p.mineTile!==i+N){p.mineTile=i+N;p.mineP=0;}p.mineP+=dt/.45;if(p.mineP>=1){const w=walls[i];walls[i]=0;markDirty(tx,ty);if(WALLDROP[w])dropItem(WALLDROP[w],1,tx+.5,ty+.5);burst(tx+.5,ty+.5,[WALLCOL[w],sh(WALLCOL[w],1.3)],8,3);SFX.rustle(.35);p.mineP=0;p.mineTile=-1;const tt=tiles[i];if((tt===T.TORCH&&!torchSupported(tx,ty))||TP[tt].wallmount||(TP[tt].hang&&TP[tt].wallok&&!isSolid(tx,ty+1)))breakTile(tx,ty);}return;}
  if(it.dmg&&!it.use){if(!p.swing){startSwing(it,false);}return;}
  if(it.place!=null&&!it.use||it.wall||it.seed!=null){p.placeT-=dt;if(p.placeT>0)return;if(tryPlace(it,tx,ty)){consumeSel();stat('placed');if(it.place!=null&&!SOLID[it.place]&&it.place!==T.TORCH&&it.place!==T.ROPE&&it.place!==T.PLATFORM)stat('decor');SFX.place();p.placeT=.12;p.face=mouse.wx>p.x?1:-1;if(!p.swing)p.swing={t:0,dur:.18,tool:null};}return;}
  if(it.use==='throw'){p.placeT-=dt;if(p.placeT>0)return;p.placeT=.28;throwStar();return;}
  if(it.use&&mouse.lp){if(it.use==='tmap'){const left=(BIO.treasure||[]).filter(([x,y])=>!(BIO.shown=BIO.shown||[]).some(([a,b])=>a===x&&b===y)&&tiles[idx(x,y)]===T.CHEST);if(!left.length){toast('Every treasure on this map has already been found.','bad');return;}left.sort((a,b)=>Math.hypot(a[0]-p.x,a[1]-p.y)-Math.hypot(b[0]-p.x,b[1]-p.y));const tg=left[0];BIO.shown.push(tg);consumeSel();const dx=Math.round((tg[0]-p.x)*2),dy=Math.round((p.y-tg[1])*2);toast(`X marks the spot: ${Math.abs(dx)} ft ${dx<0?'west':'east'} and ${Math.abs(dy)} ft ${dy>0?'down':'up'}. It is on your map (M).`,'gold');SFX.pick();return;}
    if(it.use==='crate'){consumeSel();openCrate();return;}
    if(it.use==='buff'){consumeSel();p.buffs[it.buff]=it.dur;SFX.potion();toast(`${BUFFS[it.buff][0]}: ${BUFFS[it.buff][2]}`,'good');burst(p.x,p.y+1,['#fbf8f0','#9be27d'],10,3,{grav:-2});return;}
    if(it.use==='mana'){if(player.maxMana>=200){toast('Your mana is already at its limit.','bad');return;}consumeSel();player.maxMana+=20;player.mana=Math.min(player.maxMana,player.mana+20);SFX.nice();toast('Max mana +20!','good');}
    else if(it.use==='bpup'){if(player.bpUps>=5){toast('You already have every BP Up.','bad');return;}consumeSel();player.bpUps++;toast('Badge Points +1!','good');SFX.nice();}
    else if(it.use==='manapot'){consumeSel();player.mana=Math.min(player.maxMana,player.mana+60);SFX.potion();}
    else if(it.use==='heal'){if(player.potT>0){toast(`Potion sickness: wait ${Math.ceil(player.potT)}s.`,'bad');return;}consumeSel();heal(60*(hasBadge('dip')?1.5:1));player.potT=30;SFX.potion();}
    else if(it.use==='heart'){if(player.max>=400){toast('Your heart is already full to bursting.','bad');return;}consumeSel();player.max+=20;heal(20);SFX.nice();questDone('heart');toast('Max life +20!','good');}
    else if(it.use==='boss'){const sm=it.summon,b=biomeAt(player.x,player.y);const need={king:'The King Slime only answers on the surface.',crane:'Use this in the Origami Snowfield.',lev:'Use this at the Ink Lake.',folio:'Use this in the Burnt Underworld.'}[sm];
      const ok=sm==='king'?player.y>=surf[clamp(Math.floor(player.x),0,W-1)]-10&&b!=='under':sm==='crane'?b==='snow':sm==='lev'?b==='lake':b==='under';if(!ok){toast(need,'bad');return;}if(boss){toast('A boss is already here.','bad');return;}consumeSel();
      const side=Math.random()<.5?-1:1;if(sm==='king')spawnEnemy('king',player.x+side*18,Math.min(H-8,player.y+22));else if(sm==='crane')spawnEnemy('crane',player.x+side*18,Math.min(H-6,player.y+14));else if(sm==='lev')spawnEnemy('lev',player.x+side*14,player.y-14);else spawnEnemy('folio',player.x+side*20,player.y+8);
      toast({king:'The ground trembles… the King Slime approaches!',crane:'A great shadow folds across the snow…',lev:'The ink begins to churn…',folio:'Pages rustle in the heat. The Charred Folio opens!'}[sm],'bad');SFX.boom();shake(.4);}}}
function startSwing(it,nice){const p=player;if(it.wave){const a=Math.atan2(mouse.wy-(p.y+1.1),mouse.wx-p.x);fireProj('wave',p.x+Math.cos(a)*.8,p.y+1.1+Math.sin(a)*.8,Math.cos(a)*22,Math.sin(a)*22,Math.round(it.dmg*.55),{src:'ranged'});}p.face=mouse.wx>p.x?1:-1;const ctr=!it.heavy&&p.counterT>0,ch=!ctr&&!it.heavy&&p.swEnd!=null&&worldClock-p.lastSwingEnd<.5,combo=ch?((p.combo||0)+1)%3:0,fin=!it.heavy&&combo===2;if(!it.heavy)p.combo=combo;p.counterT=0;
  p.swing={t:0,dur:it.dur,tool:it.id,hit:new Set(),dmg:it.dmg*setMul('melee')*(fin?1.35:1),kb:it.kb*(fin?1.3:1),reach:ctr?.8:fin?.5:0,counter:ctr,nice,sword:true,heavy:!!it.heavy,elem:it.elem||null,combo,from:ch?p.swEnd:1.6};if(it.heavy)SFX.heave();else if(fin)SFX.finisher();else SFX.swing();
  if(ctr){p.vx=p.face*13;floatText(p.x+p.face,p.y+2.6,'COUNTER!','nice');SFX.parry();stat('counters');burst(p.x+p.face*.8,p.y+1.1,['#fff3c0','#f1c04f'],10,5,{grav:0,life:.3,bright:1});}if(nice){floatText(p.x+p.face,p.y+2.3,'NICE!','nice');SFX.nice();stat('nices');}}
export const hook={state:0,x:0,y:0,vx:0,vy:0};
const chainMesh=new THREE.Mesh((()=>{const g=new THREE.PlaneGeometry(1,.1);g.translate(.5,0,0);return g;})(),new THREE.MeshBasicMaterial({color:0x7a5a3a}));chainMesh.visible=false;chainMesh.renderOrder=4;scene.add(chainMesh);
let hookMesh=null;
function grabbable(x,y){const t=tileAt(x,y);return isSolid(x,y)||t===T.PLATFORM||t===T.TRUNK||t===T.ROPE;}
// the Skyglass Hook (sky islands) reaches almost twice as far and pulls faster than the Grappling Hook
const skyHook=()=>player.inv.some(s=>s&&s.id==='skyhook');
export function fireHook(){if(state!=='play'||player.dead)return;if(!player.inv.some(s=>s&&ITEMS[s.id].hook)){toast('You need a Grappling Hook. Forge one at an Anvil, or buy one from the Merchant.','bad');return;}
  if(hook.state===1||hook.state===2){hook.state=3;return;}const{ox,oy,a}=aimFrom();hook.x=ox;hook.y=oy;const hs=skyHook()?46:34;hook.vx=Math.cos(a)*hs;hook.vy=Math.sin(a)*hs;hook.state=1;SFX.bow();}
function updateHook(dt){const p=player;if(!hookMesh){hookMesh=new THREE.Mesh(new THREE.PlaneGeometry(.6,.6),spriteMat(iconTex('hook')));hookMesh.renderOrder=5;scene.add(hookMesh);}
  if(!hook.state||p.dead){hook.state=0;hookMesh.visible=chainMesh.visible=false;return;}const hx=p.x+p.face*.2,hy=p.y+1.1;
  if(hook.state===1){for(let s=0;s<3;s++){hook.x+=hook.vx*dt/3;hook.y+=hook.vy*dt/3;if(grabbable(Math.floor(hook.x),Math.floor(hook.y))){hook.state=2;SFX.place();p.usedDouble=false;stat('hooks');burst(hook.x,hook.y,['#c9a574','#fbf8f0'],5,2);break;}}if(hook.state===1&&Math.hypot(hook.x-hx,hook.y-hy)>(skyHook()?27:15))hook.state=3;}
  else if(hook.state===2){if(!grabbable(Math.floor(hook.x),Math.floor(hook.y)))hook.state=3;else{const dx=hook.x-hx,dy=hook.y-hy,d=Math.hypot(dx,dy);if(d>.9){const ps=skyHook()?23:17;p.vx=dx/d*ps;p.vy=dy/d*ps;}else{p.vx*=.5;p.vy=0;}p.face=dx>=0?1:-1;}}
  if(hook.state===3){const dx=hx-hook.x,dy=hy-hook.y,d=Math.hypot(dx,dy);if(d<1.2){hook.state=0;hookMesh.visible=chainMesh.visible=false;return;}hook.x+=dx/d*Math.min(d,45*dt);hook.y+=dy/d*Math.min(d,45*dt);}
  const dx=hook.x-hx,dy=hook.y-hy,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);chainMesh.visible=hookMesh.visible=true;chainMesh.position.set(hx,hy,.2);chainMesh.rotation.z=a;chainMesh.scale.set(Math.max(.01,d),1,1);
  hookMesh.position.set(hook.x,hook.y,.22);hookMesh.rotation.z=a-Math.PI/4;setTint(hookMesh.material,hook.x,hook.y);const L=lightAt(hx,hy);chainMesh.material.color.setRGB(.48*L[0],.35*L[1],.23*L[2]);}
function throwStar(){const p=player;const{ox,oy,a}=aimFrom();p.face=Math.cos(a)>=0?1:-1;consumeSel();SFX.swing();fireProj('shuri',ox,oy,Math.cos(a)*22,Math.sin(a)*22,Math.round(ITEMS.shuriken.dmg*setMul('ranged')),{src:'ranged'});if(!p.swing)p.swing={t:0,dur:.2,tool:null};}
export const PK={
 arrow:{icon:'arrow',size:.85,grav:14,rot:'vel',rotOff:Math.PI/4,drop:.45,dropId:'arrow'},
 firearrow:{elem:'fire',icon:'firearrow',size:.85,grav:14,rot:'vel',rotOff:Math.PI/4,trail:['#f5a524','#ffe58a'],trailRate:.8,light:[1.1,.6,.2,5],drop:.25,dropId:'firearrow',glow:1},
 plane:{icon:'glider',size:.75,grav:2.5,rot:'vel',rotOff:.28,home:2.6,life:2.6,trail:['#fbf8f0'],trailRate:.35,kb:2},
 ink:{elem:'ink',icon:'inkball',size:.6,grav:11,spin:8,bounce:2,trail:['#3a2a5a','#6b4c8f'],trailRate:.7,light:[.45,.3,.9,3.5],splat:['#3a2a5a','#6b4c8f','#8a3fb0'],glow:1},
 crane:{icon:'crane',size:.75,grav:0,rot:'vel',rotOff:.45,home:5,life:2.2,trail:['#f4f0e6','#e8636a'],trailRate:.4,kb:2,splat:['#f4f0e6','#e8636a']},
 star:{icon:'fstar',size:1,grav:0,spin:10,pierce:2,trail:['#fff3c0','#f1c04f'],trailRate:1,light:[1.1,.95,.5,7],splat:['#fff3c0','#f1c04f','#fbf8f0'],kb:5,glow:1},
 fall:{icon:'fstar',size:.9,grav:0,spin:6,trail:['#fff3c0','#f1c04f'],trailRate:1,light:[1.1,.95,.5,8],life:12,land:'fstar',splat:['#fff3c0','#f1c04f'],glow:1},
 feather:{icon:'plume',size:.8,grav:0,rot:'vel',rotOff:Math.PI/4,life:3,trail:['#f4f0e6'],trailRate:.3},
 fireball:{elem:'fire',icon:'fireball',size:.7,grav:0,spin:12,life:3,trail:['#ff8a3d','#ffd66b'],trailRate:1,light:[1.2,.55,.2,5],glow:1,splat:['#ff8a3d','#ffd66b','#3a2a24']},
 page:{icon:'paper',size:.7,grav:0,spin:6,life:4,noclipAll:1,trail:['#e9dcc0'],trailRate:.3},
 emberball:{elem:'fire',icon:'fireball',size:.85,grav:5,spin:12,life:3,trail:['#ff8a3d','#ffd66b'],trailRate:1,light:[1.2,.55,.2,6],glow:1,boom:2.8,splat:['#ff8a3d','#ffd66b','#3a2a24']},
 crescent:{icon:'crescent',size:.8,grav:0,rot:'vel',rotOff:0,home:3.5,pierce:1,life:2.6,trail:['#e0b0ff','#fbf8f0'],trailRate:.8,light:[.8,.55,1.1,4],glow:1,splat:['#e0b0ff','#b06ad0']},
 wave:{icon:'foldwave',size:1.3,grav:0,rot:'vel',rotOff:0,pierce:4,life:.6,noclipAll:1,trail:['#fbf8f0'],trailRate:.6,kb:6,glow:1},
 shuri:{icon:'shuriken',size:.6,grav:10,spin:20,drop:.5,dropId:'shuriken'},
 spore:{icon:'mushroom',size:.6,grav:14,spin:8,life:3,trail:['#f4ecd8'],trailRate:.3,splat:['#d4483b','#f4f0e6']},
 shard:{elem:'water',icon:'ice',size:.45,grav:0,spin:10,life:1.4,trail:['#dff2fa'],trailRate:.4,splat:['#dff2fa','#aee0f2']},
 iarrow:{elem:'ink',icon:'inkarrow',size:.85,grav:14,rot:'vel',rotOff:Math.PI/4,trail:['#3a2a5a','#6b4c8f'],trailRate:.5,splat:['#3a2a5a','#6b4c8f'],drop:.25,dropId:'inkarrow'},
 parrow:{icon:'piercearrow',size:.85,grav:10,rot:'vel',rotOff:Math.PI/4,pierce:2,trail:['#dfe3ec'],trailRate:.35,drop:.35,dropId:'piercearrow'},
 rarrow:{icon:'bouncearrow',size:.85,grav:14,rot:'vel',rotOff:Math.PI/4,ric:2,bounce:1,trail:['#7fd3f0','#fbf8f0'],trailRate:.5,splat:['#5aa7e0','#bfe3f7'],drop:.25,dropId:'bouncearrow'},
 warrow:{elem:'water',icon:'waterarrow',size:.85,grav:14,rot:'vel',rotOff:Math.PI/4,trail:['#8fcaf0','#fbf8f0'],trailRate:.5,splat:['#5aa7e0','#bfe3f7'],drop:.25,dropId:'waterarrow'},
 bubble:{elem:'water',icon:'bubble',size:.6,grav:11,spin:4,bounce:2,trail:['#8fcaf0','#fbf8f0'],trailRate:.6,splat:['#5aa7e0','#bfe3f7','#fbf8f0']},
 gelblob:{icon:'gel',size:.65,grav:22,spin:8,life:3,trail:['#8fcaf0'],trailRate:.3,splat:['#5aa7e0','#8fcaf0']},
 gear:{icon:'gear',size:.7,grav:0,spin:9,life:4,noclipAll:1,trail:['#e0b04a'],trailRate:.3,splat:['#c9a24a','#fbf8f0']},
 inkglob:{elem:'ink',icon:'inkball',size:.65,grav:6,spin:8,life:3,trail:['#3a2a5a','#6b4c8f'],trailRate:.6,splat:['#3a2a5a','#6b4c8f','#8a3fb0']},
};
export function fireProj(kind,x,y,vx,vy,dmg,o={}){const k=PK[kind];const m=new THREE.Mesh(new THREE.PlaneGeometry(k.size,k.size),spriteMat(iconTex(k.icon)));m.position.set(x,y,.25);scene.add(m);
  const q=Object.assign({kind,k,x,y,vx,vy,dmg,m,t:0,hit:new Set(),pierce:k.pierce||0,ric:k.ric||0,bounce:k.bounce||0,life:k.life||3,elem:k.elem||null},o);projs.push(q);return q;}
export function nearestEnemy(x,y,r){let best=null,bd=r;for(const e of enemies){if(e.dying)continue;const d=Math.hypot(e.x-x,e.y+e.h/2-y);if(d<bd){bd=d;best=e;}}return best;}
function aimFrom(){const p=player;const ox=p.x+p.face*.25,oy=p.y+1.15+(p.rideY||0);return{ox,oy,a:Math.atan2(mouse.wy-oy,mouse.wx-ox)};}
function shootPose(it,a){const p=player;p.face=Math.cos(a)>=0?1:-1;p.swing={t:0,dur:Math.min(.28,it.ut),tool:it.id,aim:a};}
function findAmmo(type){return player.inv.findIndex(s=>s&&ITEMS[s.id].ammoOf===type);}
export function countAmmo(type){let c=0;for(const s of player.inv)if(s&&ITEMS[s.id].ammoOf===type)c+=s.n;return c;}
// Skystring set: 1 shot in 4 keeps its ammo
function useAmmo(ai){const s=player.inv[ai];if(setOn('sky')&&Math.random()<.25)return;s.n--;if(!s.n)player.inv[ai]=null;setInvDirty(true);}
function fireRanged(it){const ai=findAmmo(it.ammo);if(ai<0){if(mouse.lp)toast(it.ammo==='arrow'?'Out of arrows. Craft them at a Workbench from wood and stone.':'Out of Paper Sheets. Craft them from wood at a Workbench.','bad');return false;}
  const am=ITEMS[player.inv[ai].id];useAmmo(ai);
  const{ox,oy,a}=aimFrom();shootPose(it,a);const n=it.count||1;for(let k=0;k<n;k++){const aa=a+(k-(n-1)/2)*.1;fireProj(am.proj,ox,oy,Math.cos(aa)*it.spd,Math.sin(aa)*it.spd,Math.round((it.dmg+am.adm)*setMul('ranged')),{src:'ranged',pierce:(it.pierce||0)+(PK[am.proj].pierce||0)});}SFX.bow();return true;}
// bows: hold to draw, release to loose. Speed and damage grow with the draw; a full draw is a guaranteed crit,
// and letting go within PERFECT_W of the draw filling is a Perfect shot (more damage, pierces one more foe).
export const bowDrawT=it=>it.ut*1.7*(setOn('sky')?.7:1);const PERFECT_W=.14;
function drawBow(it,dt){const p=player;if(!p.draw){if(findAmmo('arrow')<0){if(mouse.lp)toast('Out of arrows. Craft them at a Workbench from wood and stone.','bad');return;}p.draw={id:it.id,t:0,full:false};SFX.draw();}
  const d=p.draw;d.t+=dt;const c=Math.min(1,d.t/bowDrawT(it)),{ox,oy,a}=aimFrom();p.face=Math.cos(a)>=0?1:-1;p.swing={t:0,dur:1,tool:it.id,aim:a,draw:c};const bx=ox+Math.cos(a)*.6,by=oy+Math.sin(a)*.6;
  if(!d.full&&c>=1){d.full=true;d.fullAt=d.t;SFX.full();burst(bx,by,['#fff3c0','#f1c04f','#fbf8f0'],12,3.5,{grav:0,life:.35,bright:1});}else if(d.full&&Math.random()<dt*14)burst(bx,by,['#fff3c0','#ffe58a'],1,.8,{grav:0,life:.3,bright:1});}
function cancelDraw(){const p=player;p.draw=null;if(p.swing&&p.swing.draw!=null)p.swing=null;}
function releaseBow(){const p=player,d=p.draw;p.draw=null;const it=ITEMS[d.id],ai=findAmmo('arrow');if(ai<0){p.swing=null;return;}
  const am=ITEMS[p.inv[ai].id];useAmmo(ai);
  const c=clamp(d.t/bowDrawT(it),.15,1),full=d.full,perf=full&&d.t-d.fullAt<PERFECT_W*niceW(),sp=it.spd*(.45+.55*c)*(full?1.12:1)*(perf?1.1:1),dm=Math.round((it.dmg+am.adm)*(.35+.65*c)*(full?1.6:1)*(perf?1.25:1)*setMul('ranged'));
  const{ox,oy,a}=aimFrom();shootPose(it,a);const n=it.count||1;for(let k=0;k<n;k++){const aa=a+(k-(n-1)/2)*.1;fireProj(am.proj,ox,oy,Math.cos(aa)*sp,Math.sin(aa)*sp,dm,{src:'ranged',pierce:(it.pierce||0)+(PK[am.proj].pierce||0)+(perf?1:0),crit:full});}
  SFX.bow();if(full){SFX.snap();stat('fulldraws');}
  if(perf){stat('perfects');SFX.nice();floatText(ox+Math.cos(a),oy+1.2,'PERFECT!','nice');for(let k=0;k<12;k++){const g=k/12*Math.PI*2;burst(ox+Math.cos(a)*.6+Math.cos(g)*.5,oy+Math.sin(a)*.6+Math.sin(g)*.5,['#fff3c0','#f1c04f'],1,1.5,{grav:0,life:.35,bright:1});}}}
// rune timing: every cast draws a rune ring that closes on the hand (updateRune); casting again with the same spell as it closes
// with a fresh press (within RUNE_W) is a Rune cast: more damage, one more bolt, half the mana. Holding the button casts faster, so it never lands on the rune.
const RUNE_W=.14,RUNE_T=1.8;
function castMagic(it,pressed){const p=player,rune=pressed&&p.rune&&p.rune.id===it.id&&Math.abs(worldClock-p.rune.at)<RUNE_W*niceW(),cost=Math.ceil(it.mana*(setOn('weave')?.75:1)*(rune?.5:1)),dmg=Math.round(it.dmg*setMul('magic')*(rune?1.6:1));if(p.mana<cost){const k=p.inv.findIndex(s=>s&&s.id==='manapotion');if(k>=0){const s=p.inv[k];s.n--;if(!s.n)p.inv[k]=null;setInvDirty(true);p.mana=Math.min(p.maxMana,p.mana+60);SFX.potion();floatText(p.x,p.y+2,'+60 mana','heal');}
    else{if(mouse.lp)toast('Not enough mana.','bad');return false;}}
  p.mana-=cost;p.manaT=0;stat('casts');const{ox,oy,a}=aimFrom();shootPose(it,a);
  if(it.proj==='star'){for(let j=0;j<(rune?2:1);j++){const tx=mouse.wx+j*rand(-2,2),ty=mouse.wy,sx=tx+rand(-5,5),sy=camera.position.y+14+j*2,d=Math.hypot(tx-sx,ty-sy)||1;fireProj('star',sx,sy,(tx-sx)/d*it.spd,(ty-sy)/d*it.spd,dmg,{src:'magic',noclipAbove:ty+.5});}SFX.star();}
  else{const n=(it.count||1)+(rune?1:0);for(let i=0;i<n;i++){const aa=a+(n>1?(i-(n-1)/2)*(it.count>1?.3:.15):0);fireProj(it.proj,ox,oy,Math.cos(aa)*it.spd,Math.sin(aa)*it.spd,dmg,{src:'magic'});}}
  p.rune={id:it.id,t0:worldClock,at:worldClock+it.ut*RUNE_T};
  if(rune){stat('runes');SFX.nice();floatText(ox+Math.cos(a),oy+1.2,'RUNE!','nice');for(let k=0;k<14;k++){const g=k/14*Math.PI*2;burst(ox+Math.cos(g)*.5,oy+Math.sin(g)*.5,['#c9b0f0','#fff3c0'],1,2,{grav:0,life:.4,bright:1});}}
  SFX.cast();burst(ox+Math.cos(a)*.6,oy+Math.sin(a)*.6,['#9fc3ff','#fff3c0'],5,2,{grav:0,life:.4,up:0});return true;}
export function spawnFallingStar(){const p=player;const x=clamp(p.x+rand(-45,45),5,W-5);if(p.y<surf[clamp(Math.floor(p.x),0,W-1)]-25)return;const y=Math.min(H-2,Math.max(surf[Math.floor(x)]+22,camera.position.y+16));fireProj('fall',x,y,rand(-5,5),-15,20,{src:'star'});SFX.star();}
// fishing. bob.state: 0 reeled in, 1 flying, 2 floating (waiting), 3 biting (click now), 4 resting on the ground (nothing bites),
// 5 fighting a legendary fish (click each time it thrashes). The catch is rolled when the fish bites (bob.catch).
export const bob={state:0,x:0,y:0,vx:0,vy:0,t:0,wait:0,bite:0,liq:0,small:false,rod:null,catch:null,fight:null};let bobMesh=null,lineObj=null;const tipV=new THREE.Vector3();
// rec: the record book, the biggest of each fish in cm; fest: today's festival fishing contest {d: world day, id, cm, sc: score, got: prize taken}
export const newAngler=()=>({caught:0,done:0,day:0,q:null,qday:-1,seen:{},rec:{},fest:null});
export let angler=newAngler();
// catch tables by biome (lava has its own): [item, weight, min fishing power, night only, condition (a CATCHIF key)]
const CATCHIF={spring:()=>season().k==='spring',sunday:()=>season().k==='summer'&&!isNight(),fall:()=>season().k==='fall',winter:()=>season().k==='winter',
  storm:()=>weather==='rain'||wev.k==='storm',inkmoon:()=>inkMoon&&isNight()};
const SEASONAL=[['blossomtrout',16,0,0,'spring'],['sunperch',16,0,0,'sunday'],['maplecarp',16,0,0,'fall'],['icepike',16,15,0,'winter'],['stormeel',14,20,0,'storm']];
export const CATCH={forest:[['minnow',60],['nightkoi',14,20,1],['goldfin',3,35],...SEASONAL,['oldcrease',1.2,55]],snow:[['koi',40],['minnow',30],['nightkoi',14,20,1],['goldfin',3,35],...SEASONAL,['glacierjaw',1.5,60,0,'winter']],
  desert:[['sandsole',45],['minnow',25],['nightkoi',10,20,1],['goldfin',4,35],...SEASONAL.filter(c=>c[4]!=='winter')],
  lake:[['inkfish',55],['minnow',15],['nightkoi',12,20,1],['goldfin',4,35],...SEASONAL,['moonscale',4,50,1,'inkmoon']],under:[['minnow',40],['goldfin',3,35]],lava:[['lavafish',60],['emberore',20],['goldfin',3,50],['magmaw',1.5,70]]};
function bestBait(){let bi=-1,bv=0;player.inv.forEach((s,i)=>{if(s&&ITEMS[s.id].bait>bv){bv=ITEMS[s.id].bait;bi=i;}});return bi;}
export function countBait(){let c=0;for(const s of player.inv)if(s&&ITEMS[s.id].bait)c+=s.n;return c;}
function fishPower(rod){const bi=bestBait();let pw=(rod?rod.fpow:0)+(bi>=0?ITEMS[player.inv[bi].id].bait:0)+(hasBuff('fishing')?15:0)+(hasBadge('lure')?15:0)+(hasAcc('tackle')?10:0);
  if(weather==='rain'&&bob.y>surf[clamp(Math.floor(bob.x),0,W-1)]-12)pw*=1.15;return Math.round(pw);}
function rollCatch(pw){const lava=bob.liq===T.LAVA;if(Math.random()<Math.min(.12,.03+pw*.0012))return 'fcrate';if(Math.random()<Math.max(.03,.32-pw*.006))return lava?'ash':'soggy';
  const night=isNight(),list=(CATCH[lava?'lava':biomeAt(bob.x,bob.y)]||CATCH.forest).filter(([,w,mp,nt,c])=>pw>=(mp||0)&&(!nt||night)&&(!c||CATCHIF[c]()));let r=Math.random()*list.reduce((a,c)=>a+c[1],0);for(const c of list){r-=c[1];if(r<=0)return c[0];}return list[0][0];}
const biteWait=pw=>rand(5,12)*clamp(70/(40+pw),.35,1.6);
function reelIn(msg){if(player.swing&&player.swing.tool===bob.rod)player.swing=null;bob.state=0;if(msg)toast(msg,'bad');}
function fishClick(it){const p=player;if(bob.state===3){if(ITEMS[bob.catch]&&ITEMS[bob.catch].leg)startFight();else landFish(it);return;}if(bob.state===5){fightClick();return;}if(bob.state){reelIn();SFX.reel();return;}
  if(bestBait()<0){toast('You need bait to fish. Craft Paper Flies from paper and gel, or buy some from the Merchant.','bad');return;}
  const{ox,oy,a}=aimFrom(),sp=clamp(Math.hypot(mouse.wx-ox,mouse.wy-oy)*1.5,7,17);p.face=Math.cos(a)>=0?1:-1;
  Object.assign(bob,{state:1,x:ox+Math.cos(a)*.8,y:oy+Math.sin(a)*.8,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp+3,t:0,rod:it.id,small:false,catch:null,fight:null});SFX.fcast();}
function bobLand(t){const rod=ITEMS[bob.rod],lava=t===T.LAVA;bob.liq=t;bob.vx=bob.vy=0;SFX.splash();burst(bob.x,bob.y+.4,lava?['#ff7a2d','#ffd66b']:['#3a2a5a','#a894d0','#fbf8f0'],8,3,{up:2});
  if(lava&&!rod.lava){burst(bob.x,bob.y+.5,['#ff8a3d','#ffd66b'],10,3,{grav:-4,bright:1});SFX.sizzle();reelIn('Your line burns up in the lava! Only an Emberite Rod can fish there.');return;}
  bob.small=flood(Math.floor(bob.x),Math.floor(bob.y),tt=>tt===t,25).length<25;if(bob.small)toast('This pool is too small for fish. Find one with at least 25 tiles of liquid.','bad');
  bob.state=2;bob.wait=biteWait(fishPower(rod));}
// a fish's size in cm: stronger rods and bait pull the roll toward the big end
export function fishSize(id,pw){const f=FISH[id];if(!f)return 0;return Math.round(f[3]+(f[4]-f[3])*Math.pow(Math.random(),1.8-Math.min(1.1,pw/80)));}
// legendary fish fight: every so often it thrashes (the bobber jerks); click during a thrash to pull. Enough pulls land it;
// clicking while it is still, or running out of time, lets it go
function startFight(){const f=bob.fight={need:randi(5,7),t:12,thr:0,next:.5,slack:0};bob.state=5;SFX.bite();shake(.15);floatText(bob.x,bob.y+1,'!!','crit');
  if(!angler.seen[bob.catch]&&!META.stats.legend)toast('A legendary fish! Click each time it thrashes, and hold still when it does not.','gold');}
function fightClick(){const f=bob.fight;if(f.thr>0){f.need--;f.thr=0;f.next=rand(.5,1.1);SFX.reel();burst(bob.x,bob.y+.3,['#a894d0','#fbf8f0','#f1c04f'],8,4,{up:3});floatText(bob.x,bob.y+.9,f.need?'pull!':'landed!','nice');if(f.need<=0)landFish(ITEMS[bob.rod]);}
  else{f.slack++;floatText(bob.x,bob.y+.9,'slack','miss');if(f.slack>=3)fightLost('The line snapped! It got away.');}}
function fightLost(msg){const bi=bestBait();if(bi>=0){const s=player.inv[bi];s.n--;if(!s.n)player.inv[bi]=null;setInvDirty(true);}reelIn(`${ITEMS[bob.catch].name}: ${msg}`);}
function landFish(it){const p=player,bi=bestBait();if(bi<0){reelIn('Out of bait.');return;}const pw=fishPower(it),id=bob.catch||rollCatch(pw);
  if(!(hasAcc('tackle')&&Math.random()<.3)){const s=p.inv[bi];s.n--;if(!s.n)p.inv[bi]=null;setInvDirty(true);}
  const left=addItem(id,1);if(left)dropItem(id,left,p.x,p.y+1);SFX.catch();burst(bob.x,bob.y+.2,bob.liq===T.LAVA?['#ff7a2d','#ffd66b']:['#3a2a5a','#a894d0','#fbf8f0'],14,5,{up:3});
  if(ITEMS[id].fish){const cm=fishSize(id,pw),rec=angler.rec[id]||0;floatText(bob.x,bob.y+1,`${ITEMS[id].name} · ${cm} cm`,'crit');stat('fish');angler.caught++;
    if(!angler.seen[id]){angler.seen[id]=1;toast(`New catch: ${ITEMS[id].name}, ${cm} cm!`,'gold');}else if(cm>rec)toast(`New record: ${ITEMS[id].name}, ${cm} cm (was ${rec} cm)!`,'gold');if(cm>rec)angler.rec[id]=cm;
    if(ITEMS[id].leg){stat('legend');playerCheer(1.4);partnerCheer(1.4);shake(.3);toast(`You landed ${ITEMS[id].name}, a legendary fish!`,'gold');}
    const fe=festival();if(fe&&hasNPC('angler')){const sc=contestScore(id,cm),f=angler.fest&&angler.fest.d===worldDay?angler.fest:(angler.fest={d:worldDay,id:null,cm:0,sc:0,got:0});if(!f.got&&sc>f.sc){Object.assign(f,{id,cm,sc});toast(`Contest entry: ${ITEMS[id].name}, ${cm} cm (${sc} points). Show the Angler!`,'good');}}}
  else floatText(bob.x,bob.y+1,ITEMS[id].name,'crit');reelIn();}
// festival fishing contest: a catch scores by how big it is for its kind, legendaries score extra
export const contestScore=(id,cm)=>{const f=FISH[id];return Math.round(100*(cm-f[3]+1)/(f[4]-f[3]+1)*(f[5]?1.5:1));};
export const CONTEST=[[120,[['moonlure',10],['fcrate',2],['coin',400]]],[70,[['glowlure',8],['fcrate',1],['coin',200]]],[0,[['fly',10],['coin',80]]]];
export function contestClaim(){const f=angler.fest;if(!festival()||!f||f.d!==worldDay||f.got||!f.id)return;f.got=1;const[,r]=CONTEST.find(c=>f.sc>=c[0]),p=player;
  for(const[id,n]of r){if(id==='coin'){addItem('coin',n);continue;}const l=addItem(id,n);if(l)dropItem(id,l,p.x,p.y+1);}SFX.nice();playerCheer(1.2);stat('contests');
  toast(`The Angler judges your ${ITEMS[f.id].name} (${f.cm} cm): ${f.sc} points! Prize: ${r.map(([id,n])=>id==='coin'?n+' coins':`${ITEMS[id].name} ×${n}`).join(', ')}.`,'gold');}
export function updateFishing(dt){const p=player,it=selItem();
  if(bob.state&&(p.dead||!it||it.id!==bob.rod))reelIn();else if(bob.state&&Math.hypot(bob.x-p.x,bob.y-p.y)>30)reelIn('Your line ran out. Stay closer to the bobber.');
  if(!bobMesh){bobMesh=new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),spriteMat(iconTex('bobber')));bobMesh.renderOrder=5;scene.add(bobMesh);
    lineObj=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(48),3)),new THREE.LineBasicMaterial({color:0xf4f0e6,transparent:true,opacity:.8}));lineObj.frustumCulled=false;lineObj.renderOrder=5;scene.add(lineObj);}
  if(!bob.state){bobMesh.visible=lineObj.visible=false;return;}bob.t+=dt;const rod=ITEMS[bob.rod];
  if(bob.state===1){bob.vy-=22*dt;bob.vx*=Math.pow(.6,dt);const n=Math.max(1,Math.ceil(Math.hypot(bob.vx,bob.vy)*dt/.25));
    for(let k=0;k<n;k++){const ox=bob.x,oy=bob.y;bob.x+=bob.vx*dt/n;bob.y+=bob.vy*dt/n;const tx=Math.floor(bob.x),ty=Math.floor(bob.y),t=tileAt(tx,ty);
      if(TP[t]&&TP[t].liq){bobLand(t);break;}if(isSolid(tx,ty)||tileAt(tx,ty)===T.PLATFORM&&bob.vy<0){bob.x=ox;bob.y=oy;bob.vx=bob.vy=0;bob.state=4;break;}}}
  else if(bob.state===4){if(!isSolid(Math.floor(bob.x),Math.floor(bob.y-.3))&&tileAt(Math.floor(bob.x),Math.floor(bob.y-.3))!==T.PLATFORM)bob.state=1;}
  else{const tx=Math.floor(bob.x);let ty=Math.floor(bob.y);if(tileAt(tx,ty)!==bob.liq){if(tileAt(tx,ty-1)===bob.liq)ty--;else{bob.state=1;bob.vx=bob.vy=0;}}
    if(bob.state>=2){while(tileAt(tx,ty+1)===bob.liq)ty++;const sy=ty+1-.12+Math.sin(bob.t*3)*.05-(bob.state===3?.28:0);bob.y+=(sy-bob.y-(bob.state===5&&bob.fight.thr>0?.25:0))*Math.min(1,dt*10);
      if(bob.state===2&&!bob.small){bob.wait-=dt;if(bob.wait<=0){const pw=fishPower(rod);bob.state=3;bob.catch=rollCatch(pw);bob.bite=ITEMS[bob.catch].leg?.5:.85+pw*.004;SFX.bite();floatText(bob.x,bob.y+.9,'!','nice');burst(bob.x,bob.y+.3,bob.liq===T.LAVA?['#ff7a2d','#ffd66b']:['#a894d0','#fbf8f0'],10,3,{up:3});}}
      else if(bob.state===5){const f=bob.fight;f.t-=dt;if(f.thr>0){f.thr-=dt;bob.x+=Math.sin(bob.t*50)*dt*2;if(f.thr<=0)f.next=rand(.5,1.1);}else{f.next-=dt;if(f.next<=0){f.thr=.42;SFX.bite();floatText(bob.x,bob.y+.9,'!','nice');burst(bob.x,bob.y+.3,['#a894d0','#fbf8f0'],8,3,{up:3});}}
        if(f.t<=0)fightLost('It wore you out and got away.');}
      else if(bob.state===3){bob.bite-=dt;if(bob.bite<=0){bob.state=2;bob.catch=null;bob.wait=biteWait(fishPower(rod));const bi=bestBait();if(bi>=0&&Math.random()<.35){const s=p.inv[bi];s.n--;if(!s.n)p.inv[bi]=null;setInvDirty(true);toast('Something stole your bait!','bad');}else floatText(bob.x,bob.y+.9,'got away','miss');}}}}
  if(!bob.state){bobMesh.visible=lineObj.visible=false;return;}
  // hold the rod up toward the bobber while the line is out
  p.face=bob.x>=p.x?1:-1;const ca=bob.state===1&&bob.t<.3?lerp(2.7,1.1,EZ.o2(bob.t/.3)):bob.state===3||bob.state===5&&bob.fight.thr>0?1.1+Math.sin(bob.t*40)*.1:1.1,aim=p.face>0?ca:Math.PI-ca;if(!p.swing||p.swing.tool!==bob.rod)p.swing={t:0,dur:1,tool:bob.rod,aim};else{p.swing.t=0;p.swing.aim=aim;}
  bobMesh.visible=lineObj.visible=true;bobMesh.position.set(bob.x,bob.y+.1,.46);bobMesh.rotation.z=bob.state===1?bob.t*8:Math.sin(bob.t*2.4)*.15;setTint(bobMesh.material,bob.x,bob.y);
  let tx0=p.x+p.face*.9,ty0=p.y+2.2;if(toolMesh&&toolPivot.visible){toolPivot.updateMatrixWorld(true);toolMesh.localToWorld(tipV.set(1.08,1.08,0));tx0=tipV.x;ty0=tipV.y;}
  const pos=lineObj.geometry.attributes.position,bx=bob.x,by=bob.y+.32,sag=bob.state===1?0:Math.min(1.6,Math.hypot(bx-tx0,by-ty0)*.12);
  for(let i=0;i<16;i++){const k=i/15;pos.setXYZ(i,lerp(tx0,bx,k),lerp(ty0,by,k)-Math.sin(k*Math.PI)*sag,.45);}pos.needsUpdate=true;const L=lightAt(bx,by);lineObj.material.color.setRGB(.96*L[0],.94*L[1],.9*L[2]);}
function openCrate(){const p=player,x=p.x,y=p.y+1.2,g=(id,n)=>dropItem(id,n,x,y),tier=quests.folio?3:quests.lev?2:quests.crane?1:0;g('coin',randi(40,120));
  g(pick([['copperbar','ironbar','goldbar'],['goldbar','frostbar'],['frostbar','inkbar'],['inkbar','emberbar']][tier]),randi(3,7));g(pick(['fly','glowlure','glowlure','moonlure']),randi(3,6));
  if(Math.random()<.4)g(pick(['potion','potfish','potswift','potiron','grilledfish']),randi(1,3));if(Math.random()<.12)g('bpup',1);if(Math.random()<.1)g(pick(Object.keys(BADGES).map(k=>'b_'+k)),1);if(Math.random()<.15)g('tmap',1);if(Math.random()<.06)g('tackle',1);
  SFX.door();SFX.coin();burst(x,y,['#a86b3a','#f1c04f','#fbf8f0'],16,5);stat('crates');}
// the Angler asks for one fish a day and pays out coins, bait and a prize at each milestone
export const ANGLER_POOL=['minnow','koi','inkfish','sandsole','nightkoi'],ANGLER_REWARD={1:['glowlure',8],3:['b_lure',1],5:['tackle',1],7:['fcrate',3],10:['bpup',1],15:['moonlure',15],20:['rodember',1]};
export const ANGLER_WHERE={minnow:'any ink pool',koi:'ink in the Origami Snowfield',inkfish:'the Ink Lake',sandsole:'ink in the Sandpaper Dunes',nightkoi:'any ink pool, at night',goldfin:'anywhere, with strong bait and a good rod',lavafish:'the lava of the Burnt Underworld, with an Emberite Rod',
  blossomtrout:'any ink pool in spring',sunperch:'any ink pool on a summer day',maplecarp:'any ink pool in fall',icepike:'a hole in the ice, in winter',stormeel:'any ink pool while it rains'};
const SEASONFISH={spring:'blossomtrout',summer:'sunperch',fall:'maplecarp',winter:'icepike'};
export function anglerQuest(){if(angler.qday===angler.day)return null;if(!angler.q){const pool=ANGLER_POOL.filter(f=>f!==angler.last);if(angler.done>=3)pool.push('goldfin');if(quests.folio)pool.push('lavafish');if(angler.done>=2)pool.push(SEASONFISH[season().k]);angler.q=pick(pool);}return angler.q;}
export function anglerTurnIn(){const q=anglerQuest(),p=player;if(!q)return;if(countItem(q)<1){toast(`Bring me a ${ITEMS[q].name}. Try ${ANGLER_WHERE[q]}.`,'bad');return;}
  removeItem(q,1);angler.done++;angler.last=q;angler.q=null;angler.qday=angler.day;const give=(id,n)=>{const l=addItem(id,n);if(l)dropItem(id,l,p.x,p.y+1);};
  const c=Math.min(400,50+angler.done*15),m=ANGLER_REWARD[angler.done];give('coin',c);give(angler.done>=4?'glowlure':'fly',randi(4,8));if(Math.random()<.35)give(pick(['fcrate','potfish','grilledfish']),1);if(m)give(m[0],m[1]);
  toast(`The Angler is thrilled! +${c} coins${m?` and ${ITEMS[m[0]].name}`:''}. Come back tomorrow.`,'gold');SFX.nice();stat('fishq');}
export function ambient(dt){if(!BIO||!BIO.uw)return;const cx=camera.position.x,cy=camera.position.y;const b=biomeAt(cx,cy-3);
  if(b==='snow'&&cy>surfAvg-25&&Math.random()<dt*22)emit('snow',cx+rand(-26,26),cy+10);
  if(b==='under'&&Math.random()<dt*18)emit('embers',cx+rand(-26,26),cy-12);}
export let weather='clear',weatherT=120,wind=0,rainF=0,inkMoon=false,nightsSeen=0;
const RAINN=260;const rainMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.035,.55),new THREE.MeshBasicMaterial({color:0xcfe0ee,transparent:true,opacity:.55,depthWrite:false}),RAINN);rainMesh.frustumCulled=false;rainMesh.renderOrder=9;scene.add(rainMesh);
const drops=[];for(let i=0;i<RAINN;i++)drops.push({x:0,y:-999});
let rainSrc=null,rainGain=null;
function rainAudio(v){if(!AC)return;if(!rainSrc){try{rainSrc=AC.createBufferSource();rainSrc.buffer=noiseBuf;rainSrc.loop=true;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=1400;rainGain=AC.createGain();rainGain.gain.value=0;rainSrc.connect(f).connect(rainGain).connect(ambBus);rainSrc.start();}catch(e){return;}}rainGain.gain.value=v*.16;}
// lightning: rain and the Paper Storm send a strike near the player every so often, often at a thunderroot that still has
// growing to do. Each strike grows thunderroot within reach a stage and can leave Thunderroot Seeds on natural ground.
// boltF is the sky flash, read by updateSky() (dimmer with reduced motion).
export let boltF=0;let boltT=rand(8,16);
function strikeY(x){for(let y=H-2;y>2;y--)if(tiles[idx(x,y)]!==T.AIR)return y;return -1;}
export function lightningStrike(x,near){x=clamp(Math.round(x),2,W-3);const y=strikeY(x);if(y<0)return;const top=y+1;
  if(near){let bx=x+.5;for(let yy=top+24;yy>top;yy-=.5){bx+=rand(-.3,.3);burst(bx,yy,['#fffbe0','#ffe14a','#fbf8f0'],1,.15,{grav:0,life:.3,bright:1,s:1.3});}
    burst(x+.5,top,['#fffbe0','#ffe14a','#c9a574'],22,6,{up:2,bright:1});boltF=reduceMotion()?.3:1;shake(.3);setTimeout(()=>SFX.boom(),150+Math.abs(player.x-x)*20);}
  let grew=0;for(let dx=-8;dx<=8;dx++)for(let dy=-12;dy<=4;dy++){const tx=x+dx,ty=top+dy;if(tx<0||tx>=W||ty<0||ty>=H)continue;const i=idx(tx,ty);
    if(tiles[i]!==T.RARE||(meta[i]>>2)!==1||(meta[i]&3)>=2)continue;meta[i]++;markChunk(tx,ty);burst(tx+.5,ty+.6,['#ffe14a','#fffbe0'],8,3,{bright:1});grew++;}
  const g=tiles[idx(x,y)];if(!grew&&(g===T.GRASS||g===T.DIRT||g===T.SAND)&&Math.random()<.15)dropItem('seed_thunder',1,x+.5,top+.3);
  if(grew&&near)toast(grew>1?`Lightning charges ${grew} Thunderroots!`:'Lightning charges a Thunderroot!','good');}
function updateLightning(dt,surfaceView){boltF=Math.max(0,boltF-dt*3);if(weather!=='rain'&&wev.k!=='storm')return;boltT-=dt;if(boltT>0)return;boltT=rand(12,26);
  let x=player.x+rand(-26,26);if(Math.random()<.6){const tr=[];for(const i of crops)if(tiles[i]===T.RARE&&(meta[i]>>2)===1&&(meta[i]&3)<2&&Math.abs(i%W-player.x)<40)tr.push(i);if(tr.length)x=pick(tr)%W+rand(-3,3);}
  lightningStrike(x,surfaceView&&Math.abs(x-player.x)<34);}
export function updateWeather(dt){weatherT-=dt;if(weatherT<=0){const r=weather!=='clear'?'clear':rollWeather();if(r==='clear'){weather='clear';wind=0;weatherT=rand(120,240);}else if(r==='rain'){weather='rain';wind=rand(-.4,.4);weatherT=rand(70,150);toast('It starts to rain. Crops grow faster.');}else if(r==='snow'){weather='snow';wind=rand(-.3,.3);weatherT=rand(80,160);toast('Snow starts to fall.');}else{weather='wind';wind=(Math.random()<.5?-1:1)*rand(.7,1.3);weatherT=rand(60,120);toast(`A strong wind blows ${wind>0?'east':'west'}.`);}}
  const cam=camera.position,surfaceView=cam.y>surfAvg-18&&biomeAt(cam.x,cam.y)!=='under';const target=weather==='rain'&&surfaceView?1:0;rainF+=(target-rainF)*Math.min(1,dt*.8);rainAudio(rainF);updateLightning(dt,surfaceView);
  const vis=rainF>.02;rainMesh.visible=vis;if(vis){const ang=Math.atan2(-18,wind*8);for(let i=0;i<RAINN;i++){const d=drops[i];d.y-=dt*20;d.x+=dt*wind*8;if(d.y<cam.y-16||d.x<cam.x-30||d.x>cam.x+30||Math.random()<.002){d.x=cam.x+rand(-28,28);d.y=cam.y+rand(4,18);}
      dummy.position.set(d.x,d.y,.9);dummy.rotation.set(0,0,ang+Math.PI/2);const sc=i<RAINN*rainF?1:0;dummy.scale.set(sc,sc,sc);dummy.updateMatrix();rainMesh.setMatrixAt(i,dummy.matrix);}rainMesh.instanceMatrix.needsUpdate=true;}
  if(weather==='wind'&&surfaceView&&Math.random()<dt*10)emit('leaves',cam.x-Math.sign(wind)*26,cam.y+rand(-8,10),{grav:.4,life:4});
  for(const pa of parts)if(pa.grav<3&&pa.grav>0)pa.vx+=wind*dt*6;}
// Dynamic lights (up to NDL, nearest the camera first) on top of the propagated tile light: glowing projectiles
// and spells, light-giving partners and pets, fallen stars, a torch in the player's hand, and light tiles near the
// camera (LTILE: color, radius, strength), which flicker unless reduced motion is on. The tile scan runs 4 times a second of real time (el).
const LTILE={[T.TORCH]:[1,.72,.38,7,.32,1],[T.CANDLE]:[1,.8,.5,5,.26,1],[T.LANTERNP]:[1,.62,.55,6,.28,.4],[T.FURNACE]:[1,.55,.25,6,.3,1],[T.ALTAR]:[.75,.45,1,6,.35,.3],
  [T.LAVA]:[1,.45,.15,7,.42,.5],[T.EMBERORE]:[1,.5,.2,3,.28,.6],[T.FOIL]:[.82,.76,1,3,.3,.2],[T.MUSH]:[1,.62,.32,3,.18,.2],[T.HEART]:[1,.42,.5,3,.24,.3],[T.ALCHEMY]:[.6,1,.7,3,.2,.3]};
let lScan=0,lTiles=[];
function scanLights(){lTiles=[];const cx=Math.floor(camera.position.x),cy=Math.floor(camera.position.y-3);
  for(let y=Math.max(0,cy-20);y<=Math.min(H-1,cy+20);y++)for(let x=Math.max(0,cx-32);x<=Math.min(W-1,cx+32);x++){const t=tiles[y*W+x],d=LTILE[t];if(!d)continue;
    // lava: only its surface, every 3rd column, so a pool gives a few lights instead of hundreds
    if(t===T.LAVA&&(tileAt(x,y+1)===T.LAVA||x%3))continue;lTiles.push([x+.5,y+.6,d,x*7.1+y*3.3]);}}
export function updateDynLights(el=1/60){const L=[];for(const q of projs)if(q.k.light)L.push([q.x,q.y,q.k.light]);if(pt.mesh&&pt.mesh.visible&&player.partner==='lumi')L.push([pt.x,pt.y,[1,.85,.5,8.5]]);if(pt.mesh&&pt.mesh.visible&&player.partner==='ember')L.push([pt.x,pt.y,[1,.6,.3,4]]);for(const k of pickups)if(k.id==='fstar')L.push([k.x,k.y+.3,[1,.85,.4,3.5]]);if(petS.mesh&&petS.mesh.visible&&petS.type==='moth')L.push([petS.x,petS.y+.5,[1,.85,.45,5]]);
  const p=player,it=selItem();if(it&&it.id==='torch'&&!p.dead&&state==='play')L.push([p.x+p.face*.5,p.y+1.1+(p.rideY||0),[1,.75,.42,6.5],.55]);
  if((lScan-=el)<=0){lScan=.25;scanLights();}const fl=reduceMotion()?0:1,tm=worldClock;
  for(const[x,y,d,ph]of lTiles)L.push([x,y,[d[0],d[1],d[2],d[3]],d[4]*(1+fl*d[5]*(.13*Math.sin(tm*9.3+ph)+.07*Math.sin(tm*23.7+ph*1.7)))]);
  const cx=camera.position.x,cy=camera.position.y-3;L.sort((a,b)=>Math.hypot(a[0]-cx,a[1]-cy)-Math.hypot(b[0]-cx,b[1]-cy));
  for(let i=0;i<NDL;i++){const l=L[i];if(l){U.uDL.value[i].set(l[0],l[1],l[2][3],l[3]??1);U.uDLC.value[i].set(l[2][0],l[2][1],l[2][2]);}else U.uDL.value[i].w=0;}}
export function checkRitual(){const sh=BIO&&BIO.shrine;if(!sh||boss||!inkMoon||!isNight()||quests.unfolded)return;const[sx,sy]=sh;if(Math.abs(player.x-sx)>24||Math.abs(player.y-sy)>14)return;
  let lit=0;for(let x=sx-9;x<=sx+9;x++)if(tileAt(x,sy)===T.PEDESTAL&&tileAt(x,sy+1)===T.CANDLE)lit++;if(lit>=5){toast('The pages tremble… something unfolds!','bad');SFX.boom();shake(.6);spawnEnemy('unfolded',sx+(player.x<sx?6:-6),sy+1);stat('ritual');}}
function flood(x,y,match,limit=80,diag=false){const out=[],seen=new Set([idx(x,y)]),st=[[x,y]];while(st.length&&out.length<limit){const[cx,cy]=st.pop();out.push([cx,cy]);const nb=[[1,0],[-1,0],[0,1],[0,-1]];if(diag)nb.push([1,1],[-1,-1],[1,-1],[-1,1]);for(const[dx,dy]of nb){const nx=cx+dx,ny=cy+dy,k=idx(nx,ny);if(!seen.has(k)&&match(tileAt(nx,ny),k)){seen.add(k);st.push([nx,ny]);}}}return out;}
function peelAt(x,y){const cells=flood(x,y,t=>t===T.PEEL,60);cells.sort((a,b)=>(a[1]-b[1])||(a[0]-b[0]));cells.forEach(([cx,cy],n)=>setTimeout(()=>{if(tileAt(cx,cy)!==T.PEEL)return;setTile(cx,cy,T.AIR);if(n%3===1)SFX.rustle(.15,.5);burst(cx+.5,cy+.5,['#e6e1d6','#fbf8f0','#8d8f9a'],7,4,{grav:3,life:1.2,s:1.4});},n*45));
  SFX.peel();toast('The wall peels away like old wallpaper!','gold');stat('peels');guideEv('peel');}
function popSketch(x,y){const m=meta[idx(x,y)];const cells=flood(x,y,(t,k)=>t===T.SKETCH&&meta[k]===m,50,true);cells.forEach(([cx,cy],n)=>setTimeout(()=>{if(tileAt(cx,cy)!==T.SKETCH)return;setTile(cx,cy,m===2?T.PLANK:T.PLATFORM);burst(cx+.5,cy+.5,['#c98f4f','#fbf8f0','#6a6070'],6,4,{grav:2});tone(400+n*40,600+n*40,.1,'triangle',.06);},n*60));
  toast(m===2?'The sketched stairs pop out of the page!':'The sketched bridge folds up into a real one!','gold');stat('popouts');guideEv('pop');}
const CAMPCOST=[['wood',30],['stone',15],['torch',3]];
function signAt(x,y){const i=idx(x,y);if(meta[i]===1){openSide('travel',null,null,'Signposts');return;}const c=BIO.camps&&BIO.camps.find(c=>c.sx===x&&c.sy===y);if(!c)return;
  if(!CAMPCOST.every(([id,n])=>countItem(id)>=n)){toast(`Rebuild this camp with ${CAMPCOST.map(([id,n])=>n+' '+ITEMS[id].name).join(', ')}.`);return;}
  CAMPCOST.forEach(([id,n])=>removeItem(id,n));rebuildCamp(c);}
function rebuildCamp(c){const{x0,L}=c;const st=(x,y,t,m=0)=>setTile(x,y,t,m);
  for(let x=x0;x<=x0+9;x++){st(x,L,T.PLANK);for(let y=L+1;y<=L+4;y++){st(x,y,T.AIR);walls[idx(x,y)]=2;}st(x,L+5,T.PLANK);}for(let x=x0-1;x<=x0+10;x++)st(x,L+6,T.BRICK);
  for(let y=L+3;y<=L+4;y++)st(x0,y,T.PLANK);st(x0,L+1,T.DOOR,0);st(x0,L+2,T.DOOR,2);for(let y=L+1;y<=L+4;y++)st(x0+9,y,y===L+3?T.GLASS:T.PLANK);
  st(x0+3,L+1,T.TABLE);st(x0+4,L+1,T.CHAIR);st(x0+6,L+3,T.TORCH);st(x0+7,L+1,T.BENCH);setTile(c.sx,c.sy,T.SIGN,1);c.done=true;
  popUp();SFX.nice();toast('Camp rebuilt! It is now a signpost for fast travel, and a home for a new townsperson.','gold');stat('camps');}
export function travelTo(x,y){const p=player;p.x=x+.5;p.y=y;p.vx=p.vy=0;hook.state=0;camT.x=p.x;camT.y=p.y+1;burst(p.x,p.y+1,['#fbf8f0','#f1c04f'],30,6,{grav:0});popUp();SFX.nice();setInv(false);}
function interact(){const tx=Math.floor(mouse.wx),ty=Math.floor(mouse.wy);
  {const n=npcs.find(n=>Math.abs(mouse.wx-n.x)<.8&&mouse.wy>n.y-.2&&mouse.wy<n.y+2);if(n){if(Math.abs(n.x-player.x)<6)talkTo(n);else toast(`Get closer to talk to the ${NPCDEF[n.type].name}.`);return;}}
  if(!reachOK(tx,ty,6.5))return;const i=idx(tx,ty),t=tileAt(tx,ty);
  if(t===T.PEEL){peelAt(tx,ty);return;}
  if(t===T.CRANK){crankAt(tx,ty);return;}
  if(t===T.GATE){gateAt(tx,ty);return;}
  if(t===T.SKETCH){popSketch(tx,ty);return;}
  if(t===T.SIGN){signAt(tx,ty);return;}
  if(t===T.MURAL){readMural(tx,ty);SFX.rustle(.2,.5);return;}
  if(t===T.ALTAR){toast('"Five small flames upon the stones, beneath a moon of ink, will wake the one who was unfolded."');SFX.pick();return;}
  if(t===T.DOOR){const top=meta[i]&2;const oy=top?ty-1:ty+1;const open=!(meta[i]&1);if(!open&&(entityIn(tx,ty)||entityIn(tx,oy))){return;}const nm=open?1:0;setTile(tx,ty,T.DOOR,(meta[i]&2)|nm);if(tileAt(tx,oy)===T.DOOR)setTile(tx,oy,T.DOOR,(meta[idx(tx,oy)]&2)|nm);SFX.door();return;}
  if(t===T.CHEST){if(!chests.has(i))chests.set(i,new Array(20).fill(null));if(!(meta[i]&4)){meta[i]|=4;if(chests.get(i).some(Boolean))stat('chests');}loreChest(i);openSide('chest',i);SFX.door();return;}
  if(t===T.CROP){const m=meta[i],ct=Math.min(4,m>>2);if((m&3)>=2){dropItem(HERBS[ct][0],randi(1,2)*(isFest('fall')?2:1),tx+.5,ty+.5);if(Math.random()<.6)dropItem(SEEDIDS[ct],randi(1,2),tx+.5,ty+.5);setTile(tx,ty,T.CROP,ct*4);stat('harvests');SFX.pick();burst(tx+.5,ty+.5,[HERBCOL[ct],'#86d15f'],8,3);}else toast(dormant(i,ct)?`${HERBS[ct][1]} rests outdoors in winter. Grow it under placed background walls.`:`${HERBS[ct][1]} is still growing.`);return;}
  if(t===T.RARE){const m=meta[i],ct=Math.min(3,m>>2);if((m&3)>=2){dropItem(RARE[ct][0],randi(1,2)*(isFest('fall')?2:1),tx+.5,ty+.5);if(Math.random()<.5)dropItem(RSEEDS[ct],1,tx+.5,ty+.5);setTile(tx,ty,T.RARE,ct*4);stat('harvests');fcount('harvest');SFX.pick();burst(tx+.5,ty+.5,[RARECOL[ct],'#fbf8f0'],10,3,{bright:1});}else toast(`${RARE[ct][1]} is still growing. ${RAREHOW[ct]}`);return;}
  if(t===T.CLOCK){const h=Math.floor(worldTime),m=Math.floor((worldTime-h)*60);toast(`The clock reads ${(h%12)||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}.`);SFX.pick();return;}
  if(t===T.BED){player.spawn={x:tx+.5,y:ty};toast('Spawn point set.','good');SFX.pick();return;}}

export function updatePlayer(dt){const p=player;updateGhosts(dt);updateRune();setCheck();updateDashHud(dt);updateDrawHud();if(p.dead){p.dashT=0;updateShield(dt);dieAnim(dt);p.deadT-=dt;$('deadTxt').textContent=`Refolding in ${Math.max(0,Math.ceil(p.deadT))}…`;if(p.deadT<=0)respawn();return;}
  const cx=Math.floor(p.x);const lt=tileAt(cx,Math.floor(p.y+.7));p.inLiq=TP[lt].liq?lt:0;
  if(p.inLiq===T.INK&&!p.wasInk)stat('swims');p.wasInk=p.inLiq===T.INK;
  if(p.inLiq===T.LAVA&&!hasBuff('fire')){if(p.inv_t<=0)hurtPlayer(30,p.x-p.face,null,'fire');burst(p.x,p.y+.5,['#ff8a3d','#ffd66b'],1,2,{grav:-4,bright:1});}
  const hooked=hook.state===2;
  const onRope=tileAt(cx,Math.floor(p.y+.9))===T.ROPE||tileAt(cx,Math.floor(p.y+.2))===T.ROPE;
  const upH=!!(keys.w||keys.arrowup||pad.held.up||touch.held.up),dnH=held('down');
  if(onRope&&(upH||dnH)&&!hooked)p.climb=true;if(!onRope||hooked)p.climb=false;
  // block: hold right-click, the Block key, or the gamepad Interact button with a shield equipped
  // (Settings > Block: Toggle raises the shield on one press and lowers it on the next)
  const shield=shieldItem(),blkIn=held('block')||mouse.r||(pad.active&&!!pad.held.interact);if(SET.blockTog&&blkIn&&!p.blkWas)p.blockOn=!p.blockOn;if(!shield)p.blockOn=false;p.blkWas=blkIn;
  const wantBlock=!!shield&&(SET.blockTog?!!p.blockOn:blkIn)&&!hooked&&!p.climb&&!p.flat&&p.dashT<=0&&!cursor&&!invOpen;
  if(wantBlock&&!p.blocking){p.blocking=true;p.blockT=0;p.parryOK=!(p.blockCD>0);SFX.raise();}else if(!wantBlock&&p.blocking){p.blocking=false;p.blockCD=.3;}
  p.blockCD=(p.blockCD||0)-dt;if(p.blocking){p.blockT+=dt;p.face=mouse.wx>=p.x?1:-1;}
  const heavyWind=p.swing&&p.swing.heavy&&p.swing.t<p.swing.dur*.6,st=p.st||{};
  const left=held('left'),right=held('right');const spd=6.2*(hasAcc('speed')?1.2:1)*(hasBuff('swift')?1.25:1)*(hasBuff('charged')?1.2:1)*(hasBuff('fed')?1.05:1)*(p.inLiq?.62:1)*(p.climb?.35:1)*(p.blocking?.45:1)*(p.draw?.6:1)*(heavyWind?.5:1)*(st.ink>0?.7:1)*(p.mount?MOUNTS[p.mount].spd:1);const acc=(p.onGround?55:30)*(p.mount?1.4:1);
  if(!hooked){if(left&&!right){p.vx=Math.max(p.vx-acc*dt,-spd);if(!p.swing&&!p.blocking)p.face=-1;}else if(right&&!left){p.vx=Math.min(p.vx+acc*dt,spd);if(!p.swing&&!p.blocking)p.face=1;}else p.vx*=Math.pow(p.onGround?.0004:.25,dt);
    if(Math.abs(p.vx)>spd)p.vx*=Math.pow(.05,dt);}
  const wantFlat=held('flat')||(pad.active&&pad.held.down&&p.onGround&&(p.downT=(p.downT||0)+dt)>.3);if(!(pad.active&&pad.held.down))p.downT=0;
  // riders get off to flatten, climb a rope or swing on the hook
  if(p.mount&&(wantFlat||p.climb||hooked))dismount();
  if(wantFlat&&!p.flat&&!hooked&&!p.climb){p.flat=true;p.h=.85;if((p.flatCD||0)<=0){p.inv_t=Math.max(p.inv_t,.35);p.flatCD=1.2;burst(p.x,p.y+.4,['#fbf8f0','#e9dcc0'],10,3,{grav:2});SFX.crunch();stat('flats');guideEv('flat');}else SFX.rustle(.12,.4);}
  else if(!wantFlat&&p.flat){if(!boxHits(p.x,p.y,p.w,1.82)){p.flat=false;p.h=1.82;SFX.unfold();}}
  p.flatCD=(p.flatCD||0)-dt;if(p.flat){p.vx=clamp(p.vx,-spd*.7,spd*.7);}
  p.drop=held('down');
  p.coyote=(p.onGround||p.climb)?.1:p.coyote-dt;p.jbuf-=dt;p.jumpAge+=dt;
  const jv=21*(hasAcc('speed')?1.08:1)*(p.mount?MOUNTS[p.mount].jump:1);
  if(p.flat&&p.jbuf>0){p.jbuf=0;}
  if(p.jbuf>0&&p.inLiq&&!p.onGround){p.vy=Math.max(p.vy,8.5);p.jbuf=0;burst(p.x,p.y+1.6,['#a894d0','#fbf8f0'],3,1.5,{grav:-3,life:.6});}
  else if(p.jbuf>0){if(p.coyote>0){p.vy=jv;p.coyote=0;p.jbuf=0;p.climb=false;SFX.jump();}else if(hasAcc('djump')&&!p.usedDouble&&p.stompWin<=0){p.vy=jv*.88;p.usedDouble=true;stat('glides');p.jbuf=0;burst(p.x,p.y,['#fbf8f0','#dcd3c2'],10,3,{grav:2});SFX.jump();}}
  if(p.climb){p.vy=upH?5.5:dnH?-5.5:0;p.climbT=(p.climbT||0)+Math.abs(p.vy)*dt*.6;p.x+=(cx+.5-p.x)*Math.min(1,dt*12);p.usedDouble=false;}
  else if(!hooked){if(!held('jump')&&p.vy>6&&!p.inLiq)p.vy-=70*dt;
    if(hasBadge('feather')&&held('jump')&&p.vy<-4&&!p.inLiq){p.vy-=52*dt;p.vy=Math.max(p.vy,-4);}else if(p.inLiq){p.vy-=16*dt;if(held('jump'))p.vy=Math.min(p.vy+34*dt,6);if(p.vy<-5)p.vy=-5;}else{p.vy-=52*dt;if(p.vy<-30)p.vy=-30;}
    // Clockwork Wings (the Folded Clocktower's reward): hold jump in mid-air to fly until the spring runs down; it rewinds on the ground
    if(hasAcc('fly')&&held('jump')&&!p.onGround&&!p.inLiq&&!p.flat&&p.flyT>0&&p.vy<9){p.flyT-=dt;p.vy=Math.min(9,p.vy+(p.vy<0?130:95)*dt);if(Math.random()<dt*24)burst(p.x-p.face*.3,p.y+1.1,['#e0b04a','#fbf8f0','#c9a24a'],1,1.5,{grav:4,life:.5});if(p.flyT<=0)SFX.rustle(.12,.4);}}
  p.dashCD=Math.max(0,p.dashCD-dt);p.dashI-=dt;
  if(p.dashT>0){if(hooked||p.climb)p.dashT=0;else{p.dashT-=dt;p.vx=p.dashDir*DASH_V*(p.inLiq?.6:1);if(!p.onGround&&!p.inLiq)p.vy=0;if(Math.random()<dt*40)burst(p.x-p.dashDir*.4,p.y+rand(.3,1.5),['#fbf8f0','#e9dcc0'],1,1.5,{grav:1,life:.35});if(p.dashT<=0)p.vx=p.dashDir*spd;}}
  updateHook(dt);
  p.prevY=p.y;p.step=true;
  collide(p,dt);if(p.onGround||p.climb||hooked){p.flyT=FLY_T;}if(p.onGround){p.usedDouble=false;p.airDashed=false;}
  if(p.landV<-9){emit('dust',p.x,p.y,{n:p.landV<-18?10:5,spd:p.landV<-18?3.5:2});p.squash=.14;p.landT=.12;}p.landV=0;
  if(p.onGround&&Math.abs(p.vx)>3.5){p.stepT=(p.stepT||0)-dt;if(p.stepT<=0){p.stepT=.24;const gt=tileAt(Math.floor(p.x),Math.floor(p.y-.5));if(gt&&TP[gt]&&OPAQUE[gt])burst(p.x-p.face*.25,p.y+.05,[sh(TP[gt].col,1.1),'#e9dfc9'],2,1.2,{up:1.2,grav:6,life:.5});}}
  p.squash=Math.max(0,(p.squash||0)-dt);
  if(p.y<-5){p.hp=0;die();}
  p.manaT=(p.manaT||0)+dt;if(p.manaT>.8&&p.mana<p.maxMana)p.mana=Math.min(p.maxMana,p.mana+dt*(3+p.maxMana*.05)*(Math.abs(p.vx)<.5?1.6:1)*(setOn('weave')?2:1));
  p.inv_t-=dt;p.potT=Math.max(0,p.potT-dt);p.stompWin-=dt;p.regenT+=dt;if(p.regenT>5&&p.hp<p.max){p.hp=Math.min(p.max,p.hp+dt*(p.regenT>12?3:1));}if(hasBadge('happy')&&p.hp<p.max)p.hp=Math.min(p.max,p.hp+dt);const rg=(hasBuff('regen')?2:0)+(hasBuff('lunar')&&isNight()?3:0)+(hasBuff('fed')?.5:0)+(hasAcc('nightregen')&&isNight()?1:0);if(rg&&p.hp<p.max)p.hp=Math.min(p.max,p.hp+rg*dt);
  for(const k in p.buffs){p.buffs[k]-=dt;if(p.buffs[k]<=0){delete p.buffs[k];toast(`${BUFFS[k][0]} wore off.`);}}
  updatePlayerStatus(dt);if(p.dead){updateTool(null,1);return;}
  if(wind&&!p.onGround&&hook.state!==2&&!p.inLiq)p.vx+=wind*dt*3;
  // items
  const it=selItem();p.mineP=p.mineP||0;
  if(p.draw&&(!it||it.id!==p.draw.id||cursor||p.blocking||invOpen))cancelDraw();
  if(mouse.lp&&it&&it.dmg&&!it.use&&!it.ranged&&!it.magic&&!cursor&&!p.blocking){const since=worldClock-p.lastSwingEnd,s=p.swing;
    if(s&&s.sword){if(inNiceWin(s))p.niceNext=true;else if(!s.early&&s.t>.05&&s.dur-s.t>0){s.early=true;floatText(p.x+p.face,p.y+2.3,'early','miss');}}
    else if(!s&&since<NICE_LATE*niceW()&&!p.lastEarly){startSwing(it,true);}}
  // Settings > Bow draw: Toggle keeps drawing after the button is let go and looses on the next press (drawLock waits for that press to end)
  const useIn=mouse.l||(pad.active&&!!pad.held.use),usePr=useIn&&!p.useWas;p.useWas=useIn;let useHeld=useIn;
  if(SET.drawTog){if(p.draw){useHeld=!(usePr&&p.draw.t>0);if(!useHeld)p.drawLock=true;}else if(p.drawLock){if(useIn)useHeld=false;else p.drawLock=false;}}
  if(useHeld&&!cursor&&!p.blocking){if(it)useItem(it,dt,usePr);}else{if(p.draw)releaseBow();if(p.mineTile!==-2)p.mineP=Math.max(0,p.mineP-dt*2);if(p.mineTile===-2)p.mineTile=-1;p.placeT=0;}
  if(mouse.rp)interact();
  if(p.swing){const s=p.swing;s.t+=dt;if(s.heavy&&!s.slam&&!s.rel&&s.t>=s.dur*HAM_TOP){if(useHeld&&!p.blocking){s.t=s.dur*HAM_TOP;hamCharge(s,dt);}else s.rel=true;}if(s.sword){const k=s.t/s.dur;const[tipX,tipY]=swingTip(s,Math.min(1,k));if(!s.heavy)swingStep(s,k);if(s.heavy&&!s.slam&&k>=HAM_HIT)hammerImpact(s,tipX,tipY);if(inNiceWin(s)){if(!s.cued){s.cued=true;SFX.cue();emit('sparks',tipX,tipY);}burst(tipX,tipY,['#fff3c0','#ffe58a'],1,1,{grav:0,life:.3,bright:1});}
      if(s.heavy?k>.46&&k<.8:k>=SWKEYS[s.combo][0][0]*.5)for(const e of enemies){if(e.dying||s.hit.has(e))continue;const cx=e.x,cy=e.y+e.h/2;const dx=cx-p.x,dy=cy-(p.y+1);if((dx*p.face>-.6)&&Math.hypot(dx,dy)<2.1+(s.reach||0)+e.w/2){s.hit.add(e);if(s.charged)crack(e);const air=!s.heavy&&!p.onGround&&!p.climb&&!e.d.boss;hurtEnemy(e,s.dmg*(s.nice?1.8:1)*(s.counter?2:1)*(air&&s.combo===2?1.25:1)*rand(.9,1.1),p.face,s.kb,s.nice||s.counter,s.elem);if(s.heavy)stagger(e);if(air)airHit(s,e);if(setOn('warden')&&p.hp<p.max)p.hp=Math.min(p.max,p.hp+1);}}}
    if(s.t>=s.dur){p.swing=null;if(s.sword){p.lastSwingEnd=worldClock;p.swEnd=s.heavy?null:swingArm(s,1);p.lastEarly=!!s.early;if(p.niceNext){p.niceNext=false;startSwing(ITEMS[s.tool],true);}else if((mouse.l||(pad.active&&pad.held.use))&&it&&it.dmg&&!it.use&&!it.ranged&&!it.magic&&!cursor)startSwing(it,false);}}}
  // pickups magnet handled in pickups
  // mesh
  const m=p.mesh;const target=p.face>0?0:Math.PI;p.rot+=(target-p.rot)*Math.min(1,dt*16);m.rotation.y=p.rot;
  // which rig clip (rig.js, built from render.js POSES/PF): swings and aimed items first, then reactions (parry, block, hurt),
  // then movement. The rig blends from one clip to the next; walk and climb run on their own phase.
  for(const k of['hurtT','parryT','landT','cheerT','counterT'])if(p[k]>0)p[k]-=dt;if(p.onGround)p.airHits=0;if(p.swing||Math.abs(p.vx)>.5||!p.onGround)p.cheerT=0;
  let c='idle',ct=null;const sp=p.swing&&!p.blocking&&(p.swing.sword||p.swing.tool)?swingPose(p.swing):null;if(sp)c=FCLIP[sp.f]||'hold';else if(p.parryT>0)c='parry';else if(p.blocking)c='block';else if(p.swing&&(p.swing.sword||p.swing.tool))c='hold';
  else if(p.hurtT>0)c='hurt';else if(p.flat)c='flat';else if(p.dashT>0)c='dash';else if(p.climb){c='climb';ct=p.climbT||0;}else if(!p.onGround)c=p.vy>0?'jump':'fall';else if(p.landT>0)c='land';
  else if(Math.abs(p.vx)>.5){p.walkT+=dt*Math.abs(p.vx)*1.3;c='walk';ct=p.walkT%4/4;}else if(p.cheerT>0)c='cheer';else p.walkT=0;
  if(p.mount&&!sp&&!p.blocking){c='idle';ct=null;}if(c==='reel0'||c==='reel1')c='reel';
  rigPlay(p.rig,c,{t:ct});m.position.set(p.x,p.y-.08+(p.rideY||0),.15);setTint(p.mat,p.x,p.y+1);statusOverlay(dt);p.mat.uniforms.uFlash.value=p.inv_t>0&&!(p.inv_t>1.3)?(Math.floor(p.inv_t*14)%2?.6:0):0;
  const sq=(p.onGround?(p.squash>0?1-p.squash*.9:1):clamp(1+p.vy*.006,.92,1.08))*(sp?sp.sq:1);m.scale.set(1/Math.sqrt(sq),sq,1);if(p.flat)m.scale.set(1.3,.42,1);if(p.cheerT>0&&!reduceMotion())m.position.y+=Math.abs(Math.sin(p.cheerT*10))*.12;
  if(p.dashT>0){m.scale.x*=1.22;m.scale.y*=.9;p.ghostT-=dt;if(p.ghostT<=0){p.ghostT=.03;spawnGhost();}}
  updateArm(sp);rigUpdate(p.rig,dt);updateTool(sp,sq);updateShield(dt);}
// sword: a three-hit combo, each cut keyframed as [k end, arm angle, easing, body frame]. Angles are world radians
// relative to facing (0 forward, + up). A cut coils back (anticipation), snaps through fast (ease-out-quart), overshoots, then settles.
// 0 overhead cut, 1 rising cut back up, 2 a wider lunging finisher. Each wind-up starts from where the last cut ended so chains flow.
// Warhammer: wind up behind the head, then slam down in front (impact at HAM_HIT).
const HAM_HIT=.54,EZ={o2:x=>1-(1-x)**2,o4:x=>1-(1-x)**4,io:x=>x<.5?2*x*x:1-(2-2*x)**2/2};
export const SWKEYS=[[[.2,2.45,'o2',10],[.46,-.85,'o4',11],[1,-.55,'io',12]],[[.2,-.95,'o2',12],[.46,2.35,'o4',10],[1,1.85,'io',9]],[[.3,2.85,'o2',10],[.52,-1,'o4',11],[1,-.65,'io',12]]];
const LUNGE=[2.5,2.5,7];
function swingArm(s,k){if(s.heavy)return swingAngle(k,true);const K=SWKEYS[s.combo];let a=s.from,k0=0;
  for(const[k1,a1,ez]of K){if(k<=k1)return lerp(a,a1,EZ[ez](clamp((k-k0)/(k1-k0),0,1)));a=a1;k0=k1;}return a;}
function swingFrame(s,k){if(s.heavy)return k<.38?10:k<.7?11:12;for(const q of SWKEYS[s.combo])if(k<=q[0])return q[3];return 9;}
// the whole pose for a swing at k: arm angle, blade angle (the blade drags behind a fast arm, then whips past it on the
// follow-through), body frame, arm stretch and body squash. Tools and aimed items just point the arm.
function swingPose(s,k=clamp(s.t/s.dur,0,1)){const p=player;if(s.aim!=null){const a=p.face>0?s.aim:Math.PI-s.aim;return{arm:a,blade:a,f:aimFrame(s,k),v:0,sc:1,sq:1};}
  if(!s.sword){const it=ITEMS[s.tool]||{};if(it.hammer){const a=lerp(2.5,-.9,EZ.io(k));return{arm:a,blade:a,f:k<.4?10:12,v:0,sc:1,sq:k<.4?.97:1};}
    const a=lerp(1.9,-.5,Math.sin(k*Math.PI*.5));return{arm:a,blade:a,f:it.pick?(k<.45?PF.mine0:PF.mine1):9,v:0,sc:1,sq:1};}
  const a=swingArm(s,k),dk=.02,v=(k>dk?a-swingArm(s,k-dk):swingArm(s,k+dk)-a)/(dk*s.dur),f=swingFrame(s,k);
  return{arm:a,blade:a+clamp(-v*.006,-.5,.5),f,v,sc:1+Math.min(.2,Math.abs(v)*.004),sq:f===10?.96:f===11?1.04:1};}
// the body under an aimed arm: drawing a bow, the loose after, casting, and the rod's cast and reel
function aimFrame(s,k){const it=ITEMS[s.tool]||{};if(s.draw!=null)return PF.bow;
  if(it.rod)return bob.state===1&&bob.t<.3?PF.fcast:bob.state===3?PF.reel0+(Math.floor(bob.t*12)&1):PF.reel0;
  if(it.magic)return PF.cast;if(it.ammo==='arrow')return k<.7?PF.bowrel:PF.bow;return 9;}
const ARML=.367;
// live: from the rig's posed shoulder (the arm the player sees); otherwise from the pose's numbers (the trail's curve)
function swingHand(sp,sq=1,live){const p=player,[sx,sy]=live?rigJoint(p.rig,'armA'):shoulderAt(sp.f),l=ARML*sp.sc;return[p.x+p.face*(sx+Math.cos(sp.arm)*l),p.y-.08+(p.rideY||0)+sy*sq+Math.sin(sp.arm)*l];}
function swingTip(s,k){const p=player,sp=swingPose(s,k),[hx,hy]=swingHand(sp),r=1.5*(s.heavy?1.2:1);return[hx+p.face*Math.cos(sp.blade)*r,hy+Math.sin(sp.blade)*r];}
// the moment a cut starts its strike: step into it, and the finisher kicks up dust and a little shake
function swingStep(s,k){const p=player,w=SWKEYS[s.combo][0][0];if(s.stepped||k<w)return;s.stepped=true;
  if(p.onGround&&!p.blocking){p.vx=p.face*Math.max(p.vx*p.face,LUNGE[s.combo]);if(s.combo===2)emit('dust',p.x-p.face*.3,p.y+.05);}if(s.combo===2){shake(.1);if(!ITEMS[s.tool].wave)fireProj('wave',p.x+p.face*.9,p.y+1+(p.rideY||0),p.face*20,0,Math.round(s.dmg*.4),{src:'melee',life:.22,elem:s.elem});}}
function swingAngle(k,heavy){if(heavy){if(k<.38)return lerp(1.2,2.55,1-Math.pow(1-k/.38,2));if(k<HAM_HIT){const e=(k-.38)/(HAM_HIT-.38);return lerp(2.55,-1.2,e*e);}return lerp(-1.2,-.95,(k-HAM_HIT)/(1-HAM_HIT));}
  const e=1-Math.pow(1-k,2.2);return lerp(2.1,-1.0,e);}
function hammerImpact(s,tx,ty){const p=player;s.slam=true;SFX.slam();shake(.3);const gy=Math.floor(ty-.2);
  if(isSolid(Math.floor(tx),gy)||p.onGround){const y=isSolid(Math.floor(tx),gy)?gy+1:p.y,gt=tileAt(Math.floor(tx),y-1),col=gt&&TP[gt]&&TP[gt].col||'#c9a574';burst(tx,y+.05,[col,sh(col,1.2),'#e9dfc9'],14,4.5,{up:1});
    // the shockwave rolls along the ground in front of the head
    // a full charge sends it much farther and cracks shells and armor (crack)
    for(const e of enemies){if(e.dying||s.hit.has(e)||e.d.fly||!e.onGround)continue;const fx=(e.x-tx)*p.face;if(s.charged?fx>-3-e.w/2&&fx<7.5+e.w/2&&Math.abs(e.y-y)<2:Math.abs(e.x-tx)<1.8+e.w/2&&Math.abs(e.y-y)<1.2){s.hit.add(e);if(s.charged)crack(e);hurtEnemy(e,s.dmg*(s.charged?.7:.5),p.face,s.kb*.6,false,s.elem);stagger(e);}}
    if(s.charged){SFX.boom();shake(.5);hitPause(.08);stat('shockwaves');for(let d=1;d<=7;d++)burst(tx+p.face*d,y+.05,[col,sh(col,1.2),'#e9dfc9'],5,2+d*.35,{up:1});for(let d=1;d<=3;d++)burst(tx-p.face*d,y+.05,[col,'#e9dfc9'],3,2,{up:1});}}}
const HAM_TOP=.37,HAM_CH=.75;
// holding the button at the top of a warhammer swing charges it; a full charge adds 50% damage and a shockwave
function hamCharge(s,dt){const[tx,ty]=swingTip(s,HAM_TOP);if(!s.ch){s.ch=0;SFX.draw();}s.ch+=dt;
  if(!s.charged&&s.ch>=HAM_CH){s.charged=true;s.dmg*=1.5;SFX.full();burst(tx,ty,['#fff3c0','#f1c04f','#fbf8f0'],14,3.5,{grav:0,life:.35,bright:1});}
  else if(Math.random()<dt*(s.charged?16:6))burst(tx,ty,s.charged?['#fff3c0','#ffe58a']:['#e9dfc9','#fbf8f0'],1,.8,{grav:0,life:.3,bright:s.charged?1:0});}
// a cracked foe loses its shell (scarab), its armored trait and its defense for a while
function crack(e){if(e.dying)return;const was=e.broke>worldClock;e.broke=worldClock+6;if(!was&&(e.trait==='armored'||e.type==='scarab'||e.d.def>=8)){floatText(e.x,e.y+e.h+.9,'cracked!','weak');burst(e.x,e.y+e.h*.7,e.d.col.concat(['#fbf8f0']),10,5,{grav:12});tone(900,300,.12,'square',.06);}}
// sword hits in the air keep you aloft (a few per jump) and pop the foe up; the third cut of the combo spikes it down
function airHit(s,e){const p=player;if((p.airHits=(p.airHits||0)+1)<=4)p.vy=Math.max(p.vy,s.combo===2?3:5.5);if(e.dying||e.parent)return;
  if(s.combo===2){e.vy=-16;e.vx=p.face*3;floatText(e.x,e.y+e.h+.6,'SPIKE!','nice');shake(.18);burst(e.x,e.y+e.h,['#fbf8f0','#fff3c0'],8,4,{grav:0,life:.3});}else{e.vy=Math.max(e.vy,e.elite?5:8);e.vx=p.face*1.5;}}
// boss phases: at 50% and 25% life a boss tears open, holds still (immune) while it refolds, then fights with new or harder attacks
const PHASE_MSG={mainspring:['The Mainspring winds itself tighter!','The Mainspring\'s spring snaps loose!'],king:['The King Slime swells with rage!','The King Slime splits at the seams!'],crane:['The Great Crane refolds its wings!','The Great Crane tears into a paper storm!'],
  lev:['The Inkwell Leviathan churns the ink!','The Leviathan comes unbound!'],folio:['The Charred Folio turns to a new chapter!','The Folio\'s last pages catch fire!'],unfolded:['The Unfolded creases sharply!','The Unfolded tears itself open!']};
function bossPhase(e,ph){e.phase=ph;e.act='phase';e.at=1.3;e.stun=0;SFX.tear();shake(.45);hitPause(.15);burst(e.x,e.y+e.h/2,e.d.col.concat(['#fbf8f0','#e9dcc0']),40,8,{grav:6,life:1.2});
  bossPhaseFx(e,ph);const m=PHASE_MSG[e.type];if(m)toast(m[ph-1],'bad');const bb=$('boss');bb.classList.remove('p1','p2');bb.classList.add('p'+ph);}
function bossRefold(e){const p=player,ph=e.phase;e.act=null;e.cd=.6;e.at=0;SFX.refold();shake(.3);const cy=e.y+e.h/2;for(let k=0;k<24;k++){const a=k/24*Math.PI*2;burst(e.x+Math.cos(a)*e.w*.6,cy+Math.sin(a)*e.h*.6,['#fbf8f0','#fff3c0'],1,2,{grav:0,life:.5,bright:1});}
  const dx=p.x-e.x;if(!p.dead&&Math.abs(dx)<e.w/2+3&&Math.abs(p.y+.9-cy)<e.h/2+3){p.vx=(dx>=0?1:-1)*12;p.vy=9;}
  if(e.type==='king')for(let k=0,n=ph>=2?5:3;k<n;k++){const s=spawnEnemy('bslime',e.x+rand(-1,1),e.y+1);s.vy=10;s.vx=rand(-6,6);}}
// from 50% the King Slime's landings fling gel; its every-third leap at 25% also shakes the ground under you
function kingQuake(e){const p=player,n=e.big?3:1;for(const s of[-1,1])for(let k=0;k<n;k++)fireProj('gelblob',e.x+s*e.w*.45,e.y+.5,s*rand(4,7)*(1+k*.5),rand(9,13),Math.round(e.d.dmg*.8),{hostile:true});
  if(e.big){e.big=false;if(!p.dead&&p.onGround&&Math.abs(p.x-e.x)<8&&Math.abs(p.y-e.y)<2.5)hurtPlayer(e.d.dmg,e.x,e);}}
// heavy hits throw enemies up and cancel whatever attack they were winding up
function stagger(e){if(e.dying||e.d.boss||e.parent)return;if(!e.d.fly&&!e.burrow)e.vy=Math.max(e.vy,e.elite?6:9);if(e.act==='wind'||e.act==='aim'||e.act==='puff'){e.act=null;e.cd=Math.max(e.cd||0,1.2);e.inf=0;floatText(e.x,e.y+e.h+.6,'staggered','miss');}}
// the rune ring (castMagic): shrinks onto the hand after each cast and turns gold in the Rune window
const runeRing=new THREE.Mesh(new THREE.RingGeometry(.9,1,48),new THREE.MeshBasicMaterial({color:0xc9b0f0,transparent:true,depthWrite:false})),runeGoal=new THREE.Mesh(new THREE.RingGeometry(.4,.47,40),new THREE.MeshBasicMaterial({color:0xc9b0f0,transparent:true,opacity:.45,depthWrite:false}));
for(const m of[runeRing,runeGoal]){m.renderOrder=4;m.visible=false;scene.add(m);}
function updateRune(){const p=player,r=p.rune,it=selItem(),w=RUNE_W*niceW();if(!r||p.dead||!it||it.id!==r.id||worldClock>r.at+w){if(r&&(!it||it.id!==r.id||worldClock>r.at+w))p.rune=null;runeRing.visible=runeGoal.visible=false;return;}
  const{ox,oy}=aimFrom(),f=clamp((worldClock-r.t0)/(r.at-r.t0),0,1),win=Math.abs(worldClock-r.at)<w;runeRing.visible=runeGoal.visible=true;
  runeRing.scale.setScalar(lerp(1.9,.44,f));runeRing.position.set(ox,oy,.3);runeGoal.position.set(ox,oy,.3);runeRing.material.opacity=.25+.6*f;
  runeRing.material.color.setHex(win?0xffe58a:0xc9b0f0);runeGoal.material.color.setHex(win?0xffe58a:0xc9b0f0);if(win&&!r.cued){r.cued=true;SFX.cue();}}
// a toast when a set's bonus switches on (not on load)
function setCheck(){const p=player,k=fullSet();if(k!==p.setWas){if(k&&p.setWas!==undefined){toast(`${SETS[k].name} set: ${SETS[k].bonus}`,'good');SFX.nice();}p.setWas=k;}}
const TR=28,trailPos=new Float32Array(TR*6),trailA=new Float32Array(TR*2),trailGeo=new THREE.BufferGeometry();
trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));trailGeo.setAttribute('aA',new THREE.BufferAttribute(trailA,1));
{const I=[];for(let i=0;i<TR-1;i++){const a=i*2;I.push(a,a+1,a+3,a,a+3,a+2);}trailGeo.setIndex(I);}
const trailMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uC:{value:new THREE.Color(1,1,1)}},
  vertexShader:`attribute float aA;varying float vA;void main(){vA=aA;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 uC;varying float vA;void main(){gl_FragColor=vec4(uC,vA);}`});
const trailMesh=new THREE.Mesh(trailGeo,trailMat);trailMesh.frustumCulled=false;trailMesh.renderOrder=4;trailMesh.visible=false;scene.add(trailMesh);
// the smear is rebuilt every frame from the swing curve itself (not from past frames), so the arc stays smooth at any
// frame rate; it only shows where the blade is moving fast, and takes the weapon's element colour
const TRCOL={fire:0xffb070,ink:0xc9b0f0,water:0xa8e4ff};
export function updateTrail(dt){const p=player,s=p.swing;
  if(!s||!s.sword||p.dead||p.blocking||s.heavy&&s.t<s.dur*.36){trailMesh.visible=false;return;}
  const k=clamp(s.t/s.dur,0,1),span=s.heavy?.22:.3,ts=s.heavy?1.2:1,sp0=swingPose(s,k),[sx,sy]=shoulderAt(sp0.f),top=p.y-.08+(p.rideY||0)+sy;
  trailMat.uniforms.uC.value.set(s.nice?0xffd66b:TRCOL[s.elem]||0xfffaf0);let any=0;
  for(let i=0;i<TR;i++){const u=i/(TR-1),kk=Math.max(0,k-span*(1-u)),sp=swingPose(s,kk),l=ARML*sp.sc,hx=p.x+p.face*(sx+Math.cos(sp.arm)*l),hy=top+Math.sin(sp.arm)*l;
    const dx=p.face*Math.cos(sp.blade),dy=Math.sin(sp.blade),a=u**1.4*clamp((Math.abs(sp.v)-4)/16,0,1)*(s.combo===2?.95:.8);if(a>.02)any=1;
    trailPos.set([hx+dx*.35*ts,hy+dy*.35*ts,.3,hx+dx*1.6*ts,hy+dy*1.6*ts,.3],i*6);trailA[i*2]=a*.1;trailA[i*2+1]=a;}
  trailMesh.visible=!!any;trailGeo.attributes.position.needsUpdate=true;trailGeo.attributes.aA.needsUpdate=true;}
const toolPivot=new THREE.Group();scene.add(toolPivot);let toolMesh=null,toolId=null,aimHand=[0,0];
// while swinging or aiming, gameplay holds the rig's front arm: pinned on screen from the shoulder toward the weapon's grip
function updateArm(sp){const p=player;if(!sp||p.dead||p.flat)return;rigSet(p.rig,'armA',{r:-(sp.arm+Math.PI/2),sy:sp.sc,abs:1,snap:1});}
function updateTool(sp,sq){const p=player,s=p.swing;if(!s||!s.tool||p.dead){toolPivot.visible=false;return;}if(toolId!==s.tool){if(toolMesh){toolPivot.remove(toolMesh);toolMesh.material.dispose();}const g=new THREE.PlaneGeometry(1.25,1.25);g.translate(.5,.5,0);toolMesh=new THREE.Mesh(g,spriteMat(iconTex(s.tool)));toolPivot.add(toolMesh);toolId=s.tool;}
  toolPivot.visible=true;const k=clamp(s.t/s.dur,0,1),ang=sp?sp.blade:s.aim!=null?(p.face>0?s.aim:Math.PI-s.aim):lerp(1.9,-.5,Math.sin(k*Math.PI*.5));
  if(s.aim!=null){const r=.55+.2*(1-k),[hx,hy]=aimHand=sp?swingHand(sp,sq,1):[p.x+p.face*.25,p.y+1.1];toolPivot.position.set(hx-Math.cos(s.aim)*r,hy-Math.sin(s.aim)*r,.18);}else if(sp){const[hx,hy]=swingHand(sp,sq,1);toolPivot.position.set(hx,hy,.18);}else toolPivot.position.set(p.x+p.face*.2,p.y+1.05+(p.rideY||0),.18);const ts=s.heavy?1.2:1;toolPivot.scale.set(p.face*ts,ts,1);toolPivot.rotation.z=(ang-Math.PI/4)*p.face;setTint(toolMesh.material,p.x,p.y+1);toolMesh.material.uniforms.uFlash.value=inNiceWin(s)||s.draw>=1?.55+.2*Math.sin(worldClock*30):s.nice?.35:s.draw?s.draw*.25:0;}
// a nocked arrow slides back along the bow while drawing
let nockMesh=null,nockId=null,shieldMesh=null,shieldId=null;
function updateNock(){const p=player,s=p.swing;if(!s||s.draw==null||p.dead){if(nockMesh)nockMesh.visible=false;return;}const ai=findAmmo('arrow'),id=ai>=0?p.inv[ai].id:'arrow';
  if(nockId!==id){if(nockMesh){scene.remove(nockMesh);nockMesh.material.dispose();nockMesh.geometry.dispose();}nockMesh=new THREE.Mesh(new THREE.PlaneGeometry(.8,.8),spriteMat(iconTex(id)));nockMesh.renderOrder=5;scene.add(nockMesh);nockId=id;}
  const a=s.aim,r=.25-.42*s.draw;nockMesh.visible=true;nockMesh.position.set(aimHand[0]+Math.cos(a)*r,aimHand[1]+.05+Math.sin(a)*r,.19);nockMesh.rotation.z=a-Math.PI/4;setTint(nockMesh.material,p.x,p.y+1);nockMesh.material.uniforms.uFlash.value=s.draw>=1?.5:0;}
// the raised shield sits in front of the player; it glows while a parry would still land
function updateShield(dt){const p=player;p.shieldFlash=Math.max(0,(p.shieldFlash||0)-dt);updateNock();if(!p.blocking||p.dead){if(shieldMesh)shieldMesh.visible=false;return;}const id=shieldItem().id;
  if(shieldId!==id){if(shieldMesh){scene.remove(shieldMesh);shieldMesh.material.dispose();shieldMesh.geometry.dispose();}shieldMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),spriteMat(iconTex(id)));shieldMesh.renderOrder=5;scene.add(shieldMesh);shieldId=id;}
  const up=Math.min(1,p.blockT/.08),hot=p.parryOK&&p.blockT<PARRY_W*niceW();shieldMesh.visible=true;shieldMesh.position.set(p.x+p.face*(.3+.25*up),p.y+.75+(p.rideY||0)+.3*up,.2);shieldMesh.rotation.z=p.face*(1-up)*.5;
  setTint(shieldMesh.material,p.x,p.y+1);shieldMesh.material.uniforms.uFlash.value=p.shieldFlash>0?.9:hot?.3:0;}

export function spawnLogic(dt){spawnT-=dt;if(spawnT>0)return;spawnT=.9;const p=player;if(p.dead)return;const surfY=surf[clamp(Math.floor(p.x),0,W-1)];const under=p.y<surfY-12;const ecl=eclipseOn()&&!under,night=isNight()||ecl;
  const cap=(under||biomeAt(p.x,p.y)==='under'?6:(night?7:4+(weather==='rain'?2:0)))*(inkMoon&&night&&!under?2:1);if(enemies.filter(e=>!e.d.boss&&!e.parent).length>=cap+(BIO.awake?2:0)+(ecl?2:0))return;if(Math.random()<(inkMoon&&night?.1:.45))return;
  const bio=biomeAt(p.x,p.y),lay=layerAt(p.x,p.y);let type;if(lay==='tower')return;
  let mig=null;const sp=(t,x,y)=>{const e=spawnEnemy(t,x,y);if(Math.random()<(night?.1:.06)*(BIO.awake?1.6:1)*(ecl?1.8:1))makeElite(e);if(ecl)e.ecl=true;if(mig&&t===mig)e.mig=true;return e;};
  // the vertical layers (layers.js) have their own foes
  if(lay==='sky')type=pick(night?['skyray','skyray','eye','sunkite']:['skyray','skyray','sunkite']);
  else if(lay==='deep')type=pick(['clockbug','clockbug','clockbug','bat','knight']);
  else if(bio==='under')type=pick(['cinderbat','cinderbat','ashimp','cracker','cracker','ashspider']);
  else if(bio==='lake'&&Math.random()<.6){for(let a=0;a<24;a++){const x=Math.floor(p.x+rand(-32,32)),y=Math.floor(p.y+rand(-16,10));if(Math.abs(x-p.x)<12)continue;if(tileAt(x,y)===T.INK&&tileAt(x,y+1)===T.INK){sp(Math.random()<.45?'quillfish':'inksquid',x+.5,y);return;}}type=night?pick(['zombie','blot','eye','inkwisp']):pick(['blot','blot','inkwisp']);}
  else if(under){const deep=p.y<surfY-40;const r=Math.random();if(bio==='snow')type=r<.4?'flurry':r<.65?'frostpuff':'bslime';else if(bio==='desert')type=r<.35?'scarab':r<.6?'bat':'bslime';else type=r<.4?'bat':(r<.75||!deep)?'bslime':'knight';}
  else if(bio==='snow')type=night?pick(['foldfox','foldfox','flurry','zombie','snowroll','frostpuff']):pick(['foldfox','flurry','slime','snowroll','snowroll','frostpuff']);
  else if(bio==='desert')type=night?pick(['zombie','eye','dunefin','scarab','sunkite']):pick(['slime','dunefin','dunefin','scarab','sunkite']);
  else type=night?pick(['zombie','zombie','eye','eye','slime','crumple']):pick(['slime','slime','slime','crumple','toadstool']);
  // a Monster Migration (events.js) brings another biome's foes into this one
  mig=lay?null:migPick(bio,under,night);if(mig)type=mig;
  // awakened worlds: pages bleed together, so foes from other regions turn up anywhere
  if(BIO.awake&&!lay&&bio!=='under'&&bio!=='lake'&&Math.random()<.25)type=under?pick(['knight','blot','flurry','scarab','cracker']):pick(night?['foldfox','flurry','dunefin','scarab','inkwisp','blot','snowroll']:['foldfox','sunkite','dunefin','crumple','toadstool','snowroll','frostpuff']);
  if(inkMoon&&night&&!under&&lay!=='sky'&&Math.random()<.3)type='wraith';
  const side=Math.random()<.5?-1:1;const x=clamp(Math.floor(p.x+side*rand(22,34)),3,W-4);
  if(EN[type].fly){for(let a=0;a<12;a++){const y=Math.floor(p.y+rand(-8,10));if(y<6||y>H-4)continue;if(!isSolid(x,y)&&!isSolid(x,y+1)&&!isSolid(x+1,y)&&walls[idx(x,y)]<2&&(under||y>=surf[x])){sp(type,x+.5,y);return;}}return;}
  if(type==='ashspider'){for(let a=0;a<14;a++){const y=Math.floor(p.y+rand(-10,14));if(y<6||y>=H-3)continue;if(!isSolid(x,y)&&!isSolid(x,y-1)&&isSolid(x,y+1)&&walls[idx(x,y)]<2){const e=sp(type,x+.5,y);e.y=y+1-e.h-.02;return;}}return;}
  if(!under){let y=Math.min(H-8,Math.floor(p.y)+24);while(y>4&&!isSolid(x,y))y--;y++;if(Math.abs(y-p.y)>30||walls[idx(x,y)]>=2)return;if(!isSolid(x,y)&&!isSolid(x,y+1))sp(type,x+.5,y);return;}
  for(let a=0;a<14;a++){const y=Math.floor(p.y+rand(-12,12));if(y<6||y>=H-3)continue;if(!isSolid(x,y)&&!isSolid(x,y+1)&&isSolid(x,y-1)&&walls[idx(x,y)]<2){sp(type,x+.5,y);return;}}}
let spawnT=2;
// elite trait looks: tint plus a particle cue each (the trait mark above them is the shape cue, see updateEnemyFx)
function traitFx(e,m,dt){const k=e.trait,u=m.material.uniforms.uTint.value,rx=()=>e.x+rand(-.45,.45)*e.w,ry=()=>e.y+rand(0,1)*e.h;u.multiply(TRAITS[k].tv);
  if(!e.named&&Math.hypot(player.x-e.x,player.y-e.y)<14){e.named=1;floatText(e.x,e.y+e.h+1.1,TRAITS[k].n+' elite','crit');}
  if(k==='burning'){if(Math.random()<dt*18)emit('embers',rx(),ry(),{cols:ELEM.fire.col,spd:1,grav:-5,life:.5,sway:0});}
  else if(k==='frosted'){if(Math.random()<dt*8)burst(rx(),ry(),['#eef6ff','#bfe3f7'],1,.5,{grav:1.5,life:1,bright:1,s:1.2});}
  else if(k==='swift'){if(Math.abs(e.vx)>2&&Math.random()<dt*20)burst(e.x-Math.sign(e.vx)*e.w*.5,ry(),['#fbf8f0','#e9dcc0'],1,.3,{grav:0,life:.35});}
  else if(k==='vampiric'){if(Math.random()<dt*5)burst(rx(),e.y+e.h,['#d4483b','#7a1a2a'],1,.4,{grav:-1.5,life:.7});}
  else if(k==='explosive'){if(Math.random()<dt*10)burst(e.x,e.y+e.h+.1,['#ffd66b','#ff8a3d'],1,1.5,{grav:2,life:.3,bright:1});if(e.hp<e.max*.35){e.warn=true;}}
  else if(k==='inky'){if(Math.random()<dt*8)emit('ink',rx(),e.y+e.h*.3,{cols:ELEM.ink.col,n:1,spd:.4});}
  else if(k==='golden'){if(Math.random()<dt*10)burst(rx(),ry(),['#f1c04f','#fff3c0'],1,.5,{grav:-.5,life:.8,bright:1});}}
// explosive elites leave a lit fuse where they fell: it hisses, then bursts (fire, parryable like any hit with a source)
const fuses=[];
function tickFuses(dt){for(let i=fuses.length-1;i>=0;i--){const f=fuses[i];f.t-=dt;if(Math.random()<dt*40)burst(f.x+rand(-.3,.3),f.y+rand(-.3,.3),['#ffd66b','#ff8a3d','#fbf8f0'],1,3,{grav:1,life:.3,bright:1});
  if(f.t>0)continue;fuses.splice(i,1);const r=3.6;burst(f.x,f.y,['#ff8a3d','#ffd66b','#d4483b','#fbf8f0'],40,9,{bright:1});SFX.boom();shake(.4);
  if(!player.dead&&Math.hypot(player.x-f.x,player.y+.9-f.y)<r)hurtPlayer(f.dmg,f.x,f.src,'fire');}}
export function updateEnemies(dt){const p=player;tickFuses(dt);for(let i=enemies.length-1;i>=0;i--){const e=enemies[i],d=e.d;
  e.tele=e.warn=false;if(e.dying){teleOutline(e.mesh,false);if(e.bar)e.bar.forEach(b=>b.visible=false);if(e.mark)e.mark.visible=false;if(e.star)e.star.visible=false;if(e.tmark)e.tmark.visible=false;if(e.thread)e.thread.visible=false;e.dying-=dt;e.mesh.rotation.z+=dt*14;e.mesh.scale.multiplyScalar(Math.pow(.02,dt));if(e.dying<=0){removeEnemy(e);enemies.splice(i,1);}continue;}
  e.t+=dt;e.flash=Math.max(0,e.flash-dt);e.hitCD-=dt;e.tagT=(e.tagT||0)-dt;if(e.st){tickStatus(e,dt);if(e.dying)continue;}const dx=p.x-e.x,dy=(p.y+.9)-(e.y+e.h/2),dist=Math.hypot(dx,dy);const toward=dx>0?1:-1;const night=isNight();
  if(d.boss&&!e.parent&&dist>60&&d.fly){e.x=p.x+rand(-10,10);e.y=p.y+12;e.vx=e.vy=0;if(e.segs)e.segs.forEach(sg=>{sg.x=e.x;sg.y=e.y;});}
  if(dist>75&&!d.boss&&!e.parent){removeEnemy(e);enemies.splice(i,1);continue;}
  const chase=!p.dead;
  if(d.boss&&!e.parent){const ph=e.hp<=e.max*.25?2:e.hp<=e.max*.5?1:0;if(ph>(e.phase||0)&&!bossHeld(e))bossPhase(e,ph);}
  // arrival and defeat: the boss holds still; at the end of its defeat it is killed for real
  if(e.act==='intro'||e.act==='defeat'){e.at-=dt;e.vx*=Math.pow(.02,dt);if(d.fly||d.noclip)e.vy*=Math.pow(.05,dt);else e.vy-=40*dt;if(e.at<=0){if(e.act==='defeat'){e.act=null;killEnemy(e);}else{e.act=null;e.cd=.8;}}}
  else if(e.act==='phase'){e.at-=dt;e.tele=e.warn=true;e.vx*=Math.pow(.02,dt);if(d.fly||d.noclip)e.vy*=Math.pow(.02,dt);else e.vy-=40*dt;if(Math.random()<dt*30)burst(e.x+rand(-e.w/2,e.w/2),e.y+rand(0,e.h),d.col.concat(['#fbf8f0']),1,4,{grav:6,life:.8});if(e.at<=0)bossRefold(e);}
  else if(e.stun>0){e.stun-=dt;e.vx*=Math.pow(.02,dt);if(d.fly||d.noclip)e.vy*=Math.pow(.02,dt);else e.vy-=40*dt;if(Math.random()<dt*6)burst(e.x,e.y+e.h+.2,['#fff3c0','#ffe58a'],1,1,{grav:0,life:.5,bright:1});}
  else if(d.slimy){e.vy-=(d.boss?40:40)*dt;if(e.onGround){e.vx*=Math.pow(.001,dt);e.timer-=dt;if(e.timer<=0){const dir=chase?toward:(Math.random()<.5?-1:1);e.face=dir;if(d.boss){const ph=e.phase||0;e.hops=(e.hops||0)+1;if(ph>=2&&e.hops%3===0){e.big=true;e.vx=clamp(dx/1.3,-16,16);e.vy=26;SFX.jump();}else{e.vx=dir*rand(5,8)*(ph?1.25:1);e.vy=rand(14,20);}e.timer=ph?rand(.6,1.1):rand(.9,1.6);}else{e.vx=dir*rand(2.5,4.5);e.vy=rand(10,14);e.timer=rand(.8,2);}}}
      if(d.boss){if(dist>45&&e.onGround){e.x=p.x+rand(-6,6);e.y=Math.min(H-8,p.y+18);e.vy=0;burst(e.x,e.y,d.col,20,5);}if((e.phase||0)>=2&&(e.hops+1)%3===0&&e.onGround&&e.timer<1){e.tele=e.warn=true;if(Math.random()<dt*20)burst(e.x+rand(-2,2),e.y,d.col,1,3,{up:2});}
        if(e.landV<-12){shake(e.big?.6:.3);SFX.stomp();burst(e.x,e.y,['#c9a574','#e9dfc9'],e.big?30:14,e.big?8:5,{up:1});if(e.phase)kingQuake(e);}e.landV=0;}}
  else if(e.type==='zombie'||e.type==='knight'||e.type==='sentinel'){e.vy-=50*dt;const kn=e.type!=='zombie';e.cd=(e.cd||0)-dt;
      if(kn&&e.act==='wind'){e.at-=dt;e.vx*=Math.pow(.001,dt);e.tele=e.warn=true;if(e.at<=0){e.act='dash';e.at=.38;e.vy=4;SFX.swing();}}
      else if(kn&&e.act==='dash'){e.at-=dt;e.vx=e.face*12;if(e.at<=0||e.hitWall){e.act='rest';e.at=.6;}}
      else if(kn&&e.act==='rest'){e.at-=dt;e.vx*=Math.pow(.01,dt);if(e.at<=0){e.act=null;e.cd=rand(1.5,2.6);}}
      else{const sp=e.type==='sentinel'?3.4:kn?2.9:2.3;const dir=(night||kn||dist<10)?toward:-toward;e.face=dir;e.vx+=(dir*sp-e.vx)*Math.min(1,dt*4);if(e.hitWall&&e.onGround)e.vy=13;
        if(kn&&e.cd<=0&&e.onGround&&Math.abs(dx)<7&&Math.abs(dy)<2.5&&!p.dead){e.act='wind';e.at=.5;e.face=toward;}}
      if(!night&&e.type==='zombie'&&dist>35){removeEnemy(e);enemies.splice(i,1);continue;}}
  else if(e.type==='eye'){e.cd=(e.cd??rand(1.5,3))-dt;
      if(e.act==='wind'){e.at-=dt;e.vx*=Math.pow(.02,dt);e.vy*=Math.pow(.02,dt);e.tele=e.warn=true;e.face=toward;if(e.at<=0){e.act='dash';e.at=.55;const l=dist||1;e.vx=dx/l*13;e.vy=dy/l*13;SFX.swing();}}
      else if(e.act==='dash'){e.at-=dt;if(e.at<=0){e.act=null;e.cd=rand(2.5,4.5);}}
      else{const sp=6.5;e.vx+=toward*dt*9;e.vy+=Math.sign(dy)*dt*7+Math.sin(e.t*3)*dt*3;const v=Math.hypot(e.vx,e.vy);if(v>sp){e.vx*=sp/v;e.vy*=sp/v;}e.face=e.vx>0?1:-1;if(!night&&dist>30){e.vy+=dt*20;}
        if(e.cd<=0&&dist<12&&night&&!p.dead){e.act='wind';e.at=.45;}}}
  else if(e.type==='bat'){e.vx+=(toward*2+rand(-1,1)*6)*dt*3;e.vy+=(Math.sign(dy)*2+rand(-1,1)*6)*dt*3;const v=Math.hypot(e.vx,e.vy);if(v>5.5){e.vx*=5.5/v;e.vy*=5.5/v;}e.face=e.vx>0?1:-1;}
  else if(e.type==='wraith'){const l=Math.hypot(dx,dy)||1;e.vx+=(dx/l*3.8-e.vx)*dt*1.5;e.vy+=(dy/l*3.8+Math.sin(e.t*2)*1.5-e.vy)*dt*1.5;e.face=e.vx>0?1:-1;if(!isNight()&&!eclipseOn()){e.vy+=dt*6;}if(Math.random()<dt*6)burst(e.x,e.y+.3,['#5a2a6a','#b06ad0'],1,.5,{grav:-1,life:.6});}
  else if(e.type==='cinderbat'||e.type==='flurry'){const mx=e.type==='cinderbat'?7.5:4.2;e.vx+=(toward*2+rand(-1,1)*6)*dt*3;e.vy+=(Math.sign(dy)*2+rand(-1,1)*6)*dt*3;const v=Math.hypot(e.vx,e.vy);if(v>mx){e.vx*=mx/v;e.vy*=mx/v;}e.face=e.vx>0?1:-1;if(e.type==='cinderbat'&&Math.random()<dt*8)burst(e.x,e.y+.3,['#ff8a3d','#ffd66b'],1,.5,{grav:-3,life:.5,bright:1});}
  else if(e.type==='foldfox'){e.vy-=50*dt;e.cd=(e.cd??1.5)-dt;
    if(e.act==='wind'){e.at-=dt;e.vx*=Math.pow(.001,dt);e.tele=e.warn=true;e.face=toward;if(e.at<=0){e.act=null;e.vx=e.face*10;e.vy=12;e.cd=rand(1.8,2.8);SFX.jump();}}
    else if(e.onGround){e.face=toward;e.vx+=(toward*4-e.vx)*Math.min(1,dt*5);if(e.hitWall)e.vy=13;if(e.cd<=0&&Math.abs(dx)<9&&Math.abs(dy)<3&&!p.dead){e.act='wind';e.at=.38;}}}
  else if(e.type==='ashimp'){e.vy-=50*dt;e.cd=(e.cd??2)-dt;
    if(e.act==='wind'){e.at-=dt;e.vx*=Math.pow(.001,dt);e.tele=e.warn=true;e.face=toward;if(e.at<=0){const l=Math.hypot(dx,dy)||1;fireProj('fireball',e.x+e.face*.4,e.y+1.3,dx/l*11,dy/l*11,d.dmg,{hostile:true});SFX.bow();e.act=null;e.cd=rand(2,3.2);}}
    else{e.face=toward;e.vx+=(toward*2.4-e.vx)*Math.min(1,dt*4);if(e.hitWall&&e.onGround)e.vy=13;if(e.cd<=0&&dist<15&&!p.dead){e.act='wind';e.at=.5;}}}
  else if(e.type==='inksquid'){const wet=TP[tileAt(Math.floor(e.x),Math.floor(e.y+e.h/2))].liq;if(wet){const pw=TP[tileAt(Math.floor(p.x),Math.floor(p.y+.9))].liq||dist<6;const tx=pw?dx:Math.sin(e.t)*3,ty=pw?dy:Math.cos(e.t*1.3)*2,l=Math.hypot(tx,ty)||1;e.vx+=tx/l*dt*14;e.vy+=ty/l*dt*14;const v=Math.hypot(e.vx,e.vy);if(v>6){e.vx*=6/v;e.vy*=6/v;}e.face=e.vx>0?1:-1;}else{e.vy-=40*dt;e.vx*=Math.pow(.2,dt);}}
  else if(e.type==='crane'){const ph=e.phase||0,enr=ph>=1;e.cd=(e.cd??2)-dt;
    if(e.act==='wind'){e.at-=dt;e.tele=e.warn=true;e.vx*=Math.pow(.05,dt);e.vy*=Math.pow(.05,dt);if(e.at<=0){e.act='swoop';e.at=.85;const l=Math.hypot(dx,dy)||1;e.vx=dx/l*(enr?24:20);e.vy=dy/l*(enr?24:20);SFX.swing();}}
    else if(e.act==='swoop'){e.at-=dt;if(e.at<=0){e.act=null;e.cd=rand(1.2,2);}}
    else if(e.act==='storm'){e.at-=dt;e.vx+=((p.x-e.x)*1.5-e.vx*1.2)*dt;e.vy+=((p.y+13-(e.y+e.h/2))*1.5-e.vy*1.2)*dt;e.face=toward;if(e.at>2)e.tele=e.warn=true;e.st2-=dt;if(e.st2<=0){e.st2=.13;fireProj('feather',p.x+rand(-9,9),p.y+15,rand(-1.5,1.5),-15,22,{hostile:true});}if(e.at<=0){e.act=null;e.cd=rand(1.2,2);}}
    else if(e.act==='volley'){e.at-=dt;e.vx*=Math.pow(.2,dt);e.vy*=Math.pow(.2,dt);if(e.at<=0){e.shots--;const base=Math.atan2(dy,dx),n=enr?7:5;for(let k=0;k<n;k++){const a=base+(k-(n-1)/2)*.16;fireProj('feather',e.x,e.y+e.h/2,Math.cos(a)*13,Math.sin(a)*13,24,{hostile:true});}SFX.swing();e.at=.35;if(e.shots<=0){e.act=null;e.cd=rand(1.5,2.5);}}}
    else{const tx=p.x-toward*8+Math.sin(e.t*.7)*4,ty=p.y+7+Math.sin(e.t*1.3)*1.5;e.vx+=((tx-e.x)*2.2-e.vx*1.5)*dt;e.vy+=((ty-(e.y+e.h/2))*2.2-e.vy*1.5)*dt;e.face=toward;
      if(e.cd<=0){const r=Math.random(),sh=ph>=2?.34:0;if(r<sh){e.act='storm';e.at=2.7;e.st2=.8;SFX.swing();toast('The Great Crane beats up a paper storm!');}else if(r<sh+(1-sh)/2){e.act='wind';e.at=enr?.5:.7;}else{e.act='volley';e.shots=3;e.at=.5;}}}
    if(e.act==='volley'&&e.shots===3)e.tele=e.warn=true;}
  else if(e.type==='lev'){e.cd=(e.cd??4)-dt;const ph=e.phase||0,sp=e.act==='lunge'?19+ph*2:e.act==='wind'?3:10+ph*1.5;
    if(e.act==='wind'){e.at-=dt;e.tele=e.warn=true;if(e.at<=0){e.act='lunge';e.at=1;SFX.boom();if(ph>=2)e.segs.forEach((sg,k)=>{if(k%3===1&&!sg.dying){const a=(sg.ang||0)+Math.PI/2*(k%2?1:-1);fireProj('inkglob',sg.x,sg.y+sg.h/2,Math.cos(a)*8,Math.sin(a)*8+3,26,{hostile:true});}});}}
    else if(e.act==='lunge'){e.at-=dt;if(e.at<=0){if(ph>=2&&!e.again){e.again=true;e.act='wind';e.at=.45;}else{e.again=false;e.act=null;e.cd=rand(3.5,5.5)-ph*.6;}}}else if(e.cd<=0){e.act='wind';e.at=.7;}
    if(ph>=1&&!e.act){e.spit=(e.spit??1.5)-dt;if(e.spit<=0){e.spit=ph>=2?1.5:2.3;const a=Math.atan2(p.y+1-(e.y+e.h/2),p.x-e.x),n=ph>=2?3:1;for(let k=0;k<n;k++){const aa=a+(k-(n-1)/2)*.22;fireProj('inkglob',e.x,e.y+e.h/2,Math.cos(aa)*12,Math.sin(aa)*12+2,26,{hostile:true});}SFX.bow();}}
    const want=Math.atan2((p.y+1)-(e.y+e.h/2),p.x-e.x);let cur=e.ang||0,dd=want-cur;while(dd>Math.PI)dd-=Math.PI*2;while(dd<-Math.PI)dd+=Math.PI*2;const turn=e.act==='lunge'?.6:2.4;cur+=clamp(dd,-turn*dt,turn*dt);e.ang=cur;e.vx=Math.cos(cur)*sp;e.vy=Math.sin(cur)*sp;e.face=1;
    let px=e.x,py=e.y+e.h/2;for(const sg of e.segs){if(sg.dying)continue;const sx=sg.x,sy=sg.y+sg.h/2,ddx=px-sx,ddy=py-sy,dl=Math.hypot(ddx,ddy)||1;if(dl>1.25){sg.x=px-ddx/dl*1.25;sg.y=py-ddy/dl*1.25-sg.h/2;}sg.ang=Math.atan2(ddy,ddx);sg.face=1;px=sg.x;py=sg.y+sg.h/2;}
    if(TP[tileAt(Math.floor(e.x),Math.floor(e.y+1))].liq&&Math.random()<dt*10)burst(e.x,e.y+1,['#a894d0','#fbf8f0'],1,1,{grav:-3,life:.5});}
  else if(e.type==='unfolded'){const ph=e.phase||0,enr=ph>=1;e.vy-=48*dt;e.cd=(e.cd??2.5)-dt;
    if(e.act==='wind'){e.at-=dt;e.vx*=Math.pow(.001,dt);e.tele=e.warn=true;e.face=toward;if(e.at<=0){e.act='leap';e.vx=toward*Math.min(12,Math.abs(dx)*1.1+3);e.vy=19;SFX.jump();}}
    else if(e.act==='leap'){if(e.onGround&&e.vy<=0){e.act=null;e.cd=enr?1.6:2.4;shake(.5);SFX.boom();burst(e.x,e.y,['#e9dcc0','#fbf8f0'],30,7,{up:1});if(p.onGround&&Math.abs(dx)<7&&Math.abs(dy)<3)hurtPlayer(d.dmg,e.x,e,d.elem);const n=enr?12:8;for(let k=0;k<n;k++){const a=Math.PI*(k+.5)/n;fireProj('page',e.x,e.y+1,Math.cos(a)*9,Math.sin(a)*9,30,{hostile:true});}}}
    else if(e.act==='fold'){e.at-=dt;e.vx*=Math.pow(.01,dt);e.hp=Math.min(e.max,e.hp+dt*25);if(e.at<=0){e.act=null;e.cd=2;e.folded=false;for(let k=0;k<16;k++){const a=k/16*Math.PI*2;fireProj('page',e.x,e.y+2.3,Math.cos(a)*10,Math.sin(a)*10,30,{hostile:true});}SFX.boom();}}
    else if(e.act==='volley'){e.at-=dt;e.vx*=Math.pow(.01,dt);if(e.at<=0){e.shots--;e.at=.28;const l=Math.hypot(dx,dy)||1;fireProj('page',e.x+e.face,e.y+3.4,dx/l*13,dy/l*13,30,{hostile:true});SFX.swing();if(e.shots<=0){e.act=null;e.cd=enr?1.4:2.2;}}}
    else if(e.act==='shred'){e.at-=dt;e.vx*=Math.pow(.001,dt);e.tele=e.warn=true;if(e.at<=0){const gap=randi(0,4);for(const s of[-1,1])for(let k=0;k<7;k++){if(k===gap||k===gap+1)continue;fireProj('page',p.x+s*16,p.y+.3+k*.85,-s*9,0,30,{hostile:true});}SFX.tear();shake(.3);e.act=null;e.cd=1.8;}}
    else{e.face=toward;e.vx+=(toward*2.6-e.vx)*Math.min(1,dt*3);if(e.hitWall&&e.onGround)e.vy=14;if(e.cd<=0&&e.onGround){const r=Math.random(),sh=ph>=2?.25:0;if(r<sh){e.act='shred';e.at=.9;toast('The Unfolded shreds the page! Find the gap.');}else if(enr&&!e.didFold&&r<sh+.3){e.act='fold';e.at=2.2;e.folded=true;e.didFold=true;setTimeout(()=>{if(e)e.didFold=false;},15000);}else if(r<sh+.6){e.act='wind';e.at=.7;}else{e.act='volley';e.shots=enr?7:5;e.at=.4;e.tele=e.warn=true;}}}
    if(e.folded){e.mesh.scale.set(1.2,.25,1);}}
  else if(e.type==='folio'){const ph=e.phase||0,enr=ph>=1;e.cd=(e.cd??2.5)-dt;const tx=p.x+Math.sin(e.t*.6)*10,ty=p.y+8+Math.sin(e.t*1.1)*2;e.vx+=((tx-e.x)*1.6-e.vx*1.4)*dt;e.vy+=((ty-(e.y+e.h/2))*1.6-e.vy*1.4)*dt;e.face=toward;
    if(Math.random()<dt*14)burst(e.x+rand(-2,2),e.y+e.h,['#ff8a3d','#ffd66b'],1,1,{grav:-4,life:.6,bright:1});
    if(e.act==='wind'){e.at-=dt;e.tele=e.warn=true;if(e.at<=0){const cx=e.x,cy=e.y+e.h/2;
      if(e.next==='pages'){const n=enr?14:10;for(let k=0;k<n;k++){const a=k/n*Math.PI*2+e.t;fireProj('page',cx,cy,Math.cos(a)*8,Math.sin(a)*8,28,{hostile:true});}SFX.swing();if(enr){e.act='ring2';e.at=.45;e.ringA=e.t+Math.PI/n;}else{e.act=null;e.cd=2.4;}}
      else if(e.next==='fire'){e.act='fire';e.shots=enr?7:5;e.at=0;}
      else if(e.next==='rain'){e.act='rain';e.shots=14;e.at=.3;toast('Burning pages rain down!');}
      else{for(let k=0;k<3;k++)spawnEnemy('cinderbat',cx+rand(-2,2),cy+rand(-1,1));SFX.boom();e.act=null;e.cd=3;}}}
    else if(e.act==='ring2'){e.at-=dt;if(e.at<=0){const n=14,cx=e.x,cy=e.y+e.h/2;for(let k=0;k<n;k++){const a=k/n*Math.PI*2+e.ringA;fireProj('page',cx,cy,Math.cos(a)*6.5,Math.sin(a)*6.5,28,{hostile:true});}SFX.swing();e.act=null;e.cd=1.6;}}
    else if(e.act==='rain'){e.at-=dt;if(e.at<=0){e.at=.16;e.shots--;fireProj('fireball',p.x+rand(-9,9),p.y+15,rand(-1,1),-13,32,{hostile:true});if(e.shots<=0){e.act=null;e.cd=1.6;}}}
    else if(e.act==='fire'){e.at-=dt;if(e.at<=0){e.at=.22;e.shots--;const l=Math.hypot(dx,dy)||1;fireProj('fireball',e.x,e.y+e.h/2,dx/l*14,dy/l*14,32,{hostile:true});SFX.bow();if(e.shots<=0){e.act=null;e.cd=enr?1.4:2.2;}}}
    else if(e.cd<=0){e.act='wind';e.at=.55;e.next=pick(ph>=2?['pages','fire','rain','rain','summon']:['pages','fire','fire','summon']);if(e.next==='summon'&&enemies.filter(o=>o.type==='cinderbat'&&!o.dying).length>=6)e.next='fire';}}
  // the Mainspring (dungeons.js) keeps to the clock chamber: it dashes, fires rings and aimed volleys of gears, and at 25% rings the hour with gears falling from the ceiling
  else if(e.type==='mainspring'){const ph=e.phase||0,enr=ph>=1,cb=clockRoom(),cx=e.x,cy=e.y+e.h/2;e.cd=(e.cd??2)-dt;
    if(e.act==='wind'){e.at-=dt;e.tele=e.warn=true;e.vx*=Math.pow(.05,dt);e.vy*=Math.pow(.05,dt);if(e.at<=0){e.act='dash';e.at=.7;const l=dist||1,v=enr?19:16;e.vx=dx/l*v;e.vy=dy/l*v;SFX.swing();}}
    else if(e.act==='dash'){e.at-=dt;if(e.at<=0){e.act=null;e.cd=rand(1,1.8);}}
    else if(e.act==='ring'){e.at-=dt;e.vx*=Math.pow(.1,dt);e.vy*=Math.pow(.1,dt);if(e.shots===(enr?3:2))e.tele=e.warn=true;if(e.at<=0){const n=enr?12:8;e.a0=(e.a0||0)+Math.PI/n;for(let k=0;k<n;k++){const a=e.a0+k/n*Math.PI*2;fireProj('gear',cx,cy,Math.cos(a)*7.5,Math.sin(a)*7.5,26,{hostile:true});}SFX.brk();e.shots--;e.at=.55;if(e.shots<=0){e.act=null;e.cd=rand(1.4,2.2);}}}
    else if(e.act==='tick'){e.at-=dt;e.vx*=Math.pow(.2,dt);e.vy*=Math.pow(.2,dt);if(e.at<=0){const l=dist||1;fireProj('gear',cx,cy,dx/l*12,dy/l*12,26,{hostile:true});tone(1500,1200,.05,'square',.05);e.shots--;e.at=.24;if(e.shots<=0){e.act=null;e.cd=rand(1.2,2);}}}
    else if(e.act==='chime'){e.at-=dt;e.st2-=dt;e.vx*=Math.pow(.2,dt);e.vy*=Math.pow(.2,dt);if(e.at>2.2)e.tele=e.warn=true;if(e.st2<=0&&cb){e.st2=.16;fireProj('gear',rand(cb[0]+.5,cb[2]+.5),cb[3]+.6,rand(-1,1),-11,24,{hostile:true});}if(e.at<=0){e.act=null;e.cd=rand(1.2,1.8);}}
    else{const tx=p.x+Math.sin(e.t*.8)*5,ty=p.y+5+Math.sin(e.t*1.4)*1.2;e.vx+=((tx-e.x)*2-e.vx*1.5)*dt;e.vy+=((ty-cy)*2-e.vy*1.5)*dt;e.face=toward;
      if(e.cd<=0&&!p.dead){const r=Math.random(),sh=ph>=2?.3:0;if(r<sh){e.act='chime';e.at=2.8;e.st2=.9;tone(660,660,.6,'sine',.12);toast('The Mainspring chimes the hour! Gears fall from the ceiling.');}else if(r<sh+(1-sh)*.35){e.act='wind';e.at=enr?.45:.6;}else if(r<sh+(1-sh)*.7){e.act='ring';e.shots=enr?3:2;e.at=.6;}else{e.act='tick';e.shots=enr?6:4;e.at=.5;e.tele=e.warn=true;}}}
    if(cb){const m=e.w/2;if(e.x<cb[0]+m){e.x=cb[0]+m;e.vx=Math.abs(e.vx)*.5;}if(e.x>cb[2]+1-m){e.x=cb[2]+1-m;e.vx=-Math.abs(e.vx)*.5;}if(e.y<cb[1]){e.y=cb[1];e.vy=Math.abs(e.vy)*.5;}if(e.y+e.h>cb[3]+1){e.y=cb[3]+1-e.h;e.vy=-Math.abs(e.vy)*.5;}}}
  else if(e.type==='crumple'){e.vy-=50*dt;if(e.onGround){e.vx=clamp(e.vx+toward*9*dt,-8.5,8.5);if(e.hitWall){e.vy=11;e.vx=-e.hitWall*2;}}e.face=e.vx>=0?1:-1;e.roll=(e.roll||0)-e.vx*dt/.45;}
  else if(e.type==='toadstool'){e.vy-=50*dt;e.cd=(e.cd??rand(1.5,2.5))-dt;e.face=toward;
    if(e.act==='wind'){e.at-=dt;e.vx*=Math.pow(.001,dt);e.tele=e.warn=true;if(e.at<=0){const T=1.1,g=PK.spore.grav,ox=e.x+e.face*.3,oy=e.y+1.1;fireProj('spore',ox,oy,clamp((p.x-ox)/T,-11,11),Math.min(20,((p.y+.9-oy)+.5*g*T*T)/T),edmg(e),{hostile:true});SFX.bow();e.act=null;e.cd=rand(2,3);}}
    else{const want=Math.abs(dx)<6?-toward:Math.abs(dx)>10?toward:0;e.vx+=(want*2.6-e.vx)*Math.min(1,dt*4);if(e.hitWall&&e.onGround)e.vy=12;if(e.cd<=0&&e.onGround&&dist<16&&!p.dead){e.act='wind';e.at=.45;}}}
  else if(e.type==='dunefin'){e.vy-=50*dt;e.act=e.act||'under';const sand=['#e3c77d','#c9a574'];
    if(e.act==='under'){e.burrow=true;e.vx+=(toward*6.5-e.vx)*Math.min(1,dt*3);if(e.hitWall&&e.onGround)e.vy=10;e.face=e.vx>=0?1:-1;if(Math.random()<dt*14)burst(e.x-e.face*.5,e.y+.1,sand,1,1.5,{up:1,grav:8,life:.4});if(Math.abs(dx)<1.4&&Math.abs(dy)<4&&e.onGround&&!p.dead){e.act='rise';e.at=.45;}}
    else if(e.act==='rise'){e.at-=dt;e.vx*=Math.pow(.001,dt);e.tele=e.warn=true;if(Math.random()<dt*30)burst(e.x,e.y+.1,sand,1,2.5,{up:1,grav:8,life:.5});if(e.at<=0){e.act='leap';e.burrow=false;e.vy=17;e.vx=toward*2;e.face=toward;SFX.brk();burst(e.x,e.y,sand,16,5,{up:1});}}
    else if(e.act==='leap'){if(e.onGround&&e.vy<=0){e.act='exposed';e.at=1.4;}}
    else{e.at-=dt;e.vx*=Math.pow(.01,dt);if(e.at<=0){e.act='under';burst(e.x,e.y,sand,10,3,{up:1});}}}
  else if(e.type==='scarab'||e.type==='clockbug'){e.vy-=50*dt;e.cd=(e.cd??rand(1.5,2.5))-dt;
    if(e.act==='wind'){e.at-=dt;e.vx*=Math.pow(.001,dt);e.tele=e.warn=true;e.face=toward;if(e.at<=0){e.act='dash';e.at=.55;SFX.swing();}}
    else if(e.act==='dash'){e.at-=dt;e.vx=e.face*11;if(e.at<=0||e.hitWall){if(e.hitWall){shake(.12);SFX.stomp();}e.act='open';e.at=1.3;}}
    else if(e.act==='open'){e.at-=dt;e.vx*=Math.pow(.01,dt);if(Math.random()<dt*6)burst(e.x,e.y+e.h+.2,['#fff3c0','#ffe58a'],1,1,{grav:0,life:.5,bright:1});if(e.at<=0){e.act=null;e.cd=rand(1.8,2.8);}}
    else{e.face=toward;e.vx+=(toward*1.6-e.vx)*Math.min(1,dt*4);if(e.hitWall&&e.onGround)e.vy=12;if(e.cd<=0&&e.onGround&&Math.abs(dx)<8&&Math.abs(dy)<2.5&&!p.dead){e.act='wind';e.at=.55;}}}
  else if(e.type==='sunkite'||e.type==='skyray'){e.cd=(e.cd??rand(1,2))-dt;
    if(e.act==='wind'){e.at-=dt;e.tele=e.warn=true;e.vx*=Math.pow(.01,dt);e.vy*=Math.pow(.01,dt);if(e.at<=0){e.act='dive';e.at=1;e.vx=clamp(dx*.6,-4,4);e.vy=-22;SFX.swing();}}
    else if(e.act==='dive'){e.at-=dt;if(e.at<=0||e.onGround){e.act='climb';e.at=1.2;}}
    else if(e.act==='climb'){e.at-=dt;e.vx*=Math.pow(.2,dt);e.vy+=(5-e.vy)*dt*3;if(e.at<=0){e.act=null;e.cd=rand(1.6,2.6);}}
    else{const tx=p.x+Math.sin(e.t*.8)*3,ty=p.y+8;e.vx+=((tx-e.x)*1.8-e.vx*1.4)*dt;e.vy+=((ty-(e.y+e.h/2))*1.8-e.vy*1.4)*dt;e.face=e.vx>=0?1:-1;if(e.cd<=0&&Math.abs(dx)<2&&dy<-4&&!p.dead){e.act='wind';e.at=.5;}}}
  else if(e.type==='frostpuff'){e.cd=(e.cd??rand(1,2))-dt;
    if(e.act==='puff'){e.at-=dt;e.tele=e.warn=true;e.vx*=Math.pow(.02,dt);e.vy*=Math.pow(.02,dt);e.inf=Math.min(1,(e.inf||0)+dt*2);if(e.at<=0){const n=e.elite?12:8;for(let k=0;k<n;k++){const a=k/n*Math.PI*2+e.t;fireProj('shard',e.x+Math.cos(a)*.5,e.y+e.h/2+Math.sin(a)*.5,Math.cos(a)*10,Math.sin(a)*10,edmg(e),{hostile:true});}SFX.brk();e.act=null;e.cd=rand(2.6,3.6);}}
    else{e.inf=Math.max(0,(e.inf||0)-dt*1.5);const l=dist||1;e.vx+=(dx/l*2.4-e.vx)*dt*1.2;e.vy+=(dy/l*2.4+Math.sin(e.t*1.7)*1.2-e.vy)*dt*1.2;e.face=toward;if(e.cd<=0&&dist<6&&!p.dead){e.act='puff';e.at=.7;}}}
  else if(e.type==='inkwisp'){e.cd=(e.cd??rand(1.5,2.5))-dt;const inkc=['#3a2a5a','#8a5fc0'];
    if(e.act==='fade'){e.at-=dt;e.tele=true;e.vx*=Math.pow(.01,dt);e.vy*=Math.pow(.01,dt);if(e.at<=0){emit('ink',e.x,e.y+e.h/2,{cols:inkc,n:14,spd:4,grav:0,life:1});const side=Math.random()<.5?-1:1;e.x=clamp(p.x+side*3.2,2,W-2);e.y=p.y+rand(.3,1.8);e.face=-side;emit('ink',e.x,e.y+e.h/2,{cols:inkc,n:14,spd:4,grav:0,life:1});SFX.cast();e.act='aim';e.at=.42;}}
    else if(e.act==='aim'){e.at-=dt;e.tele=e.warn=true;e.face=toward;if(e.at<=0){const l=dist||1;e.vx=dx/l*14;e.vy=dy/l*14;e.act='strike';e.at=.45;SFX.swing();}}
    else if(e.act==='strike'){e.at-=dt;if(e.at<=0){e.act=null;e.cd=rand(2.2,3.4);}}
    else{const l=dist||1,want=dist>7?1:-.4;e.vx+=(dx/l*3*want-e.vx)*dt*1.5;e.vy+=(dy/l*3*want+Math.sin(e.t*2.3)*1.5-e.vy)*dt*1.5;e.face=toward;if(Math.random()<dt*5)burst(e.x,e.y+.2,inkc,1,.5,{grav:-1,life:.5});if(e.cd<=0&&dist<16&&!p.dead){e.act='fade';e.at=.5;}}}
  else if(e.type==='quillfish'){const wet=TP[tileAt(Math.floor(e.x),Math.floor(e.y+e.h/2))].liq;e.cd=(e.cd??1.5)-dt;
    if(wet){e.vx+=(clamp(dx,-1,1)*5-e.vx)*Math.min(1,dt*3);e.vy+=(clamp(dy,-3,3)*1.5+Math.sin(e.t*2)-e.vy)*Math.min(1,dt*2);e.face=e.vx>=0?1:-1;
      if(e.cd<=0&&dy>0&&dist<9&&!p.dead&&!TP[tileAt(Math.floor(e.x),Math.floor(e.y+e.h+.6))].liq){e.vy=17;e.vx=clamp(dx*1.4,-9,9);e.cd=rand(2,3);SFX.jump();burst(e.x,e.y+e.h,['#a894d0','#fbf8f0'],10,4,{up:1});}}
    else{e.vy-=40*dt;if(e.onGround){e.vx*=Math.pow(.05,dt);e.flop=(e.flop??.5)-dt;if(e.flop<=0){e.flop=rand(.5,.9);e.vy=7;e.vx=toward*rand(1.5,3);}}if(Math.abs(e.vx)>.3)e.face=e.vx>0?1:-1;}}
  else if(e.type==='cracker'){e.vy-=50*dt;
    if(e.act==='fuse'){e.at-=dt;e.tele=e.warn=true;e.vx*=Math.pow(.01,dt);if(Math.random()<dt*30)burst(e.x,e.y+e.h+.4,['#ffd66b','#ff8a3d','#fff3c0'],1,2,{grav:-2,life:.35,bright:1});if(e.at<=0){crackerBoom(e);continue;}}
    else{e.face=toward;e.vx+=(toward*4.2-e.vx)*Math.min(1,dt*5);if(e.hitWall&&e.onGround)e.vy=13;if(dist<2.4&&!p.dead){e.act='fuse';e.at=.85;noise(.8,.12,'highpass',5000);}}}
  else if(e.type==='ashspider'){e.act=e.act||'hang';
    if(e.act==='hang'){e.vx=0;e.vy=0;e.hangY=e.hangY??e.y+e.h;if((Math.abs(dx)<2.5&&dy<0&&dy>-14||e.flash>0)&&!p.dead){e.act='drop';SFX.swing();}}
    else if(e.act==='drop'){e.vy-=60*dt;e.vx*=Math.pow(.1,dt);if(e.onGround){e.act='skitter';e.cd=.4;burst(e.x,e.y,['#3a2a24','#ff8a3d'],8,3,{up:1});}}
    else{e.vy-=50*dt;e.cd=(e.cd??.5)-dt;e.face=toward;e.vx+=(toward*5-e.vx)*Math.min(1,dt*6);if(e.hitWall&&e.onGround)e.vy=13;if(e.cd<=0&&e.onGround&&dist<6&&!p.dead){e.vy=11;e.vx=toward*8;e.cd=rand(1.2,2);SFX.jump();}}}
  if(d.slimy&&e.onGround&&e.timer<(d.boss?.6:.28)){e.tele=true;if(d.boss)e.warn=true;}
  const ovx=e.vx,ovy=e.vy,mdt=e.st&&e.st.ink>0?dt*.5:dt,tsp=e.trait?TRAITS[e.trait].spd||1:1;e.vx*=tsp;if(d.noclip){if(!e.parent){e.x+=e.vx*mdt;e.y+=e.vy*mdt;}}else collide(e,mdt);e.vx/=tsp;if(d.fly){if(e.hitWall)e.vx=-ovx*.8;if(e.onGround||e.hitCeil)e.vy=-ovy*.8;}
  if(e.y<-4){removeEnemy(e);enemies.splice(i,1);continue;}
  // contact
  if(!p.dead&&!e.dying&&!e.burrow&&!(e.stun>0)&&!bossHeld(e)&&Math.abs(p.x-e.x)<(p.w+e.w)/2&&p.y<e.y+e.h&&p.y+p.h>e.y){
    const fromAbove=p.vy<0&&p.prevY>=e.y+e.h-.35&&(e.type!=='knight'&&e.type!=='sentinel'||hasBadge('spike'));
    if(fromAbove&&e.hitCD<=0){e.hitCD=.25;const nice=p.jumpAge<.14*niceW();hurtEnemy(e,(nice?20:10)*(hasBadge('stomp')?2:1),p.face,2,nice);p.vy=nice?18:13;p.y=e.y+e.h+.02;SFX.stomp();stat('stomps');if(nice)stat('nices');burst(p.x,p.y,['#fbf8f0','#f1c04f'],8,4);
      if(nice){floatText(e.x,e.y+e.h+.6,'NICE!','nice');SFX.nice();}else{p.stompWin=.14*niceW();p.stompTarget=e;}}
    else if(!fromAbove){const hp0=p.hp;hurtPlayer(edmg(e)*(e.act==='dash'?1.3:1),e.x,e,e.elem||d.elem);if(e.trait==='vampiric'&&p.hp<hp0){const h=Math.round((hp0-p.hp)*1.5);e.hp=Math.min(e.max,e.hp+h);e.hpShow=3;floatText(e.x,e.y+e.h+.3,'+'+h,'weak');burst(e.x,e.y+e.h/2,['#d4483b','#ff9aa8'],8,2,{grav:-2});}}}
  // mesh
  const m=e.mesh;e.rot+=((e.face>0?0:Math.PI)-e.rot)*Math.min(1,dt*14);m.rotation.y=e.rot;
  if(e.rig)foeClip(e);else{let fr=0;if(d.slimy)fr=e.onGround&&e.timer<.25?1:0;else fr=Math.floor(e.t*(d.fly?8:5))%2;e.mesh.material.uniforms.uFrame.value=fr;}
  if(d.fly)m.position.set(e.x,e.y+e.h/2,m.position.z);else m.position.set(e.x,e.y-.1,m.position.z);if(e.tele)m.position.x+=Math.sin(e.t*75)*.05*(d.boss?2.5:1);
  if(!d.fly&&!e.onGround&&d.slimy){const s=clamp(1+e.vy*.02,.85,1.2);m.scale.set(1/s,s,1);}else m.scale.set(1,1,1);
  if(e.folded)m.scale.set(1.2,.25,1);if(d.worm){m.rotation.y=0;const a=e.ang||0;m.rotation.z=a;m.scale.set(1,Math.cos(a)<0?-1:1,1);}
  if(d.center)m.position.y=e.y+e.h/2;
  if(e.type==='crumple')m.rotation.z=(e.roll||0)*e.face;
  else if(e.type==='mainspring')m.rotation.z=Math.sin(e.t*2)*.08;
  else if(e.type==='sunkite'||e.type==='skyray')m.rotation.z=e.act==='dive'?-1.2:Math.sin(e.t*3)*.12;
  else if(e.type==='dunefin'&&e.burrow)m.position.y-=e.sh*.72;
  else if(e.type==='frostpuff'){const k=1+(e.inf||0)*.45;m.scale.set(k,k,1);}
  else if(e.type==='inkwisp'&&e.act==='fade'){const k=Math.max(.05,e.at/.5);m.scale.set(k,k,1);}
  else if((e.type==='scarab'||e.type==='clockbug')&&e.act==='open')m.scale.set(1.08,.8,1);
  else if(e.type==='ashspider'){const hang=e.act==='hang'||e.act==='drop';m.rotation.z=hang?Math.PI:0;if(hang)m.position.y=e.y+e.h+.1;
    if(hang&&!e.thread){e.thread=new THREE.Mesh(threadGeo,new THREE.MeshBasicMaterial({color:0xd8cfc0}));e.thread.renderOrder=2;scene.add(e.thread);}
    if(e.thread){const len=(e.hangY??e.y+e.h)-(e.y+e.h);e.thread.visible=hang&&len>.05;e.thread.position.set(e.x,e.y+e.h,.09);e.thread.scale.y=Math.max(.01,len);}}
  if(e.elite)m.scale.multiplyScalar((traitOf(e)||{}).sz||1.2);
  if(d.boss||e.parent)bossLook(e,m,dt);
  setTint(m.material,e.x,e.y+e.h/2);if(e.inked)m.material.uniforms.uTint.value.multiply(INKTINT);if(e.elite){m.material.uniforms.uTint.value.multiply(ELITE_TINT);if(e.trait)traitFx(e,m,dt);else if(Math.random()<dt*4)burst(e.x+rand(-e.w/2,e.w/2),e.y+rand(0,e.h),['#f1c04f','#fff3c0'],1,.6,{grav:-1,life:.6,bright:1});}if(e.st)statusFx(e,m,dt);m.material.uniforms.uFlash.value=e.flash>0?.8:(e.warn?.15+.12*Math.sin(e.t*28):0);teleOutline(m,SET.tele&&(e.tele||e.warn)&&!e.burrow,e.t);if(e.rig)rigUpdate(e.rig,dt);updateEnemyFx(e,dt);}
  if(boss){$('boss').querySelector('i').style.width=clamp(boss.hp/boss.max*100,0,100)+'%';}}
// rigged foes (rig.js FOERIG) pick a clip from what they are doing: humans walk their gait and wince when hit, slimes crouch
// before a hop, fliers flap, and the floating eye's iris follows you
function foeClip(e){const R=e.rig,p=player;
  if(R.k==='human'){const H=HUMANFOE[e.type]||{},walk=Math.abs(e.vx)>.3;rigPlay(R,walk?H.clip||'march':'idle',{sp:clamp(Math.abs(e.vx)/2.2,.6,1.8)});
    if(H.arm!=null)rigSet(R,'armA',{r:H.arm});if(e.type==='zombie'&&!walk){rigSet(R,'armA',{r:-1.45});rigSet(R,'armB',{r:-1.3});}if(e.flash>0||e.stun>0)rigSet(R,'head',{sw:'hurt',snap:1});}
  else if(R.k==='slime'||R.k==='king')rigPlay(R,e.onGround&&e.timer<.25?'crouch':'idle');
  else rigPlay(R,'fly',{sp:e.stun>0?.3:1});
  if(R.k==='eye'){const dx=p.x-e.x,dy=p.y+1-(e.y+e.h/2),l=Math.hypot(dx,dy)||1;rigSet(R,'iris',{x:dx/l*5*e.face,y:-dy/l*5});}}
export function updateNPC(dt){for(const n of npcs){n.t+=dt;n.timer-=dt;const h=n.home||n.roam;if(n.timer<=0){n.timer=rand(1.5,4);const r=Math.random();n.want=r<.45?0:(r<.72?-1:1);}
  const near=Math.abs(player.x-n.x)<3&&Math.abs(player.y-n.y)<2.5&&!player.dead;
  let want=near?0:(n.want||0);if(near)n.face=player.x>n.x?1:-1;if(h){if(n.x<h.minX+.7)want=1;if(n.x>h.maxX+.3)want=-1;}n.vx=want*1.6;if(want)n.face=want;n.vy-=50*dt;collide(n,dt);
  n.rot+=((n.face>0?0:Math.PI)-n.rot)*Math.min(1,dt*14);n.mesh.rotation.y=n.rot;n.mesh.position.set(n.x,n.y-.08,n.mesh.position.z);setTint(n.mesh.material,n.x,n.y+1);
  // townsfolk amble about, and stand holding their tool (FOLK arm) when they stop
  const R=n.rig,F=FOLK[n.type];rigPlay(R,want?'amble':'idle');if(!want){rigSet(R,'armA',{r:F.arm});if(F.armB!=null)rigSet(R,'armB',{r:F.armB});}rigUpdate(R,dt);
  if(n.y<-3&&h){n.x=(h.minX+h.maxX)/2+.5;n.y=h.y;}
  n.bubT-=dt;if(near&&n.bubT<=0&&!n.bub){n.bub=document.createElement('div');n.bub.className='bubble';n.bub.textContent=plain(npcLine(n.type,true));$('nums').appendChild(n.bub);n.bubLife=3.2;n.bubT=rand(9,16);}
  if(n.bub){n.bubLife-=dt;pv.set(n.x,n.y+2.5,.5).project(camera);n.bub.style.left=upx((pv.x+1)/2*innerWidth);n.bub.style.top=upx((1-pv.y)/2*innerHeight);if(n.bubLife<=0){n.bub.remove();n.bub=null;}}}}
export function updatePickups(dt){const p=player;for(let i=pickups.length-1;i>=0;i--){const k=pickups[i];k.age+=dt;k.t-=dt;const dx=p.x-k.x,dy=(p.y+.9)-k.y,d=Math.hypot(dx,dy);
  if(k.t<=0&&d<(hasAcc('magnet')?9:3.2)&&!p.dead){k.vx+=dx/d*dt*60;k.vy+=dy/d*dt*60;const v=Math.hypot(k.vx,k.vy);if(v>12){k.vx*=12/v;k.vy*=12/v;}k.x+=k.vx*dt;k.y+=k.vy*dt;
    if(d<.7){const left=addItem(k.id,k.n);if(left<k.n){if(k.id==='fstar')stat('fstars',k.n-left);if(k.id==='coin')SFX.coin();else SFX.pick();if(k.id!=='coin'&&k.n-left>0)floatText(k.x,k.y+.6,`${ITEMS[k.id].name}${k.n-left>1?' ×'+(k.n-left):''}`,'heal');else if(k.id==='coin')floatText(k.x,k.y+.6,'+'+k.n,'crit');}
      if(left){k.n=left;k.t=1.5;}else{scene.remove(k.mesh);k.mesh.geometry.dispose();k.mesh.material.dispose();pickups.splice(i,1);continue;}}}
  else{k.vy-=30*dt;k.vx*=Math.pow(.1,dt);collide(k,dt);}
  if(k.age>300){scene.remove(k.mesh);pickups.splice(i,1);continue;}
  k.mesh.position.set(k.x,k.y+.3+Math.sin(k.age*4)*.06,.22);k.mesh.rotation.y=Math.sin(k.age*2)*.5;setTint(k.mesh.material,k.x,k.y+.3);}}
// ricochet arrows glance toward the nearest foe they haven't hit yet, aiming a little high for the drop
function ricochet(q){let n=null,bd=9;for(const o of enemies)if(!o.dying&&!q.hit.has(o)){const d=Math.hypot(o.x-q.x,o.y+o.h/2-q.y);if(d<bd){bd=d;n=o;}}if(!n)return false;
  const sp=Math.max(18,Math.hypot(q.vx,q.vy)),a=Math.atan2(n.y+n.h/2-q.y,n.x-q.x);q.vx=Math.cos(a)*sp;q.vy=Math.sin(a)*sp+(q.k.grav||0)*bd/sp*.5;burst(q.x,q.y,['#bfe3f7','#fbf8f0'],6,3,{grav:0,life:.3});tone(1500,2100,.06,'triangle',.05);return true;}
export function updateProjs(dt){for(let i=projs.length-1;i>=0;i--){const q=projs[i],k=q.k;q.t+=dt;
  if(k.home){const e=nearestEnemy(q.x,q.y,12);if(e){const want=Math.atan2(e.y+e.h/2-q.y,e.x-q.x),cur=Math.atan2(q.vy,q.vx);let d=want-cur;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;const na=cur+clamp(d,-k.home*dt,k.home*dt),sp=Math.hypot(q.vx,q.vy);q.vx=Math.cos(na)*sp;q.vy=Math.sin(na)*sp;}}
  q.vy-=(k.grav||0)*dt;const steps=Math.max(1,Math.ceil(Math.hypot(q.vx,q.vy)*dt/.3));let done=false;
  for(let st=0;st<steps&&!done;st++){const ox=q.x,oy=q.y;q.x+=q.vx*dt/steps;q.y+=q.vy*dt/steps;
    if(q.hostile){const pl=player;if(!pl.dead&&Math.abs(q.x-pl.x)<pl.w/2+.2&&q.y>pl.y&&q.y<pl.y+pl.h){if(hurtPlayer(q.dmg*(hasBuff('fire')&&q.kind==='fireball'?.5:1),q.x,q,q.elem)!=='parry'){done=true;break;}}}
    else for(const e of enemies){if(e.dying||q.hit.has(e))continue;if(Math.abs(q.x-e.x)<e.w/2+.3&&q.y>e.y-.25&&q.y<e.y+e.h+.25){q.hit.add(e);hurtEnemy(e,q.dmg,q.vx>0?1:-1,k.kb??3,!!q.crit,q.elem);if(q.src==='ranged'||q.src==='magic')stat('rangedhits');if(k.splat)burst(q.x,q.y,k.splat,8,4);if(q.ric>0&&ricochet(q)){q.ric--;break;}if(q.pierce--<=0){done=true;break;}}}
    if(done)break;
    const clip=!k.noclipAll&&!(q.noclipAbove!=null&&q.y>q.noclipAbove);
    if(clip&&(q.x<1||q.x>W-1||isSolid(Math.floor(q.x),Math.floor(q.y)))){
      if(q.bounce>0){q.bounce--;const hy=isSolid(Math.floor(ox),Math.floor(q.y)),hx=isSolid(Math.floor(q.x),Math.floor(oy));q.x=ox;q.y=oy;if(hy||!hx)q.vy*=-.72;if(hx||!hy)q.vx*=-.72;if(k.splat)burst(q.x,q.y,k.splat,4,2);SFX.stomp();}
      else{done=true;if(k.land){dropItem(k.land,1,ox,oy+.2,0,3);SFX.brk();shake(.08);}else if(k.drop&&Math.random()<k.drop)dropItem(k.dropId,1,ox,oy+.2,0,2);if(k.splat)burst(ox,oy,k.splat,10,4);}}}
  if(k.trail&&Math.random()<(k.trailRate??.6))burst(q.x,q.y,k.trail,1,.6,{grav:k.grav?2:0,life:.5,up:0,bright:k.glow});if(q.crit&&Math.random()<.8)burst(q.x,q.y,['#fff3c0','#f1c04f'],1,.5,{grav:0,life:.35,up:0,bright:1});
  q.m.rotation.z=k.rot==='vel'?Math.atan2(q.vy,q.vx)-(k.rotOff||0):q.m.rotation.z-dt*(k.spin||0);q.m.position.set(q.x,q.y,.25);
  if(k.glow)q.m.material.uniforms.uTint.value.set(1.15,1.1,1.05);else setTint(q.m.material,q.x,q.y);
  if(done&&k.boom&&!q.hostile){for(const e of enemies)if(!e.dying&&!q.hit.has(e)&&Math.hypot(e.x-q.x,e.y+e.h/2-q.y)<k.boom)hurtEnemy(e,q.dmg*.7,e.x>q.x?1:-1,5,false,q.elem);burst(q.x,q.y,k.splat,26,7,{bright:1});SFX.boom();shake(.15);}
  if(done||q.t>q.life){scene.remove(q.m);q.m.geometry.dispose();q.m.material.dispose();projs.splice(i,1);}}}
// Imported bindings are read-only, so other modules assign these through setters.
export function setShakeT(v){return shakeT=v;}
export function setHitStop(v){return hitStop=v;}
export function setAngler(v){return angler=v;}
export function setWeather(v){return weather=v;}
export function setWeatherT(v){return weatherT=v;}
export function setWind(v){return wind=v;}
export function setInkMoon(v){return inkMoon=v;}
export function setNightsSeen(v){return nightsSeen=v;}
