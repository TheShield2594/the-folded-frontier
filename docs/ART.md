# Hand-made art

All of The Folded Frontier's art is drawn in code, so the game ships with no image files apart from the title screen. That works well for anything that repeats, varies or changes with settings. It works less well for a few large or constantly seen pictures, where a hand-painted image would look better than shapes built from `rr`/`poly`/`circ`. This page lists which art is worth replacing and explains how to add a picture.

## How it works

Put a PNG or WebP in `assets/art/` and it replaces the drawn art of the same name. Anything without a file keeps its procedural art, so the art can be swapped one picture at a time and the game always runs.

```
assets/art/atlas/<name>.png    one 64×64 atlas cell, named after its key in C (atlas.js)
assets/art/sheets/<name>.png   one whole sprite sheet, named after its key in SHEETS
```

- **Atlas cells** (`C.swFe` → `assets/art/atlas/swFe.png`). Cells that are arrays take the index after a dot: `C.crack[1]` → `crack.1.png`. A cell covers the block, decor or item icon everywhere it is used: the world, the backpack, tooltips and the held item.
- **Sprite sheets** (`SHEETS.folio` → `assets/art/sheets/folio.png`) hold the animation frames side by side, each `fw×fh` as listed in `EN` (a boss with `fw:340, fh:280` and 2 frames is 680×280). The new image must have the same size and frame layout as the drawn one. Other sizes are scaled with a console warning.
- The files are found at build time (`import.meta.glob` in `src/art.js`) and bundled by Vite, so a missing picture never makes a request or logs an error. Images under 4 kB are inlined into the bundle, and larger ones get a hashed file in `dist/assets/`.
- At boot `loadArt()` decodes the images and paints them over the drawn cells and sheets. It then rebuilds the atlas normal map (so the world lighting uses the new art), clears the cached icons and bestiary sketches, and marks the sheet textures for upload. `artReady` is a promise that resolves to the number of pictures applied.
- Ore cells (`copper`, `iron`, `gold`, `frostOre`, `inkOre`, `emberOre`, `foilOre`) are only replaced while Settings > Color vision is off. In the other modes the drawn ores come back, because their nugget shapes and palette carry the meaning (`applyCB()` repaints the overrides after it redraws the ores).
- Names that don't match a cell or sheet are skipped with a console warning.

### Making a picture

1. Run `npm run dev` and open the dev console.
2. `g=await import('/src/game.js')`, then `g.artList()` lists every replaceable name with its size.
3. `g.artExport('sheets','folio')` or `g.artExport('atlas','swFe')` downloads the current drawn art as a PNG. Paint over it so the frames, the anchor point (feet at the bottom middle for walkers) and the size stay the same.
4. Save it under `assets/art/atlas/` or `assets/art/sheets/` with the same name. The dev server reloads and the new art shows.

Keep the paper look so hand-made pictures sit well beside the drawn ones (`docs/STYLE.md` has the full style, line weights and prompts). That means cream paper with a sticker border about 3–4 px wide around the shape (the drawn art gets it from `sticker()`/`makeSheet()`), dark ink outlines (`#2a2130`), rounded shapes and a little grain. Transparent pixels are see-through in the world, and the colors are plain sRGB (color management is off).

## What benefits most

Ranked by how much a hand-made picture would add for the work involved:

| Priority | Art | Where | Why |
|---|---|---|---|
| 1 | **Bosses on sheets**: `crane` (720×240), `lev` + `levseg` + `levtail` (360×140, 280×140, 280×140), `folio` (680×280), `unfolded` (600×360) | `sheets/` | The largest sprites on screen, only 2 frames each and just 4 bosses, and they carry the story's big moments. The crease/tear phase look (`uCr`), flashes and outlines are shader effects, so they keep working on painted art. |
| 2 | **Item icons**: one cell for each of the 253 items, starting with weapons, tools, armor, boss drops, fish and badges | `atlas/` | Shown at 64 px in the backpack, hotbar, tooltips, museum and the player's hand, all the time. One cell per item, independent of each other, so they can be done a few at a time. |
| 3 | **Foes still on sheets**: `crumple`, `toadstool`, `dunefin`, `scarab`, `sunkite`, `snowroll`, `snowlet`, `frostpuff`, `inkwisp`, `quillfish`, `cracker`, `ashspider`, `foldfox`, `flurry`, `inksquid`, `wraith` | `sheets/` | 2-frame strips at 56–128 px. A painted version is cheap and replaces the whole look. |
| 4 | **Pets and the mount**: `pet_frog`, `pet_kit`, `pet_moth`, `pet_crease` (2 frames of 96×96), `stag` (3 frames of 160×112) | `sheets/` | These are cosmetic rewards, so they should look special. (Their backpack icons are separate atlas cells, which also come from `drawPet`/`drawStag`.) |
| 5 | **UI pictures**: badges, the tab icons (`cellIcon`), the heart, the coin | `atlas/` | Small, but always on screen. |

## What stays procedural

- **Terrain blocks and walls**: seeded speckle, grain and a shared outline make tiling look hand-made already. The normal map is built from the same art, and the ores have to redraw for color vision. Painted blocks are possible (`atlas/dirt.png`), but every tile of that kind would repeat the same picture.
- **Particles, lighting, bloom and grading, the map**: these are effects, not pictures.
- **Diorama layers and foreground cutouts**: one 2048×512 strip per layer, biome and season (more than 80), drawn lazily as the camera nears. Hand-painting them would be a large project of its own.
- **Rigged characters** (the player, townsfolk, partners, slimes, the King Slime, bats, the eye, zombies, knights, ash imps): each rig part is painted for a skin (`rigSkin`), so one design covers every look, armor set and color variant, which painted images can't do. Their entries in `SHEETS` (`slime`, `p_lumi`, the townsfolk `guide`…) only feed the bestiary sketches and portraits. Replacing one changes that still picture, not the character in the world. Painted rig parts would need a per-part override in `rigSkin`, and that is only worth it for a character with a single look (the King Slime, a partner).
- **Status overlays** (`pstatus`) and the elite star: small effects drawn over sprites.

## Painted so far

Generated with Nano Banana Pro (Higgsfield or OpenRouter) from the prompts in `tools/art/`, then cut out and restyled by `tools/art/build.py` (it redraws the ink outline and cream border at the `docs/STYLE.md` weight).

- **In the game:** all 32 weapon, tool and shield icons (`assets/art/atlas/`: `swWood` … `swEm`, `foldblade`, `pickCu` … `pickEm`, `hammer`, `shuri`, `bowW`, `bowG`, `bowFr`, `bowMoon`, `launch`, `launchMoon`, `tomeInk`, `tomeCrane`, `tomeTide`, `tomeMoon`, `staff`, `staffEm`, `shwood`, `buckler`, `quilt`, `beacon`) and the Fold Fox (`assets/art/sheets/foldfox.png`).
- **Pending, not wired in yet** (`tools/art/pending/`): painted player parts in side view with a tint mask, painted armour for the six metal sets (a head wearing the helmet, torso, arm and leg per metal), the two leafy tree canopies and a two-tile trunk with roots. They need code: per-part overrides in `rigSkin` for the player and armour, and region overrides (the canopies are 256×256 atlas regions, not cells, and the trunk is drawn wider than its cell) for the trees.
- **Prompts:** `tools/art/weapon-prompts.txt` (the icon sheet format), `tools/art/armor-prompts.txt`, `tools/art/grip-prompt.txt` (fists that grip the held item).
