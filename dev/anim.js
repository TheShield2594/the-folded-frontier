// Animation viewer (issue #99): preview and tune the paper rigs and their clips (rig.js) in the browser, dev only.
// It loads the game's own modules, so a rig here is the rig in the game: makeRig()/rigPlay()/rigUpdate() pose it, the
// skins (and hand-made art from assets/art/) are the game's, and the stage floor uses the world shader, its dynamic lights
// and the shared particle system. Edits change the clip objects in place (RIGS[kind].clips), so they show at once; Download
// writes <rig>.json for assets/anim/, which art.js lays over the coded clips at boot.
import * as THREE from 'three';

// ================= boot =================
// The modules expect index.html's elements, so its markup goes into a hidden holder first (its scripts don't run). Importing
// game.js without main.js runs every module but makes no world and starts no frame loop.
const html=await (await fetch('/index.html')).text(),hold=document.createElement('div');hold.hidden=true;
hold.innerHTML=new DOMParser().parseFromString(html,'text/html').body.innerHTML;document.body.append(hold);
const g=await import('/src/game.js');
g.setState('viewer');
// keys and the game's own handlers: the game listens on window, so a capture listener there keeps them all for the viewer
for(const t of['keydown','keyup'])addEventListener(t,e=>{e.stopImmediatePropagation();if(t==='keydown')onKey(e);},true);
g.buildSheets();g.buildPartnerSheets();g.buildPetSheets();g.buildRigSheets(g.SHEETS);g.paintCards();
await g.loadArt();
const $=id=>document.getElementById(id),stage=$('stage'),ov=$('ov'),oc=ov.getContext('2d');
$('load').remove();

// ================= stage =================
let R=null; // the rig on the stage (makeRig), set by pick()
const R3=g.renderer,scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(32,1,.5,400);
stage.prepend(R3.domElement);scene.background=new THREE.Color(0xcfe3ea);
scene.add(g.pMesh); // the shared particles (render.js), moved from the game's scene, which never renders here
// floor: a strip of grass over dirt drawn with the world shader (worldMat), lit by the daylight slider and the dynamic light
const FW=28,floor=new THREE.Mesh(new THREE.BufferGeometry(),g.worldMat);scene.add(floor);
function buildFloor(sky){const P=[],UV=[],L=[],I=[];let n=0;const q=(v,uv,sh)=>{P.push(...v);UV.push(uv[0],uv[1],uv[2],uv[1],uv[2],uv[3],uv[0],uv[3]);for(let k=0;k<4;k++)L.push(sky,0,sh);I.push(n,n+1,n+2,n,n+2,n+3);n+=4;};
  // front faces and the grass's top face, as buildChunk() lays them (render.js)
  const T=g.T,TP=g.TP;for(let x=-FW/2;x<FW/2;x++){for(let y=-4;y<0;y++){const t=y===-1?T.GRASS:T.DIRT;q([x,y,.5,x+1,y,.5,x+1,y+1,.5,x,y+1,.5],g.cellUV(TP[t].cell),.93);}
    q([x,0,.5,x+1,0,.5,x+1,0,-.5,x,0,-.5],g.cellUV(TP[T.GRASS].top||TP[T.GRASS].cell),1.02);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));geo.setAttribute('aL',new THREE.Float32BufferAttribute(L,3));geo.setIndex(I);
  floor.geometry.dispose();floor.geometry=geo;}
