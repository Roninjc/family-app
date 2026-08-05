import { describe, expect, it } from 'vitest'
import { actions } from '../../src/routes/+page.server'

// Mock mínimo del cliente supabase: solo lo que usan las acciones de la página
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
      // Las cadenas update(...).eq(...) / delete().match(...) se await-ean
      // directamente, así que el builder tiene que ser thenable
      then: (resolve: (value: { data: null; error: null }) => void) =>
        resolve({ data: null, error: null })
    }
    return builder
  }

  const supabase = {
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args })
      return { data: 'nuevo-id', error: null }
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
    locals: { supabase: supabaseMock.supabase, user: { id: 'user-1' } }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (actions[action] as any)(event)
}

describe('acción addMember', () => {
  it('manda al RPC las relaciones del nuevo miembro, incluidos hijos existentes', async () => {
    const mock = makeSupabase()
    const result = await callAction(
      'addMember',
      {
        name: 'Abuelo',
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

    expect(result).toEqual({ added: true, newMemberId: 'nuevo-id' })
    expect(mock.rpcCalls).toHaveLength(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = mock.rpcCalls[0].args as any
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

  it('crea el vínculo de pareja padre-madre si no consta ninguno', async () => {
    const mock = makeSupabase({ existingCoupleRows: [] })
    await callAction(
      'addMember',
      { name: 'Hijo', familyName: 'Test', birthDate: '', fatherId: 'bbb', motherId: 'aaa' },
      mock
    )

    // Normalizado member_a < member_b aunque el padre llegue "después"
    expect(mock.inserted).toEqual([{ member_a: 'aaa', member_b: 'bbb', type: 'partner' }])
  })

  it('no duplica el vínculo si ya existe pareja o expareja entre ellos', async () => {
    const mock = makeSupabase({ existingCoupleRows: [{ id: 'rel-1' }] })
    await callAction(
      'addMember',
      { name: 'Hijo', familyName: 'Test', birthDate: '', fatherId: 'aaa', motherId: 'bbb' },
      mock
    )

    expect(mock.inserted).toEqual([])
    expect(mock.coupleLookups).toHaveLength(1)
  })

  it('no toca relationships si solo hay un progenitor', async () => {
    const mock = makeSupabase()
    await callAction(
      'addMember',
      { name: 'Hijo', familyName: 'Test', birthDate: '', fatherId: 'aaa', motherId: '' },
      mock
    )

    expect(mock.coupleLookups).toEqual([])
    expect(mock.inserted).toEqual([])
  })
})

describe('acción updateMember', () => {
  it('actualiza nombre, apellidos y fecha del miembro indicado', async () => {
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

  it('guarda birth_date null cuando la fecha se deja vacía', async () => {
    const mock = makeSupabase()
    await callAction(
      'updateMember',
      { memberId: 'm1', name: 'Ana', familyName: 'Castaño', birthDate: '' },
      mock
    )

    expect(mock.updated[0].birth_date).toBeNull()
  })

  it('rechaza la edición sin nombre', async () => {
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

describe('acción addRelation', () => {
  it("'parent' inserta la fila dirigida otro→miembro", async () => {
    const mock = makeSupabase()
    const result = await callAction(
      'addRelation',
      { memberId: 'hijo', otherId: 'padre', kind: 'parent' },
      mock
    )

    expect(result).toEqual({ relationAdded: true })
    expect(mock.inserted).toEqual([{ member_a: 'padre', member_b: 'hijo', type: 'parent' }])
  })

  it("'child' inserta la fila dirigida miembro→otro", async () => {
    const mock = makeSupabase()
    await callAction('addRelation', { memberId: 'padre', otherId: 'hijo', kind: 'child' }, mock)

    expect(mock.inserted).toEqual([{ member_a: 'padre', member_b: 'hijo', type: 'parent' }])
  })

  it('las relaciones no dirigidas se normalizan con member_a < member_b', async () => {
    const mock = makeSupabase()
    await callAction('addRelation', { memberId: 'zzz', otherId: 'aaa', kind: 'partner' }, mock)
    await callAction('addRelation', { memberId: 'aaa', otherId: 'zzz', kind: 'sibling' }, mock)

    expect(mock.inserted).toEqual([
      { member_a: 'aaa', member_b: 'zzz', type: 'partner' },
      { member_a: 'aaa', member_b: 'zzz', type: 'sibling' }
    ])
  })

  it('una relación duplicada devuelve error amigable', async () => {
    const mock = makeSupabase({ insertError: { code: '23505', message: 'duplicate key' } })
    const result = await callAction(
      'addRelation',
      { memberId: 'aaa', otherId: 'bbb', kind: 'partner' },
      mock
    )

    expect(result.status).toBe(400)
    expect(result.data.relationError).toBe('Esa relación ya existe.')
  })

  it('rechaza relacionarse consigo mismo y tipos desconocidos', async () => {
    const selfResult = await callAction('addRelation', {
      memberId: 'aaa',
      otherId: 'aaa',
      kind: 'partner'
    })
    const kindResult = await callAction('addRelation', {
      memberId: 'aaa',
      otherId: 'bbb',
      kind: 'enemigo'
    })

    expect(selfResult.status).toBe(400)
    expect(kindResult.status).toBe(400)
  })
})

describe('acción removeRelation', () => {
  it('borra la fila normalizada correspondiente', async () => {
    const mock = makeSupabase()
    const result = await callAction(
      'removeRelation',
      { memberId: 'hijo', otherId: 'padre', kind: 'parent' },
      mock
    )

    expect(result).toEqual({ relationRemoved: true })
    expect(mock.getDeleteCount()).toBe(1)
    expect(mock.matchCalls).toEqual([{ member_a: 'padre', member_b: 'hijo', type: 'parent' }])
  })

  it("'previous_partner' borra la fila normalizada con member_a < member_b", async () => {
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

describe('acción deleteMember', () => {
  it('borra el miembro indicado', async () => {
    const mock = makeSupabase()
    const result = await callAction('deleteMember', { memberId: 'm1' }, mock)

    expect(result).toEqual({ deleted: true })
    expect(mock.getDeleteCount()).toBe(1)
    expect(mock.eqCalls).toContainEqual({ column: 'id', value: 'm1' })
  })

  it('rechaza el borrado sin id', async () => {
    const mock = makeSupabase()
    const result = await callAction('deleteMember', {}, mock)

    expect(result.status).toBe(400)
    expect(mock.getDeleteCount()).toBe(0)
  })
})
