// Replaces the old PWA service worker at /ringon/sw.js: wipe its caches, unregister, send open tabs to ringon.app.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim()
    await Promise.all((await caches.keys()).map((key) => caches.delete(key)))
    await self.registration.unregister()
    const clients = await self.clients.matchAll({ type: 'window' })
    for (const client of clients) {
      const url = new URL(client.url)
      const path = url.pathname.replace(/^\/ringon(?=\/|$)/, '') || '/'
      client.navigate('https://ringon.app' + path + url.search + url.hash)
    }
  })())
})
