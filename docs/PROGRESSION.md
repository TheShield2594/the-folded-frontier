# Progression audit (medium world)

A check of the path from a fresh start to The Unfolded on a medium world (640 × 220), for issue #15. The numbers come from the game's own data (`ITEMS`, `RECIPES`, `EN`) and from generating eight medium worlds (seeds 1, 2, 3, 42, 1234, 777, 9001, 31337) in the browser and counting tiles. They say whether the path works on paper. How it feels to play, and how long it takes, still needs a person at the keyboard.

## Ore tiers

Each pickaxe mines the next ore, and every tier past Gold needs a drop from the boss before it:

| Ore | Pick power | Mined with | Where | Tiles per medium world | Avg depth |
|---|---|---|---|---|---|
| Copper | 1 | Copper Pickaxe (starting) | everywhere, 4+ below the surface | 2,057–3,361 | 52–59 |
| Iron | 1 | Copper Pickaxe | everywhere, 20+ down | 1,374–1,965 | 54–64 |
| Gold | 2 | Iron Pickaxe | everywhere, 45+ down | 761–1,652 | 70–74 |
| Frostsilver | 3 | Gold Pickaxe | Origami Snowfield, 22+ down | 606–882 | 57–74 |
| Inkstone Ore | 4 | Frostsilver Pickaxe (needs Great Crane plumes) | in the inkstone around the Ink Lake | 216–353 (before the fix below) | 13–17 |
| Emberite | 5 | Inkstone Pickaxe (needs Leviathan ink hearts) | Burnt Underworld | 827–1,102 | 109–117 |
| Foilite | 6 | Emberite Pickaxe (needs Folio cinder cores) | seeded by the World Awakening, after The Unfolded | 0 at generation | — |

The order is sensible and each ore sits where its boss is fought. Copper, iron and gold all turn up within 120 tiles of spawn in every seed.

**Fixed: Inkstone Ore was too scarce.** It only forms in the inkstone band around the Ink Lake, and at the old noise threshold (`> .74`) a medium world had 216–353 tiles, which smelt into 54–88 bars. The Ink tier's core kit alone costs 83 bars (Bottomless Inkwell 10, pickaxe 15, cutlass 14, armor 44), less the 5–10 the Leviathan drops, so on some seeds the player had to strip every Inkstone Ore tile in the world just to get the pickaxe and armor. The threshold is now `> .64`:

| World size | Inkstone Ore at `.74` | at `.64` |
|---|---|---|
| Small | 142–258 | 301–521 |
| Medium | 216–353 | 451–635 |
| Large | 365–519 | 706–952 |

That puts it close to Frostsilver. Existing saves keep the tiles they were generated with; only new worlds get the extra ore.

**Fixed: the Gold Pickaxe said it "mines everything".** It mines up to Frostsilver; the text now says so.

## Boss order

