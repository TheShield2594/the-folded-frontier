# Test art

Pictures for the smoke test `art files are found and painted in at boot`. The Playwright dev server sets `FF_ART_DIR=tests/fixtures/art`, so the `@art` glob in `src/art.js` reads this folder instead of `assets/art/`. Real builds never see it, and `tests/check-dist.mjs` fails CI if one of these ends up in `dist/`.

- `atlas/swFe.png`, `atlas/crack.1.png`: a single cell and an array cell (solid magenta, green)
- `atlas/heart.png`: 32×32, scaled with a warning (blue)
- `atlas/noSuchCell.png`: names no cell, skipped with a warning
- `sheets/stag.png`: the mount's 480×112 sheet (cyan)
- `misc/stray.png`: not in `atlas/` or `sheets/`, ignored with a warning

The test counts these, so update it when you add or remove one.
