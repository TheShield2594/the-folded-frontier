// The texture atlas, drawn in code. C maps names to atlas cells.
import {circ,fi,fibers,grain,INK,ink,mk,pick,poly,rand,rr,SET,sh,drawPet,drawStag} from './game.js';

// ================= atlas =================
export const atlas=mk(1024,2048),A=atlas.getContext('2d');
let cellN=0;export const cellXY=c=>{let row=Math.floor(c/16);if(row>=12)row+=4;return[(c%16)*64,row*64];};
function blockCell(base,deco,outline=true,c=cellN++){const[x,y]=cellXY(c);A.save();A.beginPath();A.rect(x,y,64,64);A.clip();A.translate(x,y);
  A.fillStyle=sh(base,.6);A.fillRect(0,0,64,64);rr(A,1.5,1.5,61,61,8);A.fillStyle=base;A.fill();
  A.save();rr(A,1.5,1.5,61,61,8);A.clip();const g=A.createLinearGradient(0,0,0,64);g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(1,'rgba(0,0,0,.14)');A.fillStyle=g;A.fillRect(0,0,64,64);
  if(deco)deco(A);fibers(A,64,64,'#fff',16);A.restore();
  if(outline){rr(A,2.5,2.5,59,59,7.5);ink(A,2.2,sh(base,.4));}
  A.beginPath();A.moveTo(9,5.5);A.lineTo(55,5.5);A.strokeStyle='rgba(255,255,255,.35)';A.lineWidth=1.6;A.stroke();
  A.restore();grain(A,x,y,64,64,16);return c;}
function stickerAt(px,py,w,h,draw,b=3){const tmp=mk(w,h),t=tmp.getContext('2d');draw(t);grain(t,0,0,w,h,12);
  const sil=mk(w,h),s=sil.getContext('2d');s.drawImage(tmp,0,0);s.globalCompositeOperation='source-in';s.fillStyle='#fbf5e6';s.fillRect(0,0,w,h);
  A.save();A.beginPath();A.rect(px,py,w,h);A.clip();if(b>0)for(let i=0;i<16;i++){const a=i/16*Math.PI*2;A.drawImage(sil,px+Math.cos(a)*b,py+Math.sin(a)*b);}A.drawImage(tmp,px,py);A.restore();}
function sticker(draw,b=3){const c=cellN++;const[x,y]=cellXY(c);stickerAt(x,y,64,64,draw,b);return c;}
export const C={};
// --- block decos
const speck=(cols,n,rmin=1,rmax=2.6)=>c=>{for(let i=0;i<n;i++){c.fillStyle=pick(cols);circ(c,rand(4,60),rand(4,60),rand(rmin,rmax));c.fill();}};
const dirtDeco=c=>{speck(['#7d5431','#b07c4c','#6a4526'],26)(c);for(let i=0;i<3;i++){const x=rand(10,54),y=rand(14,54);c.beginPath();c.ellipse(x,y,rand(3,5),rand(2,3.5),rand(0,3),0,6.28);fi(c,'#a39a8e',1.5);}};
const stoneDeco=c=>{c.lineWidth=2;for(let i=0;i<22;i++){const x=rand(0,64),y=rand(0,64);c.strokeStyle=Math.random()<.5?'rgba(255,255,255,.18)':'rgba(40,30,50,.16)';c.beginPath();c.moveTo(x,y);c.lineTo(x+7,y-5);c.stroke();}
  c.strokeStyle='rgba(42,33,48,.45)';c.lineWidth=1.6;c.beginPath();const x=rand(14,40),y=rand(16,44);c.moveTo(x,y);c.lineTo(x+6,y+5);c.lineTo(x+4,y+11);c.moveTo(x+6,y+5);c.lineTo(x+13,y+6);c.stroke();};
