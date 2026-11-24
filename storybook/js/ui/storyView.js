// Renders one story page as a book spread: the illustrated page (scene,
// friends, place sign, hidden treasure, interaction) and the words page
// (story text read aloud, a helper button, the choice cards).

import { WORLDS, SECRETS } from '../content/worlds.js';
import { CHARACTERS } from '../content/characters.js';
import { ALPHABET } from '../content/alphabet.js';
import { imgSrc, imgAlt } from '../content/images.js';
import { paintScene } from '../render/scene.js';
import * as fx from '../render/fx.js';
import * as sfx from '../audio/sfx.js';
import * as narrator from '../audio/narrator.js';
import { mountInteraction } from '../interactions/index.js';
import { numberWord } from '../content/numbers.js';
import { rngFor } from '../engine/rng.js';
import { el, icon } from './dom.js';

const TAP_FX = ['hop', 'wiggle', 'spin', 'stretch'];

export function renderStoryPage(page, { state, session, settings, onChoice, onOpenBook, onHome }) {
  const w = WORLDS[state.worldId];
  const sceneId = page.scene || w.start[0];
  const loc = w.locations[sceneId];
  const root = el('div', { class: `spread kind-${page.kind}` });
  const art = el('section', { class: 'leaf leaf-art' });
  const words = el('section', { class: 'leaf leaf-text' });
  root.append(art, words);

  // ---------- picture ----------
  const illus = el('div', { class: 'illus' });
  art.append(illus);
  const bg = el('div', { class: 'scene-bg' });
  bg.innerHTML = paintScene(w.theme, loc);
  illus.append(bg);
  const castLayer = el('div', { class: 'cast' });
  const play = el('div', { class: 'play' });
  illus.append(castLayer, play);

  // place sign with its first letter to notice
  const signWord = loc.name.replace(/^(the|a) /i, '');
  const sign = el('button', { class: 'place-sign', type: 'button', 'aria-label': `${signWord}. Tap to hear its letter.` },
    el('span', { class: 'sign-first' }, signWord[0]), el('span', {}, signWord.slice(1)));
  sign.addEventListener('click', () => {
    const L = signWord[0].toUpperCase();
    sfx.play('tap');
    fx.sparkleAt(sign.firstChild, 6);
    narrator.say(`${signWord}. ${signWord} starts with ${L}. ${L} says ${ALPHABET[L]?.say || L}.`);
    session.learning('letter', L, 'independent', {});
  });
  illus.append(sign);

  // decorative scene hotspots (flowers bloom, trees shake, moon glows)
  bg.addEventListener('click', (e) => {
    const hot = e.target.closest('.hot');
    if (!hot) return;
    const f = hot.dataset.fx || 'wiggle';
    hot.classList.remove(`fx-${f}`); void hot.getBoundingClientRect(); hot.classList.add(`fx-${f}`);
    sfx.play(hot.dataset.sound || 'tap');
    fx.sparkle(e.clientX, e.clientY, 6);
  });

  // friends in the picture
  const interactionOwns = new Set([page.interaction?.who, page.interaction?.eater].filter(Boolean));
  const cast = (page.cast || []).filter((id) => !interactionOwns.has(id));
  const castEls = {};
  cast.forEach((id, i) => {
    const c = CHARACTERS[id];
    const isRes = id === page.resident && id !== state.companion && !state.friends.includes(id);
    const lead = i === 0;
    const b = el('button', { class: `friend ${lead ? 'lead' : ''} ${isRes ? 'resident' : ''}`, type: 'button', 'aria-label': `${c.name} the ${c.species}` },
      el('img', { src: imgSrc(c.img), alt: '', draggable: 'false' }));
    if (isRes) { b.style.left = '84%'; b.style.width = '19%'; } else {
      b.style.left = `${lead ? 12 : 4 + i * 7}%`;
      b.style.width = `${lead ? 21 : 13}%`;
      b.style.zIndex = String(10 - i);
      if (!lead) b.style.bottom = `${14 + (i % 2) * 6}%`;
    }
    b.style.animationDelay = `${(i * 0.37).toFixed(2)}s`;
    let k = Math.floor(Math.random() * c.taps.length);
    b.addEventListener('click', () => {
      const f = TAP_FX[Math.floor(Math.random() * TAP_FX.length)];
      b.classList.remove(...TAP_FX.map((x) => `fx-${x}`)); void b.offsetWidth; b.classList.add(`fx-${f}`);
      sfx.play('boing');
      fx.sparkleAt(b, 6);
      bubble(b, c.taps[k % c.taps.length]);
      narrator.say(c.taps[k++ % c.taps.length], id);
    });
    castLayer.append(b);
    castEls[id] = b;
  });
  if (page.kind === 'ending' || page.kind === 'climax') Object.values(castEls).forEach((b) => b.classList.add('celebrate'));

  // a hidden treasure to find, just for curious explorers
  if (page.kind === 'scene' || page.kind === 'consequence') addHiddenSecret(illus, state, session, page, loc);

  // ---------- words ----------
  const head = el('div', { class: 'page-head' });
  const readBtn = el('button', { class: 'round-btn read-btn', type: 'button', 'aria-label': 'Read to me again' }, icon('speaker'));
  const pauseBtn = el('button', { class: 'round-btn pause-btn', type: 'button', 'aria-label': 'Pause reading' }, icon('pause'));
  head.append(readBtn, pauseBtn);
  if (page.kind === 'intro') words.append(el('p', { class: 'chapter-label' }, w.title));
  if (page.title) words.append(el('h2', { class: 'page-title' }, page.title));
  if (page.kind === 'ending') {
    words.append(el('h2', { class: 'page-title the-end' }, 'The End'),
      el('p', { class: 'ending-badge' }, el('img', { src: imgSrc(page.endingImg), alt: '' }), el('span', {}, page.endingTitle)));
  }
  words.append(head);
  const text = el('div', { class: 'story-text', 'aria-live': 'polite' });
  words.append(text);
  const helperRow = el('div', { class: 'helper-row' });
  const question = el('div', { class: 'question' });
  const choices = el('div', { class: 'choices' });
  words.append(helperRow, question, choices);

  const shown = [];
  function addLines(lines, { dropCap = false } = {}) {
    for (const line of lines) {
      const p = el('p', { class: `line ${line.who === 'n' ? 'narr' : 'speech'}` });
      if (line.who !== 'n') {
        const c = CHARACTERS[line.who];
        p.append(el('img', { class: 'avatar', src: imgSrc(c.img), alt: c.name }), el('span', { class: 'who' }, `${c.name}: `));
      }
      const sentences = line.text.split(/(?<=[.!?])\s+/);
      sentences.forEach((s, k) => {
        const span = el('span', { class: 'sent' }, `${s}${k < sentences.length - 1 ? ' ' : ''}`);
        p.append(span);
      });
      if (dropCap && shown.length === 0 && line.who === 'n') makeDropCap(p);
      text.append(p);
      shown.push({ line, p });
    }
  }
  addLines(page.lines, { dropCap: page.kind === 'intro' || page.kind === 'scene' });

  let readFrom = 0;
  function highlight(i, k) {
    text.querySelectorAll('.sent.on').forEach((x) => x.classList.remove('on'));
    const p = shown[readFrom + i]?.p;
    const s = p?.querySelectorAll('.sent')[k];
    if (s) { s.classList.add('on'); s.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }
  }
  function read(fromIdx = 0) {
    if (!settings.narration) return Promise.resolve();
    readFrom = fromIdx;
    const lines = shown.slice(fromIdx).map((x) => x.line);
    return narrator.speakLines(lines, { onSentence: highlight, onDone: () => highlight(-1, -1) });
  }
  readBtn.addEventListener('click', () => { sfx.play('tap'); pauseBtn.classList.remove('paused'); read(0).then(() => { if (choicesShown && page.question) narrator.speakLines([page.question]); }); });
  pauseBtn.addEventListener('click', () => {
    sfx.play('tap');
    if (narrator.isPaused()) { narrator.resume(); pauseBtn.classList.remove('paused'); } else { narrator.pause(); pauseBtn.classList.add('paused'); }
  });

  // ---------- interaction & choices ----------
  let inter = null;
  let choicesShown = false;
  let helpTimer = null;

  function showChoices() {
    if (choicesShown) return;
    choicesShown = true;
    if (page.question) question.append(el('p', { class: 'line narr q' }, page.question.text));
    renderChoices(choices, page, state, (id, card) => {
      cleanup();
      sfx.play('tap');
      fx.sparkleAt(card, 8);
      onChoice(id);
    }, w);
    if (page.kind === 'ending') renderEndingActions(choices, { onOpenBook, onHome });
    setTimeout(() => question.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), 300);
  }

  const ctx = {
    layer: play,
    fx: { sparkleAt: (e) => fx.sparkleAt(e), confetti: () => fx.confetti() },
    sfx: (n) => sfx.play(n),
    countNote: (n) => sfx.countNote(n),
    say: (t, who = 'n') => { if (settings.narration) narrator.say(t, who); },
    learn: (kind, item, outcome, extra) => session.learning(kind, item, outcome, extra),
    companion: state.companion,
    done: (outcome) => {
      clearTimeout(helpTimer);
      helperRow.replaceChildren();
      illus.classList.add('solved');
      if (page.rewardImg) {
        const r = play.querySelector('.found, .prize, .chosen') || illus;
        fx.flyToBook(imgSrc(page.rewardImg), r);
      }
      const start = shown.length;
      addLines(page.after || []);
      const finishRead = () => {
        if (!settings.narration) { showChoices(); return; }
        read(start).then((r) => { if (r === 'done' && page.question) narrator.speakLines([page.question]); });
        setTimeout(showChoices, 900);
      };
      setTimeout(finishRead, 500);
    },
  };

  const mount = () => {
    if (page.interaction) {
      illus.classList.add('interactive');
      inter = mountInteraction(page.interaction, ctx);
      const comp = CHARACTERS[state.companion];
      const helpBtn = el('button', { class: 'help-btn', type: 'button' },
        el('img', { src: imgSrc(comp.img), alt: '' }), el('span', {}, `Help me, ${comp.name}!`));
      helpBtn.addEventListener('click', () => { sfx.play('sparkle'); helpBtn.disabled = true; inter?.help(); });
      helpTimer = setTimeout(() => { helperRow.append(helpBtn); helpBtn.classList.add('appear'); }, 9000);
    } else {
      setTimeout(showChoices, settings.narration ? 1200 : 200);
    }
  };

  function cleanup() {
    clearTimeout(helpTimer);
    inter?.destroy();
    inter = null;
    narrator.stop();
  }

  return {
    root,
    start() {
      mount();
      if (settings.narration && settings.autoRead) {
        read(0).then((r) => { if (r === 'done' && !page.interaction && page.question && choicesShown) narrator.speakLines([page.question]); });
      }
    },
    destroy: cleanup,
  };
}

