import { fail, redirect } from '@sveltejs/kit'
import type { Profile, Role } from '$lib/types/auth'
import {
  ACTIVE_FAMILY_COOKIE,
  loadUserFamilies,
  resolveAndPersistActiveFamily
} from '$lib/server/activeFamily'
import { mockFamilyData } from '$lib/data/mockFamily'
import { buildFamilyGroups, resolveActiveFamilyId, toRowsFromFamilyData } from '$lib/server/familyGroups'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { Actions, PageServerLoad } from './$types'

const VALID_ROLES: Role[] = ['admin', 'editor', 'viewer']

const FAMILY_SYNC_ERROR =
  'La familia activa cambió mientras completabas la acción. Recarga la página y vuelve a intentarlo.'

const MOCK_INVITE_ERROR =
  'Estás en modo mock. Las invitaciones no se guardan en este modo. Usa el modo normal para enviar invitaciones reales.'

const VIEWER_MANAGE_ERROR =
  'No tienes permisos para gestionar invitaciones en esta familia (solo lectura).'

const MOCK_FAMILY_ROLE_ROTATION: Role[] = ['admin', 'editor', 'viewer']

const expiryFromPreset = (preset: string): string | null => {
  if (preset === '7d') return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  if (preset === '30d') return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

const resolveManagerFamily = async (options: {
  locals: App.Locals
  cookies: import('@sveltejs/kit').Cookies
  requestedFamilyId: string | null
}) => {
  if (isMockFamilyMode()) {
    const rows = toRowsFromFamilyData(mockFamilyData)
    const groups = buildFamilyGroups(rows.members, rows.relationships)
    const families = groups.map((group, index) => ({
      id: group.id,
      name: group.name,
      role: MOCK_FAMILY_ROLE_ROTATION[index % MOCK_FAMILY_ROLE_ROTATION.length]
    }))

    const cookieFamilyId = options.cookies.get(ACTIVE_FAMILY_COOKIE) ?? null
    const activeFamilyId = resolveActiveFamilyId(
      families.map((family) => family.id),
      options.requestedFamilyId,
      cookieFamilyId
    )

    if (activeFamilyId && activeFamilyId !== cookieFamilyId) {
      options.cookies.set(ACTIVE_FAMILY_COOKIE, activeFamilyId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 180,
        sameSite: 'lax'
      })
    }

    const activeFamily = families.find((family) => family.id === activeFamilyId) ?? null
    if (!activeFamily) redirect(303, '/hub')

    return {
      profile: {
        id: 'mock-user',
        email: 'mock@localhost',
        display_name: 'Modo mock',
        role: activeFamily.role,
        member_id: null,
        created_at: ''
      } as Profile,
      families,
      activeFamily
    }
  }

  if (!options.locals.user) redirect(303, '/login')

  const [profileRes, families] = await Promise.all([
    options.locals.supabase.from('profiles').select('*').eq('id', options.locals.user.id).single(),
    loadUserFamilies(options.locals.supabase, options.locals.user.id)
  ])

  const activeFamilyId = resolveAndPersistActiveFamily({
    families,
    requestedFamilyId: options.requestedFamilyId,
    cookieFamilyId: options.cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
    cookies: options.cookies
  })

  const activeFamily = families.find((family) => family.id === activeFamilyId) ?? null
  if (!activeFamily) redirect(303, '/hub')

  return {
    profile: (profileRes.data as Profile | null) ?? null,
    families,
    activeFamily
  }
}

