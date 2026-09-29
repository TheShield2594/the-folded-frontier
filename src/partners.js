// Partners and their behaviour.
import {
  $,BADGES,breakTile,burst,canvasTex,circ,enemies,fi,fireProj,hasBadge,hasNPC,heal,hurtEnemy,INK,ink,
  ITEMS,KEYNAME,makeSheet,mk,mouse,nearestEnemy,pickups,player,poly,portraitCache,quests,rr,
  scene,SET,setInvDirty,setTint,SFX,SHEETS,spriteMesh,stat,state,T,tileAt,toast,TP,partnerSpeaker,say,
  chapterCard,moveName,palUp,playerSpeaker,renderQuests,
  playerCheer,defRig,loopClip,still,RIGS,rigPic,makeRig,rigFree,rigPlay,rigUpdate,
} from './game.js';

// ================= partners =================
export const PARTNERS={
  lumi:{name:'Lumi',desc:'A lantern spirit. Lights the way.',move:'Flare',moveDesc:'Stuns nearby enemies.',cd:14,fly:1,how:'Joins when the Guide moves in.',
    hi:['{surprised}Oh! You can *see* me?','{happy}I am Lumi. I will keep the dark ~folded away~ for you.'],
    re:'{happy}I can see you just fine. Stick with me, Lumi.'},
  snip:{name:'Snip',desc:'A scissor crab. Snips nearby enemies.',move:'Snip Spin',moveDesc:'Whirls around you, cutting everything close.',cd:10,how:'Joins after you defeat the King Slime.',
    hi:['{angry}Snip snip! That jelly king kept me in a *jar* for ages.','{happy}I owe you one. Point me at something and I will *snip* it.'],
    re:'{surprised}A crab with a grudge? {happy}Welcome aboard!'},
  smudge:{name:'Smudge',desc:'An ink puppy. Fetches items from far away.',move:'Dig',moveDesc:'Tunnels through blocks where you aim.',cd:6,how:'Joins after you defeat the Great Crane.',
    hi:['{sad}Arf... the big bird scared off everyone.','{happy}Can I come with you? I am *very* good at ~digging~!'],
    re:'{happy}Of course you can! Every frontier needs a *digger.*'},
  ember:{name:'Ember',desc:'An origami firebird. Shoots at enemies.',move:'Rekindle',moveDesc:'Heals half your life.',cd:45,fly:1,how:'Joins after you defeat the Inkwell Leviathan.',
    hi:['{surprised}The ink is gone and I am *still lit!*','{happy}Keep me close. When you crumple, I will ~rekindle~ you.'],
    re:'{surprised}A firebird! {happy}Stay close. I could use the warmth.'},
};
export const PORDER=['lumi','snip','smudge','ember'];
// cheer: seconds of celebration hop left; idle: seconds the player has stood still (idle animations after 5)
export const pt={x:0,y:0,rot:0,t:0,cd:0,act:null,at:0,target:null,atkT:0,mesh:null,type:null,hudKey:'',cheer:0,idle:0,bub:null,bubLife:0};
export function partnerCheer(t=1.6){pt.cheer=Math.max(pt.cheer,t);pt.cheerMax=pt.cheer;}
// Partners are paper rigs (rig.js), 96px frames shown 1.3 units wide around their centre. Each has idle and move clips;
// Snip's scissor blades are two pieces that snip, Smudge wags, the fliers bob and flap.
const PS=1.3/96;
defRig('p_lumi',{w:96,h:96,oy:48,s:PS,parts:[{n:'root',at:[48,9]},
  {n:'string',at:[48,9],up:'root',wob:0,paint:t=>{t.beginPath();t.moveTo(48,8);t.lineTo(48,18);ink(t,2,'#6b4430');}},
  {n:'body',at:[48,18],up:'root',wob:.01,paint:t=>{rr(t,26,18,44,52,20);fi(t,'#f7d046');for(const x of[36,48,60]){t.beginPath();t.moveTo(x,20);t.quadraticCurveTo(x+(x-48)*.4,44,x,68);ink(t,1.5,'rgba(160,100,20,.5)');}}},
  {n:'capT',at:[48,17],up:'body',paint:t=>{rr(t,34,14,28,7,3);fi(t,'#b33a2f',2);}},
  {n:'capB',at:[48,70],up:'body',paint:t=>{rr(t,34,67,28,7,3);fi(t,'#b33a2f',2);}},
  {n:'face',at:[49,46],up:'body',wob:0,v:['','blink'],paint:(t,s,v)=>{for(const x of[43,55]){if(v){t.beginPath();t.moveTo(x-3,42);t.lineTo(x+3,42);ink(t,2);}else{circ(t,x,42,3);t.fillStyle=INK;t.fill();}}
    t.beginPath();t.arc(49,48,4,.3,2.8);ink(t,1.8);circ(t,38,50,3);t.fillStyle='rgba(230,110,110,.45)';t.fill();circ(t,60,50,3);t.fill();}}],
  clips:{idle:loopClip(2.4,[[0,{root:{r:.06},body:{y:0},face:{sw:''}}],[.6,{body:{y:2}}],[1.2,{root:{r:-.06},body:{y:0}}],[1.8,{body:{y:2}}],[2.05,{face:{sw:'blink'}}],[2.17,{face:{sw:''}}]],'io',.2)}});
