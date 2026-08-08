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

  it('rejects role update when submitted family does not match active cookie family', async () => {
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
            update: () => {
              throw new Error('Should not update when family is out of sync')
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
      cookies: { get: () => 'f1', set: () => {} }
    })

    expect(result.status).toBe(409)
    expect(result.data.roleError).toBe(
      'La familia activa cambió antes de enviar el formulario. Recarga la página y vuelve a intentarlo.'
    )
  })
})

describe('admin invite actions family sync', () => {
  it('rejects general invitation when familyId is missing', async () => {
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
                    data: [{ family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }],
                    error: null
                  })
                }
              }

              throw new Error('Unexpected select in this test')
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      },
      rpc: () => {
        throw new Error('Should not create invitation when familyId is missing')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.inviteGeneral as any)({
      request: makeRequest({ role: 'viewer', expiryPreset: 'none', maxUses: '' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} },
      url: new URL('http://localhost/admin')
    })

    expect(result.status).toBe(409)
    expect(result.data.inviteError).toBe(
      'La familia activa cambió antes de enviar el formulario. Recarga la página y vuelve a intentarlo.'
    )
  })
})

describe('admin revoke invitation', () => {
  it('revokes a general invitation in the active family', async () => {
    const updates: Array<{ inviteId: string }> = []

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
                    data: [{ family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }],
                    error: null
                  })
                }
              }

              throw new Error('Unexpected select in this test')
            }
          }
        }

        if (table === 'invitations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'inv-1',
                    family_id: 'f1',
                    type: 'general',
                    revoked_at: null
                  }
                })
              })
            }),
            update: () => ({
              eq: (column: string, value: string) => {
                if (column === 'id') updates.push({ inviteId: value })
                return Promise.resolve({ error: null })
              }
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.revokeInvite as any)({
      request: makeRequest({ familyId: 'f1', inviteId: 'inv-1' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} }
    })

    expect(result).toEqual({
      revoked: 'inv-1',
      revokeSuccess: 'Invitación general revocada correctamente.'
    })
    expect(updates).toEqual([{ inviteId: 'inv-1' }])
  })

  it('rejects revocation for invitations outside the active family', async () => {
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
                    data: [{ family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }],
                    error: null
                  })
                }
              }

              throw new Error('Unexpected select in this test')
            }
          }
        }

        if (table === 'invitations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'inv-2',
                    family_id: 'f2',
                    type: 'member_linked',
                    revoked_at: null
                  }
                })
              })
            }),
            update: () => {
              throw new Error('Should not update out-of-family invitations')
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.revokeInvite as any)({
      request: makeRequest({ familyId: 'f1', inviteId: 'inv-2' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} }
    })

    expect(result.status).toBe(403)
    expect(result.data.inviteError).toBe('No puedes revocar invitaciones de otra familia.')
  })
})

describe('admin regenerate invite link', () => {
  it('regenerates link for general invitation and revokes previous one', async () => {
    const rpcCalls: Array<Record<string, unknown>> = []
    const revokeFilters: Array<{ column: string; value: string }> = []

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
                    data: [{ family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }],
                    error: null
                  })
                }
              }

              throw new Error('Unexpected select in this test')
            }
          }
        }

        if (table === 'invitations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'inv-old',
                    family_id: 'f1',
                    type: 'general',
                    role_on_signup: 'editor',
                    expires_at: null,
                    max_uses: 3,
                    revoked_at: null
                  }
                })
              })
            }),
            update: () => {
              const builder = {
                eq: (column: string, value: string) => {
                  revokeFilters.push({ column, value })
                  return builder
                },
                is: async () => ({ error: null })
              }
              return builder
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      },
      rpc: (_fn: string, args: Record<string, unknown>) => {
        rpcCalls.push(args)
        return Promise.resolve({ data: [{ token: 'new-token-123' }], error: null })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.regenerateInviteLink as any)({
      request: makeRequest({ familyId: 'f1', inviteId: 'inv-old' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} },
      url: new URL('http://localhost/admin')
    })

    expect(result).toEqual({
      invitedGeneral: true,
      familyId: 'f1',
      regeneratedInviteId: 'inv-old',
      inviteSuccess: 'Nuevo enlace generado. La invitación anterior quedó revocada.',
      inviteLink: 'http://localhost/login?invite=new-token-123'
    })
    expect(rpcCalls[0]).toMatchObject({
      invitation_type: 'general',
      invitation_family_id: 'f1',
      invitation_role: 'editor',
      invitation_max_uses: 3
    })
    expect(revokeFilters).toContainEqual({ column: 'id', value: 'inv-old' })
  })

  it('rejects regeneration for member-linked invitations', async () => {
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
                    data: [{ family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }],
                    error: null
                  })
                }
              }

              throw new Error('Unexpected select in this test')
            }
          }
        }

        if (table === 'invitations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'inv-member',
                    family_id: 'f1',
                    type: 'member_linked',
                    role_on_signup: 'viewer',
                    expires_at: null,
                    max_uses: 1,
                    revoked_at: null
                  }
                })
              })
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      },
      rpc: () => {
        throw new Error('Should not call RPC for member-linked invites')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.regenerateInviteLink as any)({
      request: makeRequest({ familyId: 'f1', inviteId: 'inv-member' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} },
      url: new URL('http://localhost/admin')
    })

    expect(result.status).toBe(400)
    expect(result.data.inviteError).toBe(
      'Solo se puede regenerar enlace para invitaciones generales.'
    )
  })
})
