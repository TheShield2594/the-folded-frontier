// The storybook intro for new worlds and the first-night tutorial (plus hints for paper mechanics).
import {
  $,circ,enclosure,explored,grain,H,held,ink,invOpen,isNight,KEYNAME,META,pad,PADNAME,player,poly,rr,
  saveSettings,SET,SFX,setState,SOLID,state,T,tileAt,toast,W,worldTime,
} from './game.js';

// ================= intro =================
// ~10s storybook: the cover opens, three lines of story appear, then the book dives into the world (the pop-up page effect follows).
// Any key, click or gamepad button skips it.
export let introOn=false;let introEnd=null,introTs=[];
function drawIntroArt(){const c=$('introArt'),t=c.getContext('2d'),w=c.width,h=c.height,pen='rgba(42,33,48,.6)';t.clearRect(0,0,w,h);
  circ(t,282,92,32);t.fillStyle='rgba(241,192,79,.4)';t.fill();ink(t,2.5,pen);for(let k=0;k<10;k++){const a=k/10*6.28;t.beginPath();t.moveTo(282+Math.cos(a)*42,92+Math.sin(a)*42);t.lineTo(282+Math.cos(a)*54,92+Math.sin(a)*54);ink(t,2,pen);}
  t.beginPath();t.moveTo(0,250);t.quadraticCurveTo(120,170,250,236);ink(t,2,'rgba(42,33,48,.3)');
  t.beginPath();t.moveTo(0,300);t.quadraticCurveTo(90,230,180,292);t.quadraticCurveTo(270,352,360,262);t.lineTo(360,440);t.lineTo(0,440);t.closePath();t.fillStyle='rgba(109,187,74,.3)';t.fill();ink(t,3,pen);
  rr(t,62,262,78,50,3);t.fillStyle='rgba(201,143,79,.4)';t.fill();ink(t,2.5,pen);poly(t,[52,264,101,222,150,264]);t.fillStyle='rgba(212,72,59,.4)';t.fill();ink(t,2.5,pen);rr(t,92,280,20,32,3);ink(t,2,pen);
  t.beginPath();t.moveTo(292,322);t.lineTo(292,282);ink(t,5,pen);circ(t,292,262,26);t.fillStyle='rgba(79,157,82,.35)';t.fill();ink(t,2.5,pen);
  t.setLineDash([5,5]);rr(t,196,286,18,30,8);ink(t,2.5,pen);circ(t,205,275,10);ink(t,2.5,pen);t.setLineDash([]);
  for(let x=-10;x<360;x+=14){t.beginPath();t.moveTo(x,430);t.lineTo(x+20,388);ink(t,1.2,'rgba(42,33,48,.16)');}
  grain(t,0,0,w,h,10);}
export function playIntro(done){introEnd=done;introOn=true;setState('intro');$('title').hidden=true;drawIntroArt();const el=$('intro');el.className='';el.hidden=false;void el.offsetWidth;
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seq=rm?[[30,'show open'],[500,'l1'],[1700,'l2'],[2900,'l3'],[5000,'dive'],[5600,null]]
    :[[60,'show',()=>SFX.rustle(.2,.4)],[1300,'open',()=>SFX.unfold()],[2900,'l1'],[4600,'l2'],[6300,'l3'],[8800,'dive',()=>SFX.rustle(.4,.5)],[10200,null]];
  introTs=seq.map(([ms,cls,fx])=>setTimeout(()=>{if(!cls){endIntro();return;}el.classList.add(...cls.split(' '));if(fx)fx();},ms));}
// what the player says once the book has unfolded the world (staged dialogue, see dialogue.js)
export const INTROSAY=['{surprised}Whoa... I am *unfolded!*','{happy}A cabin, a chest of supplies, a whole frontier to ~sketch in~.','{neutral}Better build something before *nightfall.*'];
export function skipIntro(){if(introOn)endIntro();}
function endIntro(){introTs.forEach(clearTimeout);introTs=[];introOn=false;$('intro').hidden=true;$('intro').className='';const f=introEnd;introEnd=null;if(f)f();}
$('intro').addEventListener('click',skipIntro);