RIGS.p_lumi.clips.fly=RIGS.p_lumi.clips.idle;
defRig('p_snip',{w:96,h:96,oy:48,s:PS,parts:[{n:'root',at:[48,62]},
  ...[-1,1].map(s2=>({n:s2<0?'legB':'legA',at:[48+s2*14,62],up:'root',paint:t=>{t.beginPath();t.moveTo(48+s2*14,62);t.lineTo(48+s2*24,78);ink(t,4,INK);}})),
  {n:'body',at:[48,62],up:'root',wob:.01,paint:t=>{t.beginPath();t.ellipse(48,56,24,15,0,0,6.28);fi(t,'#d4483b');t.fillStyle='rgba(255,255,255,.3)';t.fillRect(34,46,10,4);}},
  {n:'eyes',at:[48,44],up:'body',v:['','blink'],paint:(t,s,v)=>{for(const x of[42,54]){t.beginPath();t.moveTo(x,44);t.lineTo(x,34);ink(t,2);circ(t,x,32,4.5);fi(t,'#fbf8f0',2);if(v){t.beginPath();t.moveTo(x-3,32);t.lineTo(x+3,32);ink(t,1.6);}else{circ(t,x+1,32,2);t.fillStyle=INK;t.fill();}}}},
  {n:'arm',at:[66,50],up:'body',paint:t=>{t.beginPath();t.moveTo(66,50);t.lineTo(76,40);ink(t,4,'#d4483b');}},
  {n:'bladeB',at:[76,40],up:'arm',loc:1,wob:0,paint:t=>{poly(t,[0,0,18,6,6,-2]);fi(t,'#a9adb8',2);}},
  {n:'bladeA',at:[76,40],up:'arm',loc:1,wob:0,paint:t=>{poly(t,[0,0,18,-8,6,2]);fi(t,'#c9ccd4',2);circ(t,0,0,4);fi(t,'#d4483b',2);}}],
  clips:{idle:loopClip(3,[[0,{arm:{r:0},bladeA:{r:.05},bladeB:{r:-.05},eyes:{sw:''}}],[1.4,{arm:{r:-.08}}],[2.4,{bladeA:{r:.05},bladeB:{r:-.05}}],[2.5,{bladeA:{r:-.3},bladeB:{r:.3},eyes:{sw:'blink'}}],[2.6,{bladeA:{r:.05},bladeB:{r:-.05},eyes:{sw:''}}]],'io',.15),
    walk:loopClip(.25,[[0,{legA:{r:-.35},legB:{r:.35},body:{y:0},arm:{r:-.1}}],[.125,{legA:{r:.35},legB:{r:-.35},body:{y:-2},arm:{r:.1}}]],'io',.08),
    snip:loopClip(.16,[[0,{bladeA:{r:-.35},bladeB:{r:.35},arm:{r:-.25},legA:{r:-.3},legB:{r:.3}}],[.08,{bladeA:{r:.12},bladeB:{r:-.12},arm:{r:.15},legA:{r:.3},legB:{r:-.3}}]],'io',.04)}});
