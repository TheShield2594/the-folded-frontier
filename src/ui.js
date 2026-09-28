// Inventory, crafting, tooltips and toasts; housing and the merchant.
import * as THREE from 'three';
import {
  reduceMotion,
  $,addItem,angler,ANGLER_REWARD,ANGLER_WHERE,anglerQuest,anglerTurnIn,BADGES,BEST,bestiary,BIO,bpMax,
  bpUsed,burst,camera,checkAch,chests,clamp,countAmmo,countBait,countItem,defense,dropHouse,dropItem,
  ELEM,EN,H,heal,houses,icon,idx,initAudio,ITEMS,KEYNAME,maxOf,mk,npcs,OPAQUE,padFocus,PARTNERS,pick,PK,
  placeTip,player,PORDER,pPortrait,questDone,quests,QUESTS,rand,RECIPES,registerHouseAt,removeItem,
  scene,selItem,SET,setPadFocus,setPartner,SFX,SHEETS,SHOP,spriteMesh,stat,syncPartners,T,tileAt,tiles,
  travelTo,upx,W,walls,
  guideEv,town,TOWN,townLevel,townShop,
  donate,folk,folkClick,folkHTML,npcLine,lineNew,npcSpeaker,plain,say,sideJournal,visited,wev,
  contestClaim,festival,FISH,worldDay,
  moveName,museumHTML,palJournal,palQuestTxt,
  MOUNTS,PETORDER,PETS,toggleMount,togglePet,
  C,cellIcon,loreHTML,
  makeRig,FOLK,
} from './game.js';

// ================= UI =================
export let invOpen=false,side=null,cursor=null,invDirty=true,hoverSlot=null;
const hotbarEl=$('hotbar'),gridEl=$('grid'),equipEl=$('equip');
function mkSlot(kind,i,parent,ph){const el=document.createElement('div');el.className='slot';el.dataset.kind=kind;el.dataset.i=i;if(ph){el.classList.add('ph');el.dataset.ph=ph;}parent.appendChild(el);return el;}
const hotEls=[],gridEls=[],armorEls=[],accEls=[];let sideEls=[];
for(let i=0;i<10;i++){hotEls.push(mkSlot('inv',i,hotbarEl));}
for(let i=0;i<40;i++)gridEls.push(mkSlot('inv',i,gridEl));
['Head','Body','Legs'].forEach((l,i)=>{const lab=document.createElement('div');lab.className='lab';lab.textContent=i===0?'Armor':'';armorEls.push(mkSlot('armor',i,equipEl,l));const a=mkSlot('acc',i,equipEl,'Acc');accEls.push(a);});
{const labs=document.createElement('div');}
function slotData(kind,i){if(kind==='inv')return player.inv[i];if(kind==='armor')return player.armor[i];if(kind==='acc')return player.acc[i];if(kind==='chest')return chests.get(side.key)[i];return null;}
function setSlot(kind,i,v){if(kind==='inv'&&v&&v.id==='coin'){player.coins+=v.n;updateCoins();v=null;}if(kind==='inv')player.inv[i]=v;else if(kind==='armor'){player.armor[i]=v;player.sheetDirty=true;}else if(kind==='acc')player.acc[i]=v;else if(kind==='chest')chests.get(side.key)[i]=v;invDirty=true;}
function paint(el,s){const key=s?s.id+':'+s.n:'';if(el.dataset.k===key)return;el.dataset.k=key;const kl=el.querySelector('.k');el.innerHTML=s?`<img src="${icon(s.id)}" alt="${ITEMS[s.id].name}"><b>${s.n>1?s.n:''}</b>`:'';if(el.parentNode===hotbarEl||el.parentNode===gridEl){const i=+el.dataset.i;if(i<10){const k=document.createElement('span');k.className='k';k.textContent=(i+1)%10;el.appendChild(k);}}if(s)el.classList.remove('ph');else if(el.dataset.ph)el.classList.add('ph');}
export function refreshUI(){if(padFocus&&!document.body.contains(padFocus))setPadFocus(null);hotEls.forEach((el,i)=>{paint(el,player.inv[i]);el.classList.toggle('sel',i===player.sel);});
  if(invOpen){gridEls.forEach((el,i)=>{paint(el,player.inv[i]);el.classList.toggle('sel',i===player.sel);});armorEls.forEach((el,i)=>paint(el,player.armor[i]));accEls.forEach((el,i)=>paint(el,player.acc[i]));
    if(side&&side.kind==='chest')sideEls.forEach((el,i)=>paint(el,chests.get(side.key)[i]));$('defTxt').textContent=`Defense ${defense()}`;renderCraft();if(side&&side.kind!=='chest')renderSide();}
  const it=selItem();$('itemName').textContent=it?it.name+(it.ammo?` · ${countAmmo(it.ammo)} ${it.ammo==='arrow'?'arrows':'paper'}`:'')+(it.magic?` · ${it.mana} mana`:'')+(it.rod?` · ${countBait()} bait`:''):'';
  if(cursor){$('cursorItem').hidden=false;$('cursorItem').innerHTML=`<img src="${icon(cursor.id)}" alt=""><b>${cursor.n>1?cursor.n:''}</b>`;}else $('cursorItem').hidden=true;invDirty=false;}
function stationsNear(){const s={bench:false,furnace:false,anvil:false,alchemy:false};const px=Math.floor(player.x),py=Math.floor(player.y+.5);for(let y=py-3;y<=py+4;y++)for(let x=px-5;x<=px+5;x++){const t=tileAt(x,y);if(t===T.BENCH)s.bench=true;else if(t===T.ALCHEMY)s.alchemy=true;else if(t===T.FURNACE)s.furnace=true;else if(t===T.ANVIL)s.anvil=true;}return s;}
let craftKey='';
function renderCraft(){const st=stationsNear();const avail=RECIPES.map((r,i)=>{const stOK=!r[3]||st[r[3]];const ok=stOK&&r[2].every(([id,n])=>countItem(id)>=n);return{r,i,ok,stOK};}).filter(x=>x.stOK||!x.r[3]||true);
  const key=JSON.stringify(st)+avail.map(a=>a.ok?1:0).join('')+player.inv.map(s=>s?s.id+s.n:'').join(',');if(key===craftKey)return;craftKey=key;
  $('stations').innerHTML=['bench','furnace','anvil','alchemy'].map(k=>`<span class="${st[k]?'on':''}">${st[k]?'●':'○'} ${ITEMS[k].name}</span>`).join('');
  avail.sort((a,b)=>(b.ok-a.ok)||(b.stOK-a.stOK)||a.i-b.i);
  $('recipes').innerHTML=avail.map(({r,i,ok,stOK})=>`<div class="rec ${ok?'can':'no'}" data-r="${i}"><img src="${icon(r[0])}" alt=""><div><div class="nm">${ITEMS[r[0]].name}${r[1]>1?' ×'+r[1]:''}</div><div class="ing">${r[2].map(([id,n])=>`<span class="${countItem(id)>=n?'':'miss'}"><img src="${icon(id)}" alt="">${n} ${ITEMS[id].name}</span>`).join('')}${r[3]?`<span class="${stOK?'':'miss'}">at ${ITEMS[r[3]].name}</span>`:''}</div></div></div>`).join('');}
