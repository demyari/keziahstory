# Visual bible

**Direction:** a soft, warm, premium picture book. Rounded toy-like 3D characters stand in
gently painted, layered landscapes on cream paper, with gold trim and night-blue velvet around
the book.

## Palette

- **Paper:** `#fdf6e3`, edges `#e9d7ae`, with a fine paper-grain texture (`assets/img/paper.webp`).
- **Ink:** `#3b2a1a` (warm brown, not black).
- **Accents:** berry `#d9577a` (titles, drop caps), gold `#e0a84a` / `#ffd88a` (frames,
  highlights), plum `#5a3b8a` (headings), leaf `#3d6b3a` (questions).
- **Surround:** night velvet `#241f48` → `#4a3f8a`.
- **World skies:**
  - Moonlight Garden: indigo to lilac.
  - Seashell Cove: sky blue to sand.
  - Cloud Kingdom: pink to periwinkle.
  - Whispering Woods: mint to butter.
  - Snowy Peaks: blue to ice.
  - Dinosaur Valley: apricot to fern.
  - Caves: plum. Underwater: teal with light rays.

## Illustration rules (scenes, `js/render/scene.js`)

- **Composition:** 4:3. Sky gradient, then far clouds, then two hill layers, then the
  place's landmark features, then a foreground ground band, then a soft vignette.
- **Shapes and colour:** rounded silhouettes, no outlines, light from the upper right
  (sun or moon), soft highlights, a few gentle colours per element.
- **Safe zones:**
  - bottom-left for the friends;
  - top-centre for the wooden place sign;
  - the centre and right for interactions, which the landmark features leave open.
- **Living details:** stars twinkle, fireflies drift, waves roll, smoke curls, clouds drift.
  Every landmark is tappable and reacts (shake, bloom, glow, ripple, bounce) with a sound.
- **Nothing frightening:** no sharp teeth, no darkness without a glow, caves always have
  crystals or shells.

## Characters

Microsoft Fluent Emoji 3D (MIT): soft, rounded, toy-like and consistent. They are always shown
with a drop shadow, idle "breathing", and a hop, wiggle, spin or stretch when tapped, plus a
speech bubble. They never imitate a franchise character; names and personalities are original.

## Type

- **Andika** (SIL, OFL) for story text: designed for early readers, with a single-storey "a"
  and clear letterforms.
- **Fredoka** (OFL) for titles, labels and letters in the Discovery Book.
- **Size:** story text 18–27 px, scaled by the text-size setting.

## Book elements

- Rounded pages with page-edge shading, a spine shadow on spreads, and a gold-framed cover.
- Drop caps on the first story line, which can be tapped to hear the letter.
- Choice cards are illustrated with a miniature of the destination and a bobbing icon.
- Page turns are 3D (the right page folds over on spreads; a single page turns from its
  left edge on phones), with a soft crossfade when reduced motion is on.

## Motion

Gentle and bouncy, under a second, never flashing. Sparkles mark success, confetti marks big
moments, and discoveries fly into the Discovery Book button, which "gulps". Reduced motion
shortens every animation to an instant change and removes confetti.

## Generated assets

Only the scene art, interface pieces, paper grain and icon composition were made for this
project. No living artist's style was imitated.