function resize(){const r=stage.getBoundingClientRect(),w=Math.max(1,r.width|0),h=Math.max(1,r.height|0);R3.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();if(R)fitCam();
  const dpr=devicePixelRatio||1;ov.width=w*dpr;ov.height=h*dpr;oc.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe(stage);addEventListener('resize',()=>setTimeout(resize));resize();

// ================= subjects =================
// every way the game dresses a rig: the player (the painted hero once its art is in, and the drawn human), townsfolk,
// foes and bosses (FOERIG), partners, then any other rig with a bare skin
const SUBJ=[],seen=new Set();
const sub=(grp,label,kind,skin,key)=>{if(!g.RIGS[kind])return;SUBJ.push({grp,label,kind,skin,key});seen.add(kind);};
sub('Player','Player ('+g.playerRigKind()+')',g.playerRigKind(),g.playerLook(),null);if(g.playerRigKind()!=='human')sub('Player','Player (drawn human)','human',g.playerLook(),null);
for(const t in g.FOLK)sub('Townsfolk',t,'human',g.FOLK[t],t);
for(const k in g.FOERIG)sub('Foes & bosses',k+(g.FOERIG[k][0]!==k?' ('+g.FOERIG[k][0]+')':''),g.FOERIG[k][0],g.FOERIG[k][1],k);
for(const k in g.PARTNERS)sub('Partners',k,'p_'+k,{},'p_'+k);
for(const k in g.RIGS)if(!seen.has(k))sub('Other rigs',k,k,{},null);
{const s=$('subj');let og=null,cur='';SUBJ.forEach((o,i)=>{if(o.grp!==cur){cur=o.grp;og=document.createElement('optgroup');og.label=cur;s.append(og);}og.append(new Option(o.label,i));});}

// ================= state =================
let S=null,clip='',sel=-1,playing=true,face=1,rot=0,hold0=0,drag=null;
const ORIG={}; // clips as the game had them when this page loaded, per rig, for Revert
const LS='ff-anim-edits';let EDITS={};try{EDITS=JSON.parse(localStorage.getItem(LS)||'{}');}catch{}
const clone=o=>JSON.parse(JSON.stringify(o));
const clipD=()=>R&&R.d.clips[clip];
// edits kept in this browser: laid over the rig's clips when it is first picked
function restoreEdits(kind){const d=g.RIGS[kind];if(!ORIG[kind]){ORIG[kind]={};for(const c in d.clips)ORIG[kind][c]=clone(d.clips[c]);}
  for(const c in EDITS[kind]||{})setClip(d,c,clone(EDITS[kind][c]));}
function setClip(d,c,v){const o=d.clips[c];if(o){for(const f in o)delete o[f];Object.assign(o,v);}else d.clips[c]=v;}
function edited(){const k=R.k;(EDITS[k]??={})[clip]=clone(clipD());try{localStorage.setItem(LS,JSON.stringify(EDITS));}catch{}listClips(true);showOut();}

function pick(i){const o=SUBJ[i];S=o;if(R){scene.remove(R.mesh);g.rigFree(R);}restoreEdits(o.kind);
  R=g.makeRig(o.kind,o.skin,o.key,{add:false});scene.add(R.mesh);R.mesh.position.set(0,0,.1);R.vel=[0,0];
  const parts=$('part');parts.innerHTML='';R.d.parts.forEach((p,j)=>parts.append(new Option(p.n+(p.paint||p.slot?'':' (joint)'),j)));
  for(const id of['pfxAt','lampAt']){const s=$(id),v=s.value;s.innerHTML='';s.append(new Option('the stage','-'));R.d.parts.forEach(p=>s.append(new Option(p.n,p.n)));s.value=[...s.options].some(x=>x.value===v)?v:(R.d.pi.armA!=null?'armA':'-');}
  sel=-1;listClips();const cs=Object.keys(R.d.clips);selClip(cs.includes(clip)?clip:cs.includes('idle')?'idle':cs[0]);fitCam();}
function listClips(keep){const s=$('clip'),v=s.value;s.innerHTML='';for(const c in R.d.clips){const o=new Option(c+(EDITS[R.k]?.[c]?' •':'')+(g.animOver[R.k]?.[c]?' (assets/anim)':''),c);if(EDITS[R.k]?.[c])o.className='edited';s.append(o);}if(keep)s.value=v;}
function selClip(c){clip=c;$('clip').value=c;const d=clipD();if(!d)return;
  if($('blend').checked)g.rigPlay(R,c);else{g.rigPlay(R,c,{bl:0});R.w=1;}R.ct=0;R.sp=1;hold0=0;
  $('cLen').value=d.len;$('cBl').value=d.bl??'';$('cLoop').checked=!!d.loop;$('time').max=Math.max(.001,d.len);$('time').disabled=!d.len;showKeys();showOut();}
// the camera frames the rig's design box, standing on the floor
function fitCam(){const d=R.d,h=Math.max(d.h*d.s,.8),w=d.w*d.s,z=Math.max(h,w*.75/cam.aspect)*2.6*(7/ +$('zoom').value);cam.position.set(0,h*.5+.2,z);cam.lookAt(0,h*.5,0);}

// ================= keys =================
const EASE=Object.keys(g.EZR),CHS=['r','x','y','sx','sy','sw'];
const now=()=>{const d=clipD();if(!d||!d.len)return 0;let t=R.ct;if(d.loop){t%=d.len;if(t<0)t+=d.len;}return Math.min(d.len,Math.max(0,t));};
const r3=v=>Math.round(v*1000)/1000;
// a key at time t on a channel: updated when one is there (a looping clip's matching end key follows its first one), else
// added in time order with the easing of the key before it
function setKey(pn,ch,t,v){const d=clipD(),tr=(d.tr[pn]??={});t=d.len?r3(t):0;let K=tr[ch];const str=typeof v==='string';
  if(!K){const base=str?'':(ch==='sx'||ch==='sy'?1:0);K=tr[ch]=[[0,base,str?null:'io']];if(d.loop&&d.len)K.push([d.len,base]);}
  const at=K.findIndex(k=>Math.abs(k[0]-t)<.0005);
  if(at>=0){const old=K[at][1];K[at][1]=v;if(d.loop&&K.length>1){const a=K[0],b=K[K.length-1];if(at===0&&Math.abs(b[0]-d.len)<.0005&&b[1]===old)b[1]=v;else if(at===K.length-1&&a[0]===0&&a[1]===old)a[1]=v;}}
  else{let i=K.findIndex(k=>k[0]>t);if(i<0)i=K.length;const pe=i>0?K[i-1][2]:'io';K.splice(i,0,[t,v,str?null:(pe??'io')]);}}
function showKeys(){const box=$('keyTab'),d=clipD(),p=R.d.parts[sel];$('part').value=sel>=0?sel:'';box.innerHTML='';drawKeyStrip();if(!d||!p){box.innerHTML='<p class="hint">No part picked.</p>';return;}
  const tr=d.tr[p.n]||{};let h='<table>';for(const ch of CHS){const K=tr[ch];if(!K)continue;h+=`<tr><td colspan="4" class="ch">${ch}${ch==='r'?' (radians)':ch==='sw'?' (variant: '+p.v.map(v=>v||"''").join(', ')+", '-' hides)":''}</td></tr>`;
    K.forEach((k,i)=>{const str=typeof k[1]==='string';h+=`<tr data-ch="${ch}" data-i="${i}"><td><input data-f="t" type="number" step="0.01" value="${k[0]}" title="time"></td><td><input data-f="v" type="${str?'text':'number'}" step="0.01" value="${str?k[1]:r3(k[1])}" title="value"></td>
      <td>${str?'':`<select data-f="e" title="easing to the next key">${EASE.map(e=>`<option${(k[2]||'lin')===e?' selected':''}>${e}</option>`).join('')}</select>`}</td><td><button type="button" data-f="x" title="remove key">×</button></td></tr>`;});}
  box.innerHTML=h+'</table>'+(Object.keys(tr).length?'':'<p class="hint">This clip has no keys for this part.</p>');}
$('keyTab').addEventListener('change',e=>{const tr=e.target.closest('tr');if(!tr)return;const K=clipD().tr[R.d.parts[sel].n][tr.dataset.ch],k=K[+tr.dataset.i],f=e.target.dataset.f;
  if(f==='t'){k[0]=Math.max(0,+e.target.value||0);K.sort((a,b)=>a[0]-b[0]);}else if(f==='v')k[1]=typeof k[1]==='string'?e.target.value:+e.target.value;else if(f==='e')k[2]=e.target.value;edited();showKeys();});
$('keyTab').addEventListener('click',e=>{if(e.target.dataset.f!=='x')return;const tr=e.target.closest('tr'),pt=clipD().tr[R.d.parts[sel].n],K=pt[tr.dataset.ch];K.splice(+tr.dataset.i,1);if(!K.length)delete pt[tr.dataset.ch];edited();showKeys();});
$('addKey').onclick=()=>{if(sel<0)return msg('Pick a part first.');const ch=$('addCh').value,L=R.last[sel];setKey(R.d.parts[sel].n,ch,now(),ch==='sw'?L.sw||'':L[ch]);edited();showKeys();};
function drawKeyStrip(){const el=$('keys'),d=clipD();el.innerHTML='';if(!d)return;const len=d.len||1,tr=sel>=0?d.tr[R.d.parts[sel].n]:null,ts=new Set();
  for(const pn in(tr?{[R.d.parts[sel].n]:tr}:d.tr))for(const ch in d.tr[pn])for(const k of d.tr[pn][ch])ts.add(k[0]);
  for(const t of ts){const i=document.createElement('i');i.style.left=(t/len*100)+'%';i.dataset.t=t;if(Math.abs(t-now())<.0005)i.className='sel';el.append(i);}
  const b=document.createElement('b');b.style.left=(now()/len*100)+'%';el.append(b);}
const keyTimes=()=>{const d=clipD();return[...new Set(Object.values(sel>=0?{a:d.tr[R.d.parts[sel].n]||{}}:d.tr).flatMap(o=>Object.values(o).flatMap(K=>K.map(k=>k[0]))))].sort((a,b)=>a-b);};
function seek(t){const d=clipD();if(!d)return;R.ct=Math.max(0,Math.min(d.len,t));setPlay(false);}
function stepKey(dir){const t=now(),L=keyTimes();const n=dir>0?L.find(x=>x>t+.0005):[...L].reverse().find(x=>x<t-.0005);if(n!=null)seek(n);}
$('keys').addEventListener('pointerdown',e=>{const d=clipD();if(!d)return;const r=$('keys').getBoundingClientRect();let t=(e.clientX-r.left)/r.width*d.len;const near=keyTimes().find(k=>Math.abs(k-t)/d.len<.012);seek(near??t);});

// ================= playback =================
function setPlay(on){playing=on;$('play').textContent=on?'Pause':'Play';$('play').classList.toggle('on',!on);}
$('play').onclick=()=>setPlay(!playing);$('prevK').onclick=()=>stepKey(-1);$('nextK').onclick=()=>stepKey(1);
$('time').addEventListener('input',e=>seek(+e.target.value));
$('subj').onchange=e=>pick(+e.target.value);$('clip').onchange=e=>selClip(e.target.value);
$('part').onchange=e=>{sel=+e.target.value;showKeys();};
$('zoom').oninput=fitCam;$('blend').onchange=()=>{};
$('wob').onchange=e=>{g.SET.motion=e.target.checked?'full':'reduce';};g.SET.motion='full';
$('cLen').onchange=e=>{clipD().len=Math.max(0,+e.target.value||0);edited();selClip(clip);};
$('cBl').onchange=e=>{const v=e.target.value;if(v==='')delete clipD().bl;else clipD().bl=+v;edited();};
$('cLoop').onchange=e=>{if(e.target.checked)clipD().loop=1;else delete clipD().loop;edited();};
function onKey(e){if(e.target.closest&&e.target.closest('input,select,textarea'))return;const k=e.key.toLowerCase();
  if(k===' '){e.preventDefault();setPlay(!playing);}else if(k===','||k==='arrowleft')stepKey(-1);else if(k==='.'||k==='arrowright')stepKey(1);else if(k==='f'){$('flip').checked=!$('flip').checked;}}

// ================= picking and dragging =================
const V=new THREE.Vector3();
function scr(x,y){V.set(x,y,0);R.mesh.localToWorld(V);V.project(cam);const r=stage.getBoundingClientRect();return[(V.x+1)/2*r.width,(1-V.y)/2*r.height];}
const joint=i=>{const p=R.d.parts[i],[x,y]=g.rigJoint(R,p.n);return scr(x,y);};
// screen px per design px, along x and y at the rig (the mesh may be turned edge-on mid-flip)
function ppd(){const a=scr(0,0),b=scr(R.d.s*10,0),c=scr(0,R.d.s*10);return[Math.hypot(b[0]-a[0],b[1]-a[1])/10||1,Math.hypot(c[0]-a[0],c[1]-a[1])/10||1];}
function near(x,y){let best=-1,bd=14;R.d.parts.forEach((p,i)=>{const[a,b]=joint(i),d=Math.hypot(a-x,b-y);if(d<bd){bd=d;best=i;}});return best;}
stage.addEventListener('pointerdown',e=>{if(!R)return;const r=stage.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,n=near(x,y);
  if(n>=0&&n!==sel){sel=n;showKeys();}if(sel<0)return;const d=clipD();if(!d)return;
  setPlay(false);const L=R.last[sel],[px,py]=joint(sel);
  drag={x0:x,y0:y,a0:Math.atan2(y-py,x-px),r:L.r,lx:L.x,ly:L.y,sx:L.sx,sy:L.sy,mode:e.shiftKey?'move':e.altKey?'scale':'turn',t:now(),done:0};stage.setPointerCapture(e.pointerId);e.preventDefault();});
stage.addEventListener('pointermove',e=>{if(!drag)return;const r=stage.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,p=R.d.parts[sel],m=face<0?-1:1;
  if(drag.mode==='turn'){const[px,py]=joint(sel);let da=Math.atan2(y-py,x-px)-drag.a0;da=Math.atan2(Math.sin(da),Math.cos(da));setKey(p.n,'r',drag.t,r3(drag.r+da*m));}
  else if(drag.mode==='move'){const[kx,ky]=ppd(),ux=(x-drag.x0)/kx*m,uy=(y-drag.y0)/ky,A=p.pa>=0?R.abs[p.pa]:0,c=Math.cos(A),s=Math.sin(A);
    setKey(p.n,'x',drag.t,r3(drag.lx+c*ux+s*uy));setKey(p.n,'y',drag.t,r3(drag.ly-s*ux+c*uy));}
  else{const f=Math.exp((x-drag.x0)/120),fy=Math.exp(-(y-drag.y0)/120);setKey(p.n,'sx',drag.t,r3(drag.sx*f));setKey(p.n,'sy',drag.t,r3(drag.sy*fy));}
  drag.done=1;R.ct=drag.t;});
const endDrag=()=>{if(!drag)return;const d=drag.done;drag=null;if(d){edited();showKeys();}};
stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);

