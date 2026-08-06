import { describe, expect, it } from 'vitest'
import { withSignupNotice } from '../../../src/lib/server/signupNotice'

describe('withSignupNotice', () => {
  it('appends signup_notice and clears it after reading', async () => {
    const updates: Array<{ pending_notice: null }> = []

    const supabase = {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } } })
      },
      from: (table: string) => {
        if (table !== 'profiles') throw new Error('Unexpected table')

        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { pending_notice: 'member_link_already_claimed' } })
            })
          }),
          update: (payload: { pending_notice: null }) => {
            updates.push(payload)
            return {
              eq: async () => ({ error: null })
            }
          }
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = await withSignupNotice(supabase as any, '/')

    expect(next).toBe('/?signup_notice=member_link_already_claimed')
    expect(updates).toEqual([{ pending_notice: null }])
  })

  it('returns original path when no notice exists', async () => {
    const supabase = {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { pending_notice: null } })
          })
        }),
        update: () => ({
          eq: async () => ({ error: null })
        })
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = await withSignupNotice(supabase as any, '/profile?x=1')

    expect(next).toBe('/profile?x=1')
  })
})