defRig('p_smudge',{w:96,h:96,oy:48,s:PS,parts:[{n:'root',at:[46,72]},
  {n:'tail',at:[24,56],up:'body',paint:t=>{poly(t,[22,40,28,24,36,40]);fi(t,'#3a2a5a',2);t.beginPath();t.moveTo(20,60);t.quadraticCurveTo(8,50,12,40);ink(t,5,'#3a2a5a');}},
  ...[[34,'legB'],[58,'legD'],[46,'legA'],[68,'legC']].map(([x,n])=>({n,at:[x,64],up:'root',paint:t=>{rr(t,x-4,64,8,14,3);fi(t,n==='legB'||n==='legD'?'#2e2148':'#3a2a5a',2);}})),
  {n:'body',at:[46,66],up:'root',wob:.01,paint:t=>{t.beginPath();t.ellipse(46,56,26,16,0,0,6.28);fi(t,'#3a2a5a');circ(t,40,52,6);t.fillStyle='rgba(160,130,220,.35)';t.fill();}},
  {n:'head',at:[62,52],up:'body',v:['','blink'],paint:(t,s,v)=>{circ(t,70,44,15);fi(t,'#3a2a5a');circ(t,74,42,5);fi(t,'#fbf8f0',1.5);if(v){t.beginPath();t.moveTo(71,42);t.lineTo(77,42);ink(t,1.8);}else{circ(t,75,42,2.4);t.fillStyle=INK;t.fill();}circ(t,84,48,3);t.fillStyle='#e8636a';t.fill();}},
  {n:'ear',at:[64,32],up:'head',paint:t=>{poly(t,[62,32,58,16,70,30]);fi(t,'#4a3570',2);}}],
  clips:{idle:loopClip(2.2,[[0,{tail:{r:.25},ear:{r:0},head:{r:0,sw:''}}],[.35,{tail:{r:-.2}}],[.7,{tail:{r:.25},ear:{r:-.15}}],[1.05,{tail:{r:-.2},ear:{r:0}}],[1.5,{head:{r:.06}}],[1.9,{head:{sw:'blink'}}],[2,{head:{sw:''}}]],'io',.15),
    walk:loopClip(.3,[[0,{legA:{r:.4},legB:{r:-.4},legC:{r:-.4},legD:{r:.4},body:{y:0},tail:{r:.3},head:{r:.03}}],[.15,{legA:{r:-.4},legB:{r:.4},legC:{r:.4},legD:{r:-.4},body:{y:-2},tail:{r:-.25},head:{r:-.03}}]],'io',.08)}});
defRig('p_ember',{w:96,h:96,oy:48,s:PS,parts:[{n:'root',at:[48,52],artS:1.9},
  {n:'tail',at:[22,54],up:'body',paint:t=>{t.beginPath();t.moveTo(18,50);t.quadraticCurveTo(6,43,4,58);t.quadraticCurveTo(12,62,24,58);t.closePath();fi(t,'#ff7a2d',2);}},
  {n:'body',at:[48,52],up:'root',wob:.01,paint:t=>{poly(t,[22,52,50,38,76,44,56,62,30,64]);fi(t,'#e0823d');poly(t,[70,42,86,46,72,50]);fi(t,'#f1c04f',2);circ(t,68,44,2.5);t.fillStyle=INK;t.fill();}},
  {n:'crest',at:[50,36],up:'body',paint:t=>{t.beginPath();t.moveTo(46,34);t.quadraticCurveTo(50,22,56,28);t.lineTo(52,37);t.closePath();t.fillStyle='#ffd66b';t.fill();}},
  {n:'wing',at:[48,50],up:'body',wob:0,paint:t=>{poly(t,[36,50,52,23,60,50]);fi(t,'#ffb45a',2);}}],
  clips:{fly:loopClip(.5,[[0,{wing:{r:-.3,sy:1.1},body:{y:-2},tail:{r:.18},crest:{r:-.1}}],[.25,{wing:{r:.35,sy:.75},body:{y:2},tail:{r:-.12},crest:{r:.08}}]],'io',.1)}});
