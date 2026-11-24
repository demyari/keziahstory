// Drives a whole story in the real app (Chromium) and screenshots every page.
// Usage: node tests/tools/flow.cjs <outDir> <width> <height> [world] [maxPages] [seed]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve } = require('./serve.cjs');

const [outDir, w, h, world = 'moon_garden', maxPages = '9', seed = 'TEST-1'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const srv = await serve(path.resolve(__dirname, '../..'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: +w, height: +h }, hasTouch: true });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.goto(`${srv.url}/index.html`);
  await pg.waitForTimeout(800);
  await pg.evaluate(({ world, seed }) => { const s = window.__storybook; s.settings.narration = false; s.session.start({ worldId: world, seed }); s.showPage(); }, { world, seed });
  for (let i = 0; i < +maxPages; i++) {
    await pg.waitForTimeout(1300);
    await pg.screenshot({ path: path.join(outDir, `p${i}-a.png`) });
    const hasInter = await pg.evaluate(() => !!document.querySelector('.view:not(.leaving) .illus.interactive'));
    if (hasInter) {
      await pg.waitForSelector('.view:not(.leaving) .help-btn', { timeout: 12000 }).catch(() => {});
      await pg.click('.view:not(.leaving) .help-btn').catch(() => {});
      await pg.waitForSelector('.view:not(.leaving) .choice-card', { timeout: 30000 }).catch(() => errors.push(`no choices after help on page ${i}`));
      await pg.waitForTimeout(1200);
      await pg.screenshot({ path: path.join(outDir, `p${i}-b.png`) });
    }
    const kind = await pg.evaluate(() => document.querySelector('.view:not(.leaving) .spread')?.className);
    const ev = await pg.evaluate(() => window.__storybook.session.page()?.event);
    console.log(i, kind, ev || '');
    if (kind.includes('kind-ending')) break;
    const cards = await pg.$$('.view:not(.leaving) .choice-card');
    if (!cards.length) { errors.push(`no choices on page ${i}`); break; }
    await cards[0].click();
  }
  console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no errors');
  await b.close();
  srv.close();
})();
