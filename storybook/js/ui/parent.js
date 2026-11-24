// The grown-ups' area, behind a hold-to-open cog and a sum. Settings,
// learning summary, storage, reset, privacy and credits.

import { el, icon } from './dom.js';
import * as narrator from '../audio/narrator.js';
import * as sfx from '../audio/sfx.js';
import { summary, letterStatus } from '../learning/progress.js';
import { WORLDS } from '../content/worlds.js';
import { CHARACTER_IDS } from '../content/characters.js';
import { ENDINGS } from '../content/endings.js';

export function renderGate({ onPass, onBack }) {
  const a = 3 + Math.floor(Math.random() * 7); const b = 4 + Math.floor(Math.random() * 6);
  const root = el('div', { class: 'spread kind-parent gate' });
  const leaf = el('section', { class: 'leaf parent-leaf' });
  root.append(leaf);
  const back = el('button', { class: 'round-btn back-btn', type: 'button', 'aria-label': 'Back' }, icon('back'));
  back.addEventListener('click', onBack);
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const shown = el('output', { class: 'gate-answer', 'aria-live': 'polite' }, '');
  let typed = '';
  const pad = el('div', { class: 'gate-pad' });
  for (const k of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
    const btn = el('button', { type: 'button', class: 'pad-key' }, String(k));
    btn.addEventListener('click', () => {
      typed = (typed + k).slice(-2);
      shown.textContent = typed;
      if (Number(typed) === a + b) onPass();
      else if (typed.length >= 2) { shown.classList.add('nope'); setTimeout(() => { typed = ''; shown.textContent = ''; shown.classList.remove('nope'); }, 600); }
    });
    pad.append(btn);
  }
  leaf.append(back, el('h2', { class: 'page-title' }, 'For grown-ups'),
    el('p', {}, `To open the settings, please type the answer to ${words[a]} plus ${words[b]}.`), shown, pad);
  return { root };
}

