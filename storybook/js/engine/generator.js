// The story engine. A story is a pure state machine:
//   startAdventure(options) -> state
//   getPage(state)          -> what to show (lines, interaction, choices)
//   choose(state, choiceId) -> the next state
// Everything is derived from the seed, the starting snapshot of the child's
// profile (learning level and friends' memories) and the choices made, so the
// same seed and choices always reproduce the same adventure.

import { WORLDS, WORLD_IDS, GOAL_TYPES, SECRETS, ITEMS } from '../content/worlds.js';
import { CHARACTERS } from '../content/characters.js';
import { EVENTS } from '../content/events.js';
import { chooseEnding, ENDINGS } from '../content/endings.js';
import { LETTERS, wordFor } from '../content/alphabet.js';
import { rngFor } from './rng.js';
import { memoryLine } from './memory.js';
import { numberWord } from '../content/numbers.js';

export const MAX_STEPS = 7;
export const PIECES_NEEDED = 3;
const RIDEABLE = ['unicorn', 'bear', 'dinosaur', 'whale', 'dragon', 'turtle'];
const SHAPES = ['circle', 'star', 'heart', 'moon', 'square', 'triangle'];

const n = (text) => ({ who: 'n', text });
const say = (who, text) => ({ who, text });

export const DEFAULT_LEARN = { countMin: 2, countMax: 5, letters: ['S', 'A', 'T'], numerals: false };

/**
 * options: { seed, worldId?, learn?, recall?: {charId: memory}, foundSecrets?: [] }
 */
export function startAdventure(options) {
  const seed = String(options.seed);
  const rng = rngFor(seed, 'start');
  const worldId = options.worldId && WORLDS[options.worldId] ? options.worldId : rng.pick(WORLD_IDS);
  const rng2 = rngFor(seed, 'start', worldId);
  const w = WORLDS[worldId];
  const goal = rng2.pick(GOAL_TYPES);
  const companion = rng2.pick(w.residents);
  return {
    v: 1,
    seed, worldId, goal, companion,
    phase: 'intro', step: 0, location: null,
    visited: [], pieces: 0, needed: PIECES_NEEDED,
    inventory: [], food: null, friends: [], met: [companion], promises: [], secrets: [], keepsake: null,
    flags: {}, log: [], letterIdx: 0, letters: [], counted: [], numbers: [],
    pending: null, travelMode: null, ending: null, newMemories: [],
    learn: { ...DEFAULT_LEARN, ...(options.learn || {}) },
    recall: options.recall || {},
    foundSecrets: options.foundSecrets || [],
  };
}

function clone(s) { return JSON.parse(JSON.stringify(s)); }
const world = (s) => WORLDS[s.worldId];
const goalOf = (s) => world(s).goals[s.goal];
const usedEvents = (s) => s.log.map((e) => e.ev).filter(Boolean);

export function goalTitle(s) {
  const g = goalOf(s);
  const t = g.thing.replace(/^(the|a|an) /i, '');
  const cap = (x) => x.replace(/\b\w/g, (m) => m.toUpperCase());
  switch (s.goal) {
    case 'wake': return `${CHARACTERS[s.companion].name} and the Sleepy ${cap(t)}`;
    case 'lost': return `${CHARACTERS[s.companion].name} and the Lost ${cap(t)}`;
    case 'party': return `${CHARACTERS[s.companion].name} and the ${cap(t)}`;
    case 'home': return `${CHARACTERS[s.companion].name} and ${cap(t.replace(/^.* called /, ''))}'s Way Home`;
    case 'fix': return `${CHARACTERS[s.companion].name} Fixes ${cap(t)}`;
    default: return world(s).title;
  }
}

function pieceInfo(s) {
  const g = goalOf(s);
  if (s.pieces >= s.needed) return { piece: null, pieceImg: null };
  const i = s.pieces;
  return { piece: g.pieces[i], pieceImg: g.pieceImgs ? g.pieceImgs[i] : g.pieceImg };
}

function pickResident(s, rng) {
  const w = world(s);
  const pool = w.residents.filter((id) => id !== s.companion && !s.friends.includes(id) && !s.promises.includes(id));
  return pool.length ? rng.pick(pool) : null;
}

