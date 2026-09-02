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

  it('exposes family context from /family/:id/admin when the parent layout has no active cookie', async () => {
    const family = { id: 'f1', name: 'Familia Castaño' }
    const cookieWrites: Array<{ name: string; value: string }> = []
    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'u1',
                    email: 'admin@example.com',
                    display_name: 'Admin',
                    role: 'admin'
                  }
                })
              })
            })
          }
        }

        if (table === 'family_memberships') {
          return {
            select: (columns: string) => {
              if (columns.includes('families!inner')) {
                return {
                  eq: async () => ({
                    data: [{ family_id: 'f1', role: 'admin', member_id: null, families: family }],
                    error: null
                  })
                }
              }

              if (columns.includes('profiles!inner')) {
                return { eq: async () => ({ data: [], error: null }) }
              }

              return { in: async () => ({ data: [], error: null }) }
            }
          }
        }

        if (table === 'members') {
          return {
            select: (columns: string) =>
              columns.includes('family_name')
                ? { eq: () => ({ order: async () => ({ data: [], error: null }) }) }
                : { in: async () => ({ data: [], error: null }) }
          }
        }

        if (table === 'invitations') {
          return {
            select: (columns: string) =>
              columns === '*'
                ? { eq: () => ({ order: async () => ({ data: [], error: null }) }) }
                : { in: async () => ({ data: [], error: null }) }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    const data = await familyAdminLoad({
      locals: { user: { id: 'u1' }, supabase },
      cookies: {
        get: () => null,
        set: (name: string, value: string) => cookieWrites.push({ name, value })
      },
      params: { familyId: 'f1' },
      url: new URL('http://localhost/family/f1/admin')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    expect(data).toMatchObject({
      activeFamilyId: 'f1',
      activeFamilyName: 'Familia Castaño',
      availableFamilies: [{ id: 'f1', name: 'Familia Castaño' }]
    })
    expect(cookieWrites).toContainEqual({ name: 'active_family_id', value: 'f1' })
  })
})
