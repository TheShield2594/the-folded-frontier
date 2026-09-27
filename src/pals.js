// Partner stories: a personal quest per partner that upgrades their move, banter that reacts to biomes,
// bosses, seasons and events, and little chats with the townsfolk. Saved per world in `pals`.
import {
  $,biomeAt,boss,camera,curBio,dlgBusy,enemies,inkMoon,isFest,isNight,npcs,PARTNERS,partnerCheer,
  partnerSpeaker,player,pick,plain,pt,pv,quests,rand,renderQuests,say,season,setInvDirty,SFX,stat,state,
  toast,upx,wev,
  playerCheer,
} from './game.js';

// ================= partner stories =================
// q: personal quest per partner (1 asked, 2 done); n: quest progress; heard: banter already said ('partner:key').
export const newPals=()=>({q:{},n:{},heard:{}});
export let pals=newPals();
// true once a partner's personal quest is done and their move is upgraded (Flare+, Snip Spin+, Dig+, Rekindle+)
export const palUp=k=>pals.q[k]===2;
export const moveName=k=>PARTNERS[k].move+(palUp(k)?'+':'');
// Personal quests. Progress only counts while that partner is the one with you (see palEv).
export const PQUEST={
  lumi:{n:'Night Watch',need:3,what:'nights survived with Lumi',up:'Flare+ lights a wider circle and stuns for longer.',
    ask:['{sad}Before the Guide found me, I spent every night ~alone~ in the dark.','{happy}Keep me with you for *three whole nights?* I think my light could grow.'],
    done:['{surprised}Three nights, and I never flickered *once!*','{happy}Look how big my flame is! *Flare+* lights a much wider circle now.']},
  snip:{n:'Jar Breaker',need:30,what:'slimes defeated with Snip',up:'Snip Spin+ spins longer, in a wider circle.',
    ask:['{angry}Every slime out there is a *cousin* of that jelly king.','{happy}Squish *thirty* of them with me at your side and I will sharpen right up.'],
    done:['{happy}Thirty! My claws have never been *sharper.*','{surprised}*Snip Spin+* lasts longer and reaches ~further~!']},
  smudge:{n:'Buried Treasure',need:2,what:'fossils dug up with Smudge',up:'Dig+ tunnels further and through tougher blocks.',
    ask:['{happy}I can *smell* old bones under the ground!','{neutral}Dig up *two fossils* with me? Then I will know where the good dirt is.'],
    done:['{happy}Bones! *Bones!* Best day ever!','{surprised}I can dig ~deeper~ now. *Dig+* tunnels further and through tougher blocks.']},
  ember:{n:'Ashes to Embers',need:25,what:'foes beaten in the Burnt Underworld with Ember',up:'Rekindle+ heals more and scorches foes around you.',
    ask:['{sad}I was folded in the ~Burnt Underworld~, long ago.','{angry}Take me back down and beat *25 foes* there with me. I want my fire back.'],
    done:['{surprised}I remember now. I was made to *burn bright.*','{happy}*Rekindle+* heals more and scorches everything around you!']}};
export function palQuestTxt(k){const q=PQUEST[k],s=pals.q[k];if(s===2)return `✓ ${q.n}: ${q.up}`;if(!s)return '';return `${q.n}: ${Math.min(pals.n[k]||0,q.need)} / ${q.need} ${q.what}.`;}
export function palJournal(){const k=player.partner;if(!k||pals.q[k]!==1)return '';return `<b class="sj">Partner</b><div class="side"><i></i>${PQUEST[k].n} <small>(${PARTNERS[k].name} · ${Math.min(pals.n[k]||0,PQUEST[k].need)}/${PQUEST[k].need})</small></div>`;}
function bump(k){if(player.partner!==k||pals.q[k]!==1)return;const q=PQUEST[k],n=pals.n[k]=(pals.n[k]||0)+1;
  if(n>=q.need){pals.q[k]=2;SFX.nice();toast(`${PARTNERS[k].name}'s quest is done! ${q.up}`,'gold');partnerCheer(2);playerCheer(1.2);say(partnerSpeaker(k),q.done,{wait:.8});stat('palquests');}
  else if(q.need<=5||n%5===0)toast(`${q.n}: ${n} of ${q.need} ${q.what}`,'good');renderQuests();setInvDirty(true);}
