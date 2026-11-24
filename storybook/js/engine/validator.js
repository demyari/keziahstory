// Narrative validation: checks content at build/test time and every state
// and page at run time, so a child can never reach a dead end, an impossible
// requirement or a contradiction.

import { WORLDS, SECRETS, ITEMS, GOAL_TYPES } from '../content/worlds.js';
import { CHARACTERS } from '../content/characters.js';
import { EVENTS } from '../content/events.js';
import { IMAGES } from '../content/images.js';
import { ALPHABET, WORD_IMG } from '../content/alphabet.js';
import { MAX_STEPS } from './generator.js';

// Words that must never appear in a story for a four-year-old.
const UNSAFE = /\b(kill|dead|die|blood|gun|knife|scary|monster|hate|stupid|ugly|shut up|hurt|cry|crying|weapon|fight|alone forever|lost forever)\b/i;
const MAX_WORDS_PER_SENTENCE = 24;

export function validateContent() {
  const errors = [];
  const img = (k, where) => { if (k && !IMAGES[k]) errors.push(`${where}: unknown image "${k}"`); };
  for (const [wid, w] of Object.entries(WORLDS)) {
    img(w.img, wid);
    for (const r of w.residents) if (!CHARACTERS[r]) errors.push(`${wid}: unknown resident ${r}`);
    if (w.residents.length < 3) errors.push(`${wid}: needs at least 3 residents`);
    for (const s of w.secrets) if (!SECRETS[s]) errors.push(`${wid}: unknown secret ${s}`);
    for (const c of [...w.countables, ...w.foods]) img(c.img, `${wid} countable`);
    for (const st of w.start) if (!w.locations[st]) errors.push(`${wid}: bad start ${st}`);
    for (const [lid, loc] of Object.entries(w.locations)) {
      img(loc.icon, `${wid}.${lid}`);
      if (loc.links.length < 2) errors.push(`${wid}.${lid}: needs at least 2 links`);
      for (const l of loc.links) {
        if (!w.locations[l]) errors.push(`${wid}.${lid}: link to missing ${l}`);
        else if (!w.locations[l].links.includes(lid)) errors.push(`${wid}.${lid}: link to ${l} is one-way`);
      }
      if (!loc.tags.length) errors.push(`${wid}.${lid}: no tags`);
    }
    // every place reachable from a start
    const seen = new Set(w.start);
    const queue = [...w.start];
    while (queue.length) { const x = queue.shift(); for (const l of w.locations[x].links) if (!seen.has(l)) { seen.add(l); queue.push(l); } }
    for (const lid of Object.keys(w.locations)) if (!seen.has(lid)) errors.push(`${wid}.${lid}: unreachable`);
    for (const gt of GOAL_TYPES) {
      const g = w.goals[gt];
      if (!g) { errors.push(`${wid}: missing goal ${gt}`); continue; }
      if (!w.locations[g.where]) errors.push(`${wid}.${gt}: goal place missing`);
      if (g.pieces.length !== 3) errors.push(`${wid}.${gt}: needs 3 pieces`);
      img(g.img, `${wid}.${gt}`); img(g.pieceImg, `${wid}.${gt}`); (g.pieceImgs || []).forEach((k) => img(k, `${wid}.${gt}`));
      for (const t of [g.problem, g.done, ...g.pieces]) checkText(t, `${wid}.${gt}`, errors);
    }
  }
  for (const [id, c] of Object.entries(CHARACTERS)) {
    img(c.img, id);
    for (const t of [...c.hello, ...c.taps, ...c.cheer, c.about]) checkText(t, id, errors);
    if (c.hello.length < 2 || c.cheer.length < 2) errors.push(`${id}: needs 2 hellos and 2 cheers`);
  }
  for (const [id, s] of Object.entries(SECRETS)) img(s.img, id);
  for (const [id, s] of Object.entries(ITEMS)) img(s.img, id);
  for (const [L, a] of Object.entries(ALPHABET)) for (const w of a.words) if (!WORD_IMG[w] || !IMAGES[WORD_IMG[w]]) errors.push(`${L}: no picture for ${w}`);
  for (const [id, ev] of Object.entries(EVENTS)) {
    if (!ev.tags?.length) errors.push(`event ${id}: no tags`);
    if (typeof ev.build !== 'function') errors.push(`event ${id}: no build`);
  }
  return errors;
}

