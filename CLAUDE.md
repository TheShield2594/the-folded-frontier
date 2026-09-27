# CLAUDE.md

Guide for working on The Folded Frontier: a papercraft 2D sandbox adventure (Paper Mario look, Terraria loop) rendered with three.js.

## Repo layout

```
index.html   the whole game: CSS, HTML UI, and all JavaScript (~2,170 lines)
README.md    player-facing overview and controls
STYLE.md     the art style: look, palette, sprite sizes and frames, how to prompt for painted art
assets/      painted art (see "Art: painted vs code-drawn" below)
tools/art/   Python (Pillow, numpy, scipy) scripts that turned the Higgsfield renders into those files
.nojekyll    lets GitHub Pages serve files as-is
```

There is no build step, no package.json and no audio assets. `assets/title.webp` is the title screen background; it's loaded with `new Image()` and the `#title` overlay only gets its `bg` class (image, cream card behind the menu, HTML logo hidden on landscape screens) once it loads, so a missing file falls back to the plain overlay. All other game art is drawn in code onto canvases; a growing set (see "Art: painted vs code-drawn") is then painted over from `assets/` once their images load (see "Generated art" below). All sound is synthesized with Web Audio. The only external dependency is three.js r128, loaded from cdnjs in a `<script>` tag.

## Running locally

Open `index.html` in a browser, or serve the folder (preferred, and closer to the hosted setup):

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

You need network access to cdnjs for three.js. Save codes use `CompressionStream`, which requires a secure context (localhost or HTTPS).

## Where things live in `index.html`

| Lines (approx.) | Contents |
|---|---|
| 8–199 | `<style>`: all CSS |
| 200–300 | HTML: HUD, menus, title screen, pause, save-code dialog, settings |
| 301 | three.js r128 `<script>` from cdnjs |
| 302+ | Game script, one IIFE in `'use strict'` mode |

Inside the script, sections start with `// ================= name =================` banners. Search for the banner to find a section:

| Section | What it holds |
|---|---|
| constants & helpers | World sizes (`SIZES`), seeded RNG (`mulberry32`), noise (`makeNoise`), canvas drawing helpers (`rr`, `ink`, `fi`, `circ`, `poly`, `grain`) |
| settings, meta, keys | Default key bindings (`DEF_BIND`, `ALT`), settings (`SET`), achievements/stats (`META`), input state |
| atlas | 1024×2048 texture atlas drawn in code; `C` maps names to atlas cells (blocks, decor, item icons, badges, farming, secrets) |
| tiles | Tile enum `T`, tile properties via `def(id, {...})` into `TP`, plus `SOLID`/`OPAQUE`/`LIGHT` lookup arrays |
| items | `ITEMS` via `item(id, {...})`, `BADGES`, `RECIPES` (`[id, count, [[ingredient, n]...], station]`) |
| world state | `tiles`/`walls`/`meta` typed arrays, chests, `generate(seed)` world generation, secrets & structures |
| lighting | Tile light propagation |
| three setup | Renderer, scene, camera |
| chunk meshes | 32×32 chunk meshes (`CS=32`), rebuilt when marked dirty |
| sprites & sheets | Procedural sprite sheets for player, enemies, biomes, partners |
| particles | Particle effects |
| audio | Web Audio setup, `tone()`, SFX and music synthesis |
| entities | `player`, enemy defs `EN`, enemies, pickups, projectiles, NPCs, boss, `QUESTS` |
| inventory helpers | Adding/removing items |
| UI | Inventory, crafting, tooltips, toasts |
| housing & merchant | Room validation, `NPCDEF`, NPC move-in |
| input | Keyboard and mouse |
| gameplay | Player physics, combat, mining/placing, enemy AI, spawning, bosses, events (largest section) |
| crack/highlight overlays | Mining crack and tile highlight |
| time/sky | Day/night cycle, sky colors |
| camera | Camera follow and shake |
| partners | `PARTNERS` and partner behavior |
| pop-up book | Page-turn effect when entering a new biome |
| world map | Full map view |
| gamepad | Gamepad polling and menu navigation |
| settings & achievements UI | Settings panel, rebinding, achievements |
| minimap/HUD | Minimap and HUD |
| save/load | `save()`, `loadSave()`, `SAVE_KEY`, `SAVE_VER`, `migrateSave()` |
| lifecycle | `allocWorld`, `newWorld`, `loadWorld`, pause/title flow, save-code pack/unpack |
| boot | Builds sprite sheets, loads or creates a world, main `frame()` loop |

## Saves