// ================= clip data =================
// the text form is the object defRig() takes, unquoted where JS allows, so it pastes into rig.js as well as into JSON tools
const js=o=>JSON.stringify(o).replace(/"([A-Za-z_$][\w$]*)":/g,'$1:');
function showOut(){const d=clipD();$('out').value=d?`${clip}:${js(d)}`:'';}
function msg(t){$('msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('msg').textContent='',4000);}
$('copy').onclick=async()=>{showOut();try{await navigator.clipboard.writeText($('out').value);msg('Clip copied.');}catch{$('out').select();msg('Select-all done: copy with Ctrl+C.');}};
$('save').onclick=()=>{const ed=EDITS[R.k]||{};if(!Object.keys(ed).length)ed[clip]=clipD();const out={};for(const c in ed)out[c]=R.d.clips[c];
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));a.download=R.k+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  msg(`Saved ${R.k}.json (${Object.keys(out).join(', ')}). Put it in assets/anim/.`);};
$('revert').onclick=()=>{const o=ORIG[R.k]?.[clip];if(!o)return;setClip(R.d,clip,clone(o));if(EDITS[R.k]){delete EDITS[R.k][clip];if(!Object.keys(EDITS[R.k]).length)delete EDITS[R.k];}
  try{localStorage.setItem(LS,JSON.stringify(EDITS));}catch{}listClips(true);selClip(clip);msg('Clip reverted.');};
