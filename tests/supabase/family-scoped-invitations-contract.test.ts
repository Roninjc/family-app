import { describe, expect, it } from 'vitest'
import migrationSql from '../../supabase/migrations/20260808103000_family_scoped_invitations.sql?raw'

describe('family-scoped invitations SQL contract', () => {
  it('adds family_id to invitations and makes it required', () => {
    expect(migrationSql).toContain('add column if not exists family_id uuid references public.families')
    expect(migrationSql).toContain('alter column family_id set not null')
  })

  it('requires invitation family in create_invitation and persists it', () => {
    expect(migrationSql).toContain('invitation_family_id uuid')
    expect(migrationSql).toContain("raise exception 'A family is required'")
    expect(migrationSql).toContain('family_id,')
    expect(migrationSql).toContain('invitation_family_id,')
  })

  it('assigns signup membership to invitation family on account creation', () => {
    expect(migrationSql).toContain('insert into public.family_memberships (family_id, profile_id, role)')
    expect(migrationSql).toContain('values (invite_token.family_id, new.id, invite_token.role_on_signup)')
    expect(migrationSql).toContain('values (signup_family_id, new.id, signup_role)')
  })
})
