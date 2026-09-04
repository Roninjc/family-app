import { createDashboardActions, loadDashboardPage } from '$lib/server/feedPage'
import { ACTIVE_FAMILY_COOKIE } from '$lib/server/activeFamily'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  event.cookies.set(ACTIVE_FAMILY_COOKIE, event.params.familyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    sameSite: 'lax'
  })

  return loadDashboardPage(event, {
    requestedFamilyId: event.params.familyId,
    noFamilyRouteState: false
  })
}

const scopedActionsForEvent = (event: Parameters<Actions['createNote']>[0]) =>
  createDashboardActions({ forcedFamilyId: event.params.familyId })

export const actions: Actions = {
  createNote: (event) => scopedActionsForEvent(event).createNote(event),
  updateNote: (event) => scopedActionsForEvent(event).updateNote(event),
  deleteNote: (event) => scopedActionsForEvent(event).deleteNote(event)
}
