import { error, fail, redirect } from '@sveltejs/kit'
import type { Cookies } from '@sveltejs/kit'
import { mockFamilyData } from '$lib/data/mockFamily'
import {
  ACTIVE_FAMILY_COOKIE,
  loadUserFamilies,
  resolveAndPersistActiveFamily
} from '$lib/server/activeFamily'
import { rowsToFamilyData, type RelationshipRow } from '$lib/server/familyAdapter'
import {
  buildFamilyGroups,
  resolveActiveFamilyId,
  toRowsFromFamilyData
} from '$lib/server/familyGroups'
import { isMockFamilyMode } from '$lib/server/mockMode'

const RELATION_KINDS = ['parent', 'child', 'sibling', 'partner', 'previous_partner'] as const
export type RelationKind = (typeof RELATION_KINDS)[number]

// Maps (member, other, kind-from-the-member) to the normalized table row:
// 'parent' is directed member_a→member_b and the rest are stored once with
// member_a < member_b (string order matches Postgres uuid order for
// canonical lowercase uuids).
const relationRow = (memberId: string, otherId: string, kind: RelationKind) => {
  if (kind === 'parent') return { member_a: otherId, member_b: memberId, type: 'parent' }
  if (kind === 'child') return { member_a: memberId, member_b: otherId, type: 'parent' }

  const [memberA, memberB] = memberId < otherId ? [memberId, otherId] : [otherId, memberId]
  return { member_a: memberA, member_b: memberB, type: kind }
}

type TreeLoadContext = {
  locals: Pick<App.Locals, 'supabase' | 'user'>
  url: URL
  cookies: Cookies
}

export const loadTreePage = async (
  { locals: { supabase, user }, url, cookies }: TreeLoadContext,
  options?: { requestedFamilyId?: string | null }
) => {
  const requestedFamilyId = options?.requestedFamilyId ?? url.searchParams.get('family')

  if (isMockFamilyMode()) {
    const mockRows = toRowsFromFamilyData(mockFamilyData)
    const groups = buildFamilyGroups(mockRows.members, mockRows.relationships)
    const selectedFamilyId = resolveActiveFamilyId(
      groups.map((group) => group.id),
      requestedFamilyId,
      cookies.get(ACTIVE_FAMILY_COOKIE) ?? null
    )

    if (selectedFamilyId && selectedFamilyId !== cookies.get(ACTIVE_FAMILY_COOKIE)) {
      cookies.set(ACTIVE_FAMILY_COOKIE, selectedFamilyId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 180,
        sameSite: 'lax'
      })
    }

    const selectedGroup = groups.find((group) => group.id === selectedFamilyId)
    if (!selectedGroup) return { familyData: { members: [] }, activeFamilyId: null }

    const selectedIds = new Set(selectedGroup.memberIds)
    const selectedMembers = mockRows.members.filter((member) => selectedIds.has(member.id))
    const selectedRelationships = mockRows.relationships.filter(
      (relationship) =>
        selectedIds.has(relationship.member_a) && selectedIds.has(relationship.member_b)
    )

    return {
      familyData: rowsToFamilyData(selectedMembers, selectedRelationships),
      activeFamilyId: selectedGroup.id
    }
  }

  if (!user) throw redirect(303, '/login')

  const userFamilies = await loadUserFamilies(supabase, user.id)
  const selectedFamilyId = resolveAndPersistActiveFamily({
    families: userFamilies,
    requestedFamilyId,
    cookieFamilyId: cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
    cookies
  })

  if (!selectedFamilyId) {
    throw redirect(303, '/hub?state=no_family')
  }

  const { data: membersData, error: membersError } = await supabase
    .from('members')
    .select('id, name, family_name, birth_date, photo_url')
    .eq('family_id', selectedFamilyId)
    .order('created_at', { ascending: true })

  if (membersError) error(500, `No se pudieron cargar los miembros: ${membersError.message}`)

  const selectedIds = new Set((membersData ?? []).map((member) => member.id))
  const memberIds = [...selectedIds]

  let selectedRelationships: RelationshipRow[] = []
  if (memberIds.length > 0) {
    const { data, error: scopedRelationshipsError } = await supabase
      .from('relationships')
      .select('member_a, member_b, type')

    if (scopedRelationshipsError) {
      error(500, `No se pudieron cargar las relaciones: ${scopedRelationshipsError.message}`)
    }

    selectedRelationships = (data ?? []).filter(
      (relationship) =>
        selectedIds.has(relationship.member_a) && selectedIds.has(relationship.member_b)
    )
  }

  return {
    familyData: rowsToFamilyData(membersData ?? [], selectedRelationships),
    activeFamilyId: selectedFamilyId
  }
}

