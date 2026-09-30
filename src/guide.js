// The storybook intro for new worlds and the first-night tutorial (plus hints for paper mechanics).
import {
  reduceMotion,countItem,TRICKS,
  $,circ,enclosure,explored,grain,H,held,ink,invOpen,isNight,KEYNAME,META,pad,PADNAME,player,poly,rr,touch,
  saveSettings,SET,SFX,setState,SOLID,state,T,tileAt,toast,W,worldTime,
  AC,master,musicG,soundOn,applyVolumes,
} from './game.js';

// ================= intro =================
// The storybook for new worlds: the cover opens and a narrator reads seven pages of how the Frontier was folded
// (docs/STORY.md), each page turning when its narration ends. Recorded narration is `assets/voice/intro-<page>.<ext>`
// (bundled by Vite, played through the master volume); without it a natural-sounding system voice reads the page if
// the browser has one, otherwise the text is simply timed. Click, Space, Enter, → or gamepad A turns the page;
// Esc, the Skip button or gamepad Start/B skips the rest. Settings > Narrator voice turns the voice off.
export let introOn=false;let introEnd=null,introTs=[],introPg=-1,introVo=null,introDone=false;
export const INTRO=[
  {art:'sheet',p:['Before there were hills, or rivers, or roads... there was only the First Page.','One great sheet of paper, lying flat and quiet, at the very beginning of everything.']},
  {art:'folders',p:['Then came the Folders: patient makers with careful hands.','They pressed the hills up with their thumbs, and creased the valleys, and where their drawing ink pooled... it became a lake.']},
  {art:'anchors',p:['Out of the deepest folds, paper creatures climbed, and blinked up at the sky.','To keep it all from slipping, the Folders pinned the world down with three great anchors: a tree, a tower, and a dragon.']},
  {art:'keepers',p:['And they chose four keepers to hold the worst of the seams.','A slime to glue the ground. A crane to keep the pines tight. A leviathan to calm the ink. And a folio that remembered every fold ever made.']},
  {art:'failing',p:['That was a long, long time ago.','The Folders have gone quiet. The clock has stopped. Ink rises under the Ink Moon. And the keepers have held on so hard, for so long, that the strain has made them wild.','All across the Frontier, the folds are coming loose.']},
  {art:'wren',p:['The last of the Folders was called Wren.','Wren left letters in the old rooms, tucked away in chests... for whoever came next.']},
  {art:'you',p:['And now, someone has come.','Someone who picked up a pencil...','...and the whole frontier began to unfold.']},
];
const VO=import.meta.glob('../assets/voice/intro-*.{mp3,ogg,m4a,wav}',{eager:true,query:'?url',import:'default'});
const voUrl=i=>{for(const k in VO)if(new RegExp(`/intro-${i+1}\\.\\w+$`).test(k))return VO[k];return null;};
// the system voice, only if it sounds like a person: a male voice marked natural/neural/online/enhanced, or a known good male voice
function sysVoice(){if(!window.speechSynthesis)return null;const vs=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));let best=null,bs=0;
  for(const v of vs){const n=v.name;if(/female|woman|zira|susan|samantha|victoria|karen|moira|tessa|fiona|serena|hazel|libby|sonia|aria|jenny|emma|ava|michelle|natasha|clara|kate/i.test(n))continue;
    let s=0;if(/natural|neural|online|enhanced|premium/i.test(n))s+=4;if(/\b(guy|ryan|christopher|eric|andrew|brian|davis|roger|steffan|thomas|william|george|arthur|oliver|daniel|liam|connor)\b/i.test(n))s+=3;if(/google uk english male/i.test(n))s+=3;if(/male/i.test(n))s+=1;
    if(s>bs){bs=s;best=v;}}
  return bs>=4?best:null;}
