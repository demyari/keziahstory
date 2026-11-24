# Testing report

Date: 2026-11-24. All results below were produced by running the real code; nothing is
estimated.

## Environments

| Where | What ran |
|---|---|
| Build container (Linux, Node 22.23, Chromium 158.0.8127.36 via Playwright 1.63) | All unit tests, all browser tests, screenshot reviews at 9 screen sizes |
| GitHub Actions `ubuntu-latest` (workflow *Magical Storybook*, run #1) | The same unit and browser tests: **passed**. Android APK `:storybook-android:assembleRelease`: **built, signed and published** as release `storybook-latest` |

## Automated tests (`npm test`, `npm run test:browser`)

**Unit tests: 29 passed, 0 failed** (about 40 s)

- **Content validation:** ids, two-way links, reachability, pictures, safe and readable text.
- **Determinism:** the same seed and choices give identical pages; different seeds differ.
- **World and goal choice:** the chosen world is respected, and all 30 world × goal
  combinations are reachable.
- **5,000 random playthroughs:** no dead ends, contradictions or overlong stories.
- **The finale:** reached only with all three pieces.
- **Choice consequences:**
  - sharing food makes the friend join and uses the food;
  - a promise leads to the "promise kept" ending;
  - the key found in a tree opens the chest, and is used up.
- **Endings:** always consistent with the state, across 3,000 stories.
- **Reachability:** all 7 endings and all events are reached.
- **No repeated scenes** within one story.
- **Validator:** catches contradictions, and invalid choices are refused.
- **Pacing:** the safety net triggers when a story runs long.
- **Character memory:**
  - a treasure found with Hoot is remembered in the next story ("blue butterfly ... Star
    Pond");
  - with no save, nobody claims to remember;
  - reunions quote real memories;
  - memories are bounded.
- **Alphabet:** A–Z each have a sound and pictures; all 26 letters come up over 40 stories;
  tricky letters return.
- **Counting:** progresses 1–5 → 10 → 20 and steps back when tricky; story counts follow the
  child's level; numerals appear only from level 2.
- **Save/load:**
  - a story resumes exactly on the same page;
  - a damaged save is repaired;
  - a broken in-progress story is dropped safely;
  - reset clears progress;
  - no personal fields are stored.
- **Variation proof:** 130,000 stories give ≥100,000 distinct signatures and ≥80,000 coarse
  signatures, with balanced worlds and goals and all 7 endings (also run in CI).

**Browser tests (real Chromium): 19 passed, 0 failed** (about 3 min)

- **Assets:** every picture loads, 1,370 voice clips are listed and served, no console errors.
- **Interactions:** all 19 types complete through a friend's help.
- **Counting by touch:** one tap per object, double taps ignored, counted in order aloud,
  outcome recorded as independent.
- **Letters:** a wrong bubble is named kindly, the hint glows after two misses, the outcome is
  recorded as hinted.
- **Numerals:** a wrong basket is counted aloud and never fails.
- **Drag and drop:** feeding a friend by dragging with the mouse, with a forgiving drop zone.
- **Full story by tapping:** start from the cover, pick a world, use help on interactions,
  pick choices to the end. **Reload mid-story, "Keep reading" returns to the same page.**
  Adventure count, friends met and friends' memories are saved. Narration spoke every page
  with the New Zealand voice preferred over the US one.
- **Narration never blocks:** tapping a choice while reading cancels speech and turns the page.
- **Friend voices:** tapping a friend fetches their recorded clip.
- **Parent area:**
  - a short tap on the cog does nothing, and only a 2-second hold opens the gate;
  - a wrong sum stays closed and the right one opens it;
  - reset erases progress.
- **Offline:** after the first visit the service worker caches all 1,559 files. With the
  network switched off, the book reloads, starts a story, and all pictures and fonts load.
- **Layouts at 320×568, 360×740, 390×844, 430×932, 844×390, 768×1024, 1024×768 and
  1366×1024:**
  - the correct single-page or spread layout is used;
  - there is no sideways scrolling;
  - every button is at least 40 px (most are 48–66 px);
  - choice cards are fully on screen.

## Screenshot reviews (by eye, Chromium)

These were captured with `tests/tools/flow.cjs`, `sizes.cjs`, `screens.cjs` and
`interaction-shots.cjs`.

- **Covered:** the cover, the world picker, complete stories in three worlds, all 19
  interactions before and after play, the Discovery Book tabs and detail pages, and the
  parent area, at phone and tablet sizes.
- **Problems found and fixed:**
  - choices fell below the fold on phones (now a sticky tray);
  - choices fell below the fold on landscape spreads (now pinned under scrolling text);
  - the world picker overflowed on tablets;
  - the cover friends overlapped the title on tablets;
  - the drop cap read awkwardly with one-letter words;
  - speech lines wrapped badly;
  - one treasure picture had a square background;
  - footprints were too faint;
  - cave scenes were too empty;
  - the fox den was wrongly drawn as a cave;
  - an automatic scroll hid the story text.

## Story variation (`tools/simulate.mjs`, full report in VARIATION_REPORT.md)

150,000 simulated stories: **148,739 distinct progression signatures**. Even ignoring places
and companions, 122,011 differ by events, decisions and endings alone. 0 validation errors.

## Not tested, and why

- **The APK on a real phone or emulator.** No Android SDK or emulator could be installed
  here, and this session has no access to the user's phone. CI proves it compiles, is signed
  and is published. Its web content is the same code tested above; the Android-specific parts
  (asset server, native voice bridge, immersive mode, back button) have **not** been run.
  First thing to check on the phone: the book opens, narration speaks, a story saves and
  resumes after closing the app.
- **Real speech output quality.** Browser tests use a recording fake speech engine, because
  the container has no audio device. The 1,370 Kokoro clips passed automatic checks
  (duration 0.57–3.4 s, none empty or truncated, loudness normalised) but no person has
  listened to them.
- **Real touch hardware.** Pointer events were tested with Playwright's mouse and touch
  emulation, not on a physical touchscreen.
- **Other browsers.** Safari and Firefox were not tested (the target is Android Chrome and
  WebView).
- **A child using it.** The design follows the reference pack, but no usability session with
  a four-year-old has happened.
