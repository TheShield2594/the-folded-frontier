// Inventory, crafting, tooltips and toasts; housing and the merchant.
import * as THREE from 'three';
import {
  reduceMotion,
  $,addItem,angler,TRAITS,ANGLER_REWARD,ANGLER_WHERE,anglerQuest,anglerTurnIn,BADGES,BEST,bestiary,BIO,bpMax,
  bpUsed,burst,camera,checkAch,chests,clamp,countAmmo,countBait,countItem,defense,dropHouse,dropItem,
  ELEM,EN,H,heal,houses,icon,idx,initAudio,ITEMS,KEYNAME,actName,pad,maxOf,mk,npcs,OPAQUE,padFocus,PARTNERS,pick,PK,
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
  SETS,setCount,fullSet,
  binderHTML,cards,
  TRICKS,
  CARDS,RARITY,loreRead,readLore,facePic,setMul,hasAcc,hasBadge,hasBuff,isNight,BUFFS,
} from './game.js';

// ================= UI =================
export let invOpen=false,side=null,cursor=null,invDirty=true,hoverSlot=null;
const hotbarEl=$('hotbar'),gridEl=$('grid');
function mkSlot(kind,i,parent,ph){const el=document.createElement('div');el.className='slot';el.dataset.kind=kind;el.dataset.i=i;if(ph){el.classList.add('ph');el.dataset.ph=ph;}parent.appendChild(el);return el;}
const hotEls=[],gridEls=[],armorEls=[],accEls=[];let sideEls=[];
for(let i=0;i<10;i++){hotEls.push(mkSlot('inv',i,hotbarEl));}
for(let i=0;i<40;i++)gridEls.push(mkSlot('inv',i,gridEl));
// the gear slots stand either side of the hero on the Hero page: armor down the left, accessories down the right
['Head','Body','Legs'].forEach((l,i)=>{armorEls.push(mkSlot('armor',i,$('heroArmor'),l));accEls.push(mkSlot('acc',i,$('heroAcc'),'Acc'));});
function slotData(kind,i){if(kind==='inv')return player.inv[i];if(kind==='armor')return player.armor[i];if(kind==='acc')return player.acc[i];if(kind==='chest')return chests.get(side.key)[i];return null;}
function setSlot(kind,i,v){if(kind==='inv'&&v&&v.id==='coin'){player.coins+=v.n;updateCoins();v=null;}if(kind==='inv')player.inv[i]=v;else if(kind==='armor'){player.armor[i]=v;player.sheetDirty=true;}else if(kind==='acc')player.acc[i]=v;else if(kind==='chest')chests.get(side.key)[i]=v;invDirty=true;}
function paint(el,s){const key=s?s.id+':'+s.n:'';if(el.dataset.k===key)return;el.dataset.k=key;const kl=el.querySelector('.k');el.innerHTML=s?`<img src="${icon(s.id)}" alt="${ITEMS[s.id].name}"><b>${s.n>1?s.n:''}</b>`:'';if(el.parentNode===hotbarEl||el.parentNode===gridEl){const i=+el.dataset.i;if(i<10){const k=document.createElement('span');k.className='k';k.textContent=(i+1)%10;el.appendChild(k);}}if(s)el.classList.remove('ph');else if(el.dataset.ph)el.classList.add('ph');}
export function refreshUI(){if(padFocus&&!document.body.contains(padFocus))setPadFocus(null);hotEls.forEach((el,i)=>{paint(el,player.inv[i]);el.classList.toggle('sel',i===player.sel);});
  if(invOpen){gridEls.forEach((el,i)=>{paint(el,player.inv[i]);el.classList.toggle('sel',i===player.sel);});armorEls.forEach((el,i)=>paint(el,player.armor[i]));accEls.forEach((el,i)=>paint(el,player.acc[i]));
    if(side&&side.kind==='chest')sideEls.forEach((el,i)=>paint(el,chests.get(side.key)[i]));$('defTxt').textContent=`Defense ${defense()}`;renderCraft();if(side&&side.kind==='hero')renderHero();else if(side&&side.kind!=='chest')renderSide();}
  const it=selItem();$('itemName').textContent=it?it.name+(it.ammo?` · ${countAmmo(it.ammo)} ${it.ammo==='arrow'?'arrows':'paper'}`:'')+(it.magic?` · ${it.mana} mana`:'')+(it.rod?` · ${countBait()} bait`:''):'';
  if(cursor){$('cursorItem').hidden=false;$('cursorItem').innerHTML=`<img src="${icon(cursor.id)}" alt=""><b>${cursor.n>1?cursor.n:''}</b>`;}else $('cursorItem').hidden=true;invDirty=false;}
function stationsNear(){const s={bench:false,furnace:false,anvil:false,alchemy:false};const px=Math.floor(player.x),py=Math.floor(player.y+.5);for(let y=py-3;y<=py+4;y++)for(let x=px-5;x<=px+5;x++){const t=tileAt(x,y);if(t===T.BENCH)s.bench=true;else if(t===T.ALCHEMY)s.alchemy=true;else if(t===T.FURNACE)s.furnace=true;else if(t===T.ANVIL)s.anvil=true;}return s;}
let craftKey='';
// recipe filters over the crafting list: a category chip (read from the item's own fields), a search that matches the
// recipe or any ingredient, and Can make (only what can be crafted here and now); each chip counts what it can make
const CCAT=[['all','All'],['tool','Tools'],['weapon','Weapons'],['armor','Armor'],['gear','Gear','Accessories, shields, pets and mounts'],['potion','Potions','Potions and food'],['build','Building','Blocks, walls, furniture and stations'],['other','Other','Bars, boss summons and the rest']];
export function craftCat(id){const it=ITEMS[id];if(it.slot!=null)return 'armor';if(it.acc||it.pet||it.mount)return 'gear';if(it.dmg||it.ranged||it.magic||it.ammoOf)return 'weapon';
  if(it.pick||it.hammer||it.hook||it.rod||it.bait||it.bucket||it.use==='binder'||Object.values(TRICKS).some(t=>t.item===id))return 'tool';if(['heal','buff','mana','manapot'].includes(it.use))return 'potion';if(it.place!=null||it.wall)return 'build';return 'other';}
