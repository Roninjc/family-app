import { describe, expect, it } from 'vitest'
import serviceWorkerSource from '../src/service-worker.ts?raw'

describe('service worker update lifecycle', () => {
  it('does not take over clients that still use assets from the previous build', () => {
    expect(serviceWorkerSource).not.toContain('skipWaiting()')
    expect(serviceWorkerSource).not.toContain('clients.claim()')
  })

  it('precaches the new build before it becomes eligible for activation', () => {
    expect(serviceWorkerSource).toContain('cache.addAll(ASSETS)')
  })

  it('does not persist the temporary recovery page', () => {
    expect(serviceWorkerSource).toContain("'cache-control': 'no-store'")
    expect(serviceWorkerSource).toContain('setTimeout(retry, 3000)')
  })

  it('probes the origin and bypasses fallback after it recovers', () => {
    expect(serviceWorkerSource).toContain("'x-pwa-recovery': '1'")
    expect(serviceWorkerSource).toContain('url.searchParams.has(RECOVERY_PARAM)')
    expect(serviceWorkerSource).toContain(
      'event.respondWith(fetch(new Request(url, event.request)))'
    )
  })

  it('shows privacy-safe diagnostics for the initial failure and every probe', () => {
    expect(serviceWorkerSource).toContain("source: 'network-server-error'")
    expect(serviceWorkerSource).toContain("source: 'fetch-exception'")
    expect(serviceWorkerSource).toContain("record('probe-response'")
    expect(serviceWorkerSource).toContain("record('probe-exception'")
    expect(serviceWorkerSource).toContain("record('worker-state'")
    expect(serviceWorkerSource).toContain("record('worker-reset'")
    expect(serviceWorkerSource).toContain("'orikara:pwa-recovery-log'")
    expect(serviceWorkerSource).toContain('entries = entries.slice(-30)')
    expect(serviceWorkerSource).not.toContain('document.cookie')
    expect(serviceWorkerSource).not.toContain('authorization')
  })

  it('resets only the app worker and versioned app caches after the origin recovers', () => {
    expect(serviceWorkerSource).toContain('await registration?.unregister()')
    expect(serviceWorkerSource).toContain("cacheName.startsWith('family-app-')")
  })

  it('catches navigation preload failures', () => {
    const navigationHandler = serviceWorkerSource.indexOf("event.request.mode === 'navigate'")
    const tryBlock = serviceWorkerSource.indexOf('try {', navigationHandler)
    const preloadAwait = serviceWorkerSource.indexOf(
      'preloaded = await event.preloadResponse',
      navigationHandler
    )

    expect(tryBlock).toBeGreaterThan(navigationHandler)
    expect(preloadAwait).toBeGreaterThan(tryBlock)
  })
})
