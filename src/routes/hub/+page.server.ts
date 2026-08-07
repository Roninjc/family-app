import { redirect } from '@sveltejs/kit'
import type { Cookies } from '@sveltejs/kit'
import { mockFamilyData } from '$lib/data/mockFamily'
import { buildFamilyGroups, resolveActiveFamilyId, toRowsFromFamilyData } from '$lib/server/familyGroups'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { Role } from '$lib/types/auth'
import type { PageServerLoad } from './$types'

const ACTIVE_FAMILY_COOKIE = 'active_family_id'

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

const resolveActive = (options: {
  families: Array<{ id: string }>
  requestedFamilyId: string | null
  cookieFamilyId: string | null
  cookies: Cookies
}) => {
  const activeFamilyId = resolveActiveFamilyId(
    options.families.map((family) => family.id),
    options.requestedFamilyId,
    options.cookieFamilyId
  )

  if (activeFamilyId && activeFamilyId !== options.cookieFamilyId) {
    options.cookies.set(ACTIVE_FAMILY_COOKIE, activeFamilyId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
      sameSite: 'lax'
    })
  }

  return activeFamilyId
}

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

    const activeFamilyId = resolveActive({
      families,
      requestedFamilyId: url.searchParams.get('family'),
      cookieFamilyId: cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
      cookies
    })

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

  const [{ data: profile }, { data: members }, { data: relationships }] = await Promise.all([
    supabase.from('profiles').select('display_name, role').eq('id', user.id).single(),
    supabase
      .from('members')
      .select('id, name, family_name, birth_date, photo_url')
      .order('created_at', { ascending: true }),
    supabase.from('relationships').select('member_a, member_b, type')
  ])

  const role = (profile?.role ?? 'viewer') as Role

  const groups = buildFamilyGroups(members ?? [], relationships ?? [])
  const families = groups.map((group) => ({
    id: group.id,
    name: group.name,
    membersCount: group.membersCount,
    linksCount: group.linksCount,
    previewMembers: group.previewMembers,
    notes: notesForFamily(group.name, group.membersCount),
    treeHref: `/?family=${encodeURIComponent(group.id)}`
  }))

  const activeFamilyId = resolveActive({
    families,
    requestedFamilyId: url.searchParams.get('family'),
    cookieFamilyId: cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
    cookies
  })

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
    displayName: profile?.display_name?.trim() || user.email?.split('@')[0] || 'Familiar',
    role,
    families,
    activeFamilyId,
    activeFamilyName: families.find((family) => family.id === activeFamilyId)?.name ?? null,
    pendingInvitations,
    showPendingInvitations: isManagerRole(role)
  }
}
