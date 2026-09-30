// Trading cards (issue #67): cards picture the world's foes, townsfolk, partners and bosses, and turn up in ruin, sky and
// dungeon chests, buried treasure and card packs. They sit in the backpack like any item until the player carries a Card
// Binder; then they file themselves into the per-world collection, shown on the Binder page, and each full page pays a reward.
import {
  addItem,atlasTex,buildNormals,burst,C,CARDPAGES,CARDS,CARDBACK,cardFace,cellIcon,clearIcons,countItem,dropItem,EN,icon,ITEMS,
  player,RARITY,repaintCell,rewardTxt,setInvDirty,setTab,SFX,SHEETS,stat,toast,tone,cardId,
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
// packs: three cards (one Rare or better) or, gilded, five (one Halo or better)
export function openPack(kind){const p=player,got=[kind?cardId(1,2):cardId(0,1)];for(let k=1;k<(kind?5:3);k++)got.push(cardId(kind?1:0));
  for(const id of got){const l=addItem(id,1);if(l)dropItem(id,l,p.x,p.y+1);}
  const best=Math.max(...got.map(id=>ITEMS[id].card&&CARDS.find(c=>c[0]===ITEMS[id].card)[2]));
  burst(p.x,p.y+1.2,best>=2?['#fff3c0','#f1c04f','#ff9aa8','#8fcaf0']:['#fbf8f0','#d4483b','#f1c04f'],best>=2?26:14,5);SFX.rustle(.3,.5);if(best>=2)tone(660,990,.35,'sine',.08);
  toast(`${ITEMS[kind?'cardpackg':'cardpack'].name}: ${got.map(id=>{const r=CARDS.find(c=>c[0]===ITEMS[id].card)[2];return ITEMS[id].name.replace(/ Card$/,'')+(r?` (${RARITY[r].n})`:'');}).join(', ')}!`,best>=2?'gold':'good');
  stat('packs');setInvDirty(true);}
export function openBinder(){setTab('binder');}
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