// progress hooks: 'dawn' (main loop), 'fossil' (digFossil), 'kill' (killEnemy)
export function palEv(ev,e){const k=player.partner;if(!k||player.dead)return;
  if(ev==='dawn'&&k==='lumi')bump(k);else if(ev==='fossil'&&k==='smudge')bump(k);
  else if(ev==='kill'&&e){if(k==='snip'&&e.d.slimy)bump(k);else if(k==='ember'&&biomeAt(Math.floor(e.x),Math.floor(e.y))==='under')bump(k);}}

// Banter: [key, when(), lines by partner, quick]. Each partner says each line once (saved in pals.heard).
// Staged lines wait for a calm moment and play as dialogue; quick ones pop up over the partner without
// stopping the game, for boss fights and invasions.
const bossUp=()=>boss&&!boss.dying&&enemies.includes(boss);
const BANTER=[
  ['boss',bossUp,{lumi:'Stay in my light. I will flash when it gets close!',snip:'Big one! More to snip!',smudge:'Arf! Arf! That one is HUGE!',ember:'I will keep you lit. Go!'},1],
  ['army',()=>wev.k==='army',{lumi:'Paper soldiers! Keep them away from the houses!',snip:'Folded soldiers? I love a good cut.',smudge:'Grr! Nobody folds OUR town!',ember:'Paper burns. Just saying.'},1],
  ['storm',()=>wev.k==='storm',{lumi:'Hold on to me, the wind is pulling my flame!',snip:'Parcels! Snip them open!',smudge:'Wheee! Everything is flying!',ember:'Too windy! My tail keeps going out!'},1],
  ['moon',()=>inkMoon&&isNight(),{lumi:'The Ink Moon... stay close, I will shine brighter.',snip:'Ink everywhere. My claws are going to be SO sticky.',smudge:'I do not like this moon. Can I hide in your pocket?',ember:'Let the ink come. I burn hotter at night.'},1],
  ['snow',()=>curBio==='snow',{lumi:'{surprised}Snow! Every flake is a *tiny folded star.*',snip:'{angry}My legs are *freezing.* {sad}Crabs are not built for this.',smudge:'{happy}I am going to *dig a snow tunnel!* {surprised}Oh. It fills back in.',ember:'{happy}Nobody is cold while I am around. {neutral}Stand *closer.*'}],
  ['lake',()=>curBio==='lake',{lumi:'{sad}So much ink. Keep me away from the water, please.',snip:'{happy}A lake! {surprised}...of *ink.* {neutral}I will pass on the swim.',smudge:'{surprised}Is this where I came from? {happy}I smell like it!',ember:'{angry}Ink water. My *least favorite* kind of water.'}],
  ['desert',()=>curBio==='desert',{lumi:'{happy}Sandpaper dunes! My light bounces off *everything* here.',snip:'{happy}Sand! {surprised}Wait, it is *sandpaper.* {angry}My shell is getting scratched.',smudge:'{happy}The digging here is *so easy!* ~Sand sand sand~.',ember:'{neutral}Warm, dry, crinkly. {happy}I could *live* here.'}],
  ['under',()=>curBio==='under',{lumi:'{sad}It is so *dark* down here. {happy}Good thing you brought me.',snip:'{surprised}Everything is *singed.* {angry}Who burnt all these pages?',smudge:'{sad}My paws are hot. {surprised}*Very* hot. ~Hop hop hop~.',ember:'{surprised}The Burnt Underworld. {sad}I remember this place. {neutral}Mostly the *smell.*'}],
  ['nightwalk',()=>isNight()&&curBio==='forest'&&!inkMoon,{lumi:'{happy}Night in the meadow. {neutral}This is when I am *most useful.*',snip:'{neutral}The fireflies keep looking at me. {angry}*Rude.*',smudge:'{sad}Something is howling. {surprised}Oh, it was *me.*',ember:'{happy}Look at the stars! {neutral}I am brighter, but they are *nice.*'}],
  ['king',()=>quests.king,{lumi:'{happy}The King Slime is *flat!* {neutral}I will never look at jelly the same way.',smudge:'{surprised}You beat a *king?* {happy}Can I have his crown to chew?',ember:'{neutral}I heard a slime king used to rule the meadow. {happy}Sounds like you *retired* him.'}],
  ['crane',()=>quests.crane,{lumi:'{happy}The Great Crane is unfolded. The snowfield feels *lighter.*',snip:'{happy}That big bird had it *coming.* {angry}Snip!',ember:'{sad}A fellow bird. {neutral}But a *mean* one.'}],
  ['lev',()=>quests.lev,{lumi:'{surprised}The Leviathan is *gone!* {happy}The lake is almost clear.',snip:'{happy}We beat a *sea monster!* {surprised}An *ink* monster. {happy}Still counts!',smudge:'{happy}The big ink fish is gone! {surprised}Does that mean *more ink for me?*'}],
  ['folio',()=>quests.folio,{lumi:'{sad}All those burnt pages. {happy}At least nobody can *read them at us* anymore.',snip:'{happy}Snipped the oldest book in the world! {neutral}Mostly its *bookmark.*',smudge:'{happy}I *fetched* a page from the Folio. {surprised}It says ~woof~? {neutral}Maybe that was me.',ember:'{surprised}The Charred Folio! {happy}It burned so bright. {neutral}*Not* jealous.'}],
  ['unfolded',()=>quests.unfolded,{lumi:'{surprised}The Unfolded... {sad}I think it was *lonely,* too.',snip:'{surprised}That thing had no *folds* at all! {angry}Unnatural.',smudge:'{sad}I hid behind you the whole time. {happy}You were *very brave.*',ember:'{neutral}Blank pages, all of it. {happy}Now *we* get to write on them.'}],
  ['spring',()=>season().k==='spring',{lumi:'{happy}Spring! Blossoms everywhere, and they *glow* in my light.',snip:'{happy}Spring cleaning! {neutral}I will *snip* the weeds.',smudge:'{happy}The dirt smells *new* in spring!',ember:'{neutral}Petals burn fast. {sad}I will be *careful.*'}],
  ['summer',()=>season().k==='summer',{lumi:'{sad}Summer nights are *so short.* {happy}Less time to shine, more time to nap.',snip:'{happy}Summer! Beach weather! {sad}Where is the beach?',smudge:'{sad}Too hot. I am going to lie *flat* in the shade.',ember:'{happy}Summer! {surprised}Wait, is it hot or is that *me?*'}],
  ['fall',()=>season().k==='fall',{lumi:'{happy}Fall leaves are the same color as my lantern. {happy}We *match!*',snip:'{happy}Crunchy leaves! {angry}*Snip snip snip!*',smudge:'{happy}Leaf piles! {surprised}Can I jump in them? *Please?*',ember:'{surprised}So many dry leaves. {neutral}I will fly *extra high.*'}],
  ['winter',()=>season().k==='winter',{lumi:'{happy}Winter nights are *long.* My favorite.',snip:'{sad}Winter. {angry}My claws are *stiff.*',smudge:'{happy}Snow on my nose! {surprised}It is *melting* on my nose!',ember:'{happy}Everyone wants to sit next to me in winter. {neutral}As they *should.*'}],
  ['fest',()=>!!season()&&(isFest('spring')||isFest('summer')||isFest('fall')||isFest('winter')),{lumi:'{happy}A *festival!* Can we stay up and see the lights?',snip:'{happy}Festival day! {surprised}Is there a *crab race?*',smudge:'{happy}Festival! Everyone drops *snacks* at festivals.',ember:'{happy}A festival! {neutral}I will be the *fireworks.*'}],
  ['trav',()=>!!wev.trav,{lumi:'{surprised}A traveling merchant! {happy}Their lantern is almost as pretty as *me.*',snip:'{neutral}The traveling merchant has rare stuff. {angry}And *rare prices.*',smudge:'{happy}The traveling merchant smells like *far away!*',ember:'{neutral}That merchant has walked through *fire* to get here. {happy}Respect.'}]];
