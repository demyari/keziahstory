// Plays "Poppy's Picnic" in real Chromium by touching the screen like a
// child, down every route, and checks that choices carry through to the end.
// Run: npm test   (narration is skipped in tests with ?fast=1)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { play } = require('./play.cjs');

const ROOT = path.resolve(__dirname, '..');

test('every narration line has a recorded clip, and every picture exists', () => {
  const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'script/poppys-picnic.json'), 'utf8'));
  for (const [id, [who]] of Object.entries(script.lines)) {
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/voice', `${id}.ogg`)), `missing voice clip ${id}`);
    if (who === 'n') assert.ok(fs.existsSync(path.join(ROOT, 'assets/voice-b', `${id}.ogg`)), `missing alternative narrator clip ${id}`);
    assert.ok(script.lines[id][1].split(/\s+/).length <= 16, `line ${id} is too long for a four-year-old`);
  }
  const stage = fs.readFileSync(path.join(ROOT, 'js/stage.js'), 'utf8');
  const names = stage.match(/const IMAGES = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  for (const n of names) assert.ok(fs.existsSync(path.join(ROOT, 'assets/img', `${n}.png`)), `missing picture ${n}`);
});

const ROUTES = [
  { way: 'forest', pig: 'share', width: 915, height: 412 },
  { way: 'forest', pig: 'go', width: 1280, height: 800 },
  { way: 'pond', pig: 'share', width: 1180, height: 820 },
  { way: 'pond', pig: 'go', width: 740, height: 360 },
];

for (const r of ROUTES) {
  test(`route ${r.way} + ${r.pig} at ${r.width}x${r.height}: plays to the end by touch, choices carry through`, { timeout: 300000 }, async () => {
    const res = await play(r);
    assert.deepEqual(res.errors, []);
    assert.ok(res.finished, `stopped in: ${res.seen.join(' > ')}`);
    assert.deepEqual(res.seen, ['title', 'home', 'garden', 'crossroads', r.way, 'meadow', 'party']);
  });
}

test('what the child chose is what the story remembers', { timeout: 300000 }, async () => {
  const { chromium } = require('playwright');
  const { serve } = require('./serve.cjs');
  const srv = await serve(ROOT);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 915, height: 412 } });
  await page.goto(`${srv.url}/index.html?fast=1`);
  await page.waitForFunction(() => window.__game && window.__game.targets.length > 0);
  // jump to the meadow as if the forest route had been played
  await page.evaluate(() => { const g = window.__game; g.state = { path: 'forest', shared: null, items: { carrot: 3, cherry: 4 }, friends: ['owl'] }; g.run('meadow'); });
  await page.waitForFunction(() => window.__game.chapter === 'meadow' && window.__game.targets.length === 2, null, { timeout: 30000 });
  const sign = await page.evaluate(() => {
    const g = window.__game; const r = g.game.canvas.getBoundingClientRect();
    const t = g.targets.find((x) => x.kind === 'tap'); const p = g.spot(t.obj);
    return { x: r.left + (p.x * r.width) / g.scale.gameSize.width, y: r.top + (p.y * r.height) / g.scale.gameSize.height };
  });
  await page.mouse.click(sign.x, sign.y);
  await page.waitForFunction(() => window.__game.chapter === 'party', null, { timeout: 30000 });
  const st = await page.evaluate(() => window.__game.state);
  assert.equal(st.shared, false);
  assert.equal(st.items.carrot, 3, 'not sharing keeps all three carrots');
  assert.deepEqual(st.friends, ['owl']);
  await browser.close();
  srv.close();
});
