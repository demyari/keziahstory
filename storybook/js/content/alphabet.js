// A–Z. Each letter has its name, a gentle "sound" hint (spelled so a speech
// voice can say it), and several picture words so examples vary between
// adventures. `note` explains letters whose usual sound differs.

export const ALPHABET = {
  A: { say: 'ah', words: ['apple', 'ant', 'airplane', 'avocado'] },
  B: { say: 'buh', words: ['bear', 'balloon', 'butterfly', 'banana', 'bee'] },
  C: { say: 'kuh', words: ['cat', 'carrot', 'castle', 'cake', 'crab'] },
  D: { say: 'duh', words: ['dragon', 'dinosaur', 'duck', 'dolphin'] },
  E: { say: 'eh', words: ['egg', 'elephant', 'envelope'] },
  F: { say: 'fff', words: ['fish', 'flower', 'fox', 'frog', 'feather'] },
  G: { say: 'guh', words: ['giraffe', 'grapes', 'gift'] },
  H: { say: 'huh', words: ['hat', 'house', 'hedgehog', 'horse', 'honey'] },
  I: { say: 'ih', words: ['ice cream', 'ice'], note: 'I can say its own name, like in ice cream.' },
  J: { say: 'juh', words: ['juice', 'jeans'] },
  K: { say: 'kuh', words: ['kite', 'key', 'koala', 'kangaroo'] },
  L: { say: 'lll', words: ['lion', 'lemon', 'leaf', 'lantern', 'ladybird'] },
  M: { say: 'mmm', words: ['moon', 'mushroom', 'monkey', 'mouse'] },
  N: { say: 'nnn', words: ['nest', 'nut'] },
  O: { say: 'o', words: ['octopus', 'otter', 'orange', 'owl'] },
  P: { say: 'puh', words: ['penguin', 'pig', 'pear', 'panda'] },
  Q: { say: 'kwuh', words: ['queen'] },
  R: { say: 'rrr', words: ['rainbow', 'rabbit', 'rocket', 'rose'] },
  S: { say: 'sss', words: ['star', 'sun', 'snail', 'shell', 'strawberry'] },
  T: { say: 'tuh', words: ['tree', 'turtle', 'tiger', 'train'] },
  U: { say: 'uh', words: ['umbrella', 'unicorn'], note: 'U can say its own name, like in unicorn.' },
  V: { say: 'vvv', words: ['violin', 'volcano', 'van'] },
  W: { say: 'wuh', words: ['whale', 'watermelon', 'worm'] },
  X: { say: 'ks', words: ['box', 'fox'], note: 'X often hides at the end of words, like box and fox.' },
  Y: { say: 'yuh', words: ['yo-yo', 'yarn'] },
  Z: { say: 'zzz', words: ['zebra'] },
};

// picture key for each word
export const WORD_IMG = {
  apple: 'apple', ant: 'ant', airplane: 'airplane', avocado: 'avocado',
  bear: 'bear', balloon: 'balloon', butterfly: 'butterfly', banana: 'banana', bee: 'bee',
  cat: 'cat', carrot: 'carrot', castle: 'castle', cake: 'cake', crab: 'crab',
  dragon: 'dragon', dinosaur: 'sauropod', duck: 'duck', dolphin: 'dolphin',
  egg: 'egg', elephant: 'elephant', envelope: 'envelope',
  fish: 'fish', flower: 'flower', fox: 'fox', frog: 'frog', feather: 'feather',
  giraffe: 'giraffe', grapes: 'grapes', gift: 'gift',
  hat: 'hat', house: 'house', hedgehog: 'hedgehog', horse: 'horse', honey: 'honey',
  'ice cream': 'icecream', ice: 'ice', juice: 'juice', jeans: 'jeans',
  kite: 'kite', key: 'key', koala: 'koala', kangaroo: 'kangaroo',
  lion: 'lion', lemon: 'lemon', leaf: 'leaf', lantern: 'lantern', ladybird: 'ladybird',
  moon: 'moon', mushroom: 'mushroom', monkey: 'monkey', mouse: 'mouse',
  nest: 'nest', nut: 'nut', octopus: 'octopus', otter: 'otter', orange: 'orange', owl: 'owl',
  penguin: 'penguin', pig: 'pig', pear: 'pear', panda: 'panda', queen: 'queen',
  rainbow: 'rainbow', rabbit: 'rabbit', rocket: 'rocket', rose: 'rose',
  star: 'star', sun: 'sun', snail: 'snail', shell: 'shell', strawberry: 'strawberry',
  tree: 'tree', turtle: 'turtle', tiger: 'tiger', train: 'train',
  umbrella: 'umbrella', unicorn: 'unicorn', violin: 'violin', volcano: 'volcano', van: 'van',
  whale: 'whale', watermelon: 'watermelon', worm: 'worm', box: 'box',
  'yo-yo': 'yoyo', yarn: 'yarn', zebra: 'zebra',
};

export const LETTERS = Object.keys(ALPHABET);

/** "B is for butterfly" style word for a letter, varied by an index. */
export function wordFor(letter, n = 0) {
  const words = ALPHABET[letter].words;
  const word = words[((n % words.length) + words.length) % words.length];
  return { word, img: WORD_IMG[word] };
}

export function letterLine(letter, word) {
  if (letter === 'X') return `X, like at the end of ${word}.`;
  return `${letter} is for ${word}!`;
}
