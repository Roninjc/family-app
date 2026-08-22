import { createAdminActions, loadAdminPage } from '$lib/server/adminPage'
import { ACTIVE_FAMILY_COOKIE } from '$lib/server/activeFamily'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  event.cookies.set(ACTIVE_FAMILY_COOKIE, event.params.familyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    sameSite: 'lax'
  })

  return loadAdminPage(event, {
    requestedFamilyId: event.params.familyId
  })
}

const scopedActionsForEvent = (event: Parameters<Actions['updateFamilySettings']>[0]) =>
  createAdminActions({ forcedFamilyId: event.params.familyId })

export const actions: Actions = {
  updateFamilySettings: (event) => scopedActionsForEvent(event).updateFamilySettings(event),
  inviteGeneral: (event) => scopedActionsForEvent(event).inviteGeneral(event),
  inviteMember: (event) => scopedActionsForEvent(event).inviteMember(event),
  revokeInvite: (event) => scopedActionsForEvent(event).revokeInvite(event),
  regenerateInviteLink: (event) => scopedActionsForEvent(event).regenerateInviteLink(event),
  saveUsers: (event) => scopedActionsForEvent(event).saveUsers(event),
  setMemberLink: (event) => scopedActionsForEvent(event).setMemberLink(event),
  setRole: (event) => scopedActionsForEvent(event).setRole(event)
}
