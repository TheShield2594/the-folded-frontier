// Smoke tests: boot, portraits from the rig, new world, the Hollow Archive, save/load through localStorage, seasonal routes and secrets in the save, the vertical layers and the clocktower, save code round trip, hand-made art (atlas cells, sheets and rig parts) loaded from files at boot and applied directly.
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

test('the storybook intro reads its pages, turns them and can be skipped',async({page})=>{
  await boot(page);
  // turn the intro on for this world (the tests boot with it off); no sound, so the pages are timed, not spoken
  await page.evaluate(async()=>{(await import('/src/game.js')).SET.intro=true;});
  await page.click('#newBtn');
  await page.fill('#seedIn',SEED);
  await page.click('#sizeSeg button[data-s="s"]');
  await page.click('#createBtn');
  await page.waitForFunction(async()=>(await import('/src/game.js')).state==='intro');
  const pages=await page.evaluate(async()=>(await import('/src/game.js')).INTRO.length);
  expect(pages).toBeGreaterThanOrEqual(5);
  await expect(page.locator('#introNo')).toHaveText(`1 / ${pages}`);
  await expect(page.locator('#introTxt p').first()).toContainText('First Page');
  // once the narration has started (its first paragraph shows), Space turns the page
  await expect(page.locator('#introTxt p.on').first()).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.locator('#introNo')).toHaveText(`2 / ${pages}`);
  await expect(page.locator('#introTxt p').first()).toContainText('Folders');
  expect(await page.evaluate(async()=>(await import('/src/game.js')).state)).toBe('intro');
  // Esc skips the rest of the story into the world
  await page.keyboard.press('Escape');
  await page.waitForFunction(async()=>{const g=await import('/src/game.js');return g.state==='play'||g.state==='talk';});
  await expect(page.locator('#intro')).toBeHidden();
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

test('save versions: unversioned saves are upgraded, newer saves and codes are refused with a message',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  await markWorld(page);
  await pauseGame(page);
  const before=await snapshot(page),saved=await savedWorld(page);
  const cur=await page.evaluate(async()=>(await import('/src/game.js')).SAVE_VER);
  expect(saved.v).toBe(cur);

  // a save with no version is v0: every migration step runs and the world still loads
  const r=await page.evaluate(async sv=>{const g=await import('/src/game.js');const old=JSON.parse(JSON.stringify(sv));delete old.v;g.loadWorld(old);return window.__snap(g);},saved);
  for(const k of['seed','size','W','H','tiles','coins','inv'])expect(r[k],k).toEqual(before[k]);

  // a save from a newer build is kept and refused with a clear message on Continue, not loaded wrong
  await page.evaluate(sv=>localStorage.setItem('folded-frontier-save-v1',JSON.stringify({...sv,v:sv.v+1})),saved);
  await page.reload();
  await expect(page.locator('.toast',{hasText:'newer version'})).toBeVisible();
  await expect(page.locator('#contBtn')).toBeVisible();
  await page.click('#contBtn');
  await expect(page.locator('#title')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('folded-frontier-save-v1')).v)).toBe(cur+1);

  // save codes carry the version too: a code from a newer build says so in the code box
  const code=await page.evaluate(async sv=>{const b=new Blob([JSON.stringify({v:sv.v+1,save:sv,meta:{}})]).stream().pipeThrough(new CompressionStream('gzip'));
    const u8=new Uint8Array(await new Response(b).arrayBuffer());let s='';for(const c of u8)s+=String.fromCharCode(c);return 'FF1:'+btoa(s);},saved);
  await page.click('#code2Btn');
  await page.fill('#codeTxt',code);
  await page.click('#codeLoad');
  await expect(page.locator('#codeMsg')).toContainText('newer version');
  await expect(page.locator('#codeBox')).toBeVisible();
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

// Trading cards (#67): cards come from chests and packs, a binder files them, a full page pays its reward, and the
// collection is saved per world. updateCards() runs by hand, as the frame loop barely moves in software WebGL.
test('trading cards: chests and packs give them, a binder files them, a full page pays out, and the collection is saved',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),P=g.player,out={},cardsIn=()=>P.inv.filter(x=>x&&g.ITEMS[x.id].card).reduce((a,x)=>a+x.n,0),rar=id=>g.CARDS.find(c=>c[0]===g.ITEMS[id].card)[2];
    // buried treasure always holds one; card faces are painted over the card backs at boot (and again once the boot art is in)
    await g.artReady;
    out.treasure=g.treasureLoot().some(x=>x&&g.ITEMS[x.id].card);
    // compared over the whole cell: a face and a back share the frame, and the paper grain alone moves single pixels (by about
    // 2.5 on average between two paints of the same face), while the picture moves the cell by about 14
    const cell=c=>{const[x,y]=g.cellXY(c);return g.atlas.getContext('2d').getImageData(x,y,64,64).data;},fa=cell(g.C.card_king),ba=cell(g.CARDBACK[2]);
    let dv=0;for(let i=0;i<fa.length;i++)dv+=Math.abs(fa[i]-ba[i]);out.painted=dv/fa.length>8;
    // a pack gives three cards, one Rare or better; without a binder they stay in the backpack
    g.openPack(0);const got=P.inv.filter(x=>x&&g.ITEMS[x.id].card);out.pack=cardsIn();out.best=Math.max(...got.map(x=>rar(x.id)));g.updateCards(1);out.kept=cardsIn();out.hint=g.cards.hint;
    // with a binder they file themselves in; a full page pays its reward once
    g.addItem('binder',1);g.updateCards(1);out.filed=Object.values(g.cards.have).reduce((a,b)=>a+b,0);out.left=cardsIn();
    const packs=g.countItem('cardpack'),coins=P.coins;for(const c of g.CARDS.filter(c=>c[4]==='field'))g.addItem('card_'+c[0],1);g.updateCards(1);g.updateCards(1);
    out.page=g.cards.pg.field;out.reward=[g.countItem('cardpack')-packs,P.coins-coins];out.html=g.binderHTML().includes('Field Guide · 8/8');
    out.tab=!!document.querySelector('#tabs [data-tab="binder"]');
    // saved per world; unknown cards are dropped on load, and older saves start with an empty binder
    g.save();const sv=JSON.parse(localStorage.getItem('folded-frontier-save-v1'));out.saved=Object.keys(sv.cards.have).length;
    sv.cards.have.bogus=2;const k0=Object.keys(sv.cards.have)[0];g.loadWorld(JSON.parse(JSON.stringify(sv)));out.loaded=Object.keys(g.cards.have).length;out.bogus='bogus' in g.cards.have;out.pgKept=g.cards.pg.field;
    // a count that isn't a whole number and a page this build doesn't know are dropped too
    const bad=JSON.parse(JSON.stringify(sv));bad.cards.have[k0]='1';bad.cards.pg.nope=1;g.loadWorld(bad);out.strCount=k0 in g.cards.have;out.badPage='nope' in g.cards.pg;
    delete sv.cards;g.loadWorld(sv);out.old=Object.keys(g.cards.have).length;return out;
  });
  expect(s.treasure).toBe(true);
  expect(s.painted).toBe(true);
  expect(s.pack).toBe(3);
  expect(s.best).toBeGreaterThanOrEqual(1);
  expect(s.kept).toBe(3);
  expect(s.hint).toBe(1);
  expect(s.filed).toBe(3);
  expect(s.left).toBe(0);
  expect(s.page).toBe(1);
  expect(s.reward).toEqual([2,300]);
  expect(s.html).toBe(true);
  expect(s.tab).toBe(true);
  expect(s.saved).toBeGreaterThanOrEqual(8);
  expect(s.loaded).toBe(s.saved);
  expect(s.bogus).toBe(false);
  expect(s.pgKept).toBe(1);
  expect(s.strCount).toBe(false);
  expect(s.badPage).toBe(false);
  expect(s.old).toBe(0);
});

