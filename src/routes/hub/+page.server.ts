import { redirect } from '@sveltejs/kit'
import { mockFamilyData } from '$lib/data/mockFamily'
import {
  ACTIVE_FAMILY_COOKIE,
  loadUserFamilies,
  resolveAndPersistActiveFamily
} from '$lib/server/activeFamily'
import { buildFamilyGroups, resolveActiveFamilyId, toRowsFromFamilyData } from '$lib/server/familyGroups'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { Role } from '$lib/types/auth'
import type { PageServerLoad } from './$types'

const isManagerRole = (role: Role) => role === 'admin' || role === 'editor'

const notesForFamily = (familyName: string, membersCount: number) => [
  {
    id: 'n1',
    title: `Resumen de ${familyName}`,
    body: `${membersCount} miembros en esta rama. Puedes abrir su árbol para revisar relaciones.`
  },
  {
    id: 'n2',
    title: 'Notas internas',
    body: 'Comparte acuerdos, pendientes y recordatorios importantes para esta familia.'
  }
]

export const load: PageServerLoad = async ({ locals: { supabase, user }, cookies, url }) => {
  if (isMockFamilyMode()) {
    const rows = toRowsFromFamilyData(mockFamilyData)
    const groups = buildFamilyGroups(rows.members, rows.relationships)
    const families = groups.map((group) => ({
      id: group.id,
      name: group.name,
      membersCount: group.membersCount,
      linksCount: group.linksCount,
      previewMembers: group.previewMembers,
      notes: notesForFamily(group.name, group.membersCount),
      treeHref: `/?family=${encodeURIComponent(group.id)}`
    }))

    const activeFamilyId = resolveActiveFamilyId(
      families.map((family) => family.id),
      url.searchParams.get('family'),
      cookies.get(ACTIVE_FAMILY_COOKIE) ?? null
    )

    if (activeFamilyId && activeFamilyId !== cookies.get(ACTIVE_FAMILY_COOKIE)) {
      cookies.set(ACTIVE_FAMILY_COOKIE, activeFamilyId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 180,
        sameSite: 'lax'
      })
    }

    return {
      displayName: 'Modo mock',
      role: 'editor' as Role,
      families,
      activeFamilyId,
      activeFamilyName: families.find((family) => family.id === activeFamilyId)?.name ?? null,
      pendingInvitations: 0,
      showPendingInvitations: true
    }
  }

  if (!user) redirect(303, '/login')

  const [profileRes, userFamilies] = await Promise.all([
    supabase.from('profiles').select('display_name, role').eq('id', user.id).single(),
    loadUserFamilies(supabase, user.id)
  ])

  const role = (profileRes.data?.role ?? 'viewer') as Role

  const activeFamilyId = resolveAndPersistActiveFamily({
    families: userFamilies,
    requestedFamilyId: url.searchParams.get('family'),
    cookieFamilyId: cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
    cookies
  })

  const familyIds = userFamilies.map((family) => family.id)
  const [membersRes, notesRes] = await Promise.all([
    familyIds.length > 0
      ? supabase.from('members').select('id, name, family_id').in('family_id', familyIds)
      : Promise.resolve({ data: [], error: null }),
    familyIds.length > 0
      ? supabase
          .from('family_notes')
          .select('id, family_id, title, body, note_type, created_at')
          .in('family_id', familyIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null })
  ])

  const countByFamily = new Map<string, number>()
  const previewByFamily = new Map<string, string[]>()

  for (const member of membersRes.data ?? []) {
    countByFamily.set(member.family_id, (countByFamily.get(member.family_id) ?? 0) + 1)
    const preview = previewByFamily.get(member.family_id) ?? []
    if (preview.length < 5) preview.push(member.name)
    previewByFamily.set(member.family_id, preview)
  }

  const notesByFamily = new Map<string, Array<{ id: string; title: string; body: string }>>()
  for (const note of notesRes.data ?? []) {
    const collection = notesByFamily.get(note.family_id) ?? []
    collection.push({ id: note.id, title: note.title, body: note.body })
    notesByFamily.set(note.family_id, collection)
  }

  const families = userFamilies.map((family) => ({
    id: family.id,
    name: family.name,
    membersCount: countByFamily.get(family.id) ?? 0,
    linksCount: 0,
    previewMembers: previewByFamily.get(family.id) ?? [],
    notes: notesByFamily.get(family.id) ?? notesForFamily(family.name, countByFamily.get(family.id) ?? 0),
    treeHref: `/?family=${encodeURIComponent(family.id)}`
  }))

  let pendingInvitations = 0
  if (isManagerRole(role)) {
    const { data: invitations } = await supabase
      .from('invitations')
      .select('id, expires_at, revoked_at')
      .is('revoked_at', null)

    const now = Date.now()
    pendingInvitations = (invitations ?? []).filter((invite) => {
      if (!invite.expires_at) return true
      return new Date(invite.expires_at).getTime() > now
    }).length
  }

  return {
    displayName: profileRes.data?.display_name?.trim() || user.email?.split('@')[0] || 'Familiar',
    role,
    families,
    activeFamilyId,
    activeFamilyName: families.find((family) => family.id === activeFamilyId)?.name ?? null,
    pendingInvitations,
    showPendingInvitations: isManagerRole(role)
  }
}
