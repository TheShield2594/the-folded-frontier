// Townsfolk that remember: dialogue lines that react to what the player has done, side quests for the
// newer townsfolk, and the Curator's museum. All of it is saved per world in `folk`.
import {
  addItem,angler,BIO,BIONAME,checkAch,countItem,dropItem,icon,ITEMS,NPCDEF,npcs,pick,player,quests,
  removeItem,renderQuests,setInvDirty,SFX,stat,surf,T,toast,townLevel,visited,W,
} from './game.js';

// ================= folk =================
// q: side quest state (1 accepted, 2 done); heard: memory lines each NPC has said ('type:key');
// met: townsfolk already introduced; n: per-world counters (harvest, fossil, storm, army, trav, moon);
// mus: items donated to the museum; col: museum collections whose reward was given.
export const newFolk=()=>({q:{},heard:{},met:{},n:{},mus:{},col:{}});
export let folk=newFolk();
export function fcount(k,n=1){folk.n[k]=(folk.n[k]||0)+n;}
const give=(id,n)=>{if(id==='coin'){addItem('coin',n);return;}const l=addItem(id,n);if(l)dropItem(id,l,player.x,player.y+1);};
const rewardTxt=r=>r.map(([id,n])=>id==='coin'?`${n} coins`:`${ITEMS[id].name}${n>1?' ×'+n:''}`).join(', ');
const camps=()=>(BIO.camps||[]).filter(c=>c.done).length;
const donated=()=>Object.keys(folk.mus).length;
const bosses=()=>['king','crane','lev','folio','unfolded'].filter(k=>quests[k]).length;

// Side quests. Each belongs to one NPC and unlocks after `after` (another side quest) is done.
// A quest is finished either by handing over `give` items or when `prog()` returns [have, need] with have>=need.
export const SIDEQ=[
  {id:'wheat',npc:'farmer',n:'Bread for the Town',ask:'The whole town wants bread and my field is still seedlings. Could you bring me 10 Paper Wheat?',give:[['wheat',10]],reward:[['seed_ember',3],['seed_ink',3],['coin',120]],done:'Golden! This will feed the town for a week. Take these seeds, they grow in stranger soil.'},
  {id:'supper',npc:'farmer',n:'Harvest Supper',after:'wheat',ask:'I am throwing a harvest supper. Bring 4 Paper Bread and 2 Grilled Fish and you are the guest of honor.',give:[['bread',4],['grilledfish',2]],reward:[['potregen',2],['bpup',1],['coin',150]],done:'The supper was a triumph. Someone even danced. It was the Tinkerer. It was alarming.'},
  {id:'moths',npc:'farmer',n:'Night Lights',after:'supper',ask:'Moths keep eating my lanterns instead of my crops. Bring me 3 Paper Lanterns and 5 Glowcaps to lure them off, and I will introduce you to the one moth I actually like.',give:[['lanternp',3],['mushroom',5]],reward:[['pet_moth',1],['coin',100]],done:'They are dancing round the lanterns now. This little one kept following me, so she is yours. She glows!'},
  {id:'camp',npc:'scout',n:'Lost Camps',ask:'There are abandoned camps out in the wilds. Rebuild one and I can mark it on the map.',prog:()=>[camps(),1],reward:[['tmap',1],['coin',120]],done:'Marked it! Here, a torn map I could not make sense of. Maybe you can.'},
  {id:'regions',npc:'scout',n:'The Whole Map',after:'camp',ask:()=>`My map has blank pages. Visit every region of this world and tell me what you saw. (${visited.size} of ${Object.keys(BIONAME).length})`,prog:()=>[Object.keys(BIONAME).filter(b=>visited.has(b)).length,Object.keys(BIONAME).length],reward:[['glider',1],['coin',250]],done:'Every page filled in! Take my old glider. I only ever used it to fall slowly.'},
  {id:'exhibit',npc:'curator',n:'The First Exhibit',ask:()=>`An empty museum is just a quiet room. Donate 5 different finds to get us started. (${Math.min(5,donated())} of 5)`,prog:()=>[donated(),5],reward:[['lanternp',2],['coin',200]],done:'Splendid! We had our first visitor today. It was the Merchant, but still.'},
  {id:'bones',npc:'curator',n:'Old Bones',after:'exhibit',ask:'Deep underground lie Inkosaur Skulls. Donate one and the museum will be the talk of the land.',prog:()=>[folk.mus.fos_skull?1:0,1],reward:[['bpup',1],['coin',300]],done:'Look at those teeth! Paper teeth, but still. The town will talk of nothing else.'}];