| Boss | Summoned with | Life | Defense | Contact damage | Gear you can have by then |
|---|---|---|---|---|---|
| King Slime | Gel Crown (gel, gold bars) | 750 | 6 | 26 | Gold |
| The Pulper (the Great Scrapworks) | Its front door opens once the King Slime is defeated | 1,100 | 8 | 26 | Gold |
| Great Crane | Crane Charm (paper, Frostsilver bars) | 1,500 | 12 | 30 | Frostsilver (blade, armor, warhammer; the pickaxe needs its plumes) |
| Inkwell Leviathan | Bottomless Inkwell (Inkstone bars, ink sacs) | 2,300 | 14 | 34 | Frostsilver, Inkstone armor |
| Charred Folio | Burnt Bookmark (Emberite bars, ash) | 3,300 | 18 | 40 | Inkstone (the cutlass and warhammer use the Leviathan's ink hearts) |
| The Starfold (the Origami Observatory) | Its front door opens once the Folio is defeated | 4,200 | 21 | 42 | Emberite |
| The Unfolded | 5 candles on the shrine pedestals during an Ink Moon | 5,400 | 22 | 44 | Emberite |
| The Grand Nib (the Sunken Inkwell Temple) | Its front door opens once The Unfolded is defeated | 6,200 | 24 | 48 | Foilite |

Each summon needs the previous tier's bars, and each tier's pickaxe needs the previous boss's drop, so the order is enforced by crafting. The exception is The Unfolded: `checkRitual()` does not check that the Folio is dead, so a player who finds the shrine and lights the candles on an Ink Moon can fight it early. That is hard to do by accident and nothing breaks, so it is left alone.

The Ink Moon rolls at 20% a night from the second night on, so the wait for the final fight averages about five nights (a day is 10 minutes).

## Difficulty curve

Damage to an enemy is `dmg − def/2` and damage to the player is `dmg − defense/2`. Sword hits needed with the best sword available at each fight, and contact damage taken in the full armor set available then:

| Fight | Sword | Hits to kill | Armor set (defense) | Contact hit taken |
|---|---|---|---|---|
| King Slime | Gold Broadsword (25) | 35 | Gold (11) | 21 |
| Great Crane | Frostsilver Blade (32) | 58 | Frostsilver (14) | 23 |
| Inkwell Leviathan | Frostsilver Blade (32) | 92 | Inkstone (18) | 25 |
| Charred Folio | Ink Cutlass (41) | 104 | Inkstone (18) | 31 |
| The Unfolded | Emberite Greatsword (54) | 126 | Emberite (24) | 32 |

**Endgame armor sets.** After the Folio, the three sets (Emberite bars plus a boss material each) are the alternatives to Emberite armor for The Unfolded. They trade defense for a full-set bonus that suits a style: Crease Warden (melee, 24 defense, the same as Emberite, +20% melee damage and 1 life per hit, so about 105 Greatsword hits instead of 126), Skystring (ranged, 19 defense, contact hit 35) and Inkweaver (magic, 16 defense, contact hit 36). The two lighter sets are for players who keep their distance.

Warhammers take about 40% fewer hits at every step. Paper Hearts (17–18 per medium world, +20 life each, capped at 400) keep pace with the rising damage.

The curve rises steadily with no wall. The steepest step is the Leviathan (58 → 92 hits), because its tier's weapons need its own ink hearts, so it is fought with the Crane-tier blade. That is worth watching in a real playtest; if it drags, lowering its life to about 2,000 would bring it to 80 hits.

## Vertical layers and the Folded Clocktower

Added after the audit above, which was made on 640 × 220 medium worlds. Worlds are now taller (small 420 × 200, medium 640 × 260, large 900 × 300) to make room for two layers, and the surface sits at 63% of the height.

| Step | Gate | What it opens |
|---|---|---|
| The Pressed Deep (a band of Pressed Slate right above the Burnt Underworld) | Pick power 4: the Frostsilver Pickaxe, so after the Great Crane | Ancient machines (Ancient Cogs, a chest each), giant fossil skeletons (a fossil from every bone; the Giants of the Deep museum collection), underground ink lakes, gold veins, Clockwork Beetles. The Underworld is below it, so the Charred Folio's region now also waits for the Crane, one step before its Emberite is minable anyway |
| The Folded Clocktower (a hand-built dungeon on the surface) | Its front door opens once the Great Crane is defeated | A crank puzzle behind a peel wall and a crawlspace, a sketched bridge, the Clockwork Sentinel (mini-boss, an elite with 598 life) and The Mainspring (boss, 1,900 life, defense 13, contact 30: between the Crane and the Leviathan) |
| Sky islands (above the clouds) | Clockwork Wings, the Clocktower's reward (hold jump to fly for 1.6 s) | Skyglass Ore (pick 3) for the Skyglass Hook (twice the reach) and Saber, sky ruins with a chest each, Paper Rays |

With a Frostsilver Blade (32) the Mainspring takes about 75 hits, between the Crane (58) and the Leviathan (92). Nothing on the main boss path needs the layers: they are side routes that pay out in cogs, skyglass, fossils and the wings. Worlds saved before the layers keep their terrain: they get the clocktower and sky islands where those fit on untouched ground, and no Pressed Deep.

## Paper tricks

Three tools open side pockets in places you already passed (`tricks.js`). Each is crafted at an anvil from a boss's materials, so they come one per boss and send you back into earlier caves. None of the spots is on the way forward: each hides a chest.

| Trick | Tool (anvil recipe) | Earliest | What it opens |
|---|---|---|---|
| Tear | Seam Ripper (4 iron bars, 2 crane plumes) | After the Great Crane | A stitched seam in a cave wall (unbreakable) with a small brick pocket and a chest behind it. 2 per small world, about W/200 |
| Stitch | Golden Needle (4 gold bars, 1 ink heart, 5 rope) | After the Inkwell Leviathan | A torn hole ten tiles across in the floor of a low corridor dug into the rock; stepping in throws you back (no damage: it's a locked door, not a trap). Sewn shut, its top row is a paper bridge to a pocket with a chest. 1–2 per small world |
| Fold | Bone Folder (a Paper Ammonite, a Folded Trilobite, a cinder) | After the Charred Folio (fossils come from the Pressed Deep) | A crease mark on a cave floor whose partner is in a vault sealed all round, with a treasure chest. The vault's crease folds you back out without the tool. 1 per small world, about W/300 |

## The Hollow Archive

The second hand-built dungeon (`dungeons.js`, issue #81), dug into the rock under a small gatehouse. Its front door opens once the Inkwell Leviathan is defeated, and its puzzle uses two of the paper tricks, so it also needs the Seam Ripper (after the Crane) and the Golden Needle (from the Leviathan's ink heart):

| Floor | What's there |
|---|---|
| Reading room | A stitched seam (Seam Ripper) between the rope down and the crank; the crank opens a gate in the floor. A fake wall hides a chest and a Paper Heart |
| Stacks | A torn curtain across the corridor (Golden Needle sews it shut), then a peel wall and a rope down |
| Arena | The Stack Warden (mini-boss, always an elite: 832 life, defense 15, contact 39; flings pages when you keep your distance) |
| Boss chamber | The Bookmoth (boss, 3,000 life, defense 16, contact 36): dives, fans of ink dust, mothlings (up to four), rings of pages after 50%, a storm of dust from the ceiling at 25% |

With the Ink Cutlass (41) the Bookmoth takes about 91 hits, close to the Leviathan (92) and under the Folio (104); with the Frostsilver Blade it is about 125. In Inkstone armor (18) its contact hit does 27. Its reward is the Archive Key, which opens the Lost Stacks: sealed reading rooms in deep caves (2 in a small world, about W/180), each with a chest of treasure. Nothing on the main boss path needs the Archive.

It is only placed when a world is generated, where it takes the spot that cuts the fewest generated structures; it found a spot on every one of 16 seeds tried (small, medium and large). Worlds saved before it existed don't get it or the Lost Stacks.

## The Origami Observatory

The third hand-built dungeon (`dungeons.js`, issue #81), floating in empty sky beside one of the sky islands, so the Clockwork Wings (or the Skyglass Hook) are the way up. Its front door opens once the Charred Folio is defeated, and its puzzle needs the Bone Folder (fossils from the Pressed Deep and a cinder core from the Folio):

| Floor | What's there |
|---|---|
| Hall | A crease on the floor folds you into a sealed vault with the crank (Bone Folder); the vault's own crease folds you back out, tool or not. The crank opens a hatch over the rope. A peel wall stands in front of the rope |
| Arena | The Stargazer (mini-boss, always an elite: 1,040 life, defense 19, contact 42; throws fans of stars or calls one down when you keep your distance). A fake wall hides a chest and a Paper Heart |
| Dome | The Starfold (boss, 4,200 life, defense 21, contact 42): dives and fans of stars; after 50% it folds the dome along its middle and steps out on the other side with a ring of stars; at 25% stars fall from the dome |

With the Emberite Greatsword (54) the Starfold takes about 97 hits, between the Folio (104 with the Ink Cutlass) and The Unfolded (126). In Emberite armor (24) its contact hit does 30. Its reward is the Star Lens, which opens the Star Vaults: sealed rooms floating in the high sky (2 in a small world, about W/180), each with a chest of treasure. Nothing on the main boss path needs the Observatory.

It needs only empty sky near an island, so it is placed at generation and, for older saves, the first time they load. It found a spot on all nine seeds tried (six small, two medium, one large), each with its Star Vaults.

## The Great Scrapworks

The first hand-built dungeon in play order (`dungeons.js`, issue #81), a paper mill on the surface. Its front door opens once the King Slime is defeated, and its puzzle only uses the paper tricks every player starts with:

| Floor | What's there |
|---|---|
| Mill floor | A peel wall at the door, then a crawlspace to flatten through to the crank; the crank opens a hatch over the rope up |
| Sorting floor | A sketched bridge over a pit of shredders (they bite for 16 and throw you up). A fake wall hides a chest and a Paper Heart |
| Arena | The Scrap Foreman (mini-boss, always an elite: 390 life, defense 6, contact 25; throws gears when you keep your distance) |
| Pulping room | The Pulper (boss, 1,100 life, defense 8, contact 26): walks, charges wall to wall, shreds fans of pages, spits crumples; at 25% it hops and slams while scraps rain from the ceiling |

It sits between the King Slime (750) and the Great Crane (1,500). Its reward is the Crowbar, which opens the Supply Crates: nailed-shut storerooms in the shallow caves (about W/140, at least 3), each with early supplies. At generation it may cut through generated structures like the dug-in dungeons, so it fits every small world tried (21 seeds); older saves get it on load only where there's untouched ground.

## The Sunken Inkwell Temple

The post-game dungeon (`dungeons.js`, issue #81), dug in beside the Ink Lake under a small gatehouse. Its front door opens once The Unfolded is defeated, and it needs every paper trick:

| Floor | What's there |
|---|---|
| Ink shaft | Swim down a flooded shaft from the gatehouse |
| Hall | A stitched seam (Seam Ripper) in front of a crease that folds into the crank's sealed vault (Bone Folder; its own crease folds you back out). The crank opens a gate in the floor |
| Stacks | A torn curtain (Golden Needle), then a peel wall and a rope down |
| Arena | The Drowned Scribe (mini-boss, always an elite: 1,456 life, defense 24, contact 48; flings fans of ink). A fake wall hides a chest and a Paper Heart |
| Nib chamber | The Grand Nib (boss, 6,200 life, defense 24, contact 48): stabs down, writes a line of ink across the chamber, calls Ink Blots (up to four), rings of ink after 50%, an ink flood from the ceiling at 25% |

With the Foilite Saber (66) it takes about 115 hits, past The Unfolded, as the post-game's hardest fight. Its reward is the Well Nib, which opens the Ink Wells: sealed grottos in and around the Pressed Deep (about W/180, at least 2), each with post-game treasure. It is only placed at generation (near the lake when it fits, anywhere otherwise); it placed on all 21 seeds tried. Worlds saved before it existed don't get it or the Ink Wells.

## Still needs a human playtest

- Total playtime, fresh start to The Unfolded.
- Whether any boss's attack patterns (not just its numbers) spike, especially the Leviathan.
- Whether finding the Ink Lake inkstone, the Snowfield depths and the Underworld is obvious without the map.
- Whether the Clocktower's puzzle reads without hints, and whether the Mainspring's gear rain in its small chamber is fair.
- Whether the Hollow Archive's seam and torn curtain read as "come back with a tool", and whether the Bookmoth's dust storm plus mothlings is too busy.
- Whether the Scrapworks' crawlspace and sketched bridge read for a new player, and whether the Pulper's charge in a small room is fair that early.
- Whether the Temple's ink shaft reads as the way in, and whether the Grand Nib's ink flood plus blots is too busy.
- Whether the Origami Observatory is easy to reach from its island with the Clockwork Wings, whether the crease on the hall floor reads as the way to the crank, and whether the Starfold's fold is readable before it lands.
