// Minimal static file server for tests (also usable to run the app locally:
//   node tests/tools/serve.cjs 8080
// then open http://localhost:8080 ).
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.json': 'application/json', '.ogg': 'audio/ogg', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8',
};

function serve(root, port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0]);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.join(root, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
        res.end(data);
      });
    });
    srv.listen(port, () => resolve({ url: `http://localhost:${srv.address().port}`, close: () => srv.close(), server: srv }));
  });
}

module.exports = { serve };

if (require.main === module) {
  const port = Number(process.argv[2] || 8080);
  serve(path.resolve(__dirname, '../..'), port).then((s) => console.log(`The Magical Storybook is at ${s.url}`));
}
