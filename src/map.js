// The pop-up book page turn for new biomes and the world map.
import * as THREE from 'three';
import {
  $,BIO,held,keys,pad,saveSettings,SET,toast,drawTrickMarks,BIONAME,boss,camera,canvasTex,chests,CHH,chunks,circ,clamp,CS,CW,fi,grain,H,idx,INK,ink,invOpen,
  LIGHT,liqChunks,meta,mk,N,NPCDEF,npcs,OPAQUE,player,rr,scene,setInv,SFX,state,surf,surfAvg,T,TCOL,
  tileAt,tiles,W,walls,WCOL,
  lore,MARKS,
} from './game.js';

// ================= pop-up book =================
export const houses=[];export let visited=new Set(),houseT=0,houseCheckT=0,popAnim=[];
export function enclosure(sx,sy){if(sx<1||sy<1||sx>=W-1||sy>=H-1||OPAQUE[tileAt(sx,sy)])return null;const s0=idx(sx,sy);const seen=new Set([s0]),st=[s0];let minX=1e9,maxX=-1,minY=1e9,maxY=-1,key=s0,wallCount={},light=false,bed=false;
  while(st.length){const i=st.pop();if(seen.size>420)return null;const x=i%W,y=(i/W)|0;if(walls[i]<2)return null;wallCount[walls[i]]=(wallCount[walls[i]]||0)+1;const t=tiles[i];if(LIGHT[t])light=true;if(t===T.BED)bed=true;
    if(i<key)key=i;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    for(const n of[i-1,i+1,i-W,i+W]){const nx=n%W,ny=(n/W)|0;if(nx<=0||ny<=0||nx>=W-1||ny>=H-1)return null;const nt=tiles[n];if(OPAQUE[nt]||nt===T.DOOR||nt===T.PLATFORM)continue;if(!seen.has(n)){seen.add(n);st.push(n);}}}
  if(seen.size<12)return null;const wt=+Object.keys(wallCount).sort((a,b)=>wallCount[b]-wallCount[a])[0];return{key,minX,maxX,minY,maxY,wt,light,bed,seen};}