function makeDropCap(p) {
  const first = p.querySelector('.sent');
  if (!first) return;
  const t = first.textContent;
  const L = t[0];
  if (!/[A-Za-z]/.test(L) || !/^[A-Za-z]{3,}/.test(t)) return;
  const cap = el('button', { class: 'drop-cap', type: 'button', 'aria-label': `Letter ${L.toUpperCase()}` }, L);
  cap.addEventListener('click', () => {
    const U = L.toUpperCase();
    sfx.play('chime');
    fx.sparkleAt(cap, 8);
    narrator.say(`${U}. ${U} says ${ALPHABET[U]?.say || U}.`);
  });
  first.textContent = t.slice(1);
  p.insertBefore(cap, first);
}

function bubble(anchor, text) {
  const b = el('div', { class: 'speech-bubble' }, text);
  anchor.append(b);
  setTimeout(() => b.remove(), 2400);
}

function addHiddenSecret(illus, state, session, page, loc) {
  const w = WORLDS[state.worldId];
  const rng = rngFor(state.seed, 'hidden', state.step, page.kind);
  const pool = w.secrets.filter((s) => !session.profile.secrets[s] && !state.secrets.includes(s));
  if (!pool.length || !rng.chance(0.5)) return;
  const id = rng.pick(pool);
  const sec = SECRETS[id];
  const b = el('button', { class: 'hidden-secret', type: 'button', 'aria-label': 'something hiding' },
    el('img', { src: imgSrc(sec.img), alt: '', draggable: 'false' }));
  const spots = [[8, 22], [92, 18], [18, 40], [50, 12], [88, 40]];
  const [x, y] = rng.pick(spots);
  b.style.left = `${x}%`; b.style.top = `${y}%`;
  if (sec.hue !== undefined) b.firstChild.style.filter = `hue-rotate(${sec.hue}deg) saturate(1.4)`;
  b.addEventListener('click', () => {
    if (b.dataset.found) return;
    b.dataset.found = '1';
    b.classList.add('found');
    sfx.play('sparkle');
    fx.sparkleAt(b, 14);
    session.findHiddenSecret(id, loc.name);
    narrator.speakLines([{ who: 'n', text: `You found ${sec.name}! It is going into your Discovery Book.` }]);
    setTimeout(() => fx.flyToBook(imgSrc(sec.img), b).then(() => b.remove()), 600);
  });
  illus.append(b);
}

