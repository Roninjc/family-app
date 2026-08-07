import { describe, expect, it } from 'vitest'
import { actions, load } from '../../src/routes/hub/+page.server'

const makeRequest = (fields: Record<string, string>) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return new Request('http://localhost/hub', { method: 'POST', body: formData })
}

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

describe('hub notes actions', () => {
  it('creates a note in the active family', async () => {
    const inserted: Array<Record<string, string>> = []
    const supabase = {
      from: (table: string) => {
        if (table === 'family_memberships') {
          return {
            select: () => ({
              eq: async () => ({
                data: [{ family_id: 'f2', role: 'editor', families: { id: 'f2', name: 'Familia Luna' } }],
                error: null
              })
            })
          }
        }

        if (table === 'family_notes') {
          return {
            insert: async (row: Record<string, string>) => {
              inserted.push(row)
              return { error: null }
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.createNote as any)({
      request: makeRequest({ familyId: 'f2', title: 'Nueva nota', body: 'Texto', noteType: 'news' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f2', set: () => {} }
    })

    expect(result).toEqual({ noteCreated: true, familyId: 'f2' })
    expect(inserted).toEqual([
      {
        family_id: 'f2',
        title: 'Nueva nota',
        body: 'Texto',
        note_type: 'news',
        created_by: 'u1'
      }
    ])
  })

  it('rejects create note when title is empty', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: async () => ({ data: [], error: null })
        })
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.createNote as any)({
      request: makeRequest({ familyId: 'f2', title: '', body: 'Texto', noteType: 'note' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f2', set: () => {} }
    })

    expect(result.status).toBe(400)
    expect(result.data.noteError).toBe('El título es obligatorio.')
  })

  it('updates a note in the active family', async () => {
    const updated: Array<Record<string, string>> = []
    const filters: Array<{ column: string; value: string }> = []

    const supabase = {
      from: (table: string) => {
        if (table === 'family_memberships') {
          return {
            select: () => ({
              eq: async () => ({
                data: [{ family_id: 'f1', role: 'editor', families: { id: 'f1', name: 'Familia Castaño' } }],
                error: null
              })
            })
          }
        }

        if (table === 'family_notes') {
          const builder = {
            eq: (column: string, value: string) => {
              filters.push({ column, value })
              return builder
            },
            then: (resolve: (value: { error: null }) => void) => resolve({ error: null })
          }

          return {
            update: (row: Record<string, string>) => {
              updated.push(row)
              return builder
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.updateNote as any)({
      request: makeRequest({
        familyId: 'f1',
        noteId: 'n1',
        title: 'Editada',
        body: 'Nuevo texto',
        noteType: 'note'
      }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} }
    })

    expect(result).toEqual({ noteUpdated: true, familyId: 'f1' })
    expect(updated).toEqual([{ title: 'Editada', body: 'Nuevo texto', note_type: 'note' }])
    expect(filters).toContainEqual({ column: 'id', value: 'n1' })
    expect(filters).toContainEqual({ column: 'family_id', value: 'f1' })
  })

  it('deletes a note in the active family', async () => {
    const filters: Array<{ column: string; value: string }> = []

    const supabase = {
      from: (table: string) => {
        if (table === 'family_memberships') {
          return {
            select: () => ({
              eq: async () => ({
                data: [{ family_id: 'f1', role: 'editor', families: { id: 'f1', name: 'Familia Castaño' } }],
                error: null
              })
            })
          }
        }

        if (table === 'family_notes') {
          const builder = {
            eq: (column: string, value: string) => {
              filters.push({ column, value })
              return builder
            },
            then: (resolve: (value: { error: null }) => void) => resolve({ error: null })
          }

          return {
            delete: () => builder
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.deleteNote as any)({
      request: makeRequest({ familyId: 'f1', noteId: 'n2' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} }
    })

    expect(result).toEqual({ noteDeleted: true, familyId: 'f1' })
    expect(filters).toContainEqual({ column: 'id', value: 'n2' })
    expect(filters).toContainEqual({ column: 'family_id', value: 'f1' })
  })
})