function reunionCandidate(s) {
  const w = world(s);
  return w.residents.find((id) => id !== s.companion && !s.friends.includes(id) && !s.promises.includes(id)
    && s.recall[id] && memoryLine(s.recall[id])) || null;
}

function pickSecret(s, rng) {
  const w = world(s);
  const left = w.secrets.filter((id) => !s.secrets.includes(id));
  if (!left.length) return null;
  const fresh = left.filter((id) => !s.foundSecrets.includes(id));
  return rng.pick(fresh.length ? fresh : left);
}

function countRange(s, rng) {
  return rng.int(s.learn.countMin, s.learn.countMax);
}

/** Everything an event needs to write itself. Deterministic for a given state. */
function makeContext(s, evId) {
  const rng = rngFor(s.seed, 'ctx', s.step, s.location, evId || '');
  const w = world(s);
  const loc = w.locations[s.location];
  const comp = CHARACTERS[s.companion];
  const foodIdx = s.food != null ? s.food : rng.int(0, w.foods.length - 1);
  const letter = s.learn.letters[s.letterIdx % s.learn.letters.length];
  const wd = wordFor(letter, rng.int(0, 7));
  const others = rng.shuffle(LETTERS.filter((L) => L !== letter)).slice(0, 4);
  const N = countRange(s, rng);
  const want = Math.min(N, 10);
  const opts = new Set([want]);
  while (opts.size < 3) {
    const d = rng.pick([-2, -1, 1, 2, 3]);
    const v = want + d;
    if (v >= 1 && v <= 10) opts.add(v);
  }
  const res = evId === 'reunion' ? reunionCandidate(s) : pickResident(s, rngFor(s.seed, 'res', s.step, s.location));
  return {
    s, w, loc, locId: s.location, comp, compId: s.companion, rng,
    ...pieceInfo(s),
    res, N, thing: rng.pick(w.countables), food: w.foods[foodIdx], foodIdx,
    letter, word: wd.word, wordImg: wd.img, otherLetters: others,
    basketOptions: rng.shuffle([...opts]), shapes: rng.shuffle(SHAPES).slice(0, 3),
    secret: pickSecret(s, rngFor(s.seed, 'secret', s.step)),
    goalThing: goalOf(s).thing,
    memoryLine: res && s.recall[res] ? memoryLine(s.recall[res]) : null,
  };
}

/** Which events could happen here, right now. */
export function eligibleEvents(s) {
  const loc = world(s).locations[s.location];
  const used = usedEvents(s);
  const { piece } = pieceInfo(s);
  const resident = pickResident(s, rngFor(s.seed, 'res', s.step, s.location));
  const secretLeft = world(s).secrets.some((id) => !s.secrets.includes(id));
  return Object.entries(EVENTS).filter(([id, ev]) => {
    if (ev.fallback || used.includes(id)) return false;
    if (!(ev.tags.includes('*') || ev.tags.some((t) => loc.tags.includes(t)))) return false;
    if (ev.needsResident && !resident) return false;
    if (ev.needsItem && !s.inventory.includes(ev.needsItem)) return false;
    if (ev.avoidItem && s.inventory.includes(ev.avoidItem)) return false;
    if (ev.needsPiece && !piece) return false;
    if (ev.needsReunion && !reunionCandidate(s)) return false;
    if ((ev.kind === 'piece' && !piece && !secretLeft) || (ev.kind === 'secret' && !secretLeft)) return false;
    if (id === 'share_food' && !secretLeft) return false;
    return true;
  }).map(([id]) => id);
}

/** Chooses the event for the current scene, keeping the story well paced. */
export function pickEvent(s) {
  if (s.step > MAX_STEPS) return 'friends_help';
  const remaining = s.needed - s.pieces;
  const stepsLeft = MAX_STEPS - s.step + 1;
  let ids = eligibleEvents(s);
  if (remaining > 0 && remaining >= stepsLeft) {
    ids = ids.filter((id) => EVENTS[id].kind === 'piece');
    if (!ids.length) return 'friends_help';
  }
  if (!ids.length) return remaining > 0 ? 'friends_help' : null;
  const rng = rngFor(s.seed, 'event', s.step, s.location, s.log.length);
  return rng.weighted(ids, (id) => {
    const ev = EVENTS[id];
    let wgt = ev.weight;
    if (ev.kind === 'piece' && remaining > 0) wgt *= 1.4;
    if (remaining === 0 && ev.kind === 'piece') wgt *= 0.5;
    return wgt;
  });
}