const WALLFACE={2:['#c98f4f','#a8703c','plank'],3:['#9a9ca8','#7a7c88','brick'],4:['#b85a4f','#8a3f36','stripe'],5:['#5a7aaa','#3f5a86','stripe'],6:['#6a9a6a','#4a7a4a','stripe'],7:['#d4ae56','#a8873a','stripe']};
function drawFacade(h){const w=h.maxX-h.minX+3,ht=h.maxY-h.minY+3,P=48,c=mk(w*P,ht*P),t=c.getContext('2d');const[base,dark,pat]=WALLFACE[h.wt]||WALLFACE[2];
  rr(t,3,3,w*P-6,ht*P-6,10);t.fillStyle=base;t.fill();t.save();rr(t,3,3,w*P-6,ht*P-6,10);t.clip();
  if(pat==='plank'){t.strokeStyle=dark;t.lineWidth=2;for(let y=P*.5;y<ht*P;y+=P*.5){t.beginPath();t.moveTo(0,y);t.lineTo(w*P,y);t.stroke();}}
  else if(pat==='brick'){t.strokeStyle=dark;t.lineWidth=2;for(let r=0,y=0;y<ht*P;r++,y+=P*.5){t.beginPath();t.moveTo(0,y);t.lineTo(w*P,y);t.stroke();for(let x=(r%2)*P*.5;x<w*P;x+=P){t.beginPath();t.moveTo(x,y);t.lineTo(x,y+P*.5);t.stroke();}}}
  else{t.fillStyle='rgba(255,255,255,.14)';for(let x=P*.25;x<w*P;x+=P*.75)t.fillRect(x,0,P*.25,ht*P);}
  const g=t.createLinearGradient(0,0,P*1.2,0);g.addColorStop(0,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,0)');t.fillStyle=g;t.fillRect(0,0,P*1.2,ht*P);t.restore();
  rr(t,3,3,w*P-6,ht*P-6,10);ink(t,4);rr(t,P*.35,P*.35,w*P-P*.7,ht*P-P*.7,6);ink(t,2.5,dark);
  // door(s)
  const doors=[];for(let y=h.minY;y<=h.maxY;y++)for(const x of[h.minX-1,h.maxX+1])if(tileAt(x,y)===T.DOOR&&!(meta[idx(x,y)]&2))doors.push([x,y]);
  const toC=(x,y)=>[(x-(h.minX-1))*P,(h.maxY+2-y)*P];
  for(const[x,y]of doors){const[cx,cy]=toC(x,y+2);const dx=Math.min(Math.max(cx+P*.12,P*.4),w*P-P*1.2);rr(t,dx,cy+P*.1,P*.76,P*1.9-P*.1,6);fi(t,'#8e5a30',3);circ(t,dx+P*.6,cy+P*1.1,4);fi(t,'#f1c04f',2);}
  // windows
  const nWin=Math.max(1,Math.floor((w-2)/4));const wy=P*1.2;for(let k=0;k<nWin;k++){const wx=(w*P)*(k+1)/(nWin+1)-P*.45;if(doors.some(([x])=>Math.abs(toC(x,0)[0]-wx)<P*1.2))continue;rr(t,wx,wy,P*.9,P*.9,4);fi(t,h.light?'#ffe08a':'#3a3450',3);t.beginPath();t.moveTo(wx+P*.45,wy);t.lineTo(wx+P*.45,wy+P*.9);t.moveTo(wx,wy+P*.45);t.lineTo(wx+P*.9,wy+P*.45);ink(t,2.5);}
  // sign
  const who=npcs.find(n=>n.home&&h.seen&&h.seen.has(n.home.key));const label=who?NPCDEF[who.type].name:h.bed?'Home':'';
  if(label){t.font="bold 22px 'Grandstander',system-ui,sans-serif";const tw=t.measureText(label).width+24;const sx=w*P/2-tw/2,sy=P*.45;t.beginPath();t.moveTo(sx+10,sy);t.lineTo(sx+10,sy-12);t.moveTo(sx+tw-10,sy);t.lineTo(sx+tw-10,sy-12);ink(t,2);rr(t,sx,sy,tw,32,6);fi(t,'#f7eedc',2.5);t.fillStyle=INK;t.textAlign='center';t.textBaseline='middle';t.fillText(label,w*P/2,sy+17);}
  grain(t,0,0,c.width,c.height,10);return c;}
const backMat=new THREE.MeshBasicMaterial({color:0xd9c39c,side:THREE.BackSide});
function makeHouse(e){return null;const h=Object.assign({open:0,target:0},e);const w=h.maxX-h.minX+3,ht=h.maxY-h.minY+3;const g=new THREE.PlaneGeometry(w,ht);g.translate(w/2,ht/2,0);
  h.tex=canvasTex(drawFacade(h));h.mat=new THREE.MeshBasicMaterial({map:h.tex,side:THREE.FrontSide,transparent:true,alphaTest:.5});h.group=new THREE.Group();h.group.add(new THREE.Mesh(g,h.mat),new THREE.Mesh(g,backMat));h.group.position.set(h.minX-1,h.minY-1,.64);h.group.renderOrder=2;scene.add(h.group);houses.push(h);return h;}
export function dropHouse(h){scene.remove(h.group);h.tex.dispose();h.mat.dispose();houses.splice(houses.indexOf(h),1);}
export function registerHouseAt(x,y){return null;const e=enclosure(x,y);if(!e)return null;let h=houses.find(o=>o.key===e.key);if(h){if(h.minX!==e.minX||h.maxX!==e.maxX||h.minY!==e.minY||h.maxY!==e.maxY||h.wt!==e.wt||h.light!==e.light||h.bed!==e.bed){dropHouse(h);h=null;}else{h.seen=e.seen;return h;}}
  for(const o of houses.slice())if(o.minX<=e.maxX&&o.maxX>=e.minX&&o.minY<=e.maxY&&o.maxY>=e.minY)dropHouse(o);if(houses.length>=40)dropHouse(houses[0]);return makeHouse(Object.assign(e,{sx:x,sy:y}));}