export function craft(i,times=1){const r=RECIPES[i];for(let k=0;k<times;k++){const st=stationsNear();if(r[3]&&!st[r[3]])return;if(!r[2].every(([id,n])=>countItem(id)>=n))return;r[2].forEach(([id,n])=>removeItem(id,n));const left=addItem(r[0],r[1]);guideEv('craft');if(left)dropItem(r[0],left,player.x,player.y+1,0,3);
  SFX.craft();burst(player.x,player.y+1.2,['#f1c04f','#fbf8f0'],8,3);if(['copperbar','ironbar','goldbar'].includes(r[0]))questDone('bar');if(ITEMS[r[0]].use==='buff'||r[0]==='potion')stat('brews');if(['ironsword','ironpick','helmfe','mailfe','legsfe'].includes(r[0]))questDone('iron');}craftKey='';invDirty=true;}
$('recipes').addEventListener('mousedown',e=>{const el=e.target.closest('.rec');if(!el||e.button!==0)return;craft(+el.dataset.r,e.shiftKey?5:1);});
function shopHTML(list){return list.map(([id,p],i)=>`<div class="shopi ${player.coins<p?'poor':''}" data-s="${i}"><img src="${icon(id)}" alt=""><span>${ITEMS[id].name}</span><span class="pr"><img src="${icon('coin')}" alt="">${p}</span></div>`).join('');}
function nextTip(){const q=quests,has=id=>countItem(id)>0||player.armor.some(s=>s&&s.id===id);
  if(!q.tree)return 'Chop down a tree with your pickaxe. Wood builds almost everything early on.';
  if(!q.bar)return 'Build a Furnace at your Workbench (stone, wood and torches), then smelt ore into bars.';
  if(!q.heart)return 'Paper Hearts hide in caves. Each one you use adds 20 max life.';
  if(!q.iron)return 'Craft an Iron Anvil from 5 iron bars, then forge iron gear on it.';
  if(!q.king)return 'Forge a Gel Crown at an Anvil and use it on the surface to face the King Slime.';
  if(!has('goldpick')&&!has('frostpick'))return 'A Gold Pickaxe can mine Frostsilver in the Origami Snowfield.';
  if(!q.crane&&!has('moonbow')&&!has('moontome')&&!has('swallowtail'))return 'Between gold and Frostsilver, Moon Ink from Ink Moon nights makes the Moonstring Bow, Moonlit Tome and Swallowtail Launcher. '+(q.crane?'':'Then the Crane Charm, made from Frostsilver bars and paper, summons the Great Crane in the snowfield.');
  if(!q.crane)return 'Craft a Crane Charm from Frostsilver bars and paper, then use it in the snowfield.';
  if(!q.lev)return 'Crane Plumes make a Frostsilver Pickaxe for Inkstone. Then craft a Bottomless Inkwell and use it at the Ink Lake.';
  if(q.folio&&!q.unfolded)return 'They say an old shrine hums beneath the ground on Ink Moon nights. Five small flames, and a riddle carved in stone.';
  if(!q.folio)return 'Ink Hearts make an Inkstone Pickaxe for Emberite deep down. Brew Fire Resistance Potions from Emberbloom first. A Burnt Bookmark summons the Charred Folio.';
  return 'You have beaten every boss in this world. Maybe try a Large world with a new seed?';}
function sideHTML(){const k=side.kind;if(k==='folk')return folkHTML(side.key,side.line)+(side.list&&side.list.length?`<h3 style="margin-top:10px">For sale</h3>`+shopHTML(side.list):'');
  return (side.line?`<div class="sideTip talk"><b>${side.title}</b>${side.line}</div>`:'')+sideBody(k);}
