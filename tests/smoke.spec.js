// Smoke tests: boot, portraits from the rig, new world, the Hollow Archive, save/load through localStorage, seasonal routes and secrets in the save, the vertical layers and the clocktower, save code round trip, hand-made art loaded from files at boot and applied directly.
// They check that the game starts and its saves survive, not how it plays. Game state is read
// through `import('/src/game.js')`, which on the dev server returns the live modules.
import {test,expect} from '@playwright/test';

const SEED='smoke-test';

// Every test starts with an empty localStorage (a fresh browser context). Settings are set before
// the game boots on each load: no sound, no storybook intro, no tutorial hints.
test.beforeEach(async({page})=>{
  page.errors=[];
  page.on('pageerror',e=>page.errors.push(String(e)));
  // the web fonts load from Google and the browser asks for a favicon the game doesn't have: neither is
  // the game's fault, and the fonts can't load offline
  page.on('console',m=>{if(m.type()!=='error')return;const u=m.location().url||'';
    if(/^https?:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)||/\/favicon\.ico$/.test(u))return;page.errors.push(`${m.text()} ${u}`.trim());});
  await page.addInitScript(()=>{
    localStorage.setItem('folded-frontier-settings',JSON.stringify({snd:false,intro:false,hints:false}));
  });
  await page.addInitScript(installSnapshot);
});
test.afterEach(async({page})=>{
  expect(page.errors,'console errors').toEqual([]);
});

async function boot(page){
  await page.goto('/');
  await expect(page.locator('#title')).toBeVisible();
  await page.waitForFunction(async()=>(await import('/src/game.js')).state==='title');
}

async function newSmallWorld(page){
  await page.click('#newBtn');
  await expect(page.locator('#newWorld')).toBeVisible();
  await page.fill('#seedIn',SEED);
  await page.click('#sizeSeg button[data-s="s"]');
  // pick a look: the next hair style and the second shirt color
  await page.click('#lookRows button[data-k="hairS"][data-d="1"]');
  await page.click('#lookRows button[data-k="tunic"][data-v="1"]');
  await expect(page.locator('#lookRows b[data-n="hairS"]')).toHaveText('Long');
  await page.click('#createBtn');
  await expect(page.locator('#title')).toBeHidden();
  await page.waitForFunction(async()=>(await import('/src/game.js')).state==='play');
}

// A summary of the world and player that should come back unchanged after a save and load. It is
// installed on window so a test can take it in the same task as a load, before a frame runs.
function installSnapshot(){
  window.__snap=g=>{
    let h=2166136261;for(const a of[g.tiles,g.walls,g.meta])for(let i=0;i<a.length;i++)h=Math.imul(h^a[i],16777619)>>>0;
    const p=g.player;
    return {state:g.state,seed:g.seed,seedText:g.seedText,size:g.worldSize,W:g.W,H:g.H,tiles:h,time:g.worldTime,
      x:p.x,y:p.y,hp:p.hp,coins:p.coins,inv:JSON.stringify(p.inv),spawn:JSON.stringify(p.spawn),look:JSON.stringify(p.look),npcs:g.npcs.length};
  };
}
const snapshot=page=>page.evaluate(async()=>window.__snap(await import('/src/game.js')));
// Clicks a title/menu button whose handler loads the world synchronously and takes the snapshot right after.
const clickAndSnap=(page,id)=>page.evaluate(async id=>{const g=await import('/src/game.js');document.getElementById(id).click();return window.__snap(g);},id);
const savedWorld=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('folded-frontier-save-v1')));

// Changes a generated world couldn't have on its own, so a load that regenerates the world instead
// of reading the save is caught.
function markWorld(page){
  return page.evaluate(async()=>{
    const g=await import('/src/game.js');
    g.player.coins=4321;g.addItem('torch',7);
    const x=Math.floor(g.W/3),y=g.surf[x]+5;g.tiles[y*g.W+x]=g.tiles[y*g.W+x]?0:g.T.DIRT;
  });
}

async function pauseGame(page){
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await page.waitForFunction(async()=>(await import('/src/game.js')).state==='paused');
}

test('boots to the title screen with no console errors',async({page})=>{
  await boot(page);
  await expect(page.locator('#newBtn')).toBeVisible();
  // no save yet, so there is nothing to continue
  await expect(page.locator('#contBtn')).toBeHidden();
  // the frame loop is running: the title camera pans
  const x0=await page.evaluate(async()=>(await import('/src/game.js')).camT.x);
  await page.waitForFunction(async x0=>(await import('/src/game.js')).camT.x!==x0,x0);
});

test('portraits and the look preview are pictures of the human rig, with its expressions',async({page})=>{
  await boot(page);
  const r=await page.evaluate(async()=>{const g=await import('/src/game.js');
    // the head's pixels (design rect around the face) as a string, to tell expressions apart
    const face=c=>Array.from(c.getContext('2d').getImageData(28,26,44,44).data).join();
    const out={bad:[],same:[],heads:g.RIGS.human.parts.find(p=>p.n==='head').v};
    for(const k of['player',...Object.keys(g.FOLK)]){const n=g.facePic(k),f0=face(n);
      if(n.width!==96||n.height!==144)out.bad.push(k);
      for(const e of['happy','surprised','sad','angry']){const c=g.facePic(k,e);if(face(c)===f0)out.same.push(k+':'+e);}
      if(k!=='player'&&(g.SHEETS[k].width!==96||g.SHEETS[k].height!==144))out.bad.push('sheet:'+k);}
    const l=g.lookPic({hairS:2,tunic:1});out.look=[l.width,l.height];return out;});
  expect(r.heads).toEqual(expect.arrayContaining(['','happy','surprised','sad','angry']));
  expect(r.bad).toEqual([]);
  expect(r.same).toEqual([]);
  expect(r.look).toEqual([96,144]);
});

test('creates a small world and spawns the player',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player;
    return {W:g.W,H:g.H,size:g.worldSize,seedText:g.seedText,x:p.x,y:p.y,hp:p.hp,dead:p.dead,visible:p.mesh.visible,
      inv:p.inv.filter(Boolean).map(i=>i.id),look:p.look,saved:!!localStorage.getItem('folded-frontier-save-v1')};
  });
  expect(s.size).toBe('s');
  expect(s.seedText).toBe(SEED);
  expect(s.x).toBeGreaterThan(0);expect(s.x).toBeLessThan(s.W);
  expect(s.y).toBeGreaterThan(0);expect(s.y).toBeLessThan(s.H);
  expect(s.hp).toBeGreaterThan(0);
  expect(s.dead).toBeFalsy();
  expect(s.visible).toBe(true);
  expect(s.inv).toEqual(expect.arrayContaining(['copperpick','coppersword','torch']));
  // the look picked in the dialog
  expect(s.look).toMatchObject({hairS:1,tunic:1});
  // a new world is saved right away
  expect(s.saved).toBe(true);
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('saves to localStorage and continues the same world after a reload',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  await markWorld(page);
  await pauseGame(page);
  const before=await snapshot(page);
  expect(before.coins).toBe(4321);

  await page.reload();
  await expect(page.locator('#title')).toBeVisible();
  await expect(page.locator('#contBtn')).toBeVisible();
  const after=await clickAndSnap(page,'contBtn');
  expect(after).toEqual({...before,state:'play'});
});

