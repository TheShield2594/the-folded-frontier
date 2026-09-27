// Settings and achievements panels, minimap and HUD.
import {
  $,applyUI,applyVolumes,blk,BUFFS,clamp,countItem,dayF,DEF_BIND,DEF_PAD,DEF_SET,ELEM,enemies,explored,
  H,hexRgb,hintT,icon,initAudio,inkMoon,isNight,lerp,META,npcs,player,PSTAT,renderHearts,saveMeta,
  saveSettings,SET,setCamDist,setHintT,SFX,sky,state,surf,tiles,TP,W,WALLCOL,walls,weather,worldTime,
} from './game.js';

// ================= settings & achievements UI =================
export const KEYNAME=k=>({' ':'Space',arrowleft:'←',arrowright:'→',arrowup:'↑',arrowdown:'↓',escape:'Esc',tab:'Tab',shift:'Shift',control:'Ctrl',alt:'Alt',enter:'Enter',backspace:'Backspace'}[k]||k.toUpperCase());
const BINDLAB={left:'Move left',right:'Move right',jump:'Jump',down:'Drop down',inv:'Backpack',heal:'Quick heal',map:'World map',hook:'Grappling hook',partner:'Switch partner',ability:'Partner move',flat:'Flatten',dash:'Dash',block:'Block (shield)'};
const PADLAB={jump:'Jump',use:'Use item',interact:'Interact / hold to block',dash:'Dash',inv:'Backpack',hook:'Grappling hook',ability:'Partner move',partner:'Switch partner',pl:'Previous slot',pr:'Next slot',map:'World map'};
const PADNAME=i=>['A','B','X','Y','LB','RB','LT','RT','Back','Start','L3','R3','D-pad ↑','D-pad ↓','D-pad ←','D-pad →','Home'][i]||'Button '+i;
export let rebinding=null,padRebinding=null;
export function renderBinds(){$('binds').innerHTML=Object.keys(BINDLAB).map(a=>`<div class="bind"><span>${BINDLAB[a]}</span><button type="button" data-a="${a}" class="${rebinding===a?'wait':''}">${rebinding===a?'Press a key…':KEYNAME(SET.bind[a])}</button></div>`).join('');
  $('padBinds').innerHTML=Object.keys(PADLAB).map(a=>`<div class="bind"><span>${PADLAB[a]}</span><button type="button" data-a="${a}" class="${padRebinding===a?'wait':''}">${padRebinding===a?'Press a button…':PADNAME(SET.pad[a])}</button></div>`).join('');}