const sideq=id=>SIDEQ.find(q=>q.id===id);
const qOpen=q=>folk.q[q.id]!==2&&(!q.after||folk.q[q.after]===2);
const qReady=q=>q.give?q.give.every(([id,n])=>countItem(id)>=n):(()=>{const[a,b]=q.prog();return a>=b;})();
export function folkClick(a){const[act,id]=a.split(':'),q=sideq(id);if(!q)return;
  if(act==='acc'&&!folk.q[q.id]){folk.q[q.id]=1;SFX.pick();toast(`Side quest started: ${q.n}`,'good');renderQuests();return;}
  if(act==='done'&&folk.q[q.id]===1){if(!qReady(q)){toast(q.give?`You still need ${q.give.filter(([id,n])=>countItem(id)<n).map(([id,n])=>`${n} ${ITEMS[id].name}`).join(' and ')}.`:'Not done yet.','bad');return;}
    if(q.give)q.give.forEach(([id,n])=>removeItem(id,n));folk.q[q.id]=2;q.reward.forEach(([id,n])=>give(id,n));SFX.nice();toast(`Side quest complete: ${q.n}! Got ${rewardTxt(q.reward)}.`,'gold');stat('sideq');renderQuests();setInvDirty(true);checkAch();}}
function questHTML(type){const list=SIDEQ.filter(q=>q.npc===type);if(!list.length)return '';let h='';
  for(const q of list){if(!qOpen(q))continue;const ask=typeof q.ask==='function'?q.ask():q.ask,st=folk.q[q.id];
    h+=`<div class="sideTip quest"><b>${st?'Side quest':'New side quest'} · ${q.n}</b>${ask}<small>Reward: ${rewardTxt(q.reward)}</small></div>`;
    if(!st)h+=`<div class="shopi" data-q="acc:${q.id}"><img src="${icon('tmap')}" alt=""><span>I'll do it</span><span class="pr">Accept</span></div>`;
    else{const ok=qReady(q),p=q.prog&&q.prog();h+=`<div class="shopi ${ok?'':'poor'}" data-q="done:${q.id}"><img src="${icon(q.give?q.give[0][0]:'coin')}" alt=""><span>${q.give?'Hand over '+q.give.map(([id,n])=>`${n} ${ITEMS[id].name}`).join(' + '):'Report back'}</span><span class="pr">${ok?'Turn in':p?`${Math.min(p[0],p[1])} / ${p[1]}`:'Not yet'}</span></div>`;}
    break;}
  const done=list.filter(q=>folk.q[q.id]===2);if(done.length)h+=`<p class="hint">Done: ${done.map(q=>'✓ '+q.n).join(' · ')}</p>`;if(!h)h='<p class="hint">No favors to ask right now.</p>';return h;}
// the NPC's side panel: what they just said, their side quests and (for the Curator) the museum
export function folkHTML(type,line){return (line?`<div class="sideTip talk"><b>${NPCDEF[type].name}</b>${line}</div>`:'')+questHTML(type)+(type==='curator'?museumHTML():'');}
export function sideJournal(){const act=SIDEQ.filter(q=>folk.q[q.id]===1);return act.length?'<b class="sj">Side quests</b>'+act.map(q=>`<div class="side"><i></i>${q.n} <small>(${NPCDEF[q.npc].name})</small></div>`).join(''):'';}

