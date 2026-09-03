import { describe, expect, it } from 'vitest'
// Vite loads SQL as plain text with ?raw for contract-style assertions.
import migrationSql from '../../supabase/migrations/20260806100000_invitations_and_binding_notice.sql?raw'

describe('invitations trigger SQL contract', () => {
  it('keeps first member binding and creates later accounts unlinked with a notice', () => {
    expect(migrationSql).toContain(
      'begin\n      insert into public.profiles (id, email, role, member_id, pending_notice)'
    )
    expect(migrationSql).toContain('when unique_violation then')
    expect(migrationSql).toContain("'member_link_already_claimed'")
    expect(migrationSql).toContain(
      'values (\n          new.id,\n          lower(new.email),\n          signup_role,\n          null,'
    )
  })

  it('uses a unique index to enforce one profile per member', () => {
    expect(migrationSql).toContain(
      'create unique index if not exists profiles_member_id_unique_idx'
    )
    expect(migrationSql).toContain('where member_id is not null')
  })
})