let craftF='all',craftQ='',craftCan=false;
const catEls={};for(const[k,n,tip]of CCAT){const b=document.createElement('button');b.type='button';b.className='ghost';b.dataset.c=k;b.innerHTML=`${n}<em></em>`;if(tip)b.title=tip;$('craftCat').appendChild(b);catEls[k]=b;}
$('craftCat').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;craftF=b.dataset.c;$('recipes').scrollTop=0;craftKey='';invDirty=true;SFX.pick();});
$('craftCan').addEventListener('click',()=>{craftCan=!craftCan;$('craftCan').setAttribute('aria-pressed',craftCan);$('recipes').scrollTop=0;craftKey='';invDirty=true;SFX.pick();});
// typing in the search box must not move the player or close the backpack; Esc clears it, then lets go of it
$('craftQ').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if(e.target.value){e.target.value='';craftQ='';craftKey='';invDirty=true;}else e.target.blur();}});
$('craftQ').addEventListener('input',e=>{craftQ=e.target.value.trim().toLowerCase();$('recipes').scrollTop=0;craftKey='';invDirty=true;});
document.addEventListener('mousedown',e=>{if(e.target!==$('craftQ'))$('craftQ').blur();},true);
// recipes that make the same thing at the same station from one ingredient each (Grilled Fish from any fish) share one row
const RGRP={};{const m={};RECIPES.forEach((r,i)=>(m[r[0]+'|'+r[3]]??=[]).push(i));for(const g of Object.values(m))if(g.length>1&&g.every(i=>RECIPES[i][2].length===1))for(const i of g)RGRP[i]=g;}
const recOK=(r,st)=>(!r[3]||st[r[3]])&&r[2].every(([id,n])=>countItem(id)>=n);
// a recipe row's recipes (data-r lists a group's, the ones you can make first), for the mouse, touch and gamepad
export const recIdx=el=>el.dataset.r.split(',').map(Number);
export function craftRec(el,times){craft(recIdx(el),times);}
export const CRAFT_MAX=999;
function renderCraft(){const st=stationsNear();const avail=[];RECIPES.forEach((r,i)=>{const g=RGRP[i];if(g&&g[0]!==i)return;
    const ids=(g||[i]).slice().sort((a,b)=>recOK(RECIPES[b],st)-recOK(RECIPES[a],st)),rr=RECIPES[ids[0]],stOK=!rr[3]||st[rr[3]];avail.push({r:rr,i,ids,ok:recOK(rr,st),stOK,c:craftCat(r[0])});});
  const key=JSON.stringify(st)+avail.map(a=>a.ok?1:0).join('')+player.inv.map(s=>s?s.id+s.n:'').join(',')+'|'+craftF+'|'+craftQ+'|'+craftCan;if(key===craftKey)return;craftKey=key;
  $('stations').innerHTML=['bench','furnace','anvil','alchemy'].map(k=>`<span class="${st[k]?'on':''}">${st[k]?'●':'○'} ${ITEMS[k].name}</span>`).join('');
  const q=craftQ,hit=a=>!q||ITEMS[a.r[0]].name.toLowerCase().includes(q)||a.ids.some(j=>RECIPES[j][2].some(([id])=>ITEMS[id].name.toLowerCase().includes(q)));
  for(const[k]of CCAT){const n=avail.filter(a=>a.ok&&(k==='all'||a.c===k)&&hit(a)).length;catEls[k].classList.toggle('on',k===craftF);catEls[k].setAttribute('aria-pressed',k===craftF);catEls[k].querySelector('em').textContent=n||'';}
  $('craftCan').classList.toggle('on',craftCan);
  const list=avail.filter(a=>(craftF==='all'||a.c===craftF)&&(!craftCan||a.ok)&&hit(a));
  list.sort((a,b)=>(b.ok-a.ok)||(b.stOK-a.stOK)||a.i-b.i);
  const ingH=a=>{if(a.ids.length<2)return a.r[2].map(([id,n])=>`<span class="${countItem(id)>=n?'':'miss'}"><img src="${icon(id)}" alt="">${n} ${ITEMS[id].name}</span>`).join('');
    const have=a.ids.map(j=>RECIPES[j][2][0]).filter(([id])=>countItem(id)>0),fish=a.ids.every(j=>ITEMS[RECIPES[j][2][0][0]].fish);
    return have.length?have.map(([id,n])=>`<span class="${countItem(id)>=n?'':'miss'}"><img src="${icon(id)}" alt="">${n} ${ITEMS[id].name}</span>`).join(''):`<span class="miss">${fish?'Any fish':'Any one of '+a.ids.length+' ingredients'}</span>`;};
  $('recipes').innerHTML=list.length?list.map(a=>{const{r,ok,stOK}=a;return `<div class="rec ${ok?'can':'no'}" data-r="${a.ids.join(',')}"><img src="${icon(r[0])}" alt=""><div><div class="nm">${ITEMS[r[0]].name}${r[1]>1?' ×'+r[1]:''}</div><div class="ing">${ingH(a)}${r[3]&&!stOK?`<span class="miss">at ${ITEMS[r[3]].name}</span>`:''}</div></div></div>`;}).join('')
    :`<p class="hint">${craftCan&&!q?'Nothing here you can make yet. Gather more, or stand by a station.':'No recipes match.'}</p>`;}
// crafts a recipe (or the first of a group you can make) up to `times` times; stops early when the backpack fills
export function craft(i,times=1){const ids=Array.isArray(i)?i:[i],st=stationsNear();let made=0;
  for(let k=0;k<times;k++){const r=ids.map(j=>RECIPES[j]).find(r=>recOK(r,st));if(!r)break;r[2].forEach(([id,n])=>removeItem(id,n));const left=addItem(r[0],r[1]);made++;guideEv('craft');
    if(['copperbar','ironbar','goldbar'].includes(r[0]))questDone('bar');if(ITEMS[r[0]].use==='buff'||r[0]==='potion')stat('brews');if(['ironsword','ironpick','helmfe','mailfe','legsfe'].includes(r[0]))questDone('iron');
    if(left){dropItem(r[0],left,player.x,player.y+1,0,3);break;}}
  if(made){SFX.craft();burst(player.x,player.y+1.2,['#f1c04f','#fbf8f0'],made>1?12:8,3);}craftKey='';invDirty=true;return made;}
