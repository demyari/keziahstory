export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

export function numberWord(n) { return NUMBER_WORDS[n] ?? String(n); }

export function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

/** "1 shell" / "3 shells" with words: "three shells". */
export function countPhrase(n, thing) {
  return `${numberWord(n)} ${n === 1 ? thing.one : thing.many}`;
}
