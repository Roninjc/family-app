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

export const actions: Actions = {
  updateFamilySettings: (event) =>
    createAdminActions({ forcedFamilyId: event.params.familyId }).updateFamilySettings(event),
  inviteGeneral: (event) =>
    createAdminActions({ forcedFamilyId: event.params.familyId }).inviteGeneral(event),
  inviteMember: (event) =>
    createAdminActions({ forcedFamilyId: event.params.familyId }).inviteMember(event),
  revokeInvite: (event) =>
    createAdminActions({ forcedFamilyId: event.params.familyId }).revokeInvite(event),
  regenerateInviteLink: (event) =>
    createAdminActions({ forcedFamilyId: event.params.familyId }).regenerateInviteLink(event),
  saveUsers: (event) =>
    createAdminActions({ forcedFamilyId: event.params.familyId }).saveUsers(event),
  setMemberLink: (event) =>
    createAdminActions({ forcedFamilyId: event.params.familyId }).setMemberLink(event),
  setRole: (event) =>
    createAdminActions({ forcedFamilyId: event.params.familyId }).setRole(event)
}