// Memory lines: [key, who ('*' for anyone, or space-separated NPC types), when, line]. Each NPC says each
// line that applies once, the first time you talk to them after it becomes true, then may repeat it later.
const MEMORY=[
  ['king','merchant',()=>quests.king,'{surprised}You *flattened* the King Slime! {angry}Gel prices have never been lower. Terrible for business.'],
  ['king','nurse',()=>quests.king,'{sad}Still royal gel on your boots from the King Slime. {angry}Please *wipe your feet.*'],
  ['king','painter',()=>quests.king,'{happy}I painted the King Slime from memory. {surprised}The painting still ~wobbles~.'],
  ['crane','angler',()=>quests.crane,'{happy}Since the Great Crane fell, the koi in the snowfield bite *twice as often.*'],
  ['crane','tinkerer',()=>quests.crane,'{surprised}Crane Plumes! Lighter than air and twice as fussy. {happy}I *love* them.'],
  ['crane','scout',()=>quests.crane,'{happy}With the Great Crane gone, I finally sketched the snowfield *without being chased.*'],
  ['lev','angler',()=>quests.lev,'{surprised}You beat the *Inkwell Leviathan?* {happy}The Ink Lake feels calmer. The fish feel braver.'],
  ['lev','guide',()=>quests.lev,'{happy}The Leviathan is gone. Its *Ink Hearts* make a pickaxe that can reach Emberite.'],
  ['folio','nurse',()=>quests.folio,'{surprised}The *Charred Folio!* {happy}I saved some ointment for those scorch marks.'],
  ['folio','curator',()=>quests.folio,'{sad}The Charred Folio was the *oldest book* in the land. Could you bring me a page? {neutral}No? Fair.'],
  ['unfolded','*',()=>quests.unfolded,'{surprised}People say you solved the riddle of the ink shrine. The whole town is ~whispering~ about it.'],
  ['awake','guide',()=>BIO.awake,'{surprised}The world *woke up* when The Unfolded fell. {neutral}The land has creased where one page pressed into another, and *Foilite* glints deep down. You will need an Emberite Pickaxe to cut it.'],
  ['awake2','merchant nurse scout',()=>BIO.awake,'{sad}Since the world woke up, everything out there is ~meaner~. {happy}Do be careful. And buy *potions.*'],
  ['stag','scout farmer',()=>countItem('stag')>0,'{surprised}Was that you bounding past on a *paper stag?* {happy}Very majestic. Mind the crops.'],
  ['pet','nurse painter',()=>!!player.pet,'{happy}Oh, you brought a little friend! {surprised}Does it need a *checkup?*'],
  ['allboss','merchant painter',()=>bosses()>=4,'{surprised}Every big villain in this world, *flattened.* {happy}I hope you take a holiday.'],
  ['max200','nurse',()=>player.max>=200,'{surprised}*Two hundred* life! {happy}You are more patch than paper at this point.'],
  ['moon','guide tinkerer',()=>(folk.n.moon||0)>0,'{happy}You made it through an *Ink Moon.* {sad}Most folks just ~hide under the bed~.'],
  ['fish10','angler',()=>angler.done>=10,()=>`{surprised}*${angler.done} requests* done! {happy}You fish better than I do. {angry}Do not tell ~anyone~.`],
  ['camp','guide merchant',()=>camps()>0,'{happy}I heard you rebuilt an old camp out there. Travelers talk of *nothing else.*'],
  ['town','guide',()=>['Town','Paper City'].includes(townLevel()),()=>`{happy}This place is a proper *${townLevel()}* now. {neutral}I had to redraw my maps.`],
  ['city','*',()=>townLevel()==='Paper City','{surprised}A *Paper City!* {happy}When you arrived, this was a clearing with a cabin.'],
  ['q_wheat','merchant nurse',()=>folk.q.wheat===2,'{happy}The Farmer says you brought the wheat. *Fresh bread* in town, thanks to you.'],
  ['q_supper','painter angler guide',()=>folk.q.supper===2,'{happy}That harvest supper! I am *still full.* Thank you for bringing the fish.'],
  ['q_regions','guide painter',()=>folk.q.regions===2,'{happy}The Cartographer filled in the *whole map* with your notes. It hangs in the town hall now.'],
  ['q_bones','*',()=>folk.q.bones===2,'{surprised}An *Inkosaur Skull* in our own museum! {happy}I went to see it three times.'],
  ['mus1','merchant painter',()=>donated()>=1,'{happy}I hear the museum has your name on a *little plaque.*'],
  ['mus15','painter scout',()=>donated()>=15,'{happy}I sketched your exhibits in the museum. The fossils were excellent models. {neutral}*Very* still.'],
  ['col','curator guide',()=>Object.keys(folk.col).length>0,()=>`{happy}You completed ${Object.keys(folk.col).length>1?Object.keys(folk.col).length+' collections':'a whole collection'} in the museum. Scholars will write about you.`],
  ['storm','*',()=>(folk.n.storm||0)>0,'{surprised}That ~paper storm~! I found a letter from my aunt stuck in the *chimney.*'],
  ['army','merchant nurse tinkerer farmer',()=>(folk.n.army||0)>0,'{happy}You held off the *Paper Army!* {sad}We would have been ~folded into cranes~ without you.'],
  ['trav','merchant',()=>(folk.n.trav||0)>0,'{angry}Did that traveling merchant come by again? Their prices are *criminal.* {neutral}Mine are merely rude.'],
  ['fossil','curator',()=>(folk.n.fossil||0)>0&&!donated(),'{surprised}You found a *fossil!* {happy}Bring it to me. I will make it famous.'],
];
const said=v=>typeof v==='function'?v():v;
// the line an NPC says when you talk to them; `passive` (a speech bubble while you walk past) never uses up a new line.
// Lines carry dialogue markup ({happy}, *word*; see dialogue.js), so show them through plain() outside staged dialogue.
// lineNew is set when the line is a first meeting or a fresh memory line, which talkTo stages as dialogue.
export let lineNew=false;
export function npcLine(type,passive){const d=NPCDEF[type];lineNew=false;if(!d)return '';
  if(!passive&&!folk.met[type]&&d.hello){folk.met[type]=1;lineNew=true;return said(d.hello);}
  const ok=MEMORY.filter(m=>(m[1]==='*'||m[1].split(' ').includes(type))&&m[2]());
  if(!passive){const fresh=ok.find(m=>!folk.heard[type+':'+m[0]]);if(fresh){folk.heard[type+':'+fresh[0]]=1;lineNew=true;return said(fresh[3]);}}
  if(ok.length&&Math.random()<.3)return said(pick(ok)[3]);
  const q=SIDEQ.find(q=>q.npc===type&&folk.q[q.id]===1);if(q&&Math.random()<.35)return q.give?`Any luck with the ${ITEMS[q.give[0][0]].name}?`:`How is "${q.n}" going?`;
  return pick(d.lines);}

