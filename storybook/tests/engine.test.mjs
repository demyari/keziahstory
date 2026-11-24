// Story engine tests: determinism, validation, continuity, consequences, endings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { startAdventure, getPage, choose, pickEvent, MAX_STEPS } from '../js/engine/generator.js';
import { validateContent, validateState, validatePage } from '../js/engine/validator.js';
import { signature } from '../js/engine/signature.js';
import { chooseEnding, ENDINGS } from '../js/content/endings.js';
import { WORLDS, WORLD_IDS, GOAL_TYPES } from '../js/content/worlds.js';
import { EVENTS } from '../js/content/events.js';
import { makeRng } from '../js/engine/rng.js';
import { playOne, simulate } from '../tools/simulate.mjs';

function playWith(seed, picks, opts = {}) {
  let s = startAdventure({ seed, ...opts });
  const pages = [];
  let i = 0;
  while (s.phase !== 'ending' && i < 40) {
    const p = getPage(s);
    pages.push(p);
    s = choose(s, p.choices[picks(i, p) % p.choices.length].id);
    i++;
  }
  pages.push(getPage(s));
  return { s, pages };
}

test('content passes validation (ids, links, pictures, safe readable text)', () => {
  assert.deepEqual(validateContent(), []);
});

test('the same seed and choices reproduce the same adventure exactly', () => {
  for (const seed of ['MOON-1', 'STAR-42', 'x', 'SNOW-9999']) {
    const a = playWith(seed, (i) => i * 7 + 1);
    const b = playWith(seed, (i) => i * 7 + 1);
    assert.equal(signature(a.s), signature(b.s));
    assert.deepEqual(a.pages.map((p) => p.lines), b.pages.map((p) => p.lines));
  }
});

test('different seeds give different adventures', () => {
  const sigs = new Set();
  for (let i = 0; i < 200; i++) sigs.add(signature(playWith(`D-${i}`, () => 0).s));
  assert.ok(sigs.size > 190, `only ${sigs.size} distinct`);
});

test('choosing a world is respected, and every world/goal combination is reachable', () => {
  const seen = new Set();
  for (const w of WORLD_IDS) {
    for (let i = 0; i < 60; i++) {
      const s = startAdventure({ seed: `W-${i}`, worldId: w });
      assert.equal(s.worldId, w);
      seen.add(`${w}:${s.goal}`);
    }
  }
  assert.equal(seen.size, WORLD_IDS.length * GOAL_TYPES.length);
});

test('no dead ends, contradictions or overlong stories across 5000 random playthroughs', () => {
  for (let i = 0; i < 5000; i++) {
    const { s, errors } = playOne(`V-${i}`, i);
    assert.deepEqual(errors, [], `seed V-${i}`);
    assert.equal(s.phase, 'ending');
    assert.ok(s.step <= MAX_STEPS + 2);
  }
});

test('every story reaches its finale with all three pieces, never before', () => {
  for (let i = 0; i < 1000; i++) {
    let s = startAdventure({ seed: `P-${i}` });
    const rng = makeRng(i);
    while (s.phase !== 'ending') {
      const p = getPage(s);
      if (p.kind === 'climax') assert.equal(s.pieces, s.needed);
      if (p.kind !== 'scene' && s.pieces < s.needed) assert.ok(!p.choices.some((c) => c.id.startsWith('climax:')));
      s = choose(s, rng.pick(p.choices).id);
      if (s.phase === 'climax') assert.equal(s.pieces, s.needed);
    }
  }
});

