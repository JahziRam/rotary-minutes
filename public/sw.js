const CACHE_NAME = "rotary-minutes-v3";
const SHELL_URLS = [
  "/",
  "/fr/dashboard",
  "/en/dashboard",
  "/fr/minutes",
  "/fr/members/dues",
  "/manifest.json",
  "/icon.svg",
  "/offline.html",
];

const API_CACHE_PATTERNS = [
  /^\/api\/pdf\//,
  /^\/api\/dues\//,
];

const PAGE_CACHE_PATTERNS = [
  /^\/fr\/minutes/,
  /^\/fr\/members\/dues/,
  /^\/en\/minutes/,
  /^\/en\/members\/dues/,
];

function shouldCacheApi(pathname) {
  return API_CACHE_PATTERNS.some((re) => re.test(pathname));
}

function shouldCachePage(pathname) {
  return PAGE_CACHE_PATTERNS.some((re) => re.test(pathname));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isApi = url.pathname.startsWith("/api/");
  const cacheableApi = isApi && shouldCacheApi(url.pathname);
  const cacheablePage = !isApi && shouldCachePage(url.pathname);

  if (cacheableApi || cacheablePage) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  if (isApi) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return (
          cached ||
          caches.match("/offline.html") ||
          caches.match("/fr/dashboard")
        );
      })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "check-in-sync") {
    event.waitUntil(
      Promise.resolve().then(() => {
        // Placeholder: replay queued check-ins from IndexedDB when Background Sync is supported
        console.info("[PWA] Background sync placeholder: check-in-sync");
      })
    );
  }
});