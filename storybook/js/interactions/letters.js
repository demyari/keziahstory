// Letter interactions: pop letter bubbles, find a letter on a signpost and
// trace a magic letter. Upper and lower case are both shown and both count.

import { register, div, hint, pulse, sprite } from './framework.js';
import { ALPHABET, letterLine, wordFor } from '../content/alphabet.js';

function letterSay(L) {
  const a = ALPHABET[L];
  return a ? `${L}. ${L} says ${a.say}.` : L;
}

register('pop_bubbles', (api) => {
  const { spec, layer } = api;
  const T = spec.letter;
  const pool = [T, T.toLowerCase(), ...spec.others.slice(0, 3), T];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  let wrong = 0; let helped = false;
  const bubbles = shuffled.map((ch, i) => {
    const b = div(layer, 'bubble', 28 + (i % 3) * 25 + Math.random() * 6, 30 + Math.floor(i / 3) * 34, 15);
    b.textContent = ch;
    b.dataset.ch = ch;
    b.style.animationDelay = `${(i * 0.7).toFixed(1)}s`;
    b.setAttribute('role', 'button');
    b.setAttribute('aria-label', `bubble with letter ${ch}`);
    b.addEventListener('click', () => pop(b));
    return b;
  });
  const targets = () => bubbles.filter((b) => !b.dataset.popped && b.dataset.ch.toUpperCase() === T);
  function pop(b) {
    if (b.dataset.popped || api.finished) return;
    b.dataset.popped = '1';
    b.classList.add('popped');
    api.sfx('pop');
    const ch = b.dataset.ch.toUpperCase();
    if (ch === T) {
      api.fx.sparkleAt(b);
      api.sfx('chime');
      api.say(`${T}! ${letterLine(T, spec.word)}`);
      const outcome = helped ? 'helped' : wrong === 0 ? 'independent' : 'hinted';
      api.learn('letter', T, outcome, { word: spec.word });
      api.later(() => api.finish(outcome), 1500);
    } else {
      wrong++;
      api.say(`That one is ${ch}.`);
      if (wrong >= 2) targets().forEach(hint);
    }
  }
  return { help() { helped = true; const t = targets()[0]; if (t) { hint(t); api.later(() => pop(t), 1300); } } };
});

register('letter_sign', (api) => {
  const { spec, layer } = api;
  const T = spec.letter;
  const letters = [T, ...spec.options].sort(() => Math.random() - 0.5);
  let wrong = 0; let helped = false;
  const post = div(layer, 'signpost-pole', 60, 60, 3);
  post.setAttribute('aria-hidden', 'true');
  const signs = letters.map((L, i) => {
    const s = div(layer, `sign-board ${i % 2 ? 'left' : 'right'}`, i % 2 ? 50 : 70, 22 + i * 20, 24);
    const w = L === T ? { word: spec.word, img: spec.wordImg } : wordFor(L, i);
    s.innerHTML = `<span class="big">${L}</span><span class="small">${L.toLowerCase()}</span><img src="assets/img/${w.img}.webp" alt="" draggable="false">`;
    s.dataset.L = L;
    s.dataset.word = w.word;
    s.setAttribute('role', 'button');
    s.setAttribute('aria-label', `sign with letter ${L}`);
    s.addEventListener('click', () => pick(s));
    return s;
  });
  function pick(s) {
    if (api.finished) return;
    const L = s.dataset.L;
    if (L === T) {
      s.classList.add('chosen');
      api.fx.sparkleAt(s);
      api.sfx('success');
      api.say(`${T}! ${letterLine(T, spec.word)}`);
      const outcome = helped ? 'helped' : wrong === 0 ? 'independent' : 'hinted';
      api.learn('letter', T, outcome, { word: spec.word });
      api.later(() => api.finish(outcome), 1400);
    } else {
      wrong++;
      api.sfx('gentle');
      pulse(s, 'wiggle');
      api.say(`That sign says ${L}, ${L} for ${s.dataset.word}.`);
      if (wrong >= 2) hint(signs.find((x) => x.dataset.L === T));
    }
  }
  return { help() { helped = true; const s = signs.find((x) => x.dataset.L === T); hint(s); api.later(() => pick(s), 1300); } };
});

register('trace_letter', (api) => {
  const { spec, layer } = api;
  const T = spec.letter;
  const box = div(layer, 'trace-box', 60, 45, 38);
  const pic = sprite(layer, spec.wordImg, 90, 22, 11, 'word-pic');
  pic.addEventListener('click', () => api.say(letterLine(T, spec.word)));
  const cv = document.createElement('canvas');
  cv.className = 'trace-canvas';
  cv.setAttribute('aria-label', `trace the letter ${T}`);
  box.appendChild(cv);
  const S = 260;
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d');
  const font = `700 ${S * 0.78}px Andika, "Comic Sans MS", sans-serif`;
  // letter mask
  const m = document.createElement('canvas'); m.width = S; m.height = S;
  const mg = m.getContext('2d');
  mg.font = font; mg.textAlign = 'center'; mg.textBaseline = 'middle';
  mg.fillText(T, S / 2, S * 0.54);
  const mask = mg.getImageData(0, 0, S, S).data;
  const points = [];
  for (let y = 4; y < S; y += 10) for (let x = 4; x < S; x += 10) if (mask[(y * S + x) * 4 + 3] > 128) points.push({ x, y, hit: false });
  function drawBase() {
    g.clearRect(0, 0, S, S);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillText(T, S / 2, S * 0.54);
    g.setLineDash([6, 8]); g.lineWidth = 3; g.strokeStyle = '#8a6a4a';
    g.strokeText(T, S / 2, S * 0.54);
    g.setLineDash([]);
  }
  drawBase();
  let hits = 0; let done = false; let helped = false;
  function paintAt(x, y) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const grad = g.createRadialGradient(x, y, 2, x, y, 22);
    grad.addColorStop(0, '#ffe066'); grad.addColorStop(1, '#ffb347');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill();
    g.restore();
    for (const p of points) if (!p.hit && Math.hypot(p.x - x, p.y - y) < 24) { p.hit = true; hits++; }
    if (!done && hits / points.length > 0.55) complete();
  }
  function complete() {
    done = true;
    box.classList.add('traced');
    api.fx.sparkleAt(box);
    api.sfx('success');
    api.say(`${letterSay(T)} ${letterLine(T, spec.word)}`);
    const outcome = helped ? 'helped' : 'independent';
    api.learn('letter', T, outcome, { word: spec.word });
    api.later(() => api.finish(outcome), 2200);
  }
  let last = 0;
  const move = (e) => {
    if (done) return;
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * S; const y = ((e.clientY - r.top) / r.height) * S;
    paintAt(x, y);
    const now = Date.now();
    if (now - last > 180) { api.sfx('plip'); last = now; }
  };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); move(e); });
  cv.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType !== 'mouse') move(e); });
  cv.style.touchAction = 'none';
  return {
    help() {
      helped = true;
      const todo = points.filter((p) => !p.hit);
      todo.forEach((p, i) => api.later(() => { if (!done) paintAt(p.x, p.y); }, 30 * i));
    },
  };
});