C.dirt=blockCell('#9a6a3f',dirtDeco);
C.grassF=blockCell('#9a6a3f',c=>{dirtDeco(c);c.beginPath();c.moveTo(0,0);c.lineTo(64,0);c.lineTo(64,15);for(let x=64;x>=0;x-=8){c.lineTo(x-4,15+((x/8)%2?7:2));c.lineTo(x-8,14);}c.closePath();c.fillStyle='#6dbb4a';c.fill();ink(c,2.2,'#3f7a2b');c.fillStyle='rgba(255,255,255,.25)';c.fillRect(0,2,64,4);});
C.grassT=blockCell('#6dbb4a',c=>{c.lineWidth=2;for(let i=0;i<26;i++){const x=rand(2,62),y=rand(2,62);c.strokeStyle=Math.random()<.5?'#86d15f':'#4f9a36';c.beginPath();c.moveTo(x,y);c.lineTo(x+rand(-2,2),y-6);c.stroke();}});
C.stone=blockCell('#8d8f9a',stoneDeco);
C.copper=cellN++;C.iron=cellN++;C.gold=cellN++;
C.sand=blockCell('#e8cf8a',speck(['#d4b56a','#f5e2ad','#c9a95f'],40,.8,1.8));
C.plank=blockCell('#c98f4f',c=>{c.strokeStyle='#8a5a2e';c.lineWidth=2.4;for(const y of[21,42]){c.beginPath();c.moveTo(0,y);c.lineTo(64,y);c.stroke();}c.lineWidth=1.2;c.strokeStyle='rgba(120,70,30,.45)';for(let i=0;i<7;i++){const y=rand(5,60);c.beginPath();c.moveTo(rand(0,20),y);c.bezierCurveTo(24,y-3,40,y+3,rand(44,64),y);c.stroke();}c.fillStyle='#6b4a2f';for(const[x,y]of[[8,11],[56,11],[8,32],[56,32],[8,53],[56,53]]){circ(c,x,y,1.8);c.fill();}});
C.brick=blockCell('#d9c8b5',c=>{for(let r=0;r<4;r++){const off=r%2?-16:0;for(let k=-1;k<3;k++){rr(c,off+k*32+3,r*16+2,27,12,3);fi(c,Math.random()<.5?'#b6564a':'#a84d42',1.4);}}});
C.glass=blockCell('#bfe6f0',c=>{c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=4;c.beginPath();c.moveTo(14,40);c.lineTo(36,14);c.moveTo(24,50);c.lineTo(46,24);c.stroke();c.strokeStyle='#7fb3c2';c.lineWidth=2;c.strokeRect(10,10,44,44);});
C.core=blockCell('#3b3346',c=>{c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=3;for(let i=-64;i<64;i+=14){c.beginPath();c.moveTo(i,0);c.lineTo(i+64,64);c.moveTo(i+64,0);c.lineTo(i,64);c.stroke();}});
C.wDirt=blockCell('#6a4a30',speck(['#553a24','#7b5638'],18),false);
C.wWood=blockCell('#7d5634',c=>{c.strokeStyle='#5a3c22';c.lineWidth=2;for(const x of[16,32,48]){c.beginPath();c.moveTo(x,0);c.lineTo(x,64);c.stroke();}},false);
C.wStone=blockCell('#77798a',c=>{c.strokeStyle='#55576a';c.lineWidth=2;for(let r=0;r<4;r++){c.beginPath();c.moveTo(0,r*16);c.lineTo(64,r*16);c.stroke();const off=r%2?16:0;for(let k=0;k<3;k++){c.beginPath();c.moveTo(off+k*32,r*16);c.lineTo(off+k*32,r*16+16);c.stroke();}}},false);
// --- decor
C.torch=sticker(t=>{rr(t,29,30,7,28,3);fi(t,'#8a5a33');t.beginPath();t.moveTo(32,6);t.bezierCurveTo(44,18,42,32,32.5,33);t.bezierCurveTo(22,32,21,18,32,6);fi(t,'#f5a524');t.beginPath();t.moveTo(32.5,15);t.bezierCurveTo(38,22,37,30,32.5,30);t.bezierCurveTo(28,30,27,22,32.5,15);t.fillStyle='#ffe58a';t.fill();});
C.tuft=sticker(t=>{for(const[x,h,a]of[[18,18,-.3],[26,24,-.1],[34,20,.15],[42,15,.35],[30,13,.6]]){t.beginPath();t.moveTo(x-4,62);t.quadraticCurveTo(x+a*10,62-h*.6,x+a*18,62-h);t.lineTo(x+4,62);t.closePath();fi(t,a>.2?'#5aa83c':'#6dbb4a',1.8);}},2.5);
const flower=(col)=>sticker(t=>{t.beginPath();t.moveTo(32,62);t.quadraticCurveTo(28,50,32,38);ink(t,3.5,'#3f7a2b');t.beginPath();t.ellipse(25,52,6,3,-.6,0,6.28);fi(t,'#6dbb4a',1.6);for(let i=0;i<5;i++){const a=i/5*6.28;circ(t,32+Math.cos(a)*7,33+Math.sin(a)*7,5.5);fi(t,col,1.8);}circ(t,32,33,4.5);fi(t,'#f7d046',1.8);},2.5);
C.flower=flower('#e8636a');C.flower2=flower('#f4f0e6');
C.mush=sticker(t=>{rr(t,27,42,11,18,4);fi(t,'#f1e5cc');t.beginPath();t.arc(32.5,43,15,Math.PI,0);t.closePath();fi(t,'#e0823d');for(const[x,y]of[[26,36],[36,33],[41,40]]){circ(t,x,y,2.6);t.fillStyle='#ffe9a8';t.fill();}});
C.chest=sticker(t=>{rr(t,9,30,46,28,4);fi(t,'#a86b3a');rr(t,7,20,50,14,6);fi(t,'#8e5a30');t.fillStyle='#f1c04f';t.fillRect(12,30,4,28);t.fillRect(48,30,4,28);rr(t,27,27,10,11,2);fi(t,'#f1c04f',2);t.fillStyle=INK;t.fillRect(31,31,2,4);});
C.bench=sticker(t=>{rr(t,5,28,54,9,3);fi(t,'#c98f4f');rr(t,10,36,7,22,2);fi(t,'#9a6a3f');rr(t,47,36,7,22,2);fi(t,'#9a6a3f');rr(t,14,46,36,5,2);fi(t,'#9a6a3f',2);t.save();t.translate(38,18);t.rotate(-.5);rr(t,-2,-4,4,16,2);fi(t,'#8a5a33',2);rr(t,-7,-8,14,6,2);fi(t,'#a9adb8',2);t.restore();rr(t,13,18,14,10,2);fi(t,'#e9dfc9',2);});
C.table=sticker(t=>{rr(t,4,26,56,9,4);fi(t,'#c98f4f');rr(t,28,34,8,20,2);fi(t,'#9a6a3f');rr(t,16,54,32,6,3);fi(t,'#9a6a3f');circ(t,22,21,5);fi(t,'#e8636a',2);});
C.chair=sticker(t=>{rr(t,16,8,8,40,3);fi(t,'#9a6a3f');rr(t,16,36,32,7,3);fi(t,'#c98f4f');rr(t,17,42,6,19,2);fi(t,'#9a6a3f');rr(t,41,42,6,19,2);fi(t,'#9a6a3f');});
C.furnace=sticker(t=>{rr(t,39,4,10,20,2);fi(t,'#6c6e79');t.beginPath();t.moveTo(6,60);t.lineTo(6,34);t.quadraticCurveTo(6,12,32,12);t.quadraticCurveTo(58,12,58,34);t.lineTo(58,60);t.closePath();fi(t,'#8d8f9a');t.beginPath();t.moveTo(20,58);t.lineTo(20,42);t.quadraticCurveTo(32,28,44,42);t.lineTo(44,58);t.closePath();fi(t,'#3a2530',2);t.beginPath();t.moveTo(24,58);t.quadraticCurveTo(26,44,32,40);t.quadraticCurveTo(38,46,40,58);t.closePath();t.fillStyle='#f5a524';t.fill();t.beginPath();t.moveTo(28,58);t.quadraticCurveTo(30,50,32,47);t.quadraticCurveTo(35,51,36,58);t.fillStyle='#ffe58a';t.fill();});
C.anvil=sticker(t=>{poly(t,[4,26,50,26,60,20,60,30,50,36,42,36,38,44,46,50,46,58,18,58,18,50,26,44,22,36,10,34]);fi(t,'#4b4e5c');t.fillStyle='rgba(255,255,255,.25)';t.fillRect(10,28,40,3);});
C.bed=sticker(t=>{rr(t,4,22,9,36,3);fi(t,'#9a6a3f');rr(t,52,34,8,24,3);fi(t,'#9a6a3f');rr(t,8,40,50,12,3);fi(t,'#c98f4f');rr(t,11,32,46,10,4);fi(t,'#f4f0e6');t.beginPath();t.ellipse(20,31,8,5,0,0,6.28);fi(t,'#fbf8f0');rr(t,27,29,31,14,5);fi(t,'#d4483b');t.strokeStyle='rgba(255,255,255,.5)';t.lineWidth=1.5;t.setLineDash([3,3]);t.beginPath();t.moveTo(30,36);t.lineTo(55,36);t.stroke();t.setLineDash([]);});
C.heart=sticker(t=>{t.beginPath();t.moveTo(32,56);t.bezierCurveTo(6,40,6,14,22,12);t.bezierCurveTo(29,11,32,18,32,22);t.bezierCurveTo(32,18,35,11,42,12);t.bezierCurveTo(58,14,58,40,32,56);fi(t,'#e0506b',3);t.beginPath();t.moveTo(32,22);t.lineTo(32,54);t.strokeStyle='rgba(120,20,40,.35)';t.lineWidth=2;t.stroke();t.beginPath();t.ellipse(22,22,5,3,-.7,0,6.28);t.fillStyle='rgba(255,255,255,.7)';t.fill();});
{ // door: draw 64x128 then split
  const dt=mk(64,128),d=dt.getContext('2d');rr(d,12,6,40,118,4);fi(d,'#a86b3a');d.strokeStyle='#7b4a25';d.lineWidth=2;for(const x of[25,38]){d.beginPath();d.moveTo(x,10);d.lineTo(x,120);d.stroke();}rr(d,16,20,32,30,3);ink(d,2,'#7b4a25');rr(d,16,70,32,40,3);ink(d,2,'#7b4a25');circ(d,44,68,3.5);fi(d,'#f1c04f',2);
  C.doorT=sticker(t=>t.drawImage(dt,0,0,64,64,0,0,64,64),0);C.doorB=sticker(t=>t.drawImage(dt,0,64,64,64,0,0,64,64),0);
  C.doorOT=sticker(t=>{rr(t,6,6,10,70,3);fi(t,'#8e5a30');},0);C.doorOB=sticker(t=>{rr(t,6,-10,10,68,3);fi(t,'#8e5a30');},0);
  C.doorIcon=sticker(t=>t.drawImage(dt,4,0,56,128,16,2,28,60),2);
}
C.platform=sticker(t=>{rr(t,-4,4,72,11,3);fi(t,'#c98f4f');t.strokeStyle='rgba(120,70,30,.5)';t.lineWidth=1.3;t.beginPath();t.moveTo(4,9);t.lineTo(60,9);t.stroke();poly(t,[10,15,16,15,13,24]);fi(t,'#9a6a3f',1.8);poly(t,[48,15,54,15,51,24]);fi(t,'#9a6a3f',1.8);},0);
C.trunk=sticker(t=>{t.fillStyle='#7b5234';t.fillRect(19,0,26,64);t.strokeStyle='#5a3a22';t.lineWidth=2;for(const x of[26,33,39]){t.beginPath();t.moveTo(x+rand(-1,1),0);t.lineTo(x+rand(-2,2),64);t.stroke();}t.beginPath();t.moveTo(19,0);t.lineTo(19,64);t.moveTo(45,0);t.lineTo(45,64);ink(t,2.6);},0);
C.crack=[0,1,2].map(k=>sticker(t=>{t.strokeStyle='rgba(30,20,35,.8)';t.lineWidth=2.2;t.lineCap='round';const segs=[[32,32,12,10],[32,32,54,18],[32,32,20,56],[32,32,56,50],[32,32,6,36],[32,32,40,4]];for(let i=0;i<2+k*2;i++){const s=segs[i];t.beginPath();t.moveTo(s[0],s[1]);t.lineTo((s[0]+s[2])/2+rand(-4,4),(s[1]+s[3])/2+rand(-4,4));t.lineTo(s[2],s[3]);t.stroke();}},0));
// --- item icons
const pickIcon=col=>sticker(t=>{t.beginPath();t.moveTo(14,54);t.lineTo(44,22);ink(t,8,INK);t.beginPath();t.moveTo(14,54);t.lineTo(44,22);ink(t,4.5,'#9a6a3f');t.beginPath();t.moveTo(22,12);t.quadraticCurveTo(46,8,54,36);t.lineTo(48,38);t.quadraticCurveTo(44,20,24,18);t.closePath();fi(t,col);});
const swordIcon=(col,long=1)=>sticker(t=>{poly(t,[16,44,20,48,54-6*(1-long),14+6*(1-long),56,8,50,10]);fi(t,col);t.beginPath();t.moveTo(22,46);t.lineTo(50,16);t.strokeStyle='rgba(255,255,255,.55)';t.lineWidth=1.5;t.stroke();rr(t,-3,-3,6,20,2);t.save();t.translate(19,45);t.rotate(.785);rr(t,-10,-3,20,6,2);fi(t,'#6b4430',2);t.restore();t.beginPath();t.moveTo(16,48);t.lineTo(8,56);ink(t,7,INK);t.beginPath();t.moveTo(16,48);t.lineTo(8,56);ink(t,4,'#8a5a33');circ(t,7,57,3.5);fi(t,'#f1c04f',2);});
const barIcon=col=>sticker(t=>{poly(t,[8,46,56,46,48,26,16,26]);fi(t,col);poly(t,[16,26,48,26,44,20,20,20]);fi(t,sh(col,1.18));t.fillStyle='rgba(255,255,255,.4)';t.fillRect(18,31,20,3);});
C.pickCu=pickIcon('#d9853b');C.pickFe=pickIcon('#a9adb8');C.pickAu=pickIcon('#f0c040');
C.hammer=sticker(t=>{t.beginPath();t.moveTo(14,54);t.lineTo(40,24);ink(t,8,INK);t.beginPath();t.moveTo(14,54);t.lineTo(40,24);ink(t,4.5,'#9a6a3f');t.save();t.translate(42,22);t.rotate(.72);rr(t,-15,-8,30,16,4);fi(t,'#c98f4f');t.restore();});
C.swWood=swordIcon('#c98f4f',.8);C.swCu=swordIcon('#e39148',.9);C.swFe=swordIcon('#c9ccd4',1);C.swAu=swordIcon('#f5cc55',1);
C.barCu=barIcon('#d9853b');C.barFe=barIcon('#b3b6bf');C.barAu=barIcon('#f0c040');
C.gel=sticker(t=>{t.beginPath();t.moveTo(10,50);t.bezierCurveTo(8,22,56,22,54,50);t.closePath();fi(t,'#5bb6e8');t.beginPath();t.ellipse(24,36,6,3.5,-.5,0,6.28);t.fillStyle='rgba(255,255,255,.7)';t.fill();});
C.lens=sticker(t=>{circ(t,32,32,20);fi(t,'#f4f0e6');circ(t,32,32,11);fi(t,'#5a8fd0',2);circ(t,32,32,5);t.fillStyle=INK;t.fill();circ(t,27,27,3);t.fillStyle='#fff';t.fill();});
C.batwing=sticker(t=>{t.beginPath();t.moveTo(8,20);t.quadraticCurveTo(36,6,58,18);t.quadraticCurveTo(52,30,56,40);t.quadraticCurveTo(46,36,42,46);t.quadraticCurveTo(34,40,28,50);t.quadraticCurveTo(22,40,12,44);t.quadraticCurveTo(16,30,8,20);fi(t,'#6b4c8f');t.strokeStyle='rgba(255,255,255,.3)';t.lineWidth=1.5;t.beginPath();t.moveTo(12,22);t.lineTo(42,44);t.moveTo(12,22);t.lineTo(28,48);t.moveTo(12,22);t.lineTo(54,38);t.stroke();});
C.coin=sticker(t=>{circ(t,32,32,19);fi(t,'#f1c04f');circ(t,32,32,13);ink(t,2,'#b88a1e');poly(t,[32,22,35,29,42,29,36,34,38,41,32,37,26,41,28,34,22,29,29,29]);t.fillStyle='#fff3c0';t.fill();});
C.potion=sticker(t=>{rr(t,26,8,12,8,2);fi(t,'#c98f4f',2);rr(t,27,14,10,10,2);fi(t,'#dfeef2',2);t.beginPath();t.moveTo(27,22);t.lineTo(37,22);t.lineTo(50,44);t.quadraticCurveTo(52,56,40,56);t.lineTo(24,56);t.quadraticCurveTo(12,56,14,44);t.closePath();fi(t,'#dfeef2');t.beginPath();t.moveTo(18,40);t.lineTo(46,40);t.lineTo(49,46);t.quadraticCurveTo(50,54,40,54);t.lineTo(24,54);t.quadraticCurveTo(14,54,15,46);t.closePath();t.fillStyle='#e0506b';t.fill();t.fillStyle='rgba(255,255,255,.7)';t.fillRect(20,30,4,8);});
C.glider=sticker(t=>{poly(t,[4,30,60,14,26,46]);fi(t,'#fbf8f0');poly(t,[26,46,60,14,34,56]);fi(t,'#dcd3c2');t.beginPath();t.moveTo(4,30);t.lineTo(60,14);ink(t,1.5,'rgba(42,33,48,.5)');t.beginPath();t.moveTo(18,32);t.lineTo(24,40);ink(t,1.5,'#d4483b');});
C.lantern=sticker(t=>{circ(t,32,32,20);t.fillStyle='rgba(255,210,110,.35)';t.fill();rr(t,24,6,16,6,2);fi(t,'#b88a1e',2);rr(t,18,12,28,40,6);fi(t,'#f1c04f');rr(t,23,18,18,28,4);fi(t,'#ffe58a',2);rr(t,20,50,24,6,2);fi(t,'#b88a1e',2);});
C.patch=sticker(t=>{rr(t,10,12,44,40,6);fi(t,'#8a7ab0');t.setLineDash([4,3]);rr(t,15,17,34,30,4);ink(t,1.8,'#f4f0e6');t.setLineDash([]);t.beginPath();t.moveTo(20,24);t.lineTo(44,40);t.moveTo(44,24);t.lineTo(20,40);ink(t,2.4,'#d4483b');});
C.buckler=sticker(t=>{circ(t,32,32,24);fi(t,'#a9adb8');circ(t,32,32,16);ink(t,2,'#6c6e79');circ(t,32,32,6);fi(t,'#f1c04f',2);for(let i=0;i<8;i++){const a=i/8*6.28;circ(t,32+Math.cos(a)*20,32+Math.sin(a)*20,1.8);t.fillStyle=INK;t.fill();}});
C.ribbon=sticker(t=>{poly(t,[32,32,10,16,8,44]);fi(t,'#d4483b');poly(t,[32,32,54,16,56,44]);fi(t,'#d4483b');poly(t,[30,34,22,58,30,54,34,58]);fi(t,'#b33a2f',2);poly(t,[34,34,42,58,34,54]);fi(t,'#b33a2f',2);circ(t,32,32,7);fi(t,'#f1c04f');});
C.crown=sticker(t=>{poly(t,[8,48,56,48,58,18,45,32,32,12,19,32,6,18]);fi(t,'#7fd3f0');t.fillStyle='rgba(255,255,255,.5)';t.fillRect(12,38,40,4);circ(t,32,40,5);fi(t,'#e0506b',2);});
C.shuri=sticker(t=>{poly(t,[32,4,38,26,60,32,38,38,32,60,26,38,4,32,26,26]);fi(t,'#fbf8f0');poly(t,[32,4,38,26,32,32]);t.fillStyle='#dcd3c2';t.fill();poly(t,[60,32,38,38,32,32]);t.fill();poly(t,[32,60,26,38,32,32]);t.fillStyle='#e9e2d4';t.fill();circ(t,32,32,3);fi(t,'#d4483b',1.5);});
const helmPaint=(t,col)=>{t.beginPath();t.moveTo(10,44);t.quadraticCurveTo(10,10,32,10);t.quadraticCurveTo(54,10,54,44);t.lineTo(44,44);t.lineTo(44,30);t.lineTo(20,30);t.lineTo(20,44);t.closePath();fi(t,col);t.fillStyle='rgba(255,255,255,.4)';t.fillRect(18,16,6,10);rr(t,8,42,48,8,3);fi(t,sh(col,.8),2);},helmIcon=col=>sticker(t=>helmPaint(t,col));
const mailPaint=(t,col)=>{poly(t,[14,12,24,8,32,14,40,8,50,12,58,26,48,30,46,56,18,56,16,30,6,26]);fi(t,col);for(let y=20;y<54;y+=7)for(let x=22;x<44;x+=7){circ(t,x,y,1.5);t.fillStyle='rgba(42,33,48,.4)';t.fill();}},mailIcon=col=>sticker(t=>mailPaint(t,col));
const legPaint=(t,col)=>{rr(t,14,8,36,10,3);fi(t,sh(col,.85));rr(t,15,16,14,36,5);fi(t,col);rr(t,35,16,14,36,5);fi(t,col);rr(t,12,48,18,9,4);fi(t,sh(col,.7),2);rr(t,34,48,18,9,4);fi(t,sh(col,.7),2);},legIcon=col=>sticker(t=>legPaint(t,col));
export const METAL={cu:'#d9853b',fe:'#a9adb8',au:'#f0c040',fr:'#aee0f2',ik:'#8a6ac0',em:'#ff8a3d',fo:'#d9dcec'};
for(const m in METAL){C['helm'+m]=helmIcon(METAL[m]);C['mail'+m]=mailIcon(METAL[m]);C['legs'+m]=legIcon(METAL[m]);}
// endgame armor sets (#37): each piece is a metal-style icon in the set's color with the set's mark in a paper tag
export const SETCOL={warden:'#c8503c',sky:'#5fb08e',weave:'#6a55b0'};
const SETMARK={warden:t=>{t.beginPath();t.moveTo(43,57);t.lineTo(57,43);ink(t,3.5,'#c8503c');t.beginPath();t.moveTo(44,48);t.lineTo(52,56);ink(t,2.5,INK);},
  sky:t=>{t.beginPath();t.moveTo(44,56);t.quadraticCurveTo(46,44,57,43);t.quadraticCurveTo(55,54,44,56);fi(t,'#5fb08e',1.5);},
  weave:t=>{poly(t,[50,41,52.5,47.5,59,50,52.5,52.5,50,59,47.5,52.5,41,50,47.5,47.5]);fi(t,'#6a55b0',1.5);}};
for(const k in SETCOL){const col=SETCOL[k],mk=t=>{circ(t,50,50,10);fi(t,'#fbf8f0',2);SETMARK[k](t);};
  C['helm_'+k]=sticker(t=>{helmPaint(t,col);mk(t);});C['mail_'+k]=sticker(t=>{mailPaint(t,col);mk(t);});C['legs_'+k]=sticker(t=>{legPaint(t,col);mk(t);});}
