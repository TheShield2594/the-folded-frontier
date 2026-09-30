# The Folded Frontier

A papercraft sandbox adventure: Paper Mario's storybook look with Terraria's dig, build, loot and boss loop. Built with three.js, all art drawn procedurally in code.

## Play

**Test build:** https://theshield2594.github.io/the-folded-frontier/

> The GitHub Pages build is for testing only. Saves are kept in your browser, so clearing this site's data (cookies and site data in your browser settings) deletes your world. Use **Save code** in the pause menu to copy a backup of your world. A self-hosted version with server-side saves is planned (see [#7](https://github.com/TheShield2594/the-folded-frontier/issues/7)).

To run locally you need [Node.js](https://nodejs.org/) 20.19+ or 22.12+:

```sh
npm install
npm run dev       # starts a local server and prints its URL
```

`npm run build` makes a static build in `dist/` that you can put on GitHub Pages or any static web host (`npm run preview` serves it locally).

Every push to `main` runs the smoke tests, then deploys to GitHub Pages. The same build is attached to each run as the `folded-frontier-dist` artifact, and published as a container image for self-hosting:

```sh
docker run -p 8080:80 ghcr.io/theshield2594/the-folded-frontier:latest   # or: docker build -t folded-frontier .
```

Serve it over HTTPS (or on localhost): save codes need a secure context.

`npm test` runs the Playwright smoke tests (boot, new world, saving and loading, save codes). Install the browser once with `npx playwright install chromium`.

## Controls

- **Move / jump:** WASD, Space
- **Use item:** left click · **Interact:** right click
- **Backpack & crafting:** E · **Map:** M · **Heal:** H · **Flatten:** C · **Dash:** Shift · **Block:** X or hold right click (needs a shield) · **Pause:** Esc
- Gamepad supported (standard mapping, X dashes, RT uses items, hold B to block); rebind keys and gamepad buttons in Settings, where you can also set interface size and text size
- **Bows:** hold to draw, release to shoot; a full draw always crits
- **NICE! hits:** click again when your sword flashes gold near the end of a swing for 1.8× damage; stomp and tap jump on impact
- **Fishing:** with bait in your backpack, click with a rod to cast into ink (or lava, with the Emberite Rod); click again when the bobber dips

## Features

- Seeded procedural worlds (small / medium / large) with forest, desert, Origami Snowfield, Ink Lake and Burnt Underworld biomes
- Mining, building, crafting stations, ore tiers, grappling hook and rope
- Melee, ranged and magic weapons; bosses including a secret one. Every boss tears open at half and quarter life and comes back with new attacks
- A dash with invulnerability frames and a one-per-jump air dash
- Charged bows, slow and heavy warhammers, and shields that block, or parry when raised just as a hit lands
- Fire, ink and water damage types: fire burns, ink slows, water soaks and puts out fire, and every enemy has its own weakness and resistance
- Enemies with their own attack patterns in every biome, plus rare gold-starred elite variants that hit harder and drop better loot
- NPC townsfolk and housing, partners, badges, farming, potions, weather and the Ink Moon
- Fishing: four rod tiers, three baits, fish for each biome (plus crates and junk), and an Angler who wants a different fish every day
- Music composed in code: a theme for each biome, a boss track and a title theme, crossfading as you travel
- Ambient sound for each biome (wind, lapping ink, birds and crickets, cave drips, underworld embers) that fades with biome, depth and time of day, with its own volume slider
- Paper mechanics: peelable walls, pop-out sketched bridges, flattening, rebuildable camps with fast travel, ruins with secret rooms, treasure maps
- A Bestiary (Backpack → Bestiary) that fills in as you defeat enemies, with each one's biome, kill count and the drops you've seen
- Autosave to the browser, plus **save codes** to move a world between browsers or share it with friends
