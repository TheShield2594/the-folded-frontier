# CLAUDE.md

Guide for working on The Folded Frontier: a papercraft 2D sandbox adventure (Paper Mario look, Terraria loop) rendered with three.js.

## Repo layout

```
index.html        HTML only: HUD, menus, title screen, pause, save-code dialog, settings
src/style.css     all CSS
src/main.js       entry point and boot (main frame loop)
src/game.js       hub that re-exports every module in boot order (see "Modules" below)
src/*.js          the game, split into ES modules (table below)
public/assets/    title.webp: title screen background (painted art with the logo baked in, 3816×1620)
vite.config.js    Vite config (relative base so dist/ works from any path)
.github/workflows/pages.yml  builds with Vite and deploys dist/ to GitHub Pages
```

The project is built with Vite. The only runtime dependency is three.js, pinned to r128 (`three@0.128.0` from npm) and bundled into the build. There are no audio assets and the only image asset is `public/assets/title.webp`, the title screen background; it's loaded with `new Image()` and the `#title` overlay only gets its `bg` class (image, cream card behind the menu, HTML logo hidden on landscape screens) once it loads, so a missing file falls back to the plain overlay. The title screen must fit without scrolling: it holds only the tagline and menu buttons, and the controls list lives in the `#howto` overlay behind the How to play button. All game art is drawn in code onto canvases, and all sound is synthesized with Web Audio.

## Running locally

```sh
npm install
npm run dev       # dev server with reload, prints the local URL
npm run build     # static build in dist/
npm run preview   # serves dist/ to check the build
```

`dist/` is plain static files, deployable to GitHub Pages or any static host. Opening `index.html` straight from disk no longer works; use the dev server. Save codes use `CompressionStream`, which requires a secure context (localhost or HTTPS).

## Modules

Each file in `src/` is one or more of the old script's sections, in the same order. Sections still start with `// ================= name =================` banners, so search for the banner to find one.

| File | Sections | What it holds |
|---|---|---|
| `util.js` | constants & helpers | World sizes (`SIZES`), seeded RNG (`mulberry32`), noise (`makeNoise`), canvas drawing helpers (`rr`, `ink`, `fi`, `circ`, `poly`, `grain`) |
| `settings.js` | settings, meta, keys | Default key bindings (`DEF_BIND`, `ALT`), settings (`SET`), interface/text size (`applyUI`, `upx`), achievements/stats (`META`), input state |
| `atlas.js` | atlas | 1024×2048 texture atlas drawn in code; `C` maps names to atlas cells (blocks, decor, item icons, badges, farming, secrets) |
| `items.js` | tiles, items | Tile enum `T`, tile properties via `def(id, {...})` into `TP`, `SOLID`/`OPAQUE`/`LIGHT` lookup arrays; `ITEMS` via `item(id, {...})`, `BADGES`, `RECIPES` (`[id, count, [[ingredient, n]...], station]`) |
| `world.js` | world state, lighting | `tiles`/`walls`/`meta` typed arrays, chests, `generate(seed)` world generation, secrets & structures; tile light propagation |
| `render.js` | three setup, chunk meshes, sprites & sheets, particles | Renderer, scene, camera; 32×32 chunk meshes (`CS=32`) rebuilt when marked dirty; procedural sprite sheets for player, enemies, biomes, partners; particles |
| `audio.js` | audio | Web Audio setup, `tone()`, `SFX` (with random variants), music tracks (`MUS`, sequenced by `music()`, crossfaded by `setMusic()`), biome ambience (`updateAmbience`, `AMBW` layer weights) |
| `entities.js` | entities, inventory helpers | `player`, enemy defs `EN`, enemies, pickups, projectiles, NPCs, boss, `QUESTS`; adding/removing items |
| `ui.js` | UI, housing & merchant | Inventory, crafting, tooltips, toasts; room validation, `NPCDEF`, NPC move-in |
| `input.js` | input | Keyboard and mouse |
| `gameplay.js` | gameplay | Player physics, combat, mining/placing, enemy AI, spawning, bosses, events (largest module) |
| `view.js` | crack/highlight overlays, time/sky, camera | Mining crack and tile highlight, day/night cycle and sky colors, camera follow and shake |
| `partners.js` | partners | `PARTNERS` and partner behavior; move upgrades read `palUp(k)`; `partnerCheer(t)` celebration hop, idle fidgets after 5 s standing still |
| `map.js` | pop-up book, world map | Page-turn effect when entering a new biome; full map view |
| `gamepad.js` | gamepad | Gamepad polling and menu navigation |
| `hud.js` | settings & achievements UI, minimap/HUD | Settings panel, rebinding, achievements; minimap and HUD |
| `guide.js` | intro, tutorial | Storybook intro for new worlds (`playIntro`, `skipIntro`, `state==='intro'`); first-night tutorial steps and paper-trick hints (`tut`, `updateGuide`, `guideEv(ev)` called from gameplay for `'craft'`, `'dawn'`, `'peel'`, `'pop'`, `'flat'`) |
| `dialogue.js` | dialogue | Staged dialogue: `say(speaker, lines, {done, wait})` queues a conversation shown as a speech bubble over the speaker (`npcSpeaker(n)`, `partnerSpeaker(k)`, `playerSpeaker()`) with a portrait, typed text and per-character voice blips (`VOICE`); freezes the world as `state==='talk'`; `plain()` strips the markup |
| `seasons.js` | seasons | Spring/summer/fall/winter cycle of `SEASON_DAYS` in-game days (`worldDay`, `season()`, `seasonInfo()`); per-season crop growth (`cropGrowChance`, `sheltered`), weather odds (`rollWeather`), canopies (`canopyCell`), sky tint and particles; festival on day `FEST_DAY` (`festival()`, `isFest(k)`); `newDay()` runs at each dawn |
| `town.js` | town | Reactive settlement: `TOWN` upgrades unlock as NPCs move in and quests finish (`updateTown()` every 3 s), placing props on the green beside the starting cabin or running an effect (bridge repair); `town` state, `townLevel()`, Merchant's `BAZAAR` stock via `townShop()` |
| `folk.js` | folk, museum | Per-world `folk` state; NPC memory dialogue (`MEMORY`, `npcLine(type, passive)`); side quests for the Farmer, Cartographer and Curator (`SIDEQ`, `folkClick`, `folkHTML`); the museum (`MUSEUM` collections, `donate`, `museumHTML`); fossil drops (`digFossil`) |
| `events.js` | events | World events beyond the Ink Moon, state in `wev`: Paper Storm, Paper Army invasion, Traveling Merchant. `evDawn()`/`evDusk()` roll them, `updateEvents()` runs them and the `#evbar` banner, `evKill(e)` counts invaders |
| `pals.js` | partner stories | Per-world `pals` state; personal quests (`PQUEST`, progress from `palEv('dawn'|'fossil'|'kill')`) that upgrade a partner's move (`moveName(k)` adds `+`); `BANTER` lines on biomes, bosses, seasons and events; `CHAT` pairs with townsfolk shown as bubbles (`updatePals`) |
| `save.js` | save/load, lifecycle | `save()`, `loadSave()`, `SAVE_KEY`, `SAVE_VER`, `migrateSave()`; `allocWorld`, `newWorld`, `loadWorld`, pause/title flow, save-code pack/unpack |
| `main.js` | boot | Builds sprite sheets, loads or creates a world, main `frame()` loop |

