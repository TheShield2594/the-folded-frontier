# CLAUDE.md

Guide for working on The Folded Frontier: a papercraft 2D sandbox adventure (Paper Mario look, Terraria loop) rendered with three.js.

## Repo layout

```
index.html   the whole game: CSS, HTML UI, and all JavaScript (~2,170 lines)
README.md    player-facing overview and controls
assets/      title.webp: title screen background (painted art with the logo baked in)
.nojekyll    lets GitHub Pages serve files as-is
```

There is no build step, no package.json and no audio assets. The only image asset is `assets/title.webp`, the title screen background; it's loaded with `new Image()` and the `#title` overlay only gets its `bg` class (image, cream card behind the menu, HTML logo hidden on landscape screens) once it loads, so a missing file falls back to the plain overlay. All game art is drawn in code onto canvases, and all sound is synthesized with Web Audio. The only external dependency is three.js r128, loaded from cdnjs in a `<script>` tag.

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
| audio | Web Audio setup, `tone()`, SFX and music synthesis, biome ambience (`updateAmbience`, `AMBW` layer weights) |
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
- The world save also holds `angler` (fishing progress: fish caught, Angler requests done, day counter, today's request); older saves get defaults in `loadWorld()`.
- Every load goes through `migrateSave()` inside `loadWorld()`. When a save needs a structural change, bump `SAVE_VER` and add a `if(d.v<N){...;d.v=N;}` step there. For a plain new field, filling a default in `loadWorld()` is enough: older saves won't have it.

Browser-only saves are why the game will be self-hosted with server-side saves (issue #7). GitHub Pages is a test build only.

## Conventions and gotchas

- **Tile IDs are saved as raw bytes.** Never renumber or reuse a value in `T`. Add new tiles with new IDs. The lookup arrays are sized 64 and the highest ID is currently 60, so going past 63 means resizing them.
- **Atlas cells are allocated in order** (`cellN++`). Adding cells in the middle shifts later cells. That's fine at runtime, since nothing saves cell indices, but keep new art grouped with its section.
- **Art style:** cream paper, dark ink outlines (`INK = '#2a2130'`), rounded shapes, paper grain. Reuse the drawing helpers so new art matches.
- **Code style is dense:** short names, many statements per line. Match the surrounding code rather than reformatting it; a big reformat makes diffs unreadable.
- Everything is in one closure, so there are no modules or globals to import. `function` declarations are hoisted and can be called from anywhere, but `const`/`let` values can't be used before their line has run during boot.
- **Boss phases:** every boss runs `bossPhase()` at 50% and 25% life (`e.phase` 1 and 2), sits in `e.act==='phase'` (immune) and then `bossRefold()`s. Each boss's AI reads `e.phase` to add or change attacks, so a new boss should do the same.
- **Fishing:** rods have `rod`/`fpow`, bait has `bait`, and catches come from `CATCH` (per biome, plus `lava`). The bobber is the `bob` object, updated in `updateFishing()`.
- **Combat hooks:** `hurtEnemy(e,dmg,dir,kb,crit,elem)` and `hurtPlayer(dmg,from,src,elem)`. Pass the attacking enemy or projectile as `src` so shields can block and parry it (`hurtPlayer` returns `'parry'` on a parry); leave it out for damage that can't be blocked, like lava. Damage types are `'fire'`, `'ink'` and `'water'` (`ELEM`); each enemy's weakness, resistance and the type its own hits carry are set in the table right after `EN`, and projectile kinds take a type from `elem` in `PK`. Statuses live in `e.st` / `player.st` and are not saved.
- Keep new input actions rebindable: keyboard in `DEF_BIND`/`ALT` (plus a `BINDLAB` label), gamepad in `DEF_PAD` (plus a `PADLAB` label). Start and the d-pad/sticks are fixed, and backpack menus use a fixed gamepad layout (`fx` in `handlePad`).

## Testing

There are no automated tests yet (Playwright smoke tests are planned in #50). To check a change:

1. Serve the folder and load it with the dev console open; confirm there are no errors.
2. Create a new small world and play briefly.
3. Pause (saves), reload, and Continue: the world should come back intact.
4. Export a save code, reload, and load it from the title screen.

Chromium with Playwright is available in Claude Code cloud sessions for headless checks, but it can't judge game feel or difficulty.

## Roadmap

Planned work is tracked in GitHub Issues, grouped under epic issues #1–#7. The split of `index.html` into Vite modules (#46) should come before any big new system.
