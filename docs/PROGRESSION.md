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
| Great Crane | Crane Charm (paper, Frostsilver bars) | 1,500 | 12 | 30 | Frostsilver (blade, armor, warhammer; the pickaxe needs its plumes) |
| Inkwell Leviathan | Bottomless Inkwell (Inkstone bars, ink sacs) | 2,300 | 14 | 34 | Frostsilver, Inkstone armor |
| Charred Folio | Burnt Bookmark (Emberite bars, ash) | 3,300 | 18 | 40 | Inkstone (the cutlass and warhammer use the Leviathan's ink hearts) |
| The Unfolded | 5 candles on the shrine pedestals during an Ink Moon | 5,400 | 22 | 44 | Emberite |

Each summon needs the previous tier's bars, and each tier's pickaxe needs the previous boss's drop, so the order is enforced by crafting. The exception is The Unfolded: `checkRitual()` does not check that the Folio is dead, so a player who finds the shrine and lights the candles on an Ink Moon can fight it early. That is hard to do by accident and nothing breaks, so it is left alone.

The Ink Moon rolls at 20% a night from the second night on, so the wait for the final fight averages about five nights (a day is 10 minutes).

## Difficulty curve

Damage to an enemy is `dmg − def/2` and damage to the player is `dmg − defense/2`. Sword hits needed with the best sword available at each fight, and contact damage taken in the full armor set available then:

| Fight | Sword | Hits to kill | Armor set (defense) | Contact hit taken |
|---|---|---|---|---|
| King Slime | Gold Broadsword (25) | 34 | Gold (11) | 21 |
| Great Crane | Frostsilver Blade (32) | 58 | Frostsilver (14) | 23 |
| Inkwell Leviathan | Frostsilver Blade (32) | 92 | Inkstone (18) | 25 |
| Charred Folio | Ink Cutlass (41) | 103 | Inkstone (18) | 31 |
| The Unfolded | Emberite Greatsword (54) | 126 | Emberite (24) | 32 |

Warhammers take about 40% fewer hits at every step. Paper Hearts (17–18 per medium world, +20 life each, capped at 400) keep pace with the rising damage.

The curve rises steadily with no wall. The steepest step is the Leviathan (58 → 92 hits), because its tier's weapons need its own ink hearts, so it is fought with the Crane-tier blade. That is worth watching in a real playtest; if it drags, lowering its life to about 2,000 would bring it to 80 hits.

## Still needs a human playtest

- Total playtime, fresh start to The Unfolded.
- Whether any boss's attack patterns (not just its numbers) spike, especially the Leviathan.
- Whether finding the Ink Lake inkstone, the Snowfield depths and the Underworld is obvious without the map.
