export type AdminRole = 'admin' | 'editor' | 'viewer'

export type AdminInviteFilter = 'all' | 'active' | 'expired' | 'revoked' | 'limit'

export type AdminMemberOption = {
  id: string
  name: string
  family_name: string
}

export type AdminInviteSummary = {
  id: string
  type: string
  role_on_signup: string
  email: string | null
  member_id: string | null
  created_at: string | null
  expires_at: string | null
  uses_count: number
  max_uses: number | null
  revoked_at: string | null
}

export type AdminUserProfile = {
  id: string
  email: string
  display_name: string | null
  role: string
}

export type AdminUserDraft = {
  role: string
  memberId: string
}

export type AdminFamilyMetrics = {
  membersCount: number
  usersCount: number
  unlinkedMembersCount: number
  activeInvitesCount: number
  managersCount: number
}

export type AdminFamilySummary = {
  id: string
  name: string
  role: AdminRole | string
  metrics: AdminFamilyMetrics
}

export type AdminPageData = {
  families: AdminFamilySummary[]
  activeFamily: AdminFamilySummary | null
  canManageInvites: boolean
  profiles: Array<AdminUserProfile & { member_id: string | null; created_at: string }>
  invites: AdminInviteSummary[]
  members: AdminMemberOption[]
  currentUserId?: string | null
  manager?: { id?: string | null } | null
}

export type AdminPageForm = {
  invitedGeneral?: boolean
  inviteSuccess?: string
  inviteLink?: string
  inviteError?: string
  invitedMember?: string
  revokeSuccess?: string
  usersSaved?: number
  usersError?: string
  familySettingsSuccess?: string
  familySettingsFamilyId?: string
  familySettingsError?: string
}
