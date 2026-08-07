import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cookies } from '@sveltejs/kit'
import { resolveActiveFamilyId } from './familyGroups'

export const ACTIVE_FAMILY_COOKIE = 'active_family_id'

export interface FamilySummary {
  id: string
  name: string
  role: 'admin' | 'editor' | 'viewer'
}

export const loadUserFamilies = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from('family_memberships')
    .select('family_id, role, families!inner(id, name)')
    .eq('profile_id', userId)

  if (error) {
    return [] as FamilySummary[]
  }

  return (data ?? [])
    .map((row) => {
      const family = Array.isArray(row.families) ? row.families[0] : row.families
      if (!family?.id || !family?.name) return null

      return {
        id: family.id,
        name: family.name,
        role: row.role
      }
    })
    .filter((entry): entry is FamilySummary => Boolean(entry))
}

export const resolveAndPersistActiveFamily = (options: {
  families: FamilySummary[]
  requestedFamilyId: string | null
  cookieFamilyId: string | null
  cookies: Cookies
}) => {
  const activeFamilyId = resolveActiveFamilyId(
    options.families.map((family) => family.id),
    options.requestedFamilyId,
    options.cookieFamilyId
  )

  if (activeFamilyId && activeFamilyId !== options.cookieFamilyId) {
    options.cookies.set(ACTIVE_FAMILY_COOKIE, activeFamilyId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
      sameSite: 'lax'
    })
  }

  return activeFamilyId
}
