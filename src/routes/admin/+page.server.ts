import { redirect } from '@sveltejs/kit'
import { createAdminActions } from '$lib/server/adminPage'
import {
  ACTIVE_FAMILY_COOKIE,
  loadUserFamilies,
  resolveAndPersistActiveFamily
} from '$lib/server/activeFamily'
import { mockFamilyData } from '$lib/data/mockFamily'
import { buildFamilyGroups, toRowsFromFamilyData } from '$lib/server/familyGroups'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  if (isMockFamilyMode()) {
    const rows = toRowsFromFamilyData(mockFamilyData)
    const groups = buildFamilyGroups(rows.members, rows.relationships)
    const mockFamilies = groups.map((group) => ({
      id: group.id,
      name: group.name,
      role: 'admin' as const,
      memberId: null
    }))

    const activeFamilyId = resolveAndPersistActiveFamily({
      families: mockFamilies,
      requestedFamilyId: null,
      cookieFamilyId: event.cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
      cookies: event.cookies
    })

    if (!activeFamilyId) {
      throw redirect(303, '/dashboard?state=no_family')
    }

    throw redirect(303, `/family/${encodeURIComponent(activeFamilyId)}/admin`)
  }

  if (!event.locals.user) {
    throw redirect(303, '/login')
  }

  const families = await loadUserFamilies(event.locals.supabase, event.locals.user.id)
  const activeFamilyId = resolveAndPersistActiveFamily({
    families,
    requestedFamilyId: null,
    cookieFamilyId: event.cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
    cookies: event.cookies
  })

  if (!activeFamilyId) {
    throw redirect(303, '/dashboard?state=no_family')
  }

  throw redirect(303, `/family/${encodeURIComponent(activeFamilyId)}/admin`)
}

export const actions: Actions = createAdminActions()
