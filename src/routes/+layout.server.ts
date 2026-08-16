import type { Profile } from '$lib/types/auth'
import {
  ACTIVE_FAMILY_COOKIE,
  type FamilySummary,
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
  let availableFamilies: FamilySummary[] = []
  let displayName = 'Familiar'

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

    const profileDisplayName = profile?.display_name?.trim() ?? ''
    let linkedMemberName = ''

    if (!profileDisplayName) {
      const linkedMemberIds = [...new Set(availableFamilies.map((family) => family.memberId).filter(Boolean))]

      if (linkedMemberIds.length > 0) {
        const { data: linkedMembers } = await supabase
          .from('members')
          .select('id, name')
          .in('id', linkedMemberIds)

        const linkedMemberNameById = new Map((linkedMembers ?? []).map((member) => [member.id, member.name]))
        const activeMembership = availableFamilies.find((family) => family.id === activeFamilyId)
        const preferredMemberId = activeMembership?.memberId ?? linkedMemberIds[0] ?? null
        linkedMemberName = preferredMemberId ? linkedMemberNameById.get(preferredMemberId)?.trim() ?? '' : ''
      }
    }

    displayName = profileDisplayName || linkedMemberName || user.email?.split('@')[0] || 'Familiar'
  } else if (isMockFamilyMode()) {
    profile = mockProfile
    availableFamilies = [{ id: 'mock-family', name: 'Familia mock', role: 'admin', memberId: null }]
    activeFamilyId = activeFamilyId ?? 'mock-family'
    displayName = 'Modo mock'
  }

  return {
    user,
    profile,
    displayName,
    activeFamilyId,
    availableFamilies,
    cookies: cookies.getAll()
  }
}
