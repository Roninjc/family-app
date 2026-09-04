import type { SupabaseClient } from '@supabase/supabase-js'
import type { FamilySummary } from './activeFamily'
import type { AppNotification } from '$lib/types/notifications'

const ROLE_LABELS: Record<string, string> = {
  admin: 'administrador',
  editor: 'editor',
  viewer: 'visualizador'
}

interface InvitationRow {
  id: string
  family_id: string
  type: string
  email: string | null
  role_on_signup: string
  expires_at: string | null
  revoked_at: string | null
  uses_count: number
  max_uses: number | null
  created_at: string
}

const isInviteActive = (invite: InvitationRow) => {
  if (invite.revoked_at) return false
  if (invite.expires_at && Date.parse(invite.expires_at) <= Date.now()) return false
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) return false
  return true
}

const describeInvitation = (invite: InvitationRow) => {
  const roleLabel = ROLE_LABELS[invite.role_on_signup] ?? invite.role_on_signup
  if (invite.type === 'member_linked' && invite.email) {
    return `Invitación pendiente para ${invite.email} · ${roleLabel}`
  }
  return `Invitación general pendiente · ${roleLabel}`
}

export const loadPendingInvitationNotifications = async (
  supabase: SupabaseClient,
  families: FamilySummary[]
): Promise<AppNotification[]> => {
  const managedFamilies = families.filter(
    (family) => family.role === 'admin' || family.role === 'editor'
  )
  if (managedFamilies.length === 0) return []

  const familyNameById = new Map(managedFamilies.map((family) => [family.id, family.name]))
  const familyIds = managedFamilies.map((family) => family.id)

  const { data: invitations } = await supabase
    .from('invitations')
    .select(
      'id, family_id, type, email, role_on_signup, expires_at, revoked_at, uses_count, max_uses, created_at'
    )
    .in('family_id', familyIds)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  return ((invitations as InvitationRow[] | null) ?? []).filter(isInviteActive).map((invite) => ({
    id: invite.id,
    kind: 'pending_invitation' as const,
    familyId: invite.family_id,
    familyName: familyNameById.get(invite.family_id) ?? 'Familia',
    description: describeInvitation(invite),
    href: `/family/${encodeURIComponent(invite.family_id)}/admin?openInvites=1`,
    createdAt: invite.created_at
  }))
}

// Sample data so the notifications dropdown has something to preview in mock mode (no real invitations table).
const MOCK_NOTIFICATION_SAMPLES: Array<Pick<AppNotification, 'id' | 'description' | 'createdAt'>> =
  [
    {
      id: 'mock-invite-1',
      description: 'Invitación pendiente para ana@example.com · editor',
      createdAt: '2026-09-02T10:00:00.000Z'
    },
    {
      id: 'mock-invite-2',
      description: 'Invitación general pendiente · visualizador',
      createdAt: '2026-09-01T09:30:00.000Z'
    },
    {
      id: 'mock-invite-3',
      description: 'Invitación pendiente para carlos@example.com · administrador',
      createdAt: '2026-08-30T18:15:00.000Z'
    }
  ]

export const buildMockPendingInvitationNotifications = (
  families: Array<{ id: string; name: string }>
): AppNotification[] => {
  if (families.length === 0) return []

  return MOCK_NOTIFICATION_SAMPLES.map((sample, index) => {
    const family = families[index % families.length]
    return {
      ...sample,
      kind: 'pending_invitation' as const,
      familyId: family.id,
      familyName: family.name,
      href: `/family/${encodeURIComponent(family.id)}/admin?openInvites=1`
    }
  })
}
