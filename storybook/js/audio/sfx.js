// Gentle sound effects and a music-box lullaby, synthesised with Web Audio.
// No sample files, so nothing to license and nothing to download.

let ctx = null;
let master = null;
let fxGain = null;
let musicGain = null;
let volumes = { effects: 0.7, music: 0.25 };
let musicOn = false;
let musicTimer = null;

export function audioContext() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    fxGain = ctx.createGain(); fxGain.gain.value = volumes.effects; fxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = volumes.music; musicGain.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setVolumes(v) {
  volumes = { ...volumes, ...v };
  if (fxGain) fxGain.gain.value = volumes.effects;
  if (musicGain) musicGain.gain.value = volumes.music;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.3, attack = 0.01, out = fxGain, glide = 0 } = {}) {
  const c = ctx;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(out); o.start(start); o.stop(start + dur + 0.05);
}

function noise(start, dur, { gain = 0.2, freq = 1200, q = 1, type = 'bandpass', sweep = 0 } = {}) {
  const c = ctx;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, start); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(gain, start + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f); f.connect(g); g.connect(fxGain); src.start(start); src.stop(start + dur);
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

const SOUNDS = {
  tap: (t) => tone(660, t, 0.12, { type: 'triangle', gain: 0.2, glide: 1.5 }),
  pop: (t) => { tone(420, t, 0.09, { type: 'sine', gain: 0.35, glide: 2.4 }); noise(t, 0.05, { gain: 0.08, freq: 3000 }); },
  chime: (t) => { [0, 4, 7].forEach((k, i) => tone(PENTA[k % 8] * (k > 7 ? 2 : 1), t + i * 0.07, 0.6, { gain: 0.14 })); },
  sparkle: (t) => { for (let i = 0; i < 6; i++) tone(PENTA[(i * 2) % 8] * 2, t + i * 0.05, 0.35, { gain: 0.08, type: 'triangle' }); },
  success: (t) => { [0, 2, 4, 7].forEach((k, i) => tone(PENTA[k] , t + i * 0.12, 0.5, { gain: 0.18, type: 'triangle' })); tone(PENTA[7] * 2, t + 0.5, 0.9, { gain: 0.12 }); },
  page: (t) => noise(t, 0.45, { gain: 0.18, freq: 800, sweep: 3, q: 0.6 }),
  whoosh: (t) => noise(t, 0.5, { gain: 0.2, freq: 400, sweep: 5, q: 0.8 }),
  rustle: (t) => { noise(t, 0.25, { gain: 0.12, freq: 2500, q: 0.5 }); noise(t + 0.15, 0.2, { gain: 0.1, freq: 3200, q: 0.5 }); },
  splash: (t) => { noise(t, 0.4, { gain: 0.25, freq: 900, sweep: 0.4, q: 0.7 }); tone(900, t, 0.15, { gain: 0.08, glide: 0.5 }); },
  plip: (t) => tone(1200, t, 0.12, { gain: 0.2, glide: 0.45 }),
  bubble: (t) => { tone(500, t, 0.1, { gain: 0.15, glide: 2 }); tone(700, t + 0.08, 0.1, { gain: 0.12, glide: 2 }); },
  boing: (t) => tone(220, t, 0.35, { type: 'sine', gain: 0.3, glide: 2.5 }),
  munch: (t) => { for (let i = 0; i < 3; i++) noise(t + i * 0.13, 0.08, { gain: 0.2, freq: 700, q: 2 }); },
  unlock: (t) => { noise(t, 0.05, { gain: 0.3, freq: 3500, q: 4 }); noise(t + 0.09, 0.05, { gain: 0.3, freq: 2500, q: 4 }); SOUNDS.chime(t + 0.2); },
  creak: (t) => tone(160, t, 0.5, { type: 'sawtooth', gain: 0.05, glide: 1.4 }),
  bell: (t) => { tone(880, t, 1.2, { gain: 0.15 }); tone(1760, t, 0.8, { gain: 0.06 }); tone(2640, t, 0.5, { gain: 0.03 }); },
  knock: (t) => { tone(180, t, 0.08, { gain: 0.4, type: 'triangle' }); tone(180, t + 0.15, 0.08, { gain: 0.4, type: 'triangle' }); },
  hoot: (t) => { tone(420, t, 0.25, { gain: 0.2, glide: 0.85 }); tone(400, t + 0.32, 0.35, { gain: 0.2, glide: 0.8 }); },
  buzz: (t) => tone(180, t, 0.5, { type: 'sawtooth', gain: 0.05, glide: 1.15 }),
  wave: (t) => noise(t, 1.0, { gain: 0.15, freq: 500, q: 0.4, sweep: 1.8 }),
  rumble: (t) => tone(70, t, 0.8, { type: 'triangle', gain: 0.35, glide: 0.8 }),
  clank: (t) => { tone(320, t, 0.15, { type: 'square', gain: 0.06 }); tone(480, t + 0.12, 0.15, { type: 'square', gain: 0.05 }); },
  crack: (t) => { noise(t, 0.06, { gain: 0.3, freq: 2000, q: 3 }); tone(900, t + 0.1, 0.2, { gain: 0.1, glide: 1.6 }); },
  gentle: (t) => tone(392, t, 0.3, { gain: 0.12, type: 'sine', glide: 0.9 }), // "not that one" - soft, never harsh
  shake: (t) => { for (let i = 0; i < 4; i++) noise(t + i * 0.08, 0.07, { gain: 0.12, freq: 2200, q: 1 }); },
  hug: (t) => { tone(330, t, 0.4, { gain: 0.15 }); tone(415, t + 0.1, 0.5, { gain: 0.12 }); },
};

