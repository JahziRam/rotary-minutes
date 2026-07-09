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
      (async () => {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        if (clients.length > 0) {
          clients.forEach((client) => client.postMessage({ type: "SYNC_OFFLINE_CHECKINS" }));
          return;
        }
        try {
          const res = await fetch("/api/check-in/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: [] }),
          });
          console.info("[PWA] check-in-sync fallback:", res.status);
        } catch (err) {
          console.warn("[PWA] check-in-sync failed:", err);
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Rotary Minutes", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: data.tag,
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "FLUSH_OFFLINE_CHECKINS" && event.ports?.[0]) {
    event.waitUntil(
      fetch("/api/check-in/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: event.data.entries ?? [] }),
      })
        .then((res) => res.json())
        .then((data) => event.ports[0].postMessage({ ok: true, data }))
        .catch((err) => event.ports[0].postMessage({ ok: false, error: String(err) }))
    );
  }
});