if(window.speechSynthesis)speechSynthesis.onvoiceschanged=()=>{};
const pen='rgba(42,33,48,.6)',faint='rgba(42,33,48,.3)';
const IART={
  sheet(t){for(let k=0;k<26;k++){circ(t,(k*137)%360,(k*89)%170+10,k%3?1.2:2);t.fillStyle='rgba(42,33,48,.28)';t.fill();}
    poly(t,[40,250,300,210,340,330,70,380]);t.fillStyle='rgba(255,252,240,.7)';t.fill();ink(t,3,pen);
    t.setLineDash([4,7]);for(const [a,b,c,d] of[[105,240,130,370],[175,229,205,357],[245,218,275,344]]){t.beginPath();t.moveTo(a,b);t.lineTo(c,d);ink(t,1.5,faint);}t.setLineDash([]);
    t.beginPath();t.moveTo(70,380);t.quadraticCurveTo(200,395,340,330);ink(t,1,faint);},
  folders(t){t.beginPath();t.moveTo(0,330);for(let x=0;x<=360;x+=40)t.lineTo(x+20,x%80?300:220-(x%120?0:30)),t.lineTo(x+40,330);t.lineTo(360,440);t.lineTo(0,440);t.closePath();t.fillStyle='rgba(109,187,74,.3)';t.fill();ink(t,3,pen);
    for(let x=20;x<360;x+=40){t.beginPath();t.moveTo(x,x%80===20?260:305);t.lineTo(x,330);ink(t,1.5,faint);}
    t.beginPath();t.ellipse(170,385,78,24,0,0,6.28);t.fillStyle='rgba(58,70,140,.45)';t.fill();ink(t,2.5,pen);
    poly(t,[250,60,272,72,196,196,182,204,184,188]);t.fillStyle='rgba(241,192,79,.45)';t.fill();ink(t,2.5,pen);poly(t,[196,196,182,204,184,188]);t.fillStyle='rgba(42,33,48,.7)';t.fill();
    t.beginPath();t.moveTo(183,205);t.quadraticCurveTo(178,260,172,350);t.setLineDash([3,6]);ink(t,2,'rgba(58,70,140,.55)');t.setLineDash([]);},
  anchors(t){t.beginPath();t.moveTo(0,360);t.quadraticCurveTo(180,320,360,360);t.lineTo(360,440);t.lineTo(0,440);t.closePath();t.fillStyle='rgba(109,187,74,.25)';t.fill();ink(t,2.5,pen);
    t.beginPath();t.moveTo(70,345);t.lineTo(70,250);ink(t,6,pen);poly(t,[30,255,70,170,110,255]);t.fillStyle='rgba(79,157,82,.35)';t.fill();ink(t,2.5,pen);poly(t,[42,215,70,150,98,215]);t.fillStyle='rgba(79,157,82,.3)';t.fill();ink(t,2.5,pen);
    rr(t,160,190,46,146,3);t.fillStyle='rgba(201,143,79,.35)';t.fill();ink(t,2.5,pen);poly(t,[152,192,183,130,214,192]);t.fillStyle='rgba(212,72,59,.35)';t.fill();ink(t,2.5,pen);circ(t,183,222,15);t.fillStyle='rgba(255,252,240,.8)';t.fill();ink(t,2,pen);t.beginPath();t.moveTo(183,222);t.lineTo(183,212);t.moveTo(183,222);t.lineTo(191,226);ink(t,2,pen);
    poly(t,[240,330,262,262,296,290,340,236,322,300,350,318,300,330]);t.fillStyle='rgba(140,170,220,.35)';t.fill();ink(t,2.5,pen);t.beginPath();t.moveTo(262,262);t.lineTo(300,330);t.moveTo(296,290);t.lineTo(322,300);ink(t,1.5,faint);
    t.beginPath();t.moveTo(112,350);t.quadraticCurveTo(112,316,136,316);t.quadraticCurveTo(160,316,160,350);t.closePath();t.fillStyle='rgba(109,187,74,.5)';t.fill();ink(t,2,pen);t.fillStyle='rgba(42,33,48,.8)';circ(t,128,334,2.6);t.fill();circ(t,144,334,2.6);t.fill();},
  keepers(t){const f=(x,y)=>{rr(t,x,y,150,180,10);t.fillStyle='rgba(255,252,240,.5)';t.fill();ink(t,2.5,pen);};f(22,40);f(188,40);f(22,236);f(188,236);
    t.beginPath();t.moveTo(50,200);t.quadraticCurveTo(52,120,97,118);t.quadraticCurveTo(142,120,144,200);t.closePath();t.fillStyle='rgba(109,187,74,.4)';t.fill();ink(t,2.5,pen);poly(t,[74,112,80,88,90,104,97,84,104,104,114,88,120,112]);t.fillStyle='rgba(241,192,79,.55)';t.fill();ink(t,2,pen);t.fillStyle='rgba(42,33,48,.8)';circ(t,85,158,3.5);t.fill();circ(t,109,158,3.5);t.fill();
    poly(t,[210,170,262,120,340,150,280,160,262,196]);t.fillStyle='rgba(240,240,250,.6)';t.fill();ink(t,2.5,pen);poly(t,[262,120,250,70,272,64,268,118]);t.fillStyle='rgba(240,240,250,.6)';t.fill();ink(t,2,pen);poly(t,[250,70,236,78,254,76]);t.fillStyle='rgba(212,72,59,.5)';t.fill();ink(t,1.5,pen);
    t.beginPath();t.moveTo(34,380);for(let k=0;k<4;k++)t.quadraticCurveTo(52+k*30,330,70+k*30,380);ink(t,4,'rgba(58,70,140,.55)');circ(t,154,340,11);t.fillStyle='rgba(58,70,140,.45)';t.fill();ink(t,2,pen);t.beginPath();t.moveTo(30,396);t.quadraticCurveTo(96,380,166,396);ink(t,1.5,faint);
    poly(t,[206,330,262,346,262,396,206,380]);t.fillStyle='rgba(255,252,240,.8)';t.fill();ink(t,2.5,pen);poly(t,[318,330,262,346,262,396,318,380]);t.fillStyle='rgba(255,252,240,.8)';t.fill();ink(t,2.5,pen);
    t.beginPath();t.moveTo(262,340);t.quadraticCurveTo(250,300,264,276);t.quadraticCurveTo(270,300,282,290);t.quadraticCurveTo(284,316,262,340);t.fillStyle='rgba(232,120,50,.45)';t.fill();ink(t,2,pen);},
  failing(t){circ(t,286,78,34);t.fillStyle='rgba(40,40,70,.55)';t.fill();ink(t,2.5,pen);t.beginPath();t.moveTo(270,108);t.quadraticCurveTo(268,126,272,138);ink(t,3,'rgba(40,40,70,.5)');
    rr(t,70,150,110,200,4);t.fillStyle='rgba(201,143,79,.3)';t.fill();ink(t,2.5,pen);poly(t,[62,152,90,126,104,146,120,118,140,142,160,122,188,152]);t.fillStyle='rgba(212,72,59,.3)';t.fill();ink(t,2.5,pen);
    circ(t,125,206,32);t.fillStyle='rgba(255,252,240,.8)';t.fill();ink(t,2.5,pen);t.beginPath();t.moveTo(125,206);t.lineTo(125,182);t.moveTo(125,206);t.lineTo(141,214);ink(t,3,pen);t.beginPath();t.moveTo(112,240);t.lineTo(130,264);t.lineTo(118,290);ink(t,1.5,pen);
    t.beginPath();t.moveTo(0,395);for(let x=0;x<=360;x+=18)t.lineTo(x,x%36?380:400);t.lineTo(360,440);t.lineTo(0,440);t.closePath();t.fillStyle='rgba(40,40,70,.4)';t.fill();ink(t,2.5,pen);
    for(let k=0;k<5;k++){t.beginPath();t.moveTo(210+k*28,380-k*18);t.lineTo(226+k*28,360-k*18);t.lineTo(214+k*28,348-k*18);ink(t,1.5,faint);}},
  wren(t){poly(t,[50,170,310,150,320,330,60,350]);t.fillStyle='rgba(255,248,226,.9)';t.fill();ink(t,3,pen);t.beginPath();t.moveTo(50,170);t.lineTo(186,262);t.lineTo(310,150);ink(t,2.5,pen);
    for(let k=0;k<3;k++){t.beginPath();t.moveTo(90,290+k*14);t.lineTo(170-k*20,285+k*14);ink(t,1.5,faint);}
    circ(t,186,262,24);t.fillStyle='rgba(180,50,50,.6)';t.fill();ink(t,2.5,pen);t.beginPath();t.moveTo(172,252);t.lineTo(179,274);t.lineTo(186,258);t.lineTo(193,274);t.lineTo(200,252);ink(t,2.5,'rgba(255,240,220,.9)');
    t.beginPath();t.moveTo(300,70);t.quadraticCurveTo(250,90,232,176);t.quadraticCurveTo(284,120,300,70);t.fillStyle='rgba(255,252,240,.8)';t.fill();ink(t,2.5,pen);t.beginPath();t.moveTo(300,70);t.lineTo(226,196);ink(t,1.5,pen);},
  you(t){circ(t,282,92,32);t.fillStyle='rgba(241,192,79,.4)';t.fill();ink(t,2.5,pen);for(let k=0;k<10;k++){const a=k/10*6.28;t.beginPath();t.moveTo(282+Math.cos(a)*42,92+Math.sin(a)*42);t.lineTo(282+Math.cos(a)*54,92+Math.sin(a)*54);ink(t,2,pen);}
    t.beginPath();t.moveTo(0,250);t.quadraticCurveTo(120,170,250,236);ink(t,2,faint);
    t.beginPath();t.moveTo(0,300);t.quadraticCurveTo(90,230,180,292);t.quadraticCurveTo(270,352,360,262);t.lineTo(360,440);t.lineTo(0,440);t.closePath();t.fillStyle='rgba(109,187,74,.3)';t.fill();ink(t,3,pen);
    rr(t,62,262,78,50,3);t.fillStyle='rgba(201,143,79,.4)';t.fill();ink(t,2.5,pen);poly(t,[52,264,101,222,150,264]);t.fillStyle='rgba(212,72,59,.4)';t.fill();ink(t,2.5,pen);rr(t,92,280,20,32,3);ink(t,2,pen);
    t.beginPath();t.moveTo(292,322);t.lineTo(292,282);ink(t,5,pen);circ(t,292,262,26);t.fillStyle='rgba(79,157,82,.35)';t.fill();ink(t,2.5,pen);
    t.setLineDash([5,5]);rr(t,196,286,18,30,8);ink(t,2.5,pen);circ(t,205,275,10);ink(t,2.5,pen);t.setLineDash([]);},
};
function drawIntroArt(i){const c=$('introArt'),t=c.getContext('2d'),w=c.width,h=c.height;t.clearRect(0,0,w,h);IART[INTRO[i].art](t);
  for(let x=-10;x<360;x+=14){t.beginPath();t.moveTo(x,430);t.lineTo(x+20,388);ink(t,1.2,'rgba(42,33,48,.16)');}grain(t,0,0,w,h,10);}