$('apply').onclick=()=>{let t=$('out').value.trim().replace(/^[A-Za-z_$][\w$]*\s*:\s*(?=\{)/,'');try{const v=new Function('return ('+t+')')();if(!v||typeof v!=='object'||!v.tr)throw Error('no tr');setClip(R.d,clip,v);edited();selClip(clip);msg('Applied.');}catch(err){msg('Could not read that: '+err.message);}};

// ================= particles and light =================
for(const k in g.PFX)$('pfx').append(new Option(k,k));
const at=sel2=>{const v=$(sel2).value;if(v==='-'||R.d.pi[v]==null)return[0,1.2];const[x,y]=g.rigJoint(R,v);V.set(x,y,0);R.mesh.localToWorld(V);return[V.x,V.y];};
// particles here are drawn as if lit (bright): their usual tint comes from the world's tile light, and there is no world
const emitNow=()=>{const[x,y]=at('pfxAt');g.emit($('pfx').value,x,y,{bright:1});};
$('emit').onclick=emitNow;let pfxT=0;
// lights: what the game lights with (LTILE, projectiles, partners), [r, g, b, radius, strength, flicker]
const LAMPS={none:null,torch:[1,.72,.38,7,.32,1],'held torch':[1,.75,.42,6.5,.55,0],candle:[1,.8,.5,5,.26,1],lantern:[1,.62,.55,6,.28,.4],altar:[.75,.45,1,6,.35,.3],
  Lumi:[1,.85,.5,8.5,1,0],Ember:[1,.6,.3,4,1,0],'fire arrow':[1.1,.6,.2,5,1,0],'ink ball':[.45,.3,.9,3.5,1,0],star:[1.1,.95,.5,7,1,0],crescent:[.8,.55,1.1,4,1,0]};
for(const k in LAMPS)$('lamp').append(new Option(k,k));$('lamp').value='held torch';
let skyLv=-1;
function light(tm){const U=g.U,sky=+$('sky').value;if(sky!==skyLv){skyLv=sky;buildFloor(sky);}U.uSky.value.set(1,1,1);U.uGlow.value=0;U.uSun.value.w=0;U.uHdr.value=0;
  const l=LAMPS[$('lamp').value];for(const v of U.uDL.value)v.w=0;let gl=[0,0,0];
  if(l){const[x,y]=at('lampAt'),f=$('flick').checked?l[5]*(.13*Math.sin(tm*9.3)+.07*Math.sin(tm*23.7)):0,w=l[4]*(1+f);U.uDL.value[0].set(x,y,l[3],w);U.uDLC.value[0].set(l[0],l[1],l[2]);
    // the rig's tint, as setTint() lights a character from where it stands (entities.js lightAt)
    const d=Math.hypot(x-R.mesh.position.x,y-(R.mesh.position.y+.9)),k=Math.max(0,1-d/l[3])*.9*Math.min(1,w*2);gl=[k,k*.88,k*.66];}
  const s=Math.pow(sky/15,1.6),c=(a,b)=>Math.min(1.2,Math.max(.16,s+a+b));R.mat.uniforms.uTint.value.set(c(gl[0],0),c(gl[1],0),c(gl[2],0));
  scene.background.setRGB(.81*(.25+.75*sky/15),.89*(.25+.75*sky/15),.92*(.3+.7*sky/15));}

// ================= overlay =================
function drawOverlay(){const r=stage.getBoundingClientRect();oc.clearRect(0,0,r.width,r.height);if(!R||!$('bones').checked)return;const P=R.d.parts;
  oc.lineWidth=2;for(const p of P){if(p.pa<0)continue;const[a,b]=joint(p.i),[c,d]=joint(p.pa);oc.strokeStyle=p.i===sel?'#d4483b':'rgba(42,33,48,.55)';oc.beginPath();oc.moveTo(c,d);oc.lineTo(a,b);oc.stroke();}
  oc.font='11px system-ui,sans-serif';
  for(const p of P){const[a,b]=joint(p.i),on=p.i===sel;oc.beginPath();oc.arc(a,b,on?6:4,0,Math.PI*2);oc.fillStyle=on?'#d4483b':p.paint||p.slot?'#2f7f86':'#f1c04f';oc.fill();oc.strokeStyle='#2a2130';oc.lineWidth=1.5;oc.stroke();
    if(on){oc.fillStyle='#2a2130';oc.fillText(p.n,a+9,b-7);}}
  const d=clipD();oc.fillStyle='#2a2130';oc.font='12px system-ui,sans-serif';oc.fillText(`${S.label} · ${clip}${d&&d.loop?' (loop)':''}`,10,18);}

// ================= frame =================
let last=performance.now(),fn=0;
function frame(t){requestAnimationFrame(frame);const el=Math.min(.1,(t-last)/1000);last=t;if(!R)return;const sp=+$('speed').value,dt=el*sp,d=clipD();
  if(d&&playing){if(!d.loop&&d.len&&R.ct>=d.len){hold0+=el;if($('loopV').checked&&hold0>.5){hold0=0;R.ct=0;}}else hold0=0;}
  R.sp=playing&&!drag?1:0;
  face=$('flip').checked?-1:1;rot+=((face>0?0:Math.PI)-rot)*Math.min(1,el*14);R.mesh.rotation.y=rot;
  g.rigUpdate(R,playing?dt:0);
  if(d&&!d.loop&&d.len&&R.ct>d.len)R.ct=d.len;
  if($('pfxLoop').checked){pfxT-=dt;if(pfxT<=0){pfxT=Math.max(.05,+$('pfxEvery').value||.3);emitNow();}}
  g.updateParts(dt);light(t/1000);
  const tt=now();if(d){$('time').value=tt;$('tTxt').textContent=`${tt.toFixed(3)} / ${(+d.len).toFixed(3)} s`;}
  if(++fn%4===0||!playing)drawKeyStrip();
  R3.setRenderTarget(null);R3.render(scene,cam);drawOverlay();}
pick(0);requestAnimationFrame(frame);
window.__anim={g,get R(){return R;},pick,selClip,setKey,seek,get clip(){return clip;}};
