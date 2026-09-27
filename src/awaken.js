// World Awakening: the post-game that begins when The Unfolded falls.
import {
  reduceMotion,
  BIO,biomeAt,boss,burst,chapterCard,H,idx,makeNoise,mulberry32,player,playerSpeaker,popUp,quests,rebuildAll,
  say,seed,SFX,shake,SOLID,SPAWNX,stat,surf,T,tiles,toast,W,walls,
} from './game.js';

// ================= awakening =================
// State lives in the saved biome data: BIO.awake (1 once awakened) and BIO.creases ([x0, x1, biome] strips where
// one biome's page has folded into another; biomeAt() returns the crease's biome there). Awakened worlds also get
// Foilite ore (T.FOIL) seeded deep underground, tougher enemies (spawnEnemy, spawnLogic) and remixed spawn pools.
// Saves that beat The Unfolded before this existed awaken the first time they are played.
export const isAwake=()=>!!(BIO&&BIO.awake);
// creases: 3+ strips away from the town, the Ink Lake, camps and the shrine, each remixed to a biome other than the one it cuts through
function planCreases(rng){const out=[],n=Math.max(3,Math.round(W/140)),lake=BIO.lake||[-1e4,0];
  for(let a=0;a<60&&out.length<n;a++){const w=Math.round(18+rng()*12),x0=Math.floor(12+rng()*(W-24-w)),x1=x0+w,cx=(x0+x1)/2;
    if(Math.abs(cx-SPAWNX)<45+w/2||Math.abs(cx-lake[0])<lake[1]+14+w/2||out.some(c=>Math.abs((c[0]+c[1])/2-cx)<40+w))continue;
    if((BIO.camps||[]).some(c=>x1>=c.x0-5&&x0<=c.x0+16)||BIO.shrine&&x1>=BIO.shrine[0]-16&&x0<=BIO.shrine[0]+16)continue;
    const base=biomeAt(cx,surf[Math.floor(cx)]);if(base==='lake'||base==='under')continue;
    const pool=['forest','snow','desert'].filter(b=>b!==base);out.push([x0,x1,pool[Math.floor(rng()*pool.length)]]);}
  return out;}
const TOP={snow:T.SNOW,desert:T.SAND,forest:T.GRASS},FILL={snow:T.SNOW,desert:T.SAND,forest:T.DIRT};
const SOFT=new Set([T.GRASS,T.DIRT,T.SNOW,T.SAND]),DECOR=new Set([T.TUFT,T.FLOWER,T.FLOWER2,T.BLOOM]);
// rewrites natural ground only: anything with a placed background wall (walls>=2) is left alone
function remix(c,nz,k){const[x0,x1,b]=c;
  for(let y=Math.max(BIO.uw+8,1);y<H-1;y++){const e0=Math.round((nz.n2(y/5,k*7.3)-.5)*6),e1=Math.round((nz.n2(y/5+40,k*7.3)-.5)*6);
    for(let x=Math.max(1,x0+e0);x<=Math.min(W-2,x1+e1);x++){const s=surf[x];if(y<s-45||y>s+1)continue;const i=idx(x,y),t=tiles[i];if(walls[i]>=2||y===s+1)continue;
      if(SOFT.has(t)){const top=y>=s-1&&!SOLID[tiles[i+W]];tiles[i]=top?TOP[b]:FILL[b];if(top&&DECOR.has(tiles[i+W]))tiles[i+W]=b==='snow'?T.BLOOM:b==='forest'?T.TUFT:T.AIR;}
      else if((t===T.STONE||t===T.ICE)&&y<s-6)tiles[i]=b==='snow'&&nz.fbm(x/9+30,y/9,2)>.56?T.ICE:T.STONE;}}}
// Foilite: small veins in natural stone, ice, inkstone and ash, at least 30 tiles down
function seedFoil(nz){let n=0;const ok=new Set([T.STONE,T.ICE,T.INKSTONE,T.ASH]);
  for(let x=2;x<W-2;x++){const s=surf[x];for(let y=4;y<s-30;y++){const i=idx(x,y);if(!ok.has(tiles[i])||walls[i]>=2)continue;if(nz.n2(x/3.6+4400,y/3.6+4400)>.87){tiles[i]=T.FOIL;n++;}}}
  return n;}
export function awakenWorld(){if(isAwake()||!BIO.uw)return;const rng=mulberry32(seed+5150),nz=makeNoise(seed+5151);
  BIO.creases=planCreases(rng);BIO.creases.forEach((c,k)=>remix(c,nz,k));BIO.foil=seedFoil(nz);BIO.awake=1;rebuildAll();}
// the story beat: a moment after The Unfolded falls (or when an old save that already beat it is played)
let awT=3;
export function updateAwaken(dt){if(!quests.unfolded||isAwake()||boss||player.dead){awT=3;return;}if((awT-=dt)>0)return;
  awakenWorld();stat('awakened');SFX.boom();shake(.8);burst(player.x,player.y+1,['#f4f0e6','#e9dcc0','#b06ad0','#fbf8f0'],70,10,{grav:0,life:1.4,bright:1});
  chapterCard(null,'The World Awakens','Every page remembers how to fold','Epilogue');if(!reduceMotion())popUp();
  toast('Creases split the land, Foilite glints in the deep, and the monsters grow bolder.','gold');
  say(playerSpeaker(),['{surprised}The ground is *humming*... like every page just ~unfolded~ at once.','{neutral}The First Page let go. The land has creased where one place folded into another.','{happy}Nobody is holding the pages shut anymore. The world is *folding itself*.','{happy}And something new glints down deep. Time for a *sharper pickaxe.*'],{wait:3});}