// The backpack book (#142) and its quality of life (#145): the left page (Crafting, a tab's page, a chest or a shop) sits
// beside the backpack and neither moves when the tabs change; chest buttons, sort by kind, recipes that take any fish on one
// row, Ctrl-click to craft as many as you can, Used in on item cards, owned counts and the sell box on shop pages.
test('the backpack is one book: pages side by side, chest buttons, sort, grouped recipes, Max, shop counts and selling',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const s=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),P=g.player,out={},$=id=>document.getElementById(id),shown=id=>!$(id).hidden;
    for(let i=10;i<40;i++)P.inv[i]=null;g.setInv(true);g.refreshUI();
    const L=$('leftPage'),R=$('rightPage');out.book=[L.offsetTop===R.offsetTop,L.offsetLeft+L.offsetWidth===R.offsetLeft,L.offsetWidth===R.offsetWidth,L.offsetHeight===R.offsetHeight];
    out.craft=shown('craft')&&!shown('sideSheet');
    // tabs turn the left page only
    const x0=R.offsetLeft;g.setTab('bestiary');out.best=!shown('craft')&&shown('sideSheet')&&R.offsetLeft===x0;g.setTab('craft');out.back=shown('craft')&&!shown('sideSheet')&&R.offsetLeft===x0;
    // a chest: ten slots to a row like the backpack, and its three buttons (the hotbar stays put)
    const k=5,box=Array(20).fill(null);box[0]={id:'wood',n:10};g.chests.set(k,box);P.inv[12]={id:'wood',n:5};P.inv[13]={id:'dirt',n:7};const hot=JSON.stringify(P.inv.slice(0,10));
    g.openSide('chest',k);g.refreshUI();const cs=[...$('sideBody').querySelectorAll('.slot')];out.row=cs.filter(el=>el.offsetTop===cs[0].offsetTop).length;
    const btn=c=>{$('sideBody').querySelector(`.chestBtns [data-c="${c}"]`).click();g.refreshUI();};
    btn('stack');out.stack=[box[0].n,P.inv[12],P.inv[13]&&P.inv[13].id];
    btn('dep');out.dep=[box.filter(Boolean).map(b=>b.id+b.n).join(),P.inv.slice(10).every(x=>!x),JSON.stringify(P.inv.slice(0,10))===hot];
    const w0=g.countItem('wood'),d0=g.countItem('dirt');btn('loot');out.loot=[box.every(x=>!x),g.countItem('wood')-w0,g.countItem('dirt')-d0];
    g.setTab('craft');
    // Sort: by kind (tools, weapons, armor, gear, potions, building, other), then name
    for(let i=10;i<40;i++)P.inv[i]=null;[['ironbar',2],['dirt',5],['potion',1],['ironsword',1],['ironpick',1],['copperbar',3]].forEach(([id,n],i)=>P.inv[10+i]={id,n});
    $('sortBtn').click();out.sort=P.inv.slice(10,16).map(x=>x&&x.id);
    // Grilled Fish is one row for every fish, and Ctrl-click makes as many as the fish allow
    const px=Math.floor(P.x),py=Math.floor(P.y+.5);g.tiles[g.idx(px+1,py)]=g.T.FURNACE;
    for(let i=10;i<40;i++)P.inv[i]=null;P.inv[20]={id:'minnow',n:4};P.inv[21]={id:'koi',n:2};
    $('craftQ').value='grilled';$('craftQ').dispatchEvent(new Event('input'));g.refreshUI();
    const rows=[...$('recipes').querySelectorAll('.rec')].filter(el=>el.querySelector('.nm').textContent.startsWith('Grilled Fish'));out.rows=rows.length;out.variants=rows[0]&&rows[0].dataset.r.split(',').length;out.can=rows[0]&&rows[0].classList.contains('can');
    rows[0].dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,ctrlKey:true}));out.max=[g.countItem('grilledfish'),g.countItem('minnow'),g.countItem('koi')];
    $('craftQ').value='';$('craftQ').dispatchEvent(new Event('input'));
    // the item card lists what an item goes into
    P.inv[22]={id:'ironbar',n:1};g.refreshUI();$('grid').children[22].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));out.used=$('tip').innerHTML.includes('Used in');
    // a shop: headings over a long list, how many you own, and the sell box
    P.inv[23]={id:'torch',n:9};g.openSide('shop',null,g.SHOP,'Merchant');g.refreshUI();
    out.heads=$('sideBody').querySelectorAll('.shopH').length;const trow=[...$('sideBody').querySelectorAll('.shopi')].find(el=>el.textContent.includes('Torch'));out.own=[trow&&trow.querySelector('.own')&&trow.querySelector('.own').textContent,'Have '+g.countItem('torch')];
    P.coins=0;g.updateCoins();g.setCursor({id:'ironbar',n:3});g.setInvDirty(true);g.refreshUI();out.sellTxt=$('sellBox').textContent;$('sellBox').click();out.sold=[P.coins,g.cursor];
    return out;
  });
  expect(s.book).toEqual([true,true,true,true]);
  expect(s.craft).toBe(true);
  expect(s.best).toBe(true);
  expect(s.back).toBe(true);
  expect(s.row).toBe(10);
  expect(s.stack).toEqual([15,null,'dirt']);
  expect(s.dep).toEqual(['wood15,dirt7',true,true]);
  expect(s.loot).toEqual([true,15,7]);
  expect(s.sort).toEqual(['ironpick','ironsword','potion','dirt','copperbar','ironbar']);
  expect(s.rows).toBe(1);
  expect(s.variants).toBeGreaterThan(5);
  expect(s.can).toBe(true);
  expect(s.max).toEqual([4,0,0]);
  expect(s.used).toBe(true);
  expect(s.heads).toBeGreaterThan(1);
  expect(s.own[0]).toBe(s.own[1]);
  expect(s.sellTxt).toContain('6 coins');
  expect(s.sold).toEqual([6,null]);
  // on a small screen the whole book zooms down to fit instead of wrapping
  await page.setViewportSize({width:640,height:360});
  // (resize events come with the next frame, which is slow in software WebGL)
  await page.waitForFunction(()=>+document.getElementById('spread').style.zoom>0);
  const z=await page.evaluate(()=>{const sp=document.getElementById('spread'),pn=document.getElementById('panel'),k=+sp.style.zoom;
    return {k,fits:sp.offsetWidth*k<=pn.clientWidth&&sp.offsetHeight*k<=pn.clientHeight};});
  expect(z.k).toBeLessThan(1);
  expect(z.fits).toBe(true);
});

