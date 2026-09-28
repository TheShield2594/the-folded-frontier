# Hand-made art

Images here replace the procedural art of the same name. Anything without a file keeps its drawn art.

- `atlas/<name>.png`: a 64×64 atlas cell, named after its key in `C` (`src/atlas.js`), for example `swFe.png` for the Iron Sword icon or `crack.1.png` for `C.crack[1]`.
- `sheets/<name>.png`: a whole sprite sheet, named after its key in `SHEETS`, at the drawn sheet's size (frames side by side), for example `folio.png` at 680×280.

In the dev console, `(await import('/src/game.js')).artList()` lists the names and sizes, and `artExport(kind, name)` downloads the drawn version to paint over. See `docs/ART.md` for what's worth replacing and the style to keep.
