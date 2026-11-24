# Credits and licences

Checked 2026-11-24. Everything is bundled locally; nothing is loaded from the internet.

| What | Files | Creator | Licence | Source |
|---|---|---|---|---|
| All pictures (characters, backgrounds, trees, houses, food) | `assets/img/*.png` | Kenney (kenney.nl) | CC0 1.0 (public domain) | Packs: Background Elements Remastered, Animal Pack Remastered, Jumper Pack, Shooting Gallery, Platformer Assets Base, Platformer Assets Candy. Fetched from the mirror https://github.com/shorepine/kenney (its `LICENSE.txt` is CC0) |
| Basket, blanket, cake, pond, door, signpost, play button | drawn in code (`js/story.js`, `js/stage.js`) | made for this game | same as this project | |
| Game engine | `vendor/phaser.min.js` (Phaser 3.90.0) | Phaser Studio Inc. | MIT (`vendor/PHASER-LICENSE.md`) | npm `phaser@3.90.0` |
| Title font | `assets/fonts/fredoka.woff2` | The Fredoka Project Authors | SIL Open Font Licence 1.1 (`assets/fonts/OFL-Fredoka.txt`) | Google Fonts |
| Narration and character voices | `assets/voice/*.ogg`, `assets/voice-b/*.ogg` | generated here with Kokoro-82M via kokoro-onnx | model weights Apache 2.0, kokoro-onnx MIT | https://github.com/thewh1teagle/kokoro-onnx (model-files-v1.0) |
| Sound effects | none bundled; synthesised live (`js/sfx.js`) | made for this game | same as this project | |

No real person's voice was recorded or cloned. No copyrighted characters are imitated.

Other sources named in the brief (OpenGameArt, Wikimedia Commons, Poly Haven, Freesound) could
not be reached from the build environment, which only allows GitHub and npm.