RIGS.p_ember.clips.idle=RIGS.p_ember.clips.fly;
// painted partners (assets/art/rigs/p_<key>.root+all[.<frame>], docs/ART.md): a whole cut-out moved by its root that swaps
// painted frames (sw) like the painted foes: pidle breathes, bobs and blinks, pmove walks (w1/w2) or flaps (flap), pact is
// the partner's move (flare, snip/snip2, dig) and pcheer the celebration; a frame that isn't painted falls back to the standing one
{const C=k=>RIGS['p_'+k].clips,blink=(len,at)=>[[0,''],[at,'blink'],[at+.12,''],[len,'']];
  Object.assign(C('lumi'),{pidle:loopClip(2.4,[[0,{root:{r:.06,y:0}}],[.6,{root:{y:2}}],[1.2,{root:{r:-.06,y:0}}],[1.8,{root:{y:2}}]],'io',.2),
    pact:still({root:{sx:1.08,sy:1.08,sw:'flare'}},.05),pcheer:still({root:{sw:'cheer'}},.08)});
  C('lumi').pidle.tr.root.sw=blink(2.4,2.05);C('lumi').pmove=C('lumi').pidle;
  const walk=len=>loopClip(len,[[0,{root:{r:-.03,y:0,sw:'w1'}}],[len/4,{root:{r:0,y:-2}}],[len/2,{root:{r:.03,y:0,sw:'w2'}}],[len*3/4,{root:{r:0,y:-2}}]],'io',.08);
  Object.assign(C('snip'),{pidle:loopClip(3,[[0,{root:{sy:1,sx:1}}],[1.5,{root:{sy:1.03,sx:.99}}]],'io',.15),pmove:walk(.25),
    pact:loopClip(.16,[[0,{root:{r:-.05,sw:'snip'}}],[.08,{root:{r:.05,sw:'snip2'}}]],'io',.04),pcheer:still({root:{sw:'cheer'}},.08)});
  C('snip').pidle.tr.root.sw=blink(3,2.5);
  Object.assign(C('smudge'),{pidle:loopClip(2.2,[[0,{root:{sy:1,sx:1}}],[1.1,{root:{sy:1.03,sx:.99}}]],'io',.15),pmove:walk(.3),
    pact:loopClip(.2,[[0,{root:{x:-1,r:.04,sw:'dig'}}],[.1,{root:{x:1,r:-.02,sw:'dig'}}]],'io',.04),pcheer:still({root:{sw:'cheer'}},.08)});
  C('smudge').pidle.tr.root.sw=blink(2.2,1.9);
  // Ember flies all the time: its wing beats in pidle (and pmove), and it blinks once a loop on an upstroke
  Object.assign(C('ember'),{pidle:loopClip(2,[0,1,2,3,4,5,6,7].map(i=>[i*.25,{root:{y:i%2?2:-2,sw:i===4?'blink':i%2?'flap':''}}]),'io',.1),
    pact:still({root:{sx:1.1,sy:1.1,sw:'flare'}},.06),pcheer:still({root:{sw:'cheer'}},.08)});C('ember').pmove=C('ember').pidle;}