function sideBody(k){
  if(k==='shop'){const list=side.list||SHOP;return shopHTML(list)+`<p class="hint">Shift-click to buy 10. Shift-click items in your backpack to sell them.</p>`;}
  if(k==='nurse'){const miss=Math.ceil(player.max-player.hp),cost=Math.max(miss>0||player.potT>0?1:0,Math.ceil(miss*.8)+(player.potT>0?10:0));
    return `<div class="sideTip"><b>Patch-up</b>${miss>0||player.potT>0?`Heal ${miss} life${player.potT>0?' and clear potion sickness':''}.`:'You look perfectly smooth already.'}</div>${cost?`<div class="shopi ${player.coins<cost?'poor':''}" data-a="heal"><img src="${icon('heart')}" alt=""><span>Heal me</span><span class="pr"><img src="${icon('coin')}" alt="">${cost}</span></div>`:''}`;}
  if(k==='guide'){const it=selItem();let rec='';if(it){const uses=RECIPES.filter(r=>r[2].some(([id])=>id===it.id)).slice(0,8);rec=`<div class="sideTip"><b>${it.name} is used in</b>${uses.length?uses.map(r=>`<div class="mini-rec"><img src="${icon(r[0])}" alt="">${ITEMS[r[0]].name}${r[3]?` <span style="color:var(--ink2)">(${ITEMS[r[3]].name})</span>`:''}</div>`).join(''):'Nothing I know of. Try selling it.'}</div>`;}
    return `<div class="sideTip"><b>Next step</b>${nextTip()}</div>${rec||'<p class="hint">Hold an item in your hotbar and I will tell you what it makes.</p>'}`;}
  if(k==='tinker'){return `<div class="sideTip"><b>Combine accessories</b>Both parts must be in your backpack or equipped.</div>`+TINKER.map(([out,parts,fee],i)=>{const ok=parts.every(id=>countItem(id)>0||player.acc.some(s=>s&&s.id===id))&&player.coins>=fee;return `<div class="shopi ${ok?'':'poor'}" data-t="${i}"><img src="${icon(out)}" alt=""><span>${ITEMS[out].name}<br><small style="color:var(--ink2)">${parts.map(id=>ITEMS[id].name).join(' + ')}</small></span><span class="pr"><img src="${icon('coin')}" alt="">${fee}</span></div>`;}).join('')+`<h3 style="margin-top:10px">For sale</h3>`+shopHTML(side.list);}
  if(k==='angler'){const q=anglerQuest(),nx=Object.keys(ANGLER_REWARD).map(Number).find(n=>n>angler.done),has=q&&countItem(q)>0;
    return (q?`<div class="sideTip"><b>Today's request</b>Catch me a ${ITEMS[q].name}. Try ${ANGLER_WHERE[q]}.</div><div class="shopi ${has?'':'poor'}" data-a="fishq"><img src="${icon(q)}" alt=""><span>Hand over a ${ITEMS[q].name}</span><span class="pr">${has?'Give':'Need 1'}</span></div>`
      :`<div class="sideTip"><b>All done for today</b>That was a fine catch. Come back tomorrow for a new request.</div>`)+`<p class="hint">Requests finished: ${angler.done}${nx?` · next prize at ${nx}: ${ITEMS[ANGLER_REWARD[nx][0]].name}`:''}</p>`+contestHTML()+recordHTML()+`<h3 style="margin-top:10px">For sale</h3>`+shopHTML(side.list);}
  if(k==='travel'){const list=[{n:'Home',x:player.spawn.x-.5,y:player.spawn.y}].concat((BIO.camps||[]).filter(c=>c.done).map((c,j)=>({n:`Camp ${j+1}`,x:c.sx,y:c.sy})));
    return list.map((w,j)=>{const d=Math.round((w.x-player.x)*2);return `<div class="shopi" data-w="${j}"><img src="${icon('tmap')}" alt=""><span>${w.n}<br><small style="color:var(--ink2)">${Math.abs(d)} ft ${d<0?'west':'east'}</small></span><span class="pr">Go</span></div>`;}).join('')+'<p class="hint">Rebuild more abandoned camps to add signposts.</p>';}
  if(k==='party'){const p=player;return `<h3>Partners</h3>`+PORDER.map(id=>{const d=PARTNERS[id],has=p.partners.includes(id);return `<div class="pcard ${p.partner===id?'on':''} ${has?'':'lock'}" data-p="${id}"><img src="${pPortrait(id)}" alt="" style="${has?'':'filter:grayscale(1) brightness(.6)'}"><div><b>${has?d.name:'???'}</b><span>${has?`${d.desc} Move: ${moveName(id)}. ${d.moveDesc}`:d.how}</span>${has&&palQuestTxt(id)?`<small class="pq">${palQuestTxt(id)}</small>`:''}</div></div>`;}).join('')+
    `<h3 style="margin-top:10px">Pets &amp; mount</h3>`+PETORDER.map(id=>{const d=PETS[id],has=countItem(d.item)>0;return `<div class="pcard ${p.pet===id?'on':''} ${has?'':'lock'}" data-pet="${id}"><img src="${icon(d.item)}" alt="" style="${has?'':'filter:grayscale(1) brightness(.6)'}"><div><b>${has?d.name:'???'}</b><span>${has?(p.pet===id?'Following you. Click to send it home.':'Click to call it.'):d.how}</span></div></div>`;}).join('')+
    Object.keys(MOUNTS).map(id=>{const d=MOUNTS[id],has=countItem(d.item)>0;return `<div class="pcard ${p.mount===id?'on':''} ${has?'':'lock'}" data-mount="${id}"><img src="${icon(d.item)}" alt="" style="${has?'':'filter:grayscale(1) brightness(.6)'}"><div><b>${has?d.name:'???'}</b><span>${has?(p.mount===id?'Riding. Click to get down.':`Mount. Click or press ${KEYNAME(SET.bind.mount)} to ride: ${Math.round((d.spd-1)*100)}% faster, higher jumps.`):d.how}</span></div></div>`;}).join('')+
    `<h3 style="margin-top:10px">Badges · BP ${bpUsed()} / ${bpMax()}</h3>`+(p.badges.length?p.badges.map(b=>{const[n,bp,d,cell]=BADGES[b];return `<div class="bdg ${p.badgesOn.includes(b)?'on':''}" data-b="${b}"><img src="${icon('b_'+b)}" alt=""><div><b>${n}</b><span>${d}</span></div><em>${bp} BP</em></div>`;}).join(''):'<p class="hint">No badges yet. Bosses, chests, the Merchant and the Tinkerer all have them.</p>')+`<p class="hint">Click a badge to equip or remove it. Each boss you defeat adds 3 BP.</p>`;}
  if(k==='bestiary'){const found=BEST.filter(r=>bestiary[r[0]]).length;return `<p class="hint" style="margin-top:0">${found} of ${BEST.length} entries filled in. Defeat an enemy to sketch it here.</p>`+BEST.map(([t,name,where])=>{const b=bestiary[t];
      if(!b)return `<div class="bst lock"><img src="${bestSketch(t)}" alt=""><div><b>???</b><span>${where}</span></div></div>`;
      const d=EN[t],known=d.drops.filter(([id])=>b.d[id]),unk=d.drops.length-known.length;
      return `<div class="bst"><img src="${bestSketch(t)}" alt=""><div><b>${name}</b><span>${where}</span><span>Defeated ${b.k}${b.e?` · ${b.e} elite`:''} · ${d.hp} HP</span>${d.weak||d.res?`<span>${[d.weak&&'Weak to '+ELEM[d.weak].name,d.res&&'Resists '+ELEM[d.res].name].filter(Boolean).join(' · ')}</span>`:''}<span class="bdrops">${known.map(([id])=>`<i title="${ITEMS[id].name}"><img src="${icon(id)}" alt="">${ITEMS[id].name}</i>`).join('')}${unk?`<i class="q">${known.length?'+ ':''}${unk} unknown drop${unk>1?'s':''}</i>`:''}${!d.drops.length?'<i class="q">Drops coins only</i>':''}</span></div></div>`;}).join('');}
  if(k==='story')return loreHTML();
  if(k==='museum')return hasNPC('curator')?museumHTML():`<div class="sideTip"><b>No museum yet</b>The Curator ${NPCDEF.curator.need.replace(/^Arrives/,'arrives')}</div><p class="hint">Fossils, fish, ores and curiosities you find now can all be donated once the museum opens.</p>`;
  if(k==='town'){return NPCORDER.map(t=>{const n=npcs.find(n=>n.type===t&&n.home);const d=NPCDEF[t];return `<div class="npcRow ${n?'home':''}"><img src="${portrait(t)}" alt=""><div><b>${d.name}</b><span>${n?'<span class="ok">Has a home</span>':d.ok()?'Ready to move in. Stand in an empty house and press Check this room.':d.need}</span></div></div>`;}).join('')+`<p class="hint">A house needs walls behind it, a door, a light, a table and a chair, and must not contain your bed.</p><h3 style="margin-top:10px">${townLevel()} · upgrades</h3>`+TOWN.map(u=>`<div class="npcRow tup ${town.f[u.id]?'home':''}"><div><b>${town.f[u.id]?'✓ ':''}${u.n}</b><span>${town.f[u.id]?'<span class="ok">Built</span>':u.need}</span></div></div>`).join('')+`<p class="hint">The town green beside your cabin grows as townsfolk move in and quests are finished.</p>`;}
  return '';}
