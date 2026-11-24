// Endings are chosen from what actually happened in the story (the state),
// never at random. The first ending whose condition is true is used.

import { CHARACTERS } from './characters.js';
import { SECRETS } from './worlds.js';

const n = (text) => ({ who: 'n', text });
const names = (ids) => {
  const ns = ids.map((id) => CHARACTERS[id].name);
  if (ns.length <= 1) return ns.join('');
  return `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
};

export const ENDINGS = [
  {
    id: 'promise_kept', title: 'The Promise Kept', img: 'heart',
    when: (s) => s.promises.length > 0,
    lines: (s) => [n(`But wait! You remember your promise. You hurry back to help ${names(s.promises)}.`),
      n('Pull, pull, hooray! A promise kept is a very happy thing.')],
  },
  {
    id: 'grand_parade', title: 'The Grand Parade', img: 'partypopper',
    when: (s) => s.friends.length >= 2,
    lines: (s) => [n(`${names(s.friends)} all cheer and dance in a long, happy parade.`),
      n('Everyone helped, and that made it extra wonderful.')],
  },
  {
    id: 'kind_heart', title: 'The Kind Heart', img: 'heart',
    when: (s) => !!s.flags.kind,
    lines: (s) => [n('Being kind made the whole adventure brighter.'),
      n(s.friends.length ? `${names(s.friends)} gives you a great big thank-you hug.` : 'Everyone you helped waves a big thank-you.')],
  },
  {
    id: 'treasure_hunter', title: 'The Treasure Hunter', img: 'crystal',
    when: (s) => s.secrets.length >= 1,
    lines: (s) => [n(`You hold up ${SECRETS[s.secrets[0]].name}. It sparkles in the light.`),
      n('It goes straight into your Discovery Book, to keep forever.')],
  },
  {
    id: 'clever_explorer', title: 'The Clever Explorer', img: 'map',
    when: (s) => !!s.flags.clever,
    lines: () => [n('You fold up your little map. You found the way all by yourself!'),
      n('What a clever explorer you are.')],
  },
  {
    id: 'keepsake', title: 'The Keepsake', img: 'crown',
    when: (s) => !!s.keepsake,
    lines: (s) => [n(s.keepsake === 'crown' ? 'You wear your shiny crown all the way home.' : 'You look through your little telescope at the first star of the night.'),
      n('A keepsake to remember this adventure.')],
  },
  {
    id: 'cosy_goodnight', title: 'The Cosy Goodnight', img: 'moon',
    when: () => true,
    lines: () => [n('The stars come out, one by one. It is time for a cosy rest.'),
      n('What a lovely, gentle adventure it was.')],
  },
];

export const ENDING_IDS = ENDINGS.map((e) => e.id);

export function chooseEnding(state) {
  return ENDINGS.find((e) => e.when(state));
}
