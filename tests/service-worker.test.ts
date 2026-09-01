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
    expect(serviceWorkerSource).toContain('setTimeout(()=>location.reload(),3000)')
  })
})