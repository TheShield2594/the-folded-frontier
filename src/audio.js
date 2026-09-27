// Web Audio: sound effects, music sequencer and biome ambience.
import {
  BIO,biomeAt,boss,clamp,curBio,dayF,enemies,pick,player,rainF,rand,randi,SET,state,surf,T,tileAt,W,
  wind,worldClock,worldTime,wev,
} from './game.js';

// ================= audio =================
export let AC=null,master=null,musicG=null,sfxG=null,ambG=null,ambBus=null,noiseBuf=null,ambBuf=null,soundOn=SET.snd!==false;
export function applyVolumes(){if(!AC)return;master.gain.value=soundOn?SET.vol/100*.7:0;musicG.gain.value=SET.music/100*.9;sfxG.gain.value=SET.sfx/100;ambG.gain.value=SET.amb/100;}
export function initAudio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=soundOn?.55:0;master.connect(AC.destination);musicG=AC.createGain();musicG.connect(master);sfxG=AC.createGain();sfxG.connect(master);ambG=AC.createGain();ambG.connect(master);ambBus=AC.createGain();ambBus.gain.value=0;ambBus.connect(ambG);applyVolumes();
  noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  ambBuf=AC.createBuffer(1,AC.sampleRate*4,AC.sampleRate);const a=ambBuf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}catch(e){AC=null;}}