test('choices have consequences: sharing food makes a friend join, a promise is kept at the end', () => {
  let shareSeen = 0; let promiseSeen = 0;
  for (let i = 0; i < 4000 && (shareSeen < 5 || promiseSeen < 5); i++) {
    let s = startAdventure({ seed: `C-${i}` });
    const rng = makeRng(i + 99);
    while (s.phase !== 'ending') {
      const p = getPage(s);
      const share = p.choices.find((c) => c.id === 'opt:share');
      const promise = p.choices.find((c) => c.id === 'opt:promise');
      if (share) {
        const res = p.resident;
        const next = choose(s, share.id);
        assert.ok(next.friends.includes(res), 'friend joins after sharing');
        assert.ok(!next.inventory.includes('food'), 'food is used up');
        assert.ok(next.flags.kind);
        shareSeen++;
        s = next; continue;
      }
      if (promise) {
        const res = p.resident;
        s = choose(s, promise.id);
        assert.ok(s.promises.includes(res));
        promiseSeen++;
        continue;
      }
      s = choose(s, rng.pick(p.choices).id);
      if (s.phase === 'ending' && s.promises.length) assert.equal(s.ending, 'promise_kept');
    }
  }
  assert.ok(shareSeen >= 5 && promiseSeen >= 5, `share ${shareSeen} promise ${promiseSeen}`);
});

test('the key found in a tree is what opens a locked chest', () => {
  let opened = 0;
  for (let i = 0; i < 6000 && opened < 5; i++) {
    let s = startAdventure({ seed: `K-${i}` });
    const rng = makeRng(i);
    while (s.phase !== 'ending') {
      const p = getPage(s);
      if (p.event === 'locked_chest') {
        assert.ok(s.inventory.includes('key'), 'chest only appears with a key');
        const next = choose(s, p.choices[0].id);
        assert.ok(!next.inventory.includes('key'), 'key is used');
        opened++;
      }
      s = choose(s, rng.pick(p.choices).id);
    }
  }
  assert.ok(opened >= 5);
});

test('endings always match the story state', () => {
  for (let i = 0; i < 3000; i++) {
    const { s } = playOne(`E-${i}`, i);
    const expected = chooseEnding(s).id;
    assert.equal(s.ending, expected);
    if (s.ending === 'grand_parade') assert.ok(s.friends.length >= 2);
    if (s.ending === 'treasure_hunter') assert.ok(s.secrets.length >= 1);
    if (s.ending === 'clever_explorer') assert.ok(s.flags.clever);
  }
});

test('every ending and every event is reachable', () => {
  const r = simulate(20000);
  for (const e of ENDINGS) assert.ok(r.stats.endings[e.id] > 0, `ending ${e.id} never reached`);
  for (const id of Object.keys(EVENTS)) {
    if (id === 'reunion' || EVENTS[id].fallback) continue; // reunion needs memories (memory tests); fallback tested by the pacing test
    assert.ok(r.stats.events[id] > 0, `event ${id} never happened`);
  }
});

test('no scene repeats within one adventure', () => {
  for (let i = 0; i < 2000; i++) {
    const { s } = playOne(`R-${i}`, i);
    const evs = s.log.map((e) => e.ev).filter(Boolean);
    assert.equal(new Set(evs).size, evs.length);
  }
});

test('invalid choices are refused', () => {
  const s = startAdventure({ seed: 'BAD' });
  assert.throws(() => choose(s, 'go:nowhere'));
});

test('validator catches contradictions', () => {
  const s = startAdventure({ seed: 'X' });
  s.friends.push(s.companion);
  s.inventory.push('key', 'key');
  s.pieces = 9;
  const errs = validateState(s);
  assert.ok(errs.some((e) => e.includes('companion')));
  assert.ok(errs.some((e) => e.includes('duplicate')));
  assert.ok(errs.some((e) => e.includes('pieces')));
  const page = getPage(startAdventure({ seed: 'Y' }));
  page.choices = [];
  assert.ok(validatePage(page, startAdventure({ seed: 'Y' })).some((e) => e.includes('dead end')));
});

test('pacing: a long story is always rescued by friends before it drags on', () => {
  const s = startAdventure({ seed: 'LONG' });
  s.phase = 'scene'; s.location = WORLDS[s.worldId].start[0]; s.step = MAX_STEPS + 1;
  assert.equal(pickEvent(s), 'friends_help');
});
