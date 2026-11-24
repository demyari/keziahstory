// The stage: one Phaser scene that story chapters draw on, with the helpers
// a playable picture book needs. Chapters are async functions; every helper
// returns a promise, and all of them stop cleanly when the chapter changes.

import * as sfx from './sfx.js';

export const GROUND = 690; // where feet stand on the painted backgrounds
const IMAGES = ['bg_grass', 'bg_forest', 'bg_fall', 'bg_empty', 'bush1', 'bush2', 'bush3', 'bush4', 'cloud1', 'cloud2', 'cloud3', 'cloud5', 'cloud7',
  'fence', 'house1', 'house2', 'houseAlt1', 'houseAlt2', 'houseSmall1', 'houseSmallAlt1', 'moon', 'moonFull', 'sun', 'tree', 'treeLong', 'treePine',
  'treeSmall_green1', 'treeSmall_green3', 'treeOrange', 'treeLongOrange', 'poppy_stand', 'poppy_walk1', 'poppy_walk2', 'poppy_jump', 'poppy_ready', 'poppy_hurt',
  'a_owl', 'a_pig', 'a_bear', 'a_frog', 'a_duck', 'a_chick', 'duckling', 'carrot', 'mushroom_red', 'mushroom_brown', 'grass1', 'grass2', 'cherry', 'star', 'rock', 'heart'];

class Cancelled extends Error {}

export class Stage extends Phaser.Scene {
  constructor(story) {
    super('stage');
    this.story = story;
    this.epoch = 0;
    this.targets = []; // what can be touched right now (used for hints and by tests)
    this.voice = localStorage.getItem('poppy:voice') || 'a';
    this.fast = new URLSearchParams(location.search).has('fast');
  }

  preload() {
    for (const k of IMAGES) this.load.image(k, `assets/img/${k}.png`);
    this.load.json('script', 'script/poppys-picnic.json');
  }

  create() {
    this.W = this.scale.gameSize.width;
    this.H = this.scale.gameSize.height;
    const script = this.cache.json.get('script');
    this.lines = script.lines;
    // Narration clips load in the background; a line simply waits for its clip.
    for (const id of Object.keys(this.lines)) {
      const who = this.lines[id][0];
      const dir = who === 'n' && this.voice === 'b' ? 'voice-b' : 'voice';
      this.load.audio(id, `assets/${dir}/${id}.ogg`);
    }
    this.load.start();
    this.input.on('pointerdown', () => { sfx.audioContext(); this.lastTouch = this.time.now; });
    this.lastTouch = 0;
    this.makeTextures();
    this.state = null;
    this.chapter = 'title';
    this.run('title');
    window.__game = this;
  }