/** Plays a named sound. */
export function play(name) {
  const c = audioContext();
  if (!c || volumes.effects <= 0) return;
  const fn = SOUNDS[name] || SOUNDS.tap;
  try { fn(c.currentTime + 0.01); } catch { /* ignore */ }
}

/** A rising note for each number counted, so counting has a musical shape. */
export function countNote(n) {
  const c = audioContext();
  if (!c || volumes.effects <= 0) return;
  const f = PENTA[(n - 1) % 8] * (n > 8 ? (n > 16 ? 4 : 2) : 1);
  tone(f, c.currentTime + 0.01, 0.4, { gain: 0.2, type: 'triangle' });
}

export const SOUND_NAMES = Object.keys(SOUNDS);

// ---- music box lullaby (generative, gentle, pentatonic) ----
const SCALES = {
  moon_garden: [392, 440, 523.25, 587.33, 659.25, 783.99],
  seashell_cove: [349.23, 392, 440, 523.25, 587.33, 698.46],
  cloud_kingdom: [523.25, 587.33, 659.25, 783.99, 880, 1046.5],
  whispering_woods: [293.66, 329.63, 392, 440, 493.88, 587.33],
  snowy_peaks: [440, 493.88, 554.37, 659.25, 739.99, 880],
  dino_valley: [261.63, 293.66, 329.63, 392, 440, 523.25],
  cover: [392, 440, 523.25, 587.33, 659.25, 783.99],
};

export function startMusic(key = 'cover') {
  stopMusic();
  musicOn = true;
  const c = audioContext();
  if (!c) return;
  const scale = SCALES[key] || SCALES.cover;
  let step = 0;
  const motif = [0, 2, 4, 2, 3, 1, 2, 0, 4, 5, 3, 2, 1, 2, 0, 0];
  const tick = () => {
    if (!musicOn || !ctx) return;
    const t = ctx.currentTime + 0.05;
    const k = motif[step % motif.length];
    if (step % 16 !== 15) tone(scale[k], t, 1.6, { gain: 0.12, type: 'sine', out: musicGain, attack: 0.005 });
    if (step % 4 === 0) tone(scale[0] / 2, t, 2.4, { gain: 0.07, type: 'triangle', out: musicGain, attack: 0.02 });
    step++;
    musicTimer = setTimeout(tick, 560);
  };
  tick();
}

export function stopMusic() {
  musicOn = false;
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
}
