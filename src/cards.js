// Trading cards (issue #67): cards picture the world's foes, townsfolk, partners and bosses, and turn up in ruin, sky and
// dungeon chests, buried treasure and card packs. They sit in the backpack like any item until the player carries a Card
// Binder; then they file themselves into the per-world collection, shown on the Binder page, and each full page pays a reward.
import {
  addItem,atlasTex,buildNormals,burst,C,CARDPAGES,CARDS,CARDBACK,cardFace,cellIcon,clearIcons,countItem,dropItem,EN,icon,ITEMS,
  player,RARITY,repaintCell,rewardTxt,setInvDirty,setTab,SFX,SHEETS,stat,toast,tone,cardId,
  $,initAudio,invOpen,mk,reduceMotion,setInv,setState,state,
} from './game.js';

// ================= cards =================
// have: cards filed per key (duplicates count up); pg: binder pages whose reward was given; hint: the binder hint was shown
export const newCards=()=>({have:{},pg:{},hint:0});
export let cards=newCards();
export function setCards(v){return cards=v;}
// a card's picture: the sketch the bestiary, portraits and party page already use, fitted into the card's window
const PAGEBG={field:'#e2eed4',friends:'#f6e6c8',legends:'#2a3160'};
function picOf([kind,k]){if(kind==='foe'){const d=EN[k];return d&&SHEETS[d.sheet]?[SHEETS[d.sheet],d.fw,d.fh]:null;}
  if(kind==='folk')return SHEETS[k]?[SHEETS[k],96,112]:null;const s=SHEETS[(kind==='pal'?'p_':'pet_')+k];return s?[s,96,96]:null;}
// paints every card face from the sprite sheets (main.js, once they are built and before hand-made art is laid over them)
export function paintCards(){let n=0;for(const[k,,r,pic,pg]of CARDS){const src=picOf(pic);if(!src)continue;const[img,sw,sh]=src;
    repaintCell(C['card_'+k],t=>cardFace(t,r,(t,x,y,w,h,full)=>{const s=(full?Math.max(w/sw,h/sh)*.95:Math.min(w/sw,h/sh))*1.08;t.drawImage(img,0,0,sw,sh,x+w/2-sw*s/2,y+h/2-sh*s/2+(full?4:0),sw*s,sh*s);},PAGEBG[pg]));n++;}
  if(n){atlasTex.needsUpdate=true;buildNormals();clearIcons();}return n;}
// packs: three cards (one Rare or better) or, gilded, five (one Halo or better), shown opening on the pack screen
export function openPack(kind){const p=player,got=[kind?cardId(1,2):cardId(0,1)];for(let k=1;k<(kind?5:3);k++)got.push(cardId(kind?1:0));
  // new: not in the binder, not carried already, and the first of its kind in this pack
  const seen=new Set(),fresh=got.map(id=>{const k=ITEMS[id].card,n=!cards.have[k]&&!countItem(id)&&!seen.has(k);seen.add(k);return n;});
  for(const id of got){const l=addItem(id,1);if(l)dropItem(id,l,p.x,p.y+1);}
  const rar=id=>CARDS.find(c=>c[0]===ITEMS[id].card)[2],best=Math.max(...got.map(rar));
  burst(p.x,p.y+1.2,best>=2?['#fff3c0','#f1c04f','#ff9aa8','#8fcaf0']:['#fbf8f0','#d4483b','#f1c04f'],best>=2?26:14,5);
  stat('packs');setInvDirty(true);
  showPack(kind,got.map((id,i)=>({k:ITEMS[id].card,r:rar(id),n:ITEMS[id].name.replace(/ Card$/,''),fresh:fresh[i]})));}
export function openBinder(){setTab('binder');}

