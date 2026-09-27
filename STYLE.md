# STYLE.md

The art style of The Folded Frontier, for anyone making sprites, tiles, icons or key art (by hand, in code, or with an image model). The one-line version: **a Paper Mario-style world of cut-paper stickers: flat soft colours, thick dark ink outlines, a cream paper border around every shape, and a light paper grain.**

`CLAUDE.md` lists which art is painted and which is still drawn in code, and how painted art gets into the game.

## The look

- **Paper cut-outs.** Every object reads as a piece of paper cut out and stuck on: a flat shape with its own border. Characters are made of separate pieces (head, torso, arms, legs), like a paper doll.
- **Ink outline.** A thick, even, dark plum-black outline, `INK = #2a2130` (never pure black). Inner detail lines (creases, bark grooves, hair strands) are thinner and can be a darker shade of the fill.
- **Cream sticker border.** Outside the ink, a cream paper border, `#fbf5e6`, all the way round the silhouette. In code, `makeSheet`/`stickerAt` add it (3 to 4 px at 1x). In painted art, it's the white border the renders come with.
- **Flat soft colour, simple shading.** One base colour per area, a darker shade for folds and the side away from the light, and one lighter highlight stroke on the upper left. No gradients beyond that, no realistic lighting, no cast shadows. The light comes from the upper left.
- **Rounded and chunky.** Soft rounded shapes, cute chibi proportions (the head is about a third of a character's height), and nothing spindly. Origami creatures (Fold Fox, Great Crane) are the exception: they have crisp folded facets, but keep the same outline, border and palette.
- **Paper grain.** A light speckle or fibre texture over everything (`grain()` in code). It should be barely visible at game size.
- **The game adds the lighting.** Sprites are drawn fully lit; the shader tints them for day/night, caves and torchlight, and flashes them white when hit. Don't bake darkness or glow into a sprite.

## Palette

Reuse these before inventing new colours; they come from the code.

| Use | Colours |
|---|---|
| Ink and paper | ink `#2a2130`, sticker border `#fbf5e6`, paper white `#f4f0e6`, `#fbf8f0` |
| Player | skin `#f1cfa6`, hair `#5a3526`, tunic `#2f7f86`, trousers `#3b3552`, boots `#6b4430`, scarf `#d4483b`, satchel `#b9874f` |
| Foliage | leaf `#5aa83c`, leaf shadow `#3f7a2b`, leaf highlight `#86d15f`; dark variety `#3f8f4f` / `#2f6a3a` / `#6cc07a`; pine `#3f7a5f` / `#2e5a4a` |
| Wood | bark `#7b5234`, bark groove `#5a3a22` |
| Fold Fox | orange `#e0823d`, folds `#b8612a`, cream `#f4f0e6` |
| Accents | gold `#f1c04f`, heart red `#e0506b`, slime green `#6cc57a`, slime blue `#5aa7e0`, ink purple `#5a3f7a` |

Damage types have colour identities: fire is orange/yellow (`#ff7a2d`, `#ffd66b`), ink is purple-black, water is blue. Enemies of a biome share its palette (snowfield: whites and pale blues, ink areas: purples, ash areas: charcoal and ember orange).

## Sprite rules

- **View:** strict side view, facing **right**. The game mirrors sprites to face left, so nothing may be lettered or asymmetric in a way that breaks when flipped.
- **Anchor:** walking things stand on the bottom edge of their frame, with the feet a few pixels above it (`spriteMesh` anchors at the bottom). Flying things are centred.
- **Frames:** sheets are one row of equal frames, left to right.

| Kind | Frame size at 1x (painted files can be 2x) | Frames |
|---|---|---|
| Player | 96×144 | 9: idle ×2, walk ×4, rising, falling, swing/block (`POSES`) |
| NPCs and humanoid enemies | 96×144 | 2 (idle/step) |
| Other enemies | `fw`×`fh` from `EN` (e.g. Fold Fox 128×96) | 2 (step or flap) |
| Bosses | their `SHEETS` size (e.g. King Slime 340×280) | 2 |
| Partners | 96×96 | 2 |
| Tiles, item icons, badges | 64×64 atlas cell | 1 |
| Tree canopies | 256×256 atlas region, drawn 4×4 tiles (5×5 when painted) | 1 |
| Painted trunk | 128×64 atlas region, drawn 2 tiles wide | bark tile + root base |

- **Scale:** one tile is 64 px in the atlas and about 60 px of sprite art per world unit (`e.sw = fw/60`). The player is about 1.9 tiles tall; keep new creatures sized against that.
- **Two frames are enough** for most creatures: the second frame moves the legs, wings or body a little (a step, a squash, a flap). Keep everything else identical so it doesn't jitter.
- **Readable at game size.** A sprite is shown at roughly 50 to 130 px on screen. Big shapes, strong silhouettes and a clear eye beat fine detail. Check it small before calling it done.

## Making painted art with Higgsfield

What has worked so far (see `CLAUDE.md` for the account and credit notes):

- **Model:** Nano Banana Pro (`nano_banana_pro`, 2 credits, 2k). It follows the style and keeps a character consistent across renders. Seedream 4.5 is cheaper but drifted into pixel art for the player.
- **Consistency:** pass an earlier render as a reference (`medias: [{value: <job id>, role: "image_references"}]`) and say "the exact same ... from the reference image". That's how the Fold Fox's second frame, the trunk and the player parts matched their originals.
- **Background:** ask for a plain flat light grey background, no shadow, no ground, no text. `tools/art/cut.py` removes it.
- **Characters that animate:** ask for a parts sheet (head, torso, one arm, one leg, plus any gear) in side view, "laid out in a row with generous empty space between them, none touching", and rig the pieces in code, as the player does.

Prompt template (fill in the brackets):

> 2D game [enemy sprite / item icon / tile], full body, strict side view facing right, [pose]. [Subject, with its colours given as hex codes from the palette above]. Papercraft style like Paper Mario: a flat cut-out made of paper with thick dark plum-black ink outlines (#2a2130), a white paper cut-out border around the whole silhouette, subtle paper grain texture, flat soft colors, rounded chunky shapes[, cute chibi proportions]. Plain flat light grey background, no shadow, no ground, no text, centered, whole [subject] visible.

After generating: cut out the background, scale to the frame size (2x is fine), check the silhouette at game size and next to its neighbours in a screenshot, then save as `.webp` (quality around 90, lossless for masks) in `assets/`.

## Don'ts

- Pure black outlines, thin or sketchy lines, or no outline.
- Gradients, glossy 3D rendering, photo textures, realistic lighting or cast shadows.
- Pixel art, or anything that reads as a different game.
- Front or three-quarter views for sprites (key art like the title screen can use any angle).
- Text or logos inside sprites.