$('recipes').addEventListener('mousedown',e=>{const el=e.target.closest('.rec');if(!el||e.button!==0)return;craftRec(el,e.ctrlKey||e.metaKey?CRAFT_MAX:e.shiftKey?5:1);});
// how many of an item you have: in the backpack, worn, or (for a badge) owned
export function owned(id){const it=ITEMS[id];if(it.badge)return player.badges.includes(it.badge)?1:0;return countItem(id)+player.armor.concat(player.acc).filter(s=>s&&s.id===id).length;}
const sellPrice=s=>Math.max(1,Math.floor(ITEMS[s.id].value/5))*s.n;
// pages with a shop list buy your things too: shift-click a backpack slot, or drop the held stack on the sell box
const selling=()=>!!side&&(side.kind==='shop'||(!!side.list&&side.list.length>0&&side.kind!=='chest'));
function sellHTML(){return `<button type="button" id="sellBox" class="${cursor?'on':''}">${cursor?`Sell ${ITEMS[cursor.id].name}${cursor.n>1?' ×'+cursor.n:''} for <b>${sellPrice(cursor)}</b> coins`:'Sell: pick up an item and drop it here'}</button>`;}
function sellCursor(){if(!cursor){toast('Pick up an item from your backpack, then drop it here to sell it. Shift-click sells too.');return;}
  const v=sellPrice(cursor),nm=ITEMS[cursor.id].name;player.coins+=v;updateCoins();cursor=null;SFX.coin();toast(`Sold ${nm} for ${v} coins`);$('tip').hidden=true;invDirty=true;}
// a long stock list is grouped under small headings by kind (the crafting categories)
function shopHTML(list){const row=([id,p],i)=>{const n=owned(id);return `<div class="shopi ${player.coins<p?'poor':''}" data-s="${i}"><img src="${icon(id)}" alt=""><span>${ITEMS[id].name}${n?`<small class="own">Have ${n}</small>`:''}</span><span class="pr"><img src="${icon('coin')}" alt="">${p}</span></div>`;};
  if(list.length<=8)return `<div class="shopG">${list.map(row).join('')}</div>`;
  return CCAT.slice(1).map(([k,nm])=>{const g=list.map((e,i)=>[e,i]).filter(([e])=>craftCat(e[0])===k);return g.length?`<h4 class="shopH">${nm}</h4><div class="shopG">${g.map(([e,i])=>row(e,i)).join('')}</div>`:'';}).join('');}
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
function sideHTML(){const k=side.kind;if(k==='folk')return folkHTML(side.key,side.line)+(side.list&&side.list.length?`<h3 style="margin-top:10px">For sale</h3>`+shopHTML(side.list)+sellHTML():'');
  return (side.line?`<div class="sideTip talk"><b>${side.title}</b>${side.line}</div>`:'')+sideBody(k)+(k!=='shop'&&selling()?sellHTML():'');}
function sideBody(k){
  if(k==='shop'){const list=side.list||SHOP;return shopHTML(list)+`<p class="hint">Shift-click to buy 10. Shift-click items in your backpack to sell them.</p>`+sellHTML();}
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
  if(k==='party')return partyHTML();
  if(k==='bestiary')return bestHTML();
  if(k==='story')return loreRead(pgSel.story)||questsHTML()+loreHTML();
  if(k==='binder')return binderHTML(pgSel.binder);
  if(k==='museum')return hasNPC('curator')?museumHTML():`<div class="sideTip"><b>No museum yet</b>The Curator ${NPCDEF.curator.need.replace(/^Arrives/,'arrives')}</div><p class="hint">Fossils, fish, ores and curiosities you find now can all be donated once the museum opens.</p>`;
  if(k==='town')return townHTML();
  return '';}
export const bestCache={};
function bestSketch(t){if(bestCache[t])return bestCache[t];const d=EN[t],src=SHEETS[d.sheet],c=mk(64,64),g=c.getContext('2d'),s=Math.min(60/d.fw,60/d.fh);g.drawImage(src,0,0,d.fw,d.fh,32-d.fw*s/2,32-d.fh*s/2,d.fw*s,d.fh*s);return bestCache[t]=c.toDataURL();}
// ================= page views =================
// Grid and detail views for the tab pages (issue #144). What's picked on a page is page state here, so renderSide()
// (which re-renders only when the HTML changes) keeps it: the Bestiary's open entry, the Journal page being read, the binder page.
export const pgSel={bestiary:null,story:null,binder:0};
export function pickPage(k,v){pgSel[k]=v;if(k==='story'&&v)readLore(v);if(side&&side.kind===k){renderSide();if(k==='story')$('sideBody').scrollTop=0;}invDirty=true;}
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
// a small ??? tile for something not found yet; its hint shows on hover or gamepad focus (data-tip)
const lockTile=(img,how)=>`<div class="ptile" data-tip="${esc(how)}" role="img" aria-label="Not found yet. ${esc(how)}"><img src="${img}" alt=""><b>???</b></div>`;
function partyHTML(){const p=player,have=PORDER.filter(id=>p.partners.includes(id)),miss=PORDER.filter(id=>!have.includes(id));
  const pets=PETORDER.filter(id=>countItem(PETS[id].item)>0),mts=Object.keys(MOUNTS).filter(id=>countItem(MOUNTS[id].item)>0);
  const lockPM=PETORDER.filter(id=>!pets.includes(id)).map(id=>lockTile(icon(PETS[id].item),PETS[id].how)).concat(Object.keys(MOUNTS).filter(id=>!mts.includes(id)).map(id=>lockTile(icon(MOUNTS[id].item),MOUNTS[id].how)));
  return `<h3>Partners · ${have.length} / ${PORDER.length}</h3>`+have.map(id=>{const d=PARTNERS[id];return `<div class="pcard ${p.partner===id?'on':''}" data-p="${id}"><img src="${pPortrait(id)}" alt=""><div><b>${d.name}</b><span>${d.desc} Move: ${moveName(id)}. ${d.moveDesc}</span>${palQuestTxt(id)?`<small class="pq">${palQuestTxt(id)}</small>`:''}</div></div>`;}).join('')+
    (miss.length?`<div class="ptiles">${miss.map(id=>lockTile(pPortrait(id),PARTNERS[id].how)).join('')}</div>`:'')+
    `<h3 style="margin-top:10px">Pets &amp; mounts · ${pets.length+mts.length} / ${PETORDER.length+Object.keys(MOUNTS).length}</h3>`+
    pets.map(id=>{const d=PETS[id];return `<div class="pcard ${p.pet===id?'on':''}" data-pet="${id}"><img src="${icon(d.item)}" alt=""><div><b>${d.name}</b><span>${p.pet===id?'Following you. Click to send it home.':'Click to call it.'}</span></div></div>`;}).join('')+
    mts.map(id=>{const d=MOUNTS[id];return `<div class="pcard ${p.mount===id?'on':''}" data-mount="${id}"><img src="${icon(d.item)}" alt=""><div><b>${d.name}</b><span>${p.mount===id?'Riding. Click to get down.':`Mount. Click or press ${actName('mount')} to ride: ${Math.round((d.spd-1)*100)}% faster, higher jumps.`}</span></div></div>`;}).join('')+
    (lockPM.length?`<div class="ptiles">${lockPM.join('')}</div>`:'')+`<p class="hint">Badges are on the Hero page.</p>`;}