const starPts=(cx,cy,R,r)=>{const a=[];for(let i=0;i<10;i++){const g=-Math.PI/2+i*Math.PI/5,d=i%2?r:R;a.push(cx+Math.cos(g)*d,cy+Math.sin(g)*d);}return a;};
const bowIcon=col=>sticker(t=>{for(const[w,c]of[[8.5,INK],[5,col]]){t.beginPath();t.moveTo(10,14);t.quadraticCurveTo(62,2,50,54);ink(t,w,c);}t.beginPath();t.moveTo(10,14);t.lineTo(50,54);ink(t,1.6,'#f4f0e6');t.save();t.translate(46,18);t.rotate(.785);rr(t,-5,-7,10,14,3);fi(t,'#6b4430',2);t.restore();});
const arrowIcon=el=>sticker(t=>{t.beginPath();t.moveTo(12,52);t.lineTo(46,18);ink(t,6,INK);t.beginPath();t.moveTo(12,52);t.lineTo(46,18);ink(t,3,'#c98f4f');poly(t,[56,8,50,26,38,14]);if(el==='pierce')poly(t,[60,4,52,28,36,12]);fi(t,el==='water'?'#5aa7e0':el==='ink'?'#6b4c8f':el==='ric'?'#7fd3f0':el==='pierce'?'#dfe3ec':el?'#f5a524':'#a9adb8',2);
  if(el===true){t.beginPath();t.moveTo(59,3);t.quadraticCurveTo(63,14,55,17);t.quadraticCurveTo(49,11,59,3);t.fillStyle='#ffe58a';t.fill();}
  else if(el==='water'){t.beginPath();t.moveTo(58,2);t.quadraticCurveTo(64,12,58,15);t.quadraticCurveTo(52,12,58,2);fi(t,'#8fcaf0',1.5);}else if(el==='ink'){circ(t,58,6,4);fi(t,'#3a2a5a',1.5);}else if(el==='ric'){t.beginPath();t.arc(54,16,11,-2.2,.6);ink(t,2.5,'#5aa7e0');}else if(el==='pierce'){t.beginPath();t.moveTo(40,24);t.lineTo(52,12);ink(t,1.5,'#fbf8f0');}poly(t,[12,52,5,44,16,42]);fi(t,'#d4483b',1.6);poly(t,[12,52,20,59,22,48]);fi(t,'#fbf8f0',1.6);});
C.bowW=bowIcon('#c98f4f');C.bowG=bowIcon('#f0c040');C.arrow=arrowIcon(false);C.farrow=arrowIcon(true);C.warrow=arrowIcon('water');C.iarrow=arrowIcon('ink');C.parrow=arrowIcon('pierce');C.rarrow=arrowIcon('ric');
// warhammers (heavy melee) and shields (off-hand, hold to block)
const warhammerIcon=col=>sticker(t=>{t.beginPath();t.moveTo(10,58);t.lineTo(38,26);ink(t,8,INK);t.beginPath();t.moveTo(10,58);t.lineTo(38,26);ink(t,4.5,'#9a6a3f');t.save();t.translate(41,21);t.rotate(.72);rr(t,-19,-12,38,24,5);fi(t,col);
  t.fillStyle=sh(col,.72);t.fillRect(-11,-11,4,22);t.fillRect(7,-11,4,22);t.fillStyle='rgba(255,255,255,.45)';t.fillRect(-16,-8,30,3);t.restore();});
const shieldIcon=(col,wood)=>sticker(t=>{const sp=(k)=>{t.beginPath();t.moveTo(12+k,11+k);t.quadraticCurveTo(32,3+k,52-k,11+k);t.lineTo(52-k,30);t.quadraticCurveTo(52-k,47-k*.5,32,58-k*1.3);t.quadraticCurveTo(12+k,47-k*.5,12+k,30);t.closePath();};
  sp(0);fi(t,col);if(wood){t.save();sp(0);t.clip();t.strokeStyle=sh(col,.7);t.lineWidth=1.6;for(const x of[22,32,42]){t.beginPath();t.moveTo(x,4);t.lineTo(x,60);t.stroke();}t.restore();}
  sp(5);ink(t,2,sh(col,.68));t.beginPath();t.ellipse(25,20,5,3,-.4,0,6.28);t.fillStyle='rgba(255,255,255,.45)';t.fill();circ(t,32,30,6);fi(t,wood?'#a9adb8':'#f1c04f',2);});
C.shwood=shieldIcon('#c98f4f',true);for(const m in METAL){C['ham'+m]=warhammerIcon(METAL[m]);C['sh'+m]=shieldIcon(METAL[m]);}
C.bubble=sticker(t=>{circ(t,32,34,20);fi(t,'#8fcaf0');t.beginPath();t.ellipse(25,26,6,4,-.6,0,6.28);t.fillStyle='rgba(255,255,255,.8)';t.fill();circ(t,44,44,3);t.fillStyle='rgba(255,255,255,.55)';t.fill();});
C.paper=sticker(t=>{poly(t,[14,8,40,8,50,18,50,56,14,56]);fi(t,'#fbf8f0');poly(t,[40,8,40,18,50,18]);fi(t,'#dcd3c2',2);t.strokeStyle='rgba(90,143,208,.5)';t.lineWidth=1.5;for(let y=26;y<52;y+=7){t.beginPath();t.moveTo(19,y);t.lineTo(45,y);t.stroke();}});
C.launch=sticker(t=>{t.save();t.translate(32,34);t.rotate(-.785);rr(t,-26,-8,46,16,6);fi(t,'#6f8fb0');rr(t,-20,6,10,16,3);fi(t,'#6b4430',2);t.fillStyle='rgba(255,255,255,.35)';t.fillRect(-20,-5,34,3);poly(t,[2,-16,26,-9,6,-5]);fi(t,'#fbf8f0',1.8);t.restore();});
C.fstar=sticker(t=>{circ(t,32,33,27);t.fillStyle='rgba(255,220,120,.35)';t.fill();poly(t,starPts(32,34,24,11));fi(t,'#f7d046',3);poly(t,starPts(29,31,10,4.5));t.fillStyle='#fff3c0';t.fill();});
C.mcrys=sticker(t=>{poly(t,starPts(32,34,25,12));fi(t,'#5a8fe0',3);poly(t,starPts(32,34,12,6));t.fillStyle='#a8c8ff';t.fill();circ(t,26,26,3);t.fillStyle='#fff';t.fill();});
C.mpot=sticker(t=>{rr(t,26,8,12,8,2);fi(t,'#c98f4f',2);rr(t,27,14,10,10,2);fi(t,'#dfeef2',2);t.beginPath();t.moveTo(27,22);t.lineTo(37,22);t.lineTo(50,44);t.quadraticCurveTo(52,56,40,56);t.lineTo(24,56);t.quadraticCurveTo(12,56,14,44);t.closePath();fi(t,'#dfeef2');t.beginPath();t.moveTo(18,40);t.lineTo(46,40);t.lineTo(49,46);t.quadraticCurveTo(50,54,40,54);t.lineTo(24,54);t.quadraticCurveTo(14,54,15,46);t.closePath();t.fillStyle='#4f7fd9';t.fill();t.fillStyle='rgba(255,255,255,.7)';t.fillRect(20,30,4,8);});
const tomeIcon=(col,em)=>sticker(t=>{rr(t,14,9,38,48,4);fi(t,'#f4f0e6');rr(t,10,6,36,48,4);fi(t,col);t.fillStyle='rgba(255,255,255,.2)';t.fillRect(14,9,4,42);em(t);});
C.tomeInk=tomeIcon('#5a3f7a',t=>{t.beginPath();t.moveTo(29,17);t.quadraticCurveTo(39,32,29,39);t.quadraticCurveTo(19,32,29,17);fi(t,'#2a2130',2);circ(t,26,31,2);t.fillStyle='#fff';t.fill();});
C.tomeCrane=tomeIcon('#b33a2f',t=>{poly(t,[16,36,27,22,30,33,41,26,32,40]);fi(t,'#fbf8f0',2);});
C.staff=sticker(t=>{t.beginPath();t.moveTo(10,56);t.lineTo(40,26);ink(t,8,INK);t.beginPath();t.moveTo(10,56);t.lineTo(40,26);ink(t,4.5,'#8a5a33');poly(t,starPts(45,19,16,7.5));fi(t,'#f7d046',2.5);circ(t,42,16,2.5);t.fillStyle='#fff';t.fill();});
C.inkball=sticker(t=>{circ(t,32,32,16);fi(t,'#5a3f7a',3);circ(t,26,26,5);t.fillStyle='rgba(255,255,255,.55)';t.fill();circ(t,45,43,5);fi(t,'#5a3f7a',2);});
C.crane=sticker(t=>{poly(t,[8,40,30,36,57,24,36,41,30,48]);fi(t,'#fbf8f0',2);poly(t,[22,38,33,10,38,38]);fi(t,'#f4f0e6',2);poly(t,[30,37,43,15,40,38]);fi(t,'#e8636a',1.8);});
// canopies (4x4 regions)
function drawCanopy(t,cols){const cl=[[128,158,66],[66,170,50],[190,170,50],[92,112,56],[166,108,56],[128,72,56],[128,128,62]];
  for(const[x,y,r]of cl){circ(t,x+5,y+9,r);t.fillStyle=cols[0];t.fill();}
  for(const[x,y,r]of cl){circ(t,x,y,r*.94);fi(t,cols[1],3);}
  for(const[x,y,r]of cl){t.beginPath();t.arc(x-r*.18,y-r*.2,r*.6,Math.PI*1.05,Math.PI*1.65);ink(t,5,cols[2]);}
  t.strokeStyle='rgba(30,60,20,.35)';t.lineWidth=2;for(let i=0;i<24;i++){const x=rand(40,216),y=rand(40,210);t.beginPath();t.moveTo(x,y);t.lineTo(x+rand(-6,6),y+6);t.stroke();}}
stickerAt(768,768,256,256,t=>drawCanopy(t,['#3f7a2b','#5aa83c','#86d15f']),4);
stickerAt(512,768,256,256,t=>drawCanopy(t,['#2f6a3a','#3f8f4f','#6cc07a']),4);
stickerAt(256,768,256,256,t=>{for(const[y,w]of[[70,70],[120,96],[172,120]]){poly(t,[128,y-58,128+w/2+4,y+8,128-w/2-4,y+8]);t.fillStyle='#2e5a4a';t.fill();}for(const[y,w]of[[66,62],[116,88],[168,112]]){poly(t,[128,y-58,128+w/2,y,128-w/2,y]);fi(t,'#3f7a5f',3);t.beginPath();t.moveTo(128,y-58);t.lineTo(128,y);ink(t,2,'rgba(20,40,30,.35)');t.beginPath();t.moveTo(128-w/2+8,y-3);t.quadraticCurveTo(128,y-12,128+w/2-8,y-3);ink(t,6,'#f6f9fb');}},4);
C.canopy=[[768,768],[512,768],[256,768]];
// seasonal canopies for forest trees, in the free band at the bottom of the atlas (see seasons.js canopyCell)
stickerAt(0,1792,256,256,t=>drawCanopy(t,['#b8561f','#e0823d','#f6b85a']),4);
stickerAt(256,1792,256,256,t=>drawCanopy(t,['#8a2f22','#c9483a','#f1a04f']),4);
stickerAt(512,1792,256,256,t=>{drawCanopy(t,['#8e9faf','#d3dfe8','#fbf8f0']);for(const[x,y,r]of[[128,158,66],[66,170,50],[190,170,50],[128,72,56]]){t.beginPath();t.arc(x,y,r*.9,Math.PI*1.15,Math.PI*1.85);ink(t,9,'#fbf8f0');}},4);
stickerAt(768,1792,256,256,t=>drawCanopy(t,['#b85a86','#f3a6c4','#ffe1ec']),4);
C.canopyFall=[[0,1792],[256,1792]];C.canopyWinter=[512,1792];C.canopySpring=[768,1792];
// ---- biome blocks, liquids, new items
C.snow=blockCell('#eef3f7',speck(['#d6e4ee','#ffffff','#c7d9e6'],30,.8,2));
C.snowT=blockCell('#f6f9fb',c=>{c.lineWidth=2;for(let i=0;i<14;i++){const x=rand(4,60),y=rand(4,60);c.strokeStyle='#d6e4ee';c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();}});
C.snowF=blockCell('#9a6a3f',c=>{dirtDeco(c);c.beginPath();c.moveTo(0,0);c.lineTo(64,0);c.lineTo(64,16);for(let x=64;x>=0;x-=8){c.quadraticCurveTo(x-4,24,x-8,16);}c.closePath();c.fillStyle='#f6f9fb';c.fill();ink(c,2.2,'#9fb6c6');});
C.ice=blockCell('#bfe6f5',c=>{c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=3;c.beginPath();c.moveTo(12,50);c.lineTo(30,14);c.moveTo(30,52);c.lineTo(46,22);c.stroke();c.strokeStyle='rgba(90,150,190,.4)';c.lineWidth=1.5;c.beginPath();c.moveTo(8,30);c.lineTo(24,36);c.lineTo(40,28);c.stroke();});
C.ash=blockCell('#5a4a4f',c=>{speck(['#3e3236','#6e5c60','#2e2528'],30,1,2.6)(c);c.strokeStyle='rgba(255,138,61,.35)';c.lineWidth=1.5;c.beginPath();c.moveTo(10,44);c.lineTo(22,38);c.lineTo(30,46);c.stroke();});
C.inkst=blockCell('#3d3350',c=>{c.lineWidth=2;for(let i=0;i<18;i++){const x=rand(0,64),y=rand(0,64);c.strokeStyle=Math.random()<.5?'rgba(160,130,220,.18)':'rgba(10,5,20,.2)';c.beginPath();c.moveTo(x,y);c.lineTo(x+6,y+4);c.stroke();}});
C.frostOre=cellN++;C.inkOre=cellN++;C.emberOre=cellN++;C.foilOre=cellN++;
// ores: every ore has its own nugget shape so they read without color; ORECOL holds one palette per color-vision mode (SET.cb)
const nug={
  round:(c,x,y,r)=>{c.beginPath();c.ellipse(x,y,r,r*.85,rand(0,3),0,6.28);},
  square:(c,x,y,r)=>{c.save();c.translate(x,y);c.rotate(rand(-.4,.4));rr(c,-r*.85,-r*.85,r*1.7,r*1.7,1.5);c.restore();},
  star:(c,x,y,r)=>{r*=1.25;const s=[];for(let k=0;k<8;k++){const a=k*Math.PI/4,q=k%2?r*.38:r;s.push(x+Math.cos(a)*q,y+Math.sin(a)*q);}poly(c,s);},
  shard:(c,x,y,r)=>{const a=rand(-.5,.5);c.save();c.translate(x,y);c.rotate(a);poly(c,[0,-r*1.5,r*.5,0,0,r*1.5,-r*.5,0]);c.restore();},
  drop:(c,x,y,r)=>{c.beginPath();c.moveTo(x,y-r*1.4);c.quadraticCurveTo(x+r*1.1,y+r*.1,x,y+r);c.quadraticCurveTo(x-r*1.1,y+r*.1,x,y-r*1.4);c.closePath();},
  tri:(c,x,y,r)=>{r*=1.15;poly(c,[x,y-r,x+r*.95,y+r*.7,x-r*.95,y+r*.7]);},
  hex:(c,x,y,r)=>{const s=[];for(let k=0;k<6;k++){const a=k*Math.PI/3+.5;s.push(x+Math.cos(a)*r*1.1,y+Math.sin(a)*r*1.1);}poly(c,s);c.moveTo(x-r*.6,y);c.lineTo(x+r*.6,y);},
};
export const ORECOL={
  off: {copper:'#e0823d',iron:'#d7c0a8',gold:'#f2c14e',frostOre:'#aee0f2',inkOre:'#a784e0',emberOre:'#ff8a3d',foilOre:'#f1e4ff'},
  deut:{copper:'#d55e00',iron:'#f4f1ea',gold:'#f0e442',frostOre:'#56b4e9',inkOre:'#cc79a7',emberOre:'#e69f00',foilOre:'#ffffff'},
  prot:{copper:'#c85a1a',iron:'#f4f1ea',gold:'#f0e442',frostOre:'#56b4e9',inkOre:'#d58cc0',emberOre:'#ffb000',foilOre:'#ffffff'},
  trit:{copper:'#d4483b',iron:'#f4f1ea',gold:'#ff9fbf',frostOre:'#009e8a',inkOre:'#a784e0',emberOre:'#ff5a3d',foilOre:'#ffffff'},
};
export const ORES=[['copper','#8d8f9a',stoneDeco,'round'],['iron','#8d8f9a',stoneDeco,'square'],['gold','#8d8f9a',stoneDeco,'star'],
  ['frostOre','#8d8f9a',stoneDeco,'shard'],['inkOre','#3d3350',()=>{},'drop'],['emberOre','#5a4a4f',speck(['#3e3236','#6e5c60'],20),'tri'],['foilOre','#4b4e5c',stoneDeco,'hex']];