const iT=(ms,f)=>introTs.push(setTimeout(f,ms));
function setPage(i){const pg=INTRO[i],el=$('introTxt');el.innerHTML='';pg.p.forEach((s,k)=>{const p=document.createElement('p');p.textContent=s;if(i===INTRO.length-1&&k===pg.p.length-1)p.className='fin';el.appendChild(p);});
  $('introNo').textContent=`${i+1} / ${INTRO.length}`;}
function stopVo(){if(introVo){introVo.onended=introVo.onerror=null;introVo.pause();introVo=null;}if(window.speechSynthesis)speechSynthesis.cancel();}
// read page i aloud; each paragraph appears as the narrator reaches it, then the page turns
function narrate(i){introPg=i;const pg=INTRO[i],txt=pg.p.join(' '),ps=[...$('introTxt').children],n=txt.length;let t0=null,dur=Math.max(3500,n*62),fin=false;
  const reveal=d=>{let c=0;ps.forEach((p,k)=>{iT(k?c/n*d:0,()=>p.classList.add('on'));c+=pg.p[k].length+1;});};
  const done=()=>{if(fin||introPg!==i)return;fin=true;ps.forEach(p=>p.classList.add('on'));iT(i===INTRO.length-1?1600:1000,()=>next());};
  let tS=false,last=null;const timed=()=>{if(tS||introPg!==i)return;tS=true;if(last)last.onend=last.onerror=null;reveal(dur);iT(dur,done);};
  // the system voice (when it sounds like a person), else timed text; a cancel or a failed utterance falls back to timed text once
  const speak=()=>{const v=sysVoice();if(!v){timed();return;}
    speechSynthesis.cancel();let started=false;
    pg.p.forEach((s,k)=>{const u=new SpeechSynthesisUtterance(s);u.voice=v;u.lang=v.lang;u.rate=.9;u.pitch=.85;u.volume=Math.min(1,SET.vol/100);
      u.onstart=()=>{started=true;ps[k].classList.add('on');};if(k===pg.p.length-1){u.onend=done;u.onerror=timed;last=u;}speechSynthesis.speak(u);});
    iT(1800,()=>{if(!started&&introPg===i){if(last)last.onend=last.onerror=null;speechSynthesis.cancel();timed();}});iT(dur*2+4000,done);};
  if(!SET.narr||!soundOn){timed();return;}
  const url=voUrl(i);
  if(url){const a=new Audio(url);introVo=a;a.preload='auto';const fail=()=>{if(introVo===a){introVo=null;speak();}};
    if(AC&&master){try{if(AC.state==='suspended')AC.resume();const g=AC.createGain();g.gain.value=1.4;AC.createMediaElementSource(a).connect(g).connect(master);}catch(e){a.volume=Math.min(1,SET.vol/100);}}else a.volume=Math.min(1,SET.vol/100);
    a.onloadedmetadata=()=>{if(introPg===i&&isFinite(a.duration))reveal(a.duration*1000);};a.onended=done;a.onerror=fail;
    a.play().catch(fail);iT(90000,done);return;}
  speak();}
