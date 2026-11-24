// Writes docs/ASSETS.md: every bundled third-party asset with its source,
// creator, licence, attribution, date checked, local file and changes.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const man = JSON.parse(fs.readFileSync(path.join(root, 'assets/img/manifest.json'), 'utf8'));
const clips = fs.readdirSync(path.join(root, 'assets/audio/clips')).filter((f) => f.endsWith('.ogg')).length;
const rows = Object.entries(man).sort().map(([k, r]) => `| \`${r.file}\` | ${r.title} | ${r.creator} | [source](${r.source}) | ${r.licence} | ${r.checked} | ${r.modifications} |`);

const md = `# Asset manifest and licences

Every file bundled with The Magical Storybook is listed here. Nothing is hotlinked; all
files are local copies so the book works offline. Checked: ${Object.values(man)[0].checked}.

## Summary

| Asset group | Files | Creator | Licence | Attribution |
|---|---|---|---|---|
| Scene illustrations, page art, icons in the interface, interaction pieces (chest, doors, bubbles, footprints, stones, clouds, signposts) | drawn in code: \`js/render/scene.js\`, \`js/ui/dom.js\`, \`css/*.css\`, \`js/interactions/*.js\` | Original work for this project | Same as the project | none needed |
| Character and object pictures | ${Object.keys(man).length} WebP files in \`assets/img/\` | Microsoft Corporation (Fluent Emoji 3D) | MIT | "Fluent Emoji © Microsoft Corporation, MIT licence" (shown in the parent area credits) |
| Paper texture | \`assets/img/paper.webp\` | Generated noise for this project (\`tools\`, PIL) | Original | none needed |
| App icon | \`assets/icon-192.png\`, \`assets/icon-512.png\`, Android launcher icons | Composed for this project from the Fluent Emoji moon and unicorn | MIT (Fluent parts) | as above |
| Text font | \`assets/fonts/andika-400.woff2\`, \`andika-700.woff2\` | SIL International | SIL Open Font Licence 1.1 (\`assets/fonts/OFL-Andika.txt\`) | licence text bundled |
| Title font | \`assets/fonts/fredoka.woff2\` | The Fredoka Project Authors | SIL Open Font Licence 1.1 (\`assets/fonts/OFL-Fredoka.txt\`) | licence text bundled |
| Recorded friend voices | ${clips} Ogg Opus clips in \`assets/audio/clips/\` | Synthesised here with Kokoro-82M (hexgrad) via kokoro-onnx 0.6.1 | Model weights Apache 2.0; kokoro-onnx code MIT. Output audio is not covered by the GPL phonemiser used only at build time. | "Voices generated with Kokoro-82M (Apache 2.0)" (shown in credits) |
| Sound effects and music-box music | none (synthesised live with Web Audio in \`js/audio/sfx.js\`) | Original | Original | none needed |

### Sources checked
- Fluent Emoji: https://github.com/microsoft/fluentui-emoji, licence file https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/LICENSE (MIT, © Microsoft Corporation).
- Andika: https://fonts.google.com/specimen/Andika, licence https://raw.githubusercontent.com/google/fonts/main/ofl/andika/OFL.txt
- Fredoka: https://fonts.google.com/specimen/Fredoka, licence https://raw.githubusercontent.com/google/fonts/main/ofl/fredoka/OFL.txt
- Kokoro-82M weights: https://raw.githubusercontent.com/hexgrad/kokoro/main/LICENSE (Apache 2.0); kokoro-onnx: https://raw.githubusercontent.com/thewh1teagle/kokoro-onnx/main/LICENSE (MIT); model files from https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0. See NARRATION.md.

### Sources investigated but not used
- **Kenney** (CC0): consistent and safe, but its flat game style clashed with the soft picture-book look.
- **OpenGameArt**: licences vary per file; no set matched the visual bible consistently.
- **Wikimedia Commons / public-domain book illustrations**: beautiful but stylistically mixed, and per-file provenance checks for dozens of characters would leave an inconsistent cast.
- **Poly Haven** (CC0): textures and 3D, not suited to a 2D picture book; a generated paper grain was enough.
- **Freesound**: per-sound licences vary (CC0/CC-BY/CC-BY-NC); synthesised effects avoid licence risk, download size and startling recordings.

No asset imitates a copyrighted character, franchise or living artist. No voice recordings
of real people and no voice cloning were used.

## Every picture file

| Local file | Fluent name | Creator | Source | Licence | Checked | Changes |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
fs.writeFileSync(path.join(root, 'docs/ASSETS.md'), md);
console.log(`docs/ASSETS.md: ${rows.length} pictures, ${clips} clips`);
