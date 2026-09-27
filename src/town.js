// Reactive settlement: the green beside the starting cabin gains props and services as townsfolk move
// in and quests finish. Unlocked upgrades are saved in `town.f`; the props are ordinary saved tiles.
import {
  burst,checkAch,chests,groundY,hasNPC,idx,meta,player,quests,SFX,SPAWNX,setTile,T,tiles,toast,W,
} from './game.js';

// ================= town =================
export let town={f:{},used:[]};
// props: tiles placed on free ground of the green, 0 leaves a gap; stack puts a second tile on top.
// Each upgrade starts at least one column away from the columns earlier upgrades used (town.used).
export const TOWN=[
  {id:'stall',n:'Market stall',when:()=>hasNPC('merchant'),need:'The Merchant moves in',props:[T.BENCH,T.POT,T.TORCH],msg:'The Merchant set up a market stall on the town green.'},
  {id:'post',n:'Town signpost',when:()=>hasNPC('guide'),need:'The Guide moves in',props:[[T.SIGN,1]],msg:'The Guide put up a signpost on the green. Use it to travel.'},
  {id:'garden',n:'Flower garden',when:()=>hasNPC('painter'),need:'The Painter moves in',props:[T.FLOWER,T.FLOWER2,T.FLOWER,T.FLOWER2,T.FLOWER],msg:'The Painter planted a flower garden in town.'},
  {id:'clinic',n:'Town alchemy table',when:()=>hasNPC('nurse'),need:'The Nurse moves in',props:[T.ALCHEMY,T.TORCH],msg:'The Nurse set up an alchemy table in town. Brew potions there.'},
  {id:'forge',n:'Town forge',when:()=>hasNPC('tinkerer'),need:'The Tinkerer moves in',props:[T.FURNACE,T.ANVIL],msg:'The Tinkerer opened a town forge with a furnace and anvil.'},
  {id:'bait',n:'Bait box',when:()=>hasNPC('angler'),need:'The Angler moves in',props:[T.CHEST,T.BENCH],chest:[['fly',15],['glowlure',3]],msg:'The Angler left a bait box on the green. Help yourself!'},
  {id:'bridges',n:'Repaired bridges',when:()=>quests.king,need:'Defeat the King Slime',run:repairBridges,msg:'Grateful townsfolk rebuilt every sketched bridge in the world.'},
  {id:'bazaar',n:'Bazaar goods',when:()=>quests.crane&&hasNPC('merchant'),need:'Defeat the Great Crane (with the Merchant in town)',props:[T.BENCH,T.POT],msg:'Traders arrived! The Merchant now stocks rarer goods.'},
  {id:'lamps',n:'Street lamps',when:()=>quests.lev,need:'Defeat the Inkwell Leviathan',props:[T.TORCH,0,T.TORCH,0,T.TORCH],msg:'Lamps now light the town at night.'},
  {id:'clock',n:'Town clock',when:()=>quests.folio,need:'Defeat the Charred Folio',props:[T.CLOCK],msg:'The town raised a clock to mark your victory.'},
  {id:'statue',n:'Monument',when:()=>quests.unfolded,need:'Solve the riddle of the ink shrine',props:[{stack:[T.PEDESTAL,T.CANDLE]}],msg:'A monument now stands in town, lit by a candle that never goes out.'}];
export const BAZAAR=[['seed_frost',8],['seed_ink',8],['seed_ember',10],['potswift',60],['potregen',60],['glowlure',8]];
const TOWNLV=[[0,'Clearing'],[1,'Hamlet'],[3,'Village'],[6,'Town'],[9,'Paper City']];
export function townLevel(){const n=TOWN.filter(u=>town.f[u.id]).length;let lv=TOWNLV[0][1];for(const[k,name]of TOWNLV)if(n>=k)lv=name;return lv;}
// columns of the town green, nearest the cabin first: westward from the cabin, then eastward past it
export function townSpots(){const out=[],c=SPAWNX;for(let x=c-1;x>=Math.max(2,c-45);x--)out.push(x);for(let x=c+14;x<=Math.min(W-3,c+45);x++)out.push(x);return out;}
function freeCol(x){const s=Math.floor(player.spawn.x);if(x===s||x===SPAWNX-4)return -1;const y=groundY(x);if(y<0)return -1;const up=tiles[idx(x,y+1)];return up===T.AIR||up===T.TUFT?y:-1;}
// all or nothing: plans every column first and returns null, changing nothing, if any prop doesn't fit
function placeProps(u){let first=null;const cols=townSpots(),used=town.used,plan=[];let ci=0;
  for(const pr of u.props){let y=-1,x=0;while(ci<cols.length){x=cols[ci++];y=freeCol(x);if(y>=0&&(plan.length||!used.some(c=>Math.abs(c-x)<=1)))break;y=-1;}if(y<0)return null;plan.push([x,y,pr]);}
  for(const[x,y,pr]of plan){used.push(x);if(!pr)continue;
    if(pr.stack){setTile(x,y,pr.stack[0]);setTile(x,y+1,pr.stack[1]);}else if(Array.isArray(pr))setTile(x,y,pr[0],pr[1]);else setTile(x,y,pr);
    if(pr===T.CHEST&&u.chest){const st=u.chest.map(([id,n])=>({id,n}));while(st.length<20)st.push(null);chests.set(idx(x,y),st);}
    if(!first)first=[x,y];}
  return first;}
function repairBridges(){for(let i=0;i<tiles.length;i++)if(tiles[i]===T.SKETCH&&meta[i]===1){setTile(i%W,(i/W)|0,T.PLATFORM);}return null;}
// checked every few seconds while playing; unlocks at most one upgrade per call so the toasts don't pile up.
// An upgrade whose props don't fit yet is skipped and tried again later.
export function updateTown(){const lv=townLevel();let u=null,at=null;for(const c of TOWN){if(town.f[c.id]||!c.when())continue;at=c.run?c.run():c.props?placeProps(c):null;if(c.props&&!at)continue;u=c;break;}if(!u)return;town.f[u.id]=1;
  toast(u.msg,'gold');SFX.nice();if(at)burst(at[0]+.5,at[1]+.5,['#f1c04f','#fbf8f0','#3f7a3b'],18,4);
  const nl=townLevel();if(nl!==lv)setTimeout(()=>toast(`Your settlement has grown into a ${nl}!`,'gold'),2500);checkAch();}
export const townShop=list=>town.f.bazaar?list.concat(BAZAAR):list;
// Imported bindings are read-only, so other modules assign these through setters.
export function setTown(v){return town=v;}