let curHouseKey=null;const houseSeen={};
const HOUSECARD={merchant:["The Merchant's Shop",'Torches, potions and things that go on your face.'],guide:["The Guide's Study",'Maps, notes and helpful advice.'],painter:["The Painter's Studio",'Mind the wet paint.'],nurse:["The Nurse's Clinic",'Patched paper, smoothed creases.'],tinkerer:["The Tinkerer's Workshop",'Glue, string and optimism.'],angler:["The Angler's Hut",'Smells like the Ink Lake.'],farmer:["The Farmer's Cottage",'Mind the seed trays.'],scout:["The Cartographer's Room",'Maps on every wall.'],curator:['The Museum','Please do not touch the exhibits.'],home:['Home Sweet Home','Your bed is here. Rest to set your spawn.']};
export function updateHouses(dt){houseT-=dt;if(houseT>0)return;houseT=.35;const p=player;if(p.dead)return;const e=enclosure(Math.floor(p.x),Math.floor(p.y+.5));const key=e?e.key:null;if(key===curHouseKey)return;curHouseKey=key;if(!e)return;
  const who=npcs.find(n=>n.home&&e.seen.has(n.home.key));const k=who?who.type:e.bed?'home':null;if(!k)return;const now=performance.now();if(houseSeen[key]&&now-houseSeen[key]<20000)return;houseSeen[key]=now;
  const[t,sub]=HOUSECARD[k];chapterCard(null,t,sub,'Welcome to');}
export function clearHouses(){for(const h of houses.slice())dropHouse(h);}
const easeBack=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);};
export function popUp(){const cam=camera.position;const cx0=Math.max(0,Math.floor((cam.x-30)/CS)),cx1=Math.min(CW-1,Math.floor((cam.x+30)/CS)),cy0=Math.max(0,Math.floor((cam.y-20)/CS)),cy1=Math.min(CHH-1,Math.floor((cam.y+18)/CS));
  popAnim=[];for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const k=cy*CW+cx;const d=Math.abs((cx+.5)*CS-player.x)+Math.abs((cy+.5)*CS-player.y)*.5;popAnim.push({k,t:-d*.014,y0:cy*CS});}if(popAnim.length)SFX.door();}
export function updatePop(dt){if(!popAnim.length)return;let live=0;for(const a of popAnim){a.t+=dt;const p=clamp(a.t/.75,0,1);const th=-1.45*(1-easeBack(p));const tx=[chunks[a.k],liqChunks[a.k]];for(const m of tx){if(!m)continue;m.rotation.x=th;m.position.set(0,a.y0-a.y0*Math.cos(th),-a.y0*Math.sin(th));}if(p<1)live++;}
  if(!live){for(const a of popAnim)for(const m of[chunks[a.k],liqChunks[a.k]])if(m){m.rotation.x=0;m.position.set(0,0,0);}popAnim=[];}}
const CHSUB={forest:'Where every adventure is first sketched.',snow:'Folded pines and paper snow.',lake:'Still water, dark as a spilled inkwell.',desert:'Dunes of sandpaper, warm and dry.',under:'The pages burn at the bottom of the world.'};
let chTimer=null;
export function chapterCard(b,title,sub,kick){const el=$('chapter');const small=!b;$('chKick').textContent=kick||'A new page';$('chName').textContent=b?BIONAME[b]:title;$('chSub').textContent=b?(CHSUB[b]||''):sub;el.hidden=false;el.className='in'+(small?' small':'');clearTimeout(chTimer);chTimer=setTimeout(()=>{el.className='out'+(small?' small':'');chTimer=setTimeout(()=>{el.hidden=true;el.className='';},520);},small?2000:3200);}

