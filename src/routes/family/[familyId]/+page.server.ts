import { createTreeActions, loadTreePage } from '$lib/server/treePage'
import { ACTIVE_FAMILY_COOKIE } from '$lib/server/activeFamily'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  // Keep family scope in cookie so delegated loaders/actions can resolve it
  // without relying on URL query params.
  event.cookies.set(ACTIVE_FAMILY_COOKIE, event.params.familyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    sameSite: 'lax'
  })

  return loadTreePage(event, {
    requestedFamilyId: event.params.familyId
  })
}

const scopedActions = createTreeActions()

export const actions: Actions = {
  addMember: (event) =>
    createTreeActions({ forcedFamilyId: event.params.familyId }).addMember(event),
  updateMember: scopedActions.updateMember,
  deleteMember: scopedActions.deleteMember,
  addRelation: scopedActions.addRelation,
  removeRelation: scopedActions.removeRelation
}