test('seasonal routes undo themselves over a year, and secrets and records are saved',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),count=t=>{let n=0;for(let i=0;i<g.N;i++)if(g.tiles[i]===t)n++;return n;};
    const start=g.tiles.slice(),day=g.worldDay,seen={};
    // walk the seasons one at a time from summer back round to the season the world started in
    for(const d of[5,10,15,20]){g.setWorldDay(day+d);g.seasonWorld();seen[g.season().k]={thin:count(g.T.THIN),drift:count(g.T.DRIFT)};}
    let diff=0;for(let i=0;i<g.N;i++)if(g.tiles[i]!==start[i])diff++;
    g.setWorldDay(day);g.angler.rec.minnow=12;g.save();
    const d=JSON.parse(localStorage.getItem('folded-frontier-save-v1'));
    return {seen,diff,sea:d.bio.sea,sec:d.bio.sec,rec:d.angler.rec};
  });
  expect(s.seen.winter.thin).toBeGreaterThan(0);
  expect(s.seen.summer.thin+s.seen.summer.drift).toBe(0);
  expect(s.diff).toBe(0);
  expect(s.sea.po.length+s.sea.fl.length).toBeGreaterThan(0);
  expect(s.sec.fake.length).toBeGreaterThan(0);
  expect(s.sec.ink.length).toBeGreaterThan(0);
  expect(s.rec).toEqual({minnow:12});
});

test('elite traits and the meteor shower, eclipse and migration events run',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player,out={};
    // one elite of every trait: it spawns, moves, draws its trait mark, is defeated (explosive ones burst after a fuse)
    for(const k of Object.keys(g.TRAITS)){const e=g.makeElite(g.spawnEnemy('slime',p.x+6,p.y+2),k);g.updateEnemies(1/30);g.hurtEnemy(e,99999,1);}
    for(let i=0;i<12;i++)g.updateEnemies(.1);
    out.traits=Object.keys(g.bestiary.slime.tr).sort();out.left=g.enemies.length;
    const rnd=Math.random;
    // meteor shower at dusk: a crater far from town gets ore
    g.wev.cd=0;g.setWorldDay(5);Math.random=()=>.2;g.evDusk();Math.random=rnd;out.meteor=g.wev.k;
    const top=x=>{let y=Math.min(g.H-8,g.surf[x]+24);while(y>4&&!g.isSolid(x,y))y--;return y;},nat=[g.T.GRASS,g.T.DIRT,g.T.SAND,g.T.SNOW,g.T.STONE];
    let x=g.SPAWNX+30;while(x<g.W-8&&!nat.includes(g.tileAt(x,top(x))))x++;const y=top(x);
    const ores=[g.T.GOLD,g.T.FROST,g.T.INKORE,g.T.EMBERORE,g.T.FOIL],ore=()=>{let n=0;for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=2;dy++)if(ores.includes(g.tileAt(x+dx,y+dy)))n++;return n;};
    const o0=ore();g.meteorStrike(x,y);out.ore=ore()-o0;for(let i=0;i<8;i++)g.updateEvents(.5,21);g.evDawn();out.afterDawn=g.wev.k;
    // eclipse: pending in the morning, starts at its hour, darkens the sky, ends at dusk
    g.wev.cd=0;g.wev.pend='eclipse';g.wev.at=11;g.updateEvents(1/30,12);out.eclipse=g.wev.k;for(let i=0;i<40;i++)g.updateEvents(.5,12);out.eclF=g.eclF;g.spawnLogic(1);g.evDusk();out.afterDusk=g.wev.k;
    // migration: its foes turn up in the target biome, and defeating enough of them ends it with a reward
    g.wev.mig={from:'snow',to:'forest',days:3,n:0,goal:3};Math.random=()=>.1;out.pick=g.migPick('forest',false,false);Math.random=rnd;g.updateEvents(1/30,12);
    const coins=p.coins+g.countItem('coin');for(let i=0;i<3;i++)g.evKill({mig:true});out.mig=g.wev.mig;out.paid=p.coins+g.countItem('coin')>coins;
    return out;
  });
  expect(r.traits).toEqual(Object.keys(await page.evaluate(async()=>(await import('/src/game.js')).TRAITS)).sort());
  expect(r.meteor).toBe('meteor');
  expect(r.ore).toBeGreaterThan(0);
  expect(r.afterDawn).toBeNull();
  expect(r.eclipse).toBe('eclipse');
  expect(r.eclF).toBeGreaterThan(.5);
  expect(r.afterDusk).toBeNull();
  expect(['foldfox','flurry','snowroll','frostpuff']).toContain(r.pick);
  expect(r.mig).toBeNull();
  expect(r.paid).toBe(true);
});

test('every foe and boss is a paper rig that poses for what it is doing',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player,out={noRig:[],clips:{},pics:[]};
    const clear=()=>{for(const e of g.enemies)g.removeEnemy(e);g.enemies.length=0;g.setBoss(null);};
    // each foe spawns on its rig and is stepped through its AI states; the clip it plays in each is recorded
    const ACTS=[null,'wind','dash','open','dive','puff','aim','strike','fuse','hang','leap','exposed','swoop','volley','lunge','fire','shred','fold','chime'];
    for(const k of Object.keys(g.EN)){if(g.EN[k].worm&&k!=='lev')continue;const e=g.spawnEnemy(k,p.x+5,p.y+3);if(!e.rig||e.rig.k!==g.FOERIG[g.EN[k].sheet][0])out.noRig.push(k);
      const seen=new Set();for(const a of ACTS){for(const o of g.enemies){o.act=a;o.at=5;o.shots=3;o.next='fire';o.st2=1;}g.updateEnemies(1/30);seen.add(e.rig.c);}
      out.clips[k]=[...seen].sort();for(const o of g.enemies)if(o.parent&&!o.rig)out.noRig.push(o.type);clear();
      // the bestiary sketch is a still of the rig
      const s=g.SHEETS[g.EN[k].sheet];if(!s||s.width!==g.EN[k].fw||s.height!==g.EN[k].fh)out.pics.push(k);}
    // the Mainspring's hands keep time
    const m=g.spawnEnemy('mainspring',p.x+5,p.y+4);m.act=null;g.updateEnemies(1/30);const h0=m.rig.abs[m.rig.d.pi.handM];for(let i=0;i<10;i++)g.updateEnemies(1/30);out.tick=m.rig.abs[m.rig.d.pi.handM]!==h0;clear();
    out.sheets=['crumple','crane','folio','unfolded','wraith'].filter(k=>g.SHEETS[k+'T']&&g.SHEETS[k+'T'].image.width===g.EN[k].fw*2);
    return out;});
  expect(r.noRig).toEqual([]);
  expect(r.pics).toEqual([]);
  expect(r.sheets).toEqual([]);
  expect(r.tick).toBe(true);
  for(const[k,c]of[['scarab','open'],['clockbug','open'],['toadstool','wind'],['dunefin','flop'],['sunkite','dive'],['frostpuff','puff'],['inkwisp','strike'],['foldfox','wind'],['cracker','fuse'],['ashspider','hang'],
    ['crane','swoop'],['lev','lunge'],['folio','turn'],['unfolded','shred'],['mainspring','chime']])expect(r.clips[k],k).toContain(c);
});

