// Service worker: app files open instantly and work offline; updates still reach users.
// Paths are relative so it works under /prompt-gallery/ on GitHub Pages (the old absolute
// paths like '/index.html' pointed outside the site, so installation failed).
const CACHE_NAME = 'prompt-gallery-v2';
const IMG_CACHE = 'prompt-gallery-images-v1';
const MAX_IMAGES = 150;
const ASSETS = ['./', 'index.html', 'css/styles.css', 'js/app.js', 'manifest.json', 'favicon.svg', 'prompts.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => Promise.all(ASSETS.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && k !== IMG_CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

async function trimImages() {
    const cache = await caches.open(IMG_CACHE);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - MAX_IMAGES; i++) await cache.delete(keys[i]);   // oldest first
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Cloudinary images: cache-first (a given image URL never changes), capped
    if (url.hostname.endsWith('cloudinary.com')) {
        event.respondWith(caches.open(IMG_CACHE).then(async cache => {
            const hit = await cache.match(req);
            if (hit) return hit;
            const res = await fetch(req);
            if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); event.waitUntil(trimImages()); }
            return res;
        }));
        return;
    }

    if (url.origin !== self.location.origin) return;

    // prompts.json: network first, so new prompts show up immediately; cache when offline
    if (url.pathname.endsWith('prompts.json')) {
        event.respondWith(fetch(req).then(res => {
            if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
            return res;
        }).catch(() => caches.match(req, { ignoreSearch: true })));
        return;
    }

    // Everything else on the site: serve cached copy, refresh it in the background
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
        const hit = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req).then(res => {
            if (res.ok) cache.put(req, res.clone());
            return res;
        }).catch(() => null);
        if (hit) { event.waitUntil(network); return hit; }
        return (await network) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }));
});
