import { describe, expect, it } from 'vitest'
import { load } from '../../src/routes/hub/+page.server'

describe('hub load', () => {
  it('builds family panels and sets active family cookie from query', async () => {
    const members = [
      { id: 'a', name: 'Ana', family_id: 'f1' },
      { id: 'b', name: 'Beto', family_id: 'f1' },
      { id: 'c', name: 'Cris', family_id: 'f2' }
    ]
    const notes = [
      { id: 'n1', family_id: 'f2', title: 'Aviso', body: 'Nota persistida', note_type: 'news' }
    ]
    const memberships = [
      { family_id: 'f1', role: 'editor', families: { id: 'f1', name: 'Familia Castaño' } },
      { family_id: 'f2', role: 'editor', families: { id: 'f2', name: 'Familia Luna' } }
    ]

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

        if (table === 'family_memberships') {
          return {
            select: () => ({
              eq: async () => ({ data: memberships, error: null })
            })
          }
        }

        if (table === 'members') {
          return {
            select: () => ({
              in: async () => ({ data: members, error: null })
            })
          }
        }

        if (table === 'family_notes') {
          return {
            select: () => ({
              in: () => ({
                order: async () => ({ data: notes, error: null })
              })
            })
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
      url: new URL('http://localhost/hub?family=f2')
    })

    expect(data.families).toHaveLength(2)
    expect(data.activeFamilyId).toBe('f2')
    expect(data.activeFamilyName).toContain('Luna')
    expect(data.families[0].treeHref).toContain('/?family=f1')
    expect(data.families.find((family: { id: string }) => family.id === 'f2')?.notes[0].title).toBe(
      'Aviso'
    )
    expect(cookieWrites).toContainEqual({ name: 'active_family_id', value: 'f2' })
  })

  it('falls back to cookie family when query family is invalid', async () => {
    const memberships = [
      { family_id: 'f1', role: 'viewer', families: { id: 'f1', name: 'Familia Castaño' } },
      { family_id: 'f2', role: 'viewer', families: { id: 'f2', name: 'Familia Luna' } }
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

        if (table === 'family_memberships') {
          return {
            select: () => ({
              eq: async () => ({ data: memberships, error: null })
            })
          }
        }

        if (table === 'members') {
          return {
            select: () => ({
              in: async () => ({ data: [], error: null })
            })
          }
        }

        if (table === 'family_notes') {
          return {
            select: () => ({
              in: () => ({
                order: async () => ({ data: [], error: null })
              })
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({
      locals: { supabase, user: { id: 'u1', email: 'jesus@test.dev' } },
      cookies: {
        get: () => 'f1',
        set: () => {}
      },
      url: new URL('http://localhost/hub?family=missing')
    })

    expect(data.activeFamilyId).toBe('f1')
    expect(data.families).toHaveLength(2)
  })
})
