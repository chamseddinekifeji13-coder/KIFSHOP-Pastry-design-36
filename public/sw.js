// IMPORTANT: Increment version on each deployment to force cache invalidation
const CACHE_VERSION = 'v6';
const BUILD_TIMESTAMP = '2026-03-14';
const STATIC_CACHE = 'kifshop-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'kifshop-dynamic-' + CACHE_VERSION;
const OFFLINE_URL = '/offline.html';

console.log('[SW] Version', CACHE_VERSION, 'Build:', BUILD_TIMESTAMP);

// Static assets cached on install — use individual adds so one failure
// doesn't block the whole SW installation (icon files may be missing).
const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
];

// App shell pages to cache after first visit
const APP_SHELL_ROUTES = [
  '/dashboard',
  '/stocks',
  '/production',
  '/commandes',
  '/approvisionnement',
  '/tresorerie',
];

// ── Install ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to precache', url, err);
          })
        )
      )
    )
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

  // Strategy 2: Network-first for navigation & app pages
  // This ensures users always see the latest deployed version on mobile.
  if (event.request.mode === 'navigate' || isAppPage(url)) {
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
          return caches.match(OFFLINE_URL);
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