$('binds').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;padRebinding=null;rebinding=b.dataset.a;renderBinds();});
$('padBinds').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;rebinding=null;padRebinding=b.dataset.a;renderBinds();});
function openSettings(){$('volMaster').value=SET.vol;$('volMusic').value=SET.music;$('volSfx').value=SET.sfx;$('volAmb').value=SET.amb;$('zoomR').value=SET.zoom;$('uiR').value=SET.ui;$('txtR').value=SET.text;uiLabels();$('shakeC').checked=SET.shake;$('hitC').checked=SET.hitstop;$('numsC').checked=SET.nums;rebinding=null;renderBinds();$('settings').hidden=false;}
export function closeSettings(){$('settings').hidden=true;rebinding=padRebinding=null;saveSettings();}
$('volMaster').addEventListener('input',e=>{SET.vol=+e.target.value;initAudio();applyVolumes();});
$('volMusic').addEventListener('input',e=>{SET.music=+e.target.value;initAudio();applyVolumes();});
$('volSfx').addEventListener('input',e=>{SET.sfx=+e.target.value;initAudio();applyVolumes();});
$('volSfx').addEventListener('change',()=>SFX.coin());
$('volAmb').addEventListener('input',e=>{SET.amb=+e.target.value;initAudio();applyVolumes();});
$('zoomR').addEventListener('input',e=>{SET.zoom=setCamDist(+e.target.value);});
function uiLabels(){$('uiV').textContent=SET.ui+'%';$('txtV').textContent=SET.text+'%';}
$('uiR').addEventListener('input',e=>{SET.ui=+e.target.value;uiLabels();});$('txtR').addEventListener('input',e=>{SET.text=+e.target.value;uiLabels();});
$('uiR').addEventListener('change',()=>{applyUI();saveSettings();});$('txtR').addEventListener('change',()=>{applyUI();saveSettings();});
$('shakeC').addEventListener('change',e=>{SET.shake=e.target.checked;});
$('hitC').addEventListener('change',e=>{SET.hitstop=e.target.checked;});
$('numsC').addEventListener('change',e=>{SET.nums=e.target.checked;});
$('setClose').addEventListener('click',closeSettings);
$('setReset').addEventListener('click',()=>{Object.assign(SET,DEF_SET);SET.bind=Object.assign({},DEF_BIND);SET.pad=Object.assign({},DEF_PAD);setCamDist(SET.zoom);applyVolumes();applyUI();saveSettings();openSettings();});
const ACH=[
 {id:'timber',name:'Timber!',desc:'Chop down a tree.',icon:'wood',key:'trees',target:1},
 {id:'dig100',name:'Groundbreaker',desc:'Mine 100 blocks.',icon:'copperpick',key:'mined',target:100},
 {id:'dig1000',name:'Mole Person',desc:'Mine 1,000 blocks.',icon:'ironpick',key:'mined',target:1000},
 {id:'build',name:'Architect',desc:'Place 250 blocks or walls.',icon:'woodwall',key:'placed',target:250},
 {id:'home',name:'Home Sweet Home',desc:'Get the Merchant to move in.',icon:'door',key:'merchant',target:1},
 {id:'deep',name:'Deep Diver',desc:'Reach 200 ft underground.',icon:'torch',key:'depth',target:200},
 {id:'night',name:'Night Owl',desc:'Make it through a whole night.',icon:'lantern',key:'nights',target:1},
 {id:'stomp',name:'Stomp Stomp',desc:'Stomp 25 enemies.',icon:'legscu',key:'stomps',target:25},
 {id:'nice10',name:'NICE!',desc:'Land 10 NICE! hits.',icon:'coppersword',key:'nices',target:10},
 {id:'nice50',name:'Perfect Timing',desc:'Land 50 NICE! hits.',icon:'goldsword',key:'nices',target:50},
 {id:'kill100',name:'Monster Hunter',desc:'Defeat 100 enemies.',icon:'gel',key:'kills',target:100},
 {id:'coins',name:'Pocket Change',desc:'Collect 1,000 coins.',icon:'coin',key:'coins',target:1000},
 {id:'chests',name:'Treasure Hunter',desc:'Open 5 treasure chests.',icon:'chest',key:'chests',target:5},
 {id:'glide',name:'Paper Plane',desc:'Double jump with the Paper Glider.',icon:'glider',key:'glides',target:1},
 {id:'king',name:'Royal Pain',desc:'Defeat the King Slime.',icon:'crown',key:'kings',target:1},
 {id:'crumple',name:'Crumpled',desc:'Get knocked out once.',icon:'potion',key:'deaths',target:1},
 {id:'heart',name:'Heart of Paper',desc:'Reach 200 max life.',icon:'heart',test:p=>p.max>=200},
 {id:'sharp',name:'Sharpshooter',desc:'Hit enemies 100 times with arrows, planes or stars.',icon:'woodbow',key:'rangedhits',target:100},
 {id:'spell',name:'Spellbound',desc:'Cast 100 spells.',icon:'inktome',key:'casts',target:100},
 {id:'stars',name:'Stargazer',desc:'Collect 10 Fallen Stars.',icon:'fstar',key:'fstars',target:10},
 {id:'snow',name:'Snowblind',desc:'Visit the Origami Snowfield.',icon:'snow',key:'v_snow',target:1},
 {id:'swim',name:'Ink Blot',desc:'Swim in the Ink Lake.',icon:'inksac',key:'swims',target:1},
 {id:'uw',name:'Down in Flames',desc:'Reach the Burnt Underworld.',icon:'ash',key:'v_under',target:1},
 {id:'hook',name:'Hooked',desc:'Latch on with a Grappling Hook.',icon:'hook',key:'hooks',target:1},
 {id:'kcrane',name:'Paper Tiger',desc:'Defeat the Great Crane.',icon:'plume',key:'k_crane',target:1},
 {id:'klev',name:'Deep Ink',desc:'Defeat the Inkwell Leviathan.',icon:'inkheart',key:'k_lev',target:1},
 {id:'kfolio',name:'Final Chapter',desc:'Defeat the Charred Folio.',icon:'cinder',key:'k_folio',target:1},
 {id:'party',name:'Best Friends',desc:'Recruit all four partners.',icon:'b_happy',test:p=>p.partners.length>=4},
 {id:'badges',name:'Badge Collector',desc:'Own 10 different badges.',icon:'b_nice',test:p=>p.badges.length>=10},
 {id:'farm',name:'Green Thumb',desc:'Harvest 20 grown plants.',icon:'seed_sun',key:'harvests',target:20},
 {id:'brew',name:'Alchemist',desc:'Brew 10 potions.',icon:'potswift',key:'brews',target:10},
 {id:'moon',name:'Moonstruck',desc:'Survive an Ink Moon.',icon:'moonink',key:'inkmoons',target:1},
 {id:'bucket',name:'Bucket Brigade',desc:'Scoop up 10 buckets of ink or lava.',icon:'bucket',key:'scoops',target:10},
 {id:'moongear',name:'Moonlighting',desc:'Craft a piece of Moon Ink gear.',icon:'moonbow',test:p=>['moonbow','moontome','swallowtail','pendant'].some(id=>countItem(id)>0||p.acc.some(s=>s&&s.id===id))},
 {id:'peel',name:'Behind the Wallpaper',desc:'Peel away a hidden wall.',icon:'tmap',key:'peels',target:1},
 {id:'popout',name:'Pop-Up Artist',desc:'Pop out 5 sketches.',icon:'platform',key:'popouts',target:5},
 {id:'camp',name:'Homesteader',desc:'Rebuild an abandoned camp.',icon:'bench',key:'camps',target:1},
 {id:'flat',name:'Paper Thin',desc:'Flatten yourself 25 times.',icon:'paper',key:'flats',target:25},
 {id:'unfold',name:'Unfolded',desc:'Defeat the secret boss of the shrine.',icon:'foldblade',key:'k_unfolded',target:1},
 {id:'town',name:'Town Planner',desc:'Give all five townsfolk a home.',icon:'door',test:()=>npcs.filter(n=>n.home).length>=5},
 {id:'decor',name:'Interior Designer',desc:'Place 30 pieces of furniture or decor.',icon:'paint1',key:'decor',target:30},
 {id:'parry',name:'Paper Wall',desc:'Parry 10 attacks with a shield.',icon:'shfe',key:'parries',target:10},
 {id:'fulldraw',name:'Full Draw',desc:'Loose 25 fully drawn arrows.',icon:'goldbow',key:'fulldraws',target:25},
 {id:'weak',name:'Know Your Enemy',desc:'Hit enemies 50 times with a damage type they are weak to.',icon:'firearrow',key:'weakhits',target:50},
 {id:'fish',name:'Gone Fishing',desc:'Catch 25 fish.',icon:'minnow',key:'fish',target:25},
 {id:'angler',name:'Reel Deal',desc:"Finish 5 of the Angler's requests.",icon:'rodiron',key:'fishq',target:5},
 {id:'armor',name:'Fully Folded',desc:'Wear a full set of armor.',icon:'mailfe',test:p=>p.armor.every(Boolean)},
];
export function stat(k,n=1){META.stats[k]=(META.stats[k]||0)+n;checkAch();}
export function checkAch(){if(state==='title')return;for(const a of ACH){if(META.ach[a.id])continue;const ok=a.test?a.test(player):(META.stats[a.key]||0)>=a.target;if(ok){META.ach[a.id]=Date.now();achQ.push(a);if(!achBusy)nextAch();saveMeta();}}}
const achQ=[];let achBusy=false;
function nextAch(){const a=achQ.shift(),el=$('achPop');if(!a){achBusy=false;el.hidden=true;return;}achBusy=true;el.hidden=false;el.innerHTML=`<img src="${icon(a.icon)}" alt=""><div><small>Achievement unlocked</small><b>${a.name}</b></div>`;el.style.animation='none';void el.offsetWidth;el.style.animation='';SFX.nice();setTimeout(nextAch,3200);}
function renderAch(){const n=ACH.filter(a=>META.ach[a.id]).length;$('achHead').textContent=`Achievements · ${n} of ${ACH.length}`;
  $('achList').innerHTML=ACH.map(a=>{const got=!!META.ach[a.id];const pr=!got&&a.key&&a.target>1?`<i>${Math.min(META.stats[a.key]||0,a.target).toLocaleString()} / ${a.target.toLocaleString()}</i>`:'';return`<div class="ac ${got?'':'lock'}"><img src="${icon(a.icon)}" alt=""><div><b>${a.name}</b><span>${a.desc}</span>${pr}</div></div>`;}).join('');$('ach').hidden=false;}
