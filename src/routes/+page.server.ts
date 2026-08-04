import { error, fail, redirect } from '@sveltejs/kit'
import { rowsToFamilyData } from '$lib/server/familyAdapter'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const [membersRes, relationshipsRes] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, family_name, birth_date, photo_url')
      .order('created_at', { ascending: true }),
    supabase.from('relationships').select('member_a, member_b, type')
  ])

  if (membersRes.error)
    error(500, `No se pudieron cargar los miembros: ${membersRes.error.message}`)
  if (relationshipsRes.error)
    error(500, `No se pudieron cargar las relaciones: ${relationshipsRes.error.message}`)

  return {
    familyData: rowsToFamilyData(membersRes.data, relationshipsRes.data)
  }
}

export const actions: Actions = {
  addMember: async ({ request, locals: { supabase, user } }) => {
    if (!user) redirect(303, '/login')

    const form = await request.formData()
    const name = String(form.get('name') ?? '').trim()
    const familyName = String(form.get('familyName') ?? '').trim()
    const birthDate = String(form.get('birthDate') ?? '')
    const fatherId = String(form.get('fatherId') ?? '')
    const motherId = String(form.get('motherId') ?? '')
    const partnerId = String(form.get('partnerId') ?? '')
    const siblingsIds = form.getAll('siblingsIds').map(String).filter(Boolean)
    const previousPartnersIds = form.getAll('previousPartnersIds').map(String).filter(Boolean)

    if (!name) return fail(400, { addError: 'El nombre es obligatorio.' })

    const relations = [
      ...[fatherId, motherId]
        .filter(Boolean)
        .map((other) => ({ other, type: 'parent', direction: 'child_of' })),
      ...siblingsIds.map((other) => ({ other, type: 'sibling' })),
      ...(partnerId ? [{ other: partnerId, type: 'partner' }] : []),
      ...previousPartnersIds.map((other) => ({ other, type: 'previous_partner' }))
    ]

    const { data, error: rpcError } = await supabase.rpc('add_member_with_relations', {
      payload: { name, family_name: familyName, birth_date: birthDate, relations }
    })

    if (rpcError) {
      const message = /row-level security/i.test(rpcError.message)
        ? 'No tienes permisos para añadir miembros.'
        : rpcError.message
      return fail(403, { addError: message })
    }

    return { added: true, newMemberId: data }
  }
}
