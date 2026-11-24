// Plays the whole story in real Chromium the way a child would: by touching
// what is on screen. Takes a screenshot of every scene.
// Usage: node tests/play.cjs <outDir> <width> <height> <forest|pond> <share|go>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve } = require('./serve.cjs');

async function play({ outDir, width = 915, height = 412, way = 'forest', pig = 'share', log = () => {} }) {
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  const srv = await serve(path.resolve(__dirname, '..'));
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('crash', () => { errors.push('PAGE CRASHED'); log('PAGE CRASHED'); });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${srv.url}/index.html?fast=1`);
  await page.waitForFunction(() => window.__game && window.__game.targets.length > 0, null, { timeout: 20000 });

  // what can be touched now, in page pixels
  const targets = () => page.evaluate(() => {
    const g = window.__game;
    const r = g.game.canvas.getBoundingClientRect();
    const sx = r.width / g.scale.gameSize.width; const sy = r.height / g.scale.gameSize.height;
    const pt = (x, y) => ({ x: r.left + x * sx, y: r.top + y * sy });
    return {
      chapter: g.chapter,
      state: g.state,
      list: g.targets.filter((t) => t.obj.active).map((t) => {
        const b = g.spot(t.obj);
        const to = t.to ? t.to.filter((x) => !x.taken)[0] || t.to[0] : null;
        return { kind: t.kind, at: pt(b.x, b.y), to: to ? pt(to.x, to.dropY ?? to.y) : null };
      }),
    };
  });

  const seen = [];
  let shots = 0;
  const shot = async (name) => { if (outDir) await page.screenshot({ path: path.join(outDir, `${String(shots++).padStart(2, '0')}-${name}.png`) }); };
  let lastChapter = '';
  let idle = 0;
  const started = Date.now();
  let finished = false;
  while (Date.now() - started < 420000) {
    const t = await targets();
    if (t.chapter !== lastChapter) {
      if (lastChapter === 'party' && t.chapter === 'title') { finished = true; break; }
      lastChapter = t.chapter; seen.push(t.chapter); log(`chapter ${t.chapter}`);
      await page.waitForTimeout(1500);
      await shot(t.chapter);
      continue;
    }
    if (process.env.TRACE) log(`${t.chapter} targets=${t.list.map((x) => x.kind).join(',')}`);
    if (!t.list.length) { idle++; await page.waitForTimeout(300); if (idle % 12 === 0) await shot(`${t.chapter}-mid`); continue; }
    idle = 0;
    let pickIdx = 0;
    if (t.chapter === 'crossroads' && t.list.length === 2) pickIdx = way === 'forest' ? 0 : 1;
    if (t.chapter === 'meadow' && t.list.length === 2) pickIdx = t.list.findIndex((x) => (pig === 'share' ? x.kind === 'drag' : x.kind === 'tap'));
    const tg = t.list[pickIdx];
    if (tg.kind === 'tap') {
      await page.mouse.click(tg.at.x, tg.at.y);
    } else {
      await page.mouse.move(tg.at.x, tg.at.y);
      await page.mouse.down();
      await page.mouse.move((tg.at.x + tg.to.x) / 2, (tg.at.y + tg.to.y) / 2, { steps: 6 });
      await page.mouse.move(tg.to.x, tg.to.y, { steps: 6 });
      await page.mouse.up();
    }
    await page.waitForTimeout(450);
    if (t.chapter === 'party') { await page.waitForTimeout(900); await shot('party-step'); }
  }
  const final = await targets();
  await browser.close();
  srv.close();
  return { seen, errors, finished, state: final.state };
}

module.exports = { play };

if (require.main === module) {
  const [outDir, w, h, way, pig] = process.argv.slice(2);
  play({ outDir, width: +w || 915, height: +h || 412, way: way || 'forest', pig: pig || 'share', log: console.log }).then((r) => {
    console.log(JSON.stringify({ seen: r.seen, finished: r.finished, errors: r.errors }, null, 1));
    process.exit(r.finished && !r.errors.length ? 0 : 1);
  });
}
