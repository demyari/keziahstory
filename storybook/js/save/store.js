// Save and load. Everything stays on this device in localStorage. No names,
// photos, voice, location or accounts are ever stored.

import { emptyLearning } from '../learning/progress.js';

const KEY = 'magical-storybook:v1';
const SETTINGS_KEY = 'magical-storybook:settings:v1';
export const SAVE_VERSION = 1;

export function emptyProfile() {
  return {
    v: SAVE_VERSION,
    adventures: 0,
    characters: {}, // id -> { met, times, memories: [] }
    secrets: {}, // id -> { world, adv }
    worlds: {}, // id -> { visits, places: {}, goals: {}, endings: {} }
    endings: {}, // ending id -> count
    keepsakes: {},
    letterWords: {}, // letter -> [words met]
    countedThings: {}, // number -> [{img, many}]
    learning: emptyLearning(),
    current: null, // an adventure in progress: { start options, choices }
    newDiscoveries: [],
  };
}

export const DEFAULT_SETTINGS = {
  narration: true, autoRead: true, speed: 0.9, narrationVolume: 1, effectsVolume: 0.7, musicVolume: 0.25,
  music: true, reducedMotion: null, voice: '', useClips: true, textSize: 1, highContrast: false,
};

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

export function createStore(storage) {
  let st = storage;
  try {
    if (!st) st = globalThis.localStorage;
    st.setItem('__t', '1'); st.removeItem('__t');
  } catch { st = memoryStorage(); }

  function read(key, fallback) {
    try {
      const raw = st.getItem(key);
      if (!raw) return fallback();
      return JSON.parse(raw);
    } catch { return fallback(); }
  }

  return {
    loadProfile() {
      const p = read(KEY, emptyProfile);
      return migrate(p);
    },
    saveProfile(p) {
      try { st.setItem(KEY, JSON.stringify(p)); return true; } catch { return false; }
    },
    loadSettings() { return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, () => ({})) }; },
    saveSettings(s) { try { st.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* full */ } },
    reset() { st.removeItem(KEY); },
    resetAll() { st.removeItem(KEY); st.removeItem(SETTINGS_KEY); },
    sizeBytes() {
      try { return (st.getItem(KEY) || '').length + (st.getItem(SETTINGS_KEY) || '').length; } catch { return 0; }
    },
    exportJson() { return st.getItem(KEY) || JSON.stringify(emptyProfile()); },
  };
}

/** Repairs or upgrades a loaded profile so a damaged save never breaks the app. */
export function migrate(p) {
  const base = emptyProfile();
  if (!p || typeof p !== 'object') return base;
  const out = { ...base, ...p };
  for (const k of ['characters', 'secrets', 'worlds', 'endings', 'keepsakes', 'letterWords', 'countedThings']) {
    if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {};
  }
  out.learning = { ...emptyLearning(), ...(p.learning || {}) };
  if (!Array.isArray(out.newDiscoveries)) out.newDiscoveries = [];
  if (typeof out.adventures !== 'number') out.adventures = 0;
  out.v = SAVE_VERSION;
  return out;
}