['setBtn','set2Btn'].forEach(id=>$(id).addEventListener('click',()=>{initAudio();openSettings();}));
['achBtn','ach2Btn'].forEach(id=>$(id).addEventListener('click',renderAch));
$('achClose').addEventListener('click',()=>{$('ach').hidden=true;});

// ================= minimap/HUD =================
const mini=$('mini'),mctx=mini.getContext('2d'),mimg=mctx.createImageData(140,80);export const TCOL=TP.map(d=>d?hexRgb(d.col):[0,0,0]);export const WCOL=WALLCOL.map(hexRgb);
let miniT=0;
function drawMini(){const p=player,x0=Math.floor(p.x)-70,y0=Math.floor(p.y)+40,d=mimg.data;const f=dayF(worldTime);
  for(let my=0;my<80;my++)for(let mx=0;mx<140;mx++){const x=x0+mx,y=y0-my,o=(my*140+mx)*4;let c;if(x<0||y<0||x>=W||y>=H)c=[28,21,32];else if(!explored[y*W+x])c=[30,23,34];else{const i=y*W+x,t=tiles[i];if(t)c=TCOL[t];else if(walls[i])c=WCOL[walls[i]];else c=y<surf[x]-3?[36,26,40]:[lerp(40,140,f)|0,lerp(44,200,f)|0,lerp(90,220,f)|0];
      const L=Math.max(sky[i]*(f*.7+.3),blk[i])/15;const k=.35+.65*L;c=[c[0]*k,c[1]*k,c[2]*k];}d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;}
  mctx.putImageData(mimg,0,0);const dot=(x,y,col,s=2)=>{mctx.fillStyle=col;mctx.fillRect(Math.round(x-x0)-s/2,Math.round(y0-y)-s,s,s);};
  for(const e of enemies)dot(e.x,e.y+e.h/2,e.d.boss?'#7fd3f0':'#ff5a4a',e.d.boss?4:2);npcs.forEach(n=>dot(n.x,n.y+1,'#6cf07a',3));dot(p.x,p.y+1,'#fff',3);}