function buildEvent(s, evId) {
  const ctx = makeContext(s, evId);
  return { ctx, built: EVENTS[evId].build(ctx) };
}

/** Applies a list of effects. `ctx` gives context such as which food was found. */
function applyEffects(s, effects, ctx) {
  for (const e of effects || []) {
    if (e.piece) s.pieces = Math.min(s.needed, s.pieces + e.piece);
    if (e.secret && !s.secrets.includes(e.secret)) s.secrets.push(e.secret);
    if (e.item) {
      if (!s.inventory.includes(e.item)) s.inventory.push(e.item);
      if (e.item === 'food' && ctx) s.food = ctx.foodIdx;
    }
    if (e.useItem) {
      s.inventory = s.inventory.filter((x) => x !== e.useItem);
      if (e.useItem === 'food') s.food = null;
    }
    if (e.meet && !s.met.includes(e.meet)) s.met.push(e.meet);
    if (e.friend && e.friend !== s.companion && !s.friends.includes(e.friend)) s.friends.push(e.friend);
    if (e.promise && !s.promises.includes(e.promise)) s.promises.push(e.promise);
    if (e.flag) s.flags[e.flag] = true;
    if (e.keepsake) s.keepsake = e.keepsake;
    if (e.counted) s.counted.push(e.counted);
    if (e.number) s.numbers.push(e.number);
    if (e.letter) { s.letters.push(e.letter); s.letterIdx += 1; }
    if (e.memory) s.newMemories.push(e.memory);
  }
}

function travelChoices(s) {
  const w = world(s);
  if (s.pieces >= s.needed) {
    const g = goalOf(s);
    const where = w.locations[g.where];
    const out = [{ id: 'climax:walk', label: `Walk to ${where.name}`, img: where.icon, scene: g.where }];
    const rider = [s.companion, ...s.friends].find((id) => RIDEABLE.includes(CHARACTERS[id].species));
    if (rider) out.push({ id: 'climax:ride', label: `Ride on ${CHARACTERS[rider].name}`, img: CHARACTERS[rider].img, scene: g.where });
    if (s.inventory.includes('map')) out.push({ id: 'climax:map', label: 'Follow the map', img: 'map', scene: g.where });
    if (out.length < 2) out.push({ id: 'climax:skip', label: 'Skip and sing', img: 'music', scene: g.where });
    return out;
  }
  const loc = w.locations[s.location];
  const rng = rngFor(s.seed, 'travel', s.step, s.location);
  const fresh = rng.shuffle(loc.links.filter((l) => !s.visited.includes(l)));
  const old = rng.shuffle(loc.links.filter((l) => s.visited.includes(l)));
  let picks = fresh.slice(0, 3);
  if (picks.length < 2) picks = picks.concat(old.slice(0, 2 - picks.length));
  return picks.map((id) => ({ id: `go:${id}`, label: capFirst(w.locations[id].name), img: w.locations[id].icon, scene: id }));
}

const capFirst = (t) => t[0].toUpperCase() + t.slice(1);

function travelQuestion(choices, s) {
  if (choices[0].id.startsWith('climax:')) {
    return n(`You have everything you need! Let's go to ${world(s).locations[goalOf(s).where].name}.`);
  }
  const names = choices.map((c) => c.label.replace(/^The /, 'the '));
  return n(names.length === 1 ? `Shall we go to ${names[0]}?` : `Where next? ${capFirst(names.slice(0, -1).join(', '))}, or ${names[names.length - 1]}?`);
}

