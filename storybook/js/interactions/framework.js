// Reusable interaction framework. Every interaction is mounted into the
// picture's play layer and reports one outcome when finished:
//   'independent'  the child did it
//   'hinted'       the child did it after a gentle hint
//   'helped'       a friend modelled it (help button)
// There is no failing: a wrong tap gets a friendly response and a hint.

import { imgSrc, imgAlt } from '../content/images.js';

const registry = {};
export function register(type, mount) { registry[type] = mount; }
export function hasInteraction(type) { return !!registry[type]; }
export function interactionTypes() { return Object.keys(registry); }

/**
 * Mounts an interaction. ctx = { layer, fx, sfx, say, count, done, learn, reduced, companion }
 * Returns { help(), destroy() }.
 */
export function mountInteraction(spec, ctx) {
  const mount = registry[spec.type];
  if (!mount) { ctx.done('independent'); return { help() {}, destroy() {} }; }
  let finished = false;
  const timers = new Set();
  const cleanups = [];
  const api = {
    ...ctx,
    spec,
    later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (!finished || fn.always) fn(); }, ms); timers.add(t); return t; },
    onCleanup(fn) { cleanups.push(fn); },
    finish(outcome) {
      if (finished) return;
      finished = true;
      ctx.done(outcome);
    },
    get finished() { return finished; },
  };
  const handle = mount(api) || {};
  return {
    help() { if (!finished && handle.help) handle.help(); },
    destroy() {
      finished = true;
      for (const t of timers) clearTimeout(t);
      for (const c of cleanups) try { c(); } catch { /* */ }
      handle.destroy?.();
    },
  };
}

// ---------- helpers ----------

/** Creates a picture sprite at x%, y% (centre) of size% of the picture width. */
export function sprite(layer, key, x, y, size, cls = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `sprite ${cls}`;
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  el.style.width = `${size}%`;
  el.setAttribute('aria-label', imgAlt(key));
  const im = document.createElement('img');
  im.src = imgSrc(key);
  im.alt = '';
  im.draggable = false;
  el.appendChild(im);
  layer.appendChild(el);
  return el;
}

export function div(layer, cls, x, y, size) {
  const el = document.createElement('div');
  el.className = cls;
  if (x !== undefined) { el.style.left = `${x}%`; el.style.top = `${y}%`; }
  if (size !== undefined) el.style.width = `${size}%`;
  layer.appendChild(el);
  return el;
}

/**
 * Spreads n positions over the play area (avoiding the friends in the
 * bottom-left corner). Returns [{x,y}] in % and a sprite size in %.
 */
export function spread(n, rng = Math.random, area = { x0: 26, x1: 92, y0: 14, y1: 80 }) {
  const cols = n <= 3 ? n : n <= 6 ? 3 : n <= 8 ? 4 : n <= 12 ? 4 : 5;
  const rows = Math.ceil(n / cols);
  const size = n <= 3 ? 17 : n <= 6 ? 14 : n <= 10 ? 11.5 : n <= 15 ? 9.5 : 8.5;
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols); const c = i % cols;
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const cx = area.x0 + ((c + 0.5) / inRow) * (area.x1 - area.x0);
    const cy = area.y0 + ((r + 0.5) / rows) * (area.y1 - area.y0);
    out.push({ x: cx + (rng() - 0.5) * 3, y: cy + (rng() - 0.5) * 4 });
  }
  return { pos: out, size };
}

/** Number badge shown on a counted object. */
export function badge(el, n) {
  const b = document.createElement('span');
  b.className = 'count-badge';
  b.textContent = String(n);
  el.appendChild(b);
  return b;
}

export function centreOf(el, layer) {
  const r = el.getBoundingClientRect();
  const L = layer.getBoundingClientRect();
  return { x: ((r.left + r.width / 2 - L.left) / L.width) * 100, y: ((r.top + r.height / 2 - L.top) / L.height) * 100, px: r.left + r.width / 2, py: r.top + r.height / 2 };
}

/**
 * Makes an element draggable within the layer. onDrop(el, pointer) returns
 * true if it found a home; otherwise the element floats back. Generous: a
 * drop anywhere near a target counts (see `near`).
 */
export function draggable(el, layer, { onDrop, onMove, onStart } = {}) {
  let start = null;
  const down = (e) => {
    if (el.dataset.locked) return;
    e.preventDefault();
    el.setPointerCapture?.(e.pointerId);
    const L = layer.getBoundingClientRect();
    start = { px: e.clientX, py: e.clientY, x: parseFloat(el.style.left), y: parseFloat(el.style.top), L };
    el.classList.add('dragging');
    onStart?.(el);
  };
  const move = (e) => {
    if (!start) return;
    const dx = ((e.clientX - start.px) / start.L.width) * 100;
    const dy = ((e.clientY - start.py) / start.L.height) * 100;
    el.style.left = `${Math.max(2, Math.min(98, start.x + dx))}%`;
    el.style.top = `${Math.max(2, Math.min(98, start.y + dy))}%`;
    onMove?.(el, e);
  };
  const up = (e) => {
    if (!start) return;
    const s = start; start = null;
    el.classList.remove('dragging');
    const ok = onDrop ? onDrop(el, e) : false;
    if (!ok && !el.dataset.locked) {
      el.classList.add('return');
      el.style.left = `${s.x}%`; el.style.top = `${s.y}%`;
      setTimeout(() => el.classList.remove('return'), 350);
    }
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.style.touchAction = 'none';
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
}

/** True if two elements' centres are within `slack` (fraction of layer width). */
export function near(a, b, layer, slack = 0.16) {
  const L = layer.getBoundingClientRect();
  const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect();
  const dx = (ra.left + ra.width / 2) - (rb.left + rb.width / 2);
  const dy = (ra.top + ra.height / 2) - (rb.top + rb.height / 2);
  return Math.hypot(dx, dy) < Math.max(L.width * slack, (ra.width + rb.width) / 2);
}

/** Animates an element to a position (in %) and resolves when done. */
export function moveTo(el, x, y, ms = 500) {
  el.style.transition = `left ${ms}ms ease, top ${ms}ms ease, transform ${ms}ms ease`;
  el.style.left = `${x}%`; el.style.top = `${y}%`;
  return new Promise((r) => setTimeout(() => { el.style.transition = ''; r(); }, ms + 20));
}

export function pulse(el, cls = 'pulse') {
  el.classList.remove(cls);
  void el.offsetWidth; // restart animation
  el.classList.add(cls);
}

/** A soft glowing hint ring around an element. */
export function hint(el) { pulse(el, 'hint'); }