  makeTextures() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1); g.fillCircle(16, 16, 16); g.generateTexture('dot', 32, 32); g.clear();
    g.fillStyle(0x000000, 1); g.fillEllipse(60, 16, 120, 32); g.generateTexture('shadow', 120, 32); g.clear();
    g.destroy();
  }

  onResize() {
    this.W = this.scale.gameSize.width;
    this.run(this.chapter, { restore: true });
  }

  get cx() { return this.W / 2; }

  // ---------- chapter control ----------
  /** Starts a chapter by name, replacing whatever was on stage. */
  async run(name, { restore = false } = {}) {
    const my = ++this.epoch;
    this.chapter = name;
    // remember what Poppy had at the start of the chapter, so a rotated
    // screen can restart the chapter without losing anything
    if (restore && this.snap) this.state = JSON.parse(this.snap);
    else if (this.state) this.snap = JSON.stringify(this.state);
    this.sound.stopAll();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.input.removeAllListeners('drag'); this.input.removeAllListeners('dragend'); this.input.removeAllListeners('dragstart');
    this.children.removeAll(true);
    this.targets = [];
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(350, 191, 233, 251);
    try {
      await this.story(this, name);
    } catch (e) {
      if (!(e instanceof Cancelled)) { console.error(e); throw e; }
    }
    return my;
  }

  /** Fades out and moves to the next chapter. */
  async next(name) {
    this.targets = [];
    await this.fadeOut();
    this.run(name);
    throw new Cancelled();
  }

  guard(epoch) { if (epoch !== this.epoch) throw new Cancelled(); }

  /** Wraps a promise so it rejects if the chapter has changed meanwhile. */
  async keep(promise) {
    const e = this.epoch;
    const v = await promise;
    this.guard(e);
    return v;
  }

  wait(ms) { return this.keep(new Promise((r) => this.time.delayedCall(ms, r))); }

  tween(config) {
    return this.keep(new Promise((resolve) => this.tweens.add({ ...config, onComplete: () => resolve() })));
  }

  fadeOut() {
    return new Promise((resolve) => {
      this.cameras.main.once('camerafadeoutcomplete', resolve);
      this.cameras.main.fadeOut(300, 191, 233, 251);
    });
  }

  // ---------- pictures ----------
  backdrop(key) {
    const s = this.H / 1024;
    const bg = this.add.tileSprite(0, 0, this.W / s + 2, 1024, key).setOrigin(0, 0).setScale(s).setDepth(-100);
    return bg;
  }

  clouds(n = 3) {
    const keys = ['cloud1', 'cloud2', 'cloud3', 'cloud5', 'cloud7'];
    for (let i = 0; i < n; i++) {
      const c = this.add.image((this.W / n) * (i + 0.5) + Phaser.Math.Between(-80, 80), Phaser.Math.Between(70, 230), keys[i % keys.length])
        .setScale(0.45 + (i % 3) * 0.12).setAlpha(0.95).setDepth(-90);
      this.tweens.add({ targets: c, x: c.x + 60, duration: 9000 + i * 2500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  /** A picture standing on the ground (origin at its feet). */
  prop(key, x, y = GROUND, scale = 1) {
    return this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(y);
  }

  /** A friend: picture + soft shadow, gently breathing. */
  friend(key, x, y = GROUND, scale = 1) {
    const sh = this.add.image(x, y, 'shadow').setAlpha(0.18).setDepth(y - 1).setScale(scale);
    const im = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(y);
    im.shadow = sh;
    im.baseScale = scale;
    im.breath = this.tweens.add({ targets: im, scaleY: scale * 1.04, scaleX: scale * 0.98, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return im;
  }

  /** Hops a friend to x in bouncy arcs. Poppy changes pose while hopping. */
  async hop(im, toX, { hopLen = 200, speed = 1 } = {}) {
    const dir = toX >= im.x ? 1 : -1;
    const isPoppy = im.texture.key.startsWith('poppy');
    if (isPoppy) im.setFlipX(dir < 0);
    const hops = Math.max(1, Math.round(Math.abs(toX - im.x) / hopLen));
    const step = (toX - im.x) / hops;
    for (let i = 0; i < hops; i++) {
      if (isPoppy) im.setTexture('poppy_jump');
      const x0 = im.x;
      sfx.play('boing');
      await this.tween({
        targets: im, x: x0 + step, duration: 300 / speed, ease: 'Linear',
        onUpdate: (tw) => {
          const p = tw.progress;
          im.y = im.shadow ? im.shadow.y - Math.sin(p * Math.PI) * 100 : im.y;
          if (im.shadow) { im.shadow.x = im.x; im.shadow.setAlpha(0.18 - Math.sin(p * Math.PI) * 0.08); }
        },
      });
      if (im.shadow) im.y = im.shadow.y;
      if (isPoppy) im.setTexture('poppy_stand');
    }
  }

  /** Everyone in the party hops along behind the leader. */
  async travel(party, toX) {
    const dir = Math.sign(toX - party[0].x) || 1;
    const jobs = party.map((im, i) => this.wait(i * 140).then(() => this.hop(im, toX - i * 200 * dir)));
    await Promise.all(jobs);
  }

  bounce(im, height = 40) {
    this.tweens.add({ targets: im, y: im.y - height, duration: 180, yoyo: true, ease: 'Quad.out' });
  }

  cheer(list) {
    list.forEach((im, i) => this.time.delayedCall(i * 90, () => { if (im.active) this.tweens.add({ targets: im, y: im.y - 60, duration: 220, yoyo: true, repeat: 2, ease: 'Quad.out' }); }));
  }

  sparkle(x, y, n = 10, key = 'star') {
    sfx.play('sparkle');
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x, y, key).setScale(0.25 + Math.random() * 0.35).setDepth(5000);
      const a = Math.random() * Math.PI * 2; const d = 60 + Math.random() * 120;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 30, angle: 180, alpha: 0, scale: 0.05, duration: 600 + Math.random() * 400, onComplete: () => s.destroy() });
    }
  }

  confetti() {
    sfx.play('success');
    const cols = [0xff7a9a, 0xffd166, 0x7ad1ff, 0x9be58f, 0xc39bff];
    for (let i = 0; i < 60; i++) {
      const p = this.add.rectangle(Math.random() * this.W, -20 - Math.random() * 200, 14, 20, cols[i % cols.length]).setDepth(6000).setAngle(Math.random() * 360);
      this.tweens.add({ targets: p, y: this.H + 40, angle: p.angle + 360, x: p.x + Phaser.Math.Between(-80, 80), duration: 1800 + Math.random() * 1400, onComplete: () => p.destroy() });
    }
  }

  /** A big friendly number that pops up when something is counted. */
  number(n, x, y) {
    const t = this.add.text(x, y, String(n), { fontFamily: 'Fredoka, sans-serif', fontSize: '120px', fontStyle: '600', color: '#ffffff', stroke: '#ff7a9a', strokeThickness: 14 })
      .setOrigin(0.5).setDepth(7000).setScale(0.2);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: y - 90, alpha: 0, delay: 750, duration: 450, onComplete: () => t.destroy() });
    sfx.countNote(n);
    this.speak(`n${n}`);
  }

  // ---------- voice ----------
  /** Plays a line and resolves when it ends. Never blocks play for long. */
  say(id, speaker) {
    const e = this.epoch;
    return this.keep(new Promise((resolve) => {
      const start = () => {
        if (e !== this.epoch) { resolve(); return; }
        if (this.currentLine?.isPlaying) this.currentLine.stop();
        let done = false;
        const finish = () => { if (!done) { done = true; wob?.stop(); if (speaker?.active) speaker.setAngle(0); resolve(); } };
        let wob = null;
        if (speaker) wob = this.tweens.add({ targets: speaker, angle: { from: -4, to: 4 }, duration: 160, yoyo: true, repeat: -1 });
        if (this.fast) { this.time.delayedCall(120, finish); return; } // automated tests
        if (!this.cache.audio.exists(id)) { this.time.delayedCall(900, finish); return; }
        const snd = this.sound.add(id);
        this.currentLine = snd;
        snd.once('complete', finish);
        snd.once('stop', finish);
        snd.play();
        // safety net: never wait much longer than the clip itself
        this.time.delayedCall((snd.totalDuration || snd.duration || 4) * 1000 + 700, finish);
      };
      if (this.cache.audio.exists(id) || !this.load.isLoading()) start();
      else {
        // wait briefly for this clip to arrive, then carry on regardless
        const t0 = this.time.now;
        const poll = this.time.addEvent({ delay: 100, loop: true, callback: () => { if (this.cache.audio.exists(id) || this.time.now - t0 > 2500 || !this.load.isLoading()) { poll.remove(); start(); } } });
      }
    }));
  }

  /** Plays a short sound-like line without waiting (counting, giggles). */
  speak(id) {
    if (this.cache.audio.exists(id)) this.sound.play(id);
  }

  // ---------- touch ----------
  /** Makes something tappable with a generous touch area. */
  touchable(obj, pad = 40) {
    const w = obj.width; const h = obj.height;
    obj.setInteractive(new Phaser.Geom.Rectangle(-pad / obj.scaleX, -pad / obj.scaleY, w + (2 * pad) / obj.scaleX, h + (2 * pad) / obj.scaleY), Phaser.Geom.Rectangle.Contains);
    return obj;
  }

  /** Waits for a tap on one of the objects. Resolves with the one tapped. */
  tapOne(objs, { pulse = true } = {}) {
    const e = this.epoch;
    return this.keep(new Promise((resolve) => {
      const tweens = [];
      const clean = () => { tweens.forEach((t) => t.stop()); objs.forEach((o) => { if (o.active) { o.off('pointerdown'); o.setScale(o.baseScale ?? o.scaleX); } }); this.targets = this.targets.filter((t) => !objs.includes(t.obj)); };
      objs.forEach((o) => {
        if (!o.input) this.touchable(o);
        o.baseScale ??= o.scaleX;
        if (pulse) { o.breath?.pause(); tweens.push(this.tweens.add({ targets: o, scale: o.baseScale * 1.1, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' })); }
        this.targets.push({ kind: 'tap', obj: o });
        o.once('pointerdown', () => { if (e !== this.epoch) return; clean(); objs.forEach((x) => x.breath?.resume()); sfx.play('pop'); resolve(o); });
      });
      this.startHints();
    }));
  }

  tap(obj, opts) { return this.tapOne([obj], opts); }

  /**
   * Lets the child drag `obj` onto `target` (or any of several targets).
   * Resolves with the target it was dropped on. Forgiving: near is enough,
   * and a miss floats gently back.
   */
  dragTo(obj, targets, { radius = 170 } = {}) {
    const e = this.epoch;
    const list = Array.isArray(targets) ? targets : [targets];
    return this.keep(new Promise((resolve) => {
      const home = { x: obj.x, y: obj.y };
      if (!obj.input) this.touchable(obj, 50);
      this.input.setDraggable(obj);
      obj.baseScale ??= obj.scaleX;
      const pulse = this.tweens.add({ targets: obj, scale: obj.baseScale * 1.12, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const entry = { kind: 'drag', obj, to: list };
      this.targets.push(entry);
      const onDrag = (p, x, y) => { obj.x = x; obj.y = y; obj.setDepth(8000); };
      const onStart = () => { pulse.pause(); sfx.play('tap'); };
      const onEnd = () => {
        if (e !== this.epoch) return;
        const hit = list.filter((t) => !t.taken).map((t) => ({ t, d: Phaser.Math.Distance.Between(obj.x, obj.y, t.x, t.dropY ?? t.y) })).sort((a, b) => a.d - b.d)[0];
        if (hit && hit.d < radius) {
          obj.off('drag', onDrag); obj.off('dragend', onEnd); obj.off('dragstart', onStart);
          this.input.setDraggable(obj, false);
          obj.disableInteractive();
          pulse.stop(); obj.setScale(obj.baseScale);
          this.targets = this.targets.filter((t) => t !== entry);
          resolve(hit.t);
        } else {
          sfx.play('gentle');
          this.tweens.add({ targets: obj, x: home.x, y: home.y, duration: 300, ease: 'Back.out', onComplete: () => pulse.resume() });
        }
      };
      obj.on('drag', onDrag); obj.on('dragend', onEnd); obj.on('dragstart', onStart);
      this.startHints();
    }));
  }

  /** The middle of something touchable (drawn shapes say where via .spot). */
  spot(obj) {
    if (obj.spot) return { x: obj.x + obj.spot[0], y: obj.y + obj.spot[1] };
    const b = obj.getBounds();
    if (b.width > 0 && b.height > 0) return { x: b.centerX, y: b.centerY };
    return { x: obj.x, y: obj.y };
  }

  /** After a quiet moment, shows a gentle hint of what to touch. */
  startHints() {
    if (this.hintTimer) this.hintTimer.remove();
    const e = this.epoch;
    this.hintTimer = this.time.addEvent({
      delay: 4500, loop: true, callback: () => {
        if (e !== this.epoch || !this.targets.length) return;
        if (this.time.now - this.lastTouch < 4000) return;
        const t = this.targets[Math.floor(Math.random() * this.targets.length)];
        if (!t.obj.active) return;
        const b = this.spot(t.obj);
        const ring = this.add.circle(b.x, b.y, 30, 0xffffff, 0).setStrokeStyle(8, 0xffffff, 0.9).setDepth(9000);
        this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
        if (t.kind === 'drag') {
          const to = t.to.find((x) => !x.taken) || t.to[0];
          const ghost = this.add.image(b.x, b.y, 'dot').setAlpha(0.7).setScale(1.4).setDepth(9000);
          this.tweens.add({ targets: ghost, x: to.x, y: to.dropY ?? to.y, alpha: 0.15, duration: 1100, ease: 'Sine.inOut', onComplete: () => ghost.destroy() });
        }
      },
    });
  }

  // ---------- the basket (what Poppy is carrying, always visible) ----------
  drawBasket() {
    const s = this.state;
    this.basketGroup?.destroy(true);
    const x = this.W - 120; const y = 120;
    const c = this.add.container(x, y).setDepth(8500);
    const g = this.add.graphics();
    g.lineStyle(12, 0x9a6a3a, 1); g.beginPath(); g.arc(0, 0, 62, Math.PI, 0); g.strokePath();
    g.fillStyle(0xc98f4e, 1); g.fillRoundedRect(-78, 0, 156, 78, { tl: 6, tr: 6, bl: 34, br: 34 });
    g.lineStyle(5, 0xa87238, 1);
    for (let i = -52; i <= 52; i += 26) g.lineBetween(i, 6, i * 0.8, 72);
    g.lineBetween(-74, 26, 74, 26); g.lineBetween(-68, 50, 68, 50);
    c.add(g);
    const items = [];
    let k = 0;
    for (const [key, n] of Object.entries(s.items)) {
      for (let i = 0; i < n; i++) {
        const im = this.add.image(-50 + (k % 5) * 25, -4 - Math.floor(k / 5) * 22 - (k % 2) * 6, key).setScale(0.62).setAngle(-20 + (k % 5) * 10);
        items.push(im); k++;
      }
    }
    c.addAt(items, 0);
    this.basketGroup = c;
    return c;
  }

  /** Something found flies into the basket and stays there. */
  async collect(im, key) {
    const bx = this.W - 120; const by = 110;
    im.setDepth(8600);
    await this.tween({ targets: im, x: bx, y: by, scale: 0.6, duration: 420, ease: 'Quad.in' });
    im.destroy();
    this.state.items[key] = (this.state.items[key] || 0) + 1;
    this.drawBasket();
    sfx.play('pop');
    this.tweens.add({ targets: this.basketGroup, scale: 1.15, duration: 110, yoyo: true });
  }

  /** A small house button: press and hold to go back to the start. */
  homeButton() {
    const g = this.add.container(86, 86).setDepth(8500).setAlpha(0.85);
    const bg = this.add.circle(0, 0, 46, 0xffffff, 0.9);
    const h = this.add.graphics();
    h.fillStyle(0xff8a65, 1); h.fillTriangle(-30, -4, 0, -32, 30, -4);
    h.fillStyle(0xffd9a0, 1); h.fillRect(-20, -4, 40, 30);
    h.fillStyle(0x8a5a3a, 1); h.fillRect(-7, 6, 14, 20);
    const ring = this.add.graphics();
    g.add([bg, h, ring]);
    bg.setInteractive(new Phaser.Geom.Circle(46, 46, 60), Phaser.Geom.Circle.Contains);
    let hold = null;
    bg.on('pointerdown', () => {
      const t0 = this.time.now;
      hold = this.time.addEvent({ delay: 30, loop: true, callback: () => {
        const p = Math.min(1, (this.time.now - t0) / 900);
        ring.clear(); ring.lineStyle(8, 0xff7a9a, 1); ring.beginPath(); ring.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ring.strokePath();
        if (p >= 1) { hold.remove(); this.run('title'); }
      } });
    });
    const cancel = () => { hold?.remove(); ring.clear(); };
    bg.on('pointerup', cancel); bg.on('pointerout', cancel);
  }
}