function introLines(s) {
  const w = world(s);
  const g = goalOf(s);
  const comp = CHARACTERS[s.companion];
  const lines = [n(`Welcome to ${w.title.replace(/^The /, 'the ')}. ${w.blurb}`)];
  const mem = s.recall[s.companion];
  if (mem && memoryLine(mem)) {
    lines.push(say(s.companion, `It's me, ${comp.name}! You're back! ${memoryLine(mem)}`));
  } else {
    lines.push(say(s.companion, comp.hello[0]));
  }
  lines.push(n(s.goal === 'lost' ? `Oh dear. ${comp.name} ${g.problem}` : g.problem));
  lines.push(say(s.companion, {
    lost: 'Will you help me find it? Let\'s look for three clues.',
    home: 'Will you help? Let\'s look for three clues to the way home.',
    wake: 'Will you help? We need three bits of magic.',
    party: 'Will you help? We need three special things.',
    fix: 'Will you help? We need to find all three things.',
  }[s.goal]));
  return lines;
}

/** The page for the current state. */
export function getPage(s) {
  const w = world(s);
  if (s.phase === 'intro') {
    const choices = w.start.map((id) => ({ id: `go:${id}`, label: capFirst(w.locations[id].name), img: w.locations[id].icon, scene: id }));
    return {
      kind: 'intro', title: goalTitle(s), scene: null, cast: [s.companion],
      lines: introLines(s), interaction: null, after: [],
      question: travelQuestion(choices, s), choices,
    };
  }
  if (s.phase === 'scene') {
    const evId = pickEvent(s);
    const loc = w.locations[s.location];
    if (!evId) {
      // Nothing left to do here (should be rare): just travel on.
      const choices = travelChoices(s);
      return { kind: 'scene', event: null, scene: s.location, cast: [s.companion, ...s.friends], lines: [n(loc.arrive)], interaction: null, after: [], question: travelQuestion(choices, s), choices };
    }
    const { ctx, built } = buildEvent(s, evId);
    const cast = [s.companion, ...s.friends];
    if (ctx.res && !cast.includes(ctx.res) && (EVENTS[evId].needsResident || EVENTS[evId].needsReunion)) cast.push(ctx.res);
    let choices; let question;
    if (built.choices) {
      choices = built.choices.map((o) => ({ id: `opt:${o.id}`, label: o.label, img: o.img }));
      question = null;
    } else {
      const preview = clone(s);
      applyEffects(preview, built.effects, ctx);
      choices = travelChoices(preview);
      question = travelQuestion(choices, preview);
    }
    return {
      kind: 'scene', event: evId, scene: s.location, cast, resident: ctx.res,
      lines: [n(loc.arrive), ...built.lines], interaction: built.interaction, after: built.after || [],
      rewardImg: built.rewardImg || null, question, choices,
    };
  }
  if (s.phase === 'consequence') {
    const { option, ev, res } = s.pending;
    const choices = travelChoices(s);
    return {
      kind: 'consequence', event: ev, option, scene: s.location, cast: uniq([s.companion, ...s.friends, res].filter(Boolean)), resident: res,
      lines: s.pending.result, interaction: s.pending.resultInteraction || null, after: [],
      question: travelQuestion(choices, s), choices,
    };
  }
  if (s.phase === 'climax') return climaxPage(s);
  if (s.phase === 'ending') return endingPage(s);
  throw new Error(`bad phase ${s.phase}`);
}

const uniq = (a) => [...new Set(a)];