export function drawOres(){const pal=ORECOL[SET.cb]||ORECOL.off;for(const[k,base,deco,shape]of ORES){const col=pal[k];blockCell(base,c=>{deco(c);for(let i=0;i<5;i++){const x=10+(i%3)*20+rand(-3,5),y=i<3?rand(10,26):rand(36,52),r=rand(4.5,6.5);nug[shape](c,x,y,r);fi(c,col,2);c.fillStyle='rgba(255,255,255,.6)';circ(c,x-1.5,y-1.5,1.4);c.fill();}},true,C[k]);}}
drawOres();
const liqCell=(col,col2,top)=>sticker(t=>{t.fillStyle=col;if(top){t.beginPath();t.moveTo(0,64);t.lineTo(0,14);for(let x=0;x<=64;x+=16)t.quadraticCurveTo(x+8,6,x+16,14);t.lineTo(64,64);t.closePath();t.fill();t.beginPath();t.moveTo(0,14);for(let x=0;x<=64;x+=16)t.quadraticCurveTo(x+8,6,x+16,14);ink(t,2.5,col2);}else t.fillRect(0,0,64,64);
  t.strokeStyle=col2;t.globalAlpha=.4;t.lineWidth=2;for(let y=top?30:10;y<64;y+=18){t.beginPath();t.moveTo(6,y);t.quadraticCurveTo(20,y-4,32,y);t.quadraticCurveTo(44,y+4,58,y);t.stroke();}t.globalAlpha=1;},0);