// Atlas cells are allocated in order around the two bands of 256px tree canopies; none may land in a band or past the atlas.
test('atlas cells stay clear of the canopy regions',async({page})=>{
  await boot(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),bad=[],regions=[...g.C.canopy,...g.C.canopyFall,g.C.canopyWinter,g.C.canopySpring];
    for(const k in g.C){if(k.startsWith('canopy'))continue;const v=g.C[k];const cs=Array.isArray(v)?v.map((c,i)=>[k+'.'+i,c]):[[k,v]];
      for(const[n,c]of cs){if(typeof c!=='number')continue;const[x,y]=g.cellXY(c);
        if(y+64>g.ATH||regions.some(([rx,ry])=>x<rx+256&&x+64>rx&&y<ry+256&&y+64>ry))bad.push(n);}}
    return {bad,cards:g.cellXY(g.C.card_unfolded)[1]};
  });
  expect(r.bad).toEqual([]);
  expect(r.cards).toBeGreaterThanOrEqual(2048);
});

// The dev server globs the art from tests/fixtures/art/ (FF_ART_DIR in playwright.config.js), so this covers
// finding the files, reading their paths and the loadArt() call at boot.
test('art files are found and painted in at boot',async({page})=>{
  const warns=[];page.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('art:'))warns.push(m.text());});
  await boot(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),n=await g.artReady;
    const px=(cv,x,y)=>[...cv.getContext('2d').getImageData(x,y,1,1).data];
    const cell=k=>{const[x,y]=g.cellXY(k);return px(g.atlas,x+32,y+32);},f=g.SHEETS.stag;
    // a rig part: baked into the skin the green slime wears, not the blue one's (the same rig), and into its still picture
    const body=S=>{const c=S.cells[g.RIGS.slime.pi.body][''];return px(S.img,c.ax+c.w/2|0,c.ay+c.h/2|0);},yellow=p=>p[0]>200&&p[1]>200&&p[2]<90;
    const sl=g.SHEETS.slime,sp=[...sl.getContext('2d').getImageData(0,0,sl.width,sl.height).data].reduce((n,v,i,a)=>n+(i%4===0&&yellow(a.slice(i,i+3))),0);
    return {n,swFe:cell(g.C.swFe),crack:cell(g.C.crack[1]),crack0:cell(g.C.crack[0]),heart:cell(g.C.heart),stag:px(f,f.width/2,f.height/2),
      loaded:Object.keys(g.artImg.atlas).sort(),sheets:Object.keys(g.artImg.sheets),rigs:Object.keys(g.artImg.rigs),
      green:yellow(body(g.rigSkin('slime',g.FOERIG.slime[1],'slime'))),blue:yellow(body(g.rigSkin('slime',g.FOERIG.bslime[1],'bslime'))),still:sp>50};
  });
  expect(r.n,'pictures applied from tests/fixtures/art/').toBe(5);
  expect(r.loaded).toEqual(['crack.1','heart','swFe']);
  expect(r.sheets).toEqual(['stag']);
  expect(r.swFe).toEqual([255,0,255,255]);
  expect(r.crack).toEqual([0,255,0,255]);
  expect(r.crack0).not.toEqual([0,255,0,255]);
  // heart.png is 32×32: scaled into the cell, with a warning
  expect(r.heart).toEqual([0,0,255,255]);
  expect(r.stag).toEqual([0,255,255,255]);
  expect(r.rigs).toEqual(['slime@slime.body']);
  expect([r.green,r.blue,r.still]).toEqual([true,false,true]);
  // a name with no cell or part and a folder that isn't atlas/, sheets/ or rigs/ are skipped with warnings, not errors
  expect(warns.some(w=>w.includes('no atlas cell "noSuchCell"'))).toBe(true);
  expect(warns.some(w=>w.includes('atlas/heart is 32×32'))).toBe(true);
  expect(warns.some(w=>w.includes('ignoring')&&w.includes('misc/stray.png'))).toBe(true);
  expect(warns.some(w=>w.includes('no rig part "slime.nope"'))).toBe(true);
  expect(warns).toHaveLength(4);
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
    // rig parts: listed at their drawn size, exported as drawn, and applied to every skin of the rig
    const a=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){};const rigExp=!!g.artExport('rigs','king.crown');HTMLAnchorElement.prototype.click=a;
    const rig=[g.applyArt('rigs','king.crown',solid(20,20)),g.applyArt('rigs','king.nope',solid(8,8)),g.applyArt('rigs','king.eyes.wink',solid(8,8)),g.applyArt('rigs','king.eyes.blink',solid(8,8))];
    const kS=g.rigSkin('king',g.FOERIG.king[1],'king'),kc=kS.cells[g.RIGS.king.pi.crown][''],crownPx=px(kS.img,kc.ax+kc.w/2|0,kc.ay+kc.h/2|0);
    return {origCell,bad,stag:list.sheets.stag,swFe:list.atlas.swFe,crack:list.atlas['crack.2'],cell,sheet,ore,missing:g.applyArt('sheets','nope',solid(8,8)),
      cellPx:px(g.atlas,cx+32,cy+32),sheetPx:px(f,f.width/2,f.height/2),bumped:g.SHEETS.stagT.version>fv,
      slimeBody:list.rigs['slime.body'],kingBlink:list.rigs['king.eyes.blink'],rigExp,rig,crownPx};
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
  expect(r.slimeBody).toBe('80×53');
  expect(r.kingBlink).toMatch(/^\d+×\d+$/);
  expect(r.rigExp).toBe(true);
  expect(r.rig).toEqual([true,false,false,true]);
  expect(r.crownPx[0]).toBeGreaterThan(200);expect(r.crownPx[1]).toBeLessThan(60);
});