const busy=()=>bossUp()||wev.k==='army'||enemies.some(e=>!e.dying&&Math.abs(e.x-player.x)<14&&Math.abs(e.y-player.y)<10);

// Town chats: [partner line, reply] by townsperson; '*' for anyone. Shown as bubbles, no staging.
const CHAT={
  lumi:{guide:[['I relit your reading lamp last night.','So THAT is why it never goes out!']],painter:[['Paint me! I am very bright.','I would need a brighter yellow.']],nurse:[['Can you patch a lantern?','Only if it holds still.']],angler:[['Want me to light up the pond?','Please don\'t. You scare the fish.']],
    '*':[['Hello! Do you need a light?','I have torches, but thank you!'],['Your house is so cozy.','It is, now that you lit it up.']]},
  snip:{merchant:[['Got anything for sharpening claws?','Whetstones, ten coins. For you, twelve.']],tinkerer:[['Want me to snip some wires?','Absolutely not. Thank you.']],farmer:[['I can trim your wheat!','Leave my wheat alone, crab.']],
    '*':[['Snip snip! Hello!','Please keep those claws away from my curtains.'],['Nice hat. Can I snip it?','No!']]},
  smudge:{curator:[['I found a bone! Can I keep it?','That is a fossil! Please do NOT chew it.']],scout:[['I dug a tunnel. Want to map it?','I will draw it as a very long dash.']],merchant:[['Do you sell bones?','...I could start.']],
    '*':[['Arf! Hello! Hello!','Hello to you too, little blot.'],['Do you have treats?','Only if you stop digging up my garden.']]},
  ember:{nurse:[['I can heal people too, you know.','Then stop setting them on fire.']],painter:[['I could dry your paint faster!','Stay AWAY from the canvas.']],farmer:[['Want me to warm up the field?','Not unless you want popcorn.']],
    '*':[['It is warm in here. Because of me.','Please mind the curtains.'],['Need a fire lit?','We have a fireplace for that.']]}};
