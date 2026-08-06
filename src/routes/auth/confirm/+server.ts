import { redirect } from '@sveltejs/kit'
import { withSignupNotice } from '$lib/server/signupNotice'
import type { EmailOtpType } from '@supabase/supabase-js'
import type { RequestHandler } from './$types'

const LINK_ERROR = encodeURIComponent('El enlace no es válido o ha caducado. Pide uno nuevo.')

// Lands here from the magic link / recovery email. Depending on the email
// template and flow, Supabase sends either token_hash+type or a PKCE code.
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

    if (!error) {
      const nextWithNotice = await withSignupNotice(supabase, next)
      redirect(303, nextWithNotice)
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const nextWithNotice = await withSignupNotice(supabase, next)
      redirect(303, nextWithNotice)
    }
  }

  redirect(303, `/login?error=${LINK_ERROR}`)
}
