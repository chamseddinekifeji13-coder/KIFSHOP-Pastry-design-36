const STATIC_CACHE = 'kifshop-static-v4';
const DYNAMIC_CACHE = 'kifshop-dynamic-v4';
const OFFLINE_URL = '/offline.html';

// Static assets cached on install
const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.jpg',
  '/icons/icon-512x512.jpg',
];

// App shell pages to cache after first visit
const APP_SHELL_ROUTES = [
  '/dashboard',
  '/stocks',
  '/production',
  '/orders',
  '/approvisionnement',
  '/tresorerie',
];

// ── Install ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate - clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== STATIC_CACHE && n !== DYNAMIC_CACHE)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ── Helpers ──
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|ico|jpg|jpeg|png|svg|webp)(\?|$)/.test(url.pathname);
}

function isAppPage(url) {
  return APP_SHELL_ROUTES.some((r) => url.pathname === r || url.pathname.startsWith(r + '/'));
}

function shouldSkip(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('googleapis') ||
    !url.protocol.startsWith('http')
  );
}

// ── Fetch strategies ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (shouldSkip(url)) return;

  // Strategy 1: Cache-first for static assets (JS, CSS, fonts, images)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Strategy 2: Stale-while-revalidate for app pages
  if (event.request.mode === 'navigate' || isAppPage(url)) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(async () => {
            if (cached) return cached;
            return caches.match(OFFLINE_URL);
          });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Strategy 3: Network-first for everything else
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
  );
});

// ── Listen for messages from client ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
