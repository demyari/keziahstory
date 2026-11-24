// Character memory, learning progression, alphabet/number coverage, save/load.
import test from 'node:test';
import assert from 'node:assert/strict';
import { startAdventure, getPage, choose } from '../js/engine/generator.js';
import { memoryLine, commitMemories, recallFor, MAX_MEMORIES_PER_FRIEND } from '../js/engine/memory.js';
import { emptyLearning, record, learnSettings, chooseLetters, letterStatus, LETTER_ORDER } from '../js/learning/progress.js';
import { ALPHABET, LETTERS, WORD_IMG } from '../js/content/alphabet.js';
import { IMAGES } from '../js/content/images.js';
import { createStore, emptyProfile, migrate } from '../js/save/store.js';
import { createSession } from '../js/session.js';
import { makeRng } from '../js/engine/rng.js';
import { playOne } from '../tools/simulate.mjs';

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

function finishStory(session, rng) {
  while (session.state.phase !== 'ending') {
    const p = session.page();
    session.choose(rng.pick(p.choices).id);
  }
}

test('a friend remembers only what really happened in a saved story', () => {
  const store = createStore(memStorage());
  const session = createSession(store);
  // First adventure: find a hidden treasure with Hoot in the Moonlight Garden.
  let found = false;
  for (let i = 0; i < 50 && !found; i++) {
    session.start({ worldId: 'moon_garden', seed: `MEM-${i}` });
    if (session.state.companion === 'hoot') found = true; else session.abandon();
  }
  assert.ok(found, 'found a seed with Hoot');
  session.findHiddenSecret('blue_butterfly', 'the Star Pond');
  finishStory(session, makeRng(1));
  const mem = recallFor(session.profile, 'hoot');
  assert.ok(mem, 'Hoot has a memory');
  const lines = session.profile.characters.hoot.memories.map(memoryLine);
  assert.ok(lines.some((l) => l.includes('blue butterfly') && l.includes('Star Pond')), lines.join(' / '));

  // Second adventure: Hoot (companion or reunion) brings it up.
  let greeted = false;
  for (let i = 0; i < 80 && !greeted; i++) {
    session.start({ worldId: 'moon_garden', seed: `MEM2-${i}` });
    const st = session.state;
    if (st.companion === 'hoot') {
      const intro = getPage(st).lines.map((l) => l.text).join(' ');
      assert.match(intro, /You're back!/);
      assert.ok(intro.includes(memoryLine(st.recall.hoot)));
      greeted = true;
    }
    session.abandon();
  }
  assert.ok(greeted);
});

test('friends with no saved memories never pretend to remember', () => {
  for (let i = 0; i < 300; i++) {
    const s = startAdventure({ seed: `NOMEM-${i}` });
    const text = getPage(s).lines.map((l) => l.text).join(' ');
    assert.ok(!/remember/i.test(text), text);
    const { pages } = playOne(`NOMEM-${i}`, i);
    for (const p of pages) assert.ok(p.event !== 'reunion');
  }
});

test('reunion events appear only for friends with saved memories, and quote them', () => {
  const recall = { flutter: { type: 'secret', secret: 'blue_butterfly', place: 'the Star Pond' } };
  let reunions = 0;
  for (let i = 0; i < 400; i++) {
    const { pages } = playOne(`RE-${i}`, i, { worldId: 'moon_garden', recall });
    for (const p of pages) {
      if (p.event === 'reunion') {
        reunions++;
        assert.equal(p.resident, 'flutter');
        assert.ok(p.lines.some((l) => l.who === 'flutter' && l.text.includes('blue butterfly')));
      }
    }
  }
  assert.ok(reunions > 10, `${reunions} reunions`);
});

test('memories are bounded per friend', () => {
  const p = emptyProfile();
  const mems = [];
  for (let i = 0; i < 20; i++) mems.push({ who: 'pip', type: 'counted', n: i % 10 + 1, things: `fish${i}` });
  commitMemories(p, mems, 1);
  assert.ok(p.characters.pip.memories.length <= MAX_MEMORIES_PER_FRIEND);
});

test('alphabet covers A to Z with pictures, upper and lower case and a sound', () => {
  assert.equal(LETTERS.length, 26);
  assert.equal(LETTER_ORDER.length, 26);
  assert.equal(new Set(LETTER_ORDER).size, 26);
  for (const L of LETTERS) {
    assert.ok(ALPHABET[L].say);
    assert.ok(ALPHABET[L].words.length >= 1);
    for (const w of ALPHABET[L].words) assert.ok(IMAGES[WORD_IMG[w]], `${L} ${w}`);
  }
});

test('over many stories every letter of the alphabet comes up', () => {
  const learning = emptyLearning();
  const met = new Set();
  for (let adv = 0; adv < 40; adv++) {
    const letters = chooseLetters(learning, `s${adv}`);
    for (const L of letters) { met.add(L); record(learning, 'letter', L, adv % 3 ? 'independent' : 'hinted'); }
  }
  assert.equal(met.size, 26, [...met].join(''));
});

test('tricky letters come back in a later story', () => {
  const learning = emptyLearning();
  record(learning, 'letter', 'S', 'helped');
  record(learning, 'letter', 'A', 'independent');
  record(learning, 'letter', 'A', 'independent');
  assert.equal(letterStatus(learning, 'S'), 'growing');
  assert.equal(letterStatus(learning, 'A'), 'familiar');
  const next = chooseLetters(learning, 'x');
  assert.ok(next.includes('S'));
});

test('counting starts at 1–5, grows to 10 then 20, and steps back gently if tricky', () => {
  const l = emptyLearning();
  let s = learnSettings(l, 'a');
  assert.ok(s.countMax <= 5);
  assert.equal(s.numerals, false);
  for (let i = 0; i < 5; i++) record(l, 'count', 5, 'independent');
  s = learnSettings(l, 'b');
  assert.equal(s.countMax, 10);
  assert.equal(s.numerals, true);
  for (let i = 0; i < 5; i++) record(l, 'count', 10, 'independent');
  assert.equal(learnSettings(l, 'c').countMax, 20);
  for (let i = 0; i < 4; i++) record(l, 'count', 12, 'helped');
  assert.equal(learnSettings(l, 'd').countMax, 10, 'stepped back');
});

test('story counts follow the child’s level', () => {
  for (const [min, max] of [[2, 5], [3, 10], [6, 20]]) {
    for (let i = 0; i < 300; i++) {
      const { pages } = playOne(`N-${min}-${i}`, i, { learn: { countMin: min, countMax: max, letters: ['B', 'D', 'Q'], numerals: max > 5 } });
      for (const p of pages) {
        const it = p.interaction;
        if (it && it.type === 'count_tap') assert.ok(it.n >= min && it.n <= max, `${it.n} not in ${min}-${max}`);
        if (it && it.type === 'numeral_pick') { assert.ok(it.options.includes(it.n)); assert.equal(it.showNumerals, max > 5); }
        if (it && (it.type === 'pop_bubbles' || it.type === 'letter_sign' || it.type === 'trace_letter')) assert.ok(['B', 'D', 'Q'].includes(it.letter));
      }
    }
  }
});

test('save and load: progress persists and a story resumes exactly', () => {
  const storage = memStorage();
  const s1 = createSession(createStore(storage));
  s1.start({ seed: 'SAVE-1', worldId: 'snowy_peaks' });
  const rng = makeRng(5);
  for (let i = 0; i < 2; i++) s1.choose(rng.pick(s1.page().choices).id);
  s1.learning('letter', 'S', 'independent', { word: 'star' });
  const before = JSON.stringify(s1.page());

  const s2 = createSession(createStore(storage));
  assert.ok(s2.hasCurrent());
  s2.resume();
  assert.equal(JSON.stringify(s2.page()), before);
  assert.deepEqual(s2.profile.letterWords.S, ['star']);
  finishStory(s2, rng);
  assert.equal(s2.profile.adventures, 1);
  assert.equal(s2.hasCurrent(), false);
  const s3 = createSession(createStore(storage));
  assert.equal(s3.profile.adventures, 1);
  assert.ok(Object.keys(s3.profile.characters).length >= 1);
});

test('a damaged save never breaks the app', () => {
  const storage = memStorage();
  storage.setItem('magical-storybook:v1', '{not json');
  const p = createStore(storage).loadProfile();
  assert.equal(p.adventures, 0);
  const fixed = migrate({ adventures: 'x', characters: [], learning: { countLevel: 2 } });
  assert.equal(fixed.adventures, 0);
  assert.deepEqual(fixed.characters, {});
  assert.equal(fixed.learning.countLevel, 2);
});

test('a broken in-progress story is dropped instead of crashing', () => {
  const storage = memStorage();
  const session = createSession(createStore(storage));
  session.start({ seed: 'BROKEN' });
  session.profile.current.choices.push('go:not_a_place');
  createStore(storage).saveProfile(session.profile);
  const again = createSession(createStore(storage));
  assert.equal(again.resume(), null);
  assert.equal(again.hasCurrent(), false);
});

test('reset clears progress', () => {
  const storage = memStorage();
  const session = createSession(createStore(storage));
  session.start({ seed: 'R' });
  finishStory(session, makeRng(3));
  session.resetProgress();
  assert.equal(session.profile.adventures, 0);
  assert.deepEqual(session.profile.characters, {});
});

test('no personal data is stored', () => {
  const storage = memStorage();
  const session = createSession(createStore(storage));
  session.start({ seed: 'PRIV' });
  finishStory(session, makeRng(2));
  const saved = storage.getItem('magical-storybook:v1');
  assert.ok(!/name"|email|birth|photo|location"|voice"/i.test(saved.replace(/"name":/g, '')), 'no personal fields');
});
