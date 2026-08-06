import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

const NOT_INVITED_MESSAGE =
  'Este email no está invitado a la app. Pide a un administrador que te invite.'

const friendlyAuthError = (error: { message: string; status?: number }) => {
  // The invite-gate trigger rejection surfaces as a 500 whose body supabase-js
  // does not always parse into a message, so match on status too.
  if (
    error.status === 500 ||
    /not invited|database error/i.test(error.message) ||
    error.message === '{}'
  ) {
    return NOT_INVITED_MESSAGE
  }
  if (error.message.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (/rate limit/i.test(error.message)) {
    return 'Demasiados intentos. Espera un momento y prueba de nuevo.'
  }
  return error.message
}

export const actions: Actions = {
  magic: async ({ request, url, locals: { supabase } }) => {
    const form = await request.formData()
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
    const inviteToken = String(form.get('inviteToken') ?? '').trim()

    if (!email) return fail(400, { error: 'Escribe tu email.', email })

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${url.origin}/auth/confirm`,
        data: inviteToken ? { invite_token: inviteToken } : undefined
      }
    })

    if (error) return fail(error.status ?? 400, { error: friendlyAuthError(error), email })

    return { sent: true, email }
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

    redirect(303, '/hub')
  },

  google: async ({ url, locals: { supabase } }) => {
    const inviteToken = url.searchParams.get('invite')?.trim() ?? ''

    if (inviteToken) {
      return fail(400, {
        error:
          'Esta invitación requiere registro por enlace mágico. Usa el formulario de email de arriba.'
      })
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${url.origin}/auth/callback`, skipBrowserRedirect: true }
    })

    if (error) {
      return fail(error.status ?? 400, {
        error: 'No se pudo iniciar sesión con Google. Prueba con el enlace mágico.'
      })
    }

    redirect(303, data.url)
  }
}
