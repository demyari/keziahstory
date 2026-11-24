// "Poppy's Picnic": a hand-written story. Each chapter is one scene. The
// story only moves forward when the child does the thing in the picture.
// What the child chooses is kept in st.state and shows up later:
//   path   'forest' (Owl + cherries)  or  'pond' (Duck + mushrooms)
//   shared true (Pig gets a carrot, later brings a cake)  or  false

import { GROUND } from './stage.js';
import * as sfx from './sfx.js';

const P = 1.45; // Poppy's size
const FRIEND_ART = { owl: ['a_owl', 1.4], duck: ['duckling', 1.8], pig: ['a_pig', 1.4], bear: ['a_bear', 1.8] };

function newState() {
  return { path: null, shared: null, items: {}, friends: [] };
}

/** Poppy and whoever has joined her, entering from the left. */
async function enterParty(st, toX = 330) {
  const poppy = st.friend('poppy_stand', -160, GROUND, P);
  const party = [poppy];
  st.state.friends.forEach((id, i) => {
    const [key, sc] = FRIEND_ART[id];
    party.push(st.friend(key, -360 - i * 200, GROUND, sc));
  });
  await st.travel(party, toX);
  return party;
}

async function leave(st, party, name) {
  await st.travel(party, st.W + 240 + party.length * 210);
  await st.next(name);
}

function pokePoppy(st, poppy) {
  st.touchable(poppy);
  let k = 0;
  poppy.on('pointerdown', () => { st.bounce(poppy, 50); st.speak(k++ % 2 ? 'p_tap2' : 'p_tap1'); st.sparkle(poppy.x, poppy.y - 190, 5); });
}

function grassTufts(st, n = 6) {
  for (let i = 0; i < n; i++) st.prop(i % 2 ? 'grass1' : 'grass2', (st.W / n) * (i + 0.5) + Phaser.Math.Between(-50, 50), GROUND + Phaser.Math.Between(40, 190), 0.9);
}

