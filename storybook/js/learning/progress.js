// Gentle, local-only learning profile. Evidence is a soft estimate, never a
// score: "found it straight away", "found it after a hint", "a friend helped".
// It decides which letters and how many things to count in the next story.

import { LETTERS } from '../content/alphabet.js';
import { makeRng } from '../engine/rng.js';

// Letters are introduced in a phonics-friendly order (common sounds first).
export const LETTER_ORDER = ['S', 'A', 'T', 'I', 'P', 'N', 'C', 'K', 'E', 'H', 'R', 'M', 'D', 'G', 'O', 'U', 'L', 'F', 'B', 'J', 'Z', 'W', 'V', 'Y', 'X', 'Q'];

export const COUNT_LEVELS = [
  { level: 1, min: 1, max: 5, label: 'Counting 1 to 5' },
  { level: 2, min: 3, max: 10, label: 'Counting to 10' },
  { level: 3, min: 6, max: 20, label: 'Counting to 20' },
];
const LEVEL_UP_AFTER = 5; // confident counts at a level before moving on

export function emptyLearning() {
  return { letters: {}, numbers: {}, countLevel: 1, confidentCounts: 0, unsureCounts: 0, numeralTries: 0, numeralFirstTry: 0 };
}

function rec(map, key) {
  return map[key] || (map[key] = { seen: 0, independent: 0, hinted: 0, helped: 0, last: 0 });
}

/**
 * Records one learning moment.
 * kind: 'letter' | 'count' | 'numeral'
 * outcome: 'independent' | 'hinted' | 'helped'
 */
export function record(learning, kind, item, outcome, when = Date.now()) {
  if (kind === 'letter') {
    const r = rec(learning.letters, String(item).toUpperCase());
    r.seen++; r[outcome] = (r[outcome] || 0) + 1; r.last = when;
  } else if (kind === 'count' || kind === 'numeral') {
    const r = rec(learning.numbers, Number(item));
    r.seen++; r[outcome] = (r[outcome] || 0) + 1; r.last = when;
    if (kind === 'numeral') {
      learning.numeralTries++;
      if (outcome === 'independent') learning.numeralFirstTry++;
    }
    if (kind === 'count') {
      if (outcome === 'independent') { learning.confidentCounts++; learning.unsureCounts = Math.max(0, learning.unsureCounts - 1); }
      else learning.unsureCounts++;
      const lv = learning.countLevel;
      if (lv < 3 && learning.confidentCounts >= LEVEL_UP_AFTER && Number(item) >= COUNT_LEVELS[lv - 1].max - 1) {
        learning.countLevel++; learning.confidentCounts = 0; learning.unsureCounts = 0;
      } else if (lv > 1 && learning.unsureCounts >= 4) {
        // finding it tricky: step back gently, it will come round again
        learning.countLevel--; learning.unsureCounts = 0; learning.confidentCounts = 0;
      }
    }
  }
}

/** Letter status for the Discovery Book and parent summary. */
export function letterStatus(learning, L) {
  const r = learning.letters[L];
  if (!r || !r.seen) return 'new';
  if (r.independent >= 2 && r.independent >= r.hinted + r.helped) return 'familiar';
  return 'growing';
}

/**
 * Chooses letters for the next story: letters that need another visit come
 * back in a new context, and one or two new letters are added in order.
 */
export function chooseLetters(learning, seed) {
  const rng = makeRng(`letters|${seed}`);
  const seen = LETTER_ORDER.filter((L) => learning.letters[L]?.seen);
  const tricky = seen.filter((L) => letterStatus(learning, L) === 'growing');
  const unseen = LETTER_ORDER.filter((L) => !learning.letters[L]?.seen);
  const out = [];
  if (tricky.length) out.push(rng.pick(tricky.slice(0, 6)));
  for (const L of unseen) { if (out.length >= 3) break; if (!out.includes(L)) out.push(L); }
  const familiar = seen.filter((L) => !out.includes(L));
  while (out.length < 3 && familiar.length) out.push(familiar.splice(rng.int(0, familiar.length - 1), 1)[0]);
  while (out.length < 3) out.push(rng.pick(LETTERS.filter((L) => !out.includes(L))));
  return out;
}

/** What the next story should use, from the profile. */
export function learnSettings(learning, seed) {
  const lv = COUNT_LEVELS[(learning.countLevel || 1) - 1];
  const numerals = learning.countLevel >= 2 || learning.confidentCounts >= 3;
  return { countMin: Math.max(lv.min, 2), countMax: lv.max, letters: chooseLetters(learning, seed), numerals };
}

export function summary(learning) {
  const letters = LETTERS.map((L) => ({ L, status: letterStatus(learning, L), ...(learning.letters[L] || { seen: 0 }) }));
  const numbers = [];
  for (let i = 1; i <= 20; i++) numbers.push({ n: i, ...(learning.numbers[i] || { seen: 0 }) });
  return {
    letters, numbers,
    countLevel: COUNT_LEVELS[(learning.countLevel || 1) - 1],
    numeralFirstTry: learning.numeralFirstTry, numeralTries: learning.numeralTries,
  };
}
