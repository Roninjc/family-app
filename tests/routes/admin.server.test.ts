import { describe, expect, it } from 'vitest'
import { actions, load } from '../../src/routes/admin/+page.server'

const makeRequest = (fields: Record<string, string>) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return new Request('http://localhost/admin', { method: 'POST', body: formData })
}

describe('admin canonical redirect', () => {
  it('redirects unauthenticated users from /admin to /login', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (load as any)({
        locals: { supabase: {}, user: null },
        cookies: { get: () => null, set: () => {} },
        url: new URL('http://localhost/admin')
      })
    ).rejects.toMatchObject({ status: 303, location: '/login' })
  })

  it('redirects /admin to /family/:id/admin using active family resolution', async () => {
    const cookieWrites: Array<{ name: string; value: string }> = []

    const supabase = {
      from: (table: string) => {
        if (table !== 'family_memberships') {
          throw new Error(`Unexpected table: ${table}`)
        }

        return {
          select: () => ({
            eq: async () => ({
              data: [
                { family_id: 'f2', role: 'admin', families: { id: 'f2', name: 'Familia Luna' } }
              ],
              error: null
            })
          })
        }
      }
    }

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (load as any)({
        locals: { supabase, user: { id: 'u1' } },
        cookies: {
          get: () => null,
          set: (name: string, value: string) => cookieWrites.push({ name, value })
        },
        url: new URL('http://localhost/admin')
      })
    ).rejects.toMatchObject({
      status: 303,
      location: '/family/f2/admin'
    })

    expect(cookieWrites).toContainEqual({ name: 'active_family_id', value: 'f2' })
  })

  it('redirects /admin to hub no-family state when user has no memberships', async () => {
    const supabase = {
      from: (table: string) => {
        if (table !== 'family_memberships') {
          throw new Error(`Unexpected table: ${table}`)
        }

        return {
          select: () => ({
            eq: async () => ({ data: [], error: null })
          })
        }
      }
    }

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (load as any)({
        locals: { supabase, user: { id: 'u1' } },
        cookies: { get: () => null, set: () => {} },
        url: new URL('http://localhost/admin')
      })
    ).rejects.toMatchObject({
      status: 303,
      location: '/hub?state=no_family'
    })
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
                    data: [
                      { family_id: 'f2', role: 'admin', families: { id: 'f2', name: 'Luna' } }
                    ],
                    error: null
                  })
                }
              }

              const membershipBuilder = {
                eq: (_column: string, _value: string) => membershipBuilder,
                maybeSingle: async () => ({
                  data: { profile_id: 'u2', role: 'viewer' },
                  error: null
                })
              }

              return membershipBuilder
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
                    data: [
                      { family_id: 'f2', role: 'admin', families: { id: 'f2', name: 'Luna' } }
                    ],
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
      'La familia activa cambió mientras completabas la acción. Recarga la página y vuelve a intentarlo.'
    )
  })
})

