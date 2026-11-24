// Boots the game: a full-screen Phaser canvas, 900 units tall, as wide as
// the screen allows (so phones and tablets both fill the display).

import { Stage } from './stage.js';
import { runStory } from './story.js';

const H = 900;
function widthFor() {
  const a = Math.max(window.innerWidth, 1) / Math.max(window.innerHeight, 1);
  return Math.round(Math.min(2100, Math.max(1200, H * a)));
}

async function boot() {
  try { await document.fonts.load('600 40px Fredoka'); } catch { /* font is optional */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#bfe9fb',
    width: widthFor(),
    height: H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    render: { antialias: true, roundPixels: false },
    scene: [new Stage(runStory)],
  });
  window.__phaser = game;
  // Re-fit when the device rotates or the window changes shape.
  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const w = widthFor();
      if (Math.abs(w - game.scale.gameSize.width) > 40) {
        game.scale.setGameSize(w, H);
        game.scene.getScene('stage')?.onResize();
      }
    }, 150);
  });
}
// Android back button: return to the title page.
window.storybookBack = () => window.__game?.run('title');
boot();
