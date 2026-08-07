-- Multi-family foundation: explicit families, memberships, member ownership
-- and family-scoped notes/news.

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

create index if not exists family_memberships_profile_idx
  on public.family_memberships (profile_id);

create index if not exists family_memberships_family_idx
  on public.family_memberships (family_id);

create table if not exists public.family_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  body text not null,
  note_type text not null default 'note' check (note_type in ('news', 'note')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_notes_family_idx
  on public.family_notes (family_id, created_at desc);

alter table public.members
  add column if not exists family_id uuid references public.families (id) on delete cascade;

create index if not exists members_family_id_idx
  on public.members (family_id);

create or replace function public.touch_family_notes_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_family_notes_updated_at on public.family_notes;

create trigger touch_family_notes_updated_at
  before update on public.family_notes
  for each row execute function public.touch_family_notes_updated_at();

-- Ensure one default family exists for bootstrapping and new profiles.
create or replace function public.ensure_default_family()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  family_id uuid;
begin
  select id into family_id from public.families order by created_at asc limit 1;

  if family_id is null then
    insert into public.families (name, description, created_by)
    values ('Familia principal', 'Familia inicial del sistema', auth.uid())
    returning id into family_id;
  end if;

  return family_id;
end;
$$;

create or replace function public.ensure_profile_family_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  family_id uuid;
begin
  family_id := public.ensure_default_family();

  insert into public.family_memberships (family_id, profile_id, role)
  values (family_id, new.id, new.role)
  on conflict (family_id, profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists ensure_profile_family_membership on public.profiles;

create trigger ensure_profile_family_membership
  after insert on public.profiles
  for each row execute function public.ensure_profile_family_membership();

-- Create default family and move existing data into it.
do $$
declare
  default_family_id uuid;
begin
  default_family_id := public.ensure_default_family();

  update public.members
  set family_id = default_family_id
  where family_id is null;

  insert into public.family_memberships (family_id, profile_id, role)
  select default_family_id, p.id, p.role
  from public.profiles p
  on conflict (family_id, profile_id) do nothing;

  insert into public.family_notes (family_id, title, body, note_type)
  select
    default_family_id,
    'Bienvenida a la familia principal',
    'Este espacio recoge noticias y notas de la familia.',
    'news'
  where not exists (
    select 1 from public.family_notes fn where fn.family_id = default_family_id
  );
end $$;

alter table public.members
  alter column family_id set not null;

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = target_family_id
      and fm.profile_id = auth.uid()
  )
$$;

create or replace function public.can_edit_family(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = target_family_id
      and fm.profile_id = auth.uid()
      and fm.role in ('admin', 'editor')
  )
$$;

create or replace function public.relationship_family_id(a uuid, b uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select m1.family_id
  from public.members m1
  join public.members m2 on m2.id = b
  where m1.id = a
    and m1.family_id = m2.family_id
  limit 1
$$;

-- Replace global family-wide visibility with family membership rules.
drop policy if exists "family can read members" on public.members;
drop policy if exists "editors can insert members" on public.members;
drop policy if exists "editors can update members" on public.members;
drop policy if exists "editors can delete members" on public.members;

create policy "members can read own families members" on public.members
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "editors can insert members in own families" on public.members
  for insert to authenticated
  with check (public.can_edit_family(family_id));

create policy "editors can update members in own families" on public.members
  for update to authenticated
  using (public.can_edit_family(family_id))
  with check (public.can_edit_family(family_id));

create policy "editors can delete members in own families" on public.members
  for delete to authenticated
  using (public.can_edit_family(family_id));

drop policy if exists "family can read relationships" on public.relationships;
drop policy if exists "editors can insert relationships" on public.relationships;
drop policy if exists "editors can update relationships" on public.relationships;
drop policy if exists "editors can delete relationships" on public.relationships;

create policy "members can read own families relationships" on public.relationships
  for select to authenticated
  using (
    public.relationship_family_id(member_a, member_b) is not null
    and public.is_family_member(public.relationship_family_id(member_a, member_b))
  );

create policy "editors can insert relationships in own families" on public.relationships
  for insert to authenticated
  with check (
    public.relationship_family_id(member_a, member_b) is not null
    and public.can_edit_family(public.relationship_family_id(member_a, member_b))
  );

create policy "editors can update relationships in own families" on public.relationships
  for update to authenticated
  using (
    public.relationship_family_id(member_a, member_b) is not null
    and public.can_edit_family(public.relationship_family_id(member_a, member_b))
  )
  with check (
    public.relationship_family_id(member_a, member_b) is not null
    and public.can_edit_family(public.relationship_family_id(member_a, member_b))
  );

create policy "editors can delete relationships in own families" on public.relationships
  for delete to authenticated
  using (
    public.relationship_family_id(member_a, member_b) is not null
    and public.can_edit_family(public.relationship_family_id(member_a, member_b))
  );

alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.family_notes enable row level security;

create policy "members can read families" on public.families
  for select to authenticated
  using (public.is_family_member(id));

create policy "admins can create families" on public.families
  for insert to authenticated
  with check (public.current_user_role() = 'admin');

create policy "admins can update families" on public.families
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "admins can delete families" on public.families
  for delete to authenticated
  using (public.current_user_role() = 'admin');

create policy "members can read memberships" on public.family_memberships
  for select to authenticated
  using (profile_id = auth.uid() or public.current_user_role() = 'admin');

create policy "admins manage memberships" on public.family_memberships
  for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "members can read family notes" on public.family_notes
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "editors can insert family notes" on public.family_notes
  for insert to authenticated
  with check (public.can_edit_family(family_id));

create policy "editors can update family notes" on public.family_notes
  for update to authenticated
  using (public.can_edit_family(family_id))
  with check (public.can_edit_family(family_id));

create policy "editors can delete family notes" on public.family_notes
  for delete to authenticated
  using (public.can_edit_family(family_id));

-- Enforce that relationships cannot connect members from different families.
create or replace function public.enforce_relationship_same_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  family_a uuid;
  family_b uuid;
begin
  select family_id into family_a from public.members where id = new.member_a;
  select family_id into family_b from public.members where id = new.member_b;

  if family_a is null or family_b is null or family_a <> family_b then
    raise exception 'Members from different families cannot be related';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_relationship_same_family on public.relationships;

create trigger enforce_relationship_same_family
  before insert or update on public.relationships
  for each row execute function public.enforce_relationship_same_family();

-- Update member creation RPC to include family ownership.
create or replace function public.add_member_with_relations(payload jsonb)
returns uuid
language plpgsql
security invoker
as $$
declare
  new_id uuid;
  rel jsonb;
  other_id uuid;
  target_family_id uuid;
begin
  target_family_id := coalesce(
    nullif(payload ->> 'family_id', '')::uuid,
    (
      select fm.family_id
      from public.family_memberships fm
      where fm.profile_id = auth.uid()
      order by fm.created_at asc
      limit 1
    )
  );

  if target_family_id is null then
    raise exception 'No family selected for new member';
  end if;

  insert into public.members (name, family_name, birth_date, created_by, family_id)
  values (
    payload ->> 'name',
    coalesce(payload ->> 'family_name', ''),
    nullif(payload ->> 'birth_date', '')::date,
    auth.uid(),
    target_family_id
  )
  returning id into new_id;

  for rel in select * from jsonb_array_elements(coalesce(payload -> 'relations', '[]'::jsonb))
  loop
    other_id := (rel ->> 'other')::uuid;

    if rel ->> 'type' = 'parent' then
      if rel ->> 'direction' = 'parent_of' then
        insert into public.relationships (member_a, member_b, type)
        values (new_id, other_id, 'parent')
        on conflict do nothing;
      else
        insert into public.relationships (member_a, member_b, type)
        values (other_id, new_id, 'parent')
        on conflict do nothing;
      end if;
    else
      insert into public.relationships (member_a, member_b, type)
      values (least(new_id, other_id), greatest(new_id, other_id), rel ->> 'type')
      on conflict do nothing;
    end if;
  end loop;

  return new_id;
end;
$$;
