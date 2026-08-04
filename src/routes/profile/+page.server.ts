import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

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

  logout: async ({ locals: { supabase } }) => {
    await supabase.auth.signOut()
    redirect(303, '/login')
  }
}
