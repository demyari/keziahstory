// Character memory. Friends remember only things that really happened in a
// saved adventure. Memories are small records, kept bounded per character.

import { CHARACTERS } from '../content/characters.js';
import { SECRETS, WORLDS } from '../content/worlds.js';
import { numberWord } from '../content/numbers.js';

export const MAX_MEMORIES_PER_FRIEND = 6;

const strip = (t) => t.replace(/^(the|a|an) /i, '');

/** Turns a saved memory into "Do you remember ...?" Returns null if it cannot. */
export function memoryLine(mem) {
  if (!mem || !mem.type) return null;
  switch (mem.type) {
    case 'secret': return SECRETS[mem.secret] ? `Do you remember ${SECRETS[mem.secret].name} we found at ${mem.place}?` : null;
    case 'fed': return `Do you remember when you gave me yummy ${mem.food}?`;
    case 'shared': return `Do you remember when you shared your ${mem.food} with me?`;
    case 'searched': return `Do you remember when we looked for ${mem.food} together?`;
    case 'footprints': return 'Do you remember when you followed my footprints and found me?';
    case 'counted': return `Do you remember when we counted ${numberWord(mem.n)} ${mem.things} together?`;
    case 'lanterns': return `Do you remember when we lit ${numberWord(mem.n)} lanterns together?`;
    case 'helped': return 'Do you remember when you helped me? Pull, pull, hooray!';
    case 'talent': return 'Do you remember when you cheered me on and my magic worked?';
    case 'song': return 'Do you remember the singing stones? La la la!';
    case 'promise': return 'You came back to help me, just like you promised. I remember!';
    case 'goal': return goalMemory(mem);
    default: return null;
  }
}

function goalMemory(mem) {
  const g = WORLDS[mem.world]?.goals?.[mem.goal];
  if (!g) return null;
  switch (mem.goal) {
    case 'wake': return `Do you remember when we woke up ${g.thing} together?`;
    case 'lost': return `Do you remember when we found the ${strip(g.thing)}?`;
    case 'party': return `Do you remember ${g.thing} we had together?`;
    case 'home': return `Do you remember when we helped ${strip(g.thing).replace(/ called .*/, '')} get home?`;
    case 'fix': return `Do you remember when we fixed ${g.thing}?`;
    default: return null;
  }
}

/** Adds memories to a profile's character records, keeping each list bounded. */
export function commitMemories(profile, memories, adventureNo) {
  for (const m of memories) {
    if (!CHARACTERS[m.who] || !memoryLine(m)) continue;
    const rec = profile.characters[m.who] || (profile.characters[m.who] = { met: true, times: 0, memories: [] });
    const entry = { ...m, adv: adventureNo };
    rec.memories = rec.memories.filter((x) => !(x.type === m.type && x.secret === m.secret && x.goal === m.goal));
    rec.memories.push(entry);
    if (rec.memories.length > MAX_MEMORIES_PER_FRIEND) rec.memories.splice(0, rec.memories.length - MAX_MEMORIES_PER_FRIEND);
  }
}

/** The memory a friend brings up: the newest one from an earlier adventure. */
export function recallFor(profile, who) {
  const list = profile?.characters?.[who]?.memories || [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].type !== 'reunion' && memoryLine(list[i])) return list[i];
  }
  return null;
}