// ================= museum =================
// Collections the Curator displays. Donating the last item of a collection gives its reward.
export const MUSEUM=[
  {id:'fossils',n:'Fossils',items:['fos_amm','fos_tri','fos_fern','fos_skull'],tip:'Dig dirt, sand, stone and ash underground.',reward:[['bpup',1],['coin',300]]},
  {id:'fish',n:'Fish',items:['minnow','koi','inkfish','sandsole','nightkoi','goldfin','lavafish'],tip:'The Angler knows where each one lives.',reward:[['tackle',1],['moonlure',10]]},
  {id:'ores',n:'Ores',items:['copperore','ironore','goldore','frostore','inkore','emberore'],tip:'One of every ore, from copper to Emberite.',reward:[['goldbar',8],['coin',200]]},
  {id:'curios',n:'Curiosities',items:['lens','batwing','mushroom','inksac','fstar','moonink'],tip:'Odd things dropped by creatures and the night sky.',reward:[['potiron',3],['potswift',3]]},
  {id:'keeps',n:'Boss keepsakes',items:['ribbon','plume','inkheart','cinder'],tip:'One keepsake from each great boss.',reward:[['bpup',2],['coin',500]]}];
export function museumHTML(){const n=donated(),all=MUSEUM.reduce((a,c)=>a+c.items.length,0);
  return `<h3 style="margin-top:10px">Museum · ${n} of ${all} displays filled</h3>`+MUSEUM.map(c=>{const have=c.items.filter(id=>folk.mus[id]).length;
    return `<div class="musH"><b>${folk.col[c.id]?'✓ ':''}${c.n} · ${have}/${c.items.length}</b><small>${folk.col[c.id]?'Collection complete!':c.tip+' Reward: '+rewardTxt(c.reward)}</small></div><div class="musG">`+c.items.map(id=>{const d=folk.mus[id],can=!d&&countItem(id)>0;
      return `<div class="shopi mus ${d?'done':can?'':'poor'}" ${can?`data-m="${id}"`:''} title="${ITEMS[id].name}"><img src="${icon(id)}" alt="" style="${d||can?'':'filter:grayscale(1) brightness(.5)'}"><span>${d||can?ITEMS[id].name:'???'}</span><span class="pr">${d?'✓':can?'Give':''}</span></div>`;}).join('')+'</div>';}).join('')+
    '<p class="hint">Carry a find to donate it. Donations stay on display for good.</p>';}
export function donate(id){if(folk.mus[id]||!ITEMS[id]||countItem(id)<1)return;removeItem(id,1);folk.mus[id]=1;SFX.nice();toast(`Donated ${ITEMS[id].name} to the museum!`,'good');stat('donations');
  for(const c of MUSEUM)if(!folk.col[c.id]&&c.items.every(i=>folk.mus[i])){folk.col[c.id]=1;c.reward.forEach(([i,n])=>give(i,n));stat('collections');setTimeout(()=>toast(`Collection complete: ${c.n}! The Curator gives you ${rewardTxt(c.reward)}.`,'gold'),600);}
  setInvDirty(true);checkAch();}
// fossils: a small chance in dirt, sand, stone and ash dug well below the surface; skulls only deep down
export function digFossil(x,y,t){if(t!==T.STONE&&t!==T.DIRT&&t!==T.SAND&&t!==T.ASH)return;const depth=surf[Math.min(W-1,Math.max(0,x))]-y;if(depth<10||Math.random()>.012)return;
  const id=depth>45&&Math.random()<.3?'fos_skull':pick(['fos_amm','fos_amm','fos_tri','fos_tri','fos_fern','fos_fern']);dropItem(id,1,x+.5,y+.5);fcount('fossil');if((folk.n.fossil||0)===1)toast('You found a fossil! A museum would treasure it.','gold');}
// Imported bindings are read-only, so other modules assign these through setters.
export function setFolk(v){return folk=v;}