// ================= world map =================
export let explored=new Uint8Array(N);export let mapOpen=false,revealT=0;
export function reveal(cx,cy,r){const x0=Math.max(0,Math.floor(cx-r)),x1=Math.min(W-1,Math.ceil(cx+r)),y0=Math.max(0,Math.floor(cy-r)),y1=Math.min(H-1,Math.ceil(cy+r));let ch=0;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!explored[y*W+x]&&(x+.5-cx)**2+(y+.5-cy)**2<=r*r){explored[y*W+x]=1;ch=1;}if(ch)mapTouch(x0,x1);}
// The map's picture (mapBase, one pixel per tile) is kept up to date in strips of MSTRIP columns instead of being redrawn whole:
// reveal() and markDirty() mark the strips they touch, and paintMap() repaints the marked ones plus one more in turn, so a tile
// changed some other way still catches up. Opening the full map repaints every strip once.
export const MSTRIP=64;let mDirt=new Uint8Array(1),mNext=0;
export let mapBase=mk(W,H),mbx=mapBase.getContext('2d'),mbImg=mbx.createImageData(W,H);
export function mapTouch(x0,x1){const n=mDirt.length;for(let s=Math.max(0,Math.floor(x0/MSTRIP)),e=Math.min(n-1,Math.floor(x1/MSTRIP));s<=e;s++)mDirt[s]=1;}
export function mapAll(){mDirt.fill(1);}
export function resetMap(){mapBase=mk(W,H);mbx=mapBase.getContext('2d');mbImg=mbx.createImageData(W,H);mDirt=new Uint8Array(Math.ceil(W/MSTRIP)).fill(1);mNext=0;}
// strips repainted by the last paintMap() (the tests read it)
export let mapPainted=0;
export function paintMap(){const n=mDirt.length,d=mbImg.data;mDirt[mNext]=1;mNext=(mNext+1)%n;mapPainted=0;
  for(let s=0;s<n;s++){if(!mDirt[s])continue;mDirt[s]=0;mapPainted++;const x0=s*MSTRIP,x1=Math.min(W,x0+MSTRIP);
    for(let y=0;y<H;y++){const k=clamp(.55+.45*(y/(surfAvg+8)),.55,1);for(let x=x0;x<x1;x++){const i=y*W+x,o=((H-1-y)*W+x)*4;let c;
      if(!explored[i])c=[34,27,40];else{const t=tiles[i];if(t)c=TCOL[t];else if(walls[i])c=WCOL[walls[i]];else c=y<surf[x]-3?[52,40,56]:[150,205,222];c=[c[0]*k,c[1]*k,c[2]*k];}
      d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;}}
    mbx.putImageData(mbImg,0,0,x0,0,x1-x0,H);}}
