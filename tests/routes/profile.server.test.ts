import { describe, expect, it } from 'vitest'
import { actions, load } from '../../src/routes/profile/+page.server'

const makeRequest = (fields: Record<string, string>) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return new Request('http://localhost/profile', { method: 'POST', body: formData })
}

describe('profile load', () => {
  it('returns available members excluding ones linked to another profile', async () => {
    const members = [
      { id: 'm1', name: 'Ana', family_name: 'A' },
      { id: 'm2', name: 'Beto', family_name: 'B' },
      { id: 'm3', name: 'Cris', family_name: 'C' }
    ]

    const takenRows = [{ member_id: 'm2' }]

    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({ single: async () => ({ data: { member_id: 'm1' } }) }),
              not: async () => ({ data: takenRows })
            })
          }
        }

        if (table === 'members') {
          return {
            select: () => ({ order: async () => ({ data: members }) })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({ locals: { supabase, user: { id: 'u1' } } })

    expect(data.linkedMember.id).toBe('m1')
    expect(data.availableMembers.map((member: { id: string }) => member.id)).toEqual(['m1', 'm3'])
  })
})

describe('setMemberLink action', () => {
  it('updates the current user profile member_id', async () => {
    const calls: Array<string | null> = []

    const supabase = {
      from: () => ({
        update: ({ member_id }: { member_id: string | null }) => {
          calls.push(member_id)
          return {
            eq: async () => ({ error: null })
          }
        }
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setMemberLink as any)({
      request: makeRequest({ member_id: 'member-1' }),
      locals: { supabase, user: { id: 'u1' } }
    })

    expect(calls).toEqual(['member-1'])
    expect(result).toEqual({ linkSaved: true })
  })

  it('returns a friendly message when member is already linked', async () => {
    const supabase = {
      from: () => ({
        update: () => ({
          eq: async () => ({ error: { code: '23505', message: 'duplicate key value' } })
        })
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setMemberLink as any)({
      request: makeRequest({ member_id: 'member-1' }),
      locals: { supabase, user: { id: 'u1' } }
    })

    expect(result.status).toBe(400)
    expect(result.data.linkError).toBe('Ese miembro ya está vinculado a otra cuenta.')
  })

  it('allows unlinking when member_id is empty', async () => {
    const calls: Array<string | null> = []

    const supabase = {
      from: () => ({
        update: ({ member_id }: { member_id: string | null }) => {
          calls.push(member_id)
          return {
            eq: async () => ({ error: null })
          }
        }
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setMemberLink as any)({
      request: makeRequest({ member_id: '' }),
      locals: { supabase, user: { id: 'u1' } }
    })

    expect(calls).toEqual([null])
    expect(result).toEqual({ linkSaved: true })
  })
})