test('new worlds get sky islands, the Pressed Deep and the Folded Clocktower, which can be cleared and is saved',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),B=g.BIO,d=B.dun.clock,P=g.player;
    // the deep band keeps an unbroken crust: every column has at least three slate tiles in a row
    let holes=0;for(let x=0;x<g.W;x++){let run=0,best=0;for(let y=B.deep[0]-4;y<=B.deep[1]+4;y++){const t=g.tiles[y*g.W+x];run=t===g.T.DEEP||t===g.T.MACHINE?run+1:0;best=Math.max(best,run);}if(best<3)holes++;}
    // template cell (column, row from the top) to tile; walk through the tower by calling the dungeon code directly
    const at=(c,r)=>g.tiles[(d.y+d.h-1-r)*g.W+d.x+c],put=(c,r)=>{P.x=d.x+c+.5;P.y=d.y+d.h-1-r;P.vx=P.vy=0;P.onGround=true;},tick=()=>{for(let k=0;k<4;k++)g.updateDungeons(.3);};
    g.gateAt(d.x,d.y+1);const shut=at(0,38)===g.T.GATE;g.quests.crane=true;g.gateAt(d.x,d.y+1);const door=at(0,38);
    g.crankAt(d.x+20,d.y+8);await new Promise(r=>setTimeout(r,900));const puzzle=at(1,24);
    put(8,17);tick();const mini=g.enemies.find(e=>e.type==='sentinel');g.hurtEnemy(mini,1e6,1);for(let k=0;k<30;k++)g.updateEnemies(.05);tick();const arena=at(12,10);
    put(4,9);tick();const b=g.boss&&g.boss.type;g.boss.act=null;g.hurtEnemy(g.boss,1e6,1);for(let k=0;k<120;k++)g.updateEnemies(.05);tick();
    const reward=g.chests.get((d.y+d.h-1-9)*g.W+d.x+16);
    g.save();const sv=JSON.parse(localStorage.getItem('folded-frontier-save-v1'));
    // a save from before the layers (v3, no sky, deep or dungeon data) still loads; it gets no deep layer
    const old=JSON.parse(JSON.stringify(sv));old.v=3;delete old.bio.sky;delete old.bio.dun;delete old.bio.deep;g.loadWorld(old);
    return {H:g.H,holes,islands:sv.bio.sky.is.length,shut,door,puzzle,arena,b,clock:g.quests.clock,roof:at(10,1),wings:!!reward&&reward.some(i=>i&&i.id==='clockwings'),st:sv.bio.dun.clock.st,
      T:{AIR:g.T.AIR,PLATFORM:g.T.PLATFORM},oldDeep:g.BIO.deep||null,oldDun:typeof g.BIO.dun};
  });
  expect(s.H).toBe(200);
  expect(s.holes).toBe(0);
  expect(s.islands).toBeGreaterThan(2);
  expect(s.shut).toBe(true);
  expect(s.door).toBe(s.T.AIR);
  expect(s.puzzle).toBe(s.T.PLATFORM);
  expect(s.arena).toBe(s.T.PLATFORM);
  expect(s.b).toBe('mainspring');
  expect(s.clock).toBe(true);
  expect(s.roof).toBe(s.T.AIR);
  expect(s.wings).toBe(true);
  expect(s.st).toMatchObject({e:1,g:1,m:1,c:1});
  expect(s.oldDeep).toBeNull();
  expect(s.oldDun).toBe('object');
});

test('new worlds get the Hollow Archive: a seam, a crank and a torn curtain, the Warden, the Bookmoth, and a key to the Lost Stacks',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),d=g.BIO.dun.arch,P=g.player,T=g.T,out={};
    // template cell (column, row from the top) to world cell; walk through by calling the dungeon code directly
    const xy=(c,r)=>[d.x+c,d.y+d.h-1-r],at=(c,r)=>{const[x,y]=xy(c,r);return g.tiles[y*g.W+x];},put=(c,r)=>{const[x,y]=xy(c,r);P.x=x+.5;P.y=y;P.vx=P.vy=0;P.onGround=true;},
      tick=()=>{for(let k=0;k<4;k++){put(...tick.at);g.updateDungeons(.3);}},wait=ms=>new Promise(r=>setTimeout(r,ms));
    // the whole template came through the rest of world generation
    const want={'#':T.SEAL,S:T.SEAM,P:T.RIP,K:T.CRANK,L:T.PEEL,E:T.GATE,G:T.GATE,A:T.GATE,B:T.GATE,r:T.ROPE};let diff=0;
    g.DUNGEONS.arch.rows.forEach((row,r)=>[...row].forEach((ch,c)=>{if(want[ch]!=null&&at(c,r)!==want[ch])diff++;}));out.diff=diff;out.lay=g.layerAt(...xy(5,40));
    g.gateAt(...xy(0,4));out.shut=at(0,4)===T.GATE;g.quests.lev=true;g.gateAt(...xy(0,4));out.door=at(0,4);
    put(9,13);g.trickAt(T.SEAM,...xy(11,12));out.seamNoTool=at(11,12)===T.SEAM;g.addItem('ripper',1);g.trickAt(T.SEAM,...xy(11,12));await wait(600);out.seam=[11,12,13].map(r=>at(11,r));
    g.crankAt(...xy(16,13));await wait(900);out.gateG=[2,3,4].map(c=>at(c,14));
    put(6,20);g.addItem('needle',1);g.trickAt(T.RIP,...xy(9,18));await wait(800);out.curtain=[17,18,19,20].map(r=>at(9,r));
    tick.at=[8,30];tick();const mini=g.enemies.find(e=>e.type==='warden');out.mini=!!mini&&mini.elite;g.hurtEnemy(mini,1e6,1);for(let k=0;k<30;k++)g.updateEnemies(.05);tick();out.gateA=at(11,31);
    tick.at=[4,45];tick();out.boss=g.boss&&g.boss.type;g.boss.act=null;g.hurtEnemy(g.boss,1e6,1);for(let k=0;k<120;k++)g.updateEnemies(.05);tick();
    out.quest=!!g.quests.arch;out.B=[43,44,45].map(r=>at(22,r));const[rx,ry]=xy(16,45),rw=g.chests.get(ry*g.W+rx);out.key=!!rw&&rw.some(i=>i&&i.id==='archkey');
    // the Lost Stacks open only with the key
    const st=g.BIO.dun.stacks,s0=st[0];out.stacks=st.length;g.stacksAt(s0[0],s0[1]);out.locked=g.tiles[s0[1]*g.W+s0[0]]===T.STACKS;
    g.addItem('archkey',1);const n0=g.META.stats.stacks||0;g.stacksAt(s0[0],s0[1]+1);g.stacksAt(s0[0],s0[1]);out.once=(g.META.stats.stacks||0)-n0;await wait(600);out.open=[0,1,2].map(k=>g.tiles[(s0[1]+k)*g.W+s0[0]]);
    g.save();const sv=JSON.parse(localStorage.getItem('folded-frontier-save-v1'));out.st=sv.bio.dun.arch.st;out.saved=sv.bio.dun.stacks[0][2];
    // a save from before the Archive keeps its terrain: it gets neither the Archive nor the Lost Stacks
    const old=JSON.parse(JSON.stringify(sv));delete old.bio.dun.arch;delete old.bio.dun.stacks;g.loadWorld(old);out.oldArch=g.BIO.dun.arch;out.oldStacks=g.BIO.dun.stacks;out.oldClock=!!g.BIO.dun.clock;
    out.T={AIR:T.AIR,ROPE:T.ROPE,PLATFORM:T.PLATFORM,SEWN:T.SEWN};return out;
  });
  const{AIR,ROPE,PLATFORM,SEWN}=s.T;
  expect(s.diff).toBe(0);
  expect(s.lay).toBe('archive');
  expect(s.shut).toBe(true);
  expect(s.door).toBe(AIR);
  expect(s.seamNoTool).toBe(true);
  expect(s.seam).toEqual([AIR,AIR,AIR]);
  expect(s.gateG).toEqual([PLATFORM,ROPE,PLATFORM]);
  expect(s.curtain).toEqual([SEWN,AIR,AIR,AIR]);
  expect(s.mini).toBe(true);
  expect(s.gateA).toBe(PLATFORM);
  expect(s.boss).toBe('bookmoth');
  expect(s.quest).toBe(true);
  expect(s.B).toEqual([AIR,AIR,AIR]);
  expect(s.key).toBe(true);
  expect(s.stacks).toBe(2);
  expect(s.locked).toBe(true);
  expect(s.open).toEqual([AIR,AIR,AIR]);
  expect(s.once).toBe(1);
  expect(s.st).toMatchObject({e:1,g:1,m:1,c:1});
  expect(s.saved).toBe(1);
  expect(s.oldArch).toBeNull();
  expect(s.oldStacks).toBeNull();
  expect(s.oldClock).toBe(true);
});

