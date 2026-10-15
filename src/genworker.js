// World generation off the main thread. './game.js' here is the worker's own hub (tools/vite-genhub.mjs): the real
// generation modules and no-op stubs for the rest, so the worker never loads the DOM, the renderer or the atlas.
// It builds a world from a seed and size exactly as newWorld() would (generate() and the planning passes after it) and
// posts the arrays and the plan back; the main thread installs them with useGen() in save.js.
import {setW,setH,setN,setSPAWNX,setTiles,setWalls,setMeta,setStamp,setSky,setBlk,setSurf,sizeLight,setBIO,setChests,
  generate,placeMurals,planMarks,planSecrets,planTricks,planSeasons,SIZES,W,H,N,tiles,walls,meta,surf,BIO,chests,surfAvg,seed} from './game.js';

self.onmessage=({data:{sd,size}})=>{const S=SIZES[size]||SIZES.s;
  setW(S.w);setH(S.h);setN(W*H);setSPAWNX(Math.floor(W/2));setTiles(new Uint8Array(N));setWalls(new Uint8Array(N));setMeta(new Uint8Array(N));
  setStamp(new Uint32Array(N));setSky(new Uint8Array(N));setBlk(new Uint8Array(N));setSurf(new Int16Array(W));sizeLight(N);setBIO({uw:0});setChests(new Map());
  const g=generate(sd);placeMurals();planMarks();planSecrets();planTricks();planSeasons();
  self.postMessage({w:W,h:H,tiles,walls,meta,surf,BIO,chests:[...chests],surfAvg,seed,g},[tiles.buffer,walls.buffer,meta.buffer,surf.buffer]);};
