// Story events. Each one is an authored building block: where it can happen
// (location tags), what it needs (conditions), what the child does (an
// interaction), what is said, and what it changes (effects).
//
// build(c) receives a context made by the generator (see engine/generator.js):
//   c.s state, c.w world, c.loc place, c.comp companion, c.res local friend id,
//   c.N a count chosen for this child's level, c.thing a countable,
//   c.food a world food, c.letter / c.word / c.wordImg a letter moment,
//   c.piece the next goal piece (or null), c.secret a treasure to find.
// Lines are { who: 'n' | characterId, text }.

import { CHARACTERS } from './characters.js';
import { SECRETS } from './worlds.js';
import { numberWord, capitalise, countPhrase } from './numbers.js';
import { letterLine } from './alphabet.js';

const n = (text) => ({ who: 'n', text });
const say = (who, text) => ({ who, text });
const nm = (id) => CHARACTERS[id].name;

// The reward an event gives: the next goal piece if one is still needed,
// otherwise a hidden treasure.
function reward(c) {
  if (c.piece) return { text: c.piece, img: c.pieceImg, effects: [{ piece: 1 }] };
  return { text: SECRETS[c.secret].name, img: SECRETS[c.secret].img, effects: [{ secret: c.secret }] };
}

const SPOT_NAMES = {
  bush: 'bushes', sandpile: 'sand piles', cloudpuff: 'cloud puffs', leafpile: 'leaf piles', snowdrift: 'snowdrifts', fern: 'ferns',
};
const COVERS = { cave: 'cobwebs', tree: 'vines', snow: 'snow', sand: 'sand', underwater: 'seaweed', dark: 'mist', building: 'ivy' };
const STUCK = {
  tree: 'kite is stuck up in a tree', water: 'boat has floated away from the bank', snow: 'scarf is stuck under the snow',
  sand: 'bucket is stuck in the sand', cave: 'ball has rolled into a dark corner', building: 'hat is stuck on the roof',
  meadow: 'balloon is caught on a branch', sky: 'kite is tangled in a cloud', path: 'wagon wheel is stuck in the mud', high: 'kite is stuck up high',
};