export const bestCache={};
function bestSketch(t){if(bestCache[t])return bestCache[t];const d=EN[t],src=SHEETS[d.sheet],c=mk(64,64),g=c.getContext('2d'),s=Math.min(60/d.fw,60/d.fh);g.drawImage(src,0,0,d.fw,d.fh,32-d.fw*s/2,32-d.fh*s/2,d.fw*s,d.fh*s);return bestCache[t]=c.toDataURL();}
function renderSide(){if(!side||side.kind==='chest')return;const html=sideHTML();if($('sideBody').dataset.h!==html){$('sideBody').innerHTML=html;$('sideBody').dataset.h=html;}}
function renderShop(){renderSide();}
$('sideBody').addEventListener('mousedown',e=>{if(side&&side.kind==='travel'){const el=e.target.closest('.shopi');if(!el)return;const list=[{x:player.spawn.x-.5,y:player.spawn.y}].concat((BIO.camps||[]).filter(c=>c.done).map(c=>({x:c.sx,y:c.sy})));const w=list[+el.dataset.w];if(w)travelTo(w.x,w.y);return;}
  if(side&&side.kind==='party'){const pc=e.target.closest('.pcard'),bd=e.target.closest('.bdg');
    if(pc&&(pc.dataset.pet||pc.dataset.mount)){const k=pc.dataset.pet||pc.dataset.mount,d=(pc.dataset.pet?PETS:MOUNTS)[k];if(countItem(d.item)>0){if(pc.dataset.pet)togglePet(k);else toggleMount(k);}$('sideBody').dataset.h='';invDirty=true;return;}if(pc&&player.partners.includes(pc.dataset.p)){setPartner(pc.dataset.p);SFX.pick();}else if(bd){const b=bd.dataset.b,on=player.badgesOn;if(on.includes(b))on.splice(on.indexOf(b),1);else if(bpUsed()+BADGES[b][1]>bpMax()){toast(`Not enough BP. ${BADGES[b][0]} needs ${BADGES[b][1]}.`,'bad');return;}else on.push(b);SFX.pick();}$('sideBody').dataset.h='';invDirty=true;return;}
  const el=e.target.closest('.shopi');if(!el||!side)return;$('sideBody').dataset.h='';invDirty=true;
  if(el.dataset.a==='fishq'){anglerTurnIn();return;}if(el.dataset.a==='contest'){contestClaim();renderSide();return;}
  if(el.dataset.q){folkClick(el.dataset.q);return;}if(el.dataset.m){donate(el.dataset.m);return;}
  if(el.dataset.a==='heal'){const miss=Math.ceil(player.max-player.hp),cost=Math.max(1,Math.ceil(miss*.8)+(player.potT>0?10:0));if(player.coins<cost){toast('Not enough coins.','bad');return;}player.coins-=cost;updateCoins();if(miss>0)heal(miss);player.potT=0;SFX.potion();return;}
  if(el.dataset.t!=null){const[out,parts,fee]=TINKER[+el.dataset.t];if(player.coins<fee){toast('Not enough coins.','bad');return;}
    for(const id of parts){if(!(countItem(id)>0||player.acc.some(s=>s&&s.id===id))){toast(`You need a ${ITEMS[id].name}.`,'bad');return;}}
    for(const id of parts){if(countItem(id)>0)removeItem(id,1);else{const k=player.acc.findIndex(s=>s&&s.id===id);player.acc[k]=null;}}
    player.coins-=fee;updateCoins();const left=addItem(out,1);if(left)dropItem(out,1,player.x,player.y+1);SFX.craft();toast(`Tinkered a ${ITEMS[out].name}!`,'gold');return;}
  if(el.dataset.s==null)return;const list=side.list||SHOP;const[id,p]=list[+el.dataset.s];const qty=e.shiftKey?10:1;let bought=0;for(let k=0;k<qty;k++){if(player.coins<p)break;player.coins-=p;bought++;}
  if(!bought){toast('Not enough coins.','bad');return;}updateCoins();if(side.key==='traveler')stat('travbuys');const left=addItem(id,bought);if(left)dropItem(id,left,player.x,player.y+1);SFX.coin();});
export function openSide(kind,key,list,title,line){side={kind,key,list,line,title:title||'Merchant'};$('sideSheet').hidden=false;$('panel').classList.add('withSide');$('sideBody').dataset.h='';
  if(kind==='chest'){$('sideTitle').textContent='Chest';$('sideBody').innerHTML='<div class="grid"></div><p class="hint">Shift-click to move stacks between chest and backpack.</p>';const g=$('sideBody').querySelector('.grid');sideEls=[];for(let i=0;i<20;i++){const el=mkSlot('chest',i,g);el.dataset.k='x';sideEls.push(el);}}
  else{$('sideTitle').textContent=title||(kind==='town'?'Town':'Merchant');renderSide();}if(!invOpen)setInv(true);else turnPage($('sideSheet'));syncTabs();}
