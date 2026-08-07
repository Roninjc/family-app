import type { Profile } from '$lib/types/auth'
import {
  ACTIVE_FAMILY_COOKIE,
  loadUserFamilies,
  resolveAndPersistActiveFamily
} from '$lib/server/activeFamily'
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

export const load: LayoutServerLoad = async ({ locals: { session, user, supabase }, cookies, url }) => {
  let profile: Profile | null = null
  let activeFamilyId = cookies.get(ACTIVE_FAMILY_COOKIE) ?? null
  let availableFamilies: Array<{ id: string; name: string; role: 'admin' | 'editor' | 'viewer' }> = []

  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data

    availableFamilies = await loadUserFamilies(supabase, user.id)
    activeFamilyId = resolveAndPersistActiveFamily({
      families: availableFamilies,
      requestedFamilyId: url.searchParams.get('family'),
      cookieFamilyId: activeFamilyId,
      cookies
    })
  } else if (isMockFamilyMode()) {
    profile = mockProfile
    availableFamilies = [{ id: 'mock-family', name: 'Familia mock', role: 'editor' }]
    activeFamilyId = activeFamilyId ?? 'mock-family'
  }

  return {
    session,
    profile,
    activeFamilyId,
    availableFamilies,
    cookies: cookies.getAll()
  }
}
