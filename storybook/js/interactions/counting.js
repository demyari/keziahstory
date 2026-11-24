// Counting interactions: one tap = one object, with the count spoken and
// shown. Quantities grow with the child's level (1–5, then 10, then 20).

import { register, sprite, spread, badge, draggable, near, moveTo, pulse, hint, div } from './framework.js';
import { numberWord, capitalise } from '../content/numbers.js';

function counter(api, total, thing) {
  let k = 0;
  return {
    get value() { return k; },
    next(el) {
      k++;
      api.countNote(k);
      api.say(capitalise(numberWord(k)) + '!');
      if (el) badge(el, k);
      return k;
    },
    finishLine() {
      return `${capitalise(numberWord(total))} ${total === 1 ? thing.one : thing.many}!`;
    },
  };
}

// Tap each sleeping thing to wake it (count_tap)
register('count_tap', (api) => {
  const { spec, layer } = api;
  const { pos, size } = spread(spec.n);
  const c = counter(api, spec.n, spec);
  let helped = false;
  const items = pos.map((p, i) => {
    const el = sprite(layer, spec.img, p.x, p.y, size, 'sleepy');
    el.style.animationDelay = `${(i % 5) * 0.3}s`;
    el.addEventListener('click', () => tap(el));
    return el;
  });
  function tap(el) {
    if (el.dataset.done || api.finished) return;
    el.dataset.done = '1';
    el.classList.remove('sleepy');
    el.classList.add('awake');
    api.fx.sparkleAt(el);
    c.next(el);
    if (c.value === spec.n) {
      api.later(() => { api.say(c.finishLine()); api.sfx('success'); api.learn('count', spec.n, helped ? 'helped' : 'independent', { img: spec.img, many: spec.many }); api.finish(helped ? 'helped' : 'independent'); }, 700);
    }
  }
  return {
    help() {
      helped = true;
      const left = items.filter((e) => !e.dataset.done);
      left.forEach((el, i) => api.later(() => tap(el), 900 * (i + 1)));
    },
  };
});

// Carry a little glow to each lantern (carry_glow)
register('carry_glow', (api) => {
  const { spec, layer } = api;
  const { pos, size } = spread(spec.n, Math.random, { x0: 30, x1: 92, y0: 12, y1: 60 });
  const c = counter(api, spec.n, { one: 'lantern', many: 'lanterns' });
  let helped = false;
  const lanterns = pos.map((p) => sprite(layer, spec.targetImg, p.x, p.y, size * 0.9, 'unlit'));
  const glow = div(layer, 'glow-orb', 24, 80, 9);
  glow.setAttribute('role', 'button');
  glow.setAttribute('aria-label', 'a little glow');
  function light(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    el.classList.remove('unlit'); el.classList.add('lit');
    api.fx.sparkleAt(el);
    c.next(el);
    if (c.value === spec.n) {
      glow.dataset.locked = '1';
      glow.classList.add('fade');
      api.later(() => { api.say(c.finishLine()); api.sfx('success'); api.learn('count', spec.n, helped ? 'helped' : 'independent', { img: 'lantern', many: 'lanterns' }); api.finish(helped ? 'helped' : 'independent'); }, 700);
    }
  }
  const off = draggable(glow, layer, {
    onMove: () => { for (const l of lanterns) if (!l.dataset.done && near(glow, l, layer, 0.07)) light(l); },
    onDrop: () => { for (const l of lanterns) if (!l.dataset.done && near(glow, l, layer, 0.1)) { light(l); return true; } return true; },
  });
  // tapping a lantern also works (forgiving), the glow flies to it
  lanterns.forEach((l) => l.addEventListener('click', async () => {
    if (l.dataset.done) return;
    await moveTo(glow, parseFloat(l.style.left), parseFloat(l.style.top), 300);
    light(l);
  }));
  api.onCleanup(off);
  return {
    help() {
      helped = true;
      lanterns.filter((l) => !l.dataset.done).forEach((l, i) => api.later(async () => { await moveTo(glow, parseFloat(l.style.left), parseFloat(l.style.top), 500); light(l); }, 1000 * (i + 1)));
    },
  };
});