export function checkText(t, where, errors) {
  if (typeof t !== 'string' || !t.trim()) { errors.push(`${where}: empty text`); return; }
  if (UNSAFE.test(t)) errors.push(`${where}: unsafe word in "${t}"`);
  if (/\{|\}|undefined|null|NaN/.test(t)) errors.push(`${where}: unfilled template in "${t}"`);
  for (const sentence of t.split(/(?<=[.!?])\s+/)) {
    if (sentence.split(/\s+/).length > MAX_WORDS_PER_SENTENCE) errors.push(`${where}: sentence too long for reading aloud: "${sentence}"`);
  }
}

/** Run-time invariants for a state. Returns a list of problems (empty = fine). */
export function validateState(s) {
  const errors = [];
  const w = WORLDS[s.worldId];
  if (!w) return [`unknown world ${s.worldId}`];
  if (!w.goals[s.goal]) errors.push(`unknown goal ${s.goal}`);
  if (!w.residents.includes(s.companion)) errors.push('companion does not live here');
  if (s.location && !w.locations[s.location]) errors.push(`unknown location ${s.location}`);
  if (s.pieces < 0 || s.pieces > s.needed) errors.push(`pieces out of range ${s.pieces}`);
  if (new Set(s.inventory).size !== s.inventory.length) errors.push('duplicate inventory');
  for (const i of s.inventory) if (!ITEMS[i]) errors.push(`unknown item ${i}`);
  if (s.friends.includes(s.companion)) errors.push('companion listed as a joining friend');
  for (const f of s.friends) {
    if (!CHARACTERS[f]) errors.push(`unknown friend ${f}`);
    if (s.promises.includes(f)) errors.push(`${f} both joined and waiting for a promise`);
    if (!s.met.includes(f)) errors.push(`${f} joined without being met`);
  }
  for (const sec of s.secrets) if (!w.secrets.includes(sec)) errors.push(`secret ${sec} from another world`);
  const evs = s.log.map((e) => e.ev).filter(Boolean);
  if (new Set(evs).size !== evs.length) errors.push(`repeated scene: ${evs.join(',')}`);
  if (s.step > MAX_STEPS + 2) errors.push(`story too long: ${s.step} steps`);
  if (s.phase === 'ending' && !s.ending) errors.push('ending phase without an ending');
  if ((s.phase === 'climax' || s.phase === 'ending') && s.pieces < s.needed) errors.push('reached the finale without every piece');
  if (s.food != null && !s.inventory.includes('food')) errors.push('food kind set but no food carried');
  return errors;
}

/** Checks a page: every non-ending page needs a way forward and valid text. */
export function validatePage(page, s) {
  const errors = [];
  if (page.kind !== 'ending' && (!page.choices || page.choices.length === 0)) errors.push(`dead end on ${page.kind} page`);
  const ids = page.choices.map((c) => c.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate choices');
  for (const c of page.choices) {
    if (c.img && !IMAGES[c.img]) errors.push(`choice image missing: ${c.img}`);
    if (c.id.startsWith('go:') && !WORLDS[s.worldId].locations[c.id.slice(3)]) errors.push(`choice to missing place ${c.id}`);
  }
  for (const l of [...page.lines, ...(page.after || []), ...(page.question ? [page.question] : [])]) {
    if (l.who !== 'n' && !CHARACTERS[l.who]) errors.push(`line spoken by unknown ${l.who}`);
    checkText(l.text, `${page.kind}:${page.event || ''}`, errors);
  }
  if (page.interaction) {
    const it = page.interaction;
    for (const k of ['img', 'foodImg', 'findImg', 'prizeImg', 'revealImg', 'targetImg', 'wordImg', 'eaterImg']) if (it[k] && !IMAGES[it[k]]) errors.push(`interaction image missing ${k}=${it[k]}`);
    if (it.n !== undefined && !(it.n >= 1 && it.n <= 20)) errors.push(`count out of range ${it.n}`);
    if (it.type === 'numeral_pick' && !it.options.includes(it.n)) errors.push('numeral options do not include the answer');
  }
  for (const who of page.cast || []) if (!CHARACTERS[who]) errors.push(`cast member unknown ${who}`);
  return errors;
}