C.inkF=liqCell('#3a2a5a','#8a78b0',false);C.inkT=liqCell('#3a2a5a','#a894d0',true);C.lavaF=liqCell('#ff7a2d','#ffd66b',false);C.lavaT=liqCell('#ff7a2d','#ffe9a0',true);
C.rope=sticker(t=>{t.strokeStyle='#8a6a42';t.lineWidth=7;t.beginPath();t.moveTo(32,0);t.lineTo(32,64);t.stroke();t.strokeStyle='#c9a574';t.lineWidth=4;t.beginPath();t.moveTo(32,0);t.lineTo(32,64);t.stroke();t.strokeStyle='#8a6a42';t.lineWidth=1.6;for(let y=2;y<64;y+=8){t.beginPath();t.moveTo(29,y);t.lineTo(35,y+5);t.stroke();}},0);
C.bloom=sticker(t=>{t.beginPath();t.moveTo(32,62);t.lineTo(32,40);ink(t,3,'#6f8fb0');for(let i=0;i<6;i++){t.save();t.translate(32,32);t.rotate(i/6*Math.PI*2);poly(t,[0,0,-4,-12,0,-16,4,-12]);fi(t,'#e6f1f7',1.6);t.restore();}circ(t,32,32,3.5);fi(t,'#aee0f2',1.5);},2.5);
C.pickFr=pickIcon('#aee0f2');C.pickIk=pickIcon('#8a6ac0');C.pickEm=pickIcon('#ff8a3d');
C.swFr=swordIcon('#cfeefa',1);C.swIk=swordIcon('#8a6ac0',1);C.swEm=swordIcon('#ff9a4a',1);
C.barFr=barIcon('#bfe6f5');C.barIk=barIcon('#8a6ac0');C.barEm=barIcon('#ff8a3d');
// world awakening: Foilite, the ore tier that seeds itself after The Unfolded falls
C.pickFo=pickIcon('#e4e7f4');C.swFo=swordIcon('#eef0fa',1);C.barFo=barIcon('#dfe2ee');
C.plume=sticker(t=>{t.beginPath();t.moveTo(10,54);t.quadraticCurveTo(20,20,54,8);t.quadraticCurveTo(44,40,10,54);fi(t,'#f4f0e6');t.beginPath();t.moveTo(10,54);t.quadraticCurveTo(28,30,52,10);ink(t,1.8,'#9fb6c6');for(let k=0;k<5;k++){const x=20+k*6,y=42-k*7;t.beginPath();t.moveTo(x,y);t.lineTo(x+6,y+4);ink(t,1.2,'#b9cfe0');}});
C.inkheart=sticker(t=>{t.beginPath();t.moveTo(32,56);t.bezierCurveTo(6,40,6,14,22,12);t.bezierCurveTo(29,11,32,18,32,22);t.bezierCurveTo(32,18,35,11,42,12);t.bezierCurveTo(58,14,58,40,32,56);fi(t,'#5a3f7a',3);t.beginPath();t.ellipse(22,22,5,3,-.7,0,6.28);t.fillStyle='rgba(200,180,255,.7)';t.fill();circ(t,38,40,4);fi(t,'#3a2a5a',1.5);});
C.cinder=sticker(t=>{circ(t,32,34,24);t.fillStyle='rgba(255,140,60,.35)';t.fill();poly(t,[18,46,14,30,26,16,42,14,52,28,48,46,32,52]);fi(t,'#3a2a24');t.strokeStyle='#ff8a3d';t.lineWidth=2.5;t.beginPath();t.moveTo(22,40);t.lineTo(30,30);t.lineTo(40,34);t.lineTo(44,22);t.stroke();circ(t,30,30,3);t.fillStyle='#ffd66b';t.fill();});
C.charm=sticker(t=>{t.beginPath();t.moveTo(32,4);t.lineTo(32,20);ink(t,2,'#d4483b');poly(t,[8,40,30,34,56,20,36,42,30,52]);fi(t,'#e6f1f7',2);poly(t,[22,38,33,12,38,38]);fi(t,'#bfe6f5',2);circ(t,32,24,3);fi(t,'#d4483b',1.5);});
C.inkwell=sticker(t=>{rr(t,14,26,36,30,8);fi(t,'#3a2a5a');rr(t,24,16,16,12,3);fi(t,'#5a3f7a',2);t.beginPath();t.moveTo(40,4);t.lineTo(30,22);ink(t,3,'#f4f0e6');t.fillStyle='rgba(200,180,255,.5)';t.fillRect(18,32,4,16);});
C.bookmark=sticker(t=>{poly(t,[22,4,42,4,42,58,32,48,22,58]);fi(t,'#8a2a1a');poly(t,[22,4,42,4,42,14,22,14]);fi(t,'#3a2a24',2);t.beginPath();t.moveTo(30,12);t.quadraticCurveTo(26,2,32,0);t.quadraticCurveTo(38,4,34,12);t.fillStyle='#ff8a3d';t.fill();});
C.hook=sticker(t=>{t.beginPath();t.moveTo(8,56);t.lineTo(30,34);ink(t,5,INK);t.beginPath();t.moveTo(8,56);t.lineTo(30,34);ink(t,2.5,'#c9a574');t.save();t.translate(38,26);t.rotate(-.785);for(const s of[-1,1]){t.beginPath();t.moveTo(0,0);t.quadraticCurveTo(s*14,-4,s*12,-18);ink(t,7,INK);t.beginPath();t.moveTo(0,0);t.quadraticCurveTo(s*14,-4,s*12,-18);ink(t,4,'#a9adb8');}t.beginPath();t.moveTo(0,4);t.lineTo(0,-20);ink(t,7,INK);t.beginPath();t.moveTo(0,4);t.lineTo(0,-20);ink(t,4,'#c9ccd4');t.restore();});
C.ropeIt=sticker(t=>{for(let r=20;r>6;r-=5){circ(t,32,34,r);ink(t,6,'#8a6a42');circ(t,32,34,r);ink(t,3.5,'#c9a574');}});
C.inksac=sticker(t=>{t.beginPath();t.moveTo(32,8);t.bezierCurveTo(56,14,54,52,32,56);t.bezierCurveTo(10,52,8,14,32,8);fi(t,'#6b4c8f');circ(t,24,24,5);t.fillStyle='rgba(255,255,255,.5)';t.fill();});
C.fireball=sticker(t=>{t.beginPath();t.moveTo(32,6);t.bezierCurveTo(52,20,54,40,32,56);t.bezierCurveTo(10,40,12,20,32,6);fi(t,'#ff7a2d');t.beginPath();t.moveTo(32,20);t.bezierCurveTo(44,30,42,44,32,50);t.bezierCurveTo(22,44,20,30,32,20);t.fillStyle='#ffd66b';t.fill();},2);
C.bowFr=bowIcon('#aee0f2');C.bowMoon=bowIcon('#b06ad0');
C.tomeMoon=tomeIcon('#2a1a4a',t=>{t.beginPath();t.arc(29,30,10,0,6.283);t.arc(33,26,9,0,6.283,true);t.fillStyle='#e0b0ff';t.fill();});
C.launchMoon=sticker(t=>{t.save();t.translate(32,34);t.rotate(-.785);rr(t,-26,-8,46,16,6);fi(t,'#6a4a9a');rr(t,-20,6,10,16,3);fi(t,'#3a2a24',2);t.fillStyle='rgba(255,255,255,.35)';t.fillRect(-20,-5,34,3);poly(t,[2,-16,26,-9,6,-5]);fi(t,'#fbf8f0',1.8);poly(t,[-10,-14,10,-10,-6,-6]);fi(t,'#e0b0ff',1.6);t.restore();});
C.crescent=sticker(t=>{t.beginPath();t.arc(30,32,20,0,6.283);t.arc(40,26,18,0,6.283,true);fi(t,'#e0b0ff',3);},2);C.tomeTide=tomeIcon('#2f5f8a',t=>{for(let k=0;k<2;k++){t.beginPath();t.moveTo(16,28+k*10);t.quadraticCurveTo(22,22+k*10,28,28+k*10);t.quadraticCurveTo(34,34+k*10,40,28+k*10);ink(t,3,'#bfe6f5');}});
C.staffEm=sticker(t=>{t.beginPath();t.moveTo(10,56);t.lineTo(38,28);ink(t,8,INK);t.beginPath();t.moveTo(10,56);t.lineTo(38,28);ink(t,4.5,'#3a2a24');t.beginPath();t.moveTo(46,6);t.bezierCurveTo(60,18,56,34,44,34);t.bezierCurveTo(32,34,32,18,46,6);fi(t,'#ff7a2d');circ(t,44,26,4);t.fillStyle='#ffd66b';t.fill();});
// ---- furniture & decor
const paintCell=scene=>sticker(t=>{rr(t,6,8,52,46,3);fi(t,'#c9a24a',3);rr(t,11,13,42,36,2);t.save();rr(t,11,13,42,36,2);t.clip();scene(t);t.restore();rr(t,11,13,42,36,2);ink(t,2);t.fillStyle='rgba(255,255,255,.35)';t.fillRect(9,10,20,2);},2.5);
C.paint1=paintCell(t=>{t.fillStyle='#1f2a55';t.fillRect(0,0,64,64);t.beginPath();t.arc(40,28,11,0,6.283);t.arc(45,24,10,0,6.283,true);t.fillStyle='#f4f0e6';t.fill();t.fillStyle='#f7d046';for(const[x,y]of[[18,20],[24,34],[16,40],[30,18]]){t.fillRect(x,y,2,2);}});
C.paint2=paintCell(t=>{const g=t.createLinearGradient(0,13,0,49);g.addColorStop(0,'#f4a86a');g.addColorStop(1,'#d4483b');t.fillStyle=g;t.fillRect(0,0,64,64);poly(t,[16,36,26,33,40,26,30,36,26,40]);t.fillStyle='#2a2130';t.fill();poly(t,[24,34,30,22,32,34]);t.fill();t.fillStyle='#7a2a2a';t.fillRect(11,42,42,8);});
C.paint3=paintCell(t=>{t.fillStyle='#8fd3e6';t.fillRect(0,0,64,64);circ(t,44,22,5);t.fillStyle='#f7d046';t.fill();t.beginPath();t.moveTo(11,50);t.quadraticCurveTo(26,28,40,40);t.quadraticCurveTo(48,34,54,38);t.lineTo(54,50);t.closePath();t.fillStyle='#6dbb4a';t.fill();t.beginPath();t.moveTo(11,50);t.quadraticCurveTo(30,38,54,46);t.lineTo(54,50);t.closePath();t.fillStyle='#4f9a36';t.fill();});
C.paint4=paintCell(t=>{t.fillStyle='#5a4a6a';t.fillRect(0,0,64,64);t.fillStyle='#8a5a33';t.fillRect(11,40,42,10);rr(t,20,30,8,10,1);t.fillStyle='#f1e5cc';t.fill();t.beginPath();t.arc(24,30,7,Math.PI,0);t.fillStyle='#e0823d';t.fill();rr(t,34,30,10,10,2);t.fillStyle='#bfe6f0';t.fill();});
const bannerCell=(col,em)=>sticker(t=>{rr(t,8,4,48,6,3);fi(t,'#8a5a33',2);poly(t,[14,10,50,10,50,56,32,46,14,56]);fi(t,col,2.5);t.fillStyle='rgba(255,255,255,.2)';t.fillRect(16,12,6,36);em(t);},2);
C.banR=bannerCell('#d4483b',t=>{poly(t,starPts(32,28,10,4.5));fi(t,'#f7d046',1.8);});
C.banB=bannerCell('#3f6fa8',t=>{poly(t,[22,32,30,26,32,32,40,24,34,36]);fi(t,'#f4f0e6',1.8);});
C.banG=bannerCell('#4f8a4f',t=>{t.beginPath();t.moveTo(32,18);t.quadraticCurveTo(44,28,32,40);t.quadraticCurveTo(20,28,32,18);fi(t,'#c9e8a0',1.8);});
C.plant=sticker(t=>{t.beginPath();t.moveTo(32,6);t.lineTo(32,16);ink(t,2,'#6b4430');rr(t,18,16,28,34,12);fi(t,'#e8636a');rr(t,22,14,20,5,2);fi(t,'#b33a2f',2);t.fillStyle='rgba(255,230,150,.6)';rr(t,24,22,16,22,8);t.fill();t.strokeStyle='rgba(120,30,30,.4)';t.lineWidth=1.5;for(const y of[26,32,38]){t.beginPath();t.moveTo(20,y);t.lineTo(44,y);t.stroke();}rr(t,26,50,12,5,2);fi(t,'#b33a2f',2);},2.5);
C.shelf=sticker(t=>{rr(t,6,4,52,56,3);fi(t,'#8a5a33');for(const y of[6,24,42]){t.fillStyle='#5a3a22';t.fillRect(10,y+15,44,3);let x=11;const cols=['#d4483b','#3f6fa8','#f1c04f','#4f8a4f','#8a5fc0','#e0823d'];while(x<50){const w=rand(4,7);t.fillStyle=pick(cols);t.fillRect(x,y+rand(2,5),w,14);t.strokeStyle=INK;t.lineWidth=1;t.strokeRect(x,y+rand(2,5),w,14-1);x+=w+1;}}});
C.candle=sticker(t=>{rr(t,20,50,24,6,3);fi(t,'#c9a24a',2);rr(t,26,30,12,22,3);fi(t,'#f4f0e6',2);t.beginPath();t.moveTo(32,14);t.bezierCurveTo(38,22,36,30,32,30);t.bezierCurveTo(28,30,26,22,32,14);fi(t,'#f5a524',1.6);circ(t,32,26,2);t.fillStyle='#ffe58a';t.fill();},2.5);
C.pot=sticker(t=>{for(const[a,l]of[[-.5,26],[0,32],[.5,26],[-.9,18],[.9,18]]){t.save();t.translate(32,40);t.rotate(a);t.beginPath();t.ellipse(0,-l/2,5,l/2,0,0,6.28);fi(t,'#5aa83c',1.8);t.restore();}poly(t,[18,40,46,40,42,60,22,60]);fi(t,'#c0633a');rr(t,16,38,32,6,2);fi(t,'#a8522e',2);},2.5);
C.clock=sticker(t=>{rr(t,18,4,28,56,4);fi(t,'#8a5a33');circ(t,32,20,10);fi(t,'#f4f0e6',2);t.beginPath();t.moveTo(32,20);t.lineTo(32,13);t.moveTo(32,20);t.lineTo(37,22);ink(t,1.8);rr(t,26,34,12,20,2);fi(t,'#3a2530',2);circ(t,32,48,3.5);fi(t,'#f1c04f',1.5);});
C.armchair=sticker(t=>{rr(t,10,16,44,30,10);fi(t,'#b33a2f');rr(t,6,30,14,22,6);fi(t,'#d4483b');rr(t,44,30,14,22,6);fi(t,'#d4483b');rr(t,16,36,32,14,5);fi(t,'#e8636a');rr(t,10,50,6,10,2);fi(t,'#6b4430',2);rr(t,48,50,6,10,2);fi(t,'#6b4430',2);});
C.wRed=blockCell('#a8483f',c=>{c.fillStyle='rgba(255,220,200,.18)';for(let x=4;x<64;x+=16)c.fillRect(x,0,6,64);},false);
C.wBlue=blockCell('#4a6a9a',c=>{c.strokeStyle='rgba(220,235,255,.25)';c.lineWidth=2;for(let k=-64;k<64;k+=16){c.beginPath();c.moveTo(k,0);c.lineTo(k+64,64);c.moveTo(k+64,0);c.lineTo(k,64);c.stroke();}},false);
C.wGreen=blockCell('#5a8a5a',c=>{c.fillStyle='rgba(230,255,220,.25)';for(let y=8;y<64;y+=16)for(let x=8;x<64;x+=16){circ(c,x+((y/16)%2)*8,y,3);c.fill();}},false);
C.wYellow=blockCell('#c9a24a',c=>{c.fillStyle='rgba(255,250,220,.22)';for(let y=0;y<64;y+=16)for(let x=((y/16)%2)*16;x<64;x+=32)c.fillRect(x,y,16,16);},false);
C.kite=sticker(t=>{poly(t,[32,4,54,26,32,58,10,26]);fi(t,'#e8636a');t.beginPath();t.moveTo(32,4);t.lineTo(32,58);t.moveTo(10,26);t.lineTo(54,26);ink(t,1.6,'rgba(42,33,48,.5)');poly(t,[32,40,46,50,30,54]);fi(t,'#f1c04f',1.6);});
C.beacon=sticker(t=>{circ(t,32,32,24);fi(t,'#a9adb8');circ(t,32,32,15);ink(t,2,'#6c6e79');circ(t,32,32,9);t.fillStyle='rgba(255,210,110,.6)';t.fill();circ(t,32,32,6);fi(t,'#ffe58a',2);});
C.quilt=sticker(t=>{circ(t,32,32,24);fi(t,'#8a7ab0');t.setLineDash([4,3]);circ(t,32,32,17);ink(t,2,'#f4f0e6');t.setLineDash([]);circ(t,32,32,7);fi(t,'#a9adb8',2);});
C.toolbelt=sticker(t=>{rr(t,6,26,52,12,4);fi(t,'#8a5a33');rr(t,26,24,12,16,3);fi(t,'#c9a24a',2);rr(t,10,36,12,16,3);fi(t,'#6b4430',2);rr(t,42,36,12,16,3);fi(t,'#6b4430',2);t.beginPath();t.moveTo(14,34);t.lineTo(12,14);ink(t,3,'#a9adb8');});
C.magnet=sticker(t=>{t.beginPath();t.arc(32,30,18,Math.PI,0);t.lineTo(50,48);t.lineTo(40,48);t.lineTo(40,30);t.arc(32,30,8,0,Math.PI,true);t.lineTo(24,48);t.lineTo(14,48);t.closePath();fi(t,'#d4483b');t.fillStyle='#e9e2d4';t.fillRect(14,42,10,6);t.fillRect(40,42,10,6);});
// ---- badges
const medal=(col,em)=>sticker(t=>{poly(t,[22,4,28,18,20,18]);fi(t,'#d4483b',1.6);poly(t,[42,4,36,18,44,18]);fi(t,'#3f6fa8',1.6);circ(t,32,38,22);fi(t,'#c9a24a',3);circ(t,32,38,17);fi(t,col,2);t.save();t.translate(32,38);em(t);t.restore();},2.5);
const eHeart=(c='#fbf8f0')=>t=>{t.beginPath();t.moveTo(0,9);t.bezierCurveTo(-12,0,-10,-10,-4,-10);t.bezierCurveTo(-1,-10,0,-7,0,-5);t.bezierCurveTo(0,-7,1,-10,4,-10);t.bezierCurveTo(10,-10,12,0,0,9);t.fillStyle=c;t.fill();};
const eStar=c=>t=>{poly(t,starPts(0,1,11,5));t.fillStyle=c||'#fbf8f0';t.fill();};
C.bStomp=medal('#8a5a33',t=>{rr(t,-8,-10,10,14,3);t.fillStyle='#fbf8f0';t.fill();rr(t,-9,2,18,7,3);t.fill();});
C.bDip=medal('#e0506b',t=>{rr(t,-6,-4,12,13,4);t.fillStyle='#fbf8f0';t.fill();t.fillRect(-2,-10,4,6);circ(t,9,-7,3);t.fill();});
C.bNice=medal('#f1c04f',eStar('#fff8e4'));
C.bPower=medal('#d4483b',t=>{poly(t,[0,-11,9,0,3,0,3,10,-3,10,-3,0,-9,0]);t.fillStyle='#fbf8f0';t.fill();});
C.bDefend=medal('#3f6fa8',t=>{poly(t,[-9,-9,9,-9,8,3,0,11,-8,3]);t.fillStyle='#fbf8f0';t.fill();});
C.bHeartF=medal('#e8636a',eHeart());
C.bFlowerF=medal('#4f7fd9',t=>{for(let i=0;i<5;i++){const a=i/5*6.283;circ(t,Math.cos(a)*6,Math.sin(a)*6,4.5);t.fillStyle='#fbf8f0';t.fill();}circ(t,0,0,3.5);t.fillStyle='#f1c04f';t.fill();});
C.bMoney=medal('#4f9d52',t=>{circ(t,0,0,9);t.fillStyle='#f1c04f';t.fill();circ(t,0,0,5);t.strokeStyle='#b88a1e';t.lineWidth=2;t.stroke();});
C.bQuick=medal('#2f7f86',t=>{t.beginPath();t.arc(0,0,8,.3,5.5);t.strokeStyle='#fbf8f0';t.lineWidth=3.5;t.stroke();poly(t,[8,-10,12,-2,3,-3]);t.fillStyle='#fbf8f0';t.fill();});
C.bHappy=medal('#d4483b',t=>{eHeart('#fbf8f0')(t);circ(t,-3,-3,1.2);t.fillStyle=INK;t.fill();circ(t,3,-3,1.2);t.fill();t.beginPath();t.arc(0,0,3,.3,2.8);t.strokeStyle=INK;t.lineWidth=1.3;t.stroke();});
C.bClose=medal('#8a5fc0',t=>{rr(t,-2.5,-11,5,14,2);t.fillStyle='#fbf8f0';t.fill();circ(t,0,8,3);t.fill();});
C.bFeather=medal('#6fa8c8',t=>{t.beginPath();t.moveTo(-8,10);t.quadraticCurveTo(-4,-6,10,-11);t.quadraticCurveTo(6,4,-8,10);t.fillStyle='#fbf8f0';t.fill();});
C.bLast=medal('#b33a2f',t=>{t.beginPath();t.moveTo(0,-12);t.bezierCurveTo(10,-2,8,10,0,10);t.bezierCurveTo(-8,10,-10,-2,0,-12);t.fillStyle='#ffd66b';t.fill();});
C.bLure=medal('#2f7f86',t=>{poly(t,[-10,0,-14,-6,-14,6]);t.fillStyle='#fbf8f0';t.fill();t.beginPath();t.ellipse(0,0,10,6,0,0,6.28);t.fill();circ(t,5,-1,1.4);t.fillStyle=INK;t.fill();});
C.bSpike=medal('#6c6e79',t=>{poly(t,[-10,8,-6,-6,-2,8,2,-6,6,8,10,-6,10,10,-10,10]);t.fillStyle='#fbf8f0';t.fill();});
C.bpUp=sticker(t=>{circ(t,32,32,24);fi(t,'#2f7f86',3);poly(t,starPts(32,34,15,7));fi(t,'#f1c04f',2);});
C.hpHeart=sticker(t=>{t.save();t.translate(32,32);t.scale(1.6,1.6);eHeart('#e0506b')(t);t.restore();},2);
C.mpStar=sticker(t=>{poly(t,starPts(32,34,18,8));fi(t,'#5a8fe0',2.5);},2);
// ---- farming & alchemy
export const HERBCOL=['#f7d046','#9fd4f0','#a784e0','#ff7a2d','#e0b04a'];
C.crops=HERBCOL.map((col,ty)=>[0,1,2].map(st=>sticker(t=>{const h=[16,30,44][st];
  if(ty===4){for(const dx of[-10,0,10]){t.beginPath();t.moveTo(32+dx,62);t.quadraticCurveTo(32+dx*1.3,62-h*.6,32+dx*1.5,62-h);ink(t,3,st===2?'#c9a24a':'#6dbb4a');if(st===2){t.beginPath();t.ellipse(32+dx*1.5,62-h-4,3.5,8,0,0,6.28);fi(t,'#e0b04a',1.5);}}return;}
  t.beginPath();t.moveTo(32,62);t.lineTo(32,62-h);ink(t,3,'#3f7a2b');
  for(let k=0;k<st+1;k++){const y=58-k*12;for(const s2 of[-1,1]){t.beginPath();t.ellipse(32+s2*7,y,7,3.5,s2*.5,0,6.28);fi(t,ty===1?'#8fc8d8':ty===3?'#8a5a3a':'#5aa83c',1.5);}}
  if(st===2){const y=62-h;if(ty===0){for(let i=0;i<6;i++){const a=i/6*6.28;circ(t,32+Math.cos(a)*7,y+Math.sin(a)*7,4.5);fi(t,col,1.5);}circ(t,32,y,4);fi(t,'#e0823d',1.5);}
    else if(ty===1){for(let i=0;i<3;i++){t.save();t.translate(32,y);t.rotate(-.8+i*.8);t.beginPath();t.ellipse(0,-7,4,8,0,0,6.28);fi(t,col,1.5);t.restore();}}
    else if(ty===2){t.beginPath();t.ellipse(32,y,4,10,0,0,6.28);fi(t,col,1.5);t.beginPath();t.moveTo(32,y-10);t.lineTo(32,y-16);ink(t,2,'#5a3f7a');}
    else{t.beginPath();t.moveTo(32,y-14);t.bezierCurveTo(44,y-4,40,y+6,32,y+6);t.bezierCurveTo(24,y+6,20,y-4,32,y-14);fi(t,col,1.5);circ(t,32,y,3);t.fillStyle='#ffd66b';t.fill();}}},2)));