function turn(i){introTs.forEach(clearTimeout);introTs=[];stopVo();introPg=i;const el=$('intro'),rm=reduceMotion();SFX.rustle(.35,.5);
  el.classList.add('fade');el.classList.remove('turn');void el.offsetWidth;if(!rm)el.classList.add('turn');
  iT(rm?300:450,()=>{drawIntroArt(i);setPage(i);el.classList.remove('fade');});iT(rm?700:1000,()=>narrate(i));}
function next(){if(!introOn||introDone)return;if(introPg<INTRO.length-1)turn(introPg+1);else finishIntro();}
function finishIntro(){introTs.forEach(clearTimeout);introTs=[];stopVo();introDone=true;$('intro').classList.add('dive');SFX.rustle(.4,.5);iT(reduceMotion()?600:1400,endIntro);}
export function playIntro(done){introEnd=done;introOn=true;introDone=false;introPg=-1;setState('intro');$('title').hidden=true;drawIntroArt(0);setPage(0);const el=$('intro');el.className='';el.hidden=false;void el.offsetWidth;
  if(musicG&&AC)musicG.gain.setTargetAtTime(SET.music/100*.3,AC.currentTime,.6);
  const rm=reduceMotion();
  const seq=rm?[[30,'show open'],[700,()=>narrate(0)]]:[[60,'show',()=>SFX.rustle(.2,.4)],[1300,'open',()=>SFX.unfold()],[2700,()=>narrate(0)]];
  seq.forEach(([ms,cls,fx])=>iT(ms,()=>{if(typeof cls==='function'){cls();return;}el.classList.add(...cls.split(' '));if(fx)fx();}));}
