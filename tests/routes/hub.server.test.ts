import { describe, expect, it } from 'vitest'
import { load } from '../../src/routes/hub/+page.server'

describe('hub load', () => {
  it('builds family panels and sets active family cookie from query', async () => {
    const members = [
      { id: 'a', name: 'Ana', family_name: 'Castaño', birth_date: null, photo_url: null },
      { id: 'b', name: 'Beto', family_name: 'Castaño', birth_date: null, photo_url: null },
      { id: 'c', name: 'Cris', family_name: 'Luna', birth_date: null, photo_url: null }
    ]

    const relationships = [{ member_a: 'a', member_b: 'b', type: 'partner' as const }]

    const cookieWrites: Array<{ name: string; value: string }> = []

    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({ single: async () => ({ data: { display_name: 'Jesús', role: 'editor' } }) })
            })
          }
        }

        if (table === 'members') {
          return {
            select: () => ({ order: async () => ({ data: members }) })
          }
        }

        if (table === 'relationships') {
          return {
            select: async () => ({ data: relationships })
          }
        }

        if (table === 'invitations') {
          return {
            select: () => ({
              is: async () => ({ data: [{ id: 'i1', expires_at: null, revoked_at: null }] })
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    const cookies = {
      get: (name: string) => (name === 'active_family_id' ? null : null),
      set: (name: string, value: string) => {
        cookieWrites.push({ name, value })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({
      locals: { supabase, user: { id: 'u1', email: 'jesus@test.dev' } },
      cookies,
      url: new URL('http://localhost/hub?family=c')
    })

    expect(data.families).toHaveLength(2)
    expect(data.activeFamilyId).toBe('c')
    expect(data.activeFamilyName).toContain('Luna')
    expect(data.families[0].treeHref).toContain('/?family=')
    expect(cookieWrites).toContainEqual({ name: 'active_family_id', value: 'c' })
  })

  it('falls back to cookie family when query family is invalid', async () => {
    const members = [
      { id: 'a', name: 'Ana', family_name: 'Castaño', birth_date: null, photo_url: null },
      { id: 'b', name: 'Beto', family_name: 'Castaño', birth_date: null, photo_url: null }
    ]

    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({ single: async () => ({ data: { display_name: null, role: 'viewer' } }) })
            })
          }
        }

        if (table === 'members') {
          return {
            select: () => ({ order: async () => ({ data: members }) })
          }
        }

        if (table === 'relationships') {
          return {
            select: async () => ({ data: [] })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({
      locals: { supabase, user: { id: 'u1', email: 'jesus@test.dev' } },
      cookies: {
        get: () => 'a',
        set: () => {}
      },
      url: new URL('http://localhost/hub?family=missing')
    })

    expect(data.activeFamilyId).toBe('a')
    expect(data.families).toHaveLength(2)
  })
})
