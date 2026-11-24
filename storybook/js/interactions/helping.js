// Helping interactions: feed a friend, unlock a chest, fit shapes into a door,
// give the found things, cheer a friend on, say hello.

import { register, sprite, spread, draggable, near, moveTo, pulse, hint, div, badge } from './framework.js';
import { numberWord, capitalise } from '../content/numbers.js';
import { CHARACTERS } from '../content/characters.js';

register('drag_feed', (api) => {
  const { spec, layer } = api;
  const eater = sprite(layer, spec.eaterImg, 82, 52, 24, 'eater');
  eater.tabIndex = -1;
  const { pos, size } = spread(spec.n, Math.random, { x0: 28, x1: 62, y0: 18, y1: 82 });
  let fed = 0; let helped = false;
  const foods = pos.map((p) => sprite(layer, spec.foodImg, p.x, p.y, Math.min(size, 12)));
  function feed(el) {
    if (el.dataset.locked || api.finished) return false;
    el.dataset.locked = '1';
    moveTo(el, 80, 52, 220).then(() => { el.classList.add('eaten'); });
    fed++;
    api.sfx('munch');
    pulse(eater, 'chomp');
    api.countNote(fed);
    api.say(capitalise(numberWord(fed)) + '!');
    if (fed === spec.n) {
      api.later(() => {
        api.fx.sparkleAt(eater);
        api.sfx('success');
        api.learn('count', spec.n, helped ? 'helped' : 'independent', { img: spec.foodImg, many: spec.many });
        api.finish(helped ? 'helped' : 'independent');
      }, 800);
    }
    return true;
  }
  foods.forEach((el) => {
    api.onCleanup(draggable(el, layer, { onDrop: () => (near(el, eater, layer, 0.2) ? feed(el) : false) }));
    let t0 = 0; let p0 = null;
    el.addEventListener('pointerdown', (e) => { t0 = Date.now(); p0 = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => { if (Date.now() - t0 < 300 && p0 && Math.hypot(e.clientX - p0[0], e.clientY - p0[1]) < 10) feed(el); });
  });
  eater.addEventListener('click', () => { pulse(eater, 'wiggle'); api.sfx('tap'); });
  return { help() { helped = true; foods.filter((f) => !f.dataset.locked).forEach((f, i) => api.later(() => feed(f), 900 * (i + 1))); } };
});

register('key_lock', (api) => {
  const { spec, layer } = api;
  const chest = div(layer, 'chest', 66, 56, 30);
  chest.innerHTML = '<div class="lid"></div><div class="box"></div><div class="lock"></div>';
  const key = sprite(layer, spec.keyImg, 30, 70, 12, 'key');
  const prize = sprite(layer, spec.prizeImg, 66, 50, 14, 'under prize');
  prize.tabIndex = -1;
  let helped = false;
  function open() {
    if (api.finished || chest.classList.contains('open')) return;
    key.dataset.locked = '1';
    moveTo(key, 66, 62, 250).then(() => key.classList.add('turn'));
    api.sfx('unlock');
    api.later(() => {
      chest.classList.add('open');
      prize.classList.add('found', 'pop-up');
      api.fx.sparkleAt(prize);
      api.sfx('success');
      api.later(() => api.finish(helped ? 'helped' : 'independent'), 1300);
    }, 600);
    return true;
  }
  api.onCleanup(draggable(key, layer, { onDrop: () => (near(key, chest, layer, 0.18) ? open() : false) }));
  chest.addEventListener('click', () => { hint(key); api.say('Drag the key to the lock!'); });
  key.addEventListener('dblclick', open);
  return { help() { helped = true; hint(key); api.later(open, 1000); } };
});

const SHAPE_PATHS = {
  circle: '<circle cx="50" cy="50" r="38"/>',
  star: '<polygon points="50,8 61,38 94,38 67,57 77,90 50,70 23,90 33,57 6,38 39,38"/>',
  heart: '<path d="M50 88 C10 60 5 30 25 18 C38 10 50 22 50 30 C50 22 62 10 75 18 C95 30 90 60 50 88Z"/>',
  moon: '<path d="M64 10 A40 40 0 1 0 90 70 A32 32 0 1 1 64 10Z"/>',
  square: '<rect x="14" y="14" width="72" height="72" rx="10"/>',
  triangle: '<polygon points="50,10 92,88 8,88"/>',
};
const SHAPE_COLOURS = { circle: '#ff8a8a', star: '#ffd166', heart: '#ff7aa2', moon: '#8fc8ff', square: '#8fe38f', triangle: '#c39bff' };

register('match_shapes', (api) => {
  const { spec, layer } = api;
  const door = div(layer, 'shape-door', 66, 46, 34);
  let placed = 0; let wrong = 0; let helped = false;
  const holes = spec.shapes.map((sh, i) => {
    const h = div(door, 'hole', 50, 20 + i * 30, 30);
    h.innerHTML = `<svg viewBox="0 0 100 100">${SHAPE_PATHS[sh]}</svg>`;
    h.dataset.shape = sh;
    return h;
  });
  const order = spec.shapes.slice().sort(() => Math.random() - 0.5);
  const pieces = order.map((sh, i) => {
    const p = div(layer, 'shape-piece', 30, 24 + i * 26, 11);
    p.innerHTML = `<svg viewBox="0 0 100 100" style="fill:${SHAPE_COLOURS[sh]}">${SHAPE_PATHS[sh]}</svg>`;
    p.dataset.shape = sh;
    p.setAttribute('role', 'button');
    p.setAttribute('aria-label', `${sh} shape`);
    return p;
  });
  function place(p, h) {
    p.dataset.locked = '1';
    const r = h.getBoundingClientRect(); const L = layer.getBoundingClientRect();
    moveTo(p, ((r.left + r.width / 2 - L.left) / L.width) * 100, ((r.top + r.height / 2 - L.top) / L.height) * 100, 200);
    h.classList.add('filled');
    api.sfx('pop');
    api.fx.sparkleAt(h);
    api.say(`The ${p.dataset.shape}!`);
    placed++;
    if (placed === holes.length) {
      api.later(() => { door.classList.add('open'); api.sfx('creak'); api.sfx('success'); }, 500);
      api.later(() => api.finish(helped ? 'helped' : wrong > 1 ? 'hinted' : 'independent'), 1600);
    }
  }
  pieces.forEach((p) => {
    api.onCleanup(draggable(p, layer, {
      onDrop: () => {
        const h = holes.find((x) => near(p, x, layer, 0.09));
        if (!h) return false;
        if (h.dataset.shape === p.dataset.shape && !h.classList.contains('filled')) { place(p, h); return true; }
        wrong++;
        api.sfx('gentle');
        pulse(h, 'wiggle');
        api.say(`Hmm, that is a ${p.dataset.shape}. This hole is a ${h.dataset.shape}.`);
        if (wrong >= 2) hint(holes.find((x) => x.dataset.shape === p.dataset.shape));
        return false;
      },
    }));
  });
  return {
    help() {
      helped = true;
      pieces.filter((p) => !p.dataset.locked).forEach((p, i) => api.later(() => place(p, holes.find((h) => h.dataset.shape === p.dataset.shape)), 1000 * (i + 1)));
    },
  };
});

register('give_pieces', (api) => {
  const { spec, layer } = api;
  const target = sprite(layer, spec.targetImg, 70, 42, 26, 'goal-target sleepy');
  target.tabIndex = -1;
  let given = 0; let helped = false;
  const pieces = spec.pieceImgs.map((img, i) => sprite(layer, img, 30, 24 + i * 24, 12, 'piece'));
  function give(p) {
    if (p.dataset.locked || api.finished) return false;
    p.dataset.locked = '1';
    moveTo(p, 70, 42, 300).then(() => p.classList.add('absorbed'));
    given++;
    api.sfx('chime');
    api.fx.sparkleAt(target);
    target.style.setProperty('--glow', String(given / pieces.length));
    target.classList.add('warming');
    if (given === pieces.length) {
      target.classList.remove('sleepy');
      api.later(() => { target.classList.add('awake-big'); api.fx.confetti(); api.sfx('success'); }, 500);
      api.later(() => api.finish(helped ? 'helped' : 'independent'), 1800);
    }
    return true;
  }
  pieces.forEach((p) => {
    api.onCleanup(draggable(p, layer, { onDrop: () => (near(p, target, layer, 0.22) ? give(p) : false) }));
    let t0 = 0; let p0 = null;
    p.addEventListener('pointerdown', (e) => { t0 = Date.now(); p0 = [e.clientX, e.clientY]; });
    p.addEventListener('pointerup', (e) => { if (Date.now() - t0 < 300 && p0 && Math.hypot(e.clientX - p0[0], e.clientY - p0[1]) < 10) give(p); });
  });
  return { help() { helped = true; pieces.filter((p) => !p.dataset.locked).forEach((p, i) => api.later(() => give(p), 900 * (i + 1))); } };
});

// Tap a friend several times to cheer / pull / hug (charge_tap)
register('charge_tap', (api) => {
  const { spec, layer } = api;
  const c = CHARACTERS[spec.who];
  const el = sprite(layer, c.img, 62, 46, 26, 'charge');
  const meter = div(layer, 'charge-meter', 62, 80, 22);
  for (let i = 0; i < spec.taps; i++) { const d = document.createElement('span'); meter.appendChild(d); }
  let k = 0;
  const sound = { hug: 'hug', pull: 'boing', cheer: 'sparkle' }[spec.verb] || 'sparkle';
  function tap() {
    if (api.finished || k >= spec.taps) return;
    k++;
    meter.children[k - 1].classList.add('on');
    pulse(el, spec.verb === 'pull' ? 'stretch' : 'hop');
    api.sfx(sound);
    api.fx.sparkleAt(el);
    if (k === spec.taps) {
      api.later(() => { el.classList.add('powered'); api.fx.confetti(); api.sfx('success'); api.say(c.cheer[1], spec.who); }, 300);
      api.later(() => api.finish('independent'), 1700);
    } else if (spec.verb === 'pull') api.say(k === 1 ? 'Pull!' : 'Pull, pull!');
    else if (spec.verb === 'cheer') api.say(k === 1 ? 'Hooray!' : 'Hip hip hooray!');
  }
  el.addEventListener('click', tap);
  return { help() { for (let i = k; i < spec.taps; i++) api.later(tap, 600 * (i - k + 1)); } };
});

// A friend you can tap to say hello before deciding (tap_react)
register('tap_react', (api) => {
  const { spec, layer } = api;
  const c = CHARACTERS[spec.who];
  const el = sprite(layer, c.img, 64, 48, 24, 'react');
  let i = 0;
  el.addEventListener('click', () => {
    pulse(el, 'hop');
    api.sfx('boing');
    api.say(c.taps[i++ % c.taps.length], spec.who);
  });
  api.later(() => api.finish('independent'), 50);
  return {};
});
