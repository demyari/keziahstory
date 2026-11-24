// Plays a few stories automatically, then screenshots the world picker, the
// Discovery Book tabs and details, and the parent area.
// Usage: node tests/tools/screens.cjs <outDir> <width> <height>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve } = require('./serve.cjs');
const [outDir, w, h] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const srv = await serve(path.resolve(__dirname, '../..'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: +w, height: +h }, hasTouch: true });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(`${srv.url}/index.html`);
  await pg.waitForFunction(() => !!window.__storybook);
  await pg.evaluate(() => {
    const { session, settings } = window.__storybook;
    settings.narration = false;
    const worlds = ['moon_garden', 'seashell_cove', 'whispering_woods', 'dino_valley'];
    worlds.forEach((wid, i) => {
      session.start({ worldId: wid, seed: `SHOT-${i}` });
      if (i === 0) session.findHiddenSecret('blue_butterfly', 'the Star Pond');
      while (session.state.phase !== 'ending') {
        const p = session.page();
        if (p.interaction?.letter) session.learning('letter', p.interaction.letter, i % 2 ? 'independent' : 'hinted', { word: p.interaction.word });
        if (p.interaction?.n) session.learning('count', p.interaction.n, 'independent', { img: p.interaction.img || p.interaction.foodImg || 'star', many: p.interaction.many || 'stars' });
        session.choose(p.choices[0].id);
      }
    });
    session.takeDiscoveries();
  });
  const shot = async (name) => { await pg.waitForTimeout(1100); await pg.screenshot({ path: path.join(outDir, `${name}.png`) }); };
  await pg.evaluate(() => window.__storybook.showCover()); await shot('a-cover');
  await pg.click('.big-btn.primary', { force: true }); await shot('b-worlds');
  await pg.evaluate(() => window.__storybook.showCollection()); await shot('c-letters');
  await pg.click('.letter-tile.found >> nth=0', { force: true }); await shot('d-letter');
  if (await pg.$('.detail-back')) await pg.click('.detail-back', { force: true });
  await pg.click('.ribbon-numbers', { force: true }); await shot('e-numbers');
  await pg.click('.number-tile.found >> nth=2', { force: true }); await shot('f-number');
  if (await pg.$('.detail-back')) await pg.click('.detail-back', { force: true });
  await pg.click('.ribbon-friends', { force: true }); await shot('g-friends');
  await pg.click('.friend-tile.found >> nth=0', { force: true }); await shot('h-friend');
  if (await pg.$('.detail-back')) await pg.click('.detail-back', { force: true });
  await pg.click('.ribbon-worlds', { force: true }); await shot('i-worlds');
  await pg.click('.world-tile.found >> nth=0', { force: true }); await shot('j-world');
  await pg.evaluate(() => window.__storybook.showCover());
  await pg.waitForTimeout(900);
  await pg.evaluate(async () => { const { renderParent } = await import('./js/ui/parent.js'); const { turnTo } = await import('./js/render/book.js'); const s = window.__storybook; turnTo(document.querySelector('.pages'), renderParent({ session: s.session, settings: s.settings, saveSettings() {}, store: s.store, onClose() {}, onStartSeed() {} })); });
  await shot('k-parent');
  await pg.evaluate(() => document.querySelector('.view:not(.leaving) .spread').scrollTo(0, 1400));
  await shot('l-parent2');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await b.close(); srv.close();
})();
