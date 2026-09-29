// Staged dialogue: a speech bubble over the speaker with a portrait, typed-out text and a voice blip per character.
import {
  $,camera,circ,facePic,fi,ink,invOpen,mapOpen,mk,NPCDEF,PARTNERS,player,poly,pt,pv,rr,SET,setInv,
  setState,SHEETS,state,tone,upx,
} from './game.js';

// ================= dialogue =================
// A line is plain text with a little markup: {happy} {surprised} {sad} {angry} {neutral} switch the portrait's
// expression where they appear, *word* bounces and ~word~ shivers. plain() strips it for toasts and side panels.
// say() queues a conversation; it opens once the player is free (playing, no backpack or map), freezes the
// world while it runs (state 'talk') and calls done() when it closes. Jump, interact, Enter or a click
// finishes the typing, then goes to the next line; Escape skips the rest.
export const plain=s=>String(s||'').replace(/\{\w+\}/g,'').replace(/[*~]/g,'').replace(/\s+/g,' ').trim();
// voices: [base pitch Hz, wave, pitch spread]
const VOICE={player:[250,'triangle',.25],merchant:[150,'square',.2],guide:[215,'triangle',.25],painter:[300,'sine',.4],nurse:[390,'sine',.25],
  tinkerer:[270,'square',.35],angler:[165,'triangle',.2],farmer:[185,'triangle',.3],scout:[330,'triangle',.3],curator:[135,'sine',.15],
  traveler:[235,'square',.3],lumi:[640,'sine',.3],snip:[470,'square',.25],smudge:[380,'triangle',.45],ember:[560,'sawtooth',.2]};
function blip(v,ch,em){const c=ch.toLowerCase().charCodeAt(0),f=v[0]*(1+(c*7%12)/12*v[2])*(em?1.22:1);tone(f,f*(em?1.1:.86),.07,v[1],v[1]==='sine'?.09:.045);}
// emote mark drawn in the portrait's corner, so an expression reads even on faces without brows
function emote(t,x,y,e){
  if(e==='happy'){for(const[dx,dy,r]of[[0,0,9],[14,12,5]]){const s=[];for(let k=0;k<8;k++){const a=k*Math.PI/4,q=k%2?r*.35:r;s.push(x+dx+Math.cos(a)*q,y+dy+Math.sin(a)*q);}poly(t,s);fi(t,'#f1c04f',2);}}
  else if(e==='surprised'){rr(t,x-4,y-12,8,17,3);fi(t,'#d4483b',2);circ(t,x,y+11,4);fi(t,'#d4483b',2);}
  else if(e==='sad'){t.beginPath();t.moveTo(x,y-11);t.quadraticCurveTo(x+9,y+2,x,y+7);t.quadraticCurveTo(x-9,y+2,x,y-11);fi(t,'#8fc9ec',2);}
  else if(e==='angry'){for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]]){t.beginPath();t.moveTo(x+a*3,y+b*3);t.quadraticCurveTo(x+a*4,y+b*9,x+a*9,y+b*9);t.moveTo(x+a*3,y+b*3);t.quadraticCurveTo(x+a*9,y+b*4,x+a*9,y+b*9);ink(t,3,'#d4483b');}}}
// portraits are 96x96 canvases cached per speaker and expression; the player's is redrawn each conversation (armor changes)
const PICS={};
function portrait(k,e){const key=k+':'+e;if(PICS[key])return PICS[key];const c=mk(96,96),t=c.getContext('2d');
  if(PARTNERS[k]){const s=SHEETS['p_'+k];if(s)t.drawImage(s,8,8,80,80,0,4,96,96);}
  else{const s=facePic(k,e==='neutral'?null:e);if(s&&s.whole){const[x,y,z]=headBox(s);t.drawImage(s,x,y,z,z,0,2,96,96);}else if(s)t.drawImage(s,12,8,76,76,0,2,96,96);}
  if(e!=='neutral')emote(t,80,18,e);return PICS[key]=c;}
// a whole painted cut-out (rig.js root+all): a square around the head, the top of the figure, centred on it
function headBox(s){const W=s.width,H=s.height,a=s.getContext('2d').getImageData(0,0,W,H).data;let y0=H,y1=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[(y*W+x)*4+3]>40){if(y<y0)y0=y;y1=y;}
  const z=Math.round((y1-y0)*.52);let sx=0,n=0;for(let y=y0;y<y0+z*.8;y++)for(let x=0;x<W;x++)if(a[(y*W+x)*4+3]>40){sx+=x;n++;}
  return[Math.round((n?sx/n:W/2)-z/2),Math.max(0,y0-2),z];}
export function clearPlayerPics(){for(const k in PICS)if(k.startsWith('player:'))delete PICS[k];}
// speakers: {k (voice/portrait key), name, at() -> world point above their head, or null for a box without a tail}
export const npcSpeaker=n=>({k:n.type,name:NPCDEF[n.type]?NPCDEF[n.type].name:'',at:()=>({x:n.x,y:n.y+2.6})});
export const playerSpeaker=()=>({k:'player',name:'You',at:()=>({x:player.x,y:player.y+2.6})});
export const partnerSpeaker=k=>({k,name:PARTNERS[k].name,at:()=>pt.type===k?{x:pt.x,y:pt.y+1}:{x:player.x,y:player.y+2.6}});

