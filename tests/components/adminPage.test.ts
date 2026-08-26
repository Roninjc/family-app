// @vitest-environment jsdom
import { tick } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminPage from '../../src/routes/admin/+page.svelte'

type ResizeCallback = ConstructorParameters<typeof ResizeObserver>[0]
type IntersectionCallback = ConstructorParameters<typeof IntersectionObserver>[0]

class MockResizeObserver {
  static instances: MockResizeObserver[] = []
  callback: ResizeCallback

  constructor(callback: ResizeCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()

  trigger(width: number, height: number) {
    const entry = { contentRect: { width, height } } as ResizeObserverEntry
    this.callback([entry], this as unknown as ResizeObserver)
  }
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionCallback

  constructor(callback: IntersectionCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()

  trigger(isIntersecting: boolean) {
    const entry = { isIntersecting } as IntersectionObserverEntry
    this.callback([entry], this as unknown as IntersectionObserver)
  }
}

class MockWorker {
  static instances: MockWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor(_url: URL, _options?: WorkerOptions) {
    MockWorker.instances.push(this)
  }
}

const buildMembers = (count: number) =>
  Array.from({ length: count }, (_, idx) => ({
    id: `m-${idx}`,
    name: `Miembro ${idx}`,
    family_name: 'Test'
  }))

const buildData = (membersCount: number) => ({
  families: [
    {
      id: 'family-1',
      name: 'Familia Test',
      role: 'admin',
      metrics: {
        membersCount,
        usersCount: 1,
        unlinkedMembersCount: Math.max(0, Math.floor(membersCount / 3)),
        activeInvitesCount: 0,
        managersCount: 1
      }
    }
  ],
  activeFamily: {
    id: 'family-1',
    name: 'Familia Test',
    role: 'admin',
    metrics: {
      membersCount,
      usersCount: 1,
      unlinkedMembersCount: Math.max(0, Math.floor(membersCount / 3)),
      activeInvitesCount: 0,
      managersCount: 1
    }
  },
  canManageInvites: false,
  profiles: [
    {
      id: 'u-1',
      email: 'test@example.com',
      display_name: 'Test User',
      role: 'admin',
      member_id: null,
      created_at: new Date().toISOString()
    }
  ],
  invites: [],
  members: buildMembers(membersCount),
  currentUserId: 'u-1'
})

describe('admin page crowd performance', () => {
  let visibilityStateValue: DocumentVisibilityState = 'visible'
  let nextFrameId = 1
  let frameCallbacks = new Map<number, FrameRequestCallback>()

  const runAnimationFrame = async () => {
    const entry = frameCallbacks.entries().next().value
    if (!entry) return

    const [id, callback] = entry
    frameCallbacks.delete(id)
    callback(performance.now())
    await tick()
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    MockResizeObserver.instances = []
    MockIntersectionObserver.instances = []
    MockWorker.instances = []
    frameCallbacks = new Map<number, FrameRequestCallback>()
    nextFrameId = 1
    visibilityStateValue = 'visible'

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityStateValue
    })

    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker)
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = nextFrameId
        nextFrameId += 1
        frameCallbacks.set(id, callback)
        return id
      })
    )
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => {
        frameCallbacks.delete(id)
      })
    )

    const gradientStub = () => ({
      addColorStop: vi.fn()
    })
    const context2dStub = {
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      translate: vi.fn(),
      createLinearGradient: vi.fn(gradientStub),
      createRadialGradient: vi.fn(gradientStub),
      fillStyle: ''
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context2dStub)

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('renders canvas crowd for the active family', async () => {
    const membersCount = 24

    new AdminPage({
      target: document.body,
      props: { data: buildData(membersCount), form: null, params: { familyId: 'family-1' } }
    })

    await tick()

    const crowd = document.querySelector('.family-crowd-canvas')
    expect(crowd).toBeTruthy()
    expect(crowd?.getAttribute('aria-label')).toBe(`${membersCount} miembros en la familia`)

    const countText = document.querySelector('.crowd-floor-count__value')?.textContent?.trim()
    expect(countText).toBe(String(membersCount))

    expect(document.querySelectorAll('.mini-person')).toHaveLength(0)
  })

  it('sends pause and resume to the worker on page visibility changes', async () => {
    new AdminPage({
      target: document.body,
      props: { data: buildData(20), form: null, params: { familyId: 'family-1' } }
    })

    await tick()
    await runAnimationFrame()

    expect(MockWorker.instances.length).toBeGreaterThan(0)
    const worker = MockWorker.instances[0]

    visibilityStateValue = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    await tick()

    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'pause' })

    visibilityStateValue = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await tick()

    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'resume' })
  })

  it('sends visibility updates to the worker when offscreen/onscreen', async () => {
    new AdminPage({
      target: document.body,
      props: { data: buildData(20), form: null, params: { familyId: 'family-1' } }
    })

    await tick()
    await runAnimationFrame()

    expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0)
    expect(MockWorker.instances.length).toBeGreaterThan(0)
    const observer = MockIntersectionObserver.instances[0]
    const worker = MockWorker.instances[0]

    observer.trigger(false)
    await tick()

    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'visibility', visible: false })

    observer.trigger(true)
    await tick()

    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'visibility', visible: true })
  })

  it('passes member counters to CrowdCanvas through the rendered summary', async () => {
    const membersCount = 72
    const unlinkedMembersCount = Math.floor(membersCount / 3)

    new AdminPage({
      target: document.body,
      props: { data: buildData(membersCount), form: null, params: { familyId: 'family-1' } }
    })

    await tick()

    expect(document.querySelector('.crowd-floor-count__value')?.textContent?.trim()).toBe(
      String(membersCount)
    )
    expect(unlinkedMembersCount).toBeGreaterThan(0)
  })

  it('disconnects observers and disposes worker on destroy', async () => {
    const component = new AdminPage({
      target: document.body,
      props: { data: buildData(28), form: null, params: { familyId: 'family-1' } }
    })

    await tick()
    await runAnimationFrame()

    expect(MockResizeObserver.instances.length).toBeGreaterThan(0)
    expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0)
    expect(MockWorker.instances.length).toBeGreaterThan(0)

    const resizeObserver = MockResizeObserver.instances[0]
    const intersectionObserver = MockIntersectionObserver.instances[0]
    const worker = MockWorker.instances[0]

    component.$destroy()

    expect(resizeObserver.disconnect).toHaveBeenCalledTimes(1)
    expect(intersectionObserver.disconnect).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'dispose' })
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })
})
