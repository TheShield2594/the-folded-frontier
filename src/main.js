// Boot: builds sprite sheets, loads or creates a world and runs the main frame loop.
// This is the entry point. Importing game.js runs every other module first, in the order it lists.
import * as THREE from 'three';
import {
  reduceMotion,
  $,AC,ambient,angler,biomeAt,BIONAME,buildChunk,buildPartnerSheets,
  buildSheets,camera,camT,canvasTex,chapterCard,checkAch,checkRitual,checkRoom,circ,clamp,clouds,
  computeLightStrip,crops,fullMoon,updateBossFx,rareGrowChance,drawWarnMark,curBio,CW,dirty,drawMap,eliteMat,explored,fi,H,handlePad,hasNPC,hitStop,
  inkMoon,invDirty,invOpen,isNight,lightDirty,loadSave,loadWorld,lx0,lx1,makeSheet,mapOpen,markChunk,
  meta,mk,mouse,music,newWorld,nightsSeen,NPCDEF,NPCORDER,pickMusic,player,playerLook,makeRig,rigReskin,buildRigSheets,SHEETS,poly,
  popUp,pt,rand,refreshUI,renderer,renderQuests,reveal,revealT,rr,save,scene,setCurBio,setHitStop,
  setInkMoon,setLightDirty,setLx0,setLx1,setMusic,setNightsSeen,setRevealT,setWorldClock,setWorldTime,
  SFX,shake,simLiquids,spawnFallingStar,spawnLogic,spriteMat,stat,state,surf,T,tiles,toast,tryMoveIn,
  renderFrame,updateAmbience,updateCamera,updateCoins,updateDynLights,updateEnemies,updateFishing,updateHouses,
  updateHUD,updateNPC,updateNums,updateOverlays,updatePartner,updateParts,updatePickups,updatePlayer,
  updatePop,updateProjs,updateSky,updateTrail,updateWeather,visited,W,weather,wind,worldClock,worldTime,
  guideEv,updateGuide,cropGrowChance,isFest,newDay,seasonAmbient,updateTown,loadFailed,
  evDawn,evDusk,perfFrame,perfStart,fcount,updateEvents,updateTricks,updateDlg,palEv,updatePals,buildPetSheets,hidePets,updatePets,updateAwaken,updateLore,updateDiorama,updateTouch,updateSecrets,updateSeasonWorld,loadArt,updateLayers,updateDungeons,
  paintCards,updateCards,
} from './game.js';