test('new worlds get the Origami Observatory among the sky islands: a fold to the crank, the Stargazer, the Starfold, and a lens for the Star Vaults',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),d=g.BIO.dun.obs,P=g.player,T=g.T,out={};
    // template cell (column, row from the top) to world cell; walk through by calling the dungeon code directly
    const tpl=g.DUNGEONS.obs.rows,G=28,xy=(c,r,o=d)=>[o.x+c,o.y+(tpl.length-1-G)+(G-r)],at=(c,r,o=d)=>{const[x,y]=xy(c,r,o);return g.tiles[y*g.W+x];},
      put=(c,r)=>{const[x,y]=xy(c,r);P.x=x+.5;P.y=y;P.vx=P.vy=0;P.onGround=true;},cell=()=>[Math.floor(P.x),Math.floor(P.y)],
      tick=()=>{for(let k=0;k<4;k++){put(...tick.at);g.updateDungeons(.3);}},wait=ms=>new Promise(r=>setTimeout(r,ms));
    // the whole template came through the rest of world generation, in the sky over the islands
    const want={'#':T.DOME,Q:T.CREASE,q:T.CREASE,K:T.CRANK,L:T.PEEL,V:T.SCOPE,Y:T.SKYSTONE,U:T.CLOUD,E:T.GATE,G:T.GATE,A:T.GATE,B:T.GATE,r:T.ROPE};
    const diff=o=>{let n=0;tpl.forEach((row,r)=>[...row].forEach((ch,c)=>{if(want[ch]!=null&&at(c,r,o)!==want[ch])n++;}));return n;};
    out.diff=diff(d);out.sky=d.y>g.BIO.sky.y;out.lay=g.layerAt(...xy(12,24));
    g.gateAt(...xy(4,26));out.shut=at(4,26)===T.GATE;g.quests.folio=true;g.gateAt(...xy(4,26));out.door=at(4,26);
    // the crank is sealed in a vault: only the crease on the hall floor reaches it, and only with the Bone Folder
    const[qx,qy]=xy(8,27),[ix,iy]=xy(6,22);put(8,27);g.trickAt(T.CREASE,qx,qy);out.foldNoTool=cell().join()===[qx,qy].join();
    g.addItem('folder',1);g.trickAt(T.CREASE,qx,qy);out.folded=cell().join()===[ix,iy].join();
    g.crankAt(...xy(9,22));await wait(900);out.gateG=[22,23,24].map(c=>at(c,19));
    // the vault's own crease folds you back out, tool or not
    g.removeItem('folder',1);g.trickAt(T.CREASE,ix,iy);out.back=cell().join()===[qx,qy].join();
    tick.at=[10,18];tick();const mini=g.enemies.find(e=>e.type==='gazer');out.mini=!!mini&&mini.elite;g.hurtEnemy(mini,1e6,1);for(let k=0;k<30;k++)g.updateEnemies(.05);tick();out.gateA=[14,15,16].map(c=>at(c,11));
    tick.at=[8,10];tick();out.boss=g.boss&&g.boss.type;g.boss.act=null;g.hurtEnemy(g.boss,1e6,1);for(let k=0;k<120;k++)g.updateEnemies(.05);tick();
    out.quest=!!g.quests.obs;out.B=[14,15,16].map(c=>at(c,0));const[rx,ry]=xy(20,10),rw=g.chests.get(ry*g.W+rx);out.lens=!!rw&&rw.some(i=>i&&i.id==='starlens');
    // the Star Vaults open only with the lens
    const v=g.BIO.dun.vaults,v0=v[0];out.vaults=v.length;g.vaultAt(v0[0],v0[1]);out.locked=g.tiles[v0[1]*g.W+v0[0]]===T.STARDOOR;
    g.addItem('starlens',1);const n0=g.META.stats.vaults||0;g.vaultAt(v0[0],v0[1]+1);g.vaultAt(v0[0],v0[1]);out.once=(g.META.stats.vaults||0)-n0;await wait(600);out.open=[0,1,2].map(k=>g.tiles[(v0[1]+k)*g.W+v0[0]]);
    g.save();const sv=JSON.parse(localStorage.getItem('folded-frontier-save-v1'));out.st=sv.bio.dun.obs.st;out.saved=sv.bio.dun.vaults[0][2];
    // a save from before the Observatory gets one on its next load, in empty sky, leaving everything already there alone
    const old=JSON.parse(JSON.stringify(sv)),was=[d.x,d.y];delete old.bio.dun.obs;delete old.bio.dun.vaults;g.loadWorld(old);const o=g.BIO.dun.obs;
    out.oldObs=!!o&&diff(o)===0&&(o.x!==was[0]||o.y!==was[1]);out.oldKept=g.tiles[(was[1]+4)*g.W+was[0]+4];out.oldVaults=g.BIO.dun.vaults.length;
    out.T={AIR:T.AIR,ROPE:T.ROPE,PLATFORM:T.PLATFORM,DOME:T.DOME};return out;
  });
  const{AIR,ROPE,PLATFORM,DOME}=s.T;
  expect(s.diff).toBe(0);
  expect(s.sky).toBe(true);
  expect(s.lay).toBe('observatory');
  expect(s.shut).toBe(true);
  expect(s.door).toBe(AIR);
  expect(s.foldNoTool).toBe(true);
  expect(s.folded).toBe(true);
  expect(s.gateG).toEqual([PLATFORM,ROPE,PLATFORM]);
  expect(s.back).toBe(true);
  expect(s.mini).toBe(true);
  expect(s.gateA).toEqual([PLATFORM,ROPE,PLATFORM]);
  expect(s.boss).toBe('starfold');
  expect(s.quest).toBe(true);
  expect(s.B).toEqual([AIR,ROPE,AIR]);
  expect(s.lens).toBe(true);
  expect(s.vaults).toBe(2);
  expect(s.locked).toBe(true);
  expect(s.open).toEqual([AIR,AIR,AIR]);
  expect(s.once).toBe(1);
  expect(s.st).toMatchObject({e:1,g:1,m:1,c:1});
  expect(s.saved).toBe(1);
  expect(s.oldObs).toBe(true);
  expect(s.oldKept).toBe(DOME);
  expect(s.oldVaults).toBeGreaterThan(0);
});