describe('admin setMemberLink family scope', () => {
  it('updates member link in family_memberships for selected family', async () => {
    const updates: Array<{ column: string; value: string }> = []

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
                    data: [
                      { family_id: 'f2', role: 'admin', families: { id: 'f2', name: 'Luna' } }
                    ],
                    error: null
                  })
                }
              }

              const membershipBuilder = {
                eq: (_column: string, _value: string) => membershipBuilder,
                maybeSingle: async () => ({ data: { profile_id: 'u2' }, error: null })
              }

              return membershipBuilder
            },
            update: () => {
              const builder = {
                eq: (column: string, value: string) => {
                  updates.push({ column, value })
                  return builder
                },
                then: (resolve: (value: { error: null }) => void) => resolve({ error: null })
              }
              return builder
            }
          }
        }

        if (table === 'members') {
          return {
            select: () => {
              const memberBuilder = {
                eq: (_column: string, _value: string) => memberBuilder,
                maybeSingle: async () => ({ data: { id: 'm2' }, error: null })
              }

              return memberBuilder
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setMemberLink as any)({
      request: makeRequest({ familyId: 'f2', profileId: 'u2', memberId: 'm2' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f2', set: () => {} }
    })

    expect(result).toEqual({ linkUpdated: 'u2', familyId: 'f2' })
    expect(updates).toContainEqual({ column: 'family_id', value: 'f2' })
    expect(updates).toContainEqual({ column: 'profile_id', value: 'u2' })
  })

  it('allows a viewer to edit only their own link', async () => {
    const updates: Array<{ column: string; value: string }> = []

    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'u3' } }) }) })
          }
        }

        if (table === 'family_memberships') {
          return {
            select: (columns: string) => {
              if (columns.includes('families!inner')) {
                return {
                  eq: async () => ({
                    data: [
                      { family_id: 'f2', role: 'viewer', families: { id: 'f2', name: 'Luna' } }
                    ],
                    error: null
                  })
                }
              }

              const membershipBuilder = {
                eq: (_column: string, _value: string) => membershipBuilder,
                maybeSingle: async () => ({ data: { profile_id: 'u3' }, error: null })
              }

              return membershipBuilder
            },
            update: () => {
              const builder = {
                eq: (column: string, value: string) => {
                  updates.push({ column, value })
                  return builder
                },
                then: (resolve: (value: { error: null }) => void) => resolve({ error: null })
              }
              return builder
            }
          }
        }

        if (table === 'members') {
          return {
            select: () => {
              const memberBuilder = {
                eq: (_column: string, _value: string) => memberBuilder,
                maybeSingle: async () => ({ data: { id: 'm2' }, error: null })
              }

              return memberBuilder
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setMemberLink as any)({
      request: makeRequest({ familyId: 'f2', profileId: 'u3', memberId: 'm2' }),
      locals: { supabase, user: { id: 'u3' } },
      cookies: { get: () => 'f2', set: () => {} }
    })

    expect(result).toEqual({ linkUpdated: 'u3', familyId: 'f2' })
    expect(updates).toContainEqual({ column: 'profile_id', value: 'u3' })
  })

  it('rejects viewer editing another user link', async () => {
    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'u3' } }) }) })
          }
        }

        if (table === 'family_memberships') {
          return {
            select: (columns: string) => {
              if (columns.includes('families!inner')) {
                return {
                  eq: async () => ({
                    data: [
                      { family_id: 'f2', role: 'viewer', families: { id: 'f2', name: 'Luna' } }
                    ],
                    error: null
                  })
                }
              }

              throw new Error('Should not query target membership when viewer edits another user')
            },
            update: () => {
              throw new Error('Should not update links for other users as viewer')
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setMemberLink as any)({
      request: makeRequest({ familyId: 'f2', profileId: 'u2', memberId: 'm2' }),
      locals: { supabase, user: { id: 'u3' } },
      cookies: { get: () => 'f2', set: () => {} }
    })

    expect(result.status).toBe(403)
    expect(result.data.linkError).toBe(
      'En modo solo lectura solo puedes editar tu propia vinculación.'
    )
  })
})

describe('admin setRole permissions', () => {
  it('rejects editor assigning admin role', async () => {
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
                    data: [
                      { family_id: 'f1', role: 'editor', families: { id: 'f1', name: 'Castaño' } }
                    ],
                    error: null
                  })
                }
              }

              const membershipBuilder = {
                eq: (_column: string, _value: string) => membershipBuilder,
                maybeSingle: async () => ({
                  data: { profile_id: 'u2', role: 'viewer' },
                  error: null
                })
              }

              return membershipBuilder
            },
            update: () => {
              throw new Error('Should not update admin role from editor')
            }
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setRole as any)({
      request: makeRequest({ familyId: 'f1', profileId: 'u2', role: 'admin' }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} }
    })

    expect(result.status).toBe(403)
    expect(result.data.roleError).toBe(
      'Un editor no puede asignar ni modificar roles de administrador.'
    )
  })
})