// ================= pack screen =================
// Opening a pack (issue #149) freezes the world (state 'pack') and plays it out on a screen over it: the pack drops in and
// wiggles, its top tears off, the cards slide out face down and flip one at a time, rarest last, then sit with their names,
// rarity and a New mark. A press (click, tap, Space/Enter/E, the pad's A, B, X or Y) skips to every card face up, the next one
// closes; Escape or Start closes at once. Reduced motion skips the pack and lays the cards out face up.
// The cards went into the backpack when the pack was opened, so closing early loses nothing.
let pk=null;
export const packOpen=()=>!!pk;
// a card face three times the atlas cell, painted the way paintCards() paints the cell; a card whose picture is missing
// (or that hand-made art replaced) shows its cell, scaled
const BIGS=3,bigs={};
function bigCard(k){if(bigs[k])return bigs[k];const c=CARDS.find(o=>o[0]===k),src=c&&picOf(c[3]);
  if(!src)return bigs[k]=icon('card_'+k);const[img,sw,sh]=src,cv=mk(52*BIGS,66*BIGS),t=cv.getContext('2d');t.scale(BIGS,BIGS);t.translate(-6,1);t.lineJoin='round';t.lineCap='round';
  cardFace(t,c[2],(t,x,y,w,h,full)=>{const s=(full?Math.max(w/sw,h/sh)*.95:Math.min(w/sw,h/sh))*1.08;t.drawImage(img,0,0,sw,sh,x+w/2-sw*s/2,y+h/2-sh*s/2+(full?4:0),sw*s,sh*s);},PAGEBG[c[4]]);
  return bigs[k]=cv.toDataURL();}
const RMARK=['●','◆','◎','★'];
function showPack(kind,list){if(invOpen)setInv(false);if(pk)closePack();
  // rarest flip last, so the best card is the reveal
  const order=list.map((c,i)=>[c,i]).sort((a,b)=>a[0].r-b[0].r||a[1]-b[1]).map(a=>a[0]),el=$('pack'),mid=(order.length-1)/2,rm=reduceMotion();
  pk={kind,list:order,ph:'pack',up:0,tm:[],prev:state};setState('pack');
  el.className=(kind?'gild ':'')+(rm?'rm':'');el.hidden=false;
  $('pkTitle').textContent=ITEMS[kind?'cardpackg':'cardpack'].name;
  $('pkWrap').innerHTML=`<img src="${icon(kind?'cardpackg':'cardpack')}" alt="" class="pk-top"><img src="${icon(kind?'cardpackg':'cardpack')}" alt="" class="pk-body">`;
  $('pkCards').innerHTML=order.map((c,i)=>`<div class="pkc r${c.r}" style="--i:${i};--dx:${(mid-i).toFixed(2)}" role="img" aria-label="Card ${i+1}, face down">
    <div class="pk-in"><div class="pk-back"><b>★</b></div><div class="pk-front"><img src="${bigCard(c.k)}" alt=""></div></div>
    <div class="pk-lab"><b>${c.n}</b><small>${RMARK[c.r]} ${RARITY[c.r].n}</small>${c.fresh?'<em>New!</em>':''}</div></div>`).join('');
  packHint();
  if(rm){packAll(true);return;}
  SFX.rustle(.25,.4);
  pk.tm.push(setTimeout(packTear,900));}
function packHint(){if(!pk)return;$('pkHint').textContent=pk.ph==='done'?'Click to close':'Click to reveal them all';$('pkDone').textContent=pk.ph==='done'?'Done':'Reveal all';}
function packTear(){if(!pk)return;pk.ph='tear';$('pack').classList.add('torn');SFX.rustle(.35,.9);tone(520,260,.12,'triangle',.06);
  pk.tm.push(setTimeout(()=>{if(!pk)return;pk.ph='flip';$('pack').classList.add('out');const n=pk.list.length;for(let i=0;i<n;i++)pk.tm.push(setTimeout(()=>packFlip(i),650+i*480+(i===n-1&&pk.list[i].r>=2?350:0)));},380));}
function packFlip(i){if(!pk)return;const c=pk.list[i],el=$('pkCards').children[i];if(!el||el.classList.contains('up'))return;el.classList.add('up');el.setAttribute('aria-label',`${c.n}, ${RARITY[c.r].n}${c.fresh?', new':''}`);pk.up++;
  tone(420+c.r*140,560+c.r*180,.09,'triangle',.07);SFX.rustle(.12,.35);if(c.r>=2){tone(660,990,.35,'sine',.08);tone(990,1320,.3,'sine',.05,.12);}
  if(pk.up>=pk.list.length){pk.ph='done';$('pack').classList.add('done');packHint();if(pk.list.some(c=>c.r>=2))SFX.nice();}}
function packAll(quiet){if(!pk)return;for(const t of pk.tm)clearTimeout(t);pk.tm=[];const el=$('pack');el.classList.add('torn','out','done','fast');
  [...$('pkCards').children].forEach((e,i)=>{const c=pk.list[i];e.classList.add('up');e.setAttribute('aria-label',`${c.n}, ${RARITY[c.r].n}${c.fresh?', new':''}`);});pk.up=pk.list.length;pk.ph='done';packHint();
  if(!quiet&&pk.list.some(c=>c.r>=2))SFX.nice();}