// ================= pages =================
// Tabs over the backpack: Backpack tucks the crafting sheet away, Crafting brings it back, and the others open
// their page on the left with a page turn. Chests, shops and townsfolk open their own page with no tab lit.
// [tab, title, icon item or null for the partner's portrait]
const TABS=[['inv','Backpack','chest'],['craft','Crafting','bench'],['party','Party',null],['bestiary','Bestiary','lens'],['museum','Museum','fos_amm'],['town','Town','lanternp'],['story','Journal',C.murals[0]]];
let craftOn=true;
function turnPage(el){SFX.rustle(.25,.5);if(reduceMotion())return;el.classList.remove('turn');void el.offsetWidth;el.classList.add('turn');}
function closeSide(){side=null;$('sideSheet').hidden=true;$('panel').classList.remove('withSide');}
function curTab(){return side?(TABS.some(t=>t[0]===side.kind)?side.kind:''):craftOn?'craft':'inv';}
function syncTabs(){const on=curTab();for(const b of $('tabs').children){const t=TABS.find(t=>t[0]===b.dataset.tab),a=t[0]===on;b.classList.toggle('on',a);b.setAttribute('aria-selected',a);
  b.querySelector('img').src=typeof t[2]==='number'?cellIcon(t[2]):t[2]?icon(t[2]):pPortrait(player.partner||'lumi');if(t[0]==='museum')b.classList.toggle('lock',!hasNPC('curator'));if(t[0]==='party')b.classList.toggle('lock',!player.partners.length);}}
export function setTab(k){if(k==='inv'||k==='craft'){const was=craftOn;craftOn=k==='craft';$('craft').hidden=!craftOn;if(side)closeSide();if(craftOn&&!was)turnPage($('craft'));else SFX.pick();syncTabs();invDirty=true;return;}
  openSide(k,null,null,TABS.find(t=>t[0]===k)[1]);}
// gamepad LB: the next tab along (a chest or shop page counts as sitting before the first one)
export function cycleTab(d=1){const i=TABS.findIndex(t=>t[0]===curTab());setTab(TABS[(i+d+TABS.length)%TABS.length][0]);}
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.tab);});
// a first meeting or a fresh memory line is staged as dialogue first, and the NPC's panel opens after it
export function talkTo(n){const raw=npcLine(n.type);if(lineNew){say(npcSpeaker(n),raw,{done:()=>openTalk(n,plain(raw))});}else openTalk(n,plain(raw),1);}
function openTalk(n,line,bub){const d=NPCDEF[n.type],t=n.type;SFX.pick();
  if(t==='merchant')openSide('shop',null,townShop(SHOP),'Merchant',line);else if(t==='painter')openSide('shop',null,SHOPS.painter,'Painter',line);else if(t==='nurse')openSide('nurse',null,null,'Nurse',line);else if(t==='guide')openSide('guide',null,null,'Guide',line);else if(t==='angler')openSide('angler',null,SHOPS.angler,'Angler',line);else if(t==='tinkerer')openSide('tinker',null,SHOPS.tinkerer,'Tinkerer',line);
  else openSide('folk',t,t==='traveler'?(wev.trav?wev.trav.stock:[]):SHOPS[t],d.name,line);
  if(n.bub){n.bub.remove();n.bub=null;}if(!bub)return;n.bub=document.createElement('div');n.bub.className='bubble';n.bub.textContent=line;$('nums').appendChild(n.bub);n.bubLife=3;n.bubT=10;}
export function setInv(o){if(!o){if(padFocus)padFocus.classList.remove('padfocus');setPadFocus(null);$('padHint').hidden=true;}if(!o&&side&&!$('sideSheet').hidden){}invOpen=o;$('help').hidden=o;$('panel').hidden=!o;$('hotwrap').style.visibility=o?'hidden':'visible';if(o){$('craft').hidden=!craftOn;syncTabs();}if(!o){closeSide();if(cursor){const l=addItem(cursor.id,cursor.n);if(l)dropItem(cursor.id,l,player.x,player.y+1);cursor=null;}$('tip').hidden=true;}
  gridEls.concat(armorEls,accEls).forEach(el=>el.dataset.k='x');craftKey='';invDirty=true;}
function canGo(kind,i,s){if(!s)return true;const it=ITEMS[s.id];if(kind==='armor')return it.slot===i;if(kind==='acc')return !!it.acc&&!player.acc.some((a,k)=>k!==i&&a&&a.id===s.id);return true;}
export function slotClick(el,btn,shift){const kind=el.dataset.kind,i=+el.dataset.i;let s=slotData(kind,i);
  if(!invOpen){if(kind==='inv'&&i<10){player.sel=i;invDirty=true;}return;}
  if(shift&&btn===0&&s){ // quick move / sell / equip
    if(side&&side.kind==='shop'&&kind==='inv'){const v=Math.max(1,Math.floor(ITEMS[s.id].value/5))*s.n;player.coins+=v;updateCoins();setSlot(kind,i,null);SFX.coin();toast(`Sold ${ITEMS[s.id].name} for ${v} coins`);return;}
    if(kind==='inv'&&side&&side.kind==='chest'){const box=chests.get(side.key);let n=s.n;for(let k=0;k<20&&n>0;k++){const b=box[k];if(b&&b.id===s.id&&b.n<maxOf(s.id)){const m=Math.min(n,maxOf(s.id)-b.n);b.n+=m;n-=m;}}for(let k=0;k<20&&n>0;k++)if(!box[k]){box[k]={id:s.id,n};n=0;}if(n)s.n=n;else setSlot(kind,i,null);invDirty=true;return;}
    if(kind==='inv'){const it=ITEMS[s.id];if(it.slot!=null){const old=player.armor[it.slot];player.armor[it.slot]=s;player.inv[i]=old;player.sheetDirty=true;invDirty=true;return;}if(it.acc){const k=player.acc.findIndex(a=>!a);if(k>=0&&canGo('acc',k,s)){player.acc[k]=s;player.inv[i]=null;invDirty=true;}return;}
      // move between hotbar and pack
      const range=i<10?[10,40]:[0,10];for(let k=range[0];k<range[1];k++)if(!player.inv[k]){player.inv[k]=s;player.inv[i]=null;invDirty=true;return;}return;}
    const left=addItem(s.id,s.n);if(left)s.n=left;else setSlot(kind,i,null);invDirty=true;return;}
  if(btn===0){if(cursor&&s&&cursor.id===s.id&&kind!=='armor'&&kind!=='acc'){const k=Math.min(cursor.n,maxOf(s.id)-s.n);s.n+=k;cursor.n-=k;if(!cursor.n)cursor=null;invDirty=true;return;}
    if(!canGo(kind,i,cursor))return;setSlot(kind,i,cursor);cursor=s;SFX.pick();}
  else if(btn===2){if(!cursor&&s){const k=Math.ceil(s.n/2);cursor={id:s.id,n:k};s.n-=k;if(!s.n)setSlot(kind,i,null);}else if(cursor&&kind!=='armor'&&kind!=='acc'){if(!s){setSlot(kind,i,{id:cursor.id,n:1});cursor.n--;}else if(s.id===cursor.id&&s.n<maxOf(s.id)){s.n++;cursor.n--;}if(cursor.n<=0)cursor=null;}}
  invDirty=true;}