describe('admin saveUsers action', () => {
  it('applies bulk role/link updates for admin', async () => {
    const updates: Array<{
      row: Record<string, unknown>
      filters: Array<{ column: string; value: string }>
    }> = []

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
                    data: [
                      { family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }
                    ],
                    error: null
                  })
                }
              }

              const membershipRows = [
                { profile_id: 'u2', role: 'viewer', member_id: null },
                { profile_id: 'u3', role: 'editor', member_id: 'm1' }
              ]

              return {
                eq: (_column: string, _value: string) => ({
                  in: async () => ({ data: membershipRows, error: null })
                })
              }
            },
            update: (row: Record<string, unknown>) => {
              const filters: Array<{ column: string; value: string }> = []
              const builder = {
                eq: (column: string, value: string) => {
                  filters.push({ column, value })
                  return builder
                },
                then: (resolve: (value: { error: null }) => void) => {
                  updates.push({ row, filters: [...filters] })
                  resolve({ error: null })
                }
              }
              return builder
            }
          }
        }

        if (table === 'members') {
          return {
            select: () => ({
              eq: (_column: string, _value: string) => ({
                in: async () => ({ data: [{ id: 'm2' }], error: null })
              })
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    const changesJson = JSON.stringify([
      { profileId: 'u2', role: 'editor', memberId: 'm2' },
      { profileId: 'u3', role: 'viewer', memberId: '' }
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.saveUsers as any)({
      request: makeRequest({ familyId: 'f1', changesJson }),
      locals: { supabase, user: { id: 'u1' } },
      cookies: { get: () => 'f1', set: () => {} }
    })

    expect(result).toEqual({ usersSaved: 2, usersSavedFamilyId: 'f1' })
    expect(updates).toHaveLength(2)
  })

  it('rejects viewer trying to change another user link', async () => {
    const supabase = {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'u3' } }) }) })
          }
        }

        if (table === 'family_memberships') {
          return {
            select: (columns: string) => {
              if (columns.includes('families!inner')) {
                return {
                  eq: async () => ({
                    data: [
                      { family_id: 'f1', role: 'viewer', families: { id: 'f1', name: 'Castaño' } }
                    ],
                    error: null
                  })
                }
              }

              return {
                eq: (_column: string, _value: string) => ({
                  in: async () => ({
                    data: [{ profile_id: 'u2', role: 'viewer', member_id: null }],
                    error: null
                  })
                })
              }
            },
            update: () => {
              throw new Error('Viewer should not update other profiles')
            }
          }
        }

        if (table === 'members') {
          return {
            select: () => ({
              eq: (_column: string, _value: string) => ({
                in: async () => ({ data: [{ id: 'm2' }], error: null })
              })
            })
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    }

    const changesJson = JSON.stringify([{ profileId: 'u2', role: 'viewer', memberId: 'm2' }])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.saveUsers as any)({
      request: makeRequest({ familyId: 'f1', changesJson }),
      locals: { supabase, user: { id: 'u3' } },
      cookies: { get: () => 'f1', set: () => {} }
    })

    expect(result.status).toBe(403)
    expect(result.data.usersError).toBe(
      'En modo solo lectura solo puedes editar tu propia vinculación.'
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
                    data: [
                      { family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }
                    ],
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
      'La familia activa cambió mientras completabas la acción. Recarga la página y vuelve a intentarlo.'
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
                    data: [
                      { family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }
                    ],
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
      revokeSuccess: 'Invitación general revocada.'
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
                    data: [
                      { family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }
                    ],
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
    expect(result.data.inviteError).toBe('No puedes revocar invitaciones de otra familia activa.')
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
                    data: [
                      { family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }
                    ],
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
      inviteSuccess: 'Nuevo enlace generado. El enlace anterior quedó revocado.',
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
                    data: [
                      { family_id: 'f1', role: 'admin', families: { id: 'f1', name: 'Castaño' } }
                    ],
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
      'Solo las invitaciones generales permiten regenerar enlace.'
    )
  })
})