// a press: skip to every card face up, or close once they are; esc closes at once
export function packNext(esc){if(!pk)return;if(esc||pk.ph==='done'){closePack();return;}packAll();}
$('pack').addEventListener('click',()=>{initAudio();packNext();});
export function closePack(){if(!pk)return;for(const t of pk.tm)clearTimeout(t);const prev=pk.prev;pk=null;$('pack').hidden=true;$('pkCards').innerHTML='';if(state==='pack')setState(prev==='pack'?'play':prev);setInvDirty(true);}
// cards carried with a binder go into it; a full page pays its reward once
let cardT=0;
export function updateCards(dt){if((cardT-=dt)>0)return;cardT=.5;const inv=player.inv;let n=0;const fresh=[];
  if(!countItem('binder')){if(!cards.hint&&inv.some(s=>s&&ITEMS[s.id]&&ITEMS[s.id].card)){cards.hint=1;toast('A trading card! Craft a Card Binder at a workbench to collect them.','gold');}return;}
  for(let i=0;i<inv.length;i++){const s=inv[i],it=s&&ITEMS[s.id];if(!it||!it.card)continue;if(!cards.have[it.card])fresh.push(it.name.replace(/ Card$/,''));cards.have[it.card]=(cards.have[it.card]||0)+s.n;n+=s.n;inv[i]=null;}
  if(!n)return;setInvDirty(true);stat('cards',n);SFX.rustle(.2,.6);
  toast(fresh.length?`New in your binder: ${fresh.join(', ')}!`:`Filed ${n} card${n>1?'s':''} in your binder.`,fresh.length?'gold':'good');
  for(const pg of CARDPAGES){if(cards.pg[pg.id]||!CARDS.filter(c=>c[4]===pg.id).every(c=>cards.have[c[0]]))continue;cards.pg[pg.id]=1;
    for(const[id,k]of pg.reward){const l=addItem(id,k);if(l)dropItem(id,l,player.x,player.y+1);}stat('cardpages');SFX.nice();
    setTimeout(()=>toast(`Binder page complete: ${pg.n}! You get ${rewardTxt(pg.reward)}.`,'gold'),600);}}
// the Binder page (a backpack tab, issue #144): one pocket page per CARDPAGES entry, flipped with the tabs over it
// (pi is the page open); filed cards sit in their pockets with their count under them, missing ones are numbered empty pockets
export function binderHTML(pi=0){const got=CARDS.filter(c=>cards.have[c[0]]).length,has=countItem('binder')>0;
  if(!has&&!got)return `<div class="sideTip"><b>No binder yet</b>Craft a Card Binder at a workbench from paper, wood and gel.</div><p class="hint">Trading cards turn up in ruin chests, sky shrines, dungeons and buried treasure, and the Merchant sells packs.</p>`;
  const pg=CARDPAGES[pi]||CARDPAGES[0],list=CARDS.filter(c=>c[4]===pg.id),done=cards.pg[pg.id];
  return `<p class="hint" style="margin-top:0">${got} of ${CARDS.length} cards filed. ${has?'Cards you carry file themselves into the binder.':'Carry the binder to file new cards.'}</p><div class="bpgs">`+
    CARDPAGES.map((p,i)=>{const L=CARDS.filter(c=>c[4]===p.id),n=L.filter(c=>cards.have[c[0]]).length;return `<button type="button" class="ghost bpg${p===pg?' on':''}" data-bpg="${i}" aria-pressed="${p===pg}">${cards.pg[p.id]?'✓ ':''}${p.n} · ${n}/${L.length}</button>`;}).join('')+
    `</div><div class="musH"><small>${done?'Page complete!':pg.tip+' Reward: '+rewardTxt(pg.reward)}</small></div><div class="pockets">`+list.map(([k,n,r])=>{const c=cards.have[k],no=String(CARDS.findIndex(o=>o[0]===k)+1).padStart(2,'0');
      return c?`<div class="tcard r${r}" data-card="${k}" role="img" aria-label="${n}, ${RARITY[r].n}${c>1?`, ${c} copies`:''}"><img src="${icon('card_'+k)}" alt=""><span>${n}</span>${c>1?`<em>×${c}</em>`:''}</div>`
        :`<div class="tcard miss" data-tip="Card #${no}: not found yet"><b>#${no}</b></div>`;}).join('')+'</div>';}