export function tone(f0,f1,dur,type='sine',vol=.2,delay=0,dest){if(!AC||!soundOn)return;const t=AC.currentTime+delay;const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(f1,20),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g).connect(dest||sfxG);o.start(t);o.stop(t+dur+.05);}
export function noise(dur,vol,type='bandpass',freq=1200,delay=0,q=1,dest){if(!AC||!soundOn)return;const t=AC.currentTime+delay;const s=AC.createBufferSource();s.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f).connect(g).connect(dest||sfxG);s.start(t,Math.random()*.5);s.stop(t+dur+.02);}
// vr(): small random pitch spread so repeated sounds don't repeat exactly; pick([...])() chooses one of a few variants
const vr=(a=.08)=>1+rand(-a,a);
export const SFX={
  dig:()=>{const v=vr(.15);pick([()=>{noise(.09,.35,'bandpass',1200*v,0,1.5);noise(.05,.2,'highpass',3000*v);},()=>{noise(.07,.32,'bandpass',900*v,0,2);tone(180*v,110*v,.06,'triangle',.1);},()=>{noise(.1,.3,'bandpass',1500*v,0,1.2);noise(.04,.18,'bandpass',2600*v,.03,3);}])();},
  brk:()=>{const v=vr(.12);noise(.18,.4,'lowpass',900*v);tone(220*v,90*v,.12,'triangle',.15);if(Math.random()<.5)for(let i=0;i<4;i++)noise(.03,.16,'bandpass',rand(1800,3800),.03+i*.03,2.5);},
  place:()=>{const v=vr(.1);pick([()=>{tone(200*v,110*v,.08,'triangle',.25);noise(.05,.2,'bandpass',600*v);},()=>{tone(240*v,130*v,.07,'triangle',.22);noise(.04,.22,'bandpass',900*v,0,1.4);},()=>{tone(170*v,100*v,.09,'sine',.25);noise(.06,.16,'lowpass',800*v);}])();},
  swing:()=>noise(rand(.11,.17),.18,'highpass',rand(1800,2600),0,rand(.5,.9)),
  hit:()=>{const v=vr(.12);pick([()=>{tone(260*v,120*v,.1,'square',.08);noise(.08,.3,'bandpass',900*v);},()=>{tone(300*v,140*v,.08,'triangle',.12);noise(.06,.32,'highpass',2200*v,0,.8);},()=>{tone(220*v,100*v,.11,'square',.07);for(let i=0;i<3;i++)noise(.03,.22,'bandpass',rand(1500,3200),i*.025,2.5);}])();},
  nice:()=>{[660,880,1320].forEach((f,i)=>tone(f,f,.16,'triangle',.18,i*.06));},
  cue:()=>tone(1760,1760,.04,'sine',.05),
  pick:()=>{const f=pick([880,988,1109,1175]);tone(f,f*1.5,.08,'sine',.15);},
  coin:()=>{const v=pick([1,1.06,.94]);tone(1250*v,1250*v,.06,'square',.06);tone(1660*v,1660*v,.12,'square',.06,.06);},
  hurt:()=>{const v=vr(.1);tone(300*v,90*v,.25,'sawtooth',.12);noise(.12,.3,'lowpass',700*v);for(let i=0;i<3;i++)noise(.03,.15,'bandpass',rand(1800,3600),.02+i*.03,2.5);},
  jump:()=>{const v=vr(.06);tone(280*v,520*v,.1,'sine',.1);},
  door:()=>{noise(.15,.25,'lowpass',500);tone(140,100,.12,'triangle',.12);},
  craft:()=>{tone(523,523,.12,'triangle',.14);tone(659,659,.12,'triangle',.14,.05);tone(784,784,.2,'triangle',.14,.1);},
  stomp:()=>{const v=vr(.1);tone(180*v,60*v,.12,'square',.12);noise(.08,.3,'lowpass',400*v);},
  boom:()=>{tone(90,40,.5,'sawtooth',.2);noise(.5,.4,'lowpass',300);},
  potion:()=>{tone(400,800,.3,'sine',.12);tone(600,1200,.3,'sine',.08,.08);},
  bow:()=>{tone(430,170,.13,'triangle',.13);noise(.07,.22,'highpass',2600);},
  cast:()=>{tone(620,1240,.18,'sine',.09);tone(930,1860,.22,'triangle',.05,.03);},
  star:()=>{tone(1500,480,.45,'sine',.06);},
  dash:()=>{noise(.16,.3,'bandpass',rand(2400,3000),0,.8);tone(520,260,.12,'triangle',.07);},
  ready:()=>tone(1320,1760,.06,'sine',.05),
  heave:()=>{noise(.3,.22,'lowpass',700,0,.7);tone(170,95,.25,'triangle',.08);},
  slam:()=>{tone(110,40,.3,'square',.14);noise(.28,.45,'lowpass',420);},
  draw:()=>{tone(170,240,.4,'triangle',.05);noise(.35,.07,'bandpass',900,0,4);},
  full:()=>{tone(1320,1320,.06,'sine',.08);tone(1980,1980,.12,'sine',.07,.05);},
  snap:()=>tone(760,320,.1,'square',.07),
  raise:()=>{noise(.08,.18,'bandpass',700);tone(240,200,.06,'triangle',.08);},
  block:()=>{tone(420,300,.1,'square',.08);noise(.1,.3,'bandpass',1800,0,2);},
  parry:()=>{[1568,2093,2637].forEach((f,i)=>tone(f,f*.99,.22,'triangle',.12,i*.03));noise(.12,.35,'highpass',4000);},
  sizzle:()=>noise(.35,.2,'highpass',3500),
  die:()=>{[392,330,262,196].forEach((f,i)=>tone(f,f*.98,.3,'triangle',.16,i*.18));},
  tear:()=>{for(let i=0;i<7;i++)noise(.05,.32,'bandpass',rand(1400,3200),i*.04,2);tone(320,110,.4,'sawtooth',.06);noise(.4,.2,'lowpass',600,.1);},
  refold:()=>{[392,523,659,784].forEach((f,i)=>tone(f,f,.16,'triangle',.1,i*.05));noise(.18,.25,'lowpass',900);},
  fcast:()=>{noise(.22,.18,'highpass',rand(2200,2800),0,.6);tone(900,500,.18,'sine',.05);},
  splash:()=>{noise(.3,.3,'lowpass',900,0,.8);tone(260,120,.15,'sine',.08);},
  bite:()=>{tone(700,260,.1,'sine',.14);noise(.12,.25,'lowpass',1200);tone(1320,1320,.05,'square',.04,.08);},
  reel:()=>{for(let i=0;i<5;i++)tone(1800,1700,.02,'square',.03,i*.035);},
  catch:()=>{noise(.25,.3,'lowpass',1100);[523,659,784,1047].forEach((f,i)=>tone(f,f,.14,'triangle',.12,.08+i*.06));},
  // paper: rustle = scattered crinkles over a soft swish; crunch = tight crumple when flattening; peel = a long tearing strip
  rustle:(len=.4,vol=1)=>{const n=Math.round(len*24);for(let i=0;i<n;i++)noise(rand(.02,.06),rand(.07,.18)*vol,'bandpass',rand(2000,5500),rand(0,len),rand(1.5,4));noise(len,.1*vol,'bandpass',rand(900,1400),0,.6);},
  crunch:()=>{const v=vr(.1);for(let i=0;i<10;i++)noise(.025,rand(.18,.3),'bandpass',rand(1500,4500),i*.012+rand(0,.01),2.5);tone(160*v,70*v,.1,'triangle',.12);noise(.08,.22,'lowpass',600*v);},
  unfold:()=>{noise(.12,.1,'bandpass',rand(1800,2400),0,.9);tone(200,340,.08,'triangle',.05);},
  peel:()=>{SFX.rustle(.7);for(let i=0;i<14;i++)noise(.045,.22,'bandpass',1100+i*170+rand(-80,80),i*.04,3);tone(420,160,.5,'sawtooth',.025);},
};
// music: a small step sequencer. Each track is 8 bars of 8th notes: mel is one char per step (hex scale degree, '-' holds, '.' rests),
// ch is the chord root (scale degree) per bar, bp the bass rhythm and dr the drums (k kick, s snare, h hat) per bar.
// setMusic() crossfades tracks: each one plays into its own gain under musicG, and the old one fades out while the new one fades in.
const MSC={maj:[0,2,4,5,7,9,11],hmin:[0,2,3,5,7,8,11],phd:[0,1,4,5,7,8,10],lyd:[0,2,4,6,7,9,11]};
const MUS={
  title:{bpm:84,root:67,sc:'maj',lead:'triangle',lv:.05,ch:[0,3,5,4,0,3,4,0],bp:'x...x...',dr:'........',arp:1,
    mel:'4-5-4-2-5---3---4-2-1-2-1-------4-5-7-5-8-7-5---4-2-5-1-0-------'},
  forest:{bpm:100,root:72,sc:'maj',lead:'triangle',lv:.045,ch:[0,5,3,4,0,5,4,0],bp:'x..x.x..',dr:'k.h.s.h.',
    mel:'7-4-5-4-2-4-5---5-7-8-7-6-4-----7-4-5-4-9-8-7---6-8-6-4-7-------'},
  desert:{bpm:88,root:62,sc:'phd',lead:'square',lv:.022,ch:[0,1,0,-1,0,1,3,0],bp:'x.x...x.',dr:'k..hk.s.',echo:1,
    mel:'0-1-2---1-0-----4-5-4-2-1-2-0---7-6-5-4-5-4-2-1-2-4-3-2-1-0-----'},
  snow:{bpm:76,root:74,sc:'maj',lead:'sine',lv:.05,ch:[0,4,5,3,0,4,3,0],bp:'x.......',dr:'....h...',echo:1,
    mel:'7-.-9-.-8---4---9-.-b-.-a-------7-9-b-9-8-5-4---5-4-2-4-7-------'},
  lake:{bpm:72,root:65,sc:'lyd',lead:'sine',lv:.045,ch:[0,1,0,1,4,3,1,0],bp:'x...x...',dr:'........',arp:1,
    mel:'4---6-5-4---1---2-3-4-.-3-------7---6-4-5-4-3---2-1-2-4-0-------'},
  under:{bpm:116,root:57,sc:'hmin',lead:'sawtooth',lv:.02,ch:[0,5,3,4,0,5,4,4],bp:'xxxxxxxx',dr:'k.h.s.hk',day:1,
    mel:'0-2-4-6-7-6-4---3-4-5-4-6-------7-9-8-7-5-4-3-2-1-2-3-6-4-------'},
  boss:{bpm:142,root:62,sc:'hmin',lead:'square',lv:.03,ch:[0,0,5,4,0,0,5,6],bp:'x.xxx.xx',dr:'k.skk.sh',day:1,
    mel:'0.0.2.3.4-3-2-0-5.5.4.3.6-------7.7.6.5.4-5-6-4-5.4.3.2.6---4---'},
};
const mdeg=(M,d)=>{const s=MSC[M.sc],n=s.length;return M.root+12*Math.floor(d/n)+s[((d%n)+n)%n];};
const mhz=m=>440*Math.pow(2,(m-69)/12);
let mCur=null;const mTr=[];
export function setMusic(k){if(!AC||mCur===k)return;mCur=k;const t=AC.currentTime;for(const r of mTr)if(!r.out){r.out=true;r.g.gain.cancelScheduledValues(t);r.g.gain.setTargetAtTime(0,t,.7);r.end=t+5;}
  if(!k)return;const g=AC.createGain();g.gain.setValueAtTime(0,t);g.gain.setTargetAtTime(1,t+.3,.9);g.connect(musicG);mTr.push({k,g,step:0,next:t+.3});}
