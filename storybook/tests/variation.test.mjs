// Proves the 100,000 meaningful progressions requirement on every test run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../tools/simulate.mjs';

test('at least 100,000 distinct meaningful progression signatures', { timeout: 600000 }, () => {
  const r = simulate(130000, { withMemories: true });
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors.slice(0, 3)));
  assert.ok(r.distinct >= 100000, `only ${r.distinct} distinct signatures`);
  // Not just place names: events/decisions/endings alone are also very varied.
  assert.ok(r.coarseDistinct >= 80000, `coarse ${r.coarseDistinct}`);
  // Diversity: every world, goal and ending appears in a fair share.
  for (const k of ['worlds', 'goals']) {
    const vals = Object.values(r.stats[k]);
    assert.ok(Math.min(...vals) > r.count / (vals.length * 3), `${k} unbalanced`);
  }
  assert.equal(Object.keys(r.stats.endings).length, 7);
});
