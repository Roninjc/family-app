import { describe, expect, it } from 'vitest'
import { actions, load } from '../../src/routes/admin/+page.server'

const makeRequest = (fields: Record<string, string>) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return new Request('http://localhost/admin', { method: 'POST', body: formData })
}

describe('admin load family scope', () => {
  it('loads members, invitations and roles for the selected family', async () => {
    const userFamilies = [
      { family_id: 'f1', role: 'editor', families: { id: 'f1', name: 'Familia Castaño' } },
      { family_id: 'f2', role: 'admin', families: { id: 'f2', name: 'Familia Luna' } }
    ]

    const profileRows = [
      {
        profile_id: 'u2',
        role: 'viewer',
        profiles: {
          id: 'u2',
          email: 'viewer@test.dev',
          display_name: 'Viewer',
          member_id: null,
          created_at: '2026-08-01T00:00:00.000Z'
        }
      }
    ]

    const members = [{ id: 'm2', name: 'Cris', family_name: 'Luna' }]
    const invites = [{ id: 'i2', member_id: 'm2', type: 'member_linked' }]

    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'u1' } }) }) })
          }
        }

        if (table === 'family_memberships') {
          return {
            select: (columns: string) => {
              if (columns.includes('families!inner')) {
                return { eq: async () => ({ data: userFamilies, error: null }) }
              }

              return { eq: async () => ({ data: profileRows, error: null }) }
            }
          }
        }

        if (table === 'members') {
          return {
            select: () => {
              const eqBuilder = {
                eq: (_column: string, _value: string) => eqBuilder,
                order: async () => ({ data: members, error: null })
              }
              return eqBuilder
            }
          }
        }

        if (table === 'invitations') {
          return {
            select: () => ({
              eq: (_column: string, _value: string) => ({
                order: async () => ({ data: invites, error: null })
              })
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    const cookieWrites: Array<{ name: string; value: string }> = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({
      locals: { supabase, user: { id: 'u1' } },
      cookies: {
        get: () => null,
        set: (name: string, value: string) => cookieWrites.push({ name, value })
      },
      url: new URL('http://localhost/admin?family=f2')
    })

    expect(data.activeFamily.id).toBe('f2')
    expect(data.canManageRoles).toBe(true)
    expect(data.members).toEqual(members)
    expect(data.invites).toEqual(invites)
    expect(data.profiles[0].role).toBe('viewer')
    expect(cookieWrites).toContainEqual({ name: 'active_family_id', value: 'f2' })
  })
})

describe('admin setRole family scope', () => {
  it('updates role in family_memberships for selected family', async () => {
    const filters: Array<{ column: string; value: string }> = []

    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'u1' } }) }) })
          }
        }

        if (table === 'family_memberships') {
          return {
            select: (columns: string) => {
              if (columns.includes('families!inner')) {
                return {
                  eq: async () => ({
                    data: [{ family_id: 'f2', role: 'admin', families: { id: 'f2', name: 'Luna' } }],
                    error: null
                  })
                }
              }

              throw new Error('Unexpected select in this test')
            },
            update: (_row: { role: string }) => {
              const builder = {
                eq: (column: string, value: string) => {
                  filters.push({ column, value })
                  return builder
                },
                then: (resolve: (value: { error: null }) => void) => resolve({ error: null })
              }
              return builder
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setRole as any)({
      request: makeRequest({ familyId: 'f2', profileId: 'u2', role: 'editor' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f2', set: () => {} }
    })

    expect(result).toEqual({ roleUpdated: 'u2' })
    expect(filters).toContainEqual({ column: 'family_id', value: 'f2' })
    expect(filters).toContainEqual({ column: 'profile_id', value: 'u2' })
  })
})
