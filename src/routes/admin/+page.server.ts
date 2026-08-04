import { fail, redirect } from '@sveltejs/kit'
import type { Profile, Role } from '$lib/types/auth'
import type { Actions, PageServerLoad } from './$types'

const VALID_ROLES: Role[] = ['admin', 'editor', 'viewer']

const requireAdmin = async (locals: App.Locals) => {
  if (!locals.user) redirect(303, '/login')

  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('*')
    .eq('id', locals.user.id)
    .single()

  if (profile?.role !== 'admin') redirect(303, '/')

  return profile as Profile
}

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals)

  const [profilesRes, invitesRes] = await Promise.all([
    locals.supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    locals.supabase.from('invited_emails').select('*').order('created_at', { ascending: true })
  ])

  return {
    profiles: (profilesRes.data ?? []) as Profile[],
    invites: invitesRes.data ?? []
  }
}

export const actions: Actions = {
  invite: async ({ request, locals }) => {
    await requireAdmin(locals)

    const form = await request.formData()
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
    const role = String(form.get('role') ?? 'editor') as Role

    if (!email || !email.includes('@')) return fail(400, { inviteError: 'Email no válido.' })
    if (!VALID_ROLES.includes(role)) return fail(400, { inviteError: 'Rol no válido.' })

    const { error } = await locals.supabase
      .from('invited_emails')
      .upsert({ email, role_on_signup: role, invited_by: locals.user?.id })

    if (error) return fail(400, { inviteError: error.message })

    return { invited: email }
  },

  uninvite: async ({ request, locals }) => {
    await requireAdmin(locals)

    const form = await request.formData()
    const email = String(form.get('email') ?? '')

    const { error } = await locals.supabase.from('invited_emails').delete().eq('email', email)

    if (error) return fail(400, { inviteError: error.message })

    return { uninvited: email }
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
