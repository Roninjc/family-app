import { redirect } from '@sveltejs/kit'
import { withSignupNotice } from '$lib/server/signupNotice'
import type { RequestHandler } from './$types'

// OAuth (Google) code exchange.
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/hub'

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const nextWithNotice = await withSignupNotice(supabase, next)
      throw redirect(303, nextWithNotice)
    }
  }

  throw redirect(303, `/login?error=${encodeURIComponent('oauth_failed')}`)
}
