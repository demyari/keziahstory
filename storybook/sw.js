// Offline support: on install, every file the book needs (listed in
// asset-list.json, made by tools/build-asset-list.mjs) is stored on the
// device. Afterwards everything is served from that store first.
const VERSION_URL = 'asset-list.json';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    const list = await res.json();
    const cache = await caches.open(`storybook-${list.version}`);
    // add in small batches so a slow phone connection is not overwhelmed
    for (let i = 0; i < list.files.length; i += 20) {
      await cache.addAll(list.files.slice(i, i + 20));
    }
    await cache.put(VERSION_URL, new Response(JSON.stringify(list), { headers: { 'content-type': 'application/json' } }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const res = await caches.match(VERSION_URL);
    const list = res ? await res.json() : null;
    for (const k of await caches.keys()) if (list && k !== `storybook-${list.version}`) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      return res;
    } catch {
      if (req.mode === 'navigate') return (await caches.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
