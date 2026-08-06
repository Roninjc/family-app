import { fail, redirect } from '@sveltejs/kit'
import type { Profile, Role } from '$lib/types/auth'
import type { Actions, PageServerLoad } from './$types'

const VALID_ROLES: Role[] = ['admin', 'editor', 'viewer']

const expiryFromPreset = (preset: string): string | null => {
  if (preset === '7d') return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  if (preset === '30d') return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

const requireManager = async (locals: App.Locals) => {
  if (!locals.user) redirect(303, '/login')

  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('*')
    .eq('id', locals.user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) redirect(303, '/hub')

  return profile as Profile
}

const requireAdmin = async (locals: App.Locals) => {
  const profile = await requireManager(locals)
  if (profile.role !== 'admin') redirect(303, '/hub')
  return profile
}

export const load: PageServerLoad = async ({ locals }) => {
  const manager = await requireManager(locals)

  const [profilesRes, invitesRes, membersRes] = await Promise.all([
    locals.supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    locals.supabase.from('invitations').select('*').order('created_at', { ascending: false }),
    locals.supabase
      .from('members')
      .select('id, name, family_name')
      .order('created_at', { ascending: true })
  ])

  return {
    manager,
    canManageRoles: manager.role === 'admin',
    profiles: (profilesRes.data ?? []) as Profile[],
    invites: invitesRes.data ?? [],
    members: membersRes.data ?? []
  }
}

export const actions: Actions = {
  inviteGeneral: async ({ request, locals, url }) => {
    const manager = await requireManager(locals)

    const form = await request.formData()
    const role = String(form.get('role') ?? 'viewer') as Role
    const expiryPreset = String(form.get('expiryPreset') ?? 'none')
    const maxUsesRaw = String(form.get('maxUses') ?? '').trim()
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null

    if (!VALID_ROLES.includes(role)) return fail(400, { inviteError: 'Rol no válido.' })
    if (manager.role === 'editor' && role === 'admin') {
      return fail(403, { inviteError: 'Un editor no puede invitar administradores.' })
    }
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return fail(400, { inviteError: 'El máximo de usos debe ser un número positivo.' })
    }

    const expiresAt = expiryFromPreset(expiryPreset)

    const { data, error } = await locals.supabase.rpc('create_invitation', {
      invitation_type: 'general',
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
      inviteLink: `${url.origin}/login?invite=${encodeURIComponent(token)}`
    }
  },

  inviteMember: async ({ request, locals }) => {
    const manager = await requireManager(locals)

    const form = await request.formData()
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
    const memberId = String(form.get('memberId') ?? '').trim()
    const role = String(form.get('role') ?? 'viewer') as Role
    const expiryPreset = String(form.get('expiryPreset') ?? 'none')

    if (!email || !email.includes('@')) return fail(400, { inviteError: 'Email no válido.' })
    if (!memberId) return fail(400, { inviteError: 'Selecciona un miembro.' })
    if (!VALID_ROLES.includes(role)) return fail(400, { inviteError: 'Rol no válido.' })
    if (manager.role === 'editor' && role === 'admin') {
      return fail(403, { inviteError: 'Un editor no puede invitar administradores.' })
    }

    const expiresAt = expiryFromPreset(expiryPreset)

    const { error } = await locals.supabase.rpc('create_invitation', {
      invitation_type: 'member_linked',
      invitation_email: email,
      invitation_member_id: memberId,
      invitation_role: role,
      invitation_expires_at: expiresAt,
      invitation_max_uses: 1
    })

    if (error) return fail(400, { inviteError: error.message })

    return { invitedMember: email }
  },

  revokeInvite: async ({ request, locals }) => {
    await requireManager(locals)

    const form = await request.formData()
    const inviteId = String(form.get('inviteId') ?? '').trim()

    if (!inviteId) return fail(400, { inviteError: 'Falta la invitación.' })

    const { error } = await locals.supabase
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId)

    if (error) return fail(400, { inviteError: error.message })

    return { revoked: inviteId }
  },

  setRole: async ({ request, locals }) => {
    const me = await requireAdmin(locals)

    const form = await request.formData()
    const profileId = String(form.get('profileId') ?? '')
    const role = String(form.get('role') ?? '') as Role

    if (!VALID_ROLES.includes(role)) return fail(400, { roleError: 'Rol no válido.' })

    if (profileId === me.id && role !== 'admin') {
      return fail(400, { roleError: 'No puedes quitarte tu propio rol de administrador.' })
    }

    const { error } = await locals.supabase.from('profiles').update({ role }).eq('id', profileId)

    if (error) return fail(400, { roleError: error.message })

    return { roleUpdated: profileId }
  }
}