export function buildPartnerSheets(){for(const k of PORDER){SHEETS['p_'+k]=rigPic('p_'+k,{},'idle',0,'p_'+k);SHEETS['p_'+k+'T']=canvasTex(SHEETS['p_'+k]);}}
export function pPortrait(k){if(portraitCache['p_'+k])return portraitCache['p_'+k];return portraitCache['p_'+k]=SHEETS['p_'+k].toDataURL?(()=>{const c=mk(96,96),s=SHEETS['p_'+k];if(s.whole){const[x,y,z]=pBox(s);c.getContext('2d').drawImage(s,x,y,z,z,0,0,96,96);}else c.getContext('2d').drawImage(s,0,0,96,96,0,0,96,96);return c.toDataURL();})():'';}
// a painted partner (rigPic of a whole cut-out, which can be bigger than the 96px frame): the square around the figure, a little margin
export function pBox(s){const W=s.width,H=s.height,a=s.getContext('2d').getImageData(0,0,W,H).data;let x0=W,y0=H,x1=0,y1=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[(y*W+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<x0)return[0,0,Math.min(W,H)];const z=Math.round(Math.max(x1-x0,y1-y0)*1.08);return[Math.round((x0+x1-z)/2),Math.round((y0+y1-z)/2),z];}
function unlockPartner(k,quiet){const p=player;if(p.partners.includes(k))return;p.partners.push(k);if(!p.partner)setPartner(k);if(!quiet){recruit(k);}}
// the recruitment moment: the new partner comes along at once, a card announces them, they hop and say hello and you answer
function recruit(k){const d=PARTNERS[k];setPartner(k);partnerCheer(2.4);playerCheer(1.4);SFX.nice();stat('partners');chapterCard(null,d.name,d.desc,'A new friend joins');
  burst(player.x,player.y+2,['#fbf8f0','#f1c04f','#d4483b','#8fc9ec'],36,7,{grav:5,life:1.2});toast(`${d.name} joined your party! Press ${KEYNAME(SET.bind.partner)} to switch partners and ${KEYNAME(SET.bind.ability)} for ${d.move}.`,'gold');
  say(partnerSpeaker(k),d.hi,{wait:1.5,done:()=>say(playerSpeaker(),d.re,{done:()=>partnerCheer(1)})});}
export function syncPartners(quiet){if(hasNPC('guide'))unlockPartner('lumi',quiet);if(quests.king)unlockPartner('snip',quiet);if(quests.crane)unlockPartner('smudge',quiet);if(quests.lev)unlockPartner('ember',quiet);}
export function setPartner(k){player.partner=k;pt.type=null;pt.cd=0;pt.act=null;pt.fxT=0;setInvDirty(true);}
export function cyclePartner(){const p=player;if(state!=='play')return;if(!p.partners.length){toast('No partners yet. Your first one joins when the Guide moves in.');return;}const i=p.partners.indexOf(p.partner);const k=p.partners[(i+1)%p.partners.length];setPartner(k);partnerCheer(.7);toast(`${PARTNERS[k].name} is now with you.`);SFX.pick();burst(player.x-player.face,player.y+1.2,['#fbf8f0','#f1c04f'],10,3,{grav:0});}
function bestPick(){let b=1;for(const s of player.inv)if(s&&ITEMS[s.id].pick)b=Math.max(b,ITEMS[s.id].pick);return b;}
export function partnerAbility(){const p=player,k=p.partner;if(state!=='play'||p.dead)return;if(!k){toast('No partner with you yet.');return;}if(pt.cd>0){toast(`${PARTNERS[k].move} is recharging (${Math.ceil(pt.cd)}s).`);return;}
  const bosses=['king','crane','lev','folio'].filter(q=>quests[q]).length,up=palUp(k);pt.cd=PARTNERS[k].cd*(hasBadge('quick')?.7:1);stat('pmoves');
  if(k==='lumi'){pt.fxT=.7;burst(pt.x,pt.y,['#fff3c0','#ffe58a','#fbf8f0'],up?70:40,up?13:9,{grav:0,life:.7,bright:1});SFX.nice();for(const e of enemies){if(e.dying)continue;if(Math.hypot(e.x-pt.x,e.y+e.h/2-pt.y)<(up?13:9)){e.stun=e.d.boss?(up?1.2:.7):(up?3.5:2.2);hurtEnemy(e,10+bosses*6,e.x>pt.x?1:-1,2);}}}
  else if(k==='snip'){pt.act='spin';pt.at=up?5:3;pt.hitT=0;SFX.swing();}
  else if(k==='smudge'){const a=Math.atan2(mouse.wy-(p.y+.9),mouse.wx-p.x),pw=bestPick()+(up?1:0);let n=0;for(let s=1;s<=(up?9:6);s++){const cx=Math.floor(p.x+Math.cos(a)*s),cy=Math.floor(p.y+.9+Math.sin(a)*s);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const x=cx+dx,y=cy+dy,t=tileAt(x,y);if(t===T.AIR||TP[t].liq||t===T.CHEST||t===T.DOOR||t===T.BED||!TP[t].solid&&t!==T.TUFT&&t!==T.FLOWER&&t!==T.FLOWER2&&t!==T.BLOOM)continue;if(TP[t].pick>pw)continue;if(breakTile(x,y)){n++;stat('mined');}}}
    pt.act='dig';pt.at=.5;pt.digA=a;burst(p.x+Math.cos(a)*2,p.y+1+Math.sin(a)*2,['#3a2a5a','#8a78b0'],20,6);if(!n){toast('Nothing here Smudge can dig.');pt.cd=1;}}
  else if(k==='ember'){pt.fxT=.9;heal(Math.round(p.max*(up?.75:.5)));if(up)for(const e of enemies)if(!e.dying&&Math.hypot(e.x-p.x,e.y+e.h/2-p.y-1)<6)hurtEnemy(e,16+bosses*8,e.x>p.x?1:-1,4,false,'fire');burst(p.x,p.y+1,['#ff7a2d','#ffd66b','#fbf8f0'],30,6,{grav:-2,bright:1});SFX.potion();}
}
export function updatePartner(dt){const p=player,k=p.partner;
  if(!k||p.dead||state==='title'){if(pt.mesh)pt.mesh.visible=false;$('partnerHud').hidden=true;return;}
  if(pt.type!==k){if(pt.rig)rigFree(pt.rig);pt.rig=makeRig('p_'+k,{},'p_'+k);pt.mesh=pt.rig.mesh;pt.mesh.position.z=.16;pt.type=k;pt.x=p.x-p.face;pt.y=p.y+1;pt.cd=Math.min(pt.cd,PARTNERS[k].cd);pt.hudKey='';}
  pt.t+=dt;pt.cd=Math.max(0,pt.cd-dt);pt.fxT=Math.max(0,(pt.fxT||0)-dt);const def=PARTNERS[k],bosses=['king','crane','lev','folio'].filter(q=>quests[q]).length;
  let tx=p.x-p.face*1.3,ty=p.y+(def.fly?1.9+Math.sin(pt.t*2.5)*.25:.62);
  if(k==='snip'){pt.atkT-=dt;if(pt.act==='spin'){pt.at-=dt;pt.hitT-=dt;const a=pt.t*9,r=palUp('snip')?1.3:1;tx=p.x+Math.cos(a)*1.8*r;ty=p.y+1+Math.sin(a)*1.4*r;if(pt.hitT<=0){pt.hitT=.25;for(const e of enemies)if(!e.dying&&Math.hypot(e.x-p.x,e.y+e.h/2-p.y-1)<(palUp('snip')?3.6:2.8))hurtEnemy(e,10+bosses*5,e.x>p.x?1:-1,3);}if(Math.random()<dt*20)burst(pt.x,pt.y,['#fbf8f0','#d4483b'],1,2,{grav:0,life:.3});if(pt.at<=0)pt.act=null;}
    else if(pt.target&&!pt.target.dying&&pt.atkT>0){tx=pt.target.x;ty=pt.target.y+pt.target.h/2;if(Math.hypot(pt.x-tx,pt.y-ty)<.8&&!pt.hit){pt.hit=true;hurtEnemy(pt.target,8+bosses*5,pt.x<tx?1:-1,3);SFX.swing();}}
    else if(pt.atkT<=-.6){pt.target=null;pt.hit=false;let best=null,bd=5;for(const e of enemies){if(e.dying)continue;const d=Math.hypot(e.x-p.x,e.y+e.h/2-p.y-1);if(d<bd){bd=d;best=e;}}if(best){pt.target=best;pt.atkT=.45;pt.hit=false;}}}
  if(k==='ember'){pt.atkT-=dt;if(pt.atkT<=0){pt.atkT=1.4;const e=nearestEnemy(pt.x,pt.y,10);if(e){const dx=e.x-pt.x,dy=e.y+e.h/2-pt.y,l=Math.hypot(dx,dy)||1;fireProj('fireball',pt.x,pt.y,dx/l*15,dy/l*15,12+bosses*6,{src:'magic'});}}}
  if(k==='smudge'){for(const q of pickups)if(q.t<=0&&Math.hypot(q.x-p.x,q.y-p.y)<9){const dx=p.x-q.x,dy=p.y+.9-q.y,l=Math.hypot(dx,dy)||1;q.x+=dx/l*dt*9;q.y+=dy/l*dt*9;}if(pt.act==='dig'){pt.at-=dt;tx=p.x+Math.cos(pt.digA)*2;ty=p.y+1+Math.sin(pt.digA)*2;if(pt.at<=0)pt.act=null;}}
  const sp=(k==='snip'&&(pt.act||pt.atkT>0))?18:7;pt.x+=(tx-pt.x)*Math.min(1,dt*sp);pt.y+=(ty-pt.y)*Math.min(1,dt*sp);
  const face=pt.act==='spin'?(Math.sin(pt.t*9)>0?1:-1):(Math.abs(tx-pt.x)>.2?(tx>pt.x?1:-1):p.face);pt.rot+=((face>0?0:Math.PI)-pt.rot)*Math.min(1,dt*14);
  const m=pt.mesh;m.visible=true;m.rotation.y=pt.rot;const moving=Math.abs(tx-pt.x)>.3;const hop=!def.fly&&moving?Math.abs(Math.sin(pt.t*12))*.25:0;m.position.set(pt.x,pt.y+hop,.16);
  const acting=pt.fxT>0||pt.act==='dig'||k==='snip'&&(pt.act==='spin'||pt.atkT>0);
  rigPlay(pt.rig,pt.rig.S.whole?pt.cheer>0?'pcheer':acting?'pact':moving?'pmove':'pidle':def.fly?'fly':k==='snip'&&acting?'snip':moving&&RIGS[pt.rig.k].clips.walk?'walk':'idle');
  // celebration: hops with a spin and sparkles; idle (player standing still): each partner has its own fidget
  pt.idle=Math.abs(p.vx)<.1&&!pt.act&&!moving?pt.idle+dt:0;let sx=1,sy=1,rz=0;
  if(pt.cheer>0){pt.cheer-=dt;const c=1-Math.max(0,pt.cheer)/pt.cheerMax;m.position.y+=Math.abs(Math.sin(c*Math.PI*3))*.8*(1-c*.6);rz=c<.34?c*3*Math.PI*2:0;sy=1+Math.sin(c*Math.PI*6)*.08;if(Math.random()<dt*14)burst(pt.x,pt.y+.3,['#f1c04f','#fbf8f0','#fff3c0'],1,2.5,{grav:-1,life:.6,bright:1});}
  else if(pt.idle>5){const it=pt.idle-5;
    if(k==='lumi'){m.position.x+=Math.sin(it*1.3)*.6;m.position.y+=Math.sin(it*2.6)*.18;rz=Math.sin(it*1.3)*.15;}
    else if(k==='snip'){const on=it%3.2<.7;rz=on?Math.sin(it*38)*.12:0;sy=on?1.06:1;}
    else if(k==='smudge'){const h=it%4.5;sy=h<.4?.88:1;sx=h<.4?1.08:1;if(h>.4&&h<.8)m.position.y+=Math.sin((h-.4)/.4*Math.PI)*.45;if(h>=2&&h<3)rz=Math.sin(it*20)*.06;}
    else{const pr=it%5<1.2;sy=pr?1+Math.sin(it*18)*.07:1;rz=pr?Math.sin(it*9)*.1:0;if(pr&&Math.random()<dt*6)burst(pt.x-.3,pt.y,['#ff7a2d','#ffd66b'],1,1,{grav:-2,life:.5,bright:1});}}
  m.scale.set(sx,sy,1);m.rotation.z=rz;
  if(k==='lumi'||k==='ember')m.material.uniforms.uTint.value.set(1.1,1.08,1.02);else setTint(m.material,pt.x,pt.y);rigUpdate(pt.rig,dt);
  const hk=k+':'+Math.ceil(pt.cd)+moveName(k);if(hk!==pt.hudKey){pt.hudKey=hk;const H=$('partnerHud');H.hidden=false;H.innerHTML=`<img src="${pPortrait(k)}" alt=""><div><b>${def.name}</b><span>${KEYNAME(SET.bind.ability)}: ${moveName(k)} · ${pt.cd>0?Math.ceil(pt.cd)+'s':'ready'}</span><i><u style="width:${100*(1-pt.cd/(def.cd*(hasBadge('quick')?.7:1)))}%"></u></i></div>`;}}
export const bpMax=()=>3+['king','crane','lev','folio'].filter(q=>quests[q]).length*3+(player.bpUps||0);
export const bpUsed=()=>player.badgesOn.reduce((a,k)=>a+BADGES[k][1],0);
