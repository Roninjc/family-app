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
  let frameTime = 16.67
  let frameCallbacks = new Map<number, FrameRequestCallback>()

  const runAnimationFrame = async () => {
    const entry = frameCallbacks.entries().next().value
    if (!entry) return

    const [id, callback] = entry
    frameCallbacks.delete(id)
    frameTime += 16.67
    callback(frameTime)
    await tick()
  }

  const getFirstAvatarCoords = () => {
    const style = (document.querySelector('.mini-person') as HTMLElement | null)?.getAttribute('style')
    if (!style) return null
    const match = style.match(/--x:([-\d.]+)px; --y:([-\d.]+)px;/)
    if (!match) return null
    return { x: Number(match[1]), y: Number(match[2]) }
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    MockResizeObserver.instances = []
    MockIntersectionObserver.instances = []
    frameCallbacks = new Map<number, FrameRequestCallback>()
    nextFrameId = 1
    frameTime = 16.67
    visibilityStateValue = 'visible'

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityStateValue
    })

    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
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

  it('pauses animation when page becomes hidden and resumes when visible again', async () => {
    new AdminPage({
      target: document.body,
      props: { data: buildData(24), form: null, params: { familyId: 'family-1' } }
    })

    await tick()

    const rafCallsBefore = (requestAnimationFrame as unknown as ReturnType<typeof vi.fn>).mock.calls
      .length
    expect(rafCallsBefore).toBeGreaterThan(0)

    visibilityStateValue = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    await tick()

    const cancelCallsAfterHide = (cancelAnimationFrame as unknown as ReturnType<typeof vi.fn>).mock
      .calls.length
    expect(cancelCallsAfterHide).toBeGreaterThan(0)

    visibilityStateValue = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await tick()

    const rafCallsAfterResume = (requestAnimationFrame as unknown as ReturnType<typeof vi.fn>).mock
      .calls.length
    expect(rafCallsAfterResume).toBeGreaterThan(rafCallsBefore)
  })

  it('pauses offscreen and resumes when crowd re-enters viewport', async () => {
    new AdminPage({
      target: document.body,
      props: { data: buildData(20), form: null, params: { familyId: 'family-1' } }
    })

    await tick()

    expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0)
    const observer = MockIntersectionObserver.instances[0]

    observer.trigger(false)
    await tick()

    const cancelCallsOffscreen = (cancelAnimationFrame as unknown as ReturnType<typeof vi.fn>).mock
      .calls.length
    expect(cancelCallsOffscreen).toBeGreaterThan(0)

    const rafCallsBeforeReturn = (requestAnimationFrame as unknown as ReturnType<typeof vi.fn>).mock
      .calls.length
    observer.trigger(true)
    await tick()

    const rafCallsAfterReturn = (requestAnimationFrame as unknown as ReturnType<typeof vi.fn>).mock
      .calls.length
    expect(rafCallsAfterReturn).toBeGreaterThan(rafCallsBeforeReturn)
  })

  it('keeps one rendered avatar per member after multiple animation frames', async () => {
    const membersCount = 32

    new AdminPage({
      target: document.body,
      props: { data: buildData(membersCount), form: null, params: { familyId: 'family-1' } }
    })

    await tick()

    const resizeObserver = MockResizeObserver.instances[0]
    resizeObserver?.trigger(420, 420)
    await tick()

    for (let i = 0; i < 6; i += 1) {
      await runAnimationFrame()
    }

    const avatars = Array.from(document.querySelectorAll('.mini-person')) as HTMLElement[]
    expect(avatars).toHaveLength(membersCount)

    for (const avatar of avatars) {
      const style = avatar.getAttribute('style') ?? ''
      const match = style.match(/--x:([-\d.]+)px; --y:([-\d.]+)px;/)
      expect(match).toBeTruthy()

      const x = Number(match?.[1])
      const y = Number(match?.[2])
      expect(Number.isFinite(x)).toBe(true)
      expect(Number.isFinite(y)).toBe(true)
      expect(Math.hypot(x, y)).toBeLessThan(220)
    }
  })

  it('uses a lower simulation cadence on coarse pointers and still updates smoothly', async () => {
    ;(window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      matches: true,
      media: '(pointer: coarse)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })

    new AdminPage({
      target: document.body,
      props: { data: buildData(26), form: null, params: { familyId: 'family-1' } }
    })

    await tick()

    const before = getFirstAvatarCoords()
    expect(before).toBeTruthy()

    // Coarse-pointer cadence applies one update, one hold, then one update.
    await runAnimationFrame()
    const afterOneFrame = getFirstAvatarCoords()
    expect(afterOneFrame).toBeTruthy()
    expect(afterOneFrame).not.toEqual(before)

    // Second RAF tick should hold position due to cadence gating.
    await runAnimationFrame()
    const afterTwoFrames = getFirstAvatarCoords()
    expect(afterTwoFrames).toEqual(afterOneFrame)

    // Third RAF tick executes the next simulation step.
    await runAnimationFrame()
    const afterThreeFrames = getFirstAvatarCoords()
    expect(afterThreeFrames).toBeTruthy()
    expect(afterThreeFrames).not.toEqual(afterTwoFrames)
  })

  it('remains stable with large member sets under adaptive collision workload', async () => {
    const membersCount = 72

    new AdminPage({
      target: document.body,
      props: { data: buildData(membersCount), form: null, params: { familyId: 'family-1' } }
    })

    await tick()

    for (let i = 0; i < 10; i += 1) {
      await runAnimationFrame()
    }

    const avatars = Array.from(document.querySelectorAll('.mini-person')) as HTMLElement[]
    expect(avatars).toHaveLength(membersCount)

    for (const avatar of avatars) {
      const style = avatar.getAttribute('style') ?? ''
      const match = style.match(/--x:([-\d.]+)px; --y:([-\d.]+)px;/)
      expect(match).toBeTruthy()

      const x = Number(match?.[1])
      const y = Number(match?.[2])
      expect(Number.isFinite(x)).toBe(true)
      expect(Number.isFinite(y)).toBe(true)
      expect(Math.hypot(x, y)).toBeLessThan(240)
    }
  })

  it('keeps depth ordering consistent with vertical position', async () => {
    const membersCount = 28

    new AdminPage({
      target: document.body,
      props: { data: buildData(membersCount), form: null, params: { familyId: 'family-1' } }
    })

    await tick()

    for (let i = 0; i < 6; i += 1) {
      await runAnimationFrame()
    }

    const avatars = Array.from(document.querySelectorAll('.mini-person')) as HTMLElement[]
    expect(avatars).toHaveLength(membersCount)

    const extracted = avatars
      .map((avatar) => {
        const style = avatar.getAttribute('style') ?? ''
        const yMatch = style.match(/--y:([-\d.]+)px;/)
        const depthMatch = style.match(/--depth:([-\d.]+);/)
        if (!yMatch || !depthMatch) return null

        return {
          y: Number(yMatch[1]),
          depth: Number(depthMatch[1])
        }
      })
      .filter((entry): entry is { y: number; depth: number } => Boolean(entry))
      .sort((a, b) => a.y - b.y)

    expect(extracted.length).toBe(membersCount)

    for (let i = 1; i < extracted.length; i += 1) {
      expect(extracted[i].depth).toBeGreaterThanOrEqual(extracted[i - 1].depth)
    }
  })
})