function climaxPage(s) {
  const w = world(s);
  const g = goalOf(s);
  const where = w.locations[g.where];
  const comp = CHARACTERS[s.companion];
  const rider = [s.companion, ...s.friends].find((id) => RIDEABLE.includes(CHARACTERS[id].species));
  const travel = {
    walk: `You walk together to ${where.name}.`,
    ride: `${rider ? CHARACTERS[rider].name : comp.name} gives you a ride all the way to ${where.name}. Wheee!`,
    map: `You follow your little map, straight to ${where.name}.`,
    skip: `You skip and sing all the way to ${where.name}. La la la!`,
  }[s.travelMode];
  const pieceImgs = g.pieceImgs || [g.pieceImg, g.pieceImg, g.pieceImg];
  let lines; let interaction;
  switch (s.goal) {
    case 'wake':
      lines = [n(travel), n(`Here is ${g.thing}, fast asleep.`), say(s.companion, 'Let\'s give it all the magic we found! Drag each one over.')];
      interaction = { type: 'give_pieces', pieceImgs, targetImg: g.img, target: g.thing };
      break;
    case 'party':
    case 'fix':
      lines = [n(travel), n(s.goal === 'party' ? `Everything is ready for ${g.thing}, except the things you found!` : `Here is ${g.thing}, waiting to be fixed.`),
        say(s.companion, 'Drag each thing into its place!')];
      interaction = { type: 'give_pieces', pieceImgs, targetImg: g.img, target: g.thing };
      break;
    case 'lost':
      lines = [n(travel), say(s.companion, `All our clues point here! Is my ${g.thing} hiding somewhere?`), n('Tap around to look.')];
      interaction = { type: 'find_hidden', spot: w.spot, spots: 5, findImg: g.img, findName: `the ${g.thing}`, extras: [w.countables[0].img, w.countables[1].img] };
      break;
    case 'home':
      lines = [n(travel), say(s.companion, `Look! ${g.thing.replace(/^a .* called /, '')} knows this place!`), n('Tap the stepping stones to go home.')];
      interaction = { type: 'follow_footprints', steps: 4, revealImg: g.img, revealName: 'home' };
      break;
    default:
      lines = [n(travel)];
  }
  return {
    kind: 'climax', event: `goal_${s.goal}`, scene: g.where, cast: [s.companion, ...s.friends],
    lines, interaction, after: [n(g.done), say(s.companion, comp.cheer[0])],
    question: null, choices: [{ id: 'finish', label: 'Turn the page', img: 'book' }],
  };
}

function endingPage(s) {
  const e = ENDINGS.find((x) => x.id === s.ending);
  const comp = CHARACTERS[s.companion];
  const lines = [...e.lines(s), say(s.companion, `Thank you for helping me. I will always remember this adventure!`), n('The End.')];
  return {
    kind: 'ending', ending: e.id, endingTitle: e.title, endingImg: e.img, scene: goalOf(s).where,
    cast: [s.companion, ...s.friends, ...s.promises].filter((x, i, a) => a.indexOf(x) === i),
    lines, interaction: null, after: [], question: null, choices: [],
    summary: {
      friends: s.met.slice(), secrets: s.secrets.slice(), letters: uniq(s.letters), counted: s.counted.slice(),
      keepsake: s.keepsake, companion: comp.name,
    },
  };
}

/** Moves the story forward. Returns a new state; never changes the old one. */
export function choose(state, choiceId) {
  const s = clone(state);
  const page = getPage(state);
  const choice = page.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Choice ${choiceId} is not available here`);

  if (s.phase === 'scene' && page.event) {
    const { ctx, built } = buildEvent(state, page.event);
    if (choiceId.startsWith('opt:')) {
      const opt = built.choices.find((o) => `opt:${o.id}` === choiceId);
      applyEffects(s, built.effects, ctx);
      applyEffects(s, opt.effects, ctx);
      s.log.push({ loc: s.location, ev: page.event, opt: opt.id });
      s.pending = { ev: page.event, option: opt.id, result: opt.result, resultInteraction: opt.resultInteraction || null, res: ctx.res };
      s.phase = 'consequence';
      return s;
    }
    applyEffects(s, built.effects, ctx);
    s.log.push({ loc: s.location, ev: page.event });
  } else if (s.phase === 'scene') {
    s.log.push({ loc: s.location, ev: null });
  }

  if (choiceId.startsWith('go:')) {
    const to = choiceId.slice(3);
    s.pending = null;
    s.location = to;
    s.step += 1;
    if (!s.visited.includes(to)) s.visited.push(to);
    s.phase = 'scene';
    return s;
  }
  if (choiceId.startsWith('climax:')) {
    s.pending = null;
    s.travelMode = choiceId.slice(7);
    s.location = goalOf(s).where;
    s.step += 1;
    if (!s.visited.includes(s.location)) s.visited.push(s.location);
    s.phase = 'climax';
    return s;
  }
  if (choiceId === 'finish') {
    s.ending = chooseEnding(s).id;
    s.phase = 'ending';
    for (const who of uniq([s.companion, ...s.friends])) s.newMemories.push({ who, type: 'goal', world: s.worldId, goal: s.goal });
    for (const who of s.promises) s.newMemories.push({ who, type: 'promise' });
    return s;
  }
  throw new Error(`Unknown choice ${choiceId}`);
}

export function isFinished(s) { return s.phase === 'ending'; }

export { ITEMS, SECRETS, numberWord };
