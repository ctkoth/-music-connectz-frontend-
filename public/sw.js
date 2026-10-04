/* Music ConnectZ service worker — PUSH ONLY.
 *
 * Deliberately no `fetch` handler and no cache. Every route is a lazily
 * loaded, content-hashed chunk, and a service worker that cached them would
 * hand an open tab the previous deploy's files forever — the stale-chunk
 * failure src/chunkError.js exists to recover from, made permanent. This
 * file receives a push, shows it, and opens the right screen when tapped.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || "Music ConnectZ", {
    body: d.body || "",
    icon: "/icons/app/icon-192.png",
    badge: "/icons/app/icon-192.png",
    tag: d.tag || undefined,
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const tab of tabs) {
      if (new URL(tab.url).origin === self.location.origin) {
        await tab.focus();
        return tab.navigate(url);
      }
    }
    return self.clients.openWindow(url);
  })());
});
