import type { Profile } from '$lib/types/auth'
import {
  ACTIVE_FAMILY_COOKIE,
  loadUserFamilies,
  resolveAndPersistActiveFamily
} from '$lib/server/activeFamily'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { LayoutServerLoad } from './$types'

// Admin-role stand-in so the mock mode exposes full management affordances
const mockProfile: Profile = {
  id: 'mock-user',
  email: 'mock@localhost',
  display_name: 'Modo mock',
  role: 'admin',
  member_id: null,
  created_at: ''
}

export const load: LayoutServerLoad = async ({ locals: { user, supabase }, cookies, url }) => {
  let profile: Profile | null = null
  let activeFamilyId = cookies.get(ACTIVE_FAMILY_COOKIE) ?? null
  let availableFamilies: Array<{ id: string; name: string; role: 'admin' | 'editor' | 'viewer' }> =
    []

  if (user) {
    const [profileRes, families] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      loadUserFamilies(supabase, user.id)
    ])

    profile = profileRes.data
    availableFamilies = families
    activeFamilyId = resolveAndPersistActiveFamily({
      families: availableFamilies,
      requestedFamilyId: url.searchParams.get('family'),
      cookieFamilyId: activeFamilyId,
      cookies
    })
  } else if (isMockFamilyMode()) {
    profile = mockProfile
    availableFamilies = [{ id: 'mock-family', name: 'Familia mock', role: 'admin' }]
    activeFamilyId = activeFamilyId ?? 'mock-family'
  }

  return {
    user,
    profile,
    activeFamilyId,
    availableFamilies,
    cookies: cookies.getAll()
  }
}
