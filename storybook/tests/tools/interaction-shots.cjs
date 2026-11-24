// Screenshots every interaction type on top of a real scene, before and
// after a few taps, for visual review. Usage: node tests/tools/interaction-shots.cjs <outDir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve } = require('./serve.cjs');

const outDir = process.argv[2];
fs.mkdirSync(outDir, { recursive: true });
const SPECS = {
  count_tap: { type: 'count_tap', img: 'mushroom', n: 12, one: 'mushroom', many: 'mushrooms' },
  carry_glow: { type: 'carry_glow', n: 4, targetImg: 'lantern' },
  sort_basket: { type: 'sort_basket', img: 'apple', n: 4, one: 'apple', many: 'apples' },
  numeral_pick: { type: 'numeral_pick', n: 7, options: [5, 7, 9], img: 'star', many: 'stars', showNumerals: true },
  music_stones: { type: 'music_stones', n: 5 },
  shake_tree: { type: 'shake_tree', fruitImg: 'apple', n: 6, one: 'apple', many: 'apples', bonusImg: 'key' },
  find_hidden: { type: 'find_hidden', spot: 'leafpile', spots: 4, findImg: 'butterfly', findName: 'a butterfly', extras: ['apple', 'ladybird'] },
  move_clouds: { type: 'move_clouds', revealImg: 'moon', revealName: 'the moon', n: 3 },
  rub_reveal: { type: 'rub_reveal', cover: 'snow', revealImg: 'crystal', revealName: 'a crystal' },
  follow_footprints: { type: 'follow_footprints', steps: 5, revealImg: 'fox', revealName: 'Rosie' },
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

(async () => {
  const srv = await serve(path.resolve(__dirname, '../..'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 820, height: 640 } });
  await pg.goto(`${srv.url}/tests/harness.html`);
  await pg.waitForFunction(() => document.title === 'ready');
  await pg.evaluate(async () => {
    const { paintScene } = await import('./js/render/scene.js');
    const { WORLDS } = await import('./js/content/worlds.js');
    const bg = document.createElement('div');
    bg.className = 'scene-bg';
    bg.innerHTML = paintScene('forest', WORLDS.whispering_woods.locations.berry_bushes);
    document.querySelector('.illus').prepend(bg);
  });
  for (const [t, spec] of Object.entries(SPECS)) {
    await pg.evaluate((s) => window.harness.mount(s), spec);
    await pg.waitForTimeout(500);
    await pg.screenshot({ path: path.join(outDir, `${t}-1.png`), clip: { x: 0, y: 0, width: 820, height: 620 } });
    await pg.evaluate(() => window.harness.help());
    await pg.waitForTimeout(2600);
    await pg.screenshot({ path: path.join(outDir, `${t}-2.png`), clip: { x: 0, y: 0, width: 820, height: 620 } });
  }
  await b.close();
  srv.close();
})();
