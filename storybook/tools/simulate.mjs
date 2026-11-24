// Plays many complete adventures with deterministic seeds and random (seeded)
// choices, validates every state and page, and measures how many DISTINCT
// meaningful progressions appear (see js/engine/signature.js for what counts).
//
// Usage: node tools/simulate.mjs [count=150000] [--report docs/VARIATION_REPORT.md] [--transcripts N]

import { startAdventure, getPage, choose } from '../js/engine/generator.js';
import { validateState, validatePage, validateContent } from '../js/engine/validator.js';
import { signature, coarseSignature } from '../js/engine/signature.js';
import { makeRng } from '../js/engine/rng.js';
import { CHARACTERS } from '../js/content/characters.js';
import { LETTERS } from '../js/content/alphabet.js';
import fs from 'node:fs';

export function playOne(seed, chooserSeed, opts = {}) {
  const rng = makeRng(chooserSeed);
  let s = startAdventure({ seed, ...opts });
  const pages = [];
  for (let guard = 0; guard < 40; guard++) {
    const errs = validateState(s);
    const page = getPage(s);
    errs.push(...validatePage(page, s));
    if (errs.length) return { s, pages, errors: errs };
    pages.push(page);
    if (s.phase === 'ending') return { s, pages, errors: [] };
    s = choose(s, rng.pick(page.choices).id);
  }
  return { s, pages, errors: ['did not finish within 40 pages'] };
}

function learnFor(i) {
  // Spread simulated children across learning levels (cosmetic for signatures).
  const lv = i % 3;
  const r = makeRng(i * 7 + 1);
  return {
    countMin: [2, 3, 6][lv], countMax: [5, 10, 20][lv],
    letters: r.shuffle(LETTERS).slice(0, 3), numerals: lv > 0,
  };
}

export function simulate(count, { withMemories = false } = {}) {
  const sigs = new Set();
  const coarse = new Set();
  const stats = { worlds: {}, goals: {}, endings: {}, events: {}, companions: {}, lengths: {}, decisions: {}, modes: {} };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const errors = [];
  for (let i = 0; i < count; i++) {
    const recall = withMemories && i % 2 ? { hoot: { type: 'secret', secret: 'blue_butterfly', place: 'the Star Pond' }, rosie: { type: 'helped' }, pip: { type: 'fed', food: 'fish' }, coral: { type: 'song' }, sparkle: { type: 'goal', world: 'cloud_kingdom', goal: 'wake' }, dotty: { type: 'counted', n: 4, things: 'eggs' } } : {};
    const { s, errors: e } = playOne(`SIM-${i}`, i * 31 + 17, { learn: learnFor(i), recall });
    if (e.length) { errors.push({ seed: `SIM-${i}`, e }); if (errors.length > 20) break; continue; }
    sigs.add(signature(s));
    coarse.add(coarseSignature(s));
    bump(stats.worlds, s.worldId); bump(stats.goals, s.goal); bump(stats.endings, s.ending);
    bump(stats.companions, s.companion); bump(stats.lengths, s.log.length); bump(stats.modes, s.travelMode);
    for (const l of s.log) { bump(stats.events, l.ev); if (l.opt) bump(stats.decisions, `${l.ev}>${l.opt}`); }
  }
  return { count, distinct: sigs.size, coarseDistinct: coarse.size, stats, errors };
}

