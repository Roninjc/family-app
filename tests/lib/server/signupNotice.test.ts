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

  it('adds invitation accepted context for recent signups', async () => {
    const now = new Date().toISOString()

    const supabase = {
      auth: {
        getUser: async () => ({
          data: { user: { id: 'user-2', created_at: now, last_sign_in_at: now } }
        })
      },
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { pending_notice: null } })
              })
            }),
            update: () => ({
              eq: async () => ({ error: null })
            })
          }
        }

        if (table === 'family_memberships') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [{ role: 'editor', families: { name: 'Familia Norte' } }]
                  })
                })
              })
            })
          }
        }

        throw new Error('Unexpected table')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = await withSignupNotice(supabase as any, '/dashboard')

    expect(next).toBe(
      '/dashboard?signup_notice=invitation_accepted&signup_role=editor&signup_family=Familia%20Norte'
    )
  })

  it('keeps warning notice and appends role context when member binding was already claimed', async () => {
    const now = new Date().toISOString()
    const updates: Array<{ pending_notice: null }> = []

    const supabase = {
      auth: {
        getUser: async () => ({
          data: { user: { id: 'user-3', created_at: now, last_sign_in_at: now } }
        })
      },
      from: (table: string) => {
        if (table === 'profiles') {
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

        if (table === 'family_memberships') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [{ role: 'viewer', families: [{ name: 'Familia Sur' }] }]
                  })
                })
              })
            })
          }
        }

        throw new Error('Unexpected table')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = await withSignupNotice(supabase as any, '/dashboard?x=1')

    expect(next).toBe(
      '/dashboard?x=1&signup_notice=member_link_already_claimed&signup_role=viewer&signup_family=Familia%20Sur'
    )
    expect(updates).toEqual([{ pending_notice: null }])
  })
})
