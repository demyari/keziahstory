// Paints each place as a soft, layered picture-book illustration in SVG.
// All shapes are original artwork drawn in code (see docs/VISUAL_BIBLE.md).
// viewBox is 1000 x 750 (4:3). Elements with class "hot" are tappable decor.

import { makeRng } from '../engine/rng.js';

const THEMES = {
  night: { sky: ['#1d1f4e', '#3b3a7a', '#6c5a9e'], hill: ['#2d4a5e', '#3e6470', '#527d7a'], ground: '#4b7a63', accent: '#ffe9a8', mist: '#9fa8e8' },
  beach: { sky: ['#7cc8ef', '#b4e3f5', '#fdeccb'], hill: ['#62b3c9', '#4aa0bd', '#3b8fae'], ground: '#f4d9a2', accent: '#fff4c2', mist: '#ffffff' },
  sky: { sky: ['#f7b8d2', '#c7c4f2', '#a9dcf5'], hill: ['#ffffff', '#f4f0ff', '#e9f3ff'], ground: '#ffffff', accent: '#fff7b8', mist: '#ffffff' },
  forest: { sky: ['#aee0e8', '#d8efd0', '#fbefc6'], hill: ['#7fae6b', '#5f9658', '#4b8250'], ground: '#76a95c', accent: '#fff0a8', mist: '#eaf7d8' },
  snow: { sky: ['#5d7fc0', '#9bb8e4', '#dbe7f7'], hill: ['#e8f0fb', '#d7e4f6', '#c6d8f0'], ground: '#f4f8fd', accent: '#fff8d8', mist: '#ffffff' },
  jungle: { sky: ['#f6c27a', '#f9dc98', '#d8efb4'], hill: ['#6fae5b', '#58984e', '#478544'], ground: '#8fbd5a', accent: '#fff3b0', mist: '#fff6d8' },
  cave: { sky: ['#2b2340', '#3c3157', '#4f4270'], hill: ['#3d3352', '#4a3f63', '#574b72'], ground: '#5a4d6e', accent: '#c7b8ff', mist: '#8b7fc0' },
  underwater: { sky: ['#1b6c9c', '#2a8db8', '#55b8d4'], hill: ['#2b7ea0', '#3a93ad', '#4ea7b5'], ground: '#e9cf99', accent: '#cff6ff', mist: '#a8ecff' },
};

let uid = 0;

/** Returns SVG markup for a place. */
export function paintScene(worldTheme, loc, opts = {}) {
  const id = `s${++uid}`;
  let themeName = worldTheme;
  if (loc.tags.includes('underwater')) themeName = 'underwater';
  else if (loc.features.includes('cave')) themeName = 'cave';
  const t = THEMES[themeName];
  const dark = themeName === 'night' || themeName === 'cave' || (loc.tags.includes('dark') && themeName !== 'sky');
  const rng = makeRng(`${loc.name}|${worldTheme}`);
  const parts = [];
  parts.push(defs(id, t, dark));
  parts.push(`<rect width="1000" height="750" fill="url(#${id}sky)"/>`);
  if (dark || themeName === 'snow' && loc.tags.includes('dark')) parts.push(stars(rng, 40));
  if (themeName === 'underwater') parts.push(lightRays(id));
  else if (!dark && themeName !== 'cave') parts.push(sun(themeName));
  else if (themeName !== 'cave') parts.push(moon(id, opts.bigMoon || loc.features.includes('bigmoon')));
  if (themeName !== 'cave' && themeName !== 'underwater') parts.push(cloudsFar(rng, themeName, dark));
  parts.push(hills(id, t, themeName));
  for (const f of loc.features) {
    const fn = FEATURES[f];
    if (fn) parts.push(fn({ id, t, rng, dark, themeName }));
  }
  parts.push(groundFront(id, t, themeName));
  parts.push(`<rect width="1000" height="750" fill="url(#${id}vig)" pointer-events="none"/>`);
  return `<svg class="scene-svg" viewBox="0 0 1000 750" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${parts.join('')}</svg>`;
}

