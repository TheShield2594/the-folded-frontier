// Boot: builds sprite sheets, loads or creates a world and runs the main frame loop.
// This is the entry point. Importing game.js runs every other module first, in the order it lists.
import * as THREE from 'three';
import {
  $,AC,ambient,angler,biomeAt,BIONAME,buildBiomeSheets,buildChunk,buildMoreSheets,buildPartnerSheets,
  buildSheets,camera,camT,canvasTex,chapterCard,checkAch,checkRitual,checkRoom,circ,clamp,clouds,
  computeLightStrip,crops,curBio,CW,dirty,drawMap,eliteMat,explored,fi,H,handlePad,hasNPC,hitStop,
  inkMoon,invDirty,invOpen,isNight,lightDirty,loadSave,loadWorld,lx0,lx1,makeSheet,mapOpen,markChunk,
  markMat,meta,mk,mouse,music,newWorld,nightsSeen,NPCDEF,NPCORDER,pickMusic,player,playerSheet,poly,
  popUp,pt,rand,refreshUI,renderer,renderQuests,reveal,revealT,rr,save,scene,setCurBio,setHitStop,
  setInkMoon,setLightDirty,setLx0,setLx1,setMusic,setNightsSeen,setRevealT,setWorldClock,setWorldTime,
  SFX,shake,simLiquids,spawnFallingStar,spawnLogic,spriteMat,stat,state,surf,T,tiles,toast,tryMoveIn,
  updateAmbience,updateCamera,updateCoins,updateDynLights,updateEnemies,updateFishing,updateHouses,
  updateHUD,updateNPC,updateNums,updateOverlays,updatePartner,updateParts,updatePickups,updatePlayer,
  updatePop,updateProjs,updateSky,updateTrail,updateWeather,visited,W,weather,wind,worldClock,worldTime,
} from './game.js';

