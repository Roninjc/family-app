import { describe, expect, it } from 'vitest'
import migrationSql from '../../supabase/migrations/20260807110000_multi_family_foundation.sql?raw'

describe('multi-family migration SQL contract', () => {
  it('creates the core family tables', () => {
    expect(migrationSql).toContain('create table if not exists public.families')
    expect(migrationSql).toContain('create table if not exists public.family_memberships')
    expect(migrationSql).toContain('create table if not exists public.family_notes')
    expect(migrationSql).toContain('add column if not exists family_id uuid references public.families')
  })

  it('adds default family bootstrap and profile membership trigger', () => {
    expect(migrationSql).toContain('create or replace function public.ensure_default_family()')
    expect(migrationSql).toContain('create trigger ensure_profile_family_membership')
    expect(migrationSql).toContain('update public.members\n  set family_id = default_family_id')
  })

  it('enforces family-scoped RLS and relationship integrity', () => {
    expect(migrationSql).toContain('create policy "members can read own families members"')
    expect(migrationSql).toContain('create policy "members can read own families relationships"')
    expect(migrationSql).toContain('create or replace function public.enforce_relationship_same_family()')
    expect(migrationSql).toContain('create trigger enforce_relationship_same_family')
  })

  it('updates RPC add_member_with_relations to write family_id', () => {
    expect(migrationSql).toContain("target_family_id := coalesce(")
    expect(migrationSql).toContain('insert into public.members (name, family_name, birth_date, created_by, family_id)')
  })
})