function musicNote(M,r,dl,st,night){const s=r.step%64,bar=s>>3,b=s&7,ch=M.ch[bar],soft=night&&!M.day?.55:1,c=M.mel[s];
  if(c!=='.'&&c!=='-'){let n=1;while(n<8&&M.mel[(s+n)%64]==='-')n++;const f=mhz(mdeg(M,parseInt(c,16)));tone(f,f,st*n+.1,M.lead,M.lv*soft,dl,r.g);if(M.echo)tone(f*2,f*2,st*n,'sine',M.lv*.3*soft,dl+st*1.5,r.g);}
  if(M.bp[b]!=='.'){const f=mhz(mdeg(M,ch)-24);tone(f,f,st*1.8,'triangle',.07,dl,r.g);}
  if(b===0)for(const k of[0,2,4]){const f=mhz(mdeg(M,ch+k)-12);tone(f,f,st*8,'sine',.016*soft,dl,r.g);}
  if(M.arp){const f=mhz(mdeg(M,ch+[0,2,4,7][b%4]));tone(f,f,st*1.6,'sine',.018*soft,dl,r.g);}
  const d=M.dr[b];if(soft===1){if(d==='k')tone(120,45,.18,'sine',.16,dl,r.g);else if(d==='s')noise(.12,.1,'bandpass',1800,dl,.8,r.g);else if(d==='h')noise(.03,.05,'highpass',7000,dl,1,r.g);}}
