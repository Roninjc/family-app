// Generic shape so future notification kinds beyond pending invitations can reuse the same dropdown.
export interface AppNotification {
  id: string
  kind: 'pending_invitation'
  familyId: string
  familyName: string
  description: string
  href: string
  createdAt: string
}