function renderChoices(box, page, state, pick, w) {
  box.replaceChildren();
  page.choices.forEach((c, i) => {
    const card = el('button', { class: 'choice-card', type: 'button', style: `animation-delay:${i * 0.12}s` });
    if (c.scene && w.locations[c.scene]) {
      const th = el('div', { class: 'thumb' });
      th.innerHTML = paintScene(w.theme, w.locations[c.scene]);
      card.append(th);
    } else {
      card.classList.add('plain');
    }
    if (c.img) card.append(el('img', { class: 'choice-icon', src: imgSrc(c.img), alt: '' }));
    card.append(el('span', { class: 'choice-label' }, c.label));
    card.setAttribute('aria-label', c.label);
    let firstTapAt = 0;
    card.addEventListener('click', () => {
      // Pre-readers: a quick double-tap guard so one bump does not turn the page.
      const now = Date.now();
      if (now - firstTapAt < 250) return;
      firstTapAt = now;
      pick(c.id, card);
    });
    box.append(card);
  });
}

function renderEndingActions(box, { onOpenBook, onHome }) {
  const again = el('button', { class: 'choice-card plain big-action', type: 'button' }, el('img', { class: 'choice-icon', src: imgSrc('book'), alt: '' }), el('span', { class: 'choice-label' }, 'Another story'));
  const book = el('button', { class: 'choice-card plain big-action', type: 'button' }, el('img', { class: 'choice-icon', src: imgSrc('sparkles'), alt: '' }), el('span', { class: 'choice-label' }, 'My Discovery Book'));
  again.addEventListener('click', () => { sfx.play('page'); onHome(); });
  book.addEventListener('click', () => { sfx.play('page'); onOpenBook(); });
  box.append(again, book);
}

export { numberWord, imgAlt };
