# Architecture

## Platform decision

The build ran in a cloud Linux container (not Termux), commissioned from an Android phone.
It had Node 22, Python 3, Java 21, Playwright with Chromium and ffmpeg. It had **no Android
SDK**, and `dl.google.com` was unreachable, so a native APK could not be built or run locally.
The repository already had a GitHub Actions workflow that builds APKs.

The chosen architecture is therefore:

1. **An offline-first PWA** written in plain ES modules: no framework, no build step, no runtime
   dependencies. It runs in any modern browser and is what all the tests exercise.
2. **A thin Android shell** (`storybook-android/`) that bundles the same files into an APK and
   serves them from a private `https://appassets.androidplatform.net` origin inside the app,
   so module scripts, `fetch` and `localStorage` behave exactly as in Chrome. It adds a native
   text-to-speech bridge, because Android WebView has no working `speechSynthesis`. It needs
   no internet permission. The APK is built and published by CI.

## Modules (separation of concerns)

| Concern | Module |
|---|---|
| Deterministic randomness, seeds | `js/engine/rng.js` |
| Story generation (state machine) | `js/engine/generator.js` |
| Narrative validation | `js/engine/validator.js` |
| Progression signatures | `js/engine/signature.js` |
| Character memory | `js/engine/memory.js` |
| World data | `js/content/worlds.js` |
| Characters | `js/content/characters.js` |
| Story events (authored building blocks) | `js/content/events.js` |
| Endings | `js/content/endings.js` |
| Alphabet, numbers | `js/content/alphabet.js`, `js/content/numbers.js` |
| Educational progression | `js/learning/progress.js` |
| Interaction framework + 19 types | `js/interactions/*` |
| Animation & effects | `js/render/fx.js`, CSS keyframes |
| Scene illustration | `js/render/scene.js` |
| Responsive book layout, page turns | `js/render/book.js`, `css/book.css` |
| Sound effects & music | `js/audio/sfx.js` |
| Narration | `js/audio/narrator.js` (+ `storybook-android/.../BookVoice.kt`) |
| Assets | `js/content/images.js`, `asset-list.json`, `sw.js` |
| Collection book | `js/ui/collection.js` |
| Save/load | `js/save/store.js`, `js/session.js` |
| Parent settings | `js/ui/parent.js` |
| App flow | `js/main.js` |

## The story engine

A story is a pure state machine:

```
startAdventure({seed, worldId?, learn, recall, foundSecrets}) -> state
getPage(state)  -> { kind, lines, interaction, after, question, choices, cast, scene, ... }
choose(state, choiceId) -> new state
```

**State** holds: seed, world, goal, companion, phase (intro / scene / consequence / climax /
ending), step, location, visited places, goal pieces found, inventory, friends who joined,
friends met, promises, treasures, flags (kind, clever, helper), a log of
`{location, event, decision}`, letters and counts practised, the ending, new memories, and the
starting snapshot of the learning settings and friends' memories.

**Determinism.** Every random decision uses an RNG derived from the seed plus its context
(step, place, event), never from a global counter. The same seed, the same starting profile
snapshot and the same choices always reproduce the same story. Saving stores only the start
options and the list of choices; loading replays them. Progress therefore cannot drift, and a
corrupted save is detected by re-validation and dropped.

**Each scene.** On arriving somewhere the engine picks an event from the authored pool:

1. Filter by the place's tags (tree, water, sky, cave, ...).
2. Filter by requirements: a resident to meet, a key for a chest, food to share, saved
   memories for a reunion, no event used twice.
3. Apply pacing: if the remaining pieces are as many as the scenes left, only piece-giving
   events are allowed. After seven scenes a "friends help" safety-net event completes the
   quest, so a story can never drag on or dead-end.
4. Pick a weighted, seeded event.

The event writes itself from a context: the next goal piece, a local resident, a count sized
to the child's level, a letter moment, a world food or countable, a treasure not yet found.
Its effects are applied when the child moves on. Travel choices offer unvisited linked places
first. Once all three pieces are found, the choices become ways to reach the finale (walk,
ride a friend, follow the map, skip and sing).

**Endings** are chosen from state in priority order: promise kept, grand parade (2+ friends
joined), kind heart, treasure hunter, clever explorer, keepsake, cosy goodnight.

**Signatures** (`signature.js`) record world, goal, companion, each place with its event and
decision, the way to the finale and the ending. Wording, counts, letters and pictures are
excluded as cosmetic.

## Validation

- `validateContent()`: ids, two-way links, reachability of every place, 3 pieces per goal,
  pictures exist, every letter word has a picture, no unsafe words, no unfilled templates,
  sentences short enough to read aloud.
- `validateState()`: known world, goal, companion and places; pieces in range; no duplicate
  inventory; companion never doubles as a joining friend; no friend both joined and waiting
  on a promise; friends met before joining; treasures from this world; no repeated scenes;
  bounded length; finale only with all pieces; food kind consistent with inventory.
- `validatePage()`: every non-ending page has choices, unique choice ids, valid destinations,
  speakers exist, text is safe, interaction pictures exist, counts in 1–20, and the right
  numeral is among the options.

The simulator runs all three on every page of every simulated story.

## Interaction framework

`mountInteraction(spec, ctx)` mounts a registered type into the picture's play layer.

- **Interface:** each type returns `help()` (a friend models the action) and `destroy()`, and
  reports exactly one outcome: `independent`, `hinted` or `helped`. There is no failure state.
- **Helpers:** sprites positioned in % of the picture, forgiving drag with generous snap
  zones, spreading N objects, count badges, hints.
- **Scaling:** all sizes are % or container-query units, so every interaction scales from a
  320 px phone to a tablet.
- **Help button:** "Help me, Sparkle!" appears after 9 seconds.
- **Optional extras:** character taps, scene decorations and the hidden treasure never block
  progress.

## Memory

Memories are small typed records (`{who, type, secret, place, food, n, things, world, goal}`):

- **Bounded:** at most 6 per friend.
- **When stored:** committed when a story ends; hidden treasures found by exploring are added
  then too.
- **Recall:** a friend recalls only its newest real memory. The intro greets with it if that
  friend is the companion; otherwise a reunion event appears where they live.
- **No fabrication:** with no saved memory, nothing claims to remember (tested).

## Narration pipeline

Narration goes sentence by sentence, with the current sentence highlighted. A friend's
sentence that has a pre-recorded clip plays the clip; anything else goes to native Android TTS,
then browser `speechSynthesis`, then silent timing. Any new speech or page turn cancels the
current one, so narration never blocks play. See NARRATION.md.

## Offline

`tools/build-asset-list.mjs` writes `asset-list.json` (every file plus a content hash). The
service worker caches all of them on install, serves cache-first, and replaces the cache when
the hash changes. The APK bundles everything and blocks all non-local requests.
