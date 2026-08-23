import { describe, expect, it } from 'vitest'
import { actions, load } from '../../src/routes/+page.server'

// Minimal supabase client mock: only what the page actions use
const makeSupabase = ({
  existingCoupleRows = [] as { id: string }[],
  insertError = null as { code?: string; message: string } | null
} = {}) => {
  const rpcCalls: { fn: string; args: unknown }[] = []
  const inserted: Record<string, string>[] = []
  const updated: Record<string, unknown>[] = []
  const eqCalls: { column: string; value: unknown }[] = []
  const matchCalls: Record<string, unknown>[] = []
  const coupleLookups: { column: string; value: unknown }[][] = []
  let deleteCount = 0

  const makeBuilder = () => {
    let filters: { column: string; value: unknown }[] = []
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters = [...filters, { column, value }]
        eqCalls.push({ column, value })
        return builder
      },
      in: (column: string, value: unknown) => {
        filters = [...filters, { column, value }]
        return builder
      },
      match: (row: Record<string, unknown>) => {
        matchCalls.push(row)
        return builder
      },
      limit: async () => {
        coupleLookups.push(filters)
        return { data: existingCoupleRows, error: null }
      },
      insert: async (row: Record<string, string>) => {
        if (insertError) return { error: insertError }
        inserted.push(row)
        return { error: null }
      },
      update: (row: Record<string, unknown>) => {
        updated.push(row)
        return builder
      },
      delete: () => {
        deleteCount++
        return builder
      },
      // update(...).eq(...) / delete().match(...) chains are awaited directly,
      // so the builder has to be thenable
      then: (resolve: (value: { data: null; error: null }) => void) =>
        resolve({ data: null, error: null })
    }
    return builder
  }

  const supabase = {
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args })
      return { data: 'new-id', error: null }
    },
    from: () => makeBuilder()
  }

  return {
    supabase,
    rpcCalls,
    inserted,
    updated,
    eqCalls,
    matchCalls,
    coupleLookups,
    getDeleteCount: () => deleteCount
  }
}

const makeRequest = (fields: Record<string, string | string[]>) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((v) => formData.append(key, v))
    else formData.set(key, value)
  }
  return new Request('http://localhost/', { method: 'POST', body: formData })
}