// The painted hero (issue #128): once H.head/H.torso/H.arm/H.leg are in, the player swaps from the drawn human rig to the
// hero rig, whose limbs bend over two bones, whose pieces take the look's colours through their masks, and which keeps
// the human rig's part and clip names so gameplay runs on it unchanged.
test('the painted hero rig takes over the player once its pictures load',async({page})=>{
  await boot(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js');await g.artReady;
    const solid=(w,h,c)=>{const v=document.createElement('canvas');v.width=w;v.height=h;const x=v.getContext('2d');x.fillStyle=c;x.fillRect(0,0,w,h);return v;};
    const before=g.player.rig.k,bad=g.applyArt('rigs','H.nope',solid(8,8,'#fff'));
    // a mid-grey tunic whose mask marks it all as tunic, so the look's shirt colour comes through
    g.applyArt('rigs','H.torso.mask',solid(40,40,'#ff0000'));g.applyArt('rigs','H.torso',solid(40,40,'#808080'));
    for(const n of['head','arm','leg'])g.applyArt('rigs','H.'+n,solid(40,60,'#c08060'));
    // hair, a hat, the cape and the gripping fist are pieces too; the fist only shows while the hand holds something
    const extra=['H.hair.short','H.hat.cap','H.cape.b','H.arm.grip','H.fist','H.helm.fe','H.mail.fe','H.brace.fe','H.greave.fe'].map(n=>g.applyArt('rigs',n,solid(20,20,'#a0a0a0')));
    const R=g.player.rig,look=g.playerLook({tunic:1},[]),sk=g.rigSkin('hero',look,null),tc=sk.cells[R.d.pi.torso][''];
    const px=[...sk.img.getContext('2d').getImageData(tc.ax+tc.w/2|0,tc.ay+tc.h/2|0,1,1).data];
    // a knee bent in the walk moves the foot off the thigh's straight line
    g.rigPlay(R,'walk',{t:0});g.rigUpdate(R,1);const hip=g.rigJoint(R,'legA'),knee=g.rigJoint(R,'shinA'),foot=g.rigPt(R,'shinA',0,28);
    const straight=Math.abs((knee[0]-hip[0])*(foot[1]-hip[1])-(knee[1]-hip[1])*(foot[0]-hip[0]))<1e-4;
    const clips=['idle','walk','jump','fall','land','dash','hurt','death','sw0','sw3','hold','climb','cheer','reel','mine0','bow','cast','block','parry'].filter(c=>!R.d.clips[c]);
    const pic=g.rigPic('hero',look,'walk',.25,undefined,undefined,2),a=pic.getContext('2d').getImageData(0,0,pic.width,pic.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i]>0)n++;
    const fi=R.d.pi.fist,held=()=>{g.rigUpdate(R,0);return R.vis[fi];};g.rigHold(R,'held',null);const noFist=!held();g.rigHold(R,'held',solid(16,16,'#fff'));const fist=!!held();g.rigHold(R,'held',null);
    const aL=g.playerLook({},[{id:'helmfe'},{id:'mailfe'},{id:'legs_warden'}]),armK=[aL.helmK,aL.mailK,aL.greavesK];
    return {armK,extra,noFist,fist,before,bad,kind:R.k,mesh:g.player.mesh===R.mesh,parts:['armA','held','shield','head','hair','hat','cape','accF','fist','helm','mail','braceA','greaveA'].every(k=>R.d.pi[k]!=null),px,straight,clips,filled:n,edge:R.mat.uniforms.uEdge.value.y>0};
  });
  expect(r.before).toBe('human');
  expect(r.bad).toBe(false);
  expect(r.kind).toBe('hero');
  expect(r.extra).toEqual(Array(9).fill(true));
  expect(r.armK).toEqual(['fe','fe','warden']);
  expect([r.noFist,r.fist]).toEqual([true,true]);
  expect(r.mesh).toBe(true);
  expect(r.parts).toBe(true);
  expect(r.clips).toEqual([]);
  expect(r.straight).toBe(false);
  expect(r.filled).toBeGreaterThan(1000);
  expect(r.edge).toBe(true);
  // #d4483b is the second shirt colour: the grey tunic comes out red
  expect(r.px[0]).toBeGreaterThan(r.px[1]+60);expect(r.px[0]).toBeGreaterThan(r.px[2]+60);
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

// Jump shape (#134), stepped by hand in a cleared box underground: a held jump reaches the old height (about 4.2 tiles) within a
// few percent, a tap is a short hop, the fall is quicker than the rise, a head that clips a ceiling corner slides past it, a foot that
// clips a ledge's corner is lifted onto it, and a staircase eases the drawn body up instead of popping.
test('jump shape',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player,t=g.touch,dt=1/60;g.setState('pause');
    const x0=30,y0=Math.floor(g.H*.3),set=(x,y,v)=>{g.tiles[g.idx(x,y)]=v;};
    const room=()=>{for(let x=x0;x<x0+40;x++)for(let y=y0;y<y0+14;y++)set(x,y,y===y0||y===y0+13?g.T.STONE:g.T.AIR);};
    const place=x=>{p.x=x;p.y=y0+1;p.vx=p.vy=0;p.jbuf=0;p.stepOff=0;for(let i=0;i<5;i++)g.updatePlayer(dt);};
    // jump, holding it for hold seconds (Infinity: the whole way); returns the peak and the frames up and down
    const jump=(hold,dx=0)=>{t.held.jump=true;if(dx)t.held.right=true;g.jumpPress();let top=0,up=0,down=0,f=0;
      for(let i=0;i<300;i++){f+=dt;if(f>hold)t.held.jump=false;g.updatePlayer(dt);top=Math.max(top,p.y-y0-1);if(p.vy>0)up++;else if(!p.onGround)down++;if(p.onGround&&i>2)break;}
      t.held.jump=t.held.right=false;return{top,up,down};};
    const out={};room();
    place(x0+10);out.full=jump(Infinity);
    place(x0+10);out.tap=jump(.08);
    // a 1-tile overhang whose edge the head clips by 0.2 tiles
    room();set(x0+10,y0+3,g.T.STONE);place(x0+11+p.w/2-.2);const cx=p.x;out.corner=jump(Infinity);out.nudge=p.x-cx;
    // a foot 0.2 tiles under a ledge's top while moving into it and rising
    room();for(let y=y0+1;y<=y0+2;y++)set(x0+12,y,g.T.STONE);p.x=x0+12-p.w/2-.05;p.y=y0+2.8;p.vx=6;p.vy=2;p.onGround=false;t.held.right=true;
    for(let i=0;i<3;i++)g.updatePlayer(dt);t.held.right=false;out.ledge=p.y-y0;
    // walking up a staircase: the drawn feet (y + stepOff) never jump more than a fraction of a tile in a frame
    room();for(let s=0;s<5;s++)for(let y=y0+1;y<=y0+1+s;y++)set(x0+14+s,y,g.T.STONE);place(x0+10);t.held.right=true;
    let prev=p.y+(p.stepOff||0),maxJ=0,stepped=0;for(let i=0;i<90;i++){g.updatePlayer(dt);const v=p.y+(p.stepOff||0);maxJ=Math.max(maxJ,Math.abs(v-prev));prev=v;if(p.stepOff<-.5)stepped++;}
    t.held.right=false;out.climbed=p.y-y0-1;out.maxJ=maxJ;out.stepped=stepped;return out;
  });
  expect(r.full.top).toBeGreaterThan(4.05);expect(r.full.top).toBeLessThan(4.45);
  expect(r.tap.top).toBeGreaterThan(1.1);expect(r.tap.top).toBeLessThan(2.8);
  expect(r.full.down).toBeLessThan(r.full.up);
  expect(r.corner.top).toBeGreaterThan(3.5);expect(Math.abs(r.nudge)).toBeGreaterThan(.1);expect(Math.abs(r.nudge)).toBeLessThanOrEqual(.31);
  expect(r.ledge).toBeGreaterThanOrEqual(3);
  expect(r.climbed).toBeGreaterThanOrEqual(4);expect(r.stepped).toBeGreaterThan(0);expect(r.maxJ).toBeLessThan(.5);
});