// what the player says once the book has unfolded the world (staged dialogue, see dialogue.js)
export const INTROSAY=['{surprised}Whoa... I am *unfolded!*','{happy}A cabin, a chest of supplies, a whole frontier to ~sketch in~.','{neutral}Better build something before *nightfall.*'];
// click, Space, Enter, → or gamepad A: turn the page (before the narration starts, start it)
export function introNext(){if(!introOn||introDone)return;if(introPg<0){introTs.forEach(clearTimeout);introTs=[];$('intro').classList.add('show','open');narrate(0);return;}next();}
export function skipIntro(){if(introOn&&!introDone)finishIntro();}
function endIntro(){introTs.forEach(clearTimeout);introTs=[];stopVo();introOn=false;introDone=false;introPg=-1;$('intro').hidden=true;$('intro').className='';applyVolumes();const f=introEnd;introEnd=null;if(f)f();}
$('intro').addEventListener('click',introNext);
$('introSkip').addEventListener('click',e=>{e.stopPropagation();skipIntro();});

// ================= tutorial =================
// tut is saved with the world: s = next basic step, seen = paper hints already shown. Old saves load with everything done.
export let tut={s:99,seen:{}};
export const newTut=()=>({s:0,seen:{}});
const PAD=()=>pad.active,TOUCH=()=>touch.on&&!pad.active,kb=s=>`<kbd>${s}</kbd>`;
// on touch, name the on-screen button
const TBTN={jump:'Jump',inv:'Bag',flat:'Flat',dash:'Dash',hook:'Hook',heal:'Heal',map:'Map',interact:'Talk',block:'Block'};
const K=a=>kb(PAD()?PADNAME(SET.pad[a]):TOUCH()&&TBTN[a]?TBTN[a]:KEYNAME(SET.bind[a]));
const USE=()=>kb(PAD()?PADNAME(SET.pad.use):TOUCH()?'Use':'Left click'),INTER=()=>kb(PAD()?PADNAME(SET.pad.interact):TOUCH()?'Tap':'Right click');
const dusk=()=>{const h=19.5-worldTime;return h>0&&h<12?` About ${Math.max(1,Math.round(h*25))} seconds of daylight left.`:'';};
const STEPS=[
  {t:'Stretch your legs',x:()=>PAD()||TOUCH()?`Walk with the ${TOUCH()?'':'left '}stick and jump with ${K('jump')}.`:`Walk with ${K('left')} ${K('right')} and jump with ${K('jump')}.`,start:g=>{g.x0=player.x;g.jumped=false;},done:g=>Math.abs(player.x-g.x0)>6&&g.jumped},
  {t:'Dig in',x:()=>`Hold ${USE()}${TOUCH()?' (or touch the ground)':''} with your pickaxe to mine the ground. Trees chop the same way and give you wood.`,start:g=>{g.m0=META.stats.mined||0;},done:g=>(META.stats.mined||0)-g.m0>=4},
  {t:'Make something',x:()=>`Press ${K('inv')} to open your backpack. Craft a Workbench from 10 wood, then place it: most recipes need one nearby.`,ev:'craft'},
  {t:'Build a shelter',x:()=>`Night brings monsters. Get indoors before dark: your cabin works, or build a room with walls behind you, blocks around you and a door.${dusk()}`,done:()=>!!enclosure(Math.floor(player.x),Math.floor(player.y+.5))},
  {t:'Survive the night',x:()=>isNight()?'Monsters roam until morning. Stay inside, keep a torch lit, and fight from the doorway if you have to.':'Good, you have a place to hide. Keep exploring, and when night falls head back and wait for morning.',ev:'dawn'},
];
const PAPER={
  peel:{t:'Peel the page',x:()=>`That stone has a curling corner. ${INTER()} it to peel the wall away and see what is behind it.`},
  pop:{t:'Pop it out',x:()=>`A dashed sketch is a bridge or stairs waiting to be made. ${INTER()} it to pop it out of the page.`},
  tear:{t:'Tear the seam',x:()=>`That rock is stitched shut. With the Seam Ripper in your backpack, ${INTER()} the seam to tear it open.`},
  stitch:{t:'Stitch it shut',x:()=>`The page is torn through here. With the Golden Needle in your backpack, ${INTER()} the tear to sew it into a paper bridge.`},
  fold:{t:'Fold the page',x:()=>`A crease mark folds the page onto its partner somewhere else. With the Bone Folder in your backpack, ${INTER()} the crease to step through.`},
  flat:{t:'Fold flat',x:()=>PAD()?`Hold down on the stick${SET.pad.flat>=0?` or ${K('flat')}`:''} to fold flat and crawl through one-tile gaps. Flattening also dodges hits.`:`Hold ${K('flat')} to fold flat and crawl through one-tile gaps. Flattening also dodges hits.`},
};
const g={};let cardKey='',scanT=0,paperT=0,paperOn=null;
export function setTut(v){g.init=false;paperOn=null;cardKey='';return tut=v;}
function nextStep(skip){tut.s++;g.init=false;if(tut.s===STEPS.length){if(skip)toast('Guide finished. Hints still pop up for new paper tricks.');else{toast('You made it through your first night! That is the end of the guide. Hints still pop up for new paper tricks.','gold');SFX.nice();}}}
// gameplay calls this for things the guide waits on: 'craft', 'dawn', 'peel', 'pop', 'flat', and the paper tricks 'tear', 'stitch', 'fold' (tricks.js)
// a paper trick done counts as its hint seen, card up or not, so the hint never shows after the fact
export function guideEv(ev){if(paperOn===ev)paperOn=null;if(PAPER[ev])tut.seen[ev]=1;const st=STEPS[tut.s];if(st&&st.ev===ev)nextStep();}
function nearTile(r,test){const px=Math.floor(player.x),py=Math.floor(player.y+1);for(let y=Math.max(0,py-r);y<=Math.min(H-1,py+r);y++)for(let x=Math.max(0,px-r);x<=Math.min(W-1,px+r);x++)if(explored[y*W+x]&&test(tileAt(x,y)))return true;return false;}
function flatGap(){const p=player;if(!p.onGround||p.flat)return false;const d=held('right')&&!held('left')?1:held('left')&&!held('right')?-1:0;if(!d)return false;const tx=Math.floor(p.x+d*(p.w/2+.35)),fy=Math.floor(p.y+.05);
  return !SOLID[tileAt(tx,fy)]&&SOLID[tileAt(tx,fy+1)]&&SOLID[tileAt(tx,fy-1)];}
