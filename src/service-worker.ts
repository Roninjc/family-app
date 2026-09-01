/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker'

export {}
declare const self: ServiceWorkerGlobalScope

const CACHE = `family-app-${version}`
const ASSETS = [...build, ...files]

const isStaticAsset = (path: string) => /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff2?)$/i.test(path)
const isServerError = (response: Response) => response.status >= 500

const offlineHtml =
  '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reconectando</title><body><main style="font-family:sans-serif;padding:1.2rem;line-height:1.45"><h1>Reconectando</h1><p>No se ha podido cargar Orikara. Volveremos a intentarlo automaticamente.</p></main><script>setTimeout(()=>location.reload(),3000)</script></body></html>'

const navigationFallback = async (request: Request) => {
  const cachedPage = await caches.match(request)
  if (cachedPage) return cachedPage

  const cachedHome = await caches.match('/hub')
  if (cachedHome) return cachedHome

  return new Response(offlineHtml, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable()
      }
    })()
  )
})

self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const preloaded = await event.preloadResponse

        try {
          if (preloaded) {
            if (preloaded.ok) {
              if (!preloaded.headers.get('cache-control')?.includes('no-store')) {
                const cache = await caches.open(CACHE)
                await cache.put(event.request, preloaded.clone())
              }

              return preloaded
            }
          }

          const network = await fetch(event.request)
          if (isServerError(network)) return navigationFallback(event.request)

          if (network.ok && !network.headers.get('cache-control')?.includes('no-store')) {
            const cache = await caches.open(CACHE)
            await cache.put(event.request, network.clone())
          }

          return network
        } catch {
          if (preloaded && !isServerError(preloaded)) return preloaded
          return navigationFallback(event.request)
        }
      })()
    )

    return
  }

  if (isStaticAsset(url.pathname) || ASSETS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached

        const network = await fetch(event.request)
        if (network.ok && !network.headers.get('cache-control')?.includes('no-store')) {
          const cache = await caches.open(CACHE)
          await cache.put(event.request, network.clone())
        }

        return network
      })()
    )
  }
})