const CHAPTERS = {
  // ---------------------------------------------------------------- title
  async title(st) {
    st.state = newState();
    st.backdrop('bg_grass'); st.clouds(3);
    st.prop('houseAlt2', st.cx - 520, GROUND + 6, 0.95);
    st.prop('tree', st.cx + 520, GROUND + 4, 1.0);
    st.prop('bush1', st.cx + 330, GROUND + 14, 0.9);
    grassTufts(st, 5);
    const title = st.add.text(st.cx, 150, "Poppy's Picnic", { fontFamily: 'Fredoka, sans-serif', fontSize: '128px', fontStyle: '600', color: '#ffffff', stroke: '#ff7a9a', strokeThickness: 18 }).setOrigin(0.5).setDepth(100);
    st.tweens.add({ targets: title, y: 162, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const poppy = st.friend('poppy_stand', st.cx - 170, GROUND + 60, 1.9);
    st.tweens.add({ targets: poppy, y: poppy.y - 26, duration: 420, yoyo: true, repeat: -1, ease: 'Quad.out', repeatDelay: 500 });
    // a big, obvious play button
    const btn = st.add.container(st.cx + 230, GROUND - 90).setDepth(900);
    const disc = st.add.circle(0, 0, 118, 0xffd166).setStrokeStyle(14, 0xffffff);
    const tri = st.add.triangle(12, 0, -34, -52, -34, 52, 56, 0, 0xffffff);
    btn.add([disc, tri]);
    btn.setSize(260, 260);
    btn.setInteractive(new Phaser.Geom.Circle(130, 130, 150), Phaser.Geom.Circle.Contains);
    btn.baseScale = 1; btn.spot = [0, 0];
    await st.tap(btn);
    st.sparkle(btn.x, btn.y, 14);
    st.say('title');
    await st.wait(1300);
    await st.next('home');
  },

  // ---------------------------------------------------------------- 1. wake up
  async home(st) {
    st.state = newState();
    st.backdrop('bg_grass'); st.clouds(2);
    st.homeButton();
    const house = st.prop('houseAlt2', st.cx - 360, GROUND + 6, 1.15);
    st.prop('fence', st.cx + 60, GROUND + 8, 0.8);
    st.prop('fence', st.cx + 226, GROUND + 8, 0.8);
    st.prop('tree', st.cx + 520, GROUND + 4, 1.05);
    st.prop('bush2', st.cx - 610, GROUND + 12, 1.2);
    grassTufts(st);
    // early morning: a sleepy blue wash and a low sun
    const dusk = st.add.rectangle(0, 0, st.W, st.H, 0x2a2a6e, 0.5).setOrigin(0).setDepth(3000);
    const sun = st.add.image(st.cx + 330, 500, 'sun').setScale(1.5).setTint(0xffd84a).setDepth(3100);
    const zzz = st.add.text(house.x + 60, house.y - 520, 'z z z', { fontFamily: 'Fredoka, sans-serif', fontSize: '84px', color: '#ffffff' }).setDepth(3100).setOrigin(0.5);
    st.tweens.add({ targets: zzz, y: zzz.y - 40, alpha: 0.2, duration: 1500, yoyo: true, repeat: -1 });
    st.say('s1_a');
    await st.tap(sun);
    sfx.play('chime');
    zzz.destroy();
    st.tweens.add({ targets: dusk, alpha: 0, duration: 1600 });
    await st.tween({ targets: sun, y: 150, x: st.cx + 420, duration: 1600, ease: 'Sine.out' });
    sun.setDepth(-80);
    st.tweens.add({ targets: sun, angle: 360, duration: 24000, repeat: -1 });
    st.sparkle(sun.x, sun.y, 12);
    // Poppy pops out of her front door
    const poppy = st.friend('poppy_jump', house.x + 40, GROUND + 10, 0.1);
    poppy.breath.stop();
    await st.tween({ targets: poppy, scale: P, duration: 380, ease: 'Back.out' });
    poppy.baseScale = P; poppy.setTexture('poppy_stand'); poppy.shadow.setScale(P);
    st.bounce(poppy, 70);
    await st.say('s1_b');
    await st.hop(poppy, st.cx - 40);
    await st.say('p_wake', poppy);
    st.state.started = true;
    await leave(st, [poppy], 'garden');
  },

  // ---------------------------------------------------------------- 2. carrots
  async garden(st) {
    st.backdrop('bg_grass'); st.clouds(3);
    st.homeButton(); st.drawBasket();
    st.prop('houseSmallAlt1', st.cx - 560, GROUND - 6, 1.3).setAlpha(0.95);
    st.prop('fence', st.cx + 520, GROUND + 6, 0.8);
    st.prop('bush3', st.cx + 640, GROUND + 14, 1.2);
    // the vegetable patch: soil with three carrots tucked in
    const soilY = GROUND + 96;
    const soil = st.add.graphics().setDepth(soilY - 5);
    soil.fillStyle(0x8a5a3a, 1); soil.fillRoundedRect(st.cx - 360, soilY - 34, 820, 120, 56);
    // the front lip of the soil hides the bottom of each carrot
    const lip = st.add.graphics().setDepth(soilY + 30);
    lip.fillStyle(0x7a4e31, 1); lip.fillRoundedRect(st.cx - 360, soilY + 26, 820, 60, { tl: 0, tr: 0, bl: 56, br: 56 });
    const party = await enterParty(st, st.cx - 520);
    pokePoppy(st, party[0]);
    st.say('s2_a');
    const carrots = [0, 1, 2].map((i) => {
      const c = st.add.image(st.cx - 170 + i * 250, soilY + 8, 'carrot').setScale(2.6).setAngle(45).setDepth(soilY + 10);
      c.baseScale = 2.6;
      return c;
    });
    let pulled = 0;
    const left = carrots.slice();
    while (left.length) {
      const c = await st.tapOne(left);
      left.splice(left.indexOf(c), 1);
      pulled++;
      sfx.play('pop');
      c.setDepth(7000);
      await st.tween({ targets: c, y: c.y - 230, angle: 20, duration: 300, ease: 'Back.out' });
      st.number(pulled, c.x, c.y - 120);
      st.sparkle(c.x, c.y, 6);
      await st.wait(650);
      await st.collect(c, 'carrot');
    }
    await st.say('s2_b');
    st.bounce(party[0], 60);
    await leave(st, party, 'crossroads');
  },

  // ---------------------------------------------------------------- 3. which way?
  async crossroads(st) {
    st.backdrop('bg_grass'); st.clouds(2);
    st.homeButton(); st.drawBasket();
    // two paths
    const paths = st.add.graphics().setDepth(GROUND - 50);
    paths.fillStyle(0xf2dfb0, 1);
    paths.fillTriangle(st.cx - 60, st.H, st.cx + 60, st.H, st.cx - 520, GROUND + 20);
    paths.fillTriangle(st.cx - 60, st.H, st.cx - 520, GROUND + 20, st.cx - 640, GROUND + 20);
    paths.fillTriangle(st.cx - 60, st.H, st.cx + 60, st.H, st.cx + 520, GROUND + 20);
    paths.fillTriangle(st.cx + 60, st.H, st.cx + 520, GROUND + 20, st.cx + 640, GROUND + 20);
    // the forest on the left, with Owl peeking out
    const forest = st.add.container(st.cx - 560, GROUND).setDepth(GROUND - 10).setScale(1.25);
    forest.add([st.add.image(-110, 10, 'treePine').setOrigin(0.5, 1).setScale(0.8), st.add.image(110, 10, 'treePine').setOrigin(0.5, 1).setScale(0.9),
      st.add.image(0, 20, 'treePine').setOrigin(0.5, 1).setScale(1.05), st.add.image(10, -250, 'a_owl').setScale(1.1)]);
    forest.setSize(460, 620); forest.baseScale = 1.25; forest.spot = [0, -300];
    forest.setInteractive(new Phaser.Geom.Rectangle(-30, -340, 520, 720), Phaser.Geom.Rectangle.Contains);
    // the pond on the right, with Duck paddling
    const pond = st.add.container(st.cx + 540, GROUND + 50).setDepth(GROUND - 10).setScale(1.25);
    const water = st.add.graphics();
    water.fillStyle(0x4fb3e8, 1); water.fillEllipse(0, 0, 460, 150);
    water.fillStyle(0x8fd3f7, 1); water.fillEllipse(-60, -16, 180, 30); water.fillEllipse(90, 26, 120, 20);
    const duck = st.add.image(20, -50, 'duckling').setScale(1.4);
    pond.add([water, duck]);
    pond.setSize(460, 300); pond.baseScale = 1.25; pond.spot = [0, -10];
    pond.setInteractive(new Phaser.Geom.Rectangle(-40, -80, 540, 420), Phaser.Geom.Rectangle.Contains);
    st.tweens.add({ targets: duck, x: 70, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const poppy = st.friend('poppy_stand', st.cx, GROUND + 180, P);
    pokePoppy(st, poppy);
    await st.say('s3_a');
    const pick = await st.tapOne([forest, pond]);
    st.state.path = pick === forest ? 'forest' : 'pond';
    st.sparkle(pick.x, pick.y - 120, 12);
    await st.hop(poppy, pick === forest ? -200 : st.W + 200, { hopLen: 170 });
    await st.next(st.state.path);
  },

  // ---------------------------------------------------------------- 4a. forest: Owl and the cherry tree
  async forest(st) {
    st.backdrop('bg_forest'); st.clouds(2);
    st.homeButton(); st.drawBasket();
    st.prop('treePine', st.cx - 620, GROUND - 6, 0.9); st.prop('treePine', st.cx + 640, GROUND - 4, 1.0);
    const tree = st.prop('tree', st.cx + 230, GROUND + 40, 1.55);
    const owl = st.add.image(tree.x + 4, tree.y - 400, 'a_owl').setScale(1.15).setDepth(tree.depth + 1);
    const spots = [[-105, -520], [100, -500], [-110, -270], [105, -250]];
    const cherries = spots.map(([dx, dy]) => st.add.image(tree.x + dx, tree.y + dy, 'cherry').setScale(1.7).setDepth(tree.depth + 2));
    const party = await enterParty(st, st.cx - 400);
    pokePoppy(st, party[0]);
    await st.say('s4a_a');
    st.say('o_hi', owl);
    let fallen = 0;
    const onGround = [];
    while (fallen < 4) {
      await st.tap(tree, { pulse: fallen === 0 });
      sfx.play('shake');
      st.tweens.add({ targets: [tree, owl], angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => { tree.setAngle(0); owl.setAngle(0); } });
      const c = cherries[fallen];
      fallen++;
      const n = fallen;
      st.tweens.add({ targets: c, y: GROUND + 90 + (n % 2) * 30, x: c.x + (n - 2.5) * 40, duration: 520, ease: 'Bounce.out', onComplete: () => { c.setDepth(GROUND + 100); st.number(n, c.x, c.y - 110); } });
      onGround.push(c);
      await st.wait(750);
    }
    await st.wait(400);
    for (const c of onGround) await st.collect(c, 'cherry');
    await st.say('s4a_b');
    // Owl flutters down to join
    await st.tween({ targets: owl, x: party[0].x + 210, y: GROUND - 90, scale: 1.4, duration: 700, ease: 'Sine.inOut' });
    await st.say('o_join', owl);
    st.state.friends.push('owl');
    owl.destroy();
    const o = st.friend('a_owl', party[0].x + 210, GROUND, 1.4);
    st.sparkle(o.x, o.y - 80, 10, 'heart');
    await st.wait(500);
    await st.travel([party[0], o], st.W + 300);
    await st.next('meadow');
  },

  // ---------------------------------------------------------------- 4b. pond: Duck and the stepping stones
  async pond(st) {
    st.backdrop('bg_grass'); st.clouds(2);
    st.homeButton(); st.drawBasket();
    st.prop('bush1', st.cx - 640, GROUND + 10, 1.0); st.prop('tree', st.cx + 660, GROUND, 1.0);
    const wy = GROUND + 6;
    const water = st.add.graphics().setDepth(wy - 40);
    water.fillStyle(0x4fb3e8, 1); water.fillRoundedRect(st.cx - 330, wy - 46, 600, 236, 70);
    water.fillStyle(0x8fd3f7, 1);
    water.fillEllipse(st.cx - 200, wy + 110, 150, 22); water.fillEllipse(st.cx + 120, wy + 150, 190, 24); water.fillEllipse(st.cx + 60, wy - 14, 130, 16);
    const duck = st.add.image(st.cx - 60, wy + 110, 'duckling').setScale(1.7).setDepth(wy + 200);
    st.tweens.add({ targets: duck, x: duck.x + 90, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    st.tweens.add({ targets: duck, y: duck.y - 8, duration: 500, yoyo: true, repeat: -1 });
    // three places where the stones belong
    const slots = [0, 1, 2].map((i) => {
      const x = st.cx - 220 + i * 190;
      const ring = st.add.ellipse(x, wy + 20, 160, 60).setStrokeStyle(7, 0xffffff, 0.85).setDepth(wy - 30);
      st.tweens.add({ targets: ring, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
      return { x, y: wy + 20, ring, taken: false };
    });
    const mushrooms = [0, 1, 2].map((i) => st.prop(i === 1 ? 'mushroom_brown' : 'mushroom_red', st.cx + 380 + i * 120, GROUND + 90 + (i % 2) * 60, 1.7));
    const party = await enterParty(st, st.cx - 500);
    pokePoppy(st, party[0]);
    await st.say('s4b_a');
    st.say('d_hi', duck);
    const stones = [0, 1, 2].map((i) => {
      const s = st.add.image(st.cx - 620 + i * 110, GROUND + 140 - (i % 2) * 50, 'rock').setScale(2.3).setDepth(GROUND + 300);
      s.baseScale = 2.3;
      return s;
    });
    let placed = 0;
    await Promise.all(stones.map(async (s) => {
      const slot = await st.dragTo(s, slots, { radius: 190 });
      slot.taken = true; slot.ring.destroy();
      placed++;
      s.setDepth(wy - 20);
      st.tweens.add({ targets: s, x: slot.x, y: slot.y + 8, duration: 160 });
      sfx.play('splash');
      st.number(placed, slot.x, slot.y - 120);
    }));
    await st.wait(800);
    // Poppy hops across the stones
    const order = slots.slice().sort((a, b) => a.x - b.x);
    for (const sl of order) await st.hop(party[0], sl.x, { hopLen: 400 });
    await st.hop(party[0], st.cx + 300, { hopLen: 400 });
    await st.say('s4b_b');
    let picked = 0;
    const left = mushrooms.slice();
    while (left.length) {
      const m = await st.tapOne(left);
      left.splice(left.indexOf(m), 1);
      picked++;
      st.number(picked, m.x, m.y - 160);
      await st.wait(500);
      await st.collect(m, m.texture.key);
    }
    await st.say('s4b_c');
    duck.setDepth(GROUND + 10);
    st.tweens.killTweensOf(duck);
    await st.tween({ targets: duck, x: party[0].x - 200, y: GROUND - 80, duration: 700, ease: 'Sine.inOut' });
    await st.say('d_join', duck);
    st.state.friends.push('duck');
    duck.destroy();
    const d = st.friend('duckling', party[0].x - 200, GROUND, 1.8);
    st.sparkle(d.x, d.y - 80, 10, 'heart');
    await st.wait(500);
    await st.travel([party[0], d], st.W + 300);
    await st.next('meadow');
  },

  // ---------------------------------------------------------------- 5. hungry Pig: share or hop on
  async meadow(st) {
    st.backdrop('bg_fall'); st.clouds(2);
    st.homeButton(); st.drawBasket();
    st.prop('treeOrange', st.cx - 640, GROUND - 4, 0.9);
    st.prop('bush2', st.cx + 250, GROUND + 6, 1.3);
    const pig = st.friend('a_pig', st.cx + 150, GROUND + 60, 1.6);
    pig.setAngle(-8);
    // the way onward: a signpost with an arrow
    const sign = st.add.container(st.W - 190, GROUND + 30).setDepth(GROUND + 30);
    const sg = st.add.graphics();
    sg.fillStyle(0x9a6a3a, 1); sg.fillRect(-10, -190, 20, 190);
    sg.fillStyle(0xe8c48a, 1); sg.fillRoundedRect(-90, -250, 150, 80, 12); sg.fillTriangle(60, -264, 60, -156, 118, -210);
    sg.fillStyle(0x9a6a3a, 1); sg.fillTriangle(-40, -228, -40, -192, 10, -210); sg.fillRect(-64, -218, 30, 16);
    sign.add(sg);
    sign.setSize(230, 280); sign.baseScale = 1; sign.spot = [10, -200];
    sign.setInteractive(new Phaser.Geom.Rectangle(-20, -160, 280, 340), Phaser.Geom.Rectangle.Contains);
    const party = await enterParty(st, st.cx - 420);
    const poppy = party[0];
    sfx.play('rumble');
    await st.say('g_hungry', pig);
    st.say('s5_a');
    // Poppy holds out a carrot from the basket: drag it to Pig, or tap the signpost
    const carrot = st.add.image(poppy.x + 150, GROUND - 330, 'carrot').setScale(2.6).setDepth(7000);
    carrot.baseScale = 2.6;
    pig.dropY = pig.y - 100;
    const choice = await Promise.race([
      st.dragTo(carrot, pig, { radius: 210 }).then(() => 'share'),
      st.tap(sign).then(() => 'go'),
    ]);
    st.targets = [];
    if (choice === 'share') {
      sign.disableInteractive(); st.tweens.killTweensOf(sign); sign.setScale(1);
      st.state.shared = true;
      st.state.items.carrot -= 1; st.drawBasket();
      sfx.play('munch');
      await st.tween({ targets: carrot, x: pig.x, y: pig.y - 100, scale: 0.2, duration: 350 });
      carrot.destroy();
      pig.setAngle(0);
      st.sparkle(pig.x, pig.y - 90, 12, 'heart');
      st.cheer([pig]);
      await st.say('g_thanks', pig);
      await st.say('s5_share');
      // Pig hurries off ahead to get his surprise ready
      await st.hop(pig, st.W + 200, { hopLen: 170, speed: 1.3 });
    } else {
      carrot.disableInteractive(); st.tweens.killTweensOf(carrot);
      st.state.shared = false;
      await st.tween({ targets: carrot, x: st.W - 120, y: 110, scale: 0.5, duration: 350 });
      carrot.destroy();
      await st.say('g_bye', pig);
      st.say('s5_go');
    }
    await leave(st, party, 'party');
  },

  // ---------------------------------------------------------------- 6-8. Bear's house, the picnic, goodnight
  async party(st) {
    const s = st.state;
    st.backdrop('bg_grass'); st.clouds(2);
    st.homeButton(); st.drawBasket();
    const house = st.prop('house1', st.cx + 470, GROUND + 6, 1.2);
    st.prop('tree', st.cx - 660, GROUND, 1.0);
    const bush = st.prop('bush1', st.cx + 40, GROUND + 4, 1.5);
    grassTufts(st, 4);
    // Bear's front door (painted over the house so it can be knocked on)
    const doorX = house.x - 70; const doorTop = GROUND - 200;
    const door = st.add.container(doorX, GROUND + 4).setDepth(GROUND + 8).setScale(1.4);
    const dg = st.add.graphics();
    dg.fillStyle(0x8a5a3a, 1); dg.fillRoundedRect(-52, -150, 104, 150, { tl: 50, tr: 50, bl: 0, br: 0 });
    dg.fillStyle(0x6b4226, 1); dg.fillRoundedRect(-40, -136, 80, 136, { tl: 40, tr: 40, bl: 0, br: 0 });
    dg.fillStyle(0xffd166, 1); dg.fillCircle(24, -64, 9);
    door.add(dg);
    door.setSize(130, 170); door.baseScale = 1.4; door.spot = [0, -100];
    door.setInteractive(new Phaser.Geom.Rectangle(-30, -110, 190, 260), Phaser.Geom.Rectangle.Contains);
    const party = await enterParty(st, st.cx - 330);
    const poppy = party[0];
    await st.say('s6_a');
    for (let k = 1; k <= 3; k++) {
      await st.tap(door, { pulse: k === 1 });
      sfx.play('knock');
      st.tweens.add({ targets: door, x: doorX + 6, duration: 50, yoyo: true, repeat: 2 });
      st.number(k, doorX, doorTop - 60);
      await st.wait(550);
    }
    await st.wait(300);
    // Bear comes out
    sfx.play('creak');
    const bear = st.friend('a_bear', doorX, GROUND, 0.2);
    bear.breath.stop();
    bear.setDepth(GROUND + 12);
    await st.tween({ targets: bear, scale: 1.8, duration: 450, ease: 'Back.out' });
    bear.baseScale = 1.8; bear.shadow.setScale(1.8);
    await st.say('b_who', bear);
    st.confetti();
    st.cheer(party);
    await st.say('p_surprise', poppy);
    await st.hop(bear, st.cx + 190, { hopLen: 140 });

    // ---- the picnic: everything gathered on the way goes on the blanket
    const bx = st.cx - 120; const by = GROUND + 95;
    const blanket = st.add.graphics().setDepth(by - 60);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
      blanket.fillStyle((r + c) % 2 ? 0xff8fa8 : 0xffffff, 1);
      blanket.fillRect(bx - 280 + c * 70, by - 60 + r * 50, 70, 50);
    }
    blanket.setAlpha(0);
    st.tweens.add({ targets: blanket, alpha: 1, duration: 400 });
    await st.say('s7_a');
    const kinds = Object.entries(s.items).filter(([, n]) => n > 0);
    const dropZone = { x: bx, y: by + 10 };
    let laid = 0;
    const laidOut = [];
    const bundles = kinds.map(([key, n], i) => {
      const b = st.add.container(st.W - 330 - i * 190, 150).setDepth(8600);
      for (let k = 0; k < n; k++) b.add(st.add.image(-24 + (k % 3) * 24, -14 + Math.floor(k / 3) * 26, key).setScale(1.1));
      const glow = st.add.circle(0, 0, 78, 0xffffff, 0.55);
      b.addAt(glow, 0);
      b.setSize(170, 170); b.baseScale = 1; b.spot = [0, 0];
      b.setInteractive(new Phaser.Geom.Circle(85, 85, 110), Phaser.Geom.Circle.Contains);
      return { b, key, n };
    });
    s.items = {}; st.drawBasket();
    await Promise.all(bundles.map(async ({ b, key, n }) => {
      await st.dragTo(b, dropZone, { radius: 330 });
      const row = laid++;
      b.destroy();
      sfx.play('pop');
      for (let k = 0; k < n; k++) {
        const im = st.add.image(dropZone.x, dropZone.y - 20, key).setScale(0.3).setDepth(by + 10 + row);
        laidOut.push(im);
        st.tweens.add({ targets: im, x: bx - 210 + k * 76 + row * 30, y: by - 22 + row * 52, scale: 1.25, duration: 300, delay: k * 70, ease: 'Back.out' });
      }
      st.sparkle(dropZone.x, dropZone.y - 40, 8);
    }));
    await st.wait(700);

    // ---- Pig: what happened in the meadow comes back now
    let pig;
    if (s.shared) {
      pig = st.friend('a_pig', st.W + 150, GROUND + 130, 1.4);
      const cake = st.add.container(st.W + 150, GROUND - 190).setDepth(GROUND + 400);
      const cg = st.add.graphics();
      cg.fillStyle(0xf7e3c4, 1); cg.fillRoundedRect(-90, -30, 180, 90, 14);
      cg.fillStyle(0xff9ec3, 1); cg.fillRoundedRect(-96, -52, 192, 44, 20);
      cg.fillStyle(0xff9ec3, 1); [-60, -10, 40].forEach((x) => cg.fillEllipse(x, -6, 34, 30));
      cg.fillStyle(0xffffff, 1); cg.fillEllipse(0, 66, 230, 22);
      cake.add(cg);
      const candles = [-56, 0, 56].map((x) => {
        const cnd = st.add.container(x, -52);
        cnd.add(st.add.rectangle(0, -26, 14, 52, 0x7ad1ff));
        const flame = st.add.ellipse(0, -66, 22, 34, 0xffc94a).setVisible(false);
        cnd.add(flame); cnd.flame = flame;
        cake.add(cnd);
        return cnd;
      });
      st.tweens.add({ targets: cake, x: bx + 330, y: by - 30, duration: 1300, ease: 'Sine.inOut' });
      await st.hop(pig, bx + 520, { hopLen: 150 });
      await st.say('s7_cake');
      for (let k = 1; k <= 3; k++) {
        const zones = candles.filter((c) => !c.lit).map((c) => {
          const z = st.add.zone(cake.x + c.x, cake.y + c.y - 30, 70, 150).setDepth(9000);
          z.baseScale = 1; z.candle = c; z.spot = [0, 0];
          return z;
        });
        const z = await st.tapOne(zones, { pulse: false });
        zones.forEach((q) => q.destroy());
        z.candle.lit = true; z.candle.flame.setVisible(true);
        st.tweens.add({ targets: z.candle.flame, scaleY: 1.2, duration: 220, yoyo: true, repeat: -1 });
        sfx.play('chime');
        st.number(k, cake.x + z.candle.x, cake.y - 200);
        await st.wait(500);
      }
    } else {
      pig = st.friend('a_pig', bush.x + 20, GROUND - 20, 1.4);
      pig.setDepth(bush.depth - 1);
      await st.tween({ targets: [pig], y: GROUND - 150, duration: 500, ease: 'Back.out' });
      st.say('g_late', pig);
      await st.wait(900);
      await st.say('s7_pig');
      await st.tap(pig);
      st.sparkle(pig.x, pig.y - 60, 12, 'heart');
      pig.setDepth(GROUND + 160);
      await st.tween({ targets: pig, y: GROUND + 150, x: st.cx - 560, duration: 600 });
      if (pig.shadow) { pig.shadow.x = pig.x; pig.shadow.y = pig.y; }
    }
    await st.wait(300);
    const everyone = [...party, bear, pig];
    st.confetti();
    st.cheer(everyone);
    await st.say('b_wow', bear);
    st.sparkle(bear.x, bear.y - 150, 14, 'heart');
    await st.wait(600);

    // ---- night falls
    const night = st.add.rectangle(0, 0, st.W, st.H, 0x1d1f5e, 1).setOrigin(0).setDepth(3000).setAlpha(0);
    st.tweens.add({ targets: night, alpha: 0.62, duration: 2200 });
    const moon = st.add.image(st.cx - 380, 700, 'moonFull').setScale(1.3).setDepth(3100);
    await st.tween({ targets: moon, y: 190, duration: 2200, ease: 'Sine.out' });
    st.say('s8_a');
    await st.tap(moon);
    sfx.play('chime');
    for (let i = 0; i < 26; i++) {
      const star = st.add.image(Phaser.Math.Between(40, st.W - 40), Phaser.Math.Between(30, 420), 'star').setScale(0.2 + Math.random() * 0.3).setDepth(3050).setAlpha(0);
      st.tweens.add({ targets: star, alpha: 1, duration: 600, delay: i * 60, yoyo: true, repeat: -1, repeatDelay: 600 + Math.random() * 900, hold: 900 });
    }
    everyone.forEach((im, i) => st.tweens.add({ targets: im, angle: i % 2 ? 10 : -10, duration: 900, ease: 'Sine.inOut' }));
    await st.say('end');
    await st.wait(600);
    // play again: Poppy wakes and waves
    poppy.setDepth(3200); st.tweens.killTweensOf(poppy); poppy.setAngle(0);
    st.cheer([poppy]);
    st.say('again');
    await st.tap(poppy);
    await st.next('title');
  },
};

export async function runStory(st, name) {
  if (!st.state) st.state = newState();
  return CHAPTERS[name](st);
}

export const CHAPTER_NAMES = Object.keys(CHAPTERS);
