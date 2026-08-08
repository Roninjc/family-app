import { fail, redirect } from '@sveltejs/kit'
import type { Profile, Role } from '$lib/types/auth'
import {
  ACTIVE_FAMILY_COOKIE,
  loadUserFamilies,
  resolveAndPersistActiveFamily
} from '$lib/server/activeFamily'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { Actions, PageServerLoad } from './$types'

const VALID_ROLES: Role[] = ['admin', 'editor', 'viewer']

const FAMILY_SYNC_ERROR =
  'La familia activa cambió antes de enviar el formulario. Recarga la página y vuelve a intentarlo.'

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
    return {
      profile: {
        id: 'mock-user',
        email: 'mock@localhost',
        display_name: 'Modo mock',
        role: 'editor',
        member_id: null,
        created_at: ''
      } as Profile,
      families: [{ id: 'mock-family', name: 'Familia mock', role: 'editor' as const }],
      activeFamily: { id: 'mock-family', name: 'Familia mock', role: 'editor' as const }
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
  if (!activeFamily || activeFamily.role === 'viewer') redirect(303, '/hub')

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
    return {
      manager: managerContext.profile,
      families: managerContext.families,
      activeFamily: managerContext.activeFamily,
      canManageRoles: false,
      profiles: [] as Profile[],
      invites: [],
      members: []
    }
  }

  const membersRes = await locals.supabase
    .from('members')
    .select('id, name, family_name')
    .eq('family_id', managerContext.activeFamily.id)
    .order('created_at', { ascending: true })

  const memberIds = (membersRes.data ?? []).map((member) => member.id)

  const [membershipsRes, invitesRes] = await Promise.all([
    locals.supabase
      .from('family_memberships')
      .select('profile_id, role, profiles!inner(id, email, display_name, member_id, created_at)')
      .eq('family_id', managerContext.activeFamily.id),
    locals.supabase
      .from('invitations')
      .select('*')
      .eq('family_id', managerContext.activeFamily.id)
      .order('created_at', { ascending: false })
  ])

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
    families: managerContext.families,
    activeFamily: managerContext.activeFamily,
    canManageRoles: managerContext.activeFamily.role === 'admin',
    profiles,
    invites: invitesRes.data ?? [],
    members: membersRes.data ?? []
  }
}

export const actions: Actions = {
  inviteGeneral: async ({ request, locals, url, cookies }) => {
    if (isMockFamilyMode()) {
      return fail(400, {
        inviteError:
          'Estás en modo mock. Las invitaciones no se guardan. Usa el modo normal para persistir cambios.'
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
      return fail(409, { inviteError: FAMILY_SYNC_ERROR })
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

    if (!token) return fail(500, { inviteError: 'No se pudo generar el token de invitación.' })

    return {
      invitedGeneral: true,
      familyId: managerContext.activeFamily.id,
      inviteLink: `${url.origin}/login?invite=${encodeURIComponent(token)}`
    }
  },

  inviteMember: async ({ request, locals, cookies }) => {
    if (isMockFamilyMode()) {
      return fail(400, {
        inviteError:
          'Estás en modo mock. Las invitaciones no se guardan. Usa el modo normal para persistir cambios.'
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
      return fail(409, { inviteError: FAMILY_SYNC_ERROR })
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
      return fail(400, {
        inviteError:
          'Estás en modo mock. Las invitaciones no se guardan. Usa el modo normal para persistir cambios.'
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
      return fail(409, { inviteError: FAMILY_SYNC_ERROR })
    }

    const inviteId = String(form.get('inviteId') ?? '').trim()

    if (!inviteId) return fail(400, { inviteError: 'Falta la invitación.' })

    const { data: invite } = await locals.supabase
      .from('invitations')
      .select('id, family_id, type, revoked_at')
      .eq('id', inviteId)
      .maybeSingle()

    if (!invite) {
      return fail(404, { inviteError: 'La invitación ya no existe o no está disponible.' })
    }

    if (invite.family_id !== managerContext.activeFamily.id) {
      return fail(403, { inviteError: 'No puedes revocar invitaciones de otra familia.' })
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
          ? 'Invitación general revocada correctamente.'
          : 'Invitación vinculada revocada correctamente.'
    }
  },

  regenerateInviteLink: async ({ request, locals, url, cookies }) => {
    if (isMockFamilyMode()) {
      return fail(400, {
        inviteError:
          'Estás en modo mock. Las invitaciones no se guardan. Usa el modo normal para persistir cambios.'
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
      return fail(409, { inviteError: FAMILY_SYNC_ERROR })
    }

    const inviteId = String(form.get('inviteId') ?? '').trim()
    if (!inviteId) return fail(400, { inviteError: 'Falta la invitación.' })

    const { data: invite } = await locals.supabase
      .from('invitations')
      .select('id, family_id, type, role_on_signup, expires_at, max_uses, revoked_at')
      .eq('id', inviteId)
      .maybeSingle()

    if (!invite) {
      return fail(404, { inviteError: 'La invitación ya no existe o no está disponible.' })
    }

    if (invite.family_id !== managerContext.activeFamily.id) {
      return fail(403, { inviteError: 'No puedes regenerar enlaces de otra familia.' })
    }

    if (invite.type !== 'general') {
      return fail(400, {
        inviteError: 'Solo se puede regenerar enlace para invitaciones generales.'
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
    if (!token) return fail(500, { inviteError: 'No se pudo generar el token de invitación.' })

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
      inviteSuccess: 'Nuevo enlace generado. La invitación anterior quedó revocada.',
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