export const EVENTS = {
  sleepy_count: {
    tags: ['meadow', 'tree', 'dark', 'water', 'sand', 'snow', 'path'], kind: 'piece', weight: 3,
    build: (c) => {
      const r = reward(c);
      return {
        lines: [n(`Look! ${capitalise(countPhrase(c.N, c.thing))} are fast asleep. Snore, snore.`),
          say(c.compId, 'Shall we wake them up? Tap each one, and we can count together!')],
        interaction: { type: 'count_tap', img: c.thing.img, n: c.N, one: c.thing.one, many: c.thing.many, effect: 'wake' },
        after: [n(`${capitalise(countPhrase(c.N, c.thing))}, all awake! They wiggle and giggle and give you ${r.text}.`)],
        effects: [...r.effects, { counted: c.N }], rewardImg: r.img,
      };
    },
  },

  peek_spots: {
    tags: ['meadow', 'tree', 'sand', 'snow', 'path', 'water'], kind: 'piece', weight: 3,
    build: (c) => {
      const r = reward(c);
      const spots = SPOT_NAMES[c.w.spot];
      return {
        lines: [n(`Rustle, rustle! Something is hiding in the ${spots}.`), say(c.compId, 'Let\'s peek! Tap them to look.')],
        interaction: { type: 'find_hidden', spot: c.w.spot, spots: 4, findImg: r.img, findName: r.text, extras: [c.thing.img, c.food.img, 'ladybird'] },
        after: [n(`Peekaboo! You found ${r.text}!`)],
        effects: r.effects, rewardImg: r.img,
      };
    },
  },

  hungry_friend: {
    tags: ['*'], kind: 'friend', weight: 2, needsResident: true,
    build: (c) => {
      const f = c.food;
      return {
        lines: [n(`Here is ${nm(c.res)} the ${CHARACTERS[c.res].species}. Rumble, rumble goes a hungry tummy!`),
          say(c.res, `${CHARACTERS[c.res].hello[0]} Could you give me ${countPhrase(c.N, f)}?`)],
        interaction: { type: 'drag_feed', eater: c.res, eaterImg: CHARACTERS[c.res].img, foodImg: f.img, n: c.N, one: f.one, many: f.many },
        after: [say(c.res, `Yum, yum! ${CHARACTERS[c.res].cheer[0]} Can I come on your adventure too?`), n(`${nm(c.res)} joins the adventure!`)],
        effects: [{ meet: c.res }, { friend: c.res }, { counted: c.N }, { memory: { who: c.res, type: 'fed', food: f.many } }],
      };
    },
  },

  locked_chest: {
    tags: ['cave', 'building', 'sand', 'underwater', 'meadow'], kind: 'piece', weight: 4, needsItem: 'key',
    build: (c) => {
      const r = reward(c);
      return {
        lines: [n('Look! A treasure chest with a big golden lock.'), say(c.compId, 'You have a golden key! Pop it in the lock.')],
        interaction: { type: 'key_lock', keyImg: 'key', prizeImg: r.img, prizeName: r.text },
        after: [n(`Click! The lid creaks open. Inside is ${r.text}!`)],
        effects: [{ useItem: 'key' }, ...r.effects], rewardImg: r.img,
      };
    },
  },

  shake_tree: {
    tags: ['tree'], kind: 'item', weight: 2, avoidItem: 'key',
    build: (c) => ({
      lines: [n('This tree looks very wobbly and very shakeable.'), say(c.compId, 'Give it a big shake! Count what falls down.')],
      interaction: { type: 'shake_tree', fruitImg: c.food.img, n: c.N, one: c.food.one, many: c.food.many, bonusImg: 'key' },
      after: [n(`${capitalise(countPhrase(c.N, c.food))} fell down, and... a golden key! What could it open?`)],
      effects: [{ item: 'key' }, { item: 'food' }, { counted: c.N }],
    }),
  },

  letter_bubbles: {
    tags: ['water', 'sky', 'underwater'], kind: 'piece', weight: 3,
    build: (c) => {
      const r = reward(c);
      return {
        lines: [n('Magic bubbles float up, up, up. Each one has a letter inside!'),
          say(c.compId, `Can you pop the letter ${c.letter}? ${letterLine(c.letter, c.word)}`)],
        interaction: { type: 'pop_bubbles', letter: c.letter, word: c.word, wordImg: c.wordImg, others: c.otherLetters },
        after: [n(`Pop! ${c.letter}! Out of the bubble floats ${r.text}!`)],
        effects: [{ letter: c.letter }, ...r.effects], rewardImg: r.img,
      };
    },
  },

  cloud_peek: {
    tags: ['sky', 'high', 'dark'], kind: 'piece', weight: 3,
    build: (c) => {
      const r = reward(c);
      return {
        lines: [n('Big fluffy clouds are hiding something.'), say(c.compId, 'Push the clouds away with your finger!')],
        interaction: { type: 'move_clouds', revealImg: r.img, revealName: r.text, n: 3 },
        after: [n(`Swoosh! Behind the clouds is ${r.text}!`)],
        effects: r.effects, rewardImg: r.img,
      };
    },
  },

  footprints: {
    tags: ['path', 'sand', 'snow', 'meadow'], kind: 'friend', weight: 2, needsResident: true,
    build: (c) => ({
      lines: [n('Little footprints go across the ground. Whose could they be?'), say(c.compId, 'Let\'s follow them! Tap each footprint.')],
      interaction: { type: 'follow_footprints', steps: Math.min(c.N, 6), revealImg: CHARACTERS[c.res].img, revealName: nm(c.res) },
      after: [n(`The footprints lead to ${nm(c.res)} the ${CHARACTERS[c.res].species}!`), say(c.res, `${CHARACTERS[c.res].hello[1]} Can I help you?`),
        n(`${nm(c.res)} joins the adventure!`)],
      effects: [{ meet: c.res }, { friend: c.res }, { counted: Math.min(c.N, 6) }, { memory: { who: c.res, type: 'footprints' } }],
    }),
  },

  shape_door: {
    tags: ['building', 'cave'], kind: 'piece', weight: 3,
    build: (c) => {
      const r = reward(c);
      return {
        lines: [n('A little round door has funny shaped holes in it.'), say(c.compId, 'Can you put the shapes in the right holes?')],
        interaction: { type: 'match_shapes', shapes: c.shapes },
        after: [n(`The door swings open with a creak! Inside is ${r.text}.`)],
        effects: r.effects, rewardImg: r.img,
      };
    },
  },

  signpost: {
    tags: ['path', 'meadow'], kind: 'item', weight: 2, avoidItem: 'map',
    build: (c) => ({
      lines: [n('A wooden signpost points every which way!'), say(c.compId, `Which sign has the letter ${c.letter}? ${letterLine(c.letter, c.word)}`)],
      interaction: { type: 'letter_sign', letter: c.letter, word: c.word, wordImg: c.wordImg, options: c.otherLetters.slice(0, 2) },
      after: [say(c.compId, `${c.letter}! Well spotted! And look, a little map is tucked behind the sign.`)],
      effects: [{ letter: c.letter }, { item: 'map' }, { flag: 'clever' }],
    }),
  },

  counting_baskets: {
    tags: ['meadow', 'building', 'path', 'tree', 'sand', 'snow'], kind: 'piece', weight: 3, needsResident: true,
    build: (c) => {
      const r = reward(c);
      const want = Math.min(c.N, 10);
      return {
        lines: [n(`${nm(c.res)} has baskets of ${c.thing.many}.`),
          say(c.res, `Hello! I can trade you ${r.text} for a basket with ${numberWord(want)} ${want === 1 ? c.thing.one : c.thing.many}. Which basket has ${numberWord(want)}?`)],
        interaction: { type: 'numeral_pick', n: want, options: c.basketOptions, img: c.thing.img, many: c.thing.many, showNumerals: c.s.learn.numerals },
        after: [say(c.res, `${capitalise(numberWord(want))}! Just right. Here you are: ${r.text}!`)],
        effects: [{ meet: c.res }, { number: want }, ...r.effects, { memory: { who: c.res, type: 'counted', n: want, things: c.thing.many } }], rewardImg: r.img,
      };
    },
  },

  light_lanterns: {
    tags: ['dark', 'cave'], kind: 'piece', weight: 3,
    build: (c) => {
      const r = reward(c);
      return {
        lines: [n(`It is very dark here. ${capitalise(numberWord(c.N))} lanterns are waiting for light.`),
          say(c.compId, 'Carry the little glow to each lantern!')],
        interaction: { type: 'carry_glow', n: c.N, targetImg: 'lantern' },
        after: [n(`${capitalise(numberWord(c.N))} lanterns, all glowing warm and bright! In the light you spot ${r.text}.`)],
        effects: [...r.effects, { counted: c.N }, { memory: { who: c.compId, type: 'lanterns', n: c.N } }], rewardImg: r.img,
      };
    },
  },

  rub_reveal: {
    tags: ['cave', 'tree', 'snow', 'sand', 'underwater', 'building', 'dark'], kind: 'secret', weight: 2,
    build: (c) => {
      const cover = COVERS[c.loc.tags.find((t) => COVERS[t])] || 'leaves';
      const sec = SECRETS[c.secret];
      return {
        lines: [n(`Something sparkly is hiding under the ${cover}.`), say(c.compId, 'Rub it away with your finger. Gently!')],
        interaction: { type: 'rub_reveal', cover, revealImg: sec.img, revealName: sec.name },
        after: [n(`It is ${sec.name}! What a special treasure.`), say(c.compId, 'Let\'s put it in your Discovery Book!')],
        effects: [{ secret: c.secret }, { memory: { who: c.compId, type: 'secret', secret: c.secret, place: c.loc.name } }], rewardImg: sec.img,
      };
    },
  },

  magic_letter: {
    tags: ['sand', 'snow', 'meadow', 'building', 'dark', 'path'], kind: 'piece', weight: 3,
    build: (c) => {
      const r = reward(c);
      return {
        lines: [n(`A magic letter is drawn here. It is the letter ${c.letter}!`), say(c.compId, `${letterLine(c.letter, c.word)} Trace it with your finger.`)],
        interaction: { type: 'trace_letter', letter: c.letter, word: c.word, wordImg: c.wordImg },
        after: [n(`The ${c.letter} glows gold, and out pops ${r.text}!`)],
        effects: [{ letter: c.letter }, ...r.effects], rewardImg: r.img,
      };
    },
  },

  basket_gather: {
    tags: ['tree', 'meadow', 'sand'], kind: 'item', weight: 2, avoidItem: 'food',
    build: (c) => ({
      lines: [n(`So many ${c.food.many}! Here is a little basket.`), say(c.compId, `Can you put ${countPhrase(c.N, c.food)} in the basket?`)],
      interaction: { type: 'sort_basket', img: c.food.img, n: c.N, one: c.food.one, many: c.food.many },
      after: [n(`${capitalise(countPhrase(c.N, c.food))} in the basket. They might come in handy!`)],
      effects: [{ item: 'food' }, { item: 'basket' }, { counted: c.N }],
    }),
  },

  share_food: {
    tags: ['*'], kind: 'decision', weight: 5, needsItem: 'food', needsResident: true,
    build: (c) => ({
      lines: [n(`${nm(c.res)} the ${CHARACTERS[c.res].species} is sitting all alone.`),
        say(c.res, 'Oh dear. I am so hungry, and I could not find any breakfast.'), n('What shall we do?')],
      interaction: { type: 'tap_react', who: c.res },
      choices: [
        { id: 'share', label: `Share your ${c.food.many}`, img: c.food.img,
          result: [n(`You share your ${c.food.many}. Munch, munch!`), say(c.res, `${CHARACTERS[c.res].cheer[1]} You are so kind. Can I come with you?`), n(`${nm(c.res)} joins the adventure!`)],
          effects: [{ useItem: 'food' }, { meet: c.res }, { friend: c.res }, { flag: 'kind' }, { memory: { who: c.res, type: 'shared', food: c.food.many } }] },
        { id: 'search', label: `Find food for ${nm(c.res)}`, img: CHARACTERS[c.res].img,
          result: [n(`You look high and low with ${nm(c.res)}, and find a big pile of ${c.food.many}.`),
            say(c.res, `Thank you! Here, I found this. I want you to have it.`), n(`${nm(c.res)} gives you ${SECRETS[c.secret].name}.`)],
          resultInteraction: { type: 'find_hidden', spot: c.w.spot, spots: 3, findImg: c.food.img, findName: c.food.many, extras: [c.thing.img, 'ladybird'] },
          effects: [{ meet: c.res }, { flag: 'helper' }, { secret: c.secret }, { memory: { who: c.res, type: 'searched', food: c.food.many } }] },
      ],
    }),
  },

  stuck_friend: {
    tags: ['*'], kind: 'decision', weight: 3, needsResident: true,
    build: (c) => {
      const stuck = STUCK[c.loc.tags.find((t) => STUCK[t])] || 'kite is stuck';
      return {
        lines: [n(`Oh no! ${nm(c.res)}'s ${stuck}.`), say(c.res, 'Can anybody help me?'), n('What shall we do?')],
        interaction: { type: 'tap_react', who: c.res },
        choices: [
          { id: 'help', label: `Help ${nm(c.res)} now`, img: CHARACTERS[c.res].img,
            result: [n(`Pull, pull, PULL! You and ${c.comp.name} help together. Hooray!`), say(c.res, 'Thank you! I want to help you too.'), n(`${nm(c.res)} joins the adventure!`)],
            resultInteraction: { type: 'charge_tap', who: c.res, taps: 3, verb: 'pull' },
            effects: [{ meet: c.res }, { friend: c.res }, { flag: 'kind' }, { memory: { who: c.res, type: 'helped' } }] },
          { id: 'promise', label: 'Come back after', img: 'heart',
            result: [say(c.compId, `We will come back to help you, ${nm(c.res)}. We promise!`), say(c.res, 'Thank you! I will wait right here.')],
            effects: [{ meet: c.res }, { promise: c.res }] },
        ],
      };
    },
  },

  treasure_choice: {
    tags: ['building', 'cave', 'high'], kind: 'decision', weight: 2,
    build: (c) => ({
      lines: [n('On a little shelf sit two shiny treasures.'), say(c.compId, 'We may take one. Which one shall we choose?')],
      interaction: null,
      choices: [
        { id: 'crown', label: 'The shiny crown', img: 'crown',
          result: [n('You put on the crown. It fits just right! You look like a story queen.')], effects: [{ item: 'crown' }, { keepsake: 'crown' }] },
        { id: 'telescope', label: 'The little telescope', img: 'telescope',
          result: [n('You peek through the telescope. Everything far away looks close up!')], effects: [{ item: 'telescope' }, { keepsake: 'telescope' }] },
      ],
    }),
  },

  talent: {
    tags: ['*'], kind: 'piece', weight: 2, needsPiece: true,
    build: (c) => {
      const t = c.comp.talent;
      return {
        lines: [say(c.compId, 'Ooh! I have an idea!'), n(`Tap ${c.comp.name} to help.`)],
        interaction: { type: 'charge_tap', who: c.compId, taps: t.taps, verb: 'cheer' },
        after: [n(`${c.comp.name} ${t.verb}. ${t.result}`), n(`And look! You found ${c.piece}!`)],
        effects: [{ piece: 1 }, { memory: { who: c.compId, type: 'talent' } }], rewardImg: c.pieceImg,
      };
    },
  },

  music_stones: {
    tags: ['water', 'cave', 'meadow', 'path', 'underwater'], kind: 'piece', weight: 3,
    build: (c) => {
      const r = reward(c);
      const k = Math.max(3, Math.min(c.N, 5));
      return {
        lines: [n(`${capitalise(numberWord(k))} singing stones sit in a row.`), say(c.compId, 'Tap the stone that glows, and listen!')],
        interaction: { type: 'music_stones', n: k },
        after: [n(`What a pretty song! The music brings ${r.text}.`)],
        effects: [...r.effects, { counted: k }, { memory: { who: c.compId, type: 'song' } }], rewardImg: r.img,
      };
    },
  },

  reunion: {
    tags: ['*'], kind: 'friend', weight: 6, needsReunion: true,
    build: (c) => ({
      lines: [n(`Someone is waving! It is ${nm(c.res)}!`), say(c.res, `You're back! ${c.memoryLine}`),
        say(c.res, 'Can I come with you this time?')],
      interaction: { type: 'charge_tap', who: c.res, taps: 1, verb: 'hug' },
      after: [n(`${nm(c.res)} gives you a big hello hug and joins the adventure!`)],
      effects: [{ meet: c.res }, { friend: c.res }, { memory: { who: c.res, type: 'reunion' } }],
    }),
  },

  // Safety net: if the story is running long, friends bring what is still needed.
  friends_help: {
    tags: ['*'], kind: 'piece', weight: 0, fallback: true,
    build: (c) => ({
      lines: [n('Listen! Friendly voices are calling: hello, hello!'),
        say(c.compId, 'It is our friends! They have been looking too!'), n(`They bring everything you still need for ${c.goalThing}.`)],
      interaction: { type: 'charge_tap', who: c.compId, taps: 2, verb: 'cheer' },
      after: [n('Hooray! Now you have everything!')],
      effects: [{ piece: 99 }],
    }),
  },
};

export const EVENT_IDS = Object.keys(EVENTS);
