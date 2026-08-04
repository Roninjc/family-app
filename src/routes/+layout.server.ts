import type { Profile } from '$lib/types/auth'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { session, user, supabase }, cookies }) => {
  let profile: Profile | null = null

  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  return {
    session,
    profile,
    cookies: cookies.getAll()
  }
}
