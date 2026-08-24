import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

const GENERIC_AUTH_ERROR = 'No pudimos completar el acceso. Revisa tus datos e inténtalo otra vez.'

const friendlyAuthError = (error: { message: string; status?: number }) => {
  if (error.message === '{}') return GENERIC_AUTH_ERROR
  if (error.message.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (error.message.includes('User already registered')) {
    return 'Ya existe una cuenta con este email. Inicia sesión.'
  }
  if (/rate limit/i.test(error.message)) {
    return 'Demasiados intentos. Espera un momento y prueba de nuevo.'
  }
  return error.message
}

export const actions: Actions = {
  register: async ({ request, locals: { supabase } }) => {
    const form = await request.formData()
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
    const password = String(form.get('password') ?? '')
    const inviteToken = String(form.get('inviteToken') ?? '').trim()

    if (!email || !password) {
      return fail(400, { error: 'Escribe tu email y contraseña.', email })
    }
    if (password.length < 8) {
      return fail(400, { error: 'La contraseña debe tener al menos 8 caracteres.', email })
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: inviteToken ? { invite_token: inviteToken } : undefined }
    })

    if (error) return fail(error.status ?? 400, { error: friendlyAuthError(error), email })

    if (data.session) {
      throw redirect(303, '/hub')
    }

    return {
      registered: true,
      email,
      message: 'Tu cuenta se creó correctamente. Revisa tu email si necesitas confirmar la cuenta.'
    }
  },

  password: async ({ request, locals: { supabase } }) => {
    const form = await request.formData()
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
    const password = String(form.get('password') ?? '')

    if (!email || !password) {
      return fail(400, { error: 'Escribe tu email y contraseña.', email })
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return fail(error.status ?? 400, { error: friendlyAuthError(error), email })

    throw redirect(303, '/hub')
  },

  google: async ({ url, locals: { supabase } }) => {
    const inviteToken = url.searchParams.get('invite')?.trim() ?? ''

    if (inviteToken) {
      return fail(400, {
        error: 'Esta invitación debe completarse creando cuenta con email y contraseña.'
      })
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${url.origin}/auth/callback`, skipBrowserRedirect: true }
    })

    if (error) {
      return fail(error.status ?? 400, {
        error: 'No se pudo iniciar sesión con Google. Prueba con email y contraseña.'
      })
    }

    throw redirect(303, data.url)
  }
}