// the Bestiary: a grid of sketches (silhouettes until defeated); the picked one's entry sits in a card pinned over the grid
function bestHTML(){const found=BEST.filter(r=>bestiary[r[0]]).length,sel=pgSel.bestiary,tr=Object.keys(TRAITS).filter(k=>Object.values(bestiary).some(o=>o.tr&&o.tr[k])).length;
  return `<p class="hint" style="margin-top:0">${found} of ${BEST.length} entries filled in. Defeat an enemy to sketch it here.${tr?` Elite traits seen: ${tr} of ${Object.keys(TRAITS).length}.`:''}</p>`+bestEntry(sel)+
    `<div class="bgrid">`+BEST.map(([t,name])=>{const b=bestiary[t];return `<div class="btile${b?'':' lock'}${sel===t?' on':''}" data-best="${t}" role="button" aria-pressed="${sel===t}" aria-label="${b?esc(name):'Not sketched yet'}" title="${b?esc(name):'???'}"><img src="${bestSketch(t)}" alt=""></div>`;}).join('')+'</div>';}
function bestEntry(t){const r=t&&BEST.find(r=>r[0]===t);if(!r)return `<div class="bdet empty">Pick a sketch to read its entry.</div>`;const[,name,where]=r,b=bestiary[t];
  if(!b)return `<div class="bdet lock"><img src="${bestSketch(t)}" alt=""><div><b>???</b><span>${where}</span><span>Not sketched yet. Defeat one to fill in this entry.</span></div></div>`;
  const d=EN[t],known=d.drops.filter(([id])=>b.d[id]),unk=d.drops.length-known.length;
  return `<div class="bdet"><img src="${bestSketch(t)}" alt=""><div><b>${name}</b><span>${where}</span><span>Defeated ${b.k}${b.e?` · ${b.e} elite`:''} · ${d.hp} HP</span>${b.tr?`<span class="btr">Elite traits: ${Object.keys(b.tr).filter(k=>TRAITS[k]).map(k=>`<i title="${TRAITS[k].tip}">${TRAITS[k].n}</i>`).join(', ')}</span>`:''}${d.weak||d.res?`<span>${[d.weak&&'Weak to '+ELEM[d.weak].name,d.res&&'Resists '+ELEM[d.res].name].filter(Boolean).join(' · ')}</span>`:''}<span class="bdrops">${known.map(([id])=>`<i title="${ITEMS[id].name}"><img src="${icon(id)}" alt="">${ITEMS[id].name}</i>`).join('')}${unk?`<i class="q">${known.length?'+ ':''}${unk} unknown drop${unk>1?'s':''}</i>`:''}${!d.drops.length?'<i class="q">Drops coins only</i>':''}</span></div></div>`;}
// the Town: who's next and what they need on top, the residents with a home as one row of portraits, then the upgrades
function townHTML(){const home=NPCORDER.filter(t=>npcs.some(n=>n.type===t&&n.home)),wait=NPCORDER.filter(t=>!home.includes(t)),ready=wait.filter(t=>NPCDEF[t].ok()),later=wait.filter(t=>!ready.includes(t));
  const next=ready.concat(later.slice(0,ready.length?1:2)),rest=later.filter(t=>!next.includes(t)),todo=TOWN.filter(u=>!town.f[u.id]),built=TOWN.filter(u=>town.f[u.id]);
  return `<div class="sideTip"><b>Make a house</b>Walls behind it, a door, a light, a table and a chair, and not your bed. Stand inside and check it.<button id="houseBtn" type="button">Check this room</button></div>`+
    (next.length?`<h3>Next to move in</h3>`+next.map(t=>{const d=NPCDEF[t],ok=ready.includes(t);return `<div class="npcRow${ok?' ready':''}"><img src="${portrait(t)}" alt=""><div><b>${d.name}</b><span>${ok?'<span class="ok">Ready to move in.</span> Stand in an empty house and press Check this room.':d.need}</span></div></div>`;}).join(''):'')+
    (rest.length?`<div class="ptiles">${rest.map(t=>lockTile(portrait(t),NPCDEF[t].name+': '+NPCDEF[t].need)).join('')}</div>`:'')+
    `<h3 style="margin-top:10px">Residents · ${home.length} / ${NPCORDER.length}</h3>`+(home.length?`<div class="folkRow">${home.map(t=>`<img src="${portrait(t)}" alt="${esc(NPCDEF[t].name)}" title="${esc(NPCDEF[t].name)}">`).join('')}</div>`:'<p class="hint">Nobody has a home yet.</p>')+
    `<h3 style="margin-top:10px">${townLevel()} · upgrades ${built.length} / ${TOWN.length}</h3>`+todo.map(u=>`<div class="npcRow tup"><div><b>${u.n}</b><span>${u.need}</span></div></div>`).join('')+
    (built.length?`<p class="hint tbuilt"><b>✓ Built:</b> ${built.map(u=>u.n).join(' · ')}</p>`:'')+`<p class="hint">The town green beside your cabin grows as townsfolk move in and quests are finished.</p>`;}
