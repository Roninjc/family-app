import { describe, expect, it } from 'vitest'
import { load as familyTreeLoad } from '../../src/routes/family/[familyId]/+page.server'
import { load as familyHubLoad } from '../../src/routes/family/[familyId]/hub/+page.server'
import { load as familyAdminLoad } from '../../src/routes/family/[familyId]/admin/+page.server'

const baseEvent = {
  locals: { user: null, supabase: {} },
  cookies: { get: () => null, set: () => {} }
}

describe('family route wrappers', () => {
  it('keeps auth guard behavior in /family/:id', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      familyTreeLoad({
        ...baseEvent,
        params: { familyId: 'f1' },
        url: new URL('http://localhost/family/f1')
      } as any)
    ).rejects.toMatchObject({
      status: 303,
      location: '/login'
    })
  })

  it('keeps auth guard behavior in /family/:id/hub', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      familyHubLoad({
        ...baseEvent,
        params: { familyId: 'f1' },
        url: new URL('http://localhost/family/f1/hub')
      } as any)
    ).rejects.toMatchObject({
      status: 303,
      location: '/login'
    })
  })

  it('keeps auth guard behavior in /family/:id/admin', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      familyAdminLoad({
        ...baseEvent,
        params: { familyId: 'f1' },
        url: new URL('http://localhost/family/f1/admin')
      } as any)
    ).rejects.toMatchObject({
      status: 303,
      location: '/login'
    })
  })
})
