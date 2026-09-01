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
    expect(serviceWorkerSource).toContain('setTimeout(retry,3000)')
  })

  it('probes the origin and bypasses fallback after it recovers', () => {
    expect(serviceWorkerSource).toContain('"x-pwa-recovery":"1"')
    expect(serviceWorkerSource).toContain('url.searchParams.has(RECOVERY_PARAM)')
    expect(serviceWorkerSource).toContain(
      'event.respondWith(fetch(new Request(url, event.request)))'
    )
  })
})