// ================= hero page =================
// The Hero tab (issue #143): the hero cut-out wearing the current armor (the rig's own skin through facePic, re-drawn once
// the skin is re-baked after an armor change), the armor and accessory slots either side, a stats block, set bonus
// progress, active buffs and the badges. The slots are the same armor/acc slots as ever (canGo, drag and shift-click).
let heroKey='';
const setHTML=(id,h)=>{const el=$(id);if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}};
function renderHero(){const p=player,k=p.armor.map(s=>s?s.id:'').join()+'|'+(p.rig&&p.rig.k);
  if(p.rig&&!p.sheetDirty&&k!==heroKey){heroKey=k;const c=$('heroPic'),g=c.getContext('2d'),s=facePic('player');g.clearRect(0,0,c.width,c.height);
    if(s){const z=Math.min(c.width/s.width,c.height/s.height);g.drawImage(s,(c.width-s.width*z)/2,c.height-s.height*z,s.width*z,s.height*z);}}
  setHTML('heroStats',heroStats());setHTML('heroBuffs',heroBuffs());setHTML('heroBadges',heroBadges());}
export function heroStats(){const p=player,it=selItem(),kind=it&&it.dmg&&!it.pick?(it.ranged?'ranged':it.magic?'magic':'melee'):it&&it.dmg?'melee':null,et=it&&(it.elem||(it.proj&&PK[it.proj]&&PK[it.proj].elem));
  const mul=(kind?setMul(kind):1)*(hasBadge('power')?1.15:1)*(hasBuff('fed')?1.05:1)*(hasBuff('charged')||(hasBuff('lunar')&&isNight())?1.1:1);
  const spd=(hasAcc('speed')?1.2:1)*(hasBuff('swift')?1.25:1)*(hasBuff('charged')?1.2:1)*(hasBuff('fed')?1.05:1)*(p.mount?MOUNTS[p.mount].spd:1);
  const crit=!it||!it.dmg?'Time a hit for a NICE!':it.ranged&&it.ammo==='arrow'?'Perfect shot: ×1.25, full draw ×1.6':it.ranged?'Full draw hits harder':it.magic?'Rune cast: stronger, half mana':`NICE! hit: ×1.8${hasBadge('nice')?', wider timing':''}`;
  const row=(n,v,c='')=>`<div class="hs${c}"><span>${n}</span><b>${v}</b></div>`;
  const sets=Object.keys(SETS).filter(k=>setCount(k)>0);
  return `<div class="hstats">`+row('Life',`${Math.ceil(p.hp)} / ${p.max}`)+row('Mana',`${Math.floor(p.mana)} / ${p.maxMana}`)+row('Defense',defense())+row('Move speed',Math.round(spd*100)+'%')+
    row('Weapon',it&&it.dmg?`${Math.round(it.dmg*mul)} ${kind}${et?' · '+ELEM[et].name:''}`:'Nothing to fight with',' wide')+(it&&it.dmg?row('Held',esc(it.name),' wide'):'')+row('Critical',crit,' wide')+`</div>`+
    (sets.length?sets.map(k=>{const S=SETS[k],n=setCount(k),on=n===3;return `<div class="hset${on?' on':''}"><b>${S.name} ${n}/3</b>${on?'Set bonus':'Full set'}: ${S.bonus}</div>`;}).join(''):`<p class="hint">Wear a helmet, chest and leggings of one set for its bonus.</p>`);}
function heroBuffs(){const b=Object.keys(player.buffs||{}).filter(k=>BUFFS[k]&&player.buffs[k]>0);if(!b.length)return '';
  return `<div class="buffs">`+b.map(k=>{const t=player.buffs[k];return `<span class="buff" title="${esc(BUFFS[k][2])}"><img src="${icon(BUFFS[k][1])}" alt="">${BUFFS[k][0]} <small>${t>60?Math.ceil(t/60)+'m':Math.ceil(t)+'s'}</small></span>`;}).join('')+'</div>';}