let banterT=20,chatT=12,reply=null;
// the partner's own speech bubble (partner and townsperson chats, quick banter)
function bubble(txt,life=3.4){if(pt.bub)pt.bub.remove();const b=pt.bub=document.createElement('div');b.className='bubble pal';b.textContent=plain(txt);$('nums').appendChild(b);pt.bubLife=life;}
export function clearPalBub(){if(pt.bub){pt.bub.remove();pt.bub=null;}reply=null;}
export function updatePals(dt){const k=player.partner;
  if(pt.bub){pt.bubLife-=dt;pv.set(pt.x,pt.y+.9,.5).project(camera);pt.bub.style.left=upx((pv.x+1)/2*innerWidth);pt.bub.style.top=upx((1-pv.y)/2*innerHeight);if(pt.bubLife<=0||!k||pt.type!==k)clearPalBub();}
  if(reply&&(reply.t-=dt)<=0){const n=reply.n;if(npcs.includes(n)){if(n.bub)n.bub.remove();n.bub=document.createElement('div');n.bub.className='bubble';n.bub.textContent=reply.line;$('nums').appendChild(n.bub);n.bubLife=3.4;n.bubT=rand(9,16);}reply=null;}
  if(!k||player.dead||state!=='play'||pt.type!==k)return;
  // the personal quest is asked once the partner is with you and nothing else is being said
  if(!pals.q[k]&&!dlgBusy()){pals.q[k]=1;say(partnerSpeaker(k),PQUEST[k].ask,{wait:4});renderQuests();setInvDirty(true);return;}
  banterT-=dt;chatT-=dt;
  if(banterT<=0){banterT=2;const b=BANTER.find(b=>b[2][k]&&!pals.heard[k+':'+b[0]]&&b[1]());
    if(b){if(b[3]){pals.heard[k+':'+b[0]]=1;bubble(b[2][k],4);banterT=12;}else if(!dlgBusy()&&!busy()){pals.heard[k+':'+b[0]]=1;say(partnerSpeaker(k),b[2][k]);banterT=45;chatT=Math.max(chatT,15);}}}
  if(chatT<=0&&!pt.bub&&!dlgBusy()){chatT=2;const n=npcs.find(n=>(n.home||n.type==='traveler')&&Math.hypot(n.x-pt.x,n.y+1-pt.y)<3.5&&!n.bub);
    if(n){const c=CHAT[k],pair=pick((c[n.type]||[]).concat(c['*']));bubble(pair[0],2.2);reply={n,line:pair[1],t:1.9};n.face=pt.x>n.x?1:-1;chatT=rand(35,55);partnerCheer(.6);}}}
// Imported bindings are read-only, so other modules assign these through setters.
export function setPals(v){clearPalBub();banterT=20;chatT=12;return pals=v;}
