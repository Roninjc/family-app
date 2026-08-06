import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
  if (!user) redirect(303, '/login')

  const [{ data: me }, { data: members }, { data: takenRows }] = await Promise.all([
    supabase.from('profiles').select('member_id').eq('id', user.id).single(),
    supabase.from('members').select('id, name, family_name').order('created_at', { ascending: true }),
    supabase.from('profiles').select('member_id').not('member_id', 'is', null)
  ])

  const myMemberId = me?.member_id ?? null
  const takenIds = new Set(
    (takenRows ?? []).map((row) => row.member_id).filter((memberId) => memberId !== myMemberId)
  )

  const availableMembers = (members ?? []).filter((member) => !takenIds.has(member.id))
  const linkedMember = (members ?? []).find((member) => member.id === myMemberId) ?? null

  return {
    linkedMember,
    availableMembers
  }
}

export const actions: Actions = {
  updateName: async ({ request, locals: { supabase, user } }) => {
    if (!user) redirect(303, '/login')

    const form = await request.formData()
    const displayName = String(form.get('display_name') ?? '').trim()

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName || null })
      .eq('id', user.id)

    if (error) return fail(400, { nameError: error.message })

    return { nameSaved: true }
  },

  setPassword: async ({ request, locals: { supabase, user } }) => {
    if (!user) redirect(303, '/login')

    const form = await request.formData()
    const password = String(form.get('password') ?? '')

    if (password.length < 8) {
      return fail(400, { passwordError: 'La contraseña debe tener al menos 8 caracteres.' })
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      const message = error.message.includes('should be different')
        ? 'La nueva contraseña debe ser distinta de la actual.'
        : error.message
      return fail(400, { passwordError: message })
    }

    return { passwordSaved: true }
  },

  setMemberLink: async ({ request, locals: { supabase, user } }) => {
    if (!user) redirect(303, '/login')

    const form = await request.formData()
    const memberId = String(form.get('member_id') ?? '').trim()

    const { error } = await supabase
      .from('profiles')
      .update({ member_id: memberId || null })
      .eq('id', user.id)

    if (error) {
      if (error.code === '23505') {
        return fail(400, { linkError: 'Ese miembro ya está vinculado a otra cuenta.' })
      }
      if (error.code === '23503') {
        return fail(400, { linkError: 'El miembro seleccionado no existe.' })
      }
      return fail(400, { linkError: error.message })
    }

    return { linkSaved: true }
  },

  logout: async ({ locals: { supabase } }) => {
    await supabase.auth.signOut()
    redirect(303, '/login')
  }
}
