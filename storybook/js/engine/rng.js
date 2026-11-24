// Deterministic random numbers. The same seed always gives the same story.

/** 32-bit FNV-1a hash of any string. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for story choices. */
export function makeRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashString(String(seed))) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
    chance(p) { return next() < p; },
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    weighted(items, weightOf) {
      const ws = items.map(weightOf);
      const total = ws.reduce((s, w) => s + w, 0);
      if (total <= 0) return items[0];
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= ws[i];
        if (r < 0) return items[i];
      }
      return items[items.length - 1];
    },
  };
  return rng;
}

/** An RNG derived from a seed plus some context, so each page is reproducible on its own. */
export function rngFor(seed, ...parts) {
  return makeRng(hashString([seed, ...parts].join('|')));
}

/** Friendly seeds a grown-up can type in: e.g. "MOON-4821". */
export function newSeed(random = Math.random) {
  const words = ['MOON', 'STAR', 'SHELL', 'CLOUD', 'BERRY', 'SNOW', 'FERN', 'GLOW', 'BLOOM', 'WAVE'];
  return `${words[Math.floor(random() * words.length)]}-${1000 + Math.floor(random() * 9000)}`;
}