// one view of the map: cw×ch canvas pixels centred on tile (cx, cy) at S pixels a tile, with every marker
export function mapView(g,cw,ch,cx,cy,S){g.setTransform(1,0,0,1,0,0);g.fillStyle='#1c1520';g.fillRect(0,0,cw,ch);
  const ox=Math.round(cw/2-cx*S),oy=Math.round(ch/2-(H-cy)*S);g.translate(ox,oy);g.imageSmoothingEnabled=false;
  const sx0=clamp(Math.floor(-ox/S),0,W),sx1=clamp(Math.ceil((cw-ox)/S),0,W),sy0=clamp(Math.floor(-oy/S),0,H),sy1=clamp(Math.ceil((ch-oy)/S),0,H);
  if(sx1>sx0&&sy1>sy0)g.drawImage(mapBase,sx0,sy0,sx1-sx0,sy1-sy0,sx0*S,sy0*S,(sx1-sx0)*S,(sy1-sy0)*S);
  const dot=(x,y,col,r)=>{g.beginPath();g.arc(x*S,(H-y)*S,r,0,Math.PI*2);g.fillStyle=col;g.fill();g.lineWidth=2;g.strokeStyle='#2a2130';g.stroke();};
  for(const[x,y]of(BIO.shown||[])){if(tiles[idx(x,y)]!==T.CHEST)continue;g.lineWidth=4;g.strokeStyle='#d4483b';const X=(x+.5)*S,Y=(H-y-.5)*S;g.beginPath();g.moveTo(X-7,Y-7);g.lineTo(X+7,Y+7);g.moveTo(X+7,Y-7);g.lineTo(X-7,Y+7);g.stroke();}
  for(const k of chests.keys())if(explored[k])dot(k%W+.5,Math.floor(k/W)+.5,'#f1c04f',4);
  // story landmarks, once found or once their spot is explored
  g.font=`bold ${clamp(S*4,10,16)}px sans-serif`;g.textAlign='center';for(const[k,x,y]of(BIO.marks||[])){if(!lore.f[k]&&!explored[idx(x,Math.min(H-1,y+2))])continue;const X=x*S,Y=(H-y-6)*S;
    g.beginPath();g.moveTo(X,Y-9);g.lineTo(X+7,Y);g.lineTo(X,Y+9);g.lineTo(X-7,Y);g.closePath();g.fillStyle=lore.f[k]?'#b06ad0':'#e9dcc0';g.fill();g.lineWidth=2;g.strokeStyle='#2a2130';g.stroke();
    g.lineWidth=3;g.strokeStyle='rgba(251,248,240,.85)';g.strokeText(MARKS[k].n,X,Y-13);g.fillStyle='#2a2130';g.fillText(MARKS[k].n,X,Y-13);}
  drawTrickMarks(g,S);
  dot(player.spawn.x,player.spawn.y+.5,'#e8636a',5);npcs.forEach(n=>dot(n.x,n.y+1,'#6cf07a',6));if(boss)dot(boss.x,boss.y+2,'#7fd3f0',9);dot(player.x,player.y+1,'#fff',7);g.setTransform(1,0,0,1,0,0);}

// The full map (Map key) pauses play and can be zoomed (wheel, pinch, +/-, LB/RB) and panned (drag, arrows, stick). It opens on
// the player at the zoom it was left at (MAPZ to start), between the whole world fitting the view and MAPZMAX pixels a tile.
export const MAPZ=4,MAPZMAX=16;export const mv={x:0,y:0,s:0};
const mapCv=()=>$('mapC');
// the canvas is as many pixels as it shows on screen, so a tile is S screen pixels
function mapFit(){const c=mapCv(),r=c.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return c;}
const mapMin=()=>{const c=mapCv();return Math.min(MAPZMAX,Math.min(c.width/W,c.height/H));};
// a map smaller than the view sits in its middle; a bigger one stops at its edges
function mapClamp(){const c=mapCv();mv.s=clamp(mv.s,mapMin(),MAPZMAX);const hw=c.width/2/mv.s,hh=c.height/2/mv.s;
  mv.x=W<=hw*2+1e-6?W/2:clamp(mv.x,hw,W-hw);mv.y=H<=hh*2+1e-6?H/2:clamp(mv.y,hh,H-hh);}
export function mapRender(){if(!mapOpen)return;const c=mapFit();mapClamp();mapView(c.getContext('2d'),c.width,c.height,mv.x,mv.y,mv.s);}
export function drawMap(){paintMap();mapRender();}
export function mapCenter(){mv.x=player.x;mv.y=player.y+1;mapRender();}
// zoom by f around canvas point (px, py), which stays over the same spot
export function mapZoom(f,px,py){const c=mapCv();if(px==null){px=c.width/2;py=c.height/2;}const s0=mv.s;
  const wx=mv.x+(px-c.width/2)/s0,wy=mv.y-(py-c.height/2)/s0;mv.s=clamp(s0*f,mapMin(),MAPZMAX);mv.x=wx-(px-c.width/2)/mv.s;mv.y=wy+(py-c.height/2)/mv.s;mapRender();}
