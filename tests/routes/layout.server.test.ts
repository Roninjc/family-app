import { describe, expect, it } from 'vitest'
import { load } from '../../src/routes/+layout.server'

describe('layout load displayName', () => {
  it('prefers profile display_name when present', async () => {
    const memberships = [
      {
        family_id: 'f1',
        role: 'viewer',
        member_id: 'm1',
        families: { id: 'f1', name: 'Familia Castaño' }
      }
    ]

    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { display_name: 'Pepe', role: 'viewer' } })
              })
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
              in: async () => ({ data: [{ id: 'm1', name: 'Maria Castano' }], error: null })
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({
      locals: { supabase, user: { id: 'u1', email: 'pepe@example.com' } },
      cookies: {
        get: () => null,
        set: () => {},
        getAll: () => []
      },
      url: new URL('http://localhost/hub?family=f1')
    })

    expect(data.displayName).toBe('Pepe')
  })

  it('uses linked member name when profile display_name is empty', async () => {
    const memberships = [
      {
        family_id: 'f1',
        role: 'viewer',
        member_id: 'm1',
        families: { id: 'f1', name: 'Familia Castaño' }
      }
    ]

    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { display_name: '   ', role: 'viewer' } })
              })
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
              in: async () => ({ data: [{ id: 'm1', name: 'Maria Castano' }], error: null })
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({
      locals: { supabase, user: { id: 'u1', email: 'maria@example.com' } },
      cookies: {
        get: () => null,
        set: () => {},
        getAll: () => []
      },
      url: new URL('http://localhost/hub?family=f1')
    })

    expect(data.displayName).toBe('Maria Castano')
  })

  it('falls back to email local-part when no profile name or linked member exists', async () => {
    const memberships = [
      {
        family_id: 'f1',
        role: 'viewer',
        member_id: null,
        families: { id: 'f1', name: 'Familia Castaño' }
      }
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

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({
      locals: { supabase, user: { id: 'u1', email: 'maria@example.com' } },
      cookies: {
        get: () => null,
        set: () => {},
        getAll: () => []
      },
      url: new URL('http://localhost/hub?family=f1')
    })

    expect(data.displayName).toBe('maria')
  })
})