function heroBadges(){const p=player;return `<h3 style="margin-top:10px">Badges · BP ${bpUsed()} / ${bpMax()}</h3>`+(p.badges.length?p.badges.map(b=>{const[n,bp,d]=BADGES[b];return `<div class="bdg ${p.badgesOn.includes(b)?'on':''}" data-b="${b}"><img src="${icon('b_'+b)}" alt=""><div><b>${n}</b><span>${d}</span></div><em>${bp} BP</em></div>`;}).join(''):'<p class="hint">No badges yet. Bosses, chests, the Merchant and the Tinkerer all have them.</p>')+`<p class="hint">Click a badge to equip or remove it. Each boss you defeat adds 3 BP.</p>`;}
export function badgeToggle(b){const on=player.badgesOn;if(on.includes(b))on.splice(on.indexOf(b),1);else if(bpUsed()+BADGES[b][1]>bpMax()){toast(`Not enough BP. ${BADGES[b][0]} needs ${BADGES[b][1]}.`,'bad');return false;}else on.push(b);SFX.pick();$('heroBadges').dataset.h='';invDirty=true;return true;}
$('hero').addEventListener('mousedown',e=>{const bd=e.target.closest('.bdg');if(bd)badgeToggle(bd.dataset.b);});
function renderSide(){if(!side||side.kind==='chest'||side.kind==='hero')return;const html=sideHTML();if($('sideBody').dataset.h!==html){$('sideBody').innerHTML=html;$('sideBody').dataset.h=html;}}
function renderShop(){renderSide();}
$('sideBody').addEventListener('mousedown',e=>{if(side&&side.kind==='travel'){const el=e.target.closest('.shopi');if(!el)return;const list=[{x:player.spawn.x-.5,y:player.spawn.y}].concat((BIO.camps||[]).filter(c=>c.done).map(c=>({x:c.sx,y:c.sy})));const w=list[+el.dataset.w];if(w)travelTo(w.x,w.y);return;}
  const pk=e.target.closest('[data-best],[data-lore]');if(pk&&side){if(pk.dataset.best)pickPage('bestiary',pgSel.bestiary===pk.dataset.best?null:pk.dataset.best);else if(!pk.classList.contains('lock'))pickPage('story',pk.dataset.lore);SFX.pick();return;}
  if(side&&side.kind==='party'){const pc=e.target.closest('.pcard');
    if(pc&&(pc.dataset.pet||pc.dataset.mount)){const k=pc.dataset.pet||pc.dataset.mount,d=(pc.dataset.pet?PETS:MOUNTS)[k];if(countItem(d.item)>0){if(pc.dataset.pet)togglePet(k);else toggleMount(k);}$('sideBody').dataset.h='';invDirty=true;return;}if(pc&&player.partners.includes(pc.dataset.p)){setPartner(pc.dataset.p);SFX.pick();}$('sideBody').dataset.h='';invDirty=true;return;}
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
export function openSide(kind,key,list,title,line){side={kind,key,list,line,title:title||'Merchant'};showLeft();$('sideBody').dataset.h='';$('sideBody').scrollTop=0;
  if(kind==='chest'){$('sideTitle').textContent='Chest';$('sideBody').innerHTML='<div class="grid"></div><div class="row chestBtns"><button type="button" class="ghost" data-c="loot" title="Take everything you have room for">Loot all</button><button type="button" class="ghost" data-c="dep" title="Put in everything but your hotbar">Deposit all</button><button type="button" class="ghost" data-c="stack" title="Put in only what the chest already holds (not your hotbar)">Stack to chest</button></div><p class="hint">Shift-click to move one stack between chest and backpack.</p>';const g=$('sideBody').querySelector('.grid');sideEls=[];for(let i=0;i<20;i++){const el=mkSlot('chest',i,g);el.dataset.k='x';sideEls.push(el);}}
  else if(kind==='hero'){heroKey='';renderHero();}
  else{$('sideTitle').textContent=title||(kind==='town'?'Town':'Merchant');renderSide();}if(!invOpen)setInv(true);else turnPage($('leftPage'));syncTabs();}
// a stack into a chest: onto its own kind first, then the first empty slot; returns how many didn't fit
function toChest(box,s){let n=s.n;const mx=maxOf(s.id);for(let k=0;k<box.length&&n>0;k++){const b=box[k];if(b&&b.id===s.id&&b.n<mx){const m=Math.min(n,mx-b.n);b.n+=m;n-=m;}}
  for(let k=0;k<box.length&&n>0;k++)if(!box[k]){const m=Math.min(n,mx);box[k]={id:s.id,n:m};n-=m;}return n;}
// the chest page's buttons: Loot all, Deposit all (the pack, not the hotbar) and Stack to chest (only kinds the chest already holds)
export function chestAct(a){if(!side||side.kind!=='chest')return 0;const box=chests.get(side.key);let moved=0;
  if(a==='loot'){for(let k=0;k<box.length;k++){const b=box[k];if(!b)continue;const left=addItem(b.id,b.n);moved+=b.n-left;box[k]=left?{id:b.id,n:left}:null;}}
  else{const has=new Set(box.filter(Boolean).map(b=>b.id));for(let i=10;i<40;i++){const s=player.inv[i];if(!s||(a==='stack'&&!has.has(s.id)))continue;const left=toChest(box,s);moved+=s.n-left;if(left)s.n=left;else player.inv[i]=null;}}
  if(moved)SFX.pick();else toast(a==='loot'?(box.some(Boolean)?'Your backpack is full.':'The chest is empty.'):a==='stack'?'Nothing in your pack matches what the chest holds.':box.every(Boolean)?'The chest is full.':'Nothing to put in (your hotbar stays).');
  invDirty=true;return moved;}
// ================= pages =================
// Tabs over the book pick the left page: Crafting (the page when nothing else is open) and the others, each with a
// page turn. Chests, shops and townsfolk open their own left page with no tab lit. The right page is always the backpack.
// [tab, title, icon item or null for the partner's portrait]
const TABS=[['craft','Crafting','bench'],['hero','Hero','helmfe'],['party','Party',null],['bestiary','Bestiary','lens'],['museum','Museum','fos_amm'],['binder','Binder','binder'],['town','Town','lanternp'],['story','Journal',C.murals[0]]];
function turnPage(el){SFX.rustle(.25,.5);if(reduceMotion())return;el.classList.remove('turn');void el.offsetWidth;el.classList.add('turn');}
function showLeft(){const h=!!side&&side.kind==='hero';$('craft').hidden=!!side;$('hero').hidden=!h;$('sideSheet').hidden=!side||h;}
function closeSide(){side=null;showLeft();}
function curTab(){return side?(TABS.some(t=>t[0]===side.kind)?side.kind:''):'craft';}
// the book keeps its size; on a screen too small for it, the whole spread zooms down as a unit
// (layout sizes against #panel, which covers the screen, so the opening unfold animation doesn't skew the measure)
export function fitBook(){const sp=$('spread'),pn=$('panel');if(!invOpen)return;sp.style.zoom='';const w=sp.offsetWidth,h=sp.offsetHeight;if(!w)return;
  const k=Math.min(1,(pn.clientWidth-8)/w,(pn.clientHeight-8)/h);if(k<1)sp.style.zoom=k.toFixed(3);}
addEventListener('resize',fitBook);
function syncTabs(){const on=curTab();for(const b of $('tabs').children){const t=TABS.find(t=>t[0]===b.dataset.tab),a=t[0]===on;b.classList.toggle('on',a);b.setAttribute('aria-selected',a);b.setAttribute('aria-label',t[1]);b.title=t[1];
  b.querySelector('img').src=typeof t[2]==='number'?cellIcon(t[2]):t[2]?icon(t[2]):pPortrait(player.partner||'lumi');if(t[0]==='museum')b.classList.toggle('lock',!hasNPC('curator'));if(t[0]==='binder')b.classList.toggle('lock',!countItem('binder')&&!Object.keys(cards.have).length);if(t[0]==='party')b.classList.toggle('lock',!player.partners.length);}}
export function setTab(k){if(k==='inv'||k==='craft'){if(!invOpen)setInv(true);if(side){closeSide();turnPage($('leftPage'));}else SFX.pick();syncTabs();invDirty=true;return;}
  if(k==='story')pgSel.story=null;openSide(k,null,null,TABS.find(t=>t[0]===k)[1]);}
// gamepad LB: the next tab along (a chest or shop page counts as sitting before the first one)
export function cycleTab(d=1){const i=TABS.findIndex(t=>t[0]===curTab());setTab(TABS[(i+d+TABS.length)%TABS.length][0]);}
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.tab);});
// a first meeting or a fresh memory line is staged as dialogue first, and the NPC's panel opens after it
export function talkTo(n){const raw=npcLine(n.type);if(lineNew){say(npcSpeaker(n),raw,{done:()=>openTalk(n,plain(raw))});}else openTalk(n,plain(raw),1);}
function openTalk(n,line,bub){const d=NPCDEF[n.type],t=n.type;SFX.pick();
  if(t==='merchant')openSide('shop',null,townShop(SHOP),'Merchant',line);else if(t==='painter')openSide('shop',null,SHOPS.painter,'Painter',line);else if(t==='nurse')openSide('nurse',null,null,'Nurse',line);else if(t==='guide')openSide('guide',null,null,'Guide',line);else if(t==='angler')openSide('angler',null,SHOPS.angler,'Angler',line);else if(t==='tinkerer')openSide('tinker',null,SHOPS.tinkerer,'Tinkerer',line);
  else openSide('folk',t,t==='traveler'?(wev.trav?wev.trav.stock:[]):SHOPS[t],d.name,line);
  if(n.bub){n.bub.remove();n.bub=null;}if(!bub)return;n.bub=document.createElement('div');n.bub.className='bubble';n.bub.textContent=line;$('nums').appendChild(n.bub);n.bubLife=3;n.bubT=10;}