test('new worlds get the Great Scrapworks: a peel wall, a crank, a shredder pit, the Foreman, the Pulper, and a crowbar for the Supply Crates',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),d=g.BIO.dun.scrap,P=g.player,T=g.T,out={};
    const tpl=g.DUNGEONS.scrap.rows,xy=(c,r)=>[d.x+c,d.y+d.h-1-r],at=(c,r)=>{const[x,y]=xy(c,r);return g.tiles[y*g.W+x];},
      put=(c,r)=>{const[x,y]=xy(c,r);P.x=x+.5;P.y=y;P.vx=P.vy=0;P.onGround=true;},tick=()=>{for(let k=0;k<4;k++){put(...tick.at);g.updateDungeons(.3);}},wait=ms=>new Promise(r=>setTimeout(r,ms));
    const want={'#':T.SCRAP,Z:T.SHRED,K:T.CRANK,L:T.PEEL,k:T.SKETCH,E:T.GATE,G:T.GATE,A:T.GATE,B:T.GATE,r:T.ROPE};let diff=0;
    tpl.forEach((row,r)=>[...row].forEach((ch,c)=>{if(want[ch]!=null&&at(c,r)!==want[ch])diff++;}));out.diff=diff;out.lay=g.layerAt(...xy(8,31));
    g.gateAt(...xy(22,32));out.shut=at(22,32)===T.GATE;g.quests.king=true;g.gateAt(...xy(22,32));out.door=at(22,32);
    // the shredders bite and throw you up
    put(9,26);P.onGround=false;P.inv_t=0;const hp=P.hp;g.updateDungeons(.01);out.shred=[P.hp<hp,P.vy>0];P.hp=P.max;
    g.crankAt(...xy(3,33));await wait(900);out.gateG=[1,2,3].map(c=>at(c,24));
    tick.at=[8,17];tick();const mini=g.enemies.find(e=>e.type==='foreman');out.mini=!!mini&&mini.elite;g.hurtEnemy(mini,1e6,1);for(let k=0;k<30;k++)g.updateEnemies(.05);tick();out.gateA=[10,11,12].map(c=>at(c,10));
    tick.at=[6,9];tick();out.boss=g.boss&&g.boss.type;g.boss.act=null;g.hurtEnemy(g.boss,1e6,1);for(let k=0;k<120;k++)g.updateEnemies(.05);tick();
    out.quest=!!g.quests.scrap;out.B=[10,11,12].map(c=>at(c,2));const[rx,ry]=xy(16,9),rw=g.chests.get(ry*g.W+rx);out.bar=!!rw&&rw.some(i=>i&&i.id==='crowbar');
    // the Supply Crates open only with the crowbar
    const c=g.BIO.dun.crates,c0=c[0];out.crates=c.length;g.crateAt(c0[0],c0[1]);out.locked=g.tiles[c0[1]*g.W+c0[0]]===T.CRATE;
    g.addItem('crowbar',1);const n0=g.META.stats.crates||0;g.crateAt(c0[0],c0[1]+1);g.crateAt(c0[0],c0[1]);out.once=(g.META.stats.crates||0)-n0;await wait(600);out.open=[0,1,2].map(k=>g.tiles[(c0[1]+k)*g.W+c0[0]]);
    g.save();const sv=JSON.parse(localStorage.getItem('folded-frontier-save-v1'));out.st=sv.bio.dun.scrap.st;out.saved=sv.bio.dun.crates[0][2];
    // a save from before the Scrapworks loads: it gets one only on untouched ground, and crates only with it
    const old=JSON.parse(JSON.stringify(sv));delete old.bio.dun.scrap;delete old.bio.dun.crates;g.loadWorld(old);const o=g.BIO.dun.scrap;
    out.oldOk=o===null?g.BIO.dun.crates===null:!!o.w&&Array.isArray(g.BIO.dun.crates);out.oldClock=!!g.BIO.dun.clock;
    out.T={AIR:T.AIR,ROPE:T.ROPE,PLATFORM:T.PLATFORM};return out;
  });
  const{AIR,ROPE,PLATFORM}=s.T;
  expect(s.diff).toBe(0);
  expect(s.lay).toBe('scrapworks');
  expect(s.shut).toBe(true);
  expect(s.door).toBe(AIR);
  expect(s.shred).toEqual([true,true]);
  expect(s.gateG).toEqual([PLATFORM,ROPE,PLATFORM]);
  expect(s.mini).toBe(true);
  expect(s.gateA).toEqual([PLATFORM,ROPE,PLATFORM]);
  expect(s.boss).toBe('pulper');
  expect(s.quest).toBe(true);
  expect(s.B).toEqual([AIR,ROPE,AIR]);
  expect(s.bar).toBe(true);
  expect(s.crates).toBeGreaterThanOrEqual(2);
  expect(s.locked).toBe(true);
  expect(s.open).toEqual([AIR,AIR,AIR]);
  expect(s.once).toBe(1);
  expect(s.st).toMatchObject({e:1,g:1,m:1,c:1});
  expect(s.saved).toBe(1);
  expect(s.oldOk).toBe(true);
  expect(s.oldClock).toBe(true);
});