function defs(id, t, dark) {
  return `<defs>
  <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sky[0]}"/><stop offset=".55" stop-color="${t.sky[1]}"/><stop offset="1" stop-color="${t.sky[2]}"/></linearGradient>
  <linearGradient id="${id}h0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.hill[0]}"/><stop offset="1" stop-color="${shade(t.hill[0], -18)}"/></linearGradient>
  <linearGradient id="${id}h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.hill[1]}"/><stop offset="1" stop-color="${shade(t.hill[1], -18)}"/></linearGradient>
  <linearGradient id="${id}h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.hill[2]}"/><stop offset="1" stop-color="${shade(t.hill[2], -22)}"/></linearGradient>
  <linearGradient id="${id}gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.ground}"/><stop offset="1" stop-color="${shade(t.ground, -25)}"/></linearGradient>
  <radialGradient id="${id}vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="${dark ? '#000010' : '#4a3010'}" stop-opacity="${dark ? 0.45 : 0.22}"/></radialGradient>
  <radialGradient id="${id}glow"><stop offset="0" stop-color="#fff6c8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffe58a" stop-opacity=".5"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>
  <radialGradient id="${id}moon" cx=".4" cy=".4"><stop offset="0" stop-color="#fffdf0"/><stop offset="1" stop-color="#f3e3a8"/></radialGradient>
  <linearGradient id="${id}water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark ? '#3a4f9a' : '#5ec4e6'}"/><stop offset="1" stop-color="${dark ? '#1e2a66' : '#2f8fc4'}"/></linearGradient>
  <linearGradient id="${id}trunk" x1="0" x2="1"><stop offset="0" stop-color="#7a4e2d"/><stop offset=".6" stop-color="#a0683c"/><stop offset="1" stop-color="#6b4226"/></linearGradient>
  <linearGradient id="${id}rain" x1="0" x2="1"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".2" stop-color="#ffc178"/><stop offset=".4" stop-color="#fff08a"/><stop offset=".6" stop-color="#9be58f"/><stop offset=".8" stop-color="#8fc8ff"/><stop offset="1" stop-color="#c79bff"/></linearGradient>
  </defs>`;
}

export function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (pct / 100) * (pct < 0 ? c : 255 - c))));
  const r = f(n >> 16); const g = f((n >> 8) & 255); const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function stars(rng, k) {
  let s = '<g class="stars">';
  for (let i = 0; i < k; i++) {
    const x = rng.int(10, 990); const y = rng.int(10, 380); const r = (rng.next() * 2.2 + 0.8).toFixed(1);
    s += `<circle class="twinkle" style="animation-delay:${(rng.next() * 4).toFixed(2)}s" cx="${x}" cy="${y}" r="${r}" fill="#fffbe0"/>`;
  }
  return `${s}</g>`;
}

function sun(theme) {
  const c = theme === 'snow' ? '#fff5d0' : '#ffe07a';
  return `<g class="hot" data-fx="spin" data-sound="chime"><circle cx="830" cy="130" r="120" fill="${c}" opacity=".25"/><circle cx="830" cy="130" r="72" fill="${c}"/><circle cx="805" cy="105" r="22" fill="#fff" opacity=".45"/></g>`;
}

function moon(id, big) {
  const r = big ? 120 : 62; const cx = big ? 520 : 820; const cy = big ? 190 : 120;
  return `<g class="hot" data-fx="glow" data-sound="chime"><circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="url(#${id}glow)" opacity=".55"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}moon)"/>
  <circle cx="${cx - r * 0.3}" cy="${cy - r * 0.15}" r="${r * 0.16}" fill="#e8d590" opacity=".6"/><circle cx="${cx + r * 0.25}" cy="${cy + r * 0.3}" r="${r * 0.1}" fill="#e8d590" opacity=".6"/>
  ${big ? `<path d="M${cx - 40} ${cy + 10} q12 14 24 0 M${cx + 16} ${cy + 10} q12 14 24 0" stroke="#b89a50" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${cx - 18} ${cy + 46} q18 16 36 0" stroke="#b89a50" stroke-width="5" fill="none" stroke-linecap="round"/>` : ''}</g>`;
}

function cloudShape(x, y, s, fill, op = 1, cls = '') {
  return `<g class="${cls}" transform="translate(${x} ${y}) scale(${s})" opacity="${op}"><ellipse cx="0" cy="20" rx="90" ry="34" fill="${fill}"/><circle cx="-40" cy="8" r="38" fill="${fill}"/><circle cx="10" cy="-6" r="50" fill="${fill}"/><circle cx="55" cy="12" r="34" fill="${fill}"/></g>`;
}

function cloudsFar(rng, theme, dark) {
  const fill = dark ? '#8f8cc8' : '#ffffff';
  const op = dark ? 0.35 : theme === 'sky' ? 0.95 : 0.8;
  let s = '<g class="drift">';
  for (let i = 0; i < 3; i++) s += cloudShape(rng.int(60, 940), rng.int(70, 260), 0.5 + rng.next() * 0.5, fill, op);
  return `${s}</g>`;
}

function lightRays() {
  let s = '<g opacity=".18">';
  for (let i = 0; i < 6; i++) s += `<polygon points="${120 + i * 150},0 ${180 + i * 150},0 ${100 + i * 160},750 ${20 + i * 160},750" fill="#ffffff"/>`;
  return `${s}</g>`;
}

