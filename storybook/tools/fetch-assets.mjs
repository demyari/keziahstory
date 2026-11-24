// Downloads the Fluent Emoji 3D pictures listed in js/content/images.js from
// github.com/microsoft/fluentui-emoji (MIT licence), and records each one in
// assets/img/manifest.json (source URL, licence, date). Conversion to WebP is
// done by tools/convert-images.py afterwards.
//
// Usage: node tools/fetch-assets.mjs [rawDir]
import { IMAGES } from '../js/content/images.js';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rawDir = process.argv[2] || path.join(root, '.raw-img');
fs.mkdirSync(rawDir, { recursive: true });
const BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/';

function candidates(name) {
  const file = name.toLowerCase().replace(/ /g, '_');
  const dir = encodeURIComponent(name);
  return [
    `${BASE}${dir}/3D/${file}_3d.png`,
    `${BASE}${dir}/Default/3D/${file}_3d_default.png`,
  ];
}

const manifest = {};
const failures = [];
const seen = new Map();
for (const [key, [name]] of Object.entries(IMAGES)) {
  const out = path.join(rawDir, `${key}.png`);
  let ok = false;
  for (const url of candidates(name)) {
    if (fs.existsSync(out) && fs.statSync(out).size > 1000) { ok = url; break; }
    const res = await fetch(url).catch(() => null);
    if (res && res.ok) {
      fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      ok = url;
      break;
    }
  }
  if (!ok) { failures.push(`${key} (${name})`); continue; }
  manifest[key] = {
    title: name,
    creator: 'Microsoft Corporation (Fluent Emoji)',
    source: ok,
    licence: 'MIT',
    attribution: 'Fluent Emoji © Microsoft Corporation, MIT licence',
    checked: new Date().toISOString().slice(0, 10),
    file: `assets/img/${key}.webp`,
    modifications: 'Converted from 256px PNG to 192px WebP',
  };
  seen.set(key, true);
}
fs.writeFileSync(path.join(rawDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`fetched ${Object.keys(manifest).length}/${Object.keys(IMAGES).length}`);
if (failures.length) console.log('FAILED:', failures.join(', '));