document.addEventListener('mousedown',e=>{const el=e.target.closest&&e.target.closest('.slot');if(!el)return;e.preventDefault();initAudio();slotClick(el,e.button,e.shiftKey);});
// Item cards: a large card with the item's picture, kind, stats and description, shown on hover or gamepad focus
// for backpack, gear and chest slots and for crafting recipes.
const KIND=it=>it.pick&&it.dmg?'Tool & weapon':it.pick?'Tool':it.rod?'Fishing rod':it.dmg?(it.ranged?'Ranged weapon':it.magic?'Magic weapon':it.use==='throw'?'Throwing weapon':it.heavy?'Heavy weapon':'Weapon')
  :it.slot!=null?['Helmet','Chest armor','Leggings'][it.slot]:it.block?'Shield':it.acc?'Accessory':it.bait?'Bait':it.adm?'Ammo':it.use?'Use item':it.place!=null||it.wall?'Placeable':'Material';
function itemCard(id,n,extra=''){const it=ITEMS[id];const lines=[],et=it.elem||(it.proj&&PK[it.proj]&&PK[it.proj].elem);if(it.dmg)lines.push(`${it.dmg} damage`);if(et)lines.push(`${ELEM[et].name} type`);if(it.heavy)lines.push('Heavy');if(it.block)lines.push(`Blocks ${Math.round(it.block*100)}% of a hit`);if(it.ranged)lines.push(it.ammo==='arrow'?'Uses arrows · hold to draw':'Uses Paper Sheets');if(it.magic)lines.push(`${it.mana} mana per cast`);if(it.adm)lines.push(`+${it.adm} damage as ammo`);if(it.pick)lines.push(`Pick power ${it.pick}`);if(it.rod)lines.push(`Fishing power ${it.fpow}${it.lava?' · Fishes in lava':''}`);if(it.bait)lines.push(`Bait power ${it.bait}`);if(it.def)lines.push(`+${it.def} defense`);if(it.place!=null||it.wall)lines.push('Can be placed');
  return `<div class="icard"><div class="icArt"><img src="${icon(id)}" alt=""></div><div class="icHead"><b>${it.name}</b><small>${KIND(it)}${n>1?` · ×${n}`:''}</small></div></div>${lines.length?`<div class="st">${lines.join(' · ')}</div>`:''}${it.desc?`<div class="ds">${it.desc}</div>`:''}${it.block?`<div class="ds">Wear it in an accessory slot, then hold right-click (or ${KEYNAME(SET.bind.block)}) to block. Raise it just as a hit lands to parry.</div>`:''}${extra}`;}
document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('.slot,.rec');hoverSlot=el&&el.classList.contains('slot')?el:null;if(!el){$('tip').hidden=true;return;}
  if(el.classList.contains('rec')){const r=RECIPES[+el.dataset.r];if(!r){$('tip').hidden=true;return;}$('tip').innerHTML=itemCard(r[0],r[1],`<div class="ds mk">${el.classList.contains('can')?'Click to craft · Shift-click for 5':'Missing something'}${r[3]?` · at ${ITEMS[r[3]].name}`:''}</div>`);$('tip').hidden=false;placeTip(e.clientX+16,e.clientY+14);return;}
  const s=slotData(el.dataset.kind,+el.dataset.i);if(!s){$('tip').hidden=true;return;}
  $('tip').innerHTML=itemCard(s.id,s.n,side&&side.kind==='shop'&&el.dataset.kind==='inv'?`<div class="ds mk">Sells for ${Math.max(1,Math.floor(ITEMS[s.id].value/5))*s.n} coins</div>`:'');$('tip').hidden=false;placeTip(e.clientX+16,e.clientY+14);});
$('houseBtn').addEventListener('click',()=>{tryMoveIn(checkRoom(Math.floor(player.x),Math.floor(player.y+.5)),true);});
$('sortBtn').addEventListener('click',()=>{const rest=player.inv.slice(10).filter(Boolean);const merged=[];for(const s of rest){const m=merged.find(x=>x.id===s.id&&x.n<maxOf(s.id));if(m){const k=Math.min(s.n,maxOf(s.id)-m.n);m.n+=k;s.n-=k;if(s.n)merged.push(s);}else merged.push(s);}const order=Object.keys(ITEMS);merged.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));for(let i=10;i<40;i++)player.inv[i]=merged[i-10]||null;invDirty=true;});
export let heartsKey='';
export function renderHearts(){const per=20,n=Math.ceil(player.max/per);const key=player.hp+'/'+player.max+'/'+Math.floor(player.mana)+'/'+player.maxMana;if(key===heartsKey)return;heartsKey=key;let h='';for(let i=0;i<n;i++){const f=clamp((player.hp-i*per)/per,0,1);h+=`<img src="${icon('heart')}" alt="" style="opacity:${f>0?1:.28};transform:scale(${f>0?.65+.35*f:.8});filter:${f>0?'none':'grayscale(1)'}">`;}$('hearts').innerHTML=h;
  let m='';for(let i=0;i<player.maxMana/20;i++){const f=clamp((player.mana-i*20)/20,0,1);m+=`<img src="${icon('manacrystal')}" alt="" style="opacity:${f>0?1:.3};transform:scale(${f>0?.6+.4*f:.75});filter:${f>0?'none':'grayscale(1)'}">`;}$('mana').innerHTML=m;
  $('hpTxt').textContent=`Life ${Math.ceil(player.hp)} / ${player.max} · Mana ${Math.floor(player.mana)} / ${player.maxMana}`;}