export function setInv(o){if(!o){if(padFocus)padFocus.classList.remove('padfocus');setPadFocus(null);$('padHint').hidden=true;}if(!o&&side&&!$('sideSheet').hidden){}invOpen=o;$('help').hidden=o;$('ui').classList.toggle('inv',o);if(!o)$('craftQ').blur();$('panel').hidden=!o;$('hotwrap').style.visibility=o?'hidden':'visible';if(o){showLeft();syncTabs();}if(!o){closeSide();if(cursor){const l=addItem(cursor.id,cursor.n);if(l)dropItem(cursor.id,l,player.x,player.y+1);cursor=null;}$('tip').hidden=true;}
  gridEls.concat(armorEls,accEls).forEach(el=>el.dataset.k='x');craftKey='';invDirty=true;if(o)fitBook();}
function canGo(kind,i,s){if(!s)return true;const it=ITEMS[s.id];if(kind==='armor')return it.slot===i;if(kind==='acc')return !!it.acc&&!player.acc.some((a,k)=>k!==i&&a&&a.id===s.id);return true;}
export function slotClick(el,btn,shift){const kind=el.dataset.kind,i=+el.dataset.i;let s=slotData(kind,i);
  if(!invOpen){if(kind==='inv'&&i<10){player.sel=i;invDirty=true;}return;}
  if(shift&&btn===0&&s){ // quick move / sell / equip
    if(selling()&&kind==='inv'){const v=sellPrice(s);player.coins+=v;updateCoins();setSlot(kind,i,null);SFX.coin();toast(`Sold ${ITEMS[s.id].name} for ${v} coins`);return;}
    if(kind==='inv'&&side&&side.kind==='chest'){const n=toChest(chests.get(side.key),s);if(n)s.n=n;else setSlot(kind,i,null);invDirty=true;return;}
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
// each weapon family's extra moves, and an armor set's bonus with how many pieces are worn
function moveHint(it){const h=it.heavy?'Hold at the top of the swing to charge. A full charge sends a shockwave that cracks shells and armor.':it.dmg&&!it.use&&!it.ranged&&!it.magic&&!it.pick&&!it.ammoOf?'The third cut of a combo is a finisher. In the air, hits keep you aloft and the third spikes foes down. Swing right after a parry to counter.':it.ranged&&it.ammo==='arrow'?'Let go just as the draw fills for a Perfect shot.':it.magic?'Cast again as the rune ring closes for a Rune cast: stronger, and half the mana.':'';return h?`<div class="ds mv">${h}</div>`:'';}
function setCard(k){const S=SETS[k],n=setCount(k),on=fullSet()===k;return `<div class="ds set${on?' on':''}"><b>${S.name} set</b> · ${S.kind} · ${n}/3 worn<br>${on?'Set bonus':'Full set'}: ${S.bonus}</div>`;}
// what an item goes into (each thing it makes once), for the item card
let USES=null;function usesOf(id){if(!USES){USES={};for(const r of RECIPES)for(const[i]of r[2])if(!(USES[i]??=[]).includes(r[0]))USES[i].push(r[0]);}return USES[id]||[];}
function usedIn(id){const u=usesOf(id);return u.length?`<div class="ds use"><b>Used in</b> ${u.slice(0,4).map(o=>ITEMS[o].name).join(', ')}${u.length>4?` and ${u.length-4} more`:''}</div>`:'';}
function itemCard(id,n,extra=''){const it=ITEMS[id];const lines=[],et=it.elem||(it.proj&&PK[it.proj]&&PK[it.proj].elem);if(it.dmg)lines.push(`${it.dmg} damage`);if(et)lines.push(`${ELEM[et].name} type`);if(it.heavy)lines.push('Heavy');if(it.block)lines.push(`Blocks ${Math.round(it.block*100)}% of a hit`);if(it.ranged)lines.push(it.ammo==='arrow'?'Uses arrows · hold to draw':'Uses Paper Sheets');if(it.magic)lines.push(`${it.mana} mana per cast`);if(it.adm)lines.push(`+${it.adm} damage as ammo`);if(it.pick)lines.push(`Pick power ${it.pick}`);if(it.rod)lines.push(`Fishing power ${it.fpow}${it.lava?' · Fishes in lava':''}`);if(it.bait)lines.push(`Bait power ${it.bait}`);if(it.def)lines.push(`+${it.def} defense`);if(it.place!=null||it.wall)lines.push('Can be placed');
  return `<div class="icard"><div class="icArt"><img src="${icon(id)}" alt=""></div><div class="icHead"><b>${it.name}</b><small>${KIND(it)}${n>1?` · ×${n}`:''}</small></div></div>${lines.length?`<div class="st">${lines.join(' · ')}</div>`:''}${it.desc?`<div class="ds">${it.desc}</div>`:''}${moveHint(it)}${it.set?setCard(it.set):''}${it.block?`<div class="ds">Wear it in an accessory slot, then ${pad.active?`hold ${actName(SET.pad.block>=0?'block':'interact')}`:`hold right-click (or ${KEYNAME(SET.bind.block)})`} to block. Raise it just as a hit lands to parry.</div>`:''}${usedIn(id)}${extra}`;}
document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('.slot,.rec,.tcard[data-card],[data-tip]');hoverSlot=el&&el.classList.contains('slot')?el:null;if(!el){$('tip').hidden=true;return;}
  // a filed trading card shows big with its line; ??? tiles and empty pockets show their hint
  if(el.dataset.card){const c=CARDS.find(c=>c[0]===el.dataset.card),n=cards.have[c[0]]||0;$('tip').innerHTML=`<div class="bigCard"><img src="${icon('card_'+c[0])}" alt=""></div><b>${c[1]}</b><div class="st">${RARITY[c[2]].n}${n>1?` · ×${n}`:''}</div>${c[5]?`<div class="ds">${c[5]}</div>`:''}`;$('tip').hidden=false;placeTip(e.clientX+16,e.clientY+14);return;}
  if(el.dataset.tip!=null){$('tip').innerHTML=`<div class="ds">${esc(el.dataset.tip)}</div>`;$('tip').hidden=false;placeTip(e.clientX+16,e.clientY+14);return;}
  if(el.classList.contains('rec')){const r=RECIPES[recIdx(el)[0]];if(!r){$('tip').hidden=true;return;}$('tip').innerHTML=itemCard(r[0],r[1],`<div class="ds mk">${el.classList.contains('can')?'Click to craft · Shift-click for 5 · Ctrl-click for as many as you can':'Missing something'}${r[3]?` · at ${ITEMS[r[3]].name}`:''}</div>`);$('tip').hidden=false;placeTip(e.clientX+16,e.clientY+14);return;}
  const s=slotData(el.dataset.kind,+el.dataset.i);if(!s){$('tip').hidden=true;return;}
  $('tip').innerHTML=itemCard(s.id,s.n,selling()&&el.dataset.kind==='inv'?`<div class="ds mk">Sells for ${sellPrice(s)} coins · Shift-click to sell</div>`:'');$('tip').hidden=false;placeTip(e.clientX+16,e.clientY+14);});