test('camera and animation feel',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player,t=g.touch,dt=1/60;g.setState('pause');g.SET.motion='full';g.SET.shake=true;
    const x0=30,y0=Math.floor(g.H*.3),set=(x,y,v)=>{g.tiles[g.idx(x,y)]=v;};
    const room=()=>{for(let x=x0;x<x0+60;x++)for(let y=y0;y<y0+20;y++)set(x,y,y===y0||y===y0+19?g.T.STONE:g.T.AIR);};
    const step=(n=1)=>{for(let i=0;i<n;i++){g.updatePlayer(dt);g.updateCamera(dt);}};
    const place=x=>{p.x=x;p.y=y0+1;p.vx=p.vy=0;p.jbuf=0;p.stepOff=0;p.face=1;p.swing=null;step(120);};
    const out={};room();
    // a full jump on flat ground leaves the camera where it was
    place(x0+20);const cy=g.camT.y;t.held.jump=true;g.jumpPress();let dev=0,top=0;for(let i=0;i<120;i++){step();dev=Math.max(dev,Math.abs(g.camT.y-cy));top=Math.max(top,p.y-y0-1);}t.held.jump=false;
    out.jumpDev=dev;out.jumpTop=top;
    // running right: the camera leads, and the rig runs with the cape trailing
    place(x0+10);t.held.right=true;let clips=new Set(),cape=0;for(let i=0;i<120;i++){step();clips.add(p.rig.c);if(p.rig.sa)cape=Math.max(cape,p.rig.sa[p.rig.d.pi.cape]);}
    out.lead=g.camT.x-p.x;out.ran=clips.has('run');out.cape=cape;
    // reversing at speed skids before the flip
    t.held.right=false;t.held.left=true;step();out.skid=p.rig.c;out.skidFace=p.face;step(20);out.after=p.face;t.held.left=false;step(60);
    // a long drop: a hard landing, and the cape lifts on the way down
    room();p.x=x0+20;p.y=y0+17;p.vx=p.vy=0;p.onGround=false;let lift=0,land=null;for(let i=0;i<120&&!land;i++){step();if(p.rig.sa)lift=Math.max(lift,p.rig.sa[p.rig.d.pi.cape]);if(p.onGround)land=p.rig.c;}
    out.land=land;out.lift=lift;step(60);
    // the head follows an aim up and ahead (updateCamera would put the cursor back where the mouse is, so only the player steps)
    p.face=1;p.swing={t:0,dur:9,tool:null,aim:0};g.mouse.wx=p.x+3;g.mouse.wy=p.y+1.55+3;for(let i=0;i<20;i++)g.updatePlayer(dt);out.head=p.headR;p.swing=null;
    // behind the player it doesn't turn
    p.swing={t:0,dur:9,tool:null,aim:0};g.mouse.wx=p.x-3;for(let i=0;i<20;i++)g.updatePlayer(dt);out.headBack=p.headR;p.swing=null;
    // trauma: a light hit shakes a hair, a big one shakes hard; a kick shoves the camera and springs back
    g.setTrauma(0);g.shake(.1);const light=g.trauma**2;g.setTrauma(0);g.shake(.8);const big=g.trauma**2;g.setTrauma(0);
    g.kick(1,0,.3);let kmax=0;for(let i=0;i<6;i++){step();kmax=Math.max(kmax,g.camKick.x);}step(30);
    out.light=light;out.big=big;out.kick=kmax;out.kickBack=Math.abs(g.camKick.x);
    // reduced motion turns shake and kicks off
    g.SET.motion='reduce';g.shake(.5);g.kick(1,0,.3);out.rmTrauma=g.trauma;out.rmKick=g.camKick.vx;g.SET.motion='full';
    // and turning motion off mid-shake stops what is already running
    g.shake(.8);g.kick(1,0,.3);g.punch();g.SET.motion='reduce';step();out.rmLive=[g.trauma,g.camKick.x,g.camKick.vx,g.camPunch];g.SET.motion='full';
    return out;
  });
  expect(r.jumpTop).toBeGreaterThan(4);expect(r.jumpDev).toBeLessThan(.05);
  expect(r.lead).toBeGreaterThan(1.5);expect(r.ran).toBe(true);expect(r.cape).toBeGreaterThan(.15);
  expect(r.skid).toBe('skid');expect(r.skidFace).toBe(1);expect(r.after).toBe(-1);
  expect(r.land).toBe('landh');expect(r.lift).toBeGreaterThan(.2);
  expect(r.head).toBeLessThan(-.3);expect(Math.abs(r.headBack)).toBeLessThan(.02);
  expect(r.light*1.1).toBeLessThan(.03);expect(r.big*1.1).toBeGreaterThan(.5);
  expect(r.kick).toBeGreaterThan(.2);expect(r.kick).toBeLessThan(.4);expect(r.kickBack).toBeLessThan(.02);
  expect(r.rmTrauma).toBe(0);expect(r.rmKick).toBe(0);expect(r.rmLive).toEqual([0,0,0,0]);
});