function hills(id, t, theme) {
  if (theme === 'underwater') {
    return `<path d="M0 560 Q200 500 420 550 T1000 530 V750 H0Z" fill="url(#${id}h1)"/><path d="M0 610 Q260 570 520 610 T1000 600 V750 H0Z" fill="url(#${id}gr)"/>`;
  }
  if (theme === 'cave') {
    return `<path d="M0 0 H1000 V180 Q860 260 760 150 Q640 60 520 170 Q400 270 300 140 Q180 40 0 200Z" fill="#241c36"/>
    <path d="M0 750 V520 Q150 470 330 520 T700 500 T1000 520 V750Z" fill="url(#${id}gr)"/>`;
  }
  if (theme === 'sky') {
    return `${cloudShape(160, 560, 2.2, '#ffffff', 0.95)}${cloudShape(820, 580, 2.4, '#fbf7ff', 0.95)}${cloudShape(500, 620, 2.8, '#ffffff', 1)}`;
  }
  return `<path d="M0 470 Q180 380 380 450 T760 420 T1000 450 V750 H0Z" fill="url(#${id}h0)" opacity=".9"/>
  <path d="M0 530 Q240 450 500 520 T1000 500 V750 H0Z" fill="url(#${id}h1)"/>`;
}

function groundFront(id, t, theme) {
  if (theme === 'sky' || theme === 'cave' || theme === 'underwater') return '';
  return `<path d="M0 640 Q250 590 520 640 T1000 625 V750 H0Z" fill="url(#${id}gr)"/>`;
}

// ---------- features ----------
function tree(x, y, s, id, leaf = '#5fa35a', leaf2 = '#7cc06a') {
  return `<g class="hot" data-fx="shake" data-sound="rustle" transform="translate(${x} ${y}) scale(${s})">
  <path d="M-14 0 Q-10 -80 -8 -140 L8 -140 Q12 -80 16 0Z" fill="url(#${id}trunk)"/>
  <circle cx="0" cy="-170" r="70" fill="${leaf}"/><circle cx="-50" cy="-140" r="50" fill="${leaf}"/><circle cx="52" cy="-135" r="52" fill="${leaf}"/>
  <circle cx="-15" cy="-195" r="38" fill="${leaf2}" opacity=".8"/><circle cx="30" cy="-160" r="26" fill="${leaf2}" opacity=".7"/></g>`;
}

function pine(x, y, s, snow) {
  return `<g class="hot" data-fx="shake" data-sound="rustle" transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="-20" width="16" height="30" fill="#7a5233"/>
  <polygon points="0,-200 -60,-90 60,-90" fill="#3f8a5f"/><polygon points="0,-150 -75,-20 75,-20" fill="#357a52"/>
  ${snow ? '<path d="M0 -200 L-26 -152 Q0 -140 26 -152Z M-40 -110 Q0 -95 40 -110 L28 -128 Q0 -118 -28 -128Z" fill="#fff"/>' : ''}</g>`;
}

