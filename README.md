# Poppy's Picnic (sample story)

A playable picture-book game for a four-year-old. This is the first, sample story of the
rebuilt project: hand-written, played by touching the picture, with recorded narration.

Poppy the bunny makes a birthday picnic for Bear. The child wakes the sun, pulls up carrots,
chooses the forest (Owl and cherries) or the pond (Duck and mushrooms), decides whether to
share a carrot with hungry Pig, knocks on Bear's door, lays out the picnic and says goodnight
to the moon. What she chose shows up at the party: the food she gathered, the friend who
joined, and Pig's cake if she shared.

- `game/`: the game (Phaser 3, plain JavaScript, no build step).
  - `script/poppys-picnic.json`: every spoken line.
  - `js/story.js`: the scenes. `js/stage.js`: the helpers they use.
  - `CREDITS.md`: artwork and licences (Kenney CC0 art, recorded Kokoro voices).
- `storybook-android/`: the Android app that bundles the game (landscape, offline, no permissions).
- `.github/workflows/storybook.yml`: plays every route in a real browser, builds
  `PoppysPicnic.apk` and publishes it on the Releases page.

## Install on an Android phone

Signed in to GitHub on the phone, open the repository's Releases page, download
`PoppysPicnic.apk` from "Poppy's Picnic: sample story (latest build)" and open it.

## Run on a computer

```sh
cd game
npm start          # then open http://localhost:8080
npm install && npm test   # plays all four routes by touch in Chromium
```

Earlier versions (the generated "Magical Storybook" and the API-based "Story Stars") were
removed from the tree and remain in the git history.