const ensureActionFamilyInSync = (options: {
  requestedFamilyId: string | null
  cookieFamilyId: string | null
  resolvedFamilyId: string
}) => {
  if (!options.requestedFamilyId) return false

  if (options.requestedFamilyId !== options.resolvedFamilyId) return false

  if (options.cookieFamilyId && options.cookieFamilyId !== options.requestedFamilyId) return false

  return true
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
  const managerContext = await resolveManagerFamily({
    locals,
    cookies,
    requestedFamilyId: url.searchParams.get('family')
  })

  if (isMockFamilyMode()) {
    const rows = toRowsFromFamilyData(mockFamilyData)
    const groups = buildFamilyGroups(rows.members, rows.relationships)
    const familiesWithMetrics = managerContext.families.map((family) => {
      const group = groups.find((candidate) => candidate.id === family.id)
      const membersCount = group?.membersCount ?? 0

      return {
        ...family,
        metrics: {
          membersCount,
          usersCount: 0,
          unlinkedMembersCount: membersCount,
          activeInvitesCount: 0,
          managersCount: 1
        }
      }
    })

    return {
      manager: managerContext.profile,
      families: familiesWithMetrics,
      activeFamily: managerContext.activeFamily,
      canManageInvites: managerContext.activeFamily.role !== 'viewer',
      canManageRoles: managerContext.activeFamily.role === 'admin',
      profiles: [] as Profile[],
      invites: [],
      members: []
    }
  }

  const familyIds = managerContext.families.map((family) => family.id)

  const membersRes = await locals.supabase
    .from('members')
    .select('id, name, family_name')
    .eq('family_id', managerContext.activeFamily.id)
    .order('created_at', { ascending: true })

  const [membershipsRes, invitesRes, allMembersRes, allMembershipsRes, allInvitesRes] = await Promise.all([
    locals.supabase
      .from('family_memberships')
      .select('profile_id, role, profiles!inner(id, email, display_name, member_id, created_at)')
      .eq('family_id', managerContext.activeFamily.id),
    locals.supabase
      .from('invitations')
      .select('*')
      .eq('family_id', managerContext.activeFamily.id)
      .order('created_at', { ascending: false }),
    familyIds.length > 0
      ? locals.supabase.from('members').select('id, family_id').in('family_id', familyIds)
      : Promise.resolve({ data: [], error: null }),
    familyIds.length > 0
      ? locals.supabase
          .from('family_memberships')
          .select('family_id, profile_id, role, profiles(member_id)')
          .in('family_id', familyIds)
      : Promise.resolve({ data: [], error: null }),
    familyIds.length > 0
      ? locals.supabase
          .from('invitations')
          .select('family_id, revoked_at, expires_at, uses_count, max_uses')
          .in('family_id', familyIds)
      : Promise.resolve({ data: [], error: null })
  ])

  const membersCountByFamily = new Map<string, number>()
  for (const member of allMembersRes.data ?? []) {
    membersCountByFamily.set(member.family_id, (membersCountByFamily.get(member.family_id) ?? 0) + 1)
  }

  const usersCountByFamily = new Map<string, number>()
  const linkedMembersByFamily = new Map<string, Set<string>>()
  const managersCountByFamily = new Map<string, number>()

  for (const membership of allMembershipsRes.data ?? []) {
    usersCountByFamily.set(
      membership.family_id,
      (usersCountByFamily.get(membership.family_id) ?? 0) + 1
    )

    if (membership.role === 'admin' || membership.role === 'editor') {
      managersCountByFamily.set(
        membership.family_id,
        (managersCountByFamily.get(membership.family_id) ?? 0) + 1
      )
    }

    const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles
    const linkedMemberId = profile?.member_id ?? null
    if (!linkedMemberId) continue

    const linkedSet = linkedMembersByFamily.get(membership.family_id) ?? new Set<string>()
    linkedSet.add(linkedMemberId)
    linkedMembersByFamily.set(membership.family_id, linkedSet)
  }

  const activeInvitesByFamily = new Map<string, number>()
  const now = Date.now()
  for (const invite of allInvitesRes.data ?? []) {
    if (invite.revoked_at) continue
    if (invite.expires_at && Date.parse(invite.expires_at) <= now) continue
    if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) continue

    activeInvitesByFamily.set(
      invite.family_id,
      (activeInvitesByFamily.get(invite.family_id) ?? 0) + 1
    )
  }

  const familiesWithMetrics = managerContext.families.map((family) => {
    const membersCount = membersCountByFamily.get(family.id) ?? 0
    const linkedCount = linkedMembersByFamily.get(family.id)?.size ?? 0

    return {
      ...family,
      metrics: {
        membersCount,
        usersCount: usersCountByFamily.get(family.id) ?? 0,
        unlinkedMembersCount: Math.max(0, membersCount - linkedCount),
        activeInvitesCount: activeInvitesByFamily.get(family.id) ?? 0,
        managersCount: managersCountByFamily.get(family.id) ?? 0
      }
    }
  })

  const profiles = (membershipsRes.data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      ...(profile ?? {}),
      id: profile?.id,
      email: profile?.email,
      display_name: profile?.display_name,
      member_id: profile?.member_id ?? null,
      created_at: profile?.created_at ?? '',
      role: row.role
    } as Profile
  })

  return {
    manager: managerContext.profile,
    families: familiesWithMetrics,
    activeFamily: managerContext.activeFamily,
    canManageInvites: managerContext.activeFamily.role !== 'viewer',
    canManageRoles: managerContext.activeFamily.role === 'admin',
    profiles,
    invites: invitesRes.data ?? [],
    members: membersRes.data ?? []
  }
}