export function music(dt,night){if(!AC)return;const now=AC.currentTime;
  for(let i=mTr.length-1;i>=0;i--){const r=mTr[i];if(r.out&&now>r.end){r.g.disconnect();mTr.splice(i,1);continue;}
    const M=MUS[r.k],st=30/M.bpm;if(r.next<now)r.next=now+.02;while(r.next<now+.2){musicNote(M,r,r.next-now,st,night);r.next+=st;r.step++;}}}
export function pickMusic(){if(state==='title'||state==='intro')return 'title';if(boss&&!boss.dying&&enemies.includes(boss)||wev.k==='army')return 'boss';return MUS[curBio]?curBio:'forest';}
// ambience: looping noise beds (wind, water, rumble, cave air) plus one-shots (birds, crickets, drips, embers, bubbles).
// Each layer's weight follows the biome, depth, nearby liquid and time of day, and eases toward its target so changes crossfade.
const AMB={},AMBW={wind:0,water:0,rumble:0,cave:0,birds:0,crickets:0,drips:0,embers:0,bubbles:0},AMBT={birds:2,crickets:1,drips:3,embers:.5,bubbles:2};let ambLiq=[0,0],ambLiqT=0;
function ambLoop(type,freq,q){const s=AC.createBufferSource();s.buffer=ambBuf;s.loop=true;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=AC.createGain();g.gain.value=0;s.connect(f).connect(g).connect(ambBus);s.start(0,Math.random()*3);return{f,g};}
function ambientTargets(){const p=player,T0={};for(const k in AMBW)T0[k]=0;if(state!=='play'||!BIO||!BIO.uw)return T0;
  const b=biomeAt(p.x,p.y),sy=surf[clamp(Math.floor(p.x),0,W-1)],top=clamp((p.y-(sy-14))/10,0,1),day=dayF(worldTime),night=1-day,dry=1-rainF*.8;
  ambLiqT-=1;if(ambLiqT<=0){ambLiqT=30;let ink=0,lava=0;const px=Math.floor(p.x),py=Math.floor(p.y);for(let y=py-6;y<=py+6;y++)for(let x=px-10;x<=px+10;x++){const t=tileAt(x,y);if(t===T.INK)ink++;else if(t===T.LAVA)lava++;}ambLiq=[Math.min(1,ink/40),Math.min(1,lava/30)];}
  if(b==='under'){T0.rumble=.8+ambLiq[1]*.4;T0.embers=1;T0.wind=.15;return T0;}
  T0.wind=top*(b==='snow'?1:b==='desert'?.75:b==='lake'?.5:.4)*(1+night*.25)*(1+Math.abs(wind)*.8);
  T0.water=Math.max(b==='lake'?top*.8:0,ambLiq[0]);T0.bubbles=T0.water;T0.rumble=ambLiq[1]*.6;
  T0.cave=1-top;T0.drips=(1-top)*(1-ambLiq[1]);
  T0.birds=top*day*dry*(b==='forest'?1:b==='lake'?.6:b==='desert'?.35:.25);
  T0.crickets=top*night*dry*(b==='snow'?0:b==='desert'?.7:1);return T0;}