export function renderQuests(){$('quests').innerHTML='<b>Journal</b>'+QUESTS.map(([k,t])=>`<div class="${quests[k]?'done':''}"><i></i>${t}</div>`).join('')+sideJournal()+palJournal();}
export function updateCoins(){$('coins').innerHTML=`<img src="${icon('coin')}" alt="">${player.coins}`;}
export function toast(msg,cls=''){const d=document.createElement('div');d.className='toast '+cls;d.textContent=msg;$('toasts').appendChild(d);while($('toasts').children.length>5)$('toasts').firstChild.remove();setTimeout(()=>{d.style.transition='opacity .4s';d.style.opacity=0;setTimeout(()=>d.remove(),400);},3800);}
const nums=[];export const pv=new THREE.Vector3();
export function floatText(x,y,txt,cls=''){if(!SET.nums&&cls!=='nice'&&cls!=='miss')return;const d=document.createElement('div');d.className='num '+cls;d.textContent=txt;$('nums').appendChild(d);nums.push({d,x:x+rand(-.3,.3),y,t:0,max:cls==='nice'?1.1:.8});}
export function updateNums(dt){for(let i=nums.length-1;i>=0;i--){const n=nums[i];n.t+=dt;if(n.t>n.max){n.d.remove();nums.splice(i,1);continue;}pv.set(n.x,n.y+n.t*1.6,.5).project(camera);const k=n.t/n.max;n.d.style.left=upx((pv.x+1)/2*innerWidth);n.d.style.top=upx((1-pv.y)/2*innerHeight);n.d.style.opacity=k>.7?(1-k)/.3:1;n.d.style.transform=`translate(-50%,-50%) scale(${n.t<.1?.6+n.t*4:1})`;}}

// ================= housing & merchant =================
export function checkRoom(sx,sy){if(sx<1||sy<1||sx>=W-1||sy>=H-1||OPAQUE[tileAt(sx,sy)])return{ok:false,why:'Stand inside the room you want to check.'};
  const seen=new Set([idx(sx,sy)]);const st=[idx(sx,sy)];let door=false,light=false,table=false,chair=false,bed=false,wallMiss=false,minX=1e9,maxX=-1,minY=1e9;
  while(st.length){const i=st.pop();const x=i%W,y=(i/W)|0;if(seen.size>420)return{ok:false,why:'This space is too big or has an opening. Close it in with blocks and a door.'};
    const t=tiles[i];if(t===T.TORCH||t===T.LANTERNP||t===T.CANDLE)light=true;if(t===T.TABLE||t===T.BENCH||t===T.SHELF||t===T.ALCHEMY)table=true;if(t===T.CHAIR||t===T.ARMCHAIR)chair=true;if(t===T.BED)bed=true;if(walls[i]<2)wallMiss=true;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);
    for(const n of[i-1,i+1,i-W,i+W]){const nx=n%W,ny=(n/W)|0;if(nx<=0||ny<=0||nx>=W-1||ny>=H-1)return{ok:false,why:'This space is not closed in.'};const nt=tiles[n];if(nt===T.DOOR||nt===T.PLATFORM){door=true;continue;}if(OPAQUE[nt])continue;if(!seen.has(n)){seen.add(n);st.push(n);}}}
  if(seen.size<24)return{ok:false,why:'This room is too small. Aim for at least 6 wide and 4 tall inside.'};
  if(wallMiss)return{ok:false,why:'Part of the room has no background wall. Place Wood Walls behind it.'};
  if(!door)return{ok:false,why:'The room needs a door.'};if(!light)return{ok:false,why:'The room needs a light, like a torch, lantern or candle.'};
  if(!table)return{ok:false,why:'The room needs a table or workbench.'};if(!chair)return{ok:false,why:'The room needs a chair.'};
  return{ok:true,bed,minX,maxX,minY,seen};}
export const NPCDEF={
  merchant:{name:'Merchant',need:'Moves into the first empty house.',ok:()=>true,hello:'{happy}A roof and four walls! {surprised}Is that a *customer?* {happy}Torches, potions, fair prices. Mostly fair.',
    lines:['Torches! Potions! Things that go on your face!','Coins are just paper with ambition.','Mind the slimes. They stain.']},
  guide:{name:'Guide',need:'Arrives once the Merchant has a home.',ok:()=>hasNPC('merchant'),hello:'{happy}Hello, traveler! I am the Guide. Hold anything up and I will tell you what it *makes.*',
    lines:['Hold anything and ask me what it makes.','Every boss drops the key to the next ore.','Stuck? Talk to me. That is literally my job.']},
  painter:{name:'Painter',need:'Arrives once two townsfolk have homes.',ok:()=>npcs.filter(n=>n.home).length>=2,hello:'{sad}These walls are so *plain.* {happy}Give me a week and some paint and this town will ~sparkle~.',
    lines:['A room without art is just a box.','Paper walls! In colors!','Hold still, you have a lovely silhouette.']},
  nurse:{name:'Nurse',need:'Arrives when your max life is over 100.',ok:()=>player.max>100&&hasNPC('merchant'),hello:'{surprised}Look at those creases! {happy}Good thing I brought *glue and ribbon.*',
    lines:['Crumpled again? Let me smooth that out.','Drink water. Avoid lava.','I patch paper, not pride.']},
  tinkerer:{name:'Tinkerer',need:'Arrives after you defeat any boss.',ok:()=>(quests.king||quests.crane||quests.lev||quests.folio)&&hasNPC('merchant'),hello:'{happy}You beat a *boss* with that gear? {surprised}Bring it here, I can make it ~better~.',
    lines:['Bring me two gadgets and I will make one better gadget.','Glue, string and optimism.','A Tool Belt! Changes lives!']},
  angler:{name:'Angler',need:'Arrives once you have caught a fish.',ok:()=>angler.caught>0&&hasNPC('merchant'),hello:'{surprised}You caught a fish? *Here?* {happy}Then this is my kind of town.',
    lines:['Fish bite better in the rain. Everyone knows that.','The Ink Lake is the deepest pool around. Big bites.','I once caught a koi folded from a thousand cranes. Honest.']},
  farmer:{name:'Farmer',need:'Arrives once you have harvested a grown crop.',ok:()=>(folk.n.harvest||0)>0&&hasNPC('merchant'),hello:'{happy}Saw your crops coming up and thought: that is a town that needs a *farmer.* Got a spare room?',
    lines:['Crops under a roof ignore the weather. Crops outside sulk in winter.','Paper Wheat loves the fall. So do I.','Seeds! Seeds for every soil!']},
  scout:{name:'Cartographer',need:'Arrives once you have explored three regions.',ok:()=>visited.size>=3&&hasNPC('merchant'),hello:'{surprised}You have been *all over!* {happy}I make maps. {sad}Well, I *start* maps. {happy}Help me finish one?',
    lines:['North is up. Usually.','Every blank page on a map is a promise.','I once mapped a cave that turned out to be a very large bat.']},
  curator:{name:'Curator',need:'Arrives once three townsfolk have homes and you have found a fossil or caught a fish.',ok:()=>npcs.filter(n=>n.home).length>=3&&((folk.n.fossil||0)>0||angler.caught>0),
    hello:'{angry}A town with no museum? *Unthinkable!* {happy}I will open one right here. Bring me fossils, fish and curiosities.',
    lines:['Please do not touch the exhibits. Unless you are donating them.','Every find tells a story. Most of them are about dirt.','A museum is a library of things.']},
  traveler:{name:'Traveling Merchant',need:'Visits now and then, from dawn until dusk.',ok:()=>false,hello:'{happy}Wares from *far-off pages!* Buy now, I am ~gone by nightfall~.',
    lines:['Rare goods, fair prices. Well, rare goods.','I have folded myself across a dozen maps.','Tomorrow I will be three biomes away.']},
};
// the Angler's festival fishing contest and record book (the biggest of each fish you have caught)
function contestHTML(){const fe=festival();if(!fe)return '';const f=angler.fest&&angler.fest.d===worldDay?angler.fest:null;
  if(f&&f.got)return `<div class="sideTip"><b>${fe.fest} fishing contest</b>You already took today's prize. Well fished!</div>`;
  return `<div class="sideTip quest"><b>${fe.fest} fishing contest</b>Today only: the biggest catch for its kind wins. Legendary fish score half again.<small>${f&&f.id?`Your best: ${ITEMS[f.id].name}, ${f.cm} cm, ${f.sc} points.`:'Catch something today to enter.'} Prizes at 70 and 120 points.</small></div>`+
    (f&&f.id?`<div class="shopi" data-a="contest"><img src="${icon(f.id)}" alt=""><span>Enter your ${ITEMS[f.id].name}</span><span class="pr">Judge</span></div>`:'');}
