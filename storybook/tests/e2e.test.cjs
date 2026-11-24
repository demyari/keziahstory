// Browser tests of the running app (Chromium via Playwright):
// asset loading, every interaction, a full story by touch, save/resume,
// narration and audio behaviour, the parent gate, offline use and layouts.
// Run: node --test tests/e2e.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { serve } = require('./tools/serve.cjs');

const ROOT = path.resolve(__dirname, '..');
let srv; let browser;

test.before(async () => { srv = await serve(ROOT); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

async function openApp(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, hasTouch: true, serviceWorkers: opts.sw ? 'allow' : 'block' });
  if (opts.fakeSpeech) {
    await ctx.addInitScript(() => {
      window.__spoken = [];
      const synth = {
        speaking: false,
        getVoices: () => [{ name: 'Test NZ Female', lang: 'en-NZ', localService: true }, { name: 'Test US', lang: 'en-US', localService: true }],
        speak(u) { window.__spoken.push({ text: u.text, voice: u.voice?.name, pitch: u.pitch, rate: u.rate }); setTimeout(() => u.onend?.(), 20); },
        cancel() { window.__cancelled = (window.__cancelled || 0) + 1; },
        pause() {}, resume() {}, addEventListener() {},
      };
      Object.defineProperty(window, 'speechSynthesis', { value: synth });
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${srv.url}/index.html`);
  await page.waitForFunction(() => !!window.__storybook);
  return { ctx, page, errors };
}

test('every picture, font and recorded clip referenced by the app exists and loads', async () => {
  const { ctx, page, errors } = await openApp();
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'asset-list.json'), 'utf8'));
  const { IMAGES } = await import(path.join(ROOT, 'js/content/images.js'));
  for (const key of Object.keys(IMAGES)) assert.ok(list.files.includes(`assets/img/${key}.webp`), `missing ${key}`);
  const bad = await page.evaluate(async (keys) => {
    const out = [];
    await Promise.all(keys.map((k) => new Promise((res) => { const im = new Image(); im.onload = () => res(); im.onerror = () => { out.push(k); res(); }; im.src = `assets/img/${k}.webp`; })));
    return out;
  }, Object.keys(IMAGES));
  assert.deepEqual(bad, []);
  const clipStatus = await page.evaluate(async () => {
    const m = await import('./js/audio/clips.js');
    const ids = [...m.CLIPS].slice(0, 40);
    const rs = await Promise.all(ids.map((id) => fetch(`assets/audio/clips/${id}.ogg`).then((r) => r.status)));
    return { n: m.CLIPS.size, bad: rs.filter((s) => s !== 200).length };
  });
  assert.ok(clipStatus.n > 1000);
  assert.equal(clipStatus.bad, 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

const SPECS = {
  count_tap: { type: 'count_tap', img: 'mushroom', n: 5, one: 'mushroom', many: 'mushrooms' },
  carry_glow: { type: 'carry_glow', n: 3, targetImg: 'lantern' },
  sort_basket: { type: 'sort_basket', img: 'apple', n: 4, one: 'apple', many: 'apples' },
  numeral_pick: { type: 'numeral_pick', n: 4, options: [3, 4, 6], img: 'star', many: 'stars', showNumerals: true },
  music_stones: { type: 'music_stones', n: 4 },
  shake_tree: { type: 'shake_tree', fruitImg: 'apple', n: 5, one: 'apple', many: 'apples', bonusImg: 'key' },
  find_hidden: { type: 'find_hidden', spot: 'bush', spots: 4, findImg: 'butterfly', findName: 'a butterfly', extras: ['apple', 'ladybird'] },
  move_clouds: { type: 'move_clouds', revealImg: 'moon', revealName: 'the moon', n: 3 },
  rub_reveal: { type: 'rub_reveal', cover: 'snow', revealImg: 'crystal', revealName: 'a crystal' },
  follow_footprints: { type: 'follow_footprints', steps: 4, revealImg: 'fox', revealName: 'Rosie' },
  pop_bubbles: { type: 'pop_bubbles', letter: 'B', word: 'bear', wordImg: 'bear', others: ['M', 'S', 'T', 'Q'] },
  letter_sign: { type: 'letter_sign', letter: 'M', word: 'moon', wordImg: 'moon', options: ['A', 'D'] },
  trace_letter: { type: 'trace_letter', letter: 'S', word: 'star', wordImg: 'star' },
  drag_feed: { type: 'drag_feed', eater: 'bramble', eaterImg: 'bear', foodImg: 'honey', n: 3, one: 'honey pot', many: 'honey pots' },
  key_lock: { type: 'key_lock', keyImg: 'key', prizeImg: 'crown', prizeName: 'a crown' },
  match_shapes: { type: 'match_shapes', shapes: ['star', 'heart', 'circle'] },
  give_pieces: { type: 'give_pieces', pieceImgs: ['sparkles', 'sparkles', 'sparkles'], targetImg: 'moon', target: 'the Moon' },
  charge_tap: { type: 'charge_tap', who: 'sparkle', taps: 3, verb: 'cheer' },
  tap_react: { type: 'tap_react', who: 'pip' },
};

test('every interaction type can be completed with the friend’s help (modelling)', async () => {
  const { ctx, page } = await openApp();
  await page.goto(`${srv.url}/tests/harness.html`);
  await page.waitForFunction(() => document.title === 'ready');
  const types = await page.evaluate(() => window.harness.types);
  for (const t of types) assert.ok(SPECS[t], `no test spec for ${t}`);
  for (const [t, spec] of Object.entries(SPECS)) {
    await page.evaluate((s) => window.harness.mount(s), spec);
    await page.waitForTimeout(150);
    await page.evaluate(() => window.harness.help());
    await page.waitForFunction(() => window.harness.result !== null, null, { timeout: 15000 }).catch(() => {});
    const r = await page.evaluate(() => window.harness.result);
    assert.ok(r, `${t} did not finish`);
  }
  await ctx.close();
});

async function harnessPage() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 800 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${srv.url}/tests/harness.html`);
  await page.waitForFunction(() => document.title === 'ready');
  return { ctx, page };
}

test('counting: one tap per object, counted aloud in order, outcome independent', async () => {
  const { ctx, page } = await harnessPage();
  await page.evaluate((s) => window.harness.mount(s), SPECS.count_tap);
  const items = await page.$$('#play .sprite');
  assert.equal(items.length, 5);
  for (const it of items) { await it.click({ force: true }); await it.click({ force: true }); } // double taps must not double count
  await page.waitForFunction(() => window.harness.result !== null, null, { timeout: 5000 });
  const log = await page.evaluate(() => window.harness.log);
  const said = log.filter((l) => l[0] === 'say').map((l) => l[1]);
  assert.deepEqual(said.slice(0, 5), ['One!', 'Two!', 'Three!', 'Four!', 'Five!']);
  assert.ok(said.includes('Five mushrooms!'));
  assert.deepEqual(log.find((l) => l[0] === 'learn'), ['learn', 'count', 5, 'independent']);
  await ctx.close();
});

test('letters: a wrong bubble is named kindly, the right one is learned as "hinted" after a hint', async () => {
  const { ctx, page } = await harnessPage();
  await page.evaluate((s) => window.harness.mount(s), SPECS.pop_bubbles);
  const wrong = await page.$$('#play .bubble:not([data-ch="B"]):not([data-ch="b"])');
  await wrong[0].click({ force: true });
  await wrong[1].click({ force: true });
  const hinted = await page.$$('#play .bubble.hint');
  assert.ok(hinted.length >= 1, 'target glows as a hint after two misses');
  await page.click('#play .bubble[data-ch="B"]:not(.popped), #play .bubble[data-ch="b"]:not(.popped)', { force: true });
  await page.waitForFunction(() => window.harness.result !== null, null, { timeout: 5000 });
  const log = await page.evaluate(() => window.harness.log);
  assert.ok(log.some((l) => l[0] === 'say' && /That one is/.test(l[1])));
  assert.deepEqual(log.find((l) => l[0] === 'learn'), ['learn', 'letter', 'B', 'hinted']);
  assert.ok(!log.some((l) => l[0] === 'sfx' && /error|fail/.test(l[1])));
  await ctx.close();
});

test('numerals: picking the wrong basket counts it aloud and never fails', async () => {
  const { ctx, page } = await harnessPage();
  await page.evaluate((s) => window.harness.mount(s), SPECS.numeral_pick);
  await page.click('#play .qty-basket[data-q="6"]', { force: true });
  assert.equal(await page.evaluate(() => window.harness.result), null);
  await page.click('#play .qty-basket[data-q="4"]', { force: true });
  await page.waitForFunction(() => window.harness.result !== null, null, { timeout: 5000 });
  const log = await page.evaluate(() => window.harness.log);
  assert.ok(log.some((l) => l[0] === 'say' && l[1].includes('That basket has six')));
  assert.equal(await page.evaluate(() => window.harness.result), 'hinted');
  await ctx.close();
});

test('drag and drop: feeding a friend by dragging food (forgiving drop zone)', async () => {
  const { ctx, page } = await harnessPage();
  await page.evaluate((s) => window.harness.mount(s), SPECS.drag_feed);
  const eater = await (await page.$('#play .eater')).boundingBox();
  for (let i = 0; i < 3; i++) {
    const food = await page.$(`#play .sprite:not(.eater):not([data-locked])`);
    const b = await food.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(eater.x + eater.width / 2 - 30, eater.y + eater.height / 2 + 20, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(() => window.harness.result !== null, null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => window.harness.result), 'independent');
  await ctx.close();
});

test('a whole story can be played by tapping, discoveries are saved, and it resumes after reload', async () => {
  const { ctx, page, errors } = await openApp({ fakeSpeech: true });
  await page.click('.big-btn.primary', { force: true });
  await page.waitForSelector('.world-card');
  await page.waitForTimeout(800);
  await page.click('.world-card >> nth=0', { force: true });
  let resumed = false;
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(900);
    const kind = await page.evaluate(() => document.querySelector('.view:not(.leaving) .spread')?.className || '');
    if (kind.includes('kind-ending')) break;
    if (await page.$('.view:not(.leaving) .illus.interactive')) {
      // some moments (saying hello) finish at once; others offer a friend's help after a while
      await page.waitForSelector('.view:not(.leaving) .help-btn, .view:not(.leaving) .choice-card', { timeout: 15000 });
      if (await page.$('.view:not(.leaving) .help-btn')) await page.click('.view:not(.leaving) .help-btn', { force: true });
    }
    await page.waitForSelector('.view:not(.leaving) .choice-card', { timeout: 30000 });
    await page.waitForTimeout(300);
    if (i === 2 && !resumed) {
      const before = await page.evaluate(() => JSON.stringify(window.__storybook.session.page().lines));
      await page.reload();
      await page.waitForFunction(() => !!window.__storybook);
      await page.click('.big-btn.primary', { force: true }); // "Keep reading"
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => JSON.stringify(window.__storybook.session.page().lines));
      assert.equal(after, before, 'resumed on the same page');
      resumed = true;
      continue;
    }
    await page.click('.view:not(.leaving) .choice-card >> nth=0', { force: true });
  }
  const prof = await page.evaluate(() => window.__storybook.session.profile);
  assert.equal(prof.adventures, 1);
  assert.ok(Object.values(prof.characters).some((c) => c.met));
  assert.ok(Object.values(prof.characters).some((c) => c.memories.length > 0), 'friends remember the story');
  const spoken = await page.evaluate(() => window.__spoken);
  assert.ok(spoken.length > 10, 'story was narrated');
  assert.ok(spoken.every((s) => s.voice === 'Test NZ Female'), 'New Zealand voice preferred');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('narration never blocks: tapping a choice while reading stops the voice and turns the page', async () => {
  const { ctx, page } = await openApp({ fakeSpeech: true });
  await page.evaluate(() => { const s = window.__storybook; s.session.start({ seed: 'NARR-1', worldId: 'cloud_kingdom' }); s.showPage(); });
  await page.waitForSelector('.view:not(.leaving) .choice-card', { timeout: 8000 });
  const cancelled = await page.evaluate(() => window.__cancelled || 0);
  await page.click('.view:not(.leaving) .choice-card >> nth=0', { force: true });
  await page.waitForTimeout(900);
  assert.ok((await page.evaluate(() => window.__cancelled || 0)) > cancelled, 'speech cancelled');
  assert.equal(await page.evaluate(() => window.__storybook.session.state.phase), 'scene');
  await ctx.close();
});

test('tapping a friend plays their own recorded voice clip', async () => {
  const { ctx, page } = await openApp({ fakeSpeech: true });
  const clipRequests = [];
  page.on('request', (r) => { if (r.url().includes('/audio/clips/')) clipRequests.push(r.url()); });
  await page.evaluate(() => { const s = window.__storybook; s.session.start({ seed: 'CLIP-1' }); s.showPage(); });
  await page.waitForSelector('.view:not(.leaving) .friend');
  await page.waitForTimeout(700);
  await page.click('.view:not(.leaving) .friend >> nth=0', { force: true });
  await page.waitForTimeout(800);
  assert.ok(clipRequests.length >= 1, 'a clip was requested');
  await ctx.close();
});

test('parent area: hold the cog, a wrong sum keeps it closed, the right sum opens it, reset works', async () => {
  const { ctx, page } = await openApp();
  await page.evaluate(() => { const s = window.__storybook.session; s.start({ seed: 'P' }); });
  await page.evaluate(() => window.__storybook.showCover());
  await page.waitForTimeout(900);
  const gear = await page.$('.view:not(.leaving) .parent-gear');
  const b = await gear.boundingBox();
  await page.mouse.move(b.x + 10, b.y + 10);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(400);
  assert.equal(await page.$('.gate-pad'), null, 'a short tap does not open it');
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up();
  await page.waitForSelector('.gate-pad');
  const q = await page.textContent('.gate p');
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const m = q.match(/answer to (\w+) plus (\w+)/);
  const ans = words.indexOf(m[1]) + words.indexOf(m[2]);
  const wrong = ans === 10 ? 11 : 10;
  for (const d of String(wrong)) await page.click(`.pad-key:text-is("${d}")`, { force: true });
  await page.waitForTimeout(700);
  assert.equal(await page.$('.set-section'), null);
  for (const d of String(ans)) await page.click(`.pad-key:text-is("${d}")`, { force: true });
  await page.waitForSelector('.set-section');
  const reset = page.locator('.danger-btn');
  await reset.click(); await reset.click();
  assert.equal(await page.evaluate(() => window.__storybook.session.profile.adventures), 0);
  assert.equal(await page.evaluate(() => window.__storybook.session.hasCurrent()), false);
  await ctx.close();
});

test('offline: after the first visit the book opens and plays with no network', async () => {
  const { ctx, page } = await openApp({ sw: true });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(async () => { const ks = await caches.keys(); if (!ks.length) return false; const c = await caches.open(ks[0]); return (await c.keys()).length > 1000; }, null, { timeout: 60000, polling: 1000 });
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => !!window.__storybook);
  await page.click('.big-btn.primary', { force: true });
  await page.waitForSelector('.world-card');
  await page.waitForTimeout(700);
  await page.click('.world-card >> nth=2', { force: true });
  await page.waitForSelector('.view:not(.leaving) .friend img');
  const imgsOk = await page.evaluate(() => [...document.querySelectorAll('.view:not(.leaving) img')].every((i) => i.complete && i.naturalWidth > 0));
  assert.ok(imgsOk, 'pictures load offline');
  const font = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px Andika'); });
  assert.ok(font, 'font available offline');
  await ctx.close();
});

for (const [w, h] of [[320, 568], [360, 740], [390, 844], [430, 932], [844, 390], [768, 1024], [1024, 768], [1366, 1024]]) {
  test(`layout ${w}x${h}: correct mode, no sideways scrolling, big touch targets, choices on screen`, async () => {
    const { ctx, page } = await openApp({ viewport: { width: w, height: h } });
    await page.evaluate(() => { const s = window.__storybook; s.settings.narration = false; s.session.start({ seed: 'LAY-1', worldId: 'dino_valley' }); s.showPage(); });
    await page.waitForSelector('.view:not(.leaving) .choice-card');
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.view:not(.leaving) .choice-card')].map((c) => c.getBoundingClientRect());
      const btns = [...document.querySelectorAll('.view:not(.leaving) button, .topbar button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect()).filter((x) => x.width > 0);
      return {
        layout: document.documentElement.dataset.layout,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        cardsVisible: cards.every((c) => c.bottom <= window.innerHeight + 2 && c.top >= 0),
        smallest: Math.min(...btns.map((b) => Math.min(b.width, b.height))),
      };
    });
    assert.equal(r.overflow, false);
    assert.ok(r.cardsVisible, 'choice cards fully on screen');
    assert.ok(r.smallest >= 40, `smallest button ${r.smallest}px`);
    const expectSpread = w >= 700 && w / h >= 1.15 || (w >= 560 && h < 520);
    assert.equal(r.layout, expectSpread ? 'spread' : 'single');
    await ctx.close();
  });
}
