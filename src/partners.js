// Partners and their behaviour.
import {
  $,BADGES,breakTile,burst,canvasTex,circ,enemies,fi,fireProj,hasBadge,hasNPC,heal,hurtEnemy,INK,ink,
  ITEMS,KEYNAME,makeSheet,mk,mouse,nearestEnemy,openSide,pickups,player,poly,portraitCache,quests,rr,
  scene,SET,setInvDirty,setTint,SFX,SHEETS,spriteMesh,stat,state,T,tileAt,toast,TP,
} from './game.js';

// ================= partners =================
export const PARTNERS={
  lumi:{name:'Lumi',desc:'A lantern spirit. Lights the way.',move:'Flare',moveDesc:'Stuns nearby enemies.',cd:14,fly:1,how:'Joins when the Guide moves in.'},
  snip:{name:'Snip',desc:'A scissor crab. Snips nearby enemies.',move:'Snip Spin',moveDesc:'Whirls around you, cutting everything close.',cd:10,how:'Joins after you defeat the King Slime.'},
  smudge:{name:'Smudge',desc:'An ink puppy. Fetches items from far away.',move:'Dig',moveDesc:'Tunnels through blocks where you aim.',cd:6,how:'Joins after you defeat the Great Crane.'},
  ember:{name:'Ember',desc:'An origami firebird. Shoots at enemies.',move:'Rekindle',moveDesc:'Heals half your life.',cd:45,fly:1,how:'Joins after you defeat the Inkwell Leviathan.'},
};
export const PORDER=['lumi','snip','smudge','ember'];
export const pt={x:0,y:0,rot:0,t:0,cd:0,act:null,at:0,target:null,atkT:0,mesh:null,type:null,hudKey:''};
function drawPartner(t,type,f){const bob=f?2:0;
  if(type==='lumi'){t.beginPath();t.moveTo(48,8);t.lineTo(48,18);ink(t,2,'#6b4430');rr(t,26,18+bob,44,52,20);fi(t,'#f7d046');for(const x of[36,48,60]){t.beginPath();t.moveTo(x,20+bob);t.quadraticCurveTo(x+(x-48)*.4,44+bob,x,68+bob);ink(t,1.5,'rgba(160,100,20,.5)');}rr(t,34,14+bob,28,7,3);fi(t,'#b33a2f',2);rr(t,34,67+bob,28,7,3);fi(t,'#b33a2f',2);circ(t,43,42+bob,3);t.fillStyle=INK;t.fill();circ(t,55,42+bob,3);t.fill();t.beginPath();t.arc(49,48+bob,4,.3,2.8);ink(t,1.8);circ(t,38,50+bob,3);t.fillStyle='rgba(230,110,110,.45)';t.fill();circ(t,60,50+bob,3);t.fill();}
  else if(type==='snip'){for(const s of[-1,1]){t.beginPath();t.moveTo(48+s*14,62);t.lineTo(48+s*24,78-bob);ink(t,4,INK);}t.beginPath();t.ellipse(48,56,24,15,0,0,6.28);fi(t,'#d4483b');t.fillStyle='rgba(255,255,255,.3)';t.fillRect(34,46,10,4);
    t.save();t.translate(76,40-bob);t.rotate(f?-.3:.1);poly(t,[0,0,18,-8,6,2]);fi(t,'#c9ccd4',2);poly(t,[0,0,18,6,6,-2]);fi(t,'#a9adb8',2);circ(t,0,0,4);fi(t,'#d4483b',2);t.restore();t.beginPath();t.moveTo(66,50);t.lineTo(76,40-bob);ink(t,4,'#d4483b');
    for(const x of[42,54]){t.beginPath();t.moveTo(x,44);t.lineTo(x,34);ink(t,2);circ(t,x,32,4.5);fi(t,'#fbf8f0',2);circ(t,x+1,32,2);t.fillStyle=INK;t.fill();}}
  else if(type==='smudge'){poly(t,[22,40,28,24,36,40]);fi(t,'#3a2a5a',2);t.beginPath();t.moveTo(20,60);t.quadraticCurveTo(8,50-bob*2,12,40);ink(t,5,'#3a2a5a');for(const x of[34,46,58,68]){rr(t,x-4,64,8,14-(x%2?bob:0),3);fi(t,'#3a2a5a',2);}
    t.beginPath();t.ellipse(46,56,26,16,0,0,6.28);fi(t,'#3a2a5a');circ(t,70,44,15);fi(t,'#3a2a5a');poly(t,[62,32,58,16,70,30]);fi(t,'#4a3570',2);circ(t,74,42,5);fi(t,'#fbf8f0',1.5);circ(t,75,42,2.4);t.fillStyle=INK;t.fill();circ(t,84,48,3);t.fillStyle='#e8636a';t.fill();circ(t,40,52,6);t.fillStyle='rgba(160,130,220,.35)';t.fill();}
  else{t.beginPath();t.moveTo(18,50);t.quadraticCurveTo(6,40+bob*3,4,58);t.quadraticCurveTo(12,62,24,58);t.closePath();fi(t,'#ff7a2d',2);poly(t,[22,52,50,38,76,44,56,62,30,64]);fi(t,'#e0823d');poly(t,[36,50,52,f?16:30,60,50]);fi(t,'#ffb45a',2);poly(t,[70,42,86,46,72,50]);fi(t,'#f1c04f',2);circ(t,68,44,2.5);t.fillStyle=INK;t.fill();
    t.beginPath();t.moveTo(46,34);t.quadraticCurveTo(50,22,56,28);t.fillStyle='#ffd66b';t.fill();}}