// Put N things into the basket (sort_basket): more things than needed, stop at N
register('sort_basket', (api) => {
  const { spec, layer } = api;
  const extra = Math.min(3, 20 - spec.n);
  const { pos, size } = spread(spec.n + extra, Math.random, { x0: 26, x1: 70, y0: 12, y1: 78 });
  const basket = sprite(layer, 'basket', 84, 66, 22, 'target');
  basket.tabIndex = -1;
  const c = counter(api, spec.n, spec);
  let helped = false;
  const items = pos.map((p) => sprite(layer, spec.img, p.x, p.y, size));
  function drop(el) {
    if (el.dataset.locked || api.finished) return false;
    el.dataset.locked = '1';
    const k = c.value;
    moveTo(el, 80 + (k % 4) * 2.5, 58 + Math.floor(k / 4) * 2, 250).then(() => { el.classList.add('in-basket'); });
    api.sfx('pop');
    pulse(basket, 'wobble');
    c.next(el);
    if (c.value === spec.n) {
      items.forEach((i) => { i.dataset.locked = '1'; });
      api.later(() => { api.say(c.finishLine() + ' The basket is full.'); api.sfx('success'); api.learn('count', spec.n, helped ? 'helped' : 'independent', { img: spec.img, many: spec.many }); api.finish(helped ? 'helped' : 'independent'); }, 700);
    }
    return true;
  }
  items.forEach((el) => {
    api.onCleanup(draggable(el, layer, { onDrop: () => (near(el, basket, layer, 0.18) ? drop(el) : false) }));
    el.addEventListener('dblclick', () => drop(el));
  });
  // a single tap also puts it in (for small fingers that tap rather than drag)
  items.forEach((el) => {
    let downAt = 0; let downPos = null;
    el.addEventListener('pointerdown', (e) => { downAt = Date.now(); downPos = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => { if (Date.now() - downAt < 300 && downPos && Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) < 10) drop(el); });
  });
  return {
    help() { helped = true; items.filter((i) => !i.dataset.locked).slice(0, spec.n - c.value).forEach((el, i) => api.later(() => drop(el), 900 * (i + 1))); },
  };
});

// Which basket has N? (numeral_pick) - matching quantity, optionally numerals
register('numeral_pick', (api) => {
  const { spec, layer } = api;
  let tries = 0; let helped = false;
  const xs = [36, 60, 84];
  const baskets = spec.options.map((q, i) => {
    const box = div(layer, 'qty-basket', xs[i], 46, 21);
    box.setAttribute('role', 'button');
    box.setAttribute('aria-label', `${numberWord(q)} ${spec.many}`);
    box.dataset.q = q;
    const grid = document.createElement('div');
    grid.className = 'qty-grid';
    for (let k = 0; k < q; k++) {
      const im = document.createElement('img');
      im.src = `assets/img/${spec.img}.webp`; im.alt = ''; im.draggable = false;
      grid.appendChild(im);
    }
    box.appendChild(grid);
    if (spec.showNumerals) {
      const lab = document.createElement('span');
      lab.className = 'numeral'; lab.textContent = String(q);
      box.appendChild(lab);
    }
    box.addEventListener('click', () => pick(box));
    return box;
  });
  function pick(box) {
    if (api.finished) return;
    const q = Number(box.dataset.q);
    if (q === spec.n) {
      box.classList.add('chosen');
      api.fx.sparkleAt(box);
      api.sfx('success');
      const outcome = helped ? 'helped' : tries === 0 ? 'independent' : 'hinted';
      api.learn(spec.showNumerals ? 'numeral' : 'count', spec.n, outcome, { img: spec.img, many: spec.many });
      api.say(`${capitalise(numberWord(q))}! Yes!`);
      api.later(() => api.finish(outcome), 900);
    } else {
      tries++;
      api.sfx('gentle');
      pulse(box, 'wiggle');
      // Count that basket aloud so the child can compare.
      api.say(`That basket has ${numberWord(q)}. We need ${numberWord(spec.n)}.`);
      if (tries >= 2) hint(baskets.find((b) => Number(b.dataset.q) === spec.n));
    }
  }
  return { help() { helped = true; const b = baskets.find((x) => Number(x.dataset.q) === spec.n); hint(b); api.later(() => pick(b), 1200); } };
});

