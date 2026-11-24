// The book frame: chooses single-page or two-page layout for the screen and
// turns pages with a paper-like animation (or a soft fade for reduced motion).

import { isReduced } from './fx.js';
import * as sfx from '../audio/sfx.js';

export function layoutMode() {
  const w = window.innerWidth; const h = window.innerHeight;
  // Two-page spread when there is room for two readable pages side by side.
  if (w >= 700 && w / h >= 1.15) return 'spread';
  if (w >= 560 && h < 520 && w / h > 1.3) return 'spread'; // phones held sideways
  return 'single';
}

export function applyLayout(bookEl) {
  const m = layoutMode();
  bookEl.dataset.layout = m;
  document.documentElement.dataset.layout = m;
  return m;
}

let current = null;

/** Replaces the current view with `view` ({root, start(), destroy()}), turning the page. */
export function turnTo(host, view, { direction = 1, sound = true } = {}) {
  const old = current;
  current = view;
  if (old?.destroy) try { old.destroy(); } catch { /* */ }
  const oldRoot = host.querySelector(':scope > .view:not(.leaving)');
  const wrap = document.createElement('div');
  wrap.className = 'view entering';
  wrap.append(view.root);
  host.append(wrap);
  if (sound) sfx.play('page');
  const reduced = isReduced();
  if (oldRoot) {
    oldRoot.classList.add('leaving', reduced ? 'fade-out' : direction > 0 ? 'turn-forward' : 'turn-back');
    setTimeout(() => oldRoot.remove(), reduced ? 300 : 750);
  }
  requestAnimationFrame(() => wrap.classList.remove('entering'));
  view.start?.();
  return view;
}

export function currentView() { return current; }