test('footsteps, landings and polish touches',async({page})=>{
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),p=g.player,t=g.touch,dt=1/60;g.setState('pause');g.SET.motion='full';g.SET.hitstop=true;
    const x0=30,y0=Math.floor(g.H*.3),set=(x,y,v)=>{g.tiles[g.idx(x,y)]=v;};
    const room=fl=>{for(let x=x0;x<x0+60;x++)for(let y=y0;y<y0+22;y++)set(x,y,y===y0?fl:y===y0+21?g.T.STONE:g.T.AIR);};
    const step=(n=1)=>{for(let i=0;i<n;i++)g.updatePlayer(dt);};
    const place=x=>{p.x=x;p.y=y0+1;p.vx=p.vy=0;p.jbuf=0;p.stepOff=0;p.face=1;p.swing=null;step(60);};
    // record the movement sounds instead of playing them
    const heard=[],spy=k=>{const f=g.SFX[k];g.SFX[k]=(...a)=>{heard.push([k,...a]);return f(...a);};};for(const k of['step','land','skid','cloth','heart'])spy(k);
    const run=fl=>{room(fl);place(x0+5);heard.length=0;t.held.right=true;let cyc=0,g0=p.gait;for(let i=0;i<150;i++){step();if(p.gait<g0)cyc++;g0=p.gait;}t.held.right=false;step(40);
      const st=heard.filter(h=>h[0]==='step');return{mats:[...new Set(st.map(h=>h[1]))],n:st.length,cyc};};
    const out={};
    const n0=g.printCount();out.sand=run(g.T.SAND);out.sandPrints=g.printCount()-n0;
    out.stone=run(g.T.STONE);out.wood=run(g.T.PLANK);out.snow=run(g.T.SNOW);out.cloud=run(g.T.CLOUD);
    // a hop lands softly, a long fall lands hard
    room(g.T.STONE);place(x0+20);heard.length=0;t.held.jump=true;g.jumpPress();step(4);t.held.jump=false;step(80);
    out.cloth=heard.some(h=>h[0]==='cloth');const hop=heard.find(h=>h[0]==='land');
    p.y=y0+19;p.vy=0;p.onGround=false;heard.length=0;step(120);const fall=heard.find(h=>h[0]==='land');
    out.hop=hop&&[hop[2],hop[3]];out.fall=fall&&[fall[2],fall[3]];
    // speed lines while dashing
    p.dashT=.2;p.dashDir=1;step(5);out.lines=g.speedLineCount();p.dashT=0;step(30);
    // slow motion eases game time down and back; reduced motion turns it off
    g.slowMo(.3);let lo=1;for(let i=0;i<6;i++)lo=Math.min(lo,g.slowScale(dt));let s=lo;for(let i=0;i<60;i++)s=g.slowScale(dt);out.slow=[lo,s];
    g.SET.motion='reduce';g.slowMo(.3);out.slowRm=g.slowScale(dt);g.SET.motion='full';
    // a connecting hit flashes the weapon
    g.hitConfirm(p.x+1,p.y+1,1);out.flash=p.hitFlash;
    // low health: a heartbeat and the red edge
    heard.length=0;p.hp=p.max*.1;step(120);out.beats=heard.filter(h=>h[0]==='heart').length;out.low=g.lowF;p.hp=p.max;step(120);out.lowAfter=g.lowF;
    return out;
  });
  expect(r.sand.mats).toEqual(['sand']);expect(r.stone.mats).toEqual(['stone']);expect(r.wood.mats).toEqual(['wood']);
  expect(r.snow.mats).toEqual(['snow']);expect(r.cloud.mats).toEqual(['cloud']);
  // two steps per stride
  expect(Math.abs(r.sand.n-2*r.sand.cyc)).toBeLessThanOrEqual(2);expect(r.sand.cyc).toBeGreaterThan(2);
  expect(r.sandPrints).toBeGreaterThan(3);
  expect(r.cloth).toBe(true);expect(r.hop).toBeTruthy();expect(r.fall).toBeTruthy();
  expect(r.fall[0]).toBeGreaterThan(r.hop[0]);expect(r.fall[1]).toBe(true);expect(r.hop[1]).toBe(false);
  expect(r.lines).toBeGreaterThan(0);
  expect(r.slow[0]).toBeLessThan(.5);expect(r.slow[1]).toBe(1);expect(r.slowRm).toBe(1);
  expect(r.flash).toBeGreaterThan(0);
  expect(r.beats).toBeGreaterThan(0);expect(r.low).toBeGreaterThan(.5);expect(r.lowAfter).toBeLessThan(.05);
});