let buffKey='';
export function updateHUD(dt){renderHearts();const h=Math.floor(worldTime),m=Math.floor((worldTime-h)*60/10)*10;$('clock').textContent=`${(h%12)||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}${inkMoon&&isNight()?' · Ink Moon':weather==='rain'?' · Rain':weather==='wind'?' · Windy':''}`;
  const sts=Object.keys(player.st||{}).filter(k=>player.st[k]>0);
  const bk=Object.keys(player.buffs).map(k=>k+Math.ceil(player.buffs[k])).join()+'|'+sts.map(k=>k+Math.ceil(player.st[k])).join();if(bk!==buffKey){buffKey=bk;$('buffs').innerHTML=Object.keys(player.buffs).map(k=>{const s2=Math.ceil(player.buffs[k]);return `<span class="buff" title="${BUFFS[k][2]}"><img src="${icon(BUFFS[k][1])}" alt="">${BUFFS[k][0]} ${Math.floor(s2/60)}:${String(s2%60).padStart(2,'0')}</span>`;}).join('')
    +sts.map(k=>{const E=ELEM[PSTAT[k][0]];return `<span class="buff bad" title="${PSTAT[k][1]}"><img src="${icon(E.icon)}" alt="">${E.st} ${Math.ceil(player.st[k])}s</span>`;}).join('');}
  const s=surf[clamp(Math.floor(player.x),0,W-1)];const d=Math.round((s-player.y)*2);if(d>(META.stats.depth||0)){META.stats.depth=d;checkAch();}$('depth').textContent=d>6?`${d} ft deep`:d<-6?`${-d} ft up`:'Surface';
  miniT-=dt;if(miniT<=0){miniT=.2;drawMini();}
  setHintT(hintT+(dt));if(hintT>60)$('help').style.opacity=0;}
// Imported bindings are read-only, so other modules assign these through setters.
export function setRebinding(v){return rebinding=v;}
export function setPadRebinding(v){return padRebinding=v;}
