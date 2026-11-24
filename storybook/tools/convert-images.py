"""Convert fetched Fluent PNGs to 192px WebP in assets/img and copy the manifest.
Usage: python3 -I tools/convert-images.py <rawDir> <outDir>"""
import sys, os, json, glob
from PIL import Image
raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
man = json.load(open(os.path.join(raw, 'manifest.json')))
keep = {}
for key, rec in man.items():
    src = os.path.join(raw, key + '.png')
    if not os.path.exists(src):
        continue
    im = Image.open(src).convert('RGBA').resize((192, 192), Image.LANCZOS)
    im.save(os.path.join(out, key + '.webp'), 'WEBP', quality=86, method=6)
    keep[key] = rec
json.dump(keep, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
print(len(keep), 'images')