type TreeActionContext = {
  request: Request
  locals: Pick<App.Locals, 'supabase' | 'user'>
  cookies: Cookies
}

export const createTreeActions = (options?: { forcedFamilyId?: string | null }) => ({
  addMember: async ({ request, locals: { supabase, user }, cookies }: TreeActionContext) => {
    if (!user) throw redirect(303, '/login')
    if (isMockFamilyMode()) {
      return fail(400, {
        addError:
          'Estás en modo mock. Las altas/ediciones no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const name = String(form.get('name') ?? '').trim()
    const familyName = String(form.get('familyName') ?? '').trim()
    const birthDate = String(form.get('birthDate') ?? '')
    const fatherId = String(form.get('fatherId') ?? '')
    const motherId = String(form.get('motherId') ?? '')
    const partnerId = String(form.get('partnerId') ?? '')
    const siblingsIds = form.getAll('siblingsIds').map(String).filter(Boolean)
    const childrenIds = form.getAll('childrenIds').map(String).filter(Boolean)
    const previousPartnersIds = form.getAll('previousPartnersIds').map(String).filter(Boolean)
    const fallbackFamilyId = String(form.get('familyId') ?? '').trim()
    const familyId = options?.forcedFamilyId ?? cookies.get(ACTIVE_FAMILY_COOKIE) ?? (fallbackFamilyId || null)

    if (!name) return fail(400, { addError: 'El nombre es obligatorio.' })
    if (!familyId) {
      return fail(400, { addError: 'No hay una familia activa seleccionada.' })
    }

    const relations = [
      ...[fatherId, motherId]
        .filter(Boolean)
        .map((other) => ({ other, type: 'parent', direction: 'child_of' })),
      // Existing members as children of the new one: allows adding ancestors
      ...childrenIds.map((other) => ({ other, type: 'parent', direction: 'parent_of' })),
      ...siblingsIds.map((other) => ({ other, type: 'sibling' })),
      ...(partnerId ? [{ other: partnerId, type: 'partner' }] : []),
      ...previousPartnersIds.map((other) => ({ other, type: 'previous_partner' }))
    ]

    const { data, error: rpcError } = await supabase.rpc('add_member_with_relations', {
      payload: {
        name,
        family_name: familyName,
        birth_date: birthDate,
        family_id: familyId,
        relations
      }
    })

    if (rpcError) {
      const message = /row-level security/i.test(rpcError.message)
        ? 'No tienes permisos para añadir miembros.'
        : rpcError.message
      return fail(403, { addError: message })
    }

    // The tree only groups a child under both parents if a partner/
    // previous_partner edge exists between them, so if none is recorded we
    // create one as current partners. If this extra insert fails we don't
    // undo the add (the member already exists); it would just lack a line.
    if (fatherId && motherId && fatherId !== motherId) {
      // Same member_a < member_b order the table check enforces; string
      // comparison matches Postgres uuid order for canonical lowercase uuids.
      const [memberA, memberB] = fatherId < motherId ? [fatherId, motherId] : [motherId, fatherId]
      const { data: existingCouple } = await supabase
        .from('relationships')
        .select('id')
        .eq('member_a', memberA)
        .eq('member_b', memberB)
        .in('type', ['partner', 'previous_partner'])
        .limit(1)

      if (!existingCouple?.length) {
        await supabase
          .from('relationships')
          .insert({ member_a: memberA, member_b: memberB, type: 'partner' })
      }
    }

    return { added: true, newMemberId: data }
  },

  updateMember: async ({ request, locals: { supabase, user } }: TreeActionContext) => {
    if (!user) throw redirect(303, '/login')
    if (isMockFamilyMode()) {
      return fail(400, {
        editError:
          'Estás en modo mock. Las altas/ediciones no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const memberId = String(form.get('memberId') ?? '')
    const name = String(form.get('name') ?? '').trim()
    const familyName = String(form.get('familyName') ?? '').trim()
    const birthDate = String(form.get('birthDate') ?? '')

    if (!memberId) return fail(400, { editError: 'Falta el miembro a editar.' })
    if (!name) return fail(400, { editError: 'El nombre es obligatorio.' })

    const { error: updateError } = await supabase
      .from('members')
      .update({ name, family_name: familyName, birth_date: birthDate || null })
      .eq('id', memberId)

    if (updateError) {
      const message = /row-level security/i.test(updateError.message)
        ? 'No tienes permisos para editar miembros.'
        : updateError.message
      return fail(403, { editError: message })
    }

    return { updated: true }
  },

  deleteMember: async ({ request, locals: { supabase, user } }: TreeActionContext) => {
    if (!user) throw redirect(303, '/login')
    if (isMockFamilyMode()) {
      return fail(400, {
        editError:
          'Estás en modo mock. Las altas/ediciones no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const memberId = String(form.get('memberId') ?? '')

    if (!memberId) return fail(400, { editError: 'Falta el miembro a eliminar.' })

    // Relationships are removed in cascade (FK on delete cascade)
    const { error: deleteError } = await supabase.from('members').delete().eq('id', memberId)

    if (deleteError) {
      const message = /row-level security/i.test(deleteError.message)
        ? 'No tienes permisos para eliminar miembros.'
        : deleteError.message
      return fail(403, { editError: message })
    }

    return { deleted: true }
  },

  addRelation: async ({ request, locals: { supabase, user } }: TreeActionContext) => {
    if (!user) throw redirect(303, '/login')
    if (isMockFamilyMode()) {
      return fail(400, {
        relationError:
          'Estás en modo mock. Las altas/ediciones no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const memberId = String(form.get('memberId') ?? '')
    const otherId = String(form.get('otherId') ?? '')
    const kind = String(form.get('kind') ?? '') as RelationKind

    if (!memberId || !otherId || !RELATION_KINDS.includes(kind))
      return fail(400, { relationError: 'Relación no válida.' })
    if (memberId === otherId)
      return fail(400, { relationError: 'Un miembro no puede relacionarse consigo mismo.' })

    const { error: insertError } = await supabase
      .from('relationships')
      .insert(relationRow(memberId, otherId, kind))

    if (insertError) {
      if (insertError.code === '23505')
        return fail(400, { relationError: 'Esa relación ya existe.' })
      const message = /row-level security/i.test(insertError.message)
        ? 'No tienes permisos para editar relaciones.'
        : insertError.message
      return fail(403, { relationError: message })
    }

    return { relationAdded: true }
  },

  removeRelation: async ({ request, locals: { supabase, user } }: TreeActionContext) => {
    if (!user) throw redirect(303, '/login')
    if (isMockFamilyMode()) {
      return fail(400, {
        relationError:
          'Estás en modo mock. Las altas/ediciones no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const memberId = String(form.get('memberId') ?? '')
    const otherId = String(form.get('otherId') ?? '')
    const kind = String(form.get('kind') ?? '') as RelationKind

    if (!memberId || !otherId || !RELATION_KINDS.includes(kind))
      return fail(400, { relationError: 'Relación no válida.' })

    const { error: deleteError } = await supabase
      .from('relationships')
      .delete()
      .match(relationRow(memberId, otherId, kind))

    if (deleteError) {
      const message = /row-level security/i.test(deleteError.message)
        ? 'No tienes permisos para editar relaciones.'
        : deleteError.message
      return fail(403, { relationError: message })
    }

    return { relationRemoved: true }
  }
})
