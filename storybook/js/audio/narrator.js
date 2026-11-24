// Narration. Speaks story lines one sentence at a time so text can be
// highlighted, and never blocks the child: every call can be interrupted.
//
// Voices, in order of preference:
//   1. Pre-recorded character clips (Kokoro, assets/audio/clips) for friends' fixed lines.
//   2. The Android app's native text-to-speech bridge (window.StoryVoice).
//   3. The browser's speechSynthesis (offline voices on Android Chrome).
//   4. Silent timing, so the story still flows with text only.

import { CHARACTERS } from '../content/characters.js';
import { clipId, splitSentences } from './clipid.js';

let CLIPS = new Set();
import('./clips.js').then((m) => { CLIPS = m.CLIPS; }).catch(() => {});

const PREFERRED_LANGS = ['en-NZ', 'en-AU', 'en-GB', 'en-IE', 'en-ZA', 'en-US', 'en'];
const FEMALE_HINT = /female|woman|karen|catherine|serena|kate|libby|sonia|natasha|moira|tessa|fiona|samantha|victoria|zira|hazel|susan|aria|jenny|clara|olivia|amy|emma/i;

const settings = { enabled: true, speed: 0.9, volume: 1, voiceName: '', useClips: true };
let generation = 0;
let paused = false;
let current = null; // { stop() }
let webVoice = null;
const listeners = new Set();

const native = () => globalThis.StoryVoice || null;
const web = () => (globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance ? globalThis.speechSynthesis : null);

export function configure(s) {
  Object.assign(settings, s);
  pickWebVoice();
  if (native() && native().setVoice) try { native().setVoice(settings.voiceName || ''); } catch { /* ignore */ }
}

export function onState(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(state) { for (const fn of listeners) try { fn(state); } catch { /* ignore */ } }

// ---------- voice choice ----------
export function availableVoices() {
  if (native()) {
    try { return JSON.parse(native().voices() || '[]'); } catch { return []; }
  }
  const w = web();
  if (!w) return [];
  return w.getVoices().filter((v) => /^en/i.test(v.lang)).map((v) => ({ name: v.name, label: `${v.name} (${v.lang})`, lang: v.lang, local: v.localService }));
}

function pickWebVoice() {
  const w = web();
  if (!w) return;
  const vs = w.getVoices().filter((v) => /^en/i.test(v.lang));
  if (!vs.length) return;
  if (settings.voiceName) {
    const v = vs.find((x) => x.name === settings.voiceName);
    if (v) { webVoice = v; return; }
  }
  const rank = (v) => {
    const li = PREFERRED_LANGS.findIndex((l) => v.lang.replace('_', '-').toLowerCase().startsWith(l.toLowerCase()));
    return (li < 0 ? 9 : li) * 10 + (FEMALE_HINT.test(v.name) ? 0 : 3) + (v.localService ? 0 : 1);
  };
  webVoice = vs.slice().sort((a, b) => rank(a) - rank(b))[0];
}
if (web()) {
  pickWebVoice();
  try { web().addEventListener?.('voiceschanged', pickWebVoice); } catch { /* ignore */ }
}

export function engineName() {
  if (native()) return 'Android text-to-speech';
  if (web()) return webVoice ? `Browser voice: ${webVoice.name} (${webVoice.lang})` : 'Browser voice';
  return 'Text only (no voice found)';
}

// ---------- low level speakers ----------
function voiceFor(who) {
  const c = CHARACTERS[who];
  return c ? c.voice : { pitch: 1.05, rate: 1 };
}

const clipUrls = new Map();
async function clipUrl(id) {
  if (clipUrls.has(id)) return clipUrls.get(id);
  // fetch (rather than a plain src) so clips also load through the Android
  // app's private asset server and the offline cache
  const res = await fetch(`assets/audio/clips/${id}.ogg`);
  if (!res.ok) throw new Error('missing clip');
  const url = URL.createObjectURL(await res.blob());
  clipUrls.set(id, url);
  return url;
}

async function playClip(who, text) {
  const gen = generation;
  let src;
  try { src = await clipUrl(clipId(who, text)); } catch { return 'failed'; }
  if (gen !== generation) return 'stopped'; // stopped while loading
  return new Promise((resolve) => {
    const a = new Audio(src);
    a.volume = settings.volume;
    a.playbackRate = Math.max(0.8, Math.min(1.2, settings.speed / 0.9));
    let done = false;
    const end = (r) => { if (!done) { done = true; resolve(r); } };
    a.onended = () => end('done');
    a.onerror = () => end('failed');
    current = { stop: () => { a.pause(); end('stopped'); } };
    a.play().catch(() => end('failed'));
  });
}

let nativeSeq = 0;
const nativeWaits = new Map();
globalThis.storyVoiceEvent = (type, id) => {
  const w = nativeWaits.get(id);
  if (w && (type === 'done' || type === 'error')) { nativeWaits.delete(id); w(type === 'done' ? 'done' : 'failed'); }
};

function speakNative(text, who) {
  return new Promise((resolve) => {
    const id = `u${++nativeSeq}`;
    const v = voiceFor(who);
    nativeWaits.set(id, resolve);
    current = { stop: () => { try { native().stop(); } catch { /* */ } nativeWaits.delete(id); resolve('stopped'); } };
    try {
      native().speak(text, id, Math.max(0.6, Math.min(1.6, v.pitch)), settings.speed * (v.rate || 1), settings.volume);
    } catch { nativeWaits.delete(id); resolve('failed'); }
    setTimeout(() => { if (nativeWaits.has(id)) { nativeWaits.delete(id); resolve('done'); } }, 2500 + text.length * 120);
  });
}

function speakWeb(text, who) {
  return new Promise((resolve) => {
    const w = web();
    const u = new SpeechSynthesisUtterance(text);
    const v = voiceFor(who);
    if (webVoice) { u.voice = webVoice; u.lang = webVoice.lang; } else u.lang = 'en-GB';
    u.rate = settings.speed * (v.rate || 1);
    u.pitch = Math.max(0.5, Math.min(2, v.pitch));
    u.volume = settings.volume;
    let done = false;
    const end = (r) => { if (!done) { done = true; clearTimeout(guard); resolve(r); } };
    u.onend = () => end('done');
    u.onerror = () => end('failed');
    current = { stop: () => { try { w.cancel(); } catch { /* */ } end('stopped'); } };
    // Some engines never fire onend; never let that block the story.
    const guard = setTimeout(() => end('done'), 3000 + text.length * 110);
    try { w.speak(u); } catch { end('failed'); }
  });
}

function silentRead(text) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve('done'), Math.min(4000, 400 + text.length * 45));
    current = { stop: () => { clearTimeout(t); resolve('stopped'); } };
  });
}

