// Magical effects: sparkles, confetti and discoveries flying into the book.

let reduced = false;
export function setReducedMotion(v) { reduced = !!v; }
export function isReduced() { return reduced; }

const SPARK_COLOURS = ['#fff3a0', '#ffd166', '#ff9ec3', '#9fe7ff', '#c8b6ff', '#ffffff'];

/** Sparkles at a point (page coordinates). */
export function sparkle(x, y, count = 10) {
  const host = document.getElementById('fx') || document.body;
  const n = reduced ? Math.min(4, count) : count;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const a = (i / n) * Math.PI * 2 + Math.random();
    const d = reduced ? 20 : 30 + Math.random() * 50;
    s.style.left = `${x}px`; s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
    s.style.setProperty('--c', SPARK_COLOURS[i % SPARK_COLOURS.length]);
    s.style.animationDuration = `${0.6 + Math.random() * 0.4}s`;
    host.appendChild(s);
    setTimeout(() => s.remove(), 1100);
  }
}

export function sparkleAt(el, count) {
  const r = el.getBoundingClientRect();
  sparkle(r.left + r.width / 2, r.top + r.height / 2, count);
}

export function confetti(count = 40) {
  if (reduced) return;
  const host = document.getElementById('fx') || document.body;
  const W = window.innerWidth;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.style.left = `${Math.random() * W}px`;
    s.style.setProperty('--c', SPARK_COLOURS[i % SPARK_COLOURS.length]);
    s.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    s.style.animationDelay = `${Math.random() * 0.4}s`;
    s.style.animationDuration = `${1.6 + Math.random()}s`;
    host.appendChild(s);
    setTimeout(() => s.remove(), 3200);
  }
}

/** An image flies from an element (or the screen centre) into the Discovery Book button. */
export function flyToBook(imgUrl, fromEl) {
  return new Promise((resolve) => {
    const book = document.querySelector('[data-book-button]');
    const host = document.getElementById('fx') || document.body;
    if (!book) { resolve(); return; }
    const from = fromEl ? fromEl.getBoundingClientRect() : { left: window.innerWidth / 2 - 40, top: window.innerHeight / 2 - 40, width: 80, height: 80 };
    const to = book.getBoundingClientRect();
    const im = document.createElement('img');
    im.src = imgUrl; im.alt = ''; im.className = 'flyer';
    const size = Math.min(110, Math.max(56, from.width));
    im.style.width = `${size}px`;
    im.style.left = `${from.left + from.width / 2 - size / 2}px`;
    im.style.top = `${from.top + from.height / 2 - size / 2}px`;
    host.appendChild(im);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const dur = reduced ? 300 : 1100;
    const anim = im.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 80}px) scale(1.25)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${dx}px, ${dy}px) scale(.25)`, opacity: 0.2 },
    ], { duration: dur, easing: 'cubic-bezier(.5,0,.5,1)' });
    anim.onfinish = () => {
      im.remove();
      book.classList.remove('gulp'); void book.offsetWidth; book.classList.add('gulp');
      sparkleAt(book, 8);
      resolve();
    };
  });
}