const FEATURES = {
  bigtree: ({ id, dark }) => `${tree(500, 640, 1.9, id, dark ? '#3c6b62' : '#5fa35a', dark ? '#4d8274' : '#7cc06a')}`,
  trees: ({ id, rng }) => [tree(90, 600, 1.1, id), tree(910, 610, 1.2, id), tree(rng.int(200, 300), 560, 0.7, id, '#6aae62')].join(''),
  cloudtrees: ({ id }) => [tree(120, 620, 1.0, id, '#ffb6d5', '#ffd3e6'), tree(880, 620, 1.1, id, '#c8b6ff', '#e0d6ff')].join(''),
  grass: ({ rng, dark }) => {
    let s = '';
    for (let i = 0; i < 18; i++) { const x = rng.int(0, 1000); const y = rng.int(650, 740); s += `<path d="M${x} ${y} q4 -26 10 -34 M${x + 6} ${y} q2 -20 -6 -30" stroke="${dark ? '#6fa08a' : '#4f8f45'}" stroke-width="4" fill="none" stroke-linecap="round"/>`; }
    return s;
  },
  flowers: ({ rng, dark }) => {
    let s = '<g>';
    const cols = ['#ff8fb0', '#ffd166', '#c39bff', '#ff9f6e', '#8fd3ff'];
    for (let i = 0; i < 9; i++) {
      const x = rng.int(30, 970); const y = rng.int(655, 735); const c = rng.pick(cols);
      s += `<g class="hot" data-fx="bloom" data-sound="pop" transform="translate(${x} ${y})"><path d="M0 0 V-34" stroke="#4f8f45" stroke-width="4"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-48" rx="9" ry="14" fill="${c}" transform="rotate(${a} 0 -36)"/>`).join('')}<circle cx="0" cy="-36" r="7" fill="${dark ? '#fff2a8' : '#ffe066'}"/></g>`;
    }
    return `${s}</g>`;
  },
  fireflies: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 10; i++) s += `<circle class="firefly" style="animation-delay:${(rng.next() * 5).toFixed(2)}s" cx="${rng.int(80, 920)}" cy="${rng.int(300, 600)}" r="5" fill="#fff3a0"/>`;
    return `${s}</g>`;
  },
  gate: () => `<g class="hot" data-fx="wiggle" data-sound="creak"><rect x="330" y="300" width="22" height="330" rx="8" fill="#c9cfe6"/><rect x="648" y="300" width="22" height="330" rx="8" fill="#c9cfe6"/>
    <path d="M330 320 Q500 200 670 320" stroke="#dfe4f7" stroke-width="16" fill="none"/>${[380, 430, 480, 520, 570, 620].map((x) => `<rect x="${x}" y="330" width="9" height="290" fill="#b7bed9"/>`).join('')}<circle cx="500" cy="262" r="16" fill="#ffe9a8"/></g>`,
  path: () => '<path d="M430 750 Q470 680 500 640 Q520 610 560 600 L600 600 Q560 640 570 750Z" fill="#e8d3a8" opacity=".85"/>',
  lanterns: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 7; i++) {
      const x = 330 + i * 55 + rng.int(-10, 10); const y = 330 + rng.int(-60, 40);
      s += `<g class="hot" data-fx="glow" data-sound="chime"><line x1="${x}" y1="${y - 30}" x2="${x}" y2="${y - 12}" stroke="#5a3d22" stroke-width="2"/><rect x="${x - 11}" y="${y - 12}" width="22" height="28" rx="9" fill="#ffb347"/><rect x="${x - 6}" y="${y - 6}" width="12" height="16" rx="5" fill="#fff3b0" opacity=".9"/></g>`;
    }
    return `${s}</g>`;
  },
  pond: ({ id }) => `<g class="hot" data-fx="ripple" data-sound="splash"><ellipse cx="500" cy="640" rx="330" ry="70" fill="url(#${id}water)"/><ellipse cx="500" cy="628" rx="300" ry="50" fill="#ffffff" opacity=".12"/>
    <ellipse cx="420" cy="640" rx="60" ry="6" fill="#fff" opacity=".35"/><ellipse cx="610" cy="655" rx="40" ry="5" fill="#fff" opacity=".3"/></g>`,
  lilypads: () => `<g class="hot" data-fx="bob" data-sound="plip"><ellipse cx="380" cy="650" rx="38" ry="12" fill="#5fae6a"/><ellipse cx="620" cy="630" rx="30" ry="10" fill="#5fae6a"/><circle cx="625" cy="622" r="9" fill="#ff9ec3"/></g>`,
  reeds: () => `<g>${[160, 175, 190, 820, 840].map((x) => `<path d="M${x} 680 Q${x - 5} 600 ${x + 3} 540" stroke="#4f8f45" stroke-width="6" fill="none"/><ellipse cx="${x + 3}" cy="545" rx="6" ry="18" fill="#8a5a3a"/>`).join('')}</g>`,
  mushrooms: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2; const x = 500 + Math.cos(a) * 260; const y = 640 + Math.sin(a) * 50; const sc = 0.8 + rng.next() * 0.5;
      s += `<g class="hot" data-fx="bounce" data-sound="boing" transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${sc.toFixed(2)})"><rect x="-10" y="-30" width="20" height="34" rx="8" fill="#fff2e0"/><path d="M-34 -28 Q0 -76 34 -28Z" fill="#ff6f6f"/><circle cx="-12" cy="-44" r="6" fill="#fff"/><circle cx="12" cy="-40" r="5" fill="#fff"/></g>`;
    }
    return `${s}</g>`;
  },
  arch: () => `<g class="hot" data-fx="bloom" data-sound="chime"><path d="M330 640 V420 Q500 250 670 420 V640" stroke="#7a9a5a" stroke-width="26" fill="none"/>
    ${[[340, 520], [350, 440], [400, 360], [470, 325], [540, 325], [610, 360], [655, 440], [660, 520]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#ff7aa2"/><circle cx="${x}" cy="${y}" r="7" fill="#ffd0dd"/>`).join('')}</g>`,
  fountain: () => `<g class="hot" data-fx="ripple" data-sound="splash" transform="translate(820 640)"><ellipse cx="0" cy="0" rx="90" ry="22" fill="#cfd6ea"/><rect x="-14" y="-90" width="28" height="90" fill="#dfe4f2"/><ellipse cx="0" cy="-90" rx="46" ry="12" fill="#cfd6ea"/><path d="M0 -100 Q-30 -150 -44 -96 M0 -100 Q30 -150 44 -96" stroke="#a6e3ff" stroke-width="6" fill="none"/></g>`,
  tower: () => `<g class="hot" data-fx="wiggle" data-sound="hoot"><rect x="420" y="250" width="160" height="390" rx="14" fill="#b98f6a"/><polygon points="400,260 500,130 600,260" fill="#7b5fa0"/>
    <rect x="470" y="320" width="60" height="70" rx="30" fill="#ffe9a8"/><rect x="470" y="460" width="60" height="70" rx="30" fill="#ffe9a8" opacity=".8"/><path d="M560 200 L660 150" stroke="#4b4b6b" stroke-width="16" stroke-linecap="round"/></g>`,
  hills: () => '',
  bigmoon: () => '',
  sea: ({ id }) => `<g class="hot" data-fx="ripple" data-sound="wave"><path d="M0 470 Q250 450 500 470 T1000 465 V560 H0Z" fill="url(#${id}water)"/><path class="wave" d="M0 520 q40 -16 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" stroke="#ffffff" stroke-width="6" fill="none" opacity=".7"/>
    <path d="M0 560 Q300 540 600 570 T1000 560 V750 H0Z" fill="#f4d9a2"/></g>`,
  beachumbrella: () => `<g class="hot" data-fx="spin" data-sound="pop" transform="translate(760 640)"><path d="M0 0 V-170" stroke="#8a6a4a" stroke-width="7"/><path d="M-110 -160 Q0 -260 110 -160Z" fill="#ff7a7a"/><path d="M-36 -160 Q0 -250 36 -160Z" fill="#fff4e0"/></g>`,
  sandcastle: () => `<g class="hot" data-fx="bounce" data-sound="pop" transform="translate(250 660)"><rect x="-70" y="-60" width="140" height="60" fill="#e8c27a"/><rect x="-80" y="-110" width="40" height="60" fill="#e8c27a"/><rect x="40" y="-110" width="40" height="60" fill="#e8c27a"/><rect x="-25" y="-140" width="50" height="90" fill="#efcd88"/><polygon points="-25,-140 0,-170 25,-140" fill="#ff7a7a"/><rect x="-10" y="-30" width="20" height="30" rx="10" fill="#c99a52"/></g>`,
  rockpools: ({ id }) => `<g class="hot" data-fx="ripple" data-sound="plip"><ellipse cx="300" cy="650" rx="150" ry="40" fill="url(#${id}water)"/><ellipse cx="700" cy="680" rx="170" ry="40" fill="url(#${id}water)"/></g>`,
  rocks: () => `<g><ellipse cx="160" cy="640" rx="110" ry="60" fill="#8e8a9c"/><ellipse cx="140" cy="620" rx="60" ry="25" fill="#a8a4b6"/><ellipse cx="870" cy="650" rx="130" ry="70" fill="#7d7990"/><ellipse cx="850" cy="625" rx="70" ry="25" fill="#9894aa"/></g>`,
  lighthouse: () => `<g class="hot" data-fx="glow" data-sound="bell" transform="translate(500 600)"><polygon points="-70,0 -45,-330 45,-330 70,0" fill="#ffffff"/><polygon points="-62,-90 -55,-170 55,-170 62,-90" fill="#ff6b6b"/><polygon points="-51,-230 -48,-290 48,-290 51,-230" fill="#ff6b6b"/>
    <rect x="-40" y="-390" width="80" height="60" rx="10" fill="#fff3b0"/><polygon points="-55,-390 0,-450 55,-390" fill="#c0392b"/><circle cx="0" cy="-360" r="80" fill="#fff6c0" opacity=".25"/></g>`,
  underwater: () => '',
  coral: () => `<g class="hot" data-fx="wiggle" data-sound="bubble">${[[150, '#ff7aa2'], [300, '#ffb347'], [700, '#c39bff'], [850, '#ff7a7a']].map(([x, c]) => `<path d="M${x} 680 q-10 -60 -40 -90 M${x} 680 q0 -80 10 -130 M${x} 680 q20 -50 50 -80" stroke="${c}" stroke-width="18" fill="none" stroke-linecap="round"/>`).join('')}</g>`,
  bubblesfx: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 12; i++) s += `<circle class="rise" style="animation-delay:${(rng.next() * 6).toFixed(2)}s" cx="${rng.int(50, 950)}" cy="${rng.int(300, 700)}" r="${rng.int(5, 14)}" fill="none" stroke="#e0fbff" stroke-width="3"/>`;
    return `${s}</g>`;
  },
  wreck: () => `<g class="hot" data-fx="wiggle" data-sound="creak" transform="translate(520 640) rotate(-8)"><path d="M-220 -40 Q0 40 220 -40 L180 -120 H-180Z" fill="#8a5a3a"/><path d="M-200 -90 H200" stroke="#6b4226" stroke-width="8"/><rect x="-10" y="-330" width="18" height="220" fill="#6b4226"/><path d="M8 -320 Q90 -260 8 -180Z" fill="#e8dcc0" opacity=".85"/><circle cx="-100" cy="-75" r="16" fill="#3b2a1a"/><circle cx="0" cy="-70" r="16" fill="#3b2a1a"/></g>`,
  seaweed: () => `<g class="sway">${[100, 180, 860, 920].map((x) => `<path d="M${x} 720 q-30 -60 0 -120 q30 -60 0 -120" stroke="#3f9a6a" stroke-width="14" fill="none" stroke-linecap="round"/>`).join('')}</g>`,
  cave: () => `<g><path d="M0 0 H1000 V120 Q900 200 800 120 Q700 260 600 140 Q500 230 400 120 Q300 240 200 130 Q100 220 0 120Z" fill="#241c36"/>${[220, 420, 640, 820].map((x) => `<polygon points="${x - 14},125 ${x + 14},125 ${x},200" fill="#3a2f55"/>`).join('')}</g>`,
  shells: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 9; i++) { const x = rng.int(80, 920); const y = rng.int(300, 640); const c = rng.pick(['#ffd6e7', '#fff1d6', '#e6d6ff']); s += `<g class="hot" data-fx="glow" data-sound="chime" transform="translate(${x} ${y}) scale(2.4)"><path d="M-18 10 Q0 -30 18 10Z" fill="${c}"/><path d="M-10 8 L0 -16 M0 9 L0 -18 M10 8 L0 -16" stroke="#c99aa8" stroke-width="2"/></g>`; }
    return `${s}</g>`;
  },
  palms: ({ rng }) => [120, 880, rng.int(300, 340)].map((x, i) => `<g class="hot" data-fx="shake" data-sound="rustle" transform="translate(${x} ${640 - i * 10}) scale(${i === 2 ? 0.7 : 1.1})"><path d="M0 0 Q-20 -150 10 -280" stroke="#a0683c" stroke-width="22" fill="none"/>${[-60, -20, 20, 60, 100].map((a) => `<path d="M10 -280 q${a} -40 ${a * 2.2} 20" stroke="#3f9a4a" stroke-width="20" fill="none" stroke-linecap="round"/>`).join('')}<circle cx="0" cy="-268" r="12" fill="#8a5a3a"/><circle cx="20" cy="-264" r="12" fill="#8a5a3a"/></g>`).join(''),
  rainbowbridge: ({ id }) => `<g class="hot" data-fx="glow" data-sound="chime"><path d="M80 700 Q500 80 920 700" stroke="url(#${id}rain)" stroke-width="80" fill="none" opacity=".95"/></g>`,
  castle: () => `<g class="hot" data-fx="wiggle" data-sound="bell" transform="translate(500 600)"><rect x="-170" y="-200" width="340" height="200" fill="#f8f4ff"/><rect x="-220" y="-300" width="90" height="300" fill="#efe8ff"/><rect x="130" y="-300" width="90" height="300" fill="#efe8ff"/><rect x="-50" y="-360" width="100" height="200" fill="#f3eeff"/>
    <polygon points="-230,-300 -175,-390 -120,-300" fill="#ff9ec3"/><polygon points="120,-300 175,-390 230,-300" fill="#ff9ec3"/><polygon points="-60,-360 0,-460 60,-360" fill="#c39bff"/><path d="M0 -460 V-500 L40 -488 L0 -476" fill="#ffd166" stroke="#ffd166" stroke-width="3"/>
    <rect x="-35" y="-110" width="70" height="110" rx="35" fill="#c3a6ff"/><circle cx="-175" cy="-230" r="18" fill="#ffe9a8"/><circle cx="175" cy="-230" r="18" fill="#ffe9a8"/></g>`,
  balloons: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 7; i++) { const x = 120 + i * 125 + rng.int(-20, 20); const y = rng.int(260, 420); const c = rng.pick(['#ff7a7a', '#ffd166', '#7ad1ff', '#c39bff', '#8fe38f', '#ff9ec3']); s += `<g class="hot float" data-fx="bounce" data-sound="pop" style="animation-delay:${(i * 0.4).toFixed(1)}s"><path d="M${x} ${y + 40} Q${x + 10} ${y + 120} ${x} ${y + 220}" stroke="#ffffff" stroke-width="2" fill="none"/><ellipse cx="${x}" cy="${y}" rx="34" ry="42" fill="${c}"/><ellipse cx="${x - 12}" cy="${y - 14}" rx="8" ry="12" fill="#fff" opacity=".5"/></g>`; }
    return `${s}</g>`;
  },
  clouds: ({ rng }) => `<g class="hot drift" data-fx="bounce" data-sound="whoosh">${cloudShape(rng.int(100, 300), rng.int(330, 420), 0.9, '#ffffff', 0.95)}${cloudShape(rng.int(700, 900), rng.int(340, 430), 0.8, '#ffffff', 0.95)}</g>`,
  workshop: () => `<g class="hot" data-fx="wiggle" data-sound="clank" transform="translate(500 620)"><rect x="-180" y="-220" width="360" height="220" rx="30" fill="#ffffff"/><polygon points="-200,-210 0,-320 200,-210" fill="#8fc8ff"/><circle cx="-80" cy="-120" r="44" fill="#ffe9a8"/><circle cx="-80" cy="-120" r="20" fill="#ffd166"/>
    <rect x="30" y="-170" width="110" height="80" rx="16" fill="#c7e6ff"/><path d="M40 -110 l20 -30 l20 30 l20 -30 l20 30" stroke="#5aa0e6" stroke-width="5" fill="none"/><path d="M120 -320 q20 -40 50 -20 q30 -30 50 10" stroke="#ffffff" stroke-width="16" fill="none" stroke-linecap="round"/></g>`,
  starsteps: () => `<g class="hot" data-fx="glow" data-sound="chime">${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${200 + i * 110}" y="${600 - i * 70}" width="130" height="26" rx="13" fill="#fff3a0" opacity="${0.6 + i * 0.07}"/>`).join('')}</g>`,
  rainfall: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 16; i++) { const x = rng.int(150, 850); s += `<path class="fall" style="animation-delay:${(rng.next() * 2).toFixed(2)}s" d="M${x} ${rng.int(380, 500)} q-4 10 0 16 q4 -6 0 -16" fill="#8fc8ff"/>`; }
    return `${s}</g>`;
  },
  bushes: () => `<g>${[[150, 640], [420, 660], [700, 650], [900, 640]].map(([x, y]) => `<g class="hot" data-fx="shake" data-sound="rustle" transform="translate(${x} ${y})"><circle cx="-40" cy="-30" r="50" fill="#4f9a50"/><circle cx="20" cy="-50" r="60" fill="#5fae5a"/><circle cx="60" cy="-20" r="40" fill="#4f9a50"/>${[[-30, -50], [10, -70], [40, -30], [-10, -20], [30, -60]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="8" fill="#4a5bd8"/>`).join('')}</g>`).join('')}</g>`,
  stream: ({ id }) => `<g class="hot" data-fx="ripple" data-sound="splash"><path d="M0 620 Q300 560 520 640 T1000 600 V690 Q700 720 500 700 T0 700Z" fill="url(#${id}water)"/><path class="wave" d="M60 650 q30 -10 60 0 M400 670 q30 -10 60 0 M760 640 q30 -10 60 0" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/></g>`,
  steppingstones: () => `<g>${[[250, 655], [400, 665], [560, 660], [720, 650]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="44" ry="16" fill="#a8a4b6"/>`).join('')}</g>`,
  den: () => `<g class="hot" data-fx="wiggle" data-sound="rustle" transform="translate(500 640)"><path d="M-260 0 Q-240 -260 0 -280 Q240 -260 260 0Z" fill="#7a5a3a"/><path d="M-110 0 Q-100 -150 0 -160 Q100 -150 110 0Z" fill="#2b1d12"/><path d="M-260 -10 q60 -90 30 -180 M240 -20 q-40 -90 -10 -170" stroke="#5a3d22" stroke-width="18" fill="none"/></g>`,
  hive: () => `<g class="hot" data-fx="wiggle" data-sound="buzz" transform="translate(600 360)"><ellipse cx="0" cy="0" rx="46" ry="60" fill="#ffc94a"/><path d="M-44 -20 H44 M-46 10 H46 M-38 38 H38" stroke="#d99a1a" stroke-width="6"/><circle cx="0" cy="20" r="10" fill="#6b4226"/></g>`,
  cottage: () => `<g class="hot" data-fx="wiggle" data-sound="knock" transform="translate(520 640)"><rect x="-170" y="-200" width="340" height="200" fill="#f5e2c0"/><polygon points="-200,-190 0,-330 200,-190" fill="#b8573e"/><rect x="100" y="-310" width="40" height="80" fill="#8a5a3a"/>
    <rect x="-40" y="-120" width="80" height="120" rx="40" fill="#6b8f3a"/><circle cx="25" cy="-60" r="6" fill="#ffd166"/><rect x="-140" y="-150" width="60" height="60" rx="10" fill="#ffe9a8"/><rect x="80" y="-150" width="60" height="60" rx="10" fill="#ffe9a8"/>
    <circle class="smoke" cx="120" cy="-340" r="18" fill="#ffffff" opacity=".6"/></g>`,
  mountains: () => `<g><polygon points="0,480 160,230 330,480" fill="#b9c9e8"/><polygon points="250,480 470,170 690,480" fill="#a9bde2"/><polygon points="600,480 820,240 1000,480" fill="#b9c9e8"/>
    <polygon points="160,230 120,295 200,295" fill="#fff"/><polygon points="470,170 420,245 520,245" fill="#fff"/><polygon points="820,240 780,300 860,300" fill="#fff"/></g>`,
  igloo: () => `<g class="hot" data-fx="bounce" data-sound="pop" transform="translate(300 640)"><path d="M-130 0 Q-130 -150 0 -150 Q130 -150 130 0Z" fill="#f4f8fd" stroke="#c6d8f0" stroke-width="4"/><path d="M-120 -50 H120 M-95 -100 H95" stroke="#c6d8f0" stroke-width="4"/><path d="M-40 0 Q-40 -60 0 -60 Q40 -60 40 0Z" fill="#5d7fc0"/></g>`,
  houses: () => [650, 830].map((x, i) => `<g class="hot" data-fx="glow" data-sound="knock" transform="translate(${x} ${640 - i * 10})"><rect x="-70" y="-110" width="140" height="110" fill="${i ? '#e8a87c' : '#c98aa8'}"/><path d="M-90 -100 L0 -180 L90 -100Z" fill="#ffffff"/><rect x="-25" y="-80" width="50" height="40" rx="8" fill="#ffe9a8"/></g>`).join(''),
  icelake: () => `<g class="hot" data-fx="glow" data-sound="chime"><ellipse cx="500" cy="630" rx="360" ry="80" fill="#cfe8fb"/><ellipse cx="500" cy="620" rx="330" ry="60" fill="#e4f3ff"/><path d="M300 610 l60 10 M560 640 l80 -14 M440 650 l40 6" stroke="#ffffff" stroke-width="5"/></g>`,
  slide: () => `<g class="hot" data-fx="glow" data-sound="whoosh"><path d="M820 260 Q760 380 600 420 Q420 460 380 560 Q350 640 200 660" stroke="#bfe0fb" stroke-width="60" fill="none" stroke-linecap="round"/><path d="M820 260 Q760 380 600 420 Q420 460 380 560 Q350 640 200 660" stroke="#e6f4ff" stroke-width="30" fill="none" stroke-linecap="round"/></g>`,
  crystals: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 8; i++) { const x = rng.int(60, 940); const y = rng.int(600, 720); const c = rng.pick(['#8fc8ff', '#c39bff', '#7ae0e0']); const h = rng.int(110, 220); s += `<g class="hot" data-fx="glow" data-sound="chime"><polygon points="${x - 22},${y} ${x},${y - h} ${x + 22},${y}" fill="${c}" opacity=".85"/><polygon points="${x - 6},${y} ${x},${y - h} ${x + 4},${y}" fill="#fff" opacity=".5"/></g>`; }
    return `${s}</g>`;
  },
  pines: ({ rng }) => [100, 260, 760, 900, rng.int(450, 560)].map((x, i) => pine(x, 650 - (i % 2) * 20, 0.9 + (i % 3) * 0.2, true)).join(''),
  aurora: () => `<g class="aurora"><path d="M0 200 Q250 80 500 200 T1000 160 V260 Q750 160 500 280 T0 300Z" fill="#7affc4" opacity=".35"/><path d="M0 260 Q300 150 520 260 T1000 230 V300 Q760 230 520 330 T0 340Z" fill="#ff9ef0" opacity=".25"/></g>`,
  ferns: ({ rng }) => {
    let s = '<g>';
    for (let i = 0; i < 6; i++) { const x = rng.int(40, 960); const y = rng.int(640, 720); const fl = rng.chance(0.5) ? -1 : 1; s += `<g class="hot" data-fx="shake" data-sound="rustle" transform="translate(${x} ${y}) scale(${fl} 1)"><path d="M0 0 Q20 -120 90 -160" stroke="#3f8a3f" stroke-width="8" fill="none"/>${[0, 1, 2, 3, 4, 5].map((k) => `<ellipse cx="${12 + k * 13}" cy="${-30 - k * 22}" rx="22" ry="8" fill="#5fae4a" transform="rotate(-40 ${12 + k * 13} ${-30 - k * 22})"/>`).join('')}</g>`; }
    return `${s}</g>`;
  },
  nest: () => `<g class="hot" data-fx="wiggle" data-sound="crack" transform="translate(520 650)"><ellipse cx="0" cy="0" rx="200" ry="56" fill="#a0784a"/><ellipse cx="0" cy="-14" rx="170" ry="36" fill="#7a5a3a"/>${[-90, -30, 30, 90].map((x) => `<ellipse cx="${x}" cy="-40" rx="32" ry="40" fill="#fff4dc"/><circle cx="${x - 8}" cy="-50" r="5" fill="#8fd3a0"/><circle cx="${x + 10}" cy="-30" r="4" fill="#8fd3a0"/>`).join('')}</g>`,
  waterfall: ({ id }) => `<g class="hot" data-fx="ripple" data-sound="splash"><path d="M380 120 H620 V600 H380Z" fill="#8fd3ff" opacity=".85"/><path class="fallstreak" d="M420 120 V600 M500 120 V600 M580 120 V600" stroke="#ffffff" stroke-width="10" opacity=".6"/><ellipse cx="500" cy="640" rx="300" ry="60" fill="url(#${id}water)"/><path d="M300 0 H380 V620 H260Z M700 0 H620 V620 H740Z" fill="#6f8f5a"/></g>`,
  volcano: () => `<g class="hot" data-fx="wiggle" data-sound="rumble"><polygon points="220,620 430,240 570,240 780,620" fill="#8a6a5a"/><path d="M430 240 Q500 280 570 240" fill="#ff9a5a"/><path d="M450 250 Q480 330 470 380 M550 250 Q530 340 545 400" stroke="#ff9a5a" stroke-width="12" fill="none" stroke-linecap="round"/>
    <circle class="smoke" cx="500" cy="200" r="34" fill="#ffffff" opacity=".7"/><circle class="smoke" style="animation-delay:1.5s" cx="530" cy="150" r="24" fill="#ffffff" opacity=".6"/></g>`,
};

/** Small thumbnail scene for choice cards. */
export function paintThumb(worldTheme, loc) {
  return paintScene(worldTheme, loc);
}
