// Connects the story engine to the saved profile: starts and resumes
// adventures, records discoveries as they happen, and commits friends'
// memories when an adventure ends. Saving stores only the starting options
// and the choices, so a story is rebuilt exactly by replaying them.

import { startAdventure, getPage, choose } from './engine/generator.js';
import { validateState } from './engine/validator.js';
import { commitMemories, recallFor } from './engine/memory.js';
import { learnSettings, record } from './learning/progress.js';
import { newSeed } from './engine/rng.js';
import { WORLDS, SECRETS } from './content/worlds.js';
import { CHARACTERS } from './content/characters.js';
import { WORD_IMG } from './content/alphabet.js';

export function createSession(store) {
  let profile = store.loadProfile();
  let state = null;
  let extraMemories = [];
  const save = () => store.saveProfile(profile);

  function recallSnapshot() {
    const out = {};
    for (const id of Object.keys(CHARACTERS)) {
      const m = recallFor(profile, id);
      if (m) out[id] = m;
    }
    return out;
  }

  function replay(cur) {
    let s = startAdventure(cur.start);
    for (const c of cur.choices) s = choose(s, c);
    return s;
  }

  function discover(kind, id, extra = {}) {
    profile.newDiscoveries.push({ kind, id, ...extra });
    if (profile.newDiscoveries.length > 40) profile.newDiscoveries.splice(0, profile.newDiscoveries.length - 40);
  }

  /** Records what a state change revealed: places, friends, treasures. */
  function noteState(s, prev) {
    const w = (profile.worlds[s.worldId] ||= { visits: 0, places: {}, goals: {}, endings: {} });
    if (s.location && !w.places[s.location]) { w.places[s.location] = true; }
    for (const id of s.met) {
      const rec = (profile.characters[id] ||= { met: false, times: 0, memories: [] });
      if (!rec.met) { rec.met = true; rec.firstWorld = s.worldId; discover('friend', id); }
      if (!prev || !prev.met.includes(id)) rec.times = (rec.times || 0) + 1;
    }
    for (const sec of s.secrets) {
      if (!profile.secrets[sec]) { profile.secrets[sec] = { world: s.worldId, adv: profile.adventures + 1 }; discover('secret', sec); }
    }
    if (s.keepsake && !profile.keepsakes[s.keepsake]) { profile.keepsakes[s.keepsake] = true; discover('keepsake', s.keepsake); }
  }

  return {
    get profile() { return profile; },
    get state() { return state; },
    hasCurrent() { return !!profile.current; },
    page() { return state ? getPage(state) : null; },

    start({ worldId, seed } = {}) {
      const start = {
        seed: seed || newSeed(),
        worldId,
        learn: learnSettings(profile.learning, seed || String(profile.adventures)),
        recall: recallSnapshot(),
        foundSecrets: Object.keys(profile.secrets),
      };
      state = startAdventure(start);
      extraMemories = [];
      profile.current = { start, choices: [], extraMemories: [] };
      const w = (profile.worlds[state.worldId] ||= { visits: 0, places: {}, goals: {}, endings: {} });
      w.visits++;
      noteState(state, null);
      save();
      return state;
    },

    resume() {
      if (!profile.current) return null;
      try {
        state = replay(profile.current);
        extraMemories = profile.current.extraMemories || [];
        if (validateState(state).length) throw new Error('invalid');
      } catch {
        profile.current = null; state = null; save();
        return null;
      }
      return state;
    },

    choose(choiceId) {
      const prev = state;
      state = choose(state, choiceId);
      profile.current.choices.push(choiceId);
      noteState(state, prev);
      if (state.phase === 'ending') this.finish();
      save();
      return state;
    },

    /** A hidden treasure tapped in a picture (optional exploring). */
    findHiddenSecret(secretId, placeName) {
      if (!SECRETS[secretId]) return false;
      const isNew = !profile.secrets[secretId];
      if (isNew) { profile.secrets[secretId] = { world: state.worldId, adv: profile.adventures + 1 }; discover('secret', secretId); }
      const mem = { who: state.companion, type: 'secret', secret: secretId, place: placeName };
      extraMemories.push(mem);
      if (profile.current) profile.current.extraMemories = extraMemories;
      save();
      return isNew;
    },

    learning(kind, item, outcome, extra = {}) {
      record(profile.learning, kind, item, outcome);
      if (kind === 'letter') {
        const L = String(item).toUpperCase();
        const words = (profile.letterWords[L] ||= []);
        if (extra.word && !words.includes(extra.word) && WORD_IMG[extra.word]) words.push(extra.word);
        if (words.length === 1 && extra.word) discover('letter', L);
      }
      if (kind === 'count' || kind === 'numeral') {
        const key = String(item);
        const list = (profile.countedThings[key] ||= []);
        const isNew = list.length === 0;
        if (extra.img && !list.some((x) => x.img === extra.img)) list.push({ img: extra.img, many: extra.many || '' });
        if (list.length > 4) list.shift();
        if (isNew) discover('number', Number(item));
      }
      save();
    },

    finish() {
      const s = state;
      profile.adventures++;
      const w = profile.worlds[s.worldId];
      w.goals[s.goal] = true;
      w.endings[s.ending] = true;
      profile.endings[s.ending] = (profile.endings[s.ending] || 0) + 1;
      commitMemories(profile, [...s.newMemories, ...extraMemories], profile.adventures);
      profile.current = null;
      discover('ending', s.ending);
    },

    takeDiscoveries() {
      const d = profile.newDiscoveries.slice();
      profile.newDiscoveries = [];
      save();
      return d;
    },

    abandon() { profile.current = null; state = null; save(); },

    resetProgress() { store.reset(); profile = store.loadProfile(); state = null; },

    worldsUnlocked() { return Object.keys(WORLDS); },
  };
}
