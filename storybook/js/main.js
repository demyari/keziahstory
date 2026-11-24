// App controller: screens, settings, page turning, discoveries, offline.

import { createStore } from './save/store.js';
import { createSession } from './session.js';
import { renderStoryPage } from './ui/storyView.js';
import { renderCover, renderWorldPick } from './ui/cover.js';
import { renderCollection } from './ui/collection.js';
import { renderGate, renderParent } from './ui/parent.js';
import { applyLayout, turnTo } from './render/book.js';
import * as fx from './render/fx.js';
import * as sfx from './audio/sfx.js';
import * as narrator from './audio/narrator.js';
import { imgSrc } from './content/images.js';
import { SECRETS } from './content/worlds.js';
import { CHARACTERS } from './content/characters.js';
import { WORD_IMG, ALPHABET } from './content/alphabet.js';
import { ENDINGS } from './content/endings.js';
import { el, icon } from './ui/dom.js';

const store = createStore();
const session = createSession(store);
const settings = store.loadSettings();

const app = document.getElementById('app');
const book = el('div', { class: 'book' });
const topbar = el('div', { class: 'topbar' });
const pages = el('div', { class: 'pages' });
book.append(topbar, pages);
app.append(book);

function applySettings() {
  const prefersReduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const reduced = settings.reducedMotion === null ? prefersReduced : settings.reducedMotion;
  fx.setReducedMotion(reduced);
  document.documentElement.classList.toggle('reduced', !!reduced);
  document.documentElement.classList.toggle('contrast', !!settings.highContrast);
  document.documentElement.style.setProperty('--text-scale', String(settings.textSize || 1));
  narrator.configure({ enabled: settings.narration, speed: settings.speed, volume: settings.narrationVolume, voiceName: settings.voice, useClips: settings.useClips });
  sfx.setVolumes({ effects: settings.effectsVolume, music: settings.music ? settings.musicVolume : 0 });
}
function saveSettings(s) { store.saveSettings(s); applySettings(); }
applySettings();

// ---------- top bar (story screens) ----------
function setTopbar(mode) {
  topbar.replaceChildren();
  if (mode === 'none') { topbar.hidden = true; return; }
  topbar.hidden = false;
  const home = el('button', { class: 'round-btn', type: 'button', 'aria-label': 'Back to the cover' }, icon('home'));
  home.addEventListener('click', () => { sfx.play('tap'); showCover(-1); });
  const bookBtn = el('button', { class: 'round-btn book-btn', type: 'button', 'aria-label': 'My Discovery Book', 'data-book-button': '' }, el('img', { src: imgSrc('book'), alt: '' }));
  bookBtn.addEventListener('click', () => { sfx.play('page'); showCollection(); });
  topbar.append(home, el('div', { class: 'spacer' }), bookBtn);
}

// ---------- screens ----------
function showCover(dir = 1) {
  setTopbar('none');
  sfx.startMusic('cover');
  if (!settings.music) sfx.stopMusic();
  turnTo(pages, renderCover({
    session, settings,
    onNew: () => showWorldPick(),
    onContinue: () => { if (session.resume()) showPage(); else showWorldPick(); },
    onBook: () => showCollection(),
    onParent: () => showGate(),
  }), { direction: dir });
}

function showWorldPick() {
  setTopbar('none');
  turnTo(pages, renderWorldPick({
    session, settings,
    onPick: (worldId) => { session.start({ worldId: worldId || undefined }); showPage(); },
    onBack: () => showCover(-1),
  }));
}

let returnTo = null;
function showPage(dir = 1) {
  const st = session.state;
  if (!st) { showCover(); return; }
  setTopbar('story');
  if (settings.music) sfx.startMusic(st.worldId); else sfx.stopMusic();
  const page = session.page();
  const view = renderStoryPage(page, {
    state: st, session, settings,
    onChoice: (id) => { session.choose(id); showPage(1); },
    onOpenBook: () => showCollection(),
    onHome: () => showWorldPick(),
  });
  turnTo(pages, view, { direction: dir });
  returnTo = 'story';
  if (page.kind === 'ending') celebrateDiscoveries();
}

function showCollection() {
  const fresh = session.takeDiscoveries();
  setTopbar('none');
  const from = returnTo;
  turnTo(pages, renderCollection({
    session, settings, fresh,
    onClose: () => { if (from === 'story' && session.state && session.state.phase !== 'ending') showPage(-1); else showCover(-1); },
  }));
}

function showGate() {
  setTopbar('none');
  turnTo(pages, renderGate({ onPass: showParent, onBack: () => showCover(-1) }));
}

function showParent() {
  setTopbar('none');
  sfx.stopMusic();
  turnTo(pages, renderParent({
    session, settings, saveSettings, store,
    onClose: () => showCover(-1),
    onStartSeed: (seed, worldId) => { session.start({ seed, worldId }); showPage(); },
  }));
}

/** At the end of a story, new things fly into the Discovery Book one by one. */
async function celebrateDiscoveries() {
  const fresh = session.profile.newDiscoveries.slice(0, 8);
  await new Promise((r) => setTimeout(r, 1800));
  for (const d of fresh) {
    let src = null;
    if (d.kind === 'friend') src = imgSrc(CHARACTERS[d.id].img);
    if (d.kind === 'secret') src = imgSrc(SECRETS[d.id].img);
    if (d.kind === 'letter') { const w = session.profile.letterWords[d.id]?.[0] || ALPHABET[d.id].words[0]; src = imgSrc(WORD_IMG[w]); }
    if (d.kind === 'number') src = imgSrc('star');
    if (d.kind === 'ending') src = imgSrc(ENDINGS.find((e) => e.id === d.id)?.img || 'star');
    if (d.kind === 'keepsake') src = imgSrc(d.id);
    if (src) { await fx.flyToBook(src, null); }
  }
}

// ---------- layout ----------
function relayout() { applyLayout(book); }
relayout();
let rt = null;
// The same page works in both layouts, so rotating never loses progress.
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(relayout, 120); });

// Wake audio on first touch (browsers require a gesture).
window.addEventListener('pointerdown', () => sfx.audioContext(), { once: true });

// Android back button (from the app shell) goes up one level.
globalThis.storybookBack = () => { if (returnTo === 'story' && session.state) showCover(-1); else showCover(-1); };

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { narrator.stop(); sfx.stopMusic(); }
});

// ---------- offline ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !globalThis.StoryVoice) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// test hook (used by automated browser tests only)
globalThis.__storybook = { session, settings, store, showPage, showCover, showCollection };

showCover();