test('new worlds get the Sunken Inkwell Temple: an ink shaft, every paper trick, the Scribe, the Grand Nib, and a nib for the Ink Wells',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),d=g.BIO.dun.temple,P=g.player,T=g.T,out={};
    const tpl=g.DUNGEONS.temple.rows,xy=(c,r)=>[d.x+c,d.y+d.h-1-r],at=(c,r)=>{const[x,y]=xy(c,r);return g.tiles[y*g.W+x];},cell=()=>[Math.floor(P.x),Math.floor(P.y)].join(),
      put=(c,r)=>{const[x,y]=xy(c,r);P.x=x+.5;P.y=y;P.vx=P.vy=0;P.onGround=true;},tick=()=>{for(let k=0;k<4;k++){put(...tick.at);g.updateDungeons(.3);}},wait=ms=>new Promise(r=>setTimeout(r,ms));
    const want={'#':T.SEAL,S:T.SEAM,P:T.RIP,Q:T.CREASE,q:T.CREASE,K:T.CRANK,L:T.PEEL,i:T.INK,E:T.GATE,G:T.GATE,A:T.GATE,B:T.GATE,r:T.ROPE};let diff=0;
    tpl.forEach((row,r)=>[...row].forEach((ch,c)=>{if(want[ch]!=null&&at(c,r)!==want[ch])diff++;}));out.diff=diff;out.lay=g.layerAt(...xy(12,30));
    g.gateAt(...xy(0,4));out.shut=at(0,4)===T.GATE;g.quests.unfolded=true;g.gateAt(...xy(0,4));out.door=at(0,4);
    // tear the seam, fold into the crank's vault and back, sew the curtain
    put(12,13);g.addItem('ripper',1);g.trickAt(T.SEAM,...xy(15,10));await wait(1100);out.seam=[7,10,13].map(r=>at(15,r));
    const[qx,qy]=xy(19,13),[ix,iy]=xy(1,10);put(19,13);g.addItem('folder',1);g.trickAt(T.CREASE,qx,qy);out.folded=cell()===[ix,iy].join();
    g.crankAt(...xy(3,10));await wait(900);out.gateG=[19,20,21].map(c=>at(c,14));g.removeItem('folder',1);g.trickAt(T.CREASE,ix,iy);out.back=cell()===[qx,qy].join();
    put(16,19);g.addItem('needle',1);g.trickAt(T.RIP,...xy(10,17));await wait(1200);out.curtain=[15,16,19].map(r=>at(10,r));
    tick.at=[8,27];tick();const mini=g.enemies.find(e=>e.type==='scribe');out.mini=!!mini&&mini.elite;g.hurtEnemy(mini,1e6,1);for(let k=0;k<30;k++)g.updateEnemies(.05);tick();out.gateA=[10,11,12].map(c=>at(c,28));
    tick.at=[6,38];tick();out.boss=g.boss&&g.boss.type;g.boss.act=null;g.hurtEnemy(g.boss,1e6,1);for(let k=0;k<120;k++)g.updateEnemies(.05);tick();
    out.quest=!!g.quests.temple;out.B=[36,37,38].map(r=>at(22,r));const[rx,ry]=xy(16,38),rw=g.chests.get(ry*g.W+rx);out.nib=!!rw&&rw.some(i=>i&&i.id==='wellnib');out.blots=g.enemies.filter(e=>e.type==='blot'&&!e.dying).length;
    // the Ink Wells open only with the Well Nib
    const w=g.BIO.dun.wells,w0=w[0];out.wells=w.length;g.wellAt(w0[0],w0[1]);out.locked=g.tiles[w0[1]*g.W+w0[0]]===T.WELLDOOR;
    g.addItem('wellnib',1);g.wellAt(w0[0],w0[1]);await wait(600);out.open=[0,1,2].map(k=>g.tiles[(w0[1]+k)*g.W+w0[0]]);
    g.save();const sv=JSON.parse(localStorage.getItem('folded-frontier-save-v1'));out.st=sv.bio.dun.temple.st;out.saved=sv.bio.dun.wells[0][2];
    // a save from before the Temple keeps its terrain: it gets neither the Temple nor the Ink Wells
    const old=JSON.parse(JSON.stringify(sv));delete old.bio.dun.temple;delete old.bio.dun.wells;g.loadWorld(old);out.oldTemple=g.BIO.dun.temple;out.oldWells=g.BIO.dun.wells;
    out.T={AIR:T.AIR,ROPE:T.ROPE,PLATFORM:T.PLATFORM,SEWN:T.SEWN};return out;
  });
  const{AIR,ROPE,PLATFORM,SEWN}=s.T;
  expect(s.diff).toBe(0);
  expect(s.lay).toBe('inkwell');
  expect(s.shut).toBe(true);
  expect(s.door).toBe(AIR);
  expect(s.seam).toEqual([AIR,AIR,AIR]);
  expect(s.folded).toBe(true);
  expect(s.gateG).toEqual([PLATFORM,ROPE,PLATFORM]);
  expect(s.back).toBe(true);
  expect(s.curtain).toEqual([SEWN,AIR,AIR]);
  expect(s.mini).toBe(true);
  expect(s.gateA).toEqual([PLATFORM,PLATFORM,PLATFORM]);
  expect(s.boss).toBe('nib');
  expect(s.quest).toBe(true);
  expect(s.B).toEqual([AIR,AIR,AIR]);
  expect(s.nib).toBe(true);
  expect(s.blots).toBe(0);
  expect(s.wells).toBeGreaterThanOrEqual(2);
  expect(s.locked).toBe(true);
  expect(s.open).toEqual([AIR,AIR,AIR]);
  expect(s.st).toMatchObject({e:1,g:1,m:1,c:1});
  expect(s.saved).toBe(1);
  expect(s.oldTemple).toBeNull();
  expect(s.oldWells).toBeNull();
});

test('paper tricks: seams tear, torn holes stitch and creases fold, only with their tools, and are saved',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player,t=g.BIO.trick,out={n:[t.seam.length,t.rip.length,t.fold.length]};
    const at=(x,y)=>g.tiles[g.idx(x,y)];
    // without the tool nothing happens
    const s=t.seam[0],rp=t.rip[0],f=t.fold[0];g.tearSeam(s[0],s[1]);g.stitchRip(rp[0],rp[1]);const x0=p.x;g.foldAt(f[0],f[1]);
    out.locked=[at(s[0],s[1])===g.T.SEAM,at(rp[0],rp[1])===g.T.RIP,p.x===x0];
    // stepping into a torn hole throws you back out, without costing life
    const hp0=p.hp;p.x=rp[0]+.5;p.y=rp[1]+.3;p.vx=p.vy=0;p.inv_t=0;g.updateTricks(1/30);out.thrown=at(Math.floor(p.x),Math.floor(p.y))!==g.T.RIP&&p.hp===hp0;
    // the map marks explored spots: drawTrickMarks draws into a canvas only once the spot is explored
    const mc=document.createElement('canvas');mc.width=g.W*2;mc.height=g.H*2;const inked=()=>mc.getContext('2d').getImageData(0,0,mc.width,mc.height).data.some(v=>v>0);
    for(const[x,y]of[[s[0],s[1]+1],[rp[0],rp[1]],[f[0],f[1]],[f[2],f[3]]])g.explored[g.idx(x,y)]=0;g.drawTrickMarks(mc.getContext('2d'),2);out.hiddenOnMap=!inked();g.explored[g.idx(s[0],s[1]+1)]=1;g.drawTrickMarks(mc.getContext('2d'),2);out.onMap=inked();
    // the guide hints at a trick the first time it is usable: carrying the tool near its spot
    g.SET.hints=true;g.setTut({s:99,seen:{peel:1,pop:1,flat:1}});g.addItem('ripper',1);p.x=s[0]-2+.5;p.y=s[1];for(let y=s[1]-6;y<=s[1]+6;y++)for(let x=s[0]-6;x<=s[0]+6;x++)g.explored[y*g.W+x]=1;g.updateGuide(1);out.hint=document.getElementById('gdT').textContent;g.SET.hints=false;
    g.addItem('needle',1);g.addItem('folder',1);
    g.tearSeam(s[0],s[1]);g.stitchRip(rp[0],rp[1]);out.pending=[s[2],rp[2]];g.foldAt(f[0],f[1]);out.folded=[Math.floor(p.x),p.y]+''===[f[2],f[3]]+'';g.removeItem('folder',1);g.foldAt(f[2],f[3]);out.back=[Math.floor(p.x),p.y]+''===[f[0],f[1]]+'';
    // the seam and the tear open over a moment
    await new Promise(r=>setTimeout(r,2500));
    out.open=[0,1,2].every(k=>at(s[0],s[1]+k)===g.T.AIR);out.sewn=at(rp[0],rp[1])===g.T.SEWN&&at(rp[0],rp[1]-1)===g.T.AIR;out.flags=[s[2],rp[2]];
    out.seen=g.tut.seen;g.save();out.saved=JSON.parse(localStorage.getItem('folded-frontier-save-v1')).bio.trick;
    return out;});
  expect(r.n.every(n=>n>=1)).toBe(true);
  expect(r.locked).toEqual([true,true,true]);
  expect(r.thrown).toBe(true);
  expect(r.hiddenOnMap).toBe(true);
  expect(r.onMap).toBe(true);
  expect(r.hint).toBe('Tear the seam');
  expect(r.seen.tear&&r.seen.stitch&&r.seen.fold).toBe(1);
  expect(r.folded).toBe(true);
  expect(r.back).toBe(true);
  expect(r.open).toBe(true);
  expect(r.sewn).toBe(true);
  // marked done only once the tiles have changed, so a save in between can't hide an unfinished spot
  expect(r.pending).toEqual([0,0]);
  expect(r.flags).toEqual([1,1]);
  expect(r.saved.seam[0][2]).toBe(1);
  expect(r.saved.rip[0][2]).toBe(1);
});