// Singing stones: tap the glowing stone, one after another (music_stones)
register('music_stones', (api) => {
  const { spec, layer } = api;
  const colours = ['#ff8fb0', '#ffd166', '#8fe38f', '#8fc8ff', '#c39bff'];
  let k = 0; let helped = false;
  const stones = [];
  for (let i = 0; i < spec.n; i++) {
    const s = div(layer, 'stone', 30 + (i * 60) / Math.max(1, spec.n - 1), 62 - (i % 2) * 8, 13);
    s.style.setProperty('--c', colours[i % colours.length]);
    s.setAttribute('role', 'button');
    s.setAttribute('aria-label', `stone ${i + 1}`);
    s.addEventListener('click', () => tap(i));
    stones.push(s);
  }
  const glowNext = () => { stones.forEach((s, i) => s.classList.toggle('glowing', i === k)); };
  glowNext();
  function tap(i) {
    if (api.finished) return;
    if (i !== k) { api.countNote(i + 1); pulse(stones[i], 'wiggle'); hint(stones[k]); return; }
    api.countNote(k + 1);
    stones[k].classList.add('sung');
    api.fx.sparkleAt(stones[k]);
    badge(stones[k], k + 1);
    k++;
    glowNext();
    if (k === spec.n) {
      api.later(() => { [0, 1, 2, 3, 4].slice(0, spec.n).forEach((j, t) => setTimeout(() => api.countNote(j + 1), t * 220)); }, 300);
      api.later(() => { api.learn('count', spec.n, helped ? 'helped' : 'independent', { img: 'music', many: 'singing stones' }); api.finish(helped ? 'helped' : 'independent'); }, 1700);
    }
  }
  return { help() { helped = true; for (let j = k; j < spec.n; j++) api.later(() => tap(j), 700 * (j - k + 1)); } };
});

// Shake the tree: things fall, counted as they land (shake_tree)
register('shake_tree', (api) => {
  const { spec, layer } = api;
  const tree = sprite(layer, 'tree', 58, 44, 42, 'big-tree');
  let fallen = 0; let shakes = 0; let helped = false;
  const fruit = [];
  for (let i = 0; i < spec.n; i++) {
    const a = (i / spec.n) * Math.PI * 2;
    const f = sprite(layer, spec.fruitImg, 58 + Math.cos(a) * 13, 30 + Math.sin(a) * 12, spec.n > 10 ? 6 : 8, 'on-tree');
    f.tabIndex = -1;
    fruit.push(f);
  }
  const key = sprite(layer, spec.bonusImg, 60, 36, 8, 'on-tree hidden-key');
  key.tabIndex = -1;
  const perShake = Math.max(1, Math.ceil(spec.n / 4));
  function shake() {
    if (api.finished || fallen >= spec.n) return;
    shakes++;
    pulse(tree, 'shake');
    api.sfx('shake');
    for (let j = 0; j < perShake && fallen < spec.n; j++) {
      const f = fruit[fallen];
      fallen++;
      const k = fallen;
      api.later(() => {
        f.classList.remove('on-tree');
        moveTo(f, 30 + ((k - 1) % 10) * 6.5, 78 + Math.floor((k - 1) / 10) * 9, 450).then(() => { badge(f, k); });
        api.countNote(k);
        api.say(capitalise(numberWord(k)) + '!');
      }, j * 550);
    }
    if (fallen >= spec.n) {
      api.later(() => {
        key.classList.remove('on-tree', 'hidden-key');
        moveTo(key, 46, 70, 500);
        api.sfx('chime');
        api.fx.sparkleAt(key);
      }, perShake * 550 + 300);
      api.later(() => { api.learn('count', spec.n, helped ? 'helped' : 'independent', { img: spec.fruitImg, many: spec.many }); api.finish(helped ? 'helped' : 'independent'); }, perShake * 550 + 1500);
    }
  }
  tree.addEventListener('click', shake);
  // swiping across the tree shakes it too
  let lastX = null;
  tree.addEventListener('pointermove', (e) => {
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;
    if (lastX !== null && Math.abs(e.clientX - lastX) > 40) { shake(); lastX = e.clientX; }
    if (lastX === null) lastX = e.clientX;
  });
  tree.addEventListener('pointerleave', () => { lastX = null; });
  return { help() { helped = true; for (let i = 0; i < 5; i++) api.later(shake, 1300 * (i + 1)); } };
});