How the modules fit together:

- **Import shared names from `./game.js`**, never directly from another module. `game.js` re-exports every module in boot order, and `main.js` imports it first, so the modules run top to bottom in the same order the single script did. A direct import of a later module would make that module run early and can break boot with "Cannot access 'X' before initialization".
- **Top-level code runs in module order.** A module's top-level code (not code inside functions) can use `const`/`let` values from modules above it in `game.js`, but not from modules below it. `function` declarations are hoisted and can be called from anywhere, as long as their bodies don't touch a value that hasn't been set yet.
- **Imported bindings are read-only.** To reassign a `let` owned by another module, call its setter: the owning module exports `setX(v)` next to it (for example `setState('title')`, `setInvDirty(true)`, `setW(w)`), which assigns and returns the value. Mutating an object or array in place (`tiles[i]=...`, `player.hp-=...`) needs no setter. When you add a `let` another module has to reassign, add a setter to the module that declares it.
- **Export anything another module uses**, and add it to the importing module's `import {...} from './game.js'` list. Names must stay unique across all modules, since `game.js` re-exports them all together.
- Modules that use three.js start with `import * as THREE from 'three';`.

## Saves

- World save: `localStorage['folded-frontier-save-v1']` (the key name predates versioning; don't rename it). JSON with `v: SAVE_VER` (currently 3); `tiles`/`walls`/`meta`/`explored` are base64-encoded `Uint8Array`s. v2 added the per-world `bestiary` (`{type: {k: kills, e: elite kills, d: {itemId: count}}}`). v3 fills in fields builds older than the repo could leave out (biome ranges, `bio.camps`/`treasure`/`shown`, `p.world`) and adds `p.world.day` (season day counter) and `town` (`{f: {upgradeId: 1}, used: [columns]}`).
- `cleanSave()` runs on every load after `migrateSave()`: it drops inventory/chest items, NPCs, partners and badges this build doesn't know, so a save never crashes on a removed id. If a save still can't load, `loadFailed()` copies it to `folded-frontier-save-v1-backup-<timestamp>` (one key per different failed save; the same save failing twice is kept once) and the title screen stays up.
- Settings: `localStorage['folded-frontier-settings']` (includes `snd`, the Sound on/off toggle at the top of the Settings panel). Achievements/stats: `localStorage['folded-frontier-meta']`.
- Autosave runs every 60 seconds and when pausing or quitting.
- Save codes: `FF1:` + base64(gzip(JSON `{save, meta}`)) via `CompressionStream`; `FF0:` is the uncompressed fallback. The Save code button is in the pause menu, and "Load save code" is on the title screen.
- The world save also holds `angler` (fishing progress: fish caught, Angler requests done, day counter, today's request); older saves get defaults in `loadWorld()`.
- The world save also holds `folk` (`q` side quest states 1 accepted / 2 done, `heard` memory lines per NPC as `'type:key'`, `met` introduced NPCs, `n` per-world counters such as `harvest`, `fossil`, `storm`, `army`, `moon`, `mus` donated item ids, `col` rewarded museum collections) and `ev` (the running world event, a pending storm, the event cooldown and the Traveling Merchant's visit). Both are filled with defaults in `loadWorld()` for older saves.
- The world save also holds `pals` (partner stories: `q` personal quest per partner 1 asked / 2 done, `n` quest progress, `heard` banter lines said as `'partner:key'`). Older saves get defaults in `loadWorld()`.
- The world save also holds `tut` (tutorial progress: next step `s`, paper hints already shown in `seen`). Saves without it load with the tutorial finished.
- Every load goes through `migrateSave()` inside `loadWorld()`. Old-build saves can be made by running an old commit's `index.html` (three.js from the CDN) and copying the save out of `localStorage`. When a save needs a structural change, bump `SAVE_VER` and add a `if(d.v<N){...;d.v=N;}` step there. For a plain new field, filling a default in `loadWorld()` is enough: older saves won't have it.

Browser-only saves are why the game will be self-hosted with server-side saves (issue #7). GitHub Pages is a test build only.

## Conventions and gotchas

- **Tile IDs are saved as raw bytes.** Never renumber or reuse a value in `T`. Add new tiles with new IDs. The lookup arrays are sized 64 and the highest ID is currently 60, so going past 63 means resizing them.
- **Atlas cells are allocated in order** (`cellN++`). Adding cells in the middle shifts later cells. That's fine at runtime, since nothing saves cell indices, but keep new art grouped with its section.
- **Art style:** cream paper, dark ink outlines (`INK = '#2a2130'`), rounded shapes, paper grain. Reuse the drawing helpers so new art matches.
- **Code style is dense:** short names, many statements per line. Match the surrounding code rather than reformatting it; a big reformat makes diffs unreadable.
- **Boss phases:** every boss runs `bossPhase()` at 50% and 25% life (`e.phase` 1 and 2), sits in `e.act==='phase'` (immune) and then `bossRefold()`s. Each boss's AI reads `e.phase` to add or change attacks, so a new boss should do the same.
- **Swings:** the player sheet has swing bodies with no front arm (frames 9–12, `SWPOSE`) and the lone arm as its last frame (`ARMF`); `updateArm()` draws that arm as its own mesh from `shoulderAt(frame)` to the weapon grip. Sword cuts are a 3-hit combo keyframed in `SWKEYS` (`[k end, arm angle, easing, body frame]`), read through `swingPose()`. The smear trail is rebuilt each frame by sampling that curve, so change the keyframes rather than the trail.
- **Seasons:** new seasonal behavior should read `season()`/`isFest(k)` rather than counting days itself. Crops under a placed background wall (`walls>=2`) or deep underground ignore seasons. The seasonal canopies live at y=1792 in the atlas, below the 64px cells.
- **Town:** props go only on free outdoor ground (no background wall) near `SPAWNX`, never over player blocks. Add an upgrade as a `TOWN` entry with `when()`, `need`, `msg` and either `props` or `run`.
- **Fishing:** rods have `rod`/`fpow`, bait has `bait`, and catches come from `CATCH` (per biome, plus `lava`). The bobber is the `bob` object, updated in `updateFishing()`.
- **Combat hooks:** `hurtEnemy(e,dmg,dir,kb,crit,elem)` and `hurtPlayer(dmg,from,src,elem)`. Pass the attacking enemy or projectile as `src` so shields can block and parry it (`hurtPlayer` returns `'parry'` on a parry); leave it out for damage that can't be blocked, like lava. Damage types are `'fire'`, `'ink'` and `'water'` (`ELEM`); each enemy's weakness, resistance and the type its own hits carry are set in the table right after `EN`, and projectile kinds take a type from `elem` in `PK`. Statuses live in `e.st` / `player.st` and are not saved.
- **Music** is a step sequencer, not audio files: each `MUS` track is 8 bars of 8th notes (`mel` is one hex scale degree per step, `-` holds, `.` rests). `pickMusic()` chooses title, boss or the current biome, and `setMusic()` crossfades. To add a track, add a `MUS` entry and return its key from `pickMusic()`.
- **UI scale:** `--ui` zooms all of `#ui` and `--ts` multiplies every CSS `font-size` (write new ones as `calc(Npx*var(--ts))`). Inside `#ui`, divide viewport units by `var(--ui)`, and set screen-space `left`/`top` from JS with `upx()`, or they land in the wrong place when zoomed.
- **Color vision:** `SET.cb` is `'off'`, `'deut'`, `'prot'` or `'trit'`. Ores always have their own nugget shape (`nug` in `atlas.js`) and take their colors from `ORECOL[SET.cb]`; `applyCB()` redraws the ore cells, icons, map colors and the enemy warning mark. Anything else that relies on color alone should get a shape cue too.
- **Townsfolk:** add an NPC with an `NPCDEF` entry (`need`, `ok()`, `lines`, optional `hello` first-meeting line), a sprite in `buildSheets()`, an `NPCORDER` slot and a `HOUSECARD`/`GIFTS` entry. NPCs whose panel is not special open the generic `'folk'` side panel (dialogue, side quests, their `SHOPS` list). Dialogue that remembers the player goes in `MEMORY` as `[key, who, when(), line]`; each NPC says each new line once when talked to, so keys must stay stable (they are saved in `folk.heard`). Side quests go in `SIDEQ` with either `give` items or a `prog()` returning `[have, need]`.
- **Staged dialogue:** first meetings (`hello`), fresh `MEMORY` lines, partner greetings (`PARTNERS[k].hi`) and the player's lines after the intro (`INTROSAY`) play through `say()`. Line markup: `{happy}`/`{surprised}`/`{sad}`/`{angry}`/`{neutral}` switch the portrait's expression where they appear, `*word*` bounces, `~word~` shivers. `npcLine()` returns marked-up text and sets `lineNew` for lines worth staging; show NPC lines anywhere else through `plain()`. Human portraits are `facePic(type, expr)`, which redraws frame 0 of an `npcSheet()` with `drawHuman`'s expression face; partners get an emote mark on their sprite. A new NPC needs a `VOICE` entry.
- **Partners:** each partner has a `PARTNERS` entry (`hi` recruit lines, `re` the player's reply), a `PQUEST` personal quest and lines in `BANTER`/`CHAT` (`pals.js`). Banter keys are saved in `pals.heard`, so keep them stable. Quick banter (4th field) is a bubble that doesn't stop the game; the rest is staged with `say()` only when no enemies are near. A move upgrade is applied where the move runs in `partnerAbility()`/`updatePartner()` behind `palUp(k)`.
- **Backpack pages:** the tabs over the panel (`#tabs`, `TABS` in `ui.js`) are Backpack (crafting tucked away), Crafting, and pages opened in the side sheet (`party`, `bestiary`, `museum`, `town`); `openSide()` turns the page (`turnPage`) and `syncTabs()` lights the matching tab. Gamepad LB cycles tabs (`cycleTab`). Item hover/focus shows a large card (`itemCard()` into `#tip`) for slots and recipes. Panel sheets take `taped`/`pinned` classes for their paper details.
- **Museum:** collections are `MUSEUM` entries (`items`, `tip`, `reward`); donated ids are saved, so renaming an item id un-donates it.
- **World events:** big events (`wev.k`: `'storm'`, `'army'`) don't overlap and set `wev.cd` (dawns before the next); the Traveling Merchant is separate (`wev.trav`) and is an NPC with no home and a `roam` range. Paper Army soldiers carry `e.army`. A new event needs an `EVENTS` entry, a trigger in `evDawn`/`evDusk`, an update branch and rewards.
- Keep new input actions rebindable: keyboard in `DEF_BIND`/`ALT` (plus a `BINDLAB` label), gamepad in `DEF_PAD` (plus a `PADLAB` label). Start and the d-pad/sticks are fixed, and backpack menus use a fixed gamepad layout (`fx` in `handlePad`).

## Testing

There are no automated tests yet (Playwright smoke tests are planned in #50). To check a change:

1. Run `npm run dev` and load it with the dev console open; confirm there are no errors. Run `npm run build` too, and check the build with `npm run preview` if the change touches boot order or imports.
2. Create a new small world and play briefly.
3. Pause (saves), reload, and Continue: the world should come back intact.
4. Export a save code, reload, and load it from the title screen.

Chromium with Playwright is available in Claude Code cloud sessions for headless checks, but it can't judge game feel or difficulty.

## Roadmap

Planned work is tracked in GitHub Issues, grouped under epic issues #1–#7.