function row(label, control, hint) {
  return el('label', { class: 'set-row' }, el('span', { class: 'set-label' }, label, hint ? el('small', {}, hint) : null), control);
}
function toggle(value, onChange) {
  const i = el('input', { type: 'checkbox', class: 'switch' });
  i.checked = !!value;
  i.addEventListener('change', () => onChange(i.checked));
  return i;
}
function range(value, min, max, step, onChange) {
  const i = el('input', { type: 'range', min, max, step, value });
  i.addEventListener('input', () => onChange(Number(i.value)));
  return i;
}
function select(options, value, onChange) {
  const s = el('select', {});
  for (const [v, label] of options) { const o = el('option', { value: v }, label); if (String(v) === String(value)) o.selected = true; s.append(o); }
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

export function renderParent({ session, settings, saveSettings, store, onClose, onStartSeed }) {
  const p = session.profile;
  const root = el('div', { class: 'spread kind-parent' });
  const leaf = el('section', { class: 'leaf parent-leaf' });
  root.append(leaf);
  const close = el('button', { class: 'round-btn back-btn', type: 'button', 'aria-label': 'Close settings' }, icon('close'));
  close.addEventListener('click', () => { narrator.stop(); onClose(); });
  leaf.append(close, el('h2', { class: 'page-title' }, 'Grown-ups’ corner'));
  const set = (k, v) => { settings[k] = v; saveSettings(settings); };

  // ---- narration ----
  const voices = narrator.availableVoices();
  const sec1 = el('section', { class: 'set-section' }, el('h3', {}, 'Narration'));
  sec1.append(
    row('Read the story aloud', toggle(settings.narration, (v) => set('narration', v))),
    row('Start reading automatically', toggle(settings.autoRead, (v) => set('autoRead', v)), 'Off = the child taps the speaker to hear a page.'),
    row('Reading speed', select([[0.75, 'Slow'], [0.9, 'Gentle (recommended)'], [1.0, 'Normal'], [1.1, 'Quick']], settings.speed, (v) => set('speed', Number(v)))),
    row('Narration volume', range(settings.narrationVolume, 0, 1, 0.05, (v) => set('narrationVolume', v))),
    row('Friends’ recorded voices', toggle(settings.useClips, (v) => set('useClips', v)), 'Pre-recorded voices for the characters’ own lines.'),
  );
  if (voices.length) {
    const opts = [['', 'Automatic (prefers New Zealand, then Australian, then British English)'], ...voices.map((v) => [v.name, v.label || v.name])];
    sec1.append(row('Storyteller voice', select(opts, settings.voice, (v) => set('voice', v))));
  }
  const test = el('button', { type: 'button', class: 'small-btn' }, 'Test the voice');
  test.addEventListener('click', () => narrator.speakLines([{ who: 'n', text: 'Once upon a time, in a garden that glowed under the moon, a little unicorn was looking for her lantern.' }, { who: 'sparkle', text: 'Hooray, a friend!' }]));
  sec1.append(el('p', { class: 'set-note' }, `Voice in use: ${narrator.engineName()}. `, test));
  if (!voices.length) sec1.append(el('p', { class: 'set-note' }, 'No speech voices were found. On Android, install or update "Speech Services by Google" and download an English voice (Settings › Accessibility › Text-to-speech) for offline narration. The story text is always shown.'));

  // ---- sound ----
  const sec2 = el('section', { class: 'set-section' }, el('h3', {}, 'Sounds and music'),
    row('Sound effects volume', range(settings.effectsVolume, 0, 1, 0.05, (v) => { set('effectsVolume', v); sfx.setVolumes({ effects: v }); sfx.play('chime'); })),
    row('Music box music', toggle(settings.music, (v) => set('music', v))),
    row('Music volume', range(settings.musicVolume, 0, 0.6, 0.05, (v) => { set('musicVolume', v); sfx.setVolumes({ music: v }); })));

  // ---- accessibility ----
  const sec3 = el('section', { class: 'set-section' }, el('h3', {}, 'Comfort and accessibility'),
    row('Movement', select([['auto', 'Follow this device’s setting'], ['reduce', 'Calm (less movement)'], ['full', 'Full animation']], settings.reducedMotion === null ? 'auto' : settings.reducedMotion ? 'reduce' : 'full', (v) => set('reducedMotion', v === 'auto' ? null : v === 'reduce'))),
    row('Text size', select([[1, 'Standard'], [1.15, 'Large'], [1.3, 'Extra large']], settings.textSize, (v) => set('textSize', Number(v)))),
    row('Stronger text contrast', toggle(settings.highContrast, (v) => set('highContrast', v))));

  // ---- learning ----
  const sm = summary(p.learning);
  const sec4 = el('section', { class: 'set-section' }, el('h3', {}, 'Learning, gently'));
  sec4.append(el('p', { class: 'set-note' }, 'A soft, private picture of what has come up in stories so far. It is not a test or a score; the stories simply bring back letters and numbers in new places, and add a little more when things feel familiar.'));
  sec4.append(el('p', {}, `Stories finished: ${p.adventures}. Counting now: ${sm.countLevel.label}.`));
  const letters = el('div', { class: 'letter-summary' });
  for (const L of sm.letters) {
    const st = letterStatus(p.learning, L.L);
    letters.append(el('span', { class: `ls ls-${st}`, title: `${L.L}: ${st}` }, L.L));
  }
  sec4.append(el('h4', {}, 'Letters'), letters,
    el('p', { class: 'legend' }, el('span', { class: 'ls ls-new' }, 'A'), ' not met yet  ', el('span', { class: 'ls ls-growing' }, 'A'), ' getting to know  ', el('span', { class: 'ls ls-familiar' }, 'A'), ' seems familiar'));
  const nums = el('div', { class: 'letter-summary' });
  for (const n of sm.numbers) nums.append(el('span', { class: `ls ${n.seen ? (n.independent ? 'ls-familiar' : 'ls-growing') : 'ls-new'}` }, String(n.n)));
  sec4.append(el('h4', {}, 'Numbers counted'), nums);
  if (sm.numeralTries) sec4.append(el('p', {}, `Number pictures (numerals) picked on the first try: ${sm.numeralFirstTry} of ${sm.numeralTries}.`));
  const metCount = CHARACTER_IDS.filter((id) => p.characters[id]?.met).length;
  const worlds = Object.keys(WORLDS).filter((id) => p.worlds[id]?.visits).length;
  sec4.append(el('p', {}, `Friends met: ${metCount} of ${CHARACTER_IDS.length}. Worlds visited: ${worlds} of 6. Kinds of ending found: ${Object.keys(p.endings).length} of ${ENDINGS.length}.`));

  // ---- story seeds ----
  const sec5 = el('section', { class: 'set-section' }, el('h3', {}, 'Story seeds'));
  sec5.append(el('p', { class: 'set-note' }, 'Every adventure has a seed. The same seed, world and choices always tell the same story. You can replay one here.'));
  if (p.current) sec5.append(el('p', {}, `Current story seed: `, el('code', {}, p.current.start.seed)));
  const seedIn = el('input', { type: 'text', placeholder: 'e.g. MOON-4821', maxlength: '24', class: 'seed-input' });
  const worldSel = select([['', 'World from seed'], ...Object.entries(WORLDS).map(([id, w]) => [id, w.title])], '', () => {});
  const go = el('button', { type: 'button', class: 'small-btn' }, 'Start this story');
  go.addEventListener('click', () => { const s = seedIn.value.trim().toUpperCase(); if (s) onStartSeed(s, worldSel.value || undefined); });
  sec5.append(el('div', { class: 'seed-row' }, seedIn, worldSel, go));

  // ---- storage ----
  const sec6 = el('section', { class: 'set-section' }, el('h3', {}, 'Storage and offline'));
  const kb = (store.sizeBytes() / 1024).toFixed(1);
  const offline = el('p', {}, 'Offline: checking…');
  sec6.append(el('p', {}, `Saved progress on this device: ${kb} KB.`), offline);
  if ('caches' in globalThis) {
    caches.keys().then(async (keys) => {
      let n = 0;
      for (const k of keys) n += (await (await caches.open(k)).keys()).length;
      offline.textContent = n ? `Offline: ready (${n} files kept on this device).` : 'Offline: not prepared yet. Keep the app open for a minute while online.';
    }).catch(() => { offline.textContent = 'Offline: not available in this browser.'; });
  } else offline.textContent = globalThis.StoryVoice ? 'Offline: built into the app.' : 'Offline storage is not available here.';
  const exp = el('button', { type: 'button', class: 'small-btn' }, 'Save a copy of progress');
  exp.addEventListener('click', () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'magical-storybook-progress.json' });
    document.body.append(a); a.click(); a.remove();
  });
  const clearCache = el('button', { type: 'button', class: 'small-btn' }, 'Clear downloaded files');
  clearCache.addEventListener('click', async () => {
    if ('caches' in globalThis) for (const k of await caches.keys()) await caches.delete(k);
    offline.textContent = 'Downloaded files cleared. They will download again next time you are online.';
  });
  sec6.append(el('div', { class: 'btn-row' }, exp, clearCache));

  // ---- reset ----
  const sec7 = el('section', { class: 'set-section danger' }, el('h3', {}, 'Start afresh'));
  const reset = el('button', { type: 'button', class: 'small-btn danger-btn' }, 'Reset all progress');
  reset.addEventListener('click', () => {
    if (reset.dataset.armed) {
      session.resetProgress();
      reset.textContent = 'Progress reset';
      reset.disabled = true;
    } else {
      reset.dataset.armed = '1';
      reset.textContent = 'Tap again to erase friends, discoveries and learning';
    }
  });
  sec7.append(el('p', { class: 'set-note' }, 'Erases the Discovery Book, friends’ memories, learning notes and the story in progress. Settings are kept.'), reset);

  // ---- privacy & credits ----
  const sec8 = el('section', { class: 'set-section' }, el('h3', {}, 'Privacy'),
    el('p', { class: 'set-note' }, 'Everything stays on this device. The storybook has no accounts, adverts, purchases, chat, tracking or analytics, and never uses the microphone or camera. It does not ask for or store a child’s name, photo, voice or location. Saved data: story progress, discoveries, friends’ memories of stories, gentle learning notes and these settings.'));
  const sec9 = el('section', { class: 'set-section' }, el('h3', {}, 'Credits and licences'));
  sec9.append(el('ul', { class: 'credits' },
    el('li', {}, 'Story, scenes, interface, sounds and music: original work made for this book.'),
    el('li', {}, 'Character and object pictures: Fluent Emoji © Microsoft Corporation, MIT licence (github.com/microsoft/fluentui-emoji).'),
    el('li', {}, 'Fonts: Andika © SIL International and Fredoka © The Fredoka Project Authors, SIL Open Font Licence 1.1.'),
    el('li', {}, 'Recorded friend voices: generated with Kokoro-82M (Apache 2.0) via kokoro-onnx (MIT). No voice cloning, no real voice recordings.'),
    el('li', {}, 'Story narration uses this device’s own text-to-speech voice.'),
  ), el('p', { class: 'set-note' }, 'Full asset manifest with sources and dates: docs/ASSETS.md in the project.'));
  leaf.append(sec1, sec2, sec3, sec4, sec5, sec6, sec7, sec8, sec9);
  return { root, destroy() { narrator.stop(); } };
}
