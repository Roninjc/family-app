import { createHubActions, loadHubPage } from '$lib/server/hubPage'
import { ACTIVE_FAMILY_COOKIE } from '$lib/server/activeFamily'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  event.cookies.set(ACTIVE_FAMILY_COOKIE, event.params.familyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    sameSite: 'lax'
  })

  return loadHubPage(event, {
    requestedFamilyId: event.params.familyId,
    noFamilyRouteState: false
  })
}

export const actions: Actions = {
  createNote: (event) =>
    createHubActions({ forcedFamilyId: event.params.familyId }).createNote(event),
  updateNote: (event) =>
    createHubActions({ forcedFamilyId: event.params.familyId }).updateNote(event),
  deleteNote: (event) =>
    createHubActions({ forcedFamilyId: event.params.familyId }).deleteNote(event)
}
