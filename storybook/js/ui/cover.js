// The book's cover and the "where shall we go?" page.

import { WORLDS } from '../content/worlds.js';
import { CHARACTERS } from '../content/characters.js';
import { imgSrc } from '../content/images.js';
import { paintScene } from '../render/scene.js';
import * as sfx from '../audio/sfx.js';
import * as fx from '../render/fx.js';
import * as narrator from '../audio/narrator.js';
import { el, icon } from './dom.js';

export function renderCover({ session, settings, onNew, onContinue, onBook, onParent }) {
  const root = el('div', { class: 'spread kind-cover' });
  const cover = el('section', { class: 'cover' });
  root.append(cover);
  const art = el('div', { class: 'cover-art' });
  art.innerHTML = paintScene('night', { name: 'cover', tags: ['high', 'sky'], features: ['bigmoon', 'flowers', 'fireflies'] });
  cover.append(art);
  const friends = ['sparkle', 'hoot', 'rosie', 'pip', 'dotty', 'coral', 'ember', 'benny'];
  const ring = el('div', { class: 'cover-friends' });
  friends.forEach((id, i) => {
    const c = CHARACTERS[id];
    const met = session.profile.characters[id]?.met;
    const b = el('button', { class: `cover-friend ${met ? 'met' : ''}`, type: 'button', 'aria-label': c.name, style: `--i:${i}` }, el('img', { src: imgSrc(c.img), alt: '' }));
    b.addEventListener('click', () => {
      sfx.play('boing'); fx.sparkleAt(b, 8);
      b.classList.remove('fx-hop'); void b.offsetWidth; b.classList.add('fx-hop');
      narrator.say(met ? `${c.name}! ${c.taps[0]}` : c.hello[1], id);
    });
    ring.append(b);
  });
  cover.append(ring);
  cover.append(el('h1', { class: 'cover-title' }, el('span', { class: 'small' }, 'The'), ' Magical Storybook'));
  const actions = el('div', { class: 'cover-actions' });
  if (session.hasCurrent()) {
    const cont = el('button', { class: 'big-btn primary', type: 'button' }, icon('play'), el('span', {}, 'Keep reading'));
    cont.addEventListener('click', () => { sfx.play('sparkle'); onContinue(); });
    actions.append(cont);
  }
  const open = el('button', { class: `big-btn ${session.hasCurrent() ? '' : 'primary'}`, type: 'button' }, icon('book'), el('span', {}, session.hasCurrent() ? 'New story' : 'Open the book'));
  open.addEventListener('click', () => { sfx.play('sparkle'); onNew(); });
  const book = el('button', { class: 'big-btn gold', type: 'button', 'data-book-button': '' }, icon('star'), el('span', {}, 'My Discovery Book'));
  book.addEventListener('click', () => { sfx.play('page'); onBook(); });
  actions.append(open, book);
  cover.append(actions);

  // Grown-ups: press and hold the little cog.
  const gear = el('button', { class: 'parent-gear', type: 'button', 'aria-label': 'Grown-ups: press and hold for settings' }, icon('gear'), el('span', { class: 'hold-ring' }));
  let holdT = null;
  const startHold = (e) => { e.preventDefault(); gear.classList.add('holding'); holdT = setTimeout(() => { gear.classList.remove('holding'); onParent(); }, 2000); };
  const endHold = () => { clearTimeout(holdT); gear.classList.remove('holding'); };
  gear.addEventListener('pointerdown', startHold);
  gear.addEventListener('pointerup', endHold);
  gear.addEventListener('pointerleave', endHold);
  gear.addEventListener('contextmenu', (e) => e.preventDefault());
  cover.append(gear);

  return {
    root,
    start() {
      if (settings.narration && settings.autoRead) {
        narrator.speakLines([{ who: 'n', text: session.hasCurrent() ? 'Welcome back! Shall we keep reading our story?' : 'The Magical Storybook. Tap the book to begin!' }]);
      }
    },
    destroy() { narrator.stop(); },
  };
}

export function renderWorldPick({ session, settings, onPick, onBack }) {
  const root = el('div', { class: 'spread kind-worlds' });
  const left = el('section', { class: 'leaf leaf-text world-intro' });
  const right = el('section', { class: 'leaf leaf-worlds' });
  root.append(left, right);
  const back = el('button', { class: 'round-btn back-btn', type: 'button', 'aria-label': 'Back to the cover' }, icon('back'));
  back.addEventListener('click', () => { sfx.play('tap'); onBack(); });
  left.append(back, el('h2', { class: 'page-title' }, 'Where shall we go today?'),
    el('p', { class: 'line narr' }, 'Tap a picture to choose a world.'));
  const grid = el('div', { class: 'world-grid' });
  for (const [id, w] of Object.entries(WORLDS)) {
    const visited = session.profile.worlds[id]?.visits;
    const card = el('button', { class: 'world-card', type: 'button', 'aria-label': w.title });
    const th = el('div', { class: 'thumb' });
    th.innerHTML = paintScene(w.theme, w.locations[w.start[0]]);
    card.append(th, el('img', { class: 'choice-icon', src: imgSrc(w.img), alt: '' }), el('span', { class: 'choice-label' }, w.short));
    if (visited) card.append(el('span', { class: 'visited-star', 'aria-label': 'visited before' }, icon('star')));
    card.addEventListener('click', () => { sfx.play('sparkle'); fx.sparkleAt(card, 10); onPick(id); });
    grid.append(card);
  }
  const surprise = el('button', { class: 'world-card surprise', type: 'button', 'aria-label': 'Surprise me' },
    el('img', { class: 'choice-icon', src: imgSrc('gift'), alt: '' }), el('span', { class: 'choice-label' }, 'Surprise me!'));
  surprise.addEventListener('click', () => { sfx.play('sparkle'); fx.sparkleAt(surprise, 10); onPick(null); });
  grid.append(surprise);
  right.append(grid);
  return {
    root,
    start() {
      if (settings.narration && settings.autoRead) narrator.speakLines([{ who: 'n', text: 'Where shall we go today? The Moonlight Garden, Seashell Cove, the Cloud Kingdom, the Whispering Woods, Snowy Peaks, or Dinosaur Valley?' }]);
    },
    destroy() { narrator.stop(); },
  };
}
