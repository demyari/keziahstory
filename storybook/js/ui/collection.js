// The Discovery Book: a second illustrated book that fills up as the child
// explores. Letters A–Z, numbers 1–20, friends met and worlds visited.

import { WORLDS, SECRETS } from '../content/worlds.js';
import { CHARACTERS, CHARACTER_IDS } from '../content/characters.js';
import { ALPHABET, LETTERS, WORD_IMG, letterLine } from '../content/alphabet.js';
import { ENDINGS } from '../content/endings.js';
import { imgSrc } from '../content/images.js';
import { numberWord, capitalise } from '../content/numbers.js';
import { memoryLine } from '../engine/memory.js';
import { paintScene } from '../render/scene.js';
import * as sfx from '../audio/sfx.js';
import * as fx from '../render/fx.js';
import * as narrator from '../audio/narrator.js';
import { el, icon } from './dom.js';

const TABS = [
  { id: 'letters', label: 'Letters', img: 'book' },
  { id: 'numbers', label: 'Numbers', img: 'star' },
  { id: 'friends', label: 'Friends', img: 'unicorn' },
  { id: 'worlds', label: 'Worlds', img: 'map' },
];

export function renderCollection({ session, settings, onClose, startTab = 'letters', fresh = [] }) {
  const p = session.profile;
  const root = el('div', { class: 'spread kind-collection' });
  const left = el('section', { class: 'leaf leaf-index' });
  const right = el('section', { class: 'leaf leaf-detail' });
  root.append(left, right);
  const close = el('button', { class: 'round-btn back-btn', type: 'button', 'aria-label': 'Close the Discovery Book' }, icon('back'));
  close.addEventListener('click', () => { sfx.play('page'); onClose(); });
  const ribbons = el('nav', { class: 'ribbons', 'aria-label': 'Discovery Book sections' });
  const title = el('h2', { class: 'page-title book-title' }, 'My Discovery Book');
  const grid = el('div', { class: 'collect-grid' });
  left.append(close, title, ribbons, grid);
  const freshKeys = new Set(fresh.map((d) => `${d.kind}:${d.id}`));
  let tab = startTab;

  const speak = (text, who = 'n') => { if (settings.narration) narrator.speakLines([{ who, text }]); };
  const isSingle = () => document.documentElement.dataset.layout !== 'spread';
  function showDetail(node) {
    right.replaceChildren(node);
    if (isSingle()) {
      root.classList.add('detail-open');
      const back = el('button', { class: 'round-btn back-btn detail-back', type: 'button', 'aria-label': 'Back to the list' }, icon('back'));
      back.addEventListener('click', () => { sfx.play('tap'); root.classList.remove('detail-open'); narrator.stop(); });
      right.prepend(back);
    }
  }

  TABS.forEach((t) => {
    const b = el('button', { class: `ribbon ribbon-${t.id}`, type: 'button', 'aria-pressed': String(t.id === tab) }, el('img', { src: imgSrc(t.img), alt: '' }), el('span', {}, t.label));
    b.addEventListener('click', () => { sfx.play('page'); tab = t.id; draw(); speak(t.label); });
    ribbons.append(b);
  });

  function draw() {
    ribbons.querySelectorAll('.ribbon').forEach((b, i) => b.setAttribute('aria-pressed', String(TABS[i].id === tab)));
    grid.replaceChildren();
    grid.dataset.tab = tab;
    root.classList.remove('detail-open');
    if (tab === 'letters') drawLetters();
    if (tab === 'numbers') drawNumbers();
    if (tab === 'friends') drawFriends();
    if (tab === 'worlds') drawWorlds();
  }

  // ---------- letters ----------
  const letterFound = (L) => (p.letterWords[L]?.length || 0) > 0 || (p.learning.letters[L]?.seen || 0) > 0;
  function drawLetters() {
    const found = LETTERS.filter(letterFound).length;
    grid.append(el('p', { class: 'collect-count' }, `${found} of 26 letters found`));
    for (const L of LETTERS) {
      const f = letterFound(L);
      const word = p.letterWords[L]?.[0] || ALPHABET[L].words[0];
      const tile = el('button', { class: `tile letter-tile ${f ? 'found' : 'waiting'} ${freshKeys.has(`letter:${L}`) ? 'fresh' : ''}`, type: 'button', 'aria-label': `Letter ${L}${f ? '' : ', still to find'}` },
        el('span', { class: 'tile-letter' }, L, el('small', {}, L.toLowerCase())),
        f ? el('img', { src: imgSrc(WORD_IMG[word]), alt: '' }) : el('span', { class: 'q' }, '?'));
      tile.addEventListener('click', () => { sfx.play('tap'); letterDetail(L); });
      grid.append(tile);
    }
  }
  function letterDetail(L) {
    const f = letterFound(L);
    const a = ALPHABET[L];
    const met = p.letterWords[L] || [];
    const node = el('div', { class: 'detail letter-detail' });
    const big = el('button', { class: 'big-letter', type: 'button', 'aria-label': `Hear the letter ${L}` }, L, el('span', { class: 'lower' }, L.toLowerCase()));
    const say = () => speak(`${L}. ${L} says ${a.say}. ${letterLine(L, met[0] || a.words[0])}${a.note ? ` ${a.note}` : ''}`);
    big.addEventListener('click', () => { sfx.play('chime'); fx.sparkleAt(big, 10); say(); });
    node.append(big);
    const words = el('div', { class: 'word-row' });
    for (const w of a.words) {
      const seen = met.includes(w);
      const b = el('button', { class: `word-pic ${seen ? 'seen' : ''}`, type: 'button', 'aria-label': w }, el('img', { src: imgSrc(WORD_IMG[w]), alt: '' }), el('span', {}, w));
      b.addEventListener('click', () => { sfx.play('pop'); speak(letterLine(L, w)); });
      words.append(b);
    }
    node.append(words);
    node.append(el('p', { class: 'detail-note' }, f ? 'Found in your stories! Tap the pictures to hear them.' : 'This letter is still waiting to be found in a story.'));
    showDetail(node);
    say();
  }

  // ---------- numbers ----------
  const numFound = (n) => (p.countedThings[n]?.length || 0) > 0 || (p.learning.numbers[n]?.seen || 0) > 0;
  function drawNumbers() {
    const found = Array.from({ length: 20 }, (_, i) => i + 1).filter(numFound).length;
    grid.append(el('p', { class: 'collect-count' }, `${found} of 20 numbers counted`));
    for (let n = 1; n <= 20; n++) {
      const f = numFound(n);
      const tile = el('button', { class: `tile number-tile ${f ? 'found' : 'waiting'} ${freshKeys.has(`number:${n}`) ? 'fresh' : ''}`, type: 'button', 'aria-label': `Number ${n}` },
        el('span', { class: 'tile-number' }, String(n)), el('span', { class: 'dots' }, ...Array.from({ length: Math.min(n, 10) }, () => el('i'))));
      tile.addEventListener('click', () => { sfx.play('tap'); numberDetail(n); });
      grid.append(tile);
    }
  }
  function numberDetail(n) {
    const things = p.countedThings[n] || [];
    const img = things[0]?.img || 'star';
    const node = el('div', { class: 'detail number-detail' });
    node.append(el('div', { class: 'big-number' }, String(n), el('span', { class: 'word' }, numberWord(n))));
    const frame = el('div', { class: `ten-frame ${n > 10 ? 'two' : ''}` });
    let k = 0;
    for (let i = 0; i < (n > 10 ? 20 : 10); i++) {
      const cell = el('span', { class: 'cell' });
      if (i < n) {
        const b = el('button', { class: 'count-thing', type: 'button', 'aria-label': 'count me' }, el('img', { src: imgSrc(img), alt: '' }));
        b.addEventListener('click', () => {
          if (b.dataset.done) return;
          b.dataset.done = '1'; k++;
          b.append(el('span', { class: 'count-badge' }, String(k)));
          sfx.countNote(k);
          speak(capitalise(numberWord(k)) + (k === n ? `! ${capitalise(numberWord(n))} altogether!` : '!'));
          if (k === n) fx.confetti(20);
        });
        cell.append(b);
      }
      frame.append(cell);
    }
    node.append(frame);
    node.append(el('p', { class: 'detail-note' }, things.length ? `You counted ${numberWord(n)} ${things.map((t) => t.many).filter(Boolean).slice(0, 2).join(' and ')}. Tap to count again!` : 'Tap each one to count!'));
    showDetail(node);
    speak(capitalise(numberWord(n)) + '.');
  }

  // ---------- friends ----------
  function drawFriends() {
    const met = CHARACTER_IDS.filter((id) => p.characters[id]?.met);
    grid.append(el('p', { class: 'collect-count' }, `${met.length} of ${CHARACTER_IDS.length} friends met`));
    for (const id of CHARACTER_IDS) {
      const c = CHARACTERS[id];
      const m = p.characters[id]?.met;
      const tile = el('button', { class: `tile friend-tile ${m ? 'found' : 'waiting'} ${freshKeys.has(`friend:${id}`) ? 'fresh' : ''}`, type: 'button', 'aria-label': m ? c.name : 'A friend you have not met yet' },
        el('img', { src: imgSrc(c.img), alt: '' }), el('span', {}, m ? c.name : '?'));
      tile.addEventListener('click', () => { sfx.play('tap'); friendDetail(id); });
      grid.append(tile);
    }
  }
  function friendDetail(id) {
    const c = CHARACTERS[id];
    const rec = p.characters[id];
    const node = el('div', { class: 'detail friend-detail' });
    if (!rec?.met) {
      node.append(el('img', { class: 'portrait silhouette', src: imgSrc(c.img), alt: '' }), el('p', { class: 'detail-note' }, 'A friend you have not met yet. Maybe in the next story!'));
      showDetail(node);
      speak('A friend you have not met yet. Maybe in the next story!');
      return;
    }
    const portrait = el('button', { class: 'portrait-btn', type: 'button', 'aria-label': `${c.name} says hello` }, el('img', { class: 'portrait', src: imgSrc(c.img), alt: c.name }));
    portrait.addEventListener('click', () => { sfx.play('boing'); portrait.classList.remove('fx-hop'); void portrait.offsetWidth; portrait.classList.add('fx-hop'); speak(c.taps[Math.floor(Math.random() * c.taps.length)], id); });
    node.append(portrait, el('h3', { class: 'friend-name' }, `${c.name} the ${c.species}`), el('p', { class: 'about' }, c.about), el('p', { class: 'likes' }, `Loves ${c.likes}.`));
    const mems = (rec.memories || []).map(memoryLine).filter(Boolean).map((t) => t.replace(/^Do you remember /, '').replace(/\?$/, '.'));
    if (mems.length) {
      node.append(el('h4', {}, 'Things we did together'));
      const ul = el('ul', { class: 'memories' });
      mems.slice(-4).reverse().forEach((t) => ul.append(el('li', {}, capitalise(t.replace(/^(You came back.*)$/, '$1')))));
      node.append(ul);
    }
    node.append(el('p', { class: 'detail-note' }, `Met ${rec.times || 1} ${rec.times === 1 ? 'time' : 'times'}.`));
    showDetail(node);
    speak(`${c.name} the ${c.species}. ${c.about}`);
  }

  // ---------- worlds ----------
  function drawWorlds() {
    const visited = Object.keys(WORLDS).filter((id) => p.worlds[id]?.visits);
    grid.append(el('p', { class: 'collect-count' }, `${visited.length} of 6 worlds visited`));
    for (const [id, w] of Object.entries(WORLDS)) {
      const v = p.worlds[id]?.visits;
      const tile = el('button', { class: `tile world-tile ${v ? 'found' : 'waiting'}`, type: 'button', 'aria-label': w.title });
      const th = el('div', { class: 'thumb' });
      th.innerHTML = paintScene(w.theme, w.locations[w.start[0]]);
      tile.append(th, el('span', {}, w.short));
      tile.addEventListener('click', () => { sfx.play('tap'); worldDetail(id); });
      grid.append(tile);
    }
    const keeps = Object.keys(p.keepsakes);
    if (keeps.length) {
      grid.append(el('p', { class: 'collect-count' }, 'Keepsakes'), ...keeps.map((k) => el('span', { class: 'tile keepsake found' }, el('img', { src: imgSrc(k), alt: k }))));
    }
  }
  function worldDetail(id) {
    const w = WORLDS[id];
    const rec = p.worlds[id] || { places: {}, goals: {}, endings: {} };
    const node = el('div', { class: 'detail world-detail' });
    node.append(el('h3', {}, w.title), el('p', { class: 'about' }, w.blurb));
    node.append(el('h4', {}, 'Places'));
    const places = el('div', { class: 'place-row' });
    for (const [lid, loc] of Object.entries(w.locations)) {
      places.append(el('span', { class: `place-chip ${rec.places?.[lid] ? 'seen' : ''}` }, el('img', { src: imgSrc(loc.icon), alt: '' }), el('span', {}, rec.places?.[lid] ? loc.name.replace(/^the /, 'The ') : '?')));
    }
    node.append(places, el('h4', {}, 'Secret treasures'));
    const secrets = el('div', { class: 'place-row' });
    for (const s of w.secrets) {
      const f = p.secrets[s];
      const sec = SECRETS[s];
      const b = el('button', { class: `secret-chip ${f ? 'seen' : ''} ${freshKeys.has(`secret:${s}`) ? 'fresh' : ''}`, type: 'button', 'aria-label': f ? sec.name : 'a hidden treasure' }, el('img', { src: imgSrc(sec.img), alt: '', style: f && sec.hue !== undefined ? `filter:hue-rotate(${sec.hue}deg) saturate(1.4)` : '' }));
      b.addEventListener('click', () => speak(f ? `${capitalise(sec.name)}!` : 'A treasure still hiding somewhere in this world.'));
      secrets.append(b);
    }
    node.append(secrets, el('h4', {}, 'Endings found'));
    const ends = el('div', { class: 'place-row' });
    for (const e of ENDINGS) {
      if (rec.endings?.[e.id]) ends.append(el('span', { class: 'place-chip seen' }, el('img', { src: imgSrc(e.img), alt: '' }), el('span', {}, e.title)));
    }
    if (!ends.childElementCount) ends.append(el('span', { class: 'detail-note' }, 'Finish a story here to find an ending.'));
    node.append(ends);
    showDetail(node);
    speak(`${w.title}. ${w.blurb}`);
  }

  draw();
  // open on the first fresh discovery, if any
  const firstFresh = fresh[0];
  return {
    root,
    start() {
      if (firstFresh?.kind === 'letter') { tab = 'letters'; draw(); letterDetail(firstFresh.id); }
      else if (firstFresh?.kind === 'friend') { tab = 'friends'; draw(); friendDetail(firstFresh.id); }
      else if (firstFresh?.kind === 'number') { tab = 'numbers'; draw(); numberDetail(firstFresh.id); }
      else if (!isSingle()) { const intro = el('div', { class: 'detail welcome-detail' }, el('img', { class: 'portrait', src: imgSrc('book'), alt: '' }), el('p', { class: 'about' }, 'Everything you find in your stories is kept here. Tap a ribbon, then tap a picture!')); right.replaceChildren(intro); speak('My Discovery Book. Everything you find in your stories is kept here.'); }
      else speak('My Discovery Book.');
    },
    destroy() { narrator.stop(); },
  };
}
