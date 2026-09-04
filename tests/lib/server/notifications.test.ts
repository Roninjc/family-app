import { describe, expect, it } from 'vitest'
import { loadPendingInvitationNotifications } from '../../../src/lib/server/notifications'
import type { FamilySummary } from '../../../src/lib/server/activeFamily'

const families: FamilySummary[] = [
  { id: 'f1', name: 'Familia Castaño', role: 'admin', memberId: null },
  { id: 'f2', name: 'Familia Luna', role: 'editor', memberId: null },
  { id: 'f3', name: 'Familia Viewer', role: 'viewer', memberId: null }
]

const makeSupabase = (invitations: unknown[]) => ({
  from: (table: string) => {
    if (table !== 'invitations') throw new Error(`Unexpected table: ${table}`)

    return {
      select: () => ({
        in: (_column: string, ids: string[]) => ({
          is: () => ({
            order: async () => ({
              data: invitations.filter((invite) =>
                ids.includes((invite as { family_id: string }).family_id)
              )
            })
          })
        })
      })
    }
  }
})

describe('loadPendingInvitationNotifications', () => {
  it('returns empty array when the user manages no families', async () => {
    const supabase = makeSupabase([])
    const viewerOnly: FamilySummary[] = [families[2]]

    const result = await loadPendingInvitationNotifications(supabase as never, viewerOnly)

    expect(result).toEqual([])
  })

  it('only queries invitations for admin/editor-managed families', async () => {
    const invitations = [
      {
        id: 'i1',
        family_id: 'f1',
        type: 'general',
        email: null,
        role_on_signup: 'editor',
        expires_at: null,
        revoked_at: null,
        uses_count: 0,
        max_uses: null,
        created_at: '2026-08-01T00:00:00.000Z'
      },
      {
        id: 'i2',
        family_id: 'f3',
        type: 'general',
        email: null,
        role_on_signup: 'viewer',
        expires_at: null,
        revoked_at: null,
        uses_count: 0,
        max_uses: null,
        created_at: '2026-08-01T00:00:00.000Z'
      }
    ]
    const supabase = makeSupabase(invitations)

    const result = await loadPendingInvitationNotifications(supabase as never, families)

    expect(result).toHaveLength(1)
    expect(result[0].familyId).toBe('f1')
  })

  it('filters out revoked, expired and exhausted invitations', async () => {
    const invitations = [
      {
        id: 'active',
        family_id: 'f1',
        type: 'general',
        email: null,
        role_on_signup: 'viewer',
        expires_at: null,
        revoked_at: null,
        uses_count: 0,
        max_uses: null,
        created_at: '2026-08-01T00:00:00.000Z'
      },
      {
        id: 'revoked',
        family_id: 'f1',
        type: 'general',
        email: null,
        role_on_signup: 'viewer',
        expires_at: null,
        revoked_at: '2026-08-01T00:00:00.000Z',
        uses_count: 0,
        max_uses: null,
        created_at: '2026-08-01T00:00:00.000Z'
      },
      {
        id: 'expired',
        family_id: 'f1',
        type: 'general',
        email: null,
        role_on_signup: 'viewer',
        expires_at: '2020-01-01T00:00:00.000Z',
        revoked_at: null,
        uses_count: 0,
        max_uses: null,
        created_at: '2026-08-01T00:00:00.000Z'
      },
      {
        id: 'exhausted',
        family_id: 'f1',
        type: 'general',
        email: null,
        role_on_signup: 'viewer',
        expires_at: null,
        revoked_at: null,
        uses_count: 2,
        max_uses: 2,
        created_at: '2026-08-01T00:00:00.000Z'
      }
    ]
    const supabase = makeSupabase(invitations)

    const result = await loadPendingInvitationNotifications(supabase as never, families)

    expect(result.map((notification) => notification.id)).toEqual(['active'])
  })

  it('builds description per invitation type and a family-scoped admin href', async () => {
    const invitations = [
      {
        id: 'i1',
        family_id: 'f2',
        type: 'member_linked',
        email: 'ana@example.com',
        role_on_signup: 'editor',
        expires_at: null,
        revoked_at: null,
        uses_count: 0,
        max_uses: null,
        created_at: '2026-08-01T00:00:00.000Z'
      }
    ]
    const supabase = makeSupabase(invitations)

    const result = await loadPendingInvitationNotifications(supabase as never, families)

    expect(result[0]).toMatchObject({
      kind: 'pending_invitation',
      familyId: 'f2',
      familyName: 'Familia Luna',
      description: 'Invitación pendiente para ana@example.com · editor',
      href: '/family/f2/admin?openInvites=1'
    })
  })
})
