export type Role = 'admin' | 'editor' | 'viewer'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: Role
  member_id: string | null
  created_at: string
}

export const canEdit = (profile: Profile | null) =>
  profile?.role === 'admin' || profile?.role === 'editor'