// the room check lives on the Town page (click, or A on a gamepad, which clicks buttons)
$('sideBody').addEventListener('click',e=>{if(e.target.closest('#houseBtn'))tryMoveIn(checkRoom(Math.floor(player.x),Math.floor(player.y+.5)),true);
  const c=e.target.closest('.chestBtns button');if(c)chestAct(c.dataset.c);if(e.target.closest('#sellBox'))sellCursor();
  // the Journal's reader goes back to the list (onto the page just read), and the binder's page tabs flip its pages
  if(e.target.closest('.loreBack')){const k=pgSel.story;pickPage('story',null);SFX.rustle(.2,.4);const el=k&&$('sideBody').querySelector(`[data-lore="${k}"]`);if(el)el.scrollIntoView({block:'center'});}
  const bp=e.target.closest('[data-bpg]');if(bp){pickPage('binder',+bp.dataset.bpg);SFX.rustle(.2,.4);}});
// Sort: the pack (not the hotbar) merged into full stacks, by kind in the crafting categories' order, then by name
$('sortBtn').addEventListener('click',()=>{const rest=player.inv.slice(10).filter(Boolean);const merged=[];for(const s of rest){const m=merged.find(x=>x.id===s.id&&x.n<maxOf(s.id));if(m){const k=Math.min(s.n,maxOf(s.id)-m.n);m.n+=k;s.n-=k;if(s.n)merged.push(s);}else merged.push(s);}const cat=CCAT.slice(1).map(c=>c[0]);merged.sort((a,b)=>cat.indexOf(craftCat(a.id))-cat.indexOf(craftCat(b.id))||ITEMS[a.id].name.localeCompare(ITEMS[b.id].name)||b.n-a.n);for(let i=10;i<40;i++)player.inv[i]=merged[i-10]||null;invDirty=true;});
export let heartsKey='';
export function renderHearts(){const per=20,n=Math.ceil(player.max/per);const key=player.hp+'/'+player.max+'/'+Math.floor(player.mana)+'/'+player.maxMana;if(key===heartsKey)return;heartsKey=key;let h='';for(let i=0;i<n;i++){const f=clamp((player.hp-i*per)/per,0,1);h+=`<img src="${icon('heart')}" alt="" style="opacity:${f>0?1:.28};transform:scale(${f>0?.65+.35*f:.8});filter:${f>0?'none':'grayscale(1)'}">`;}$('hearts').innerHTML=h;
  let m='';for(let i=0;i<player.maxMana/20;i++){const f=clamp((player.mana-i*20)/20,0,1);m+=`<img src="${icon('manacrystal')}" alt="" style="opacity:${f>0?1:.3};transform:scale(${f>0?.6+.4*f:.75});filter:${f>0?'none':'grayscale(1)'}">`;}$('mana').innerHTML=m;
  $('hpTxt').textContent=`Life ${Math.ceil(player.hp)} / ${player.max} · Mana ${Math.floor(player.mana)} / ${player.maxMana}`;}
export const GOALS_SHOWN=3;
export function renderQuests(){const left=QUESTS.filter(([k])=>!quests[k]);$('quests').innerHTML=`<b>Goals <small>${QUESTS.length-left.length} of ${QUESTS.length}</small></b>`+(left.length?left.slice(0,GOALS_SHOWN).map(([k,t])=>`<div><i></i>${t}</div>`).join(''):'<div class="done"><i></i>Every goal done</div>')+sideJournal()+palJournal();}
// the Journal tab's quest list: what's left in full, what's done on one line
function questsHTML(){const left=QUESTS.filter(([k])=>!quests[k]),done=QUESTS.filter(([k])=>quests[k]);
  return `<h3>Quests · ${done.length} of ${QUESTS.length} done</h3><div class="qlist">`+left.map(([k,t],i)=>`<div class="${i?'':'next'}"><i></i>${t}</div>`).join('')+'</div>'+(done.length?`<p class="hint qdone">Done: ${done.map(q=>q[1]).join(' · ')}</p>`:'')+`<h3 style="margin-top:10px">Story</h3>`;}
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