function recordHTML(){const ids=Object.keys(FISH),n=ids.filter(id=>angler.rec[id]).length;
  return `<h3 style="margin-top:10px">Record book · ${n} of ${ids.length}</h3><div class="musG">`+ids.map(id=>{const r=angler.rec[id];return `<div class="shopi mus ${r?'done':'poor'}" title="${r?ITEMS[id].name:'Not caught yet'}"><img src="${icon(id)}" alt="" style="${r?'':'filter:grayscale(1) brightness(.5)'}"><span>${r?ITEMS[id].name:'???'}</span><span class="pr">${r?r+' cm':''}</span></div>`;}).join('')+'</div>';}
export const NPCORDER=['merchant','guide','painter','nurse','tinkerer','angler','farmer','scout','curator'];
const TINKER=[['kite',['glider','ribbon'],100],['beacon',['lantern','buckler'],100],['quilt',['patch','buckler'],60]];
const SHOPS={painter:[['paint1',40],['paint2',40],['paint3',40],['paint4',40],['banr',25],['banb',25],['bang',25],['wallred',2],['wallblue',2],['wallgreen',2],['wallyellow',2]],
  tinkerer:[['b_quick',200],['b_feather',180],['bpup',400],['toolbelt',150],['magnet',120],['hook',150],['rope',1]],
  angler:[['fly',2],['glowlure',8],['rodwood',40],['potfish',30],['bucket',60],['seed_sun',5]],
  farmer:[['seed_sun',4],['seed_wheat',4],['seed_frost',8],['seed_ink',10],['seed_sunf',25],['pot',20],['bucket',60]],
  scout:[['tmap',120],['rope',1],['torch',4],['potnight',40],['lanternp',30],['glider',420]]};
export const hasNPC=t=>npcs.some(n=>n.type===t&&n.home);
export function makeNPC(type,x,y,home){const old=npcs.find(n=>n.type===type);if(old){scene.remove(old.mesh);if(old.bub)old.bub.remove();npcs.splice(npcs.indexOf(old),1);}
  const n={type,x,y,w:.78,h:1.82,vx:0,vy:0,face:1,rot:0,t:rand(0,3),timer:2,home,step:1,onGround:false,bubT:rand(2,6)};if(home&&home.key==null)home.key=idx(Math.floor((home.minX+home.maxX)/2),home.y);
  n.rig=makeRig('human',FOLK[type],type);n.mesh=n.rig.mesh;n.mesh.position.z=.12+npcs.length*.004;npcs.push(n);return n;}
export function tryMoveIn(r,loud){if(!r.ok){if(loud)toast(r.why,'bad');return;}if(r.bed){if(loud)toast('This room has your bed, so it is your home.','good');return;}
  const taken=npcs.find(n=>n.home&&r.seen.has(n.home.key));if(taken){if(loud)toast(`Nice room! The ${NPCDEF[taken.type].name} lives here.`,'good');return;}
  const next=NPCORDER.find(t=>!hasNPC(t)&&NPCDEF[t].ok());if(!next){if(loud){const wait=NPCORDER.find(t=>!hasNPC(t));toast(wait?`Good room, but nobody is ready to move in. ${NPCDEF[wait].name}: ${NPCDEF[wait].need}`:'Everyone in town already has a home.','good');}return;}
  const x=(r.minX+r.maxX)/2+.5,y=r.minY;const home={minX:r.minX,maxX:r.maxX,y:r.minY,key:idx(Math.floor((r.minX+r.maxX)/2),r.minY)};makeNPC(next,x,y,home);{const h=houses.find(o=>r.seen&&r.seen.has(o.key));if(h){const sx=h.sx,sy=h.sy,op=h.open,tg=h.target;dropHouse(h);const nh=registerHouseAt(sx,sy);if(nh){nh.open=op;nh.target=tg;}}}
  toast(`The ${NPCDEF[next].name} has moved in! Right-click to talk.`,'gold');if(next==='merchant'){questDone('house');stat('merchant');}syncPartners();burst(x,y+1,['#f1c04f','#fbf8f0','#3f7a3b'],24,5);SFX.nice();checkAch();}
export const portraitCache={};
function portrait(type){if(portraitCache[type])return portraitCache[type];const c=mk(80,80);c.getContext('2d').drawImage(SHEETS[type],8,8,80,80,0,0,80,80);return portraitCache[type]=c.toDataURL();}
// Imported bindings are read-only, so other modules assign these through setters.
export function setCursor(v){return cursor=v;}
export function setInvDirty(v){return invDirty=v;}
export function setHeartsKey(v){return heartsKey=v;}