export function updateAmbience(dt){if(!AC||!ambBus)return;const t=AC.currentTime;
  if(!AMB.wind){AMB.wind=ambLoop('bandpass',420,.8);AMB.water=ambLoop('lowpass',520,.7);AMB.rumble=ambLoop('lowpass',110,.9);AMB.cave=ambLoop('bandpass',190,3);}
  ambBus.gain.setTargetAtTime(state==='play'?1:0,t,state==='play'?.8:.25);
  const tg=ambientTargets();for(const k in AMBW)AMBW[k]+=(tg[k]-AMBW[k])*Math.min(1,dt*.7);const w=AMBW,c=worldClock;
  const desert=BIO&&BIO.uw&&biomeAt(player.x,player.y)==='desert';
  AMB.wind.f.frequency.setTargetAtTime((desert?760:360)+180*Math.sin(c*.13)+90*Math.sin(c*.37),t,.3);AMB.wind.g.gain.setTargetAtTime(w.wind*(.1+.05*Math.sin(c*.21)+.03*Math.sin(c*.9)),t,.2);
  AMB.water.g.gain.setTargetAtTime(w.water*(.06+.035*Math.sin(c*.7)+.02*Math.sin(c*1.9)),t,.15);
  AMB.rumble.g.gain.setTargetAtTime(w.rumble*(.16+.04*Math.sin(c*.5)),t,.3);AMB.cave.g.gain.setTargetAtTime(w.cave*.035,t,.3);
  if(!soundOn)return;for(const k in AMBT){AMBT[k]-=dt;if(AMBT[k]>0)continue;const v=w[k];
    if(k==='birds'){AMBT[k]=rand(1.2,4);if(v>.05){const f=rand(2200,3600),n=randi(2,4);for(let i=0;i<n;i++)tone(f*rand(.9,1.1),f*rand(1.15,1.4),.07,'sine',.035*v,i*.1,ambBus);}}
    else if(k==='crickets'){AMBT[k]=rand(.5,1.3);if(v>.05){const f=rand(4200,4700);for(let i=0;i<3;i++)tone(f,f*.98,.028,'sine',.018*v,i*.05,ambBus);}}
    else if(k==='drips'){AMBT[k]=rand(2,6);if(v>.05){const f=rand(1300,2100);tone(f,f*.45,.1,'sine',.05*v,0,ambBus);tone(f*.9,f*.4,.1,'sine',.015*v,.22,ambBus);}}
    else if(k==='embers'){AMBT[k]=rand(.08,.5);if(v>.05)noise(.02,.14*v,'highpass',rand(2500,5000),0,1,ambBus);}
    else if(k==='bubbles'){AMBT[k]=rand(1,3.5);if(v>.05){const f=rand(220,380);tone(f,f*2.2,.12,'sine',.05*v,0,ambBus);if(Math.random()<.4)tone(f*1.3,f*2.6,.1,'sine',.03*v,.14,ambBus);}}}}
// Imported bindings are read-only, so other modules assign these through setters.
export function setSoundOn(v){return soundOn=v;}