// ================= tutorial =================
// tut is saved with the world: s = next basic step, seen = paper hints already shown. Old saves load with everything done.
export let tut={s:99,seen:{}};
export const newTut=()=>({s:0,seen:{}});
const PAD=()=>pad.active,kb=s=>`<kbd>${s}</kbd>`;
const K=a=>kb(PAD()?PADNAME(SET.pad[a]):KEYNAME(SET.bind[a]));
const USE=()=>kb(PAD()?PADNAME(SET.pad.use):'Left click'),INTER=()=>kb(PAD()?PADNAME(SET.pad.interact):'Right click');
const dusk=()=>{const h=19.5-worldTime;return h>0&&h<12?` About ${Math.max(1,Math.round(h*25))} seconds of daylight left.`:'';};
const STEPS=[
  {t:'Stretch your legs',x:()=>PAD()?`Walk with the left stick and jump with ${K('jump')}.`:`Walk with ${K('left')} ${K('right')} and jump with ${K('jump')}.`,start:g=>{g.x0=player.x;g.jumped=false;},done:g=>Math.abs(player.x-g.x0)>6&&g.jumped},
  {t:'Dig in',x:()=>`Hold ${USE()} with your pickaxe to mine the ground. Trees chop the same way and give you wood.`,start:g=>{g.m0=META.stats.mined||0;},done:g=>(META.stats.mined||0)-g.m0>=4},
  {t:'Make something',x:()=>`Press ${K('inv')} to open your backpack. Craft a Workbench from 10 wood, then place it: most recipes need one nearby.`,ev:'craft'},
  {t:'Build a shelter',x:()=>`Night brings monsters. Get indoors before dark: your cabin works, or build a room with walls behind you, blocks around you and a door.${dusk()}`,done:()=>!!enclosure(Math.floor(player.x),Math.floor(player.y+.5))},
  {t:'Survive the night',x:()=>isNight()?'Monsters roam until morning. Stay inside, keep a torch lit, and fight from the doorway if you have to.':'Good, you have a place to hide. Keep exploring, and when night falls head back and wait for morning.',ev:'dawn'},
];
const PAPER={
  peel:{t:'Peel the page',x:()=>`That stone has a curling corner. ${INTER()} it to peel the wall away and see what is behind it.`},
  pop:{t:'Pop it out',x:()=>`A dashed sketch is a bridge or stairs waiting to be made. ${INTER()} it to pop it out of the page.`},
  flat:{t:'Fold flat',x:()=>PAD()?'Hold down on the stick to fold flat and crawl through one-tile gaps. Flattening also dodges hits.':`Hold ${K('flat')} to fold flat and crawl through one-tile gaps. Flattening also dodges hits.`},
};
const g={};let cardKey='',scanT=0,paperT=0,paperOn=null;
export function setTut(v){g.init=false;paperOn=null;cardKey='';return tut=v;}
function nextStep(skip){tut.s++;g.init=false;if(tut.s===STEPS.length){if(skip)toast('Guide finished. Hints still pop up for new paper tricks.');else{toast('You made it through your first night! That is the end of the guide. Hints still pop up for new paper tricks.','gold');SFX.nice();}}}
// gameplay calls this for things the guide waits on: 'craft', 'dawn', 'peel', 'pop', 'flat'
export function guideEv(ev){if(paperOn===ev){paperOn=null;tut.seen[ev]=1;}const st=STEPS[tut.s];if(st&&st.ev===ev)nextStep();}
function nearTile(r,test){const px=Math.floor(player.x),py=Math.floor(player.y+1);for(let y=Math.max(0,py-r);y<=Math.min(H-1,py+r);y++)for(let x=Math.max(0,px-r);x<=Math.min(W-1,px+r);x++)if(explored[y*W+x]&&test(tileAt(x,y)))return true;return false;}
function flatGap(){const p=player;if(!p.onGround||p.flat)return false;const d=held('right')&&!held('left')?1:held('left')&&!held('right')?-1:0;if(!d)return false;const tx=Math.floor(p.x+d*(p.w/2+.35)),fy=Math.floor(p.y+.05);
  return !SOLID[tileAt(tx,fy)]&&SOLID[tileAt(tx,fy+1)]&&SOLID[tileAt(tx,fy-1)];}
function showCard(key,kick,title,text,paper){const el=$('guide');if(key===cardKey&&!el.hidden)return;cardKey=key;$('gdK').textContent=kick;$('gdT').textContent=title;$('gdX').innerHTML=text;$('gdSkip').textContent=paper?'Got it':'Skip';el.classList.toggle('paper',!!paper);el.hidden=false;}
function hideCard(){$('guide').hidden=true;cardKey='';}
export function updateGuide(dt){if(!SET.hints||state!=='play'||player.dead){hideCard();return;}
  if(tut.s<STEPS.length&&isNight()&&tut.s<STEPS.length-1){tut.s=STEPS.length-1;g.init=false;}
  if(held('jump'))g.jumped=true;
  scanT-=dt;if(scanT<=0&&!paperOn){scanT=.4;for(const k of['peel','pop','flat']){if(tut.seen[k])continue;
    if(k==='peel'?nearTile(5,t=>t===T.PEEL):k==='pop'?nearTile(6,t=>t===T.SKETCH):flatGap()){paperOn=k;tut.seen[k]=1;paperT=16;SFX.rustle(.15,.4);break;}}}
  if(paperOn){paperT-=dt;if(paperT<=0){paperOn=null;}else{const P=PAPER[paperOn];showCard('p'+paperOn+PAD(),'Paper trick',P.t,P.x(),true);return;}}
  const st=STEPS[tut.s];if(!st){hideCard();return;}
  if(!g.init){g.init=true;if(st.start)st.start(g);}
  if(st.done&&st.done(g)){nextStep();SFX.ready();return;}
  // the text can change (time left, day or night, gamepad or keys), so refresh it every half second
  g.rt=(g.rt||0)-dt;if(g.rt<=0||cardKey.slice(0,3)!=='s'+tut.s+'|'){g.rt=.5;const x=st.x();showCard('s'+tut.s+'|'+x,`Guide · ${tut.s+1} of ${STEPS.length}`,st.t,x,false);}}
$('gdSkip').addEventListener('click',()=>{if(paperOn){paperOn=null;hideCard();return;}if(tut.s<STEPS.length)nextStep(true);hideCard();});
$('gdOff').addEventListener('click',()=>{SET.hints=false;saveSettings();hideCard();toast('Hints are off. You can turn them back on in Settings.');});