async function speakSentence(text, who) {
  if (!settings.enabled || settings.volume <= 0) return silentRead(text);
  if (settings.useClips && who !== 'n' && CLIPS.has(clipId(who, text))) {
    const r = await playClip(who, text);
    if (r !== 'failed') return r;
  }
  if (native()) return speakNative(text, who);
  if (web()) return speakWeb(text, who);
  return silentRead(text);
}

// ---------- public API ----------

/**
 * Reads lines aloud. onSentence(lineIndex, sentenceIndex) is called as each
 * sentence starts. Resolves 'done' or 'stopped'. Starting a new read stops
 * the previous one.
 */
export async function speakLines(lines, { onSentence, onDone } = {}) {
  stop();
  const gen = ++generation;
  emit('speaking');
  for (let i = 0; i < lines.length; i++) {
    const sentences = splitSentences(lines[i].text);
    for (let k = 0; k < sentences.length; k++) {
      while (paused && gen === generation) await new Promise((r) => setTimeout(r, 150));
      if (gen !== generation) return 'stopped';
      onSentence?.(i, k);
      const r = await speakSentence(sentences[k], lines[i].who);
      if (gen !== generation || r === 'stopped') return 'stopped';
    }
  }
  if (gen === generation) { current = null; emit('idle'); onDone?.(); }
  return 'done';
}

/** Says one short thing right now (counting, letters, reactions). */
export function say(text, who = 'n') {
  return speakLines([{ who, text }]);
}

export function stop() {
  generation++;
  paused = false;
  if (current) { try { current.stop(); } catch { /* */ } current = null; }
  try { web()?.cancel(); } catch { /* */ }
  try { native()?.stop(); } catch { /* */ }
  emit('idle');
}

export function pause() {
  paused = true;
  try { web()?.pause(); } catch { /* */ }
  if (current && native()) { try { native().stop(); } catch { /* */ } }
  emit('paused');
}

export function resume() {
  paused = false;
  try { web()?.resume(); } catch { /* */ }
  emit('speaking');
}

export function isPaused() { return paused; }
export function getSettings() { return { ...settings }; }