export function buildPartnerSheets(){for(const k of PORDER){SHEETS['p_'+k]=makeSheet(2,96,96,(t,f)=>drawPartner(t,k,f));SHEETS['p_'+k+'T']=canvasTex(SHEETS['p_'+k]);}}
export function pPortrait(k){if(portraitCache['p_'+k])return portraitCache['p_'+k];return portraitCache['p_'+k]=SHEETS['p_'+k].toDataURL?(()=>{const c=mk(96,96);c.getContext('2d').drawImage(SHEETS['p_'+k],0,0,96,96,0,0,96,96);return c.toDataURL();})():'';}
function unlockPartner(k,quiet){const p=player;if(p.partners.includes(k))return;p.partners.push(k);if(!p.partner)setPartner(k);if(!quiet){toast(`${PARTNERS[k].name} joined your party! Press Q to switch partners and R for ${PARTNERS[k].move}.`,'gold');SFX.nice();stat('partners');}}
export function syncPartners(quiet){if(hasNPC('guide'))unlockPartner('lumi',quiet);if(quests.king)unlockPartner('snip',quiet);if(quests.crane)unlockPartner('smudge',quiet);if(quests.lev)unlockPartner('ember',quiet);}
export function setPartner(k){player.partner=k;pt.type=null;pt.cd=0;pt.act=null;setInvDirty(true);}
export function cyclePartner(){const p=player;if(state!=='play')return;if(!p.partners.length){toast('No partners yet. Your first one joins when the Guide moves in.');return;}const i=p.partners.indexOf(p.partner);const k=p.partners[(i+1)%p.partners.length];setPartner(k);toast(`${PARTNERS[k].name} is now with you.`);SFX.pick();burst(player.x-player.face,player.y+1.2,['#fbf8f0','#f1c04f'],10,3,{grav:0});}
function bestPick(){let b=1;for(const s of player.inv)if(s&&ITEMS[s.id].pick)b=Math.max(b,ITEMS[s.id].pick);return b;}
export function partnerAbility(){const p=player,k=p.partner;if(state!=='play'||p.dead)return;if(!k){toast('No partner with you yet.');return;}if(pt.cd>0){toast(`${PARTNERS[k].move} is recharging (${Math.ceil(pt.cd)}s).`);return;}
  const bosses=['king','crane','lev','folio'].filter(q=>quests[q]).length;pt.cd=PARTNERS[k].cd*(hasBadge('quick')?.7:1);stat('pmoves');
  if(k==='lumi'){burst(pt.x,pt.y,['#fff3c0','#ffe58a','#fbf8f0'],40,9,{grav:0,life:.7,bright:1});SFX.nice();for(const e of enemies){if(e.dying)continue;if(Math.hypot(e.x-pt.x,e.y+e.h/2-pt.y)<9){e.stun=e.d.boss?.7:2.2;hurtEnemy(e,10+bosses*6,e.x>pt.x?1:-1,2);}}}
  else if(k==='snip'){pt.act='spin';pt.at=3;pt.hitT=0;SFX.swing();}
  else if(k==='smudge'){const a=Math.atan2(mouse.wy-(p.y+.9),mouse.wx-p.x),pw=bestPick();let n=0;for(let s=1;s<=6;s++){const cx=Math.floor(p.x+Math.cos(a)*s),cy=Math.floor(p.y+.9+Math.sin(a)*s);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const x=cx+dx,y=cy+dy,t=tileAt(x,y);if(t===T.AIR||TP[t].liq||t===T.CHEST||t===T.DOOR||t===T.BED||!TP[t].solid&&t!==T.TUFT&&t!==T.FLOWER&&t!==T.FLOWER2&&t!==T.BLOOM)continue;if(TP[t].pick>pw)continue;if(breakTile(x,y)){n++;stat('mined');}}}
    pt.act='dig';pt.at=.5;pt.digA=a;burst(p.x+Math.cos(a)*2,p.y+1+Math.sin(a)*2,['#3a2a5a','#8a78b0'],20,6);if(!n){toast('Nothing here Smudge can dig.');pt.cd=1;}}
  else if(k==='ember'){heal(Math.round(p.max*.5));burst(p.x,p.y+1,['#ff7a2d','#ffd66b','#fbf8f0'],30,6,{grav:-2,bright:1});SFX.potion();}
}
export function updatePartner(dt){const p=player,k=p.partner;
  if(!k||p.dead||state==='title'){if(pt.mesh)pt.mesh.visible=false;$('partnerHud').hidden=true;return;}
  if(pt.type!==k){if(pt.mesh){scene.remove(pt.mesh);pt.mesh.material.dispose();}pt.mesh=spriteMesh(SHEETS['p_'+k+'T'],2,1.3,1.3,false);pt.mesh.position.z=.16;pt.type=k;pt.x=p.x-p.face;pt.y=p.y+1;pt.cd=Math.min(pt.cd,PARTNERS[k].cd);pt.hudKey='';}
  pt.t+=dt;pt.cd=Math.max(0,pt.cd-dt);const def=PARTNERS[k],bosses=['king','crane','lev','folio'].filter(q=>quests[q]).length;
  let tx=p.x-p.face*1.3,ty=p.y+(def.fly?1.9+Math.sin(pt.t*2.5)*.25:.62);
  if(k==='snip'){pt.atkT-=dt;if(pt.act==='spin'){pt.at-=dt;pt.hitT-=dt;const a=pt.t*9;tx=p.x+Math.cos(a)*1.8;ty=p.y+1+Math.sin(a)*1.4;if(pt.hitT<=0){pt.hitT=.25;for(const e of enemies)if(!e.dying&&Math.hypot(e.x-p.x,e.y+e.h/2-p.y-1)<2.8)hurtEnemy(e,10+bosses*5,e.x>p.x?1:-1,3);}if(Math.random()<dt*20)burst(pt.x,pt.y,['#fbf8f0','#d4483b'],1,2,{grav:0,life:.3});if(pt.at<=0)pt.act=null;}
    else if(pt.target&&!pt.target.dying&&pt.atkT>0){tx=pt.target.x;ty=pt.target.y+pt.target.h/2;if(Math.hypot(pt.x-tx,pt.y-ty)<.8&&!pt.hit){pt.hit=true;hurtEnemy(pt.target,8+bosses*5,pt.x<tx?1:-1,3);SFX.swing();}}
    else if(pt.atkT<=-.6){pt.target=null;pt.hit=false;let best=null,bd=5;for(const e of enemies){if(e.dying)continue;const d=Math.hypot(e.x-p.x,e.y+e.h/2-p.y-1);if(d<bd){bd=d;best=e;}}if(best){pt.target=best;pt.atkT=.45;pt.hit=false;}}}
  if(k==='ember'){pt.atkT-=dt;if(pt.atkT<=0){pt.atkT=1.4;const e=nearestEnemy(pt.x,pt.y,10);if(e){const dx=e.x-pt.x,dy=e.y+e.h/2-pt.y,l=Math.hypot(dx,dy)||1;fireProj('fireball',pt.x,pt.y,dx/l*15,dy/l*15,12+bosses*6,{src:'magic'});}}}
  if(k==='smudge'){for(const q of pickups)if(q.t<=0&&Math.hypot(q.x-p.x,q.y-p.y)<9){const dx=p.x-q.x,dy=p.y+.9-q.y,l=Math.hypot(dx,dy)||1;q.x+=dx/l*dt*9;q.y+=dy/l*dt*9;}if(pt.act==='dig'){pt.at-=dt;tx=p.x+Math.cos(pt.digA)*2;ty=p.y+1+Math.sin(pt.digA)*2;if(pt.at<=0)pt.act=null;}}
  const sp=(k==='snip'&&(pt.act||pt.atkT>0))?18:7;pt.x+=(tx-pt.x)*Math.min(1,dt*sp);pt.y+=(ty-pt.y)*Math.min(1,dt*sp);
  const face=pt.act==='spin'?(Math.sin(pt.t*9)>0?1:-1):(Math.abs(tx-pt.x)>.2?(tx>pt.x?1:-1):p.face);pt.rot+=((face>0?0:Math.PI)-pt.rot)*Math.min(1,dt*14);
  const m=pt.mesh;m.visible=true;m.rotation.y=pt.rot;const moving=Math.abs(tx-pt.x)>.3;const hop=!def.fly&&moving?Math.abs(Math.sin(pt.t*12))*.25:0;m.position.set(pt.x,pt.y+hop,.16);m.material.uniforms.uFrame.value=(def.fly?Math.floor(pt.t*4):moving?Math.floor(pt.t*8):Math.floor(pt.t*1.5))%2;
  if(k==='lumi'||k==='ember')m.material.uniforms.uTint.value.set(1.1,1.08,1.02);else setTint(m.material,pt.x,pt.y);
  const hk=k+':'+Math.ceil(pt.cd);if(hk!==pt.hudKey){pt.hudKey=hk;const H=$('partnerHud');H.hidden=false;H.innerHTML=`<img src="${pPortrait(k)}" alt=""><div><b>${def.name}</b><span>${KEYNAME(SET.bind.ability)}: ${def.move} · ${pt.cd>0?Math.ceil(pt.cd)+'s':'ready'}</span><i><u style="width:${100*(1-pt.cd/(def.cd*(hasBadge('quick')?.7:1)))}%"></u></i></div>`;}}
export const bpMax=()=>3+['king','crane','lev','folio'].filter(q=>quests[q]).length*3+(player.bpUps||0);
export const bpUsed=()=>player.badgesOn.reduce((a,k)=>a+BADGES[k][1],0);
$('partyBtn').addEventListener('click',()=>openSide('party',null,null,'Party'));
$('bestBtn').addEventListener('click',()=>openSide('bestiary',null,null,'Bestiary'));
