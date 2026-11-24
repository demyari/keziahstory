// Lists every file the app needs offline into asset-list.json, with a
// content hash as the cache version. Run after changing any file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const include = ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets'];
const skip = /(^|\/)(manifest\.json|\.DS_Store)$|\.txt$/;
const files = [];
const walk = (rel) => {
  const abs = path.join(root, rel);
  if (fs.statSync(abs).isDirectory()) for (const f of fs.readdirSync(abs).sort()) walk(path.join(rel, f));
  else if (!skip.test(rel)) files.push(rel.split(path.sep).join('/'));
};
include.forEach(walk);
const h = crypto.createHash('sha256');
for (const f of files) h.update(f).update(fs.readFileSync(path.join(root, f)));
const version = h.digest('hex').slice(0, 12);
fs.writeFileSync(path.join(root, 'asset-list.json'), JSON.stringify({ version, files }, null, 0));
const bytes = files.reduce((s, f) => s + fs.statSync(path.join(root, f)).size, 0);
console.log(`${files.length} files, ${(bytes / 1048576).toFixed(1)} MB, version ${version}`);
