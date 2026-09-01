/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker'

export {}
declare const self: ServiceWorkerGlobalScope

const CACHE = `family-app-${version}`
const ASSETS = [...build, ...files]

const isStaticAsset = (path: string) => /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff2?)$/i.test(path)
const isServerError = (response: Response) => response.status >= 500
const RECOVERY_PARAM = '__pwa_recover'

const offlineHtml =
  '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reconectando</title><body><main style="font-family:sans-serif;padding:1.2rem;line-height:1.45"><h1>Reconectando</h1><p id="status">Comprobando el servicio...</p><p>Intentos: <strong id="attempts">0</strong></p></main><script>(()=>{let n=0;const status=document.getElementById("status"),attempts=document.getElementById("attempts");async function retry(){attempts.textContent=String(++n);status.textContent="Comprobando el servicio...";try{const response=await fetch(location.href,{cache:"no-store",credentials:"same-origin",headers:{"x-pwa-recovery":"1"}});if(response.status<500){status.textContent="Servicio disponible. Abriendo Orikara...";const url=new URL(location.href);url.searchParams.set("__pwa_recover",Date.now().toString());location.replace(url);return}status.textContent="El servicio aun no esta disponible."}catch{status.textContent="No se ha podido conectar."}setTimeout(retry,3000)}retry();addEventListener("online",retry)})()</script></body></html>'

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
    if (url.searchParams.has(RECOVERY_PARAM)) {
      url.searchParams.delete(RECOVERY_PARAM)
      event.respondWith(fetch(new Request(url, event.request)))
      return
    }

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