const herbIcon=(ty)=>sticker(t=>{t.drawImage(atlas,...cellXY(C.crops[ty][2]),64,64,0,0,64,64);},0);
C.herbs=[0,1,2,3,4].map(herbIcon);
C.seeds=HERBCOL.map(col=>sticker(t=>{rr(t,14,10,36,46,3);fi(t,'#e9dcc0');poly(t,[14,10,50,10,46,18,18,18]);fi(t,'#d6c4a0',2);circ(t,32,36,10);fi(t,col,2);for(const[x,y]of[[22,50],[40,48],[30,52]]){t.beginPath();t.ellipse(x,y,2,3,0,0,6.28);t.fillStyle='#8a5a33';t.fill();}}));
// rare crops (moon lily, thunderroot, sunfruit, ghost mushroom): three growth stages each, drawn on the T.RARE tile
export const RARECOL=['#efe6ff','#ffd84a','#ff9a2d','#bfe6ef'];
C.rare=RARECOL.map((col,ty)=>[0,1,2].map(st=>sticker(t=>{const h=[14,28,42][st];
  if(ty===3){const caps=[[32,st===0?10:st===1?20:30,st===0?7:st===1?11:14]].concat(st?[[18,st===1?9:14,st===1?6:8]]:[]).concat(st===2?[[47,11,7]]:[]);
    for(const[x,hh,r]of caps){rr(t,x-r*.28,62-hh,r*.56,hh,2);fi(t,'#e6f4f6',2);t.beginPath();t.ellipse(x,62-hh,r,r*.62,0,Math.PI,0);t.closePath();fi(t,col,2);
      if(st===2){circ(t,x-r*.35,62-hh-r*.25,1.8);t.fillStyle='#fbffff';t.fill();circ(t,x+r*.3,62-hh-r*.35,1.4);t.fill();}}
    if(st===2)for(const[x,y]of[[12,22],[52,26],[26,12]]){circ(t,x,y,2.2);t.fillStyle='rgba(214,248,255,.85)';t.fill();}return;}
  if(ty===1){t.beginPath();t.moveTo(32,62);for(let k=1;k<=4;k++)t.lineTo(32+(k%2?5:-5),62-h*k/4);ink(t,3,'#5b6b2e');
    for(let k=0;k<st+1;k++){const y=56-k*11;poly(t,[32,y,44,y-6,38,y-4,46,y-11,34,y-3]);fi(t,'#8fb04a',1.5);}
    t.beginPath();t.ellipse(32,60,st===2?9:6,5,0,0,6.28);fi(t,'#7a4a8a',2);
    if(st===2){const y=62-h;poly(t,[36,y-14,26,y+1,32,y+1,27,y+13,40,y-3,34,y-3]);fi(t,col,2);}return;}
  t.beginPath();t.moveTo(32,62);t.lineTo(32,62-h);ink(t,3,ty===0?'#4f7a6b':'#3f7a2b');
  for(let k=0;k<st+1;k++){const y=58-k*12;for(const s2 of[-1,1]){t.beginPath();t.ellipse(32+s2*(ty===0?9:7),y,ty===0?10:7,ty===0?2.6:3.5,s2*.4,0,6.28);fi(t,ty===0?'#6fa89a':'#5aa83c',1.5);}}
  const y=62-h;
  if(ty===0){if(st<2){t.beginPath();t.ellipse(32,y-3,3.5,7,0,0,6.28);fi(t,'#d8d0f0',1.5);}
    else{for(let i=0;i<5;i++){t.save();t.translate(32,y);t.rotate(-1.2+i*.6);t.beginPath();t.ellipse(0,-9,4.2,10,0,0,6.28);fi(t,col,1.5);t.restore();}circ(t,32,y,3.5);fi(t,'#b9a6f0',1.2);circ(t,32,y-1,1.4);t.fillStyle='#fffbe0';t.fill();}}
  else{if(st>=1)for(const[dx,dy]of st===1?[[-7,6]]:[[-9,4],[8,8],[0,-2]]){circ(t,32+dx,y+dy,st===1?3.5:6);fi(t,st===1?'#b9d36a':col,1.5);if(st===2){circ(t,30+dx,y+dy-2,1.6);t.fillStyle='rgba(255,255,255,.8)';t.fill();}}}},2)));
const rareIcon=ty=>sticker(t=>{t.drawImage(atlas,...cellXY(C.rare[ty][2]),64,64,0,0,64,64);},0);
C.rareHerbs=[0,1,2,3].map(rareIcon);
C.rareSeeds=RARECOL.map((col,ty)=>sticker(t=>{rr(t,14,10,36,46,3);fi(t,ty===3?'#cfd8dc':'#d9cfe8');poly(t,[14,10,50,10,46,18,18,18]);fi(t,ty===3?'#aab6bb':'#b9aacb',2);
  poly(t,starPts(32,36,11,5));fi(t,col,2);for(const[x,y]of[[22,50],[40,48],[30,52]]){t.beginPath();t.ellipse(x,y,2,3,0,0,6.28);t.fillStyle=ty===3?'#8fa3aa':'#6b4a7a';t.fill();}}));
C.alchemy=sticker(t=>{rr(t,4,32,56,8,3);fi(t,'#8a5a33');rr(t,8,40,6,20,2);fi(t,'#6b4430');rr(t,50,40,6,20,2);fi(t,'#6b4430');rr(t,12,14,12,18,5);fi(t,'#bfe6f0',2);t.fillStyle='#9fd4a0';t.fillRect(14,22,8,8);t.beginPath();t.moveTo(40,8);t.lineTo(36,20);t.quadraticCurveTo(28,32,40,32);t.quadraticCurveTo(52,32,44,20);t.lineTo(40,8);fi(t,'#dfeef2',2);circ(t,40,26,5);t.fillStyle='#e8636a';t.fill();circ(t,30,6,2);t.fillStyle='rgba(255,255,255,.7)';t.fill();circ(t,34,2,1.5);t.fill();});
const potCell=(col)=>sticker(t=>{rr(t,26,8,12,8,2);fi(t,'#c98f4f',2);rr(t,27,14,10,10,2);fi(t,'#dfeef2',2);t.beginPath();t.moveTo(27,22);t.lineTo(37,22);t.lineTo(50,44);t.quadraticCurveTo(52,56,40,56);t.lineTo(24,56);t.quadraticCurveTo(12,56,14,44);t.closePath();fi(t,'#dfeef2');t.beginPath();t.moveTo(18,40);t.lineTo(46,40);t.lineTo(49,46);t.quadraticCurveTo(50,54,40,54);t.lineTo(24,54);t.quadraticCurveTo(14,54,15,46);t.closePath();t.fillStyle=col;t.fill();t.fillStyle='rgba(255,255,255,.7)';t.fillRect(20,30,4,8);});
C.potSwift=potCell('#6cc57a');C.potNight=potCell('#5a8fe0');C.potFire=potCell('#ff7a2d');C.potIron=potCell('#a9adb8');C.potRegen=potCell('#e8636a');
C.potLunar=potCell('#c9b8ff');C.potThunder=potCell('#ffe14a');C.potGhost=potCell('#9fdbe8');
C.sunTart=sticker(t=>{t.beginPath();t.moveTo(8,36);t.lineTo(56,36);t.lineTo(50,52);t.lineTo(14,52);t.closePath();fi(t,'#d9a05a');t.beginPath();t.ellipse(32,36,24,8,0,0,6.28);fi(t,'#ff9a2d',2);
  for(const[x,y]of[[22,35],[32,33],[42,36],[28,39],[38,39]]){circ(t,x,y,3.4);fi(t,'#ffd84a',1.2);}for(let x=16;x<50;x+=6){t.beginPath();t.moveTo(x,44);t.lineTo(x+3,50);ink(t,1.5,'#a8743a');}});
