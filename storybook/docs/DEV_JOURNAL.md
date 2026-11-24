# Development journal, decision log and task list

## Journal (2026-11-24)

1. **Read the brief and the reference pack. Inspected the environment.**
   - It was a cloud Linux container, not Termux, with Node 22, Python, Java 21, Playwright
     Chromium and ffmpeg.
   - There was no Android SDK, and `dl.google.com` and huggingface.co were blocked;
     raw.githubusercontent.com, GitHub releases, npm, PyPI and Google Fonts were reachable.
   - The repo already held an older API-based "Story Stars" app and an APK workflow.
2. **Chose the architecture** (see decisions below). Fetched 144 Fluent Emoji 3D pictures,
   checked them on a contact sheet, dropped two unsuitable ones, converted the rest to WebP
   (1.2 MB). Bundled the Andika and Fredoka fonts with their OFL licences.
3. **Ran a parallel task to evaluate Kokoro and Piper.** Kokoro ran offline at about 3×
   realtime, about 3 KB per second of audio, with no NZ voice. Piper voices were unreachable.
4. **Wrote the content:** 6 worlds, 41 places, 30 goals, 16 characters, 20 event archetypes,
   7 endings, A–Z.
5. **Wrote the engine** (seeded state machine, pacing, validation, signatures). The first
   20,000-story simulation had 0 errors and 19,984 distinct stories. Read transcripts and
   fixed wording.
6. **Measured narration size:** about 24,000 distinct sentences, too many to pre-record.
   Decided on the device voice for narration plus Kokoro clips for the friends' fixed lines.
   Rendered 1,370 clips in the background.
7. **Built the scene painter** and reviewed all 41 scenes on a contact sheet. Fixed empty
   caves and the fox den palette.
8. **Built the interaction framework and 19 interactions, the story page, cover, world
   picker, Discovery Book, parent area, sounds, music, narrator and page turns.**
9. **Drove whole stories in Chromium at phone and tablet sizes** and fixed what the
   screenshots showed (see TESTING.md).
10. **Wrote the unit and browser tests.** Found and fixed test races: idle animations block
    Playwright's stability wait, and "say hello" finishes instantly.
11. **Wrote the Android shell** with a private https asset origin and a native TTS bridge, and
    a CI workflow. The first CI run passed all tests and built and published the APK.
12. **Reviewed the Discovery Book and parent screens with saved progress** and fixed the world
    picker overflow on tablets. Wrote the documentation and the 150,000-story variation report.

## Decision log

| Decision | Why |
|---|---|
| Offline PWA with plain ES modules, no framework or build step | Most reliable without an Android SDK. Testable in Chromium. Tiny and fast on mid-range phones. Nothing to break at install time. |
| Separate `storybook-android` module, not replacing the old app | Keeps the earlier work intact. A new applicationId lets both install side by side. The existing signing key means updates install over each other. |
| Private `https://appassets.androidplatform.net` origin via `shouldInterceptRequest` | ES modules don't load from `file://`. This avoids AndroidX dependencies (the project uses none) and lets the app block every non-local request. |
| Fluent Emoji 3D for characters and objects | One consistent, premium, soft-toy style covering every character and alphabet word. MIT licensed. Far more coherent than mixing OpenGameArt, Wikimedia or Kenney sets. |
| Original SVG scenes drawn in code | Consistent painted look across 41 places. Tappable decoration. Scales perfectly. About 0 KB of image downloads. |
| Synthesised sound effects and music | No licence risk, no download, never startling, separate volume control. |
| Device TTS for narration, Kokoro clips for friends' lines | Procedural text (about 24k sentences) cannot be pre-recorded. Device voices work offline and can be New Zealand. Clips give friends real character. |
| Save only start options + choices | Exact, compact, deterministic resume. Damaged saves are detected by validation. |
| Signature = places + events + decisions + finale + ending | A meaningful definition that excludes cosmetic wording, counts, letters and pictures. A coarser signature is also reported for honesty. |
| Endings from state, in priority order | Endings reflect what the child did, not a random label. |
| localStorage, not IndexedDB | The data is small (a few KB), it is synchronous and simpler, and migration and repair are easy. |
| Two-page spread when the screen is wide enough (and on phones held sideways) | Uses tablet space like a real open book instead of stretching the phone layout. |

## Task list

- [x] Inspect environment, read reference pack
- [x] Asset research, licences, manifest (docs/ASSETS.md)
- [x] Narration research and test (docs/NARRATION.md)
- [x] Story engine, validation, signatures, ≥100,000 progressions with report
- [x] Recurring characters with saved, bounded memories and reunions
- [x] Alphabet A–Z, counting 1–20, adaptive progression
- [x] 19 interaction types in a reusable framework
- [x] Book UI: cover, world picker, story pages, page turns, endings, phone and tablet layouts
- [x] Discovery Book (letters, numbers, friends, worlds) with fly-in discoveries
- [x] Parent area with gate, settings, learning summary, seeds, storage, reset, privacy, credits
- [x] Offline: service worker and bundled APK
- [x] Automated unit and browser tests; CI; APK published
- [ ] Try the APK on the real phone (needs the user)
- [ ] Listen to the friend voice clips and re-render any that sound wrong
- [ ] Optional: publish the web version on GitHub Pages (needs Pages turned on in repo settings)
- [ ] Ideas: more worlds and events, seasonal stories, a bedtime mode with a calmer pace
