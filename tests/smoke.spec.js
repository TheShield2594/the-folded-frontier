// Smoke tests: boot, new world, save/load through localStorage, seasonal routes and secrets in the save, save code round trip, hand-made art overrides.
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
    const top=x=>{let y=g.H-8;while(y>4&&!g.isSolid(x,y))y--;return y;},nat=[g.T.GRASS,g.T.DIRT,g.T.SAND,g.T.SNOW,g.T.STONE];
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
  expect(r).toContain('Small 420×170');
});

test('hand-made art replaces the atlas cells and sprite sheets it names',async({page})=>{
  await boot(page);
  const r=await page.evaluate(async()=>{
    const g=await import('/src/game.js');await g.artReady;
    const solid=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,w,h);return c;};
    const px=(cv,x,y)=>[...cv.getContext('2d').getImageData(x,y,1,1).data];
    const list=g.artList(),[cx,cy]=g.cellXY(g.C.swFe),fv=g.SHEETS.folioT.version,f=g.SHEETS.folio;
    const cell=g.applyArt('atlas','swFe',solid(64,64)),sheet=g.applyArt('sheets','folio',solid(f.width,f.height));
    // ores keep their drawn cells in a color-vision mode
    g.SET.cb='deut';const ore=g.applyArt('atlas','copper',solid(64,64));g.SET.cb='off';
    // the export stays the drawn art, and names that aren't a whole cell name are rejected
    const origCell=await new Promise(res=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=64;c.height=64;c.getContext('2d').drawImage(i,0,0);res(px(c,32,32));};
      const a=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){};i.src=g.artExport('atlas','swFe');HTMLAnchorElement.prototype.click=a;});
    const bad=['swFe.0','crack.x','crack.-1','crack.99','crack'].map(k=>g.applyArt('atlas',k,solid(64,64)));
    return {origCell,bad,folio:list.sheets.folio,swFe:list.atlas.swFe,crack:list.atlas['crack.2'],cell,sheet,ore,missing:g.applyArt('sheets','nope',solid(8,8)),
      cellPx:px(g.atlas,cx+32,cy+32),sheetPx:px(f,f.width/2,f.height/2),bumped:g.SHEETS.folioT.version>fv};
  });
  expect(r.folio).toBe('680×280');
  expect(r.swFe).toBe('64×64');
  expect(r.crack).toBe('64×64');
  expect([r.cell,r.sheet,r.ore,r.missing]).toEqual([true,true,false,false]);
  expect(r.cellPx).toEqual([255,0,0,255]);
  expect(r.sheetPx).toEqual([255,0,0,255]);
  expect(r.bumped).toBe(true);
  expect(r.origCell).not.toEqual([255,0,0,255]);
  expect(r.bad).toEqual([false,false,false,false,false]);
});