C.bread=sticker(t=>{t.beginPath();t.ellipse(32,38,24,14,0,0,6.28);fi(t,'#d9a05a');t.beginPath();t.ellipse(32,34,20,9,0,Math.PI,0);t.fillStyle='rgba(255,240,200,.35)';t.fill();for(const x of[22,32,42]){t.beginPath();t.moveTo(x-4,30);t.lineTo(x+4,38);ink(t,2,'#8a5a33');}});
C.bucket=sticker(t=>{t.beginPath();t.arc(32,22,16,Math.PI,0);ink(t,3,'#6c6e79');poly(t,[14,24,50,24,44,56,20,56]);fi(t,'#a9adb8');t.fillStyle='rgba(255,255,255,.3)';t.fillRect(20,28,4,24);});
const fullBucket=col=>sticker(t=>{t.beginPath();t.arc(32,22,16,Math.PI,0);ink(t,3,'#6c6e79');poly(t,[14,24,50,24,44,56,20,56]);fi(t,'#a9adb8');t.beginPath();t.ellipse(32,25,17,4,0,0,6.28);t.fillStyle=col;t.fill();t.fillStyle='rgba(255,255,255,.3)';t.fillRect(20,30,4,22);});
C.bucketInk=fullBucket('#3a2a5a');C.bucketLava=fullBucket('#ff7a2d');
C.moonink=sticker(t=>{t.beginPath();t.moveTo(32,6);t.bezierCurveTo(52,26,50,54,32,56);t.bezierCurveTo(14,54,12,26,32,6);fi(t,'#5a2a6a');t.beginPath();t.arc(34,34,8,0,6.283);t.arc(37,31,7,0,6.283,true);t.fillStyle='#f4e8ff';t.fill();});
C.pendant=sticker(t=>{t.beginPath();t.moveTo(14,6);t.quadraticCurveTo(32,30,50,6);ink(t,2,'#c9a24a');circ(t,32,40,15);fi(t,'#3a2a5a',3);t.beginPath();t.arc(32,40,9,0,6.283);t.arc(36,36,8,0,6.283,true);t.fillStyle='#f4e8ff';t.fill();});
C.paint5=paintCell(t=>{t.fillStyle='#2a0f3a';t.fillRect(0,0,64,64);circ(t,32,26,9);t.fillStyle='#b06ad0';t.fill();circ(t,29,24,3);t.fillStyle='rgba(255,255,255,.4)';t.fill();t.fillStyle='#1a0a24';t.beginPath();t.moveTo(11,50);t.lineTo(20,40);t.lineTo(28,46);t.lineTo(38,36);t.lineTo(53,50);t.fill();});
// ---- secrets
C.peelS=blockCell('#8d8f9a',c=>{stoneDeco(c);c.beginPath();c.moveTo(64,40);c.lineTo(40,64);c.lineTo(64,64);c.closePath();c.fillStyle='#1c1520';c.fill();c.beginPath();c.moveTo(64,40);c.quadraticCurveTo(48,46,40,64);c.lineTo(58,52);c.closePath();c.fillStyle='#e6e1d6';c.fill();ink(c,1.6);});
C.peelB=blockCell('#d9c8b5',c=>{for(let r=0;r<4;r++){const off=r%2?-16:0;for(let k=-1;k<3;k++){rr(c,off+k*32+3,r*16+2,27,12,3);fi(c,'#a84d42',1.4);}}c.beginPath();c.moveTo(64,40);c.lineTo(40,64);c.lineTo(64,64);c.closePath();c.fillStyle='#1c1520';c.fill();c.beginPath();c.moveTo(64,40);c.quadraticCurveTo(48,46,40,64);c.lineTo(58,52);c.closePath();c.fillStyle='#efe6d6';c.fill();ink(c,1.6);});
C.sketchB=sticker(t=>{t.setLineDash([5,4]);rr(t,2,6,60,10,3);ink(t,2.2,'#6a6070');t.beginPath();t.moveTo(12,16);t.lineTo(16,26);t.moveTo(52,16);t.lineTo(48,26);ink(t,2,'#6a6070');t.setLineDash([]);t.fillStyle='rgba(106,96,112,.25)';for(let x=6;x<60;x+=6){t.beginPath();t.moveTo(x,8);t.lineTo(x+4,14);t.strokeStyle='rgba(106,96,112,.35)';t.lineWidth=1;t.stroke();}},0);
C.sketchS=sticker(t=>{t.setLineDash([5,4]);rr(t,4,4,56,56,4);ink(t,2.2,'#6a6070');t.setLineDash([]);t.strokeStyle='rgba(106,96,112,.3)';t.lineWidth=1.2;for(let k=-56;k<56;k+=8){t.beginPath();t.moveTo(k+4,4);t.lineTo(k+60,60);t.stroke();}},0);
C.sign0=sticker(t=>{rr(t,28,24,8,36,2);fi(t,'#7b5234');t.save();t.translate(32,24);t.rotate(-.35);rr(t,-22,-12,44,18,3);fi(t,'#a8805a');t.beginPath();t.moveTo(-14,-6);t.lineTo(12,-2);t.moveTo(-10,0);t.lineTo(6,2);ink(t,1.6,'rgba(42,33,48,.5)');t.restore();poly(t,[40,50,56,58,40,60]);fi(t,'#8d8f9a',1.6);});
C.sign1=sticker(t=>{rr(t,28,20,8,40,2);fi(t,'#7b5234');rr(t,8,8,48,20,4);fi(t,'#e0b04a');poly(t,starPts(18,18,6,2.6));fi(t,'#fbf8f0',1.2);t.beginPath();t.moveTo(28,14);t.lineTo(48,14);t.moveTo(28,21);t.lineTo(44,21);ink(t,2,'#6b4430');});
C.pedestal=blockCell('#6c6e79',c=>{c.fillStyle='rgba(255,255,255,.12)';c.fillRect(0,0,64,10);c.strokeStyle='#c9a24a';c.lineWidth=2.5;c.beginPath();c.moveTo(32,20);c.lineTo(22,44);c.lineTo(42,44);c.closePath();c.stroke();circ(c,32,34,4);c.fillStyle='#c9a24a';c.fill();});
C.rubble=sticker(t=>{for(const[x,y,r,col]of[[18,54,10,'#8d8f9a'],[36,56,8,'#9a6a3f'],[48,52,9,'#8d8f9a'],[28,46,6,'#c98f4f']]){t.beginPath();t.ellipse(x,y,r,r*.7,.3,0,6.28);fi(t,col,2);}rr(t,6,44,24,5,2);t.save();t.translate(40,40);t.rotate(-.6);rr(t,-12,-3,24,6,2);fi(t,'#c98f4f',1.6);t.restore();},2);
C.altar=sticker(t=>{rr(t,8,34,48,26,4);fi(t,'#6c6e79');rr(t,4,30,56,8,3);fi(t,'#8d8f9a');t.beginPath();t.arc(32,20,12,0,6.283);t.arc(37,16,11,0,6.283,true);t.fillStyle='#b06ad0';t.fill();ink(t,2);t.strokeStyle='#c9a24a';t.lineWidth=2;t.beginPath();t.moveTo(18,46);t.lineTo(46,46);t.stroke();});
// ---- murals (T.MURAL, meta = mural number): painted panels on ruin walls that tell the story (lore.js)
const mural=pic=>sticker(t=>{rr(t,5,7,54,50,4);fi(t,'#7a5a3e',2.5);rr(t,10,12,44,40,2);fi(t,'#eadcbc',1.5);t.save();rr(t,10,12,44,40,2);t.clip();pic(t);t.restore();poly(t,[46,52,54,44,54,52]);fi(t,'#c9b58e',1.2);});
C.murals=[
  mural(t=>{poly(t,[10,44,20,26,26,34,34,20,44,36,54,24,54,52,10,52]);fi(t,'#8fb07a',1.5);for(const x of[20,34,54]){t.beginPath();t.moveTo(x,x===20?26:x===34?20:24);t.lineTo(x-2,52);ink(t,1,'rgba(42,33,48,.4)');}
    t.beginPath();t.ellipse(30,48,7,3,0,0,6.283);fi(t,'#4a3570',1.2);t.beginPath();t.moveTo(38,12);t.quadraticCurveTo(52,14,50,24);t.lineTo(44,22);t.quadraticCurveTo(44,17,36,17);t.closePath();fi(t,'#e0b48a',1.5);}),
  mural(t=>{poly(t,[14,20,50,16,52,46,12,48]);fi(t,'#f4ecd8',1.5);poly(t,[16,24,20,16,24,24]);fi(t,'#5a9a4c',1.2);rr(t,44,14,5,12,1);fi(t,'#c98466',1.2);t.beginPath();t.moveTo(20,44);t.quadraticCurveTo(26,36,32,44);t.quadraticCurveTo(38,50,44,42);ink(t,2,'#6b7f98');
    for(const[x,y,c]of[[24,32,'#5aa7e0'],[32,28,'#f4f0e6'],[40,32,'#4a3570'],[32,38,'#c9853d']]){circ(t,x,y,2.6);fi(t,c,1);}}),
  mural(t=>{for(let k=0;k<10;k++){const a=k/10*6.283;t.beginPath();t.moveTo(32+Math.cos(a)*26,32+Math.sin(a)*26);t.quadraticCurveTo(32+Math.cos(a+.5)*12,32+Math.sin(a+.5)*12,32+Math.cos(a)*6,32+Math.sin(a)*6);ink(t,1.4,'rgba(74,53,112,.6)');}
    circ(t,32,24,5);fi(t,'#fbf8f0',1.5);poly(t,[26,30,38,30,40,46,24,46]);fi(t,'#fbf8f0',1.5);}),
  mural(t=>{rr(t,12,16,18,30,1);fi(t,'#f4ecd8',1.2);poly(t,[34,46,40,20,46,40,50,18,54,46]);fi(t,'#e4dcf0',1.5);for(const[x0,y0,x1,y1]of[[40,20,42,46],[50,18,48,46]]){t.beginPath();t.moveTo(x0,y0);t.lineTo(x1,y1);ink(t,1.6,'#a9a0c8');}
    t.beginPath();t.moveTo(31,31);t.lineTo(35,31);ink(t,1.5);poly(t,[35,28,38,31,35,34]);fi(t,INK,1);}),
];
C.tmap=sticker(t=>{poly(t,[8,12,26,8,40,14,56,10,56,52,40,56,26,50,8,54]);fi(t,'#e9dcc0');t.beginPath();t.moveTo(26,8);t.lineTo(26,50);t.moveTo(40,14);t.lineTo(40,56);ink(t,1.5,'rgba(42,33,48,.3)');t.setLineDash([3,3]);t.beginPath();t.moveTo(14,44);t.quadraticCurveTo(26,30,40,34);ink(t,2,'#8a5a33');t.setLineDash([]);t.beginPath();t.moveTo(40,28);t.lineTo(48,36);t.moveTo(48,28);t.lineTo(40,36);ink(t,3,'#d4483b');});
C.foldblade=swordIcon('#f4f0e6',1);
C.foldwave=sticker(t=>{t.beginPath();t.arc(30,32,22,-1.4,1.4);t.arc(22,32,18,1.2,-1.2,true);t.closePath();fi(t,'#fbf8f0',2.5);},2);
// ---- fishing
const rodIcon=(col,tip)=>sticker(t=>{for(const[w,c]of[[6.5,INK],[3.5,col]]){t.beginPath();t.moveTo(10,58);t.quadraticCurveTo(28,26,56,6);ink(t,w,c);}t.save();t.translate(15,51);t.rotate(-.9);rr(t,-3.5,-9,7,18,3);fi(t,'#6b4430',2);t.restore();
  circ(t,24,44,5.5);fi(t,'#a9adb8',2);circ(t,24,44,2);t.fillStyle=INK;t.fill();circ(t,56,6,3);fi(t,tip,1.5);t.beginPath();t.moveTo(56,6);t.quadraticCurveTo(62,30,50,44);ink(t,1.3,'rgba(42,33,48,.65)');
  t.beginPath();t.arc(50,48,4.5,Math.PI,0);t.closePath();fi(t,'#d4483b',1.6);t.beginPath();t.arc(50,48,4.5,0,Math.PI);t.closePath();fi(t,'#fbf8f0',1.6);});
C.rodW=rodIcon('#c98f4f','#e9dcc0');C.rodFe=rodIcon('#a9adb8','#f1c04f');C.rodFr=rodIcon('#aee0f2','#fbf8f0');C.rodEm=rodIcon('#ff8a3d','#ffd66b');
const fishDraw=(t,body,belly,fin,deco)=>{poly(t,[15,32,4,17,9,32,4,47]);fi(t,fin,2.5);poly(t,[30,17,39,5,43,18]);fi(t,fin,2);poly(t,[30,45,36,55,40,45]);fi(t,fin,2);
  t.beginPath();t.moveTo(12,32);t.bezierCurveTo(22,12,46,10,59,30);t.bezierCurveTo(48,50,24,52,12,32);t.closePath();fi(t,body);t.save();t.beginPath();t.moveTo(12,32);t.bezierCurveTo(22,12,46,10,59,30);t.bezierCurveTo(48,50,24,52,12,32);t.clip();
  t.beginPath();t.moveTo(14,36);t.bezierCurveTo(28,48,48,44,58,32);t.lineTo(60,60);t.lineTo(10,60);t.closePath();t.fillStyle=belly;t.fill();if(deco)deco(t);t.restore();
  t.beginPath();t.moveTo(34,14);t.lineTo(28,32);t.lineTo(34,48);ink(t,1.4,'rgba(42,33,48,.35)');circ(t,49,27,3.6);fi(t,'#fbf8f0',1.5);circ(t,50,27,1.7);t.fillStyle=INK;t.fill();};
const fishIcon=(body,belly,fin,deco)=>sticker(t=>fishDraw(t,body,belly,fin,deco));
C.minnow=fishIcon('#c9d6e0','#fbf8f0','#8fa6b8');
C.koi=fishIcon('#fbf8f0','#f4f0e6','#d4483b',t=>{for(const[x,y,r]of[[22,26,6],[40,20,5],[46,38,4]]){circ(t,x,y,r);t.fillStyle='#e8636a';t.fill();}});
C.inkfish=fishIcon('#4a3570','#8a78b0','#2a1a3a',t=>{t.fillStyle='rgba(200,180,255,.35)';for(const x of[20,30,40])t.fillRect(x,20,3,10);});
C.sandsole=fishIcon('#e3c77d','#f5e2ad','#b98f4a',t=>{t.fillStyle='rgba(120,80,40,.4)';for(let i=0;i<14;i++){circ(t,rand(16,54),rand(18,40),1.3);t.fill();}});
C.lavafish=fishIcon('#ff7a2d','#ffd66b','#3a2a24',t=>{t.strokeStyle='#3a2a24';t.lineWidth=1.6;t.beginPath();t.moveTo(18,24);t.lineTo(26,30);t.lineTo(22,38);t.moveTo(38,18);t.lineTo(42,28);t.lineTo(50,32);t.stroke();});
C.goldfin=fishIcon('#f1c04f','#fff3c0','#d49a20',t=>{poly(t,starPts(26,30,7,3));t.fillStyle='#fffaf0';t.fill();});
C.nightkoi=fishIcon('#2f3f7a','#8fa8e0','#b06ad0',t=>{t.beginPath();t.arc(26,28,7,0,6.283);t.arc(29,25,6,0,6.283,true);t.fillStyle='#f4e8ff';t.fill();});
// seasonal, storm and legendary fish (legendaries get a gold rim)
C.blossomtrout=fishIcon('#f4c6d6','#fbeef2','#d4708f',t=>{for(const[x,y]of[[24,24],[38,30],[30,38]]){for(let k=0;k<5;k++){const a=k*1.2566;circ(t,x+Math.cos(a)*2.6,y+Math.sin(a)*2.6,2);t.fillStyle='#fbf8f0';t.fill();}}});
C.sunperch=fishIcon('#f5b53a','#ffe8a6','#d4701e',t=>{t.fillStyle='rgba(120,70,20,.35)';for(const x of[22,30,38,46])t.fillRect(x,16,3,26);});
C.maplecarp=fishIcon('#c8502e','#f1b07a','#7a2a1a',t=>{t.fillStyle='rgba(255,220,160,.5)';for(let i=0;i<9;i++){poly(t,starPts(rand(18,52),rand(20,40),3.4,1.4));t.fill();}});
C.icepike=fishIcon('#9fd0ea','#eef7fb','#5a8fb8',t=>{t.strokeStyle='rgba(255,255,255,.8)';t.lineWidth=2;for(const x of[22,34,46]){t.beginPath();t.moveTo(x,18);t.lineTo(x-4,42);t.stroke();}});
C.stormeel=fishIcon('#4a5568','#a9b4c6','#2a3040',t=>{poly(t,[36,14,28,30,34,30,26,46,42,26,35,26,40,14]);t.fillStyle='#ffe066';t.fill();});
const bigFish=(body,belly,fin,deco)=>sticker(t=>{circ(t,32,32,30);t.fillStyle='rgba(241,192,79,.28)';t.fill();t.save();t.translate(32,32);t.scale(.92,.92);t.translate(-32,-32);
  fishDraw(t,body,belly,fin,deco);t.restore();poly(t,starPts(52,12,8,3.4));fi(t,'#f1c04f',1.6);});