const queue=[];let D=null,prevFocus=null;
export const talking=()=>!!D;
// a conversation is open or waiting to open
export const dlgBusy=()=>!!D||queue.length>0;
// the dialogue takes focus while open and hands it back when it closes
function restoreFocus(){const el=prevFocus;prevFocus=null;if(el&&el.isConnected&&typeof el.focus==='function')el.focus();}
// drop queued and open conversations (starting or loading a world), without running their done() callbacks
export function clearDlg(){queue.length=0;if(D){D=null;$('dlg').hidden=true;$('ui').classList.remove('talking');restoreFocus();}}
// say(speaker, line or [lines], {done, wait}) queues a conversation; wait = seconds before it may open
export function say(sp,lines,o={}){queue.push({sp,lines:[].concat(lines),done:o.done,wait:o.wait||0});}
function open(c){prevFocus=document.activeElement;D={c,i:0,sp:c.sp,expr:'neutral'};if(invOpen)setInv(false);setState('talk');$('ui').classList.add('talking');$('dlg').hidden=false;if(c.sp.k==='player')clearPlayerPics();$('dlgName').textContent=c.sp.name;line();$('dlg').focus({preventScroll:true});}
function line(){const txt=D.c.lines[D.i],el=$('dlgTxt');el.innerHTML='';D.chars=[];D.n=0;D.t=.18;D.done=false;D.blipN=0;D.exprAt={};
  let mode='',word=null,expr=D.expr;
  const re=/\{(\w+)\}|([*~])|(\s+)|([^\s*~{]+|\{)/g;let m;
  while((m=re.exec(txt))){if(m[1]){if(D.chars.length)D.exprAt[D.chars.length]=m[1];else expr=m[1];continue;}
    if(m[2]){mode=mode===m[2]?'':m[2];word=null;continue;}
    if(m[3]){word=null;const s=document.createElement('span');s.className='c';s.textContent=' ';el.appendChild(s);D.chars.push({s,ch:' '});continue;}
    // emphasized words keep their letters together (nowrap), since inline-block letters would allow a break between them
    let host=el;if(mode){if(!word){word=document.createElement('span');word.className='w';el.appendChild(word);}host=word;}
    for(const ch of m[4]){const s=document.createElement('span');s.className='c'+(mode==='*'?' em':mode==='~'?' sh':'');s.textContent=ch;s.style.setProperty('--i',D.chars.length);host.appendChild(s);D.chars.push({s,ch,em:!!mode});}}
  setExpr(expr);$('dlgNext').hidden=true;$('dlg').classList.toggle('last',D.i===D.c.lines.length-1);if(SET.tspd==='instant')finish();}
function setExpr(e){D.expr=e;const c=$('dlgPic'),p=portrait(D.sp.k,e);const t=c.getContext('2d');t.clearRect(0,0,96,96);t.drawImage(p,0,0);c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop');}
function reveal(){const q=D.chars[D.n];if(D.exprAt[D.n])setExpr(D.exprAt[D.n]);q.s.classList.add('on');D.n++;
  if(/[a-z0-9]/i.test(q.ch)&&(q.em||D.blipN++%2===0))blip(VOICE[D.sp.k]||VOICE.player,q.ch,q.em);
  // a beat after punctuation, as if the speaker breathes
  return /[.!?]/.test(q.ch)&&D.chars[D.n]&&D.chars[D.n].ch===' '?.28:q.ch===','?.14:q.em?.05:.028;}
// Settings > Dialogue text speed: how fast letters type out ('instant' shows the whole line at once)
const TSPD={slow:.55,normal:1,fast:2};
function finish(){while(D.n<D.chars.length){if(D.exprAt[D.n])setExpr(D.exprAt[D.n]);D.chars[D.n++].s.classList.add('on');}D.done=true;$('dlgNext').hidden=false;}
// dlgNext(all): finish typing, else the next line; all=true closes the conversation
export function dlgNext(all){if(!D)return;if(all){close();return;}if(!D.done){finish();return;}if(++D.i<D.c.lines.length)line();else close();}
function close(){const c=D.c;D=null;$('dlg').hidden=true;$('ui').classList.remove('talking');restoreFocus();if(state==='talk')setState('play');tone(420,300,.08,'triangle',.05);if(c.done)c.done();}
export function updateDlg(dt){
  if(!D){if(!queue.length||state!=='play'||invOpen||mapOpen||player.dead)return;if((queue[0].wait-=dt)>0)return;open(queue.shift());}
  if(!D.done){D.t-=dt*(TSPD[SET.tspd]||1);while(D.t<=0&&D.n<D.chars.length)D.t+=reveal();if(D.n>=D.chars.length){D.done=true;$('dlgNext').hidden=false;}}
  // keep the bubble over the speaker: above their head, clamped to the screen, the tail pointing at them
  const el=$('dlg'),at=D.sp.at&&D.sp.at(),W=el.offsetWidth,Hh=el.offsetHeight,vw=parseFloat(upx(innerWidth)),vh=parseFloat(upx(innerHeight));
  let sx=vw/2,sy=vh*.62;if(at){pv.set(at.x,at.y,.5).project(camera);sx=(pv.x+1)/2*vw;sy=(1-pv.y)/2*vh;}
  let top=sy-Hh-18,below=false;if(top<10){top=Math.min(vh-Hh-10,sy+70);below=true;}
  const left=Math.max(10,Math.min(vw-W-10,sx-W*.35));el.style.left=left+'px';el.style.top=top+'px';el.classList.toggle('below',below);
  const tail=$('dlgTail');tail.hidden=!at;tail.style.left=Math.max(22,Math.min(W-22,sx-left))+'px';}
$('dlg').addEventListener('pointerdown',e=>{e.stopPropagation();dlgNext();});
