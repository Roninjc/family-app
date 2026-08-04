import { redirect } from '@sveltejs/kit'
import type { EmailOtpType } from '@supabase/supabase-js'
import type { RequestHandler } from './$types'

// Lands here from the magic link / recovery email with a token_hash.
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = url.searchParams.get('next') ?? '/'

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

    if (!error) redirect(303, next)
  }

  redirect(303, '/login?error=El enlace no es válido o ha caducado. Pide uno nuevo.')
}
