# Clip overrides

`<rig>.json` files saved from the animation viewer (`npm run dev`, then open `/dev/anim.html`). Each holds
`{clip: {len, loop, bl, tr}}` in the format `defRig()` takes (`src/rig.js`); `src/art.js` lays them over the
rig's coded clips at boot. Delete a file to go back to the clips in the code.