test('the held weapon and the raised shield are pieces of the player rig',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player,R=p.rig,pi=R.d.pi,out={};
    // a sword cut: the held piece carries the sword's icon and turns with the blade
    g.setState('frozen');p.swing={t:.12,dur:.3,tool:'coppersword',hit:new Set(),dmg:1,kb:1,sword:true,heavy:false,combo:0,from:1.6};
    g.updatePlayer(1e-4);out.held=R.hs[pi.held]===g.iconTex('coppersword').image;const a0=R.abs[pi.held];p.swing.t=.24;g.updatePlayer(1e-4);out.turns=R.abs[pi.held]!==a0;
    // the piece is drawn (its quad has size) and hides when the swing ends
    const pos=R.g.attributes.position.array,q=(R.d.parts.length+pi.held*2+1)*12,size=()=>Math.abs(pos[q]-pos[q+3])+Math.abs(pos[q+1]-pos[q+7]);out.drawn=size()>0;
    p.swing=null;g.updatePlayer(1e-4);out.hidden=size()===0;
    // blocking raises the shield piece
    p.acc[0]={id:'buckler',n:1};g.mouse.r=true;g.updatePlayer(1e-4);out.shield=R.hs[pi.shield]===g.iconTex('buckler').image;g.mouse.r=false;g.updatePlayer(1e-4);out.lowered=!R.hs[pi.shield];
    g.setState('play');return out;});
  expect(r).toEqual({held:true,turns:true,drawn:true,hidden:true,shield:true,lowered:true});
});

test('save code round trip loads the same world',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  await markWorld(page);
  await pauseGame(page);
  const before=await snapshot(page),saved=await savedWorld(page);

  await page.click('#codeBtn');
  await expect(page.locator('#codeBox')).toBeVisible();
  await page.click('#codeMake');
  await expect(page.locator('#codeTxt')).toHaveValue(/^FF1:/);
  const code=await page.inputValue('#codeTxt');

  // drop the browser save, so the world can only come back from the code
  await page.evaluate(()=>localStorage.removeItem('folded-frontier-save-v1'));
  await page.reload();
  await boot(page);
  await expect(page.locator('#contBtn')).toBeHidden();
  expect((await snapshot(page)).tiles).not.toBe(before.tiles);

  await page.click('#code2Btn');
  await expect(page.locator('#codeBox')).toBeVisible();
  await page.fill('#codeTxt',code);
  await page.click('#codeLoad');
  await expect(page.locator('#codeBox')).toBeHidden();
  await page.waitForFunction(async()=>(await import('/src/game.js')).state==='play');
  // loading a code saves the world to the browser straight away, before a frame runs, so that save
  // matches the one the code was made from
  expect(await savedWorld(page)).toEqual(saved);
  const after=await snapshot(page);
  for(const k of['seed','seedText','size','W','H','coins','inv','spawn','npcs'])expect(after[k],k).toEqual(before[k]);
});

test('a save that storage refuses is reported instead of "Game saved."',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  // a full localStorage throws on setItem; the pause menu must say so
  await page.evaluate(()=>{const o=Storage.prototype.setItem;window.__setItem=o;Storage.prototype.setItem=function(k,v){if(k==='folded-frontier-save-v1')throw new DOMException('full','QuotaExceededError');return o.call(this,k,v);};});
  await pauseGame(page);
  await expect(page.locator('.toast',{hasText:'Could not save'})).toBeVisible();
  await expect(page.locator('.toast',{hasText:'Game saved.'})).toHaveCount(0);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__setItem;});
});

test('?perf shows the performance overlay with world and save numbers',async({page})=>{
  await page.goto('/?perf');
  await page.waitForFunction(async()=>(await import('/src/game.js')).state==='title');
  await expect(page.locator('#perf')).toBeVisible();
  await newSmallWorld(page);
  await pauseGame(page);
  await expect(page.locator('#perfTxt')).toContainText(/Fold \d+ ms/);
  await expect(page.locator('#perfTxt')).toContainText(/Save 0\.\d+M chars/);
  const r=await page.evaluate(async()=>(await import('/src/game.js')).perfReport());
  expect(r).toContain('Small 420×200');
});

// The dev server globs the art from tests/fixtures/art/ (FF_ART_DIR in playwright.config.js), so this covers
// finding the files, reading their paths and the loadArt() call at boot. A dev server already running on the
// test port without FF_ART_DIR loads no pictures here.
test('art files are found and painted in at boot',async({page})=>{
  const warns=[];page.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('art:'))warns.push(m.text());});
  await boot(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),n=await g.artReady;
    const px=(cv,x,y)=>[...cv.getContext('2d').getImageData(x,y,1,1).data];
    const cell=k=>{const[x,y]=g.cellXY(k);return px(g.atlas,x+32,y+32);},f=g.SHEETS.stag;
    return {n,swFe:cell(g.C.swFe),crack:cell(g.C.crack[1]),crack0:cell(g.C.crack[0]),heart:cell(g.C.heart),stag:px(f,f.width/2,f.height/2),
      loaded:Object.keys(g.artImg.atlas).sort(),sheets:Object.keys(g.artImg.sheets)};
  });
  expect(r.n,'pictures applied (is a dev server without FF_ART_DIR running on the test port?)').toBe(4);
  expect(r.loaded).toEqual(['crack.1','heart','swFe']);
  expect(r.sheets).toEqual(['stag']);
  expect(r.swFe).toEqual([255,0,255,255]);
  expect(r.crack).toEqual([0,255,0,255]);
  expect(r.crack0).not.toEqual([0,255,0,255]);
  // heart.png is 32×32: scaled into the cell, with a warning
  expect(r.heart).toEqual([0,0,255,255]);
  expect(r.stag).toEqual([0,255,255,255]);
  // a name with no cell and a folder that isn't atlas/ or sheets/ are skipped with warnings, not errors
  expect(warns.some(w=>w.includes('no atlas cell "noSuchCell"'))).toBe(true);
  expect(warns.some(w=>w.includes('atlas/heart is 32×32'))).toBe(true);
  expect(warns.some(w=>w.includes('ignoring')&&w.includes('misc/stray.png'))).toBe(true);
  expect(warns).toHaveLength(3);
});