export const actions: Actions = {
  inviteGeneral: async ({ request, locals, url, cookies }) => {
    if (isMockFamilyMode()) {
      return fail(400, { inviteError: MOCK_INVITE_ERROR })
    }

    const form = await request.formData()
    const requestedFamilyId = String(form.get('familyId') ?? '').trim() || null
    const managerContext = await resolveManagerFamily({ locals, cookies, requestedFamilyId })
    const cookieFamilyId = cookies.get(ACTIVE_FAMILY_COOKIE) ?? null

    if (
      !ensureActionFamilyInSync({
        requestedFamilyId,
        cookieFamilyId,
        resolvedFamilyId: managerContext.activeFamily.id
      })
    ) {
      return fail(409, { inviteError: FAMILY_SYNC_ERROR })
    }

    if (managerContext.activeFamily.role === 'viewer') {
      return fail(403, { inviteError: VIEWER_MANAGE_ERROR })
    }

    const role = String(form.get('role') ?? 'viewer') as Role
    const expiryPreset = String(form.get('expiryPreset') ?? 'none')
    const maxUsesRaw = String(form.get('maxUses') ?? '').trim()
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null

    if (!VALID_ROLES.includes(role)) return fail(400, { inviteError: 'Rol no válido.' })
    if (managerContext.activeFamily.role === 'editor' && role === 'admin') {
      return fail(403, { inviteError: 'Un editor no puede invitar administradores.' })
    }
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return fail(400, { inviteError: 'El máximo de usos debe ser un número positivo.' })
    }

    const expiresAt = expiryFromPreset(expiryPreset)

    const { data, error } = await locals.supabase.rpc('create_invitation', {
      invitation_type: 'general',
      invitation_family_id: managerContext.activeFamily.id,
      invitation_email: null,
      invitation_member_id: null,
      invitation_role: role,
      invitation_expires_at: expiresAt,
      invitation_max_uses: maxUses
    })

    if (error) return fail(400, { inviteError: error.message })

    const token = data?.[0]?.token

    if (!token) {
      return fail(500, { inviteError: 'No pudimos generar el enlace de invitación. Inténtalo de nuevo.' })
    }

    return {
      invitedGeneral: true,
      familyId: managerContext.activeFamily.id,
      inviteLink: `${url.origin}/login?invite=${encodeURIComponent(token)}`
    }
  },

  inviteMember: async ({ request, locals, cookies }) => {
    if (isMockFamilyMode()) {
      return fail(400, { inviteError: MOCK_INVITE_ERROR })
    }

    const form = await request.formData()
    const requestedFamilyId = String(form.get('familyId') ?? '').trim() || null
    const managerContext = await resolveManagerFamily({ locals, cookies, requestedFamilyId })
    const cookieFamilyId = cookies.get(ACTIVE_FAMILY_COOKIE) ?? null

    if (
      !ensureActionFamilyInSync({
        requestedFamilyId,
        cookieFamilyId,
        resolvedFamilyId: managerContext.activeFamily.id
      })
    ) {
      return fail(409, { inviteError: FAMILY_SYNC_ERROR })
    }

    if (managerContext.activeFamily.role === 'viewer') {
      return fail(403, { inviteError: VIEWER_MANAGE_ERROR })
    }

    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
    const memberId = String(form.get('memberId') ?? '').trim()
    const role = String(form.get('role') ?? 'viewer') as Role
    const expiryPreset = String(form.get('expiryPreset') ?? 'none')

    if (!email || !email.includes('@')) return fail(400, { inviteError: 'Email no válido.' })
    if (!memberId) return fail(400, { inviteError: 'Selecciona un miembro.' })
    if (!VALID_ROLES.includes(role)) return fail(400, { inviteError: 'Rol no válido.' })
    if (managerContext.activeFamily.role === 'editor' && role === 'admin') {
      return fail(403, { inviteError: 'Un editor no puede invitar administradores.' })
    }

    const { data: memberInFamily } = await locals.supabase
      .from('members')
      .select('id')
      .eq('id', memberId)
      .eq('family_id', managerContext.activeFamily.id)
      .maybeSingle()

    if (!memberInFamily) {
      return fail(400, {
        inviteError: 'El miembro seleccionado no pertenece a la familia activa.'
      })
    }

    const expiresAt = expiryFromPreset(expiryPreset)

    const { error } = await locals.supabase.rpc('create_invitation', {
      invitation_type: 'member_linked',
      invitation_family_id: managerContext.activeFamily.id,
      invitation_email: email,
      invitation_member_id: memberId,
      invitation_role: role,
      invitation_expires_at: expiresAt,
      invitation_max_uses: 1
    })

    if (error) return fail(400, { inviteError: error.message, familyId: managerContext.activeFamily.id })

    return { invitedMember: email, familyId: managerContext.activeFamily.id }
  },

  revokeInvite: async ({ request, locals, cookies }) => {
    if (isMockFamilyMode()) {
      return fail(400, { inviteError: MOCK_INVITE_ERROR })
    }

    const form = await request.formData()
    const requestedFamilyId = String(form.get('familyId') ?? '').trim() || null
    const managerContext = await resolveManagerFamily({ locals, cookies, requestedFamilyId })
    const cookieFamilyId = cookies.get(ACTIVE_FAMILY_COOKIE) ?? null

    if (
      !ensureActionFamilyInSync({
        requestedFamilyId,
        cookieFamilyId,
        resolvedFamilyId: managerContext.activeFamily.id
      })
    ) {
      return fail(409, { inviteError: FAMILY_SYNC_ERROR })
    }

    if (managerContext.activeFamily.role === 'viewer') {
      return fail(403, { inviteError: VIEWER_MANAGE_ERROR })
    }

    const inviteId = String(form.get('inviteId') ?? '').trim()

    if (!inviteId) return fail(400, { inviteError: 'No se recibió la invitación que quieres gestionar.' })

    const { data: invite } = await locals.supabase
      .from('invitations')
      .select('id, family_id, type, revoked_at')
      .eq('id', inviteId)
      .maybeSingle()

    if (!invite) {
      return fail(404, { inviteError: 'No encontramos esa invitación. Puede que ya no exista.' })
    }

    if (invite.family_id !== managerContext.activeFamily.id) {
      return fail(403, { inviteError: 'No puedes revocar invitaciones de otra familia activa.' })
    }

    if (invite.revoked_at) {
      return fail(409, { inviteError: 'Esta invitación ya estaba revocada.' })
    }

    const { error } = await locals.supabase
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId)

    if (error) return fail(400, { inviteError: error.message })

    return {
      revoked: inviteId,
      revokeSuccess:
        invite.type === 'general'
          ? 'Invitación general revocada.'
          : 'Invitación vinculada revocada.'
    }
  },

  regenerateInviteLink: async ({ request, locals, url, cookies }) => {
    if (isMockFamilyMode()) {
      return fail(400, { inviteError: MOCK_INVITE_ERROR })
    }

    const form = await request.formData()
    const requestedFamilyId = String(form.get('familyId') ?? '').trim() || null
    const managerContext = await resolveManagerFamily({ locals, cookies, requestedFamilyId })
    const cookieFamilyId = cookies.get(ACTIVE_FAMILY_COOKIE) ?? null

    if (
      !ensureActionFamilyInSync({
        requestedFamilyId,
        cookieFamilyId,
        resolvedFamilyId: managerContext.activeFamily.id
      })
    ) {
      return fail(409, { inviteError: FAMILY_SYNC_ERROR })
    }

    if (managerContext.activeFamily.role === 'viewer') {
      return fail(403, { inviteError: VIEWER_MANAGE_ERROR })
    }

    const inviteId = String(form.get('inviteId') ?? '').trim()
    if (!inviteId) return fail(400, { inviteError: 'No se recibió la invitación que quieres gestionar.' })

    const { data: invite } = await locals.supabase
      .from('invitations')
      .select('id, family_id, type, role_on_signup, expires_at, max_uses, revoked_at')
      .eq('id', inviteId)
      .maybeSingle()

    if (!invite) {
      return fail(404, { inviteError: 'No encontramos esa invitación. Puede que ya no exista.' })
    }

    if (invite.family_id !== managerContext.activeFamily.id) {
      return fail(403, { inviteError: 'No puedes regenerar enlaces de otra familia activa.' })
    }

    if (invite.type !== 'general') {
      return fail(400, {
        inviteError: 'Solo las invitaciones generales permiten regenerar enlace.'
      })
    }

    const { data, error } = await locals.supabase.rpc('create_invitation', {
      invitation_type: 'general',
      invitation_family_id: managerContext.activeFamily.id,
      invitation_email: null,
      invitation_member_id: null,
      invitation_role: invite.role_on_signup,
      invitation_expires_at: invite.expires_at,
      invitation_max_uses: invite.max_uses
    })

    if (error) return fail(400, { inviteError: error.message })

    const token = data?.[0]?.token
    if (!token) {
      return fail(500, { inviteError: 'No pudimos generar el enlace de invitación. Inténtalo de nuevo.' })
    }

    const { error: revokeError } = await locals.supabase
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', invite.id)
      .is('revoked_at', null)

    if (revokeError) return fail(400, { inviteError: revokeError.message })

    return {
      invitedGeneral: true,
      familyId: managerContext.activeFamily.id,
      regeneratedInviteId: invite.id,
      inviteSuccess: 'Nuevo enlace generado. El enlace anterior quedó revocado.',
      inviteLink: `${url.origin}/login?invite=${encodeURIComponent(token)}`
    }
  },

  setRole: async ({ request, locals, cookies }) => {
    if (isMockFamilyMode()) {
      return fail(400, {
        roleError: 'Estás en modo mock. Los roles no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const requestedFamilyId = String(form.get('familyId') ?? '').trim() || null
    const managerContext = await resolveManagerFamily({ locals, cookies, requestedFamilyId })
    const cookieFamilyId = cookies.get(ACTIVE_FAMILY_COOKIE) ?? null

    if (
      !ensureActionFamilyInSync({
        requestedFamilyId,
        cookieFamilyId,
        resolvedFamilyId: managerContext.activeFamily.id
      })
    ) {
      return fail(409, { roleError: FAMILY_SYNC_ERROR })
    }

    if (managerContext.activeFamily.role !== 'admin') redirect(303, '/hub')

    const profileId = String(form.get('profileId') ?? '')
    const role = String(form.get('role') ?? '') as Role

    if (!VALID_ROLES.includes(role)) return fail(400, { roleError: 'Rol no válido.' })

    if (profileId === locals.user?.id && role !== 'admin') {
      return fail(400, { roleError: 'No puedes quitarte tu propio rol de administrador.' })
    }

    const { error } = await locals.supabase
      .from('family_memberships')
      .update({ role })
      .eq('family_id', managerContext.activeFamily.id)
      .eq('profile_id', profileId)

    if (error) return fail(400, { roleError: error.message })

    return { roleUpdated: profileId }
  }
}
