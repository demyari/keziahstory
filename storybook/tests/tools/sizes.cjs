// Screenshots the cover, a story page (before and after its interaction) and
// the Discovery Book at many screen sizes, and checks for sideways overflow.
// Usage: node tests/tools/sizes.cjs <outDir> [world] [seed]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve } = require('./serve.cjs');

const [outDir, world = 'whispering_woods', seed = 'SIZE-1'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const SIZES = [[320, 568], [360, 740], [390, 844], [430, 932], [844, 390], [768, 1024], [1024, 768], [1180, 820], [1366, 1024]];

(async () => {
  const srv = await serve(path.resolve(__dirname, '../..'));
  const b = await chromium.launch();
  const errors = [];
  for (const [w, h] of SIZES) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true });
    pg.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
    await pg.goto(`${srv.url}/index.html`);
    await pg.waitForTimeout(900);
    await pg.screenshot({ path: path.join(outDir, `${w}x${h}-0cover.png`) });
    await pg.evaluate(({ world, seed }) => { const s = window.__storybook; s.settings.narration = false; s.session.start({ worldId: world, seed }); s.showPage(); }, { world, seed });
    await pg.waitForTimeout(900);
    const cards = await pg.$$('.view:not(.leaving) .choice-card');
    await cards[0].click();
    await pg.waitForTimeout(1200);
    await pg.screenshot({ path: path.join(outDir, `${w}x${h}-1scene.png`) });
    await pg.waitForSelector('.view:not(.leaving) .help-btn', { timeout: 12000 }).catch(() => {});
    await pg.click('.view:not(.leaving) .help-btn').catch(() => {});
    await pg.waitForSelector('.view:not(.leaving) .choice-card', { timeout: 30000 }).catch(() => errors.push(`${w}x${h}: choices never appeared`));
    await pg.waitForTimeout(1500);
    await pg.screenshot({ path: path.join(outDir, `${w}x${h}-2choices.png`) });
    const vis = await pg.evaluate(() => {
      const c = document.querySelector('.view:not(.leaving) .choice-card');
      if (!c) return false;
      const r = c.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    if (!vis) errors.push(`${w}x${h}: choice cards not visible on screen`);
    const over = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (over) errors.push(`${w}x${h}: horizontal overflow`);
    await pg.evaluate(() => window.__storybook.showCollection());
    await pg.waitForTimeout(1200);
    await pg.screenshot({ path: path.join(outDir, `${w}x${h}-3book.png`) });
    await pg.close();
  }
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await b.close();
  srv.close();
})();