test('hand-made art replaces the atlas cells and sprite sheets it names',async({page})=>{
  await boot(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js');await g.artReady;
    const solid=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,w,h);return c;};
    const px=(cv,x,y)=>[...cv.getContext('2d').getImageData(x,y,1,1).data];
    const list=g.artList(),[cx,cy]=g.cellXY(g.C.swFe),fv=g.SHEETS.stagT.version,f=g.SHEETS.stag;
    const cell=g.applyArt('atlas','swFe',solid(64,64)),sheet=g.applyArt('sheets','stag',solid(f.width,f.height));
    // ores keep their drawn cells in a color-vision mode
    g.SET.cb='deut';const ore=g.applyArt('atlas','copper',solid(64,64));g.SET.cb='off';
    // the export stays the drawn art, and names that aren't a whole cell name are rejected
    const origCell=await new Promise(res=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=64;c.height=64;c.getContext('2d').drawImage(i,0,0);res(px(c,32,32));};
      const a=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){};i.src=g.artExport('atlas','swFe');HTMLAnchorElement.prototype.click=a;});
    const bad=['swFe.0','crack.x','crack.-1','crack.99','crack'].map(k=>g.applyArt('atlas',k,solid(64,64)));
    return {origCell,bad,stag:list.sheets.stag,swFe:list.atlas.swFe,crack:list.atlas['crack.2'],cell,sheet,ore,missing:g.applyArt('sheets','nope',solid(8,8)),
      cellPx:px(g.atlas,cx+32,cy+32),sheetPx:px(f,f.width/2,f.height/2),bumped:g.SHEETS.stagT.version>fv};
  });
  expect(r.stag).toBe('480×112');
  expect(r.swFe).toBe('64×64');
  expect(r.crack).toBe('64×64');
  expect([r.cell,r.sheet,r.ore,r.missing]).toEqual([true,true,false,false]);
  expect(r.cellPx).toEqual([255,0,0,255]);
  expect(r.sheetPx).toEqual([255,0,0,255]);
  expect(r.bumped).toBe(true);
  expect(r.origCell).not.toEqual([255,0,0,255]);
  expect(r.bad).toEqual([false,false,false,false,false]);
});

// Weapon moves (#78) and armor sets (#37) run through the real update code with the frame loop paused,
// stepping updatePlayer()/updateProjs() by hand, since software WebGL barely moves game time.
test('weapon moves and armor sets',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player,m=g.mouse,st=k=>g.META.stats[k]||0,dt=1/30;g.setState('pause');
    const hold=(id,n=1)=>{p.inv[p.sel]={id,n};},step=(k=1)=>{for(let i=0;i<k;i++){g.updatePlayer(dt);m.lp=false;}},press=()=>{m.l=true;m.lp=true;step();},let_go=()=>{m.l=false;step();};
    const out={};m.wx=p.x+4;m.wy=p.y+1;
    // every recipe names real items, and every new item has an atlas cell
    out.badRecipe=g.RECIPES.filter(r=>!g.ITEMS[r[0]]||r[2].some(([i])=>!g.ITEMS[i])).map(r=>r[0]);
    out.noCell=['helm_warden','mail_sky','legs_weave','inkarrow','piercearrow','bouncearrow'].filter(id=>!(g.ITEMS[id].cell>=0));
    // warhammer: holding at the top of the swing charges it; letting go slams with a shockwave
    hold('hamem');const sw0=st('shockwaves');press();step(40);out.charged=!!(p.swing&&p.swing.charged);let_go();step(20);out.shock=st('shockwaves')-sw0;
    // sword: a swing inside the counter window after a parry is a counter-slash
    step(10);hold('embersword');p.counterT=.5;press();out.counter=!!(p.swing&&p.swing.counter);let_go();step(20);
    // bow: letting go right as the draw fills is a Perfect shot
    hold('goldbow');p.inv[20]={id:'arrow',n:50};const pf0=st('perfects');m.l=true;step();let k=0;while(!(p.draw&&p.draw.full)&&k++<60)step();let_go();out.perfect=st('perfects')-pf0;step(10);
    // magic: casting again as the rune ring closes is a Rune cast at half the mana
    hold('inktome');p.maxMana=200;p.mana=200;const rn0=st('runes');press();out.rune=!!p.rune;let_go();g.setWorldClock(p.rune.at);p.placeT=0;const mana=p.mana;press();out.runes=st('runes')-rn0;out.runeCost=mana-p.mana;let_go();
    // ricochet arrows glance off one foe toward another the shot never pointed at
    const x=Math.floor(p.x),y=g.surf[x]+18;for(const e of g.enemies.slice())g.removeEnemy(e);
    const a=g.spawnEnemy('slime',x+4,y),b=g.spawnEnemy('slime',x+4,y+5),ha=a.hp,hb=b.hp;
    g.fireProj('rarrow',x+1,y+a.h/2,25,0,20,{src:'ranged'});for(let i=0;i<90;i++)g.updateProjs(1/60);out.ric=[a.hp<ha,b.hp<hb];
    // a cracked foe loses its armor
    const s=g.spawnEnemy('slime',x+8,y),t=g.spawnEnemy('slime',x+10,y);g.makeElite(s,'armored');g.makeElite(t,'armored');t.broke=g.worldClock+6;
    const hs=s.hp,ht=t.hp;g.hurtEnemy(s,40,1,0);g.hurtEnemy(t,40,1,0);out.crack=[hs-s.hp,ht-t.hp];
    // a full set turns its bonus on, and the tooltip says so
    p.armor=[{id:'helm_weave',n:1},{id:'mail_weave',n:1},null];out.part=[g.fullSet(),g.setMul('magic')];p.armor[2]={id:'legs_weave',n:1};out.full=[g.fullSet(),g.setMul('magic'),g.setMul('melee')];
    const el=document.querySelector('.slot[data-kind="armor"][data-i="0"]');el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:20,clientY:20}));out.tip=document.getElementById('tip').textContent;
    g.setState('play');return out;
  });
  expect(r.badRecipe).toEqual([]);
  expect(r.noCell).toEqual([]);
  expect(r.charged).toBe(true);
  expect(r.shock).toBe(1);
  expect(r.counter).toBe(true);
  expect(r.perfect).toBe(1);
  expect(r.rune).toBe(true);
  expect(r.runes).toBe(1);
  expect(r.runeCost).toBe(3);
  expect(r.ric).toEqual([true,true]);
  expect(r.crack[1]).toBeGreaterThan(r.crack[0]*1.5);
  expect(r.part).toEqual([null,1]);
  expect(r.full).toEqual(['weave',1.2,1]);
  expect(r.tip).toContain('Inkweaver set');
  expect(r.tip).toContain('3/3 worn');
});
