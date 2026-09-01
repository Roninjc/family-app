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

type RecoveryDetails = {
  source: 'network-server-error' | 'fetch-exception'
  status?: number
  statusText?: string
  preloadStatus?: number
  error?: string
}

const recoveryHtml = (details: RecoveryDetails) => {
  const initialDetails = JSON.stringify({ workerVersion: version, ...details })

  return `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Diagnostico de conexion</title>
<body style="font-family:sans-serif;padding:1.2rem;line-height:1.45;overflow-wrap:anywhere">
<main>
  <h1>Reconectando</h1>
  <p id="status">Comprobando el servicio...</p>
  <p>Intentos: <strong id="attempts">0</strong></p>
  <details open>
    <summary>Diagnostico tecnico</summary>
    <pre id="diagnostics" style="white-space:pre-wrap;font-size:.75rem"></pre>
    <button id="copy" type="button">Copiar diagnostico</button>
  </details>
</main>
<script>
(() => {
  const initial = ${initialDetails}
  const status = document.getElementById('status')
  const attempts = document.getElementById('attempts')
  const diagnostics = document.getElementById('diagnostics')
  const storageKey = 'orikara:pwa-recovery-log'
  let entries = []
  let attempt = 0
  let retryTimer

  try {
    const storedEntries = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (Array.isArray(storedEntries)) entries = storedEntries.slice(-30)
  } catch {
    localStorage.removeItem(storageKey)
  }

  const pathOf = (value) => {
    try { return new URL(value).pathname } catch { return 'invalid-url' }
  }

  const record = (event, data = {}) => {
    entries.push({ at: new Date().toISOString(), event, ...data })
    entries = entries.slice(-30)
    try { localStorage.setItem(storageKey, JSON.stringify(entries)) } catch {}
    const report = {
      initial,
      page: { path: location.pathname, online: navigator.onLine },
      entries
    }
    diagnostics.textContent = JSON.stringify(report, null, 2)
    console.info('[PWA recovery]', event, data)
  }

  const inspectWorker = async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      record('worker-state', {
        controller: pathOf(navigator.serviceWorker?.controller?.scriptURL || ''),
        active: pathOf(registration?.active?.scriptURL || ''),
        waiting: Boolean(registration?.waiting),
        installing: Boolean(registration?.installing),
        caches: 'caches' in globalThis ? await caches.keys() : []
      })
    } catch (error) {
      record('worker-inspection-error', { error: String(error) })
    }
  }

  const retry = async () => {
    clearTimeout(retryTimer)
    attempts.textContent = String(++attempt)
    status.textContent = 'Comprobando el servicio...'
    record('probe-start', { attempt })

    try {
      const target = new URL(location.href)
      target.searchParams.delete('${RECOVERY_PARAM}')
      const response = await fetch(target, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'x-pwa-recovery': '1' }
      })
      record('probe-response', {
        attempt,
        status: response.status,
        statusText: response.statusText,
        type: response.type,
        redirected: response.redirected,
        responsePath: pathOf(response.url),
        server: response.headers.get('server'),
        ray: response.headers.get('cf-ray'),
        contentType: response.headers.get('content-type')
      })

      if (response.status < 500) {
        status.textContent = 'Servicio disponible. Restableciendo Orikara...'
        try {
          const registration = await navigator.serviceWorker?.getRegistration()
          await registration?.unregister()
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('family-app-'))
              .map((cacheName) => caches.delete(cacheName))
          )
          record('worker-reset')
        } catch (error) {
          record('worker-reset-error', { error: String(error) })
        }
        target.searchParams.set('${RECOVERY_PARAM}', Date.now().toString())
        location.replace(target)
        return
      }

      status.textContent = 'El servicio responde con un error ' + response.status + '.'
    } catch (error) {
      record('probe-exception', { attempt, error: String(error) })
      status.textContent = 'No se ha podido conectar.'
    }

    retryTimer = setTimeout(retry, 3000)
  }

  document.getElementById('copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(diagnostics.textContent)
      status.textContent = 'Diagnostico copiado.'
    } catch (error) {
      record('copy-error', { error: String(error) })
      status.textContent = 'No se pudo copiar. Manten pulsado el diagnostico para seleccionarlo.'
    }
  })

  record('fallback-rendered')
  inspectWorker()
  retry()
  addEventListener('online', retry)
})()
</script>
</body>
</html>`
}

const navigationFallback = async (request: Request, details: RecoveryDetails) => {
  const cachedPage = await caches.match(request)
  if (cachedPage) return cachedPage

  const cachedHome = await caches.match('/hub')
  if (cachedHome) return cachedHome

  return new Response(recoveryHtml(details), {
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
        let preloaded: Response | undefined

        try {
          preloaded = await event.preloadResponse

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
          if (isServerError(network)) {
            return navigationFallback(event.request, {
              source: 'network-server-error',
              status: network.status,
              statusText: network.statusText,
              preloadStatus: preloaded?.status
            })
          }

          if (network.ok && !network.headers.get('cache-control')?.includes('no-store')) {
            const cache = await caches.open(CACHE)
            await cache.put(event.request, network.clone())
          }

          return network
        } catch (error) {
          if (preloaded && !isServerError(preloaded)) return preloaded
          return navigationFallback(event.request, {
            source: 'fetch-exception',
            preloadStatus: preloaded?.status,
            error: String(error)
          })
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