- World save: `localStorage['folded-frontier-save-v1']` (the key name predates versioning; don't rename it). JSON with `v: SAVE_VER` (currently 2); `tiles`/`walls`/`meta`/`explored` are base64-encoded `Uint8Array`s. v2 added the per-world `bestiary` (`{type: {k: kills, e: elite kills, d: {itemId: count}}}`).
- Settings: `localStorage['folded-frontier-settings']`. Achievements/stats: `localStorage['folded-frontier-meta']`.
- Autosave runs every 60 seconds and when pausing or quitting.
- Save codes: `FF1:` + base64(gzip(JSON `{save, meta}`)) via `CompressionStream`; `FF0:` is the uncompressed fallback. The Save code button is in the pause menu, and "Load save code" is on the title screen.
- Every load goes through `migrateSave()` inside `loadWorld()`. When a save needs a structural change, bump `SAVE_VER` and add a `if(d.v<N){...;d.v=N;}` step there. For a plain new field, filling a default in `loadWorld()` is enough: older saves won't have it.

Browser-only saves are why the game will be self-hosted with server-side saves (issue #7). GitHub Pages is a test build only.

## Conventions and gotchas

- **Tile IDs are saved as raw bytes.** Never renumber or reuse a value in `T`. Add new tiles with new IDs. The lookup arrays are sized 64 and the highest ID is currently 60, so going past 63 means resizing them.
- **Atlas cells are allocated in order** (`cellN++`). Adding cells in the middle shifts later cells. That's fine at runtime, since nothing saves cell indices, but keep new art grouped with its section.
- **Art style:** follow `STYLE.md`: cream paper stickers, dark ink outlines (`INK = '#2a2130'`), rounded shapes, paper grain, side view facing right.
- **Code style is dense:** short names, many statements per line. Match the surrounding code rather than reformatting it; a big reformat makes diffs unreadable.
- Everything is in one closure, so there are no modules or globals to import. `function` declarations are hoisted and can be called from anywhere, but `const`/`let` values can't be used before their line has run during boot.
- **Combat hooks:** `hurtEnemy(e,dmg,dir,kb,crit,elem)` and `hurtPlayer(dmg,from,src,elem)`. Pass the attacking enemy or projectile as `src` so shields can block and parry it (`hurtPlayer` returns `'parry'` on a parry); leave it out for damage that can't be blocked, like lava. Damage types are `'fire'`, `'ink'` and `'water'` (`ELEM`); each enemy's weakness, resistance and the type its own hits carry are set in the table right after `EN`, and projectile kinds take a type from `elem` in `PK`. Statuses live in `e.st` / `player.st` and are not saved.
- Keep new input actions rebindable: keyboard in `DEF_BIND`/`ALT` (plus a `BINDLAB` label), gamepad in `DEF_PAD` (plus a `PADLAB` label). Start and the d-pad/sticks are fixed, and backpack menus use a fixed gamepad layout (`fx` in `handlePad`).

## Art: painted vs code-drawn

The game is moving characters, creatures and objects from code-drawn art to painted art (generated with Higgsfield, style in `STYLE.md`), tracked in issue #48. Procedural art stays where it works well: terrain blocks and walls, particles, background hills. Every piece of art is drawn in code first; painted art is drawn over it once its image loads.

**Rule for new content: the bar is top-tier, studio-quality art that follows `STYLE.md`, however it's made.** Code-drawn art is fine when it meets that bar; when it doesn't (characters, creatures, items and decorations usually need painting to get there), the new thing needs a painted asset. Terrain blocks, walls and particles are expected to stay code-drawn. Either way, write the code-drawn version first: it's the fallback, and it fixes the frame layout a painted file has to match. To paint it, generate the art, run it through `tools/art/build.py`, add it to the table below, and ask the owner before spending credits (see "Generated art"). If it can't be painted yet, add it to the "still code-drawn" list.

| Painted (in `assets/`) | File | Replaces |
|---|---|---|
| Title screen | `title.webp` | plain title overlay |
| Player | `player_parts.webp`, `player_parts_mask.webp` | `drawHuman` player in `playerSheet()` |
| Copper and gold armour (helmet, chainmail, greaves) | `armor_cu.webp`, `armor_au.webp` | tinted plain parts |
| Fold Fox | `foldfox.webp` (2 frames) | `SHEETS.foldfox` |
| Leafy tree canopies (bright and dark) | `trees.webp` | `C.canopy[0]`, `C.canopy[1]` |
| Tree trunk (bark tile and root base) | `trunk.webp` | `C.trunk` cell (drawn wider, see below) |

Still code-drawn, to be painted:

- **Armour sets:** iron, frostsilver, inkstone, emberite (prompts in `tools/art/armor-prompts.txt`; until painted, these tint the plain parts).
- **Enemies:** Green Slime, Blue Slime, Paper Zombie, Watcher Eye, Cave Bat, Cardboard Knight, Crumple, Toadstool Lobber, Dune Fin, Shell Scarab, Sun Kite, Flurry, Snow Roller, Snowlet, Frost Puff, Ink Blot, Ink Squid, Ink Wisp, Quillfish, Cinder Bat, Ash Imp, Firecracker Imp, Ash Spider, Ink Wraith.
- **Bosses:** King Slime, Great Crane, Inkwell Leviathan (head, body segment, tail), Charred Folio, The Unfolded (ink shrine).
- **NPCs:** Guide, Painter, Nurse, Tinkerer, Merchant.
- **Partners:** Lumi, Snip, Smudge, Ember.
- **World:** the snowy pine canopy (`C.canopy[2]`), furniture, crafting stations, plants and decorations (the non-block tiles), projectiles.
- **Items:** all ~140 item icons and badges (atlas cells in `C`).

Staying code-drawn by design: terrain blocks and walls, liquids, particles, background hills, and the HTML/CSS HUD and menus.

## Generated art (Higgsfield)

The owner has a Higgsfield Pro account connected as an MCP server (`mcp__Higgsfield__*`). Use it for painted art; `STYLE.md` has the prompt template and what has worked.

- Through MCP, generations cost credits: `use_unlim: true` is refused ("Unlimited generations aren't supported"), even on the Pro plan; the plan's unlimited seems to apply only on the Higgsfield website. Nano Banana Pro costs 2 credits per image, Seedream 4.5 costs 1. Check `get_cost` and ask the owner before generating. The owner can also generate on the website for free and commit the image.
- The Higgsfield project "The Folded Frontier art" holds all the source renders; pass one as a reference image to keep new art consistent with it.
- Image downloads come from `d8j0ntlcm91z4.cloudfront.net`, which the cloud environment's network policy has to allow. In headless Chromium, three.js from cdnjs can fail through the proxy (`ERR_TOO_MANY_RETRIES`): route it to a local copy with `page.route`.
- **Getting it in the game:** save under `assets/` as `.webp`. `paintArt(file, fn)` (right after `buildSheets()` at boot) loads an image and, once loaded, draws it over the code-drawn version: into the `SHEETS` canvas (then `SHEETS[k+'T'].needsUpdate=true`) for sprites, or into the atlas (`A`, then `atlasTex.needsUpdate=true`, and add every chunk to `dirty` if the mesh changes) for atlas cells. Match the frame layout the code expects (`STYLE.md` has the sizes); files can be 2x. `paintArt` skips images it can't read back, which is what happens when `index.html` is opened from `file://` (WebGL can't use them there), so that falls back to code art. `PAINT` holds flags and images for painted art that changes how things are drawn.
- **Player:** `player_parts.webp` has side-view head, torso, arm, leg and helmet pieces; `paintedPlayer()` poses them with the same `POSES` angles as `drawHuman`, with the back arm and leg darkened, then adds one cream border round each frame. `RIG` holds each piece's rect and joint point. `player_parts_mask.webp` marks what armour recolours (tunic and sleeves for mail, trousers and boots for greaves, the helmet metal), using the canvas `color` blend; the helmet piece is only drawn when a helmet is equipped. Metals with a painted set (`armor_<metal>.webp`, rects in `ARMOR_RIG`, loaded into `PAINT.armor`) swap in their own pieces per slot instead: the helmet slot swaps the head for one wearing the helmet, chainmail swaps torso and arms, greaves swap the legs. Metal codes come from the item ids (`helmcu` → `cu`).
- **Trees:** the painted trunk is drawn two tiles wide and behind the canopy (`PAINT.trunk` in the chunk mesh builder), from a free 128×192 corner of the atlas at (0, 768): the bark tile twice (the first copy is padding so filtering doesn't bleed other cells in), then the root base. Painted canopies are drawn a size up (5×5 tiles) when `PAINT.canopy` is set; the snowy pine keeps its code size.
- **`tools/art/build.py <renders dir>`** rebuilds every painted asset from the source renders (download them from the Higgsfield project, named as in its `RENDERS`). It cuts out the background, then `restyle()` redraws the ink outline and cream border at the `STYLE.md` thickness in tiles as seen in game, so art scaled by different amounts still matches; player parts get ink only, and `paintedPlayer()` adds one border round the whole figure. It prints the `RIG` and `ARMOR_RIG` entries to paste into `index.html`. Armour renders (`armor-<metal>.png`) are split by `inked_pieces()`, which ignores the blurry ghost blobs image models sometimes add; each needs its joint points in `ARMOR_PIV`. Joint points and crop rows in it fit these particular renders; a new render needs its own numbers.

## Testing

There are no automated tests yet (Playwright smoke tests are planned in #50). To check a change:

1. Serve the folder and load it with the dev console open; confirm there are no errors.
2. Create a new small world and play briefly.
3. Pause (saves), reload, and Continue: the world should come back intact.
4. Export a save code, reload, and load it from the title screen.

Chromium with Playwright is available in Claude Code cloud sessions for headless checks, but it can't judge game feel or difficulty.

## Roadmap

Planned work is tracked in GitHub Issues, grouped under epic issues #1–#7. The split of `index.html` into Vite modules (#46) should come before any big new system.
