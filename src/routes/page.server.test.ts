import { describe, expect, it } from 'vitest'
import { actions } from './+page.server'

// Mock mínimo del cliente supabase: solo lo que usa la acción addMember
const makeSupabase = ({ existingCoupleRows = [] as { id: string }[] } = {}) => {
  const rpcCalls: { fn: string; args: unknown }[] = []
  const inserted: Record<string, string>[] = []
  const coupleLookups: { column: string; value: unknown }[][] = []

  const makeBuilder = () => {
    let filters: { column: string; value: unknown }[] = []
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters = [...filters, { column, value }]
        return builder
      },
      in: (column: string, value: unknown) => {
        filters = [...filters, { column, value }]
        return builder
      },
      limit: async () => {
        coupleLookups.push(filters)
        return { data: existingCoupleRows, error: null }
      },
      insert: async (row: Record<string, string>) => {
        inserted.push(row)
        return { error: null }
      }
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

  return { supabase, rpcCalls, inserted, coupleLookups }
}

const makeRequest = (fields: Record<string, string | string[]>) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((v) => formData.append(key, v))
    else formData.set(key, value)
  }
  return new Request('http://localhost/?/addMember', { method: 'POST', body: formData })
}

const callAddMember = (
  fields: Record<string, string | string[]>,
  supabaseMock = makeSupabase()
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event: any = {
    request: makeRequest(fields),
    locals: { supabase: supabaseMock.supabase, user: { id: 'user-1' } }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (actions.addMember as any)(event)
}

describe('acción addMember', () => {
  it('manda al RPC las relaciones del nuevo miembro', async () => {
    const mock = makeSupabase()
    const result = await callAddMember(
      {
        name: 'Hijo',
        familyName: 'Test',
        birthDate: '2000-01-01',
        fatherId: 'aaa',
        motherId: 'bbb',
        partnerId: 'ccc',
        siblingsIds: ['ddd'],
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
      { other: 'ddd', type: 'sibling' },
      { other: 'ccc', type: 'partner' },
      { other: 'eee', type: 'previous_partner' }
    ])
  })

  it('crea el vínculo de pareja padre-madre si no consta ninguno', async () => {
    const mock = makeSupabase({ existingCoupleRows: [] })
    await callAddMember(
      { name: 'Hijo', familyName: 'Test', birthDate: '', fatherId: 'bbb', motherId: 'aaa' },
      mock
    )

    // Normalizado member_a < member_b aunque el padre llegue "después"
    expect(mock.inserted).toEqual([{ member_a: 'aaa', member_b: 'bbb', type: 'partner' }])
  })

  it('no duplica el vínculo si ya existe pareja o expareja entre ellos', async () => {
    const mock = makeSupabase({ existingCoupleRows: [{ id: 'rel-1' }] })
    await callAddMember(
      { name: 'Hijo', familyName: 'Test', birthDate: '', fatherId: 'aaa', motherId: 'bbb' },
      mock
    )

    expect(mock.inserted).toEqual([])
    expect(mock.coupleLookups).toHaveLength(1)
  })

  it('no toca relationships si solo hay un progenitor', async () => {
    const mock = makeSupabase()
    await callAddMember(
      { name: 'Hijo', familyName: 'Test', birthDate: '', fatherId: 'aaa', motherId: '' },
      mock
    )

    expect(mock.coupleLookups).toEqual([])
    expect(mock.inserted).toEqual([])
  })
})
