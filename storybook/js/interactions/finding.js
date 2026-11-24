// Finding and revealing: peek under things, push clouds, rub away cover,
// follow footprints.

import { register, sprite, spread, div, hint, pulse, badge, moveTo } from './framework.js';
import { imgAlt } from '../content/images.js';
import { numberWord, capitalise } from '../content/numbers.js';

const SPOT_SVG = {
  bush: '<svg viewBox="0 0 120 90"><circle cx="35" cy="55" r="32" fill="#4f9a50"/><circle cx="70" cy="40" r="38" fill="#5fae5a"/><circle cx="95" cy="60" r="25" fill="#4f9a50"/><circle cx="55" cy="30" r="8" fill="#ff8fb0"/><circle cx="85" cy="45" r="7" fill="#ffd166"/></svg>',
  sandpile: '<svg viewBox="0 0 120 90"><path d="M5 85 Q60 -10 115 85Z" fill="#e8c27a"/><path d="M30 80 Q60 20 90 80" fill="#f2d49a"/><circle cx="50" cy="60" r="4" fill="#fff"/></svg>',
  cloudpuff: '<svg viewBox="0 0 120 90"><ellipse cx="60" cy="62" rx="55" ry="24" fill="#fff"/><circle cx="38" cy="50" r="24" fill="#fff"/><circle cx="66" cy="38" r="30" fill="#fff"/><circle cx="92" cy="54" r="20" fill="#fff"/></svg>',
  leafpile: '<svg viewBox="0 0 120 90"><ellipse cx="60" cy="70" rx="56" ry="20" fill="#d98a3a"/><ellipse cx="40" cy="55" rx="30" ry="14" fill="#e8a44a" transform="rotate(-20 40 55)"/><ellipse cx="80" cy="52" rx="30" ry="13" fill="#c96a2a" transform="rotate(25 80 52)"/><ellipse cx="60" cy="40" rx="24" ry="11" fill="#f0b85a"/></svg>',
  snowdrift: '<svg viewBox="0 0 120 90"><path d="M2 88 Q20 30 60 30 Q100 30 118 88Z" fill="#fff"/><path d="M20 70 Q60 40 100 70" stroke="#d7e4f6" stroke-width="5" fill="none"/></svg>',
  fern: '<svg viewBox="0 0 120 90"><path d="M60 88 Q55 40 20 10 M60 88 Q65 40 100 10 M60 88 V5" stroke="#3f8a3f" stroke-width="5" fill="none"/>' + [0, 1, 2, 3, 4].map((k) => `<ellipse cx="${30 + k * 6}" cy="${20 + k * 13}" rx="16" ry="6" fill="#5fae4a"/><ellipse cx="${90 - k * 6}" cy="${20 + k * 13}" rx="16" ry="6" fill="#5fae4a"/>`).join('') + '</svg>',
};

register('find_hidden', (api) => {
  const { spec, layer } = api;
  const { pos, size } = spread(spec.spots, Math.random, { x0: 28, x1: 92, y0: 30, y1: 80 });
  const target = Math.floor(Math.random() * spec.spots);
  let peeks = 0;
  const covers = pos.map((p, i) => {
    const inside = i === target ? spec.findImg : (i % 2 === 0 ? spec.extras[(i / 2) % spec.extras.length] : null);
    let under = null;
    if (inside) { under = sprite(layer, inside, p.x, p.y, size * 0.8, 'under'); under.tabIndex = -1; }
    const c = div(layer, 'peek-cover', p.x, p.y, size * 1.5);
    c.innerHTML = SPOT_SVG[spec.spot] || SPOT_SVG.bush;
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', 'peek here');
    c.addEventListener('click', () => peek(c, i, under, inside));
    return c;
  });
  function peek(c, i, under, inside) {
    if (c.dataset.open || api.finished) return;
    c.dataset.open = '1';
    peeks++;
    c.classList.add('lifted');
    api.sfx(spec.spot === 'cloudpuff' ? 'whoosh' : 'rustle');
    if (i === target) {
      under.classList.add('found');
      api.fx.sparkleAt(under);
      api.sfx('success');
      api.say(`You found ${spec.findName}!`);
      api.later(() => api.finish('independent'), 1100);
    } else if (inside) {
      api.say(`Just ${imgAlt(inside)}! Keep looking.`);
      under.classList.add('peeked');
    } else {
      api.say(peeks === 1 ? 'Nothing here. Try another one!' : 'Not here!');
    }
    if (peeks >= 3 && !api.finished) hint(covers[target]);
  }
  return { help() { hint(covers[target]); api.later(() => covers[target].click(), 1200); } };
});

