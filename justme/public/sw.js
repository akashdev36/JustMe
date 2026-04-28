const CACHE_NAME = 'justme-v2' // bumped to force old SW to be replaced
const urlsToCache = ['/']

self.addEventListener('install', event => {
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('activate', event => {
  // Clear old caches and claim all clients immediately
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Only handle http/https — skip blob:, chrome-extension:, data:, etc.
  if (!url.protocol.startsWith('http')) return

  // Skip ALL external domains — only cache same-origin app shell
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .catch(() => caches.match('/'))  // fallback to app shell on error
  )
})