// ================= boot =================
buildSheets();buildBiomeSheets();buildMoreSheets();buildPartnerSheets();
markMat.map=canvasTex(makeSheet(1,64,64,t=>{rr(t,23,5,18,36,9);fi(t,'#d4483b',3);circ(t,32,52,7);fi(t,'#d4483b',3);},3));markMat.needsUpdate=true;
eliteMat.map=canvasTex(makeSheet(1,64,64,t=>{const s=[];for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?11:26;s.push(32+Math.cos(a)*r,34+Math.sin(a)*r);}poly(t,s);fi(t,'#f1c04f',3.5);circ(t,27,28,3);t.fillStyle='#fff8e4';t.fill();},3));eliteMat.needsUpdate=true;
player.mat=spriteMat(canvasTex(mk(8,8)),9);player.mesh=new THREE.Mesh((()=>{const g=new THREE.PlaneGeometry(1.6,2.4);g.translate(0,1.2,0);return g;})(),player.mat);scene.add(player.mesh);
{const d=loadSave();if(d){try{loadWorld(d);}catch(e){console.error(e);newWorld(Math.floor(Math.random()*1e9));}$('contBtn').hidden=false;}else newWorld(Math.floor(Math.random()*1e9));}
renderQuests();updateCoins();
let ritualT=2,cropT=1,liqT=0,bioT=0,starT=8,lastT=performance.now(),autosave=0,housingT=0,achT=2,mapRedraw=0;
function frame(now){requestAnimationFrame(frame);let dt=(now-lastT)/1000;lastT=now;dt=Math.min(dt,1/30);setWorldClock(worldClock+(dt));
  if(player.sheetDirty){const c=playerSheet();player.mat.uniforms.map.value.dispose();player.mat.uniforms.map.value=canvasTex(c);player.sheetDirty=false;}
  handlePad();
  if(state==='play'&&!mapOpen){let gdt=dt;if(hitStop>0){setHitStop(hitStop-(dt));gdt=dt*.07;}const pt=worldTime;setWorldTime((worldTime+gdt*24/600)%24);if(pt<4.5&&worldTime>=4.5){angler.day++;if(!player.dead)stat('nights');}
    if(pt<4.5&&worldTime>=4.5&&inkMoon){setInkMoon(false);toast('The Ink Moon sets. You made it through!','gold');stat('inkmoons');}
    if(pt<19.5&&worldTime>=19.5){setNightsSeen(nightsSeen+1);if(nightsSeen>=2&&Math.random()<.2){setInkMoon(true);toast('The Ink Moon is rising… stay close to home.','bad');SFX.boom();shake(.3);}}
    updateWeather(dt);
    updatePlayer(gdt);updateFishing(gdt);updateEnemies(gdt);updateNPC(gdt);updatePartner(gdt);updatePickups(gdt);updateProjs(gdt);spawnLogic(gdt);updateTrail(gdt);
    liqT-=gdt;if(liqT<=0){liqT=.09;simLiquids();}ambient(gdt);bioT-=dt;if(bioT<=0){bioT=.6;const b=biomeAt(player.x,player.y);if(b!==curBio){if(!visited.has(b)){visited.add(b);chapterCard(b);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)popUp();}else if(curBio)toast(`Entered the ${BIONAME[b]}`);setCurBio(b);stat('v_'+b);}}
    cropT-=gdt;if(cropT<=0){cropT=1.5;for(const i of crops){if(tiles[i]!==T.CROP){crops.delete(i);continue;}const m=meta[i];if((m&3)<2&&Math.random()<(weather==='rain'?.16:.08)){meta[i]=m+1;markChunk(i%W,(i/W)|0);}}}
    ritualT-=gdt;if(ritualT<=0){ritualT=2;checkRitual();}
    if(isNight()){starT-=gdt;if(starT<=0){starT=rand(10,22);spawnFallingStar();}}
    setRevealT(revealT-(dt));if(revealT<=0){setRevealT(.25);reveal(player.x,player.y+1,15);const px=Math.floor(player.x);if(player.y>surf[clamp(px,0,W-1)]-20)for(let x=Math.max(0,px-26);x<=Math.min(W-1,px+26);x++)for(let y=Math.max(0,surf[x]-3);y<H;y++)explored[y*W+x]=1;}achT-=dt;if(achT<=0){achT=2;checkAch();}
    autosave+=dt;if(autosave>60){autosave=0;save();}
    housingT+=dt;if(housingT>2&&!player.dead){housingT=0;if(NPCORDER.some(t=>!hasNPC(t)&&NPCDEF[t].ok())){const r=checkRoom(Math.floor(player.x),Math.floor(player.y+.5));if(r.ok)tryMoveIn(r,false);}}
    }
  else if(state==='title'){camT.x+=dt*2.2;if(camT.x>W-30)camT.x=30;player.x=camT.x;player.y=surf[clamp(Math.floor(camT.x),0,W-1)]+1;player.mesh.visible=false;if(pt.mesh)pt.mesh.visible=false;$('partnerHud').hidden=true;setWorldTime((worldTime+dt*.25)%24);}
  if(AC){setMusic(pickMusic());music(dt,isNight());}updateAmbience(dt);mouse.lp=false;mouse.rp=false;
  if(lightDirty){computeLightStrip(lx0-17,lx1+17);setLightDirty(false);setLx0(1e9);setLx1(-1);}
  updatePop(dt);if(state==='play')updateHouses(dt);
  let n=0;for(const k of dirty){buildChunk(k%CW,Math.floor(k/CW));dirty.delete(k);if(++n>=8)break;}
  updateParts(dt);updateCamera(dt);updateDynLights();updateSky();updateOverlays();updateNums(dt);
  clouds.forEach(c=>{c.position.x+=dt*c.userData.s*(1+Math.abs(wind)*5)*(wind<0?-1:1);if(c.position.x<-20)c.position.x=W+20;if(c.position.x>W+20)c.position.x=-20;});
  if(mapOpen){mapRedraw-=dt;if(mapRedraw<=0){mapRedraw=.5;drawMap();}}
  if(state!=='title'){updateHUD(dt);if(invDirty||invOpen&&Math.random()<.1)refreshUI();}
  renderer.render(scene,camera);}
requestAnimationFrame(frame);
