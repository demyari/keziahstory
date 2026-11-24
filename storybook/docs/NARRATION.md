# Narration: research, tests and decision

Checked 2026-11-24. Code, model weights and voices were licence-checked separately.

## Candidates

| Option | What was tested | Quality | Offline on Android | NZ English | Licences |
|---|---|---|---|---|---|
| **Kokoro-82M** via kokoro-onnx 0.6.1 | Installed here; rendered 20 voices × 2 speeds × 4 test items; measured speed, loudness, clipping and duration. 1,370 clips rendered for the app. | Highest of the open options (natural prosody). | Too heavy to run live in a phone browser or WebView (325 MB fp32 model; int8 is 92 MB and no faster). Pre-rendered clips work everywhere. | **No** (British and American voices only) | kokoro-onnx code: MIT. Kokoro-82M weights and voice pack: Apache 2.0. The phonemiser (phonemizer + espeak-ng) is GPL-3.0 but runs only at build time; the shipped audio is not covered by it. |
| **Piper** | Reachability only. Current voices are hosted on huggingface.co, which was blocked here; only 2023 "low" GitHub-release voices were reachable. | Not auditioned | Possible natively, not in a browser without a WASM build | No NZ voice in the published catalogue | rhasspy/piper code MIT; piper1-gpl (successor) GPL-3.0; per-voice licences vary |
| **Android system TTS** (Google Speech Services) | Integrated through a native bridge (`BookVoice.kt`) with en-NZ → en-AU → en-GB → en-IE → en-US preference, female preferred, network voices excluded | Good, varies by device | Yes, once an English voice pack is downloaded | Sometimes, depending on the installed engine; picked automatically if present | Part of the device; nothing bundled |
| **Browser speechSynthesis** | Integrated, same preference order; tested in Chromium with a recorded fake engine | Depends on the device | Chrome on Android uses the device's offline voices | As above | Nothing bundled |

## Decision

- **Story narration uses the device's own voice.** Stories are assembled from about 24,000
  distinct sentences (measured from 60,000 simulated stories), which is far too many to
  pre-record (roughly 5 hours of audio for the narrator alone). Device TTS keeps one
  consistent narrator, works offline, and picks a New Zealand voice whenever one exists.
- **The friends' fixed lines are pre-recorded with Kokoro**, each friend with its own voice
  (`tools/narration-lines.mjs` lists the voice map), so tapping a friend gives a real,
  expressive character voice:
  - **What is recorded:** every friend's hellos, tap reactions, cheers, and fixed sentences
    friends say in many stories.
  - **Size:** 1,370 clips, Ogg Opus 24 kbps mono, about 10 MB on disk, average 1.8 s.
  - **Processing:** loudness normalised to about -20 dBFS, peaks capped, silence trimmed.
  - **Dynamic lines:** a friend's sentence with no clip is spoken by the device voice with
    that friend's pitch and speed.
- **Expressive delivery:** each friend has a pitch and speed profile (bear deep and slow,
  penguin high and quick), and story text is split into sentences so they can be replayed
  and highlighted.

## Controls

- **For the child:** a speaker button (read the page again) and pause/play on every page;
  tapping any word block's drop cap or the place sign speaks a letter.
- **Automatic behaviour:** choices are read aloud as a question after the story text.
  Counting, letters and friends interrupt narration, and a page turn always stops it.
- **Grown-ups:**
  - narration on/off and automatic reading on/off (manual mode means the child taps the speaker);
  - speed: slow 0.75, gentle 0.9 (default), normal 1.0, quick 1.1;
  - narration volume, and separate effects and music volumes;
  - a voice picker with a "Test the voice" button, and recorded friend voices on/off.

## Not done (by design)

No microphone use, no uploads, no voice recordings of people, no voice cloning, and no
cloud TTS.

## Rendering clips again

`tools/render_clips.py` is the renderer (needs `pip install kokoro-onnx` and the model files
from https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0):

```sh
node tools/narration-lines.mjs list clips.json
python -I tools/render_clips.py clips.json assets/audio/clips --jobs 3
node tools/narration-lines.mjs manifest assets/audio/clips
node tools/build-asset-list.mjs
```

**Not yet verified:** no person has listened to the clips. Automatic checks (duration 0.57–3.4 s,
no silent or truncated clips, no clipping after normalisation) passed. A grown-up should
spot-check the voices, and can switch recorded voices off in the parent area.