const callAction = (
  action: 'addMember' | 'updateMember' | 'deleteMember' | 'addRelation' | 'removeRelation',
  fields: Record<string, string | string[]>,
  supabaseMock = makeSupabase()
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event: any = {
    request: makeRequest(fields),
    locals: { supabase: supabaseMock.supabase, user: { id: 'user-1' } },
    cookies: {
      get: () => 'family-1'
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (actions[action] as any)(event)
}

describe('addMember action', () => {
  it("sends the new member's relations to the RPC, including existing children", async () => {
    const mock = makeSupabase()
    const result = await callAction(
      'addMember',
      {
        name: 'Grandpa',
        familyName: 'Test',
        birthDate: '1940-01-01',
        fatherId: 'aaa',
        motherId: 'bbb',
        partnerId: 'ccc',
        siblingsIds: ['ddd'],
        childrenIds: ['fff', 'ggg'],
        previousPartnersIds: ['eee']
      },
      mock
    )

    expect(result).toEqual({ added: true, newMemberId: 'new-id' })
    expect(mock.rpcCalls).toHaveLength(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = mock.rpcCalls[0].args as any
    expect(payload.payload.family_id).toBe('family-1')
    expect(payload.payload.relations).toEqual([
      { other: 'aaa', type: 'parent', direction: 'child_of' },
      { other: 'bbb', type: 'parent', direction: 'child_of' },
      { other: 'fff', type: 'parent', direction: 'parent_of' },
      { other: 'ggg', type: 'parent', direction: 'parent_of' },
      { other: 'ddd', type: 'sibling' },
      { other: 'ccc', type: 'partner' },
      { other: 'eee', type: 'previous_partner' }
    ])
  })

  it('creates the father-mother partner edge if none is recorded', async () => {
    const mock = makeSupabase({ existingCoupleRows: [] })
    await callAction(
      'addMember',
      { name: 'Child', familyName: 'Test', birthDate: '', fatherId: 'bbb', motherId: 'aaa' },
      mock
    )

    // Normalized member_a < member_b even though the father comes "later"
    expect(mock.inserted).toEqual([{ member_a: 'aaa', member_b: 'bbb', type: 'partner' }])
  })

  it('does not duplicate the edge if a partner or previous-partner row already exists', async () => {
    const mock = makeSupabase({ existingCoupleRows: [{ id: 'rel-1' }] })
    await callAction(
      'addMember',
      { name: 'Child', familyName: 'Test', birthDate: '', fatherId: 'aaa', motherId: 'bbb' },
      mock
    )

    expect(mock.inserted).toEqual([])
    expect(mock.coupleLookups).toHaveLength(1)
  })

  it('does not touch relationships when there is only one parent', async () => {
    const mock = makeSupabase()
    await callAction(
      'addMember',
      { name: 'Child', familyName: 'Test', birthDate: '', fatherId: 'aaa', motherId: '' },
      mock
    )

    expect(mock.coupleLookups).toEqual([])
    expect(mock.inserted).toEqual([])
  })
})

describe('updateMember action', () => {
  it("updates the given member's name, family name and birth date", async () => {
    const mock = makeSupabase()
    const result = await callAction(
      'updateMember',
      { memberId: 'm1', name: 'Ana', familyName: 'Castaño', birthDate: '1980-05-05' },
      mock
    )

    expect(result).toEqual({ updated: true })
    expect(mock.updated).toEqual([
      { name: 'Ana', family_name: 'Castaño', birth_date: '1980-05-05' }
    ])
    expect(mock.eqCalls).toContainEqual({ column: 'id', value: 'm1' })
  })

  it('stores birth_date null when the date is left empty', async () => {
    const mock = makeSupabase()
    await callAction(
      'updateMember',
      { memberId: 'm1', name: 'Ana', familyName: 'Castaño', birthDate: '' },
      mock
    )

    expect(mock.updated[0].birth_date).toBeNull()
  })

  it('rejects the edit without a name', async () => {
    const mock = makeSupabase()
    const result = await callAction(
      'updateMember',
      { memberId: 'm1', name: '', familyName: 'Castaño', birthDate: '' },
      mock
    )

    expect(result.status).toBe(400)
    expect(mock.updated).toEqual([])
  })
})

describe('addRelation action', () => {
  it("'parent' inserts the directed other→member row", async () => {
    const mock = makeSupabase()
    const result = await callAction(
      'addRelation',
      { memberId: 'child', otherId: 'father', kind: 'parent' },
      mock
    )

    expect(result).toEqual({ relationAdded: true })
    expect(mock.inserted).toEqual([{ member_a: 'father', member_b: 'child', type: 'parent' }])
  })

  it("'child' inserts the directed member→other row", async () => {
    const mock = makeSupabase()
    await callAction('addRelation', { memberId: 'father', otherId: 'child', kind: 'child' }, mock)

    expect(mock.inserted).toEqual([{ member_a: 'father', member_b: 'child', type: 'parent' }])
  })

  it('undirected relations are normalized with member_a < member_b', async () => {
    const mock = makeSupabase()
    await callAction('addRelation', { memberId: 'zzz', otherId: 'aaa', kind: 'partner' }, mock)
    await callAction('addRelation', { memberId: 'aaa', otherId: 'zzz', kind: 'sibling' }, mock)

    expect(mock.inserted).toEqual([
      { member_a: 'aaa', member_b: 'zzz', type: 'partner' },
      { member_a: 'aaa', member_b: 'zzz', type: 'sibling' }
    ])
  })

  it('a duplicate relation returns a friendly error', async () => {
    const mock = makeSupabase({ insertError: { code: '23505', message: 'duplicate key' } })
    const result = await callAction(
      'addRelation',
      { memberId: 'aaa', otherId: 'bbb', kind: 'partner' },
      mock
    )

    expect(result.status).toBe(400)
    expect(result.data.relationError).toBe('Esa relación ya existe.')
  })

  it('rejects relating a member to themselves and unknown kinds', async () => {
    const selfResult = await callAction('addRelation', {
      memberId: 'aaa',
      otherId: 'aaa',
      kind: 'partner'
    })
    const kindResult = await callAction('addRelation', {
      memberId: 'aaa',
      otherId: 'bbb',
      kind: 'enemy'
    })

    expect(selfResult.status).toBe(400)
    expect(kindResult.status).toBe(400)
  })
})

describe('removeRelation action', () => {
  it('deletes the corresponding normalized row', async () => {
    const mock = makeSupabase()
    const result = await callAction(
      'removeRelation',
      { memberId: 'child', otherId: 'father', kind: 'parent' },
      mock
    )

    expect(result).toEqual({ relationRemoved: true })
    expect(mock.getDeleteCount()).toBe(1)
    expect(mock.matchCalls).toEqual([{ member_a: 'father', member_b: 'child', type: 'parent' }])
  })

  it("'previous_partner' deletes the normalized row with member_a < member_b", async () => {
    const mock = makeSupabase()
    await callAction(
      'removeRelation',
      { memberId: 'zzz', otherId: 'aaa', kind: 'previous_partner' },
      mock
    )

    expect(mock.matchCalls).toEqual([
      { member_a: 'aaa', member_b: 'zzz', type: 'previous_partner' }
    ])
  })
})

describe('deleteMember action', () => {
  it('deletes the given member', async () => {
    const mock = makeSupabase()
    const result = await callAction('deleteMember', { memberId: 'm1' }, mock)

    expect(result).toEqual({ deleted: true })
    expect(mock.getDeleteCount()).toBe(1)
    expect(mock.eqCalls).toContainEqual({ column: 'id', value: 'm1' })
  })

  it('rejects the deletion without an id', async () => {
    const mock = makeSupabase()
    const result = await callAction('deleteMember', {}, mock)

    expect(result.status).toBe(400)
    expect(mock.getDeleteCount()).toBe(0)
  })
})

describe('root route canonical redirect', () => {
  it('redirects unauthenticated users to /login', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (load as any)({
        locals: { supabase: {}, user: null },
        cookies: { get: () => null, set: () => {} },
        url: new URL('http://localhost/')
      })
    ).rejects.toMatchObject({ status: 303, location: '/login' })
  })

  it('redirects to /family/:id using persisted active family', async () => {
    const cookieWrites: Array<{ name: string; value: string }> = []

    const supabase = {
      from: (table: string) => {
        if (table !== 'family_memberships') {
          throw new Error(`Unexpected table: ${table}`)
        }

        return {
          select: () => ({
            eq: async () => ({
              data: [{ family_id: 'f2', role: 'editor', families: { id: 'f2', name: 'Familia 2' } }],
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
        url: new URL('http://localhost/')
      })
    ).rejects.toMatchObject({
      status: 303,
      location: '/family/f2'
    })

    expect(cookieWrites).toContainEqual({ name: 'active_family_id', value: 'f2' })
  })

  it('redirects to /hub?state=no_family when user has no families', async () => {
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
        url: new URL('http://localhost/')
      })
    ).rejects.toMatchObject({
      status: 303,
      location: '/hub?state=no_family'
    })
  })
})