C.oldcrease=bigFish('#e9dcc0','#fbf8f0','#8a6a42',t=>{t.strokeStyle='rgba(42,33,48,.35)';t.lineWidth=1.4;for(let x=16;x<58;x+=6){t.beginPath();t.moveTo(x,14);t.lineTo(x+6,50);t.stroke();}});
C.glacierjaw=bigFish('#dff1fa','#ffffff','#6fa8cf',t=>{for(let x=40;x<58;x+=5){poly(t,[x,34,x+2.5,40,x+5,34]);t.fillStyle='#fff';t.fill();}t.strokeStyle='#6fa8cf';t.lineWidth=1.6;t.beginPath();t.moveTo(18,22);t.lineTo(30,28);t.lineTo(24,40);t.stroke();});
C.moonscale=bigFish('#2a1a4a','#6a4aa0','#b06ad0',t=>{for(let i=0;i<10;i++){circ(t,rand(16,54),rand(18,42),1.4);t.fillStyle='#f4e8ff';t.fill();}t.beginPath();t.arc(32,30,7,0,6.283);t.arc(35,27,6,0,6.283,true);t.fillStyle='#e0b0ff';t.fill();});
C.magmaw=bigFish('#3a2a24','#ff7a2d','#ffd66b',t=>{t.strokeStyle='#ffb347';t.lineWidth=2;t.beginPath();t.moveTo(16,24);t.lineTo(26,32);t.lineTo(20,42);t.moveTo(34,16);t.lineTo(38,30);t.lineTo(52,34);t.stroke();});
C.goldleaf=sticker(t=>{t.beginPath();t.moveTo(32,6);for(let k=1;k<=10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?12:24;t.lineTo(32+Math.cos(a)*r,30+Math.sin(a)*r);}t.closePath();fi(t,'#f1c04f');
  t.beginPath();t.moveTo(32,54);t.lineTo(32,16);t.moveTo(32,34);t.lineTo(20,24);t.moveTo(32,34);t.lineTo(44,24);ink(t,1.6,'#b8862a');t.beginPath();t.moveTo(32,54);t.lineTo(32,60);ink(t,2.5,'#8a5a33');});
C.leaflure=sticker(t=>{t.beginPath();t.moveTo(32,2);t.lineTo(32,12);ink(t,2,'rgba(42,33,48,.6)');t.beginPath();t.ellipse(32,30,11,16,0,0,6.28);fi(t,'#e0a030');t.beginPath();t.moveTo(32,16);t.lineTo(32,44);ink(t,1.4,'#8a5a1a');
  for(const s of[-1,1])for(const y of[22,30,38]){t.beginPath();t.moveTo(32,y);t.lineTo(32+s*8,y-5);ink(t,1.2,'#8a5a1a');}t.beginPath();t.moveTo(32,46);t.quadraticCurveTo(32,58,24,56);ink(t,2.5,'#a9adb8');});
// seasonal tiles: a snow drift heaped on the ground, and thin ice over open ink
C.drift=sticker(t=>{t.beginPath();t.moveTo(0,64);t.lineTo(0,44);t.quadraticCurveTo(14,30,30,38);t.quadraticCurveTo(46,26,64,40);t.lineTo(64,64);t.closePath();fi(t,'#f6f9fb',2);t.fillStyle='#d6e4ee';for(let i=0;i<6;i++){circ(t,rand(8,56),rand(46,60),1.6);t.fill();}},0);
C.thinIce=blockCell('#cfe8f5',c=>{c.fillStyle='rgba(58,42,90,.25)';c.fillRect(0,34,64,30);c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=2.5;c.beginPath();c.moveTo(6,20);c.lineTo(22,10);c.moveTo(34,26);c.lineTo(56,12);c.stroke();c.strokeStyle='rgba(90,150,190,.45)';c.lineWidth=1.4;c.beginPath();c.moveTo(10,44);c.lineTo(28,36);c.lineTo(40,46);c.lineTo(58,38);c.stroke();});
// the sunken temple: dark carved blocks, and the sealed door with a crescent that answers the Ink Moon
const sealBase=c=>{c.strokeStyle='rgba(160,130,220,.28)';c.lineWidth=2;for(const y of[21,42]){c.beginPath();c.moveTo(0,y);c.lineTo(64,y);c.stroke();}for(const[x,y0]of[[24,0],[44,21],[16,42]]){c.beginPath();c.moveTo(x,y0);c.lineTo(x,y0+21);c.stroke();}};
C.seal=blockCell('#2e2446',sealBase);
C.sealDoor=blockCell('#2e2446',c=>{sealBase(c);c.beginPath();c.arc(32,32,15,0,6.283);c.arc(38,27,12,0,6.283);c.fillStyle='#b06ad0';c.fill('evenodd');c.strokeStyle='rgba(224,176,255,.7)';c.lineWidth=1.5;c.beginPath();c.arc(32,32,21,0,6.283);c.stroke();});
C.grilled=fishIcon('#b8743a','#e0a860','#7b4a25',t=>{t.strokeStyle='#4a2a14';t.lineWidth=3;for(const x of[22,32,42]){t.beginPath();t.moveTo(x-4,18);t.lineTo(x+4,44);t.stroke();}});
C.soggy=sticker(t=>{poly(t,[12,14,30,8,52,16,48,34,54,50,30,56,10,48,16,30]);fi(t,'#c9d0d6');t.strokeStyle='rgba(42,33,48,.3)';t.lineWidth=1.4;t.beginPath();t.moveTo(18,20);t.lineTo(30,30);t.lineTo(26,46);t.moveTo(30,30);t.lineTo(46,24);t.stroke();for(const[x,y]of[[22,58],[40,60]]){t.beginPath();t.moveTo(x,y-6);t.quadraticCurveTo(x+3,y,x,y+1);t.quadraticCurveTo(x-3,y,x,y-6);t.fillStyle='#8fcaf0';t.fill();}});
C.fly=sticker(t=>{poly(t,[30,32,8,14,22,34]);fi(t,'#fbf8f0',2);poly(t,[34,32,56,14,42,34]);fi(t,'#f4f0e6',2);t.beginPath();t.ellipse(32,38,6,12,0,0,6.28);fi(t,'#3a3040');circ(t,32,24,5);fi(t,'#3a3040',2);t.beginPath();t.moveTo(32,50);t.quadraticCurveTo(32,60,26,58);ink(t,2,'#a9adb8');});
C.glowlure=sticker(t=>{circ(t,32,30,20);t.fillStyle='rgba(255,210,110,.3)';t.fill();t.beginPath();t.moveTo(32,4);t.lineTo(32,14);ink(t,2,'rgba(42,33,48,.6)');t.beginPath();t.ellipse(32,30,10,14,0,0,6.28);fi(t,'#f5a524');t.beginPath();t.ellipse(29,26,4,6,0,0,6.28);t.fillStyle='#ffe58a';t.fill();t.beginPath();t.moveTo(32,44);t.quadraticCurveTo(32,58,24,56);ink(t,2.5,'#a9adb8');});
C.moonlure=sticker(t=>{t.beginPath();t.moveTo(34,2);t.lineTo(34,12);ink(t,2,'rgba(42,33,48,.6)');const A=()=>{t.beginPath();t.arc(30,31,15,0,6.283);},B=()=>{t.beginPath();t.arc(39,24,12,0,6.283);};A();t.fillStyle='#e0b0ff';t.fill();t.save();t.globalCompositeOperation='destination-out';B();t.fill();t.restore();
  t.save();t.beginPath();t.rect(0,0,64,64);t.arc(39,24,12,0,6.283);t.clip('evenodd');A();ink(t,2.5);t.restore();t.save();A();t.clip();B();ink(t,2.5);t.restore();t.beginPath();t.moveTo(30,45);t.quadraticCurveTo(30,58,22,56);ink(t,2.5,'#a9adb8');circ(t,25,24,2);t.fillStyle='#fff';t.fill();});
C.bobber=sticker(t=>{t.beginPath();t.moveTo(32,6);t.lineTo(32,18);ink(t,3,'#6b4430');t.beginPath();t.arc(32,36,16,Math.PI,0);t.closePath();fi(t,'#d4483b');t.beginPath();t.arc(32,36,16,0,Math.PI);t.closePath();fi(t,'#fbf8f0');circ(t,26,30,3);t.fillStyle='rgba(255,255,255,.6)';t.fill();},2);
C.fcrate=sticker(t=>{rr(t,8,14,48,42,4);fi(t,'#a86b3a');t.strokeStyle='#7b4a25';t.lineWidth=2.4;for(const y of[28,42]){t.beginPath();t.moveTo(10,y);t.lineTo(54,y);t.stroke();}rr(t,6,10,52,8,3);fi(t,'#8e5a30',2);
  t.save();t.translate(32,35);t.scale(.4,.4);t.translate(-32,-32);poly(t,[15,32,4,17,9,32,4,47]);fi(t,'#8fcaf0',4);t.beginPath();t.ellipse(36,32,24,14,0,0,6.28);fi(t,'#8fcaf0',4);t.restore();});
C.tackle=sticker(t=>{t.beginPath();t.moveTo(22,20);t.quadraticCurveTo(32,6,42,20);ink(t,4,'#6c6e79');rr(t,8,20,48,34,5);fi(t,'#3f7a5f');rr(t,8,20,48,10,4);fi(t,'#4f9a72',2);rr(t,28,26,8,8,2);fi(t,'#f1c04f',2);for(const[x,c]of[[16,'#d4483b'],[46,'#fbf8f0']]){circ(t,x,42,4);fi(t,c,1.5);}});
C.potFish=potCell('#3fb0a8');
// ---- museum: fossils on a flat stone slab
const slab=(t,col)=>{poly(t,[10,14,40,6,58,20,56,48,30,58,8,46]);fi(t,col);};
C.fosAmm=sticker(t=>{slab(t,'#d8ccb0');t.beginPath();for(let a=0;a<14;a+=.2){const r=3+a*1.35;a?t.lineTo(33+Math.cos(a)*r,32+Math.sin(a)*r):t.moveTo(33+r,32);}ink(t,3,'#7a6a52');for(let a=2;a<14;a+=1.1){const r=3+a*1.35;t.beginPath();t.moveTo(33+Math.cos(a)*r,32+Math.sin(a)*r);t.lineTo(33+Math.cos(a)*(r-4),32+Math.sin(a)*(r-4));ink(t,1.4,'#7a6a52');}});
C.fosTri=sticker(t=>{slab(t,'#c9c2b6');t.beginPath();t.ellipse(32,35,13,18,0,0,6.28);fi(t,'#9a8e7a',2.5);t.beginPath();t.arc(32,22,13,Math.PI,0);t.closePath();fi(t,'#a89c86',2);for(let y=28;y<52;y+=4){t.beginPath();t.moveTo(21,y);t.lineTo(43,y);ink(t,1.4,'#6e6350');}t.beginPath();t.moveTo(28,24);t.lineTo(28,51);t.moveTo(36,24);t.lineTo(36,51);ink(t,1.4,'#6e6350');for(const x of[26,38]){circ(t,x,17,2);t.fillStyle='#6e6350';t.fill();}});
C.fosFern=sticker(t=>{slab(t,'#d6cdb8');t.beginPath();t.moveTo(20,54);t.quadraticCurveTo(28,30,44,10);ink(t,2.5,'#5f6e42');for(let k=0;k<7;k++){const f=k/7,x=21+f*21,y=52-f*40;for(const s of[-1,1]){t.beginPath();t.ellipse(x+s*6,y+1,7-f*3.5,2.4,s*.5-.4,0,6.28);t.fillStyle='#7f8f58';t.fill();}}});
C.fosSkull=sticker(t=>{slab(t,'#cfc3a8');poly(t,[10,32,22,18,44,15,57,24,54,35,38,37,34,46,18,44]);fi(t,'#f0e8d6',2.5);circ(t,41,24,4.5);t.fillStyle='#3a2c22';t.fill();circ(t,26,30,3);t.fillStyle='#8a7a62';t.fill();for(let x=19;x<34;x+=4){poly(t,[x,43,x+2,49,x+4,43]);fi(t,'#fbf8f0',1);}});
// ---- pets & mounts: icons reuse the sprite drawings from pets.js, scaled into a 64px cell
const petIcon=(k,sx=.66)=>sticker(t=>{t.save();t.translate(32,34);t.scale(sx,sx);t.translate(-48,-48);drawPet(t,k,0);t.restore();});
C.petFrog=petIcon('frog');C.petKit=petIcon('kit');C.petMoth=petIcon('moth');C.petCrease=petIcon('crease');
C.stag=sticker(t=>{t.save();t.translate(2,6);t.scale(.4,.4);drawStag(t,0);t.restore();});
C.hl=sticker(t=>{rr(t,2,2,60,60,8);t.setLineDash([8,5]);ink(t,3,'#fff');t.setLineDash([]);},0);
if(cellN>(32-4)*16)console.warn('atlas overflow');