export function mapPan(dx,dy){mv.x-=dx/mv.s;mv.y+=dy/mv.s;mapRender();}
// keys and the stick pan while the map is open
export function updateMap(dt){const sp=dt*600,u=pad.held.up||keys.w||keys.arrowup,dn=held('down');let dx=0,dy=0;
  if(held('left'))dx+=sp;if(held('right'))dx-=sp;if(u)dy+=sp;if(dn)dy-=sp;if(dx||dy)mapPan(dx,dy);}
export function toggleMap(o=!mapOpen){if(state!=='play'&&o)return;mapOpen=o;$('map').hidden=!o;if(o){if(invOpen)setInv(false);if(!mv.s){mapFit();mv.s=Math.max(MAPZ,mapMin());}mapAll();mv.x=player.x;mv.y=player.y+1;drawMap();}miniShow();}
{const c=mapCv(),pts=new Map();let pinch=0;const at=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height];};
  c.addEventListener('wheel',e=>{e.preventDefault();const[x,y]=at(e);mapZoom(Math.pow(1.0015,-e.deltaY),x,y);},{passive:false});
  c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);pts.set(e.pointerId,at(e));pinch=0;});
  c.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;const q=at(e);
    if(pts.size===2){const o=[...pts].find(([k])=>k!==e.pointerId)[1],d0=Math.hypot(p[0]-o[0],p[1]-o[1]),d1=Math.hypot(q[0]-o[0],q[1]-o[1]);if(d0>0)mapZoom(d1/d0,(q[0]+o[0])/2,(q[1]+o[1])/2);pinch=1;}
    else if(!pinch)mapPan(q[0]-p[0],q[1]-p[1]);pts.set(e.pointerId,q);});
  const up=e=>{pts.delete(e.pointerId);};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
  $('mapMe').addEventListener('click',mapCenter);$('mapIn').addEventListener('click',()=>mapZoom(1.5));$('mapOut').addEventListener('click',()=>mapZoom(1/1.5));
  addEventListener('resize',()=>{if(mapOpen)mapRender();});}

// The minimap has three modes (SET.mini), cycled by the Minimap key: 'corner', the small window in the top corner (hud.js);
// 'overlay', a big see-through map over the play view, centred on the player, that doesn't pause; and 'off'.
export const MINIMODES=['corner','overlay','off'],MININAME={corner:'Corner',overlay:'Overlay',off:'Hidden'},OVZ=3;let ovT=0;
export function cycleMini(){setMini(MINIMODES[(MINIMODES.indexOf(SET.mini)+1)%MINIMODES.length]);toast(`Minimap: ${MININAME[SET.mini]}`);}
export function setMini(m){SET.mini=MINIMODES.includes(m)?m:'corner';saveSettings();if($('miniS'))$('miniS').value=SET.mini;ovT=0;miniShow();}
// what shows: the corner window and the overlay only in play, the overlay not over the backpack or the full map
export function miniShow(){const play=state==='play'&&!invOpen&&!mapOpen;$('miniWrap').hidden=SET.mini!=='corner';const ov=$('mapOv'),on=SET.mini==='overlay'&&play;
  if(ov.hidden===on){ov.hidden=!on;if(on)ovT=0;}}
export function updateOverlay(dt){miniShow();if($('mapOv').hidden)return;ovT-=dt;if(ovT>0)return;ovT=.2;const c=$('mapOv'),r=c.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}paintMap();const S=OVZ*w/Math.max(1,c.clientWidth||w);mapView(c.getContext('2d'),w,h,player.x,player.y+1,S);}
// Imported bindings are read-only, so other modules assign these through setters.
export function setVisited(v){return visited=v;}
export function setExplored(v){return explored=v;}
export function setMapOpen(v){return mapOpen=v;}
export function setRevealT(v){return revealT=v;}
