import type { Profile } from '$lib/types/auth'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { LayoutServerLoad } from './$types'

// Editor-role stand-in so the mock mode shows every edit affordance
const mockProfile: Profile = {
  id: 'mock-user',
  email: 'mock@localhost',
  display_name: 'Modo mock',
  role: 'editor',
  member_id: null,
  created_at: ''
}

export const load: LayoutServerLoad = async ({ locals: { session, user, supabase }, cookies }) => {
  let profile: Profile | null = null
  const activeFamilyId = cookies.get('active_family_id') ?? null

  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  } else if (isMockFamilyMode()) {
    profile = mockProfile
  }

  return {
    session,
    profile,
    activeFamilyId,
    cookies: cookies.getAll()
  }
}