// Push clouds aside to reveal something (move_clouds)
register('move_clouds', (api) => {
  const { spec, layer } = api;
  const reveal = sprite(layer, spec.revealImg, 60, 40, 16, 'under');
  reveal.tabIndex = -1;
  const places = [[48, 36], [64, 30], [70, 46], [56, 50]].slice(0, Math.max(3, spec.n));
  let moved = 0;
  const clouds = places.map(([x, y]) => {
    const c = div(layer, 'cloud-cover', x, y, 26);
    c.innerHTML = SPOT_SVG.cloudpuff;
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', 'a cloud');
    let sx = null;
    const away = (dir) => {
      if (c.dataset.gone) return;
      c.dataset.gone = '1';
      moved++;
      c.style.transition = 'left .7s ease, opacity .7s ease';
      c.style.left = `${dir > 0 ? 115 : -15}%`;
      c.style.opacity = '0';
      api.sfx('whoosh');
      if (moved === clouds.length) {
        reveal.classList.add('found');
        api.fx.sparkleAt(reveal);
        api.sfx('success');
        api.say(`Look! ${capitalise(spec.revealName)}!`);
        api.later(() => api.finish('independent'), 1200);
      }
    };
    c.addEventListener('pointerdown', (e) => { sx = e.clientX; c.setPointerCapture?.(e.pointerId); });
    c.addEventListener('pointermove', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 25) { away(e.clientX - sx); sx = null; } });
    c.addEventListener('pointerup', () => { if (sx !== null) away(x < 60 ? -1 : 1); sx = null; });
    c.style.touchAction = 'none';
    return { c, away, x };
  });
  return { help() { clouds.forEach((k, i) => api.later(() => k.away(k.x < 60 ? -1 : 1), 800 * (i + 1))); } };
});

// Rub away vines / snow / sand to reveal a treasure (rub_reveal)
register('rub_reveal', (api) => {
  const { spec, layer } = api;
  const box = div(layer, 'rub-box', 60, 46, 34);
  const reveal = sprite(box, spec.revealImg, 50, 50, 60, 'rub-prize');
  reveal.tabIndex = -1;
  const cv = document.createElement('canvas');
  cv.className = 'rub-canvas';
  box.appendChild(cv);
  const colours = { cobwebs: '#cfc6e6', vines: '#4f8f45', snow: '#f4f8fd', sand: '#e8c27a', seaweed: '#3f9a6a', mist: '#b9b3e6', ivy: '#5f9a50', leaves: '#d98a3a' };
  let ctx2; let total = 0; let cleared = 0; let done = false;
  const W = 120; const H = 120;
  function paint() {
    cv.width = W; cv.height = H;
    ctx2 = cv.getContext('2d');
    ctx2.fillStyle = colours[spec.cover] || '#999';
    ctx2.fillRect(0, 0, W, H);
    ctx2.globalAlpha = 0.35;
    for (let i = 0; i < 60; i++) { ctx2.fillStyle = i % 2 ? '#ffffff' : '#000000'; ctx2.beginPath(); ctx2.arc(Math.random() * W, Math.random() * H, 3 + Math.random() * 8, 0, 7); ctx2.fill(); }
    ctx2.globalAlpha = 1;
    ctx2.globalCompositeOperation = 'destination-out';
    total = W * H;
  }
  paint();
  const rub = (e) => {
    if (done) return;
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W; const y = ((e.clientY - r.top) / r.height) * H;
    ctx2.beginPath(); ctx2.arc(x, y, 16, 0, 7); ctx2.fill();
    cleared += 1;
    if (cleared % 6 === 0) api.sfx('rustle');
    if (cleared > 22) check();
  };
  function check() {
    const d = ctx2.getImageData(0, 0, W, H).data;
    let clear = 0;
    for (let i = 3; i < d.length; i += 16) if (d[i] < 40) clear++;
    if (clear / (total / 4) > 0.45) finish();
  }
  function finish() {
    if (done) return;
    done = true;
    cv.style.transition = 'opacity .6s'; cv.style.opacity = '0';
    reveal.classList.add('found');
    api.fx.sparkleAt(reveal);
    api.sfx('success');
    api.say(`${capitalise(spec.revealName)}!`);
    api.later(() => api.finish('independent'), 1200);
  }
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); rub(e); });
  cv.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType !== 'mouse') rub(e); });
  cv.style.touchAction = 'none';
  // tapping lots also works
  cv.addEventListener('click', (e) => { for (let i = 0; i < 5; i++) rub({ clientX: e.clientX + (Math.random() - 0.5) * 40, clientY: e.clientY + (Math.random() - 0.5) * 40 }); });
  return { help() { finish(); } };
});

// Follow footprints, tapping each one (follow_footprints)
register('follow_footprints', (api) => {
  const { spec, layer } = api;
  const n = spec.steps;
  const steps = [];
  let k = 0; let helped = false;
  const goal = sprite(layer, spec.revealImg, 86, 38, 18, 'under');
  goal.tabIndex = -1;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = 30 + t * 48; const y = 76 - t * 30 + (i % 2 ? -4 : 4);
    const s = div(layer, 'footprint', x, y, 7.5);
    s.style.transform = `translate(-50%,-50%) rotate(${-30 + (i % 2) * 20}deg)`;
    s.setAttribute('role', 'button');
    s.setAttribute('aria-label', `footprint ${i + 1}`);
    s.addEventListener('click', () => step(i));
    steps.push(s);
  }
  steps[0].classList.add('next');
  function step(i) {
    if (api.finished) return;
    if (i !== k) { hint(steps[k]); return; }
    steps[k].classList.remove('next');
    steps[k].classList.add('stepped');
    badge(steps[k], k + 1);
    api.countNote(k + 1);
    api.say(capitalise(numberWord(k + 1)) + '!');
    k++;
    if (k < n) steps[k].classList.add('next');
    else {
      goal.classList.add('found');
      api.fx.sparkleAt(goal);
      api.sfx('success');
      api.learn('count', n, helped ? 'helped' : 'independent', { img: 'pawprints', many: 'footprints' });
      api.later(() => api.finish(helped ? 'helped' : 'independent'), 1300);
    }
  }
  return { help() { helped = true; for (let j = k; j < n; j++) api.later(() => step(j), 800 * (j - k + 1)); } };
});