function table(obj, total) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} | ${((100 * v) / total).toFixed(1)}% |`).join('\n');
}

function transcript(seed, chooser) {
  const rng = makeRng(chooser);
  let s = startAdventure({ seed });
  const out = [`### Seed \`${seed}\``, ''];
  for (let g = 0; g < 40; g++) {
    const p = getPage(s);
    out.push(`**${p.kind === 'intro' ? p.title : p.kind === 'ending' ? `Ending: ${p.endingTitle}` : `${p.kind} — ${p.scene}${p.event ? ` (${p.event})` : ''}`}**`);
    for (const l of [...p.lines, ...(p.after || [])]) out.push(`> ${l.who === 'n' ? '' : `**${CHARACTERS[l.who].name}:** `}${l.text}`);
    if (p.interaction) out.push(`> _[interaction: ${p.interaction.type}${p.interaction.n ? ` n=${p.interaction.n}` : ''}${p.interaction.letter ? ` letter=${p.interaction.letter}` : ''}]_`);
    if (!p.choices.length) break;
    const c = rng.pick(p.choices);
    out.push(`> Choices: ${p.choices.map((x) => (x === c ? `**[${x.label}]**` : x.label)).join(' · ')}`, '');
    s = choose(s, c.id);
  }
  out.push('', `Signature: \`${signature(s)}\``, '');
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const count = Number(process.argv[2] || 150000);
  const reportIdx = process.argv.indexOf('--report');
  const contentErrors = validateContent();
  if (contentErrors.length) { console.error('CONTENT ERRORS', contentErrors); process.exit(1); }
  const t0 = Date.now();
  const r = simulate(count, { withMemories: true });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`played ${r.count} adventures in ${secs}s`);
  console.log(`distinct progression signatures: ${r.distinct}`);
  console.log(`distinct coarse (event/decision/ending only) signatures: ${r.coarseDistinct}`);
  console.log(`errors: ${r.errors.length}`);
  if (r.errors.length) console.log(JSON.stringify(r.errors.slice(0, 5), null, 1));
  console.log('endings', r.stats.endings);
  console.log('lengths', r.stats.lengths);
  if (reportIdx > 0) {
    const file = process.argv[reportIdx + 1];
    const md = `# Story variation report

Generated by \`node tools/simulate.mjs ${count} --report ${file}\` on ${new Date().toISOString().slice(0, 10)}.

Each adventure uses seed \`SIM-<i>\` and a seeded random child who picks among the offered choices.
Simulated children are spread over three learning levels, and half of them have saved friend
memories (so reunion events and memory greetings are exercised). Every state and page was validated
(no dead ends, no repeated scenes, no impossible inventory, no contradictions, safe readable text).

## Result

| Measure | Value |
|---|---|
| Adventures played | ${r.count} |
| Validation errors | ${r.errors.length} |
| **Distinct progression signatures** | **${r.distinct}** |
| Distinct coarse signatures (events + decisions + ending only, ignoring places and companion) | ${r.coarseDistinct} |
| Time | ${secs}s |

### What a signature contains (meaningful)
World, goal, companion, the ordered list of places visited with the event that happened in each
and any decision taken, how the finale was reached, and the ending earned.

### What is excluded (cosmetic)
Wording, which picture is counted, how many (that follows the child's level), which letter is
practised, the seed itself. Two adventures that differ only in these count as one progression.

Even the coarse signature, which also ignores *where* things happened and *who* the companion was,
yields ${r.coarseDistinct} distinct stories.

## Diversity

### Worlds
| World | Adventures | Share |
|---|---|---|
${table(r.stats.worlds, r.count)}

### Goals
| Goal | Adventures | Share |
|---|---|---|
${table(r.stats.goals, r.count)}

### Endings
| Ending | Adventures | Share |
|---|---|---|
${table(r.stats.endings, r.count)}

### Companions
| Companion | Adventures | Share |
|---|---|---|
${table(r.stats.companions, r.count)}

### Number of scenes before the finale
| Scenes | Adventures | Share |
|---|---|---|
${table(r.stats.lengths, r.count)}

### Events (times used)
| Event | Uses | Per adventure |
|---|---|---|
${table(r.stats.events, r.count)}

### Decisions
| Decision | Times | Per adventure |
|---|---|---|
${table(r.stats.decisions, r.count)}

### Way to the finale
| Mode | Adventures | Share |
|---|---|---|
${table(r.stats.modes, r.count)}

## Representative playthroughs

${[['MOON-1234', 1], ['SHELL-5521', 2], ['SNOW-7310', 3], ['FERN-2468', 4]].map(([sd, c]) => transcript(sd, c)).join('\n')}
`;
    fs.writeFileSync(file, md);
    console.log(`report written to ${file}`);
  }
  if (r.errors.length || r.distinct < 100000) process.exit(1);
}