// ================= boot =================
buildSheets();buildPartnerSheets();buildPetSheets();buildRigSheets(SHEETS);paintCards();
loadArt(); // hand-made art from assets/art/ replaces the drawn cells and sheets it names once the images decode
drawWarnMark();
eliteMat.map=canvasTex(makeSheet(1,64,64,t=>{const s=[];for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?11:26;s.push(32+Math.cos(a)*r,34+Math.sin(a)*r);}poly(t,s);fi(t,'#f1c04f',3.5);circ(t,27,28,3);t.fillStyle='#fff8e4';t.fill();},3));eliteMat.needsUpdate=true;
// the player is a paper rig (rig.js); player.mat is its material, so tints and flashes work as on any sprite
player.rig=makeRig('human',playerLook(),null);player.mat=player.rig.mat;player.mesh=player.rig.mesh;
{const d=loadSave();if(d){try{loadWorld(d);}catch(e){loadFailed(e);newWorld(Math.floor(Math.random()*1e9));}$('contBtn').hidden=false;}else newWorld(Math.floor(Math.random()*1e9));}
renderQuests();updateCoins();
let ritualT=2,townT=3,cropT=1,liqT=0,bioT=0,starT=8,lastT=performance.now(),autosave=0,housingT=0,achT=2,mapRedraw=0;
function frame(now){requestAnimationFrame(frame);perfStart();const pf0=performance.now();const el=Math.max(0,(now-lastT)/1000);lastT=now;let dt=Math.min(el,1/30);setWorldClock(worldClock+(dt));
  if(player.sheetDirty){rigReskin(player.rig,playerLook(),null);player.sheetDirty=false;}
  handlePad();updateTouch(dt);
  if(state==='play'&&!mapOpen){let gdt=dt;if(hitStop>0){setHitStop(hitStop-(dt));gdt=dt*.07;}const pt=worldTime;setWorldTime((worldTime+gdt*24/600)%24);if(pt<4.5&&worldTime>=4.5){angler.day++;newDay();evDawn();palEv('dawn');if(!player.dead)stat('nights');guideEv('dawn');}
    if(pt<4.5&&worldTime>=4.5&&inkMoon){setInkMoon(false);toast('The Ink Moon sets. You made it through!','gold');stat('inkmoons');fcount('moon');}
    if(pt<19.5&&worldTime>=19.5){setNightsSeen(nightsSeen+1);if(nightsSeen>=2&&Math.random()<.2){setInkMoon(true);toast('The Ink Moon is rising… stay close to home.','bad');SFX.boom();shake(.3);}else if(fullMoon())toast('A full moon rises. Moon Lilies bloom tonight.');evDusk();}
    updateEvents(dt,worldTime);updateWeather(dt);updateBossFx(dt);
    updatePlayer(gdt);updateGuide(dt);updateFishing(gdt);updateEnemies(gdt);updateNPC(gdt);updatePartner(gdt);updatePals(dt);updatePets(gdt);updatePickups(gdt);updateProjs(gdt);spawnLogic(gdt);updateTrail(gdt);
    liqT-=gdt;if(liqT<=0){liqT=.09;simLiquids();}ambient(gdt);seasonAmbient(gdt);bioT-=dt;if(bioT<=0){bioT=.6;const b=biomeAt(player.x,player.y);if(b!==curBio){if(!visited.has(b)){visited.add(b);chapterCard(b);if(!reduceMotion())popUp();}else if(curBio)toast(`Entered the ${BIONAME[b]}`);setCurBio(b);stat('v_'+b);}}
    cropT-=gdt;if(cropT<=0){cropT=1.5;for(const i of crops){const rare=tiles[i]===T.RARE;if(tiles[i]!==T.CROP&&!rare){crops.delete(i);continue;}const m=meta[i];if((m&3)<2&&Math.random()<(rare?rareGrowChance(i,Math.min(3,m>>2)):cropGrowChance(i,Math.min(4,m>>2)))){meta[i]=m+1;markChunk(i%W,(i/W)|0);}}}
    ritualT-=gdt;if(ritualT<=0){ritualT=2;checkRitual();}updateAwaken(gdt);updateLore(gdt);updateSecrets(gdt);updateTricks(gdt);updateCards(gdt);updateSeasonWorld(gdt);updateLayers(gdt);updateDungeons(gdt);
    townT-=dt;if(townT<=0&&!player.dead){townT=3;updateTown();}
    if(isNight()){starT-=gdt;if(starT<=0){starT=rand(10,22)/(isFest('summer')?4:1);spawnFallingStar();}}
    setRevealT(revealT-(dt));if(revealT<=0){setRevealT(.25);reveal(player.x,player.y+1,15);const px=Math.floor(player.x);if(player.y>surf[clamp(px,0,W-1)]-20)for(let x=Math.max(0,px-26);x<=Math.min(W-1,px+26);x++)for(let y=Math.max(0,surf[x]-3);y<H;y++)explored[y*W+x]=1;}achT-=dt;if(achT<=0){achT=2;checkAch();}
    autosave+=dt;if(autosave>60){autosave=0;save();}
    housingT+=dt;if(housingT>2&&!player.dead){housingT=0;if(NPCORDER.some(t=>!hasNPC(t)&&NPCDEF[t].ok())){const r=checkRoom(Math.floor(player.x),Math.floor(player.y+.5));if(r.ok)tryMoveIn(r,false);}}
    }
  else if(state==='title'){$('evbar').hidden=true;camT.x+=dt*2.2;if(camT.x>W-30)camT.x=30;player.x=camT.x;player.y=surf[clamp(Math.floor(camT.x),0,W-1)]+1;player.mesh.visible=false;if(pt.mesh)pt.mesh.visible=false;hidePets();$('partnerHud').hidden=true;setWorldTime((worldTime+dt*.25)%24);}
  if(AC){setMusic(pickMusic());music(dt,isNight());}updateAmbience(dt);mouse.lp=false;mouse.rp=false;
  if(lightDirty){computeLightStrip(lx0-17,lx1+17);setLightDirty(false);setLx0(1e9);setLx1(-1);}
  updatePop(dt);if(state==='play')updateHouses(dt);updateDlg(dt);
  const pf1=performance.now();let n=0;for(const k of dirty){buildChunk(k%CW,Math.floor(k/CW));dirty.delete(k);if(++n>=8)break;}const pf2=performance.now();
  updateParts(dt);updateCamera(dt);updateDynLights(el);updateSky();updateDiorama();updateOverlays();updateNums(dt);
  clouds.forEach(c=>{c.position.x+=dt*c.userData.s*(1+Math.abs(wind)*5)*(wind<0?-1:1);if(c.position.x<-20)c.position.x=W+20;if(c.position.x>W+20)c.position.x=-20;});
  if(mapOpen){mapRedraw-=dt;if(mapRedraw<=0){mapRedraw=.5;drawMap();}}
  if(state!=='title'&&state!=='intro'){updateHUD(dt);if(invDirty||invOpen&&Math.random()<.1)refreshUI();}
  const pf3=performance.now();renderFrame(dt);perfFrame(el,pf1-pf0+pf3-pf2,pf2-pf1,performance.now()-pf3);}
requestAnimationFrame(frame);