// A gamepad is faked through navigator.getGamepads(): window.__gp holds its buttons, and each step calls
// handlePad() directly in the same task, so the frame loop can't take a press in between.
test('gamepad: menus, interact, quick heal and block',async({page})=>{
  await page.addInitScript(()=>{
    const gp={id:'Test pad',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    window.__gp=gp;navigator.getGamepads=()=>[gp];
  });
  await boot(page);
  // each step presses its buttons (down), polls, reads ev, then releases them (up, or down unless hold) and polls again
  const pad=(steps)=>page.evaluate(async steps=>{const g=await import('/src/game.js'),b=window.__gp.buttons,out=[];
    for(const s of steps){if(s.axes)window.__gp.axes=s.axes;for(const i of s.down||[])b[i].pressed=true;g.handlePad();if(s.ev)out.push(await (0,eval)(s.ev));
      for(const i of s.up||s.down||[])if(!s.hold)b[i].pressed=false;g.handlePad();}
    const f=document.querySelector('.over .padfocus');return {out,focus:f&&f.id,state:g.state};},steps);
  // the title menu: the first plain button is focused, A presses it, B backs out
  let r=await pad([{down:[1]}]);
  expect(r.focus).toBe('newBtn');
  r=await pad([{down:[0]}]);
  await expect(page.locator('#newWorld')).toBeVisible();
  expect(r.focus).toBe('createBtn');
  await pad([{down:[1]}]);
  await expect(page.locator('#newWorld')).toBeHidden();
  // the menu wraps into rows: down to Achievements, left to Settings, A opens it; a slider moves with right, B closes it
  r=await pad([{down:[13]},{down:[14]}]);
  expect(r.focus).toBe('setBtn');
  r=await pad([{down:[0]}]);
  await expect(page.locator('#settings')).toBeVisible();
  expect(r.focus).toBe('sndC');
  r=await pad([{down:[13]},{down:[15],ev:'document.getElementById("volMaster").value'}]);
  expect(r.focus).toBe('volMaster');
  expect(+r.out[0]).toBe(85);
  await pad([{down:[1]}]);
  await expect(page.locator('#settings')).toBeHidden();

  await newSmallWorld(page);
  // B reaches a peel wall beside the player; it peels, and pressing it doesn't raise a shield
  const px=await page.evaluate(async()=>{const g=await import('/src/game.js'),p=g.player;g.player.acc[0]={id:'quilt',n:1};
    const x=Math.floor(p.x)+2,y=Math.floor(p.y);for(const k of[0,1])g.setTile(x,y+k,g.T.PEEL);return x;});
  r=await pad([{down:[1],hold:1,ev:'import("/src/game.js").then(g=>[g.pad.blk,g.pad.noBlk])'}]);
  expect(r.out[0]).toEqual([false,true]);
  await page.waitForFunction(async x=>{const g=await import('/src/game.js'),p=g.player;return g.tileAt(x,Math.floor(p.y))!==g.T.PEEL;},px);
  // B held with nothing in reach blocks: out on open ground away from the cabin (the button is still held from above: release it first)
  await page.evaluate(async()=>{const g=await import('/src/game.js'),p=g.player,x=Math.floor(g.W*.85);let y=g.H-2;while(y>1&&!(g.tileAt(x,y-1)&&!g.tileAt(x,y)&&!g.tileAt(x,y+1)))y--;
    for(let dy=-1;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(g.tileAt(x+dx,y+dy)===g.T.DOOR||g.tileAt(x+dx,y+dy)===g.T.CHEST)g.setTile(x+dx,y+dy,0);p.x=x+.5;p.y=y;p.vx=p.vy=0;g.pad.aimT=0;});
  // a townsperson aimed at beyond talking range (6 tiles, as with the Reach accessory's longer aim) isn't reached
  const far=await page.evaluate(async()=>{const g=await import('/src/game.js'),p=g.player,n={x:p.x+7,y:p.y,type:'guide'};g.npcs.push(n);
    g.pad.aimT=1;g.mouse.wx=n.x;g.mouse.wy=n.y+1;const r=g.padInteract();g.mouse.rp=false;g.npcs.splice(g.npcs.indexOf(n),1);g.pad.aimT=0;return r;});
  expect(far).toBe(false);
  // Block on its own button (here R3) raises the shield through held('block'), without Interact
  const own=await page.evaluate(async()=>{const g=await import('/src/game.js'),b=window.__gp.buttons;g.SET.pad.block=11;b[11].pressed=true;g.handlePad();g.updatePlayer(1/60);const r=[g.player.blocking,g.pad.blk];
    b[11].pressed=false;g.handlePad();g.updatePlayer(1/60);r.push(g.player.blocking);g.SET.pad.block=-1;return r;});
  expect(own).toEqual([true,false,false]);
  r=await pad([{up:[1]},{down:[1],hold:1,ev:'import("/src/game.js").then(g=>g.pad.blk)'}]);
  expect(r.out[0]).toBe(true);
  // the pad dropping out while B is held lowers the shield
  const lowered=await page.evaluate(async()=>{const g=await import('/src/game.js');g.updatePlayer(1/60);const up=g.player.blocking;const gp=navigator.getGamepads;navigator.getGamepads=()=>[];g.handlePad();g.updatePlayer(1/60);const r=[up,g.player.blocking];navigator.getGamepads=gp;return r;});
  expect(lowered).toEqual([true,false]);
  await pad([{up:[1]}]);
  // D-pad up drinks a potion and no longer counts as up
  const hp=await page.evaluate(async()=>{const g=await import('/src/game.js');g.addItem('potion',1);g.player.hp=10;g.player.potT=0;window.__gp.buttons[12].pressed=true;g.handlePad();const r=[g.player.hp,g.pad.held.up,g.pad.held.heal];window.__gp.buttons[12].pressed=false;g.handlePad();return r;});
  expect(hp[0]).toBeGreaterThan(10);
  expect(hp[1]).toBe(false);
  expect(hp[2]).toBe(true);
});

test('gamepad: right stick aim reaches further with tilt, and down flattens at once',async({page})=>{
  await page.addInitScript(()=>{
    const gp={id:'Test pad',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    window.__gp=gp;navigator.getGamepads=()=>[gp];
  });
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{const g=await import('/src/game.js'),p=g.player,gp=window.__gp,out={};
    // open ground away from the cabin, settled on it
    const x=Math.floor(g.W*.85);let y=g.H-2;while(y>1&&!(g.tileAt(x,y-1)&&!g.tileAt(x,y)&&!g.tileAt(x,y+1)&&!g.tileAt(x+1,y)&&!g.tileAt(x-1,y)))y--;
    for(let dx=-1;dx<=1;dx++)g.setTile(x+dx,y-1,g.T.DIRT);p.x=x+.5;p.y=y;p.vx=p.vy=0;
    const step=(n=1)=>{for(let i=0;i<n;i++){g.handlePad();g.updatePlayer(1/60);g.updateCamera(1/60);}};
    g.pad.active=true;step(40);out.ground=p.onGround;
    // aim: a light tilt stays beside the player, a full one goes out to (but inside) reach
    const pick=p.inv.findIndex(s=>s&&g.ITEMS[s.id].pick);p.sel=pick;out.pick=pick;
    gp.axes=[0,0,.4,0];step(40);out.near=g.mouse.wx-p.x;
    gp.axes=[0,0,1,0];step(40);out.far=g.mouse.wx-p.x;out.snapped=g.mouse.wx%1;out.reach=g.reachOK(Math.floor(g.mouse.wx),Math.floor(g.mouse.wy));
    const cell=[g.mouse.wx,g.mouse.wy];gp.axes=[0,0,.97,.04];step(10);out.held=g.mouse.wx===cell[0]&&g.mouse.wy===cell[1];
    // a sudden full tilt (no easing in from a partial one) snaps to a tile in reach, in every direction
    out.fresh=[];for(const [ax,ay] of [[1,0],[-1,0],[0,-1],[.71,.71]]){gp.axes=[0,0,0,0];g.pad.aimT=0;step();gp.axes=[0,0,ax,ay];step();out.fresh.push(g.reachOK(Math.floor(g.mouse.wx),Math.floor(g.mouse.wy)));}
    gp.axes=[0,0,0,0];
    // navigating the backpack with the stick doesn't flatten the player behind it
    gp.buttons[3].pressed=true;g.handlePad();gp.buttons[3].pressed=false;g.handlePad();gp.axes=[0,.9,0,0];step(2);out.inv=[g.invOpen,!!p.flat];gp.axes=[0,0,0,0];step();g.setInv(false);step(3);
    // down on the stick flattens on the first frame; pushed more sideways than down it doesn't
    gp.axes=[0,.9,0,0];step();out.flat=p.flat;gp.axes=[0,0,0,0];step(3);out.up=!p.flat;
    gp.axes=[.9,.7,0,0];step();out.diag=p.flat;gp.axes=[0,0,0,0];step(3);p.x=x+.5;p.vx=0;step(5);
    // on a platform down drops through instead
    for(let dx=-1;dx<=1;dx++)g.setTile(x+dx,y-1,g.T.PLATFORM);step(5);out.platGround=p.onGround;
    gp.axes=[0,.9,0,0];step();out.platFlat=p.flat;gp.axes=[0,0,0,0];for(let dx=-1;dx<=1;dx++)g.setTile(x+dx,y-1,g.T.DIRT);p.x=x+.5;p.y=y;p.vx=p.vy=0;step(20);
    // D-pad down is the Flatten button: it flattens and no longer counts as down
    gp.buttons[13].pressed=true;step();out.dpad=[p.flat,g.pad.held.down];gp.buttons[13].pressed=false;step(3);
    return out;});
  expect(r.ground).toBe(true);
  expect(r.pick).toBeGreaterThanOrEqual(0);
  expect(r.near).toBeGreaterThan(.5);expect(r.near).toBeLessThan(2.6);
  expect(r.far).toBeGreaterThan(4.4);
  expect(r.snapped).toBeCloseTo(.5,5);
  expect(r.reach).toBe(true);
  expect(r.held).toBe(true);
  expect(r.fresh).toEqual([true,true,true,true]);
  expect(r.inv).toEqual([true,false]);
  expect(r.flat).toBe(true);expect(r.up).toBe(true);
  expect(r.diag).toBe(false);
  expect(r.platGround).toBe(true);expect(r.platFlat).toBe(false);
  expect(r.dpad).toEqual([true,false]);
});

test('gamepad: button names follow the controller, and rumble (combining, Low, Off)',async({page})=>{
  await page.addInitScript(()=>{
    const gp={id:'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)',connected:true,mapping:'standard',axes:[0,0,0,0],
      buttons:Array.from({length:17},()=>({pressed:false,value:0})),vibrationActuator:{playEffect:(t,o)=>{window.__rum.push([t,+o.weakMagnitude.toFixed(3),+o.strongMagnitude.toFixed(3),o.duration]);return Promise.resolve('complete');},reset:()=>{window.__rumReset++;return Promise.resolve('complete');}}};
    window.__rum=[];window.__rumReset=0;window.__gp=gp;navigator.getGamepads=()=>[gp];
  });
  await boot(page);
  await newSmallWorld(page);
  const r=await page.evaluate(async()=>{const g=await import('/src/game.js'),gp=window.__gp,b=gp.buttons,out={};
    b[3].pressed=true;g.handlePad();b[3].pressed=false;g.handlePad();g.setInv(false);
    out.ps=[g.padStyle(),g.PADNAME(0),g.PADNAME(9),document.querySelector('#padHint [data-pb="0"]').textContent,document.querySelector('#howto [data-pa="use"]').textContent];
    // taking a hit rumbles both motors (a small screen shake adds none of its own)
    window.__rum.length=0;const p=g.player;p.inv_t=0;p.hp=p.max;g.hurtPlayer(10);out.hurt=window.__rum.slice();
    // a weaker effect doesn't cut off a stronger one still playing; a stronger one combines with it, keeping each motor's max
    window.__rum.length=0;g.rumble(.2,.9,400);g.rumble(.1,.1,40);g.rumble(.95,.2,50);out.mix=window.__rum.slice();
    // Low halves every effect, Off stops them
    g.SET.rumble='low';g.rumble(1,1,500);out.low=window.__rum.at(-1);
    // and turning it Off stops the effect still playing (the Low one above), once
    g.SET.rumble='off';const n=window.__rum.length;g.rumble(1,1,900);g.shake(.9);out.off=window.__rum.length-n;out.reset=window.__rumReset;g.SET.rumble='full';
    // Settings > Button names overrides the match, and an Xbox pad isn't taken for a PlayStation one
    g.SET.padNames='nin';out.nin=g.PADNAME(0);g.SET.padNames='auto';
    gp.id='Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)';g.handlePad();out.xbox=[g.padStyle(),document.querySelector('#padHint [data-pb="0"]').textContent];
    return out;});
  expect(r.ps).toEqual(['ps','✕','Options','✕','R2']);
  expect(r.hurt.length).toBe(1);expect(r.hurt[0][0]).toBe('dual-rumble');expect(r.hurt[0][1]).toBeGreaterThan(.15);expect(r.hurt[0][2]).toBeGreaterThan(r.hurt[0][1]);
  expect(r.mix.length).toBe(2);expect(r.mix[1].slice(1,3)).toEqual([.95,.9]);expect(r.mix[1][3]).toBeGreaterThan(300);
  expect(r.low.slice(1,3)).toEqual([.5,.5]);
  expect(r.off).toBe(0);expect(r.reset).toBe(1);
  expect(r.nin).toBe('B');
  expect(r.xbox).toEqual(['xbox','A']);
});

test('gamepad: partners on the d-pad and Mount on L3, and older saved layouts move over once',async({page})=>{
  // runs after the settings the beforeEach writes, so a layout saved by an older build can stand in for them on a reload
  await page.addInitScript(()=>{const pad=sessionStorage.getItem('__pad');if(pad)localStorage.setItem('folded-frontier-settings',JSON.stringify({snd:false,intro:false,hints:false,pad:JSON.parse(pad)}));});
  await boot(page);
  let r=await page.evaluate(async()=>{const g=await import('/src/game.js');g.SET.padNames='xbox';return [g.SET.pad.partner,g.SET.pad.ability,g.SET.pad.mount,g.PADNAME(g.SET.pad.partner),g.PADNAME(g.SET.pad.ability),document.querySelector('#howto [data-pa="mount"]').textContent];});
  expect(r).toEqual([14,15,10,'D-pad ←','D-pad →','LS']);
  // settings saved by an older build: the old default layout moves over; one with the partner move rebound is left alone
  for(const [pad,want,more] of [[{jump:0,interact:1,dash:2,inv:3,pl:4,pr:5,hook:6,use:7,map:8,ability:10,partner:11,mount:-1},[15,14,10]],
    [{jump:0,interact:1,dash:2,inv:3,pl:4,pr:5,hook:6,use:7,map:8,ability:3,partner:11,mount:-1},[3,11,-1]],
    // jump rebound to d-pad up: Quick heal isn't added onto it
    [{jump:12,interact:1,dash:2,inv:3,pl:4,pr:5,hook:6,use:7,map:8,ability:10,partner:11,mount:-1},[15,14,10],{jump:12,heal:-1,flat:13}]]){
    await page.evaluate(pad=>sessionStorage.setItem('__pad',JSON.stringify(pad)),pad);
    await page.reload();
    await page.waitForFunction(async()=>(await import('/src/game.js')).state==='title');
    r=await page.evaluate(async()=>{const g=await import('/src/game.js');return [g.SET.pad.ability,g.SET.pad.partner,g.SET.pad.mount,g.SET.padV,g.SET.pad];});
    expect(r.slice(0,4)).toEqual([...want,2]);
    if(more)for(const k in more)expect(r[4][k]).toBe(more[k]);
  }
});