function showCard(key,kick,title,text,paper){const el=$('guide');if(key===cardKey&&!el.hidden)return;cardKey=key;$('gdK').textContent=kick;$('gdT').textContent=title;$('gdX').innerHTML=text;$('gdSkip').textContent=paper?'Got it':'Skip';el.classList.toggle('paper',!!paper);el.hidden=false;}
function hideCard(){$('guide').hidden=true;cardKey='';}
export function updateGuide(dt){if(!SET.hints||state!=='play'||player.dead){hideCard();return;}
  if(tut.s<STEPS.length&&isNight()&&tut.s<STEPS.length-1){tut.s=STEPS.length-1;g.init=false;}
  if(held('jump'))g.jumped=true;
  scanT-=dt;if(scanT<=0&&!paperOn){scanT=.4;for(const k of['peel','pop','flat','tear','stitch','fold']){if(tut.seen[k])continue;
    // the paper tricks from tools (TRICKS) show once you carry the tool near a spot that needs it, the first time it is usable
    const tk=TRICKS[k];if(tk?countItem(tk.item)>0&&nearTile(6,t=>t===tk.tile):k==='peel'?nearTile(5,t=>t===T.PEEL):k==='pop'?nearTile(6,t=>t===T.SKETCH):flatGap()){paperOn=k;tut.seen[k]=1;paperT=16;SFX.rustle(.15,.4);break;}}}
  if(paperOn){paperT-=dt;if(paperT<=0){paperOn=null;}else{const P=PAPER[paperOn];showCard('p'+paperOn+PAD(),'Paper trick',P.t,P.x(),true);return;}}
  const st=STEPS[tut.s];if(!st){hideCard();return;}
  if(!g.init){g.init=true;if(st.start)st.start(g);}
  if(st.done&&st.done(g)){nextStep();SFX.ready();return;}
  // the text can change (time left, day or night, gamepad or keys), so refresh it every half second
  g.rt=(g.rt||0)-dt;if(g.rt<=0||cardKey.slice(0,3)!=='s'+tut.s+'|'){g.rt=.5;const x=st.x();showCard('s'+tut.s+'|'+x,`Guide · ${tut.s+1} of ${STEPS.length}`,st.t,x,false);}}
$('gdSkip').addEventListener('click',()=>{if(paperOn){paperOn=null;hideCard();return;}if(tut.s<STEPS.length)nextStep(true);hideCard();});
$('gdOff').addEventListener('click',()=>{SET.hints=false;saveSettings();hideCard();toast('Hints are off. You can turn them back on in Settings.');});
