# The Magical Storybook

An interactive, choose-your-own-adventure picture book for a four-year-old. She is the hero
of a living storybook: she explores six worlds with friends who remember her, taps, drags,
counts, finds letters and hidden treasures, and makes choices that change what happens and
how each story ends. Letters A–Z and counting to 20 are woven into the adventures, never
as tests. Everything works offline. There are no adverts, accounts, purchases or tracking.

## Getting it on an Android phone

**Option 1: the app (recommended).** Every push that touches the book runs the
*Magical Storybook* GitHub Actions workflow. It tests the book, builds `MagicalStorybook.apk`,
and publishes it on the repository's **Releases** page as the pre-release
**"The Magical Storybook (latest build)"** (tag `storybook-latest`). On the phone, open
that release, download `MagicalStorybook.apk` and open it to install (Android will ask to allow
installs from the browser). It installs alongside the older "Story Stars" app.
Narration uses the phone's own voice: for offline narration, make sure *Speech Services
by Google* has an English voice downloaded (Settings › Accessibility › Text-to-speech).
If an English (New Zealand) voice is installed, it is chosen automatically.

**Option 2: the web version (PWA).** Serve this folder over HTTPS (e.g. GitHub Pages, Netlify)
or locally, open it in Chrome, and choose *Add to Home screen*. After the first visit it works
offline (a service worker stores all ~1,560 files, about 8.7 MB).

**Run locally (any computer, or Termux on Android):**

```sh
cd storybook
node tests/tools/serve.cjs 8080      # or: python3 -m http.server 8080
# open http://localhost:8080
```

## What is inside

- **Six worlds**, 41 connected places: Moonlight Garden, Seashell Cove, Cloud Kingdom,
  Whispering Woods, Snowy Peaks, Dinosaur Valley.
- **Five kinds of goal** per world (wake something magical, find something lost, prepare a
  party, help a baby animal home, fix something), so 30 different quests.
- **16 recurring friends** with personalities, likes, talents, their own recorded voices and
  **memories of earlier stories** ("You're back! Do you remember the little blue butterfly
  we found at the Star Pond?"), taken only from saved story events.
- **20 story events and 19 interaction types**: counting taps, carrying light to lanterns,
  filling baskets, choosing the basket with the right number, singing stones, shaking trees,
  peeking under leaves, pushing clouds, rubbing away snow, following footprints, letter
  bubbles, letter signposts, tracing letters, feeding friends by dragging, keys and chests,
  shape doors, giving the found pieces, cheering a friend on, saying hello.
- **Meaningful decisions** (share your food or search together; help now or promise to come
  back; which treasure to keep) and **seven endings** earned from what happened.
- **More than 100,000 distinct progressions**, proven by a reproducible test
  (148,739 of 150,000 simulated stories were distinct; see `docs/VARIATION_REPORT.md`).
- **The Discovery Book**: letters A–Z with pictures and sounds, numbers 1–20 with
  count-along ten-frames, friends met and their memories, worlds, places, treasures and endings.
- **Gentle adaptive learning**: new letters in a phonics-friendly order, tricky letters return
  in new places, counting grows from 1–5 to 10 to 20 (and eases back if it gets hard),
  numerals appear once counting is confident. No scores, no failure screens.
- **Book layout**: one page at a time on phones, a two-page spread on tablets and phones held
  sideways, with page-turn animations (a calm fade with reduced motion).
- **Grown-ups' corner** (hold the cog on the cover for two seconds, then answer a sum):
  narration on/off, automatic reading, speed, voice, volumes, music, movement, text size,
  contrast, a learning summary, story seeds, storage, reset, privacy and credits.

## Project layout

```
storybook/
  index.html, sw.js, manifest.webmanifest, asset-list.json
  css/            book, interactions, Discovery Book, parent area
  js/
    engine/       rng (seeds), generator (story state machine), validator, signature, memory
    content/      worlds, characters, events, endings, alphabet, numbers, images
    learning/     adaptive learning profile
    interactions/ framework + counting, finding, letters, helping
    render/       scene painter (SVG), book layout & page turns, effects
    audio/        narrator, sound effects & music, clip manifest
    ui/           story page, cover & world picker, Discovery Book, parent area
    save/         local storage, migration
    session.js    connects the engine to saved progress
    main.js       app controller
  assets/         pictures (WebP), fonts, friend voice clips (Ogg Opus), icons
  tests/          unit tests, browser tests, test tools
  tools/          simulator & variation report, asset fetch/convert, clip lists & renderer
  docs/           architecture, decisions, narration research, assets & licences,
                  visual bible, learning design, testing, variation report, journal
storybook-android/  the Android app shell (WebView + native text-to-speech)
```

## Tests

```sh
cd storybook
npm install            # only needed for the browser tests (Playwright)
npm test               # engine, memory, learning, save/load, 130,000-story variation proof
npm run test:browser   # real Chromium: assets, all interactions, full story, resume,
                       # narration, parent gate, offline, 8 screen sizes
npm run variation-report
```

See `docs/TESTING.md` for results and what was and was not tested.
