# The world is unfolding

The main story thread of The Folded Frontier (issue #85). It ties the bosses, partners, ruins and landmarks to one
mystery without gating any sandbox play: every piece is optional, can be found in any order, and nothing waits on it.
The pieces live in `src/lore.js` (`LORE`) and are read in the backpack's **Journal** tab.

## The mystery

The Frontier was folded out of one great sheet, the **First Page**, by the **Folders**, paper-craft makers who lived
here long ago. Every hill is a crease they pressed, the Ink Lake is where the drawing ink pooled, and the paper
creatures climbed out of the folds.

The folds are held in place two ways:

- **Three anchors** pin the sheet down. They are the landmarks you can see from far off: the **Folded Tree** (the first
  fold, in the Paper Meadow), the **Clocktower** (keeps the folds in time and the seasons turning, in the Sandpaper
  Dunes) and the **Paper Dragon** (the Folders' guardian holding down the far edge, in the Origami Snowfield).
- **Four keepers** hold the worst seams: the King Slime glues the surface, the Great Crane keeps the pine fold tight,
  the Inkwell Leviathan calms the ink, and the Charred Folio remembers every fold ever made.

**The folds are failing.** Ink rises under the Ink Moon, the clock has stopped with its top torn off, the dragon
unfolded itself and lies dead in the snow, and the tree drops its leaves out of season. The keepers held on so hard
for so long that the strain turned them wild, which is why they are bosses now.

**Why:** the First Page itself never took a crease. It remembers being flat and wants to rest, so it pulls, gently and
patiently, on every seam at once from under the ink shrine. That is **The Unfolded**.

The Folders are not dead. At the end, a Folder presses themself into the paper and holds it from the inside. **Wren**,
the last of them, left letters in the old rooms for whoever came next.

## The storybook intro

A new world opens on a narrated storybook (`INTRO` in `src/guide.js`, read aloud from `assets/voice/intro-<page>.mp3`).
It tells the setup only: the First Page, the Folders, the three anchors, the four keepers, the folds coming loose and
Wren's letters. It never says why the folds fail; that stays for The Unfolded. If a page's text changes, re-record its
narration file too.

## How The Unfolded fits

The Unfolded is the answer to the mystery, not a villain: the First Page wants to lie flat. Beating it does not refold
the world. The First Page lets go of every seam at once, and instead of falling apart the world starts folding
itself. That is the **World Awakening** (#32): creases where one place folds into another, Foilite (the First Page's
silver lining) along the new folds deep down, and monsters that grow bolder. The epilogue page, Wren's last note,
says the world doesn't need Folders anymore; it needs someone to walk it.

## Where the pieces are

| Pieces | Where | Code |
|---|---|---|
| 3 landmarks | Walk up to the Folded Tree, the Clocktower or the Paper Dragon. They stand on the surface and show on the world map once explored. | `MARKS`, `planMarks()`, `updateLore()` |
| 5 letters (Wren) | Opening a chest in a ruin (brick back wall) or a buried treasure chest, in order, one per chest (`lore.ch`). Chests opened before the story existed still give one. | `loreChest(i)` from the chest code in `gameplay.js` |
| 4 murals | Painted on the back walls of ruins and the ink shrine (`T.MURAL`); worlds with too few rooms get the rest on deep cave walls. Right-click (or tap) one to read it. | `placeMurals()`, `readMural()` |
| 5 keepers | Defeating each boss, including The Unfolded. | `updateLore()` reads `quests` |
| 4 partners | Each partner remembers something about the Folders a little after joining you, and says it. | `updateLore()` reads `player.partners` |
| 1 epilogue | After the World Awakening. | `isAwake()` |

The landmarks are placed from the world seed (`BIO.marks`), and murals are painted into existing ruins once
(`BIO.murals`), so worlds from before the story thread get both the first time they are loaded. Pieces already
earned there (bosses beaten, partners met, an awakened world) fill in quietly on load.

## Adding a piece

Add a `LORE` entry (`k`, `kind`, `t` title, `x` text, `h` hint while locked). Keys are saved in `lore.f`, so keep them
stable. A new letter is `kind:'letter'` and is handed out after the others; a new mural needs a picture in
`C.murals` (`atlas.js`) and a `m<n>` entry; a boss or partner piece uses the boss's quest key or the partner's key.
